import { describe, expect, it } from 'vitest'

import {
  classifyStatus,
  isCanceledError,
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

/** HTTP 200 인데 dataHeader.success=false 인 본문 (상태를 알 수 없는 경로) */
const successFalseBody: ApiResponse<null> = {
  dataHeader: {
    success: false,
    resultCode: 'COMMUNITY_001',
    resultMessage: '게시글을 찾을 수 없습니다.',
  },
  dataBody: null,
}

describe('classifyStatus', () => {
  it('상태 코드만으로 종류를 정한다', () => {
    expect(classifyStatus(null)).toBe('network')
    // 상태 0 은 "코드 자체가 없음"이다 (CORS 차단·프록시 조기 종료)
    expect(classifyStatus(0)).toBe('network')
    expect(classifyStatus(500)).toBe('server')
    expect(classifyStatus(503)).toBe('server')
    expect(classifyStatus(404)).toBe('not-found')
    expect(classifyStatus(401)).toBe('unauthorized')
    expect(classifyStatus(403)).toBe('unauthorized')
    expect(classifyStatus(400)).toBe('client')
    expect(classifyStatus(410)).toBe('client')
    expect(classifyStatus(422)).toBe('client')
    // 429 는 규약상 "그 외 4xx" — 재시도 버튼을 붙이지 않는다.
    // 서버 문구가 "잠시 후 다시 시도"라고 말하는 경우가 있으니 화면 카피는 그 점을 고려해야 한다.
    expect(classifyStatus(429)).toBe('client')
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

  it('요약이 없고 errors 만 있어도 [object Object] 로 새지 않는다', () => {
    // 예전 구현의 Object.values(...).join() 이 배열을 [object Object] 로 렌더했다.
    const message = readApiMessage({
      errors: [{ code: 'A_101', field: 'a', message: 'a는 필수입니다.' }],
    })

    expect(message).toBe('a는 필수입니다.')
    expect(message).not.toContain('[object Object]')
  })

  it('resultMessage 가 배열이나 숫자면 null 이다', () => {
    expect(readApiMessage([] as unknown as null)).toBeNull()
    expect(readApiMessage(42 as unknown as null)).toBeNull()
  })

  it('field 가 없는 errors 항목은 버린다', () => {
    // 폼 매핑이 undefined 키를 만들지 않도록 field 까지 확인한다.
    expect(
      readApiMessage({
        errors: [
          { message: 'field 없는 항목' } as never,
          { code: null, field: 'b', message: 'b는 필수입니다.' },
        ],
      }),
    ).toBe('b는 필수입니다.')
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

  it('알 수 없는 값은 network 로 두고 상태는 null 이다', () => {
    // 메시지도 형태도 없는 값 — 통신 실패로 보수적으로 처리한다.
    const result = normalizeApiError(null)

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

  it('앱이 던진 도메인 오류는 메시지를 살리고 재시도하지 않는다', () => {
    // 이 저장소는 "200 + success:false" 를 쿼리 함수에서 직접 throw 한다
    // (community-list-page.tsx 의 CommunityListQueryError 등).
    class CommunityListQueryError extends Error {}
    const result = normalizeApiError(
      new CommunityListQueryError('게시글을 불러오지 못했습니다.'),
    )

    expect(result.kind).toBe('client')
    expect(result.message).toBe('게시글을 불러오지 못했습니다.')
    expect(isRetryable(result.kind)).toBe(false)
  })

  it('axios 통신 실패는 network 이고 axios 내부 문구를 노출하지 않는다', () => {
    const result = normalizeApiError(
      Object.assign(new Error('Network Error'), {
        isAxiosError: true,
        code: 'ERR_NETWORK',
      }),
    )

    expect(result.kind).toBe('network')
    expect(result.message).not.toBe('Network Error')
    expect(isRetryable(result.kind)).toBe(true)
  })

  it('axios 타임아웃도 network 이다', () => {
    const result = normalizeApiError(
      Object.assign(new Error('timeout of 5000ms exceeded'), {
        isAxiosError: true,
        code: 'ECONNABORTED',
      }),
    )

    expect(result.kind).toBe('network')
    expect(isRetryable(result.kind)).toBe(true)
  })

  it('fetch 통신 실패(TypeError)도 network 이다', () => {
    expect(normalizeApiError(new TypeError('Failed to fetch')).kind).toBe(
      'network',
    )
  })

  it('본문이 HTML 문자열이어도 상태로 분류한다', () => {
    const result = normalizeApiError(
      axiosError(502, '<html>Bad Gateway</html>'),
    )

    expect(result.kind).toBe('server')
    expect(result.message).not.toContain('<html>')
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

describe('isCanceledError', () => {
  it('취소된 요청을 알아본다', () => {
    expect(isCanceledError(new DOMException('중단됨', 'AbortError'))).toBe(true)
    expect(
      isCanceledError(
        Object.assign(new Error('canceled'), { code: 'ERR_CANCELED' }),
      ),
    ).toBe(true)
  })

  it('일반 오류는 취소가 아니다', () => {
    expect(isCanceledError(new Error('boom'))).toBe(false)
    expect(isCanceledError(axiosError(500, null))).toBe(false)
    expect(isCanceledError(null)).toBe(false)
  })
})

describe('resolveApiError', () => {
  it('던져진 에러를 우선 읽는다', () => {
    expect(
      resolveApiError({ error: axiosError(404, notFoundBody) })?.kind,
    ).toBe('not-found')
  })

  it('200 이지만 success=false 인 본문도 오류로 잡는다', () => {
    const result = resolveApiError({ data: successFalseBody })

    // 본문이 도착했으므로 통신 실패가 아니다. 상태를 모르므로 재시도 대상이 아닌 client 로 둔다.
    expect(result?.kind).toBe('client')
    expect(result?.message).toBe('게시글을 찾을 수 없습니다.')
    expect(isRetryable(result!.kind)).toBe(false)
  })

  it('취소된 요청은 오류가 아니다', () => {
    expect(
      resolveApiError({ error: new DOMException('중단됨', 'AbortError') }),
    ).toBeNull()
  })

  it('직전 성공 데이터가 있어도 새 실패를 그대로 알린다', () => {
    // React Query 는 refetch 실패 시 직전 data 를 유지한 채 error 를 채운다.
    // 이 함수는 "실패했다"까지만 알리고, 이전 데이터를 계속 보여줄지는 화면이 정한다.
    const result = resolveApiError({
      error: axiosError(503, null),
      data: {
        dataHeader: { success: true, resultCode: null, resultMessage: null },
        dataBody: { x: 1 },
      },
    })

    expect(result?.kind).toBe('server')
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

  it('취소된 요청은 재시도하지 않는다', () => {
    expect(
      retryUnlessClientError(3)(0, new DOMException('중단됨', 'AbortError')),
    ).toBe(false)
  })

  it('기본 한도는 1회다', () => {
    const retry = retryUnlessClientError()

    expect(retry(0, axiosError(500, null))).toBe(true)
    expect(retry(1, axiosError(500, null))).toBe(false)
  })

  it('5xx 는 한도까지 재시도한다', () => {
    const retry = retryUnlessClientError(2)

    expect(retry(0, axiosError(500, null))).toBe(true)
    expect(retry(1, axiosError(500, null))).toBe(true)
    expect(retry(2, axiosError(500, null))).toBe(false)
  })
})
