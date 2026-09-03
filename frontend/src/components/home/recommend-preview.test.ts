import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import RecommendPreview from '@/components/home/recommend-preview'
import type {
  CandidateCommercialsResponse,
  CommercialAreasResponse,
} from '@/types/recommend'

/** 구현의 시드 쿼리 키와 문자 그대로 같아야 한다. */
const SEED_KEY = ['home', 'recommendSeed']

/*
 * 구현의 추천 쿼리 키와 문자 그대로 같아야 한다. 시드 쿼리를 seed 하지 않은
 * 테스트에서는 `commercialCodes` 가 항상 빈 배열이다(D. 키에 상권 코드
 * 배열을 포함시켜, 시드가 지역별로 갈릴 때 캐시가 섞이지 않게 한다).
 */
const PREVIEW_KEY = ['home', 'recommendPreview', []]

/** 시드 쿼리가 실패로 끝난 응답. 더 기다릴 게 없는 "terminal" 상태를 흉내낸다. */
const createFailedSeed = (): CommercialAreasResponse => ({
  dataHeader: {
    success: false,
    resultCode: 'COMMERCIAL_001',
    resultMessage: '상권 목록을 사용할 수 없습니다.',
  },
  dataBody: [],
})

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

const render = (
  recommendations?: CandidateCommercialsResponse,
  seed?: CommercialAreasResponse,
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  if (seed) client.setQueryData(SEED_KEY, seed)
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

  /*
   * G. 캐시가 비면 시드 쿼리는 아직 `isPending` 이다 — 아직 결론이 안 났다.
   * 예시 5행 자체는 그대로 보여주되(스켈레톤 대신 예시를 먼저 그린다는 결정은
   * 유지), "대표 예시 데이터" 라벨만 감춰 첫인상에 라벨이 떴다 사라지는
   * 깜빡임을 없앤다.
   */
  it('시드 쿼리가 아직 결론나지 않았으면 예시 행은 보여도 라벨은 숨긴다', () => {
    const html = render()

    expect(html).toContain('역삼역')
    expect(html).not.toContain('대표 예시 데이터')
  })

  /*
   * 시드가 실패로 끝나면 상권 코드가 없어 추천 쿼리는 아예 실행되지 않는다
   * (enabled: false) — 더 기다릴 게 없는 최종 상태이므로 예시 라벨을 바로 낸다.
   */
  it('시드가 실패로 끝나 더 기다릴 게 없으면 예시 라벨을 바로 낸다', () => {
    const html = render(undefined, createFailedSeed())

    expect(html).toContain('역삼역')
    expect(html).toContain('대표 예시 데이터')
  })

  it('실 응답이 오면 추천 이유 문장을 그리고 예시 라벨을 뺀다', () => {
    const html = render(createRecommendations())

    expect(html).toContain('기회도 높음을 우선 반영했습니다')
    expect(html).not.toContain('대표 예시 데이터')
  })
})
