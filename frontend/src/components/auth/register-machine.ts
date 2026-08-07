export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 백엔드 비밀번호 제약과 정확히 동일(register.md D4-3):
export const PASSWORD_PATTERN = new RegExp(
  String.raw`^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|])\S{8,20}$`,
)
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
