import { useEffect, useMemo, useState } from 'react';
import type { Job } from '../data/mockDb';
import type { JobApprovalInfo } from '../utils/jobStates';
import {
  getApprovalDeadlineState,
  openSubcontractRequest,
  type SubcontractRequestData,
} from '../utils/subcontractApproval';

interface PartyInfo {
  name: string;
  address?: string;
  representative?: string;
  contactPerson?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  job: Job;
  client: PartyInfo;
  agency: PartyInfo;
  staffNames: string[];
  approval: JobApprovalInfo;
  /** 申請書を出力した/注文書番号を入力した事実を記録する */
  onRecordRequest: (orderRef: string) => Promise<void>;
  /** 元請けの承諾を登録して契約を確定する */
  onApprove: (data: { approvalDate: string; approverName: string; evidenceRef: string; scopeNote: string }) => Promise<void>;
  /** 不承諾(または承諾が得られない)として、この二次委託を成立させない */
  onReject: (reason: string) => Promise<void>;
}

const card: React.CSSProperties = {
  background: 'var(--surface-color)', borderRadius: '16px', width: '100%', maxWidth: '420px',
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
};
const input: React.CSSProperties = {
  width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #CBD5E1',
  fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', background: 'var(--surface-color)',
};
const label: React.CSSProperties = { fontSize: '11px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' };

