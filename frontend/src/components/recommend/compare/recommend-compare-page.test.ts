import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import RecommendComparePage from '@/components/recommend/compare/recommend-compare-page'
import { RECOMMENDATION_PERIOD_CODE } from '@/lib/api/recommend'
import {
  createCommercialCodesKey,
  recommendCommercialsKey,
  recommendProfileKey,
  recommendResultsKey,
} from '@/lib/recommend/recommend-query-keys'
import type {
  CandidateCommercial,
  CandidateCommercialsResponse,
  CommercialAreasResponse,
  CommercialProfileResponse,
} from '@/types/recommend'

const searchParamsBox = vi.hoisted(() => ({ current: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsBox.current,
}))

const DISTRICT_CODE = '11680'
const ADMINISTRATION_CODE = '11680640'
const SERVICE_CODE = 'CS100010'
const ALL_CODES = ['3110958', '3120192', '3120197', '3120500']
const SELECTED_CODES = ['3120197', '3120192']

const okHeader = { success: true, resultCode: 'SUCCESS', resultMessage: null }

const commercialsResponse = {
  dataHeader: okHeader,
  dataBody: ALL_CODES.map(code => ({
    commercialCode: code,
    commercialName: `상권 ${code}`,
    commercialClassificationCode: 'A',
    commercialClassificationName: '골목상권',
    centerLat: 37.5,
    centerLng: 127,
  })),
} as CommercialAreasResponse

const candidate = (
  code: string,
  rank: number,
  compositeScore: number,
): CandidateCommercial => ({
  rank,
  commercialCode: code,
  commercialName: `상권 ${code}`,
  compositeScore,
  grade: null,
  summaryLabel: null,
  selectionReason: null,
  opportunityLabel: null,
  riskLabel: null,
  reasonTags: [],
  metricBreakdown: [],
})

const recommendationResponse = {
  dataHeader: okHeader,
  dataBody: {
    serviceCode: SERVICE_CODE,
    periodCode: RECOMMENDATION_PERIOD_CODE,
    preset: { code: 'P', name: '균형형', description: '' },
    priorityMetric: {
      code: 'OPPORTUNITY_SCORE',
      name: '기회도',
      description: '',
      scoreDescription: '',
    },
    topN: 5,
    summary: '',
    items: [candidate('3120197', 1, 88), candidate('3120192', 2, 71)],
  },
} as unknown as CandidateCommercialsResponse

const profileResponse = (code: string, salesAmount: number) =>
  ({
    dataHeader: okHeader,
    dataBody: {
      commercialCode: code,
      commercialName: `상권 ${code}`,
      districtCode: DISTRICT_CODE,
      districtName: '강남구',
      administrationCode: ADMINISTRATION_CODE,
      administrationName: '역삼1동',
      centerLng: 127,
      centerLat: 37.5,
      boundaryCoords: [],
      keyMetrics: {
        totalSalesAmount: salesAmount,
        totalFootTraffic: 120_000,
        totalStoreCount: 30,
        similarStoreCount: 5,
        openingRate: 2.1,
        closureRate: 1.2,
        totalResidentPopulation: 4_200,
        monthlyAverageIncomeAmount: 3_000_000,
        totalFacilityCount: 12,
      },
    },
  }) as CommercialProfileResponse

const RETRYABLE_FAILURE = {
  response: {
    status: 500,
    data: {
      dataHeader: {
        success: false,
        resultCode: 'COMMON_500',
        resultMessage: '일시적인 문제가 발생했어요.',
      },
      dataBody: null,
    },
  },
}

const setCompareParams = (codes: readonly string[] = SELECTED_CODES) => {
  searchParamsBox.current = new URLSearchParams({
    districtCode: DISTRICT_CODE,
    administrationCode: ADMINISTRATION_CODE,
    serviceCode: SERVICE_CODE,
    commercialCodes: codes.join(','),
  })
}

/*
 * `retryOnMount: false` 가 핵심이다. 기본값이면 React Query 가 「마운트하면 다시
 * 받을 것」이라는 낙관적 결과(status: pending)를 돌려줘, 캐시에 심어 둔 실패를
 * 렌더 결과로 볼 수 없다.
 */
const createClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  })

const primeCommercials = (client: QueryClient) => {
  client.setQueryData(
    recommendCommercialsKey(DISTRICT_CODE, ADMINISTRATION_CODE),
    commercialsResponse,
  )
}

const recommendationKey = () =>
  recommendResultsKey({
    districtCode: DISTRICT_CODE,
    administrationCode: ADMINISTRATION_CODE,
    serviceCode: SERVICE_CODE,
    periodCode: RECOMMENDATION_PERIOD_CODE,
    commercialCodesKey: createCommercialCodesKey(ALL_CODES),
  })

