-- ============================================================================
-- Connexy Phase 2: Supabase Auth + RLS + 詳細情報の分離 + 監査ログ
-- ============================================================================
-- 目的(元請け契約対応):
--   * anon キーだけで全データが読み書きできる状態をやめる(authenticated のみ・行単位で制限)
--   * 会社のログイン情報(平文パスワード)を API から読めなくする
--   * 案件の秘匿項目(業務内容・店舗名・詳細住所)を別テーブル job_secrets に分け、
--     自社案件と「二次委託が確定した受注側」にだけ、監査ログつきの RPC で返す
--   * 重要な変更・秘匿情報の閲覧を audit_log に残す
--
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行(何度実行しても安全)。
-- 手順の全体は db/PHASE2_CUTOVER.md を参照。**実行するとレガシー(anonキーでの直接アクセス)の
-- アプリは動かなくなる**ので、必ず切替手順に沿って、アカウント移行・デプロイと一緒に行うこと。
-- 実行前に必ずバックアップ(または検証用プロジェクト)で試す。
--
-- 前提の設定: Authentication → Providers → Email で「Confirm email」を OFF にする
-- (ログインIDから作る擬似メールアドレスで運用するため)。
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 0. 列の追加(無ければ)
-- ----------------------------------------------------------------------------
alter table public.companies add column if not exists status               text not null default 'approved';
alter table public.companies add column if not exists invoice_number       text;
alter table public.companies add column if not exists representative_name  text;
alter table public.companies add column if not exists email                text;
alter table public.companies add column if not exists website              text;
alter table public.companies add column if not exists address              text;
alter table public.companies add column if not exists pr_text              text;
alter table public.companies add column if not exists company_type         text;
alter table public.companies add column if not exists contract_template    text;
alter table public.companies add column if not exists contract_pdf         text;
alter table public.companies add column if not exists antisocial_agreed_at timestamptz;
alter table public.companies add column if not exists antisocial_version   text;

alter table public.staffs add column if not exists role text not null default 'staff';
alter table public.staffs add column if not exists login_id text;  -- 移行スクリプトが読む。移行後に phase2_drop_plaintext.sql で削除

-- ----------------------------------------------------------------------------
-- 1. アカウント(auth.users ⇔ 会社/スタッフ)
-- ----------------------------------------------------------------------------
create table if not exists public.accounts (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  company_id text references public.companies(id) on delete cascade,
  staff_id   text references public.staffs(id) on delete cascade,
  role       text not null check (role in ('platform_admin', 'company_admin', 'staff')),
  login_id   text not null unique,
  created_at timestamptz not null default now(),
  constraint accounts_company_required check (role = 'platform_admin' or company_id is not null)
);

-- ログインID → 擬似メールアドレス(フロントと同じ規則)
create or replace function public.app_login_email(p_login_id text)
returns text language sql immutable as $$
  select lower(btrim(p_login_id)) || '@accounts.connexy.invalid'
$$;

-- ----------------------------------------------------------------------------
-- 2. 呼び出し元の識別ヘルパー(SECURITY DEFINER: RLS を迂回して accounts/companies を参照)
-- ----------------------------------------------------------------------------
create or replace function public.app_company_id_raw()
returns text language sql stable security definer set search_path = public, auth, pg_temp as $$
  select a.company_id from public.accounts a where a.user_id = auth.uid()
$$;

-- 承認済みの会社に所属するときだけ会社IDを返す(審査中・却下の会社は何も見えない)
create or replace function public.app_company_id()
returns text language sql stable security definer set search_path = public, auth, pg_temp as $$
  select a.company_id
  from public.accounts a
  join public.companies c on c.id = a.company_id
  where a.user_id = auth.uid() and c.status = 'approved'
$$;

create or replace function public.app_staff_id()
returns text language sql stable security definer set search_path = public, auth, pg_temp as $$
  select a.staff_id from public.accounts a where a.user_id = auth.uid()
$$;

create or replace function public.app_role()
returns text language sql stable security definer set search_path = public, auth, pg_temp as $$
  select a.role from public.accounts a where a.user_id = auth.uid()
