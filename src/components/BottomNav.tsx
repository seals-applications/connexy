import { Link, useLocation } from 'react-router-dom';

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <div className="nav-icon-wrapper">
          <span className="material-symbols-outlined nav-icon">location_on</span>
        </div>
        <span className="nav-label">探す</span>
      </Link>
      <Link to="/field" className={`nav-item ${location.pathname === '/field' ? 'active' : ''}`}>
        <div className="nav-icon-wrapper">
          <span className="material-symbols-outlined nav-icon">camera_alt</span>
        </div>
        <span className="nav-label">現場</span>
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
