import { supabase } from '../lib/supabase';

// ユーザーの型定義
export interface User {
  id: string;
  name: string;
  role: 'contractor' | 'worker' | 'admin';
  loginId?: string;
  password?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

// 評価(Evaluation)の型定義
export interface Evaluation {
  id: string;
  rating: 'good' | 'bad';
  comment?: string;
  evaluatorName: string;
  createdAt: string;
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
  status?: 'open' | 'negotiating' | 'closed';
  contractType?: '業務委託' | '労働者派遣' | 'その他';
}

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
  status: 'working' | 'report_pending' | 'completed' | 'disputed';
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
const mapJob = (row: any): Job => ({
  id: row.id,
  title: row.title,
  description: row.description,
  lat: row.lat,
  lng: row.lng,
  authorId: row.author_id,
  price: row.price,
  locationName: row.location_name,
  workHours: row.work_hours,
  requirements: row.requirements,
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
  status: row.status || 'open',
  contractType: row.contract_type
});

const unmapJob = (job: Partial<Job>): any => {
  const row: any = { ...job };
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
  if ('status' in job) { row.status = job.status; delete job.status; }
  if ('contractType' in job) { row.contract_type = job.contractType; delete job.contractType; }
  return row;
};

const mapTalent = (row: any): Talent => ({
  id: row.id,
  name: row.name,
  description: row.description,
  lat: row.lat,
  lng: row.lng,
  userId: row.user_id,
  price: row.price,
  skills: row.skills || [],
  prText: row.pr_text,
  experience: row.experience,
  preferredArea: row.preferred_area,
  locationName: row.location_name,
  companyName: row.company_name,
  maskedName: row.masked_name,
  baseLocation: row.base_location,
  nearestStation: row.nearest_station,
  carriers: row.carriers || [],
  availableDates: row.available_dates,
  completedTrainings: row.completed_trainings || []
});

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
  return row;
};

const mapStaff = (row: any): Staff => ({
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
  completedTrainings: row.completed_trainings || []
});

