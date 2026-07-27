import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { communityMockFixtures } from '@/lib/community/community-mock'
import {
  createCommunityContextKey,
  createCommunityPostHref,
  parseCommunityListState,
  type CommunityListState,
} from '@/lib/community/community-state'
import type {
  CommunityLikedPostsResponse,
  CommunityPostListResponse,
  CommunityPostSummary,
} from '@/types/community'

import {
  CommunityListQueryError,
  createCommunityAdjacentState,
  createCommunityListActionHref,
  createCommunityListQueryKey,
  createCommunityListRequest,
  getCommunityBoardTargetName,
  getCommunityLikedAccess,
  getCommunityListRenderState,
  isCommunityUnauthorizedError,
  recoverCommunityLikedUnauthorized,
  recoverCommunityPublicListUnauthorized,
  serializeCommunityListState,
  shouldRetryCommunityListQuery,
  startCommunityPublicListRecovery,
  validateCommunityListResponse,
} from './community-list-page'
import CommunityListView from './community-list-view'

const contextKey = createCommunityContextKey({
  view: 'latest',
  keyword: '',
  targetType: undefined,
  targetCode: undefined,
  mock: true,
})

const posts = [
  {
    ...communityMockFixtures.posts[6],
    href: createCommunityPostHref(
      communityMockFixtures.posts[6].postId,
      contextKey,
      true,
    ),
  },
  {
    ...communityMockFixtures.posts[0],
    href: createCommunityPostHref(
      communityMockFixtures.posts[0].postId,
      contextKey,
      true,
    ),
  },
]

const fixturePosts = structuredClone(
  communityMockFixtures.posts,
) as CommunityPostSummary[]
const successHeader = {
  success: true,
  resultCode: null,
  resultMessage: null,
}
const listResponse: CommunityPostListResponse = {
  dataHeader: successHeader,
  dataBody: {
    board: {
      targetType: fixturePosts[6]!.targetType,
      targetCode: fixturePosts[6]!.targetCode,
      targetName: fixturePosts[6]!.targetName,
    },
    posts: {
      contents: fixturePosts,
      hasNext: false,
    },
  },
}
const likedResponse: CommunityLikedPostsResponse = {
  dataHeader: successHeader,
  dataBody: {
    posts: {
      contents: fixturePosts.slice(0, 2).map((post, index) => ({
        ...post,
        likedAt: `2026-07-27T09:0${index}:00.000Z`,
      })),
      hasNext: false,
    },
  },
}
const failedListResponse: CommunityPostListResponse = {
  dataHeader: {
    success: false,
    resultCode: 'COMMUNITY_LIST_FAILED',
    resultMessage: '게시글 목록 요청이 거절됐어요.',
  },
  dataBody: {
    board: null,
    posts: {
      contents: [],
      hasNext: false,
    },
  },
}

const handlers = {
  onSearchValueChange: vi.fn(),
  onSearchSubmit: vi.fn(),
  onViewChange: vi.fn(),
  onEmptyAction: vi.fn(),
  onRetry: vi.fn(),
  onLoadMore: vi.fn(),
  onRetryLoadMore: vi.fn(),
}

const baseProps: ComponentProps<typeof CommunityListView> = {
  status: 'ready',
  errorMessage: null,
  loadMoreErrorMessage: null,
  emptyCause: 'general',
  posts,
  view: 'latest',
  keyword: '',
  searchValue: '',
  searchWholeRegionNotice: false,
  locationPicker: createElement(
    'div',
    { 'data-location-picker': true },
    '지역 선택',
  ),
  writeHref: '/community/register?mock=1',
  hasNextPage: true,
  isFetchingNextPage: false,
  ...handlers,
}

const renderWithStyles = (
  overrides: Partial<ComponentProps<typeof CommunityListView>> = {},
): { markup: string; styles: string } => {
  const sheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(
      sheet.collectStyles(
        createElement(CommunityListView, {
          ...baseProps,
          ...overrides,
        }),
      ),
    )

    return { markup, styles: sheet.getStyleTags() }
  } finally {
    sheet.seal()
  }
}

