import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import RecommendComparePage from '@/components/recommend/compare/recommend-compare-page'
import { RECOMMENDATION_PERIOD_CODE } from '@/lib/api/recommend'
import { recommendComparisonKey } from '@/lib/recommend/recommend-query-keys'
import type { CommercialComparisonBody } from '@/types/commercial-comparison'

const searchParamsBox = vi.hoisted(() => ({ current: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsBox.current,
}))

/*
 * 컴포넌트가 **실제로 만든** 쿼리 옵션을 붙잡는다. `renderToStaticMarkup` 은 효과를
 * 돌리지 않아 `queryFn` 이 저절로 실행되지 않으므로, 붙잡은 옵션의 `queryFn` 을
 * 테스트가 직접 돌려 나가는 요청을 본다 — 화면의 배선을 그대로 통과하는 경로다.
 */
const capturedQueries = vi.hoisted(() => ({
  current: [] as {
    queryKey: readonly unknown[]
    queryFn: (ctx: { signal?: AbortSignal }) => unknown
    enabled?: boolean
  }[],
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

const comparisonRequests = vi.hoisted(() => ({
  current: [] as Record<string, string>[],
}))

vi.mock('@/lib/api/commercial-comparison', () => ({
  fetchCommercialComparison: (query: Record<string, string>) => {
    comparisonRequests.current.push(query)
    return Promise.resolve({
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: null,
    })
  },
}))

const BASE =
  'districtCode=11680&administrationCode=11680640&serviceCode=CS100010'

const emptyGroups = {
  salesMetrics: null,
  footTrafficMetrics: null,
  storeMetrics: null,
  spendingMetrics: null,
  residentPopulationMetrics: null,
  facilityMetrics: null,
  salesTimeSlotMetrics: null,
  salesAgeMetrics: null,
  salesAgeGenderMetrics: null,
  footTrafficTimeSlotMetrics: null,
  footTrafficAgeMetrics: null,
  footTrafficAgeGenderMetrics: null,
}

const body = (
  overrides: Partial<CommercialComparisonBody> = {},
): CommercialComparisonBody =>
  ({
    left: null,
    right: null,
    comparisonSummary: null,
    recommendedSide: null,
    recommendedReasons: null,
    cautionPoints: null,
    businessFitSummary: null,
    dominantTimeSlots: null,
    dominantAgeGroups: null,
    comparisonHighlights: null,
    highlights: null,
    ...emptyGroups,
    ...overrides,
  }) as CommercialComparisonBody

const render = (search: string, seed?: CommercialComparisonBody) => {
  searchParamsBox.current = new URLSearchParams(search)
  capturedQueries.current = []

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  if (seed) {
    const params = new URLSearchParams(search)
    const codes = (params.get('commercialCodes') ?? '').split(',')
    client.setQueryData(
      recommendComparisonKey({
        leftCommercialCode: codes[0],
        rightCommercialCode: codes[1],
        serviceCode: params.get('serviceCode'),
        periodCode: RECOMMENDATION_PERIOD_CODE,
      }),
      {
        dataHeader: { success: true, resultCode: null, resultMessage: null },
        dataBody: seed,
      },
    )
  }

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(RecommendComparePage),
    ),
  )
}

beforeEach(() => {
  comparisonRequests.current = []
})

describe('RecommendComparePage', () => {
  it('조건이 없으면 비교하지 않고 되돌아갈 길을 준다', () => {
    const markup = render('')

    expect(markup).toContain('비교 조건이 없어요')
    expect(markup).toContain('추천으로 돌아가기')
  })

  it('상권이 한 개면 비교가 성립하지 않는다', () => {
    const markup = render(`${BASE}&commercialCodes=3110008`)

    expect(markup).toContain('비교할 상권이 부족해요')
  })

  /**
   * 백엔드 비교 계약이 좌/우 두 자리뿐이라 **정확히 두 개**를 보낸다.
   * 세 번째부터는 URL 파서가 잘라내고, 화면이 잘랐다는 사실을 말한다.
   */
  it('좌·우 두 코드를 그대로 백엔드 비교로 보낸다', async () => {
    render(`${BASE}&commercialCodes=3110008,3110012`)

    const query = capturedQueries.current.find(item =>
      item.queryKey.includes('comparison'),
    )
    expect(query).toBeDefined()
    await query!.queryFn({})

    expect(comparisonRequests.current).toEqual([
      {
        leftCommercialCode: '3110008',
        rightCommercialCode: '3110012',
        serviceCode: 'CS100010',
        periodCode: RECOMMENDATION_PERIOD_CODE,
      },
    ])
  })

  it('두 개를 넘겨 잘라냈으면 그 사실을 말한다', () => {
    const markup = render(`${BASE}&commercialCodes=1,2,3,4`)

    expect(markup).toContain('한 번에 2개까지 비교할 수 있어요')
  })

  it('좌우를 바꾼 요청은 다른 캐시 키다 (표가 뒤집혀 나오면 안 된다)', () => {
    const left = recommendComparisonKey({
      leftCommercialCode: 'a',
      rightCommercialCode: 'b',
      serviceCode: 'CS100010',
      periodCode: RECOMMENDATION_PERIOD_CODE,
    })
    const right = recommendComparisonKey({
      leftCommercialCode: 'b',
      rightCommercialCode: 'a',
      serviceCode: 'CS100010',
      periodCode: RECOMMENDATION_PERIOD_CODE,
    })

    expect(left).not.toEqual(right)
  })

  it('지표를 받으면 표를 그린다', () => {
    const markup = render(
      `${BASE}&commercialCodes=3110008,3110012`,
      body({
        left: {
          commercialCode: '3110008',
          commercialName: '역삼역',
          districtCode: '11680',
          districtName: '강남구',
          administrationCode: '11680640',
          administrationName: '역삼1동',
        },
        right: {
          commercialCode: '3110012',
          commercialName: '선릉역',
          districtCode: '11680',
          districtName: '강남구',
          administrationCode: '11680640',
          administrationName: '역삼1동',
        },
        salesMetrics: [
          {
            label: '월 매출',
            leftValue: 1000,
            rightValue: 600,
            diffValue: 400,
            diffRate: 66.7,
            winnerSide: null,
          },
        ],
      }),
    )

    expect(markup).toContain('역삼역')
    expect(markup).toContain('선릉역')
    expect(markup).toContain('강남구 역삼1동')
    expect(markup).toContain('월 매출')
  })

  /** 판단은 리포트 영역에서만 말한다 — 표는 값만 적는다. */
  it('추천측과 이유는 리포트 영역에 나온다', () => {
    const markup = render(
      `${BASE}&commercialCodes=3110008,3110012`,
      body({
        recommendedSide: {
          code: 'LEFT',
          name: '역삼역',
          description: '',
        },
        recommendedReasons: ['유동인구가 꾸준해요'],
        cautionPoints: ['임대료가 높아요'],
        salesMetrics: [
          {
            label: '월 매출',
            leftValue: 1000,
            rightValue: 600,
            diffValue: 400,
            diffRate: 66.7,
            winnerSide: { code: 'LEFT', name: '좌측 우세', description: '' },
          },
        ],
      }),
    )

    expect(markup).toContain('비교 리포트')
    expect(markup).toContain('추천: 역삼역')
    expect(markup).toContain('유동인구가 꾸준해요')
    expect(markup).toContain('임대료가 높아요')
    // 표 쪽 승패 라벨은 여전히 새지 않는다.
    expect(markup).not.toContain('좌측 우세')
  })

  it('판단이 하나도 없으면 리포트 영역을 그리지 않는다', () => {
    const markup = render(
      `${BASE}&commercialCodes=3110008,3110012`,
      body({
        salesMetrics: [
          {
            label: '월 매출',
            leftValue: 1,
            rightValue: 2,
            diffValue: -1,
            diffRate: -50,
            winnerSide: null,
          },
        ],
      }),
    )

    expect(markup).not.toContain('비교 리포트')
  })

  it('지표가 비어 오면 표 대신 사실을 말한다', () => {
    const markup = render(`${BASE}&commercialCodes=3110008,3110012`, body())

    expect(markup).toContain('비교할 지표가 없어요')
  })
})
