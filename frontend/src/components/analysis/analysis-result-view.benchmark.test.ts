import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import AnalysisResultView from '@/components/analysis/analysis-result-view'
import type {
  CommercialBenchmark,
  CommercialSalesPerStoreSummary,
} from '@/types/commercial-analysis'

/**
 * 「지역 평균 대비」 탭 「비교 분석」의 **배선** 검증 (#544).
 *
 * 표시 판정은 `benchmark-presentation.test.ts` 가 고정한다. 여기서는 그 결과가 화면에
 * 실리는지만 본다(`analysis-result-view.income.test.ts` 와 같은 방식 — 쿼리 캐시를 심어
 * 서버 렌더로 본다).
 *
 * 1. 점포당 매출이 있으면 지수가 주 지표로, 점포당 월 매출·점포 수가 보조로 실린다.
 * 2. 결측은 0 이 아니라 「데이터 없음」으로 실린다.
 * 3. `salesPerStore` 키가 없는 구 응답이면 지금처럼 총액 3개를 그린다.
 */

const searchParamsBox = vi.hoisted(() => ({ current: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
  usePathname: () => '/analysis/result',
  useSearchParams: () => searchParamsBox.current,
}))

const BASE_PARAMS = {
  districtCode: '11350',
  administrationCode: '11350600',
  commercialCode: '3110438',
  serviceCode: 'CS100010',
  periodCode: '20261',
}

const ok = (body: unknown) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: body,
})

const SALES_PER_STORE: CommercialSalesPerStoreSummary = {
  serviceCode: 'CS100010',
  serviceName: '커피-음료',
  district: {
    code: '11350',
    name: '노원구',
    monthlySalesAmount: 15_415_802_889,
    storeCount: 809,
    monthlySalesPerStore: 19_055_381,
  },
  administration: {
    code: '11350600',
    name: '공릉2동',
    monthlySalesAmount: 1_326_394_061,
    storeCount: 102,
    monthlySalesPerStore: 13_003_863,
  },
  commercial: {
    code: '3110438',
    name: '경춘선숲길 우측',
    monthlySalesAmount: 164_964_564,
    storeCount: 20,
    monthlySalesPerStore: 8_248_228,
  },
  indexVsDistrict: 43.3,
  indexVsAdministration: 63.4,
}

const LEGACY_BENCHMARK: CommercialBenchmark = {
  commercialCode: '3110438',
  commercialName: '경춘선숲길 우측',
  summary: '경춘선숲길 우측의 매출과 소비력 지표를 비교한 결과입니다.',
  salesSummary: {
    district: {
      code: '11350',
      name: '노원구',
      monthlySalesAmount: 15_415_802_889,
    },
    administration: {
      code: '11350600',
      name: '공릉2동',
      monthlySalesAmount: 1_326_394_061,
    },
    commercial: {
      code: '3110438',
      name: '경춘선숲길 우측',
      monthlySalesAmount: 164_964_564,
    },
  },
  benchmarkHighlights: null,
}

const render = (benchmark: CommercialBenchmark) => {
  searchParamsBox.current = new URLSearchParams({
    ...BASE_PARAMS,
    tab: 'benchmark',
  })
  const client = new QueryClient()

  client.setQueryData(
    [
      'analysis',
      'benchmark',
      BASE_PARAMS.commercialCode,
      BASE_PARAMS.serviceCode,
      BASE_PARAMS.periodCode,
    ],
    ok(benchmark),
  )

  const markup = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AnalysisResultView, null),
    ),
  )
  return markup.slice(markup.indexOf('비교 분석'))
}

describe('AnalysisResultView · 비교 분석', () => {
  it('지수를 주 지표로 두고 점포당 월 매출과 점포 수를 함께 적는다', () => {
    const section = render({
      ...LEGACY_BENCHMARK,
      salesPerStore: SALES_PER_STORE,
    })

    expect(section).toContain(
      '경춘선숲길 우측 커피-음료 점포의 월 매출은 노원구 점포 평균의 43.3% 수준이에요.',
    )
    expect(section).toContain('노원구 대비 지수')
    expect(section).toContain('43.3')
    expect(section).toContain('공릉2동 점포 평균 = 100')
    expect(section).toContain('63.4')
    expect(section).toContain('경춘선숲길 우측 점포당 월 매출')
    expect(section).toContain('824만원')
    expect(section).toContain('점포 20개')
    expect(section).toContain('점포 809개')
  })

  it('결측은 0 이 아니라 데이터 없음으로 적는다', () => {
    const section = render({
      ...LEGACY_BENCHMARK,
      salesPerStore: {
        ...SALES_PER_STORE,
        commercial: {
          ...SALES_PER_STORE.commercial,
          storeCount: null,
          monthlySalesPerStore: null,
        },
        indexVsDistrict: null,
        indexVsAdministration: null,
      },
    })

    expect(section).toContain('점포 수 데이터 없음')
    expect(section).not.toContain('점포 평균의')
    expect(section).not.toContain('>0원<')
    // 지수 2개 + 상권 점포당 매출 1개.
    expect(section.match(/데이터 없음</g)?.length).toBe(3)
  })

  it('값 없는 서버 고정 하이라이트 문장은 그리지 않는다', () => {
    const highlight =
      '경춘선숲길 우측의 매출 수준을 자치구 평균과 비교할 수 있습니다.'
    const withHighlights = render({
      ...LEGACY_BENCHMARK,
      salesPerStore: SALES_PER_STORE,
      benchmarkHighlights: [highlight],
    })
    const withoutHighlights = render(LEGACY_BENCHMARK)

    expect(withHighlights).not.toContain(highlight)
    expect(withoutHighlights).not.toContain('비교 하이라이트가 없어요')
  })

  it('salesPerStore 키가 없는 구 응답이면 총액 3개를 그린다', () => {
    const section = render(LEGACY_BENCHMARK)

    expect(section).toContain('154억 1580만원')
    expect(section).toContain('1억 6496만원')
    expect(section).not.toContain('대비 지수')
    expect(section).not.toContain('점포당 월 매출')
  })
})