describe('CommunityListView', () => {
  it('renders the feed hero, search form, location slot, and latest/popular/liked tabs', () => {
    const { markup } = renderWithStyles()

    expect(markup).toContain('사장님들의 운영 이야기가 모이는 곳')
    expect(markup).toContain('<form')
    expect(markup).toContain('name="keyword"')
    expect(markup).toContain('>검색</button>')
    expect(markup).toContain('>최신</button>')
    expect(markup).toContain('>인기</button>')
    expect(markup).toContain('>좋아요한 글</button>')
    expect(markup).toContain('data-location-picker="true"')
    expect(markup).toContain('role="group"')
    expect(markup).toContain('aria-label="게시글 보기"')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).not.toContain('role="tablist"')
    expect(markup).not.toContain('role="tab"')
    expect(markup).toContain('aria-live="polite"')
  })

  it('renders one-column feed rows with a target or Seoul tag and only owner-friendly metadata', () => {
    const { markup } = renderWithStyles()

    expect(markup).toContain('강남역 상권')
    expect(markup).toContain('서울 전체')
    expect(markup).toContain('강남역 상권 테이크아웃 동선')
    expect(markup).toContain('첫 가게를 준비하며 배운 것들')
    expect(markup).toContain('점심 피크 시간의 대기열을 줄이기 위해')
    expect(markup.match(/사장님/g)?.length).toBeGreaterThanOrEqual(2)
    expect(markup).toContain('aria-label="좋아요 31"')
    expect(markup).toContain('aria-label="댓글 2"')
    expect(markup).not.toContain('이번 주 많이 본 게시글')
    expect(markup).not.toContain('카테고리')
    expect(markup).not.toContain('<img')
    expect(markup).not.toContain('프로필')
    expect(markup).not.toContain('조회')
    expect(markup).not.toContain('readCount')
  })

  it('renders encoded context and mock mode in target post links', () => {
    const { markup } = renderWithStyles()
    const expectedHref = posts[0].href.replaceAll('&', '&amp;')

    expect(expectedHref).toContain('from=%7B%22view%22%3A%22latest%22')
    expect(markup).toContain(`href="${expectedHref}"`)
    expect(markup).toContain('mock=1')
  })

  it('renders a desktop write link and a fixed mobile write action with accessible sizing', () => {
    const { markup, styles } = renderWithStyles()

    expect(markup).toContain('href="/community/register?mock=1"')
    expect(markup).toContain('data-desktop-write-action="true"')
    expect(markup).toContain('data-mobile-write-action="true"')
    expect(styles).toMatch(/@media \(max-width:\s*640px\)/)
    expect(styles).toContain('position:fixed')
    expect(styles).toMatch(/min-height:(44|48|50|52|56)px/)
    expect(styles).toContain('padding-bottom')
    expect(styles).toContain('var(--radius-pill)')
    expect(styles).not.toContain('border-radius:999px')
  })

  it('renders whole-region guidance while searching', () => {
    const { markup } = renderWithStyles({
      keyword: '점심',
      searchValue: '점심',
      searchWholeRegionNotice: true,
    })

    expect(markup).toContain('검색은 서울 전체 게시글에서 진행됩니다.')
  })

  it('renders loading and retryable error feedback', () => {
    const loading = renderWithStyles({ status: 'loading', posts: [] }).markup
    const error = renderWithStyles({
      status: 'error',
      posts: [],
      errorMessage: '네트워크 연결을 확인해 주세요.',
    }).markup

    expect(loading).toContain('aria-busy="true"')
    expect(loading).toContain('게시글을 불러오는 중이에요')
    expect(error).toContain('role="alert"')
    expect(error).toContain('네트워크 연결을 확인해 주세요.')
    expect(error).toContain('>다시 시도</button>')
  })

  it.each([
    ['keyword', '검색어 초기화'],
    ['target', '지역 필터 해제'],
    ['liked', '전체 글 보기'],
    ['general', '첫 게시글 작성'],
  ] as const)('renders the %s empty action', (emptyCause, actionLabel) => {
    const { markup } = renderWithStyles({
      status: 'empty',
      posts: [],
      emptyCause,
    })

    expect(markup).toContain(`>${actionLabel}</button>`)
  })

  it('renders an enabled load-more button and its accessible pending state', () => {
    const ready = renderWithStyles().markup
    const pending = renderWithStyles({ isFetchingNextPage: true }).markup

    expect(ready).toContain('>게시글 더 보기</button>')
    expect(ready).not.toContain('aria-busy="true"')
    expect(pending).toContain('aria-busy="true"')
    expect(pending).toContain('disabled=""')
    expect(pending).toContain('게시글을 더 불러오는 중')
  })

  it('keeps ready posts visible and renders an inline load-more retry', () => {
    const { markup } = renderWithStyles({
      loadMoreErrorMessage: '다음 게시글을 불러오지 못했어요.',
    })

    expect(markup).toContain('강남역 상권 테이크아웃 동선')
    expect(markup).toContain('data-load-more-error="true"')
    expect(markup).toContain('다음 게시글을 불러오지 못했어요.')
    expect(markup).toContain('>더 보기 다시 시도</button>')
    expect(markup).not.toContain('게시글 더 보기')
  })

  it('omits load-more when there is no next page', () => {
    const { markup } = renderWithStyles({ hasNextPage: false })

    expect(markup).not.toContain('게시글 더 보기')
  })
})

