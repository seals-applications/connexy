-- Phase 1-3: アカウント登録時の同意(反社会的勢力に関する表明・保証)を companies に記録するための列。
-- 実行しなくてもアプリは動く(列が無い場合は従来どおりの最小項目で登録し、同意の記録は端末内のみになる)。
-- Supabase の SQL Editor で実行すると、同意の版と日時が会社ごとに保存される。
-- 何度実行しても安全(if not exists)。

alter table public.companies add column if not exists antisocial_agreed_at timestamptz;
alter table public.companies add column if not exists antisocial_version text;

-- registerCompany が最初に送る項目。無いと最小項目へフォールバックして請求書番号・代表者名も保存されないため、あわせて追加しておく。
alter table public.companies add column if not exists invoice_number text;
alter table public.companies add column if not exists representative_name text;