$$;

create or replace function public.app_is_platform_admin()
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select coalesce((select a.role = 'platform_admin' from public.accounts a where a.user_id = auth.uid()), false)
$$;

-- 自社の管理者(会社アカウント or 管理者スタッフ)
create or replace function public.app_is_company_admin()
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select public.app_company_id() is not null
     and coalesce((select a.role = 'company_admin' from public.accounts a where a.user_id = auth.uid()), false)
$$;

-- 直接チャット/契約タスクの当事者か(会社単位。一般スタッフの制限は別関数)
create or replace function public.app_task_party(p_id text, p_client_id text, p_agency_id text)
returns boolean language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
declare
  me text := public.app_company_id();
  m text[];
begin
  if me is null then return false; end if;

  -- 現場グループチャット: chat_group_<jobId>_<companyId>(jobId にも _ が入り得るため、末尾を会社IDとして扱う)
  if p_id like 'chat\_group\_%' then
    m := regexp_match(p_id, '^chat_group_(.+)_([^_]+)$');
    if m is null then return false; end if;
    if m[2] = me then return true; end if;
    return exists (select 1 from public.jobs j where j.id = m[1] and j.author_id = me);
  end if;

  -- 直接チャット: chat_<会社A>_<会社B>
  if p_id like 'chat\_%' then
    return split_part(p_id, '_', 2) = me or split_part(p_id, '_', 3) = me
        or p_client_id = me or p_agency_id = me;
  end if;

  -- 契約タスク等
  return p_client_id = me or p_agency_id = me;
end $$;

-- evaluations(JSON)にスタッフIDが現れるか(応募スタッフ / オファー / アサイン)
create or replace function public.task_mentions_staff(p_evals jsonb, p_staff_id text)
returns boolean language sql immutable as $$
  select p_staff_id is not null and p_evals is not null and (
       jsonb_path_exists(p_evals, '$.jobStates.*.staffId ? (@ == $sid)', jsonb_build_object('sid', p_staff_id))
    or jsonb_path_exists(p_evals, '$.appliedJobStaffIds.* ? (@ == $sid)', jsonb_build_object('sid', p_staff_id))
    or (p_evals ->> 'offeredStaffId') = p_staff_id
    or coalesce(p_evals -> 'assignedStaffIds', '[]'::jsonb) ? p_staff_id
  )
$$;

-- 呼び出し元がこのタスクを読み書きしてよいか(会社の当事者 + 一般スタッフは自分が関わるものだけ)
create or replace function public.app_can_access_task(p_id text, p_client_id text, p_agency_id text, p_worker_name text, p_evals jsonb)
returns boolean language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
declare
  sid text := public.app_staff_id();
  staff_only boolean := (public.app_role() = 'staff');
  my_name text;
begin
  if not public.app_task_party(p_id, p_client_id, p_agency_id) then return false; end if;
  if not staff_only then return true; end if;

  -- 一般スタッフ
  if p_id like 'chat\_group\_%' then
    return coalesce(p_evals -> 'assignedStaffIds', '[]'::jsonb) ? sid;
  end if;
  if p_id like 'chat\_%' then
    return public.task_mentions_staff(p_evals, sid);
  end if;
  select s.name into my_name from public.staffs s where s.id = sid;
  return my_name is not null and p_worker_name = my_name;
end $$;

-- スタッフ情報(個人情報)を読んでよいか: 自社 / 自社が当事者のタスクに登場するスタッフ(応募スタッフなど)
create or replace function public.app_can_read_staff(p_staff_id text, p_user_id text)
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select public.app_company_id() is not null and (
    p_user_id = public.app_company_id()
    or exists (
      select 1 from public.contract_tasks t
      where public.app_task_party(t.id, t.client_id, t.agency_id)
        and public.task_mentions_staff(t.evaluations, p_staff_id)
    )
  )
$$;

