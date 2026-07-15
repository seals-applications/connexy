import { supabase } from '../lib/supabase';

// ユーザーの型定義
export interface User {
  id: string;
  name: string;
  role: 'contractor' | 'worker' | 'admin';
  loginId?: string;
  password?: string;
  status?: 'pending' | 'approved' | 'rejected';
  invoiceNumber?: string;
  staffId?: string;
  staffName?: string;
  staffRole?: 'admin' | 'staff';
  representativeName?: string;
  email?: string;
  website?: string;
  address?: string;
  prText?: string;
  companyType?: 'client' | 'agency' | 'both';
}

// 評価(Evaluation)の型定義
export interface Evaluation {
  id: string;
  rating: number; // 1 to 5 stars
  comment?: string;
  evaluatorName: string;
  createdAt: string;
  hasLateness?: boolean;
}

// 研修(Training)の型定義
export interface Training {
  id: string;
  title: string;
  zoomLink: string;
}

// 案件(Job)の型定義
export interface Job {
  id: string;
  title: string;
  description: string;
  lat: number; // 曖昧な緯度（市区町村の中心）
  lng: number; // 曖昧な経度（市区町村の中心）
  exactLat?: number; // 正確な緯度
  exactLng?: number; // 正確な経度
  authorId: string;
  price: number;
  locationName?: string;
  workHours?: string;
  requirements?: string[];
  detailedDescription?: string;
  roleType?: 'キャンペーンクルー' | 'クローザー' | 'ディレクター';
  salesChannel?: '量販店' | 'ショップ';
  carrier?: 'docomo' | 'au/UQmobile' | 'SoftBank/Y!mobile' | 'BB';
  eventDate?: string;
  applicationDeadline?: string;
  workLocation?: '店内' | '外販（複合施設など）' | '外販（スーパーなど）' | '外販（その他）';
  isUrgent?: boolean;
  allowedCompanyIds?: string[];
  exactLocation?: string;

  // 追加拡張フィールド（requirementsの配列要素としてシリアライズしてDB保存）
  dailyPrices?: { [date: string]: number };
  expenses?: {
    transportType: 'none' | 'pay_separate' | 'arranged' | 'actual' | 'flat';
    transportValue?: number;
    accommodationType: 'none' | 'pay_separate' | 'arranged' | 'actual' | 'flat';
    accommodationValue?: number;
  };
  status?: 'active' | 'cancelled';
  jobCode?: string;
}

// Hashing function to get consistent job codes for legacy seed jobs
const getConsistentJobCode = (jobId: string) => {
  let hash = 0;
  for (let i = 0; i < jobId.length; i++) {
    hash = jobId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const codeNum = Math.abs(hash % 900000) + 100000;
  return `JOB-${codeNum}`;
};

// 人材(Talent)の型定義
export interface Talent {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  userId: string;
  price: number;
  skills: string[];
  prText?: string;
  experience?: string;
  preferredArea?: string;
  locationName: string;
  companyName: string;
  maskedName: string;
  baseLocation?: string;
  nearestStation?: string;
  carriers?: string[];
  availableDates?: string;
  completedTrainings?: string[];
  hasCertificate?: boolean;
}

// 登録済みスタッフ(Staff)の型定義
export interface Staff {
  id: string;
  userId: string;
  name: string;
  maskedName: string;
  baseLocation: string;
  nearestStation?: string;
  preferredArea?: string;
  price: number;
  skills: string[];
  carriers: string[];
  experience?: string;
  prText?: string;
  completedTrainings?: string[];
  hasCertificate?: boolean;
  role?: 'admin' | 'staff';
  loginId?: string;
  password?: string;
  furigana?: string;
  commuteMethod?: '公共交通機関' | '自家用車';
  gender?: '男性' | '女性';
  birthday?: string;
}

// 契約タスク(ContractTask)の型定義
export interface ContractTask {
  id: string;
  jobId: string;
  jobTitle: string;
  workerName: string;
  companyName: string;
  clientName: string;
  price: number;
  date: string;
  status: 'applying' | 'offered' | 'working' | 'report_pending' | 'completed' | 'disputed' | 'rejected';
  disputedReason?: string;
  evaluations?: {
    byClient?: Evaluation;
    byWorker?: Evaluation;
    byStaffToAgency?: Evaluation;
    byAgencyToStaff?: Evaluation;
    byStaffToField?: Evaluation;
  };
}

// 研修マスタ(DBではなく固定データとする)
const mockTrainings: Training[] = [
  {
    id: 'tr1',
    title: '【基礎】店頭イベント接客マナー研修',
    zoomLink: 'https://zoom.us/j/mock-event-manner'
  },
  {
    id: 'tr2',
    title: '【応用】光回線獲得・クロージング研修',
    zoomLink: 'https://zoom.us/j/mock-closing-skills'
  },
  {
    id: 'tr3',
    title: '【管理者向け】現場責任者（ディレクター）講習',
    zoomLink: 'https://zoom.us/j/mock-director-training'
  }
];

// Helper functions for mapping
const mapJob = (row: any): Job => {
  let lat = Number(row.lat);
  let lng = Number(row.lng);
  if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
    const locName = row.location_name || '';
    if (locName.includes('新宿')) {
      lat = 35.6895; lng = 139.6917;
    } else if (locName.includes('渋谷')) {
      lat = 35.6580; lng = 139.7016;
    } else if (locName.includes('池袋') || locName.includes('豊島')) {
      lat = 35.7295; lng = 139.7109;
    } else if (locName.includes('品川')) {
      lat = 35.6284; lng = 139.7388;
    } else if (locName.includes('秋葉原')) {
      lat = 35.6997; lng = 139.7711;
    } else if (locName.includes('上野')) {
      lat = 35.7138; lng = 139.7773;
    } else if (locName.includes('横浜')) {
      lat = 35.4437; lng = 139.6380;
    } else {
      const offsetLat = (Math.random() - 0.5) * 0.05;
      const offsetLng = (Math.random() - 0.5) * 0.05;
      lat = 35.6812 + offsetLat;
      lng = 139.7671 + offsetLng;
    }
  }

  const requirements: string[] = row.requirements || [];
  let dailyPrices: Job['dailyPrices'] = undefined;
  let expenses: Job['expenses'] = undefined;
  let status: 'active' | 'cancelled' = 'active';
  let jobCode: string | undefined = undefined;

  const cleanRequirements = requirements.filter(req => {
    if (req === '__STATUS_CANCELLED__') {
      status = 'cancelled';
      return false;
    }
    if (req.startsWith('__DAILY_PRICES__::')) {
      try {
        dailyPrices = JSON.parse(req.substring('__DAILY_PRICES__::'.length));
      } catch (e) {
        console.error('Failed to parse daily prices:', e);
      }
      return false;
    }
    if (req.startsWith('__EXPENSES__::')) {
      try {
        expenses = JSON.parse(req.substring('__EXPENSES__::'.length));
      } catch (e) {
        console.error('Failed to parse expenses:', e);
      }
      return false;
    }
    if (req.startsWith('__JOB_CODE__::')) {
      jobCode = req.substring('__JOB_CODE__::'.length);
      return false;
    }
    return true;
  });

  if (!jobCode) {
    jobCode = getConsistentJobCode(row.id);
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    lat,
    lng,
    authorId: row.author_id,
    price: row.price,
    locationName: row.location_name || '千代田区の店舗',
    workHours: row.work_hours,
    requirements: cleanRequirements,
    detailedDescription: row.detailed_description,
    roleType: row.role_type,
    salesChannel: row.sales_channel,
    carrier: row.carrier,
    eventDate: row.event_date,
    applicationDeadline: row.application_deadline,
    workLocation: row.work_location,
    isUrgent: row.is_urgent,
    allowedCompanyIds: row.allowed_company_ids,
    exactLocation: row.exact_location,
    dailyPrices,
    expenses,
    status,
    jobCode
  };
};

