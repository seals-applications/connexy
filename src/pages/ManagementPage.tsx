import { useState, useEffect, useMemo } from 'react';
import { api } from '../data/mockDb';
import type { ContractTask, Training, Staff, Job, User } from '../data/mockDb';

const quizData: Record<string, Array<{ question: string, options: string[], answer: number }>> = {
  tr1: [
    {
      question: "店頭イベント接客において、お客様へお声がけする際の適切な距離感はどれですか？",
      options: ["密着する距離", "およそ1.5〜2メートル程度（パーソナルスペースを意識）", "5メートル以上離れて大声で呼ぶ"],
      answer: 1
    },
    {
      question: "接客時の身だしなみとして、正しくないものはどれですか？",
      options: ["清潔感のある服装", "派手すぎるアクセサリーや強い香水", "社章や名札を正しく着用する"],
      answer: 1
    },
    {
      question: "イベント開始時刻のどれくらい前までに現場に到着・準備を終えるべきですか？",
      options: ["イベント開始時間ちょうど", "開始の15〜30分前（現場の指示に合わせる）", "イベント終了時間の直前"],
      answer: 1
    }
  ],
  tr2: [
    {
      question: "光回線のクロージングにおいて、最も重要なヒアリング項目はどれですか？",
      options: ["現在ご利用中のインターネット回線と月額料金", "お客様の趣味・家族構成", "世間話のみ"],
      answer: 0
    },
    {
      question: "他社からの乗り換え提案の際、メリットの説明として正しいものはどれですか？",
      options: ["デメリットを一切隠して強引に契約を迫る", "違約金補填制度や月額料金の差額など、具体的な数値を提示して比較説明する", "嘘の料金を伝える"],
      answer: 1
    },
    {
      question: "ご契約内容の説明（重要事項説明）は誰が行うべきですか？",
      options: ["説明を省略してサインだけもらう", "規約に基づき、お客様に十分ご理解いただけるよう丁寧かつ漏れなく行う", "お客様自身が後で適当に読むように促す"],
      answer: 1
    }
  ],
  tr3: [
    {
      question: "現場責任者（ディレクター）として、スタッフの出退勤管理はどう行うべきですか？",
      options: ["スタッフに任せて確認しない", "本アプリのGPSチェックイン等を利用して、時間通りに現場にいることを確認・記録する", "終了後に適当に報告を書く"],
      answer: 1
    },
    {
      question: "トラブルやトラブルの兆候が発生した際、ディレクターの最初の行動はどれですか？",
      options: ["放置して様子を見る", "速やかに事実確認を行い、発注元およびアプリ運営事務局（必要に応じて）へ報告・相談する", "スタッフのせいにして逃げる"],
      answer: 1
    },
    {
      question: "現場の終礼時に行うべき最も重要なことはどれですか？",
      options: ["全員で直帰するだけ", "当日の獲得実績の集計、問題点の共有、およびブースの清掃・片付けの確認", "他社の悪口を言う"],
      answer: 1
    }
  ]
};



interface ParsedAttendanceLog {
  date: string;
  checkin: string;
}

