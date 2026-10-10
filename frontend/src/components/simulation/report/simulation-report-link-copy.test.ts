// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { REPORT_LINK_MESSAGES } from '@/lib/share/share-delivery'

/*
  리포트 머리줄 「링크 복사」(#573)의 토스트 분기. 시트·복사 판단 자체는 share-delivery.test.ts 가
  덮고, 여기서는 그 결과(shared·copied·aborted·실패)가 어떤 토스트가 되는지만 잠근다.
*/

const deliver = vi.hoisted(() => vi.fn())
const showToast = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/simulation/report',
  useSearchParams: () =>
    new URLSearchParams(
      'franchisee=false&districtCode=11440&serviceCode=CS100001&storeSize=66&floorType=FIRST_FLOOR',
    ),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { hasHydrated: boolean; isLoggedIn: boolean }) => unknown,
  ) => selector({ hasHydrated: true, isLoggedIn: false }),
}))
// 리포트 계산은 이 테스트의 관심이 아니다. 끝나지 않는 요청으로 둔다.
vi.mock('@/lib/api/simulation', async () => ({
  ...(await vi.importActual<object>('@/lib/api/simulation')),
  createSimulationReport: () => new Promise(() => {}),
}))
vi.mock('@/components/ui/toast', async () => ({
  ...(await vi.importActual<object>('@/components/ui/toast')),
  useToast: () => ({ showToast }),
}))
vi.mock('@/lib/share/share-delivery', async () => ({
  ...(await vi.importActual<object>('@/lib/share/share-delivery')),
  deliverShareUrl: deliver,
}))

const { default: SimulationReportPage } =
  await import('@/components/simulation/report/simulation-report-page')

const clickCopy = async () => {
  render(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(SimulationReportPage),
    ),
  )
  fireEvent.click(screen.getByRole('button', { name: '링크 복사' }))
  // 핸들러는 비동기다. 마이크로태스크를 비운다.
  await new Promise(resolve => setTimeout(resolve, 0))
}

beforeEach(() => {
  deliver.mockReset()
  showToast.mockReset()
})
afterEach(cleanup)

describe('리포트 「링크 복사」 토스트', () => {
  it('지금 주소를 넘긴다', async () => {
    deliver.mockResolvedValue('copied')
    await clickCopy()

    expect(deliver).toHaveBeenCalledWith({
      url: window.location.href,
      title: '창업 시뮬레이션 리포트',
    })
  })

  it.each([
    ['shared', REPORT_LINK_MESSAGES.shared],
    ['copied', REPORT_LINK_MESSAGES.copied],
  ] as const)('%s 면 성공 토스트', async (result, message) => {
    deliver.mockResolvedValue(result)
    await clickCopy()

    expect(showToast).toHaveBeenCalledWith({
      message,
      dedupeKey: 'simulation-report-link',
    })
  })

  it('시트를 닫았으면(aborted) 토스트가 없다', async () => {
    deliver.mockResolvedValue('aborted')
    await clickCopy()

    expect(showToast).not.toHaveBeenCalled()
  })

  it('실패면 오류 토스트', async () => {
    deliver.mockRejectedValue(new Error('no clipboard'))
    await clickCopy()

    expect(showToast).toHaveBeenCalledWith({
      message: REPORT_LINK_MESSAGES.failed,
      tone: 'error',
      dedupeKey: 'simulation-report-link',
    })
  })
})
