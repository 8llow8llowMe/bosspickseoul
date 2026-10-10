// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as recommendApi from '@/lib/api/recommend'
import ProfileRecommendBookmarksPage from './profile-recommend-bookmarks-page'

/*
  상권 카드는 누를 때 그 카드만 상위 코드를 역조회한 뒤 이동한다(#574). 리뷰(B16): 역조회가 끝나 이동이 시작된 뒤 잠금이
  풀려, 이동이 끝나기 전 연타가 역조회·이동을 한 번 더 일으켰다.
*/

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({ memberInfo: { memberId: 'member-1' } }),
}))

vi.mock('@/hooks/use-commercial-bookmarks', () => ({
  useCommercialBookmarks: () => ({
    bookmarks: [
      {
        bookmarkId: '10',
        targetType: 'COMMERCIAL',
        targetCode: '3110008',
        targetName: '역삼역',
        createdAt: '2026-07-24T10:00:00+09:00',
      },
      {
        bookmarkId: '11',
        targetType: 'COMMERCIAL',
        targetCode: '3110012',
        targetName: '선릉역',
        createdAt: '2026-07-24T10:00:00+09:00',
      },
    ],
    errorMessage: null,
    isError: false,
    isLoading: false,
    isFetching: false,
  }),
}))

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
  return render(createElement(ProfileRecommendBookmarksPage), { wrapper })
}

afterEach(() => {
  cleanup()
  push.mockReset()
  vi.restoreAllMocks()
})

describe('ProfileRecommendBookmarksPage — 상권 카드 열기', () => {
  it('역조회한 상위 코드로 업종 고르기 단계를 연다', async () => {
    vi.spyOn(recommendApi, 'fetchCommercialRegion').mockResolvedValue({
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: {
        commercialCode: '3110008',
        commercialName: '역삼역',
        districtCode: '11680',
        districtName: '강남구',
        administrationCode: '11680640',
        administrationName: '역삼1동',
      },
    })
    renderPage()

    fireEvent.click(
      screen.getByRole('button', { name: '역삼역 상권 분석 열기' }),
    )

    await waitFor(() =>
      expect(push).toHaveBeenCalledExactlyOnceWith(
        '/analysis?districtCode=11680&administrationCode=11680640&commercialCode=3110008',
      ),
    )
  })

  it('이동을 시작한 뒤에는 연타해도, 다른 카드를 눌러도 다시 이동하지 않는다', async () => {
    const fetchRegion = vi
      .spyOn(recommendApi, 'fetchCommercialRegion')
      .mockResolvedValue({
        dataHeader: { success: true, resultCode: null, resultMessage: null },
        dataBody: {
          commercialCode: '3110008',
          commercialName: '역삼역',
          districtCode: '11680',
          districtName: '강남구',
          administrationCode: '11680640',
          administrationName: '역삼1동',
        },
      })
    renderPage()

    const card = screen.getByRole('button', { name: '역삼역 상권 분석 열기' })
    fireEvent.click(card)
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1))

    fireEvent.click(card)
    fireEvent.click(
      screen.getByRole('button', { name: '선릉역 상권 분석 열기' }),
    )

    expect(fetchRegion).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledTimes(1)
    expect(screen.getByText('분석 화면을 여는 중이에요.')).toBeTruthy()
  })
})