export function ManagementPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<ContractTask[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [allJobsList, setAllJobsList] = useState<Job[]>([]);
  const [allStaffs, setAllStaffs] = useState<Staff[]>([]);

  const pastTradeCompanyIds = useMemo(() => {
    if (!currentUser || !tasks) return new Set<string>();
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const set = new Set<string>();
    completedTasks.forEach(t => {
      const tAgencyId = t.agency_id || (t.companyName?.includes('アルファ') ? 'alpha' : t.companyName?.includes('シグマ') ? 'sigma' : t.companyName?.includes('ベータ') ? 'beta' : t.companyName?.includes('ガンマ') ? 'gamma' : t.companyName?.includes('デルタ') ? 'delta' : t.companyName?.includes('SEALs') ? 'seals' : t.companyName?.includes('FreeR') ? 'freer' : t.companyName?.includes('ココラボ') ? 'cocolabo' : '');
      const tClientId = t.client_id || (t.clientName?.includes('アルファ') ? 'alpha' : t.clientName?.includes('シグマ') ? 'sigma' : t.clientName?.includes('ベータ') ? 'beta' : t.clientName?.includes('ガンマ') ? 'gamma' : t.clientName?.includes('デルタ') ? 'delta' : t.clientName?.includes('SEALs') ? 'seals' : t.clientName?.includes('FreeR') ? 'freer' : t.clientName?.includes('ココラボ') ? 'cocolabo' : '');
      if (tAgencyId === currentUser.id) {
        if (tClientId) set.add(tClientId);
      } else if (tClientId === currentUser.id) {
        if (tAgencyId) set.add(tAgencyId);
      }
    });
    return set;
  }, [currentUser, tasks]);

  // Tab/Subpage state
  const isUserAdmin = !currentUser?.staffId || currentUser.staffRole === 'admin';
  const [subPage, setSubPage] = useState<'none' | 'posts' | 'staffs' | 'reports' | 'logs' | 'training'>('none');

  // Calendar states
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(6);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('2026-06-13');
  const [calendarFilterStaffId, setCalendarFilterStaffId] = useState<string>('all');
  const [calendarFilterOtherCompanyName, setCalendarFilterOtherCompanyName] = useState<string>('all');

  // Sub-tabs inside overlays
  const [postsSubTab, setPostsSubTab] = useState<'list' | 'calendar'>('list');
  const [logsSubTab, setLogsSubTab] = useState<'calendar' | 'history'>('calendar');





  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const firstDayIndex = new Date(calendarYear, calendarMonth - 1, 1).getDay(); // Sunday is 0
    
    const cells: Array<{ day: number | null; dateStr: string | null }> = [];
    
    // Empty cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, dateStr: null });
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ day, dateStr });
    }
    
    // Fill remaining cells to complete the last week (multiple of 7)
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, dateStr: null });
    }
    
    return cells;
  }, [calendarYear, calendarMonth]);


  // Screening States
  const [screeningJobId, setScreeningJobId] = useState<string | null>(null);
  const [screeningMode, setScreeningMode] = useState<'default' | 'quality' | 'cost_performance' | 'reliability'>('default');
  const [showOrderConfirmModal, setShowOrderConfirmModal] = useState(false);
  const [confirmingCandidate, setConfirmingCandidate] = useState<any>(null);
  const [isContractSaving, setIsContractSaving] = useState(false);

  // Staff Management States
  const [showAddStaffOverlay, setShowAddStaffOverlay] = useState(false);
  const [showEditStaffOverlay, setShowEditStaffOverlay] = useState(false);
  const [showRoleOverlay, setShowRoleOverlay] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffSaving, setStaffSaving] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [staffRoles, setStaffRoles] = useState<Record<string, 'admin' | 'staff'>>({});
  const [showRoleConfirmModal, setShowRoleConfirmModal] = useState(false);
  const [changedRolesList, setChangedRolesList] = useState<Array<{ id: string, name: string, from: 'admin' | 'staff', to: 'admin' | 'staff' }>>([]);

  const [formData, setFormData] = useState({
    name: '', maskedName: '', baseLocation: '', nearestStation: '',
    locationName: '', price: 15000,
    skills: [] as string[], carriers: [] as string[], experience: '', prText: '',
    hasCertificate: false,
    role: 'staff' as 'admin' | 'staff',
    loginId: '',
    password: '',
    furigana: '',
    commuteMethod: '公共交通機関' as '公共交通機関' | '自家用車',
    gender: '男性' as '男性' | '女性',
    birthday: ''
  });

  const [editFormData, setEditFormData] = useState({
    name: '', maskedName: '', baseLocation: '', nearestStation: '',
    locationName: '', price: 15000,
    skills: [] as string[], carriers: [] as string[], experience: '', prText: '',
    hasCertificate: false,
    role: 'staff' as 'admin' | 'staff',
    loginId: '',
    password: '',
    furigana: '',
    commuteMethod: '公共交通機関' as '公共交通機関' | '自家用車',
    gender: '男性' as '男性' | '女性',
    birthday: ''
  });



  // Attendance Logs States
  const [selectedHistoryStaffId, setSelectedHistoryStaffId] = useState<string | null>(null);
  const [selectedHistoryYear, setSelectedHistoryYear] = useState<number>(new Date().getFullYear());
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<number>(new Date().getMonth() + 1);

  // Reports States
  const [selectedTask, setSelectedTask] = useState<ContractTask | null>(null);
  const [evalRating, setEvalRating] = useState<number>(5);
  const [evalComment, setEvalComment] = useState<string>('');
  const [evalRole, setEvalRole] = useState<'client' | 'worker'>('client');
  const [evalHasLateness, setEvalHasLateness] = useState(false);

  // Worker Quizzes States
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeQuizIndex, setActiveQuizIndex] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  // Expand states for postings
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const loadData = async () => {
    const user = await api.getCurrentUser();
    setCurrentUser(user);
    const fetchedTasks = await api.getContractTasks();
    setTasks(fetchedTasks);
    const fetchedTrainings = await api.getTrainings();
    setTrainings(fetchedTrainings);
    const fetchedJobs = await api.getJobs();
    setAllJobsList(fetchedJobs);
    if (user) {
      const fetchedStaffs = await api.getStaffsByUserId(user.id);
      setAllStaffs(fetchedStaffs);
      if (fetchedStaffs.length > 0 && !selectedHistoryStaffId) {
        setSelectedHistoryStaffId(fetchedStaffs[0].id);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getJobCodeForTask = (jobId: string) => {
    const job = allJobsList.find(j => j.id === jobId);
    return job?.jobCode || '';
  };

  const isJobPast = (job: Job) => {
    if (!job.eventDate) return false;
    const dates = job.eventDate.split(', ');
    const lastDateStr = dates[dates.length - 1];
    const lastDate = new Date(lastDateStr);
    lastDate.setHours(23, 59, 59, 999);
    return lastDate < new Date();
  };

  // Compute my posted jobs
  const myJobs = useMemo(() => {
    if (!currentUser) return [];
    return allJobsList.filter(j => j.authorId === currentUser.id);
  }, [allJobsList, currentUser]);

  // Compute staff lists
  const companyStaffs = useMemo(() => {
    if (!currentUser) return [];
    return allStaffs.filter(s => s.userId === currentUser.id);
  }, [allStaffs, currentUser]);

  const myStaff = useMemo(() => {
    if (!currentUser?.staffId) return null;
    return allStaffs.find(s => s.id === currentUser.staffId) || null;
  }, [allStaffs, currentUser]);

  const otherCompaniesOnOurJobs = useMemo(() => {
    const companyNames = new Set<string>();
    tasks.forEach(t => {
      if (myJobs.some(j => j.id === t.jobId) && !companyStaffs.some(s => s.name === t.workerName) && t.companyName) {
        companyNames.add(t.companyName);
      }
    });
    return Array.from(companyNames);
  }, [tasks, myJobs, companyStaffs]);

  const relatedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!currentUser) return false;
      const isClient = myJobs.some(j => j.id === t.jobId) || t.clientName === currentUser.name;
      const isWorkerOrAgency = companyStaffs.some(s => s.name === t.workerName) || t.companyName === currentUser.name;
      
      if (isUserAdmin) {
        return isClient || isWorkerOrAgency;
      } else {
        const myName = myStaff?.name || currentUser.name;
        return t.workerName === myName;
      }
    });
  }, [tasks, currentUser, myJobs, companyStaffs, isUserAdmin, myStaff]);

  const getTasksForDate = (dateStr: string, calendarType: 'own_staff' | 'other_staff' = 'own_staff') => {
    return tasks.filter(t => {
      if (!['working', 'report_pending', 'completed'].includes(t.status)) return false;
      const isDateMatch = t.date === dateStr;
      if (!isDateMatch) return false;
      
      if (calendarType === 'own_staff') {
        const isOurStaff = companyStaffs.some(s => s.name === t.workerName);
        if (!isOurStaff) return false;
        
        if (isUserAdmin) {
          if (calendarFilterStaffId === 'all') return true;
          const targetStaff = allStaffs.find(s => s.id === calendarFilterStaffId);
          return t.workerName === targetStaff?.name;
        }
        return t.workerName === myStaff?.name || t.workerName === currentUser?.name;
      } else {
        // calendarType === 'other_staff'
        const isOurJob = myJobs.some(j => j.id === t.jobId);
        const isOurStaff = companyStaffs.some(s => s.name === t.workerName);
        if (!isOurJob || isOurStaff) return false;
        
        if (calendarFilterOtherCompanyName === 'all') return true;
        return t.companyName === calendarFilterOtherCompanyName;
      }
    });
  };



  const renderCalendar = (calendarType: 'own_staff' | 'other_staff') => {
    return (
      <>
        {/* Staff filter dropdown */}
        {isUserAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-color)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-sub)' }}>filter_alt</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}>スタッフ絞り込み:</span>
            {calendarType === 'own_staff' ? (
              <select
                value={calendarFilterStaffId}
                onChange={e => setCalendarFilterStaffId(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', fontSize: '12px', color: 'var(--text-main)' }}
              >
                <option value="all">全員を表示</option>
                {companyStaffs.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <select
                value={calendarFilterOtherCompanyName}
                onChange={e => setCalendarFilterOtherCompanyName(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', fontSize: '12px', color: 'var(--text-main)' }}
              >
                <option value="all">すべての会社を表示</option>
                {otherCompaniesOnOurJobs.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Calendar Selector / Month switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-color)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <button 
            type="button"
            onClick={() => {
              if (calendarMonth === 1) {
                setCalendarMonth(12);
                setCalendarYear(calendarYear - 1);
              } else {
                setCalendarMonth(calendarMonth - 1);
              }
            }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--primary)' }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>前月</span>
          </button>
          
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)' }}>
            {calendarYear}年 {calendarMonth}月
          </div>

          <button 
            type="button"
            onClick={() => {
              if (calendarMonth === 12) {
                setCalendarMonth(1);
                setCalendarYear(calendarYear + 1);
              } else {
                setCalendarMonth(calendarMonth + 1);
              }
            }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--primary)' }}
          >
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>次月</span>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* Calendar Grid */}
        <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', marginBottom: '16px' }}>
          {/* Weekdays */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px', marginBottom: '8px' }}>
            {['日', '月', '火', '水', '木', '金', '土'].map((d, idx) => {
              let color = 'var(--text-main)';
              if (idx === 0) color = '#EF4444'; // Sunday
              if (idx === 6) color = '#3B82F6'; // Saturday
              return (
                <div key={d} style={{ fontSize: '12px', fontWeight: 'bold', color }}>{d}</div>
              );
            })}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '6px', columnGap: '4px' }}>
            {calendarCells.map((cell, idx) => {
              const isSelected = cell.dateStr === selectedCalendarDate;
              const dateTasks = cell.dateStr ? getTasksForDate(cell.dateStr, calendarType) : [];
              const hasTasks = dateTasks.length > 0;
              
              // Color for day number
              let dayColor = 'var(--text-main)';
              if (idx % 7 === 0) dayColor = '#EF4444'; // Sunday
              if (idx % 7 === 6) dayColor = '#3B82F6'; // Saturday
              if (!cell.day) dayColor = 'transparent';

              return (
                <div 
                  key={idx}
                  onClick={() => {
                    if (cell.dateStr) setSelectedCalendarDate(cell.dateStr);
                  }}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 2px',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    cursor: cell.day ? 'pointer' : 'default',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                  }}
                  className={cell.day ? 'calendar-day-hover' : ''}
                >
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: isSelected ? 'bold' : 'normal', 
                    color: isSelected ? 'white' : dayColor 
                  }}>
                    {cell.day || ''}
                  </span>

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '14px', marginTop: '2px' }}>
                    {cell.day && hasTasks && (
                      isUserAdmin ? (
                        <span 
                          style={{ 
                            fontSize: '9px', 
                            fontWeight: 'bold',
                            padding: '1px 4px',
                            borderRadius: '4px',
                            background: isSelected ? 'rgba(255, 255, 255, 0.25)' : (calendarType === 'own_staff' ? '#EFF6FF' : '#FEF3C7'),
                            color: isSelected ? 'white' : (calendarType === 'own_staff' ? 'var(--primary)' : '#D97706')
                          }}
                        >
                          {dateTasks.length}名
                        </span>
                      ) : (
                        <span 
                          style={{ 
                            fontSize: '9px', 
                            fontWeight: 'bold',
                            padding: '1px 4px',
                            borderRadius: '4px',
                            background: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#ECFDF5',
                            color: isSelected ? 'white' : '#059669'
                          }}
                        >
                          1名
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>event_available</span>
            {selectedCalendarDate.split('-')[0]}年{selectedCalendarDate.split('-')[1]}月{selectedCalendarDate.split('-')[2]}日の予定
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(() => {
              const dayTasks = getTasksForDate(selectedCalendarDate, calendarType);
              if (dayTasks.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '20px', background: 'var(--surface-color)', borderRadius: '12px', color: 'var(--text-sub)', fontSize: '12px', border: '1px solid var(--border-color)' }}>
                    この日のアサイン予定はありません。
                  </div>
                );
              }

              return dayTasks.map(task => {
                const job = allJobsList.find(j => j.id === task.jobId);
                
                return (
                  <div 
                    key={task.id} 
                    style={{ 
                      background: 'var(--surface-color)', 
                      borderRadius: '12px', 
                      padding: '14px', 
                      border: '1px solid var(--border-color)', 
                      boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 'bold', 
                        padding: '2px 8px', 
                        borderRadius: '10px', 
                        background: task.status === 'completed' ? '#D1FAE5' : task.status === 'report_pending' ? '#FEF3C7' : '#EFF6FF',
                        color: task.status === 'completed' ? '#065F46' : task.status === 'report_pending' ? '#D97706' : '#1D4ED8'
                      }}>
                        {task.status === 'completed' ? '完了' : task.status === 'report_pending' ? '完了報告待ち' : '確定/稼働予定'}
                      </span>
                      {job?.jobCode && (
                        <span style={{ fontSize: '10px', background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                          {job.jobCode}
                        </span>
                      )}
                    </div>

                    <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                      {task.jobTitle}
                    </h5>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-sub)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>badge</span>
                        <span>稼働メンバー: <strong>{task.workerName}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>corporate_fare</span>
                        <span>取引企業: {isUserAdmin ? task.companyName : task.clientName}</span>
                      </div>
                      {job?.locationName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>pin_drop</span>
                          <span>エリア: {job.locationName} ({job.exactLocation || '住所詳細なし'})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </>
    );
  };

  // Screening chat startup
  const handleStartScreeningChat = (chatTask: ContractTask | undefined, candidateCompanyId: string) => {

    if (chatTask) {
      // Navigate to chat
      window.location.hash = `/message?channelId=${chatTask.id}`;
    } else {
      // Create chat task
      alert('商談チャットを開始します。メッセージ画面へ移動します。');
      window.location.hash = `/message?newDirectChatWith=${candidateCompanyId}`;
    }
  };

  // Cancel posted job
  const handleCancelJob = async (jobId: string) => {
    if (confirm('この求人掲載をキャンセルしますか？\n（応募済みのパートナーがいる場合はチャットでの連絡を推奨します）')) {
      try {
        await api.updateJob(jobId, { status: 'cancelled' });
        alert('求人掲載をキャンセルしました。');
        await loadData();
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Confirm order & offer job
  const handleOpenOrderConfirm = (candidate: any) => {
    setConfirmingCandidate(candidate);
    setShowOrderConfirmModal(true);
  };

  const handleConfirmOrderSubmit = async () => {
    if (!confirmingCandidate || !screeningJobId) return;
    const activeScreeningJob = myJobs.find(j => j.id === screeningJobId);
    if (!activeScreeningJob) return;

    setIsContractSaving(true);
    try {
      const channelId = confirmingCandidate.chatTask?.id || `chat_${[currentUser?.id || '', confirmingCandidate.company.id].sort().join('_')}`;
      const existingMessages = (confirmingCandidate.chatTask?.evaluations as any)?.messages || [];
      
      const systemMsg = {
        id: `sys_offer_${Date.now()}`,
        type: 'system',
        text: `【内定通知】${activeScreeningJob.title} のご契約オファーが送信されました。内容をご確認いただき、承諾または辞退を選択してください。`,
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      };

      const newMessages = [...existingMessages, systemMsg];

      // Save to database, marking offeredJobId and offeredStaffId inside evaluations
      const { data: currentTaskData } = await api.getContractTasks().then(tasks => ({ data: tasks.filter(t => t.id === channelId) }));
      const existingEvals = currentTaskData && currentTaskData.length > 0 ? currentTaskData[0].evaluations || {} : {};

      const mergedEvaluations = {
        ...existingEvals,
        messages: newMessages,
        offeredJobId: activeScreeningJob.id,
        offeredStaffId: confirmingCandidate.staff.id,
        offeredPrice: activeScreeningJob.price,
        offeredDates: activeScreeningJob.eventDate,
        offeredDetails: activeScreeningJob.description
      };

      await api.saveContractTaskChat(
        channelId,
        newMessages,
        confirmingCandidate.company.name,
        currentUser?.name || '',
        currentUser?.name || '',
        [],
        {}
      );

      // Force status update to 'offered' and set evaluations explicitly
      await api.updateContractTaskStatus(channelId, 'offered', mergedEvaluations);

      alert(`内定オファーを送信しました。商談チャット画面へ移動します。`);
      setShowOrderConfirmModal(false);
      setScreeningJobId(null);
      window.location.hash = `/message?channelId=${channelId}`;
    } catch (e) {
      console.error(e);
      alert('オファー送信中にエラーが発生しました。');
    } finally {
      setIsContractSaving(false);
    }
  };

  // Staff Save & Edit actions

  const handleStaffSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffSaving(true);
    
    try {
      const newStaff = {
        userId: currentUser?.id || '',
        name: formData.name,
        maskedName: formData.maskedName,
        baseLocation: formData.baseLocation,
        nearestStation: formData.nearestStation,
        preferredArea: formData.locationName,
        price: 15000,
        skills: formData.skills,
        carriers: formData.carriers,
        experience: formData.experience,
        prText: formData.prText,
        hasCertificate: formData.hasCertificate,
        role: 'staff' as 'admin' | 'staff',
        loginId: formData.loginId,
        password: formData.password,
        furigana: formData.furigana,
        commuteMethod: formData.commuteMethod,
        gender: formData.gender,
        birthday: formData.birthday
      };

      await api.addStaff(newStaff);
      await loadData();

      setFormData({
        name: '', maskedName: '', baseLocation: '', nearestStation: '',
        locationName: '', price: 15000,
        skills: [], carriers: [], experience: '', prText: '',
        hasCertificate: false,
        role: 'staff',
        loginId: '',
        password: '',
        furigana: '',
        commuteMethod: '公共交通機関',
        gender: '男性',
        birthday: ''
      });

      setShowAddStaffOverlay(false);
      alert('スタッフを登録しました。');
    } catch (e) {
      console.error(e);
      alert('スタッフ登録に失敗しました。');
    } finally {
      setStaffSaving(false);
    }
  };

  const handleEditClick = (staff: Staff) => {
    setEditingStaff(staff);
    setEditFormData({
      name: staff.name,
      maskedName: staff.maskedName,
      baseLocation: staff.baseLocation,
      nearestStation: staff.nearestStation || '',
      locationName: staff.preferredArea || '',
      price: staff.price,
      skills: staff.skills || [],
      carriers: staff.carriers || [],
      experience: staff.experience || '',
      prText: staff.prText || '',
      hasCertificate: staff.hasCertificate || false,
      role: staff.role || 'staff',
      loginId: staff.loginId || '',
      password: staff.password || '',
      furigana: staff.furigana || '',
      commuteMethod: staff.commuteMethod || '公共交通機関',
      gender: staff.gender || '男性',
      birthday: staff.birthday || ''
    });
    setShowEditStaffOverlay(true);
  };

  const handleStaffUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setStaffSaving(true);

    try {
      const updatedFields: Partial<Staff> = {
        name: editFormData.name,
        maskedName: editFormData.maskedName,
        baseLocation: editFormData.baseLocation,
        nearestStation: editFormData.nearestStation,
        preferredArea: editFormData.locationName,
        price: 15000,
        skills: editFormData.skills,
        carriers: editFormData.carriers,
        experience: editFormData.experience,
        prText: editFormData.prText,
        hasCertificate: editFormData.hasCertificate,
        loginId: editFormData.loginId,
        password: editFormData.password,
        furigana: editFormData.furigana,
        commuteMethod: editFormData.commuteMethod,
        gender: editFormData.gender,
        birthday: editFormData.birthday
      };

      await api.updateStaff(editingStaff.id, updatedFields);
      await loadData();

      setShowEditStaffOverlay(false);
      setEditingStaff(null);
      alert('スタッフ情報を更新しました。');
    } catch (e) {
      console.error(e);
      alert('スタッフ情報の更新に失敗しました。');
    } finally {
      setStaffSaving(false);
    }
  };

  const handleRoleSaveClick = () => {
    const changes: Array<{ id: string, name: string, from: 'admin' | 'staff', to: 'admin' | 'staff' }> = [];
    for (const [staffId, role] of Object.entries(staffRoles)) {
      const staff = allStaffs.find(s => s.id === staffId);
      const currentRole = staff?.role || 'staff';
      if (staff && currentRole !== role) {
        changes.push({
          id: staffId,
          name: staff.name,
          from: currentRole,
          to: role
        });
      }
    }

    if (changes.length === 0) {
      alert('変更された権限はありません。');
      return;
    }

    setChangedRolesList(changes);
    setShowRoleConfirmModal(true);
  };

  const handleRolesSaveConfirm = async () => {
    setRoleSaving(true);
    try {
      for (const change of changedRolesList) {
        await api.updateStaffRole(change.id, change.to);
      }
      await loadData();
      setShowRoleConfirmModal(false);
      setShowRoleOverlay(false);
      alert('スタッフ権限を更新しました。');
    } catch (e) {
      console.error(e);
      alert('権限の更新中にエラーが発生しました。');
    } finally {
      setRoleSaving(false);
    }
  };

  // Attendance Log History generators
  const getAttendanceLogsForStaff = (staff: Staff | null) => {
    if (!staff) return [];
    
    // Read local storage logs for checked in status
    const dbLogs: ParsedAttendanceLog[] = [];
    (staff.completedTrainings || []).forEach(t => {
      if (t.startsWith('ATTENDANCE_LOG_')) {
        const parts = t.replace('ATTENDANCE_LOG_', '').split('_');
        dbLogs.push({
          date: parts[0],
          checkin: parts[1] === 'LATE' ? '09:20' : parts[1]
        });
      }
    });

    // Fallback static mock logs
    if (dbLogs.length === 0) {
      const mockLogs = [
        { date: '2026-06-12', checkin: '09:12' },
        { date: '2026-06-11', checkin: '08:58' },
        { date: '2026-06-10', checkin: '08:45' },
        { date: '2026-05-26', checkin: '08:50' },
        { date: '2026-05-25', checkin: '08:54' },
        { date: '2026-04-15', checkin: '09:00' },
        { date: '2026-04-14', checkin: '08:57' }
      ];
      return mockLogs;
    }

    return dbLogs.sort((a, b) => b.date.localeCompare(a.date));
  };

  const handleDownloadCSV = (logs: ParsedAttendanceLog[], staffName: string) => {
    if (logs.length === 0) {
      alert("ダウンロードできる出勤データがありません。");
      return;
    }
    const headers = ["日付", "出勤時間", "案件コード"];
    const rows = logs.map(log => {
      const task = tasks.find(t => t.date === log.date && (t.workerName === staffName || t.workerName === currentUser?.name));
      let logJobCode = '';
      if (task) {
        const job = allJobsList.find(j => j.id === task.jobId);
        if (job) logJobCode = job.jobCode || '';
      }
      if (!logJobCode) {
        const pseudoId = `j_${log.date}_${staffName}`;
        let hash = 0;
        for (let i = 0; i < pseudoId.length; i++) {
          hash = pseudoId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const codeNum = Math.abs(hash % 900000) + 100000;
        logJobCode = `JOB-${codeNum}`;
      }
      return [log.date, log.checkin, logJobCode];
    });
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `出勤履歴_${staffName}_${selectedHistoryYear}年${selectedHistoryMonth}月.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reports details & mutual evaluations
  const handleOpenReport = (task: ContractTask) => {
    setSelectedTask(task);
    setEvalRating(5);
    setEvalComment('');
    setEvalRole('client');
    setEvalHasLateness(false);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      const evaluation = {
        id: `eval_${Date.now()}`,
        rating: evalRating,
        comment: evalComment,
        evaluatorName: currentUser?.name || '元請け企業',
        createdAt: new Date().toISOString(),
        hasLateness: evalHasLateness
      };

      const existingEvals = selectedTask.evaluations || {};
      const updatedEvals = {
        ...existingEvals,
        [evalRole === 'client' ? 'byClient' : 'byWorker']: evaluation
      };

      // If both evaluated, mark task status as completed
      const bothEvaluated = !!updatedEvals.byClient && (!!updatedEvals.byWorker || !!updatedEvals.byStaffToField);
      const nextStatus = bothEvaluated ? 'completed' : 'report_pending';

      await api.updateContractTaskStatus(selectedTask.id, nextStatus, {
        [evalRole === 'client' ? 'byClient' : 'byWorker']: evaluation
      });

      // If worker submitted and has lateness, flag it
      if (evalRole === 'worker' && myStaff) {
        const flag = evalHasLateness ? '_LATE' : '';
        const tag = `ATTENDANCE_LOG_${selectedTask.date}${flag}`;
        await api.completeTraining(myStaff.id, tag); // completeTraining serves as a tag updater
      }

      alert('完了報告と評価を登録しました。');
      setSelectedTask(null);
      await loadData();
    } catch (err) {
      console.error(err);
      alert('報告の登録中にエラーが発生しました。');
    }
  };



  // Quizzes and Training methods
  const handleStartQuiz = (trainingId: string) => {
    setActiveQuizId(trainingId);
    setActiveQuizIndex(0);
    setQuizAnswers([]);
    setQuizScore(null);
    setQuizCompleted(false);
  };

  const handleQuizAnswer = (optionIndex: number) => {
    if (!activeQuizId) return;
    const questions = quizData[activeQuizId];
    const newAnswers = [...quizAnswers, optionIndex];
    setQuizAnswers(newAnswers);

    if (activeQuizIndex + 1 < questions.length) {
      setActiveQuizIndex(activeQuizIndex + 1);
    } else {
      // Calculate score
      let correctCount = 0;
      questions.forEach((q, idx) => {
        if (newAnswers[idx] === q.answer) correctCount++;
      });
      const finalScore = Math.round((correctCount / questions.length) * 100);
      setQuizScore(finalScore);
      setQuizCompleted(true);

      // Save if passed
      if (finalScore >= 80 && myStaff) {
        api.completeTraining(myStaff.id, activeQuizId);
      }
    }
  };



  // Dashboard Menu selector
  const menuItems = isUserAdmin ? [
    { id: 'posts', label: '案件管理', desc: '掲載案件の管理・アサイン選考、他社スタッフの出勤予定', icon: 'campaign', bg: '#FEF3C7', color: '#D97706' },
    { id: 'staffs', label: 'スタッフ管理', desc: 'メンバー登録、アカウント追加、権限管理', icon: 'groups', bg: '#ECFDF5', color: '#059669' },
    { id: 'reports', label: '報告・評価', desc: '業務完了報告の確認とスタッフ相互評価', icon: 'rate_review', bg: '#FDF2F8', color: '#DB2777' },
    { id: 'logs', label: '出勤管理', desc: '自社スタッフの出勤予定カレンダーと打刻履歴', icon: 'history', bg: '#EFF6FF', color: '#1D4ED8' },
  ] : [
    { id: 'training', label: '研修・クイズ', desc: '動画視聴と理解度テストの受講（バッジ獲得）', icon: 'school', bg: '#ECFDF5', color: '#059669' },
    { id: 'reports', label: '報告・評価', desc: '完了した業務の評価と元請けへの評価送信', icon: 'rate_review', bg: '#FDF2F8', color: '#DB2777' },
    { id: 'logs', label: '出勤管理', desc: '自身の出勤予定カレンダーと打刻履歴', icon: 'history', bg: '#EFF6FF', color: '#1D4ED8' },
  ];


  return (
    <div className="view active" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* 1. Main Dashboard View when subPage is 'none' */}
      <div style={{ flexDirection: 'column', height: '100%', width: '100%', display: subPage === 'none' ? 'flex' : 'none' }}>
        {/* Header */}
        <header className="solid-header" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>管理・手続き</span>
          </div>
          <button className="icon-btn-dark" onClick={() => window.dispatchEvent(new Event('open-settings-menu'))}>
            <span className="material-symbols-outlined">menu</span>
          </button>
        </header>

        {/* Main Area */}
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '90px' }}>
          {/* User Profile Card */}
          <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderRadius: '16px', padding: '20px', color: 'white', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', color: 'white' }}>
                {currentUser?.name ? currentUser.name[0] : 'U'}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{currentUser?.name || 'ゲストユーザー'}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {isUserAdmin ? 'admin_panel_settings' : 'badge'}
                  </span>
                  {isUserAdmin ? '管理者アカウント' : '一般メンバー'}
                </div>
              </div>
            </div>
          </div>

          {/* iOS-Style Menu Card */}
          <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            {menuItems.map((item, idx) => (
              <div 
                key={item.id}
                onClick={() => setSubPage(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  borderBottom: idx === menuItems.length - 1 ? 'none' : '1px solid #F1F5F9',
                  transition: 'background-color 0.2s',
                }}
                className="menu-item-hover"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '10px', 
                    background: item.bg, 
                    color: item.color, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{item.icon}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{item.label}</span>
                      {(() => {
                        let count = 0;
                        if (item.id === 'reports') {
                          count = relatedTasks.filter(t => t.status === 'report_pending' || t.status === 'disputed').length;
                        } else if (item.id === 'posts') {
                          count = tasks.filter(t => t.status === 'applying' && myJobs.some(j => j.id === t.jobId)).length;
                        }
                        if (count > 0) {
                          return (
                            <span style={{ 
                              background: '#EF4444', 
                              color: 'white', 
                              fontSize: '10px', 
                              fontWeight: 'bold', 
                              padding: '2px 6px', 
                              borderRadius: '10px',
                              lineHeight: 1
                            }}>
                              {count}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>{item.desc}</div>
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ color: '#CBD5E1', fontSize: '20px' }}>arrow_forward_ios</span>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* 2. Slide-In Overlays for Subpages */}



      {/* (B) Posts Overlay */}
      {isUserAdmin && (
        <div className={`overlay-view ${subPage === 'posts' ? 'show' : ''}`} style={{ zIndex: 1100, display: 'flex', flexDirection: 'column' }}>
          <header className="solid-header overlay-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="icon-btn-dark" onClick={() => setSubPage('none')}>
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h1 style={{ fontSize: '16px', fontWeight: 'bold' }}>案件管理</h1>
            <div style={{ width: '40px' }}></div>
          </header>
          <main className="list-area bg-gray hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '90px' }}>
            <div style={{ display: 'flex', background: '#E2E8F0', padding: '2px', borderRadius: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setPostsSubTab('list')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: postsSubTab === 'list' ? 'white' : 'transparent',
                  color: postsSubTab === 'list' ? 'var(--text-main)' : 'var(--text-sub)',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: postsSubTab === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                掲載案件・選考
              </button>
              <button
                type="button"
                onClick={() => setPostsSubTab('calendar')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: postsSubTab === 'calendar' ? 'white' : 'transparent',
                  color: postsSubTab === 'calendar' ? 'var(--text-main)' : 'var(--text-sub)',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: postsSubTab === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                他社スタッフ稼働予定
              </button>
            </div>

            {postsSubTab === 'list' ? (
              <div>
                <h3 className="section-title" style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px' }}>
                  掲載中の案件リスト ({myJobs.length}件)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {myJobs.map(job => {
                    const isExpanded = expandedJobId === job.id;
                    const isPast = isJobPast(job);
                    const isContracted = tasks.some(t => t.jobId === job.id && ['working', 'report_pending', 'completed', 'disputed'].includes(t.status));
                    const isOffered = tasks.some(t => t.jobId === job.id && t.status === 'offered');
                    
                    return (
                      <div key={job.id} style={{ background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                        <div onClick={() => setExpandedJobId(isExpanded ? null : job.id)} style={{ padding: '14px', cursor: 'pointer', display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                              {(() => {
                                if (job.status === 'cancelled') return <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px', background: '#FEE2E2', color: '#991B1B' }}>キャンセル済み</span>;
                                if (isPast) return <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px', background: '#E2E8F0', color: '#64748B' }}>過去の案件</span>;
                                if (isContracted) return <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px', background: '#D1FAE5', color: '#065F46' }}>確定</span>;
                                if (isOffered) return <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px', background: '#FEF3C7', color: '#D97706' }}>内定通知済み</span>;
                                return <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px', background: '#EFF6FF', color: '#1D4ED8' }}>掲載中</span>;
                              })()}
                            </div>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span>{job.title}</span>
                              {job.jobCode && <span style={{ fontSize: '10px', background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>{job.jobCode}</span>}
                            </h4>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-sub)', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span>¥{job.price.toLocaleString()} / 日</span>
                              <span>•</span>
                              <span>締切: {job.applicationDeadline}</span>
                              {job.status !== 'cancelled' && !isPast && (
                                <>
                                  <span>•</span>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setScreeningJobId(job.id); }}
                                    style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                                  >
                                    選考・マッチング
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="material-symbols-outlined" style={{ color: 'var(--text-sub)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                            expand_more
                          </span>
                        </div>

                        {isExpanded && (
                          <div style={{ padding: '14px', borderTop: '1px solid #F3F4F6', background: '#F8FAFC', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div><strong>📍 勤務エリア:</strong> {job.locationName || '未指定'} ({job.exactLocation || '住所詳細なし'})</div>
                            <div><strong>📅 開催日日程:</strong> {(job.eventDate ? job.eventDate.split(', ') : []).join(', ')}</div>
                            <div><strong>💼 条件:</strong> {job.roleType} / {job.carrier} / {job.salesChannel}</div>
                            {job.detailedDescription && <div><strong>📝 詳細内容:</strong> <div style={{ background: 'var(--surface-color)', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{job.detailedDescription}</div></div>}
                            
                            {job.status !== 'cancelled' && !isPast && !isContracted && (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '10px', marginTop: '4px' }}>
                                <button type="button" onClick={() => handleCancelJob(job.id)} style={{ padding: '6px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', color: '#DC2626', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                                  この募集をキャンセルする
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {myJobs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', background: 'var(--surface-color)', borderRadius: '12px', color: 'var(--text-sub)', fontSize: '13px' }}>
                      現在掲載している案件はありません。
                    </div>
                  )}
                </div>
              </div>
            ) : (
              renderCalendar('other_staff')
            )}
          </main>
        </div>
      )}

      {/* (C) Staffs Overlay */}
      {isUserAdmin && (
        <div className={`overlay-view ${subPage === 'staffs' ? 'show' : ''}`} style={{ zIndex: 1100, display: 'flex', flexDirection: 'column' }}>
          <header className="solid-header overlay-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="icon-btn-dark" onClick={() => setSubPage('none')}>
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h1 style={{ fontSize: '16px', fontWeight: 'bold' }}>スタッフ管理</h1>
            <div style={{ width: '40px' }}></div>
          </header>
          <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '90px' }}>
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <button onClick={() => setShowAddStaffOverlay(true)} className="btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                  スタッフを追加
                </button>
                <button onClick={() => { setStaffRoles(Object.fromEntries(companyStaffs.map(s => [s.id, s.role || 'staff']))); setShowRoleOverlay(true); }} className="btn-secondary" style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', border: '1px solid #CBD5E1', background: 'var(--surface-color)', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>
                  権限を一括管理
                </button>
              </div>

              <h3 className="section-title" style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px' }}>
                登録スタッフ一覧 ({companyStaffs.length}名)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {companyStaffs.map(s => (
                  <div key={s.id} style={{ background: 'var(--surface-color)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{s.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 'normal' }}>({s.maskedName})</span>
                        {s.hasCertificate && (
                          <span style={{ background: '#D1FAE5', color: '#065F46', padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>運営確認済</span>
                        )}
                        <span style={{ background: s.role === 'admin' ? '#E0F2FE' : '#F1F5F9', color: s.role === 'admin' ? '#0369A1' : '#475569', padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>
                          {s.role === 'admin' ? '管理者' : '一般'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '4px' }}>
                        拠点: {s.baseLocation} / スキル: {s.skills.join(', ')}
                      </div>
                      {s.loginId && (
                        <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', background: '#F8FAFC', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                          ID: <strong>{s.loginId}</strong> / PW: <strong>{s.password}</strong>
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleEditClick(s)} style={{ border: 'none', background: '#F1F5F9', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#475569' }}>edit</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      )}

      {/* (D) Reports Overlay */}
      <div className={`overlay-view ${subPage === 'reports' ? 'show' : ''}`} style={{ zIndex: 1100, display: 'flex', flexDirection: 'column' }}>
        <header className="solid-header overlay-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="icon-btn-dark" onClick={() => setSubPage('none')}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold' }}>報告・評価</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '90px' }}>
          <div>
            <h3 className="section-title" style={{ marginTop: 0 }}>業務完了報告・評価待ち</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {relatedTasks.filter(t => t.status === 'report_pending' || t.status === 'disputed').map(task => (
                <div key={task.id} style={{ background: 'var(--surface-color)', borderRadius: '12px', padding: '16px', border: task.status === 'disputed' ? '1px solid #FCA5A5' : '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: task.status === 'disputed' ? '#FEE2E2' : '#FFF7ED', color: task.status === 'disputed' ? '#991B1B' : '#C2410C', fontWeight: 'bold' }}>
                      {task.status === 'disputed' ? '差戻し対応待ち' : '未報告'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{task.date}</span>
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold' }}>{task.jobTitle}</h4>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: 'var(--text-sub)' }}>
                    {getJobCodeForTask(task.jobId) && <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{getJobCodeForTask(task.jobId)}</span>}
                    <span>稼働: {task.workerName}</span>
                  </div>

                  {task.status === 'disputed' && task.disputedReason && (
                    <div style={{ background: '#FEF2F2', borderLeft: '4px solid #EF4444', padding: '8px', borderRadius: '4px', marginTop: '10px', fontSize: '11px', color: '#991B1B' }}>
                      <strong>差戻し理由:</strong> {task.disputedReason}
                    </div>
                  )}

                  {isUserAdmin && task.status === 'report_pending' && (
                    <button onClick={() => handleOpenReport(task)} style={{ background: 'var(--primary)', color: 'white', border: 'none', width: '100%', padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', marginTop: '10px', cursor: 'pointer' }}>
                      完了報告と相互評価を登録する
                    </button>
                  )}
                </div>
              ))}
              {relatedTasks.filter(t => t.status === 'report_pending' || t.status === 'disputed').length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px', background: 'var(--surface-color)', borderRadius: '12px', color: 'var(--text-sub)', fontSize: '12px' }}>
                  現在報告待ちのタスクはありません。
                </div>
              )}
            </div>

            <h3 className="section-title">完了済みのタスク (評価開示)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {relatedTasks.filter(t => t.status === 'completed').map(task => {
                const evalClient = task.evaluations?.byClient;
                const evalWorker = task.evaluations?.byWorker || task.evaluations?.byStaffToField;
                const bothEvaluated = !!evalClient && !!evalWorker;

                return (
                  <div key={task.id} style={{ background: 'var(--surface-color)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-sub)', marginBottom: '4px' }}>
                      <span>確定完了</span>
                      <span>{task.date}</span>
                    </div>
                    <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-main)' }}>{task.jobTitle}</strong>
                    
                    {bothEvaluated ? (
                      <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', marginTop: '8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><strong style={{ color: 'var(--primary)' }}>発注者評価:</strong> <span style={{ color: '#F59E0B' }}>{'★'.repeat(evalClient.rating)}</span> {evalClient.comment}</div>
                        <div><strong style={{ color: '#16A34A' }}>スタッフ評価:</strong> <span style={{ color: '#F59E0B' }}>{'★'.repeat(evalWorker.rating)}</span> {evalWorker.comment}</div>
                      </div>
                    ) : (
                      <div style={{ background: '#FFFBEB', padding: '8px', borderRadius: '6px', marginTop: '8px', fontSize: '11px', color: '#B45309' }}>
                        評価入力待ち: 双方が入力完了後に評価コメントが開示されます。
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* (E) Logs Overlay */}
      <div className={`overlay-view ${subPage === 'logs' ? 'show' : ''}`} style={{ zIndex: 1100, display: 'flex', flexDirection: 'column' }}>
        <header className="solid-header overlay-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="icon-btn-dark" onClick={() => setSubPage('none')}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1 style={{ fontSize: '16px', fontWeight: 'bold' }}>出勤管理</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="list-area bg-gray hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '90px' }}>
          <div style={{ display: 'flex', background: '#E2E8F0', padding: '2px', borderRadius: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setLogsSubTab('calendar')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                background: logsSubTab === 'calendar' ? 'white' : 'transparent',
                color: logsSubTab === 'calendar' ? 'var(--text-main)' : 'var(--text-sub)',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: logsSubTab === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              出勤予定
            </button>
            <button
              type="button"
              onClick={() => setLogsSubTab('history')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                background: logsSubTab === 'history' ? 'white' : 'transparent',
                color: logsSubTab === 'history' ? 'var(--text-main)' : 'var(--text-sub)',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: logsSubTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              出勤履歴
            </button>
          </div>

          {logsSubTab === 'calendar' ? (
            renderCalendar('own_staff')
          ) : (
            <div>
              <h3 className="section-title" style={{ marginTop: 0 }}>年月と対象の指定</h3>
              <div style={{ background: 'var(--surface-color)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isUserAdmin && companyStaffs.length > 0 && (
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>スタッフを選択</label>
                    <select 
                      value={selectedHistoryStaffId || ''} 
                      onChange={e => setSelectedHistoryStaffId(e.target.value)} 
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}
                    >
                      {companyStaffs.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role === 'admin' ? '管理者' : '一般'})</option>
                      ))}
                    </select>
                  </div>
                )}

                {!isUserAdmin && (
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                    対象者: {myStaff?.name || currentUser?.name}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>年</label>
                    <select value={selectedHistoryYear} onChange={e => setSelectedHistoryYear(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
                      <option value="2026">2026年</option>
                      <option value="2025">2025年</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>月</label>
                    <select value={selectedHistoryMonth} onChange={e => setSelectedHistoryMonth(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{m}月</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {(() => {
                const activeStaffObj = isUserAdmin 
                  ? companyStaffs.find(s => s.id === selectedHistoryStaffId)
                  : myStaff;
                
                const historyLogs = getAttendanceLogsForStaff(activeStaffObj || null);
                const filterPrefix = `${selectedHistoryYear}-${String(selectedHistoryMonth).padStart(2, '0')}`;
                const filteredLogs = historyLogs.filter(l => l.date.startsWith(filterPrefix));

                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 className="section-title" style={{ margin: 0 }}>打刻履歴 ({filteredLogs.length}件)</h3>
                      {isUserAdmin && activeStaffObj && (
                        <button 
                          onClick={() => handleDownloadCSV(filteredLogs, activeStaffObj.name)}
                          style={{ background: '#059669', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
                          CSV出力
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredLogs.map((log, idx) => {
                        const staffName = activeStaffObj?.name || currentUser?.name || 'スタッフ';
                        const task = tasks.find(t => t.date === log.date && (t.workerName === staffName || t.workerName === currentUser?.name));
                        const jCode = task ? allJobsList.find(j => j.id === task.jobId)?.jobCode : null;

                        return (
                          <div key={idx} style={{ background: 'var(--surface-color)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{log.date}</span>
                                {jCode && <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: '9px', padding: '1px 4px', borderRadius: '3px' }}>{jCode}</span>}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>
                                出勤時間: <strong>{log.checkin}</strong>
                              </div>
                            </div>
                            <span style={{ fontSize: '11px', background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>確認済</span>
                          </div>
                        );
                      })}
                      {filteredLogs.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '16px', background: 'var(--surface-color)', borderRadius: '12px', color: 'var(--text-sub)', fontSize: '12px' }}>
                          打刻データはありません。
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </main>
      </div>

      {/* (F) Training Overlay */}
      {!isUserAdmin && (
        <div className={`overlay-view ${subPage === 'training' ? 'show' : ''}`} style={{ zIndex: 1100, display: 'flex', flexDirection: 'column' }}>
          <header className="solid-header overlay-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="icon-btn-dark" onClick={() => setSubPage('none')}>
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h1 style={{ fontSize: '16px', fontWeight: 'bold' }}>研修・クイズ</h1>
            <div style={{ width: '40px' }}></div>
          </header>
          <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '90px' }}>
            <div>
              <h3 className="section-title" style={{ marginTop: 0 }}>受講済みの研修バッジ</h3>
              <div style={{ background: 'var(--surface-color)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {myStaff?.completedTrainings && myStaff.completedTrainings.filter(t => !t.startsWith('ATTENDANCE_LOG_') && !t.startsWith('CHECKIN_STATUS_')).length > 0 ? (
                    myStaff.completedTrainings
                      .filter(t => !t.startsWith('ATTENDANCE_LOG_') && !t.startsWith('CHECKIN_STATUS_'))
                      .map(tid => {
                        const tr = trainings.find(t => t.id === tid);
                        return (
                          <span key={tid} style={{ background: '#D1FAE5', color: '#065F46', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                            ✓ {tr?.title || tid}
                          </span>
                        );
                      })
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>現在、受講完了している研修はありません。</span>
                  )}
                </div>
              </div>

              <h3 className="section-title">研修一覧・テスト受講</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {trainings.map(tr => {
                  const isCompleted = myStaff?.completedTrainings?.includes(tr.id);
                  return (
                    <div key={tr.id} style={{ background: 'var(--surface-color)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-main)' }}>{tr.title}</strong>
                      
                      {isCompleted ? (
                        <div style={{ background: '#ECFDF5', color: '#065F46', fontSize: '11px', padding: '6px 8px', borderRadius: '6px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                          受講完了済み（合格）
                        </div>
                      ) : (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                          <a href={tr.zoomLink} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: 'none', background: '#EFF6FF', color: 'var(--primary)', textAlign: 'center', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #BFDBFE' }}>
                            研修動画を視聴
                          </a>
                          <button onClick={() => handleStartQuiz(tr.id)} style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                            テストを受講する
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        </div>
      )}


      {/* --- OVERLAYS & MODALS --- */}

      {/* 1. Screening/Matching Overlay (Admin) */}
      {screeningJobId && (() => {
        const activeScreeningJob = myJobs.find(j => j.id === screeningJobId);
        if (!activeScreeningJob) return null;

        // Base matching profiles list
        const baseProfiles = [
          { id: 'alpha', name: '株式会社アルファ', rep: 'アルファ 健', prText: '光回線・モバイル獲得に特化した営業支援代理店。', avgRating: 4.8, regMonths: 12, attendanceRate: 99.2 },
          { id: 'beta', name: 'ベータ株式会社', rep: 'ベータ 拓也', prText: 'イベントクルー手配から運営までワンストップで受託。', avgRating: 4.6, regMonths: 6, attendanceRate: 98.5 },
          { id: 'gamma', name: '合同会社ガンマ', rep: 'ガンマ 翔', prText: '地域密着型ブース販売。登録1.5ヶ月の新規代理店！', avgRating: 4.1, regMonths: 1.5, attendanceRate: 92.1 },
          { id: 'delta', name: 'デルタ合同会社', rep: 'デルタ 大介', prText: '緊急アサイン対応力に強み。週末ショップ応援多数。', avgRating: 4.4, regMonths: 14, attendanceRate: 96.0 }
        ].filter(p => p.id !== currentUser?.id);

        const screeningCandidates = baseProfiles.map(p => {
          const taskKey = [currentUser?.id || '', p.id].sort().join('_');
          const chatTask = tasks.find(t => t.id === 'chat_' + taskKey);

          let staffId = (chatTask?.evaluations as any)?.appliedJobStaffIds?.[activeScreeningJob.id];
          let proposedStaff = allStaffs.find(s => s.id === staffId);

          if (!proposedStaff) {
            const companyStaffsInDb = allStaffs.filter(s => s.userId === p.id);
            proposedStaff = companyStaffsInDb.length > 0 ? companyStaffsInDb[0] : {
              id: `mock_s_${p.id}`,
              userId: p.id,
              name: `${p.rep.split(' ')[0]} メンバー`,
              maskedName: `${p.rep.split(' ')[0]}*`,
              baseLocation: p.id === 'alpha' ? '東京都新宿区' : '東京都渋谷区',
              nearestStation: p.id === 'alpha' ? '新宿駅' : '渋谷駅',
              price: 15000,
              skills: ['クローザー'],
              carriers: ['au/UQmobile'],
              completedTrainings: ['tr1']
            };
          }

          const staffLogs = (proposedStaff.completedTrainings || []).filter(t => t.startsWith('ATTENDANCE_LOG_'));
          const checkinCount = staffLogs.length;

          // Reliability Score (rating & attendance rate)
          const reliabilityScore = (p.attendanceRate * 0.6) + ((p.avgRating / 5) * 40 * 10);

          // Proximity
          let distanceKm = 8.5;
          const staffLoc = (proposedStaff.baseLocation || '').toLowerCase();
          const jobLoc = (activeScreeningJob.locationName || '').toLowerCase();
          if (staffLoc && jobLoc) {
            if (staffLoc.includes('新宿') && jobLoc.includes('新宿')) distanceKm = 1.2;
            else if (staffLoc.includes('渋谷') && jobLoc.includes('渋谷')) distanceKm = 0.8;
          }

          const isCandidateContractedForThisJob = tasks.some(t => 
            t.jobId === activeScreeningJob.id && 
            (t.companyName === p.name || t.id.includes(p.id)) &&
            ['working', 'report_pending', 'completed', 'disputed'].includes(t.status)
          );

          const isCandidateOfferedForThisJob = chatTask?.status === 'offered' && 
            (chatTask?.evaluations as any)?.offeredJobId === activeScreeningJob.id;

          // Score weighting
          let relWeight = 0.30, matchWeight = 0.25, proxWeight = 0.45;
          if (screeningMode === 'reliability') {
            relWeight = 0.60; matchWeight = 0.15; proxWeight = 0.25;
          } else if (screeningMode === 'quality') {
            relWeight = 0.20; matchWeight = 0.60; proxWeight = 0.20;
          }

          const finalScore = (reliabilityScore * relWeight) + (80 * matchWeight) + ((distanceKm < 3 ? 100 : 70) * proxWeight);

          return {
            company: p,
            staff: proposedStaff,
            checkinCount,
            distance: distanceKm,
            score: finalScore,
            chatTask,
            isCandidateContractedForThisJob,
            isCandidateOfferedForThisJob
          };
        }).sort((a, b) => b.score - a.score);

        const isJobContracted = tasks.some(t => t.jobId === activeScreeningJob.id && ['working', 'report_pending', 'completed', 'disputed'].includes(t.status));

        return (
          <div className="overlay-view show" style={{ zIndex: 3100, display: 'flex', flexDirection: 'column' }}>
            <header className="solid-header overlay-header">
              <button className="icon-btn-dark" onClick={() => setScreeningJobId(null)}>
                <span className="material-symbols-outlined">arrow_back_ios_new</span>
              </button>
              <h1>候補者の選考</h1>
              <div style={{ width: '40px' }}></div>
            </header>
            <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '90px' }}>
              
              {/* Job summary */}
              <div style={{ background: 'var(--surface-color)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <span style={{ fontSize: '10px', background: '#EFF6FF', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>対象案件</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '15px', fontWeight: 'bold' }}>{activeScreeningJob.title}</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '4px' }}>
                  単価: ¥{activeScreeningJob.price.toLocaleString()} / 勤務地: {activeScreeningJob.locationName}
                </div>
              </div>

              {/* Selection policy switch */}
              <div style={{ background: 'var(--surface-color)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-sub)', marginBottom: '8px' }}>選定重視ポリシー:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'default', label: '標準', icon: 'shuffle' },
                    { id: 'reliability', label: '信頼性', icon: 'verified_user' },
                    { id: 'quality', label: 'クオリティ', icon: 'workspace_premium' }
                  ].map(opt => {
                    const isSel = screeningMode === opt.id;
                    return (
                      <button key={opt.id} type="button" onClick={() => setScreeningMode(opt.id as any)} style={{ padding: '6px', borderRadius: '6px', border: isSel ? '2px solid var(--primary)' : '1px solid var(--border-color)', background: isSel ? '#EFF6FF' : '#F8FAFC', color: isSel ? 'var(--primary)' : 'var(--text-main)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{opt.icon}</span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Candidates list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {screeningCandidates.map(c => (
                  <div key={c.company.id} style={{ background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '14px', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{c.company.name}</strong>
                        {pastTradeCompanyIds.has(c.company.id) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#D1FAE5', color: '#065F46', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>handshake</span>
                            取引実績あり
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>適合度: {Math.round(c.score)}点</span>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-sub)' }}>{c.company.prText}</p>
                    <div style={{ background: '#F8FAFC', padding: '8px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-sub)', marginBottom: '12px' }}>
                      提案メンバー: <strong>{c.staff.name}</strong> (距離: {c.distance.toFixed(1)}km) / 評価: ★{c.company.avgRating}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" onClick={() => handleStartScreeningChat(c.chatTask, c.company.id)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'var(--surface-color)', color: '#475569', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                        チャットで相談
                      </button>
                      
                      {c.isCandidateContractedForThisJob ? (
                        <button type="button" disabled style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#D1FAE5', color: '#065F46', fontSize: '11px', fontWeight: 'bold', cursor: 'not-allowed' }}>
                          契約確定
                        </button>
                      ) : isJobContracted ? (
                        <button type="button" disabled style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#F1F5F9', color: '#94A3B8', fontSize: '11px', fontWeight: 'bold', cursor: 'not-allowed' }}>
                          他社で確定済
                        </button>
                      ) : c.isCandidateOfferedForThisJob ? (
                        <button type="button" disabled style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#FEF3C7', color: '#D97706', fontSize: '11px', fontWeight: 'bold', cursor: 'not-allowed' }}>
                          内定通知済み
                        </button>
                      ) : (
                        <button type="button" onClick={() => handleOpenOrderConfirm(c)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                          内定をオファー
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </main>
          </div>
        );
      })()}

      {/* 2. Order Confirmation Dialog Modal */}
      {showOrderConfirmModal && confirmingCandidate && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div onClick={() => setShowOrderConfirmModal(false)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'var(--surface-color)', width: '90%', maxWidth: '380px', borderRadius: '16px', padding: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-main)' }}>内定オファーの確認</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-sub)', lineHeight: '1.4' }}>
              以下の内容で <strong>{confirmingCandidate.company.name}</strong> へ内定を通知します。
            </div>

            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div><strong>案件名:</strong> {myJobs.find(j => j.id === screeningJobId)?.title}</div>
              <div><strong>提案メンバー:</strong> {confirmingCandidate.staff.name}</div>
              <div><strong>条件単価:</strong> ¥{myJobs.find(j => j.id === screeningJobId)?.price.toLocaleString()} / 日</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button type="button" onClick={() => setShowOrderConfirmModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'var(--surface-color)', color: '#475569', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                キャンセル
              </button>
              <button type="button" onClick={handleConfirmOrderSubmit} disabled={isContractSaving} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                {isContractSaving ? '送信中...' : 'オファーを送信'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add Staff Overlay (Admin) */}
      {showAddStaffOverlay && (
        <div className="overlay-view show" style={{ zIndex: 3200, display: 'flex', flexDirection: 'column' }}>
          <header className="solid-header overlay-header">
            <button className="icon-btn-dark" onClick={() => setShowAddStaffOverlay(false)}>
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h1>スタッフを追加登録</h1>
            <div style={{ width: '40px' }}></div>
          </header>
          <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '90px' }}>
            <form onSubmit={handleStaffSave} style={{ background: 'var(--surface-color)', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>ログインID *</label>
                  <input type="text" required value={formData.loginId} onChange={e => setFormData({ ...formData, loginId: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} placeholder="例: yamada_1" />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>パスワード *</label>
                  <input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>氏名（フルネーム） *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} placeholder="例: 山田 太郎" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>フリガナ *</label>
                <input type="text" required value={formData.furigana} onChange={e => setFormData({ ...formData, furigana: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} placeholder="例: ヤマダ タロウ" />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>性別 *</label>
                  <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as '男性' | '女性' })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
                    <option value="男性">男性</option>
                    <option value="女性">女性</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>生年月日 *</label>
                  <input type="date" required value={formData.birthday} onChange={e => setFormData({ ...formData, birthday: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>表示名 (イニシャル等) *</label>
                <input type="text" required value={formData.maskedName} onChange={e => setFormData({ ...formData, maskedName: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} placeholder="例: Yさん" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>拠点住所 *</label>
                <input type="text" required value={formData.baseLocation} onChange={e => setFormData({ ...formData, baseLocation: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} placeholder="例: 東京都港区" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>通勤方法 *</label>
                <select value={formData.commuteMethod} onChange={e => setFormData({ ...formData, commuteMethod: e.target.value as '公共交通機関' | '自家用車' })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
                  <option value="公共交通機関">公共交通機関</option>
                  <option value="自家用車">自家用車</option>
                </select>
              </div>

              <button type="submit" disabled={staffSaving} style={{ padding: '12px', border: 'none', borderRadius: '8px', background: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '10px' }}>
                {staffSaving ? '登録中...' : '登録を完了する'}
              </button>
            </form>
          </main>
        </div>
      )}

      {/* 4. Edit Staff Overlay (Admin) */}
      {showEditStaffOverlay && editingStaff && (
        <div className="overlay-view show" style={{ zIndex: 3200, display: 'flex', flexDirection: 'column' }}>
          <header className="solid-header overlay-header">
            <button className="icon-btn-dark" onClick={() => { setShowEditStaffOverlay(false); setEditingStaff(null); }}>
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h1>スタッフ情報を編集</h1>
            <div style={{ width: '40px' }}></div>
          </header>
          <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '90px' }}>
            <form onSubmit={handleStaffUpdate} style={{ background: 'var(--surface-color)', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>ログインID *</label>
                  <input type="text" required value={editFormData.loginId} onChange={e => setEditFormData({ ...editFormData, loginId: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>パスワード *</label>
                  <input type="password" required value={editFormData.password} onChange={e => setEditFormData({ ...editFormData, password: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>氏名（フルネーム） *</label>
                <input type="text" required value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>表示名 (イニシャル等) *</label>
                <input type="text" required value={editFormData.maskedName} onChange={e => setEditFormData({ ...editFormData, maskedName: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>拠点住所 *</label>
                <input type="text" required value={editFormData.baseLocation} onChange={e => setEditFormData({ ...editFormData, baseLocation: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
              </div>

              <button type="submit" disabled={staffSaving} style={{ padding: '12px', border: 'none', borderRadius: '8px', background: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '10px' }}>
                {staffSaving ? '保存中...' : '変更を保存する'}
              </button>
            </form>
          </main>
        </div>
      )}

      {/* 5. Role management Overlay (Admin) */}
      {showRoleOverlay && (
        <div className="overlay-view show" style={{ zIndex: 3200, display: 'flex', flexDirection: 'column' }}>
          <header className="solid-header overlay-header">
            <button className="icon-btn-dark" onClick={() => setShowRoleOverlay(false)}>
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h1>権限の一括管理</h1>
            <button className="text-btn primary-text" onClick={handleRoleSaveClick} disabled={roleSaving}>
              保存
            </button>
          </header>
          <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '90px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {companyStaffs.map(s => {
                const currentRole = staffRoles[s.id] || s.role || 'staff';
                return (
                  <div key={s.id} style={{ background: 'var(--surface-color)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>現在: {s.role === 'admin' ? '管理者' : '一般'}</div>
                    </div>
                    <select 
                      value={currentRole} 
                      onChange={e => setStaffRoles({ ...staffRoles, [s.id]: e.target.value as 'admin' | 'staff' })} 
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', fontSize: '12px' }}
                    >
                      <option value="staff">一般メンバー</option>
                      <option value="admin">管理者</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      )}

      {/* Role Confirmation Modal (Admin) */}
      {showRoleConfirmModal && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 4100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div onClick={() => setShowRoleConfirmModal(false)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', background: 'var(--surface-color)', width: '90%', maxWidth: '360px', borderRadius: '16px', padding: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>権限変更の確認</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>以下のスタッフの権限を変更します。よろしいですか？</div>
            <div style={{ maxHeight: '120px', overflowY: 'auto', background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              {changedRolesList.map(change => (
                <div key={change.id}>
                  • <strong>{change.name}</strong>: {change.from === 'admin' ? '管理者' : '一般'} → <strong>{change.to === 'admin' ? '管理者' : '一般'}</strong>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button type="button" onClick={() => setShowRoleConfirmModal(false)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'var(--surface-color)', fontSize: '12px' }}>キャンセル</button>
              <button type="button" onClick={handleRolesSaveConfirm} disabled={roleSaving} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                {roleSaving ? '保存中...' : '変更を保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Rating/Report Submission Modal (Both) */}
      {selectedTask && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div onClick={() => setSelectedTask(null)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)' }} />
          <form onSubmit={handleReportSubmit} style={{ position: 'relative', background: 'var(--surface-color)', width: '90%', maxWidth: '380px', borderRadius: '16px', padding: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>実績報告と評価の入力</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>対象現場: {selectedTask.jobTitle} ({selectedTask.date})</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>評価区分</label>
              <select value={evalRole} onChange={e => setEvalRole(e.target.value as any)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
                <option value="client">発注者としての評価（スタッフへ）</option>
                <option value="worker">スタッフとしての評価（元請けへ）</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>満足度評価 (1〜5星)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(val => (
                  <span key={val} onClick={() => setEvalRating(val)} className="material-symbols-outlined" style={{ fontSize: '28px', color: val <= evalRating ? '#F59E0B' : '#CBD5E1', cursor: 'pointer' }}>
                    star
                  </span>
                ))}
              </div>
            </div>

            {evalRole === 'worker' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', padding: '8px 10px', borderRadius: '6px' }}>
                <input type="checkbox" id="latenessCheck" checked={evalHasLateness} onChange={e => setEvalHasLateness(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                <label htmlFor="latenessCheck" style={{ fontSize: '11px', color: '#991B1B', fontWeight: 'bold', cursor: 'pointer' }}>遅刻・早退などトラブルがありました</label>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>評価コメント</label>
              <textarea required value={evalComment} onChange={e => setEvalComment(e.target.value)} rows={3} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} placeholder="業務中の所感、引き継ぎ内容など"></textarea>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button type="button" onClick={() => setSelectedTask(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'var(--surface-color)', fontSize: '12px' }}>キャンセル</button>
              <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>評価を送信</button>
            </div>
          </form>
        </div>
      )}

      {/* 7. Quiz/Test Modal Overlay (Worker) */}
      {activeQuizId && (() => {
        const questions = quizData[activeQuizId];
        const activeQuestion = questions[activeQuizIndex];
        const training = trainings.find(t => t.id === activeQuizId);

        return (
          <div className="overlay-view show" style={{ zIndex: 3300, display: 'flex', flexDirection: 'column' }}>
            <header className="solid-header overlay-header">
              <button className="icon-btn-dark" onClick={() => setActiveQuizId(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
              <h1>{training?.title || '確認テスト'}</h1>
              <div style={{ width: '40px' }}></div>
            </header>
            <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              
              {!quizCompleted ? (
                <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 'bold', marginBottom: '8px' }}>
                    問題 {activeQuizIndex + 1} / {questions.length}
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 20px 0', color: 'var(--text-main)', lineHeight: '1.4' }}>
                    {activeQuestion.question}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeQuestion.options.map((opt, idx) => (
                      <button 
                        key={idx} 
                        type="button" 
                        onClick={() => handleQuizAnswer(idx)}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#F8FAFC', textAlign: 'left', fontSize: '13px', color: 'var(--text-main)', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                        className="quiz-option-hover"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--surface-color)', padding: '24px 20px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '64px', color: (quizScore || 0) >= 80 ? '#10B981' : '#EF4444', marginBottom: '16px' }}>
                    {(quizScore || 0) >= 80 ? 'check_circle' : 'cancel'}
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                    {(quizScore || 0) >= 80 ? 'テストに合格しました！' : '不合格です'}
                  </h3>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: (quizScore || 0) >= 80 ? '#10B981' : '#EF4444', marginBottom: '12px' }}>
                    {quizScore} 点
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-sub)', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                    {(quizScore || 0) >= 80 
                      ? '受講完了バッジがプロフィールに付与され、選考時のアピール材料となります。' 
                      : '合格点（80点）に達しませんでした。動画を再確認して再度テストに挑戦してください。'}
                  </p>
                  <button onClick={() => setActiveQuizId(null)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                    閉じる
                  </button>
                </div>
              )}
            </main>
          </div>
        );
      })()}

    </div>
  );
}
