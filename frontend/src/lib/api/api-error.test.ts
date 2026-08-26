import { describe, expect, it } from 'vitest'

import {
  classifyStatus,
  isRetryable,
  normalizeApiError,
  normalizeApiResponseFailure,
  readApiMessage,
  resolveApiError,
  retryUnlessClientError,
} from '@/lib/api/api-error'
import type { ApiResponse } from '@/types/api'

/** axios rejection 최소 형태. status 와 response.data 만 본다. */
const axiosError = (status: number, data: unknown) => ({
  isAxiosError: true,
  response: { status, data },
})

/** 실제 dev 서버 404 응답 (COMMERCIAL_006) */
const notFoundBody: ApiResponse<null> = {
  dataHeader: {
    success: false,
    resultCode: 'COMMERCIAL_006',
    resultMessage:
      '해당 분기의 유동인구 데이터가 없습니다. 다른 분기를 선택해 주세요.',
  },
  dataBody: null,
}

/** 실제 dev 서버 400 검증 응답 (COMMERCIAL_101) */
const validationBody: ApiResponse<null> = {
  dataHeader: {
    success: false,
    resultCode: 'COMMERCIAL_101',
    resultMessage: {
      message: 'topN은 5 이상 30 이하여야 합니다.',
      errors: [
        {
          code: 'COMMERCIAL_101',
          field: 'topN',
          message: 'topN은 5 이상 30 이하여야 합니다.',
        },
      ],
    },
  },
  dataBody: null,
}

describe('classifyStatus', () => {
  it('상태 코드만으로 종류를 정한다', () => {
    expect(classifyStatus(null)).toBe('network')
    expect(classifyStatus(500)).toBe('server')
    expect(classifyStatus(503)).toBe('server')
    expect(classifyStatus(404)).toBe('not-found')
    expect(classifyStatus(401)).toBe('unauthorized')
    expect(classifyStatus(403)).toBe('unauthorized')
    expect(classifyStatus(400)).toBe('client')
    expect(classifyStatus(410)).toBe('client')
  })
})

describe('isRetryable', () => {
  it('재시도가 유효한 종류만 true 다', () => {
    expect(isRetryable('network')).toBe(true)
    expect(isRetryable('server')).toBe(true)
  })

  it('데이터 부재와 요청 문제는 재시도해도 결과가 같다', () => {
    expect(isRetryable('not-found')).toBe(false)
    expect(isRetryable('client')).toBe(false)
    expect(isRetryable('unauthorized')).toBe(false)
  })
})

describe('readApiMessage', () => {
  it('문자열 resultMessage 를 그대로 쓴다', () => {
    expect(readApiMessage('해당 분기의 매출 데이터가 없습니다.')).toBe(
      '해당 분기의 매출 데이터가 없습니다.',
    )
  })

  it('검증 응답은 요약 message 를 쓴다', () => {
    expect(readApiMessage(validationBody.dataHeader.resultMessage)).toBe(
      'topN은 5 이상 30 이하여야 합니다.',
    )
  })

  it('요약이 없으면 필드 메시지를 합친다', () => {
    expect(
      readApiMessage({
        errors: [
          { code: 'A_101', field: 'a', message: 'a는 필수입니다.' },
          { code: 'A_102', field: 'b', message: 'b는 필수입니다.' },
        ],
      }),
    ).toBe('a는 필수입니다.\nb는 필수입니다.')
  })

  it('errors 배열이 [object Object] 로 새지 않는다', () => {
    expect(
      readApiMessage(validationBody.dataHeader.resultMessage),
    ).not.toContain('[object Object]')
  })

  it('빈 값은 null 이다', () => {
    expect(readApiMessage(null)).toBeNull()
    expect(readApiMessage('   ')).toBeNull()
    expect(readApiMessage({})).toBeNull()
  })
})

