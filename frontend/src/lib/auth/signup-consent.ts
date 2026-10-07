import type { ApiFieldError } from '@/types/api'

/**
 * 가입 동의 — 이용약관 · 개인정보 처리방침 · 만 14세 이상 확인 (#495).
 *
 * 정본 계약은 `backend/docs/auth-account-frontend-guide.md` §0 이다.
 * - 세 값은 **각각** 보낸다. 「전체 동의」는 화면의 편의일 뿐이다.
 * - 문서 판(version)은 서버 설정으로 정해지므로 **보내지 않는다.**
 *
 * 이메일 가입(바디)과 카카오 가입(authorize 쿼리)이 같은 값을 쓴다. 이 파일은
 * 클라이언트 번들에 실리므로 서버 전용 모듈을 import 하지 않는다.
 */

export type SignupConsentKey =
  'termsAgreed' | 'privacyAgreed' | 'ageOver14Confirmed'

export type SignupConsent = Record<SignupConsentKey, boolean>

/** 선언 순서 = 백엔드 오류 순서(계약 §0-1). 화면에 그리는 순서도 이것이다. */
export const SIGNUP_CONSENT_KEYS: readonly SignupConsentKey[] = [
  'termsAgreed',
  'privacyAgreed',
  'ageOver14Confirmed',
]

export const EMPTY_SIGNUP_CONSENT: SignupConsent = {
  termsAgreed: false,
  privacyAgreed: false,
  ageOver14Confirmed: false,
}

export const isSignupConsentComplete = (consent: SignupConsent): boolean =>
  SIGNUP_CONSENT_KEYS.every(key => consent[key])

export const setAllSignupConsent = (value: boolean): SignupConsent => ({
  termsAgreed: value,
  privacyAgreed: value,
  ageOver14Confirmed: value,
})

export const missingSignupConsent = (
  consent: SignupConsent,
): SignupConsentKey[] => SIGNUP_CONSENT_KEYS.filter(key => !consent[key])

/**
 * authorize 쿼리. 켜진 항목만 싣는다 — 백엔드는 빠진 항목을 `false` 로 본다.
 * 하나도 없으면 빈 문자열이다.
 */
