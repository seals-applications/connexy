// ユーザーの型定義
export interface User {
  id: string;
  name: string;
  role: 'contractor' | 'worker' | 'admin';
}

// 案件(Job)の型定義
export interface Job {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  authorId: string;
  price: number;
  locationName?: string;
  workHours?: string;
  requirements?: string[];
  detailedDescription?: string;
  roleType?: 'キャンペーンクルー' | 'クローザー' | 'ディレクター';
  storeType?: '量販店' | 'ショップ';
  carrier?: 'docomo' | 'au/UQmobile' | 'SoftBank/Y!mobile' | 'BB';
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
  availableDates?: string; // 希望勤務日
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
}

// モックデータベース
const mockUsers: User[] = [
  { id: 'u1', name: '株式会社アルファ通信', role: 'contractor' },
  { id: 'u2', name: 'ベータエージェンシー', role: 'contractor' },
  { id: 'u3', name: '佐藤 健一', role: 'worker' },
];

const mockJobs: Job[] = [
  {
    id: 'j1',
    title: 'auショップ新宿西口店 キャンペーンクルー',
    description: '週末のイベント集客スタッフ。元気な方大歓迎！',
    lat: 35.6895, // 新宿駅周辺
    lng: 139.6917,
    authorId: 'u1',
    price: 15000,
    locationName: '東京都新宿区',
    workHours: '土日祝 10:00〜19:00 (休憩1時間)',
    requirements: ['未経験歓迎', '接客経験あれば尚可', '明るく元気な対応ができる方'],
    detailedDescription: 'auショップの店頭にて、ビンゴ大会や抽選会などのイベント運営補助をお願いします。お客様への声掛けや景品のお渡し、簡単なアンケートのご案内などがメインの業務です。ノルマは一切ありませんので、未経験の方でも安心してスタートできます。',
    roleType: 'キャンペーンクルー',
    storeType: 'ショップ',
    carrier: 'au/UQmobile'
  },
  {
    id: 'j2',
    title: 'SoftBank 光回線クローザー募集 (渋谷エリア)',
    description: '量販店でのBB回線獲得業務。成約率に応じてインセンティブあり。',
    lat: 35.6580, // 渋谷駅周辺
    lng: 139.7016,
    authorId: 'u2',
    price: 20000,
    locationName: '東京都渋谷区',
    workHours: '土日のみ 11:00〜20:00 (シフト制)',
    requirements: ['通信回線の営業経験1年以上', 'クロージング経験'],
    detailedDescription: '大手家電量販店にて、スマホを見ているお客様にBB回線（光回線）のセット割をご案内し、ご契約（クロージング）を行っていただく業務です。成約1件につき別途高額インセンティブを支給します。',
    roleType: 'クローザー',
    storeType: '量販店',
    carrier: 'BB'
  },
  {
    id: 'j3',
    title: 'docomo 新機種イベント ディレクター (池袋)',
    description: '家電量販店でのモバイル回線イベントの全体統括です。',
    lat: 35.7295, // 池袋駅周辺
    lng: 139.7109,
    authorId: 'u1',
    price: 22000,
    locationName: '東京都豊島区',
    workHours: '週末 09:30〜18:30',
    requirements: ['イベントディレクター経験', 'docomo商材の知識'],
    detailedDescription: '大型家電量販店のスマホコーナーにて、docomoの週末イベントをディレクションしていただきます。クルーの配置指示、モチベーション管理、売上進捗の報告など、現場の責任者としてご活躍いただきます。',
    roleType: 'ディレクター',
    storeType: '量販店',
    carrier: 'docomo'
  },
  {
    id: 'j4',
    title: 'Y!mobile 乗り換え促進 クローザー',
    description: 'ショップ併売店でのMNP獲得業務。',
    lat: 35.6581, // 港区周辺
    lng: 139.7414,
    authorId: 'u2',
    price: 18000,
    locationName: '東京都港区',
    workHours: '土日祝 10:00〜19:00',
    requirements: ['携帯販売経験', 'MNP獲得が得意な方'],
    detailedDescription: '併売店ショップにて、ご来店されたお客様の料金見直しを実施し、Y!mobileへの乗り換え（MNP）をクロージングする業務です。提案力が直接成果につながるやりがいのある仕事です。',
    roleType: 'クローザー',
    storeType: 'ショップ',
    carrier: 'SoftBank/Y!mobile'
  },
  {
    id: 'j5',
    title: 'au/UQmobile キャンペーンクルー (中央区)',
    description: 'ビンゴ大会や抽選会の盛り上げ役です。',
    lat: 35.6706, // 中央区周辺
    lng: 139.7719,
    authorId: 'u1',
    price: 14000,
    locationName: '東京都中央区',
    workHours: '土日祝 10:00〜18:00',
    requirements: ['大きな声が出せる方', '未経験大歓迎'],
    detailedDescription: 'au/UQmobileの合同イベントにて、マイクを使ったビンゴ大会の進行や、ティッシュ配りなどによる店舗への集客業務（キャッチ）をお願いします。元気の良さが一番の武器になります。',
    roleType: 'キャンペーンクルー',
    storeType: '量販店',
    carrier: 'au/UQmobile'
  },
  {
    id: 'j6',
    title: 'docomo 出張販売イベント ディレクター',
    description: 'ショッピングモールでの出張販売の運営統括。',
    lat: 35.6836, // 千代田区周辺
    lng: 139.7536,
    authorId: 'u2',
    price: 25000,
    locationName: '東京都千代田区',
    workHours: '土日 09:00〜18:00',
    requirements: ['出張販売の運営経験', 'マネジメントスキル'],
    detailedDescription: '商業施設やスーパーなどの催事スペースで行うdocomoの出張販売イベントのディレクター業務です。クライアントや施設側との折衝、現場スタッフの指示出し、実績管理をワンストップでお任せします。',
    roleType: 'ディレクター',
    storeType: 'ショップ',
    carrier: 'docomo'
  },
  {
    id: 'j7',
    title: 'BB回線 訪問獲得クローザー (新宿)',
    description: '量販店の名簿を活用した光回線のアウトバウンド・訪問獲得。',
    lat: 35.6895, // 新宿駅周辺
    lng: 139.6917,
    authorId: 'u1',
    price: 21000,
    locationName: '東京都新宿区',
    workHours: '平日 11:00〜20:00',
    requirements: ['光回線の知識', '訪問販売・クローザー経験'],
    detailedDescription: '量販店で家電を購入されたお客様に対して、提携するBB回線（光回線）のお得なキャンペーンをご案内し、ご自宅へ訪問して契約業務を行うクローザーです。単価に加えてインセンティブの支給があります。',
    roleType: 'クローザー',
    storeType: '量販店',
    carrier: 'BB'
  },
  {
    id: 'j8',
    title: 'SoftBank キャンペーンクルー',
    description: 'スマホ教室の受付・ご案内スタッフ。',
    lat: 35.6580, // 渋谷駅周辺
    lng: 139.7016,
    authorId: 'u2',
    price: 13500,
    locationName: '東京都渋谷区',
    workHours: '平日 10:00〜19:00',
    requirements: ['人と接するのが好きな方', 'スマホの基本操作ができる方'],
    detailedDescription: 'SoftBankショップにて開催されるシニア向けスマホ教室の受付や、参加者への簡単な操作補助を行うキャンペーンクルーです。販売ノルマなどはなく、お客様と丁寧にお話しできる方を求めています。',
    roleType: 'キャンペーンクルー',
    storeType: 'ショップ',
    carrier: 'SoftBank/Y!mobile'
  },
  {
    id: 'j9',
    title: 'au/UQmobile 新規オープン応援 ディレクター',
    description: '新店舗の立ち上げ・オープニングイベントの責任者',
    lat: 35.6240, // 品川駅周辺
    lng: 139.7400,
    authorId: 'u1',
    price: 24000,
    locationName: '東京都品川区',
    workHours: '10:00〜19:00',
    requirements: ['ショップ店長経験', 'ディレクター経験'],
    detailedDescription: '品川エリアに新しくオープンするau/UQmobileショップのオープニングイベントを仕切るディレクターです。店舗スタッフと連携し、最高のスタートダッシュを切れるように現場をコントロールしてください。',
    roleType: 'ディレクター',
    storeType: 'ショップ',
    carrier: 'au/UQmobile'
  },
  {
    id: 'j10',
    title: 'docomo/BB 複合提案 クローザー',
    description: 'スマホと光回線のセット提案に特化したクローザー',
    lat: 35.6580, // 渋谷駅周辺
    lng: 139.7016,
    authorId: 'u2',
    price: 23000,
    locationName: '東京都渋谷区',
    workHours: '土日祝 10:00〜19:00',
    requirements: ['docomoおよび光回線の両方の知識', '高い成約率'],
    detailedDescription: '大型量販店にて、docomoのスマホと自宅のBB回線をセットで切り替える大型案件のクロージングを担当していただきます。複雑な料金シミュレーションを正確かつスピーディーに行える方を歓迎します。',
    roleType: 'クローザー',
    storeType: '量販店',
    carrier: 'docomo'
  }
];

