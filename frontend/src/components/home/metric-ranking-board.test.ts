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
})
