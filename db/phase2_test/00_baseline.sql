-- Phase 2 RLS テスト用の「再構成した」ベースライン(本番のスキーマはリポジトリに無いため、アプリが使う列から復元)。
-- Supabase の auth スキーマ/ロールの最小スタブも含む。**本番では実行しない**(テスト用コンテナ専用)。

create schema if not exists auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema public, auth to anon, authenticated;
grant select on auth.users to authenticated;  -- 本番では authenticated は auth.users を読めない。下の test では SECURITY DEFINER 経由のみ確認

create table public.companies (
  id text primary key, name text not null, role text, login_id text, password text
);
create table public.staffs (
  id text primary key, user_id text references public.companies(id), name text, phone text,
  completed_trainings text[], login_id text, password text, role text
);
create table public.jobs (
  id text primary key, title text, author_id text references public.companies(id),
  description text, detailed_description text, exact_location text,
  allowed_company_ids text[], requirements text
);
create table public.talents (
  id text primary key, name text, description text, lat double precision, lng double precision,
  user_id text references public.companies(id), price numeric, skills text[], pr_text text, experience text,
  preferred_area text, location_name text, company_name text, masked_name text, base_location text,
  nearest_station text, carriers text[], available_dates text, completed_trainings text[], has_certificate boolean
);
create table public.contract_tasks (
  id text primary key, job_id text, client_id text, agency_id text, client_name text, worker_name text,
  status text, evaluations jsonb
);
create table public.announcements (id text primary key, title text, body text);

-- 旧(レガシー)状態: anon に全開放
grant all on all tables in schema public to anon, authenticated;
