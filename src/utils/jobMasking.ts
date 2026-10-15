// 案件情報のマスキング(元請け契約対応)。
//
// 方針:
//  - 掲載(公開)情報は「都道府県・市区、職種、キャリア(コード表記)、販路、稼働日、報酬、締切」等に限る。
//  - 店舗名・詳細住所・正確な座標・業務詳細などは、元請けの承諾により二次委託が確定した後に、
//    当該案件の発注側(掲載者)と、承諾済みの受注側の担当者にだけ開示する。
//  - 元請け・キャリアの名称は、表示上コード(キャリアA〜)に置き換える。
//
// 注意: これは表示側のマスキング。サーバー側のアクセス制御(RLS)は Phase 2 で行う。
// それまでは「見えなくなる」だけで、通信上のデータには残る点に注意。

import type { Job, ContractTask, User } from '../data/mockDb';
import { getJobStatus, getLinkedJobIds, getJobStaffId, type EngagementStatusValue } from './jobStates';
import { getPrefecture, getCityArea } from './prefectures';
import { isDirectChat } from './contractTaskKind';

// ────────────────────────────────────────────────────────────────
// キャリア名のコード表記
// ────────────────────────────────────────────────────────────────

/** 保存値 → 表示用コード。保存値(DB)は変えず、表示だけ置き換える。 */
export const CARRIER_CODE_LABELS: Record<string, string> = {
  docomo: 'キャリアA',
  'au/UQmobile': 'キャリアB',
  'SoftBank/Y!mobile': 'キャリアC',
  BB: 'キャリアD',
  'Rakuten Mobile': 'キャリアE',
};

/** 保存値 → 表示用コード。未登録の名称は、名称を出さずに「その他キャリア」とする。 */
export function getCarrierLabel(value: string | null | undefined): string {
  if (!value) return '';
  if (CARRIER_CODE_LABELS[value]) return CARRIER_CODE_LABELS[value];
  if (value.startsWith('キャリア') || value === 'その他キャリア') return value;
  return 'その他キャリア';
}

interface BrandRule {
  /** 検出・置換に使う正規表現(g フラグ付き。使い回しのため毎回 new する) */
  source: string;
  flags: string;
  label: string;
}

// 複合表記(au/UQmobile 等)を先に置き換え、重複置換を避ける順序にしている。
const BRAND_RULES: BrandRule[] = [
  { source: 'au\\s*\\/\\s*UQ\\s*mobile', flags: 'gi', label: 'キャリアB' },
  { source: 'SoftBank\\s*\\/\\s*Y!?\\s*mobile', flags: 'gi', label: 'キャリアC' },
  { source: 'ソフトバンク(?:モバイル)?|SoftBank|ワイモバイル|Y!?\\s?mobile|ヤフー|Yahoo!?', flags: 'gi', label: 'キャリアC' },
  { source: 'NTT\\s?ドコモ|ドコモ|docomo', flags: 'gi', label: 'キャリアA' },
  { source: 'UQ\\s?mobile|UQモバイル|KDDI|(?<![A-Za-z])au(?![A-Za-z])', flags: 'gi', label: 'キャリアB' },
  { source: 'Rakuten\\s?Mobile|楽天モバイル', flags: 'gi', label: 'キャリアE' },
];

/** 自由記述に含まれるキャリア・元請けの名称をコード表記に置き換える。 */
export function maskBrandText(text: string | null | undefined): string {
  if (!text) return text || '';
  let out = text;
  for (const r of BRAND_RULES) {
    out = out.replace(new RegExp(r.source, r.flags), r.label);
  }
  return out;
}

/** 自由記述にキャリア・元請けの名称が含まれるか(入力時のNGワード検知用)。 */
export function containsBrandName(text: string | null | undefined): boolean {
  if (!text) return false;
  return BRAND_RULES.some((r) => new RegExp(r.source, r.flags.replace('g', '')).test(text));
}

