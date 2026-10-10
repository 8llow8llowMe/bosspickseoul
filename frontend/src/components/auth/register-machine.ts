import { NICKNAME_MAX_LENGTH } from '@/lib/auth/nickname-rules'
import {
  PASSWORD_PATTERN,
  PASSWORD_RULE_TEXT,
  PASSWORD_RULES,
  type PasswordRuleKey,
} from '@/lib/auth/password-rules'
import {
  isSignupConsentComplete,
  type SignupConsent,
} from '@/lib/auth/signup-consent'

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 비밀번호 규칙은 `@/lib/auth/password-rules`, 닉네임 규칙은 `@/lib/auth/nickname-rules`
 * 가 정본이다. 여기서는 기존 import 경로를 깨지 않으려고 다시 내보내기만 한다 —
 * **재정의하지 말 것.** 프로필의 비밀번호 변경·최초 설정·회원 정보 수정 화면이 같은
 * 상수를 쓴다.
 */
export { PASSWORD_PATTERN, PASSWORD_RULES, type PasswordRuleKey }
export { NICKNAME_MAX_LENGTH }
export const NAME_MAX_LENGTH = 10

export type RegisterStep = 'email-entry' | 'code-sent' | 'verified'
export type RegisterState = {
  step: RegisterStep
  verifiedEmail: string | null
}
export type RegisterForm = {
  email: string
  password: string
  name: string
  nickname: string
}

export const INITIAL_REGISTER_STATE: RegisterState = {
  step: 'email-entry',
  verifiedEmail: null,
}

export const onCodeSent = (state: RegisterState): RegisterState => ({
  ...state,
  step: 'code-sent',
})

export const onVerified = (
  state: RegisterState,
  email: string,
): RegisterState => ({ step: 'verified', verifiedEmail: email })

/**
 * 이메일을 고치면 그 이메일에 묶인 진행을 버린다.
 *
 * - `code-sent`: 코드는 **보낸 주소**에 묶여 있다. 고친 주소로 옛 코드를 확인하게 두면 안 되므로
 *   바뀌는 즉시 발송 단계로 되돌린다(#578). 화면은 발송 때 보낸 값으로 `form.email` 을 맞춰
 *   두므로, 이 전이가 불렸다는 것 자체가 보낸 주소와 달라졌다는 뜻이다.
 * - `verified`: 인증한 주소와 달라지면 처음부터 다시 한다.
 */
export const onEmailChanged = (
  state: RegisterState,
  email: string,
): RegisterState => {
  if (state.step === 'code-sent') return INITIAL_REGISTER_STATE
  return state.verifiedEmail && state.verifiedEmail !== email
    ? INITIAL_REGISTER_STATE
    : state
}

export const EMAIL_FORMAT_MESSAGE = '올바른 이메일 형식을 입력해주세요.'

/** 인증 뒤에 채우는 칸. 가입 버튼이 잠긴 이유는 이 칸들 옆에서 말한다(#578). */
export type RegisterProfileField = 'password' | 'name' | 'nickname'

export const REGISTER_FIELD_MESSAGES: Record<RegisterProfileField, string> = {
  // 정본 한 문장을 그대로 쓴다 — 재설정·프로필 비밀번호 변경과 같은 문장이어야 한다.
  password: PASSWORD_RULE_TEXT,
  name: `이름을 1~${NAME_MAX_LENGTH}자로 입력해주세요.`,
  nickname: `닉네임을 1~${NICKNAME_MAX_LENGTH}자로 입력해주세요.`,
}

/** 칸 하나를 검사한다. 통과하면 `null`, 아니면 그 칸 옆에 보일 문구. */
export const validateRegisterField = (
  field: RegisterProfileField,
  value: string,
): string | null => {
  if (field === 'password') {
    return PASSWORD_PATTERN.test(value)
      ? null
      : REGISTER_FIELD_MESSAGES.password
  }
  const length = value.trim().length
  const max = field === 'name' ? NAME_MAX_LENGTH : NICKNAME_MAX_LENGTH
  return length > 0 && length <= max ? null : REGISTER_FIELD_MESSAGES[field]
}

export const REGISTER_PROFILE_FIELDS: readonly RegisterProfileField[] = [
  'password',
  'name',
  'nickname',
]

/**
 * 가입을 막는 칸과 그 이유. 화면 순서(비밀번호 → 이름 → 닉네임)대로 담는다 —
 * 첫 항목으로 포커스를 옮기기 때문이다. 동의는 `missingSignupConsent` 가 따로 본다.
 */
export const registerFieldErrors = (
  form: RegisterForm,
): Partial<Record<RegisterProfileField, string>> => {
  const errors: Partial<Record<RegisterProfileField, string>> = {}
  for (const field of REGISTER_PROFILE_FIELDS) {
    const message = validateRegisterField(field, form[field])
    if (message) errors[field] = message
  }
  return errors
}

/**
 * 가입 버튼을 켤 수 있는가. 필수 동의 세 항목도 조건이다(#495, 계약 §0-1) —
 * 서버도 막지만(`MEMBER_114~116`) 동의 전에는 버튼을 켜지 않는다.
 */
export const canSubmit = (
  state: RegisterState,
  form: RegisterForm,
  consent: SignupConsent,
): boolean => {
  if (!isSignupConsentComplete(consent)) return false
  if (state.step !== 'verified') return false
  if (form.email !== state.verifiedEmail) return false
  const name = form.name.trim()
  const nickname = form.nickname.trim()
  return (
    EMAIL_PATTERN.test(form.email) &&
    PASSWORD_PATTERN.test(form.password) &&
    name.length > 0 &&
    name.length <= NAME_MAX_LENGTH &&
    nickname.length > 0 &&
    nickname.length <= NICKNAME_MAX_LENGTH
  )
}