const mockTalents: Talent[] = [
  {
    id: 't1',
    name: '田中 太郎',
    description: '光回線の営業経験5年。土日メインで稼働可能です。',
    lat: 35.6812, 
    lng: 139.7671,
    userId: 'u3',
    price: 25000,
    skills: ['クローザー', 'ディレクター'],
    carriers: ['docomo', 'BB'],
    experience: '大手量販店でのBB回線クロージング業務を3年経験。その後、docomoのイベントディレクターとして2年間現場を統括。',
    prText: '実績には自信があります。チームのモチベーション管理や、現場でのトラブル対応も得意です。',
    preferredArea: '電車で60分以内',
    locationName: '東京都千代田区',
    companyName: '株式会社アルファ通信',
    maskedName: 'Tさん',
    baseLocation: '東京都千代田区',
    nearestStation: '東京駅'
  },
  {
    id: 't2',
    name: '鈴木 花子',
    description: 'モバイル接客経験3年。イベントでの集客が得意です。',
    lat: 35.6580, 
    lng: 139.7016,
    userId: 'u3',
    price: 15000,
    skills: ['キャンペーンクルー'],
    carriers: ['au/UQmobile'],
    experience: 'auショップでの店頭接客を1年、その後イベントクルーとして週末のビンゴ大会や抽選会のMCを2年経験しました。',
    prText: '明るく元気な接客が強みです。子供向けのイベントや、大きな声出しならお任せください！',
    preferredArea: '渋谷から10km以内',
    locationName: '東京都渋谷区',
    companyName: 'ベータエージェンシー',
    maskedName: 'Sさん',
    baseLocation: '東京都渋谷区',
    nearestStation: '渋谷駅'
  },
  {
    id: 't3',
    name: '佐藤 次郎',
    description: 'BtoB営業、テレアポの経験が豊富です。',
    lat: 35.6895, 
    lng: 139.6917,
    userId: 'u3',
    price: 18000,
    skills: ['クローザー'],
    carriers: ['SoftBank/Y!mobile', 'BB'],
    experience: '法人向けのOA機器営業を3年、その後個人向けのSoftBank/BB回線のアウトバウンド・訪問販売を2年経験。',
    prText: '新規開拓からクロージングまで一貫して対応可能です。目標達成へのコミットメントは誰にも負けません。',
    preferredArea: '新宿・池袋エリア',
    locationName: '東京都新宿区',
    companyName: 'フリーランス',
    maskedName: 'Sさん',
    baseLocation: '東京都新宿区',
    nearestStation: '新宿駅'
  },
  {
    id: 't4',
    name: '高橋 健太',
    description: '店舗立ち上げ支援、マネジメント経験あり。',
    lat: 35.7295, 
    lng: 139.7109,
    userId: 'u3',
    price: 22000,
    skills: ['ディレクター'],
    carriers: ['docomo', 'au/UQmobile'],
    experience: 'docomoおよびauのキャリアショップ店長として計4年勤務。新人育成、店舗売上管理を経験。',
    prText: '店舗のKPI分析や、スタッフの教育が得意です。現場の課題解決に向けた提案も行えます。',
    preferredArea: '電車で45分以内',
    locationName: '東京都豊島区',
    companyName: '株式会社アルファ通信',
    maskedName: 'Tさん',
    baseLocation: '東京都豊島区',
    nearestStation: '池袋駅'
  },
  {
    id: 't5',
    name: '伊藤 美咲',
    description: '正確でスピーディーな事務作業が得意です。',
    lat: 35.6706, 
    lng: 139.7719,
    userId: 'u3',
    price: 12000,
    skills: ['キャンペーンクルー'],
    carriers: [],
    experience: '大手企業のバックオフィス業務を5年経験。Excelでのマクロ作成やデータ集計が得意です。',
    prText: '裏方として現場を支える業務が得意です。イベントの景品管理や実績集計などをお任せください。',
    preferredArea: '23区内',
    locationName: '東京都中央区',
    companyName: 'ベータエージェンシー',
    maskedName: 'Iさん',
    baseLocation: '東京都中央区',
    nearestStation: '銀座駅'
  },
  {
    id: 't6',
    name: '渡辺 翔太',
    description: 'フルスタックエンジニアです。',
    lat: 35.6240, 
    lng: 139.7400,
    userId: 'u3',
    price: 35000,
    skills: [],
    carriers: [],
    experience: 'Web系の開発会社でフロントエンド・バックエンドの開発を4年経験。React, Node.jsが得意です。',
    prText: '業務システムからtoC向けアプリまで幅広い開発経験があります。',
    preferredArea: 'フルリモートまたは品川周辺',
    locationName: '東京都品川区',
    companyName: 'フリーランス',
    maskedName: 'Wさん',
    baseLocation: '東京都品川区',
    nearestStation: '品川駅'
  },
  {
    id: 't7',
    name: '小林 さくら',
    description: 'MC、ナレーターの経験があります。',
    lat: 35.6836, 
    lng: 139.7536,
    userId: 'u3',
    price: 16000,
    skills: ['キャンペーンクルー'],
    carriers: ['docomo', 'au/UQmobile', 'SoftBank/Y!mobile'],
    experience: '展示会や携帯販売イベントでのMC経験が3年あります。',
    prText: '台本にない臨機応変なトークや、立ち止まらせるキャッチフレーズ作りが得意です。',
    preferredArea: '電車で30分以内',
    locationName: '東京都千代田区',
    companyName: '株式会社ガンマプロモ',
    maskedName: 'Kさん',
    baseLocation: '東京都千代田区',
    nearestStation: '有楽町駅'
  },
  {
    id: 't8',
    name: '加藤 大輔',
    description: 'コールセンターでのSV経験があります。',
    lat: 35.6895, 
    lng: 139.6917,
    userId: 'u3',
    price: 20000,
    skills: ['ディレクター'],
    carriers: ['BB'],
    experience: 'インバウンドコールセンターのオペレーターを2年、スーパーバイザー(SV)を3年経験。',
    prText: 'クレーム対応や、オペレーターの品質管理(QA)には自信があります。',
    preferredArea: '新宿駅から20km以内',
    locationName: '東京都新宿区',
    companyName: 'デルタ・ソリューションズ',
    maskedName: 'Kさん',
    baseLocation: '東京都新宿区',
    nearestStation: '新宿三丁目駅'
  },
  {
    id: 't9',
    name: '山田 結衣',
    description: 'SNSマーケティング、広告運用の実績あり。',
    lat: 35.6580, 
    lng: 139.7016,
    userId: 'u3',
    price: 22000,
    skills: ['キャンペーンクルー', 'ディレクター'],
    carriers: ['SoftBank/Y!mobile'],
    experience: 'アパレル系企業のSNS運用代行を2年、その後広告代理店でWeb広告運用を1年経験。',
    prText: '若い層向けのプロモーション企画が得意です。イベントのSNS連携などもお任せください。',
    preferredArea: '電車で40分以内',
    locationName: '東京都渋谷区',
    companyName: '株式会社アルファ通信',
    maskedName: 'Yさん',
    baseLocation: '東京都渋谷区',
    nearestStation: '原宿駅'
  },
  {
    id: 't10',
    name: '中村 剛',
    description: 'イベント設営、力仕事全般お任せください。',
    lat: 35.7295, 
    lng: 139.7109,
    userId: 'u3',
    price: 13000,
    skills: [],
    carriers: [],
    experience: '建設現場での作業員を3年、イベント会場の設営・撤去スタッフを2年経験。',
    prText: '体力には絶対の自信があります。深夜のテント設営や重量物の運搬など、ハードな現場も歓迎します。',
    preferredArea: '全国対応可能（出張可）',
    locationName: '東京都豊島区',
    companyName: 'オメガ建設',
    maskedName: 'Nさん',
    baseLocation: '東京都豊島区',
    nearestStation: '大塚駅'
  }
];

