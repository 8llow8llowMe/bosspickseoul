import { describe, it, expect } from 'vitest'
import {
  classifyAuthError,
  getAuthErrorMessage,
  isEmailCodeInvalidated,
} from './auth-errors'
import type { ApiResponse } from '@/types/api'

describe('classifyAuthError', () => {
  it('maps code-related resultCodes to the code field', () => {
    expect(classifyAuthError('AUTH_004')).toBe('code')
  })
  it('시도 횟수 초과(AUTH_018)도 코드 입력란에 붙인다', () => {
    expect(classifyAuthError('AUTH_018')).toBe('code')
    expect(classifyAuthError('AUTH_005')).toBe('code')
  })
  it('maps email-verification resultCode to the email field', () => {
    expect(classifyAuthError('MEMBER_006')).toBe('email')
  })
  it('defaults to general for unknown/null codes', () => {
    expect(classifyAuthError('SOMETHING_ELSE')).toBe('general')
    expect(classifyAuthError(null)).toBe('general')
  })
})

describe('isEmailCodeInvalidated', () => {
  it('만료·시도초과는 손에 든 코드가 죽었다는 뜻이다', () => {
    expect(isEmailCodeInvalidated('AUTH_005')).toBe(true)
    expect(isEmailCodeInvalidated('AUTH_018')).toBe(true)
  })
  it('단순 불일치(AUTH_004)는 코드가 살아 있다 — 다시 입력하면 된다', () => {
    expect(isEmailCodeInvalidated('AUTH_004')).toBe(false)
    expect(isEmailCodeInvalidated(null)).toBe(false)
  })
})

describe('getAuthErrorMessage', () => {
  it('returns backend resultMessage when present', () => {
    const res: ApiResponse<null> = {
      dataHeader: {
        success: false,
        resultCode: 'AUTH_004',
        resultMessage: '인증코드가 일치하지 않습니다.',
      },
      dataBody: null,
    }
    expect(getAuthErrorMessage(res)).toBe('인증코드가 일치하지 않습니다.')
  })
  it('falls back when message missing', () => {
    expect(getAuthErrorMessage(null, '기본 오류')).toBe('기본 오류')
  })
})