/** 検出された名称の一覧(メッセージ表示用) */
export function findBrandNames(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const r of BRAND_RULES) {
    const m = text.match(new RegExp(r.source, r.flags));
    if (m) m.forEach((x) => found.add(x));
  }
  return [...found];
}

// ────────────────────────────────────────────────────────────────
// 公開用の場所・タイトル
// ────────────────────────────────────────────────────────────────

/** 住所・地名から「都道府県＋市区(政令市は区まで)」だけの公開用地名を作る。 */
export function getPublicLocationName(rawAddress: string | null | undefined): string {
  if (!rawAddress) return '非公開エリア';
  // Google の formatted_address 等の「日本、〒160-0023 」前置を落とす
  const address = rawAddress.trim().replace(/^日本[、,]?\s*/, '').replace(/^〒?\s*\d{3}-?\d{4}\s*/, '');
  const pref = getPrefecture(address) || '';
  const city = getCityArea(address);
  if (city && city !== address.trim()) return `${pref}${city}`;
  // 市区が取れない(「新宿エリア」等)場合は、都道府県＋そのまま
  return `${pref}${city}` || '非公開エリア';
}

function shortDate(eventDate: string | null | undefined): string {
  if (!eventDate) return '';
  const first = eventDate.split(',')[0].trim();
  const m = first.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  return m ? `${Number(m[2])}/${Number(m[3])}` : '';
}

/** 案件タイトルを構造化項目から自動生成する(自由入力タイトルは使わない)。 */
export function generateJobTitle(p: {
  locationName?: string | null;
  roleType?: string | null;
  eventDate?: string | null;
}): string {
  const loc = getPublicLocationName(p.locationName);
  const city = getCityArea(loc) || loc;
  const role = p.roleType || '現場スタッフ';
  const d = shortDate(p.eventDate);
  return `【${city}】${role}募集${d ? `（${d}〜）` : ''}`;
}

/** 案件から公開用タイトルを作る(チャットの案件名やシステムメッセージなど、他社に見える場所に保存・表示する用)。 */
export function getPublicJobTitle(job: Pick<Job, 'locationName' | 'exactLocation' | 'roleType' | 'eventDate'>): string {
  return generateJobTitle({
    locationName: getPublicLocationName(job.locationName || job.exactLocation || ''),
    roleType: job.roleType,
    eventDate: job.eventDate,
  });
}

/** 二次委託の確定前に相手へ見せるオファーの業務内容欄(秘匿項目は載せない) */
export const OFFER_DETAILS_PLACEHOLDER = '業務内容の詳細は、元請けの承諾により二次委託が確定した後に開示されます。';

// ────────────────────────────────────────────────────────────────
// 閲覧権限とマスク
// ────────────────────────────────────────────────────────────────

/** 詳細情報を開示してよい、二次委託確定後の状態 */
const POST_APPROVAL_STATUSES: EngagementStatusValue[] = ['confirmed', 'report_pending', 'completed', 'disputed'];

export const SECRET_DETAIL_NOTICE =
  '店舗名・詳細住所・業務内容などの詳細は、元請けの承諾により二次委託が確定した後に、担当者へ開示されます。';

/** 座標を粗く丸める(0.05度 ≒ 約5km) */
function coarse(n: number): number {
  return Math.round(n * 20) / 20;
}

/**
 * ユーザーが詳細情報(秘匿項目)を閲覧してよい案件IDの集合。
 *  - 掲載者の会社: 自社案件は常に可
 *  - 受注側: 二次委託が確定(confirmed 以降)した案件のみ。一般スタッフは自分がアサインされた案件のみ
 */
