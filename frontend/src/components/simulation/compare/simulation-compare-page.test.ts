// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SimulationComparePage from '@/components/simulation/compare/simulation-compare-page'
import * as api from '@/lib/api/simulation'
import { buildSimulationCompareHrefFromReport } from '@/lib/simulation/compare-route'

/*
 * #567 — 조건 하나에서 비교로 넘어가면 B 는 A 의 복사본으로 시작한다(결정 D-3). 이 파일은 그 배선을 본다:
 * 복사본으로 열리는가, 같은 계산은 조회하지 않는가, 「조건 B 비우기」가 B 를 비우는가.
 */

const navigation = vi.hoisted(() => ({ search: '' }))
const replace = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/simulation/compare',
  useSearchParams: () => new URLSearchParams(navigation.search),
}))

vi.mock('@/lib/api/analysis-period', () => ({
  fetchAnalysisPeriods: () =>
    Promise.resolve({
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: { defaultPeriodCode: '20261' },
    }),
}))

vi.mock('@/lib/api/simulation', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api/simulation')>()),
  createSimulationReportPair: vi.fn(),
  fetchSimulationFranchisees: vi.fn(),
}))

const REQUEST = {
  franchisee: false,
  districtCode: '11680',
  serviceCode: 'CS100001',
  storeSize: 66,
  floorType: 'FIRST_FLOOR' as const,
  periodCode: '20261',
}

const renderPage = () =>
  render(
    createElement(
      QueryClientProvider,
      {
        client: new QueryClient({
          defaultOptions: { queries: { retry: false } },
        }),
      },
      createElement(SimulationComparePage),
    ),
  )

const select = (name: string) =>
  screen.getByLabelText<HTMLSelectElement>(name, { selector: 'select' })

const compareButton = () =>
  screen.getByRole<HTMLButtonElement>('button', { name: '비교하기' })

beforeEach(() => {
  const href = buildSimulationCompareHrefFromReport(REQUEST)
  navigation.search = href.slice(href.indexOf('?') + 1)
  // 실제처럼 커밋 뒤에 돈다 — 동기로 부르면 다시 마운트되기 전의 칸을 집는다.
  window.requestAnimationFrame = ((callback: FrameRequestCallback) =>
    window.setTimeout(
      () => callback(0),
      0,
    )) as unknown as typeof window.requestAnimationFrame
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SimulationComparePage — B 는 A 복사본으로 시작한다 (#567)', () => {
  it('B 편집기가 A 와 같은 조건으로 열리고, 같은 계산이라 조회하지 않는다', () => {
    renderPage()

    expect(select('조건 B 자치구').value).toBe('11680')
    expect(select('조건 B 층 구분').value).toBe('FIRST_FLOOR')
    expect(api.createSimulationReportPair).not.toHaveBeenCalled()
    expect(compareButton().disabled).toBe(true)
    expect(
      screen.getByText('조건 B에서 하나 이상 바꾸면 비교할 수 있어요.'),
    ).toBeTruthy()
    expect(screen.queryByText('A와 다름')).toBeNull()
  })

  it('B 의 한 칸을 바꾸면 그 칸에 「A와 다름」이 붙고 비교할 수 있다', () => {
    renderPage()

    fireEvent.change(select('조건 B 층 구분'), { target: { value: 'OTHER' } })

    expect(screen.getAllByText('A와 다름')).toHaveLength(1)
    expect(compareButton().disabled).toBe(false)
  })

  it('「조건 B 비우기」는 B 만 비우고 A 는 그대로 둔다', async () => {
    renderPage()
    fireEvent.change(select('조건 B 층 구분'), { target: { value: 'OTHER' } })

    fireEvent.click(screen.getByRole('button', { name: '조건 B 비우기' }))

    expect(select('조건 B 자치구').value).toBe('')
    expect(select('조건 B 층 구분').value).toBe('')
    expect(select('조건 A 자치구').value).toBe('11680')
    // 빈 칸은 다르다고 하지 않는다 — 비운 뒤 모든 칸에 배지가 붙지 않는다.
    expect(screen.queryByText('A와 다름')).toBeNull()
    expect(
      screen.getByText('양쪽 조건을 모두 고르면 비교할 수 있어요.'),
    ).toBeTruthy()
    // 다음에 할 일(B 의 첫 칸)로 포커스를 옮긴다.
    await waitFor(() =>
      expect(document.activeElement).toBe(select('조건 B 창업 형태')),
    )
  })
})
