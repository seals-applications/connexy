-- テスト用データ。会社: A(掲載者), B(受注側), C(無関係), P(審査中), 運営
insert into public.companies (id, name, role, login_id, password) values
  ('cA', '会社A', 'contractor', 'a', 'secretA'),
  ('cB', '会社B', 'contractor', 'b', 'secretB'),
  ('cC', '会社C', 'contractor', 'c', 'secretC'),
  ('cP', '会社P', 'contractor', 'p', 'secretP');

insert into public.staffs (id, user_id, name, role) values
  ('sA1', 'cA', 'A管理者', 'admin'),
  ('sB1', 'cB', 'B管理者', 'admin'),
  ('sB2', 'cB', 'B担当', 'staff'),
  ('sB3', 'cB', 'B非担当', 'staff'),
  ('sC1', 'cC', 'C管理者', 'admin');

insert into public.jobs (id, title, author_id, description, detailed_description, exact_location, allowed_company_ids) values
  ('j1', '案件1', 'cA', '秘密の業務内容', '秘密の詳細', '渋谷◯◯店', null),
  ('j2', '案件2(限定)', 'cA', '秘密2', '秘密詳細2', '新宿◯◯店', array['cB']);

insert into public.talents (id, name, user_id, masked_name, company_name, price) values
  ('tB', '山田太郎', 'cB', 'Y.T', '会社B', 20000);

-- j1 は B に二次委託確定(B担当 sB2 が割当、旧データ: 誓約なし)。直接チャット cA-cB、cC は無関係。
insert into public.contract_tasks (id, job_id, client_name, worker_name, company_name, status, evaluations) values
  ('ct1', 'j1', '会社A', 'B担当', '会社B', 'confirmed', '{}'),
  ('chat_cA_cB', 'chat', '会社A', '会社B', null, 'chatting', '{"jobStates":{"j1":{"status":"confirmed","staffId":"sB2"}}}'),
  ('chat_cA_cC', 'chat', '会社A', '会社C', null, 'chatting', '{}'),
  ('chat_group_j1_cB', 'chat', '会社A', '現場', null, 'confirmed', '{"assignedStaffIds":["sB2"]}');

insert into public.announcements (id, title) values ('n1', 'お知らせ');