export function getVisibleSecretJobIds(jobs: Job[], tasks: ContractTask[], user: User | null | undefined): Set<string> {
  const ids = new Set<string>();
  if (!user) return ids;
  const isStaffOnly = !!user.staffId && user.staffRole !== 'admin';

  for (const j of jobs) {
    if (j.authorId === user.id) ids.add(j.id);
  }

  for (const t of tasks) {
    // 現場グループチャット: chat_group_<jobId>_<companyId>
    if (t.id.startsWith('chat_group_')) {
      const parts = t.id.split('_');
      const jobId = parts[2];
      const companyId = parts[3];
      if (jobId && companyId === user.id) {
        const assigned: string[] = ((t.evaluations as any)?.assignedStaffIds) || [];
        if (!isStaffOnly || (user.staffId && assigned.includes(user.staffId))) ids.add(jobId);
      }
      continue;
    }

    // 直接チャット: 案件ごとの状態(jobStates)で判定
    if (isDirectChat(t)) {
      if (!t.id.split('_').includes(user.id)) continue;
      for (const jobId of getLinkedJobIds(t.evaluations)) {
        if (!POST_APPROVAL_STATUSES.includes(getJobStatus(t, jobId))) continue;
        if (!isStaffOnly || (user.staffId && getJobStaffId(t.evaluations, jobId) === user.staffId)) ids.add(jobId);
      }
      continue;
    }

    // 契約タスク(ct_* / 既存データ): jobId を直接持つ
    if (t.jobId && t.jobId !== 'chat' && POST_APPROVAL_STATUSES.includes(t.status as EngagementStatusValue)) {
      const mine = t.agency_id === user.id || t.client_id === user.id;
      if (!mine) continue;
      if (!isStaffOnly || (user.staffName && t.workerName === user.staffName)) ids.add(t.jobId);
    }
  }

  // 従事者誓約書が必要な案件(現場グループチャットが pledgeRequired)で、担当として割り当てられた本人が
  // まだ誓約していない場合は、詳細情報を開示しない(自社案件の掲載者は対象外)。
  if (user.staffId) {
    for (const t of tasks) {
      if (!t.id.startsWith('chat_group_')) continue;
      const parts = t.id.split('_');
      const jobId = parts[2];
      const companyId = parts[3];
      if (!jobId || companyId !== user.id) continue;
      const ev = (t.evaluations as any) || {};
      if (!ev.pledgeRequired) continue;
      const assigned: string[] = ev.assignedStaffIds || [];
      if (!assigned.includes(user.staffId) || ev.pledges?.[user.staffId]) continue;
      const author = jobs.find((j) => j.id === jobId)?.authorId;
      if (author === user.id) continue;
      ids.delete(jobId);
    }
  }
  return ids;
}

/** 秘匿項目を伏せた公開用の案件(閲覧権限のない人に見せる版)。 */
export function maskJobForPublic(job: Job): Job {
  const publicLoc = getPublicLocationName(job.locationName || job.exactLocation || '');
  return {
    ...job,
    title: generateJobTitle({ locationName: publicLoc, roleType: job.roleType, eventDate: job.eventDate }),
    description: '',
    detailedDescription: '',
    exactLocation: '',
    exactLat: undefined,
    exactLng: undefined,
    requirements: [],
    locationName: publicLoc,
    lat: coarse(job.lat),
    lng: coarse(job.lng),
    masked: true,
  };
}

/** 閲覧権限のある人に見せる版。自由記述中のキャリア・元請け名称だけコード表記にする。 */
export function maskBrandsInJob(job: Job): Job {
  return {
    ...job,
    title: maskBrandText(job.title),
    description: maskBrandText(job.description),
    detailedDescription: maskBrandText(job.detailedDescription),
    masked: false,
  };
}

/** ログインユーザー視点で案件一覧を整える(閲覧権限のない案件は伏せる)。 */
export function maskJobsForViewer(jobs: Job[], tasks: ContractTask[], user: User | null | undefined): Job[] {
  const visible = getVisibleSecretJobIds(jobs, tasks, user);
  return jobs.map((j) => (visible.has(j.id) ? maskBrandsInJob(j) : maskJobForPublic(j)));
}