const unmapJob = (job: Partial<Job>): any => {
  const row: any = { ...job };
  if ('status' in row) delete row.status;
  if ('jobCode' in row) delete row.jobCode;
  if ('authorId' in job) { row.author_id = job.authorId; delete row.authorId; }
  if ('locationName' in job) { row.location_name = job.locationName; delete row.locationName; }
  if ('workHours' in job) { row.work_hours = job.workHours; delete row.workHours; }
  if ('detailedDescription' in job) { row.detailed_description = job.detailedDescription; delete row.detailedDescription; }
  if ('roleType' in job) { row.role_type = job.roleType; delete row.roleType; }
  if ('salesChannel' in job) { row.sales_channel = job.salesChannel; delete row.salesChannel; }
  if ('eventDate' in job) { row.event_date = job.eventDate; delete row.eventDate; }
  if ('applicationDeadline' in job) { row.application_deadline = job.applicationDeadline; delete row.applicationDeadline; }
  if ('workLocation' in job) { row.work_location = job.workLocation; delete row.workLocation; }
  if ('isUrgent' in job) { row.is_urgent = job.isUrgent; delete row.isUrgent; }
  if ('allowedCompanyIds' in job) { row.allowed_company_ids = job.allowedCompanyIds; delete row.allowedCompanyIds; }
  if ('exactLocation' in job) { row.exact_location = job.exactLocation; delete row.exactLocation; }

  // Serialize dailyPrices, expenses and jobCode into requirements array
  const requirements = [...(job.requirements || [])];
  if (job.status === 'cancelled') {
    requirements.push('__STATUS_CANCELLED__');
  }
  if (job.dailyPrices) {
    requirements.push(`__DAILY_PRICES__::${JSON.stringify(job.dailyPrices)}`);
  }
  if (job.expenses) {
    requirements.push(`__EXPENSES__::${JSON.stringify(job.expenses)}`);
  }
  if (job.jobCode) {
    requirements.push(`__JOB_CODE__::${job.jobCode}`);
  }
  row.requirements = requirements;

  delete row.dailyPrices;
  delete row.expenses;

  return row;
};

const mapTalent = (row: any): Talent => {
  let lat = Number(row.lat);
  let lng = Number(row.lng);
  if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
    const locName = row.location_name || '';
    if (locName.includes('新宿')) {
      lat = 35.6895; lng = 139.6917;
    } else if (locName.includes('渋谷')) {
      lat = 35.6580; lng = 139.7016;
    } else if (locName.includes('池袋') || locName.includes('豊島')) {
      lat = 35.7295; lng = 139.7109;
    } else if (locName.includes('品川')) {
      lat = 35.6284; lng = 139.7388;
    } else {
      const offsetLat = (Math.random() - 0.5) * 0.05;
      const offsetLng = (Math.random() - 0.5) * 0.05;
      lat = 35.6812 + offsetLat;
      lng = 139.7671 + offsetLng;
    }
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    lat,
    lng,
    userId: row.user_id,
    price: row.price,
    skills: row.skills || [],
    prText: row.pr_text,
    experience: row.experience,
    preferredArea: row.preferred_area,
    locationName: row.location_name || '東京都千代田区',
    companyName: row.company_name,
    maskedName: row.masked_name,
    baseLocation: row.base_location,
    nearestStation: row.nearest_station,
    carriers: row.carriers || [],
    availableDates: row.available_dates,
    completedTrainings: row.completed_trainings || [],
    hasCertificate: row.has_certificate
  };
};

const unmapTalent = (talent: Partial<Talent>): any => {
  const row: any = { ...talent };
  if ('userId' in talent) { row.user_id = talent.userId; delete row.userId; }
  if ('prText' in talent) { row.pr_text = talent.prText; delete row.prText; }
  if ('preferredArea' in talent) { row.preferred_area = talent.preferredArea; delete row.preferredArea; }
  if ('locationName' in talent) { row.location_name = talent.locationName; delete row.locationName; }
  if ('companyName' in talent) { row.company_name = talent.companyName; delete row.companyName; }
  if ('maskedName' in talent) { row.masked_name = talent.maskedName; delete row.maskedName; }
  if ('baseLocation' in talent) { row.base_location = talent.baseLocation; delete row.baseLocation; }
  if ('nearestStation' in talent) { row.nearest_station = talent.nearestStation; delete row.nearestStation; }
  if ('availableDates' in talent) { row.available_dates = talent.availableDates; delete row.availableDates; }
  if ('completedTrainings' in talent) { row.completed_trainings = talent.completedTrainings; delete row.completedTrainings; }
  if ('hasCertificate' in talent) { row.has_certificate = talent.hasCertificate; delete row.hasCertificate; }
  return row;
};

const mapStaff = (row: any): Staff => {
  const localRole = localStorage.getItem('staff_role_' + row.id) as 'admin' | 'staff' | null;
  const localLogin = localStorage.getItem('staff_login_' + row.id);
  const localPassword = localStorage.getItem('staff_password_' + row.id);

  const completedTrainings = row.completed_trainings || [];
  let furigana = '';
  let commuteMethod: '公共交通機関' | '自家用車' | undefined = undefined;
  let gender: '男性' | '女性' | undefined = undefined;
  let birthday = '';

  completedTrainings.forEach((t: string) => {
    if (t.startsWith('STAFF_FURIGANA_')) {
      furigana = t.replace('STAFF_FURIGANA_', '');
    } else if (t.startsWith('STAFF_COMMUTE_')) {
      const val = t.replace('STAFF_COMMUTE_', '');
      if (val === '公共交通機関' || val === '自家用車') {
        commuteMethod = val;
      }
    } else if (t.startsWith('STAFF_GENDER_')) {
      const val = t.replace('STAFF_GENDER_', '');
      if (val === '男性' || val === '女性') {
        gender = val;
      }
    } else if (t.startsWith('STAFF_BIRTHDAY_')) {
      birthday = t.replace('STAFF_BIRTHDAY_', '');
    }
  });

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    maskedName: row.masked_name,
    baseLocation: row.base_location,
    nearestStation: row.nearest_station,
    preferredArea: row.preferred_area,
    price: row.price,
    skills: row.skills || [],
    carriers: row.carriers || [],
    experience: row.experience,
    prText: row.pr_text,
    completedTrainings,
    hasCertificate: row.has_certificate,
    role: localRole || row.role || 'staff',
    loginId: localLogin || row.login_id || '',
    password: localPassword || row.password || '',
    furigana,
    commuteMethod,
    gender,
    birthday
  };
};

const unmapStaff = (staff: Partial<Staff>): any => {
  const row: any = { ...staff };
  if ('userId' in staff) { row.user_id = staff.userId; delete row.userId; }
  if ('maskedName' in staff) { row.masked_name = staff.maskedName; delete row.maskedName; }
  if ('baseLocation' in staff) { row.base_location = staff.baseLocation; delete row.baseLocation; }
  if ('nearestStation' in staff) { row.nearest_station = staff.nearestStation; delete row.nearestStation; }
  if ('preferredArea' in staff) { row.preferred_area = staff.preferredArea; delete row.preferredArea; }
  if ('prText' in staff) { row.pr_text = staff.prText; delete row.prText; }
  if ('completedTrainings' in staff) { row.completed_trainings = staff.completedTrainings; delete row.completedTrainings; }
  if ('hasCertificate' in staff) { row.has_certificate = staff.hasCertificate; delete row.hasCertificate; }
  if ('role' in staff) { row.role = staff.role; }
  if ('loginId' in staff) { row.login_id = staff.loginId; delete row.loginId; }

  // Strip custom fields
  delete row.furigana;
  delete row.commuteMethod;
  delete row.gender;
  delete row.birthday;

  return row;
};

const mapContractTask = (row: any): ContractTask => ({
  id: row.id,
  jobId: row.job_id,
  jobTitle: row.job_title,
  workerName: row.worker_name,
  companyName: row.company_name,
  clientName: row.client_name,
  price: row.price,
  date: row.date,
  status: row.status,
  disputedReason: row.disputed_reason,
  evaluations: row.evaluations || {}
});

const unmapContractTask = (task: Partial<ContractTask>): any => {
  const row: any = { ...task };
  if ('jobId' in task) { row.job_id = task.jobId; delete row.jobId; }
  if ('jobTitle' in task) { row.job_title = task.jobTitle; delete row.jobTitle; }
  if ('workerName' in task) { row.worker_name = task.workerName; delete row.workerName; }
  if ('companyName' in task) { row.company_name = task.companyName; delete row.companyName; }
  if ('clientName' in task) { row.client_name = task.clientName; delete row.clientName; }
  if ('disputedReason' in task) { row.disputed_reason = task.disputedReason; delete row.disputedReason; }
  return row;
};

