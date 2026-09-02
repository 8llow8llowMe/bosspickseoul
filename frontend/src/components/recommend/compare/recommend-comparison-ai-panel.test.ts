import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import RecommendComparisonAiPanel from '@/components/recommend/compare/recommend-comparison-ai-panel'

const authBox = vi.hoisted(() => ({
  current: { hasHydrated: true, isLoggedIn: false },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector(authBox.current),
}))

const submitted = vi.hoisted(() => ({ current: 0 }))

vi.mock('@/lib/api/commercial-comparison', () => ({
  fetchCommercialComparison: () => Promise.resolve(null),
  submitCommercialComparisonAiReport: () => {
    submitted.current += 1
    return Promise.resolve({})
  },
}))

const render = () =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      {
        client: new QueryClient({
          defaultOptions: { queries: { retry: false } },
        }),
      },
      createElement(RecommendComparisonAiPanel, {
        leftCommercialCode: '3110008',
        rightCommercialCode: '3110012',
        serviceCode: 'CS100010',
        returnTo: '/recommend/compare?districtCode=11680',
      }),
    ),
  )

afterEach(() => {
  submitted.current = 0
  authBox.current = { hasHydrated: true, isLoggedIn: false }
})

describe('RecommendComparisonAiPanel', () => {
  /**
   * 비교 조회는 인증이 필요 없다. 그래서 이 패널은 **자기 버튼만** 잠그고,
   * 화면의 표·리포트는 비로그인에게도 그대로 보인다.
   */
  it('비로그인에게는 로그인 유도를 보여 주고 제출하지 않는다', () => {
    const markup = render()

    expect(markup).toContain('로그인하고 받아보기')
    expect(markup).not.toContain('AI 인사이트 받기')
    expect(submitted.current).toBe(0)
  })

  it('로그인 복귀 경로에 지금 비교 조건을 실어 보낸다', () => {
    const markup = render()

    // 조건을 잃으면 로그인 후 빈 비교 화면으로 돌아온다.
    expect(markup).toContain(
      encodeURIComponent('/recommend/compare?districtCode=11680'),
    )
  })

  /**
   * 화면에 들어오자마자 제출하면 비교만 보러 온 사람의 AI 일일 사용량을 말없이 깎는다.
   * 첫 렌더는 버튼만 있고 요청은 없어야 한다.
   */
  it('로그인 상태여도 누르기 전에는 제출하지 않는다', () => {
    authBox.current = { hasHydrated: true, isLoggedIn: true }
    const markup = render()

    expect(markup).toContain('AI 인사이트 받기')
    expect(submitted.current).toBe(0)
  })

  it('하이드레이션 전에는 버튼도 로그인 유도도 그리지 않는다', () => {
    authBox.current = { hasHydrated: false, isLoggedIn: false }
    const markup = render()

    expect(markup).not.toContain('AI 인사이트 받기')
    expect(markup).not.toContain('로그인하고 받아보기')
  })
})
