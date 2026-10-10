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

import { districts } from '@/data/districts'
import type {
  DistrictRankingsResponse,
  DistrictRankingSummary,
} from '@/types/status'

/*
 * 순위 목록 25개 구 펼침의 배선(#565). 펼침은 `?list=all` 이 정본이라 상세를 열었다 돌아와도
 * 유지된다 — 그 연결은 페이지에서만 드러난다. 쿼리 조립은 status-state 가 순수 함수로 덮는다.
 */

const { state } = vi.hoisted(() => ({
  state: {
    search: '',
    push: vi.fn(),
    replace: vi.fn(),
  },
}))

// 서울 25개 구. 선택 정규화가 실제 구 코드만 받으므로 정적 표의 코드를 쓴다.
const seoulDistricts = districts.slice(0, 25)

const rankingsResponse = () =>
  Promise.resolve({
    dataHeader: { success: true, resultCode: null, resultMessage: null },
    dataBody: {
      currentPeriodCode: '20261',
      footTrafficRankings: seoulDistricts.map((district, index) => ({
        rank: index + 1,
        districtCode: String(district.gooCode),
        districtName: district.gooName,
        totalFootTraffic: 1_000 - index,
        footTrafficChangeRate: 1,
      })),
      salesRankings: [],
      openedStoreRankings: [],
      closedStoreRankings: [],
    } as unknown as DistrictRankingSummary,
  } as unknown as DistrictRankingsResponse)

vi.mock('@/lib/api/status', () => ({
  fetchStatusRankings: () => rankingsResponse(),
  // 상세는 로딩에 머물게 둔다 — 이 테스트는 목록만 본다.
  fetchStatusDetail: () => new Promise(() => undefined),
}))

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

// 데스크톱 열과 모바일 시트가 같은 목록을 DOM 에 함께 둔다(CSS 로 하나만 보인다). 첫 목록만 센다.
const firstListRowCount = () =>
  document
    .querySelector('[data-status-top-ten-panel] ol')
    ?.querySelectorAll('[data-district-code]').length ?? 0

const lastDistrict = seoulDistricts[24]

beforeEach(() => {
  state.push.mockReset()
  state.replace.mockReset()
})

afterEach(cleanup)

