// 二次委託(再委託)の元請け承諾まわりのユーティリティ。
//
// 背景: 元請けとの基本契約では、再委託は「事前の書面による承諾」を得た場合に限られ、
// 再委託先には元請けとの契約と同等の義務を負わせる必要がある。
// そのためアプリでは、内定承諾後すぐに契約を確定させず、
//   内定 → 内定承諾(元請け承諾待ち) → 承諾の登録 → 契約確定
// の順に進める。承諾が得られなければ契約は成立しない。
//
// 注意: 元請け(SB等)の名称は表示しない。申請書の宛先は空欄にして手書き/追記する。

import type { Job } from '../data/mockDb';
import { getFirstWorkDate } from './statusLabels';
import type { JobApprovalInfo } from './jobStates';

/** 承諾期限: 稼働開始日の何日前までに承諾が登録されていなければ自動キャンセルとするか */
export const APPROVAL_DEADLINE_DAYS_BEFORE_WORK = 3;

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 承諾期限(YYYY-MM-DD)。稼働日が不明なら undefined(期限なし)。 */
export function calcApprovalDeadline(
  job: Pick<Job, 'eventDate' | 'dailyPrices'> | null | undefined,
): string | undefined {
  const first = getFirstWorkDate(job);
  if (!first) return undefined;
  const d = new Date(first);
  d.setDate(d.getDate() - APPROVAL_DEADLINE_DAYS_BEFORE_WORK);
  return toIsoDate(d);
}

export interface ApprovalDeadlineState {
  hasDeadline: boolean;
  isExpired: boolean;
  /** 期限までの残り日数(当日=0、超過は負) */
  daysLeft: number | null;
  /** 表示用 */
  label: string;
}