const mapUser = (row: any): User => {
  const localStatus = localStorage.getItem('company_status_' + row.id) as 'pending' | 'approved' | 'rejected' | null;
  const localInvoice = localStorage.getItem('company_invoice_' + row.id);
  const localRep = localStorage.getItem('company_rep_' + row.id);
  const localEmail = localStorage.getItem('company_email_' + row.id);
  const localWebsite = localStorage.getItem('company_website_' + row.id);
  const localAddress = localStorage.getItem('company_address_' + row.id);
  const localPr = localStorage.getItem('company_pr_' + row.id);
  const localType = localStorage.getItem('company_type_' + row.id) as 'client' | 'agency' | 'both' | null;
  
  const defaultReps: { [key: string]: string } = {
    sigma: 'シグマ 太郎',
    alpha: 'アルファ 健',
    beta: 'ベータ 拓也',
    gamma: 'ガンマ 翔',
    delta: 'デルタ 大介',
    seals: '佐藤 海人',
    freer: '林 克樹',
    cocolabo: '伊内 美伊'
  };

  const defaultEmails: { [key: string]: string } = {
    sigma: 'contact@sigma-comm.co.jp',
    alpha: 'info@alpha-agency.com',
    beta: 'support@beta-corp.jp',
    gamma: 'info@gamma-llc.net',
    delta: 'contact@delta-partners.jp',
    seals: 'info@seals-comm.co.jp',
    freer: 'contact@freer-vision.net',
    cocolabo: 'support@cocolabo-solutions.com'
  };

  const defaultWebsites: { [key: string]: string } = {
    sigma: 'https://sigma-comm.co.jp',
    alpha: 'https://alpha-agency.com',
    beta: 'https://beta-corp.jp',
    gamma: 'https://gamma-llc.net',
    delta: 'https://delta-partners.jp',
    seals: 'https://seals-comm.co.jp',
    freer: 'https://freer-vision.net',
    cocolabo: 'https://cocolabo-solutions.com'
  };

  const defaultAddresses: { [key: string]: string } = {
    sigma: '東京都新宿区西新宿2-8-1',
    alpha: '東京都品川区大崎1-11-1',
    beta: '東京都渋谷区渋谷3-21-3',
    gamma: '神奈川県横浜市中区港町1-1',
    delta: '埼玉県さいたま市大宮区吉敷町1-1',
    seals: '東京都品川区西五反田1-5-1',
    freer: '東京都港区南青山2-2-15',
    cocolabo: '大阪府大阪市北区梅田2-2-2'
  };

  const defaultPrs: { [key: string]: string } = {
    sigma: '全国対応の通信キャリアイベント獲得特化集団。量販店・ショップでの稼働実績多数。',
    alpha: '光回線・モバイルの獲得に特化した営業支援代理店。経験豊富なクローザーが稼働中。',
    beta: 'ディレクターやキャンペーンクルーの手配から現場の運営までワンストップで受託します。',
    gamma: '地域密着型のブース販売と店舗支援が得意です。ドコモ・au等全キャリア対応。',
    delta: '緊急案件の対応力に強み。週末のショップ応援や臨時イベント要員の供給に自信あり。',
    seals: '通信キャリアのイベント代行と人材手配。現場の課題にコミットするプロ集団です。',
    freer: '未来のビジョンをフリーに共創する、モバイル営業代行およびコンサルティング企業。',
    cocolabo: 'コラボレーションによるイノベーション。通信業界の各種ソリューションをご提案。'
  };

  const defaultTypes: { [key: string]: 'client' | 'agency' | 'both' } = {
    sigma: 'both',
    alpha: 'agency',
    beta: 'agency',
    gamma: 'both',
    delta: 'client',
    seals: 'both',
    freer: 'agency',
    cocolabo: 'both'
  };

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    loginId: row.login_id,
    password: row.password,
    status: ['sigma', 'alpha', 'beta', 'gamma', 'delta', 'seals', 'freer', 'cocolabo'].includes(row.id) ? 'approved' : (localStatus || row.status || 'approved'),
    invoiceNumber: localInvoice || row.invoice_number,
    representativeName: localRep || row.representative_name || defaultReps[row.id] || '未登録',
    email: localEmail || row.email || defaultEmails[row.id] || '',
    website: localWebsite || row.website || defaultWebsites[row.id] || '',
    address: localAddress || row.address || defaultAddresses[row.id] || '',
    prText: localPr || row.pr_text || defaultPrs[row.id] || '',
    companyType: localType || row.company_type || defaultTypes[row.id] || 'both'
  };
};
const initializeDefaultStaffLogins = (allStaffsData: any[]) => {
  const companyGroups: { [key: string]: any[] } = {};
  allStaffsData.forEach(row => {
    if (!companyGroups[row.user_id]) companyGroups[row.user_id] = [];
    companyGroups[row.user_id].push(row);
  });
  
  for (const companyId of Object.keys(companyGroups)) {
    const sorted = [...companyGroups[companyId]].sort((a, b) => {
      const idA = a.id !== undefined && a.id !== null ? String(a.id) : '';
      const idB = b.id !== undefined && b.id !== null ? String(b.id) : '';
      return idA.localeCompare(idB);
    });
    sorted.forEach((row, index) => {
      const existingLogin = localStorage.getItem('staff_login_' + row.id);
      if (!existingLogin) {
        localStorage.setItem('staff_login_' + row.id, `${companyId}_s${index + 1}`);
        localStorage.setItem('staff_password_' + row.id, 'pass');
      }
    });
  }
};

// --- OFFLINE LOCAL DB FALLBACK SYSTEM ---
let useOfflineMock = false;

// Attempt to detect if running in an offline or sandboxed environment
if (typeof window !== 'undefined') {
  if (localStorage.getItem('connexy_is_offline') === 'true' || !navigator.onLine) {
    useOfflineMock = true;
  }
}

// Persisted localStorage helpers
const getOfflineData = (table: string, defaultData: any[]): any[] => {
  if (typeof window === 'undefined') return defaultData;
  const data = localStorage.getItem('offline_db_' + table);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultData;
    }
  }
  localStorage.setItem('offline_db_' + table, JSON.stringify(defaultData));
  return defaultData;
};

const saveOfflineData = (table: string, data: any[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('offline_db_' + table, JSON.stringify(data));
  }
};

// Default seed data for offline mode
const defaultOfflineCompanies = [
  { id: 'sigma', name: '株式会社シグマ通信', role: 'contractor', login_id: 'sigma', password: 'pass', status: 'approved', representative_name: 'シグマ 太郎', email: 'contact@sigma-comm.co.jp', address: '東京都新宿区西新宿2-8-1', company_type: 'both' },
  { id: 'alpha', name: '株式会社アルファ', role: 'contractor', login_id: 'alpha', password: 'pass', status: 'approved', representative_name: 'アルファ 健', email: 'info@alpha-agency.com', address: '東京都品川区大崎1-11-1', company_type: 'agency' },
  { id: 'beta', name: 'ベータ株式会社', role: 'contractor', login_id: 'beta', password: 'pass', status: 'approved', representative_name: 'ベータ 拓也', email: 'support@beta-corp.jp', address: '東京都渋谷区渋谷3-21-3', company_type: 'agency' },
  { id: 'gamma', name: '合同会社ガンマ', role: 'contractor', login_id: 'gamma', password: 'pass', status: 'approved', representative_name: 'ガンマ 翔', email: 'info@gamma-llc.net', address: '神奈川県横浜市中区港町1-1', company_type: 'both' },
  { id: 'delta', name: 'デルタ合同会社', role: 'contractor', login_id: 'delta', password: 'pass', status: 'approved', representative_name: 'デルタ 大介', email: 'contact@delta-partners.jp', address: '埼玉県さいたま市吉敷町1-1', company_type: 'client' },
  { id: 'seals', name: '株式会社SEALs', role: 'contractor', login_id: 'seals', password: 'pass', status: 'approved', representative_name: '佐藤 海人', email: 'info@seals-comm.co.jp', address: '東京都品川区西五反田1-5-1', company_type: 'both' },
  { id: 'freer', name: '株式会社FreeR VisioN', role: 'contractor', login_id: 'freer', password: 'pass', status: 'approved', representative_name: '林 克樹', email: 'contact@freer-vision.net', address: '東京都港区南青山2-2-15', company_type: 'agency' },
  { id: 'cocolabo', name: 'ココラボ・ソリューションズ', role: 'contractor', login_id: 'cocolabo', password: 'pass', status: 'approved', representative_name: '伊内 美伊', email: 'support@cocolabo-solutions.com', address: '大阪府大阪市北区梅田2-2-2', company_type: 'both' }
];

