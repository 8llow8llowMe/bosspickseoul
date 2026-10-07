// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CommunityListPage from '@/components/community/community-list-page'
import { communityMockSource } from '@/lib/community/community-mock'
import {
  COMMUNITY_RECENT_REGIONS_KEY,
  type CommunityRecentRegion,
} from '@/lib/community/recent-regions'
import type { CommunityListParams } from '@/types/community'

/*
  목록 넓은 화면(community.md §S4 「목록 3단」, CM-037~040)을 목록 페이지 전체로 잠근다.
  폭은 matchMedia 스텁으로 흉내 낸다. 데이터는 `?mock=1` 목 소스를 쓰고 getPosts 호출을 엿본다 —
  인기 글이 「같은 목록 API 를 한 번 더」 부르는지, <1080 에서 부르지 않는지가 핵심이다.
*/

const searchBox = vi.hoisted(() => ({ current: 'mock=1' }))
const replacedHrefs = vi.hoisted(() => [] as string[])

vi.mock('next/navigation', () => ({
  usePathname: () => '/community/list',
  useSearchParams: () => new URLSearchParams(searchBox.current),
  useRouter: () => ({
    push: () => undefined,
    replace: (href: string) => {
      replacedHrefs.push(href)
    },
    back: () => undefined,
  }),
}))

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

const renderPage = (width: number, search: string) => {
  stubViewport(width)
  searchBox.current = search
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(CommunityListPage),
    ),
  )
}

const popularCalls = (spy: ReturnType<typeof vi.spyOn>) =>
  (spy.mock.calls as Array<[CommunityListParams]>)
    .map(([params]) => params)
    .filter(params => params.size === 5)

/* 스파이를 걸기 전의 진짜 목 구현. 스파이 안에서 다시 부르면 자기 자신을 부른다. */
const realGetPosts = communityMockSource.getPosts.bind(communityMockSource)
let getPosts: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  getPosts = vi.spyOn(communityMockSource, 'getPosts')
})

