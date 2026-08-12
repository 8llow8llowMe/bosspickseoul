import { describe, it, expect } from 'vitest'
import { getResponseBody, isApiSuccess, isResponseError, getApiMessage } from './response'
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

const okResponse = <T,>(body: T): ApiResponse<T> => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: body,
})
const failResponse = (): ApiResponse<unknown> => ({
  dataHeader: { success: false, resultCode: 'E', resultMessage: 'x' },
  dataBody: null,
})

describe('getResponseBody', () => {
  it('성공 응답은 dataBody를 반환한다', () => {
    expect(getResponseBody(okResponse({ a: 1 }))).toEqual({ a: 1 })
  })
  it('성공이지만 body가 null이면 null', () => {
    expect(getResponseBody(okResponse(null))).toBeNull()
  })
  it('undefined/실패 응답은 null', () => {
    expect(getResponseBody(undefined)).toBeNull()
    expect(
      getResponseBody(failResponse() as ApiResponse<{ a: number } | null>),
    ).toBeNull()
  })
})

describe('isResponseError', () => {
  it('undefined는 에러 아님(미도착)', () => {
    expect(isResponseError(undefined)).toBe(false)
  })
  it('실패 응답은 에러', () => {
    expect(isResponseError(failResponse())).toBe(true)
  })
})