const defaultOfflineStaffs = [
  { id: 's1', user_id: 'sigma', name: 'シグマ 太郎', role: 'admin', login_id: 'sigma_s1', password: 'pass', base_location: '東京都新宿区', nearest_station: '新宿駅', price: 15000, skills: ['イベント運営', 'キャンペーンMC'], completed_trainings: [] },
  { id: 's2', user_id: 'sigma', name: 'シグマ 次郎', role: 'staff', login_id: 'sigma_s2', password: 'pass', base_location: '東京都渋谷区', nearest_station: '渋谷駅', price: 12000, skills: ['モバイル販売'], completed_trainings: [] },
  { id: 's3', user_id: 'sigma', name: 'シグマ 三郎', role: 'staff', login_id: 'sigma_s3', password: 'pass', base_location: '神奈川県横浜市', nearest_station: '横浜駅', price: 13000, skills: ['イベント運営'], completed_trainings: [] },
  { id: 's4', user_id: 'alpha', name: 'アルファ 一郎', role: 'staff', login_id: 'alpha_s1', password: 'pass', base_location: '東京都品川区', nearest_station: '大崎駅', price: 14000, skills: ['モバイル販売'], completed_trainings: [] },
  { id: 's5', user_id: 'alpha', name: 'アルファ 二郎', role: 'staff', login_id: 'alpha_s2', password: 'pass', base_location: '千葉県船橋市', nearest_station: '船橋駅', price: 12000, skills: ['ブース獲得'], completed_trainings: [] },
  { id: 's6', user_id: 'alpha', name: 'アルファ 三郎', role: 'staff', login_id: 'alpha_s3', password: 'pass', base_location: '埼玉県さいたま市', nearest_station: '大宮駅', price: 13000, skills: ['イベント運営'], completed_trainings: [] },
  { id: 's7', user_id: 'beta', name: 'ベータ 一郎', role: 'staff', login_id: 'beta_s1', password: 'pass', base_location: '東京都渋谷区', nearest_station: '渋谷駅', price: 14000, skills: ['モバイル販売'], completed_trainings: [] },
  { id: 's8', user_id: 'beta', name: 'ベータ 二郎', role: 'staff', login_id: 'beta_s2', password: 'pass', base_location: '神奈川県川崎市', nearest_station: '川崎駅', price: 12000, skills: ['ブース獲得'], completed_trainings: [] },
  { id: 's9', user_id: 'beta', name: 'ベータ 三郎', role: 'staff', login_id: 'beta_s3', password: 'pass', base_location: '東京都豊島区', nearest_station: '池袋駅', price: 13000, skills: ['イベント運営'], completed_trainings: [] },
  
  { id: 's_seals_admin', user_id: 'seals', name: '岡田 哲弥', role: 'admin', login_id: 'seals_s1', password: 'pass', base_location: '東京都品川区', nearest_station: '五反田駅', price: 16000, skills: ['イベント運営', 'キャンペーンMC'], completed_trainings: [] },
  { id: 's_seals_staff1', user_id: 'seals', name: '中嶋 晴希', role: 'staff', login_id: 'seals_s2', password: 'pass', base_location: '神奈川県川崎市', nearest_station: '川崎駅', price: 13000, skills: ['モバイル販売'], completed_trainings: [] },
  { id: 's_seals_staff2', user_id: 'seals', name: '野田 悠斗', role: 'staff', login_id: 'seals_s3', password: 'pass', base_location: '東京都世田谷区', nearest_station: '下北沢駅', price: 13000, skills: ['イベント運営'], completed_trainings: [] },

  { id: 's_freer_admin', user_id: 'freer', name: '林 一郎', role: 'admin', login_id: 'freer_s1', password: 'pass', base_location: '東京都港区', nearest_station: '表参道駅', price: 16000, skills: ['モバイル販売', 'クローザー'], completed_trainings: [] },
  { id: 's_freer_staff1', user_id: 'freer', name: '林 二郎', role: 'staff', login_id: 'freer_s2', password: 'pass', base_location: '東京都目黒区', nearest_station: '中目黒駅', price: 13000, skills: ['モバイル販売'], completed_trainings: [] },
  { id: 's_freer_staff2', user_id: 'freer', name: '林 三郎', role: 'staff', login_id: 'freer_s3', password: 'pass', base_location: '神奈川県横浜市', nearest_station: '横浜駅', price: 13000, skills: ['ブース獲得'], completed_trainings: [] },

  { id: 's_cocolabo_admin', user_id: 'cocolabo', name: '二内 美伊', role: 'admin', login_id: 'cocolabo_s1', password: 'pass', base_location: '大阪府大阪市', nearest_station: '梅田駅', price: 16000, skills: ['ディレクター', 'イベントMC'], completed_trainings: [] },
  { id: 's_cocolabo_staff1', user_id: 'cocolabo', name: '三内 美伊', role: 'staff', login_id: 'cocolabo_s2', password: 'pass', base_location: '兵庫県神戸市', nearest_station: '三ノ宮駅', price: 13000, skills: ['モバイル販売'], completed_trainings: [] },
  { id: 's_cocolabo_staff2', user_id: 'cocolabo', name: '四内 美伊', role: 'staff', login_id: 'cocolabo_s3', password: 'pass', base_location: '京都府京都市', nearest_station: '京都駅', price: 13000, skills: ['イベント運営'], completed_trainings: [] }
];

const defaultOfflineJobs = [
  { id: 'j1', title: '【大崎駅】ドコモショップ出張ブース販売イベント要員', description: 'ドコモショップ出張イベントでのブース案内・獲得業務です。経験者優遇。', author_id: 'sigma', price: 15000, location_name: '東京都品川区大崎', work_hours: '10:00 - 19:00', requirements: ['__JOB_CODE__::JOB-100201'], role_type: 'キャンペーンクルー', sales_channel: 'ショップ', carrier: 'docomo', event_date: '2026-07-20', application_deadline: '2026-07-18', work_location: '外販（複合施設など）', is_urgent: true },
  { id: 'j2', title: '【新宿駅】au・UQモバイルの乗り換え案内スタッフ募集', description: '量販店店頭でのau・UQモバイル乗り換え案内クロージング業務です。', author_id: 'alpha', price: 18000, location_name: '東京都新宿区新宿', work_hours: '10:00 - 19:00', requirements: ['__JOB_CODE__::JOB-100202'], role_type: 'クローザー', sales_channel: '量販店', carrier: 'au/UQmobile', event_date: '2026-07-22', application_deadline: '2026-07-20', work_location: '店内', is_urgent: false },
  { id: 'j3', title: '【渋谷駅】ソフトバンク・ワイモバイルの臨時イベントMC/クルー', description: '店舗前ブースでのチラシ・ノベルティ配布、およびマイクMC進行。未経験歓迎！', author_id: 'beta', price: 14000, location_name: '東京都渋谷区渋谷', work_hours: '11:00 - 20:00', requirements: ['__JOB_CODE__::JOB-100203'], role_type: 'キャンペーンクルー', sales_channel: 'ショップ', carrier: 'SoftBank/Y!mobile', event_date: '2026-07-21', application_deadline: '2026-07-19', work_location: '外販（スーパーなど）', is_urgent: false }
];

const defaultOfflineTalents = [
  { id: 't1', name: 'タレント A', description: '獲得特化クローザー。週末獲得実績多数。', lat: 35.6895, lng: 139.6917, user_id: 'alpha', price: 16000, skills: ['クローザー', 'モバイル販売'], experience: '5年以上', preferred_area: '東京都内', location_name: '東京都新宿区', company_name: '株式会社アルファ', masked_name: 'T**** A', completed_trainings: [] },
  { id: 't2', name: 'タレント B', description: 'イベントディレクター・MC対応可能。', lat: 35.6580, lng: 139.7016, user_id: 'beta', price: 18000, skills: ['ディレクター', 'イベントMC'], experience: '3年以上', preferred_area: '渋谷・新宿', location_name: '東京都渋谷区', company_name: 'ベータ株式会社', masked_name: 'T**** B', completed_trainings: [] }
];

