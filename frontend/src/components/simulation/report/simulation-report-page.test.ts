import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { parseRecommendUrlState } from '@/lib/recommend/recommend-url'
import { parseSimulationAnalysisContext } from '@/lib/simulation/analysis-context'

const searchParamsBox = vi.hoisted(() => ({ current: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/simulation/report',
  useSearchParams: () => searchParamsBox.current,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { hasHydrated: boolean; isLoggedIn: boolean }) => unknown,
  ) => selector({ hasHydrated: true, isLoggedIn: false }),
}))

const { default: SimulationReportPage } =
  await import('@/components/simulation/report/simulation-report-page')

const render = (
  search: string,
  variant: 'standalone' | 'analysis' = 'standalone',
) => {
  searchParamsBox.current = new URLSearchParams(search)
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(SimulationReportPage, { variant }),
    ),
  )
}

/** 마크업에서 「조건 다시 고르기」·「조건 고르러 가기」 링크의 href 를 꺼낸다. */
const builderLinkHref = (markup: string, label: string): URL => {
  const anchors = markup.match(/<a[^>]*>[\s\S]*?<\/a>/g) ?? []
  const anchor = anchors.find(node => node.includes(label))
  const href = anchor?.match(/href="([^"]*)"/)?.[1]
  if (!href) throw new Error(`「${label}」 링크가 없다`)
  return new URL(href.replaceAll('&amp;', '&'), 'http://localhost')
}

const REPORT_QUERY =
  'franchisee=false&districtCode=11440&serviceCode=CS100001&storeSize=66&floorType=FIRST_FLOOR'

describe('SimulationReportPage 보조 행동 (#566, #573)', () => {
  it('리포트 조건의 자치구·업종으로 상권 추천을 연다', () => {
    const markup = render(REPORT_QUERY)
    const link =
      markup.match(/<a[^>]*href="\/recommend\?[^"]*"[^>]*>/)?.[0] ?? ''

    expect(markup).toContain('이 구에서 상권 추천받기')
    expect(link).toContain(
      'href="/recommend?districtCode=11440&amp;serviceCode=CS100001"',
    )
    // 넘어간 추천 화면이 그대로 복원하는 조건이다.
    expect(
      parseRecommendUrlState(
        new URLSearchParams('districtCode=11440&serviceCode=CS100001'),
      ),
    ).toMatchObject({
      district: { code: '11440', name: '마포구' },
      service: { code: 'CS100001', name: '한식음식점' },
    })
  })

  it('링크 복사 버튼을 둔다', () => {
    expect(render(REPORT_QUERY)).toMatch(/<button[^>]*>.*링크 복사<\/button>/)
  })

  it('조건이 없으면 보조 행동도 없다', () => {
    const markup = render('')

    expect(markup).toContain('계산할 조건이 없어요')
    expect(markup).not.toContain('링크 복사')
    expect(markup).not.toContain('이 구에서 상권 추천받기')
  })
})

/*
  #635 — 분석 경유 리포트는 분석 컨텍스트(`ctx` 키)를 읽지 않고 옮기기만 한다. 입력 화면으로 돌아가도 카드가
  원래 분석 조건(여기서는 서대문구)을 말하고, 리포트 조건(마포구)을 분석 조건으로 오독하지 않는다.
*/
describe('SimulationReportPage 분석 컨텍스트 왕복 (#635)', () => {
  const CONTEXT_QUERY =
    'ctx=1&ctxDistrictCode=11410&ctxCommercialCode=3110001&ctxServiceCode=CS100001'

  it('「조건 다시 고르기」가 분석 컨텍스트를 보존하고, 그 링크의 카드는 원래 분석 조건을 말한다', () => {
    const url = builderLinkHref(
      render(`${REPORT_QUERY}&${CONTEXT_QUERY}`, 'analysis'),
      '조건 다시 고르기',
    )

    expect(url.pathname).toBe('/analysis/simulation')
    expect(url.searchParams.get('districtCode')).toBe('11440')
    expect(url.searchParams.get('ctxDistrictCode')).toBe('11410')
    expect(url.searchParams.get('ctxCommercialCode')).toBe('3110001')
    expect(parseSimulationAnalysisContext(url.searchParams)?.districtName).toBe(
      '서대문구',
    )
  })

  it('컨텍스트 없는 리포트에서 돌아가면 카드가 없다 — 리포트 조건을 분석 조건이라고 말하지 않는다', () => {
    const url = builderLinkHref(
      render(REPORT_QUERY, 'analysis'),
      '조건 다시 고르기',
    )

    expect(url.searchParams.get('ctx')).toBe('1')
    expect(parseSimulationAnalysisContext(url.searchParams)).toBeNull()
  })

  it('조건이 없는 리포트의 「조건 고르러 가기」도 컨텍스트를 보존한다', () => {
    const url = builderLinkHref(
      render(CONTEXT_QUERY, 'analysis'),
      '조건 고르러 가기',
    )

    expect(parseSimulationAnalysisContext(url.searchParams)?.districtName).toBe(
      '서대문구',
    )
  })

  it('단독 리포트는 컨텍스트 키를 싣지 않는다', () => {
    const url = builderLinkHref(render(REPORT_QUERY), '조건 다시 고르기')

    expect(url.pathname).toBe('/simulation')
    expect(url.searchParams.has('ctx')).toBe(false)
  })
})
