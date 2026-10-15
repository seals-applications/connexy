import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://snoccydfbrbxupembsar.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub2NjeWRmYnJieHVwZW1ic2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTY0MzgsImV4cCI6MjA5NTk5MjQzOH0.7_4ac3jn0QOZ4wAFGgQSis0OIM6CEGCyQyoM7yspSPY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 認証モード(Phase 2)。`VITE_AUTH_MODE=supabase` でビルドしたときだけ有効。
 *  - ログインは Supabase Auth(ログインIDから作る擬似メールアドレス + パスワード)
 *  - データアクセスは RLS で制限され、オフライン用のローカルモックには**フォールバックしない**
 *  - 案件の秘匿項目は job_secrets / RPC 経由
 * 既定(未設定)は従来どおりのレガシー動作。切り替えは db/PHASE2_CUTOVER.md の手順で、DB 側の
 * マイグレーション(db/phase2_auth_rls.sql)と同時に行うこと。
 */
export const AUTH_MODE = import.meta.env.VITE_AUTH_MODE === 'supabase';

/** ログインID → Supabase Auth 用の擬似メールアドレス(db の app_login_email() と同じ規則)。 */
export const loginIdToEmail = (loginId: string): string =>
  `${loginId.trim().toLowerCase()}@accounts.connexy.invalid`;

/**
 * 現在のログインを切り替えずに別アカウントを作るための使い捨てクライアント。
 * (管理者がスタッフのログインアカウントを作るとき、signUp で管理者のセッションが
 *  新規スタッフに置き換わらないようにする。セッションは保存しない)
 */
export const createEphemeralClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'connexy-ephemeral-auth',
    },
  });
