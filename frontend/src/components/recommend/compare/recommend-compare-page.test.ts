import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import RecommendComparePage from '@/components/recommend/compare/recommend-compare-page'
import { findSimulationCategoryByCode } from '@/data/simulation-catalog'
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
  // AI 패널이 `use-ai-report` 를 통해 참조한다. 여기서는 누르지 않으므로 호출되지 않지만,
  // 모듈을 통째로 바꾸는 mock 이라 이름이 빠지면 import 가 undefined 가 된다.
  submitCommercialComparisonAiReport: () => Promise.reject(new Error('unused')),
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
        // 비교는 분기를 생략해 서버가 해석한다 — 키도 「최신」이다(period-catalog.md D4-5).
        periodCode: 'latest',
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
      periodCode: 'latest',
    })
    const right = recommendComparisonKey({
      leftCommercialCode: 'b',
      rightCommercialCode: 'a',
      serviceCode: 'CS100010',
      periodCode: 'latest',
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
        left: {
          commercialCode: '3110008',
          commercialName: '역삼역',
          districtCode: '11680',
          districtName: '강남구',
          administrationCode: '11680640',
          administrationName: '역삼1동',
        },
        // 백엔드는 방향 라벨을 준다. 화면은 그걸 실제 상권 이름으로 바꿔 적어야 한다.
        recommendedSide: {
          code: 'LEFT',
          name: '좌측 상권 우세',
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

    expect(markup).toContain('aria-label="비교 리포트"')
    expect(markup).toContain('추천: 역삼역')
    // 방향 라벨이 그대로 새면 "우측이 어느 쪽이더라"를 표에서 되짚어야 한다.
    expect(markup).not.toContain('좌측 상권 우세')
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

    expect(markup).not.toContain('aria-label="비교 리포트"')
  })

  it('지표가 비어 오면 표 대신 사실을 말한다', () => {
    const markup = render(`${BASE}&commercialCodes=3110008,3110012`, body())

    expect(markup).toContain('비교할 지표가 없어요')
  })

  /*
   * 비교를 읽은 다음의 출구다. 초안 본문은 URL 에 싣지 않고 **코드 네 개만** 넘긴다 —
   * 글쓰기 화면이 그것으로 백엔드에 초안을 받는다(로그인 왕복을 통과해야 하므로).
   */
  it('비교 결과를 받으면 커뮤니티 글쓰기로 나가는 길을 준다', () => {
    const markup = render(
      `${BASE}&commercialCodes=3110008,3110012`,
      body({
        left: {
          commercialCode: '3110008',
          commercialName: '강남역 상권',
          districtCode: '11680',
          districtName: '강남구',
          administrationCode: '11680640',
          administrationName: '역삼1동',
        },
      } as Partial<CommercialComparisonBody>),
    )

    expect(markup).toContain(
      'href="/community/register?draftSource=comparison&amp;' +
        'leftCommercialCode=3110008&amp;rightCommercialCode=3110012&amp;' +
        'serviceCode=CS100010&amp;administrationCode=11680640"',
    )
  })

  it('비교 결과가 아직 없으면 글쓰기 길을 열지 않는다', () => {
    const markup = render(`${BASE}&commercialCodes=3110008,3110012`)

    expect(markup).not.toContain('draftSource=comparison')
  })
  /*
   * BE #381 의 조회 조건·기준 안내. 요청은 URL 값 그대로 보내고(요청 키가 바뀌지 않게),
   * 화면에 적는 분기·업종은 응답의 「실제 조회값」을 먼저 쓴다.
   */
  it('응답의 periodCode·serviceCode 로 부제 분기와 제목 업종을 적는다', () => {
    const markup = render(
      `${BASE}&commercialCodes=3110008,3110012`,
      body({
        periodCode: '20241',
        serviceCode: 'CS100001',
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

    expect(markup).toContain('2024년 1분기 기준')
    const serviceName = findSimulationCategoryByCode('CS100001')?.item.name
    expect(serviceName).toBeTruthy()
    expect(markup).toContain(`${serviceName} 상권 비교`)
  })

  it('비교 기준 문장은 표 위에, 면책 문구는 비교 리포트 안에 적는다', () => {
    const markup = render(
      `${BASE}&commercialCodes=3110008,3110012`,
      body({
        comparisonGuide: {
          periodBasis: '모든 지표는 선택한 분기의 데이터를 기준으로 합니다.',
          serviceBasis:
            '매출·점포 지표는 선택 업종 기준이며, 유동인구·소비·거주인구·시설은 상권 전체 기준입니다.',
          differenceBasis: null,
          diffRateBasis: null,
          recommendationDisclaimer:
            '추천은 핵심 지표의 단순 우위 개수를 비교한 참고 결과이며 수익이나 창업 성과를 보장하지 않습니다.',
          metricGroups: [],
        },
        recommendedSide: {
          code: 'LEFT',
          name: '좌측 상권 우세',
          description: '',
        },
        recommendedReasons: ['유동인구가 꾸준해요'],
        salesMetrics: [
          {
            label: '총 매출액',
            leftValue: 43267840,
            rightValue: 293433501,
            diffValue: -250165661,
            diffRate: -85.25,
            unit: '원',
            displayPrecision: 0,
            differenceUnit: '원',
            description: '선택 분기의 요일별 매출액을 합산한 값입니다.',
            winnerSide: null,
          },
        ],
      }),
    )

    expect(markup).toContain('aria-label="비교 기준"')
    expect(markup).toContain(
      '매출·점포 지표는 선택 업종 기준이며, 유동인구·소비·거주인구·시설은 상권 전체 기준입니다.',
    )
    const report = markup.slice(markup.indexOf('aria-label="비교 리포트"'))
    expect(report).toContain('수익이나 창업 성과를 보장하지 않습니다.')
    expect(markup).toContain('293,433,501원')
  })

  it('구버전 응답이면 기준 목록 없이 「최신 분기」로 적는다', () => {
    const markup = render(
      `${BASE}&commercialCodes=3110008,3110012`,
      body({
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

    expect(markup).not.toContain('비교 기준')
    // 분기를 생략해 요청하므로 응답에 분기가 없으면 지어내지 않고 「최신 분기」로 적는다.
    expect(markup).toContain('최신 분기 기준')
    expect(markup).toContain('+400')
  })

  /*
    AI 리포트는 비교 표가 실제로 쓴 분기(응답 periodCode)로 만든다 — 분기를 모르면 제출할 수 없으므로 자리를
    열지 않는다(period-catalog.md D4-5). 열어 두면 시작 버튼을 눌러도 아무 일도 일어나지 않는다.
  */
  it('응답에 분기가 있을 때만 AI 비교 리포트 자리를 연다', () => {
    const withPeriod = render(
      `${BASE}&commercialCodes=3110008,3110012`,
      body({ periodCode: '20261' } as Partial<CommercialComparisonBody>),
    )
    const withoutPeriod = render(
      `${BASE}&commercialCodes=3110008,3110012`,
      body({ periodCode: null } as Partial<CommercialComparisonBody>),
    )

    expect(withPeriod).toContain('AI 비교 리포트')
    expect(withoutPeriod).not.toContain('AI 비교 리포트')
  })
})
