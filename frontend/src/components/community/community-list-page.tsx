'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  useInfiniteQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import CommunityListView, {
  type CommunityEmptyCause,
  type CommunityListStatus,
  type CommunityListViewPost,
} from '@/components/community/community-list-view'
import type { CommunityLocationValue } from '@/lib/community/community-location'
import { createCommunityListWriteHref } from '@/lib/community/editor-prefill'
import CommunityRegionSheet from '@/components/community/community-region-sheet'
import { useCommunityListScrollRestore } from '@/hooks/use-community-list-scroll-restore'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import {
  saveAdjacentPosts,
  type AdjacentPostState,
} from '@/lib/community/adjacent-posts'
import { realCommunitySource } from '@/lib/community/community-data-source'
import {
  communityMockSource,
  MOCK_COMMUNITY_MEMBER_ID,
} from '@/lib/community/community-mock'
import {
  COMMUNITY_CURSOR_START,
  communityKeys,
  createCommunityContextKey,
  createCommunityPostHref,
  getCommunityLoginHref,
  getCommunityNextPageParam,
  getCommunityPageSlice,
  parseCommunityListState,
  serializeCommunityListState,
  type CommunityListState,
  type CommunityListView as CommunityListViewMode,
  type CommunityViewer,
} from '@/lib/community/community-state'
import { saveCommunityListScroll } from '@/lib/community/list-scroll'
import { useAuthStore } from '@/stores/auth-store'
import type {
  CommunityId,
  CommunityCursorParams,
  CommunityLikedPostsBody,
  CommunityLikedPostsResponse,
  CommunityListParams,
  CommunityPostListBody,
  CommunityPostListResponse,
  CommunityPostSummary,
  CommunitySearchParams,
} from '@/types/community'

type CommunityListResponse =
  CommunityPostListResponse | CommunityLikedPostsResponse

const isCommunityListSuccess = (response: CommunityListResponse) =>
  isApiSuccess<CommunityPostListBody | CommunityLikedPostsBody>(response)

export class CommunityListQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CommunityListQueryError'
  }
}

export const validateCommunityListResponse = (
  response: CommunityListResponse,
) => {
  if (!isCommunityListSuccess(response)) {
    throw new CommunityListQueryError(getApiMessage(response))
  }

  return response
}

export const isCommunityUnauthorizedError = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 401

export const shouldRetryCommunityListQuery = (
  failureCount: number,
  error: unknown,
) => !isCommunityUnauthorizedError(error) && failureCount < 2

type RecoverCommunityLikedUnauthorizedOptions = {
  queryClient: QueryClient
  queryKey: QueryKey
  clearSession: () => void
  navigate: (href: string) => void
  loginHref: string
}

export const recoverCommunityLikedUnauthorized = async ({
  queryClient,
  queryKey,
  clearSession,
  navigate,
  loginHref,
}: RecoverCommunityLikedUnauthorizedOptions) => {
  await queryClient.cancelQueries({ queryKey, exact: true })
  queryClient.removeQueries({ queryKey, exact: true })
  clearSession()
  navigate(loginHref)
}

type RecoverCommunityPublicListUnauthorizedOptions = {
  queryClient: QueryClient
  queryKey: QueryKey
  clearSession: () => void
  refetch: () => Promise<unknown>
}

export const recoverCommunityPublicListUnauthorized = async ({
  queryClient,
  queryKey,
  clearSession,
  refetch,
}: RecoverCommunityPublicListUnauthorizedOptions) => {
  await queryClient.cancelQueries({ queryKey, exact: true })
  clearSession()
  await refetch()
}

type CommunityPublicListRecoveryRef = {
  scope: string | null
  attempted: boolean
  current: Promise<void> | null
}

export const startCommunityPublicListRecovery = (
  recoveryRef: CommunityPublicListRecoveryRef,
  scope: string,
  recover: () => Promise<void>,
) => {
  if (recoveryRef.scope !== scope) {
    recoveryRef.scope = scope
    recoveryRef.attempted = false
    recoveryRef.current = null
  }

  if (recoveryRef.attempted) {
    return recoveryRef.current
  }

  recoveryRef.attempted = true
  const recovery = recover()
  recoveryRef.current = recovery

  void recovery.then(
    () => {
      if (recoveryRef.scope === scope && recoveryRef.current === recovery) {
        recoveryRef.current = null
      }
    },
    () => {
      if (recoveryRef.scope === scope && recoveryRef.current === recovery) {
        recoveryRef.current = null
      }
    },
  )

  return recovery
}

