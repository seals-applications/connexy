// PostgREST + supabase-js で、アプリが実際に発行するクエリの形が RLS 下で期待どおり動くかを確認する。
// 使い方は run.sh を参照(PostgREST と Postgres の使い捨てコンテナが前提)。
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';

const BASE = process.env.POSTGREST_URL || 'http://localhost:3999';
const SECRET = 'test-secret-test-secret-test-secret-123456';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (sub) => {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ sub, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 });
  const sig = createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
};

// supabase-js は /rest/v1/... を叩く。PostgREST 単体にはプレフィックスが無いので外す。
const fetchRewrite = (url, init) => fetch(String(url).replace('/rest/v1/', '/'), init);
const clientFor = (sub) =>
  createClient(BASE, 'anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: class NoopWebSocket {} }, // Node 20 に WebSocket が無いため(Realtime は使わない)
    global: { fetch: fetchRewrite, headers: sub ? { Authorization: `Bearer ${sign(sub)}` } : {} },
  });

const U = {
  A: '00000000-0000-0000-0000-0000000000a1',
  B: '00000000-0000-0000-0000-0000000000b1',
  B2: '00000000-0000-0000-0000-0000000000b2',
  B3: '00000000-0000-0000-0000-0000000000b3',
  C: '00000000-0000-0000-0000-0000000000c1',
};

// src/lib/dbColumns.ts と同じ列指定(ファイルから読み取って食い違いを防ぐ)
import { readFileSync } from 'node:fs';
const colsSrc = readFileSync(new URL('../../../src/lib/dbColumns.ts', import.meta.url), 'utf8');
const cols = (name) => {
  const m = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\]\\.join`).exec(colsSrc);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).join(',');
};
const COMPANY_COLUMNS = cols('COMPANY_COLUMNS');
const STAFF_COLUMNS = cols('STAFF_COLUMNS');
const JOB_COLUMNS = cols('JOB_COLUMNS');

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${ok ? '' : ' | ' + detail}`);
  if (!ok) failures++;
};

const A = clientFor(U.A);
const B = clientFor(U.B);
const B2 = clientFor(U.B2);
const B3 = clientFor(U.B3);
const C = clientFor(U.C);
const anon = clientFor(null);

// --- anon
{
  const { error } = await anon.from('companies').select('id');
  check('anon: companies は読めない', !!error, 'no error');
}

// --- 列指定での取得(アプリの select 文字列)
{
  const { data, error } = await B.from('companies').select(COMPANY_COLUMNS);
  check('B: companies を列指定で取得できる', !error && data.length === 3, JSON.stringify(error || data.length));
  const star = await B.from('companies').select('*');
  check("B: companies を select('*') すると拒否される", !!star.error, 'no error');
  const st = await B.from('staffs').select(STAFF_COLUMNS);
  check('B: staffs を列指定で取得できる', !st.error, JSON.stringify(st.error));
  const jb = await B.from('jobs').select(JOB_COLUMNS);
  check('B: jobs を列指定で取得できる', !jb.error, JSON.stringify(jb.error));
  const secretCol = await B.from('jobs').select('exact_location');
  check('B: jobs.exact_location は直接読めない', !!secretCol.error, 'no error');
}

// --- accounts(loadAuthenticatedUser と同じクエリ)
{
  const { data, error } = await B2.from('accounts').select('company_id, staff_id, role').eq('user_id', U.B2).maybeSingle();
  check('B担当: 自分の accounts を読める', !error && data?.staff_id === 'sB2' && data?.role === 'staff', JSON.stringify(error || data));
  const all = await B2.from('accounts').select('user_id');
  check('B担当: 他人の accounts は見えない', !all.error && all.data.length === 1, JSON.stringify(all.data));
}

// --- addJob の流れ: jobs に行(秘匿項目なし)→ job_secrets を upsert
{
  const ins = await A.from('jobs').insert([{ id: 'jE2E', title: 'E2E案件', author_id: 'cA', description: '', price: 20000, requirements: ['a'], allowed_company_ids: null }]);
  check('A: 案件を追加できる(秘匿項目なし)', !ins.error, JSON.stringify(ins.error));
  const up = await A.from('job_secrets').upsert({ job_id: 'jE2E', description: '秘匿の業務内容', detailed_description: '秘匿詳細', exact_location: '渋谷◯◯店', updated_at: new Date().toISOString() });
  check('A: job_secrets を upsert できる', !up.error, JSON.stringify(up.error));
  const part = await A.from('job_secrets').upsert({ job_id: 'jE2E', exact_location: '新宿◯◯店', updated_at: new Date().toISOString() });
  check('A: 部分 upsert できる', !part.error, JSON.stringify(part.error));
  const own = await A.from('job_secrets').select('*').eq('job_id', 'jE2E').single();
  check('A: 部分 upsert で他の列が消えない', own.data?.detailed_description === '秘匿詳細' && own.data?.exact_location === '新宿◯◯店', JSON.stringify(own));
  const rpcA = await A.rpc('get_visible_job_secrets');
  check('A: 自社案件の秘匿項目を RPC で取得', !rpcA.error && rpcA.data.some((r) => r.job_id === 'jE2E'), JSON.stringify(rpcA.error));
}

