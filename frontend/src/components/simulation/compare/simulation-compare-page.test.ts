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
import {
  buildSimulationCompareHref,
  buildSimulationCompareHrefFromReport,
} from '@/lib/simulation/compare-route'

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

const renderPage = (variant: 'standalone' | 'analysis' = 'standalone') =>
  render(
    createElement(
      QueryClientProvider,
      {
        client: new QueryClient({
          defaultOptions: { queries: { retry: false } },
        }),
      },
      createElement(SimulationComparePage, { variant }),
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

/*
  #635 재리뷰 — 「비교하기」는 주소를 맞추는 일과 다시 계산하는 일을 따로 판정한다. 쿼리 키는 주소에서 파싱한
  요청으로 만들므로, 주소가 표식(`ctx=1`)만큼 달라도 키는 같다. 그때 다시 계산하지 않으면 눌러도 반응이 없다.
*/
describe('SimulationComparePage — 옛 분석 경유 비교 링크에서 다시 비교하기 (#635)', () => {
  const failure = {
    dataHeader: {
      success: false,
      resultCode: 'SIMULATION_002',
      resultMessage: '해당 자치구의 임대료 기준이 없습니다.',
    },
    dataBody: null,
  }

  const enterLegacyCompare = (withPeriod: boolean) => {
    const right = { ...REQUEST, floorType: 'OTHER' as const }
    const pair = withPeriod
      ? { left: REQUEST, right }
      : {
          left: { ...REQUEST, periodCode: undefined },
          right: { ...right, periodCode: undefined },
        }
    // #635 이전 형식 — 표식도 ctx 키도 없다.
    navigation.search = buildSimulationCompareHref(pair, 'analysis').split(
      '?',
    )[1]
    vi.mocked(api.createSimulationReportPair).mockResolvedValue([
      failure,
      failure,
    ] as never)
    renderPage('analysis')
  }

  it('같은 조건으로 누르면 주소를 새 형식으로 맞추고 정확히 한 번 다시 계산한다', async () => {
    enterLegacyCompare(true)
    await waitFor(() =>
      expect(api.createSimulationReportPair).toHaveBeenCalledTimes(1),
    )
    // 첫 계산이 오류로 끝나 버튼이 「비교하기」로 돌아올 때까지 기다린다.
    fireEvent.click(await screen.findByRole('button', { name: '비교하기' }))

    expect(replace).toHaveBeenCalledTimes(1)
    expect(
      new URLSearchParams(replace.mock.calls[0][0].split('?')[1]).get('ctx'),
    ).toBe('1')
    await waitFor(() =>
      expect(api.createSimulationReportPair).toHaveBeenCalledTimes(2),
    )
    // 디바운스·재시도로 더 나가지 않는지 한 틱 더 기다려 확인한다.
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(api.createSimulationReportPair).toHaveBeenCalledTimes(2)
  })

  it('분기 없는 옛 링크는 키가 바뀌므로 여기서 다시 계산하지 않는다 — 새 키가 계산을 맡는다', async () => {
    enterLegacyCompare(false)
    await waitFor(() =>
      expect(api.createSimulationReportPair).toHaveBeenCalledTimes(1),
    )
    // 편집기 요청이 카탈로그 분기(20261)를 실을 때까지 기다린다(카탈로그 mock 은 바로 풀린다).
    await new Promise(resolve => setTimeout(resolve, 50))

    fireEvent.click(await screen.findByRole('button', { name: '비교하기' }))

    expect(replace).toHaveBeenCalledTimes(1)
    expect(
      new URLSearchParams(replace.mock.calls[0][0].split('?')[1]).get(
        'a.periodCode',
      ),
    ).toBe('20261')
    await new Promise(resolve => setTimeout(resolve, 50))
    // 주소(mock)는 바뀌지 않으므로, 여기서 refetch 했다면 2 가 된다.
    expect(api.createSimulationReportPair).toHaveBeenCalledTimes(1)
  })
})
