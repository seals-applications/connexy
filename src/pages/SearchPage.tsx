import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../data/mockDb';
import type { Job, Talent, Staff, Training, User } from '../data/mockDb';
import { CalendarPicker } from '../components/CalendarPicker';

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

  // ログインユーザーおよび限定公開先の動的管理用State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [targetCompanyId, setTargetCompanyId] = useState<string>('');

  // 汎用フォームState (Job用) + Talent用希望勤務日
  const [formData, setFormData] = useState({
    title: '', description: '', price: 15000, 
    locationName: '', // 案件時は住所
    roleType: 'キャンペーンクルー', salesChannel: 'ショップ', carrier: 'docomo',
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

    const addressToGeocode = createFormType === 'job' ? formData.locationName : '東京';
    let coords = { lat: 35.6812, lng: 139.7671 };
    if (createFormType === 'job') {
      if (tempSelectedLocation) {
        coords = tempSelectedLocation;
      } else {
        coords = await geocodeAddress(addressToGeocode);
      }
    }

    if (createFormType === 'job') {
      const newJob: Omit<Job, 'id'> = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        locationName: formData.locationName,
        lat: coords.lat,
        lng: coords.lng,
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
        if (data && data.address) {
          const addr = data.address;
          const state = addr.province || addr.state || '';
          const city = addr.city || addr.town || addr.village || addr.city_district || '';
          const suburb = addr.suburb || addr.subdivision || addr.quarter || addr.neighbourhood || '';
          const road = addr.road || '';
          const houseNumber = addr.house_number || '';
          addressText = `${state}${city}${suburb}${road}${houseNumber}`.trim();
        }
        
        if (!addressText) {
          addressText = data?.display_name || `ピンを指定した地点 (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }

        setFormData(prev => ({ ...prev, locationName: addressText }));
        setTempSelectedLocation({ lat, lng });
      } catch (err) {
        console.warn('逆ジオコーディングに失敗しました', err);
        setFormData(prev => ({ ...prev, locationName: `ピンを指定した地点 (${lat.toFixed(4)}, ${lng.toFixed(4)})` }));
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
        if (job) setSelectedJob(job);
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
  }, [talents, jobs]);

  // 人材をエリアごとにグループ化する
  const groupedTalents = useMemo(() => {
    const groups: Record<string, { locationName: string, lat: number, lng: number, talents: Talent[] }> = {};
    talents.forEach(talent => {
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
  }, [talents]);

  // mode と data の変更を検知してマップのピンを出し分ける
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;
    markersGroupRef.current.clearLayers();

    if (mode === 'job') {
      filteredJobs.forEach((job) => {
        const jobIcon = L.divIcon({
          className: 'job-location-marker',
          html: job.isUrgent ? `<div style="
            width: 28px; height: 28px; background-color: #EF4444; border: 3px solid #FDE68A; border-radius: 50%; box-shadow: 0 0 10px rgba(239, 68, 68, 0.8); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;
          ">急</div>` : `<div style="
            width: 24px; height: 24px; background-color: #EF4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.4); display: flex; align-items: center; justify-content: center; color: white;
          "><span class="material-symbols-outlined" style="font-size: 14px;">work</span></div>`,
          iconSize: job.isUrgent ? [28, 28] : [24, 24],
          iconAnchor: job.isUrgent ? [14, 14] : [12, 12],
        });

        const marker = L.marker([job.lat, job.lng], { icon: jobIcon });
        marker.bindPopup(`
          <div style="font-family: 'Inter', sans-serif;">
            <b style="font-size: 14px;">${job.isUrgent ? '【緊急】' : ''}${job.title}</b>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">${job.description}</p>
            <div style="font-size: 13px; color: var(--primary); font-weight: bold;">単価: ¥${job.price.toLocaleString()}</div>
            <button class="view-job-btn" data-id="${job.id}" style="margin-top: 8px; width: 100%; padding: 4px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">詳細を見る</button>
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
  }, [mode, jobs, includeUrgent, filterArea, talents]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // 1. エリアフィルタ
      let matchesArea = true;
      if (filterArea === 'shinjuku') matchesArea = !!job.locationName?.includes('新宿');
      else if (filterArea === 'shibuya') matchesArea = !!job.locationName?.includes('渋谷');
      else if (filterArea === 'ikebukuro') matchesArea = !!job.locationName?.includes('池袋') || !!job.locationName?.includes('豊島');

      // 2. 限定公開フィルタ
      const matchesLimited = currentUser
        ? (job.allowedCompanyIds === undefined || 
           job.allowedCompanyIds.includes(currentUser.id) || 
           job.authorId === currentUser.id)
        : true;

      // 3. 緊急募集フィルタ
      const matchesUrgent = includeUrgent || !job.isUrgent;

      return matchesArea && matchesLimited && matchesUrgent;
    });
  }, [jobs, filterArea, includeUrgent, currentUser]);

  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return 0;
    });
  }, [filteredJobs]);

  const filteredTalentGroups = useMemo(() => {
    return groupedTalents.filter(group => {
      if (filterArea === 'all') return true;
      if (filterArea === 'shinjuku') return group.locationName.includes('新宿');
      if (filterArea === 'shibuya') return group.locationName.includes('渋谷');
      if (filterArea === 'ikebukuro') return group.locationName.includes('池袋') || group.locationName.includes('豊島');
      return true;
    });
  }, [groupedTalents, filterArea]);

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
        <div className="header-search">
          <div className="search-bar">
            <span className="material-symbols-outlined icon">search</span>
            <input type="text" placeholder="現在地周辺・エリア名など" />
          </div>
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
        </div>
      </header>

      <div 
        className="map-area" 
        id="map-area" 
        style={{ display: viewMode === 'map' ? 'block' : 'none', flex: 1, zIndex: 1, position: 'relative' }}
      ></div>

      {viewMode === 'list' && (
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', zIndex: 2, paddingBottom: '80px' }}>
          <div style={{ padding: '16px', background: 'white', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['all', 'shinjuku', 'shibuya', 'ikebukuro'].map((area) => (
                <button
                  key={area}
                  onClick={() => setFilterArea(area)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: filterArea === area ? 'none' : '1px solid #ddd',
                    background: filterArea === area ? 'var(--primary)' : 'white',
                    color: filterArea === area ? 'white' : 'var(--text-main)',
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: filterArea === area ? '0 2px 4px rgba(59, 130, 246, 0.3)' : 'none'
                  }}
                >
                  {area === 'all' ? 'すべて' : area === 'shinjuku' ? '新宿周辺' : area === 'shibuya' ? '渋谷周辺' : '池袋周辺'}
                </button>
              ))}
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
                sortedJobs.map(job => (
                  <div key={job.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', border: job.isUrgent ? '2.5px solid #FCA5A5' : '1px solid var(--border-color)', animation: 'fadeIn 0.3s ease', position: 'relative' }}>
                    
                    {job.isUrgent && (
                      <span style={{ position: 'absolute', top: '-10px', right: '12px', fontSize: '10px', padding: '2px 8px', background: '#EF4444', color: 'white', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)' }}>
                        ⚠️ 緊急募集
                      </span>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--text-main)' }}>{job.title}</h3>
                      <span className="status-badge badge-negotiating" style={{ margin: 0, fontSize: '11px' }}>募集中</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {job.carrier && <span style={{ fontSize: '11px', padding: '2px 8px', background: '#E0E7FF', color: '#4338CA', borderRadius: '12px', fontWeight: 'bold' }}>{job.carrier}</span>}
                      {job.salesChannel && <span style={{ fontSize: '11px', padding: '2px 8px', background: '#FEF3C7', color: '#D97706', borderRadius: '12px', fontWeight: 'bold' }}>{job.salesChannel}</span>}
                      {job.roleType && <span style={{ fontSize: '11px', padding: '2px 8px', background: '#DCFCE7', color: '#15803D', borderRadius: '12px', fontWeight: 'bold' }}>{job.roleType}</span>}
                      {job.workLocation && <span style={{ fontSize: '11px', padding: '2px 8px', background: '#F3F4F6', color: '#374151', borderRadius: '12px' }}>{job.workLocation}</span>}
                    </div>

                    {job.eventDate && (
                      <div style={{ fontSize: '12px', color: '#2563EB', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_today</span>
                        開催日: {job.eventDate} {job.applicationDeadline && <span style={{ color: '#EF4444', marginLeft: '8px' }}>(応募締切: {job.applicationDeadline})</span>}
                      </div>
                    )}

                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-sub)' }}>{job.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 'bold' }}>
                        ¥{job.price.toLocaleString()} <span style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 'normal' }}>/ 日</span>
                      </div>
                      <button className="btn-secondary btn-small" style={{ margin: 0 }} onClick={() => setSelectedJob(job)}>詳細を見る</button>
                    </div>
                  </div>
                ))
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
                      {group.talents.map((talent, idx) => (
                        <div key={talent.id} style={{ padding: '16px', borderBottom: idx < group.talents.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10B981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                                {talent.maskedName.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '2px' }}>{talent.companyName}</div>
                                <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{talent.maskedName}</div>
                              </div>
                            </div>
                            <span className="status-badge badge-contracted" style={{ margin: 0, fontSize: '11px', background: '#D1FAE5', color: '#065F46' }}>稼働可能</span>
                          </div>
                          
                          {talent.availableDates && (
                            <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '8px' }}>
                              希望勤務日: {talent.availableDates}
                            </div>
                          )}

                          <div style={{ marginBottom: '12px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {talent.carriers?.map(carrier => (
                              <span key={carrier} style={{ fontSize: '10px', padding: '2px 6px', background: '#E0E7FF', color: '#4338CA', borderRadius: '4px', fontWeight: 'bold' }}>{carrier}</span>
                            ))}
                            {talent.skills.map(skill => (
                              <span key={skill} style={{ fontSize: '11px', padding: '2px 8px', background: '#F3F4F6', color: '#4B5563', borderRadius: '12px' }}>{skill}</span>
                            ))}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '14px', color: '#10B981', fontWeight: 'bold' }}>
                              ¥{talent.price.toLocaleString()} <span style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 'normal' }}>/ 日〜</span>
                            </div>
                            <button 
                              className="btn-secondary btn-small" 
                              onClick={() => setSelectedTalent(talent)}
                              style={{ margin: 0, color: '#10B981', border: '1px solid #10B981' }}
                            >
                              プロフィール
                            </button>
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
                <span className="status-badge badge-negotiating" style={{ display: 'inline-block', marginBottom: '12px' }}>募集中</span>
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
          <button style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            応募画面へ進む
          </button>
        </footer>
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
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>住所 *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      required 
                      value={formData.locationName} 
                      onChange={e => setFormData({...formData, locationName: e.target.value})} 
                      disabled={isSubmitting} 
                      style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} 
                      placeholder="例: 東京都港区六本木6丁目" 
                    />
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
                    ※手動入力、または地図からピンを立てて住所を自動取得できます
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>職種 *</label>
                  <select value={formData.roleType} onChange={e => setFormData({...formData, roleType: e.target.value})} disabled={isSubmitting} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                    <option value="キャンペーンクルー">キャンペーンクルー</option>
                    <option value="クローザー">クローザー</option>
                    <option value="ディレクター">ディレクター</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>販路 *</label>
                  <select value={formData.salesChannel} onChange={e => setFormData({...formData, salesChannel: e.target.value as any})} disabled={isSubmitting} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                    <option value="量販店">量販店</option>
                    <option value="ショップ">ショップ</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>稼働場所 *</label>
                  <select value={formData.workLocation} onChange={e => setFormData({...formData, workLocation: e.target.value})} disabled={isSubmitting} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                    <option value="店内">店内</option>
                    <option value="外販（複合施設など）">外販（複合施設など）</option>
                    <option value="外販（スーパーなど）">外販（スーパーなど）</option>
                    <option value="外販（その他）">外販（その他）</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>キャリア/回線 *</label>
                  <select value={formData.carrier} onChange={e => setFormData({...formData, carrier: e.target.value})} disabled={isSubmitting} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', background: 'white' }}>
                    <option value="docomo">docomo</option>
                    <option value="au/UQmobile">au/UQmobile</option>
                    <option value="SoftBank/Y!mobile">SoftBank/Y!mobile</option>
                    <option value="BB">BB</option>
                  </select>
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

      <div className="fab-container">
        <button className="fab-main" onClick={handleOpenCreateForm}>
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
    </div>
  );
}
