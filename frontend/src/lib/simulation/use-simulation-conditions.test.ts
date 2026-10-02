// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

/* 서버 카탈로그 — 기본 분기 20261(period-catalog.md D4-4). */
vi.mock('@/lib/api/analysis-period', () => ({
  fetchAnalysisPeriods: () =>
    Promise.resolve({
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: { defaultPeriodCode: '20261' },
    }),
}))

import { useSimulationConditions } from '@/lib/simulation/use-simulation-conditions'

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(
    QueryClientProvider,
    {
      client: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
    },
    children,
  )

const COMPLETE = {
  franchisee: false,
  districtCode: '11680',
  serviceCode: 'CS100001',
  storeSize: 66,
  floorType: 'FIRST_FLOOR' as const,
}

/**
 * 시뮬레이션 요청의 분기(period-catalog.md D4-4). 분기는 조건이 아니지만 요청에 명시해 리포트 URL·캐시 키를
 * 그 분기로 고정한다.
 */
describe('useSimulationConditions — 분기', () => {
  it('서버 카탈로그의 기본 분기를 요청에 싣는다', async () => {
    const { result } = renderHook(() => useSimulationConditions(COMPLETE), {
      wrapper,
    })

    await waitFor(() =>
      expect(result.current.reportRequest?.periodCode).toBe('20261'),
    )
  })

  /* 비교 링크처럼 URL 에 분기가 실려 들어오면 그 분기를 끝까지 쓴다 — 옛 링크가 「조건이 바뀌었어요」로 읽히지 않게. */
  it('넘겨받은 분기가 있으면 카탈로그가 와도 그 분기를 유지한다', async () => {
    const { result } = renderHook(
      () => useSimulationConditions(COMPLETE, { periodCode: '20254' }),
      { wrapper },
    )

    expect(result.current.reportRequest?.periodCode).toBe('20254')
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(result.current.reportRequest?.periodCode).toBe('20254')
  })
})
