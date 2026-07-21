import { describe, it, expect } from 'vitest'
import { isApiSuccess, getApiMessage } from './response'
import type { ApiResponse } from '@/types/api'

const ok: ApiResponse<{ x: number }> = {
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: { x: 1 },
}
const fail: ApiResponse<null> = {
  dataHeader: {
    success: false,
    resultCode: 'AUTH_001',
    resultMessage: '자격 증명이 올바르지 않습니다.',
  },
  dataBody: null,
}

describe('response', () => {
  it('isApiSuccess reads dataHeader.success', () => {
    expect(isApiSuccess(ok)).toBe(true)
    expect(isApiSuccess(fail)).toBe(false)
    expect(isApiSuccess(null)).toBe(false)
  })
  it('getApiMessage returns backend message or fallback', () => {
    expect(getApiMessage(fail)).toBe('자격 증명이 올바르지 않습니다.')
    expect(getApiMessage(ok, '기본')).toBe('기본')
  })
})