-- ----------------------------------------------------------------------------
-- 3. 案件の秘匿項目(job_secrets)と閲覧権限(job_access)
-- ----------------------------------------------------------------------------
create table if not exists public.job_secrets (
  job_id               text primary key references public.jobs(id) on delete cascade,
  description          text,
  detailed_description text,
  exact_location       text,
  exact_lat            double precision,
  exact_lng            double precision,
  updated_at           timestamptz not null default now()
);

-- 既存の案件から秘匿項目を移す(何度実行しても上書きしない)
insert into public.job_secrets (job_id, description, detailed_description, exact_location)
select j.id, j.description, j.detailed_description, j.exact_location
from public.jobs j
on conflict (job_id) do nothing;

-- 二次委託が確定した会社・担当者に付与する閲覧権限。付与は author の RPC(grant_job_access)のみ。
create table if not exists public.job_access (
  job_id           text not null references public.jobs(id) on delete cascade,
  company_id       text not null references public.companies(id) on delete cascade,
  staff_ids        text[] not null default '{}',
  pledge_required  boolean not null default true,
  pledges          jsonb not null default '{}'::jsonb,
  approval         jsonb,
  granted_by       uuid,
  granted_at       timestamptz not null default now(),
  primary key (job_id, company_id)
);

-- 既存データの移行: 確定済み(confirmed 以降)の契約タスク・現場グループチャットから権限を作る。
-- (従来は誓約書がなかったため pledge_required=false で移す)
insert into public.job_access (job_id, company_id, staff_ids, pledge_required)
select t.job_id, t.agency_id, '{}', false
from public.contract_tasks t
where t.job_id is not null and t.job_id <> 'chat' and t.agency_id is not null
  and t.status in ('confirmed', 'working', 'report_pending', 'completed', 'disputed')
  and exists (select 1 from public.jobs j where j.id = t.job_id)
  and exists (select 1 from public.companies c where c.id = t.agency_id)
on conflict (job_id, company_id) do nothing;

insert into public.job_access (job_id, company_id, staff_ids, pledge_required)
select m[1], m[2],
       coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(t.evaluations -> 'assignedStaffIds', '[]'::jsonb)) x), '{}'),
       false
from public.contract_tasks t,
     lateral (select regexp_match(t.id, '^chat_group_(.+)_([^_]+)$') as m) r
where t.id like 'chat\_group\_%' and m is not null
  and exists (select 1 from public.jobs j where j.id = m[1])
  and exists (select 1 from public.companies c where c.id = m[2])
on conflict (job_id, company_id) do update
  set staff_ids = excluded.staff_ids;

-- 詳細情報を見てよいか(クライアントの getVisibleSecretJobIds と同じ規則)
--   * 自社案件: 可(自社の担当者全員)
--   * 受注側: job_access があり、(一般スタッフは割り当てられた本人のみ)、
--     かつ担当本人が誓約必須の案件で未誓約なら不可
create or replace function public.can_view_job_secret(p_job_id text)
returns boolean language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
declare
  me text := public.app_company_id();
  sid text := public.app_staff_id();
  staff_only boolean := (public.app_role() = 'staff');
  ja public.job_access;
begin
  if me is null then return false; end if;
  if exists (select 1 from public.jobs j where j.id = p_job_id and j.author_id = me) then return true; end if;

  select * into ja from public.job_access a where a.job_id = p_job_id and a.company_id = me;
  if not found then return false; end if;

  if staff_only and not (sid = any (ja.staff_ids)) then return false; end if;
  if sid is not null and sid = any (ja.staff_ids) and ja.pledge_required and not (ja.pledges ? sid) then return false; end if;
  return true;
end $$;

-- ----------------------------------------------------------------------------
-- 4. 監査ログ
-- ----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id            bigserial primary key,
  at            timestamptz not null default now(),
  actor_user    uuid,
  actor_company text,
  actor_staff   text,
  actor_role    text,
  action        text not null,   -- insert / update / delete / job_secret_view / grant_job_access ...
  table_name    text,
  row_id        text,
  detail        jsonb
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_row_idx on public.audit_log (table_name, row_id);