const primeProfiles = (client: QueryClient, codes = SELECTED_CODES) => {
  codes.forEach((code, index) => {
    client.setQueryData(
      recommendProfileKey(code, SERVICE_CODE, RECOMMENDATION_PERIOD_CODE),
      profileResponse(code, 84_520_000 + index),
    )
  })
}

/** 실패 상태를 캐시에 심는다 — `prefetchQuery` 는 실패를 삼키고 쿼리만 error 로 남긴다. */
const primeFailure = (client: QueryClient, queryKey: readonly unknown[]) =>
  client.prefetchQuery({
    queryKey,
    queryFn: () => Promise.reject(RETRYABLE_FAILURE),
    retry: false,
  })

const render = (client: QueryClient) =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(RecommendComparePage, null),
    ),
  )

describe('RecommendComparePage', () => {
  beforeEach(() => {
    searchParamsBox.current = new URLSearchParams()
  })

  it('업종명 제목과 자치구·행정동·기간 부제를 낸다', () => {
    setCompareParams()
    const client = createClient()
    primeCommercials(client)
    client.setQueryData(recommendationKey(), recommendationResponse)
    primeProfiles(client)

    const html = render(client)

    expect(html).toContain('커피-음료 상권 비교')
    expect(html).toContain('강남구 역삼1동 · 2023년 3분기 기준')
    // `formatRecommendationPeriod` 가 이미 「기준」을 붙인다 — 두 번 붙이지 않는다.
    expect(html).not.toContain('기준 기준')
  })

  it('돌아가기 링크가 추천 조건과 결과 뷰를 그대로 싣는다', () => {
    setCompareParams()
    const client = createClient()
    primeCommercials(client)
    client.setQueryData(recommendationKey(), recommendationResponse)
    primeProfiles(client)

    const html = render(client)

    expect(html).toContain(
      'href="/recommend?districtCode=11680&amp;administrationCode=11680640&amp;serviceCode=CS100010&amp;view=results"',
    )
  })

  it('추천이 실패해도 원지표 표는 그대로 남는다', async () => {
    setCompareParams()
    const client = createClient()
    primeCommercials(client)
    primeProfiles(client)
    await primeFailure(client, recommendationKey())

    const html = render(client)

    // 점수 블록만 오류 + 재시도.
    expect(html).toContain('추천 점수를 불러오지 못했어요')
    expect(html).toContain('다시 시도')
    // 원지표는 그대로다 — 화면을 통째로 버리지 않는다(명세 §7).
    expect(html).toContain('data-compare-metrics="true"')
    expect(html).toContain('월 매출')
    expect(html).not.toContain('비교할 상권이 부족해요')
  })

  it('추천이 실패했을 때 「추천 결과에 없는 상권」 안내를 내지 않는다', async () => {
    setCompareParams()
    const client = createClient()
    primeCommercials(client)
    primeProfiles(client)
    await primeFailure(client, recommendationKey())

    const html = render(client)

    // 통신 실패는 낡은 링크가 아니다.
    expect(html).not.toContain('추천 결과에 없는 상권')
  })

  it('추천에 없는 코드는 그 열만 빼고 사실을 말한다', () => {
    setCompareParams([...SELECTED_CODES, '3110958'])
    const client = createClient()
    primeCommercials(client)
    client.setQueryData(recommendationKey(), recommendationResponse)
    primeProfiles(client, [...SELECTED_CODES, '3110958'])

    const html = render(client)

    expect(html).toContain('추천 결과에 없는 상권 1개')
    expect(html).toContain('data-compare-scores="true"')
  })

  it('프로필이 전부 실패하면 원지표 블록만 오류를 내고 점수는 남는다', async () => {
    setCompareParams()
    const client = createClient()
    primeCommercials(client)
    client.setQueryData(recommendationKey(), recommendationResponse)
    await Promise.all(
      SELECTED_CODES.map(code =>
        primeFailure(
          client,
          recommendProfileKey(code, SERVICE_CODE, RECOMMENDATION_PERIOD_CODE),
        ),
      ),
    )

    const html = render(client)

    expect(html).toContain('상권 지표를 불러오지 못했어요')
    expect(html).toContain('data-compare-scores="true"')
    expect(html).not.toContain('비교할 상권이 부족해요')
  })

  it('상권 코드가 2개 미만이면 표 대신 안내를 낸다', () => {
    setCompareParams(['3120197'])

    const html = render(createClient())

    expect(html).toContain('비교할 상권이 부족해요')
    expect(html).not.toContain('data-compare-scores="true"')
  })
})
