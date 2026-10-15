import { AUTH_MODE } from './supabase';

/**
 * 認証モードでは、機密列(companies/staffs の password・login_id、jobs の秘匿3列)が列権限で
 * 読み取り不可になる(db/phase2_auth_rls.sql)。そのため `select('*')` は権限エラーになり、
 * 読める列を明示して取得する。レガシーモードは従来どおり '*'。
 */
const COMPANY_COLUMNS = [
  'id', 'name', 'role', 'status', 'invoice_number', 'representative_name', 'email', 'website',
  'address', 'pr_text', 'company_type', 'contract_template', 'contract_pdf',
  'antisocial_agreed_at', 'antisocial_version',
].join(',');

const STAFF_COLUMNS = [
  'id', 'user_id', 'name', 'masked_name', 'base_location', 'nearest_station', 'preferred_area',
  'price', 'skills', 'carriers', 'experience', 'pr_text', 'completed_trainings', 'has_certificate', 'role',
].join(',');

const JOB_COLUMNS = [
  'id', 'title', 'lat', 'lng', 'author_id', 'price', 'location_name', 'work_hours', 'requirements',
  'role_type', 'sales_channel', 'carrier', 'event_date', 'application_deadline', 'work_location',
  'is_urgent', 'allowed_company_ids',
].join(',');

export const COMPANY_SELECT = AUTH_MODE ? COMPANY_COLUMNS : '*';
export const STAFF_SELECT = AUTH_MODE ? STAFF_COLUMNS : '*';
export const JOB_SELECT = AUTH_MODE ? JOB_COLUMNS : '*';