create or replace function public.audit_write(p_action text, p_table text, p_row_id text, p_detail jsonb)
returns void language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare a public.accounts;
begin
  select * into a from public.accounts where user_id = auth.uid();
  insert into public.audit_log (actor_user, actor_company, actor_staff, actor_role, action, table_name, row_id, detail)
  values (auth.uid(), a.company_id, a.staff_id, a.role, p_action, p_table, p_row_id, p_detail);
end $$;

-- 行の変更を記録するトリガー関数(内容そのものは残さず、テーブル・行ID・変更された列名だけ)
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  v_old jsonb; v_new jsonb; v_id text; v_changed text[];
begin
  if tg_op = 'DELETE' then v_old := to_jsonb(old); v_new := null;
  elsif tg_op = 'INSERT' then v_old := null; v_new := to_jsonb(new);
  else v_old := to_jsonb(old); v_new := to_jsonb(new);
  end if;

  v_id := coalesce(
    coalesce(v_new, v_old) ->> 'id',
    coalesce(v_new, v_old) ->> 'job_id',
    coalesce(v_new, v_old) ->> 'user_id'
  );

  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_changed
    from jsonb_object_keys(v_new) k
    where (v_old -> k) is distinct from (v_new -> k);
    if v_changed is null then return new; end if;  -- 実質変更なし
    perform public.audit_write('update', tg_table_name, v_id, jsonb_build_object('changed', to_jsonb(v_changed)));
    return new;
  elsif tg_op = 'INSERT' then
    perform public.audit_write('insert', tg_table_name, v_id, null);
    return new;
  else
    perform public.audit_write('delete', tg_table_name, v_id, null);
    return old;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['jobs', 'job_secrets', 'job_access', 'contract_tasks', 'companies', 'staffs', 'accounts']
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 5. 変更の制限(列単位の不正を防ぐトリガー)
-- ----------------------------------------------------------------------------
-- ガードは SECURITY INVOKER(DEFINER だと current_user が常に所有者になり素通りするため)。
-- JWT のない接続(SQL Editor・service_role)は auth.uid() が null なのでメンテナンス用途として許可する。
create or replace function public.companies_guard()
returns trigger language plpgsql set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null or public.app_is_platform_admin() then
    return new;
  end if;
  if new.id is distinct from old.id then raise exception 'companies.id は変更できません'; end if;
  if new.status is distinct from old.status then raise exception 'companies.status は運営のみ変更できます'; end if;
  if new.role is distinct from old.role then raise exception 'companies.role は変更できません'; end if;
  return new;
end $$;
drop trigger if exists companies_guard on public.companies;
create trigger companies_guard before update on public.companies for each row execute function public.companies_guard();

create or replace function public.staffs_guard()
returns trigger language plpgsql set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null or public.app_is_platform_admin() or public.app_is_company_admin() then
    return new;
  end if;
  -- 一般スタッフが変えられるのは自分の行のプロフィール系のみ
  if new.user_id is distinct from old.user_id then raise exception 'staffs.user_id は変更できません'; end if;
  if new.role is distinct from old.role then raise exception 'staffs.role は管理者のみ変更できます'; end if;
  return new;
end $$;
drop trigger if exists staffs_guard on public.staffs;
create trigger staffs_guard before update on public.staffs for each row execute function public.staffs_guard();

-- staffs.role の変更を accounts.role に反映
create or replace function public.staffs_sync_account_role()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  if new.role is distinct from old.role then
    update public.accounts set role = case when new.role = 'admin' then 'company_admin' else 'staff' end
    where staff_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists staffs_sync_account_role on public.staffs;
create trigger staffs_sync_account_role after update on public.staffs for each row execute function public.staffs_sync_account_role();

-- ----------------------------------------------------------------------------
-- 6. RLS ポリシー(既存のポリシーはすべて破棄して作り直す)
-- ----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('companies', 'staffs', 'jobs', 'job_secrets', 'job_access', 'talents',
                        'contract_tasks', 'announcements', 'accounts', 'audit_log')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.companies      enable row level security;
