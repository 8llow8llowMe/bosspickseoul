// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  DistrictTopTenResponse,
  DistrictTopTenSummary,
} from '@/types/status'

/*
 * 분기 선택의 배선(status.md 1.6). 파싱·쿼리 조립은 status-state 가 순수 함수로 덮지만,
 * URL 의 분기가 **실제로 두 호출과 select 에 연결돼 있는지**는 페이지에서만 드러난다.
 */

const { state } = vi.hoisted(() => ({
  state: {
    search: '',
    fetch: (): Promise<unknown> => Promise.resolve(null),
    push: vi.fn(),
    replace: vi.fn(),
  },
}))

const fetchStatusTopTen = vi.hoisted(() =>
  vi.fn((periodCode?: string) => {
    void periodCode
    return state.fetch()
  }),
)

vi.mock('@/lib/api/status', () => ({
  fetchStatusTopTen,
  fetchStatusDetail: vi.fn(() => new Promise(() => undefined)),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/status',
  useRouter: () => ({ replace: state.replace, push: state.push }),
  useSearchParams: () => new URLSearchParams(state.search),
}))

import StatusPage from './status-page'

const okResponse = () =>
  Promise.resolve({
    dataHeader: { success: true, resultCode: null, resultMessage: null },
    dataBody: {
      footTrafficTopTenItems: [
        {
          districtCode: '11680',
          districtName: '강남구',
          totalFootTraffic: 100,
          footTrafficChangeRate: 1,
        },
      ],
      salesTopTenItems: [],
      openedStoreTopTenItems: [],
      closedStoreTopTenItems: [],
    } as unknown as DistrictTopTenSummary,
  } as unknown as DistrictTopTenResponse)

const renderPage = (search: string) => {
  state.search = search
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const tree = () =>
    createElement(QueryClientProvider, { client }, createElement(StatusPage))
  const view = render(tree())

  // URL 만 바뀐 순간을 흉내 낸다(useSearchParams 가 새 값을 읽는다).
  const navigate = (nextSearch: string) => {
    state.search = nextSearch
    view.rerender(tree())
  }

  return { navigate }
}

const periodSelects = async () => ({
  year: (await screen.findByLabelText('기준 연도')) as HTMLSelectElement,
  quarter: screen.getByLabelText('기준 분기') as HTMLSelectElement,
})

beforeEach(() => {
  state.fetch = okResponse
  state.push.mockReset()
  state.replace.mockReset()
  fetchStatusTopTen.mockClear()
})

afterEach(cleanup)

describe('StatusPage 기준 분기', () => {
  it('분기 파라미터가 없으면 최신 분기로 부르고 select 도 최신 분기다', async () => {
    renderPage('metric=footTraffic')

    await screen.findAllByText('유동인구 상위 10개 구')
    const { year, quarter } = await periodSelects()

    expect(fetchStatusTopTen).toHaveBeenCalledWith('20261')
    expect(year.value).toBe('2026')
    expect(quarter.value).toBe('1')
  })

  it('URL 의 분기로 부르고 select 가 그 분기를 가리킨다', async () => {
    renderPage('metric=footTraffic&periodCode=20233')

    await screen.findAllByText('유동인구 상위 10개 구')
    const { year, quarter } = await periodSelects()

    expect(fetchStatusTopTen).toHaveBeenCalledWith('20233')
    expect(year.value).toBe('2023')
    expect(quarter.value).toBe('3')
  })

  it('지원하지 않는 분기는 최신 분기로 폴백하고 URL 에서 지운다', async () => {
    renderPage('metric=footTraffic&periodCode=20264')

    await screen.findAllByText('유동인구 상위 10개 구')

    expect(fetchStatusTopTen).toHaveBeenCalledWith('20261')
    expect(fetchStatusTopTen).not.toHaveBeenCalledWith('20264')
    expect(state.replace).toHaveBeenCalledWith('/status?metric=footTraffic', {
      scroll: false,
    })
  })

  it('분기를 바꾸면 지표·구를 유지한 채 push 한다', async () => {
    renderPage('metric=sales&district=11680')

    await screen.findAllByText('매출 상위 10개 구')
    const { year } = await periodSelects()
    // 1분기를 보다가 2023년으로 옮기면 분기는 그대로 1분기다(clampQuarterToYear).
    fireEvent.change(year, { target: { value: '2023' } })

    expect(state.push).toHaveBeenCalledWith(
      '/status?metric=sales&district=11680&periodCode=20231',
      { scroll: false },
    )
  })

  it('분기를 바꾸는 동안 로딩 화면으로 바뀌지 않고 목록·지도를 aria-busy 로 둔다', async () => {
    const { navigate } = renderPage('metric=footTraffic')

    await screen.findAllByText('유동인구 상위 10개 구')
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()

    // 새 분기 응답이 오지 않은 채로 URL 만 바뀐 순간.
    state.fetch = () => new Promise(() => undefined)
    navigate('metric=footTraffic&periodCode=20233')

    expect(fetchStatusTopTen).toHaveBeenCalledWith('20233')
    expect(screen.getAllByText('유동인구 상위 10개 구').length).toBeGreaterThan(
      0,
    )
    expect(
      document.querySelector('[data-status-top-ten-panel][aria-busy="true"]'),
    ).not.toBeNull()
    expect(
      document.querySelector('[data-status-map-panel][aria-busy="true"]'),
    ).not.toBeNull()
    expect(
      (screen.getByLabelText('기준 연도') as HTMLSelectElement).value,
    ).toBe('2023')
  })

  it('그 분기 호출이 실패해도 분기 select 가 남는다', async () => {
    // 404(데이터 부재)는 재시도하지 않아 바로 오류 화면이 뜬다.
    state.fetch = () =>
      Promise.reject({
        response: {
          status: 404,
          data: {
            dataHeader: {
              success: false,
              resultCode: 'NOT_FOUND',
              resultMessage: '해당 분기의 자치구 데이터가 없습니다.',
            },
            dataBody: null,
          },
        },
      })

    renderPage('metric=footTraffic&periodCode=20241')

    expect(
      await screen.findByText('해당 분기의 자치구 데이터가 없습니다.'),
    ).toBeTruthy()
    const { year, quarter } = await periodSelects()

    expect(year.value).toBe('2024')
    expect(quarter.value).toBe('1')
  })
})