const mockStaffs: Staff[] = [
  {
    id: 's1',
    userId: 'u1', // 株式会社アルファ通信 のスタッフ
    name: '伊藤 美咲',
    maskedName: 'Iさん',
    baseLocation: '東京都港区',
    nearestStation: '六本木駅',
    preferredArea: '港区・渋谷区周辺',
    price: 16000,
    skills: ['キャンペーンクルー'],
    carriers: ['docomo'],
    experience: 'モバイルイベントでのMC経験2年',
    prText: '明るい接客が得意です。'
  }
];

// データベースAPIを模倣した関数 (非同期でデータを返す)
export const api = {
  // すべての案件を取得
  getJobs: async (): Promise<Job[]> => {
    // ネットワークの遅延をシミュレート
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockJobs]);
      }, 500);
    });
  },

  // すべての人材を取得
  getTalents: async (): Promise<Talent[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...mockTalents]);
      }, 500);
    });
  },

  // 特定のユーザーを取得
  getUserById: async (id: string): Promise<User | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockUsers.find((u) => u.id === id));
      }, 300);
    });
  },

  // (将来用) 現在ログインしているユーザーを取得
  getCurrentUser: async (): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockUsers[0]); // デフォルトで 株式会社アルファ通信 を返す
      }, 300);
    });
  },

  // ログインユーザーの登録済みスタッフを取得
  getStaffsByUserId: async (userId: string): Promise<Staff[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockStaffs.filter((s) => s.userId === userId));
      }, 300);
    });
  },

  // 案件を追加する
  addJob: async (job: Omit<Job, 'id'>): Promise<Job> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newJob = { ...job, id: `j${mockJobs.length + 1}` };
        mockJobs.push(newJob);
        resolve(newJob);
      }, 300);
    });
  },

  // 人材を追加する
  addTalent: async (talent: Omit<Talent, 'id'>): Promise<Talent> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newTalent = { ...talent, id: `t${mockTalents.length + 1}` };
        mockTalents.push(newTalent);
        resolve(newTalent);
      }, 300);
    });
  },

  // スタッフを登録する
  addStaff: async (staff: Omit<Staff, 'id'>): Promise<Staff> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newStaff = { ...staff, id: `s${mockStaffs.length + 1}` };
        mockStaffs.push(newStaff);
        resolve(newStaff);
      }, 300);
    });
  }
};
