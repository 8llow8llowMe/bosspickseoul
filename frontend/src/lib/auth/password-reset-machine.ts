import { EMAIL_PATTERN } from '@/components/auth/register-machine'
import { PASSWORD_PATTERN, PASSWORD_RULE_TEXT } from '@/lib/auth/password-rules'

/**
 * 로그인 **전** 비밀번호 재설정(A5)의 화면 상태.
 *
 * - `request`: 이메일을 받아 코드를 보내는 단계
 * - `verify`: 코드와 새 비밀번호를 받아 재설정하는 단계
 *
 * A2(로그인 후 변경·설정·전환)와 섞지 않는다. 화면도 다르고(로그인 전) 흐름도 다르다.
 */
export type PasswordResetStep = 'request' | 'verify'

/** 인증코드가 만료되었거나 발급된 적 없다. */
const EXPIRED_RESET_CODE = 'AUTH_005'
/** 오입력 5회 누적 — 백엔드가 코드를 **삭제**했다. */
const RESET_ATTEMPTS_EXCEEDED = 'AUTH_017'
/** 이메일당 재전송 쿨다운(60초) 위반. */
export const RESET_CODE_COOLDOWN = 'AUTH_003'
/** IP 기준 발송 상한. 이메일 쿨다운과 별개의 남용 방어다. */
export const RESET_IP_LIMITED = 'AUTH_016'

/**
 * 손에 든 코드가 **더 이상 쓸 수 없게 됐는가.**
 *
 * 두 코드 모두 백엔드에 코드가 남아 있지 않다는 뜻이라, 화면은 입력값을 비우고
 * 재전송을 **즉시 열어 줘야** 한다. 안 그러면 "다시 요청해 주세요" 라는 안내를 받은 채
 * 재전송 버튼이 잠긴 막다른 골목이 된다 — 회원가입에서 실제로 겪은 문제다
 * (`isEmailCodeInvalidated` 의 AUTH_018 이 같은 역할을 한다).
 */
export const isResetCodeInvalidated = (
  resultCode: string | null | undefined,
): boolean =>
  resultCode === EXPIRED_RESET_CODE || resultCode === RESET_ATTEMPTS_EXCEEDED

export const isValidResetEmail = (email: string): boolean =>
  EMAIL_PATTERN.test(email.trim())

export const canSubmitReset = (
  code: string,
  newPassword: string,
  confirmation: string,
): boolean =>
  code.trim().length > 0 &&
  PASSWORD_PATTERN.test(newPassword) &&
  newPassword === confirmation

/**
 * 새 비밀번호가 아직 제출할 수 없는 이유. 없으면 `null`.
 * A2 의 프로필 화면과 같은 규칙·같은 상수를 쓴다.
 */
export const describeResetPasswordIssue = (
  newPassword: string,
  confirmation: string,
): string | null => {
  if (!newPassword) return null
  // 규칙 문구도 정본에서 가져온다 — 문구가 갈리면 두 화면이 다른 규칙처럼 읽힌다.
  if (!PASSWORD_PATTERN.test(newPassword)) return PASSWORD_RULE_TEXT
  if (confirmation && newPassword !== confirmation) {
    return '새 비밀번호가 서로 달라요.'
  }
  return null
}
