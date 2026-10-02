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

// 상세는 로딩에 머물게 둔다 — 머리(구 이름·순위 줄)는 로딩 중에도 그려진다.
const fetchStatusDetail = vi.hoisted(() =>
  vi.fn((districtCode: string, periodCode?: string) => {
    void districtCode
    void periodCode
    return new Promise(() => undefined)
  }),
)

vi.mock('@/lib/api/status', () => ({
  fetchStatusTopTen,
  fetchStatusDetail,
}))

/* 서버 카탈로그(`/periods`) — 기본 분기 20261. 드롭다운 범위와 최신 분기 판정에 쓴다(period-catalog.md). */
vi.mock('@/lib/api/analysis-period', () => ({
  fetchAnalysisPeriods: () =>
    Promise.resolve({
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: { defaultPeriodCode: '20261' },
    }),
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
      // 분기를 생략한 요청에도 서버가 실제로 조회한 분기를 싣는다(BE #464).
      currentPeriodCode: '20261',
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

// 404(데이터 부재)는 재시도하지 않아 바로 오류 화면이 뜬다.
const NOT_FOUND_MESSAGE = '해당 분기의 자치구 데이터가 없습니다.'
const notFoundResponse = () =>
  Promise.reject({
    response: {
      status: 404,
      data: {
        dataHeader: {
          success: false,
          resultCode: 'NOT_FOUND',
          resultMessage: NOT_FOUND_MESSAGE,
        },
        dataBody: null,
      },
    },
  })

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

/* 드롭다운은 카탈로그(범위)가 와야 열린다. */
const enabledPeriodSelects = async () => {
  const selects = await periodSelects()
  await waitFor(() => expect(selects.year.disabled).toBe(false))
  return selects
}

beforeEach(() => {
  state.fetch = okResponse
  state.push.mockReset()
  state.replace.mockReset()
  fetchStatusTopTen.mockClear()
  fetchStatusDetail.mockClear()
})

afterEach(cleanup)

describe('StatusPage 기준 분기', () => {
  /*
    「최신」은 분기를 생략해 보내 서버가 해석한다 — 카탈로그를 기다리는 폭포가 없다(period-catalog.md
    D3-3). select 는 응답이 알려 준 분기를 가리킨다.
  */
  it('분기 파라미터가 없으면 분기를 생략해 부르고 select 는 응답의 최신 분기다', async () => {
    renderPage('metric=footTraffic')

    await screen.findAllByText('유동인구 상위 10개 구')
    const { year, quarter } = await periodSelects()

    expect(fetchStatusTopTen).toHaveBeenCalledWith(undefined)
    expect(fetchStatusTopTen).not.toHaveBeenCalledWith('20261')
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

  /*
    최신보다 새 분기는 카탈로그가 온 뒤 최신으로 내린다(D5-1). URL 에 분기가 있으면 카탈로그를 기다리지
    않으므로 그 전에 한 번 나갈 수 있다 — 손편집·낡은 클라이언트만 겪는 드문 경로다.
  */
  it('서버 기본 분기보다 새 분기는 카탈로그가 오면 최신 분기로 내리고 URL 도 맞춘다', async () => {
    renderPage('metric=footTraffic&periodCode=20264')

    await waitFor(() => expect(fetchStatusTopTen).toHaveBeenCalledWith('20261'))
    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith(
        '/status?metric=footTraffic&periodCode=20261',
        { scroll: false },
      ),
    )
  })

  it('최신 분기를 고르면 URL 에서 분기를 지워 최신 링크로 둔다', async () => {
    renderPage('metric=sales&periodCode=20233')

    await screen.findAllByText('매출 상위 10개 구')
    const { year } = await enabledPeriodSelects()
    // 2023년 3분기에서 2026년으로 옮기면 1분기(그 연도의 마지막 분기)가 되고, 그것이 최신이다.
    fireEvent.change(year, { target: { value: '2026' } })

    expect(state.push).toHaveBeenCalledWith('/status?metric=sales', {
      scroll: false,
    })
  })

  it('분기를 바꾸면 지표·구를 유지한 채 push 한다', async () => {
    renderPage('metric=sales&district=11680')

    await screen.findAllByText('매출 상위 10개 구')
    const { year } = await enabledPeriodSelects()
    // 1분기를 보다가 2023년으로 옮기면 분기는 그대로 1분기다(range.clampQuarter).
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
    state.fetch = notFoundResponse

    renderPage('metric=footTraffic&periodCode=20241')

    expect(await screen.findByText(NOT_FOUND_MESSAGE)).toBeTruthy()
    const { year, quarter } = await periodSelects()

    expect(year.value).toBe('2024')
    expect(quarter.value).toBe('1')
  })

  it('상세도 URL 의 분기로 부른다', async () => {
    renderPage('metric=footTraffic&district=11680&periodCode=20233')

    await screen.findAllByText('강남구 상세')

    expect(fetchStatusDetail).toHaveBeenCalledWith('11680', '20233')
  })

  /*
   * 전환 중 Top10 은 직전 분기 응답이다. 상세 머리의 값·증감·순위도 그 응답에서 오므로
   * 새 분기 이름(「… 기준」) 옆에 옛 값이 그대로 보이면 안 된다 — 데스크톱·시트 둘 다.
   */
  it('분기를 바꾸는 동안 상세 머리의 값·순위를 aria-busy 로 둔다', async () => {
    const { navigate } = renderPage('metric=footTraffic&district=11680')

    await screen.findAllByText('강남구 상세')
    expect(
      document.querySelectorAll('[data-status-detail-rank][aria-busy="true"]'),
    ).toHaveLength(0)

    state.fetch = () => new Promise(() => undefined)
    navigate('metric=footTraffic&district=11680&periodCode=20233')

    expect(
      document.querySelectorAll('[data-status-detail-rank][aria-busy="true"]'),
    ).toHaveLength(2)
    expect(
      document.querySelectorAll(
        '[data-status-detail-metric][aria-busy="true"]',
      ),
    ).toHaveLength(2)
    // 선택 구 자체는 풀지 않는다 — 순위 항목을 null 로 만들지 않고 표시만 가린다.
    expect(screen.getAllByText('유동인구 1위', { exact: false })).toHaveLength(
      2,
    )
  })

  it('평소 화면에서 오류 화면으로 바뀌어도 분기 select 의 포커스가 남는다', async () => {
    const { navigate } = renderPage('metric=footTraffic')

    await screen.findAllByText('유동인구 상위 10개 구')
    const { year } = await periodSelects()
    year.focus()

    state.fetch = notFoundResponse
    navigate('metric=footTraffic&periodCode=20241')

    expect(await screen.findByText(NOT_FOUND_MESSAGE)).toBeTruthy()
    expect(screen.getByLabelText('기준 연도')).toBe(year)
    expect(document.activeElement).toBe(year)
  })

  it('오류 화면에서 평소 화면으로 돌아와도 분기 select 의 포커스가 남는다', async () => {
    state.fetch = notFoundResponse
    const { navigate } = renderPage('metric=footTraffic&periodCode=20241')

    expect(await screen.findByText(NOT_FOUND_MESSAGE)).toBeTruthy()
    const { year } = await periodSelects()
    year.focus()

    state.fetch = okResponse
    navigate('metric=footTraffic&periodCode=20233')

    await screen.findAllByText('유동인구 상위 10개 구')
    expect(screen.getByLabelText('기준 연도')).toBe(year)
    expect(document.activeElement).toBe(year)
  })
})
