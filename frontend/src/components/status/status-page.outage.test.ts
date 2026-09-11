// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  DistrictTopTenSummary,
  DistrictTopTenResponse,
} from '@/types/status'

/*
 * 네 지표가 동시에 0건인 200 응답은 「데이터가 아직 없어요」가 아니라 데이터 공급
 * 장애다(#371). 판정 자체는 `isStatusTopTenAllEmpty` 가 순수 함수로 덮지만, **그
 * 판정이 화면 분기에 실제로 연결돼 있는지**는 여기서만 드러난다. 2026-09-11 dev
 * 장애 때 조용히 넘어간 자리가 정확히 이 배선이다.
 */

const { behavior } = vi.hoisted(() => ({
  behavior: {
    fetch: (): Promise<unknown> => Promise.resolve(null),
  },
}))

vi.mock('@/lib/api/status', () => ({
  fetchStatusTopTen: vi.fn(() => behavior.fetch()),
  fetchStatusDetail: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/status',
  useRouter: () => ({ replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}))

import StatusPage from './status-page'

const item = (districtCode: string) => ({
  districtCode,
  districtName: '강남구',
})

const summary = (hasData: boolean): DistrictTopTenSummary =>
  ({
    footTrafficTopTenItems: hasData
      ? [{ ...item('11680'), totalFootTraffic: 100, footTrafficChangeRate: 1 }]
      : [],
    salesTopTenItems: [],
    openedStoreTopTenItems: [],
    closedStoreTopTenItems: [],
  }) as unknown as DistrictTopTenSummary

const respondWith = (hasData: boolean) => {
  behavior.fetch = () =>
    Promise.resolve({
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: summary(hasData),
    } as unknown as DistrictTopTenResponse)
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
      createElement(StatusPage),
    ),
  )

const OUTAGE_TITLE = '자치구 데이터를 불러오지 못했어요'

afterEach(cleanup)

describe('StatusPage 데이터 공급 장애', () => {
  it('네 지표가 모두 비면 장애로 안내하고 재시도를 연다', async () => {
    respondWith(false)

    renderPage()

    expect(await screen.findByText(OUTAGE_TITLE)).toBeTruthy()
    expect(screen.getByText(/네 지표가 모두 비어 있습니다/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy()
  })

  it('한 지표라도 값이 있으면 평소 화면을 그린다', async () => {
    respondWith(true)

    renderPage()

    expect(
      await screen.findByText('자치구별 상권 흐름을 비교해 보세요'),
    ).toBeTruthy()
    expect(screen.queryByText(OUTAGE_TITLE)).toBeNull()
  })
})