describe('normalizeApiError', () => {
  it('404 는 서버 문구를 그대로 보존하고 재시도 대상이 아니다', () => {
    const result = normalizeApiError(axiosError(404, notFoundBody))

    expect(result.kind).toBe('not-found')
    expect(result.status).toBe(404)
    expect(result.code).toBe('COMMERCIAL_006')
    expect(result.message).toBe(
      '해당 분기의 유동인구 데이터가 없습니다. 다른 분기를 선택해 주세요.',
    )
    expect(isRetryable(result.kind)).toBe(false)
  })

  it('검증 실패는 필드별 오류를 분리해 준다', () => {
    const result = normalizeApiError(axiosError(400, validationBody))

    expect(result.kind).toBe('client')
    expect(result.fieldErrors).toEqual([
      {
        code: 'COMMERCIAL_101',
        field: 'topN',
        message: 'topN은 5 이상 30 이하여야 합니다.',
      },
    ])
  })

  it('5xx 는 재시도 대상이다', () => {
    const result = normalizeApiError(axiosError(503, null))

    expect(result.kind).toBe('server')
    expect(isRetryable(result.kind)).toBe(true)
    expect(result.message).toContain('잠시 후')
  })

  it('응답이 없으면 network 이고 상태는 null 이다', () => {
    const result = normalizeApiError(new Error('Network Error'))

    expect(result.kind).toBe('network')
    expect(result.status).toBeNull()
    expect(isRetryable(result.kind)).toBe(true)
  })

  it('BFF 가 만든 세션 만료 401 응답도 읽는다', () => {
    const result = normalizeApiError(
      axiosError(401, {
        message: '세션이 만료되었습니다. 다시 로그인해 주세요.',
      }),
    )

    expect(result.kind).toBe('unauthorized')
    expect(result.message).toBe('세션이 만료되었습니다. 다시 로그인해 주세요.')
  })

  it('본문이 없어도 상태별 기본 문구를 준다', () => {
    expect(normalizeApiError(axiosError(404, undefined)).message).toBe(
      '요청한 데이터가 없습니다.',
    )
  })
})

describe('normalizeApiResponseFailure', () => {
  it('성공 응답이면 null 이다', () => {
    const ok: ApiResponse<{ x: number }> = {
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: { x: 1 },
    }

    expect(normalizeApiResponseFailure(ok)).toBeNull()
    expect(normalizeApiResponseFailure(undefined)).toBeNull()
  })

  it('success=false 본문은 오류로 환산한다', () => {
    const result = normalizeApiResponseFailure(notFoundBody, 404)

    expect(result?.kind).toBe('not-found')
    expect(result?.code).toBe('COMMERCIAL_006')
  })
})

describe('resolveApiError', () => {
  it('던져진 에러를 우선 읽는다', () => {
    expect(
      resolveApiError({ error: axiosError(404, notFoundBody) })?.kind,
    ).toBe('not-found')
  })

  it('200 이지만 success=false 인 본문도 오류로 잡는다', () => {
    expect(resolveApiError({ data: notFoundBody })?.kind).toBe('client')
  })

  it('오류가 없으면 null 이다', () => {
    expect(resolveApiError({})).toBeNull()
    expect(
      resolveApiError({
        data: {
          dataHeader: { success: true, resultCode: null, resultMessage: null },
          dataBody: { x: 1 },
        },
      }),
    ).toBeNull()
  })
})

describe('retryUnlessClientError', () => {
  it('404 는 재시도하지 않는다', () => {
    expect(retryUnlessClientError(1)(0, axiosError(404, notFoundBody))).toBe(
      false,
    )
  })

  it('5xx 는 한도까지 재시도한다', () => {
    const retry = retryUnlessClientError(2)

    expect(retry(0, axiosError(500, null))).toBe(true)
    expect(retry(1, axiosError(500, null))).toBe(true)
    expect(retry(2, axiosError(500, null))).toBe(false)
  })
})
