import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../data/mockDb';
import type { Job, Talent, Staff, Training, User } from '../data/mockDb';
import { CalendarPicker } from '../components/CalendarPicker';
import { formatJobDates } from '../utils/dateFormatter';
import { generateMaskedLocation, extractArea } from '../utils/maskingUtils';
import Autocomplete from 'react-google-autocomplete';

export function SearchPage() {
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const [mode, setMode] = useState<'talent' | 'job'>('job');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [filterArea, setFilterArea] = useState<string>('all');
  const [allTrainings, setAllTrainings] = useState<Training[]>([]);

  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // 新規作成フォーム用のState
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [createFormType, setCreateFormType] = useState<'job' | 'talent'>('job');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // スタッフ関連のState
  const [myStaffs, setMyStaffs] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // フィルタ関連のState
  const [includeUrgent, setIncludeUrgent] = useState(true);

  // 案件作成用の新規State
  const [selectedJobDates, setSelectedJobDates] = useState<string[]>([]);
  const [isSelectingLocationOnMap, setIsSelectingLocationOnMap] = useState(false);
  const [tempSelectedLocation, setTempSelectedLocation] = useState<{ lat: number, lng: number } | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const [isNdaModalOpen, setIsNdaModalOpen] = useState(false);
  const [ndaAgreed, setNdaAgreed] = useState(false);

  // ログインユーザーおよび限定公開先の動的管理用State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [targetCompanyId, setTargetCompanyId] = useState<string>('');

  // フィルター・ソート用State
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [tempKeyword, setTempKeyword] = useState<string>('');
  
  // 案件用フィルター & ソート
  const [jobSortOrder, setJobSortOrder] = useState<'newest' | 'priceHigh' | 'dateNear'>('newest');
  const [filterJobRoles, setFilterJobRoles] = useState<string[]>([]);
  const [filterCarriers, setFilterCarriers] = useState<string[]>([]);
  const [filterChannels, setFilterChannels] = useState<string[]>([]);
  const [filterMinPrice, setFilterMinPrice] = useState<number>(0);
  const [filterDeadlineDays, setFilterDeadlineDays] = useState<number | null>(null);
  
  // 人材用フィルター & ソート
  const [talentSortOrder, setTalentSortOrder] = useState<'priceLow' | 'priceHigh'>('priceLow');
  const [filterTalentSkills, setFilterTalentSkills] = useState<string[]>([]);
  const [filterTalentCarriers, setFilterTalentCarriers] = useState<string[]>([]);
  const [filterTalentTrainings, setFilterTalentTrainings] = useState<string[]>([]);

  useEffect(() => {
    if (isFilterSheetOpen) {
      setTempKeyword(searchKeyword);
    }
  }, [isFilterSheetOpen, searchKeyword]);

  // 汎用フォームState (Job用) + Talent用希望勤務日
  const [formData, setFormData] = useState({
    title: '', description: '', price: '' as unknown as number, 
    locationName: '', // 公開用の表示名
    exactLocation: '', // 正確な店舗名・住所
    roleType: '' as any, salesChannel: '' as any, carrier: '' as any,
    availableDates: '', // 案件用など（未使用になるかも）
    selectedDates: [] as string[], // カレンダーで選択された日付
    eventDate: '',
    applicationDeadline: '',
    workLocation: '店内',
    isUrgent: false,
    isLimited: false
  });

  // データ更新State & 処理
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const [fetchedJobs, fetchedTalents, fetchedTrainings, user, users] = await Promise.all([
        api.getJobs(),
        api.getTalents(),
        api.getTrainings(),
        api.getCurrentUser(),
        api.getUsers()
      ]);
      setJobs(fetchedJobs);
      setTalents(fetchedTalents);
      setAllTrainings(fetchedTrainings);
      setCurrentUser(user);
      setAllUsers(users);
      // アニメーションを自然に見せるために、わずかにディレイをかける
      await new Promise(resolve => setTimeout(resolve, 400));
    } catch (error) {
      console.error('データの更新に失敗しました', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenCreateForm = async () => {
    const currentUser = await api.getCurrentUser();
    if (!currentUser) return;
    const staffs = await api.getStaffsByUserId(currentUser.id);
    setMyStaffs(staffs);
    if (staffs.length > 0) setSelectedStaffId(staffs[0].id);
    setCreateFormType(mode);
    setIsCreateFormOpen(true);
  };

  const geocodeAddress = async (address: string): Promise<{lat: number, lng: number}> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.warn("Geocoding failed", e);
    }
    return { lat: 35.6812, lng: 139.7671 }; // Fallback to Tokyo Station
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (createFormType === 'job' && selectedJobDates.length === 0) {
      alert('開催日を1日以上選択してください。');
      setIsSubmitting(false);
      return;
    }

    let ambiguousCoords = { lat: 35.6812, lng: 139.7671 };
    let exactCoords = tempSelectedLocation || { lat: 35.6812, lng: 139.7671 };

    if (createFormType === 'job') {
      const area = extractArea(formData.exactLocation || formData.locationName);
      if (area && area !== '非公開エリア') {
        const geocoded = await geocodeAddress(area);
        if (geocoded) ambiguousCoords = geocoded;
      } else if (tempSelectedLocation) {
        // Fallback to exact if area extraction fails (though this defeats masking, it's a fallback)
        ambiguousCoords = tempSelectedLocation;
      }
    }

    if (createFormType === 'job') {
      const newJob: Omit<Job, 'id'> = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        locationName: formData.locationName,
        exactLocation: formData.exactLocation,
        lat: ambiguousCoords.lat,
        lng: ambiguousCoords.lng,
        exactLat: exactCoords.lat,
        exactLng: exactCoords.lng,
        authorId: currentUser?.id || '',
        roleType: formData.roleType as Job['roleType'],
        salesChannel: formData.salesChannel as Job['salesChannel'],
        carrier: formData.carrier as Job['carrier'],
        detailedDescription: formData.description,
        eventDate: [...selectedJobDates].sort().join(', '),
        applicationDeadline: formData.applicationDeadline,
        workLocation: formData.workLocation as Job['workLocation'],
        isUrgent: formData.isUrgent,
        allowedCompanyIds: formData.isLimited && targetCompanyId ? [targetCompanyId] : undefined
      };
      const savedJob = await api.addJob(newJob);
      setJobs(prev => [...prev, savedJob]);

      // クリーンアップ
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
      setTempSelectedLocation(null);
      setSelectedJobDates([]);
    } else {
      const selectedStaff = myStaffs.find(s => s.id === selectedStaffId);
      if (!selectedStaff) {
        alert('スタッフを選択してください');
        setIsSubmitting(false);
        return;
      }
      const coords = await geocodeAddress(selectedStaff.baseLocation);
      const currentUser = await api.getCurrentUser();
      if (!currentUser) {
        alert('ログインが必要です');
        setIsSubmitting(false);
        return;
      }
      
      // selectedDates (YYYY-MM-DD) を "M/D" のカンマ区切りに変換
      const sortedDates = [...formData.selectedDates].sort();
      const formattedDates = sortedDates.map(d => {
        const [_, month, day] = d.split('-');
        return `${parseInt(month)}/${parseInt(day)}`;
      }).join(', ');

      const newTalent: Omit<Talent, 'id'> = {
        name: selectedStaff.name,
        maskedName: selectedStaff.maskedName,
        companyName: currentUser.name, 
        description: selectedStaff.prText || '',
        price: selectedStaff.price,
        locationName: selectedStaff.baseLocation, // Group by baseLocation
        baseLocation: selectedStaff.baseLocation,
        nearestStation: selectedStaff.nearestStation,
        preferredArea: selectedStaff.preferredArea, 
        lat: coords.lat,
        lng: coords.lng,
        userId: currentUser.id,
        skills: selectedStaff.skills,
        carriers: selectedStaff.carriers,
        experience: selectedStaff.experience,
        prText: selectedStaff.prText,
        availableDates: formattedDates,
        completedTrainings: selectedStaff.completedTrainings || []
      };
      const savedTalent = await api.addTalent(newTalent);
      setTalents(prev => [...prev, savedTalent]);
    }
    
    setIsSubmitting(false);
    setIsCreateFormOpen(false);
    alert(`${createFormType === 'job' ? '案件' : '人材'}を登録しました`);
  };

  // 初回データフェッチとマップ初期化
  useEffect(() => {
    const mapContainer = document.getElementById('map-area');
    if (!mapContainer || mapRef.current) return;

    const defaultLocation: [number, number] = [35.6812, 139.7671];

    mapRef.current = L.map('map-area', {
      zoomControl: false,
    }).setView(defaultLocation, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    markersGroupRef.current = L.layerGroup().addTo(mapRef.current);

    // 初期マウント時のコンテナサイズ未確定に対応するための遅延サイズ更新
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 200);

    const loadData = async () => {
      try {
        const [fetchedJobs, fetchedTalents, fetchedTrainings, user, users] = await Promise.all([
          api.getJobs(),
          api.getTalents(),
          api.getTrainings(),
          api.getCurrentUser(),
          api.getUsers()
        ]);
        setJobs(fetchedJobs);
        setTalents(fetchedTalents);
        setAllTrainings(fetchedTrainings);
        setCurrentUser(user);
        setAllUsers(users);
        
        if (user && users.length > 0) {
          const otherUsers = users.filter(u => u.id !== user.id);
          if (otherUsers.length > 0) {
            setTargetCompanyId(otherUsers[0].id);
          }
        }
      } catch (error) {
        console.error('データの取得に失敗しました', error);
      }
    };

    loadData();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const currentLocation: [number, number] = [lat, lng];

          if (mapRef.current) {
            mapRef.current.setView(currentLocation, 14);
            mapRef.current.invalidateSize();
            const customIcon = L.divIcon({
              className: 'current-location-marker',
              html: `<div style="
                width: 16px;
                height: 16px;
                background-color: #2563EB;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 10px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            });

            const marker = L.marker(currentLocation, { icon: customIcon }).addTo(mapRef.current);
            marker.bindPopup('<b>現在地</b>').openPopup();
          }
        },
        (error) => {
          console.warn('位置情報の取得に失敗しました:', error.message);
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    const resizeObserver = new ResizeObserver(() => {
        if(mapRef.current) mapRef.current.invalidateSize();
    });
    resizeObserver.observe(mapContainer);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const startMapSelection = () => {
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }
    setIsCreateFormOpen(false);
    setIsSelectingLocationOnMap(true);
  };

  const cancelMapSelection = () => {
    setIsSelectingLocationOnMap(false);
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }
    setIsCreateFormOpen(true);
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const handleMapClick = async (e: L.LeafletMouseEvent) => {
      if (!isSelectingLocationOnMap || !mapRef.current) return;

      const { lat, lng } = e.latlng;

      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
      }
      
      const customIcon = L.divIcon({
        className: 'temp-location-marker',
        html: `<div style="
          width: 20px;
          height: 20px;
          background-color: #EF4444;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      tempMarkerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(mapRef.current);

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ja`);
        const data = await response.json();
        
        let addressText = '';
        if (data && data.display_name) {
          const parts = data.display_name.split(', ').reverse();
          addressText = parts.filter((p: string) => p !== '日本' && !p.match(/^\d{3}-\d{4}$/)).join('');
        }
        
        if (!addressText) {
          addressText = data?.display_name || `ピンを指定した地点 (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }

        // Populate exactLocation with the full address, and auto-generate locationName
        setFormData(prev => ({ 
          ...prev, 
          exactLocation: addressText,
          locationName: generateMaskedLocation(addressText, addressText, prev.salesChannel, prev.carrier)
        }));
        setTempSelectedLocation({ lat, lng });
      } catch (err) {
        console.warn('逆ジオコーディングに失敗しました', err);
        const fallbackText = `ピンを指定した地点 (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setFormData(prev => ({ 
          ...prev, 
          exactLocation: fallbackText,
          locationName: generateMaskedLocation(fallbackText, fallbackText, prev.salesChannel, prev.carrier)
        }));
        setTempSelectedLocation({ lat, lng });
      } finally {
        setIsSelectingLocationOnMap(false);
        setIsCreateFormOpen(true);
      }
    };

    if (isSelectingLocationOnMap) {
      mapRef.current.on('click', handleMapClick);
      const mapDiv = document.getElementById('map-area');
      if (mapDiv) mapDiv.style.cursor = 'crosshair';
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
      const mapDiv = document.getElementById('map-area');
      if (mapDiv) mapDiv.style.cursor = '';
    };
  }, [isSelectingLocationOnMap]);

  // talentsやjobsが更新されたときにドキュメントレベルのイベントリスナーを設定
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('view-profile-btn')) {
        const talentId = target.getAttribute('data-id');
        const talent = talents.find(t => t.id === talentId);
        if (talent) setSelectedTalent(talent);
      } else if (target && target.classList.contains('view-job-btn')) {
        const jobId = target.getAttribute('data-id');
        const job = jobs.find(j => j.id === jobId);
        if (job) {
          if (currentUser?.status === 'pending') {
            alert('本人確認書類（登記簿等）の審査中です。\n審査完了後に詳細情報が閲覧可能になります。');
            return;
          }
          setSelectedJob(job);
        }
      } else if (target && target.classList.contains('view-area-btn')) {
        const areaName = target.getAttribute('data-area');
        if (areaName) {
          if (areaName.includes('渋谷')) setFilterArea('shibuya');
          else if (areaName.includes('新宿')) setFilterArea('shinjuku');
          else if (areaName.includes('池袋') || areaName.includes('豊島')) setFilterArea('ikebukuro');
          else setFilterArea('all');
          setViewMode('list');
        }
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [talents, jobs, currentUser]);

  // 人材をフィルタリング＆ソートする
  const filteredTalents = useMemo(() => {
    let list = talents.filter(talent => {
      // 1. スキル（職種）フィルター
      if (filterTalentSkills.length > 0 && !talent.skills.some(s => filterTalentSkills.includes(s))) {
        return false;
      }
      // 2. 対応キャリア
      if (filterTalentCarriers.length > 0 && !talent.carriers?.some(c => filterTalentCarriers.includes(c))) {
        return false;
      }
      // 3. 受講済み研修
      if (filterTalentTrainings.length > 0 && !(talent.completedTrainings && filterTalentTrainings.every(tid => talent.completedTrainings?.includes(tid)))) {
        return false;
      }
      // 4. キーワード検索
      if (searchKeyword.trim() !== '') {
        const kw = searchKeyword.toLowerCase();
        const nameMatch = talent.name?.toLowerCase().includes(kw) || talent.maskedName?.toLowerCase().includes(kw);
        const companyMatch = talent.companyName?.toLowerCase().includes(kw);
        const descMatch = talent.description?.toLowerCase().includes(kw) || talent.prText?.toLowerCase().includes(kw);
        const locMatch = talent.locationName?.toLowerCase().includes(kw) || talent.baseLocation?.toLowerCase().includes(kw);
        if (!nameMatch && !companyMatch && !descMatch && !locMatch) {
          return false;
        }
      }
      return true;
    });

    // ソート処理
    list.sort((a, b) => {
      if (talentSortOrder === 'priceLow') {
        return a.price - b.price;
      } else {
        return b.price - a.price;
      }
    });

    return list;
  }, [talents, filterTalentSkills, filterTalentCarriers, filterTalentTrainings, talentSortOrder, searchKeyword]);

  const groupedTalents = useMemo(() => {
    const groups: Record<string, { locationName: string, lat: number, lng: number, talents: Talent[] }> = {};
    filteredTalents.forEach(talent => {
      if (!groups[talent.locationName]) {
        groups[talent.locationName] = {
          locationName: talent.locationName,
          lat: talent.lat,
          lng: talent.lng,
          talents: []
        };
      }
      groups[talent.locationName].talents.push(talent);
    });
    return Object.values(groups);
  }, [filteredTalents]);


  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // 1. エリアフィルタ
      let matchesArea = true;
      if (filterArea === 'shinjuku') matchesArea = !!job.locationName?.includes('新宿');
      else if (filterArea === 'shibuya') matchesArea = !!job.locationName?.includes('渋谷');
      else if (filterArea === 'ikebukuro') matchesArea = !!job.locationName?.includes('池袋') || !!job.locationName?.includes('豊島');

      // 2. 限定公開フィルタ
      const matchesLimited = currentUser
        ? (!job.allowedCompanyIds || job.allowedCompanyIds.length === 0 ||
           job.allowedCompanyIds.includes(currentUser.id) || 
           job.authorId === currentUser.id)
        : true;

      // 3. 緊急募集フィルタ
      const matchesUrgent = includeUrgent || !job.isUrgent;

      // 4. 職種フィルター
      if (filterJobRoles.length > 0 && !filterJobRoles.includes(job.roleType || '')) {
        return false;
      }

      // 5. 対象キャリア
      if (filterCarriers.length > 0 && !filterCarriers.includes(job.carrier || '')) {
        return false;
      }

      // 6. 販路（店舗種別）
      if (filterChannels.length > 0 && !filterChannels.includes(job.salesChannel || '')) {
        return false;
      }

      // 7. 日給下限
      if (job.price < filterMinPrice) {
        return false;
      }

      // 8. 締切フィルター＆期限切れ非表示
      let remainingDays = 999;
      if (job.applicationDeadline) {
        const dl = new Date(job.applicationDeadline);
        const today = new Date();
        dl.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        remainingDays = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 3600 * 24));
      }

      if (remainingDays < 0) {
        return false; // 締切過ぎの案件は表示しない
      }

      if (filterDeadlineDays !== null && remainingDays > filterDeadlineDays) {
        return false;
      }

      // 9. キーワード検索
      if (searchKeyword.trim() !== '') {
        const kw = searchKeyword.toLowerCase();
        const titleMatch = job.title?.toLowerCase().includes(kw);
        const descMatch = job.description?.toLowerCase().includes(kw) || job.detailedDescription?.toLowerCase().includes(kw);
        const locMatch = job.locationName?.toLowerCase().includes(kw);
        if (!titleMatch && !descMatch && !locMatch) {
          return false;
        }
      }

      return matchesArea && matchesLimited && matchesUrgent;
    });
  }, [jobs, filterArea, includeUrgent, currentUser, filterJobRoles, filterCarriers, filterChannels, filterMinPrice, filterDeadlineDays, searchKeyword]);

  const sortedJobs = useMemo(() => {
    let list = [...filteredJobs];
    if (jobSortOrder === 'priceHigh') {
      list.sort((a, b) => b.price - a.price);
    } else if (jobSortOrder === 'dateNear') {
      list.sort((a, b) => {
        const dateA = a.eventDate || '9999-12-31';
        const dateB = b.eventDate || '9999-12-31';
        return dateA.localeCompare(dateB);
      });
    } else {
      // 'newest' (新着順：モックのため配列の逆順)
      list.reverse();
    }
    return list;
  }, [filteredJobs, jobSortOrder]);

  const filteredTalentGroups = useMemo(() => {
    return groupedTalents.filter(group => {
      if (filterArea === 'all') return true;
      if (filterArea === 'shinjuku') return group.locationName.includes('新宿');
      if (filterArea === 'shibuya') return group.locationName.includes('渋谷');
      if (filterArea === 'ikebukuro') return group.locationName.includes('池袋') || group.locationName.includes('豊島');
      return true;
    });
  }, [groupedTalents, filterArea]);

  // 案件をエリア（座標）ごとにグループ化する
  const groupedJobs = useMemo(() => {
    const groups: Record<string, { lat: number, lng: number, jobs: Job[], hasUrgent: boolean }> = {};
    filteredJobs.forEach(job => {
      const key = `${job.lat.toFixed(4)},${job.lng.toFixed(4)}`; // 座標でグループ化
      if (!groups[key]) {
        groups[key] = {
          lat: job.lat,
          lng: job.lng,
          jobs: [],
          hasUrgent: false
        };
      }
      groups[key].jobs.push(job);
      if (job.isUrgent) {
        groups[key].hasUrgent = true;
      }
    });
    return Object.values(groups);
  }, [filteredJobs]);

  // mode と data の変更を検知してマップのピンを出し分ける
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;
    markersGroupRef.current.clearLayers();

    if (mode === 'job') {
      groupedJobs.forEach((group) => {
        const circleColor = group.hasUrgent ? '#EF4444' : '#3B82F6';
        
        const jobGroupIcon = L.divIcon({
          className: 'job-group-location-marker',
          html: `<div style="
            width: 32px; height: 32px; background-color: ${circleColor}; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px ${group.hasUrgent ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;
          ">${group.jobs.length}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([group.lat, group.lng], { icon: jobGroupIcon });
        
        // ポップアップ内に全案件のリストを描画
        const jobsHtml = group.jobs.map(job => {
          const statusText = job.status === 'open' ? '募集中' : job.status === 'closed' ? '成約済' : '交渉中';
          return `
          <div style="background: ${job.isUrgent ? '#FEF2F2' : '#F9FAFB'}; border: 1px solid ${job.isUrgent ? '#FECACA' : '#E5E7EB'}; padding: 8px; border-radius: 6px; margin-bottom: 8px;">
            <div style="display: flex; gap: 4px; margin-bottom: 4px;">
              <span style="font-size: 10px; padding: 2px 4px; background: #E0E7FF; color: #4338CA; border-radius: 4px; font-weight: bold;">${statusText}</span>
              ${job.contractType ? `<span style="font-size: 10px; padding: 2px 4px; background: #F1F5F9; color: #475569; border-radius: 4px; border: 1px solid #CBD5E1; font-weight: bold;">${job.contractType}</span>` : ''}
            </div>
            <div style="font-weight: bold; font-size: 13px; color: #111827; margin-bottom: 4px; line-height: 1.3;">${job.title}</div>
            <div style="font-size: 11px; color: #6B7280; margin-bottom: 4px;">${job.carrier || ''} ${job.salesChannel || ''}</div>
            <div style="font-weight: bold; font-size: 13px; color: var(--primary);">¥${job.price.toLocaleString()}/日</div>
            <button class="view-job-btn" data-id="${job.id}" style="margin-top: 6px; width: 100%; padding: 6px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">詳細を見る</button>
          </div>
        `}).join('');

        marker.bindPopup(`
          <div style="font-family: 'Inter', sans-serif; max-height: 250px; overflow-y: auto; padding-right: 8px; width: 220px;">
            <div style="font-size: 13px; font-weight: bold; color: #6B7280; margin-bottom: 8px; text-align: center; border-bottom: 2px solid #E5E7EB; padding-bottom: 4px;">このエリアの募集: ${group.jobs.length}件</div>
            ${jobsHtml}
          </div>
        `);
        markersGroupRef.current?.addLayer(marker);
      });
    } else {
      filteredTalentGroups.forEach((group) => {
        const talentGroupIcon = L.divIcon({
          className: 'talent-group-location-marker',
          html: `<div style="
            width: 32px; height: 32px; background-color: #10B981; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;
          ">${group.talents.length}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([group.lat, group.lng], { icon: talentGroupIcon });
        marker.bindPopup(`
          <div style="font-family: 'Inter', sans-serif; text-align: center;">
            <b style="font-size: 15px; display: block; margin-bottom: 8px;">${group.locationName}</b>
            <div style="font-size: 14px; color: #10B981; font-weight: bold; margin-bottom: 12px;">人材: ${group.talents.length}名</div>
            <button class="view-area-btn" data-area="${group.locationName}" style="width: 100%; padding: 6px; background: #10B981; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">リストを見る</button>
          </div>
        `);
        markersGroupRef.current?.addLayer(marker);
      });
    }
  }, [mode, groupedJobs, filteredTalentGroups]);


  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (mode === 'job') {
      count += filterJobRoles.length;
      count += filterCarriers.length;
      count += filterChannels.length;
      if (filterMinPrice > 0) count += 1;
      if (filterDeadlineDays !== null) count += 1;
      if (searchKeyword.trim() !== '') count += 1;
    } else {
      count += filterTalentSkills.length;
      count += filterTalentCarriers.length;
      count += filterTalentTrainings.length;
      if (searchKeyword.trim() !== '') count += 1;
    }
    return count;
  }, [mode, filterJobRoles, filterCarriers, filterChannels, filterMinPrice, filterDeadlineDays, filterTalentSkills, filterTalentCarriers, filterTalentTrainings, searchKeyword]);

  const hasActiveFilters = useMemo(() => {
    if (mode === 'job') {
      return jobSortOrder !== 'newest' || activeFiltersCount > 0;
    } else {
      return talentSortOrder !== 'priceLow' || activeFiltersCount > 0;
    }
  }, [mode, jobSortOrder, talentSortOrder, activeFiltersCount]);

  const clearAllFilters = () => {
    setSearchKeyword('');
    setTempKeyword('');
    if (mode === 'job') {
      setJobSortOrder('newest');
      setFilterJobRoles([]);
      setFilterCarriers([]);
      setFilterChannels([]);
      setFilterMinPrice(0);
      setFilterDeadlineDays(null);
    } else {
      setTalentSortOrder('priceLow');
      setFilterTalentSkills([]);
      setFilterTalentCarriers([]);
      setFilterTalentTrainings([]);
    }
  };

  return (
    <div className="view active" style={{ display: 'flex', flexDirection: 'column' }}>
      {isSelectingLocationOnMap && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(8px)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '30px',
          zIndex: 4000,
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.15)'
        }}>
          <span className="material-symbols-outlined" style={{ color: '#EF4444' }}>pin_drop</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>地図上をクリックしてピンを立ててください</span>
          <button 
            type="button" 
            onClick={cancelMapSelection} 
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            キャンセル
          </button>
        </div>
      )}
      {!isSelectingLocationOnMap && (
      <header className="glass-header" style={{ zIndex: 1000, position: 'relative' }}>
        <div className="header-top">
          <div className="toggle-switch">
            <input
              type="radio"
              id="mode-job"
              name="search-mode"
              checked={mode === 'job'}
              onChange={() => {
                setMode('job');
                setFilterArea('all');
              }}
            />
            <label htmlFor="mode-job">案件を探す</label>
            <input
              type="radio"
              id="mode-talent"
              name="search-mode"
              checked={mode === 'talent'}
              onChange={() => {
                setMode('talent');
                setFilterArea('all');
              }}
            />
            <label htmlFor="mode-talent">人材を探す</label>
            <div className="toggle-slider"></div>
          </div>
        </div>
        <div className="header-search" style={{ justifyContent: 'flex-end' }}>
          <button 
            className="filter-btn" 
            onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            style={{ 
              backgroundColor: viewMode === 'list' ? 'var(--primary)' : 'white',
              color: viewMode === 'list' ? 'white' : 'var(--text-main)',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            <span className="material-symbols-outlined">
              {viewMode === 'map' ? 'format_list_bulleted' : 'map'}
            </span>
          </button>
          <button 
            className="filter-btn" 
            onClick={handleRefresh}
            style={{ 
              backgroundColor: 'white',
              color: 'var(--text-main)',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease',
              marginLeft: '4px'
            }}
            title="データを更新"
          >
            <span className={`material-symbols-outlined ${isRefreshing ? 'spin-anim' : ''}`}>
              refresh
            </span>
          </button>
          <button 
            className="filter-btn" 
            onClick={() => setIsFilterSheetOpen(true)}
            style={{ 
              backgroundColor: hasActiveFilters ? 'var(--primary)' : 'white',
              color: hasActiveFilters ? 'white' : 'var(--text-main)',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease',
              marginLeft: '4px',
              position: 'relative'
            }}
            title="詳細フィルター"
          >
            <span className="material-symbols-outlined">
              tune
            </span>
            {activeFiltersCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#EF4444',
                color: 'white',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                border: '2px solid white'
              }}>
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </header>
      )}

      <div 
        className="map-area" 
        id="map-area" 
        style={{ display: viewMode === 'map' || isSelectingLocationOnMap ? 'block' : 'none', flex: 1, zIndex: 1, position: 'relative' }}
      ></div>

      {viewMode === 'list' && !isSelectingLocationOnMap && (
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', zIndex: 2, paddingBottom: '80px' }}>
          <div style={{ padding: '16px', background: 'white', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
              {!hasActiveFilters ? (
                <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>フィルター未設定</span>
              ) : (
                <>
                  {mode === 'job' ? (
                    <>
                      {searchKeyword.trim() !== '' && (
                        <div className="filter-chip">
                          <span>キーワード: "{searchKeyword}"</span>
                          <button onClick={() => {
                            setSearchKeyword('');
                            setTempKeyword('');
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                          </button>
                        </div>
                      )}
                      {filterJobRoles.map(role => (
                        <div key={role} className="filter-chip">
                          <span>{role}</span>
                          <button onClick={() => setFilterJobRoles(prev => prev.filter(r => r !== role))}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                          </button>
                        </div>
                      ))}
                      {filterCarriers.map(carrier => (
                        <div key={carrier} className="filter-chip">
                          <span>{carrier}</span>
                          <button onClick={() => setFilterCarriers(prev => prev.filter(c => c !== carrier))}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                          </button>
                        </div>
                      ))}
                      {filterChannels.map(channel => (
                        <div key={channel} className="filter-chip">
                          <span>{channel}</span>
                          <button onClick={() => setFilterChannels(prev => prev.filter(c => c !== channel))}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                          </button>
                        </div>
                      ))}
                      {filterMinPrice > 0 && (
                        <div className="filter-chip">
                          <span>¥{filterMinPrice.toLocaleString()}以上</span>
                          <button onClick={() => setFilterMinPrice(0)}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                          </button>
                        </div>
                      )}
                      {filterDeadlineDays !== null && (
                        <div className="filter-chip">
                          <span>締切{filterDeadlineDays}日以内</span>
                          <button onClick={() => setFilterDeadlineDays(null)}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {searchKeyword.trim() !== '' && (
                        <div className="filter-chip">
                          <span>キーワード: "{searchKeyword}"</span>
                          <button onClick={() => {
                            setSearchKeyword('');
                            setTempKeyword('');
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                          </button>
                        </div>
                      )}
                      {filterTalentSkills.map(skill => (
                        <div key={skill} className="filter-chip">
                          <span>{skill}</span>
                          <button onClick={() => setFilterTalentSkills(prev => prev.filter(s => s !== skill))}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                          </button>
                        </div>
                      ))}
                      {filterTalentCarriers.map(carrier => (
                        <div key={carrier} className="filter-chip">
                          <span>{carrier}</span>
                          <button onClick={() => setFilterTalentCarriers(prev => prev.filter(c => c !== carrier))}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                          </button>
                        </div>
                      ))}
                      {filterTalentTrainings.map(tid => {
                        const tr = allTrainings.find(t => t.id === tid);
                        return (
                          <div key={tid} className="filter-chip">
                            <span>{tr?.title || '研修'}</span>
                            <button onClick={() => setFilterTalentTrainings(prev => prev.filter(t => t !== tid))}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                            </button>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <button 
                    onClick={clearAllFilters}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      border: '1px solid #EF4444',
                      background: 'none',
                      color: '#EF4444',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    すべてクリア
                  </button>
                </>
              )}
            </div>
            
            {mode === 'job' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', borderTop: '1px solid #f3f4f6', paddingTop: '8px' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', color: 'var(--text-main)' }}>
                  <input type="checkbox" checked={includeUrgent} onChange={(e) => setIncludeUrgent(e.target.checked)} style={{ width: '14px', height: '14px' }} />
                  <strong>緊急募集の案件を表示する</strong>
                </label>
              </div>
            )}
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mode === 'job' ? (
              sortedJobs.length > 0 ? (
                sortedJobs.map(job => {
                  let remainingDaysText = '';
                  let remainingDaysColor = '#059669';
                  let remainingDaysBg = '#ECFDF5';
                  if (job.applicationDeadline) {
                    const dl = new Date(job.applicationDeadline);
                    const today = new Date();
                    dl.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);
                    const diff = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 3600 * 24));
                    if (diff === 0) { remainingDaysText = '本日締切'; remainingDaysColor = '#DC2626'; remainingDaysBg = '#FEF2F2'; }
                    else if (diff <= 3) { remainingDaysText = `あと${diff}日`; remainingDaysColor = '#D97706'; remainingDaysBg = '#FFFBEB'; }
                    else if (diff <= 7) { remainingDaysText = `あと${diff}日`; }
                    else { remainingDaysText = '1週間以上'; }
                  }

                  return (
                  <div key={job.id} 
                    className={`job-card-modern ${job.isUrgent ? 'job-card-urgent' : ''}`}
                    onClick={() => {
                      if (currentUser?.status === 'pending') {
                        alert('本人確認書類（登記簿等）の審査中です。\n審査完了後に詳細情報が閲覧可能になります。');
                        return;
                      }
                      setSelectedJob(job);
                    }}
                  >
                    
                    {job.isUrgent && (
                      <div className="job-card-urgent-ribbon">
                        緊急募集
                      </div>
                    )}

                    <div className="job-title-row">
                      <h3>{job.title}</h3>
                      {remainingDaysText && (
                        <span style={{ margin: 0, fontSize: '11px', whiteSpace: 'nowrap', padding: '4px 8px', borderRadius: '8px', color: remainingDaysColor, backgroundColor: remainingDaysBg, fontWeight: 'bold' }}>
                          {remainingDaysText}
                        </span>
                      )}
                    </div>

                    {job.locationName && (
                      <div className="job-location">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#EF4444' }}>location_on</span>
                        {job.locationName.split(' ').pop()} {/* Show only the last part or keep it short. For now keep as is */}
                      </div>
                    )}

                    <div className="job-tags-container">
                      {job.carrier && <span className="modern-tag tag-carrier">{job.carrier}</span>}
                      {job.salesChannel && <span className="modern-tag tag-channel">{job.salesChannel}</span>}
                      {job.roleType && <span className="modern-tag tag-role">{job.roleType}</span>}
                      {job.workLocation && <span className="modern-tag tag-location">{job.workLocation}</span>}
                    </div>

                    <p className="job-desc">{job.description}</p>
                    
                    <div className="job-stats-row">
                      <div className="job-stat-item">
                        <span className="job-stat-label">日程</span>
                        <span className="job-stat-value">
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#2563EB' }}>calendar_today</span>
                          {job.eventDate ? formatJobDates(job.eventDate) : '未定'}
                        </span>
                      </div>
                      <div className="job-stat-item" style={{ alignItems: 'flex-end' }}>
                        <span className="job-stat-label">単価</span>
                        <span className="job-stat-value">
                          <span className="job-price">¥{job.price.toLocaleString()}</span>
                          <span className="job-price-unit">/ 日</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="job-card-arrow">
                      <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_forward</span>
                    </div>
                  </div>
                )})
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-sub)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '8px', opacity: 0.5 }}>search_off</span>
                  <p>該当する案件が見つかりません</p>
                </div>
              )
            ) : (
              filteredTalentGroups.length > 0 ? (
                filteredTalentGroups.map(group => (
                  <div key={group.locationName} style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', animation: 'fadeIn 0.3s ease', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: '#F9FAFB', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-main)' }}>{group.locationName}</h3>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#10B981', background: '#D1FAE5', padding: '4px 10px', borderRadius: '12px' }}>{group.talents.length}名</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {group.talents.map((talent) => (
                        <div key={talent.id} 
                          className="job-card-modern"
                          onClick={() => setSelectedTalent(talent)}
                          style={{ margin: '8px 16px', borderBottom: 'none' }}
                        >
                          <div className="job-title-row" style={{ paddingRight: '0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10B981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                                {talent.maskedName.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '2px' }}>{talent.companyName}</div>
                                <h3 style={{ fontSize: '15px', color: 'var(--text-main)', margin: 0 }}>{talent.maskedName}</h3>
                              </div>
                            </div>
                            <span className="status-badge badge-contracted" style={{ margin: 0, fontSize: '11px', background: '#D1FAE5', color: '#065F46', whiteSpace: 'nowrap' }}>稼働可能</span>
                          </div>
                          
                          {talent.availableDates && (
                            <div className="job-location" style={{ color: 'var(--primary)', marginTop: '8px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_month</span>
                              希望勤務日: {formatJobDates(talent.availableDates)}
                            </div>
                          )}

                          <div className="job-tags-container" style={{ marginTop: '8px' }}>
                            {talent.carriers?.map(carrier => (
                              <span key={carrier} className="modern-tag tag-carrier">{carrier}</span>
                            ))}
                            {talent.skills.map(skill => (
                              <span key={skill} className="modern-tag tag-location">{skill}</span>
                            ))}
                          </div>
                          
                          <div className="job-stats-row">
                            <div className="job-stat-item">
                              <span className="job-stat-label">単価</span>
                              <span className="job-stat-value">
                                <span className="job-price" style={{ color: '#10B981' }}>¥{talent.price.toLocaleString()}</span>
                                <span className="job-price-unit">/ 日〜</span>
                              </span>
                            </div>
                          </div>

                          <div className="job-card-arrow" style={{ color: '#10B981' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_forward</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-sub)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '8px', opacity: 0.5 }}>search_off</span>
                  <p>該当する人材が見つかりません</p>
                </div>
              )
            )}
          </div>
        </main>
      )}

      {/* 人材プロフィール オーバーレイ */}
      <div className={`overlay-view ${selectedTalent ? 'show' : ''}`} style={{ display: selectedTalent ? 'flex' : 'none', transform: selectedTalent ? 'translateX(0)' : 'translateX(100%)', zIndex: 2000 }}>
        <header className="solid-header overlay-header">
          <button className="icon-btn-dark" onClick={() => setSelectedTalent(null)}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1 style={{ fontSize: '16px' }}>{selectedTalent?.maskedName}の詳細</h1>
          <button className="icon-btn-dark">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </header>

        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {selectedTalent && (
            <>
              {/* 基本情報 */}
              <div style={{ background: 'white', padding: '24px 16px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#10B981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 12px auto', fontWeight: 'bold' }}>
                  {selectedTalent.maskedName.charAt(0)}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '4px' }}>{selectedTalent.companyName}</div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{selectedTalent.maskedName}</h2>
                <span className="status-badge badge-contracted" style={{ display: 'inline-block', background: '#D1FAE5', color: '#065F46', marginBottom: '16px' }}>稼働可能</span>
                
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {selectedTalent.carriers?.map(carrier => (
                    <span key={carrier} style={{ fontSize: '12px', padding: '4px 10px', background: '#E0E7FF', color: '#4338CA', borderRadius: '4px', fontWeight: 'bold' }}>{carrier}</span>
                  ))}
                  {selectedTalent.skills.map(skill => (
                    <span key={skill} style={{ fontSize: '12px', padding: '4px 10px', background: '#F3F4F6', color: '#4B5563', borderRadius: '16px' }}>{skill}</span>
                  ))}
                </div>
              </div>

              {/* 希望勤務日 */}
              {selectedTalent.availableDates && (
                <div style={{ background: 'white', padding: '16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
                    希望勤務日
                  </h3>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: 'var(--primary)' }}>{selectedTalent.availableDates}</p>
                </div>
              )}

              {/* 受講済み研修 */}
              {selectedTalent.completedTrainings && selectedTalent.completedTrainings.length > 0 && (
                <div style={{ background: 'white', padding: '16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10B981' }}>verified</span>
                    受講済み研修
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedTalent.completedTrainings.map(tid => {
                      const tr = allTrainings.find(t => t.id === tid);
                      return (
                        <span key={tid} style={{ fontSize: '12px', padding: '4px 10px', background: '#D1FAE5', color: '#065F46', borderRadius: '16px', fontWeight: 'bold' }}>
                          ✓ {tr?.title || '受講済み研修'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 詳細情報 */}
              <div style={{ background: 'white', padding: '16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>monetization_on</span>
                  希望単価
                </h3>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>¥{selectedTalent.price.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-sub)' }}>/ 日〜</span></p>
              </div>

              <div style={{ background: 'white', padding: '16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>corporate_fare</span>
                  拠点・最寄り駅
                </h3>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                  拠点: {selectedTalent.baseLocation || '未設定'}<br/>
                  最寄り駅: {selectedTalent.nearestStation || '未設定'}
                </p>
              </div>

              <div style={{ background: 'white', padding: '16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
                  希望勤務エリア
                </h3>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{selectedTalent.preferredArea || '全国対応可能'}</p>
              </div>

              <div style={{ background: 'white', padding: '16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history</span>
                  経歴・実績
                </h3>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>{selectedTalent.experience || '記載なし'}</p>
              </div>

              <div style={{ background: 'white', padding: '16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
                  自己PR
                </h3>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{selectedTalent.prText || '記載なし'}</p>
              </div>
            </>
          )}
        </main>

        <footer style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white', padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', zIndex: 10 }}>
          <button style={{ flex: 1, padding: '12px', background: '#10B981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined">send</span>
            メッセージを送る
          </button>
        </footer>
      </div>

      {/* 案件詳細 オーバーレイ */}
      <div className={`overlay-view ${selectedJob ? 'show' : ''}`} style={{ display: selectedJob ? 'flex' : 'none', transform: selectedJob ? 'translateX(0)' : 'translateX(100%)', zIndex: 2000 }}>
        <header className="solid-header overlay-header">
          <button className="icon-btn-dark" onClick={() => setSelectedJob(null)}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1 style={{ fontSize: '16px' }}>案件詳細</h1>
          <button className="icon-btn-dark">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </header>

        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {selectedJob && (
            <>
              <div style={{ background: 'white', padding: '24px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {selectedJob.carrier && <span style={{ fontSize: '12px', padding: '4px 10px', background: '#E0E7FF', color: '#4338CA', borderRadius: '16px', fontWeight: 'bold' }}>{selectedJob.carrier}</span>}
                  {selectedJob.salesChannel && <span style={{ fontSize: '12px', padding: '4px 10px', background: '#FEF3C7', color: '#D97706', borderRadius: '16px', fontWeight: 'bold' }}>{selectedJob.salesChannel}</span>}
                  {selectedJob.roleType && <span style={{ fontSize: '12px', padding: '4px 10px', background: '#DCFCE7', color: '#15803D', borderRadius: '16px', fontWeight: 'bold' }}>{selectedJob.roleType}</span>}
                  {selectedJob.workLocation && <span style={{ fontSize: '12px', padding: '4px 10px', background: '#F3F4F6', color: '#374151', borderRadius: '16px' }}>{selectedJob.workLocation}</span>}
                </div>
                <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', lineHeight: '1.4' }}>{selectedJob.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-sub)', fontSize: '14px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>corporate_fare</span>
                  {allUsers.find(u => u.id === selectedJob.authorId)?.name || '不明な会社'}
                </div>
              </div>

              <div style={{ background: 'white', padding: '16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>monetization_on</span>
                  単価（報酬）
                </h3>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>¥{selectedJob.price.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-main)' }}>/ 日</span></p>
              </div>

              <div style={{ background: 'white', padding: '16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
                  勤務エリア
                </h3>
                <p style={{ margin: 0, fontSize: '15px' }}>{selectedJob.locationName || '記載なし'}</p>
              </div>

              <div style={{ background: 'white', padding: '16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schedule</span>
                  勤務時間・期間
                </h3>
                <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6' }}>
                  {selectedJob.workHours || '記載なし'}<br/>
                  {selectedJob.eventDate && <>開催日: {selectedJob.eventDate}<br/></>}
                  {selectedJob.applicationDeadline && <span style={{ color: '#EF4444', fontWeight: 'bold' }}>応募締切: {selectedJob.applicationDeadline}</span>}
                </p>
              </div>

              {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                <div style={{ background: 'white', padding: '16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>psychology</span>
                    求めるスキル・条件
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedJob.requirements.map(req => (
                      <span key={req} style={{ fontSize: '13px', padding: '6px 12px', background: '#F3F4F6', color: '#4B5563', borderRadius: '4px' }}>{req}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background: 'white', padding: '16px', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--text-sub)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
                  業務内容の詳細
                </h3>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{selectedJob.detailedDescription || selectedJob.description}</p>
              </div>
            </>
          )}
        </main>

        <footer style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white', padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', zIndex: 10 }}>
          <button 
            onClick={() => setIsNdaModalOpen(true)}
            style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            応募画面へ進む
          </button>
        </footer>

        {isNdaModalOpen && selectedJob && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>security</span>
                応募の確認と秘密保持
              </h3>
              <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px', lineHeight: '1.6' }}>
                マッチング成立後、正確な店舗情報・連絡先等がアプリ上で開示されます。情報漏洩には十分ご注意ください。
              </p>
              
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '24px', cursor: 'pointer', padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <input type="checkbox" checked={ndaAgreed} onChange={e => setNdaAgreed(e.target.checked)} style={{ marginTop: '4px', width: '16px', height: '16px', accentColor: 'var(--primary)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#1E293B', fontWeight: 'bold', lineHeight: '1.5' }}>
                  本案件の契約形態を理解し、開示される店舗情報等の秘密保持に同意します。
                </span>
              </label>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setIsNdaModalOpen(false); setNdaAgreed(false); }} style={{ flex: 1, padding: '12px', background: '#F1F5F9', border: 'none', borderRadius: '8px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}>キャンセル</button>
                <button 
                  disabled={!ndaAgreed} 
                  onClick={() => {
                    alert('応募が完了しました！\n（モック版のため実際には応募されていません）');
                    setIsNdaModalOpen(false);
                    setNdaAgreed(false);
                  }}
                  style={{ flex: 1, padding: '12px', background: ndaAgreed ? 'var(--primary)' : '#94A3B8', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: ndaAgreed ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                >
                  同意して応募
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 新規作成 オーバーレイ */}
      <div className={`overlay-view ${isCreateFormOpen ? 'show' : ''}`} style={{ display: isCreateFormOpen ? 'flex' : 'none', transform: isCreateFormOpen ? 'translateX(0)' : 'translateX(100%)', zIndex: 3000 }}>
        <header className="solid-header overlay-header">
          <button className="icon-btn-dark" onClick={() => setIsCreateFormOpen(false)} disabled={isSubmitting}>
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 style={{ fontSize: '16px' }}>新規追加</h1>
          <div style={{ width: '40px' }}></div>
        </header>

        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <button 
              type="button"
              onClick={() => setCreateFormType('job')}
              disabled={isSubmitting}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: createFormType === 'job' ? '2px solid var(--primary)' : '1px solid var(--border-color)', background: createFormType === 'job' ? '#EFF6FF' : 'white', color: createFormType === 'job' ? 'var(--primary)' : 'var(--text-main)', fontWeight: 'bold' }}
            >
              案件情報を掲示
            </button>
            <button 
              type="button"
              onClick={() => setCreateFormType('talent')}
              disabled={isSubmitting}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: createFormType === 'talent' ? '2px solid #10B981' : '1px solid var(--border-color)', background: createFormType === 'talent' ? '#ECFDF5' : 'white', color: createFormType === 'talent' ? '#10B981' : 'var(--text-main)', fontWeight: 'bold' }}
            >
              人材情報を掲示
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {createFormType === 'job' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>案件タイトル *</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} disabled={isSubmitting} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="例: auショップ新宿 イベントスタッフ" />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>キャリア/回線 *</label>
                  <select required value={formData.carrier} onChange={e => setFormData({...formData, carrier: e.target.value as any, locationName: formData.exactLocation ? generateMaskedLocation(formData.exactLocation, formData.exactLocation, formData.salesChannel, e.target.value, formData.workLocation) : formData.locationName})} disabled={isSubmitting} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                    <option value="" disabled>選択してください</option>
                    <option value="docomo">docomo</option>
                    <option value="au/UQmobile">au/UQmobile</option>
                    <option value="SoftBank/Y!mobile">SoftBank/Y!mobile</option>
                    <option value="BB">BB</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>職種 *</label>
                  <select required value={formData.roleType} onChange={e => setFormData({...formData, roleType: e.target.value})} disabled={isSubmitting} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                    <option value="" disabled>選択してください</option>
                    <option value="キャンペーンクルー">キャンペーンクルー</option>
                    <option value="クローザー">クローザー</option>
                    <option value="ディレクター">ディレクター</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>販路 *</label>
                  <select required value={formData.salesChannel} onChange={e => setFormData({...formData, salesChannel: e.target.value as any, locationName: formData.exactLocation ? generateMaskedLocation(formData.exactLocation, formData.exactLocation, e.target.value, formData.carrier, formData.workLocation) : formData.locationName})} disabled={isSubmitting} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                    <option value="" disabled>選択してください</option>
                    <option value="量販店">量販店</option>
                    <option value="ショップ">ショップ</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>稼働場所 *</label>
                  <select required value={formData.workLocation} onChange={e => setFormData({...formData, workLocation: e.target.value as any, locationName: formData.exactLocation ? generateMaskedLocation(formData.exactLocation, formData.exactLocation, formData.salesChannel, formData.carrier, e.target.value) : formData.locationName})} disabled={isSubmitting} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                    <option value="" disabled>選択してください</option>
                    <option value="店内">店内</option>
                    <option value="外販（複合施設など）">外販（複合施設など）</option>
                    <option value="外販（スーパーなど）">外販（スーパーなど）</option>
                    <option value="外販（その他）">外販（その他）</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>正確な店舗名・住所 (非公開) *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                      <Autocomplete
                        apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                        onPlaceSelected={(place: any) => {
                          if (place.geometry) {
                            const lat = place.geometry.location.lat();
                            const lng = place.geometry.location.lng();
                            const address = place.name || place.formatted_address || '';
                            const fullAddress = place.formatted_address || address;
                            
                            setTempSelectedLocation({ lat, lng });
                            setFormData(prev => ({
                              ...prev,
                              exactLocation: address,
                              locationName: generateMaskedLocation(fullAddress, address, prev.salesChannel, prev.carrier, prev.workLocation)
                            }));
                            
                            if (mapRef.current) {
                              if (tempMarkerRef.current) tempMarkerRef.current.remove();
                              const customIcon = L.divIcon({
                                className: 'temp-location-marker',
                                html: `<div style="width: 20px; height: 20px; background-color: #EF4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
                                iconSize: [20, 20], iconAnchor: [10, 10],
                              });
                              tempMarkerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(mapRef.current);
                              mapRef.current.setView([lat, lng], 16);
                            }
                          }
                        }}
                        options={{
                          types: ['establishment', 'geocode'],
                          componentRestrictions: { country: 'jp' },
                        }}
                        defaultValue={formData.exactLocation}
                        onChange={(e: any) => {
                          const newExact = e.target.value;
                          setFormData({...formData, exactLocation: newExact, locationName: generateMaskedLocation(newExact, newExact, formData.salesChannel, formData.carrier, formData.workLocation)});
                        }}
                        disabled={isSubmitting} 
                        style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} 
                        placeholder="例: ヤマダデンキ 新宿西口店" 
                      />
                    ) : (
                      <input 
                        type="text" 
                        required 
                        value={formData.exactLocation} 
                        onChange={e => {
                          const newExact = e.target.value;
                          setFormData({...formData, exactLocation: newExact, locationName: generateMaskedLocation(newExact, newExact, formData.salesChannel, formData.carrier, formData.workLocation)});
                        }} 
                        disabled={isSubmitting} 
                        style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} 
                        placeholder="※APIキー未設定: 手動で入力してください" 
                      />
                    )}
                    <button
                      type="button"
                      onClick={startMapSelection}
                      disabled={isSubmitting}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>map</span>
                      地図から選択
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                    ※地図をクリックすると住所が自動入力され、公開用の表示名も自動生成されます
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px dashed #ccc' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>公開用の表示名 (マスキング済) *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.locationName} 
                    onChange={e => setFormData({...formData, locationName: e.target.value})} 
                    disabled={isSubmitting} 
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} 
                    placeholder="例: 新宿区のYデンキ" 
                  />
                  <span style={{ fontSize: '11px', color: 'var(--primary)' }}>
                    ※アプリ上にはこの名称のみが表示されます。必要に応じて手動で調整してください。
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>単価 (円) *</label>
                    <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} disabled={isSubmitting} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>開催日 (複数選択可) *</label>
                    <CalendarPicker selectedDates={selectedJobDates} onChange={dates => setSelectedJobDates(dates)} />
                    {selectedJobDates.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold', marginTop: '4px' }}>
                        選択中: {selectedJobDates.length}日間 ({[...selectedJobDates].sort().join(', ')})
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>応募締切日 *</label>
                    <input type="date" required value={formData.applicationDeadline} onChange={e => setFormData({...formData, applicationDeadline: e.target.value})} disabled={isSubmitting} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                      <input type="checkbox" checked={formData.isUrgent} onChange={e => setFormData({...formData, isUrgent: e.target.checked})} disabled={isSubmitting} style={{ width: '16px', height: '16px' }} />
                      <span style={{ color: '#EF4444' }}>🚨 緊急募集にする (最優先表示)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                      <input type="checkbox" checked={formData.isLimited} onChange={e => setFormData({...formData, isLimited: e.target.checked})} disabled={isSubmitting} style={{ width: '16px', height: '16px' }} />
                      <span style={{ color: 'var(--primary)' }}>🔒 限定公開 (親しい取引先のみ)</span>
                    </label>
                  </div>

                  {formData.isLimited && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}>公開先企業を選択してください *</label>
                      <select 
                        value={targetCompanyId} 
                        onChange={e => setTargetCompanyId(e.target.value)} 
                        disabled={isSubmitting} 
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white', fontSize: '14px', outline: 'none' }}
                      >
                        {allUsers
                          .filter(u => u.id !== currentUser?.id)
                          .map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>業務内容の詳細</label>
                  <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} disabled={isSubmitting} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="具体的な仕事内容を記載してください"></textarea>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>掲示するスタッフを選択 *</label>
                  {myStaffs.length > 0 ? (
                    <select 
                      value={selectedStaffId} 
                      onChange={e => setSelectedStaffId(e.target.value)} 
                      disabled={isSubmitting} 
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', background: 'white', fontSize: '15px' }}
                    >
                      {myStaffs.map(staff => (
                        <option key={staff.id} value={staff.id}>{staff.name} ({staff.maskedName}) - {staff.baseLocation}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ padding: '16px', background: '#FEE2E2', color: '#991B1B', borderRadius: '8px', fontSize: '14px' }}>
                      登録されているスタッフがいません。先にスタッフを登録してください。
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>希望勤務日 *</label>
                  <CalendarPicker 
                    selectedDates={formData.selectedDates}
                    onChange={(dates) => setFormData({...formData, selectedDates: dates})}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '4px' }}>※連続した日程や飛び石の日程もタップして複数選択できます。</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px', marginBottom: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsCreateFormOpen(false);
                      navigate('/settings', { state: { openStaffOverlay: true } });
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '14px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person_add</span>
                    ＋新しいスタッフを登録する
                  </button>
                </div>
              </>
            )}

            <button type="submit" disabled={isSubmitting || (createFormType === 'talent' && (myStaffs.length === 0 || formData.selectedDates.length === 0))} style={{ padding: '14px', background: createFormType === 'job' ? 'var(--primary)' : '#10B981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: (isSubmitting || (createFormType === 'talent' && (myStaffs.length === 0 || formData.selectedDates.length === 0))) ? 'not-allowed' : 'pointer', marginTop: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', opacity: (isSubmitting || (createFormType === 'talent' && (myStaffs.length === 0 || formData.selectedDates.length === 0))) ? 0.7 : 1 }}>
              {isSubmitting ? '登録中...' : '掲示する'}
            </button>
          </form>
        </main>
      </div>

      {/* フィルターボトムシート */}
      <div className={`filter-sheet-backdrop ${isFilterSheetOpen ? 'show' : ''}`} onClick={() => setIsFilterSheetOpen(false)} style={{ zIndex: 3500 }}>
        <div className={`filter-sheet ${isFilterSheetOpen ? 'show' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="filter-sheet-header">
            <span className="filter-sheet-title">絞り込み・ソート</span>
            <button className="filter-sheet-close" onClick={() => setIsFilterSheetOpen(false)}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div className="filter-sheet-body">
            {/* キーワード・地名検索 (共通) */}
            <div className="filter-group">
              <span className="filter-group-title">キーワード・地名で検索</span>
              <div className="search-bar" style={{ background: 'var(--bg-gray)', border: '1px solid var(--border-color)', width: '100%' }}>
                <span className="material-symbols-outlined icon">search</span>
                <input 
                  type="text" 
                  value={tempKeyword} 
                  onChange={e => setTempKeyword(e.target.value)} 
                  placeholder="キーワードやエリア名を入力"
                />
              </div>
            </div>

            {mode === 'job' ? (
              <>
                {/* ソート順 */}
                <div className="filter-group">
                  <span className="filter-group-title">並び替え</span>
                  <div className="filter-options-grid">
                    <label className={`filter-radio-label ${jobSortOrder === 'newest' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="jobSort" 
                        value="newest" 
                        checked={jobSortOrder === 'newest'} 
                        onChange={() => setJobSortOrder('newest')} 
                      />
                      新着順
                    </label>
                    <label className={`filter-radio-label ${jobSortOrder === 'priceHigh' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="jobSort" 
                        value="priceHigh" 
                        checked={jobSortOrder === 'priceHigh'} 
                        onChange={() => setJobSortOrder('priceHigh')} 
                      />
                      単価の高い順
                    </label>
                    <label className={`filter-radio-label ${jobSortOrder === 'dateNear' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="jobSort" 
                        value="dateNear" 
                        checked={jobSortOrder === 'dateNear'} 
                        onChange={() => setJobSortOrder('dateNear')} 
                      />
                      開催日の近い順
                    </label>
                  </div>
                </div>

                {/* 職種 */}
                <div className="filter-group">
                  <span className="filter-group-title">職種</span>
                  <div className="filter-options-flex">
                    {['キャンペーンクルー', 'クローザー', 'ディレクター'].map(role => {
                      const isChecked = filterJobRoles.includes(role);
                      return (
                        <label key={role} className={`filter-checkbox-label ${isChecked ? 'active' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => {
                              setFilterJobRoles(prev => 
                                isChecked ? prev.filter(r => r !== role) : [...prev, role]
                              );
                            }} 
                          />
                          {role}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 対応キャリア */}
                <div className="filter-group">
                  <span className="filter-group-title">キャリア/回線</span>
                  <div className="filter-options-flex">
                    {['docomo', 'au/UQmobile', 'SoftBank/Y!mobile', 'BB'].map(carrier => {
                      const isChecked = filterCarriers.includes(carrier);
                      return (
                        <label key={carrier} className={`filter-checkbox-label ${isChecked ? 'active' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => {
                              setFilterCarriers(prev => 
                                isChecked ? prev.filter(c => c !== carrier) : [...prev, carrier]
                              );
                            }} 
                          />
                          {carrier}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 販路（店舗種別） */}
                <div className="filter-group">
                  <span className="filter-group-title">販路</span>
                  <div className="filter-options-flex">
                    {['ショップ', '量販店'].map(channel => {
                      const isChecked = filterChannels.includes(channel);
                      return (
                        <label key={channel} className={`filter-checkbox-label ${isChecked ? 'active' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => {
                              setFilterChannels(prev => 
                                isChecked ? prev.filter(c => c !== channel) : [...prev, channel]
                              );
                            }} 
                          />
                          {channel}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 日給下限 */}
                <div className="filter-group">
                  <span className="filter-group-title">日給下限</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number" 
                      value={filterMinPrice || ''} 
                      onChange={e => setFilterMinPrice(Number(e.target.value))} 
                      placeholder="下限なし"
                      className="filter-input-price"
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        width: '120px',
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>円以上</span>
                  </div>
                </div>

                {/* 締切までの日数 */}
                <div className="filter-group">
                  <span className="filter-group-title">応募締切</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number" 
                      value={filterDeadlineDays !== null ? filterDeadlineDays : ''} 
                      onChange={e => setFilterDeadlineDays(e.target.value ? Number(e.target.value) : null)} 
                      placeholder="指定なし"
                      className="filter-input-price"
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        width: '120px',
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>日以内</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 人材のソート順 */}
                <div className="filter-group">
                  <span className="filter-group-title">並び替え</span>
                  <div className="filter-options-grid">
                    <label className={`filter-radio-label ${talentSortOrder === 'priceLow' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="talentSort" 
                        value="priceLow" 
                        checked={talentSortOrder === 'priceLow'} 
                        onChange={() => setTalentSortOrder('priceLow')} 
                      />
                      単価の安い順
                    </label>
                    <label className={`filter-radio-label ${talentSortOrder === 'priceHigh' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="talentSort" 
                        value="priceHigh" 
                        checked={talentSortOrder === 'priceHigh'} 
                        onChange={() => setTalentSortOrder('priceHigh')} 
                      />
                      単価の高い順
                    </label>
                  </div>
                </div>

                {/* スキル */}
                <div className="filter-group">
                  <span className="filter-group-title">対応職種</span>
                  <div className="filter-options-flex">
                    {['キャンペーンクルー', 'クローザー', 'ディレクター'].map(skill => {
                      const isChecked = filterTalentSkills.includes(skill);
                      return (
                        <label key={skill} className={`filter-checkbox-label ${isChecked ? 'active' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => {
                              setFilterTalentSkills(prev => 
                                isChecked ? prev.filter(s => s !== skill) : [...prev, skill]
                              );
                            }} 
                          />
                          {skill}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* キャリア */}
                <div className="filter-group">
                  <span className="filter-group-title">対応キャリア</span>
                  <div className="filter-options-flex">
                    {['docomo', 'au/UQmobile', 'SoftBank/Y!mobile', 'BB'].map(carrier => {
                      const isChecked = filterTalentCarriers.includes(carrier);
                      return (
                        <label key={carrier} className={`filter-checkbox-label ${isChecked ? 'active' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => {
                              setFilterTalentCarriers(prev => 
                                isChecked ? prev.filter(c => c !== carrier) : [...prev, carrier]
                              );
                            }} 
                          />
                          {carrier}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 研修実績 */}
                <div className="filter-group">
                  <span className="filter-group-title">受講済み研修</span>
                  <div className="filter-options-flex">
                    {allTrainings.map(tr => {
                      const isChecked = filterTalentTrainings.includes(tr.id);
                      return (
                        <label key={tr.id} className={`filter-checkbox-label ${isChecked ? 'active' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => {
                              setFilterTalentTrainings(prev => 
                                isChecked ? prev.filter(t => t !== tr.id) : [...prev, tr.id]
                              );
                            }} 
                          />
                          {tr.title}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="filter-sheet-footer" style={{ display: 'flex', gap: '12px', padding: '16px', borderTop: '1px solid var(--border-color)', background: 'white' }}>
            <button
              style={{
                flex: 1,
                margin: 0,
                padding: '12px',
                background: 'white',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
              onClick={clearAllFilters}
            >
              すべてクリア
            </button>
            <button
              style={{
                flex: 1,
                margin: 0,
                padding: '12px',
                background: 'var(--primary)',
                border: 'none',
                color: 'white',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                fontFamily: 'inherit'
              }}
              onClick={() => {
                setSearchKeyword(tempKeyword);
                setIsFilterSheetOpen(false);
                setViewMode('list');
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
              実行
            </button>
          </div>
        </div>
      </div>

      <div className="fab-container">
        <button className="fab-main" onClick={handleOpenCreateForm}>
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
    </div>
  );
}
