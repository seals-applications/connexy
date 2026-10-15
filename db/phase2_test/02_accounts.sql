-- migration 後に実行: 審査中の会社と、各ユーザーの Auth アカウント
update public.companies set status = 'pending' where id = 'cP';

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@accounts.connexy.invalid'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@accounts.connexy.invalid'),
  ('00000000-0000-0000-0000-0000000000b2', 'sb2@accounts.connexy.invalid'),
  ('00000000-0000-0000-0000-0000000000b3', 'sb3@accounts.connexy.invalid'),
  ('00000000-0000-0000-0000-0000000000c1', 'c@accounts.connexy.invalid'),
  ('00000000-0000-0000-0000-0000000000d1', 'p@accounts.connexy.invalid'),
  ('00000000-0000-0000-0000-0000000000f1', 'admin@accounts.connexy.invalid');

insert into public.accounts (user_id, company_id, staff_id, role, login_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'cA', 'sA1', 'company_admin', 'a'),
  ('00000000-0000-0000-0000-0000000000b1', 'cB', 'sB1', 'company_admin', 'b'),
  ('00000000-0000-0000-0000-0000000000b2', 'cB', 'sB2', 'staff',         'sb2'),
  ('00000000-0000-0000-0000-0000000000b3', 'cB', 'sB3', 'staff',         'sb3'),
  ('00000000-0000-0000-0000-0000000000c1', 'cC', 'sC1', 'company_admin', 'c'),
  ('00000000-0000-0000-0000-0000000000d1', 'cP', null,  'company_admin', 'p'),
  ('00000000-0000-0000-0000-0000000000f1', null, null,  'platform_admin', 'admin');