const unmapStaff = (staff: Partial<Staff>): any => {
  const row: any = { ...staff };
  if ('userId' in staff) { row.user_id = staff.userId; delete row.userId; }
  if ('maskedName' in staff) { row.masked_name = staff.maskedName; delete row.maskedName; }
  if ('baseLocation' in staff) { row.base_location = staff.baseLocation; delete row.baseLocation; }
  if ('nearestStation' in staff) { row.nearest_station = staff.nearestStation; delete row.nearestStation; }
  if ('preferredArea' in staff) { row.preferred_area = staff.preferredArea; delete row.preferredArea; }
  if ('prText' in staff) { row.pr_text = staff.prText; delete row.prText; }
  if ('completedTrainings' in staff) { row.completed_trainings = staff.completedTrainings; delete row.completedTrainings; }
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

const mapUser = (row: any): User => ({
  id: row.id,
  name: row.name,
  role: row.role,
  loginId: row.login_id,
  password: row.password,
  status: row.status || 'approved'
});

export const api = {
  getJobs: async (): Promise<Job[]> => {
    const { data, error } = await supabase.from('jobs').select('*');
    if (error) { console.error('getJobs error:', error); return []; }
    return data.map(mapJob);
  },

  getTalents: async (): Promise<Talent[]> => {
    const { data, error } = await supabase.from('talents').select('*');
    if (error) { console.error('getTalents error:', error); return []; }
    return data.map(mapTalent);
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();
    if (error || !data) return undefined;
    return mapUser(data);
  },

  getCurrentUser: async (): Promise<User | null> => {
    const userId = localStorage.getItem('connexy_current_user_id');
    if (!userId) return null;
    const { data, error } = await supabase.from('companies').select('*').eq('id', userId).single();
    if (error || !data) return null;
    return mapUser(data);
  },

  login: async (loginId: string, password: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('login_id', loginId)
      .eq('password', password)
      .single();
    if (error || !data) return null;
    
    localStorage.setItem('connexy_current_user_id', data.id);
    return mapUser(data);
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('connexy_current_user_id');
  },

  getStaffsByUserId: async (userId: string): Promise<Staff[]> => {
    const { data, error } = await supabase.from('staffs').select('*').eq('user_id', userId);
    if (error) { console.error('getStaffs error:', error); return []; }
    return data.map(mapStaff);
  },

  addJob: async (job: Omit<Job, 'id'>): Promise<Job> => {
    const id = 'j' + Date.now();
    const newJob = { ...job, id };
    const row = unmapJob(newJob);
    const { error } = await supabase.from('jobs').insert([row]);
    if (error) { console.error('addJob error:', error); throw error; }
    return newJob;
  },

  addTalent: async (talent: Omit<Talent, 'id'>): Promise<Talent> => {
    const id = 't' + Date.now();
    const newTalent = { ...talent, id };
    const row = unmapTalent(newTalent);
    const { error } = await supabase.from('talents').insert([row]);
    if (error) { console.error('addTalent error:', error); throw error; }
    return newTalent;
  },

  addStaff: async (staff: Omit<Staff, 'id'>): Promise<Staff> => {
    const id = 's' + Date.now();
    const newStaff = { ...staff, id, completedTrainings: [] };
    const row = unmapStaff(newStaff);
    const { error } = await supabase.from('staffs').insert([row]);
    if (error) { console.error('addStaff error:', error); throw error; }
    return newStaff;
  },

  getTrainings: async (): Promise<Training[]> => {
    return mockTrainings;
  },

  completeTraining: async (staffId: string, trainingId: string): Promise<void> => {
    // get staff
    const { data: staffData, error: staffError } = await supabase.from('staffs').select('*').eq('id', staffId).single();
    if (staffError || !staffData) return;
    const staff = mapStaff(staffData);

    const updatedTrainings = Array.from(new Set([...(staff.completedTrainings || []), trainingId]));
    
    // update staff
    await supabase.from('staffs').update({ completed_trainings: updatedTrainings }).eq('id', staffId);

    // also update matching talent
    const { data: talentData } = await supabase.from('talents').select('*').or(`name.eq."${staff.name}",masked_name.eq."${staff.maskedName}"`);
    if (talentData && talentData.length > 0) {
      for (const t of talentData) {
        const talent = mapTalent(t);
        const newTalentTrainings = Array.from(new Set([...(talent.completedTrainings || []), trainingId]));
        await supabase.from('talents').update({ completed_trainings: newTalentTrainings }).eq('id', talent.id);
      }
    }
  },

  getContractTasks: async (): Promise<ContractTask[]> => {
    const { data, error } = await supabase.from('contract_tasks').select('*');
    if (error) { console.error('getContractTasks error:', error); return []; }
    return data.map(mapContractTask);
  },

  submitReport: async (
    taskId: string,
    rating: 'good' | 'bad',
    comment: string,
    evaluatorName: string,
    target: 'byClient' | 'byWorker' | 'byStaffToField'
  ): Promise<ContractTask> => {
    const { data: taskData, error: taskError } = await supabase.from('contract_tasks').select('*').eq('id', taskId).single();
    if (taskError || !taskData) throw new Error('Task not found');
    const task = mapContractTask(taskData);

    const newEval: Evaluation = {
      id: `ev_${Date.now()}`,
      rating,
      comment,
      evaluatorName,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    if (!task.evaluations) task.evaluations = {};
    task.evaluations[target] = newEval;

    if (rating === 'bad') {
      task.status = 'disputed';
    } else {
      task.status = 'completed';
    }

    const { error: updateError } = await supabase
      .from('contract_tasks')
      .update(unmapContractTask({ status: task.status, evaluations: task.evaluations }))
      .eq('id', taskId);

    if (updateError) throw updateError;
    return task;
  },

  respondToDispute: async (taskId: string, action: 'approve' | 'reject', reason?: string): Promise<ContractTask> => {
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

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('companies').select('*');
    if (error) { console.error('getUsers error:', error); return []; }
    return data.map(mapUser);
  }
};
