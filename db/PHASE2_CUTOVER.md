# Phase 2 切り替え手順(Supabase Auth + RLS)

元請け契約対応の Phase 2。**anon キーで全データが読み書きできる状態**をやめ、ログイン(Supabase Auth)と行単位のアクセス制御(RLS)に切り替える。
アプリは `VITE_AUTH_MODE=supabase` でビルドしたときだけ認証モードになる(未設定なら従来どおり)。**DB の切り替えとアプリの切り替えは同時に行う**
(DB だけ先に変えるとレガシーのアプリが動かなくなり、アプリだけ先に変えるとログインできない)。

> 実案件を載せるのは、この切り替えが済んでから。

## 本番の事前確認(2026-10-15 実施、読み取りのみ)

- 現在の本番DBは**デモ用データのみ**(会社8・スタッフ28・案件305・契約タスク91)。実ユーザーはまだいないので、切替の影響は小さい。
- 本番に無かった列を確認し、マイグレーションで追加・補完するようにした: `contract_tasks.client_id / agency_id / company_name`(当事者ID。既存行は
  チャットID・案件の掲載者・会社名から補完)、`staffs / talents.has_certificate`、`companies` のプロフィール列。
- 既存会社の `status` は、列追加時に `approved` になる(デモ会社はそのまま使える)。

## 0. 事前準備

- Supabase が停止(無料枠の自動停止)していたら復旧する。ダッシュボードでバックアップ(または別プロジェクトにコピー)を取る。
- できれば**検証用の Supabase プロジェクト**で一度通しで試す(本番と同じ手順)。
- Authentication → Providers → Email で **「Confirm email」を OFF**(ログインIDから作る擬似メールアドレスで運用するため)。
  パスワード最小長(既定 6 文字)も確認する。
- 先に `db/phase1_3_consent_columns.sql` を実行しておく(反社同意の記録列)。

## 1. DB マイグレーション

1. SQL Editor で `db/phase2_auth_rls.sql` を実行(何度実行しても安全)。
   - `accounts` / `job_secrets` / `job_access` / `audit_log` などを作り、RLS を有効化、anon を全拒否、機密列を列権限で読み取り不可にする。
   - 既存の案件の秘匿項目(業務内容・詳細・店舗名)を `job_secrets` に**コピー**する。確定済みの案件は `job_access` に移行する。
2. **この時点でレガシーのアプリは動かなくなる**。手順 2〜4 を続けて行う。

## 2. アカウント移行(手元の端末で)

service_role キー(ダッシュボード → Project Settings → API)が必要。**キーはチャット・リポジトリ・CI に載せない。**

```bash
# ドライラン(何も書き込まない)
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node db/phase2_migrate_accounts.mjs

# 実行(初期パスワードを新規発行して CSV に出力)
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node db/phase2_migrate_accounts.mjs --apply
```

- 既存パスワードを再利用したい場合(6 文字以上のみ。テスト環境向け)は `--reuse-passwords` を付ける。
- 出力された `phase2_accounts_*.csv`(.gitignore 済み)に、ログインIDと初期パスワードが入る。各社・各スタッフへ安全な方法で渡し、**渡し終えたら破棄**する。
- ログインIDの規則は従来と同じ。DB に login_id が無いスタッフは `<会社ID>_s<連番>` を使う。

## 3. 審査(承認)の運用

- 新規登録した会社は `status = 'pending'`(審査中)で、ログインしても何も見えない(ログイン画面で審査中と表示)。
- 承認は SQL Editor で:
  ```sql
  update public.companies set status = 'approved' where id = '<会社ID>';
  ```
  (SQL Editor からの操作は JWT が無いため、審査ガードの対象外=運営操作として通る)
- 運営アカウントがアプリ内から審査する場合は `accounts.role = 'platform_admin'` のアカウントでログインして `set_company_status` を使う
  (現状、アプリ内の審査画面は未実装)。

## 4. アプリの切り替え

1. GitHub → Settings → Secrets and variables → Actions → **Variables** に `VITE_AUTH_MODE` = `supabase` を追加。
2. `Deploy static content to Pages` ワークフローを手動実行(または main へ push)。
3. ログインして確認:
   - 会社アカウントでログイン → 案件一覧、自社案件の詳細(店舗名・住所)が見える
   - 他社の案件では詳細がマスクされる
   - 二次委託の確定 → 受注側の担当者が**誓約書に同意するまで**詳細が出ない
   - スタッフの追加(ログインID・パスワード)→ そのスタッフでログインできる
   - 未ログインでブラウザの開発者ツールから `companies` / `jobs` を直接叩いても 401/403 になる

## 5. 後始末(ログイン確認後)

`db/phase2_drop_plaintext.sql` を実行(**取り消せない**):
平文パスワード・ログインIDの列を削除し、`jobs` に残っている秘匿項目を消す。実行前のチェックはファイル冒頭に記載。

## ロールバック

切り替え後に問題が出たら、アプリを `VITE_AUTH_MODE` 未設定で再デプロイしても、DB は RLS で閉じたままなので**レガシーのアプリは動かない**。
戻す場合は次を SQL Editor で実行(RLS を無効化してレガシーに戻す。データは残る。後始末(手順 5)前に限る):

```sql
alter table public.companies disable row level security;
alter table public.staffs disable row level security;
alter table public.jobs disable row level security;
alter table public.talents disable row level security;
alter table public.contract_tasks disable row level security;
alter table public.announcements disable row level security;
grant all on public.companies, public.staffs, public.jobs, public.talents, public.contract_tasks, public.announcements to anon;
```

## 仕様メモ・制約

- **開示の判定はサーバー側**: 案件の業務内容・店舗名・詳細住所は `job_secrets` にあり、`get_visible_job_secrets()` でのみ取得できる。
  対象は「自社案件」と「二次委託が確定し(`job_access`)、担当者本人が誓約済みの案件」。他社が閲覧した記録は `audit_log`(`job_secret_view`)に残る。
- 会社の管理者(`company_admin`)だけが案件・スタッフ・人材を作成/更新できる。一般スタッフは割り当てられたチャットだけを見られる。
- スタッフのパスワード再設定は管理者が行える(`admin_update_staff_login`)。**ログインIDの変更は未対応**(スタッフを作り直す)。
- 会社プロフィール(メール・住所・PR 等)は従来どおり一部が端末内保存。DB 保存への移行は別途。
- 認証モードではオフライン用のローカルデモデータへフォールバックしない(通信できなければエラー)。テスト用の簡易ログインも出さない。
- RLS のテスト: `bash db/phase2_test/run.sh`(SQL のみ)、`bash db/phase2_test/e2e/run.sh`(PostgREST + supabase-js)。どちらも使い捨ての Docker コンテナ。
