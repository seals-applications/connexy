import { useState, useEffect } from 'react';
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

export function TaskPage() {
  const [tasks, setTasks] = useState<ContractTask[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [myStaff, setMyStaff] = useState<Staff | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 出退勤State
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkinTime, setCheckinTime] = useState<string | null>(null);

  // GPS State
  const [isSimulatingGps, setIsSimulatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

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
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setGpsError(null);
          },
          (error) => {
            console.error("GPS Error:", error);
            setGpsError("位置情報が取得できません。デモ検証の際は「GPS位置をシミュレート」ボタンを使用してください。");
            setUserLocation(null);
          }
        );
      } else {
        setGpsError("ブラウザが位置情報をサポートしていません。");
        setUserLocation(null);
      }
    }
  }, [isSimulatingGps]);

  const distance = userLocation ? getDistanceInMeters(userLocation.lat, userLocation.lng, TARGET_LAT, TARGET_LNG) : null;
  const isInRange = distance !== null && distance <= 500;

  // 完了報告・評価モーダルState
  const [selectedTask, setSelectedTask] = useState<ContractTask | null>(null);
  const [evalRating, setEvalRating] = useState<number>(5); // 1 to 5 stars
  const [evalComment, setEvalComment] = useState('');
  
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

  // 自社募集案件・人材State
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myTalents, setMyTalents] = useState<Talent[]>([]);
  const [isMyJobsOpen, setIsMyJobsOpen] = useState(false);
  const [isMyTalentsOpen, setIsMyTalentsOpen] = useState(false);

  const loadData = async () => {
    try {
      const fetchedTasks = await api.getContractTasks();
      setTasks(fetchedTasks);
      
      const fetchedTrainings = await api.getTrainings();
      setTrainings(fetchedTrainings);

      const user = await api.getCurrentUser();
      setCurrentUser(user);
      if (!user) return;

      const checkedInStatus = localStorage.getItem('checkin_status_' + user.id) === 'true';
      setIsCheckedIn(checkedInStatus);
      setCheckinTime(localStorage.getItem('checkin_time_' + user.id));

      const fetchedStaffs = await api.getStaffsByUserId(user.id);
      if (fetchedStaffs.length > 0) {
        setMyStaff(fetchedStaffs[0]);
        setCompletedTrainingList(fetchedStaffs[0].completedTrainings || []);
      }

      // 自社掲示中の案件と人材をフェッチ
      const allJobs = await api.getJobs();
      const allTalents = await api.getTalents();
      setMyJobs(allJobs.filter(j => j.authorId === user.id));
      setMyTalents(allTalents.filter(t => t.userId === user.id));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckin = () => {
    if (!currentUser) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setIsCheckedIn(true);
    setCheckinTime(timeStr);
    localStorage.setItem('checkin_status_' + currentUser.id, 'true');
    localStorage.setItem('checkin_time_' + currentUser.id, timeStr);
    alert(`GPS出勤打刻を完了しました（打刻時間: ${timeStr}）`);
  };

  const handleCheckinReset = () => {
    if (!currentUser) return;
    setIsCheckedIn(false);
    setCheckinTime(null);
    localStorage.removeItem('checkin_status_' + currentUser.id);
    localStorage.removeItem('checkin_time_' + currentUser.id);
  };

  // 報告モーダル展開
  const handleOpenReport = (task: ContractTask) => {
    setSelectedTask(task);
    setEvalRating(5);
    setEvalComment('');
    setEvalRole('client');
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
        target
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
  const pendingReportCount = tasks.filter(t => t.status === 'report_pending').length;
  const workingCount = tasks.filter(t => t.status === 'working').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const disputedCount = tasks.filter(t => t.status === 'disputed').length;

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

        {/* 1. タスク概況セクション (ダッシュボードから移動) */}
        <h3 className="section-title" style={{ marginTop: 0 }}>タスク概況</h3>
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

        {/* 自社の掲示状況セクション */}
        <h3 className="section-title">自社の掲示状況</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {/* 掲示中の案件 */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <button 
              onClick={() => setIsMyJobsOpen(!isMyJobsOpen)}
              style={{
                width: '100%',
                padding: '16px',
                background: 'none',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>work</span>
                掲示中の案件 ({myJobs.length}件)
              </div>
              <span className="material-symbols-outlined" style={{ transform: isMyJobsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                expand_more
              </span>
            </button>
            
            {isMyJobsOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '12px' }}>
                {myJobs.length > 0 ? (
                  myJobs.map(job => (
                    <div key={job.id} style={{ padding: '10px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{job.title}</div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-sub)' }}>
                        <span>単価: ¥{job.price.toLocaleString()}</span>
                        <span>•</span>
                        <span>エリア: {job.locationName || '未指定'}</span>
                        {job.allowedCompanyIds && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#F59E0B', fontWeight: 'bold' }}>限定公開</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-sub)', textAlign: 'center', padding: '8px 0' }}>現在掲示中の案件はありません。</div>
                )}
              </div>
            )}
          </div>

          {/* 掲示中の人材 */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <button 
              onClick={() => setIsMyTalentsOpen(!isMyTalentsOpen)}
              style={{
                width: '100%',
                padding: '16px',
                background: 'none',
                border: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                <span className="material-symbols-outlined" style={{ color: '#10B981' }}>group</span>
                掲示中の人材 ({myTalents.length}件)
              </div>
              <span className="material-symbols-outlined" style={{ transform: isMyTalentsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                expand_more
              </span>
            </button>
            
            {isMyTalentsOpen && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '12px' }}>
                {myTalents.length > 0 ? (
                  myTalents.map(talent => (
                    <div key={talent.id} style={{ padding: '10px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{talent.name} ({talent.maskedName})</div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-sub)', flexWrap: 'wrap' }}>
                        <span>単価: ¥{talent.price.toLocaleString()}〜</span>
                        <span>•</span>
                        <span>エリア: {talent.locationName}</span>
                        <span>•</span>
                        <span>勤務日: {talent.availableDates || '未定'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-sub)', textAlign: 'center', padding: '8px 0' }}>現在掲示中の人材はありません。</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. 完了報告待ちリスト */}
        <h3 className="section-title">業務完了報告と相互評価</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {tasks.filter(t => t.status === 'report_pending' || t.status === 'disputed').map(task => (
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
                    <button className="btn-secondary btn-small" style={{ margin: 0, fontSize: '11px', flex: 1, borderColor: '#10B981', color: '#10B981' }} onClick={() => handleSimulateDispute(task.id, 'approve')}>
                      相手が「承認」する(デモ)
                    </button>
                    <button className="btn-secondary btn-small" style={{ margin: 0, fontSize: '11px', flex: 1, borderColor: '#EF4444', color: '#EF4444' }} onClick={() => handleSimulateDispute(task.id, 'reject')}>
                      相手が「拒否」する(デモ)
                    </button>
                  </div>
                </div>
              )}

              {task.status === 'report_pending' && (
                <button className="btn-primary w-full" style={{ margin: 0 }} onClick={() => handleOpenReport(task)}>
                  完了報告と評価の入力
                </button>
              )}
            </div>
          ))}
          {tasks.filter(t => t.status === 'report_pending' || t.status === 'disputed').length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', background: 'white', borderRadius: '12px', color: 'var(--text-sub)', fontSize: '13px' }}>
              現在、完了報告・評価待ちのタスクはありません。
            </div>
          )}
        </div>

        {/* 2-2. 完了済みのタスク（ブラインド相互評価） */}
        <h3 className="section-title">完了済みのタスク（相互評価結果）</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {tasks.filter(t => t.status === 'completed').map(task => {
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
          {tasks.filter(t => t.status === 'completed').length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', color: 'var(--text-sub)', fontSize: '13px' }}>
              完了済みのタスクはありません。
            </div>
          )}
        </div>

        {/* 3. 本日の現場セクション */}
        <h3 className="section-title">本日の現場</h3>
        <div className="task-card" style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
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
                  打刻日時: 当日 {checkinTime}
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
                    <span>位置情報を取得中...</span>
                  </p>
                ) : null}

                <button
                  className="btn-primary w-full"
                  disabled={!isInRange}
                  style={!isInRange ? { backgroundColor: '#E5E7EB', color: '#9CA3AF', cursor: 'not-allowed', border: 'none' } : {}}
                  onClick={handleCheckin}
                >
                  <span className="material-symbols-outlined" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                    login
                  </span>
                  出勤を打刻する
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4. 研修制度セクション */}
        <h3 className="section-title">研修制度と実績連携</h3>
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
              <div key={tr.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{tr.title}</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isCompleted ? (
                    <button className="btn-secondary w-full" disabled style={{ margin: 0, opacity: 0.6 }}>
                      受講完了済み
                    </button>
                  ) : (
                    <>
                      <button 
                        className="btn-primary" 
                        style={{ margin: 0, flex: 1, backgroundColor: '#3B82F6', color: 'white' }}
                        onClick={() => handleStartTraining(tr)}
                      >
                        受講を開始 (Zoom)
                      </button>
                      <button 
                        className="btn-primary" 
                        disabled={!isTrainingCompleted[tr.id]}
                        style={{ margin: 0, flex: 1, backgroundColor: isTrainingCompleted[tr.id] ? '#10B981' : '#E5E7EB', color: isTrainingCompleted[tr.id] ? 'white' : '#9CA3AF', cursor: isTrainingCompleted[tr.id] ? 'pointer' : 'not-allowed' }}
                        onClick={() => handleRegisterTraining(tr.id)}
                      >
                        受講完了を登録
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </main>

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

    </div>
  );
}
