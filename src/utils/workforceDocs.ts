// 従事者名簿・作業報告書の印刷用HTML。
//
// 背景: 元請けとの基本契約では、業務に従事する者の氏名・管理責任者の通知、および業務の
// 実施結果の報告が求められる。現場グループチャットから、案件・承諾・担当者の情報を
// 差し込んだ書式を出力する(ブラウザの印刷で PDF 保存)。
// ・文面は暫定版。元請けから様式の指定がある場合は、その様式へ転記して使う。
// ・元請けの名称は載せない(宛先は空欄)。
// ・名簿には個人情報を含むため、本人の同意を確認済みのスタッフだけを対象にする(呼び出し側で確認)。

import type { JobApprovalInfo } from './jobStates';

export interface DocParty {
  name: string;
  address?: string;
  representative?: string;
  /** 管理責任者・担当者 */
  contactPerson?: string;
}

export interface DocStaff {
  name: string;
  furigana?: string;
  /** 年齢(生年月日から算出。不明なら undefined) */
  age?: number;
  /** 出勤の打刻 { 'YYYY-MM-DD': 'HH:mm' } */
  attendance?: Record<string, string>;
}

export interface DocContext {
  /** 発注側(乙=一次請け) */
  client: DocParty;
  /** 二次委託先(受注側) */
  agency: DocParty;
  job: {
    title: string;
    jobCode?: string;
    roleType?: string;
    /** 稼働日(YYYY-MM-DD) */
    dates: string[];
    place?: string;
    price?: number;
  };
  approval?: JobApprovalInfo;
  staff: DocStaff[];
  /** 発注者による評価コメントなど(作業報告書の参考欄) */
  clientComment?: string;
  issuedAt?: Date;
}

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const jpDate = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