afterEach(() => {
  replacedHrefs.length = 0
  cleanup()
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('CommunityListPage — 우 레일', () => {
  it('does not render the rail or ask for popular posts under 1080 (390)', async () => {
    const { container } = renderPage(390, 'mock=1')

    await waitFor(() => {
      expect(container.querySelector('[data-community-post-id]')).not.toBeNull()
    })

    expect(getPosts).toHaveBeenCalled()
    expect(popularCalls(getPosts)).toHaveLength(0)
    expect(
      (getPosts.mock.calls as Array<[CommunityListParams]>).every(
        ([params]) => params.sortType === 'LATEST' && params.size === 20,
      ),
    ).toBe(true)
    expect(container.querySelector('[data-community-list-rail]')).toBeNull()
    expect(container.querySelector('[data-community-list-nav]')).toBeNull()
  })

  it('asks for five popular posts of all Seoul and keeps the tab row at 1200', async () => {
    const { container } = renderPage(1200, 'mock=1')

    await waitFor(() => {
      expect(
        container.querySelector('[data-community-list-rail] ol'),
      ).not.toBeNull()
    })

    const [params] = popularCalls(getPosts)
    expect(params).toMatchObject({ sortType: 'POPULAR', size: 5 })
    expect(params).not.toHaveProperty('targetType')

    const rail = container.querySelector('[data-community-list-rail]')!
    expect(rail.textContent).toContain('인기 글')
    expect(rail.textContent).toContain('사장님들께 물어보세요')
    expect(rail.querySelector('a[href="/analysis"]')?.textContent).toContain(
      '상권 분석에서 찾아보기',
    )
    expect(rail.querySelectorAll('ol > li').length).toBeLessThanOrEqual(5)
    // 레일 글 링크는 보던 목록 맥락(from)과 mock 을 싣는다.
    expect(
      rail.querySelector('a[data-popular-post-id]')?.getAttribute('href'),
    ).toMatch(/^\/community\/\d+\?from=.+&mock=1$/)
    expect(container.querySelector('[data-community-list-nav]')).toBeNull()
    expect(
      container.querySelector('[data-community-list-layout="two"]'),
    ).not.toBeNull()
  })

  it('scopes the rail to a district board and links its analysis (CM-039)', async () => {
    const { container } = renderPage(
      1200,
      'mock=1&targetType=DISTRICT&targetCode=11680',
    )

    await waitFor(() => {
      expect(
        container.querySelector('[data-community-list-rail]')?.textContent,
      ).toContain('강남구 이번 주 인기 글')
    })

    expect(popularCalls(getPosts)[0]).toMatchObject({
      sortType: 'POPULAR',
      size: 5,
      targetType: 'DISTRICT',
      targetCode: '11680',
    })
    const rail = container.querySelector('[data-community-list-rail]')!
    expect(rail.textContent).toContain('강남구에 대해 물어보세요')
    expect(
      rail.querySelector('a[href="/analysis?districtCode=11680"]')?.textContent,
    ).toContain('강남구 상권 분석 보기')
  })

  it('uses all of Seoul for popular posts while searching', async () => {
    const { container } = renderPage(
      1200,
      'mock=1&keyword=%EC%A0%90%EC%8B%AC&targetType=DISTRICT&targetCode=11680',
    )

    await waitFor(() => {
      expect(
        container.querySelector('[data-community-list-rail]'),
      ).not.toBeNull()
    })
    await waitFor(() => {
      expect(popularCalls(getPosts)).toHaveLength(1)
    })

    expect(popularCalls(getPosts)[0]).not.toHaveProperty('targetType')
    expect(popularCalls(getPosts)[0]).not.toHaveProperty('keyword')
  })

  it('uses all of Seoul for popular posts in the liked view', async () => {
    renderPage(1200, 'mock=1&view=liked')

    await waitFor(() => {
      expect(popularCalls(getPosts)).toHaveLength(1)
    })

    expect(popularCalls(getPosts)[0]).toMatchObject({ sortType: 'POPULAR' })
    expect(popularCalls(getPosts)[0]).not.toHaveProperty('targetType')
  })

  it('silently hides the popular group when the request fails or is empty', async () => {
    for (const outcome of ['fail', 'empty'] as const) {
      getPosts.mockImplementation(async (params: CommunityListParams) => {
        if (params.size !== 5) {
          return realGetPosts(params)
        }

        if (outcome === 'fail') {
          throw new Error('인기 글 실패')
        }

        const response = await realGetPosts(params)
        return {
          ...response,
          dataBody: {
            ...response.dataBody,
            posts: { contents: [], hasNext: false },
          },
        }
      })

      const { container } = renderPage(1200, 'mock=1')

      await waitFor(() => {
        expect(popularCalls(getPosts).length).toBeGreaterThan(0)
      })
      await waitFor(() => {
        expect(
          container.querySelector('[data-community-post-id]'),
        ).not.toBeNull()
      })

      const rail = container.querySelector('[data-community-list-rail]')!
      expect(rail.querySelector('ol')).toBeNull()
      expect(rail.textContent).not.toContain('인기 글')
      expect(rail.querySelector('[role="alert"]')).toBeNull()
      expect(rail.textContent).not.toContain('다시 시도')
      expect(rail.textContent).toContain('사장님들께 물어보세요')

      cleanup()
      getPosts.mockClear()
    }
  })
})

/*
  인기 기간(#531). 피드는 주소의 기간으로 처음 쪽부터 받고, 레일은 피드 기간과 상관없이 이번 주다.
  칩을 누르면 주소만 바꾼다 — 다시 받는 것은 그 주소로 바뀐 상태(쿼리 키)가 맡는다.
*/
describe('CommunityListPage — 인기 기간', () => {
  const feedCalls = () =>
    (getPosts.mock.calls as Array<[CommunityListParams]>)
      .map(([params]) => params)
      .filter(params => params.size === 20)

  it('asks the feed for the URL period from the first cursor and keeps the rail on this week', async () => {
    const { container } = renderPage(1200, 'mock=1&view=popular&period=MONTH')

    await waitFor(() => {
      expect(
        container.querySelector('[data-community-list-rail] ol'),
      ).not.toBeNull()
    })

    expect(feedCalls()[0]).toMatchObject({
      sortType: 'POPULAR',
      period: 'MONTH',
      lastPostId: '0',
      lastLikeCount: 0,
    })
    expect(popularCalls(getPosts)[0]).toMatchObject({
      sortType: 'POPULAR',
      period: 'WEEK',
    })
    // 목 글 4 는 이번 주 밖 · 이번 달 안이다 — 이번 달 피드에는 있다.
    expect(
      container.querySelector('[data-community-post-id="4"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-community-list-rail]')?.textContent,
    ).toContain('이번 주 인기 글')

    const group = container.querySelector('[aria-label="인기 기간"]')!
    expect(group.querySelector('[aria-pressed="true"]')?.textContent).toBe(
      '이번 달',
    )
    fireEvent.click(
      [...group.querySelectorAll('button')].find(
        button => button.textContent === '전체 기간',
      )!,
    )
    expect(replacedHrefs).toEqual([
      '/community/list?view=popular&period=ALL&mock=1',
    ])
  })

  it('leaves this week out of the URL and the post written two weeks ago out of the feed', async () => {
    const { container } = renderPage(390, 'mock=1&view=popular')

    await waitFor(() => {
      expect(container.querySelector('[data-community-post-id]')).not.toBeNull()
    })

    expect(feedCalls()[0]).toMatchObject({
      sortType: 'POPULAR',
      period: 'WEEK',
    })
    expect(container.querySelector('[data-community-post-id="4"]')).toBeNull()
  })
})

describe('CommunityListPage — 좌 내비', () => {
  it('renders the left nav at 1440 and records the opened board as a recent region (CM-037·040)', async () => {
    const previous: CommunityRecentRegion = {
      targetType: 'DISTRICT',
      targetCode: '11440',
      targetName: '마포구',
    }
    window.localStorage.setItem(
      COMMUNITY_RECENT_REGIONS_KEY,
      JSON.stringify([previous]),
    )

    const { container } = renderPage(
      1440,
      'mock=1&targetType=DISTRICT&targetCode=11680',
    )

    await waitFor(() => {
      expect(
        container.querySelector('[data-community-list-nav]')?.textContent,
      ).toContain('최근 본 지역')
    })
    await waitFor(() => {
      expect(
        JSON.parse(window.localStorage.getItem(COMMUNITY_RECENT_REGIONS_KEY)!),
      ).toEqual([
        { targetType: 'DISTRICT', targetCode: '11680', targetName: '강남구' },
        previous,
      ])
    })

    const nav = container.querySelector('[data-community-list-nav]')!
    const currentOf = (value: string) =>
      [...nav.querySelectorAll(`a[aria-current="${value}"]`)].map(
        link => link.textContent,
      )
    // 「현재 페이지」는 연 지역 게시판 하나다. 보기는 그 안의 지금 상태다.
    expect(currentOf('page')).toEqual(['강남구'])
    expect(currentOf('true')).toEqual(['최신'])
    expect(
      nav.querySelector('a[href*="targetCode=11440"]')?.getAttribute('href'),
    ).toBe('/community/list?targetType=DISTRICT&targetCode=11440&mock=1')
    // 좋아요한 글은 필터를 함께 푼다(CM-005).
    expect(
      [...nav.querySelectorAll('a')]
        .find(link => link.textContent === '좋아요한 글')
        ?.getAttribute('href'),
    ).toBe('/community/list?view=liked&mock=1')
    expect(
      container.querySelector('[data-community-list-layout="three"]'),
    ).not.toBeNull()
  })

  it('does not render the left nav between 1080 and 1359', async () => {
    const { container } = renderPage(1300, 'mock=1')

    await waitFor(() => {
      expect(
        container.querySelector('[data-community-list-rail]'),
      ).not.toBeNull()
    })
    expect(container.querySelector('[data-community-list-nav]')).toBeNull()
  })
})

/*
  레일 인기 글 → 상세 → 뒤로(CM-030). 레일 링크는 피드 행이 아니라 누른 행이 없다 — 화면 안 첫 피드
  행을 기준으로 자리를 남겨야 돌아왔을 때 보던 화면에 선다. jsdom 은 배치를 계산하지 않으니 행
  위치는 문서 기준 top(행 높이 100) 을 정해 getBoundingClientRect 로 흉내 낸다.
*/
describe('CommunityListPage — 레일 인기 글에서 뒤로', () => {
  const ROW_HEIGHT = 100
  const rowDocumentTop = (index: number) => 200 + index * ROW_HEIGHT

  const stubRowBoxes = () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const rows = [...document.querySelectorAll('[data-community-post-id]')]
        const index = rows.indexOf(this)
        const top =
          index < 0 ? 0 : rowDocumentTop(index) - (window.scrollY ?? 0)
        return {
          top,
          bottom: index < 0 ? 0 : top + ROW_HEIGHT,
          left: 0,
          right: 0,
          width: 0,
          height: index < 0 ? 0 : ROW_HEIGHT,
          x: 0,
          y: top,
          toJSON: () => ({}),
        } as DOMRect
      },
    )
  }

  const setScrollY = (value: number) => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value })
  }

  const waitForRailAndRows = async (container: HTMLElement) => {
    await waitFor(() => {
      expect(
        container.querySelector(
          '[data-community-list-rail] a[data-popular-post-id]',
        ),
      ).not.toBeNull()
    })
  }

  afterEach(() => {
    setScrollY(0)
    window.sessionStorage.clear()
  })

  it('saves the first on-screen feed row and restores it after popstate', async () => {
    stubRowBoxes()
    const { container } = renderPage(1200, 'mock=1')
    await waitForRailAndRows(container)
    await waitFor(() => {
      expect(
        container.querySelectorAll('[data-community-post-id]').length,
      ).toBeGreaterThanOrEqual(5)
    })

    // 행 0~2 는 화면 위로 지나갔고 행 3 이 위쪽 50 이 잘린 채 화면 맨 위에 걸려 있다.
    setScrollY(550)
    const rows = [...container.querySelectorAll('[data-community-post-id]')]
    const anchorId = rows[3]!.getAttribute('data-community-post-id')
    const railLink = container.querySelector<HTMLAnchorElement>(
      '[data-community-list-rail] a[data-popular-post-id]',
    )!
    // jsdom 은 링크 이동을 구현하지 않는다 — 기본 동작만 막고 onClick 저장은 그대로 돈다.
    railLink.addEventListener('click', event => event.preventDefault())
    fireEvent.click(railLink)

    expect(
      JSON.parse(window.sessionStorage.getItem('community-list-scroll')!),
    ).toMatchObject({ postId: anchorId, rowOffset: -50 })

    // 상세로 갔다가(목록 언마운트) 브라우저 뒤로.
    cleanup()
    setScrollY(0)
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    window.dispatchEvent(new PopStateEvent('popstate'))
    const again = renderPage(1200, 'mock=1')

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({ top: 550, behavior: 'instant' })
    })
    expect(
      again.container
        .querySelectorAll('[data-community-post-id]')[3]
        ?.getAttribute('data-community-post-id'),
    ).toBe(anchorId)
    expect(window.sessionStorage.getItem('community-list-scroll')).toBeNull()
    vi.unstubAllGlobals()
  })

  it('drops an old snapshot when there is no feed row on screen', async () => {
    getPosts.mockImplementation(async (params: CommunityListParams) => {
      const response = await realGetPosts(params)

      if (params.size === 5) {
        return response
      }

      return {
        ...response,
        dataBody: {
          ...response.dataBody,
          posts: { contents: [], hasNext: false },
        },
      }
    })
    window.sessionStorage.setItem(
      'community-list-scroll',
      JSON.stringify({
        contextKey: 'old',
        postId: '1',
        rowOffset: 10,
        savedAt: Date.now(),
      }),
    )
    const { container } = renderPage(1200, 'mock=1')
    await waitForRailAndRows(container)
    expect(container.querySelector('[data-community-post-id]')).toBeNull()

    const railLink = container.querySelector<HTMLAnchorElement>(
      '[data-community-list-rail] a[data-popular-post-id]',
    )!
    railLink.addEventListener('click', event => event.preventDefault())
    fireEvent.click(railLink)

    expect(window.sessionStorage.getItem('community-list-scroll')).toBeNull()
  })
})
