import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import type {
  SimulationReport,
  SimulationReportRequest,
} from '@/types/simulation'

const authState = vi.hoisted(() => ({
  current: { hasHydrated: true, isLoggedIn: false },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: typeof authState.current) => unknown) =>
    selector(authState.current),
}))

const { SimulationReportReady } =
  await import('@/components/simulation/report/simulation-report-page')

const request: SimulationReportRequest = {
  franchisee: false,
  districtCode: '11440',
  serviceCode: 'CS100001',
  storeSize: 66,
  floorType: 'FIRST_FLOOR',
}

const report: SimulationReport = {
  condition: {
    franchisee: false,
    franchiseeId: null,
    brandName: null,
    districtCode: '11440',
    districtName: '마포구',
    serviceCode: 'CS100001',
    serviceName: '한식음식점',
    storeSize: 66,
    floorType: { code: 'FIRST_FLOOR', name: '1층', description: '1층 점포' },
    periodCode: '20261',
  },
  dataBaseYear: '2024',
  totalPrice: 6_954,
  keyMoney: { keyMoneyRatio: 62, keyMoneyAverage: 4_200, keyMoneyLevel: 63 },
  costDetail: { rentPrice: 315, deposit: 3_152, interior: 3_486, levy: null },
  similarFranchisees: [],
  genderAgeAnalysis: null,
  seasonAnalysis: null,
}

const render = () =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(SimulationReportReady, {
        report,
        request,
        currentHref: '/simulation/report?districtCode=11440',
        compareHref: '/simulation/compare?a.districtCode=11440',
      }),
    ),
  )

/*
 * 요약 열(≥1024)과 하단 바(≤1023)에 저장 CTA 가 두 벌 있고, 보이는 쪽은 CSS 가 고른다. 두 벌이
 * 같은 저장 상태를 읽어야 한쪽에서 저장한 것이 다른 쪽에도 보인다.
 */
describe('SimulationReportReady', () => {
  it('요약 열과 하단 바가 같은 저장 상태로 그려진다', () => {
    authState.current = { hasHydrated: true, isLoggedIn: false }
    const html = render()

    expect(html.match(/저장하려면 로그인/g)).toHaveLength(2)
    expect(html.match(/role="status"/g)).toHaveLength(2)
  })

  it('두 곳의 비교 링크가 같은 조건을 A 에 싣는다', () => {
    authState.current = { hasHydrated: true, isLoggedIn: true }
    const html = render()

    expect(
      html.match(/href="\/simulation\/compare\?a\.districtCode=11440"/g),
    ).toHaveLength(2)
    expect(html.match(/결과 저장/g)).toHaveLength(2)
  })
})