/** 'YYYY-MM-DD' → '10月15日(木)' */
const dayLabel = (iso: string): string => {
  const d = new Date(iso.replace(/\//g, '-'));
  if (isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}月${d.getDate()}日(${'日月火水木金土'[d.getDay()]})`;
};

/** 生年月日(YYYY-MM-DD)から年齢 */
export const calcAge = (birthday: string | undefined, now: Date = new Date()): number | undefined => {
  if (!birthday) return undefined;
  const b = new Date(birthday.replace(/\//g, '-'));
  if (isNaN(b.getTime())) return undefined;
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 ? age : undefined;
};

/** completedTrainings の ATTENDANCE_LOG_<date>_<time>_<OK|LATE> から { date: time } を作る */
export const attendanceMap = (trainings: string[] | undefined): Record<string, string> => {
  const map: Record<string, string> = {};
  (trainings || []).forEach((t) => {
    const m = /^ATTENDANCE_LOG_(\d{4}-\d{2}-\d{2})_(\d{2}:\d{2})_/.exec(t);
    if (m) map[m[1]] = m[2];
  });
  return map;
};

const STYLE = `
  @page { size: A4; margin: 16mm; }
  body { font-family: "Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo",sans-serif; color:#111; font-size:12px; line-height:1.7; }
  h1 { font-size:18px; text-align:center; margin:0 0 4px; }
  .sub { text-align:center; color:#555; font-size:11px; margin-bottom:14px; }
  h2 { font-size:13px; margin:16px 0 6px; border-left:4px solid #2563EB; padding-left:8px; }
  table { width:100%; border-collapse:collapse; }
  th, td { border:1px solid #999; padding:6px 8px; vertical-align:top; text-align:left; }
  th { background:#F3F4F6; font-weight:600; }
  table.kv th { width:28%; }
  .c { text-align:center; }
  .right { text-align:right; }
  .box { border:1px solid #999; padding:8px 10px; min-height:60px; }
  .tall td { height:30px; }
  .sign td { height:46px; }
  .note { color:#555; font-size:10.5px; margin-top:12px; }
  .warn { color:#B45309; }
  @media print { .noprint { display:none; } }
`;

const toolbar = `<div class="noprint" style="margin-bottom:12px;padding:8px 12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;">
  印刷ダイアログで「PDFに保存」を選ぶと、そのまま提出用のPDFにできます。
  <button onclick="window.print()" style="margin-left:8px;">印刷 / PDF保存</button>
</div>`;

const kv = (rows: [string, string][]) =>
  `<table class="kv">${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v || '&nbsp;'}</td></tr>`).join('')}</table>`;

const approvalRows = (a?: JobApprovalInfo): [string, string][] => [
  ['再委託の承諾日', esc(a?.approvalDate)],
  ['承諾者', esc(a?.approverName)],
  ['承諾書面の参照', esc(a?.evidenceRef)],
];

/** 従事者名簿(再委託欄つき) */
export function buildRosterHtml(ctx: DocContext): string {
  const issued = ctx.issuedAt || new Date();
  const dates = ctx.job.dates.map(dayLabel).join('、');
  const rows = (ctx.staff.length > 0 ? ctx.staff : [{ name: '' } as DocStaff])
    .map(
      (s, i) => `<tr class="tall">
        <td class="c">${i + 1}</td>
        <td>${esc(s.name)}${s.furigana ? `<div style="font-size:10px;color:#555">${esc(s.furigana)}</div>` : ''}</td>
        <td class="c">${s.age != null ? esc(s.age) : ''}</td>
        <td>${esc(ctx.agency.name)}</td>
        <td class="c">□ 従業員<br>□ その他(　　　)</td>
        <td>□ 再委託なし<br>□ 再委託あり(委託先:　　　　　)</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>従事者名簿</title><style>${STYLE}</style></head><body>
${toolbar}
<h1>業務従事者名簿</h1>
<div class="sub">汎用様式(元請けから様式の指定がある場合は、その様式へ転記してご利用ください)</div>
<div style="margin:10px 0">宛先: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> 御中<span class="right" style="float:right">${esc(jpDate(issued))}</span></div>

<h2>1. 業務</h2>
${kv([
    ['案件', esc(ctx.job.title) + (ctx.job.jobCode ? `(${esc(ctx.job.jobCode)})` : '')],
    ['職種', esc(ctx.job.roleType)],
    ['稼働日', esc(dates)],
    ['作業場所', esc(ctx.job.place)],
  ])}

<h2>2. 委託先・管理責任者</h2>
${kv([
    ['提出者(乙)', esc(ctx.client.name)],
    ['二次委託先(再委託先)', esc(ctx.agency.name) + (ctx.agency.address ? `<br><span style="font-size:11px;color:#555">${esc(ctx.agency.address)}</span>` : '')],
    ['二次委託先の管理責任者', esc(ctx.agency.contactPerson || ctx.agency.representative)],
    ...approvalRows(ctx.approval),
  ])}

<h2>3. 従事者</h2>
<table>
  <tr><th class="c" style="width:6%">No.</th><th>氏名</th><th class="c" style="width:8%">年齢</th><th>所属</th><th class="c">雇用区分</th><th>再委託欄</th></tr>
  ${rows}
</table>

<div class="note">
  ・従事者は、所属会社の従業員であることを前提とします。二次委託先からさらに再委託する場合は、事前に元請けの書面承諾が必要です(再委託欄に記載)。<br>
  ・本名簿の個人情報は、業務の遂行・安全管理・元請けへの通知の目的に限って利用します。本人の同意を得た従事者のみを記載しています。
</div>

<h2>4. 確認</h2>
<table class="sign">
  <tr><th style="width:28%">提出者(乙) 管理責任者</th><td></td></tr>
  <tr><th>受領者(宛先)</th><td></td></tr>
</table>
</body></html>`;
}

/** 作業報告書 */
export function buildWorkReportHtml(ctx: DocContext): string {
  const issued = ctx.issuedAt || new Date();
  const dates = ctx.job.dates.length > 0 ? ctx.job.dates : [''];
  const staff = ctx.staff.length > 0 ? ctx.staff : [{ name: '' } as DocStaff];

  const rows = dates
    .flatMap((d) =>
      staff.map(
        (s) => `<tr class="tall">
          <td>${d ? esc(dayLabel(d)) : ''}</td>
          <td>${esc(s.name)}</td>
          <td class="c">${esc(s.attendance?.[d] || '')}</td>
          <td class="c">　　:　　</td>
          <td class="c">　　:　　</td>
          <td class="c">　　分</td>
          <td></td>
        </tr>`,
      ),
    )
    .join('');

  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>作業報告書</title><style>${STYLE}</style></head><body>
${toolbar}
<h1>作業報告書</h1>
<div class="sub">汎用様式(元請けから様式の指定がある場合は、その様式へ転記してご利用ください)</div>
<div style="margin:10px 0">宛先: <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> 御中<span class="right" style="float:right">${esc(jpDate(issued))}</span></div>

<h2>1. 業務</h2>
${kv([
    ['案件', esc(ctx.job.title) + (ctx.job.jobCode ? `(${esc(ctx.job.jobCode)})` : '')],
    ['職種', esc(ctx.job.roleType)],
    ['作業場所', esc(ctx.job.place)],
    ['報告者(二次委託先)', esc(ctx.agency.name)],
    ['発注側(乙)', esc(ctx.client.name)],
  ])}

<h2>2. 作業実績</h2>
<table>
  <tr><th>稼働日</th><th>従事者</th><th class="c">出勤打刻</th><th class="c">開始</th><th class="c">終了</th><th class="c">休憩</th><th>備考</th></tr>
  ${rows}
</table>

<h2>3. 実施内容</h2>
<div class="box"></div>

<h2>4. 特記事項(事故・トラブル・お客様の声など)</h2>
<div class="box"></div>
${ctx.clientComment ? `<div class="note">発注側コメント: ${esc(ctx.clientComment)}</div>` : ''}

<h2>5. 確認</h2>
<table class="sign">
  <tr><th style="width:28%">報告者 管理責任者(${esc(ctx.agency.name)})</th><td>${esc(ctx.agency.contactPerson || ctx.agency.representative)}</td></tr>
  <tr><th>確認者(乙 担当者)</th><td></td></tr>
</table>
<div class="note">本書には個人情報を含むため、業務の確認・精算の目的以外には使用しません。</div>
</body></html>`;
}

/** HTML を別窓で開く(印刷→PDF保存)。ポップアップがブロックされた場合は false。 */
export function openHtmlDocument(html: string): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
