import { useState } from 'react';
import {
  PERSONAL_DATA_CONSENT_TEXT,
  PERSONAL_DATA_CONSENT_TITLE,
  PERSONAL_DATA_CONSENT_VERSION,
  type PersonalDataConsent,
} from '../utils/personalData';

interface Props {
  /** すでに記録されている同意(あれば) */
  existing?: PersonalDataConsent;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 新規登録では必須にする */
  required?: boolean;
}

/** スタッフ登録・編集フォームに置く、従事者の個人情報の取扱いに関する同意(会社の管理者が本人への説明と同意を確認して記録する)。 */
export function PersonalDataConsentBox({ existing, checked, onChange, required }: Props) {
  const [open, setOpen] = useState(false);
  const recorded = existing && existing.version === PERSONAL_DATA_CONSENT_VERSION;

  return (
    <div style={{ border: '1px solid #FDE68A', background: '#FFFBEB', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#78350F' }}>{PERSONAL_DATA_CONSENT_TITLE}</div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: 'var(--primary)', fontSize: '12px', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
      >
        {open ? '説明文を閉じる' : '本人に説明する内容を見る'}
      </button>
      {open && (
        <div style={{ whiteSpace: 'pre-wrap', fontSize: '11px', lineHeight: 1.7, color: '#1E293B', background: 'var(--surface-color)', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 10px', maxHeight: '30vh', overflowY: 'auto' }}>
          {PERSONAL_DATA_CONSENT_TEXT}
        </div>
      )}
      {recorded ? (
        <div style={{ fontSize: '11px', color: '#065F46', background: '#D1FAE5', padding: '4px 8px', borderRadius: '4px' }}>
          同意を記録済み(版 {existing!.version} / {new Date(existing!.at).toLocaleDateString('ja-JP')})
        </div>
      ) : (
        <>
          {existing && (
            <div style={{ fontSize: '11px', color: '#B45309' }}>
              記録されている同意は旧版({existing.version})です。現行版({PERSONAL_DATA_CONSENT_VERSION})で再確認してください。
            </div>
          )}
          <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: '#1E293B', lineHeight: 1.5, cursor: 'pointer' }}>
            <input type="checkbox" required={required} checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: '3px' }} />
            上記の内容を本人に説明し、本人の同意を得ています{required ? ' *' : ''}
          </label>
        </>
      )}
    </div>
  );
}