// --- 他社は新規案件の秘匿項目を見られない
{
  const listed = await B.from('jobs').select(JOB_COLUMNS);
  check('B: 新規案件(限定公開でない)は一覧に出る', listed.data?.some((j) => j.id === 'jE2E'), JSON.stringify(listed.data?.map((j) => j.id)));
  const direct = await B.from('job_secrets').select('*').eq('job_id', 'jE2E');
  check('B: job_secrets を直接読めない', !direct.error && direct.data.length === 0, JSON.stringify(direct));
  const rpc = await B.rpc('get_visible_job_secrets');
  check('B: RPC にも出ない(未確定)', !rpc.error && !rpc.data.some((r) => r.job_id === 'jE2E'), JSON.stringify(rpc.data));
  const forge = await B.from('job_secrets').upsert({ job_id: 'jE2E', description: '乗っ取り' });
  check('B: 他社案件の秘匿項目を書き換えられない', !!forge.error, 'no error');
  await B.from('jobs').update({ title: '改ざん' }).eq('id', 'jE2E');
  const after = await A.from('jobs').select('title').eq('id', 'jE2E').single();
  check('B: 他社案件を更新できない', after.data?.title === 'E2E案件', JSON.stringify(after));
}

// --- 確定フロー: A が B に権限付与 → B 担当だけ誓約後に見える
{
  const grant = await A.rpc('grant_job_access', { p_job_id: 'jE2E', p_company_id: 'cB', p_staff_ids: ['sB2'], p_pledge_required: true, p_approval: { approvalDate: '2026-10-01' } });
  check('A: grant_job_access', !grant.error, JSON.stringify(grant.error));
  const before = await B2.rpc('get_visible_job_secrets');
  check('B担当: 誓約前は見えない', !before.error && !before.data.some((r) => r.job_id === 'jE2E'), JSON.stringify(before.data));
  const pledge = await B2.rpc('record_staff_pledge', { p_job_id: 'jE2E', p_version: 'v1', p_name: 'B担当' });
  check('B担当: 誓約を記録', !pledge.error, JSON.stringify(pledge.error));
  const after = await B2.rpc('get_visible_job_secrets');
  const got = after.data?.find((r) => r.job_id === 'jE2E');
  check('B担当: 誓約後に見える', got?.exact_location === '新宿◯◯店', JSON.stringify(after));
  const other = await B3.rpc('get_visible_job_secrets');
  check('B非担当: 見えない', !other.error && !other.data.some((r) => r.job_id === 'jE2E'), JSON.stringify(other.data));
  const outsider = await C.rpc('get_visible_job_secrets');
  check('C: 見えない', !outsider.error && !outsider.data.some((r) => r.job_id === 'jE2E'), JSON.stringify(outsider.data));
  const forgeGrant = await B.rpc('grant_job_access', { p_job_id: 'jE2E', p_company_id: 'cC', p_staff_ids: ['sC1'], p_pledge_required: false, p_approval: null });
  check('B: 他社案件の権限付与は不可', !!forgeGrant.error, 'no error');
}

// --- 契約確定時の契約タスク作成(finalizeSubcontract と同じ形)
{
  const row = { id: 'ct_e2e', job_id: 'jE2E', job_title: 'E2E案件', worker_name: 'B担当', company_name: '会社B', client_name: '会社A', price: 20000, date: '2026-11-03', status: 'confirmed', agency_id: 'cB', client_id: 'cA', evaluations: { messages: [] } };
  const ins = await A.from('contract_tasks').insert([row]);
  check('A: 掲載者は契約タスクを作れる', !ins.error, JSON.stringify(ins.error));
  const forged = await B.from('contract_tasks').insert([{ ...row, id: 'ct_forged' }]);
  check('B: 受注側は契約タスクを作れない', !!forged.error, 'no error');
}

// --- talents
{
  const own = await B.from('talents').select('*');
  const pub = await A.from('talents_public').select('*');
  check('B: 自社の人材は全項目', !own.error && own.data.length === 1 && own.data[0].name === '山田太郎', JSON.stringify(own));
  check('A: 他社の人材は実名なしビュー', !pub.error && pub.data.length === 1 && !('name' in pub.data[0]), JSON.stringify(pub));
}

// --- contract_tasks
{
  const t = await B.from('contract_tasks').select('*');
  check('B: contract_tasks は当事者のみ', !t.error && t.data.every((r) => r.agency_id === 'cB' || r.client_id === 'cB'), JSON.stringify(t.data?.map((r) => r.id)));
  const upd = await B.from('contract_tasks').update({ evaluations: { messages: ['x'] } }).eq('id', 'chat_cA_cC').select();
  check('B: 他社間のチャットは更新できない', !upd.error && upd.data.length === 0, JSON.stringify(upd));
  const upd2 = await B.from('contract_tasks').update({ evaluations: { messages: ['hi'] } }).eq('id', 'chat_cA_cB').select();
  check('B: 自分が当事者のチャットは更新できる', !upd2.error && upd2.data.length === 1, JSON.stringify(upd2));
}

console.log(`\nfailures=${failures}`);
process.exit(failures ? 1 : 0);
