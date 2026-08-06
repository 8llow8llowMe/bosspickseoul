import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AnalysisResultView from '@/components/analysis/analysis-result-view'
import { ANALYSIS_TABS } from '@/lib/analysis/presentation'

/**
 * Regression coverage for a reported hydration mismatch: a deep-linked tab
 * (e.g. `?tab=sales`) was said to make the server-rendered HTML and the
 * client's first render disagree on the *structure* of a report section's
 * card grid (a `FullSpanItem` wrapper appearing on one side but not the
 * other at the same position).
 *
 * `AnalysisResultView` doesn't run any effects during a single render pass
 * (React never runs effects during `renderToStaticMarkup`, matching real
 * SSR), and every card's wrapper choice in the source is a hard-coded JSX
 * position — never behind a ternary keyed off loading/data/activation
 * state. These tests assert that invariant holds for every tab: the same
 * URL always produces the exact same section structure, and the full
 * output string is byte-identical across repeated renders (which is what
 * "the server tree matches the client's first tree" actually requires).
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
  commercialCode: '3110008',
  serviceCode: 'CS100001',
  periodCode: '20233',
}

const renderForTab = (tab: string) => {
  searchParamsBox.current = new URLSearchParams({ ...BASE_PARAMS, tab })
  const queryClient = new QueryClient()
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AnalysisResultView, null),
    ),
  )
}

describe('AnalysisResultView 서버 렌더 구조 안정성 (hydration 회귀 테스트)', () => {
  beforeEach(() => {
    searchParamsBox.current = new URLSearchParams()
  })

  it.each(ANALYSIS_TABS.map(tab => tab.value))(
    'tab=%s 딥링크에서도 7개 report 섹션이 정확히 한 번씩, 문서 순서대로 나온다',
    tab => {
      const markup = renderForTab(tab)

      const ids = ANALYSIS_TABS.map(({ value }) => `id="report-${value}"`)
      ids.forEach(id => {
        const occurrences = markup.split(id).length - 1
        expect(occurrences).toBe(1)
      })

      const positions = ids.map(id => markup.indexOf(id))
      expect(positions).toEqual([...positions].sort((a, b) => a - b))
    },
  )

  it('같은 URL을 두 번 렌더해도 출력이 완전히 동일하다(서버·클라 초기 렌더 트리 일치의 전제조건)', () => {
    const first = renderForTab('sales')
    const second = renderForTab('sales')
    expect(first).toBe(second)
  })

  it('요약(summary) 진입에서도 동일하게 구조가 안정적이다', () => {
    const first = renderForTab('summary')
    const second = renderForTab('summary')
    expect(first).toBe(second)
  })
})
