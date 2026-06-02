import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../data/mockDb';

export function BottomNav() {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkPendingReports = async () => {
      try {
        const tasks = await api.getContractTasks();
        const count = tasks.filter(t => t.status === 'report_pending').length;
        setPendingCount(count);
      } catch (e) {
        console.error(e);
      }
    };
    checkPendingReports();
    const interval = setInterval(checkPendingReports, 2000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <div className="nav-icon-wrapper">
          <span className="material-symbols-outlined nav-icon">location_on</span>
        </div>
        <span className="nav-label">探す</span>
      </Link>
      <Link to="/task" className={`nav-item ${location.pathname === '/task' ? 'active' : ''}`}>
        <div className="nav-icon-wrapper">
          <span className="material-symbols-outlined nav-icon">task_alt</span>
          {pendingCount > 0 && <span className="badge" style={{ backgroundColor: '#EF4444' }}>{pendingCount}</span>}
        </div>
        <span className="nav-label">タスク</span>
      </Link>
      <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
        <div className="nav-icon-wrapper">
          <span className="material-symbols-outlined nav-icon">bar_chart</span>
        </div>
        <span className="nav-label">ダッシュボード</span>
      </Link>
      <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}>
        <div className="nav-icon-wrapper">
          <span className="material-symbols-outlined nav-icon">settings</span>
        </div>
        <span className="nav-label">設定</span>
      </Link>
      <Link to="/message" className={`nav-item ${location.pathname === '/message' ? 'active' : ''}`}>
        <div className="nav-icon-wrapper">
          <span className="material-symbols-outlined nav-icon">chat</span>
          <span className="badge">2</span>
        </div>
        <span className="nav-label">メッセージ</span>
      </Link>
    </nav>
  );
}
