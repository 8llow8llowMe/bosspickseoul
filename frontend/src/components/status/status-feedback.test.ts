import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { normalizeApiError } from '@/lib/api/api-error'
import type { StatusRankedItem } from '@/types/status'
import StatusDetail from './status-detail'
import StatusFeedback from './status-feedback'

/**
 * 백엔드 공통 규약의 실패 응답 형태를 그대로 흉내 낸다.
 * `resultCode`·`resultMessage` 는 실재하는 값만 쓴다
 * (`DistrictErrorCode`·`CommercialErrorCode`, `backend/docs/api-reference.md` "에러코드 대역").
 */
const apiError = (status: number, resultCode: string, resultMessage: string) =>
  normalizeApiError({
    response: {
      status,
      data: {
        dataHeader: { success: false, resultCode, resultMessage },
      },
    },
  })

const selectedItem: StatusRankedItem = {
  rank: 1,
  districtCode: '11650',
  districtName: '서초구',
  value: 123456,
  changeRate: 4.2,
}

const renderFeedback = (error: ReturnType<typeof apiError>) =>
  renderToStaticMarkup(
    createElement(StatusFeedback, {
      state: 'error',
      error,
      onRetry: vi.fn(),
    }),
  )

const renderDetail = (error: ReturnType<typeof apiError>) =>
  renderToStaticMarkup(
    createElement(StatusDetail, {
      metric: 'footTraffic',
      selectedItem,
      detail: null,
      isLoading: false,
      error,
      onRetry: vi.fn(),
    }),
  )

describe('StatusFeedback', () => {
  it('5xx 일시 장애는 서버 문구와 재시도 버튼을 함께 노출한다', () => {
    const markup = renderFeedback(
      apiError(
        503,
        'COMMERCIAL_012',
        '지역 정보 서비스와의 통신이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.',
      ),
    )

    expect(markup).toContain('상권 현황을 불러오지 못했어요')
    expect(markup).toContain('지역 정보 서비스와의 통신이 원활하지 않습니다.')
    expect(markup).toContain('다시 시도')
    expect(markup).toContain('aria-live="assertive"')
  })

  it('404 데이터 부재는 재시도 버튼 없이 서버 문구만 노출한다', () => {
    const markup = renderFeedback(
      apiError(
        404,
        'DISTRICT_002',
        '해당 분기의 유동인구 데이터가 없습니다. 다른 분기를 선택해 주세요.',
      ),
    )

    expect(markup).toContain('표시할 상권 현황이 없어요')
    expect(markup).toContain('해당 분기의 유동인구 데이터가 없습니다.')
    expect(markup).not.toContain('다시 시도')
    // 데이터 부재는 발화를 가로챌 이유가 없다 — empty 분기와 같은 polite.
    expect(markup).toContain('aria-live="polite"')
    expect(markup).not.toContain('aria-live="assertive"')
  })
})

describe('StatusDetail', () => {
  it('5xx 일시 장애는 서버 문구와 재시도 버튼을 함께 노출한다', () => {
    const markup = renderDetail(
      apiError(
        503,
        'COMMERCIAL_012',
        '지역 정보 서비스와의 통신이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.',
      ),
    )

    expect(markup).toContain('상세 현황을 불러오지 못했어요')
    expect(markup).toContain('지역 정보 서비스와의 통신이 원활하지 않습니다.')
    expect(markup).toContain('다시 시도')
  })

  it('404 데이터 부재는 재시도 버튼 없이 서버 문구만 노출한다', () => {
    const markup = renderDetail(
      apiError(
        404,
        'DISTRICT_001',
        '해당 분기의 상권 변화 지표 데이터가 없습니다. 다른 분기를 선택해 주세요.',
      ),
    )

    expect(markup).toContain('상세 현황 데이터가 없어요')
    expect(markup).toContain('해당 분기의 상권 변화 지표 데이터가 없습니다.')
    expect(markup).not.toContain('다시 시도')
    expect(markup).toContain('aria-live="polite"')
    expect(markup).not.toContain('aria-live="assertive"')
  })
})