export function getApprovalDeadlineState(
  approval: JobApprovalInfo | null | undefined,
  now: Date = new Date(),
): ApprovalDeadlineState {
  const deadline = approval?.deadline;
  if (!deadline) return { hasDeadline: false, isExpired: false, daysLeft: null, label: '承諾期限: 設定なし' };
  const dl = new Date(deadline.replace(/\//g, '-'));
  if (isNaN(dl.getTime())) return { hasDeadline: false, isExpired: false, daysLeft: null, label: '承諾期限: 設定なし' };
  const t0 = new Date(now);
  t0.setHours(0, 0, 0, 0);
  dl.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((dl.getTime() - t0.getTime()) / 86400000);
  const isExpired = daysLeft < 0;
  const label = isExpired
    ? `承諾期限(${deadline})を過ぎています`
    : daysLeft === 0
      ? `承諾期限: 本日(${deadline})`
      : `承諾期限: ${deadline}(あと${daysLeft}日)`;
  return { hasDeadline: true, isExpired, daysLeft, label };
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export interface SubcontractRequestData {
  /** 申請者(乙=案件を掲載した発注側) */
  client: { name: string; address?: string; representative?: string; contactPerson?: string };
  /** 再委託先(受注側) */
  agency: { name: string; address?: string; representative?: string; contactPerson?: string };
  /** 従事者(提案スタッフ) */
  staffNames: string[];
  job: {
    title: string;
    jobCode?: string;
    roleType?: string;
    eventDate?: string;
    workPlace?: string;
    price?: number;
  };
  /** 元請け注文書番号など(任意) */
  orderRef?: string;
  deadline?: string;
  issuedAt?: Date;
}

/**
 * 二次委託(再委託)承諾申請書の印刷用HTMLを返す。
 * フォント埋め込みが不要なよう、ブラウザの印刷(PDF保存)で出力する前提。
 * 宛先(元請け)は空欄にしている。様式が指定されている場合は、その様式へ転記して使う。
 */
export function buildSubcontractRequestHtml(d: SubcontractRequestData): string {
  const issued = d.issuedAt || new Date();
  const dateStr = `${issued.getFullYear()}年${issued.getMonth() + 1}月${issued.getDate()}日`;
  const rows = (items: [string, string][]) =>
    items
      .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v || '&nbsp;'}</td></tr>`)
      .join('');
  const staffRows = (d.staffNames.length > 0 ? d.staffNames : ['(未定)'])
    .map((n, i) => `<tr><td class="c">${i + 1}</td><td>${esc(n)}</td><td class="c">○</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>二次委託承諾申請書</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: "Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo",sans-serif; color:#111; font-size:12px; line-height:1.7; }
  h1 { font-size:18px; text-align:center; margin:0 0 4px; }
  .sub { text-align:center; color:#555; font-size:11px; margin-bottom:18px; }
  .to { margin:14px 0; font-size:13px; }
  .to u { display:inline-block; min-width:240px; }
  .right { text-align:right; }
  h2 { font-size:13px; margin:18px 0 6px; border-left:4px solid #2563EB; padding-left:8px; }
  table { width:100%; border-collapse:collapse; }
  th, td { border:1px solid #999; padding:6px 8px; vertical-align:top; text-align:left; }
  th { width:30%; background:#F3F4F6; font-weight:600; }
  .c { text-align:center; width:12%; }
  .box { border:1px solid #999; padding:10px; margin-top:6px; }
  .sign td { height:44px; }
  .note { color:#555; font-size:10.5px; margin-top:14px; }
  @media print { .noprint { display:none; } }
</style></head><body>
<div class="noprint" style="margin-bottom:12px;padding:8px 12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;">
  印刷ダイアログで「PDFに保存」を選ぶと、そのまま提出用のPDFにできます。
  <button onclick="window.print()" style="margin-left:8px;">印刷 / PDF保存</button>
</div>
<h1>二次委託（再委託）承諾申請書</h1>
<div class="sub">汎用様式（元請けから様式の指定がある場合は、その様式へ転記してご利用ください）</div>

<div class="to"><u>&nbsp;</u> 御中</div>
<div class="right">${esc(dateStr)}</div>

<h2>1. 申請者（委託先・乙）</h2>
<table>${rows([
    ['会社名', esc(d.client.name)],
    ['所在地', esc(d.client.address)],
    ['代表者', esc(d.client.representative)],
    ['管理責任者（担当者）', esc(d.client.contactPerson)],
    ['元請け注文書番号など', esc(d.orderRef)],
  ])}</table>

<h2>2. 再委託先</h2>
<table>${rows([
    ['会社名', esc(d.agency.name)],
    ['所在地', esc(d.agency.address)],
    ['代表者', esc(d.agency.representative)],
    ['担当者', esc(d.agency.contactPerson)],
  ])}</table>

<h2>3. 再委託する業務</h2>
<table>${rows([
    ['案件', esc(d.job.title) + (d.job.jobCode ? `（${esc(d.job.jobCode)}）` : '')],
    ['職種', esc(d.job.roleType)],
    ['稼働日', esc(d.job.eventDate)],
    ['作業場所', esc(d.job.workPlace)],
    ['再委託の範囲', '□ 全部　□ 一部（範囲：　　　　　　　　　　　　　　）'],
    ['再委託の対価', d.job.price != null ? `${d.job.price.toLocaleString()}円 / 日` : ''],
    ['承諾を要する期限', esc(d.deadline)],
  ])}</table>

<h2>4. 再委託先の従事者（別紙 従事者一覧）</h2>
<table><tr><th class="c">No.</th><th>氏名</th><th class="c">再委託</th></tr>${staffRows}</table>

<h2>5. 申請者の確認事項</h2>
<div class="box">
  □ 再委託先に対し、元請けとの契約における乙の義務と同等の義務（秘密保持、個人情報の取扱い、反社会的勢力の排除、従事者からの誓約書の取得等）を負わせます。<br>
  □ 再委託先の行為について、乙が元請けに対して責任を負うことを了解しています。<br>
  □ 承諾を得るまで、再委託先への業務の開始および秘密情報の開示は行いません。
</div>

<h2>6. 承諾欄（元請け記入）</h2>
<table class="sign">
  <tr><th>承諾日</th><td>　　　　年　　月　　日</td></tr>
  <tr><th>承諾者（部署・氏名）</th><td></td></tr>
  <tr><th>承諾の範囲・条件</th><td></td></tr>
</table>

<div class="note">この申請書は、承諾を書面等で得るための依頼文書です。承諾が得られるまで再委託は成立しません。</div>
</body></html>`;
}

/** 申請書を別窓で開く(印刷→PDF保存)。ポップアップがブロックされた場合は false。 */
export function openSubcontractRequest(d: SubcontractRequestData): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(buildSubcontractRequestHtml(d));
  win.document.close();
  return true;
}
