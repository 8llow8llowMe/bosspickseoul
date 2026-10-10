import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import RecommendLivePopular from '@/components/recommend/recommend-live-popular'
import { LIVE_POPULAR_SIZE } from '@/lib/recommend/live-popular'
import type { AnalysisRankingResponse } from '@/types/status'

const QUERY_KEY = ['recommend', 'livePopularCommercials', LIVE_POPULAR_SIZE]

const response = (...counts: number[]): AnalysisRankingResponse => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    areaType: { code: 'COMMERCIAL', name: '상권', description: '' },
    windowHours: 24,
    rankings: counts.map((viewCount, index) => ({
      rank: index + 1,
      areaCode: `C${index + 1}`,
      areaName: `상권${index + 1}`,
      viewCount,
    })),
  },
})

const render = (seed: AnalysisRankingResponse) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(QUERY_KEY, seed)

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(RecommendLivePopular),
    ),
  )
}

/* #600(진단 H9). 「조회 2회」는 아무도 쓰지 않는 서비스처럼 읽힌다. */
describe('RecommendLivePopular — 낮은 조회 수', () => {
  it('임계값 이상이면 조회 수를 적는다', () => {
    const html = render(response(1234, 900))

    expect(html).toContain('조회 1,234회')
  })

  it('임계값 아래인 곳이 있으면 순위·이름만 보이고 라벨에도 조회 수가 없다', () => {
    const html = render(response(5, 2))

    expect(html).toContain('1위')
    expect(html).toContain('상권1')
    expect(html).not.toContain('조회 5회')
    expect(html).not.toContain('조회')
  })
})
