import { useState, useEffect, useMemo } from 'react';
import { api } from '../data/mockDb';
import type { ContractTask, Training, Staff, Job, Talent, User } from '../data/mockDb';

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

const getStaffGender = (name: string): '男性' | '女性' => {
  const femaleNames = ['舞', '優花', '陽子', '沙織', '美咲', '愛', '結衣', '莉子', '咲良', '葵', 'さくら', 'つばさ'];
  const isFemale = femaleNames.some(fn => name.includes(fn));
  return isFemale ? '女性' : '男性';
};

export function TaskPage() {
  const [tasks, setTasks] = useState<ContractTask[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [myStaff, setMyStaff] = useState<Staff | null>(null);
  const [companyStaffs, setCompanyStaffs] = useState<Staff[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const isUserAdmin = !currentUser?.staffId || currentUser.staffRole === 'admin';

  // 出退勤State
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkinTime, setCheckinTime] = useState<string | null>(null);

  // GPS State
  const [isSimulatingGps, setIsSimulatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [isVerifyingGps, setIsVerifyingGps] = useState(false);

  const TARGET_LAT = 35.6895;
  const TARGET_LNG = 139.6917;

  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const deltaPhi = (lat2-lat1) * Math.PI/180;
    const deltaLambda = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  };

  useEffect(() => {
    if (isSimulatingGps) {
      setUserLocation({ lat: TARGET_LAT, lng: TARGET_LNG });
      setGpsError(null);
    } else {
      setUserLocation(null);
      setGpsError(null);
    }
  }, [isSimulatingGps]);

  const distance = userLocation ? getDistanceInMeters(userLocation.lat, userLocation.lng, TARGET_LAT, TARGET_LNG) : null;
  const isInRange = distance !== null && distance <= 500;

  // 完了報告・評価モーダルState
  const [selectedTask, setSelectedTask] = useState<ContractTask | null>(null);
  const [evalRating, setEvalRating] = useState<number>(5); // 1 to 5 stars
  const [evalComment, setEvalComment] = useState('');
  const [evalHasLateness, setEvalHasLateness] = useState(false);
  
  // 評価対象のトグル用 (デモ用：どの登場人物の視点で評価するか)
  const [evalRole, setEvalRole] = useState<'client' | 'worker' | 'staffToField'>('client');

  // 研修クイズState
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizTrainingId, setQuizTrainingId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  // 研修State
  const [activeTraining, setActiveTraining] = useState<Training | null>(null);
  const [isTrainingCompleted, setIsTrainingCompleted] = useState<Record<string, boolean>>({});
  const [completedTrainingList, setCompletedTrainingList] = useState<string[]>([]);
  const [showTrainingOverlay, setShowTrainingOverlay] = useState(false);
  const [showReportOverlay, setShowReportOverlay] = useState(false);
  const [showStaffMonitorOverlay, setShowStaffMonitorOverlay] = useState(false);

  // 出勤履歴State
  const [showHistoryOverlay, setShowHistoryOverlay] = useState(false);
  const [selectedHistoryYear, setSelectedHistoryYear] = useState<number>(new Date().getFullYear());
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedHistoryStaffId, setSelectedHistoryStaffId] = useState<string | null>(null);

  // 自社募集案件・人材State
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myTalents, setMyTalents] = useState<Talent[]>([]);
  const [showMyPostsOverlay, setShowMyPostsOverlay] = useState(false);
  const [myPostsTab, setMyPostsTab] = useState<'jobs' | 'talents'>('jobs');
  const [myJobsSortType, setMyJobsSortType] = useState<'recent' | 'deadline' | 'price'>('recent');
  const [statusFilter, setStatusFilter] = useState<'all' | 'recruiting' | 'offered' | 'contracted' | 'cancelled' | 'past'>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [expandedTalentId, setExpandedTalentId] = useState<string | null>(null);

  // 選考・マッチング関連のState
  const [screeningJobId, setScreeningJobId] = useState<string | null>(null);
  const [screeningMode, setScreeningMode] = useState<'default' | 'quality' | 'cost_performance' | 'reliability'>('default');
  const [allStaffs, setAllStaffs] = useState<Staff[]>([]);
  const [confirmingCandidate, setConfirmingCandidate] = useState<any | null>(null);

  const isJobPast = (job: Job) => {
    if (!job.applicationDeadline) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return job.applicationDeadline < todayStr;
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('本当にこの募集をキャンセル（募集停止）しますか？')) return;
    try {
      await api.updateJob(jobId, { status: 'cancelled' });
      alert('募集をキャンセルしました。');
      await loadData();
    } catch (e) {
      console.error(e);
      alert('キャンセルの処理中にエラーが発生しました。');
    }
  };

  const displayedMyJobs = useMemo(() => {
    let filtered = myJobs.filter(job => {
      const isPast = isJobPast(job) || tasks.some(t => t.jobId === job.id && t.status === 'completed');
      const isCancelled = job.status === 'cancelled';
      const isContracted = tasks.some(t => t.jobId === job.id && ['working', 'report_pending', 'disputed'].includes(t.status));
      const isOffered = !isContracted && tasks.some(t => {
        const isRelated = t.id.startsWith('chat_') && !t.id.startsWith('chat_group_') && (t.evaluations as any)?.appliedJobIds?.includes(job.id);
        return isRelated && t.status === 'offered';
      });

      const status = isPast ? 'past' : isCancelled ? 'cancelled' : isContracted ? 'contracted' : isOffered ? 'offered' : 'recruiting';

      if (statusFilter === 'all') return true;
      return status === statusFilter;
    });

    if (myJobsSortType === 'deadline') {
      return [...filtered].sort((a, b) => {
        const da = a.applicationDeadline || '';
        const db = b.applicationDeadline || '';
        return da.localeCompare(db);
      });
    }
    if (myJobsSortType === 'price') {
      return [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
    }
    return [...filtered].sort((a, b) => b.id.localeCompare(a.id));
  }, [myJobs, myJobsSortType, statusFilter, tasks]);

  const loadData = async () => {
    try {
      const fetchedTasks = await api.getContractTasks();
      setTasks(fetchedTasks);
      
      const fetchedTrainings = await api.getTrainings();
      setTrainings(fetchedTrainings);

      const user = await api.getCurrentUser();
      setCurrentUser(user);
      if (!user) return;

      const fetchedStaffs = await api.getStaffsByUserId(user.id);
      setCompanyStaffs(fetchedStaffs);
      
      if (fetchedStaffs.length > 0) {
        const matched = user.staffId ? fetchedStaffs.find(s => s.id === user.staffId) : null;
        const currentStaff = matched || fetchedStaffs[0];
        setMyStaff(currentStaff);
        setCompletedTrainingList((currentStaff.completedTrainings || []).filter(tid => !tid.startsWith('CHECKIN_STATUS_') && !tid.startsWith('ATTENDANCE_LOG_')));
      }

      if (user.staffId && fetchedStaffs.length > 0) {
        const currentStaff = fetchedStaffs.find(s => s.id === user.staffId) || fetchedStaffs[0];
        const checkinTag = (currentStaff.completedTrainings || []).find(tid => tid.startsWith('CHECKIN_STATUS_TRUE_'));
        if (checkinTag) {
          setIsCheckedIn(true);
          setCheckinTime(checkinTag.replace('CHECKIN_STATUS_TRUE_', ''));
        } else {
          setIsCheckedIn(false);
          setCheckinTime(null);
        }
      } else {
        const checkedInStatus = localStorage.getItem('checkin_status_' + user.id) === 'true';
        setIsCheckedIn(checkedInStatus);
        setCheckinTime(localStorage.getItem('checkin_time_' + user.id));
      }

      // 自社掲示中の案件と人材をフェッチ
      const allJobs = await api.getJobs();
      const allTalents = await api.getTalents();
      setMyJobs(allJobs.filter(j => j.authorId === user.id));
      setMyTalents(allTalents.filter(t => t.userId === user.id));

      const fetchedAllStaffs = await api.getAllStaffs();
      setAllStaffs(fetchedAllStaffs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [screeningJobId]);

  const performCheckin = async (timeStr: string, dateStr: string) => {
    if (!currentUser) return;
    if (currentUser.staffId && myStaff) {
      const tag = `CHECKIN_STATUS_TRUE_${timeStr}`;
      const logTag = `ATTENDANCE_LOG_${dateStr}_${timeStr}`;
      const newTrainings = Array.from(new Set([...(myStaff.completedTrainings || []), tag, logTag]));
      try {
        await api.updateStaff(myStaff.id, { completedTrainings: newTrainings });
        myStaff.completedTrainings = newTrainings;
        setIsCheckedIn(true);
        setCheckinTime(timeStr);
        alert(`GPS出勤打刻を完了しました（打刻時間: ${timeStr}）`);
      } catch (err) {
        console.error("Check-in database error:", err);
        alert("データベースとの同期中にエラーが発生しました。インターネット接続を確認して、再度お試しください。");
      }
    } else {
      setIsCheckedIn(true);
      setCheckinTime(timeStr);
      localStorage.setItem('checkin_status_' + currentUser.id, 'true');
      localStorage.setItem('checkin_time_' + currentUser.id, timeStr);
      
      const localLogs = JSON.parse(localStorage.getItem('attendance_logs_' + currentUser.id) || '[]');
      localLogs.push({
        date: dateStr,
        checkin: timeStr
      });
      localStorage.setItem('attendance_logs_' + currentUser.id, JSON.stringify(localLogs));
      
      alert(`GPS出勤打刻を完了しました（打刻時間: ${timeStr}）`);
    }
  };

  const handleCheckin = async () => {
    if (!currentUser) return;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (isSimulatingGps) {
      await performCheckin(timeStr, dateStr);
      return;
    }

    if (!navigator.geolocation) {
      alert("お使いのブラウザは位置情報をサポートしていません。");
      setGpsError("ブラウザが位置情報をサポートしていません。");
      return;
    }

    setIsVerifyingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng });

        const dist = getDistanceInMeters(lat, lng, TARGET_LAT, TARGET_LNG);
        if (dist <= 500) {
          await performCheckin(timeStr, dateStr);
        } else {
          const distKm = (dist / 1000).toFixed(1);
          alert(`GPS判定エリア外です。現場から ${distKm}km 離れています。500m以内に移動して再度お試しください。`);
        }
        setIsVerifyingGps(false);
      },
      (error) => {
        console.error("GPS Error:", error);
        let errorMsg = "位置情報が取得できません。端末の位置情報設定を確認し、アプリへのアクセスを許可してください。";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "位置情報の利用許可が拒否されました。ブラウザまたはシステムの設定で位置情報へのアクセスを許可してください。";
        }
        setGpsError(errorMsg);
        alert(errorMsg);
        setIsVerifyingGps(false);
        setUserLocation(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleCheckinReset = async () => {
    if (!currentUser) return;
    
    if (currentUser.staffId && myStaff) {
      const newTrainings = (myStaff.completedTrainings || []).filter(tid => !tid.startsWith('CHECKIN_STATUS_'));
      try {
        await api.updateStaff(myStaff.id, { completedTrainings: newTrainings });
        myStaff.completedTrainings = newTrainings;
        setIsCheckedIn(false);
        setCheckinTime(null);
      } catch (err) {
        console.error("Check-in reset database error:", err);
        alert("データベースとの同期中にエラーが発生しました。再度お試しください。");
      }
    } else {
      setIsCheckedIn(false);
      setCheckinTime(null);
      localStorage.removeItem('checkin_status_' + currentUser.id);
      localStorage.removeItem('checkin_time_' + currentUser.id);
    }
  };

  interface ParsedAttendanceLog {
    date: string;
    checkin: string;
  }

  const getAttendanceLogsForStaff = (staff: Staff | null): ParsedAttendanceLog[] => {
    if (!staff) return [];
    
    const dbLogs: ParsedAttendanceLog[] = (staff.completedTrainings || [])
      .filter(t => t.startsWith('ATTENDANCE_LOG_'))
      .map(t => {
        const parts = t.split('_');
        return {
          date: parts[2],
          checkin: parts[3]
        };
      });

    if (dbLogs.length === 0) {
      const mockLogs: ParsedAttendanceLog[] = [
        { date: '2026-06-05', checkin: '09:02' },
        { date: '2026-06-04', checkin: '08:58' },
        { date: '2026-06-03', checkin: '09:00' },
        { date: '2026-06-02', checkin: '08:55' },
        { date: '2026-06-01', checkin: '09:05' },
        { date: '2026-05-28', checkin: '08:59' },
        { date: '2026-05-27', checkin: '09:00' },
        { date: '2026-05-26', checkin: '09:01' },
        { date: '2026-05-25', checkin: '08:54' },
        { date: '2026-04-15', checkin: '09:00' },
        { date: '2026-04-14', checkin: '08:57' },
        { date: '2025-12-10', checkin: '09:02' }
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
    const headers = ["日付", "出勤時間"];
    const rows = logs.map(log => [log.date, log.checkin]);
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

  // 報告モーダル展開
  const handleOpenReport = (task: ContractTask) => {
    setSelectedTask(task);
    setEvalRating(5);
    setEvalComment('');
    setEvalRole('client');
    setEvalHasLateness(false);
  };

  // 報告送信
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (evalRating <= 2 && !evalComment.trim()) {
      alert('★2つ以下の評価の場合は、コメント（改善要望等）の入力が必須です。');
      return;
    }

    try {
      const evaluatorName = evalRole === 'client' ? '株式会社アルファ通信 C社責任者' : 'B社責任者D';
      const target = evalRole === 'client' ? 'byClient' : evalRole === 'worker' ? 'byWorker' : 'byStaffToField';
      
      await api.submitReport(
        selectedTask.id,
        evalRating,
        evalComment,
        evaluatorName,
        target,
        evalHasLateness
      );

      alert('完了報告と評価を送信しました。\n（※ブラインド評価のため、双方が完了するまで相手の評価は表示されません）');
      setSelectedTask(null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // デモ用: bad評価の拒否・承認シミュレータ
  const handleSimulateDispute = async (taskId: string, action: 'approve' | 'reject') => {
    try {
      const reason = action === 'reject' ? '「当日の遅刻があった」とありますが、電車の遅延証明書を提出済みです。評価内容の修正を求めます。' : undefined;
      await api.respondToDispute(taskId, action, reason);
      alert(action === 'reject' ? '相手方が評価を拒否し、運営ヒアリング状態になりました。' : '相手方が評価を承認し、タスクが完了しました。');
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartScreeningChat = (chatTask: any, companyId: string) => {
    let roomId = chatTask?.id;
    if (!roomId && currentUser) {
      const sortedIds = [currentUser.id, companyId].sort();
      roomId = `chat_${sortedIds[0]}_${sortedIds[1]}`;
    }
    localStorage.setItem('connexy_active_chat_id', roomId);
    setScreeningJobId(null);
    setShowMyPostsOverlay(false);
    window.location.hash = '#/message';
  };

  const handleConfirmContract = async (candidate: any) => {
    const job = myJobs.find(j => j.id === screeningJobId);
    if (!job || !currentUser) return;
    try {
      const staff = candidate.staff;
      const company = candidate.company;

      // 1. Resolve the chat room ID
      let chatTaskId = candidate.chatTask?.id;
      if (!chatTaskId) {
        const sortedIds = [currentUser.id, company.id].sort();
        chatTaskId = `chat_${sortedIds[0]}_${sortedIds[1]}`;
      }

      let msgs: any[] = [];
      const currentTask = tasks.find(t => t.id === chatTaskId);
      if (currentTask) {
        msgs = (currentTask.evaluations as any)?.messages || [];
      } else {
        msgs = [{ id: 'sys_init', type: 'system', text: 'チャットを開始しました', time: '' }];
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const offerMsg = {
        id: 'sys_offer_' + Date.now(),
        type: 'system',
        text: `内定オファーが届きました`,
        time: timeStr
      };

      const updatedMsgs = [...msgs, offerMsg];
      
      // Update the chat task's status to 'offered' and save messages
      const appliedJobStaffIds = (currentTask?.evaluations as any)?.appliedJobStaffIds || {};
      appliedJobStaffIds[job.id] = staff.id;

      await api.saveContractTaskChat(
        chatTaskId,
        updatedMsgs,
        job.title,
        currentUser.name,
        company.name,
        [job.id],
        appliedJobStaffIds
      );
      
      await api.updateContractTaskStatus(chatTaskId, 'offered', { offeredJobId: job.id });

      alert(`🎉 ${company.name} へ内定を通知しました！\n相手企業が承諾すると契約が確定します。チャットでやりとりを続けられます。`);
      setConfirmingCandidate(null);
      setScreeningJobId(null);
      await loadData();
    } catch (e) {
      console.error(e);
      alert('内定通知の送信処理中にエラーが発生しました。');
    }
  };

  // 研修受講シミュレータ
  const handleStartTraining = (training: Training) => {
    setActiveTraining(training);
    // Zoomを開いた想定で2秒後に受講登録ができるようにする
    setTimeout(() => {
      setIsTrainingCompleted(prev => ({ ...prev, [training.id]: true }));
    }, 2000);
  };

  const handleRegisterTraining = (trainingId: string) => {
    setQuizTrainingId(trainingId);
    setQuizAnswers({});
    setShowQuizModal(true);
  };

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTrainingId) return;
    const questions = quizData[quizTrainingId];
    if (!questions) return;

    let allCorrect = true;
    for (let i = 0; i < questions.length; i++) {
      if (quizAnswers[i] !== questions[i].answer) {
        allCorrect = false;
        break;
      }
    }

    if (!allCorrect) {
      alert('回答が正しくありません。講義内容を復習して、もう一度回答してください。');
      return;
    }

    try {
      if (myStaff) {
        await api.completeTraining(myStaff.id, quizTrainingId);
        alert('合格です！研修の受講完了が登録されました。\nスタッフ詳細プロフィールに実績バッジが反映されます。');
      } else {
        alert('合格です！（デモ版：スタッフ未登録のため、画面表示のみ受講完了状態にします）');
      }
      setShowQuizModal(false);
      setQuizTrainingId(null);
      setQuizAnswers({});
      setActiveTraining(null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // 集計値算出
  const displayedTasks = isUserAdmin ? tasks : tasks.filter(t => t.workerName === currentUser?.staffName);
  const pendingReportCount = displayedTasks.filter(t => t.status === 'report_pending').length;
  const workingCount = displayedTasks.filter(t => t.status === 'working').length;
  const completedCount = displayedTasks.filter(t => t.status === 'completed').length;
  const disputedCount = displayedTasks.filter(t => t.status === 'disputed').length;

  return (
    <div className="view active" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="solid-header">
        <h1>タスク管理</h1>
      </header>

      <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '90px' }}>
        
        {/* 未完了報告アラート */}
        {pendingReportCount > 0 && (
          <div className="alert-banner" style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ color: '#EF4444' }}>warning</span>
            <div>
              <div style={{ color: '#991B1B', fontWeight: 'bold', fontSize: '14px' }}>未完了の業務完了報告があります（{pendingReportCount}件）</div>
              <div style={{ color: '#7F1D1D', fontSize: '12px', marginTop: '2px' }}>完了報告を完了するまで、ダッシュボードでの売上残高の引き出し（振込）が制限されます。</div>
            </div>
          </div>
        )}

        {/* 3. 本日の現場セクション */}
        <h3 className="section-title" style={{ marginTop: 0 }}>本日の現場</h3>
        <div className="task-card" style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
          <div className="task-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span className="task-status active" style={{ color: isCheckedIn ? '#10B981' : 'var(--primary)', fontWeight: 'bold' }}>
              {isCheckedIn ? '● 稼働中' : '稼働予定'}
            </span>
            <span className="task-time" style={{ fontSize: '13px', color: 'var(--text-sub)' }}>10:00 - 19:00</span>
          </div>
          <h4 className="task-title" style={{ fontSize: '16px', margin: '0 0 8px 0' }}>auショップ新宿西口店 イベント</h4>
          <p className="task-address" style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>
            東京都新宿区西新宿1-1-1
          </p>

          <div className="checkin-container" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            {/* GPS Simulation Tool for Demo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
              <input 
                type="checkbox" 
                id="gps-sim-checkbox"
                checked={isSimulatingGps} 
                onChange={(e) => setIsSimulatingGps(e.target.checked)} 
                style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="gps-sim-checkbox" style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)', cursor: 'pointer', flex: 1 }}>
                【デモ用】位置情報をシミュレート（現場の近くに移動）
              </label>
            </div>

            <div style={{ position: 'relative', height: '100px', background: '#F1F5F9', borderRadius: '8px', marginBottom: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'radial-gradient(circle, #000000 8%, transparent 8%)', backgroundSize: '16px 16px' }}></div>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: isInRange ? '2px dashed #10B981' : '2px dashed #EF4444', background: isInRange ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.3s' }}>
                <span style={{ fontSize: '8px', color: isInRange ? '#10B981' : '#EF4444', fontWeight: 'bold', position: 'absolute', top: '4px', whiteSpace: 'nowrap' }}>
                  500m判定エリア
                </span>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isInRange ? '#10B981' : '#EF4444', border: '2px solid white', boxShadow: isInRange ? '0 0 8px rgba(16, 185, 129, 0.8)' : '0 0 8px rgba(239, 68, 68, 0.8)' }}></div>
              </div>
            </div>

            {isCheckedIn ? (
              <div style={{ background: '#D1FAE5', color: '#065F46', padding: '12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  <span>出勤打刻完了（稼働中）</span>
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  打刻日時: 当日 {checkinTime} <span style={{ fontSize: '10px', opacity: 0.6 }}>(ID: {currentUser?.staffId || currentUser?.id})</span>
                </div>
                <button 
                  type="button" 
                  onClick={handleCheckinReset} 
                  style={{ background: 'none', border: 'none', color: '#059669', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '6px', padding: 0 }}
                >
                  【デモ用】打刻状態をクリアする
                </button>
              </div>
            ) : (
              <>
                {gpsError && (
                  <p style={{ color: '#EF4444', fontSize: '12px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                    <span>{gpsError}</span>
                  </p>
                )}
                
                {distance !== null ? (
                  <p style={{ color: isInRange ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginBottom: '12px', fontWeight: 'bold' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>my_location</span>
                    {isInRange ? (
                      <span>GPS判定エリア内（現場からおよそ {distance.toFixed(0)}m）</span>
                    ) : (
                      <span>GPS判定エリア外（現場からおよそ {(distance / 1000).toFixed(1)}km）</span>
                    )}
                  </p>
                ) : !gpsError ? (
                  <p style={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginBottom: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_searching</span>
                    <span>位置情報は打刻時に取得されます</span>
                  </p>
                ) : null}

                <button
                  className={`btn-checkin ${isVerifyingGps ? 'loading' : (userLocation !== null && !isInRange) ? 'disabled' : 'active'}`}
                  disabled={isVerifyingGps || (userLocation !== null && !isInRange)}
                  style={{
                    backgroundColor: (isVerifyingGps || (userLocation !== null && !isInRange)) ? '#E5E7EB' : 'var(--primary)',
                    color: (isVerifyingGps || (userLocation !== null && !isInRange)) ? '#9CA3AF' : 'white',
                    cursor: (isVerifyingGps || (userLocation !== null && !isInRange)) ? 'not-allowed' : 'pointer',
                    border: 'none',
                    boxShadow: (isVerifyingGps || (userLocation !== null && !isInRange)) ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.25)',
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onClick={handleCheckin}
                >
                  {isVerifyingGps ? (
                    <>
                      <span className="material-symbols-outlined spin-anim" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                        progress_activity
                      </span>
                      位置情報を確認中...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                        login
                      </span>
                      {userLocation !== null && !isInRange ? '出勤判定エリア外です' : '出勤を打刻する'}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 1. タスク概況セクション (ダッシュボードから移動) */}
        <h3 className="section-title">タスク概況</h3>
        <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
          <div className="summary-card" style={{ background: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <span className="summary-num" style={{ fontSize: '24px', fontWeight: 'bold', color: '#F59E0B', display: 'block' }}>{workingCount}</span>
            <span className="summary-label" style={{ fontSize: '11px', color: 'var(--text-sub)' }}>稼働予定/中</span>
          </div>
          <div className="summary-card" style={{ background: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <span className="summary-num" style={{ fontSize: '24px', fontWeight: 'bold', color: '#EF4444', display: 'block' }}>{pendingReportCount + disputedCount}</span>
            <span className="summary-label" style={{ fontSize: '11px', color: 'var(--text-sub)' }}>報告/承認待ち</span>
          </div>
          <div className="summary-card" style={{ background: 'white', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <span className="summary-num" style={{ fontSize: '24px', fontWeight: 'bold', color: '#10B981', display: 'block' }}>{completedCount}</span>
            <span className="summary-label" style={{ fontSize: '11px', color: 'var(--text-sub)' }}>完了済</span>
          </div>
        </div>

        {/* 4. アクションリストセクション */}
        <div className="settings-list" style={{ marginBottom: '24px' }}>
          <div className="settings-group" style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            
            {/* スタッフ出勤状況（管理者のみ） */}
            {isUserAdmin && (
              <div className="settings-item" onClick={() => setShowStaffMonitorOverlay(true)}>
                <span className="material-symbols-outlined item-icon" style={{ color: '#4F46E5', marginRight: '12px' }}>supervised_user_circle</span>
                <span style={{ flex: 1, fontSize: '15px', fontWeight: 500 }}>スタッフ出勤状況の確認</span>
                <span className="material-symbols-outlined item-arrow" style={{ color: '#D1D5DB' }}>chevron_right</span>
              </div>
            )}

            {/* 自社の掲示状況（管理者のみ） */}
            {isUserAdmin && (
              <div className="settings-item" onClick={() => setShowMyPostsOverlay(true)}>
                <span className="material-symbols-outlined item-icon" style={{ color: '#0EA5E9', marginRight: '12px' }}>work_history</span>
                <span style={{ flex: 1, fontSize: '15px', fontWeight: 500 }}>自社の掲示状況（案件・人材管理）</span>
                <span className="material-symbols-outlined item-arrow" style={{ color: '#D1D5DB' }}>chevron_right</span>
              </div>
            )}

            {/* 実績報告・評価履歴 */}
            <div className="settings-item" onClick={() => setShowReportOverlay(true)}>
              <span className="material-symbols-outlined item-icon" style={{ color: '#059669', marginRight: '12px' }}>rate_review</span>
              <span style={{ flex: 1, fontSize: '15px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                実績報告・評価履歴を開く
                {pendingReportCount > 0 && (
                  <span style={{
                    background: '#EF4444',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    未完了: {pendingReportCount}件
                  </span>
                )}
              </span>
              <span className="material-symbols-outlined item-arrow" style={{ color: '#D1D5DB' }}>chevron_right</span>
            </div>

            {/* 研修・獲得実績 */}
            <div className="settings-item" onClick={() => setShowTrainingOverlay(true)}>
              <span className="material-symbols-outlined item-icon" style={{ color: '#2563EB', marginRight: '12px' }}>workspace_premium</span>
              <span style={{ flex: 1, fontSize: '15px', fontWeight: 500 }}>研修・獲得実績を開く</span>
              <span className="material-symbols-outlined item-arrow" style={{ color: '#D1D5DB' }}>chevron_right</span>
            </div>

            {/* 出勤履歴（一般スタッフのみ） */}
            {!isUserAdmin && (
              <div className="settings-item" onClick={() => {
                setSelectedHistoryStaffId(myStaff?.id || null);
                setShowHistoryOverlay(true);
              }}>
                <span className="material-symbols-outlined item-icon" style={{ color: '#D97706', marginRight: '12px' }}>history</span>
                <span style={{ flex: 1, fontSize: '15px', fontWeight: 500 }}>出勤履歴</span>
                <span className="material-symbols-outlined item-arrow" style={{ color: '#D1D5DB' }}>chevron_right</span>
              </div>
            )}

          </div>
        </div>

      </main>

      {/* 研修・実績 Overlay */}
      <div className={`overlay-view ${showTrainingOverlay ? 'show' : ''}`} style={{ display: showTrainingOverlay ? 'flex' : 'none', transform: showTrainingOverlay ? 'translateX(0)' : 'translateX(100%)', zIndex: 3000 }}>
        <header className="solid-header overlay-header">
          <button className="icon-btn-dark" onClick={() => setShowTrainingOverlay(false)}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1>研修・獲得実績</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>研修制度と実績連携</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-main)' }}>🛡️ あなたの受講完了研修</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {completedTrainingList.length > 0 ? (
                  completedTrainingList.map(tid => {
                    const tr = trainings.find(t => t.id === tid);
                    return (
                      <span key={tid} style={{ background: '#D1FAE5', color: '#065F46', padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 'bold' }}>
                        ✓ {tr?.title}
                      </span>
                    );
                  })
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>受講完了した研修はありません。</span>
                )}
              </div>
            </div>

            {trainings.map(tr => {
              const isCompleted = completedTrainingList.includes(tr.id);
              return (
                <div key={tr.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>{tr.title}</h4>
                  
                  <div className="settings-list" style={{ marginTop: '12px' }}>
                    <div className="settings-group" style={{ background: '#F9FAFB', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      {isCompleted ? (
                        <div className="settings-item" style={{ padding: '12px 16px', cursor: 'default' }}>
                          <span className="material-symbols-outlined item-icon" style={{ color: '#10B981', marginRight: '12px' }}>check_circle</span>
                          <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: '#10B981' }}>受講完了済み</span>
                        </div>
                      ) : (
                        <>
                          <div className="settings-item" onClick={() => handleStartTraining(tr)} style={{ padding: '12px 16px' }}>
                            <span className="material-symbols-outlined item-icon" style={{ color: '#2563EB', marginRight: '12px' }}>play_circle</span>
                            <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>受講を開始 (Zoom)</span>
                            <span className="material-symbols-outlined item-arrow" style={{ color: '#D1D5DB' }}>chevron_right</span>
                          </div>
                          
                          <div 
                            className="settings-item" 
                            onClick={() => {
                              if (isTrainingCompleted[tr.id]) {
                                handleRegisterTraining(tr.id);
                              }
                            }}
                            style={{ 
                              padding: '12px 16px',
                              opacity: isTrainingCompleted[tr.id] ? 1 : 0.5,
                              cursor: isTrainingCompleted[tr.id] ? 'pointer' : 'not-allowed',
                              borderTop: '1px solid var(--border-color)'
                            }}
                          >
                            <span className="material-symbols-outlined item-icon" style={{ color: isTrainingCompleted[tr.id] ? '#10B981' : '#9CA3AF', marginRight: '12px' }}>verified</span>
                            <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: isTrainingCompleted[tr.id] ? 'var(--text-main)' : '#9CA3AF' }}>受講完了を登録</span>
                            <span className="material-symbols-outlined item-arrow" style={{ color: '#D1D5DB' }}>chevron_right</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* 業務完了報告・評価履歴 Overlay */}
      <div className={`overlay-view ${showReportOverlay ? 'show' : ''}`} style={{ display: showReportOverlay ? 'flex' : 'none', transform: showReportOverlay ? 'translateX(0)' : 'translateX(100%)', zIndex: 3000 }}>
        <header className="solid-header overlay-header">
          <button type="button" className="icon-btn-dark" onClick={() => setShowReportOverlay(false)}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1>実績報告・評価履歴</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
          
          {/* 2. 完了報告待ちリスト */}
          <h3 className="section-title" style={{ marginTop: 0 }}>業務完了報告と相互評価</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {displayedTasks.filter(t => t.status === 'report_pending' || t.status === 'disputed').map(task => (
              <div key={task.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: task.status === 'disputed' ? '1px solid #FCA5A5' : '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span className={`status-badge ${task.status === 'disputed' ? 'badge-waiting' : 'badge-negotiating'}`} style={{ margin: 0, fontSize: '11px' }}>
                    {task.status === 'disputed' ? '悪い評価の対応待ち' : '未報告'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>稼働日: {task.date}</span>
                </div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{task.jobTitle}</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-sub)' }}>
                  稼働スタッフ: {task.workerName} （{task.companyName}）
                </p>
                
                {task.status === 'disputed' && task.disputedReason && (
                  <div style={{ background: '#FEF2F2', borderLeft: '4px solid #EF4444', padding: '8px 12px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                    <strong>相手方の拒否理由:</strong> {task.disputedReason}
                    <div style={{ color: '#DC2626', fontWeight: 'bold', marginTop: '6px' }}>
                      🚨 アプリ運営事務局から双方へヒアリング確認の連絡が入ります。
                    </div>
                  </div>
                )}

                {task.status === 'disputed' && !task.disputedReason && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#B45309', marginBottom: '8px' }}>
                      ⚠️ あなたがbad評価をつけたため、相手方の応答待ち状態です。
                    </div>
                    {/* デモ用相手方アクション模擬 */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn-secondary btn-small" style={{ margin: 0, fontSize: '11px', flex: 1, borderColor: '#10B981', color: '#10B981' }} onClick={() => handleSimulateDispute(task.id, 'approve')}>
                        相手が「承認」する(デモ)
                      </button>
                      <button type="button" className="btn-secondary btn-small" style={{ margin: 0, fontSize: '11px', flex: 1, borderColor: '#EF4444', color: '#EF4444' }} onClick={() => handleSimulateDispute(task.id, 'reject')}>
                        相手が「拒否」する(デモ)
                      </button>
                    </div>
                  </div>
                )}

                {task.status === 'report_pending' && (
                  <div className="settings-list" style={{ marginTop: '12px' }}>
                    <div className="settings-group" style={{ background: '#F9FAFB', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div className="settings-item" onClick={() => handleOpenReport(task)} style={{ padding: '12px 16px' }}>
                        <span className="material-symbols-outlined item-icon" style={{ color: '#059669', marginRight: '12px' }}>rate_review</span>
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>完了報告と評価の入力</span>
                        <span className="material-symbols-outlined item-arrow" style={{ color: '#D1D5DB' }}>chevron_right</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {displayedTasks.filter(t => t.status === 'report_pending' || t.status === 'disputed').length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', background: 'white', borderRadius: '12px', color: 'var(--text-sub)', fontSize: '13px' }}>
                現在、完了報告・評価待ちのタスクはありません。
              </div>
            )}
          </div>

          {/* 2-2. 完了済みのタスク（ブラインド相互評価） */}
          <h3 className="section-title">完了済みのタスク（相互評価結果）</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {displayedTasks.filter(t => t.status === 'completed').map(task => {
              const evalClient = task.evaluations?.byClient;
              const evalWorker = task.evaluations?.byWorker || task.evaluations?.byStaffToField;
              const bothEvaluated = !!evalClient && !!evalWorker;

              return (
                <div key={task.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className="status-badge badge-contracted" style={{ margin: 0, fontSize: '11px', background: '#D1FAE5', color: '#065F46' }}>
                      完了
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>稼働日: {task.date}</span>
                  </div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{task.jobTitle}</h4>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-sub)' }}>
                    稼働スタッフ: {task.workerName} （{task.companyName}）
                  </p>

                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}>
                    {bothEvaluated ? (
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#10B981' }}>check_circle</span>
                          相互評価が開示されました（公開中）
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                          <strong style={{ color: 'var(--primary)' }}>発注者からの評価:</strong>{' '}
                          <span style={{ color: '#F59E0B' }}>{'★'.repeat(evalClient.rating)}{'☆'.repeat(5 - evalClient.rating)}</span>{' '}
                          {evalClient.comment && <span style={{ color: 'var(--text-sub)', fontSize: '12px' }}> - {evalClient.comment}</span>}
                        </div>
                        <div>
                          <strong style={{ color: '#10B981' }}>スタッフからの評価:</strong>{' '}
                          <span style={{ color: '#F59E0B' }}>{'★'.repeat(evalWorker.rating)}{'☆'.repeat(5 - evalWorker.rating)}</span>{' '}
                          {evalWorker.comment && <span style={{ color: 'var(--text-sub)', fontSize: '12px' }}> - {evalWorker.comment}</span>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#EF4444' }}>hourglass_empty</span>
                        <span>ブラインド評価中: 双方が評価を入力するまで非公開です。</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {displayedTasks.filter(t => t.status === 'completed').length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', color: 'var(--text-sub)', fontSize: '13px' }}>
                完了済みのタスクはありません。
              </div>
            )}
          </div>

        </main>
      </div>

      {/* スタッフ出勤状況モニター Overlay */}
      <div className={`overlay-view ${showStaffMonitorOverlay ? 'show' : ''}`} style={{ display: showStaffMonitorOverlay ? 'flex' : 'none', transform: showStaffMonitorOverlay ? 'translateX(0)' : 'translateX(100%)', zIndex: 3000 }}>
        <header className="solid-header overlay-header">
          <button type="button" className="icon-btn-dark" onClick={() => setShowStaffMonitorOverlay(false)}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1>スタッフの出勤状況</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
          
          {/* 出勤履歴への動線 */}
          <div className="settings-list" style={{ marginBottom: '16px' }}>
            <div className="settings-group" style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div className="settings-item" onClick={() => {
                if (companyStaffs.length > 0) {
                  setSelectedHistoryStaffId(companyStaffs[0].id);
                }
                setShowHistoryOverlay(true);
              }} style={{ padding: '12px 16px' }}>
                <span className="material-symbols-outlined item-icon" style={{ color: '#D97706', marginRight: '12px' }}>history</span>
                <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>出勤履歴を確認する</span>
                <span className="material-symbols-outlined item-arrow" style={{ color: '#D1D5DB' }}>chevron_right</span>
              </div>
            </div>
          </div>

          <h3 className="section-title" style={{ marginTop: 0 }}>スタッフの出勤状況</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {companyStaffs.map(s => {
              const checkinTag = (s.completedTrainings || []).find(tid => tid.startsWith('CHECKIN_STATUS_TRUE_'));
              const isStaffCheckedIn = !!checkinTag;
              const staffCheckinTime = checkinTag ? checkinTag.replace('CHECKIN_STATUS_TRUE_', '') : null;

              return (
                <div 
                  key={s.id} 
                  onClick={() => {
                    setSelectedHistoryStaffId(s.id);
                    setShowHistoryOverlay(true);
                  }}
                  style={{ background: 'white', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background-color 0.2s' }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>
                      拠点: {s.baseLocation} / 性別: {getStaffGender(s.name)} <span style={{ fontSize: '10px', color: '#94A3B8', marginLeft: '6px' }}>(デバッグ用ID: {s.id})</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {isStaffCheckedIn ? (
                      <div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#D1FAE5', color: '#065F46', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                          出勤済み
                        </span>
                        <div style={{ fontSize: '10px', color: 'var(--text-sub)', marginTop: '4px' }}>打刻時間: {staffCheckinTime}</div>
                      </div>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F3F4F6', color: '#6B7280', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                        未出勤
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {companyStaffs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', color: 'var(--text-sub)', fontSize: '13px' }}>
                登録されているスタッフはいません。
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 出勤履歴 Overlay */}
      <div className={`overlay-view ${showHistoryOverlay ? 'show' : ''}`} style={{ display: showHistoryOverlay ? 'flex' : 'none', transform: showHistoryOverlay ? 'translateX(0)' : 'translateX(100%)', zIndex: 3000 }}>
        <header className="solid-header overlay-header">
          <button type="button" className="icon-btn-dark" onClick={() => setShowHistoryOverlay(false)}>
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1>出勤履歴</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>対象スタッフと年月の指定</h3>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
            {/* スタッフ選択 (管理者の場合のみ) */}
            {isUserAdmin && companyStaffs.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-sub)', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>スタッフを選択</label>
                <select 
                  value={selectedHistoryStaffId || ''} 
                  onChange={e => setSelectedHistoryStaffId(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', fontSize: '14px' }}
                >
                  {companyStaffs.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role === 'admin' ? '管理者' : '一般'})</option>
                  ))}
                </select>
              </div>
            )}

            {!isUserAdmin && (
              <div style={{ marginBottom: '16px', background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-main)' }}>
                対象スタッフ: {myStaff?.name || currentUser?.name || '清水 真一'}
              </div>
            )}

            {/* 年月選択 */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: 'var(--text-sub)', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>年</label>
                <select 
                  value={selectedHistoryYear} 
                  onChange={e => setSelectedHistoryYear(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', fontSize: '14px' }}
                >
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 10 + i).map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: 'var(--text-sub)', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>月</label>
                <select 
                  value={selectedHistoryMonth} 
                  onChange={e => setSelectedHistoryMonth(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', fontSize: '14px' }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {(() => {
            const activeStaff = isUserAdmin 
              ? companyStaffs.find(s => s.id === selectedHistoryStaffId) 
              : myStaff;
            const allLogs = getAttendanceLogsForStaff(activeStaff || null);
            
            const filterPrefix = `${selectedHistoryYear}-${String(selectedHistoryMonth).padStart(2, '0')}`;
            const filteredLogs = allLogs.filter(log => log.date.startsWith(filterPrefix));

            // Calculate monthly stats
            const totalDays = filteredLogs.length;

            return (
              <>
                {/* Monthly stats card */}
                <div style={{ background: '#EEF2F6', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'center', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 'bold' }}>出勤日数</span>
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>{totalDays} 日</span>
                  </div>
                </div>

                {/* Day-by-day logs */}
                <h3 className="section-title">日次打刻履歴</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {filteredLogs.map((log, idx) => (
                    <div key={idx} style={{ background: 'white', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-main)' }}>
                          {log.date} ({new Date(log.date).toLocaleDateString('ja-JP', { weekday: 'short' })})
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '4px' }}>
                          出勤: <strong style={{ color: '#2563EB' }}>{log.checkin}</strong>
                        </div>
                      </div>
                      <div>
                        <span style={{ background: '#D1FAE5', color: '#065F46', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>
                          出勤完了
                        </span>
                      </div>
                    </div>
                  ))}

                  {filteredLogs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 16px', background: 'white', borderRadius: '12px', color: 'var(--text-sub)', fontSize: '13px', border: '1px dashed var(--border-color)' }}>
                      選択された年月の出勤履歴はありません。
                    </div>
                  )}
                </div>

                {/* CSV download button */}
                {filteredLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDownloadCSV(filteredLogs, activeStaff?.name || currentUser?.name || 'スタッフ')}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                    }}
                  >
                    <span className="material-symbols-outlined">download</span>
                    この月の履歴をCSVで出力する
                  </button>
                )}
              </>
            );
          })()}
        </main>
      </div>

      {/* 完了報告・評価モーダル */}
      {selectedTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <form onSubmit={handleReportSubmit} style={{ background: 'white', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>業務完了報告 & 相互評価</h3>
            
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>対象タスク</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{selectedTask.jobTitle}</div>
            </div>

            {/* デモ用視点切り替え */}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-sub)', display: 'block', marginBottom: '4px' }}>【デモ用】どの立場で評価を行いますか？</label>
              <select value={evalRole} onChange={e => setEvalRole(e.target.value as any)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', background: 'white' }}>
                <option value="client">A社責任者C ➔ B社責任者D への評価</option>
                <option value="worker">B社責任者D ➔ A社責任者C への評価</option>
                <option value="staffToField">E社スタッフE ➔ 現場 への評価</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold' }}>評価 *</label>
              <div style={{ display: 'flex', gap: '8px', fontSize: '28px', cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span 
                    key={star} 
                    onClick={() => setEvalRating(star)} 
                    style={{ color: star <= evalRating ? '#F59E0B' : '#E5E7EB', transition: 'color 0.2s' }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            {evalRole === 'client' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>遅刻・早退の有無 *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="hasLateness" 
                      checked={!evalHasLateness} 
                      onChange={() => setEvalHasLateness(false)} 
                      style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                    />
                    <span>なし（定時出勤・定時稼働）</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="hasLateness" 
                      checked={evalHasLateness} 
                      onChange={() => setEvalHasLateness(true)} 
                      style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                    />
                    <span style={{ color: '#EF4444', fontWeight: 'bold' }}>あり（遅刻・早退あり）</span>
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold' }}>
                コメント {evalRating <= 2 ? <span style={{ color: '#EF4444' }}>(★2以下は必須)</span> : <span style={{ color: 'var(--text-sub)' }}>(任意)</span>}
              </label>
              <textarea
                className="form-control"
                placeholder={evalRating <= 2 ? "★2以下の評価の場合は、具体的な理由を入力してください。" : "勤務態度や現場環境のフィードバックをご入力ください。"}
                value={evalComment}
                onChange={e => setEvalComment(e.target.value)}
                rows={3}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1, margin: 0 }} onClick={() => setSelectedTask(null)}>キャンセル</button>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ flex: 1, margin: 0 }}
                disabled={evalRating <= 2 && !evalComment.trim()}
              >
                報告を送信
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 研修Zoomモックオーバーレイ */}
      {activeTraining && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 5000, display: 'flex', flexDirection: 'column', color: 'white' }}>
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
            <span style={{ fontWeight: 'bold' }}>Zoom ミーティングルーム (シミュレーション)</span>
            <button style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setActiveTraining(null)}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '72px', color: '#3B82F6', marginBottom: '16px' }}>videocam</span>
            <h3>{activeTraining.title}</h3>
            <p style={{ color: '#9CA3AF', fontSize: '13px', maxWidth: '300px', margin: '8px 0 24px 0' }}>
              研修が行われています。受講が完了するまでこの画面を開いてください。(デモのため、2秒後に受講完了登録ボタンが活性化します。)
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn-primary" 
                disabled={!isTrainingCompleted[activeTraining.id]}
                style={{ backgroundColor: isTrainingCompleted[activeTraining.id] ? '#10B981' : '#4B5563', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: isTrainingCompleted[activeTraining.id] ? 'pointer' : 'not-allowed' }}
                onClick={() => handleRegisterTraining(activeTraining.id)}
              >
                受講完了して登録する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 研修理解度テスト（クイズ）モーダル */}
      {showQuizModal && quizTrainingId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <form onSubmit={handleQuizSubmit} style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>quiz</span>
                研修理解度テスト
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-sub)' }}>実績マークを有効にするために、以下のクイズに全問正解してください。</p>
            </div>

            {quizData[quizTrainingId]?.map((q, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', lineHeight: '1.4' }}>
                  問{idx + 1}. {q.question}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {q.options.map((opt, optIdx) => (
                    <label key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#F8FAFC', border: quizAnswers[idx] === optIdx ? '1px solid var(--primary)' : '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}>
                      <input 
                        type="radio" 
                        name={`quiz-q-${idx}`} 
                        checked={quizAnswers[idx] === optIdx} 
                        onChange={() => setQuizAnswers(prev => ({ ...prev, [idx]: optIdx }))} 
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span style={{ color: quizAnswers[idx] === optIdx ? 'var(--primary)' : 'var(--text-main)', fontWeight: quizAnswers[idx] === optIdx ? 'bold' : 'normal' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1, margin: 0, padding: '12px', border: '1px solid #CBD5E1', borderRadius: '8px', background: '#F1F5F9', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }} 
                onClick={() => { setShowQuizModal(false); setQuizTrainingId(null); setQuizAnswers({}); }}
              >
                キャンセル
              </button>
              <button 
                type="submit" 
                style={{ 
                  flex: 1, 
                  margin: 0, 
                  padding: '12px', 
                  backgroundColor: Object.keys(quizAnswers).length < (quizData[quizTrainingId]?.length || 0) ? '#E2E8F0' : 'var(--primary)', 
                  color: Object.keys(quizAnswers).length < (quizData[quizTrainingId]?.length || 0) ? '#94A3B8' : 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: 'bold', 
                  cursor: Object.keys(quizAnswers).length < (quizData[quizTrainingId]?.length || 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                disabled={Object.keys(quizAnswers).length < (quizData[quizTrainingId]?.length || 0)}
              >
                回答を送信する
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 自社の掲示状況 (案件・人材管理) Overlay */}
      {showMyPostsOverlay && (
        <div className={`overlay-view ${showMyPostsOverlay ? 'show' : ''}`} style={{ display: showMyPostsOverlay ? 'flex' : 'none', transform: showMyPostsOverlay ? 'translateX(0)' : 'translateX(100%)', zIndex: 3000 }}>
          <header className="solid-header overlay-header">
            <button className="icon-btn-dark" onClick={() => {
              setShowMyPostsOverlay(false);
              setExpandedJobId(null);
              setExpandedTalentId(null);
            }}>
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h1>自社の掲示状況</h1>
            <div style={{ width: '40px' }}></div>
          </header>

          <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px', textAlign: 'left' }}>
            {/* タブ切り替えカプセル */}
            <div style={{
              display: 'flex',
              background: '#F1F5F9',
              padding: '3px',
              borderRadius: '20px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
              marginBottom: '16px'
            }}>
              <button
                onClick={() => setMyPostsTab('jobs')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '8px',
                  borderRadius: '17px',
                  border: 'none',
                  background: myPostsTab === 'jobs' ? '#FFFFFF' : 'transparent',
                  color: myPostsTab === 'jobs' ? 'var(--primary)' : '#64748B',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  boxShadow: myPostsTab === 'jobs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>work</span>
                案件管理
              </button>
              <button
                onClick={() => setMyPostsTab('talents')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '8px',
                  borderRadius: '17px',
                  border: 'none',
                  background: myPostsTab === 'talents' ? '#FFFFFF' : 'transparent',
                  color: myPostsTab === 'talents' ? 'var(--primary)' : '#64748B',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  boxShadow: myPostsTab === 'talents' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group</span>
                人材管理
              </button>
            </div>

            {myPostsTab === 'jobs' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 並び替え・絞り込みコントローラー */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-sub)' }}>案件の並び替え:</span>
                    <select
                      value={myJobsSortType}
                      onChange={e => setMyJobsSortType(e.target.value as 'recent' | 'deadline' | 'price')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        background: 'white',
                        fontSize: '12px',
                        outline: 'none',
                        fontWeight: 'bold',
                        color: 'var(--text-main)',
                        width: '150px'
                      }}
                    >
                      <option value="recent">更新順 (新着順)</option>
                      <option value="deadline">締切が近い順</option>
                      <option value="price">単価が高い順</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-sub)' }}>進行状況で絞り込み:</span>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as any)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        background: 'white',
                        fontSize: '12px',
                        outline: 'none',
                        fontWeight: 'bold',
                        color: 'var(--text-main)',
                        width: '150px'
                      }}
                    >
                      <option value="all">すべて</option>
                      <option value="recruiting">掲載中</option>
                      <option value="offered">内定通知済み</option>
                      <option value="contracted">確定</option>
                      <option value="cancelled">キャンセル済み</option>
                      <option value="past">過去の案件</option>
                    </select>
                  </div>
                </div>

                {/* 掲示案件リスト */}
                <div>
                  <h3 className="section-title" style={{ marginTop: '8px', marginBottom: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: '18px' }}>campaign</span>
                    自社の掲示状況 ({displayedMyJobs.length}件)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {displayedMyJobs.length > 0 ? (
                      displayedMyJobs.map(job => {
                        const isExpanded = expandedJobId === job.id;
                        return (
                          <div 
                            key={job.id} 
                            style={{ 
                              background: 'white', 
                              borderRadius: '12px', 
                              border: '1px solid var(--border-color)', 
                              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                              overflow: 'hidden',
                              opacity: job.status === 'cancelled' || isJobPast(job) ? 0.85 : 1
                            }}
                          >
                            <div 
                              onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                              style={{ padding: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                  {(() => {
                                    const isPast = isJobPast(job) || tasks.some(t => t.jobId === job.id && t.status === 'completed');
                                    const isCancelled = job.status === 'cancelled';
                                    const isContracted = tasks.some(t => t.jobId === job.id && ['working', 'report_pending', 'disputed'].includes(t.status));
                                    const isOffered = !isContracted && tasks.some(t => {
                                      const isRelated = t.id.startsWith('chat_') && !t.id.startsWith('chat_group_') && (t.evaluations as any)?.appliedJobIds?.includes(job.id);
                                      return isRelated && t.status === 'offered';
                                    });

                                    if (isCancelled) {
                                      return (
                                        <span style={{
                                          fontSize: '10px',
                                          fontWeight: 'bold',
                                          padding: '2px 8px',
                                          borderRadius: '10px',
                                          background: '#FEE2E2',
                                          color: '#991B1B'
                                        }}>キャンセル済み</span>
                                      );
                                    }
                                    if (isPast) {
                                      return (
                                        <span style={{
                                          fontSize: '10px',
                                          fontWeight: 'bold',
                                          padding: '2px 8px',
                                          borderRadius: '10px',
                                          background: '#E2E8F0',
                                          color: '#64748B'
                                        }}>過去の案件</span>
                                      );
                                    }
                                    if (isContracted) {
                                      return (
                                        <span style={{
                                          fontSize: '10px',
                                          fontWeight: 'bold',
                                          padding: '2px 8px',
                                          borderRadius: '10px',
                                          background: '#D1FAE5',
                                          color: '#065F46'
                                        }}>確定</span>
                                      );
                                    }
                                    if (isOffered) {
                                      return (
                                        <span style={{
                                          fontSize: '10px',
                                          fontWeight: 'bold',
                                          padding: '2px 8px',
                                          borderRadius: '10px',
                                          background: '#FEF3C7',
                                          color: '#D97706'
                                        }}>内定通知済み</span>
                                      );
                                    }
                                    return (
                                      <span style={{
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        background: '#EFF6FF',
                                        color: '#1D4ED8'
                                      }}>掲載中</span>
                                    );
                                  })()}
                                  {job.allowedCompanyIds && (
                                    <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px', background: '#FEF3C7', color: '#D97706' }}>限定公開</span>
                                  )}
                                </div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: job.status === 'cancelled' || isJobPast(job) ? '#64748B' : 'var(--text-main)' }}>{job.title}</h4>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-sub)', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span>単価: ¥{job.price.toLocaleString()} / 日</span>
                                  <span>•</span>
                                  <span>締切: {job.applicationDeadline}</span>
                                  {job.status !== 'cancelled' && !isJobPast(job) && (
                                    <>
                                      <span>•</span>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await loadData();
                                          setScreeningJobId(job.id);
                                        }}
                                        style={{
                                          background: 'var(--primary)',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          padding: '2px 8px',
                                          fontSize: '10px',
                                          fontWeight: 'bold',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px'
                                        }}
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>rule</span>
                                        選考・マッチング ({(() => {
                                          const realCount = tasks.filter(t => 
                                            t.jobId === 'chat' && 
                                            (t.evaluations as any)?.appliedJobIds?.includes(job.id)
                                          ).length;
                                          return realCount > 0 ? realCount : 5;
                                        })()}社)
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <span className="material-symbols-outlined" style={{ color: 'var(--text-sub)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginTop: '4px' }}>
                                expand_more
                              </span>
                            </div>

                            {isExpanded && (
                              <div style={{ padding: '14px', borderTop: '1px solid #F3F4F6', background: '#F8FAFC', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div>
                                  <strong style={{ color: 'var(--text-sub)' }}>📍 勤務エリア:</strong>
                                  <div style={{ marginTop: '2px', fontWeight: 'bold' }}>{job.locationName || '未指定'} ({job.exactLocation || '詳細住所なし'})</div>
                                </div>
                                <div>
                                  <strong style={{ color: 'var(--text-sub)' }}>📅 開催日日程:</strong>
                                  <div style={{ marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {(job.eventDate ? job.eventDate.split(', ') : []).map((d: string) => (
                                      <span key={d} style={{ background: '#E2E8F0', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>{d}</span>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <strong style={{ color: 'var(--text-sub)' }}>💼 スキル / キャリア / 販路:</strong>
                                  <div style={{ marginTop: '2px', fontWeight: 'bold' }}>
                                    {job.roleType} / {job.carrier} / {job.salesChannel} ({job.workLocation})
                                  </div>
                                </div>
                                <div>
                                  <strong style={{ color: 'var(--text-sub)' }}>🚗 交通費・宿泊費設定:</strong>
                                  <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div>
                                      ・交通費：
                                      {(() => {
                                        const t = job.expenses?.transportType;
                                        const val = job.expenses?.transportValue;
                                        if (t === 'pay_separate') return val && val > 0 ? `別途支給（上限 ${val.toLocaleString()}円 / 日）` : '別途支給（上限なし）';
                                        if (t === 'arranged') return 'こちらで手配';
                                        if (t === 'flat') return `一律 ${val?.toLocaleString()}円 / 日`;
                                        return 'なし（単価に含む）';
                                      })()}
                                    </div>
                                    <div>
                                      ・宿泊費：
                                      {(() => {
                                        const t = job.expenses?.accommodationType;
                                        const val = job.expenses?.accommodationValue;
                                        if (t === 'pay_separate') return val && val > 0 ? `別途支給（上限 ${val.toLocaleString()}円 / 泊）` : '別途支給（上限なし）';
                                        if (t === 'arranged') return 'こちらで手配';
                                        if (t === 'flat') return `一律 ${val?.toLocaleString()}円 / 泊`;
                                        return 'なし（単価に含む）';
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                {job.detailedDescription && (
                                  <div>
                                    <strong style={{ color: 'var(--text-sub)' }}>📝 詳細内容:</strong>
                                    <div style={{ marginTop: '4px', background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                                      {job.detailedDescription}
                                    </div>
                                  </div>
                                )}
                                {job.status !== 'cancelled' && !isJobPast(job) && !tasks.some(t => t.jobId === job.id && ['working', 'report_pending', 'completed', 'disputed'].includes(t.status)) && (
                                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelJob(job.id);
                                      }}
                                      style={{
                                        padding: '6px 12px',
                                        background: '#FEF2F2',
                                        border: '1px solid #FCA5A5',
                                        borderRadius: '6px',
                                        color: '#DC2626',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>cancel</span>
                                      この募集をキャンセルする
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px dashed #ccc', textAlign: 'center', fontSize: '12px', color: 'var(--text-sub)' }}>
                        該当する案件はありません。
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* 人材管理タブ */
              <div>
                <h3 className="section-title" style={{ marginTop: '8px', marginBottom: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: '18px' }}>group</span>
                  掲載中の人材 ({myTalents.length}件)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {myTalents.length > 0 ? (
                    myTalents.map(talent => {
                      const isExpanded = expandedTalentId === talent.id;
                      return (
                        <div 
                          key={talent.id} 
                          style={{ 
                            background: 'white', 
                            borderRadius: '12px', 
                            border: '1px solid var(--border-color)', 
                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                            overflow: 'hidden' 
                          }}
                        >
                          <div 
                            onClick={() => setExpandedTalentId(isExpanded ? null : talent.id)}
                            style={{ padding: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}
                          >
                            <div>
                              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{talent.name} ({talent.maskedName})</h4>
                              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-sub)', marginTop: '4px' }}>
                                <span>単価: ¥{talent.price.toLocaleString()}〜</span>
                                <span>•</span>
                                <span>エリア: {talent.locationName}</span>
                              </div>
                            </div>
                            <span className="material-symbols-outlined" style={{ color: 'var(--text-sub)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                              expand_more
                            </span>
                          </div>

                          {isExpanded && (
                            <div style={{ padding: '14px', borderTop: '1px solid #F3F4F6', background: '#F8FAFC', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div>
                                <strong style={{ color: 'var(--text-sub)' }}>📅 稼働可能日程:</strong>
                                <div style={{ marginTop: '2px', fontWeight: 'bold' }}>{talent.availableDates || '未定'}</div>
                              </div>
                              {talent.description && (
                                <div>
                                  <strong style={{ color: 'var(--text-sub)' }}>📝 自己紹介・アピール:</strong>
                                  <div style={{ marginTop: '4px', background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                                    {talent.description}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px dashed #ccc', textAlign: 'center', fontSize: '12px', color: 'var(--text-sub)' }}>
                      現在掲載中の人材はありません。
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* 応募者選考・マッチング Overlay */}
      {(() => {
        if (!screeningJobId) return null;
        const activeScreeningJob = myJobs.find(j => j.id === screeningJobId);
        if (!activeScreeningJob) return null;

        // Define candidate profiles (excluding current user)
        const baseProfiles = [
          { id: 'alpha', name: '株式会社アルファ', rep: 'アルファ 健', prText: '光回線・モバイル獲得に特化した営業支援代理店。', avgRating: 4.8, reviewCount: 24, regMonths: 12, attendanceRate: 99.2 },
          { id: 'beta', name: 'ベータ株式会社', rep: 'ベータ 拓也', prText: 'イベントクルー手配から運営までワンストップで受託。', avgRating: 4.6, reviewCount: 18, regMonths: 6, attendanceRate: 98.5 },
          { id: 'gamma', name: '合同会社ガンマ', rep: 'ガンマ 翔', prText: '地域密着型ブース販売。登録1.5ヶ月の新規代理店！', avgRating: 4.1, reviewCount: 3, regMonths: 1.5, attendanceRate: 92.1 },
          { id: 'delta', name: 'デルタ合同会社', rep: 'デルタ 大介', prText: '緊急アサイン対応力に強み。週末ショップ応援多数。', avgRating: 4.4, reviewCount: 15, regMonths: 14, attendanceRate: 96.0 },
          { id: 'omega', name: 'オメガプロモーション', rep: 'オメガ 玲奈', prText: '通信販売特化型エージェンシー。新規参入2ヶ月目！', avgRating: 4.5, reviewCount: 9, regMonths: 2.0, attendanceRate: 95.0 }
        ].filter(p => p.id !== currentUser?.id);

        const screeningCandidates = baseProfiles.map(p => {
          // Find chat room for this candidate
          const taskKey = [currentUser?.id || '', p.id].sort().join('_');
          const chatTask = tasks.find(t => t.id === 'chat_' + taskKey);

          // Resolve proposed staff ID
          let staffId = (chatTask?.evaluations as any)?.appliedJobStaffIds?.[activeScreeningJob.id];
          let proposedStaff = allStaffs.find(s => s.id === staffId);

          // If not specified, default to first staff of this company or build mock
          if (!proposedStaff) {
            const companyStaffsInDb = allStaffs.filter(s => s.userId === p.id);
            if (companyStaffsInDb.length > 0) {
              proposedStaff = companyStaffsInDb[0];
            } else {
              // Mock staff
              proposedStaff = {
                id: `mock_s_${p.id}`,
                userId: p.id,
                name: `${p.rep.split(' ')[0]} メンバー`,
                maskedName: `${p.rep.split(' ')[0]}*`,
                baseLocation: p.id === 'alpha' ? '東京都新宿区' : p.id === 'beta' ? '東京都渋谷区' : p.id === 'gamma' ? '神奈川県横浜市' : '東京都豊島区',
                nearestStation: p.id === 'alpha' ? '新宿駅' : p.id === 'beta' ? '渋谷駅' : p.id === 'gamma' ? '横浜駅' : '池袋駅',
                price: 15000,
                skills: p.id === 'alpha' ? ['クローザー'] : ['キャンペーンクルー'],
                carriers: p.id === 'alpha' ? ['au/UQmobile'] : ['docomo'],
                completedTrainings: p.id === 'alpha' ? ['tr1', 'tr2'] : ['tr1']
              };
            }
          }

          // Calculate attendance logs count
          // Calculate attendance logs count and attendance rate from proposedStaff logs
          const staffLogs = (proposedStaff.completedTrainings || []).filter((t: string) => t.startsWith('ATTENDANCE_LOG_'));
          const checkinCount = staffLogs.length;

          // Calculate staff attendance rate. Count occurrences where there was NO lateness/early departure.
          let staffAttendanceRate = p.attendanceRate; // fallback to company rate
          if (staffLogs.length > 0) {
            const lateLogsCount = staffLogs.filter((t: string) => t.endsWith('_LATE') || t.includes('_LATE')).length;
            staffAttendanceRate = ((staffLogs.length - lateLogsCount) / staffLogs.length) * 100;
          }

          // 1. Reliability Score (staff attendance rate & company avg rating)
          const reliabilityScore = (staffAttendanceRate * 0.6) + ((p.avgRating / 5) * 40 * 10); // Scale to 100

          // 2. Track Record Match (carrier & skill)
          let matchScore = 20;
          if (activeScreeningJob.carrier && proposedStaff.carriers.includes(activeScreeningJob.carrier)) {
            matchScore += 40;
          }
          if (activeScreeningJob.roleType && proposedStaff.skills.includes(activeScreeningJob.roleType)) {
            matchScore += 40;
          }

          // 3. Schedule Cover Rate (dependent on selected staff ID)
          const staffNum = parseInt(proposedStaff.id.replace(/\D/g, '') || '0') || 1;
          let scheduleScore = 60 + (staffNum % 5) * 10;
          if (scheduleScore > 100) scheduleScore = 100;

          // 4. Proximity Score (distance)
          let distanceKm = 8.5;
          const staffLoc = (proposedStaff.baseLocation || proposedStaff.nearestStation || '').toLowerCase();
          const jobLoc = (activeScreeningJob.locationName || '').toLowerCase();
          
          if (staffLoc && jobLoc) {
            if (staffLoc.includes('新宿') && jobLoc.includes('新宿')) distanceKm = 1.2;
            else if (staffLoc.includes('渋谷') && jobLoc.includes('渋谷')) distanceKm = 0.8;
            else if (staffLoc.includes('横浜') && jobLoc.includes('横浜')) distanceKm = 1.5;
            else if (staffLoc.includes('新宿') && jobLoc.includes('渋谷')) distanceKm = 4.6;
            else if (staffLoc.includes('渋谷') && jobLoc.includes('新宿')) distanceKm = 4.8;
            else if (staffLoc.includes('品川') && jobLoc.includes('品川')) distanceKm = 1.0;
            else if (staffLoc.includes('池袋') && jobLoc.includes('池袋')) distanceKm = 1.3;
            else if (staffLoc.includes('さいたま') && jobLoc.includes('大宮')) distanceKm = 2.1;
            else if (staffLoc.includes('横浜') || staffLoc.includes('川崎')) {
              distanceKm = jobLoc.includes('横浜') || jobLoc.includes('川崎') ? 2.5 : 25.0;
            } else {
              // Deterministic random distance for consistency based on staff ID and job ID
              const idSum = staffNum + parseInt(activeScreeningJob.id.replace(/\D/g, '') || '0');
              distanceKm = 3.0 + (idSum % 15);
            }
          }
          let proximityScore = 40;
          if (distanceKm < 2) proximityScore = 100;
          else if (distanceKm < 5) proximityScore = 90;
          else if (distanceKm < 10) proximityScore = 80;
          else if (distanceKm < 20) proximityScore = 60;

          // Newcomer bonus
          const isNewcomer = p.regMonths < 3;

          // Weighted score calculation
          let reliabilityWeight = 0.30;
          let matchWeight = 0.15;
          let scheduleWeight = 0.20;
          let proximityWeight = 0.25;
          let newcomerBonus = 0;

          if (screeningMode === 'default') {
            reliabilityWeight = 0.30; matchWeight = 0.15; scheduleWeight = 0.20; proximityWeight = 0.25;
            newcomerBonus = isNewcomer ? 10 : 0;
          } else if (screeningMode === 'quality') {
            reliabilityWeight = 0.25; matchWeight = 0.45; scheduleWeight = 0.15; proximityWeight = 0.15;
            newcomerBonus = 0;
          } else if (screeningMode === 'cost_performance') {
            reliabilityWeight = 0.15; matchWeight = 0.10; scheduleWeight = 0.15; proximityWeight = 0.20;
            newcomerBonus = isNewcomer ? 40 : 0;
          } else if (screeningMode === 'reliability') {
            reliabilityWeight = 0.50; matchWeight = 0.10; scheduleWeight = 0.20; proximityWeight = 0.20;
            newcomerBonus = 0;
          }

          const finalScore = (reliabilityScore * reliabilityWeight) +
                             (matchScore * matchWeight) +
                             (scheduleScore * scheduleWeight) +
                             (proximityScore * proximityWeight) +
                             newcomerBonus;

          // Check if candidate is contracted for this specific job
          const isCandidateContractedForThisJob = tasks.some(t => 
            t.jobId === activeScreeningJob.id && 
            (t.companyName === p.name || t.workerName === p.name || (t.id.includes(p.id) && t.id.includes(currentUser?.id || ''))) &&
            ['working', 'report_pending', 'completed', 'disputed'].includes(t.status)
          );

          // Check if candidate is offered for this specific job
          const isCandidateOfferedForThisJob = chatTask?.status === 'offered' && 
            (chatTask?.evaluations as any)?.offeredJobId === activeScreeningJob.id;

          return {
            company: p,
            staff: proposedStaff,
            checkinCount,
            distance: distanceKm,
            score: finalScore,
            isNewcomer,
            reliabilityScore,
            matchScore,
            scheduleScore,
            proximityScore,
            chatTask,
            isCandidateContractedForThisJob,
            isCandidateOfferedForThisJob
          };
        }).sort((a, b) => b.score - a.score);

        const recommendedCandidates = screeningCandidates.slice(0, 3);
        const otherCandidates = screeningCandidates.slice(3);

        const isJobContracted = tasks.some(t => t.jobId === activeScreeningJob.id && ['working', 'report_pending', 'completed', 'disputed'].includes(t.status));

        return (
          <div 
            className="overlay-view show" 
            style={{ 
              display: 'flex', 
              transform: 'translateX(0)', 
              zIndex: 3100,
              background: '#F8FAFC'
            }}
          >
            <header className="solid-header overlay-header" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', color: 'white' }}>
              <button type="button" className="icon-btn-dark" onClick={() => setScreeningJobId(null)} style={{ color: 'white' }}>
                <span className="material-symbols-outlined">arrow_back_ios_new</span>
              </button>
              <h1>応募者の選考</h1>
              <div style={{ width: '40px' }}></div>
            </header>

            <main className="list-area bg-gray" style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px', textAlign: 'left' }}>
              
              {/* 案件概要 */}
              <div style={{ background: 'white', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', background: '#EFF6FF', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px' }}>選考対象案件</span>
                <h3 style={{ margin: '6px 0 4px 0', fontSize: '15px', fontWeight: 'bold' }}>{activeScreeningJob.title}</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-sub)', display: 'flex', gap: '8px' }}>
                  <span>単価: ¥{activeScreeningJob.price.toLocaleString()} / 日</span>
                  <span>•</span>
                  <span>勤務地: {activeScreeningJob.locationName}</span>
                </div>
              </div>

              {/* モードセレクター */}
              <div style={{ background: 'white', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-sub)', marginBottom: '8px' }}>
                  🎯 選定ポリシーモードを選択（重み付けが自動で変化します）:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'default', label: '完全お任せ', desc: 'バランス重視', icon: 'shuffle' },
                    { id: 'quality', label: 'クオリティ', desc: '即戦力・実績重視', icon: 'workspace_premium' },
                    { id: 'cost_performance', label: 'コスパ', desc: '新規参入優遇', icon: 'volunteer_activism' },
                    { id: 'reliability', label: '信頼性', desc: '欠勤リスク最小化', icon: 'verified_user' }
                  ].map(modeOpt => {
                    const isSel = screeningMode === modeOpt.id;
                    return (
                      <button
                        key={modeOpt.id}
                        type="button"
                        onClick={() => setScreeningMode(modeOpt.id as any)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '8px',
                          border: isSel ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                          background: isSel ? '#EFF6FF' : '#F8FAFC',
                          color: isSel ? 'var(--primary)' : 'var(--text-main)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s',
                          textAlign: 'left'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: isSel ? 'var(--primary)' : '#64748B' }}>{modeOpt.icon}</span>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{modeOpt.label}</div>
                          <div style={{ fontSize: '9px', opacity: 0.8 }}>{modeOpt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* おすすめ候補者（上位3社） */}
              <div style={{ marginBottom: '20px' }}>
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#B45309' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>stars</span>
                  おすすめ候補者（上位3社）
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recommendedCandidates.map((c: any) => (
                    <div 
                      key={c.company.id} 
                      style={{ 
                        background: 'white', 
                        borderRadius: '16px', 
                        border: '2px solid #F59E0B', 
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)', 
                        overflow: 'hidden' 
                      }}
                    >
                      {/* カードヘッダー */}
                      <div style={{ padding: '12px 14px', background: '#FFFBEB', borderBottom: '1px solid #FEF3C7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#B45309', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>hotel_class</span>
                          おすすめ候補
                        </span>
                        {c.isNewcomer && (
                          <span style={{ fontSize: '9px', fontWeight: 'bold', background: '#D1FAE5', color: '#065F46', padding: '2px 6px', borderRadius: '4px' }}>
                            新規パートナー
                          </span>
                        )}
                      </div>
                      
                      {/* カードボディ */}
                      <div style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                            {c.company.name.substring(0, 1)}
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{c.company.name}</h4>
                            <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>代表: {c.company.rep}</span>
                          </div>
                        </div>
                        
                        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#475569', lineHeight: '1.4', background: '#F8FAFC', padding: '8px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                          {c.company.prText}
                        </p>

                        {/* 提案人材の詳細 */}
                        <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
                            <span>提案人材: {c.staff.name}</span>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                            <div style={{ background: '#F1F5F9', padding: '6px 8px', borderRadius: '6px' }}>
                              <span style={{ color: 'var(--text-sub)', display: 'block', transform: 'scale(0.9)', transformOrigin: 'left' }}>現場との距離</span>
                              <strong style={{ color: 'var(--text-main)' }}>{c.distance.toFixed(1)} km</strong> ({c.staff.nearestStation || '未指定'})
                            </div>
                            <div style={{ background: '#F1F5F9', padding: '6px 8px', borderRadius: '6px' }}>
                              <span style={{ color: 'var(--text-sub)', display: 'block', transform: 'scale(0.9)', transformOrigin: 'left' }}>実績マッチ</span>
                              <strong style={{ color: 'var(--text-main)' }}>{c.staff.skills.join(', ') || '一般'}</strong> ({c.staff.carriers.join(', ') || 'キャリア未指定'})
                            </div>
                            <div style={{ background: '#F1F5F9', padding: '6px 8px', borderRadius: '6px' }}>
                              <span style={{ color: 'var(--text-sub)', display: 'block', transform: 'scale(0.9)', transformOrigin: 'left' }}>信頼性</span>
                              <strong style={{ color: '#F59E0B' }}>★{c.company.avgRating}</strong> ({c.company.attendanceRate}% / 履歴{c.checkinCount}回)
                            </div>
                            <div style={{ background: '#F1F5F9', padding: '6px 8px', borderRadius: '6px' }}>
                              <span style={{ color: 'var(--text-sub)', display: 'block', transform: 'scale(0.9)', transformOrigin: 'left' }}>日程カバー率</span>
                              <strong style={{ color: 'var(--text-main)' }}>{c.scheduleScore}%</strong>
                            </div>
                          </div>
                        </div>

                        {/* アクションボタン */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                          <button 
                            type="button"
                            onClick={() => handleStartScreeningChat(c.chatTask, c.company.id)}
                            style={{ 
                              flex: 1, 
                              padding: '8px', 
                              borderRadius: '8px', 
                              border: '1px solid #CBD5E1', 
                              background: 'white', 
                              color: '#475569', 
                              fontSize: '12px', 
                              fontWeight: 'bold', 
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat</span>
                            チャットで相談
                          </button>
                          {c.isCandidateContractedForThisJob ? (
                            <button 
                              type="button"
                              disabled
                              style={{ 
                                flex: 1, 
                                padding: '8px', 
                                borderRadius: '8px', 
                                border: 'none', 
                                background: '#D1FAE5', 
                                color: '#065F46', 
                                fontSize: '12px', 
                                fontWeight: 'bold', 
                                cursor: 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                              契約確定
                            </button>
                          ) : isJobContracted ? (
                            <button 
                              type="button"
                              disabled
                              style={{ 
                                flex: 1, 
                                padding: '8px', 
                                borderRadius: '8px', 
                                border: 'none', 
                                background: '#F1F5F9', 
                                color: '#94A3B8', 
                                fontSize: '12px', 
                                fontWeight: 'bold', 
                                cursor: 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock</span>
                              他社で契約確定
                            </button>
                          ) : c.isCandidateOfferedForThisJob ? (
                            <button 
                              type="button"
                              disabled
                              style={{ 
                                flex: 1, 
                                padding: '8px', 
                                borderRadius: '8px', 
                                border: 'none', 
                                background: '#FEF3C7', 
                                color: '#D97706', 
                                fontSize: '12px', 
                                fontWeight: 'bold', 
                                cursor: 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>pending</span>
                              内定通知済み
                            </button>
                          ) : c.chatTask?.status === 'rejected' && (c.chatTask?.evaluations as any)?.offeredJobId === activeScreeningJob.id ? (
                            <button 
                              type="button"
                              disabled
                              style={{ 
                                flex: 1, 
                                padding: '8px', 
                                borderRadius: '8px', 
                                border: 'none', 
                                background: '#FEE2E2', 
                                color: '#991B1B', 
                                fontSize: '12px', 
                                fontWeight: 'bold', 
                                cursor: 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                              辞退済み
                            </button>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => setConfirmingCandidate(c)}
                              style={{ 
                                flex: 1, 
                                padding: '8px', 
                                borderRadius: '8px', 
                                border: 'none', 
                                background: 'var(--primary)', 
                                color: 'white', 
                                fontSize: '12px', 
                                fontWeight: 'bold', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>handshake</span>
                              内定通知を送る
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* その他の応募者一覧 */}
              {otherCandidates.length > 0 && (
                <div>
                  <h3 className="section-title" style={{ fontSize: '13px' }}>その他の応募者一覧</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {otherCandidates.map((c: any) => (
                      <div 
                        key={c.company.id} 
                        style={{ 
                          background: 'white', 
                          borderRadius: '12px', 
                          border: '1px solid var(--border-color)', 
                          padding: '12px 14px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.01)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                              {c.company.name.substring(0, 1)}
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{c.company.name}</h4>
                              <div style={{ fontSize: '10px', color: 'var(--text-sub)', marginTop: '2px' }}>
                                現場まで {c.distance.toFixed(1)} km ({c.staff.nearestStation}) • 提案人材: {c.staff.name} ({getStaffGender(c.staff.name)})
                              </div>
                            </div>
                          </div>
                          {c.isNewcomer && (
                            <span style={{ fontSize: '8px', fontWeight: 'bold', background: '#D1FAE5', color: '#065F46', padding: '1px 4px', borderRadius: '3px' }}>新規</span>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '8px', marginTop: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            信頼性: <strong style={{ color: '#F59E0B' }}>★{c.company.avgRating}</strong> ({c.company.attendanceRate}%)
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                              type="button"
                              onClick={() => handleStartScreeningChat(c.chatTask, c.company.id)}
                              style={{ padding: '4px 8px', background: 'none', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}
                            >
                              チャット
                            </button>
                            {c.isCandidateContractedForThisJob ? (
                              <button 
                                type="button"
                                disabled
                                style={{ padding: '4px 8px', background: '#D1FAE5', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: '#065F46', cursor: 'not-allowed' }}
                              >
                                契約確定
                              </button>
                            ) : isJobContracted ? (
                              <button 
                                type="button"
                                disabled
                                style={{ padding: '4px 8px', background: '#F1F5F9', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: '#94A3B8', cursor: 'not-allowed' }}
                              >
                                他社で契約確定
                              </button>
                            ) : c.isCandidateOfferedForThisJob ? (
                              <button 
                                type="button"
                                disabled
                                style={{ padding: '4px 8px', background: '#FEF3C7', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: '#D97706', cursor: 'not-allowed' }}
                              >
                                内定通知済み
                              </button>
                            ) : c.chatTask?.status === 'rejected' && (c.chatTask?.evaluations as any)?.offeredJobId === activeScreeningJob.id ? (
                              <button 
                                type="button"
                                disabled
                                style={{ padding: '4px 8px', background: '#FEE2E2', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: '#991B1B', cursor: 'not-allowed' }}
                              >
                                辞退済み
                              </button>
                            ) : (
                              <button 
                                type="button"
                                onClick={() => setConfirmingCandidate(c)}
                                style={{ padding: '4px 8px', background: 'var(--primary)', border: 'none', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: 'white', cursor: 'pointer' }}
                              >
                                内定通知
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </main>
          </div>
        );
      })()}

      {/* 発注確認モーダル */}
      {confirmingCandidate && screeningJobId && (() => {
        const activeScreeningJob = myJobs.find(j => j.id === screeningJobId);
        if (!activeScreeningJob) return null;
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: 0, fontSize: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                🤝 内定通知（オファー）の送信
              </h3>
              
              <div style={{ fontSize: '13px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-sub)', fontSize: '11px', display: 'block' }}>送付先企業</span>
                  <strong>{confirmingCandidate.company.name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-sub)', fontSize: '11px', display: 'block' }}>配置予定メンバー</span>
                  <strong>{confirmingCandidate.staff.name} ({getStaffGender(confirmingCandidate.staff.name)})</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-sub)', fontSize: '11px', display: 'block' }}>対象案件</span>
                  <strong>{activeScreeningJob.title}</strong>
                </div>
                <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-sub)', fontSize: '11px', display: 'block' }}>ご契約条件</span>
                  <strong>日当：¥{activeScreeningJob.price.toLocaleString()} 円</strong>
                  <div style={{ fontSize: '10px', color: 'var(--text-sub)', marginTop: '2px' }}>
                    ※送信後、相手企業のチャットルームへ内定通知が届き、相手方の承諾をもって契約成立となります。
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1, margin: 0, padding: '10px' }} 
                  onClick={() => setConfirmingCandidate(null)}
                >
                  キャンセル
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ flex: 1, margin: 0, padding: '10px', background: 'var(--primary)' }}
                  onClick={() => handleConfirmContract(confirmingCandidate)}
                >
                  内定通知を送信する
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

