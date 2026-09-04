import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import MetricRankingBoard from '@/components/home/metric-ranking-board'
import { HOME_TOP_TEN_QUERY_KEY } from '@/hooks/use-district-top-ten'
import type { DistrictTopTenResponse } from '@/types/status'

const seed: DistrictTopTenResponse = {
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    footTrafficTopTenItems: [
      {
        districtCode: '11680',
        districtName: '강남구',
        totalFootTraffic: 1_842_000,
        footTrafficChangeRate: 3.2,
      },
    ],
    salesTopTenItems: [],
    openedStoreTopTenItems: [],
    closedStoreTopTenItems: [],
  },
}

/** 200 이지만 기본 지표(유동인구)가 빈 배열 — C 리뷰 지적사항. */
const emptyActiveMetricSeed: DistrictTopTenResponse = {
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    footTrafficTopTenItems: [],
    salesTopTenItems: [
      {
        districtCode: '11680',
        districtName: '강남구',
        totalSalesAmount: 3_345_727_318_759,
        salesChangeRate: -1.0,
      },
    ],
    openedStoreTopTenItems: [],
    closedStoreTopTenItems: [],
  },
}

const render = (data?: DistrictTopTenResponse) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  if (data) client.setQueryData(HOME_TOP_TEN_QUERY_KEY, data)

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MetricRankingBoard),
    ),
  )
}

describe('MetricRankingBoard', () => {
  it('지도를 그리지 않는다', () => {
    // 히어로가 이미 같은 지도를 그린다. 여기서 또 그리면 왔던 곳을 다시 안내하는 셈이다.
    const html = render(seed)

    expect(html).not.toContain('<svg')
  })

  it('지표 토글 3종을 낸다', () => {
    const html = render(seed)

    expect(html).toContain('유동인구')
    expect(html).toContain('매출')
    expect(html).toContain('개업')
  })

  it('폐업 토글은 없다', () => {
    expect(render(seed)).not.toContain('폐업')
  })

  it('실 데이터가 오면 그린다', () => {
    expect(render(seed)).toContain('강남구')
  })

  it('top-ten 이 죽어도 단계가 비지 않는다', () => {
    // 스토리에서 한 단계만 사라지면 번호 01~04 에 구멍이 난다.
    const html = render()

    expect(html).toContain('유동인구')
    expect(html.length).toBeGreaterThan(0)
  })

  /*
   * C. 200 이어도 지금 고른 지표가 빈 배열이면 "설명도 라벨도 없는 빈 상자"가
   * 그려진다 — top-ten 실패와 같은 취급으로 예시 스냅샷 + 라벨을 낸다.
   */
  it('200 이어도 선택된 지표가 비면 예시로 폴백하고 라벨을 낸다', () => {
    const html = render(emptyActiveMetricSeed)

    expect(html).toContain('대표 예시 데이터')
    // HOME_METRIC_FALLBACK 의 유동인구 1위는 강남구다.
    expect(html).toContain('강남구')
  })

  /*
   * F. `formatStatusChange(NaN)` 이 "데이터 없음"을 배지로 찍는 걸 막는다 —
   * 없는 변화를 있다고 말하는 셈이라 배지 자체를 붙이지 않아야 한다.
   */
  it('비유한 변화율에는 배지를 붙이지 않는다', () => {
    const nanSeed: DistrictTopTenResponse = {
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: {
        footTrafficTopTenItems: [
          {
            districtCode: '11680',
            districtName: '강남구',
            totalFootTraffic: 1_842_000,
            footTrafficChangeRate: NaN,
          },
        ],
        salesTopTenItems: [],
        openedStoreTopTenItems: [],
        closedStoreTopTenItems: [],
      },
    }

    expect(render(nanSeed)).not.toContain('데이터 없음')
  })
})
