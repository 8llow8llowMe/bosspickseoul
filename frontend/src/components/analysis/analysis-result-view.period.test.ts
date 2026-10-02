import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import AnalysisResultView from '@/components/analysis/analysis-result-view'
import { ANALYSIS_PERIOD_CATALOG_QUERY_KEY } from '@/hooks/use-analysis-period-catalog'

/**
 * 결과 화면의 분기 해석 배선(period-catalog.md D5-1 · D7 #4).
 *
 * - URL 에 분기가 있으면 카탈로그(`/periods`)를 기다리지 않고 그 분기로 조회한다.
 * - URL 에 분기가 없으면 「최신」이고, 카탈로그의 기본 분기로 조회한다. 카탈로그 전에는 조회하지 않는다.
 *
 * 쿼리 캐시를 심어 서버 렌더로 본다(analysis-result-view.income.test.ts 와 같은 방식). 어느 분기 키의
 * 캐시가 화면에 쓰였는지로 해석 결과를 판정한다.
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

const CONDITION = {
  districtCode: '11680',
  administrationCode: '11680640',
  commercialCode: '3110971',
  serviceCode: 'CS100001',
}

const ok = (body: unknown) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: body,
})

/** 분기마다 다른 상권 이름을 심어, 화면에 어느 분기 응답이 쓰였는지 드러낸다. */
const seedProfile = (client: QueryClient, periodCode: string) =>
  client.setQueryData(
    [
      'analysis',
      'profile',
      CONDITION.commercialCode,
      CONDITION.serviceCode,
      periodCode,
    ],
    ok({
      commercialCode: CONDITION.commercialCode,
      commercialName: `상권-${periodCode}`,
      districtName: '강남구',
      administrationName: '역삼1동',
    }),
  )

const render = ({
  periodCode,
  catalogDefault,
}: {
  periodCode?: string
  catalogDefault?: string
}) => {
  searchParamsBox.current = new URLSearchParams({
    ...CONDITION,
    ...(periodCode ? { periodCode } : {}),
  })
  const client = new QueryClient()
  seedProfile(client, '20233')
  seedProfile(client, '20261')
  if (catalogDefault) {
    client.setQueryData(
      ANALYSIS_PERIOD_CATALOG_QUERY_KEY,
      ok({ defaultPeriodCode: catalogDefault }),
    )
  }

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AnalysisResultView, null),
    ),
  )
}

describe('AnalysisResultView · 분기 해석', () => {
  it('URL 분기가 있으면 카탈로그 없이 그 분기로 조회한다', () => {
    const markup = render({ periodCode: '20233' })

    expect(markup).toContain('상권-20233')
    expect(markup).not.toContain('상권-20261')
  })

  it('URL 분기가 없으면 카탈로그의 기본 분기로 조회한다', () => {
    const markup = render({ catalogDefault: '20261' })

    expect(markup).toContain('상권-20261')
    expect(markup).not.toContain('상권-20233')
  })

  it('URL 분기도 카탈로그도 없으면 아직 어느 분기로도 조회하지 않는다', () => {
    const markup = render({})

    expect(markup).not.toContain('상권-20261')
    expect(markup).not.toContain('상권-20233')
  })

  it('URL 분기가 서버 기본 분기보다 새로우면 기본 분기로 내린다', () => {
    const markup = render({ periodCode: '20264', catalogDefault: '20261' })

    expect(markup).toContain('상권-20261')
  })
})
