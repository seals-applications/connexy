import { useState } from 'react';

export function FieldPage() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  return (
    <div className="view active">
      <header className="solid-header">
        <h1>本日の現場</h1>
      </header>
      <main className="list-area p-16">
        <div className="task-card">
          <div className="task-header">
            <span className="task-status active" style={{ color: isCheckedIn ? '#10B981' : 'var(--primary)' }}>
              {isCheckedIn ? '稼働中' : '稼働予定'}
            </span>
            <span className="task-time">10:00 - 19:00</span>
          </div>
          <h2 className="task-title">auショップ新宿西口店 イベント</h2>
          <p className="task-address">
            <span className="material-symbols-outlined icon-small">location_on</span>
            東京都新宿区西新宿1-1-1
          </p>
          <div className="checkin-container">
            <p className="radius-status success">
              <span className="material-symbols-outlined">my_location</span>
              エリア内にいます
            </p>
            <button
              className={`btn-checkin active`}
              style={isCheckedIn ? { backgroundColor: '#EF4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' } : {}}
              onClick={() => setIsCheckedIn(!isCheckedIn)}
            >
              {isCheckedIn ? (
                <>
                  <span className="material-symbols-outlined">logout</span>
                  退勤を打刻する
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">login</span>
                  出勤を打刻する
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