const defaultOfflineTasks = [
  { id: 'task1', job_id: 'j1', job_title: '【大崎駅】ドコモショップ出張ブース販売イベント要員', worker_name: 'アルファ 一郎', company_name: '株式会社シグマ通信', client_name: '株式会社シグマ通信', price: 15000, date: '2026-07-20', status: 'working', evaluations: { messages: [] } },
  { id: 'task2', job_id: 'j2', job_title: '【新宿駅】au・UQモバイルの乗り換え案内スタッフ募集', worker_name: 'シグマ 次郎', company_name: '株式会社アルファ', client_name: '株式会社アルファ', price: 18000, date: '2026-07-22', status: 'applying', evaluations: { messages: [] } }
];

// Error wrapper that automatically enables local fallback on failures
async function callSupabase<T>(apiFn: () => Promise<T>, fallbackFn: () => T | Promise<T>): Promise<T> {
  if (useOfflineMock) {
    return await fallbackFn();
  }
  try {
    return await apiFn();
  } catch (err: any) {
    console.warn('Supabase query failed. Switching to Local Offline Mock Mode:', err);
    useOfflineMock = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('connexy_is_offline', 'true');
    }
    return await fallbackFn();
  }
}

export const api = {
  getJobs: async (): Promise<Job[]> => {
    return callSupabase(
      async () => {
        const { data, error } = await supabase.from('jobs').select('*');
        if (error) throw error;
        return data.map(mapJob);
      },
      () => {
        const list = getOfflineData('jobs', defaultOfflineJobs);
        return list.map(mapJob);
      }
    );
  },

  getTalents: async (): Promise<Talent[]> => {
    return callSupabase(
      async () => {
        const { data, error } = await supabase.from('talents').select('*');
        if (error) throw error;
        return data.map(mapTalent);
      },
      () => {
        const list = getOfflineData('talents', defaultOfflineTalents);
        return list.map(mapTalent);
      }
    );
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    return callSupabase(
      async () => {
        const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();
        if (error || !data) return undefined;
        return mapUser(data);
      },
      () => {
        const list = getOfflineData('companies', defaultOfflineCompanies);
        const found = list.find(c => c.id === id);
        return found ? mapUser(found) : undefined;
      }
    );
  },

  getCurrentUser: async (): Promise<User | null> => {
    const userId = localStorage.getItem('connexy_current_user_id');
    if (!userId) return null;

    return callSupabase(
      async () => {
        const { data, error } = await supabase.from('companies').select('*').eq('id', userId).single();
        if (error || !data) return null;
        
        const companyUser = mapUser(data);
        const staffId = localStorage.getItem('connexy_current_staff_id');
        if (staffId) {
          const { data: staffData } = await supabase.from('staffs').select('*').eq('id', staffId).single();
          if (staffData) {
            const staff = mapStaff(staffData);
            companyUser.staffId = staff.id;
            companyUser.staffName = staff.name;
            companyUser.staffRole = staff.role || 'staff';
          }
        } else {
          companyUser.staffName = companyUser.representativeName;
          companyUser.staffRole = 'admin';
        }
        return companyUser;
      },
      () => {
        const list = getOfflineData('companies', defaultOfflineCompanies);
        const found = list.find(c => c.id === userId);
        if (!found) return null;
        const companyUser = mapUser(found);
        
        const staffId = localStorage.getItem('connexy_current_staff_id');
        if (staffId) {
          const staffs = getOfflineData('staffs', defaultOfflineStaffs);
          const staffFound = staffs.find(s => s.id === staffId);
          if (staffFound) {
            const staff = mapStaff(staffFound);
            companyUser.staffId = staff.id;
            companyUser.staffName = staff.name;
            companyUser.staffRole = staff.role || 'staff';
          }
        } else {
          companyUser.staffName = companyUser.representativeName;
          companyUser.staffRole = 'admin';
        }
        return companyUser;
      }
    );
  },

  login: async (loginId: string, password: string): Promise<User | null> => {
    return callSupabase(
      async () => {
        // 1. Try to authenticate against companies table
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('login_id', loginId)
          .eq('password', password)
          .single();
          
        if (companyData) {
          localStorage.setItem('connexy_current_user_id', companyData.id);
          localStorage.removeItem('connexy_current_staff_id');
          return mapUser(companyData);
        }
        
        // 2. Try to authenticate against staffs table
        const { data: allStaffsData } = await supabase.from('staffs').select('*');
        if (allStaffsData) {
          initializeDefaultStaffLogins(allStaffsData);
          for (const sRow of allStaffsData) {
            const staff = mapStaff(sRow);
            if (staff.loginId === loginId && staff.password === password) {
              localStorage.setItem('connexy_current_user_id', staff.userId);
              localStorage.setItem('connexy_current_staff_id', staff.id);
              
              const { data: companyData2 } = await supabase.from('companies').select('*').eq('id', staff.userId).single();
              if (companyData2) {
                const user = mapUser(companyData2);
                user.staffId = staff.id;
                user.staffName = staff.name;
                user.staffRole = staff.role || 'staff';
                return user;
              }
            }
          }
        }
        return null;
      },
      () => {
        const companies = getOfflineData('companies', defaultOfflineCompanies);
        const comp = companies.find(c => c.login_id === loginId && c.password === password);
        if (comp) {
          localStorage.setItem('connexy_current_user_id', comp.id);
          localStorage.removeItem('connexy_current_staff_id');
          return mapUser(comp);
        }

        const staffs = getOfflineData('staffs', defaultOfflineStaffs);
        initializeDefaultStaffLogins(staffs);
        for (const sRow of staffs) {
          const staff = mapStaff(sRow);
          if (staff.loginId === loginId && staff.password === password) {
            localStorage.setItem('connexy_current_user_id', staff.userId);
            localStorage.setItem('connexy_current_staff_id', staff.id);
            
            const comp2 = companies.find(c => c.id === staff.userId);
            if (comp2) {
              const user = mapUser(comp2);
              user.staffId = staff.id;
              user.staffName = staff.name;
              user.staffRole = staff.role || 'staff';
              return user;
            }
          }
        }
        return null;
      }
    );
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('connexy_current_user_id');
    localStorage.removeItem('connexy_current_staff_id');
  },

  getStaffsByUserId: async (userId: string): Promise<Staff[]> => {
    return callSupabase(
      async () => {
        const { data, error } = await supabase.from('staffs').select('*').eq('user_id', userId);
        if (error) throw error;
        
        const { data: allStaffsData } = await supabase.from('staffs').select('*');
        if (allStaffsData) {
          initializeDefaultStaffLogins(allStaffsData);
        }
        return data.map(mapStaff);
      },
      () => {
        const list = getOfflineData('staffs', defaultOfflineStaffs);
        initializeDefaultStaffLogins(list);
        return list.filter(s => s.user_id === userId).map(mapStaff);
      }
    );
  },

  getAllStaffs: async (): Promise<Staff[]> => {
    return callSupabase(
      async () => {
        const { data, error } = await supabase.from('staffs').select('*');
        if (error) throw error;
        if (data) {
          initializeDefaultStaffLogins(data);
        }
        return data.map(mapStaff);
      },
      () => {
        const list = getOfflineData('staffs', defaultOfflineStaffs);
        initializeDefaultStaffLogins(list);
        return list.map(mapStaff);
      }
    );
  },

  addJob: async (job: Omit<Job, 'id'>): Promise<Job> => {
    const id = 'j' + Date.now();
    const jobCode = 'JOB-' + Math.floor(100000 + Math.random() * 900000);
    const newJob = { ...job, id, jobCode };

    return callSupabase(
      async () => {
        const row = unmapJob(newJob);
        const { error } = await supabase.from('jobs').insert([row]);
        if (error) throw error;
        return newJob;
      },
      () => {
        const list = getOfflineData('jobs', defaultOfflineJobs);
        const row = unmapJob(newJob);
        list.push(row);
        saveOfflineData('jobs', list);
        return newJob;
      }
    );
  },

  updateJob: async (jobId: string, updates: Partial<Job>): Promise<void> => {
    return callSupabase(
      async () => {
        const row = unmapJob(updates);
        delete row.id;
        const { error } = await supabase.from('jobs').update(row).eq('id', jobId);
        if (error) throw error;
      },
      () => {
        const list = getOfflineData('jobs', defaultOfflineJobs);
        const index = list.findIndex(j => j.id === jobId);
        if (index !== -1) {
          const rowUpdates = unmapJob(updates);
          delete rowUpdates.id;
          list[index] = { ...list[index], ...rowUpdates };
          saveOfflineData('jobs', list);
        }
      }
    );
  },

  addTalent: async (talent: Omit<Talent, 'id'>): Promise<Talent> => {
    const id = 't' + Date.now();
    const newTalent = { ...talent, id };

    return callSupabase(
      async () => {
        const row = unmapTalent(newTalent);
        const { error } = await supabase.from('talents').insert([row]);
        if (error) throw error;
        return newTalent;
      },
      () => {
        const list = getOfflineData('talents', defaultOfflineTalents);
        const row = unmapTalent(newTalent);
        list.push(row);
        saveOfflineData('talents', list);
        return newTalent;
      }
    );
  },

  addStaff: async (staff: Omit<Staff, 'id'>): Promise<Staff> => {
    const id = 's' + Date.now();
    const extraTags: string[] = [];
    if (staff.furigana) extraTags.push('STAFF_FURIGANA_' + staff.furigana);
    if (staff.commuteMethod) extraTags.push('STAFF_COMMUTE_' + staff.commuteMethod);
    if (staff.gender) extraTags.push('STAFF_GENDER_' + staff.gender);
    if (staff.birthday) extraTags.push('STAFF_BIRTHDAY_' + staff.birthday);

    const newStaff = { ...staff, id, completedTrainings: extraTags };
    if (newStaff.role) {
      localStorage.setItem('staff_role_' + id, newStaff.role);
    }
    if (newStaff.loginId) {
      localStorage.setItem('staff_login_' + id, newStaff.loginId);
    }
    if (newStaff.password) {
      localStorage.setItem('staff_password_' + id, newStaff.password);
    }

    return callSupabase(
      async () => {
        const row = unmapStaff(newStaff);
        const { error } = await supabase.from('staffs').insert([row]);
        if (error) {
          console.warn('addStaff database insert failed, attempting fallback insertion without role/login_id/password columns:', error);
          const fallbackRow = { ...row };
          delete fallbackRow.role;
          delete fallbackRow.login_id;
          delete fallbackRow.password;
          const { error: errorFallback } = await supabase.from('staffs').insert([fallbackRow]);
          if (errorFallback) throw errorFallback;
        }
        return newStaff;
      },
      () => {
        const list = getOfflineData('staffs', defaultOfflineStaffs);
        const row = unmapStaff(newStaff);
        list.push(row);
        saveOfflineData('staffs', list);
        return newStaff;
      }
    );
  },

  getTrainings: async (): Promise<Training[]> => {
    return mockTrainings;
  },

  completeTraining: async (staffId: string, trainingId: string): Promise<void> => {
    return callSupabase(
      async () => {
        const { data: staffData, error: staffError } = await supabase.from('staffs').select('*').eq('id', staffId).single();
        if (staffError || !staffData) return;
        const staff = mapStaff(staffData);

        const updatedTrainings = Array.from(new Set([...(staff.completedTrainings || []), trainingId]));
        await supabase.from('staffs').update({ completed_trainings: updatedTrainings }).eq('id', staffId);

        const { data: talentData } = await supabase.from('talents').select('*').or(`name.eq."${staff.name}",masked_name.eq."${staff.maskedName}"`);
        if (talentData && talentData.length > 0) {
          for (const t of talentData) {
            const talent = mapTalent(t);
            const newTalentTrainings = Array.from(new Set([...(talent.completedTrainings || []), trainingId]));
            await supabase.from('talents').update({ completed_trainings: newTalentTrainings }).eq('id', talent.id);
          }
        }
      },
      () => {
        const staffs = getOfflineData('staffs', defaultOfflineStaffs);
        const staffIndex = staffs.findIndex(s => s.id === staffId);
        if (staffIndex === -1) return;
        
        const staff = mapStaff(staffs[staffIndex]);
        const updatedTrainings = Array.from(new Set([...(staff.completedTrainings || []), trainingId]));
        staffs[staffIndex].completed_trainings = updatedTrainings;
        saveOfflineData('staffs', staffs);

        const talents = getOfflineData('talents', defaultOfflineTalents);
        for (let i = 0; i < talents.length; i++) {
          const talent = mapTalent(talents[i]);
          if (talent.name === staff.name || talent.maskedName === staff.maskedName) {
            const newTalentTrainings = Array.from(new Set([...(talent.completedTrainings || []), trainingId]));
            talents[i].completed_trainings = newTalentTrainings;
          }
        }
        saveOfflineData('talents', talents);
      }
    );
  },

  getContractTasks: async (): Promise<ContractTask[]> => {
    return callSupabase(
      async () => {
        const { data, error } = await supabase.from('contract_tasks').select('*');
        if (error) throw error;
        return data.map(mapContractTask);
      },
      () => {
        const list = getOfflineData('contract_tasks', defaultOfflineTasks);
        return list.map(mapContractTask);
      }
    );
  },

  saveContractTaskChat: async (
    taskId: string, 
    messages: any[], 
    jobTitle: string, 
    clientName: string, 
    workerName: string, 
    appliedJobIds?: string[],
    appliedJobStaffIds?: { [jobId: string]: string }
  ): Promise<void> => {
    return callSupabase(
      async () => {
        const { data } = await supabase.from('contract_tasks').select('evaluations').eq('id', taskId);
        const exists = data && data.length > 0;
        
        let evaluations: any = { messages };
        if (exists) {
          const existingEvals = data[0].evaluations || {};
          const mergedAppliedJobIds = Array.from(new Set([
            ...(existingEvals.appliedJobIds || []),
            ...(appliedJobIds || [])
          ]));
          evaluations = {
            ...existingEvals,
            messages,
            appliedJobIds: mergedAppliedJobIds,
            appliedJobStaffIds: {
              ...(existingEvals.appliedJobStaffIds || {}),
              ...(appliedJobStaffIds || {})
            }
          };
          const { error } = await supabase.from('contract_tasks').update({ evaluations }).eq('id', taskId);
          if (error) throw error;
        } else {
          evaluations.appliedJobIds = appliedJobIds || [];
          evaluations.appliedJobStaffIds = appliedJobStaffIds || {};
          const isApplication = appliedJobIds && appliedJobIds.length > 0;
          const row = {
            id: taskId,
            job_id: 'chat',
            job_title: jobTitle,
            client_name: clientName,
            worker_name: workerName,
            price: 0,
            date: new Date().toISOString().split('T')[0],
            status: isApplication ? 'applying' : 'working',
            evaluations
          };
          const { error } = await supabase.from('contract_tasks').insert([row]);
          if (error) throw error;
        }
      },
      () => {
        const list = getOfflineData('contract_tasks', defaultOfflineTasks);
        const index = list.findIndex(t => t.id === taskId);
        let evaluations: any = { messages };
        if (index !== -1) {
          const existingEvals = list[index].evaluations || {};
          const mergedAppliedJobIds = Array.from(new Set([
            ...(existingEvals.appliedJobIds || []),
            ...(appliedJobIds || [])
          ]));
          evaluations = {
            ...existingEvals,
            messages,
            appliedJobIds: mergedAppliedJobIds,
            appliedJobStaffIds: {
              ...(existingEvals.appliedJobStaffIds || {}),
              ...(appliedJobStaffIds || {})
            }
          };
          list[index].evaluations = evaluations;
        } else {
          evaluations.appliedJobIds = appliedJobIds || [];
          evaluations.appliedJobStaffIds = appliedJobStaffIds || {};
          const isApplication = appliedJobIds && appliedJobIds.length > 0;
          const row = {
            id: taskId,
            job_id: 'chat',
            job_title: jobTitle,
            client_name: clientName,
            worker_name: workerName,
            price: 0,
            date: new Date().toISOString().split('T')[0],
            status: isApplication ? 'applying' : 'working',
            evaluations
          };
          list.push(row);
        }
        saveOfflineData('contract_tasks', list);
      }
    );
  },

  updateContractTaskStatus: async (taskId: string, status: 'applying' | 'offered' | 'working' | 'report_pending' | 'completed' | 'disputed' | 'rejected', additionalEvals?: any): Promise<void> => {
    return callSupabase(
      async () => {
        const { data: taskData } = await supabase.from('contract_tasks').select('evaluations').eq('id', taskId).single();
        let evaluations = taskData?.evaluations || {};
        if (additionalEvals) {
          evaluations = { ...evaluations, ...additionalEvals };
        }
        const { error } = await supabase.from('contract_tasks').update({ status, evaluations }).eq('id', taskId);
        if (error) throw error;
      },
      () => {
        const list = getOfflineData('contract_tasks', defaultOfflineTasks);
        const index = list.findIndex(t => t.id === taskId);
        if (index !== -1) {
          let evaluations = list[index].evaluations || {};
          if (additionalEvals) {
            evaluations = { ...evaluations, ...additionalEvals };
          }
          list[index].status = status;
          list[index].evaluations = evaluations;
          saveOfflineData('contract_tasks', list);
        }
      }
    );
  },

  createContractTask: async (task: ContractTask): Promise<void> => {
    return callSupabase(
      async () => {
        const row = unmapContractTask(task);
        row.evaluations = task.evaluations;
        const { error } = await supabase.from('contract_tasks').insert([row]);
        if (error) throw error;
      },
      () => {
        const list = getOfflineData('contract_tasks', defaultOfflineTasks);
        const row = unmapContractTask(task);
        row.evaluations = task.evaluations;
        list.push(row);
        saveOfflineData('contract_tasks', list);
      }
    );
  },

  submitReport: async (
    taskId: string,
    rating: number,
    comment: string,
    evaluatorName: string,
    target: 'byClient' | 'byWorker' | 'byStaffToField',
    hasLateness?: boolean
  ): Promise<ContractTask> => {
    return callSupabase(
      async () => {
        const { data: taskData, error: taskError } = await supabase.from('contract_tasks').select('*').eq('id', taskId).single();
        if (taskError || !taskData) throw new Error('Task not found');
        const task = mapContractTask(taskData);

        const newEval: Evaluation = {
          id: `ev_${Date.now()}`,
          rating,
          comment,
          evaluatorName,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          hasLateness
        };

        if (!task.evaluations) task.evaluations = {};
        task.evaluations[target] = newEval;

        if (rating <= 2) {
          task.status = 'disputed';
        } else {
          task.status = 'completed';
        }

        const { error: updateError } = await supabase
          .from('contract_tasks')
          .update(unmapContractTask({ status: task.status, evaluations: task.evaluations }))
          .eq('id', taskId);

        if (updateError) throw updateError;

        if (target === 'byClient' && hasLateness !== undefined) {
          try {
            const { data: staffsData } = await supabase.from('staffs').select('*');
            if (staffsData) {
              const staffRow = staffsData.find(s => s.name === task.workerName);
              if (staffRow) {
                const staff = mapStaff(staffRow);
                const nowStr = new Date().toISOString().split('T')[0];
                const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
                const statusSuffix = hasLateness ? 'LATE' : 'OK';
                const newLog = `ATTENDANCE_LOG_${nowStr}_${timeStr}_${statusSuffix}`;
                const updatedTrainings = [...(staff.completedTrainings || []), newLog];
                await supabase.from('staffs').update({ completed_trainings: updatedTrainings }).eq('id', staff.id);
              }
            }
          } catch (e) {
            console.error('Failed to append staff attendance log on report submit:', e);
          }
        }
        return task;
      },
      async () => {
        const list = getOfflineData('contract_tasks', defaultOfflineTasks);
        const index = list.findIndex(t => t.id === taskId);
        if (index === -1) throw new Error('Task not found');
        const task = mapContractTask(list[index]);

        const newEval: Evaluation = {
          id: `ev_${Date.now()}`,
          rating,
          comment,
          evaluatorName,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          hasLateness
        };

        if (!task.evaluations) task.evaluations = {};
        task.evaluations[target] = newEval;

        if (rating <= 2) {
          task.status = 'disputed';
        } else {
          task.status = 'completed';
        }

        list[index].status = task.status;
        list[index].evaluations = task.evaluations;
        saveOfflineData('contract_tasks', list);

        if (target === 'byClient' && hasLateness !== undefined) {
          const staffs = getOfflineData('staffs', defaultOfflineStaffs);
          const staffIndex = staffs.findIndex(s => s.name === task.workerName);
          if (staffIndex !== -1) {
            const staff = mapStaff(staffs[staffIndex]);
            const nowStr = new Date().toISOString().split('T')[0];
            const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
            const statusSuffix = hasLateness ? 'LATE' : 'OK';
            const newLog = `ATTENDANCE_LOG_${nowStr}_${timeStr}_${statusSuffix}`;
            const updatedTrainings = [...(staff.completedTrainings || []), newLog];
            staffs[staffIndex].completed_trainings = updatedTrainings;
            saveOfflineData('staffs', staffs);
          }
        }
        return task;
      }
    );
  },

  respondToDispute: async (taskId: string, action: 'approve' | 'reject', reason?: string): Promise<ContractTask> => {
    return callSupabase(
      async () => {
        const { data: taskData, error: taskError } = await supabase.from('contract_tasks').select('*').eq('id', taskId).single();
        if (taskError || !taskData) throw new Error('Task not found');
        const task = mapContractTask(taskData);

        if (action === 'approve') {
          task.status = 'completed';
        } else {
          task.status = 'disputed';
          task.disputedReason = reason || '内容が事実と異なります。';
        }

        const { error: updateError } = await supabase
          .from('contract_tasks')
          .update(unmapContractTask({ status: task.status, disputedReason: task.disputedReason }))
          .eq('id', taskId);
          
        if (updateError) throw updateError;
        return task;
      },
      async () => {
        const list = getOfflineData('contract_tasks', defaultOfflineTasks);
        const index = list.findIndex(t => t.id === taskId);
        if (index === -1) throw new Error('Task not found');
        const task = mapContractTask(list[index]);

        if (action === 'approve') {
          task.status = 'completed';
        } else {
          task.status = 'disputed';
          task.disputedReason = reason || '内容が事実と異なります。';
        }

        list[index].status = task.status;
        list[index].disputed_reason = task.disputedReason;
        saveOfflineData('contract_tasks', list);
        return task;
      }
    );
  },

  getUsers: async (): Promise<User[]> => {
    return callSupabase(
      async () => {
        const { data, error } = await supabase.from('companies').select('*');
        if (error) throw error;
        return data.map(mapUser);
      },
      () => {
        const list = getOfflineData('companies', defaultOfflineCompanies);
        return list.map(mapUser);
      }
    );
  },

  registerCompany: async (company: Omit<User, 'id'>): Promise<User> => {
    const id = 'c' + Date.now();
    const newUser: User = { ...company, id, status: 'pending', role: 'contractor' };
    localStorage.setItem('company_status_' + id, 'pending');
    if (newUser.invoiceNumber) {
      localStorage.setItem('company_invoice_' + id, newUser.invoiceNumber);
    }

    return callSupabase(
      async () => {
        const row = {
          id: newUser.id,
          name: newUser.name,
          role: newUser.role,
          login_id: newUser.loginId,
          password: newUser.password,
          status: newUser.status,
          invoice_number: newUser.invoiceNumber
        };
        const { error } = await supabase.from('companies').insert([row]);
        if (error) {
          const fallbackRow = {
            id: row.id,
            name: row.name,
            role: row.role,
            login_id: row.login_id,
            password: row.password
          };
          const { error: errorFallback } = await supabase.from('companies').insert([fallbackRow]);
          if (errorFallback) throw errorFallback;
        }
        return newUser;
      },
      () => {
        const list = getOfflineData('companies', defaultOfflineCompanies);
        const row = {
          id: newUser.id,
          name: newUser.name,
          role: newUser.role,
          login_id: newUser.loginId,
          password: newUser.password,
          status: newUser.status,
          invoice_number: newUser.invoiceNumber
        };
        list.push(row);
        saveOfflineData('companies', list);
        return newUser;
      }
    );
  },

  updateStaffRole: async (staffId: string, role: 'admin' | 'staff'): Promise<void> => {
    localStorage.setItem('staff_role_' + staffId, role);
    return callSupabase(
      async () => {
        await supabase.from('staffs').update({ role }).eq('id', staffId);
      },
      () => {
        const list = getOfflineData('staffs', defaultOfflineStaffs);
        const index = list.findIndex(s => s.id === staffId);
        if (index !== -1) {
          list[index].role = role;
          saveOfflineData('staffs', list);
        }
      }
    );
  },

  updateStaff: async (staffId: string, staff: Partial<Staff>): Promise<void> => {
    if (staff.role) {
      localStorage.setItem('staff_role_' + staffId, staff.role);
    }
    if (staff.loginId) {
      localStorage.setItem('staff_login_' + staffId, staff.loginId);
    }
    if (staff.password) {
      localStorage.setItem('staff_password_' + staffId, staff.password);
    }

    return callSupabase(
      async () => {
        const { data: existingStaffData } = await supabase.from('staffs').select('completed_trainings').eq('id', staffId).single();
        let completedTrainings: string[] = [];
        if (existingStaffData && existingStaffData.completed_trainings) {
          completedTrainings = [...existingStaffData.completed_trainings];
        }

        if ('furigana' in staff) {
          completedTrainings = completedTrainings.filter(t => !t.startsWith('STAFF_FURIGANA_'));
          if (staff.furigana) completedTrainings.push('STAFF_FURIGANA_' + staff.furigana);
        }
        if ('commuteMethod' in staff) {
          completedTrainings = completedTrainings.filter(t => !t.startsWith('STAFF_COMMUTE_'));
          if (staff.commuteMethod) completedTrainings.push('STAFF_COMMUTE_' + staff.commuteMethod);
        }
        if ('gender' in staff) {
          completedTrainings = completedTrainings.filter(t => !t.startsWith('STAFF_GENDER_'));
          if (staff.gender) completedTrainings.push('STAFF_GENDER_' + staff.gender);
        }
        if ('birthday' in staff) {
          completedTrainings = completedTrainings.filter(t => !t.startsWith('STAFF_BIRTHDAY_'));
          if (staff.birthday) completedTrainings.push('STAFF_BIRTHDAY_' + staff.birthday);
        }

        const updatedStaff: Partial<Staff> = { ...staff, completedTrainings };
        const row = unmapStaff(updatedStaff);
        const { error } = await supabase.from('staffs').update(row).eq('id', staffId);
        if (error) {
          const fallbackRow = { ...row };
          delete fallbackRow.role;
          delete fallbackRow.login_id;
          delete fallbackRow.password;
          const { error: error2 } = await supabase.from('staffs').update(fallbackRow).eq('id', staffId);
          if (error2) throw error2;
        }
      },
      () => {
        const list = getOfflineData('staffs', defaultOfflineStaffs);
        const index = list.findIndex(s => s.id === staffId);
        if (index === -1) return;

        let completedTrainings: string[] = list[index].completed_trainings || [];
        if ('furigana' in staff) {
          completedTrainings = completedTrainings.filter(t => !t.startsWith('STAFF_FURIGANA_'));
          if (staff.furigana) completedTrainings.push('STAFF_FURIGANA_' + staff.furigana);
        }
        if ('commuteMethod' in staff) {
          completedTrainings = completedTrainings.filter(t => !t.startsWith('STAFF_COMMUTE_'));
          if (staff.commuteMethod) completedTrainings.push('STAFF_COMMUTE_' + staff.commuteMethod);
        }
        if ('gender' in staff) {
          completedTrainings = completedTrainings.filter(t => !t.startsWith('STAFF_GENDER_'));
          if (staff.gender) completedTrainings.push('STAFF_GENDER_' + staff.gender);
        }
        if ('birthday' in staff) {
          completedTrainings = completedTrainings.filter(t => !t.startsWith('STAFF_BIRTHDAY_'));
          if (staff.birthday) completedTrainings.push('STAFF_BIRTHDAY_' + staff.birthday);
        }

        const updatedStaff: Partial<Staff> = { ...staff, completedTrainings };
        const rowUpdates = unmapStaff(updatedStaff);
        list[index] = { ...list[index], ...rowUpdates };
        saveOfflineData('staffs', list);
      }
    );
  },

  updateCompanyStatus: async (companyId: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> => {
    localStorage.setItem('company_status_' + companyId, status);
    return callSupabase(
      async () => {
        await supabase.from('companies').update({ status }).eq('id', companyId);
      },
      () => {
        const list = getOfflineData('companies', defaultOfflineCompanies);
        const index = list.findIndex(c => c.id === companyId);
        if (index !== -1) {
          list[index].status = status;
          saveOfflineData('companies', list);
        }
      }
    );
  },

  seedStaffAttendanceLogs: async (): Promise<void> => {
    return callSupabase(
      async () => {
        const { data: staffs, error } = await supabase.from('staffs').select('*');
        if (error || !staffs) return;
        for (const sRow of staffs) {
          const staff = mapStaff(sRow);
          const attendanceLogs = (staff.completedTrainings || []).filter(t => t.startsWith('ATTENDANCE_LOG_'));
          if (attendanceLogs.length >= 8) continue;

          const newLogs: string[] = [];
          const times = ['08:50', '08:53', '08:55', '08:57', '08:58', '08:59', '09:00', '09:01', '09:02', '09:03', '09:05', '09:08'];
          const dates = [
            '2026-06-05', '2026-06-04', '2026-06-03', '2026-06-02', '2026-06-01',
            '2026-05-29', '2026-05-28', '2026-05-27', '2026-05-26', '2026-05-25',
            '2026-05-22', '2026-05-21', '2026-05-20', '2026-05-19', '2026-05-18',
            '2026-05-15', '2026-05-14', '2026-05-13', '2026-05-12', '2026-05-11'
          ];
          
          const shuffled = [...dates].sort(() => 0.5 - Math.random());
          const selectedDates = shuffled.slice(0, 15);
          selectedDates.forEach(date => {
            const randTime = times[Math.floor(Math.random() * times.length)];
            const isLate = randTime > '09:00';
            newLogs.push(`ATTENDANCE_LOG_${date}_${randTime}_${isLate ? 'LATE' : 'OK'}`);
          });

          const cleanTrainings = (staff.completedTrainings || []).filter(t => !t.startsWith('ATTENDANCE_LOG_'));
          const updatedTrainings = [...cleanTrainings, ...newLogs];
          
          await supabase.from('staffs').update({ completed_trainings: updatedTrainings }).eq('id', staff.id);
        }
      },
      () => {
        const staffs = getOfflineData('staffs', defaultOfflineStaffs);
        for (let i = 0; i < staffs.length; i++) {
          const staff = mapStaff(staffs[i]);
          const attendanceLogs = (staff.completedTrainings || []).filter(t => t.startsWith('ATTENDANCE_LOG_'));
          if (attendanceLogs.length >= 8) continue;

          const newLogs: string[] = [];
          const times = ['08:50', '08:53', '08:55', '08:57', '08:58', '08:59', '09:00', '09:01', '09:02', '09:03', '09:05', '09:08'];
          const dates = [
            '2026-06-05', '2026-06-04', '2026-06-03', '2026-06-02', '2026-06-01',
            '2026-05-29', '2026-05-28', '2026-05-27', '2026-05-26', '2026-05-25',
            '2026-05-22', '2026-05-21', '2026-05-20', '2026-05-19', '2026-05-18',
            '2026-05-15', '2026-05-14', '2026-05-13', '2026-05-12', '2026-05-11'
          ];
          
          const shuffled = [...dates].sort(() => 0.5 - Math.random());
          const selectedDates = shuffled.slice(0, 15);
          selectedDates.forEach(date => {
            const randTime = times[Math.floor(Math.random() * times.length)];
            const isLate = randTime > '09:00';
            newLogs.push(`ATTENDANCE_LOG_${date}_${randTime}_${isLate ? 'LATE' : 'OK'}`);
          });

          const cleanTrainings = (staff.completedTrainings || []).filter(t => !t.startsWith('ATTENDANCE_LOG_'));
          staffs[i].completed_trainings = [...cleanTrainings, ...newLogs];
        }
        saveOfflineData('staffs', staffs);
      }
    );
  }
};