alter table public.staffs         enable row level security;
alter table public.jobs           enable row level security;
alter table public.job_secrets    enable row level security;
alter table public.job_access     enable row level security;
alter table public.talents        enable row level security;
alter table public.contract_tasks enable row level security;
alter table public.accounts       enable row level security;
alter table public.audit_log      enable row level security;

-- companies: 承認済みの会社に所属するユーザーは承認済み会社の公開プロフィールを参照できる。
--           自社(審査中を含む)は常に参照可。運営は全件。
create policy companies_select on public.companies for select to authenticated
  using (
    (status = 'approved' and public.app_company_id() is not null)
    or id = public.app_company_id_raw()
    or public.app_is_platform_admin()
  );
create policy companies_update_own on public.companies for update to authenticated
  using (id = public.app_company_id() and public.app_is_company_admin())
  with check (id = public.app_company_id() and public.app_is_company_admin());
create policy companies_update_platform on public.companies for update to authenticated
  using (public.app_is_platform_admin()) with check (public.app_is_platform_admin());

-- staffs
create policy staffs_select on public.staffs for select to authenticated
  using (public.app_can_read_staff(id, user_id));
create policy staffs_insert on public.staffs for insert to authenticated
  with check (user_id = public.app_company_id() and public.app_is_company_admin());
create policy staffs_update on public.staffs for update to authenticated
  using ((user_id = public.app_company_id() and public.app_is_company_admin()) or id = public.app_staff_id())
  with check ((user_id = public.app_company_id() and public.app_is_company_admin()) or id = public.app_staff_id());
create policy staffs_delete on public.staffs for delete to authenticated
  using (user_id = public.app_company_id() and public.app_is_company_admin());

-- jobs: 承認済み会社は一覧を参照可(限定公開の案件は対象会社と掲載者のみ)。書き込みは掲載者の管理者のみ。
create policy jobs_select on public.jobs for select to authenticated
  using (
    public.app_company_id() is not null and (
      author_id = public.app_company_id()
      or allowed_company_ids is null
      or cardinality(allowed_company_ids) = 0
      or public.app_company_id() = any (allowed_company_ids)
    )
  );
create policy jobs_insert on public.jobs for insert to authenticated
  with check (author_id = public.app_company_id() and public.app_is_company_admin());
create policy jobs_update on public.jobs for update to authenticated
  using (author_id = public.app_company_id() and public.app_is_company_admin())
  with check (author_id = public.app_company_id() and public.app_is_company_admin());
create policy jobs_delete on public.jobs for delete to authenticated
  using (author_id = public.app_company_id() and public.app_is_company_admin());

-- job_secrets: 掲載者の管理者だけが直接読み書きできる。他社への開示は get_visible_job_secrets() のみ(監査ログつき)。
create policy job_secrets_author_select on public.job_secrets for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.author_id = public.app_company_id()));
create policy job_secrets_author_insert on public.job_secrets for insert to authenticated
  with check (public.app_is_company_admin() and exists (select 1 from public.jobs j where j.id = job_id and j.author_id = public.app_company_id()));
create policy job_secrets_author_update on public.job_secrets for update to authenticated
  using (public.app_is_company_admin() and exists (select 1 from public.jobs j where j.id = job_id and j.author_id = public.app_company_id()))
  with check (public.app_is_company_admin() and exists (select 1 from public.jobs j where j.id = job_id and j.author_id = public.app_company_id()));

-- job_access: 直接のポリシーなし(RPC のみ)

-- talents: 自社の人材のみ全項目。他社には talents_public ビュー(実名なし)で見せる。
create policy talents_select_own on public.talents for select to authenticated
  using (user_id = public.app_company_id());
create policy talents_insert on public.talents for insert to authenticated
  with check (user_id = public.app_company_id() and public.app_is_company_admin());
create policy talents_update on public.talents for update to authenticated
  using (user_id = public.app_company_id() and public.app_is_company_admin())
  with check (user_id = public.app_company_id() and public.app_is_company_admin());
create policy talents_delete on public.talents for delete to authenticated
  using (user_id = public.app_company_id() and public.app_is_company_admin());

