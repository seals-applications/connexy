-- ==============================================================================
-- Connexy RLS (Row Level Security) ポリシー設定スクリプト
-- ==============================================================================
-- このスクリプトはSupabaseのSQLエディタで実行して、各テーブルへのアクセス制御を設定します。
-- ※本番環境へデプロイする前に、必ず検証環境でテストしてください。

-- 1. companies（企業）テーブル
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 企業情報の参照: 誰でも参照可能（プラットフォーム上の公開プロフィールとして扱う場合）
CREATE POLICY "Allow public read access for companies"
  ON public.companies FOR SELECT
  USING (true);

-- 企業情報の更新: 自身の企業レコードのみ更新可能
-- （ここでは auth.uid() が企業IDと一致するかを確認する想定）
CREATE POLICY "Allow update for own company profile"
  ON public.companies FOR UPDATE
  USING (auth.uid() = id);

-- 2. staffs（スタッフ）テーブル
ALTER TABLE public.staffs ENABLE ROW LEVEL SECURITY;

-- スタッフの参照: 所属企業のユーザーのみ参照可能
CREATE POLICY "Allow read for own company staffs"
  ON public.staffs FOR SELECT
  USING (auth.uid() = user_id);

-- スタッフの作成・更新・削除: 所属企業のユーザーのみ可能
CREATE POLICY "Allow all actions for own company staffs"
  ON public.staffs FOR ALL
  USING (auth.uid() = user_id);

-- 3. jobs（案件）テーブル
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- 案件の参照: 案件は全ユーザーが検索・参照可能
CREATE POLICY "Allow public read access for jobs"
  ON public.jobs FOR SELECT
  USING (true);

-- 案件の作成・更新・削除: 案件の作成者（author_id）のみ可能
CREATE POLICY "Allow all actions for job authors"
  ON public.jobs FOR ALL
  USING (auth.uid() = author_id);

-- 4. talents（人材）テーブル
ALTER TABLE public.talents ENABLE ROW LEVEL SECURITY;

-- 人材の参照: 誰でも参照可能（マッチング検索用）
CREATE POLICY "Allow public read access for talents"
  ON public.talents FOR SELECT
  USING (true);

-- 人材の作成・更新: 人材を作成したユーザー（所属元企業）のみ可能
CREATE POLICY "Allow all actions for talent owners"
  ON public.talents FOR ALL
  USING (auth.uid() = user_id);

-- 5. contract_tasks（契約タスク・入出金明細）テーブル
ALTER TABLE public.contract_tasks ENABLE ROW LEVEL SECURITY;

-- タスクの参照: 関与する企業（agency_id または 発注側企業）のみ参照可能
CREATE POLICY "Allow read for involved parties"
  ON public.contract_tasks FOR SELECT
  USING (auth.uid() = agency_id OR auth.uid()::text = (SELECT author_id FROM public.jobs WHERE id = public.contract_tasks.job_id)::text);

-- ==============================================================================
-- ※注意: 上記は基本的なRLSのテンプレートです。
-- 実際の要件に合わせて、カラム単位の制限や、より複雑なロールベースアクセス制御を追加してください。
-- ==============================================================================
