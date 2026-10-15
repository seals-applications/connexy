// Phase 2 アカウント移行スクリプト: 既存の会社・スタッフのログイン(平文パスワード)を Supabase Auth に移す。
//
// ※ service_role キーが必要です。**手元の端末でだけ実行**し、キーをリポジトリ・チャット・CI に載せないこと。
//
// 使い方(リポジトリ直下で):
//   1) まず db/phase2_auth_rls.sql を適用(accounts テーブルなどを作る)
//   2) ドライラン(何も書き込まない):
//        SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node db/phase2_migrate_accounts.mjs
//   3) 実行:   ... node db/phase2_migrate_accounts.mjs --apply
//      既存パスワードを再利用する(6文字以上のもののみ。短いものは新規発行): --reuse-passwords
//
// 結果: Auth にユーザーを作成(メール確認済み)、accounts に紐づけ、発行した初期パスワードを
//       phase2_accounts_<日時>.csv に出力(.gitignore 済み。配布後は安全に破棄すること)。
import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes('--apply');
const reuse = process.argv.includes('--reuse-passwords');
if (!url || !key) {
  console.error('SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を環境変数で指定してください。');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const toEmail = (loginId) => `${loginId.trim().toLowerCase()}@accounts.connexy.invalid`;

// アプリ側の encryptData(ENC:<base64(encodeURIComponent(text))>)の復号
const decrypt = (v) => {
  if (!v) return '';
  if (!v.startsWith('ENC:')) return v;
  try {
    return decodeURIComponent(Buffer.from(v.slice(4), 'base64').toString('binary'));
  } catch {
    return '';
  }
};

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomPassword = (n = 12) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

const must = (res, label) => {
  if (res.error) {
    console.error(`${label}: ${res.error.message}`);
    process.exit(1);
  }
  return res.data;
};

const companies = must(await sb.from('companies').select('*'), 'companies');
const staffs = must(await sb.from('staffs').select('*'), 'staffs');
const existingAccounts = must(await sb.from('accounts').select('user_id, login_id, company_id, staff_id'), 'accounts');

// 既存の Auth ユーザー(再実行に備える)
const usersByEmail = new Map();
for (let page = 1; ; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error(`listUsers: ${error.message}`); process.exit(1); }
  data.users.forEach((u) => usersByEmail.set((u.email || '').toLowerCase(), u));
  if (data.users.length < 1000) break;
}

// クライアントの initializeDefaultStaffLogins と同じ規則で、DB に login_id が無いスタッフの既定ログインIDを決める
const staffsByCompany = new Map();
staffs.forEach((s) => {
  if (!staffsByCompany.has(s.user_id)) staffsByCompany.set(s.user_id, []);
  staffsByCompany.get(s.user_id).push(s);
});
const defaultStaffLogin = new Map();
for (const [companyId, list] of staffsByCompany) {
  [...list].sort((a, b) => String(a.id).localeCompare(String(b.id))).forEach((s, i) => {
    defaultStaffLogin.set(s.id, `${companyId}_s${i + 1}`);
  });
}

const plan = [];
const usedLogins = new Set(existingAccounts.map((a) => a.login_id));
const addPlan = (entry) => {
  const login = entry.loginId.trim().toLowerCase();
  if (!login) return;
  if (usedLogins.has(login) && !existingAccounts.some((a) => a.login_id === login && (a.company_id === entry.companyId) && (a.staff_id || null) === (entry.staffId || null))) {
    console.warn(`スキップ(ログインID重複): ${login}`);
    return;
  }
  if (existingAccounts.some((a) => a.login_id === login)) return; // 移行済み
  usedLogins.add(login);
  plan.push({ ...entry, loginId: login });
};

companies.forEach((c) => {
  if (!c.login_id) return;
  addPlan({
    kind: c.role === 'admin' ? 'platform_admin' : 'company_admin',
    companyId: c.id, staffId: null, name: c.name, loginId: c.login_id, legacyPassword: decrypt(c.password),
  });
});
staffs.forEach((s) => {
  const loginId = s.login_id || defaultStaffLogin.get(s.id);
  addPlan({
    kind: s.role === 'admin' ? 'company_admin' : 'staff',
    companyId: s.user_id, staffId: s.id, name: s.name, loginId, legacyPassword: s.login_id ? decrypt(s.password) : '',
  });
});

console.log(`移行対象: ${plan.length} 件(会社 ${plan.filter((p) => !p.staffId).length} / スタッフ ${plan.filter((p) => p.staffId).length})`);
if (!apply) {
  plan.forEach((p) => console.log(`  [dry-run] ${p.kind.padEnd(14)} ${p.loginId}  (${p.name})`));
  console.log('\n--apply を付けると実行します。');
  process.exit(0);
}

const rows = [['login_id', 'initial_password', 'name', 'company_id', 'role', 'note']];
let created = 0;
for (const p of plan) {
  const email = toEmail(p.loginId);
  const reuseOk = reuse && p.legacyPassword && p.legacyPassword.length >= 6;
  const password = reuseOk ? p.legacyPassword : randomPassword();
  let user = usersByEmail.get(email);
  let note = reuseOk ? '既存パスワードを再利用' : '新規発行';
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) { console.error(`createUser ${p.loginId}: ${error.message}`); continue; }
    user = data.user;
    usersByEmail.set(email, user);
    created++;
  } else {
    note = '既存の Auth ユーザーに紐づけのみ(パスワード変更なし)';
  }
  const { error: accError } = await sb.from('accounts').upsert({
    user_id: user.id,
    company_id: p.companyId,
    staff_id: p.staffId,
    role: p.kind,
    login_id: p.loginId,
  });
  if (accError) { console.error(`accounts ${p.loginId}: ${accError.message}`); continue; }
  rows.push([p.loginId, note.startsWith('既存の Auth') ? '' : password, p.name, p.companyId, p.kind, note]);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = `phase2_accounts_${stamp}.csv`;
const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
writeFileSync(file, '﻿' + csv, 'utf8');
console.log(`\n完了: Auth ユーザー ${created} 件を作成、accounts ${rows.length - 1} 件を紐づけました。`);
console.log(`初期パスワードを ${file} に出力しました(配布後は安全に破棄してください)。`);