-- 他社に見せる人材ビュー(実名 name を含まない)。ビューは所有者権限で実行され、承認済み会社のユーザーにだけ行を返す。
create or replace view public.talents_public as
  select t.id, t.description, t.lat, t.lng, t.user_id, t.price, t.skills, t.pr_text, t.experience,
         t.preferred_area, t.location_name, t.company_name, t.masked_name, t.base_location, t.nearest_station,
         t.carriers, t.available_dates, t.completed_trainings, t.has_certificate
  from public.talents t
  where public.app_company_id() is not null;

-- contract_tasks(チャット・契約): 当事者のみ
create policy contract_tasks_select on public.contract_tasks for select to authenticated
  using (public.app_can_access_task(id, client_id, agency_id, worker_name, evaluations));
create policy contract_tasks_insert on public.contract_tasks for insert to authenticated
  with check (
    public.app_can_access_task(id, client_id, agency_id, worker_name, evaluations)
    -- 契約タスク(案件に紐づく行)は、案件の掲載者だけが作れる(受注側が確定済みの行を自作して詳細を見るのを防ぐ)
    and (job_id is null or job_id = 'chat' or exists (select 1 from public.jobs j where j.id = job_id and j.author_id = public.app_company_id()))
  );
create policy contract_tasks_update on public.contract_tasks for update to authenticated
  using (public.app_can_access_task(id, client_id, agency_id, worker_name, evaluations))
  with check (public.app_can_access_task(id, client_id, agency_id, worker_name, evaluations));

-- announcements: 承認済み会社は参照可、運営のみ書き込み
create policy announcements_select on public.announcements for select to authenticated
  using (public.app_company_id() is not null or public.app_is_platform_admin());
create policy announcements_write on public.announcements for all to authenticated
  using (public.app_is_platform_admin()) with check (public.app_is_platform_admin());

-- accounts: 自分の行のみ(運営は全件)。書き込みは RPC のみ
create policy accounts_select on public.accounts for select to authenticated
  using (user_id = auth.uid() or public.app_is_platform_admin());

-- audit_log: 運営は全件、会社の管理者は自社の操作のみ
create policy audit_select on public.audit_log for select to authenticated
  using (public.app_is_platform_admin() or (actor_company = public.app_company_id() and public.app_is_company_admin()));

-- ----------------------------------------------------------------------------
-- 7. 権限(GRANT): anon は何も不可。authenticated は RLS が許す範囲で、機密列を除いて許可
-- ----------------------------------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon, public;

do $$
declare
  t text;
  cols text;
begin
  -- 表ごとの「読めない列」を除いて列単位で SELECT を付与する
  for t in select unnest(array['companies', 'staffs', 'jobs'])
  loop
    execute format('revoke all on public.%I from authenticated', t);
    select string_agg(quote_ident(c.column_name), ', ') into cols
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = t
      and c.column_name <> all (
        case t
          when 'companies' then array['password', 'login_id']
          when 'staffs'    then array['password', 'login_id']
          when 'jobs'      then array['description', 'detailed_description', 'exact_location']
        end);
    execute format('grant select (%s) on public.%I to authenticated', cols, t);
  end loop;
end $$;

-- 書き込みは列を絞らず付与(秘匿列は INSERT/UPDATE のみ可。読み出しはできない)
grant insert, update (id, name, role, status, invoice_number, representative_name, email, website, address, pr_text,
                      company_type, contract_template, contract_pdf)
  on public.companies to authenticated;
grant insert, update, delete on public.staffs to authenticated;
grant insert, update, delete on public.jobs to authenticated;
grant select, insert, update on public.job_secrets to authenticated;
grant select, insert, update, delete on public.talents to authenticated;
grant select, insert, update on public.contract_tasks to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;
grant select on public.accounts to authenticated;
grant select on public.audit_log to authenticated;
grant select on public.talents_public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ヘルパー関数は RLS の式から呼ばれるので authenticated に実行権を付与
grant execute on function
  public.app_login_email(text), public.app_company_id_raw(), public.app_company_id(), public.app_staff_id(),
  public.app_role(), public.app_is_platform_admin(), public.app_is_company_admin(),
  public.app_task_party(text, text, text), public.task_mentions_staff(jsonb, text),
  public.app_can_access_task(text, text, text, text, jsonb), public.app_can_read_staff(text, text),
  public.can_view_job_secret(text)
  to authenticated;