export const signupConsentQuery = (consent: SignupConsent): string => {
  const params = new URLSearchParams()
  for (const key of SIGNUP_CONSENT_KEYS) {
    if (consent[key]) params.set(key, 'true')
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

/**
 * 이메일 가입 실패 코드 → 강조할 **후보** 체크박스.
 *
 * `MEMBER_010`(CONSENT_REQUIRED)은 약관·처리방침 공용 코드라 후보가 둘이다. 어느 쪽인지는
 * 지금 화면의 동의 상태로 좁힌다(`signupConsentErrorKeys`). `MEMBER_010`/`MEMBER_011` 은
 * 서버 가드라 정상 화면에서는 나오지 않는다.
 */
const ERROR_CODE_CANDIDATES: Record<string, readonly SignupConsentKey[]> = {
  MEMBER_114: ['termsAgreed'],
  MEMBER_115: ['privacyAgreed'],
  MEMBER_116: ['ageOver14Confirmed'],
  MEMBER_010: ['termsAgreed', 'privacyAgreed'],
  MEMBER_011: ['ageOver14Confirmed'],
}

export const signupConsentErrorCandidates = (
  resultCode: string | null | undefined,
): SignupConsentKey[] =>
  resultCode && Object.hasOwn(ERROR_CODE_CANDIDATES, resultCode)
    ? [...ERROR_CODE_CANDIDATES[resultCode]]
    : []

const isSignupConsentKey = (value: string): value is SignupConsentKey =>
  (SIGNUP_CONSENT_KEYS as readonly string[]).includes(value)

/**
 * 후보 가운데 지금 꺼진 것만 남긴다. 모두 켜져 있으면(화면과 서버가 어긋남) 후보를 모두 강조한다 —
 * 아무것도 강조하지 않으면 사용자가 무엇을 고쳐야 하는지 알 수 없다.
 */
const narrowToUnchecked = (
  candidates: readonly SignupConsentKey[],
  consent: SignupConsent,
): readonly SignupConsentKey[] => {
  const unchecked = candidates.filter(key => !consent[key])
  return unchecked.length > 0 ? unchecked : candidates
}

/**
 * 실패 응답에서 강조할 체크박스를 모두 고른다.
 *
 * 여러 항목이 함께 빠지면 `resultCode` 는 첫 오류뿐이고 `resultMessage.errors[]` 에 항목별
 * `{code, field, message}` 가 모두 담긴다(계약 §0-1). 필드마다 한 번만 센다 — 필드별 첫 오류.
 * `errors[]` 파싱은 `normalizeApiResponseFailure(...).fieldErrors` 가 맡는다.
 */
export const signupConsentErrorKeys = (
  resultCode: string | null | undefined,
  consent: SignupConsent,
  fieldErrors: readonly ApiFieldError[],
): SignupConsentKey[] => {
  const found = new Set<SignupConsentKey>()
  const add = (keys: readonly SignupConsentKey[]) =>
    narrowToUnchecked(keys, consent).forEach(key => found.add(key))

  add(signupConsentErrorCandidates(resultCode))
  for (const item of fieldErrors) {
    if (isSignupConsentKey(item.field)) found.add(item.field)
    else add(signupConsentErrorCandidates(item.code))
  }
  return SIGNUP_CONSENT_KEYS.filter(key => found.has(key))
}

/**
 * 체크박스 아래 오류 문구. 본문·오류는 해요체가 기본이다(DESIGN.md §10).
 * 만 14세 문구는 계약 §0-1 의 「만 14세 이상만 가입할 수 있습니다」를 해요체로 옮겼다.
 */
export const SIGNUP_CONSENT_ERROR_MESSAGE: Record<SignupConsentKey, string> = {
  termsAgreed: '이용약관에 동의해 주세요.',
  privacyAgreed: '개인정보 처리방침에 동의해 주세요.',
  ageOver14Confirmed: '만 14세 이상만 가입할 수 있어요.',
}

/** 가입 모드 카카오 버튼을 동의 없이 눌렀을 때. */
export const SOCIAL_SIGNUP_CONSENT_REQUIRED_MESSAGE =
  '카카오로 가입하려면 필수 항목에 모두 동의해 주세요.'

/**
 * 카카오 첫 가입 동의 화면(`/register/social`)으로 보내는 사유.
 * - `terms` — `AUTH_021`(문서 동의 없음·부족)
 * - `age` — `AUTH_022`(문서 동의는 했지만 만 14세 미확인)
 */
export type SocialSignupReason = 'terms' | 'age'

/** 모르는 값은 `terms` 로 본다 — 세 항목을 모두 다시 받는 쪽이 안전하다. */
export const parseSocialSignupReason = (
  value: string | null | undefined,
): SocialSignupReason => (value === 'age' ? 'age' : 'terms')

export const SOCIAL_SIGNUP_PATH = '/register/social'

/**
 * 동의 화면 경로. 복귀 경로가 루트가 아니면 `redirect` 로 넘긴다 — 콜백이 복귀 경로 쿠키를
 * 지웠으므로, 동의 화면의 카카오 버튼이 이 값으로 쿠키를 다시 남긴다.
 * `returnPath` 는 호출부가 이미 `safeReturnPath` 로 거른 값이어야 한다.
 */
export const socialSignupPath = ({
  provider,
  reason,
  returnPath,
}: {
  provider: string
  reason: SocialSignupReason
  returnPath: string
}): string => {
  const params = new URLSearchParams({ provider, reason })
  if (returnPath !== '/') params.set('redirect', returnPath)
  return `${SOCIAL_SIGNUP_PATH}?${params.toString()}`
}
