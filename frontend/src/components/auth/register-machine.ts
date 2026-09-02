import { PASSWORD_PATTERN } from '@/lib/auth/password-rules'

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 비밀번호 규칙은 `@/lib/auth/password-rules` 가 정본이다. 여기서는 기존 import 경로를
 * 깨지 않으려고 다시 내보내기만 한다 — **재정의하지 말 것.** 프로필의 비밀번호 변경·
 * 최초 설정 화면이 같은 상수를 쓴다.
 */
export { PASSWORD_PATTERN }
export const NAME_MAX_LENGTH = 10
export const NICKNAME_MAX_LENGTH = 10

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

export const onEmailChanged = (
  state: RegisterState,
  email: string,
): RegisterState =>
  state.verifiedEmail && state.verifiedEmail !== email
    ? INITIAL_REGISTER_STATE
    : state

export const canSubmit = (
  state: RegisterState,
  form: RegisterForm,
): boolean => {
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