const INITIAL_CURSOR = {
  lastPostId: COMMUNITY_CURSOR_START,
  lastLikeCount: 0,
}

/* 상세의 지역 칩도 같은 주소를 만들어야 해서 lib 로 옮겼다. 기존 import 를 위해 다시 내보낸다. */
export { serializeCommunityListState }

const createCommunityListHref = (
  pathname: string,
  state: CommunityListState,
) => {
  const params = serializeCommunityListState(state)
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

type CommunityListUrlAction =
  | { type: 'search'; keyword: string }
  | { type: 'view'; view: CommunityListViewMode }
  | { type: 'location'; value: CommunityLocationValue }

const applyCommunityListUrlAction = (
  state: CommunityListState,
  action: CommunityListUrlAction,
): CommunityListState => {
  if (action.type === 'search') {
    return {
      ...state,
      view: state.view === 'liked' ? 'latest' : state.view,
      keyword: action.keyword.trim(),
      targetType: undefined,
      targetCode: undefined,
    }
  }

  if (action.type === 'location') {
    const hasTarget = Boolean(
      action.value.targetType && action.value.targetCode,
    )

    return {
      ...state,
      view: state.view === 'liked' ? 'latest' : state.view,
      keyword: '',
      targetType: hasTarget ? action.value.targetType : undefined,
      targetCode: hasTarget ? action.value.targetCode : undefined,
    }
  }

  return {
    ...state,
    view: action.view,
    keyword: action.view === 'liked' ? '' : state.keyword,
    targetType: action.view === 'liked' ? undefined : state.targetType,
    targetCode: action.view === 'liked' ? undefined : state.targetCode,
  }
}

export const createCommunityListActionHref = (
  pathname: string,
  state: CommunityListState,
  action: CommunityListUrlAction,
) =>
  createCommunityListHref(pathname, applyCommunityListUrlAction(state, action))

export type CommunityListRequest =
  | { mode: 'liked'; params: CommunityCursorParams }
  | { mode: 'search'; params: CommunitySearchParams }
  | { mode: 'list'; params: CommunityListParams }

export const createCommunityListRequest = (
  state: CommunityListState,
  cursor: Pick<CommunityCursorParams, 'lastPostId' | 'lastLikeCount'>,
): CommunityListRequest => {
  const cursorParams: CommunityCursorParams = {
    sortType: state.view === 'popular' ? 'POPULAR' : 'LATEST',
    orderType: 'DESC',
    lastPostId: cursor.lastPostId,
    lastLikeCount: cursor.lastLikeCount,
    size: 20,
  }

  if (state.view === 'liked') {
    return { mode: 'liked', params: cursorParams }
  }

  if (state.keyword) {
    return {
      mode: 'search',
      params: { ...cursorParams, keyword: state.keyword },
    }
  }

  return {
    mode: 'list',
    params: {
      ...cursorParams,
      ...(state.targetType && state.targetCode
        ? {
            targetType: state.targetType,
            targetCode: state.targetCode,
          }
        : {}),
    },
  }
}

export type CommunityLikedAccess = 'wait' | 'query' | 'redirect' | 'none'

export const getCommunityLikedAccess = (
  state: CommunityListState,
  hasHydrated: boolean,
  authenticated: boolean,
  error?: unknown,
): CommunityLikedAccess => {
  if (state.view !== 'liked' || state.mock) {
    return 'none'
  }

  if (isCommunityUnauthorizedError(error)) {
    return 'redirect'
  }

  if (!hasHydrated) {
    return 'wait'
  }

  return authenticated ? 'query' : 'redirect'
}

type CommunityListRenderStateInput = {
  waitingForAccess: boolean
  isInitialLoading: boolean
  postsLength: number
  error: unknown
  isFetchNextPageError: boolean
}

export const getCommunityListRenderState = ({
  waitingForAccess,
  isInitialLoading,
  postsLength,
  error,
  isFetchNextPageError,
}: CommunityListRenderStateInput): {
  status: CommunityListStatus
  errorMessage: string | null
  loadMoreErrorMessage: string | null
} => {
  const message =
    error instanceof Error
      ? error.message
      : error
        ? '게시글을 불러오지 못했어요.'
        : null

  if (waitingForAccess || isInitialLoading) {
    return {
      status: 'loading',
      errorMessage: null,
      loadMoreErrorMessage: null,
    }
  }

  if (postsLength > 0) {
    return {
      status: 'ready',
      errorMessage: null,
      loadMoreErrorMessage: isFetchNextPageError && message ? message : null,
    }
  }

  if (message) {
    return {
      status: 'error',
      errorMessage: message,
      loadMoreErrorMessage: null,
    }
  }

  return {
    status: 'empty',
    errorMessage: null,
    loadMoreErrorMessage: null,
  }
}

export const createCommunityListQueryKey = (
  state: CommunityListState,
  viewer: CommunityViewer,
) => {
  const listKey = communityKeys.list(state)

  return state.view === 'liked'
    ? ([
        ...listKey,
        'member',
        state.mock ? String(MOCK_COMMUNITY_MEMBER_ID) : viewer.memberId,
      ] as const)
    : listKey
}

/**
 * 응답의 `board.targetName` 만 돌려준다. 목록 제목(`{이름} 이야기`)이 쓴다 — 응답 전·실패·
 * null 일 때 코드(`11200 이야기`)를 제목에 띄우지 않으려고 대체값을 두지 않는다.
 */
export const getCommunityBoardResponseName = (
  responses: CommunityListResponse[],
  state: CommunityListState,
) => {
  if (state.view === 'liked') {
    return undefined
  }

  for (const response of responses) {
    if (
      isCommunityListSuccess(response) &&
      'board' in response.dataBody &&
      response.dataBody.board?.targetName
    ) {
      return response.dataBody.board.targetName
    }
  }

  return undefined
}

/** 칩 라벨용. 이름을 아직 모르면 코드로 내려앉는다(칩은 비워 둘 수 없다). */
export const getCommunityBoardTargetName = (
  responses: CommunityListResponse[],
  state: CommunityListState,
) =>
  state.view === 'liked'
    ? undefined
    : (getCommunityBoardResponseName(responses, state) ?? state.targetCode)

export const createCommunityAdjacentState = (
  posts: CommunityPostSummary[],
  currentPostId: CommunityId,
  contextKey: string,
): AdjacentPostState | null => {
  const currentIndex = posts.findIndex(post => post.postId === currentPostId)

  if (currentIndex < 0) {
    return null
  }

  const previous = posts[currentIndex - 1]
  const next = posts[currentIndex + 1]

  return {
    currentPostId,
    contextKey,
    previous: previous
      ? { postId: previous.postId, title: previous.title }
      : null,
    next: next ? { postId: next.postId, title: next.title } : null,
  }
}

const dedupeCommunityPosts = (
  responses: CommunityListResponse[],
  state: CommunityListState,
) => {
  const seen = new Set<CommunityId>()

  return responses.flatMap(response => {
    if (!isCommunityListSuccess(response)) {
      return []
    }

    return getCommunityPageSlice(response, state.view).contents.filter(post => {
      if (seen.has(post.postId)) {
        return false
      }

      seen.add(post.postId)
      return true
    })
  })
}

export default function CommunityListPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rawSearchParams = searchParams.toString()
  const state = useMemo(
    () => parseCommunityListState(new URLSearchParams(rawSearchParams)),
    [rawSearchParams],
  )
  const hasHydrated = useAuthStore(auth => auth.hasHydrated)
  const isLoggedIn = useAuthStore(auth => auth.isLoggedIn)
  const memberInfo = useAuthStore(auth => auth.memberInfo)
  const clearSession = useAuthStore(auth => auth.clearSession)
  const memberId = memberInfo?.memberId
  const [searchDraft, setSearchDraft] = useState(() => ({
    scope: state.keyword,
    value: state.keyword,
  }))
  const searchValue =
    searchDraft.scope === state.keyword ? searchDraft.value : state.keyword
  const source = state.mock ? communityMockSource : realCommunitySource
  const viewer = useMemo<CommunityViewer>(
    () =>
      state.mock
        ? {
            authenticated: true,
            memberId: String(MOCK_COMMUNITY_MEMBER_ID),
          }
        : {
            authenticated: hasHydrated && isLoggedIn,
            memberId:
              hasHydrated && isLoggedIn && memberId ? String(memberId) : null,
          },
    [hasHydrated, isLoggedIn, memberId, state.mock],
  )
  const queryAccess = getCommunityLikedAccess(
    state,
    hasHydrated,
    viewer.authenticated,
  )
  const listQueryKey = useMemo(
    () => createCommunityListQueryKey(state, viewer),
    [state, viewer],
  )

  const listQuery = useInfiniteQuery<
    CommunityListResponse,
    Error,
    {
      pages: CommunityListResponse[]
      pageParams: Array<
        Pick<CommunityCursorParams, 'lastPostId' | 'lastLikeCount'>
      >
    },
    ReturnType<typeof createCommunityListQueryKey>,
    Pick<CommunityCursorParams, 'lastPostId' | 'lastLikeCount'>
  >({
    queryKey: listQueryKey,
    initialPageParam: INITIAL_CURSOR,
    enabled: queryAccess === 'none' || queryAccess === 'query',
    retry: shouldRetryCommunityListQuery,
    queryFn: async ({ pageParam }) => {
      const request = createCommunityListRequest(state, pageParam)
      let response: CommunityListResponse

      if (request.mode === 'liked') {
        response = await source.getLikedPosts(request.params)
      } else if (request.mode === 'search') {
        response = await source.searchPosts(request.params)
      } else {
        response = await source.getPosts(request.params)
      }

      return validateCommunityListResponse(response)
    },
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (!isCommunityListSuccess(lastPage)) {
        return undefined
      }

      return getCommunityNextPageParam(
        getCommunityPageSlice(lastPage, state.view),
        state.view,
        lastPageParam,
      )
    },
  })
  const likedAccess = getCommunityLikedAccess(
    state,
    hasHydrated,
    viewer.authenticated,
    listQuery.error,
  )
  const recoveryInFlightRef = useRef<Promise<void> | null>(null)
  const publicRecoveryRef = useRef<CommunityPublicListRecoveryRef>({
    scope: null,
    attempted: false,
    current: null,
  })

  useEffect(() => {
    if (
      state.mock ||
      state.view === 'liked' ||
      !isCommunityUnauthorizedError(listQuery.error)
    ) {
      return
    }

    const scope = JSON.stringify(listQueryKey)
    void startCommunityPublicListRecovery(
      publicRecoveryRef.current,
      scope,
      () =>
        recoverCommunityPublicListUnauthorized({
          queryClient,
          queryKey: listQueryKey,
          clearSession,
          refetch: async () => {
            await listQuery.refetch()
          },
        }),
    )
  }, [
    clearSession,
    listQuery,
    listQueryKey,
    queryClient,
    state.mock,
    state.view,
  ])

  useEffect(() => {
    if (recoveryInFlightRef.current) {
      return
    }

    if (likedAccess !== 'redirect') {
      return
    }

    const desiredHref = createCommunityListHref(pathname, state)
    const loginHref = getCommunityLoginHref(desiredHref)

    if (isCommunityUnauthorizedError(listQuery.error)) {
      const recovery = recoverCommunityLikedUnauthorized({
        queryClient,
        queryKey: listQueryKey,
        clearSession,
        navigate: href => {
          router.replace(href, { scroll: false })
        },
        loginHref,
      })
      recoveryInFlightRef.current = recovery
      void recovery.then(
        () => {
          if (recoveryInFlightRef.current === recovery) {
            recoveryInFlightRef.current = null
          }
        },
        () => {
          if (recoveryInFlightRef.current === recovery) {
            recoveryInFlightRef.current = null
          }
        },
      )
      return
    }

    router.replace(loginHref, { scroll: false })
  }, [
    clearSession,
    likedAccess,
    listQuery.error,
    listQueryKey,
    pathname,
    queryClient,
    router,
    state,
  ])

  const responses = listQuery.data?.pages ?? []
  const posts = dedupeCommunityPosts(responses, state)
  const contextKey = createCommunityContextKey(state)
  const boardTargetName = getCommunityBoardTargetName(responses, state)

  const viewPosts: CommunityListViewPost[] = posts.map(post => ({
    ...post,
    href: createCommunityPostHref(post.postId, contextKey, state.mock),
    onNavigate: event => {
      try {
        const adjacent = createCommunityAdjacentState(
          posts,
          post.postId,
          contextKey,
        )

        if (adjacent) {
          saveAdjacentPosts(window.sessionStorage, adjacent)
        }

        // 뒤로 돌아오면 이 행을 같은 화면 높이에 다시 둔다(CM-030).
        saveCommunityListScroll(window.sessionStorage, {
          contextKey,
          postId: post.postId,
          rowOffset: event.currentTarget.getBoundingClientRect().top,
          savedAt: Date.now(),
        })
      } catch {
        // Storage availability must never prevent the native link navigation.
      }
    },
  }))

  const isWaitingForLikedAuth =
    likedAccess === 'wait' || likedAccess === 'redirect'
  const { status, errorMessage, loadMoreErrorMessage } =
    getCommunityListRenderState({
      waitingForAccess: isWaitingForLikedAuth,
      isInitialLoading: listQuery.isLoading,
      postsLength: posts.length,
      error: listQuery.error,
      isFetchNextPageError: listQuery.isFetchNextPageError,
    })
  const emptyCause: CommunityEmptyCause = state.keyword
    ? 'keyword'
    : state.targetType && state.targetCode
      ? 'target'
      : state.view === 'liked'
        ? 'liked'
        : 'general'
  useCommunityListScrollRestore({ contextKey, status })
  const hasTarget = Boolean(state.targetType && state.targetCode)
  // 검색은 서울 전체에서 하고(S4 계약) 좋아요한 글은 필터를 함께 푼다(CM-005).
  // 그 둘에서는 칩을 끄고, 칩이 「서울 전체」로 지금 범위를 말한다.
  const locationDisabled = Boolean(state.keyword) || state.view === 'liked'
  // 글쓰기는 보던 대상으로 지역 칩을 채워 연다(CM-031).
  const writeHref = createCommunityListWriteHref({
    state,
    boardTargetName: getCommunityBoardResponseName(responses, state),
    guest: hasHydrated && !viewer.authenticated,
  })
  const locationValue: CommunityLocationValue =
    hasTarget && !locationDisabled
      ? {
          targetType: state.targetType,
          targetCode: state.targetCode,
          targetName: boardTargetName,
        }
      : {}
  const targetTitle = hasTarget
    ? (getCommunityBoardResponseName(responses, state) ?? null)
    : null
  const allPostsHref = hasTarget
    ? createCommunityListActionHref(pathname, state, {
        type: 'location',
        value: {},
      })
    : null

  const replaceAction = (action: CommunityListUrlAction) => {
    router.replace(createCommunityListActionHref(pathname, state, action), {
      scroll: false,
    })
  }

  const handleSearchSubmit = () => {
    replaceAction({ type: 'search', keyword: searchValue })
  }

  const handleSearchClear = () => {
    setSearchDraft({ scope: state.keyword, value: '' })

    if (state.keyword) {
      replaceAction({ type: 'search', keyword: '' })
    }
  }

  const handleViewChange = (nextView: CommunityListViewMode) => {
    replaceAction({ type: 'view', view: nextView })
  }

  const handleLocationChange = (value: CommunityLocationValue) => {
    replaceAction({ type: 'location', value })
  }

  const handleEmptyAction = () => {
    if (emptyCause === 'keyword') {
      setSearchDraft({ scope: state.keyword, value: '' })
      replaceAction({ type: 'search', keyword: '' })
      return
    }

    if (emptyCause === 'target') {
      replaceAction({ type: 'location', value: {} })
      return
    }

    if (emptyCause === 'liked') {
      handleViewChange('latest')
      return
    }

    router.push(writeHref)
  }

  return (
    <CommunityListView
      allPostsHref={allPostsHref}
      boardTargetName={targetTitle}
      emptyCause={emptyCause}
      errorMessage={errorMessage}
      hasNextPage={Boolean(listQuery.hasNextPage)}
      isFetchingNextPage={listQuery.isFetchingNextPage}
      isFetching={listQuery.isFetching}
      keyword={state.keyword}
      loadMoreErrorMessage={loadMoreErrorMessage}
      locationPicker={
        <CommunityRegionSheet
          disabled={locationDisabled}
          mockEnabled={state.mock}
          onChange={handleLocationChange}
          value={locationValue}
        />
      }
      onEmptyAction={handleEmptyAction}
      onLoadMore={() => {
        // 감시 요소가 같은 순간 두 번 알려도 진행 중 요청을 취소·재시작하지 않는다.
        void listQuery.fetchNextPage({ cancelRefetch: false })
      }}
      onRetry={() => {
        void listQuery.refetch()
      }}
      onRetryLoadMore={() => {
        void listQuery.fetchNextPage({ cancelRefetch: false })
      }}
      onSearchClear={handleSearchClear}
      onSearchSubmit={handleSearchSubmit}
      onSearchValueChange={value => {
        setSearchDraft({ scope: state.keyword, value })
      }}
      onViewChange={handleViewChange}
      posts={viewPosts}
      searchValue={searchValue}
      status={status}
      view={state.view}
      writeHref={writeHref}
    />
  )
}