-- ----------------------------------------------------------------------------
-- 8. RPC(クライアントから呼ぶ操作)
-- ----------------------------------------------------------------------------

-- 8-1. 他社に開示してよい案件の詳細情報を返す(自社案件 + 付与済み)。閲覧を監査ログへ(同じ人・案件は10分に1回)。
create or replace function public.get_visible_job_secrets()
returns setof public.job_secrets
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  r public.job_secrets;
  me text := public.app_company_id();
  is_author boolean;
begin
  if me is null then return; end if;
  for r in select s.* from public.job_secrets s where public.can_view_job_secret(s.job_id)
  loop
    select exists (select 1 from public.jobs j where j.id = r.job_id and j.author_id = me) into is_author;
    if not is_author then
      if not exists (
        select 1 from public.audit_log l
        where l.actor_user = auth.uid() and l.action = 'job_secret_view' and l.row_id = r.job_id
          and l.at > now() - interval '10 minutes'
      ) then
        perform public.audit_write('job_secret_view', 'job_secrets', r.job_id, null);
      end if;
    end if;
    return next r;
  end loop;
end $$;

-- 8-2. 二次委託が確定した受注側に詳細情報の閲覧権限を付与(案件の掲載者の管理者のみ)
create or replace function public.grant_job_access(
  p_job_id text, p_company_id text, p_staff_ids text[], p_pledge_required boolean, p_approval jsonb
) returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  if not public.app_is_company_admin() then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.jobs j where j.id = p_job_id and j.author_id = public.app_company_id()) then
    raise exception 'forbidden: not the job author';
  end if;
  if p_company_id = public.app_company_id() then raise exception 'cannot grant to own company'; end if;
  if not exists (select 1 from public.companies c where c.id = p_company_id and c.status = 'approved') then
    raise exception 'unknown company';
  end if;

  insert into public.job_access (job_id, company_id, staff_ids, pledge_required, approval, granted_by)
  values (p_job_id, p_company_id, coalesce(p_staff_ids, '{}'), coalesce(p_pledge_required, true), p_approval, auth.uid())
  on conflict (job_id, company_id) do update
    set staff_ids = (select coalesce(array_agg(distinct x), '{}') from unnest(public.job_access.staff_ids || coalesce(excluded.staff_ids, '{}')) x),
        pledge_required = excluded.pledge_required,
        approval = coalesce(excluded.approval, public.job_access.approval),
        granted_by = auth.uid(), granted_at = now();
  perform public.audit_write('grant_job_access', 'job_access', p_job_id || ':' || p_company_id, jsonb_build_object('staff_ids', to_jsonb(p_staff_ids)));
end $$;

create or replace function public.revoke_job_access(p_job_id text, p_company_id text)
returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  if not public.app_is_company_admin() then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.jobs j where j.id = p_job_id and j.author_id = public.app_company_id()) then
    raise exception 'forbidden: not the job author';
  end if;
  delete from public.job_access where job_id = p_job_id and company_id = p_company_id;
  perform public.audit_write('revoke_job_access', 'job_access', p_job_id || ':' || p_company_id, null);
end $$;

-- 8-3. 担当者本人が従事者誓約書に同意(割り当てられた本人のみ)
create or replace function public.record_staff_pledge(p_job_id text, p_version text, p_name text)
returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare sid text := public.app_staff_id();
begin
  if sid is null or public.app_company_id() is null then raise exception 'forbidden'; end if;
  update public.job_access
     set pledges = pledges || jsonb_build_object(sid, jsonb_build_object('version', p_version, 'name', p_name, 'acceptedAt', now()))
   where job_id = p_job_id and company_id = public.app_company_id() and sid = any (staff_ids);
  if not found then raise exception 'not assigned'; end if;
  perform public.audit_write('staff_pledge', 'job_access', p_job_id, jsonb_build_object('staff', sid, 'version', p_version));
