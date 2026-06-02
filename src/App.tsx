import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { SearchPage } from './pages/SearchPage';
import { MessagePage } from './pages/MessagePage';
import { TaskPage } from './pages/TaskPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <Router>
      <div id="app-container">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/message" element={<MessagePage />} />
          <Route path="/task" element={<TaskPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
