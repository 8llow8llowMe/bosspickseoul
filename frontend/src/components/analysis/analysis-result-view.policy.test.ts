import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import AnalysisResultView from '@/components/analysis/analysis-result-view'
import type { PolicyItem } from '@/types/policy'

/**
 * 「받을 수 있는 지원」 섹션의 **배선** 검증.
 *
 * 이 화면은 브라우저에서 확인할 수 없다 — `/analysis/result` 는 이 환경에서
 * Suspense 경계가 끝까지 풀리지 않아 `main` 이 빈 채로 남는다(변경 전 develop 에서도
 * 똑같이 재현됨). 그래서 프로필 쿼리를 캐시에 심어 서버 렌더로 확인한다.
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
  districtCode: '11680',
  administrationCode: '11680640',
  commercialCode: '3110971',
  serviceCode: 'CS100001',
  periodCode: '20233',
}

const policy = (overrides: Partial<PolicyItem> = {}): PolicyItem => ({
  policyId: '9000000000000000003',
  title: '소상공인 스마트기술 도입 지원',
  organization: '중소벤처기업부',
  supportType: 'SUBSIDY',
  supportTypeName: '보조금',
  targetSummary: '스마트기기 도입 희망 소상공인',
  supportContent: '도입비의 70%, 최대 500만원 보조',
  districtCode: null,
  serviceCategoryCode: null,
  applyStartAt: '2026-03-01',
  applyEndAt: '2026-09-30',
  detailUrl: 'https://www.mss.go.kr',
  ...overrides,
})

const render = (policies: PolicyItem[] | null | undefined) => {
  searchParamsBox.current = new URLSearchParams({
    ...BASE_PARAMS,
    tab: 'summary',
  })
  const client = new QueryClient()

  client.setQueryData(
    [
      'analysis',
      'profile',
      BASE_PARAMS.commercialCode,
      BASE_PARAMS.serviceCode,
      BASE_PARAMS.periodCode,
    ],
    {
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: {
        commercialCode: BASE_PARAMS.commercialCode,
        commercialName: '선정릉역 4번',
        districtCode: '11680',
        districtName: '강남구',
        administrationCode: '11680640',
        administrationName: '역삼1동',
        keyMetrics: null,
        ...(policies === undefined ? {} : { policyRecommendations: policies }),
      },
    },
  )

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AnalysisResultView, null),
    ),
  )
}

describe('AnalysisResultView · 받을 수 있는 지원', () => {
  it('프로필이 준 정책을 요약 탭에 그린다', () => {
    const markup = render([policy()])

    expect(markup).toContain('받을 수 있는 지원')
    expect(markup).toContain('소상공인 스마트기술 도입 지원')
    expect(markup).toContain('보조금')
    expect(markup).toContain('2026.03.01 ~ 2026.09.30')
  })

  /* 정책 섹션은 요약(`report-summary`) 안에 있어야 한다 — 탭이 갈리면 안 된다. */
  it('요약 섹션 안에 놓인다', () => {
    const markup = render([policy()])

    const summaryStart = markup.indexOf('id="report-summary"')
    const footTrafficStart = markup.indexOf('id="report-foot-traffic"')
    const policyAt = markup.indexOf('받을 수 있는 지원')

    expect(summaryStart).toBeGreaterThanOrEqual(0)
    expect(policyAt).toBeGreaterThan(summaryStart)
    expect(policyAt).toBeLessThan(footTrafficStart)
  })

  /*
   * 정책 데이터가 없는 환경(시드 미적재)에서는 형제 섹션들과 같은 모양의 빈 상태가
   * 나와야 한다. 섹션을 숨기면 탭 구조가 환경에 따라 달라진다.
   */
  it('정책이 0건이면 빈 상태를 말한다', () => {
    const markup = render([])

    expect(markup).toContain('받을 수 있는 지원')
    expect(markup).toContain('이 조건에서 안내할 지원 정책이 없어요.')
  })

  /* 구버전 백엔드가 필드를 아예 안 주는 경우에도 터지지 않는다. */
  it('응답에 필드가 없어도 빈 상태로 다룬다', () => {
    const markup = render(undefined)

    expect(markup).toContain('이 조건에서 안내할 지원 정책이 없어요.')
  })

  it('null 로 와도 빈 상태로 다룬다', () => {
    const markup = render(null)

    expect(markup).toContain('이 조건에서 안내할 지원 정책이 없어요.')
  })
})
