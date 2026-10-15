import { useState } from 'react';
import { PLEDGE_TITLE, PLEDGE_VERSION, buildPledgeText } from '../utils/subcontractAgreement';

interface Props {
  companyName: string;
  staffName: string;
  jobTitle?: string;
  onAccept: () => Promise<void>;
  /** 同意せずに閉じる(チャットから戻る) */
  onDecline: () => void;
}

/**
 * 従事者誓約書。担当として割り当てられた本人が同意するまで、現場グループチャットと詳細情報は開示されない。
 * 文面は暫定版(弁護士確認前)。
 */
export function StaffPledgeModal({ companyName, staffName, jobTitle, onAccept, onDecline }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const text = buildPledgeText({ companyName, staffName: staffName || '（氏名）', jobTitle });

  const handleAccept = async () => {
    if (!agreed || busy) return;
    setBusy(true);
    setError('');
    try {
      await onAccept();
    } catch (e) {
      console.error(e);
      setError('同意の記録中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
      <div style={{ background: 'var(--surface-color)', borderRadius: '16px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', background: '#FEF3C7', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: '#B45309' }}>draw</span>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#78350F' }}>{PLEDGE_TITLE}</h3>
        </div>
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
            この現場の担当者として、詳細情報とグループチャットを見るには、誓約書への同意が必要です。
          </div>
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', background: '#F8FAFC', padding: '10px 12px', fontSize: '12px', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: '38vh', overflowY: 'auto', color: '#1E293B' }}>
            {text}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>版: {PLEDGE_VERSION} ／ 署名者: {staffName || '（氏名）'}</div>
          <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: '#1E293B', lineHeight: 1.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: '3px' }} />
            上記の内容を理解し、誓約します。
          </label>
          {error && <div style={{ fontSize: '12px', color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '8px 10px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onDecline} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'var(--surface-color)', color: '#64748B', fontWeight: 'bold', cursor: 'pointer' }}>
              同意せず戻る
            </button>
            <button
              onClick={handleAccept}
              disabled={!agreed || busy}
              style={{ flex: 1, padding: '11px', borderRadius: '8px', border: 'none', background: agreed && !busy ? '#10B981' : '#CBD5E1', color: 'white', fontWeight: 'bold', cursor: agreed && !busy ? 'pointer' : 'not-allowed' }}
            >
              {busy ? '記録中...' : '誓約して開く'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
