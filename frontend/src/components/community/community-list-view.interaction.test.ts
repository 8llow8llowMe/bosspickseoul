// @vitest-environment jsdom
import { createElement, type ComponentProps } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CommunityListView from '@/components/community/community-list-view'
import { COMMUNITY_HEADER_HIDDEN_ATTRIBUTE } from '@/lib/community/hidden-header'

/*
  목록 숨는 헤더(community.md §S4 「숨는 헤더」, CM-043)를 목록 뷰 전체로 잠근다.
  방향 판정은 FAB 접힘(lib/community/write-fab.ts)과 같은 값이다 — 여기서는 그 값이 <html> 속성으로
  이어지는지, <480 에서만 켜지는지, 목록이 사라질 때 지워지는지를 본다.
*/

let frames: Array<FrameRequestCallback | null> = []

const flushFrames = () => {
  const pending = frames
  frames = []
  act(() => {
    pending.forEach(callback => callback?.(0))
  })
}

const scrollTo = (y: number) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y })
  window.dispatchEvent(new Event('scroll'))
  flushFrames()
}

const stubViewport = (width: number) => {
  window.matchMedia = ((query: string) => {
    const max = query.match(/max-width:\s*(\d+)px/)
    const min = query.match(/min-width:\s*(\d+)px/)
    const matches = max
      ? width <= Number(max[1])
      : min
        ? width >= Number(min[1])
        : false

    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }
  }) as unknown as typeof window.matchMedia
}

const noop = () => {}

const props: ComponentProps<typeof CommunityListView> = {
  status: 'ready',
  errorMessage: null,
  loadMoreErrorMessage: null,
  emptyCause: 'general',
  posts: [],
  view: 'latest',
  keyword: '',
  searchValue: '',
  boardTargetName: null,
  allPostsHref: null,
  locationPicker: null,
  writeHref: '/community/register',
  hasNextPage: false,
  isFetchingNextPage: false,
  isFetching: false,
  onSearchValueChange: noop,
  onSearchSubmit: noop,
  onSearchClear: noop,
  onViewChange: noop,
  onEmptyAction: noop,
  onRetry: noop,
  onLoadMore: noop,
  onRetryLoadMore: noop,
}

const headerHidden = () =>
  document.documentElement.getAttribute(COMMUNITY_HEADER_HIDDEN_ATTRIBUTE)

beforeEach(() => {
  frames = []
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    }),
  )
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => {
      frames[id - 1] = null
    }),
  )
})

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute(COMMUNITY_HEADER_HIDDEN_ATTRIBUTE)
  vi.unstubAllGlobals()
})

describe('CommunityListView — 숨는 헤더', () => {
  it('hides the site header on scrolling down and brings it back on scrolling up (390)', () => {
    stubViewport(390)
    const { container } = render(createElement(CommunityListView, props))
    const fab = () =>
      container
        .querySelector('[data-mobile-write-action]')
        ?.getAttribute('data-collapsed')

    scrollTo(200)
    scrollTo(240)
    expect(headerHidden()).toBe('true')
    // FAB 접힘과 같은 신호다.
    expect(fab()).toBe('true')

    scrollTo(220)
    expect(headerHidden()).toBeNull()
    expect(fab()).toBe('false')

    scrollTo(300)
    expect(headerHidden()).toBe('true')

    // 맨 위 근처(80 미만)면 늘 돌아온다.
    scrollTo(40)
    expect(headerHidden()).toBeNull()
  })

  it('subscribes to scroll once for both the FAB and the header', () => {
    stubViewport(390)
    const addEventListener = vi.spyOn(window, 'addEventListener')

    render(createElement(CommunityListView, props))

    expect(
      addEventListener.mock.calls.filter(([type]) => type === 'scroll'),
    ).toHaveLength(1)
    addEventListener.mockRestore()
  })

  it('removes the attribute when the list unmounts while the header is hidden', () => {
    stubViewport(390)
    const { unmount } = render(createElement(CommunityListView, props))

    scrollTo(200)
    scrollTo(240)
    expect(headerHidden()).toBe('true')

    unmount()
    expect(headerHidden()).toBeNull()
  })

  it('never hides the header at 480 and wider', () => {
    stubViewport(1200)
    render(createElement(CommunityListView, props))

    scrollTo(200)
    scrollTo(400)
    scrollTo(800)
    expect(headerHidden()).toBeNull()
  })
})
