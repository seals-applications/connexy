// 案件ごとの応募・契約ステータス(軸B)の保存・読み出し。
// 設計の根拠は STATUS_MODEL.md §7 を参照。
//
// 背景: 現行の `ContractTask.status` は「チャット単位」の1フィールドしかなく、
// 1つの直接チャットで複数案件に応募している場合に取り違えが起きる
// (todo.md「発見済みバグ(未修正)」参照)。
// ここでは `evaluations.jobStates: { [jobId]: JobState }` を新設し、案件ごとに状態を持つ。
// 移行期間中は後方互換のため、チャット単位の `status` に「最も進んだ案件の状態」を書き戻す。

import type { ContractTask } from '../data/mockDb';

/**
 * 保存する応募・契約ステータス。
 * `working` は `confirmed` にリネーム済み(STATUS_MODEL.md §7.1)。
 * 旧データ(localStorage / Supabase)に残る `working` を読めるよう、union には残しつつ
 * `normalizeEngagementStatus()` で `confirmed` に正規化する。
 */
export type EngagementStatusValue =
  | 'applying'
  | 'offered'
  | 'confirmed'
  | 'working'
  | 'report_pending'
  | 'completed'
  | 'disputed'
  | 'rejected'
  | 'declined'
  | 'cancelled';

/** 正規化後の応募・契約ステータス(旧 `working` を含まない) */
export type NormalizedEngagementStatus = Exclude<EngagementStatusValue, 'working'>;

/** 旧 `working` を `confirmed` に寄せる。それ以外はそのまま。 */
export function normalizeEngagementStatus(status: string | null | undefined): NormalizedEngagementStatus {
  return (status === 'working' ? 'confirmed' : status) as NormalizedEngagementStatus;
}

export interface JobState {
  status: EngagementStatusValue;
  /** ISO 8601。「最も進んだ状態」が同順位のときの決定と、監査用 */
  updatedAt: string;
  /** 承諾時点で契約書の双方承認が必要だったか。将来 `contract_review` を独立ステータス化する際の起点(STATUS_MODEL.md §6) */
  contractApprovalRequired?: boolean;
}

export type JobStatesMap = Record<string, JobState>;

/**
 * 状態機械上の「進み具合」序列。チャット単位 `status` の後方互換値を決めるために使う。
 * 見送り/辞退/キャンセルは終端だが「進行が止まった」状態なので、
 * 進行中の案件が1つでもあればそちらを優先する(= rank 0)。
 */
const PROGRESS_RANK: Record<EngagementStatusValue, number> = {
  rejected: 0,
  declined: 0,
  cancelled: 0,
  applying: 1,
  offered: 2,
  working: 3,
  confirmed: 3,
  report_pending: 4,
  disputed: 5,
  completed: 6,
};

/**
 * jobStates の中から「最も進んだ案件の状態」を返す。チャット単位 `status` の後方互換値。
 * - 進行中(rank > 0)の案件があれば、その中で最も進んだもの。
 * - すべて終端(見送り/辞退/キャンセル)なら、最後に更新されたもの。
 */
export function mostAdvancedStatus(jobStates: JobStatesMap): EngagementStatusValue | null {
  const entries = Object.values(jobStates);
  if (entries.length === 0) return null;

  const active = entries.filter((s) => PROGRESS_RANK[s.status] > 0);
  if (active.length > 0) {
    return active.reduce((a, b) => (PROGRESS_RANK[b.status] > PROGRESS_RANK[a.status] ? b : a)).status;
  }
  return entries.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a)).status;
}

type TaskLike = Pick<ContractTask, 'status'> & {
  evaluations?: unknown;
};

function readJobStates(task: TaskLike): JobStatesMap {
  const js = (task.evaluations as { jobStates?: JobStatesMap } | undefined)?.jobStates;
  return js && typeof js === 'object' ? js : {};
}

/**
 * 案件 `jobId` の現在の応募・契約ステータス。
 * jobStates に無ければチャット単位の `task.status` にフォールバック(移行期間中の後方互換)。
 */
export function getJobStatus(task: TaskLike, jobId: string): EngagementStatusValue {
  const js = readJobStates(task)[jobId];
  if (js?.status) return normalizeEngagementStatus(js.status);
  return normalizeEngagementStatus(task.status);
}

/** 案件 `jobId` の JobState(無ければ undefined) */
export function getJobState(task: TaskLike, jobId: string): JobState | undefined {
  return readJobStates(task)[jobId];
}

/**
 * 応募時に、まだ jobStates エントリが無い案件へ `applying` を seed する(純粋関数)。
 * 既存エントリ(offered / working など)は上書きしない。
 */
export function seedAppliedJobStates(
  evaluations: Record<string, unknown> | null | undefined,
  jobIds: string[] | undefined | null,
  now: Date = new Date(),
): Record<string, unknown> {
  const base = (evaluations && typeof evaluations === 'object' ? evaluations : {}) as Record<string, unknown>;
  if (!jobIds || jobIds.length === 0) return base;

  const prev = (base.jobStates as JobStatesMap | undefined) || {};
  const next: JobStatesMap = { ...prev };
  const iso = now.toISOString();
  let changed = false;
  for (const jobId of jobIds) {
    if (!next[jobId]) {
      next[jobId] = { status: 'applying', updatedAt: iso };
      changed = true;
    }
  }
  return changed ? { ...base, jobStates: next } : base;
}

export interface ApplyJobStateOptions {
  contractApprovalRequired?: boolean;
  /** テスト用。既定は new Date() */
  now?: Date;
}

export interface ApplyJobStateResult {
  /** jobStates を更新した新しい evaluations オブジェクト(不変更新) */
  evaluations: Record<string, unknown>;
  /** チャット単位 `status` に書き戻すべき後方互換値 */
  chatStatus: EngagementStatusValue;
}

/**
 * evaluations に対し、案件 `jobId` の状態を `status` に更新した新オブジェクトを返す(純粋関数)。
 * あわせて、チャット単位 `status` に書き戻すべき「最も進んだ状態」を計算して返す。
 */
export function applyJobState(
  evaluations: Record<string, unknown> | null | undefined,
  jobId: string,
  status: EngagementStatusValue,
  options: ApplyJobStateOptions = {},
): ApplyJobStateResult {
  const { contractApprovalRequired, now = new Date() } = options;
  const base = (evaluations && typeof evaluations === 'object' ? evaluations : {}) as Record<string, unknown>;
  const prev = (base.jobStates as JobStatesMap | undefined) || {};

  const nextEntry: JobState = {
    ...prev[jobId],
    status,
    updatedAt: now.toISOString(),
  };
  if (contractApprovalRequired !== undefined) {
    nextEntry.contractApprovalRequired = contractApprovalRequired;
  }

  const nextJobStates: JobStatesMap = { ...prev, [jobId]: nextEntry };
  const nextEvaluations = { ...base, jobStates: nextJobStates };
  const chatStatus = mostAdvancedStatus(nextJobStates) ?? status;

  return { evaluations: nextEvaluations, chatStatus };
}
