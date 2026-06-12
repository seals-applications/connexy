import { useState, useEffect } from 'react';
import { api } from '../data/mockDb';

export function DashboardPage() {
  const [showBalance, setShowBalance] = useState(false);
  const [hasPendingReports, setHasPendingReports] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const checkReports = async () => {
      try {
        const tasks = await api.getContractTasks();
        const pending = tasks.some(t => t.status === 'report_pending');
        setHasPendingReports(pending);
      } catch (e) {
        console.error(e);
      }
    };
    checkReports();
  }, []);

  // Calculate dynamic months based on current time
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // e.g. 6
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1; // e.g. 7

  const handleWithdraw = () => {
    if (hasPendingReports) {
      alert("【振込申請不可】\n完了報告が未完了のタスクが残っているため、振込申請を行えません。\n「タスク」タブから完了報告と評価をすべて完了させてください。");
    } else {
      alert("早期出金（即時振込）の申請を受付しました。(モック)\n登録口座へ24時間以内にお振込みいたします。");
    }
  };

  if (showDetails) {
    return (
      <div className="view active" style={{ animation: 'fadeIn 0.2s ease-out' }}>
        <header className="solid-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="icon-btn" 
            onClick={() => setShowDetails(false)}
            style={{ color: '#FFFFFF', padding: '0', display: 'flex', alignItems: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
          </button>
          <h1 style={{ margin: 0, fontSize: '18px' }}>入金予定明細</h1>
        </header>

        <main className="list-area p-16" style={{ background: '#F8FAFC' }}>
          {/* Detailed breakdown card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            border: '1px solid #E2E8F0',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 'bold', marginBottom: '6px' }}>
              {nextMonth}月入金予定総額（{currentMonth}月稼働分）
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', borderBottom: '2px dashed #E2E8F0', paddingBottom: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1E3A8A' }}>¥</span>
              <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#1E3A8A' }}>482,500</span>
              <span style={{ fontSize: '14px', color: '#64748B', marginLeft: 'auto', fontWeight: 'bold' }}>(総額 48.25万円)</span>
            </div>

            {/* Breakdown List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Company A */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', color: '#0F172A' }}>
                  <span>A社</span>
                  <span>33.0万円</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', paddingLeft: '12px', borderLeft: '2px solid #3B82F6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                    <span>【現場名C】</span>
                    <span>18.0万円</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                    <span>【現場名D】</span>
                    <span>15.0万円</span>
                  </div>
                </div>
              </div>

              {/* Company B */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', color: '#0F172A' }}>
                  <span>B社</span>
                  <span>19.0万円</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', paddingLeft: '12px', borderLeft: '2px solid #3B82F6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                    <span>【現場名E】</span>
                    <span>19.0万円</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: '#E2E8F0', margin: '4px 0' }}></div>

              {/* Early Withdrawal Fee */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#EF4444', fontWeight: '600' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>percent</span>
                  早期出金手数料 (7.5%)
                </span>
                <span>-3.75万円</span>
              </div>
            </div>
          </div>

          {/* Action button card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            border: '1px solid #E2E8F0',
            textAlign: 'center'
          }}>
            <button 
              className="btn-primary" 
              onClick={handleWithdraw}
              style={{
                background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '14px',
                borderRadius: '10px',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                ...(hasPendingReports ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#9CA3AF', backgroundImage: 'none' } : {})
              }}
            >
              <span className="material-symbols-outlined">speed</span>
              早期出金（即時振込）を申請する
            </button>
            <p className="wallet-note" style={{ color: '#64748B', marginTop: '10px', fontSize: '11px', lineHeight: '1.4' }}>
              ※早期出金を利用すると、通常支払日を待たずに最短当日に入金されます。<br />
              手数料として振込金額の7.5%が発生します。
            </p>
            {hasPendingReports && (
              <p className="wallet-note" style={{ color: '#EF4444', fontWeight: 'bold', marginTop: '8px' }}>
                ⚠️ 未完了の完了報告があるため現在引き出しは制限されています。
              </p>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="view active">
      <header className="solid-header">
        <h1>ダッシュボード</h1>
      </header>
      <main className="list-area p-16" style={{ background: '#F8FAFC' }}>
        <div 
          className="wallet-card" 
          onClick={() => setShowDetails(true)}
          style={{ 
            cursor: 'pointer', 
            position: 'relative', 
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
            backgroundImage: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
            boxShadow: '0 10px 25px rgba(30, 58, 138, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 30px rgba(30, 58, 138, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(30, 58, 138, 0.3)';
          }}
        >
          <div className="wallet-header">
            <span style={{ fontWeight: '600', letterSpacing: '0.05em' }}>
              {nextMonth}月入金予定額（{currentMonth}月稼働分）
            </span>
            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}>
              <span className="material-symbols-outlined">
                {showBalance ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          </div>
          <div className="wallet-balance" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span className="currency">¥</span>
              {showBalance ? (
                <span className="amount">482,500</span>
              ) : (
                <span className="amount hidden">***,***</span>
              )}
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', opacity: 0.9 }}>chevron_right</span>
          </div>

          <div style={{ 
            marginTop: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '6px', 
            fontSize: '11px', 
            background: 'rgba(255, 255, 255, 0.15)', 
            padding: '8px', 
            borderRadius: '8px', 
            border: '1px solid rgba(255, 255, 255, 0.2)',
            fontWeight: '500'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>info</span>
            <span>タップして入金予定の内訳・詳細を表示</span>
          </div>
        </div>

        {/* Info card regarding standard payment terms */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <span className="material-symbols-outlined" style={{ color: '#3B82F6', fontSize: '20px' }}>info</span>
          <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
            <strong style={{ color: '#0F172A' }}>入金スケジュールについて</strong><br />
            稼働月の翌月末払いです（月末締め・翌月末振込）。<br />
            例: 6月中に稼働した案件の報酬は、7月31日に振り込まれます。
          </div>
        </div>
      </main>
    </div>
  );
}
