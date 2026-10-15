// 標準の二次委託契約・従事者誓約書・掲載時の宣言・反社会的勢力に関する表明の文面。
//
// 位置づけ: 元請けとの基本契約(再委託先に同等の義務を負わせる、再委託は事前の書面承諾、
// 秘密保持・個人情報・反社排除・名称表示の禁止 等)を、二次請けに写した固定条項。
// 当事者や案件などの変動部分だけを差し込む。元請けの名称は文面に出さない(「元請け」と表記)。
//
// 重要: ここに置く文面は弁護士の確認前の【暫定版(叩き台)】。実案件で使う前にレビューすること。
// 文面を変えたら版(VERSION)を上げる。版は同意・署名の記録に残る。

import type { JobApprovalInfo } from './jobStates';

export const AGREEMENT_VERSION = '2026-10-draft-1';
export const PLEDGE_VERSION = '2026-10-draft-1';
export const DECLARATION_VERSION = '2026-10-draft-1';
export const ANTISOCIAL_VERSION = '2026-10-draft-1';

// ────────────────────────────────────────────────────────────────
// 標準二次委託契約
// ────────────────────────────────────────────────────────────────

export interface AgreementParty {
  name: string;
  address?: string;
  representative?: string;
}

export interface AgreementParams {
  /** 甲(発注側・元請けから受託した側) */
  client: AgreementParty;
  /** 乙(受注側・二次請け) */
  agency: AgreementParty;
  job: {
    title: string;
    jobCode?: string;
    roleType?: string;
    eventDate?: string;
    /** 公開地名(市区まで)。店舗名・詳細住所は契約書面に載せない(アプリ上で担当者にだけ開示) */
    publicLocation?: string;
    price?: number;
  };
  approval?: JobApprovalInfo;
  staffNames?: string[];
  concludedAt?: Date;
  /** 各社が登録している独自の契約テンプレート(個別特約として末尾に付す。固定条項が優先) */
  extraTerms?: string;
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function buildSubcontractAgreement(p: AgreementParams): string {
  const when = fmtDate(p.concludedAt || new Date());
  const price = p.job.price != null ? `${p.job.price.toLocaleString()}円（稼働日の単価・合計は案件の設定のとおり）` : '案件の設定のとおり';
  const staff = p.staffNames && p.staffNames.length > 0 ? p.staffNames.join('、') : '（アプリ上のアサインのとおり）';
  const ap = p.approval || {};
  const approvalText =
    ap.approvalDate || ap.evidenceRef
      ? `元請けの承諾日: ${ap.approvalDate || '（登録なし）'} ／ 承諾書面の参照: ${ap.evidenceRef || '（登録なし）'}`
      : '承諾の登録内容はアプリ上のとおり';

  const lines: string[] = [];
  lines.push('標準二次委託契約書（暫定版・弁護士確認前）');
  lines.push(`版: ${AGREEMENT_VERSION}`);
  lines.push('');
  lines.push(
    `${p.client.name}（以下「甲」）と${p.agency.name}（以下「乙」）は、甲が元請け事業者（以下「元請け」）から受託した業務（以下「元請契約」）の一部を、元請けの事前の書面承諾のもとで乙に再委託することについて、次のとおり契約（以下「本契約」）を締結する。`,
  );
  lines.push('');
  lines.push('第1条（委託業務）');
  lines.push('1. 甲は乙に次の業務（以下「本業務」）を委託し、乙はこれを受託する。');
  lines.push(`　案件: ${p.job.title}${p.job.jobCode ? `（${p.job.jobCode}）` : ''}`);
  if (p.job.roleType) lines.push(`　職種: ${p.job.roleType}`);
  if (p.job.eventDate) lines.push(`　稼働日: ${p.job.eventDate}`);
  if (p.job.publicLocation) lines.push(`　作業地域: ${p.job.publicLocation}`);
  lines.push(`　対価: ${price}`);
  lines.push('2. 店舗名・詳細住所・業務内容などの詳細は、乙の従事者に対し、アプリ上で開示される。');
  lines.push('');
  lines.push('第2条（元請けの承諾）');
  lines.push('1. 本契約は、元請けから再委託について事前の書面承諾を得ていることを前提とする。' + approvalText);
  lines.push('2. 元請けが承諾を撤回したとき、または元請契約が終了したときは、甲は本契約を直ちに解除できる。この場合、甲は乙に既履行部分の対価を支払うほか、責任を負わない。');
  lines.push('');
  lines.push('第3条（従事者・管理責任者）');
  lines.push('1. 乙は、本業務に従事させる者（乙の従業員。派遣社員・アルバイトを含む。以下「従事者」）を自ら選定し、その労務管理および本業務に関する一切の指揮命令を行う。');
  lines.push('2. 乙は、管理責任者を選任し、従事者の氏名とあわせて甲に通知する。変更があったときは直ちに通知する。');
  lines.push(`3. 本業務の従事者は、アプリ上でアサインされた者（${staff}）に限る。`);
  lines.push('');
  lines.push('第4条（再委託の禁止）');
  lines.push('乙は、甲および元請けの事前の書面承諾なく、本業務の全部または一部を第三者に再委託してはならない（有償無償を問わない）。');
  lines.push('');
  lines.push('第5条（報告）');
  lines.push('1. 乙は、本業務の経過および結果を、アプリの実績報告により甲に報告する。');
  lines.push('2. 乙は、法令、本契約または元請契約に違反する事実またはそのおそれがあるときは、直ちに甲に報告し、甲または元請けの指示に従って再発防止措置を講じる。');
  lines.push('');
  lines.push('第6条（調査・改善）');
  lines.push('甲および元請けは、いつでも本業務の遂行状況および管理体制を調査することができ、乙はこれに協力する。改善の指示があったときは、乙はこれに従う。');
  lines.push('');
  lines.push('第7条（名称・標章の使用禁止）');
  lines.push('乙は、元請けおよびそのグループ会社の商号・商標またはこれと誤認されるおそれのある表示を、事前の書面承諾なく使用し、または他人に使用させてはならない。');
  lines.push('');
  lines.push('第8条（秘密保持）');
  lines.push('1. 乙は、本業務に関して開示された一切の情報（店舗名、住所、業務内容、対価その他の取引条件を含む）を秘密として管理し、本業務の遂行に必要な範囲を超えて使用・複製してはならない。');
  lines.push('2. 乙は、前項の情報を、本業務の遂行に必要な最小限度の従事者以外に開示してはならない。乙は、従事者から、本契約と同等の義務を約した誓約書（アプリ上の電子誓約書を含む）を取得する。');
  lines.push('3. 情報の漏えいまたはそのおそれが生じたときは、乙は直ちに甲に報告する。');
  lines.push('4. 本契約が終了したとき、または甲もしくは元請けから求められたときは、乙は、開示された情報およびその複製物を、指示に従って返還・廃棄・消去する。');
  lines.push('5. 乙は、本契約に関する情報（業務内容、対価その他の取引条件を含む）が、甲と元請けおよびそのグループ会社との間で共有されることに同意する。');
  lines.push('');
  lines.push('第9条（個人情報）');
  lines.push('乙は、本業務に関して取り扱う個人情報について、個人情報の保護に関する法律その他の法令、元請けが定める指針および甲の指示に従い、適正に取り扱う。');
  lines.push('');
  lines.push('第10条（反社会的勢力の排除）');
  lines.push('1. 甲および乙は、自らおよびその役員・主要な従業員・主要な出資者が、暴力団、暴力団員、暴力団関係企業その他の反社会的勢力に該当せず、またこれらと社会的に非難されるべき関係を有しないことを、現在および将来にわたって表明し、保証する。');
  lines.push('2. 乙は、本業務の再委託先等（甲および元請けの承諾を得た者に限る）にも、前項の遵守を義務づける。');
  lines.push('3. 相手方または自己の委託先等が第1項に違反することが判明したときは、直ちに相手方に報告する。');
  lines.push('4. 甲および乙は、相手方または相手方の委託先等が第1項に違反したときは、何らの催告なく本契約を解除でき、これにより生じた損害について相手方に請求しない。');
  lines.push('');
  lines.push('第11条（法令遵守）');
  lines.push('甲および乙は、電気通信事業法、個人情報の保護に関する法律、下請代金支払遅延等防止法（中小受託取引適正化法）、労働関係法令その他の法令を遵守し、相手方の信用・名誉を害しない。');
  lines.push('');
  lines.push('第12条（対価・支払）');
  lines.push('1. 対価には、本業務の処理に必要な費用の一切が含まれる。ただし、案件に交通費・宿泊費の別途支給が定められている場合は、その定めによる。');
  lines.push('2. 甲は、乙の実績報告の承認を条件に、役務の提供を受けた日から起算して60日以内の日までに、対価を支払う。');
  lines.push('3. マッチング手数料その他アプリの利用に関する費用は、アプリの利用規約による。');
  lines.push('');
  lines.push('第13条（履行遅滞・損害賠償）');
  lines.push('甲および乙は、自己の責めに帰すべき事由により相手方に損害を与えたときは、その損害を賠償する。');
  lines.push('');
  lines.push('第14条（解除）');
  lines.push('甲または乙は、相手方が本契約に違反し、相当の期間を定めた催告を受けても是正しないとき、その他本契約を継続しがたい重大な事由が生じたときは、本契約を解除できる。');
  lines.push('');
  lines.push('第15条（譲渡禁止）');
  lines.push('甲および乙は、相手方の事前の書面による承諾なく、本契約上の地位または権利義務を第三者に譲渡し、または担保に供してはならない。');
  lines.push('');
  lines.push('第16条（存続）');
  lines.push('第7条から第10条までの規定は、本契約の終了後も有効に存続する。');
  lines.push('');
  lines.push('第17条（準拠法・管轄）');
  lines.push('本契約は日本法に準拠する。本契約に関する紛争は、甲の本店所在地を管轄する地方裁判所を第一審の専属的合意管轄裁判所とする。');
  lines.push('');
  lines.push('本契約の成立を証するため、甲および乙は、アプリ上で電磁的に承認し、各自その記録を保管する。');
  lines.push(`締結日: ${when}`);
  lines.push(`甲: ${p.client.name}${p.client.address ? `（${p.client.address}）` : ''}${p.client.representative ? ` 代表 ${p.client.representative}` : ''}`);
  lines.push(`乙: ${p.agency.name}${p.agency.address ? `（${p.agency.address}）` : ''}${p.agency.representative ? ` 代表 ${p.agency.representative}` : ''}`);

  if (p.extraTerms && p.extraTerms.trim()) {
    lines.push('');
    lines.push('【個別特約（各社登録の契約条項。上記の固定条項に反する部分は適用しない）】');
    lines.push(p.extraTerms.trim());
  }
  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────
// 従事者誓約書
// ────────────────────────────────────────────────────────────────

export const PLEDGE_TITLE = '従事者誓約書（暫定版）';

export function buildPledgeText(p: { companyName: string; staffName: string; jobTitle?: string }): string {
  return [
    `私（${p.staffName}）は、${p.companyName}（以下「会社」）の従事者として、${p.jobTitle ? `「${p.jobTitle}」` : 'この案件'}の業務（以下「本業務」）に従事するにあたり、次の事項を誓約します。`,
    '',
    '1. 本業務に関して知り得た情報（店舗名・住所・業務内容・対価・顧客情報その他）を、本業務の遂行に必要な範囲を超えて使用せず、第三者に開示・漏えいしません。本業務の終了後も同様です。',
    '2. 取り扱う個人情報（顧客の情報を含む）を、法令ならびに会社および元請けの指示に従って適正に取り扱い、目的外に利用しません。',
    '3. 元請けおよびそのグループ会社の名称・商標等を、承諾なく表示・使用しません。',
    '4. 本業務を、無断で他人に再委託せず、代行もさせません。',
    '5. 私は、反社会的勢力に該当せず、これらと関係を持ちません。',
    '6. 情報の漏えい、紛失、不正アクセス等（そのおそれを含む）に気付いたときは、直ちに会社に報告します。',
    '7. 会社または元請けによる調査、指示、教育に従います。',
    '8. 本業務の終了時には、指示に従い、資料・データを返却・廃棄・消去します。',
  ].join('\n');
}

// ────────────────────────────────────────────────────────────────
// 掲載時の宣言(案件を掲載する側)
// ────────────────────────────────────────────────────────────────

export const POSTING_DECLARATION_ITEMS: string[] = [
  'この業務の再委託には元請けの事前の書面承諾が必要であることを理解しており、承諾を得るまで二次委託を確定させません。',
  '掲載内容に、元請け・キャリアの名称、店舗名、詳細住所などの秘匿情報を含めていません（詳細は専用欄にのみ入力しています）。',
  '受注側に、元請けとの契約と同等の義務（秘密保持・個人情報・反社排除・再委託の禁止など）を負わせます。',
];

// ────────────────────────────────────────────────────────────────
// 反社会的勢力に関する表明(アカウント登録時)
// ────────────────────────────────────────────────────────────────

export const ANTISOCIAL_STATEMENT =
  '当社および当社の役員・主要な従業員・主要な出資者が、暴力団、暴力団員、暴力団関係企業その他の反社会的勢力に該当せず、またこれらと社会的に非難されるべき関係を有しないことを、現在および将来にわたって表明し、保証します。違反が判明した場合は、アカウントの停止・契約の解除を受けても異議を述べません。';

/** 同意の記録(案件・契約・誓約書などに付ける) */
export interface ConsentRecord {
  version: string;
  acceptedAt: string;
  /** 同意した人(担当者名や会社名) */
  acceptedBy?: string;
}
