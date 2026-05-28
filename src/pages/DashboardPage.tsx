import { useState } from 'react';

export function DashboardPage() {
  const [showBalance, setShowBalance] = useState(false);

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
          <button className="btn-primary mt-16">
            <span className="material-symbols-outlined">account_balance</span>
            銀行口座へ引き出し申請
          </button>
          <p className="wallet-note">※引き出しは週1回まで。手数料330円</p>
        </div>

        <h3 className="section-title">タスク概況</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-num text-orange">3</span>
            <span className="summary-label">商談中</span>
          </div>
          <div className="summary-card">
            <span className="summary-num text-blue">1</span>
            <span className="summary-label">契約待ち</span>
          </div>
          <div className="summary-card">
            <span className="summary-num text-green">2</span>
            <span className="summary-label">稼働中</span>
          </div>
        </div>
      </main>
    </div>
  );
}
