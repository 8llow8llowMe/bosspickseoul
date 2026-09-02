import type { ApiResponse } from '@/types/api'
import { getApiMessage } from './response'

export type AuthErrorField = 'email' | 'code' | 'general'

/** 인증코드가 만료되었거나 발급된 적 없다. 새로 받아야 한다. */
const EXPIRED_EMAIL_CODE = 'AUTH_005'
/** 오입력 5회 누적 — 백엔드가 코드를 **삭제**했다. 새로 받아야 한다. */
const EMAIL_CODE_ATTEMPTS_EXCEEDED = 'AUTH_018'
/** 이메일당 재전송 쿨다운(60초) 위반. */
export const EMAIL_CODE_COOLDOWN = 'AUTH_003'

// 백엔드 resultCode → 안내할 입력 필드. 확인된 코드만 매핑하고 나머지는 general.
const CODE_FIELD: Record<string, AuthErrorField> = {
  AUTH_004: 'code', // 인증코드 불일치
  [EXPIRED_EMAIL_CODE]: 'code', // 인증코드 만료·미발급
  [EMAIL_CODE_ATTEMPTS_EXCEEDED]: 'code', // 시도 횟수 초과 (코드 무효화됨)
  MEMBER_006: 'email', // 이메일 인증 미완료
}

export const classifyAuthError = (
  resultCode: string | null | undefined,
): AuthErrorField => (resultCode && CODE_FIELD[resultCode]) || 'general'

/**
 * 손에 든 인증코드가 **더 이상 쓸 수 없게 됐는가.**
 *
 * 두 코드 모두 백엔드에 코드가 남아 있지 않다는 뜻이라, 화면은 입력값을 비우고
 * 재전송을 즉시 열어 줘야 한다. 안 그러면 "다시 요청해 주세요" 라는 안내를 받은 채
 * 재전송 버튼이 잠긴 막다른 골목이 된다.
 */
export const isEmailCodeInvalidated = (
  resultCode: string | null | undefined,
): boolean =>
  resultCode === EXPIRED_EMAIL_CODE ||
  resultCode === EMAIL_CODE_ATTEMPTS_EXCEEDED

export const getAuthErrorMessage = (
  response: ApiResponse<unknown> | null | undefined,
  fallback?: string,
): string => getApiMessage(response, fallback)