export function SubcontractApprovalModal(props: Props) {
  const { open, onClose, job, client, agency, staffNames, approval, onRecordRequest, onApprove, onReject } = props;

  const [orderRef, setOrderRef] = useState(approval.orderRef || '');
  const [approvalDate, setApprovalDate] = useState('');
  const [approverName, setApproverName] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [scopeNote, setScopeNote] = useState('');
  const [archived, setArchived] = useState(false);
  const [mode, setMode] = useState<'main' | 'reject'>('main');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const deadline = useMemo(() => getApprovalDeadlineState(approval), [approval]);

  useEffect(() => {
    if (open) {
      setOrderRef(approval.orderRef || '');
      setMode('main');
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const requestData = (): SubcontractRequestData => ({
    client,
    agency,
    staffNames,
    job: {
      title: job.title,
      jobCode: job.jobCode,
      roleType: job.roleType,
      eventDate: job.eventDate,
      workPlace: [job.exactLocation, job.locationName].filter(Boolean)[0] as string | undefined,
      price: job.price,
    },
    orderRef: orderRef.trim() || undefined,
    deadline: approval.deadline,
  });

  const handlePrint = async () => {
    setError('');
    const ok = openSubcontractRequest(requestData());
    if (!ok) {
      setError('別窓を開けませんでした。ポップアップを許可してもう一度お試しください。');
      return;
    }
    try {
      await onRecordRequest(orderRef.trim());
    } catch {
      /* 記録の失敗は出力自体を妨げない */
    }
  };

  const canApprove =
    !deadline.isExpired && !!approvalDate && approverName.trim() !== '' && evidenceRef.trim() !== '' && archived && !busy;

  const handleApprove = async () => {
    if (!canApprove) return;
    setBusy(true);
    setError('');
    try {
      await onApprove({ approvalDate, approverName: approverName.trim(), evidenceRef: evidenceRef.trim(), scopeNote: scopeNote.trim() });
    } catch (e) {
      console.error(e);
      setError('登録中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onReject(rejectReason.trim());
    } catch (e) {
      console.error(e);
      setError('処理中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}
      onClick={onClose}
    >
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0F9FF' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#0C4A6E', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>verified_user</span>
            二次委託の元請け承諾
          </h3>
          <button onClick={onClose} aria-label="閉じる" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#64748B' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style={{ padding: '16px 18px', overflowY: 'auto', maxHeight: '72vh', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
            元請けとの契約上、再委託には<strong>事前の書面承諾</strong>が必要です。承諾が登録されるまで、契約は確定せず、現場の詳細情報も開示されません。
          </div>

          <div style={{ fontSize: '12px', padding: '8px 10px', borderRadius: '8px', background: deadline.isExpired ? '#FEE2E2' : '#F8FAFC', border: `1px solid ${deadline.isExpired ? '#FCA5A5' : '#E2E8F0'}`, color: deadline.isExpired ? '#991B1B' : '#334155' }}>
            <div><strong>案件:</strong> {job.title}</div>
            <div><strong>再委託先:</strong> {agency.name}{staffNames.length > 0 ? `（${staffNames.join('、')}）` : ''}</div>
            <div style={{ fontWeight: 'bold', marginTop: '2px' }}>{deadline.label}</div>
          </div>

          {mode === 'main' ? (
            <>
              <section>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0F172A', marginBottom: '6px' }}>① 二次委託申請書を出力して元請けへ提出</div>
                <label style={label}>元請け注文書番号など（任意）</label>
                <input style={input} value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="例: 注文書 No.1234" />
                <button
                  onClick={handlePrint}
                  style={{ marginTop: '8px', width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #0369A1', background: 'var(--surface-color)', color: '#0369A1', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
                  申請書を出力（印刷 / PDF保存）
                </button>
                {approval.requestedAt && (
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>最終出力: {new Date(approval.requestedAt).toLocaleString('ja-JP')}</div>
                )}
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', lineHeight: 1.5 }}>
                  申請書はアプリ外で元請けへ提出してください。元請けに所定の様式がある場合は、そちらへ転記します。
                </div>
              </section>

              <section>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0F172A', marginBottom: '6px' }}>② 承諾を得たら登録</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label style={label}>承諾日 *</label>
                    <input type="date" style={input} value={approvalDate} onChange={(e) => setApprovalDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>承諾した元請け担当者（部署・氏名） *</label>
                    <input style={input} value={approverName} onChange={(e) => setApproverName(e.target.value)} placeholder="例: ○○部 山田様" />
                  </div>
                  <div>
                    <label style={label}>承諾書面の参照（書面番号・メール件名など） *</label>
                    <input style={input} value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} placeholder="例: 2026/10/20付 承諾書 / 件名「二次委託の件」" />
                  </div>
                  <div>
                    <label style={label}>承諾の範囲・条件メモ（任意）</label>
                    <textarea style={{ ...input, minHeight: '56px', resize: 'vertical' }} value={scopeNote} onChange={(e) => setScopeNote(e.target.value)} />
                  </div>
                  <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: '#1E293B', lineHeight: 1.5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} style={{ marginTop: '3px' }} />
                    承諾書面（またはメール）の原本を保管しており、求められた場合は提出します。
                  </label>
                </div>
                <button
                  onClick={handleApprove}
                  disabled={!canApprove}
                  style={{ marginTop: '10px', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: canApprove ? '#10B981' : '#CBD5E1', color: 'white', fontWeight: 'bold', fontSize: '14px', cursor: canApprove ? 'pointer' : 'not-allowed' }}
                >
                  {busy ? '処理中...' : '承諾を登録して契約を確定する'}
                </button>
                {deadline.isExpired && (
                  <div style={{ fontSize: '11px', color: '#991B1B', marginTop: '4px' }}>期限を過ぎているため登録できません。この二次委託は成立しない扱いにしてください。</div>
                )}
              </section>

              <section style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                <button
                  onClick={() => setMode('reject')}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #FCA5A5', background: 'var(--surface-color)', color: '#B91C1C', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  承諾が得られなかった（この二次委託を成立させない）
                </button>
              </section>
            </>
          ) : (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#B91C1C' }}>この二次委託を成立させない</div>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                元請けの承諾が得られなかったため、内定を取り消してキャンセルします。相手企業に通知され、この操作は取り消せません。
              </div>
              <div>
                <label style={label}>理由（任意・相手企業にも表示されます）</label>
                <textarea style={{ ...input, minHeight: '64px', resize: 'vertical' }} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setMode('main')} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'var(--surface-color)', color: '#64748B', fontWeight: 'bold', cursor: 'pointer' }}>戻る</button>
                <button onClick={handleReject} disabled={busy} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: 'none', background: '#EF4444', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                  {busy ? '処理中...' : '成立させない'}
                </button>
              </div>
            </section>
          )}

          {error && <div style={{ fontSize: '12px', color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '8px 10px' }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}
