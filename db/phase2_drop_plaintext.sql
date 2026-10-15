-- Phase 2 後始末: 切り替えが完了し、ログインできることを確認してから実行する(取り消せない)。
--   * 平文/簡易暗号のパスワードとログインIDの列を削除
--   * jobs に残っている秘匿項目(job_secrets に複製済み)を消す
--
-- 実行前の確認:
--   select count(*) from public.job_secrets;          -- 案件数と一致すること
--   select count(*) from public.accounts;             -- 会社数 + スタッフ数と一致すること
--   (全員が新しいパスワードでログインできること)

alter table public.companies drop column if exists password;
alter table public.companies drop column if exists login_id;
alter table public.staffs    drop column if exists password;
alter table public.staffs    drop column if exists login_id;

-- jobs の秘匿3列は API から読めないが、DB 上に平文が残るため消す(description は NOT NULL の場合に備えて空文字)
update public.jobs set description = '', detailed_description = null, exact_location = null;
