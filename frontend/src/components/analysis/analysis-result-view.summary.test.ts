import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import AnalysisResultView from '@/components/analysis/analysis-result-view'
import type {
  CommercialBenchmark,
  CommercialSalesSummary,
} from '@/types/commercial-analysis'
import type { CommercialProfile } from '@/types/recommend'

/**
 * 요약 「핵심 지표」의 **배선** 검증 (#561).
 *
 * 판정·문장은 `lib/analysis/summary-sales.test.ts` 가 고정한다. 여기서는 받아 둔 응답(합계 ·
 * 점포 수 · 행정동 합계)이 첫 카드 「점포당 월 매출」·캡션·결론 두 문장으로 실리는지, 지역 평균
 * 대비 탭이 받아 둔 서버 점포당 값이 있으면 그 값을 먼저 쓰는지 본다. 쿼리 캐시를 심어 서버
 * 렌더로 본다(`analysis-result-view.benchmark.test.ts` 와 같은 방식).
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
  districtCode: '11440',
  administrationCode: '11440660',
  commercialCode: '3130191',
  serviceCode: 'CS100010',
  periodCode: '20261',
}

const ok = (body: unknown) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: body,
})

const PROFILE = {
  periodCode: '20261',
  commercialCode: '3130191',
  commercialName: '홍대 걷고싶은 거리',
  districtCode: '11440',
  districtName: '마포구',
  administrationCode: '11440660',
  administrationName: '서교동',
  keyMetrics: {
    totalSalesAmount: 2_635_270_379,
    totalFootTraffic: 542_312,
    totalStoreCount: 48,
    similarStoreCount: 59,
    totalResidentPopulation: 478,
  },
  policyRecommendations: [],
} as unknown as CommercialProfile

const SALES_SUMMARY: CommercialSalesSummary = {
  administration: {
    code: '11440660',
    name: '서교동',
    monthlySalesAmount: 27_014_787_469,
  },
  commercial: {
    code: '3130191',
    name: '홍대 걷고싶은 거리',
    serviceName: '커피-음료',
    monthlySalesAmount: 2_635_270_379,
  },
} as CommercialSalesSummary

const render = ({
  profile = PROFILE,
  benchmark,
}: {
  profile?: CommercialProfile
  benchmark?: CommercialBenchmark
} = {}) => {
  searchParamsBox.current = new URLSearchParams({
    ...BASE_PARAMS,
    tab: 'summary',
  })
  const { commercialCode, serviceCode, periodCode } = BASE_PARAMS
  const client = new QueryClient()

  client.setQueryData(
    ['analysis', 'profile', commercialCode, serviceCode, periodCode],
    ok(profile),
  )
  client.setQueryData(
    ['analysis', 'services', commercialCode],
    ok([{ serviceCode, serviceName: '커피-음료' }]),
  )
  client.setQueryData(
    [
      'analysis',
      'sales-summary',
      commercialCode,
      {
        districtCode: BASE_PARAMS.districtCode,
        administrationCode: BASE_PARAMS.administrationCode,
        serviceCode,
        periodCode,
      },
    ],
    ok(SALES_SUMMARY),
  )
  if (benchmark) {
    client.setQueryData(
      ['analysis', 'benchmark', commercialCode, serviceCode, periodCode],
      ok(benchmark),
    )
  }

  const markup = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AnalysisResultView, null),
    ),
  )
  const start = markup.indexOf('핵심 지표')
  return markup.slice(start, markup.indexOf('받을 수 있는 지원', start))
}

describe('AnalysisResultView · 요약 핵심 지표 (#561)', () => {
  it('첫 카드는 점포당 월 매출이고 합계는 분모를 밝힌 캡션이다', () => {
    const section = render()

    expect(section).toContain('점포당 월 매출')
    // 2,635,270,379 / 59 = 44,665,599.6 → 4466만원.
    expect(section).toContain('4466만원')
    expect(section).toContain('커피-음료 전체 26억 3527만원')
    expect(section).not.toContain('>월 매출<')
  })

  it('설명은 점포당 문장과 행정동 비중 문장 두 개다', () => {
    const section = render()

    expect(section).toContain(
      '홍대 걷고싶은 거리의 커피-음료 점포 59개가 한 곳당 월 평균 약 4466만원어치를 팔아요. 서교동 전체 커피-음료 매출의 9.8%가 이 상권에서 나와요.',
    )
  })

  it('지역 평균 대비 탭이 받아 둔 서버 점포당 값이 있으면 그 값을 먼저 쓴다', () => {
    const section = render({
      benchmark: {
        salesPerStore: {
          serviceCode: 'CS100010',
          serviceName: '커피-음료',
          commercial: {
            code: '3130191',
            name: '홍대 걷고싶은 거리',
            monthlySalesAmount: 2_635_270_379,
            storeCount: 59,
            // 계산값(4466만원)과 일부러 다르게 둔다 — 어느 쪽을 썼는지 보이게.
            monthlySalesPerStore: 50_000_000,
          },
        },
      },
    })

    expect(section).toContain('5000만원')
    expect(section).toContain('약 5000만원어치를 팔아요')
  })

  /* 원천 불일치 — 「점포가 없어요」와 「매출의 X%」가 한 설명에 서면 모순이다. */
  it('점포 0 · 합계 > 0 이면 점포 수 집계 없음으로 적고 비중 문장만 남긴다', () => {
    const section = render({
      profile: {
        ...PROFILE,
        keyMetrics: { ...PROFILE.keyMetrics, similarStoreCount: 0 },
      } as CommercialProfile,
    })

    expect(section).toContain('점포 수 집계 없음')
    expect(section).not.toContain('점포가 없어요')
    expect(section).not.toContain('한 곳당')
    expect(section).toContain(
      '서교동 전체 커피-음료 매출의 9.8%가 이 상권에서 나와요.',
    )
  })
})
