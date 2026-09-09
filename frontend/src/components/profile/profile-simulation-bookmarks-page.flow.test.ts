// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as api from '@/lib/api/simulation'
import ProfileSimulationBookmarksPage from './profile-simulation-bookmarks-page'
import type {
  SimulationHistories,
  SimulationHistoryItem,
} from '@/types/simulation'

/*
 * 순수 함수 두 개(`resolvePageAfterDelete`·`resolveClampedPage`)는 형제 파일이 덮는다.
 * 여기서 잠그는 것은 **그 둘을 배선한 결과** — 뒷페이지가 비었을 때 사용자가 목록으로
 * 돌아올 수 있는지다. 배선이 없으면 "저장한 결과가 없어요"에 갇힌다(앞 페이지에 항목이
 * 남아 있는데도). 문자열 렌더로는 뮤테이션 콜백이 돌지 않아 jsdom 에서 실제로 누른다.
 */

const PAGE_SIZE = 10

const item = (id: string): SimulationHistoryItem => ({
  historyId: id,
  franchisee: false,
  brandName: null,
  districtCode: '11740',
  districtName: `구${id}`,
  serviceCode: 'CS100001',
  serviceName: '한식음식점',
  storeSize: 66,
  floorType: { code: 'FIRST_FLOOR', name: '1층', description: '1층 점포' },
  totalPrice: 23_450,
  dataBaseYear: '2024',
  createdAt: '2026-08-20T09:12:33',
})

const ok = (dataBody: SimulationHistories) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody,
})

const notFound = () => ({
  response: {
    status: 404,
    data: {
      dataHeader: {
        success: false,
        resultCode: 'SIMULATION_006',
        resultMessage: '이력을 찾을 수 없습니다.',
      },
      dataBody: null,
    },
  },
})

/** 서버 대역. `remaining`을 실제로 줄여서 재조회가 줄어든 목록을 보게 한다. */
const serveHistories = (remaining: { ids: string[] }) =>
  vi
    .spyOn(api, 'fetchSimulationHistories')
    .mockImplementation(async (page = 0, size = PAGE_SIZE) =>
      ok({
        histories: remaining.ids
          .slice(page * size, page * size + size)
          .map(item),
        page,
        size,
        totalElements: remaining.ids.length,
        totalPages: Math.ceil(remaining.ids.length / size),
      }),
    )

const renderPage = () => {
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

  return render(createElement(ProfileSimulationBookmarksPage), { wrapper })
}

/** 2페이지로 이동한다. 목록은 1-based 라벨을 쓰고 상태는 0부터다. */
const goToSecondPage = async () => {
  const next = await screen.findByLabelText('다음 페이지')
  next.click()
  await waitFor(() => expect(screen.getByText('2 / 2')).toBeTruthy())
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ProfileSimulationBookmarksPage — 뒷페이지가 비는 경로', () => {
  it('삭제가 404 로 실패해 페이지가 비어도 목록으로 돌아온다', async () => {
    // 11건 → 2페이지에 1건. 다른 기기에서 그 항목을 먼저 지운 상황.
    const remaining = { ids: Array.from({ length: 11 }, (_, i) => `h${i}`) }
    serveHistories(remaining)
    vi.spyOn(api, 'deleteSimulationHistory').mockImplementation(async () => {
      remaining.ids = remaining.ids.slice(0, 10) // 서버에는 이미 없다
      throw notFound()
    })

    renderPage()
    await goToSecondPage()

    const remove = screen.getAllByLabelText(/저장 기록 삭제$/)
    expect(remove).toHaveLength(1)
    remove[0].click()

    // 재시도를 권하지 않고 이미 없어진 항목으로 안내한다.
    await waitFor(() =>
      expect(screen.getByText(/이미 삭제된 기록/)).toBeTruthy(),
    )
    // 그리고 1페이지로 되돌아와 남은 10건을 보여준다 — 여기 갇히지 않는다.
    await waitFor(() =>
      expect(screen.getAllByLabelText(/저장 기록 삭제$/)).toHaveLength(10),
    )
    expect(screen.queryByText('아직 저장한 결과가 없어요')).toBeNull()
  })

  it('두 카드를 잇달아 눌러 페이지가 통째로 비어도 목록으로 돌아온다', async () => {
    // 12건 → 2페이지에 2건. 카드별로 잠기므로 두 건을 함께 지를 수 있다.
    const remaining = { ids: Array.from({ length: 12 }, (_, i) => `h${i}`) }
    serveHistories(remaining)
    vi.spyOn(api, 'deleteSimulationHistory').mockImplementation(
      async historyId => {
        remaining.ids = remaining.ids.filter(id => id !== historyId)
        return {
          dataHeader: { success: true, resultCode: null, resultMessage: null },
          dataBody: null,
        }
      },
    )

    renderPage()
    await goToSecondPage()

    const remove = screen.getAllByLabelText(/저장 기록 삭제$/)
    expect(remove).toHaveLength(2)
    remove[0].click()
    remove[1].click()

    await waitFor(() => expect(remaining.ids).toHaveLength(10))
    await waitFor(() =>
      expect(screen.getAllByLabelText(/저장 기록 삭제$/)).toHaveLength(10),
    )
    expect(screen.queryByText('아직 저장한 결과가 없어요')).toBeNull()
  })
})
