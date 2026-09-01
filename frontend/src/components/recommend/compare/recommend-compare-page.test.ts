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
import { normalizeRecommendationResults } from '@/lib/recommend/recommend-response'
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

/*
 * 컴포넌트가 **실제로 만든** 쿼리 옵션을 붙잡는다. `renderToStaticMarkup` 은 효과를
 * 돌리지 않아 `queryFn` 이 저절로 실행되지 않으므로, 붙잡은 옵션의 `queryFn` 을
 * 테스트가 직접 돌려 나가는 요청을 본다. 화면의 배선을 그대로 통과하는 경로라
 * `allCodes` 를 `state.commercialCodes` 로 바꿔치면 여기서 빨간불이 난다.
 */
const capturedQueries = vi.hoisted(() => ({
  current: [] as { queryKey: readonly unknown[]; queryFn: () => unknown }[],
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  )

  return {
    ...actual,
    useQuery: (options: Parameters<typeof actual.useQuery>[0]) => {
      capturedQueries.current.push(
        options as unknown as (typeof capturedQueries.current)[number],
      )
      return actual.useQuery(options)
    },
  }
})

const recommendationRequests = vi.hoisted(() => ({
  current: [] as { serviceCode: string; commercialCodes: string[] }[],
}))

const recommendationResponseBox = vi.hoisted(
  () => ({ current: null }) as { current: unknown },
)

vi.mock('@/lib/api/recommend', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/recommend')>(
    '@/lib/api/recommend',
  )

  return {
    ...actual,
    fetchCommercialRecommendations: (
      request: Parameters<typeof actual.fetchCommercialRecommendations>[0],
    ) => {
      recommendationRequests.current.push(request)
      return Promise.resolve(recommendationResponseBox.current)
    },
  }
})

const DISTRICT_CODE = '11680'
const ADMINISTRATION_CODE = '11680640'
const SERVICE_CODE = 'CS100010'
const ALL_CODES = ['3110958', '3120192', '3120197', '3120500']
const SELECTED_CODES = ['3120197', '3120192']

const okHeader = { success: true, resultCode: 'SUCCESS', resultMessage: null }

/** `readCommercials` 가 걸러 내야 하는 행. 좌표가 없으면 /recommend 도 버린다. */
const BROKEN_CODE = '3129999'

