import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { parseRecommendUrlState } from '@/lib/recommend/recommend-url'

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

const render = (search: string) => {
  searchParamsBox.current = new URLSearchParams(search)
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(SimulationReportPage),
    ),
  )
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