describe('StatusPage 순위 목록 펼침 (#565)', () => {
  it('접힌 목록은 10개이고 「전체 25개 구 보기」가 URL 에 펼침을 적는다(replace)', async () => {
    renderPage('metric=footTraffic')

    // ByRole 은 지도 폴리곤 50개가 있는 이 트리에서 느려 병렬 실행 때 시간을 넘긴다. 글자로 찾는다.
    const [expandButton] = await screen.findAllByText('전체 25개 구 보기', {
      selector: 'button',
    })
    expect(firstListRowCount()).toBe(10)

    fireEvent.click(expandButton)

    // 펼침은 화면 이동이 아니다 — 기록을 쌓지 않는다.
    expect(state.replace).toHaveBeenCalledWith(
      '/status?metric=footTraffic&list=all',
      { scroll: false },
    )
    expect(state.push).not.toHaveBeenCalled()
  })

  it('`?list=all` 로 들어오면 25개 구가 모두 목록에 있다', async () => {
    renderPage('metric=footTraffic&list=all')

    await screen.findAllByText('유동인구 전체 25개 구')
    expect(firstListRowCount()).toBe(25)
    expect(
      screen.getAllByText('상위 10개 구만 보기', { selector: 'button' })[0],
    ).toHaveProperty('ariaExpanded', 'true')
  })

  it('Top10 밖 구를 목록에서 고르면 펼침을 유지한 채 상세로 간다', async () => {
    renderPage('metric=footTraffic&list=all')

    await screen.findAllByText('유동인구 전체 25개 구')
    const row = document.querySelector<HTMLButtonElement>(
      `[data-status-top-ten-panel] [data-district-code="${lastDistrict.gooCode}"]`,
    )
    expect(row).not.toBeNull()

    fireEvent.click(row!)

    expect(state.push).toHaveBeenCalledWith(
      `/status?metric=footTraffic&list=all&district=${lastDistrict.gooCode}`,
      { scroll: false },
    )
  })

  it('상세에서 목록으로 돌아와도 25개 구가 펼쳐져 있다', async () => {
    const { navigate } = renderPage(
      `metric=footTraffic&list=all&district=${lastDistrict.gooCode}`,
    )

    await screen.findAllByText(`${lastDistrict.gooName} 상세`)

    // 뒤로가기 — 상세를 열기 전 기록(`list=all` 이 남아 있다)으로 돌아간다.
    navigate('metric=footTraffic&list=all')

    await waitFor(() => expect(firstListRowCount()).toBe(25))
    expect(screen.getAllByText('유동인구 전체 25개 구').length).toBeGreaterThan(
      0,
    )
  })

  it('「상위 10개 구만 보기」는 URL 에서 펼침을 지운다(replace)', async () => {
    renderPage('metric=footTraffic&list=all')

    const [collapseButton] = await screen.findAllByText('상위 10개 구만 보기', {
      selector: 'button',
    })
    fireEvent.click(collapseButton)

    expect(state.replace).toHaveBeenCalledWith('/status?metric=footTraffic', {
      scroll: false,
    })
    expect(state.push).not.toHaveBeenCalled()
  })

  it('`?list=abc` 는 접힌 목록으로 열고 URL 에서 지운다', async () => {
    renderPage('metric=footTraffic&list=abc')

    await screen.findAllByText('유동인구 상위 10개 구')
    expect(firstListRowCount()).toBe(10)
    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith('/status?metric=footTraffic', {
        scroll: false,
      }),
    )
  })
})

/*
 * #565 리뷰 — 펼친 목록의 20위대 구를 보다 상세에서 돌아오면, 목록이 맨 위로 튀어 그 행이 화면 밖에
 * 있었다. 데스크톱 열과 모바일 시트 모두 그 행을 보이게 스크롤해야 한다.
 *
 * jsdom 에는 레이아웃이 없어 `offsetParent` 가 늘 null 이다(데스크톱 열이 「숨김」으로 읽힌다).
 * 데스크톱 열이 보이는 상황을 흉내 내려고 이 묶음에서만 값을 채운다. `scrollIntoView` 도 jsdom 에 없다.
 */
describe('StatusPage 상세에서 돌아올 때 보던 행 (#565)', () => {
  const offsetParentDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetParent',
  )
  const scrolledRows: Element[] = []

  beforeEach(() => {
    scrolledRows.length = 0
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get() {
        return document.body
      },
    })
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolledRows.push(this)
    }
  })

  afterEach(() => {
    if (offsetParentDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'offsetParent',
        offsetParentDescriptor,
      )
    }
    // jsdom 에 원래 없던 메서드다 — 다른 테스트에 남기지 않는다.
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  })

  it('데스크톱 열과 시트 모두 방금 보던 25위 행을 보이게 스크롤한다', async () => {
    const { navigate } = renderPage(
      `metric=footTraffic&list=all&district=${lastDistrict.gooCode}`,
    )

    await screen.findAllByText(`${lastDistrict.gooName} 상세`)
    navigate('metric=footTraffic&list=all')

    const rowSelector = `[data-district-code="${lastDistrict.gooCode}"]`
    await waitFor(() =>
      expect(
        scrolledRows.some(row =>
          row.matches(`[data-status-top-ten-panel] ${rowSelector}`),
        ),
      ).toBe(true),
    )
    // 시트 쪽 목록 행(데스크톱 열 밖)도 스크롤했다.
    expect(
      scrolledRows.some(
        row =>
          row.matches(rowSelector) &&
          row.closest('[data-status-top-ten-panel]') === null,
      ),
    ).toBe(true)
  })
})
