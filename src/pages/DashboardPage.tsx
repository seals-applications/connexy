import { useState, useEffect } from 'react';
import { api } from '../data/mockDb';

export function DashboardPage() {
  const [showBalance, setShowBalance] = useState(false);
  const [hasPendingReports, setHasPendingReports] = useState(false);

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

  const handleWithdraw = () => {
    if (hasPendingReports) {
      alert("【振込申請不可】\n完了報告が未完了のタスクが残っているため、銀行口座への引き出し申請を行えません。\n「タスク」タブから完了報告と評価をすべて完了させてください。");
    } else {
      alert("銀行口座への引き出し申請を受付しました。(モック)");
    }
  };

  return (
    <div className="view active">
      <header className="solid-header">
        <h1>ダッシュボード</h1>
      </header>
      <main className="list-area p-16">
        <div className="wallet-card">
          <div className="wallet-header">
            <span>現在の売上残高</span>
            <button className="icon-btn" onClick={() => setShowBalance(!showBalance)}>
              <span className="material-symbols-outlined">
                {showBalance ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          </div>
          <div className="wallet-balance">
            <span className="currency">¥</span>
            {showBalance ? (
              <span className="amount">482,500</span>
            ) : (
              <span className="amount hidden">***,***</span>
            )}
          </div>
          <button 
            className="btn-primary mt-16" 
            onClick={handleWithdraw}
            style={hasPendingReports ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#9CA3AF' } : {}}
          >
            <span className="material-symbols-outlined">account_balance</span>
            銀行口座へ引き出し申請
          </button>
          <p className="wallet-note">※引き出しは週1回まで。手数料330円</p>
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
