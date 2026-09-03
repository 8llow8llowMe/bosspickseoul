import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import RecommendPreview from '@/components/home/recommend-preview'
import type { CandidateCommercialsResponse } from '@/types/recommend'

/** 구현의 쿼리 키와 문자 그대로 같아야 한다. */
const PREVIEW_KEY = ['home', 'recommendPreview']

const createRecommendations = (): CandidateCommercialsResponse => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    serviceCode: 'CS100010',
    periodCode: '20233',
    preset: { code: 'AGGRESSIVE_OPPORTUNITY', name: '공격형', description: '' },
    priorityMetric: {
      code: 'OPPORTUNITY_SCORE',
      name: '기회도',
      description: '',
      scoreDescription: '',
    },
    topN: 5,
    summary: '',
    items: [
      {
        rank: 1,
        commercialCode: '3120197',
        commercialName: '역삼역',
        compositeScore: 83.99,
        grade: 'HIGH',
        summaryLabel: '공격형 추천',
        selectionReason: '공격형 기준으로 기회도 높음을 우선 반영했습니다.',
        opportunityLabel: '기회도 높음',
        riskLabel: '위험도 보통',
        metricBreakdown: [],
        reasonTags: [],
      },
    ],
  },
})

const render = (recommendations?: CandidateCommercialsResponse) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  if (recommendations) client.setQueryData(PREVIEW_KEY, recommendations)

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(RecommendPreview),
    ),
  )
}

describe('RecommendPreview', () => {
  it('시드 지역명을 화면에 적는다', () => {
    // 고정 시드라 방문자 지역과 무관하다. 안 적으면 자기 지역 결과로 오해한다.
    expect(render()).toContain('강남구 역삼1동 · 커피-음료')
  })

  it('추천이 죽으면 예시 5행과 예시 라벨을 그린다', () => {
    const html = render()

    expect(html).toContain('역삼역')
    expect(html).toContain('대표 예시 데이터')
  })

  it('실 응답이 오면 추천 이유 문장을 그리고 예시 라벨을 뺀다', () => {
    const html = render(createRecommendations())

    expect(html).toContain('기회도 높음을 우선 반영했습니다')
    expect(html).not.toContain('대표 예시 데이터')
  })
})
