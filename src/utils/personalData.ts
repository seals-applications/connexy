/**
 * 従事者(スタッフ)の個人情報の取扱いに関する同意。
 * 元請け契約(第31条 個人情報、第32条 従事者の通知)に沿って、氏名・生年月日などを
 * 発注企業および元請け事業者へ通知・提供することを、本人へ説明して同意を得た記録を残す。
 * 文面は暫定版(弁護士確認前)。文面を変えたら版を上げる。
 */
export const PERSONAL_DATA_CONSENT_VERSION = '2026-10-v1';
export const PERSONAL_DATA_CONSENT_TITLE = '従事者の個人情報の取扱いについて';

export const PERSONAL_DATA_CONSENT_TEXT = `【利用目的】
1. 業務の遂行に必要な連絡・シフト管理・勤怠(出勤)の確認
2. 発注企業および元請け事業者への従事者としての氏名等の通知(契約上の義務のため)
3. 現場での本人確認、安全管理、事故・トラブル発生時の対応

【提供する情報】
氏名、フリガナ、生年月日(年齢)、拠点・最寄り駅、スキル・経験、出勤記録、(任意で登録した場合)性別

【提供先】
業務の発注企業(二次委託の発注者)、およびその元請け事業者。業務に関係する範囲に限り、その他の第三者へは提供しません。

【保管・削除】
業務に必要な期間保管し、契約終了後は法令・契約上必要な期間を経て削除します。本人は開示・訂正・利用停止を、登録した会社の管理者に求めることができます。

【任意項目】
性別の登録は任意です。名前などから性別を推測して表示することはありません。`;

/** completedTrainings に混ぜて保存する同意記録のタグ: STAFF_CONSENT_<版>@<ISO日時> */
export const CONSENT_TAG_PREFIX = 'STAFF_CONSENT_';

export interface PersonalDataConsent {
  version: string;
  at: string;
}

export const buildConsentTag = (consent: PersonalDataConsent): string =>
  `${CONSENT_TAG_PREFIX}${consent.version}@${consent.at}`;

export const parseConsentTag = (tag: string): PersonalDataConsent | null => {
  if (!tag.startsWith(CONSENT_TAG_PREFIX)) return null;
  const body = tag.slice(CONSENT_TAG_PREFIX.length);
  const idx = body.indexOf('@');
  if (idx <= 0) return null;
  return { version: body.slice(0, idx), at: body.slice(idx + 1) };
};

/** 現行の版で同意の記録があるか。 */
export const hasCurrentConsent = (staff: { personalDataConsent?: PersonalDataConsent } | null | undefined): boolean =>
  !!staff?.personalDataConsent && staff.personalDataConsent.version === PERSONAL_DATA_CONSENT_VERSION;

export const newConsent = (): PersonalDataConsent => ({
  version: PERSONAL_DATA_CONSENT_VERSION,
  at: new Date().toISOString(),
});
