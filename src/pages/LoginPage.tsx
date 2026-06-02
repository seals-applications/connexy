import { useState } from 'react';
import { api } from '../data/mockDb';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError('ログインIDとパスワードを入力してください。');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await api.login(loginId, password);
      if (user) {
        onLoginSuccess();
      } else {
        setError('ログインIDまたはパスワードが正しくありません。');
      }
    } catch (err) {
      setError('システムエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (id: string) => {
    setLoginId(id);
    setPassword('pass');
    setError('');
  };

  const quickAccounts = [
    { name: '株式会社シグマ通信', id: 'sigma' },
    { name: '株式会社アルファ', id: 'alpha' },
    { name: 'ベータ株式会社', id: 'beta' },
    { name: '合同会社ガンマ', id: 'gamma' },
    { name: 'デルタ合同会社', id: 'delta' }
  ];

  return (
    <div className="login-container" style={styles.container}>
      <div className="login-card" style={styles.card}>
        <div style={styles.logoSection}>
          <span className="material-symbols-outlined" style={styles.logoIcon}>hub</span>
          <h1 style={styles.title}>connexy</h1>
          <p style={styles.subtitle}>通信業界BtoBマッチングプラットフォーム</p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>ログインID</label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              disabled={loading}
              placeholder="ログインIDを入力"
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="パスワードを入力"
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>テストアカウントで簡単ログイン</span>
        </div>

        <div style={styles.quickLoginSection}>
          {quickAccounts.map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => handleQuickLogin(acc.id)}
              disabled={loading}
              style={styles.quickButton}
            >
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--primary)' }}>{acc.name}</div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>ID: {acc.id} / PW: pass</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
    padding: '20px',
    fontFamily: '"Outfit", "Inter", sans-serif',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '24px',
    padding: '40px 32px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    boxSizing: 'border-box' as const,
  },
  logoSection: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  logoIcon: {
    fontSize: '48px',
    color: '#2563EB',
    background: '#EFF6FF',
    padding: '12px',
    borderRadius: '16px',
    marginBottom: '12px',
    display: 'inline-block'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    color: '#0F172A',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748B',
    margin: 0,
  },
  errorBanner: {
    background: '#FEE2E2',
    border: '1px solid #FCA5A5',
    color: '#991B1B',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '13px',
    marginBottom: '24px',
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#334155',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s',
    background: '#F8FAFC',
    boxSizing: 'border-box' as const,
  },
  button: {
    padding: '14px',
    background: '#2563EB',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '8px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center' as const,
    margin: '24px 0',
  },
  dividerText: {
    fontSize: '11px',
    color: '#94A3B8',
    width: '100%',
    fontWeight: 'bold' as const,
    letterSpacing: '0.5px',
  },
  quickLoginSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto' as const,
    paddingRight: '4px'
  },
  quickButton: {
    background: '#F1F5F9',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.15s',
  }
};