const commercialsResponse = {
  dataHeader: okHeader,
  dataBody: [
    ...ALL_CODES.map(code => ({
      commercialCode: code,
      commercialName: `상권 ${code}`,
      commercialClassificationCode: 'A',
      commercialClassificationName: '골목상권',
      centerLat: 37.5,
      centerLng: 127,
    })),
    {
      commercialCode: BROKEN_CODE,
      commercialName: '좌표 없는 상권',
      commercialClassificationCode: 'A',
      commercialClassificationName: '골목상권',
      centerLat: null,
      centerLng: null,
    },
  ],
} as unknown as CommercialAreasResponse

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
    capturedQueries.current = []
    recommendationRequests.current = []
    recommendationResponseBox.current = recommendationResponse
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

  it('추천 요청에 선택된 코드가 아니라 행정동 전체 코드가 나간다', async () => {
    // 🔴 명세 §4·§9 의 그 지점. 선택된 코드만 넘기면 topN 이 5로 clamp 되고
    // 점수가 그 부분집합 안에서 다시 계산돼 두 화면이 다른 숫자를 말한다.
    setCompareParams()
    const client = createClient()
    primeCommercials(client)

    render(client) // 추천은 캐시에 없다 — queryFn 을 붙잡아 직접 돌린다.

    const options = capturedQueries.current.find(
      query => query.queryKey[1] === 'results',
    )
    expect(options).toBeDefined()
    await options!.queryFn()

    expect(recommendationRequests.current).toHaveLength(1)
    const [request] = recommendationRequests.current
    // 행정동 전체 목록이다. 고른 2개가 아니다.
    expect(request.commercialCodes).toEqual([...ALL_CODES].sort())
    expect(request.commercialCodes).not.toEqual(SELECTED_CODES)
    // `readCommercials` 가 버리는 행은 /recommend 와 마찬가지로 들어가지 않는다.
    expect(request.commercialCodes).not.toContain(BROKEN_CODE)
    // 캐시 키와 요청 본문이 **같은 목록**에서 나온다 — 어긋나면 캐시가 갈라진다.
    expect(options!.queryKey[6]).toBe(request.commercialCodes.join(','))
  })

  it('프로필이 전부 빈 본문으로 와도 원지표 블록이 사실을 말한다', () => {
    setCompareParams()
    const client = createClient()
    primeCommercials(client)
    client.setQueryData(recommendationKey(), recommendationResponse)
    SELECTED_CODES.forEach(code => {
      client.setQueryData(
        recommendProfileKey(code, SERVICE_CODE, RECOMMENDATION_PERIOD_CODE),
        { dataHeader: okHeader, dataBody: null },
      )
    })

    const html = render(client)

    expect(html).toContain('상권 지표를 불러오지 못했어요')
    // 200 이라 재시도할 오류가 없다 — 버튼을 띄우지 않는다(`isRetryable` 규약).
    expect(html).not.toContain('다시 시도')
    expect(html).toContain('data-compare-scores="true"')
  })

  /*
   * 계약 위반 payload 에서 두 화면이 **같은 목록**을 봐야 한다. 비교가 응답을
   * 날것으로 정렬하던 때는 `rank: null` 한 줄에 정렬 순서가 규정되지 않았고,
   * 배열이 아닌 `metricBreakdown` 하나에 `readScore` 가 던져 화면이 통째로 죽었다.
   */
  const malformedRecommendationResponse = {
    dataHeader: okHeader,
    dataBody: {
      ...recommendationResponse.dataBody,
      items: [
        // 배열이 아닌 metricBreakdown — `readScore` 의 `.find` 가 던지던 자리다.
        {
          ...candidate('3120197', 1, 88),
          metricBreakdown: '점수 없음',
        },
        // rank 가 없다 — /recommend 는 이 행을 버린다.
        { ...candidate('3120192', 2, 71), rank: null },
        candidate('3110958', 3, 60),
      ],
    },
  } as unknown as CandidateCommercialsResponse

  it('계약을 어긴 응답에서도 /recommend 와 같은 후보만 남긴다', () => {
    const THREE_CODES = ['3120197', '3120192', '3110958']
    setCompareParams(THREE_CODES)
    const client = createClient()
    primeCommercials(client)
    client.setQueryData(recommendationKey(), malformedRecommendationResponse)
    primeProfiles(client, THREE_CODES)

    // `/recommend` 가 보는 목록 — 두 화면이 같은 함수를 쓴다.
    const survivors = normalizeRecommendationResults(
      malformedRecommendationResponse,
      ALL_CODES,
    ).map(item => item.commercialCode)
    expect(survivors).toEqual(['3120197', '3110958'])

    // 배열이 아닌 metricBreakdown 에도 던지지 않는다.
    const html = render(client)

    expect(html).toContain('data-compare-scores="true"')
    // 살아남은 두 열은 /recommend 가 매긴 순위 그대로다.
    expect(html).toContain('1위')
    expect(html).toContain('3위')
    // rank 가 없어 /recommend 가 버린 열은 비교에서도 빠지고, 뺐다고 말한다.
    expect(html).toContain('추천 결과에 없는 상권 1개')
    expect(html).not.toContain('상권 3120192')
  })

  it('상권 코드가 2개 미만이면 표 대신 안내를 낸다', () => {
    setCompareParams(['3120197'])

    const html = render(createClient())

    expect(html).toContain('비교할 상권이 부족해요')
    expect(html).not.toContain('data-compare-scores="true"')
  })
})
