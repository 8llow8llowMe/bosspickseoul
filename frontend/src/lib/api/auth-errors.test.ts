import { describe, it, expect } from 'vitest'
import { classifyAuthError, getAuthErrorMessage } from './auth-errors'
import type { ApiResponse } from '@/types/api'

describe('classifyAuthError', () => {
  it('maps code-related resultCodes to the code field', () => {
    expect(classifyAuthError('AUTH_004')).toBe('code')
  })
  it('maps email-verification resultCode to the email field', () => {
    expect(classifyAuthError('MEMBER_006')).toBe('email')
  })
  it('defaults to general for unknown/null codes', () => {
    expect(classifyAuthError('SOMETHING_ELSE')).toBe('general')
    expect(classifyAuthError(null)).toBe('general')
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