describe('community list container helpers', () => {
  const baseState: CommunityListState = {
    view: 'latest',
    keyword: '',
    targetType: undefined,
    targetCode: undefined,
    mock: false,
  }

  it('selects liked, search, and board requests with exact cursor params', () => {
    const cursor = { lastPostId: 7, lastLikeCount: 31 }

    expect(
      createCommunityListRequest({ ...baseState, view: 'liked' }, cursor),
    ).toEqual({
      mode: 'liked',
      params: {
        sortType: 'LATEST',
        orderType: 'DESC',
        lastPostId: 7,
        lastLikeCount: 31,
        size: 20,
      },
    })
    expect(
      createCommunityListRequest(
        { ...baseState, view: 'popular', keyword: '점심' },
        cursor,
      ),
    ).toEqual({
      mode: 'search',
      params: {
        sortType: 'POPULAR',
        orderType: 'DESC',
        lastPostId: 7,
        lastLikeCount: 31,
        size: 20,
        keyword: '점심',
      },
    })
    expect(
      createCommunityListRequest(
        {
          ...baseState,
          targetType: 'COMMERCIAL',
          targetCode: '3110008',
        },
        cursor,
      ),
    ).toEqual({
      mode: 'list',
      params: {
        sortType: 'LATEST',
        orderType: 'DESC',
        lastPostId: 7,
        lastLikeCount: 31,
        size: 20,
        targetType: 'COMMERCIAL',
        targetCode: '3110008',
      },
    })
  })

  it('resolves liked access and scopes protected query keys by member', () => {
    const likedState = { ...baseState, view: 'liked' as const }

    expect(getCommunityLikedAccess(likedState, false, false)).toBe('wait')
    expect(getCommunityLikedAccess(likedState, true, true)).toBe('query')
    expect(getCommunityLikedAccess(likedState, true, false)).toBe('redirect')
    expect(
      getCommunityLikedAccess({ ...likedState, mock: true }, true, true),
    ).toBe('none')
    expect(getCommunityLikedAccess(baseState, true, false)).toBe('none')

    const memberKey = createCommunityListQueryKey(likedState, {
      authenticated: true,
      memberId: '42',
    })
    const otherMemberKey = createCommunityListQueryKey(likedState, {
      authenticated: true,
      memberId: '84',
    })
    const mockKey = createCommunityListQueryKey(
      { ...likedState, mock: true },
      { authenticated: true, memberId: 'not-used' },
    )

    expect(memberKey).toContain('42')
    expect(otherMemberKey).toContain('84')
    expect(memberKey).not.toEqual(otherMemberKey)
    expect(mockKey).toContain('9001')
  })

  it('throws typed query errors for unsuccessful envelopes and returns successes', () => {
    expect(validateCommunityListResponse(listResponse)).toBe(listResponse)
    expect(() => validateCommunityListResponse(failedListResponse)).toThrow(
      CommunityListQueryError,
    )
    expect(() => validateCommunityListResponse(failedListResponse)).toThrow(
      '게시글 목록 요청이 거절됐어요.',
    )
  })

  it('classifies axios 401 and disables retry while bounding other retries', () => {
    const unauthorized = {
      isAxiosError: true,
      response: { status: 401 },
    }
    const networkError = new Error('network')

    expect(isCommunityUnauthorizedError(unauthorized)).toBe(true)
    expect(isCommunityUnauthorizedError(networkError)).toBe(false)
    expect(shouldRetryCommunityListQuery(0, unauthorized)).toBe(false)
    expect(shouldRetryCommunityListQuery(0, networkError)).toBe(true)
    expect(shouldRetryCommunityListQuery(1, networkError)).toBe(true)
    expect(shouldRetryCommunityListQuery(2, networkError)).toBe(false)
  })

  it('transitions an authenticated actual liked view to redirect on 401', () => {
    const likedState = { ...baseState, view: 'liked' as const }
    const unauthorized = {
      isAxiosError: true,
      response: { status: 401 },
    }

    expect(getCommunityLikedAccess(likedState, true, true)).toBe('query')
    expect(getCommunityLikedAccess(likedState, true, true, unauthorized)).toBe(
      'redirect',
    )
    expect(
      getCommunityLikedAccess(
        { ...likedState, mock: true },
        true,
        true,
        unauthorized,
      ),
    ).toBe('none')
  })

  it('removes only the failed member liked query before clearing and navigating', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const likedState = { ...baseState, view: 'liked' as const }
    const failedKey = createCommunityListQueryKey(likedState, {
      authenticated: true,
      memberId: '42',
    })
    const otherKey = createCommunityListQueryKey(likedState, {
      authenticated: true,
      memberId: '84',
    })
    const unauthorized = Object.assign(new Error('unauthorized'), {
      isAxiosError: true,
      response: { status: 401 },
    })
    const cachedData = { pages: [likedResponse], pageParams: [] }

    queryClient.setQueryData(failedKey, cachedData)
    queryClient.setQueryData(otherKey, cachedData)
    await expect(
      queryClient.fetchQuery({
        queryKey: failedKey,
        queryFn: async () => {
          throw unauthorized
        },
        retry: false,
      }),
    ).rejects.toBe(unauthorized)

    const failedQuery = queryClient
      .getQueryCache()
      .find({ queryKey: failedKey, exact: true })
    expect(failedQuery?.state.data).toEqual(cachedData)
    expect(failedQuery?.state.error).toBe(unauthorized)

    const clearSession = vi.fn()
    const navigate = vi.fn()

    await recoverCommunityLikedUnauthorized({
      queryClient,
      queryKey: failedKey,
      clearSession,
      navigate,
      loginHref: '/login?redirect=liked',
    })

    expect(
      queryClient.getQueryCache().find({ queryKey: failedKey, exact: true }),
    ).toBeUndefined()
    expect(
      queryClient.getQueryCache().find({ queryKey: otherKey, exact: true }),
    ).toBeDefined()
    expect(clearSession).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/login?redirect=liked')

    queryClient.clear()
  })

  it('keeps a public list query cached while cancelling and retrying it anonymously', async () => {
    const queryClient = new QueryClient()
    const publicKey = createCommunityListQueryKey(baseState, {
      authenticated: true,
      memberId: '42',
    })
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries')
    const removeSpy = vi.spyOn(queryClient, 'removeQueries')
    const clearSession = vi.fn()
    const refetch = vi.fn(async () => {})

    queryClient.setQueryData(publicKey, {
      pages: [listResponse],
      pageParams: [],
    })

    await recoverCommunityPublicListUnauthorized({
      queryClient,
      queryKey: publicKey,
      clearSession,
      refetch,
    })

    expect(cancelSpy).toHaveBeenCalledWith({
      queryKey: publicKey,
      exact: true,
    })
    expect(removeSpy).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(publicKey)).toBeDefined()
    expect(clearSession).toHaveBeenCalledOnce()
    expect(refetch).toHaveBeenCalledOnce()
    expect(cancelSpy.mock.invocationCallOrder[0]).toBeLessThan(
      clearSession.mock.invocationCallOrder[0]!,
    )
    expect(clearSession.mock.invocationCallOrder[0]).toBeLessThan(
      refetch.mock.invocationCallOrder[0]!,
    )
  })

  it('retries a public list 401 only once per list scope while allowing a new scope', async () => {
    const recovery = vi.fn(async () => {})
    const recoveryRef = {
      scope: null as string | null,
      attempted: false,
      current: null as Promise<void> | null,
    }

    const first = startCommunityPublicListRecovery(
      recoveryRef,
      'latest',
      recovery,
    )
    const concurrent = startCommunityPublicListRecovery(
      recoveryRef,
      'latest',
      recovery,
    )
    await first
    const repeated = startCommunityPublicListRecovery(
      recoveryRef,
      'latest',
      recovery,
    )

    expect(concurrent).toBe(first)
    expect(repeated).toBeNull()
    expect(recovery).toHaveBeenCalledOnce()

    await startCommunityPublicListRecovery(recoveryRef, 'popular', recovery)
    expect(recovery).toHaveBeenCalledTimes(2)
  })

  it('separates initial failures from fetch-next failures with existing posts', () => {
    expect(
      getCommunityListRenderState({
        waitingForAccess: false,
        isInitialLoading: false,
        postsLength: 0,
        error: new Error('첫 목록 실패'),
        isFetchNextPageError: false,
      }),
    ).toEqual({
      status: 'error',
      errorMessage: '첫 목록 실패',
      loadMoreErrorMessage: null,
    })
    expect(
      getCommunityListRenderState({
        waitingForAccess: false,
        isInitialLoading: false,
        postsLength: 2,
        error: new Error('다음 목록 실패'),
        isFetchNextPageError: true,
      }),
    ).toEqual({
      status: 'ready',
      errorMessage: null,
      loadMoreErrorMessage: '다음 목록 실패',
    })
  })

  it('serializes only normalized state and drops legacy or conflicting params', () => {
    const parsedLegacy = parseCommunityListState(
      new URLSearchParams(
        'view=popular&category=STARTUP&targetType=DISTRICT&mock=1',
      ),
    )
    const parsedConflict = parseCommunityListState(
      new URLSearchParams(
        'keyword=%20%EC%A0%90%EC%8B%AC%20&targetType=DISTRICT&targetCode=11680&mock=1',
      ),
    )

    expect(serializeCommunityListState(parsedLegacy).toString()).toBe(
      'view=popular&mock=1',
    )
    expect(serializeCommunityListState(parsedConflict).toString()).toBe(
      'keyword=%EC%A0%90%EC%8B%AC&mock=1',
    )
  })

  it('creates canonical search, location, and tab URLs from normalized state', () => {
    const likedMock = {
      ...baseState,
      view: 'liked' as const,
      mock: true,
    }

    expect(
      createCommunityListActionHref('/community/list', likedMock, {
        type: 'search',
        keyword: '  점심  ',
      }),
    ).toBe('/community/list?keyword=%EC%A0%90%EC%8B%AC&mock=1')
    expect(
      createCommunityListActionHref('/community/list', likedMock, {
        type: 'location',
        value: {
          targetType: 'COMMERCIAL',
          targetCode: '3110008',
        },
      }),
    ).toBe('/community/list?targetType=COMMERCIAL&targetCode=3110008&mock=1')
    expect(
      createCommunityListActionHref(
        '/community/list',
        { ...baseState, view: 'popular', keyword: '점심', mock: true },
        { type: 'view', view: 'liked' },
      ),
    ).toBe('/community/list?view=liked&mock=1')
    expect(
      createCommunityListActionHref(
        '/community/list',
        { ...baseState, keyword: '점심', mock: true },
        { type: 'view', view: 'popular' },
      ),
    ).toBe('/community/list?view=popular&keyword=%EC%A0%90%EC%8B%AC&mock=1')
  })

  it('extracts the board target name and falls back to the normalized code', () => {
    const targetState: CommunityListState = {
      ...baseState,
      targetType: 'COMMERCIAL',
      targetCode: '3110008',
    }

    expect(getCommunityBoardTargetName([listResponse], targetState)).toBe(
      '강남역 상권',
    )
    expect(getCommunityBoardTargetName([], targetState)).toBe('3110008')
    expect(
      getCommunityBoardTargetName([likedResponse], {
        ...baseState,
        view: 'liked',
      }),
    ).toBeUndefined()
  })

  it('computes adjacent state for the first, middle, and last fixture post', () => {
    const currentPosts = fixturePosts.slice(0, 3)
    const first = createCommunityAdjacentState(
      currentPosts,
      currentPosts[0]!.postId,
      contextKey,
    )
    const middle = createCommunityAdjacentState(
      currentPosts,
      currentPosts[1]!.postId,
      contextKey,
    )
    const last = createCommunityAdjacentState(
      currentPosts,
      currentPosts[2]!.postId,
      contextKey,
    )

    expect(first).toMatchObject({
      currentPostId: currentPosts[0]!.postId,
      previous: null,
      next: {
        postId: currentPosts[1]!.postId,
        title: currentPosts[1]!.title,
      },
    })
    expect(middle).toMatchObject({
      currentPostId: currentPosts[1]!.postId,
      previous: {
        postId: currentPosts[0]!.postId,
        title: currentPosts[0]!.title,
      },
      next: {
        postId: currentPosts[2]!.postId,
        title: currentPosts[2]!.title,
      },
    })
    expect(last).toMatchObject({
      currentPostId: currentPosts[2]!.postId,
      previous: {
        postId: currentPosts[1]!.postId,
        title: currentPosts[1]!.title,
      },
      next: null,
    })
  })
})
