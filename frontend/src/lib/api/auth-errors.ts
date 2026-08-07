import type { ApiResponse } from '@/types/api'
import { getApiMessage } from './response'

export type AuthErrorField = 'email' | 'code' | 'general'

// 백엔드 resultCode → 안내할 입력 필드. 확인된 코드만 매핑하고 나머지는 general.
const CODE_FIELD: Record<string, AuthErrorField> = {
  AUTH_004: 'code', // 인증코드 불일치
  AUTH_005: 'code', // 인증코드 만료(추정) — 확인 시 유지, 아니면 무해
  MEMBER_006: 'email', // 이메일 인증 미완료
}

export const classifyAuthError = (
  resultCode: string | null | undefined,
): AuthErrorField => (resultCode && CODE_FIELD[resultCode]) || 'general'

export const getAuthErrorMessage = (
  response: ApiResponse<unknown> | null | undefined,
  fallback?: string,
): string => getApiMessage(response, fallback)