end $$;

-- 8-4. 自分の会社に関係する権限の一覧(誓約が必要かの判定・管理責任者の確認用)
create or replace function public.get_my_job_access()
returns table (job_id text, company_id text, staff_ids text[], pledge_required boolean, pledges jsonb, approval jsonb, granted_at timestamptz)
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select a.job_id, a.company_id, a.staff_ids, a.pledge_required, a.pledges, a.approval, a.granted_at
  from public.job_access a
  where public.app_company_id() is not null and (
    a.company_id = public.app_company_id()
    or exists (select 1 from public.jobs j where j.id = a.job_id and j.author_id = public.app_company_id())
  )
$$;

-- 8-5. 会社アカウントの新規登録(Auth の signUp 直後に呼ぶ。承認は運営が行う)
create or replace function public.register_company(
  p_name text, p_representative text, p_invoice_number text, p_login_id text,
  p_antisocial_at timestamptz, p_antisocial_version text
) returns text
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_id text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select u.email into v_email from auth.users u where u.id = v_uid;
  if v_email is distinct from public.app_login_email(p_login_id) then raise exception 'login id mismatch'; end if;
  if exists (select 1 from public.accounts a where a.user_id = v_uid) then raise exception 'account already exists'; end if;
  if p_antisocial_at is null then raise exception 'antisocial agreement required'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'name required'; end if;

  v_id := 'c' || (extract(epoch from clock_timestamp()) * 1000)::bigint::text;
  insert into public.companies (id, name, role, status, representative_name, invoice_number, antisocial_agreed_at, antisocial_version)
  values (v_id, p_name, 'contractor', 'pending', p_representative, p_invoice_number, p_antisocial_at, p_antisocial_version);
  insert into public.accounts (user_id, company_id, staff_id, role, login_id)
  values (v_uid, v_id, null, 'company_admin', lower(btrim(p_login_id)));
  return v_id;
end $$;

-- 8-6. スタッフのログインアカウントを紐づける(管理者が Auth の signUp で作った直後に呼ぶ)
create or replace function public.attach_staff_account(p_staff_id text, p_login_id text, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  s public.staffs;
  v_email text;
begin
  if not public.app_is_company_admin() then raise exception 'forbidden'; end if;
  select * into s from public.staffs where id = p_staff_id;
  if not found or s.user_id is distinct from public.app_company_id() then raise exception 'forbidden: not your staff'; end if;
  select u.email into v_email from auth.users u where u.id = p_user_id;
  if v_email is distinct from public.app_login_email(p_login_id) then raise exception 'login id mismatch'; end if;
  if exists (select 1 from public.accounts a where a.user_id = p_user_id) then raise exception 'account already exists'; end if;
  insert into public.accounts (user_id, company_id, staff_id, role, login_id)
  values (p_user_id, s.user_id, s.id, case when s.role = 'admin' then 'company_admin' else 'staff' end, lower(btrim(p_login_id)));
end $$;

-- 8-7. 会社の審査(運営のみ)
create or replace function public.set_company_status(p_company_id text, p_status text)
returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  if not public.app_is_platform_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'invalid status'; end if;
  update public.companies set status = p_status where id = p_company_id;
end $$;

revoke all on function
  public.get_visible_job_secrets(), public.grant_job_access(text, text, text[], boolean, jsonb),
  public.revoke_job_access(text, text), public.record_staff_pledge(text, text, text), public.get_my_job_access(),
  public.register_company(text, text, text, text, timestamptz, text), public.attach_staff_account(text, text, uuid),
  public.set_company_status(text, text), public.audit_write(text, text, text, jsonb)
  from public, anon;
grant execute on function
  public.get_visible_job_secrets(), public.grant_job_access(text, text, text[], boolean, jsonb),
  public.revoke_job_access(text, text), public.record_staff_pledge(text, text, text), public.get_my_job_access(),
  public.register_company(text, text, text, text, timestamptz, text), public.attach_staff_account(text, text, uuid),
  public.set_company_status(text, text)
  to authenticated;
