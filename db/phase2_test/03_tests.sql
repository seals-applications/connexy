-- Phase 2 RLS テスト。0 件の FAIL で終了すること。
create schema if not exists t;
grant usage on schema t to public;
create table t.results (name text, ok boolean, detail text);
grant all on t.results to public;

create function t.as_user(p_uid text) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', p_uid, true);
  execute 'set local role authenticated';
end $$;
create function t.as_anon() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;
create function t.as_super() returns void language plpgsql as $$
begin execute 'reset role'; end $$;

create function t.eq(p_name text, p_actual anyelement, p_expected anyelement) returns void language plpgsql as $$
begin
  insert into t.results values (p_name, p_actual is not distinct from p_expected, 'actual=' || coalesce(p_actual::text, 'null') || ' expected=' || coalesce(p_expected::text, 'null'));
end $$;
create function t.throws(p_name text, p_sql text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into t.results values (p_name, false, 'expected error but succeeded');
  exception when others then
    insert into t.results values (p_name, true, sqlerrm);
  end;
end $$;
create function t.works(p_name text, p_sql text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into t.results values (p_name, true, '');
  exception when others then
    insert into t.results values (p_name, false, sqlerrm);
  end;
end $$;
create function t.dml(p_sql text) returns int language plpgsql as $$
declare v int;
begin execute p_sql; get diagnostics v = row_count; return v; end $$;
create function t.n(p_sql text) returns int language plpgsql as $$
declare v int;
begin execute 'select count(*) from (' || p_sql || ') q' into v; return v; end $$;
grant execute on all functions in schema t to public;

\set A  '00000000-0000-0000-0000-0000000000a1'
\set B  '00000000-0000-0000-0000-0000000000b1'
\set B2 '00000000-0000-0000-0000-0000000000b2'
\set B3 '00000000-0000-0000-0000-0000000000b3'
\set C  '00000000-0000-0000-0000-0000000000c1'
\set P  '00000000-0000-0000-0000-0000000000d1'
\set ADM '00000000-0000-0000-0000-0000000000f1'

begin;

-- ---- マイグレーションの移行結果(スーパーユーザー) ----
select t.as_super();
select t.eq('migrate: job_secrets に既存2件', (select count(*) from public.job_secrets)::int, 2);
select t.eq('migrate: j1 の秘密が移行された', (select detailed_description from public.job_secrets where job_id = 'j1'), '秘密の詳細');
select t.eq('migrate: job_access (j1,cB) が作られた', (select count(*) from public.job_access where job_id = 'j1' and company_id = 'cB')::int, 1);
select t.eq('migrate: グループチャットの担当 sB2 が移行', (select staff_ids from public.job_access where job_id = 'j1' and company_id = 'cB'), array['sB2']);

select t.eq('migrate: 旧チャットの当事者IDが補完された', (select client_id || '>' || agency_id from public.contract_tasks where id = 'chat_cA_cB'), 'cA>cB');
select t.eq('migrate: 旧グループの当事者IDが補完された', (select client_id || '>' || agency_id from public.contract_tasks where id = 'chat_group_j1_cB'), 'cA>cB');
select t.eq('migrate: 旧契約タスクは会社名から補完された', (select client_id || '>' || agency_id from public.contract_tasks where id = 'ct1'), 'cA>cB');

-- ---- anon: 何も不可 ----
select t.as_anon();
select t.throws('anon: companies 読めない', 'select id from public.companies');
select t.throws('anon: jobs 読めない', 'select id from public.jobs');
select t.throws('anon: contract_tasks 読めない', 'select id from public.contract_tasks');
select t.throws('anon: rpc 不可', 'select * from public.get_visible_job_secrets()');
select t.throws('anon: jobs 書けない', $q$insert into public.jobs (id, title, author_id) values ('x', 'x', 'cA')$q$);

-- ---- 会社A(掲載者・管理者) ----
select t.as_user(:'A');
select t.eq('A: 承認済み会社が見える(審査中Pは除く)', t.n('select id from public.companies'), 3);
select t.throws('A: companies.password は読めない', 'select password from public.companies');
select t.throws('A: companies.login_id は読めない', 'select login_id from public.companies');
select t.throws('A: select * は列権限で拒否される(クライアントは列指定が必要)', 'select * from public.companies');
select t.eq('A: jobs が見える', t.n('select id from public.jobs'), 2);
select t.throws('A: jobs.exact_location は読めない', 'select exact_location from public.jobs');
select t.throws('A: jobs.description は読めない', 'select description from public.jobs');
select t.eq('A: 自社案件の秘密は直接読める', t.n('select job_id from public.job_secrets'), 2);
select t.eq('A: get_visible_job_secrets', t.n('select * from public.get_visible_job_secrets()'), 2);
select t.eq('A: contract_tasks は自社が当事者の4件', t.n('select id from public.contract_tasks'), 4);
select t.eq('A: staffs は自社+タスクに登場する他社スタッフ', t.n('select id from public.staffs'), 2);
select t.throws('A: staffs.password は読めない', 'select password from public.staffs');
select t.throws('A: 自社の status を書き換えられない(審査状況の改ざん)', $q$update public.companies set status = 'pending' where id = 'cA'$q$);
select t.works('A: 自社名は変更できる', $q$update public.companies set name = '会社A改' where id = 'cA'$q$);
select t.eq('A: 他社の会社情報は変更できない(0行)', t.dml($q$update public.companies set name = 'x' where id = 'cB'$q$), 0);
select t.throws('A: 他社名義で案件を作れない', $q$insert into public.jobs (id, title, author_id) values ('jx', 'x', 'cB')$q$);
select t.works('A: 自社名義で案件を作れる', $q$insert into public.jobs (id, title, author_id, allowed_company_ids) values ('jn', 'new', 'cA', null)$q$);
select t.works('A: 秘匿項目を登録できる', $q$insert into public.job_secrets (job_id, description) values ('jn', '秘')$q$);
select t.eq('A: 他社には talents 実名ビュー経由のみ(自社分なし)', t.n('select id from public.talents'), 0);
select t.eq('A: talents_public は他社人材が見える', t.n('select id from public.talents_public'), 1);
select t.throws('A: talents_public に name 列は無い', 'select name from public.talents_public');
select t.eq('A: audit_log は自社の操作のみ', (select count(*) from public.audit_log where actor_company <> 'cA')::int, 0);

-- ---- 会社B(受注側・管理者) ----
select t.as_user(:'B');
select t.eq('B: jobs は j1・限定公開 j2・A の新規 jn が見える', t.n('select id from public.jobs'), 3);
select t.eq('B: job_secrets 直接は0件', t.n('select job_id from public.job_secrets'), 0);
select t.eq('B: 確定済み j1 の詳細だけ RPC で取れる', t.n('select * from public.get_visible_job_secrets()'), 1);
select t.eq('B: RPC の内容', (select detailed_description from public.get_visible_job_secrets() limit 1), '秘密の詳細');
select t.eq('B: contract_tasks は自社が当事者の3件(A-Cのチャットは見えない)', t.n('select id from public.contract_tasks'), 3);
select t.eq('B: staffs は自社3', t.n('select id from public.staffs'), 3);
select t.eq('B: talents 直接は自社分', t.n('select id from public.talents'), 1);
select t.throws('B: 契約タスクを自作できない(確定行の偽造防止)', $q$insert into public.contract_tasks (id, job_id, client_id, agency_id, status) values ('ctx', 'j2', 'cA', 'cB', 'confirmed')$q$);
select t.works('B: 直接チャットは作れる', $q$insert into public.contract_tasks (id, job_id, client_id, agency_id, status) values ('chat_cB_cC', 'chat', 'cB', 'cC', 'chatting')$q$);
select t.throws('B: 他社間(A-C)のチャットは作れない', $q$insert into public.contract_tasks (id, job_id, client_id, agency_id, status) values ('chat_cA_cC2', 'chat', 'cA', 'cC', 'chatting')$q$);
select t.throws('B: 付与は掲載者のみ', $q$select public.grant_job_access('j1', 'cC', array['sC1'], true, null)$q$);
select t.throws('B: 自社スタッフを他人名義で登録できない', $q$insert into public.staffs (id, user_id, name) values ('sx', 'cA', 'x')$q$);
select t.works('B: 自社スタッフを登録できる', $q$insert into public.staffs (id, user_id, name, role) values ('sB4', 'cB', 'B新人', 'staff')$q$);

-- ---- Bの担当スタッフ(割当あり) ----
select t.as_user(:'B2');
select t.eq('B担当: 割り当てられた案件の詳細が見える(旧データ・誓約なし)', t.n('select * from public.get_visible_job_secrets()'), 1);
select t.eq('B担当: 関係するタスクのみ(group, chat_cA_cB, ct1)', t.n('select id from public.contract_tasks'), 3);
select t.throws('B担当: 自分の権限(role)を管理者に上げられない', $q$update public.staffs set role = 'admin' where id = 'sB2'$q$);
select t.throws('B担当: 案件を作れない', $q$insert into public.jobs (id, title, author_id) values ('jy', 'x', 'cB')$q$);
select t.throws('B担当: スタッフを追加できない', $q$insert into public.staffs (id, user_id, name) values ('sB9', 'cB', 'x')$q$);

-- ---- Bの非担当スタッフ ----
select t.as_user(:'B3');
select t.eq('B非担当: 詳細は見えない', t.n('select * from public.get_visible_job_secrets()'), 0);
select t.eq('B非担当: 関係ないタスクは見えない', t.n('select id from public.contract_tasks'), 0);

-- ---- 会社C(無関係) ----
select t.as_user(:'C');
select t.eq('C: jobs は限定公開 j2 を除く2件(j1, jn)', t.n('select id from public.jobs'), 2);
select t.eq('C: 詳細は何も見えない', t.n('select * from public.get_visible_job_secrets()'), 0);
select t.eq('C: contract_tasks は自分が当事者のみ(A-C と B-C)', t.n('select id from public.contract_tasks'), 2);
select t.eq('C: staffs は自社のみ', t.n('select id from public.staffs'), 1);
select t.throws('C: job_secrets に直接書けない', $q$insert into public.job_secrets (job_id, description) values ('j1', 'x')$q$);

-- ---- 付与 → 誓約ゲート ----
select t.as_user(:'A');
select t.works('A: 会社Cに j1 の閲覧を付与(担当 sC1・誓約必須)', $q$select public.grant_job_access('j1', 'cC', array['sC1'], true, '{"approvalDate":"2026-10-01"}')$q$);
select t.throws('A: 自社への付与は不可', $q$select public.grant_job_access('j1', 'cA', array['sA1'], true, null)$q$);
select t.as_user(:'C');
select t.eq('C: 付与後も誓約前は詳細が見えない', t.n('select * from public.get_visible_job_secrets()'), 0);
select t.works('C: sC1 が誓約する', $q$select public.record_staff_pledge('j1', 'v1', 'C管理者')$q$);
select t.eq('C: 誓約後に詳細が見える', t.n('select * from public.get_visible_job_secrets()'), 1);
select t.as_user(:'B3');
select t.throws('B非担当: 割当がないので誓約できない', $q$select public.record_staff_pledge('j1', 'v1', 'x')$q$);
select t.as_user(:'A');
select t.works('A: 付与の取り消し', $q$select public.revoke_job_access('j1', 'cC')$q$);
select t.as_user(:'C');
select t.eq('C: 取り消し後は見えない', t.n('select * from public.get_visible_job_secrets()'), 0);

-- ---- 審査中の会社 ----
select t.as_user(:'P');
select t.eq('P(審査中): 自社の行だけ見える', t.n('select id from public.companies'), 1);
select t.eq('P(審査中): jobs は見えない', t.n('select id from public.jobs'), 0);
select t.eq('P(審査中): 詳細は見えない', t.n('select * from public.get_visible_job_secrets()'), 0);
select t.eq('P(審査中): talents_public は見えない', t.n('select id from public.talents_public'), 0);
select t.throws('P(審査中): 自分で承認できない', $q$select public.set_company_status('cP', 'approved')$q$);

-- ---- 運営 ----
select t.as_user(:'ADM');
select t.eq('運営: 全社が見える', t.n('select id from public.companies'), 4);
select t.works('運営: 審査を承認できる', $q$select public.set_company_status('cP', 'approved')$q$);
select t.eq('運営: 承認が反映', (select status from public.companies where id = 'cP'), 'approved');
select t.eq('運営: 監査ログが見える(他社の閲覧記録を含む)', (select count(*) > 0 from public.audit_log where action = 'job_secret_view'), true);
select t.eq('運営: 付与の記録', (select count(*) >= 1 from public.audit_log where action = 'grant_job_access'), true);
select t.eq('運営: 秘匿閲覧の記録は受注側 B・C のみ(掲載者自身は記録しない)', (select string_agg(distinct actor_company, ',' order by actor_company) from public.audit_log where action = 'job_secret_view'), 'cB,cC');


-- ---- スタッフのパスワード再設定 ----
select t.as_user(:'B');
select t.works('B管理者: 自社スタッフのパスワードを再設定できる', $q$select public.admin_update_staff_login('sB2', null, 'newpass123')$q$);
select t.as_super();
select t.eq('パスワードが更新された(ハッシュ)', (select encrypted_password is not null and encrypted_password <> 'newpass123' from auth.users where email = 'sb2@accounts.connexy.invalid'), true);
select t.as_user(:'B');
select t.throws('B管理者: 短いパスワードは拒否', $q$select public.admin_update_staff_login('sB2', null, 'abc')$q$);
select t.throws('B管理者: ログインID変更は未対応', $q$select public.admin_update_staff_login('sB2', 'other_id', null)$q$);
select t.works('B管理者: ログインIDが同じなら通る', $q$select public.admin_update_staff_login('sB2', 'sb2', null)$q$);
select t.as_user(:'C');
select t.throws('C管理者: 他社スタッフには不可', $q$select public.admin_update_staff_login('sB2', null, 'hacked123')$q$);
select t.as_user(:'B2');
select t.throws('B一般スタッフ: 不可', $q$select public.admin_update_staff_login('sB3', null, 'hacked123')$q$);
select t.as_anon();
select t.throws('anon: 不可', $q$select public.admin_update_staff_login('sB2', null, 'hacked123')$q$);

-- ---- 新規登録 ----
select t.as_super();
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'newco@accounts.connexy.invalid');
select t.as_user('00000000-0000-0000-0000-0000000000e1');
select t.throws('登録: 反社同意なしは拒否', $q$select public.register_company('新会社', '代表', 'T123', 'newco', null, 'v1')$q$);
select t.throws('登録: ログインID不一致は拒否', $q$select public.register_company('新会社', '代表', 'T123', 'other', now(), 'v1')$q$);
select t.works('登録: 正しい登録は成功', $q$select public.register_company('新会社', '代表', 'T123', 'newco', now(), 'v1')$q$);
select t.eq('登録: 自社は審査中', (select status from public.companies where name = '新会社'), 'pending');
select t.throws('登録: 二重登録は拒否', $q$select public.register_company('新会社2', '代表', 'T123', 'newco', now(), 'v1')$q$);

commit;

\echo
\echo ===== RESULTS =====
select case when ok then 'PASS' else 'FAIL' end as res, name, case when ok then '' else detail end as detail
from t.results order by ok, name;
select count(*) filter (where not ok) as failures, count(*) as total from t.results;
