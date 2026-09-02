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
import CommunityLocationPicker, {
  type CommunityLocationValue,
} from '@/components/community/community-location-picker'
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
  type CommunityListState,
  type CommunityListView as CommunityListViewMode,
  type CommunityViewer,
} from '@/lib/community/community-state'
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
  | CommunityPostListResponse
  | CommunityLikedPostsResponse

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

export const serializeCommunityListState = (state: CommunityListState) => {
  const params = new URLSearchParams()

  if (state.view !== 'latest') {
    params.set('view', state.view)
  }

  if (state.keyword) {
    params.set('keyword', state.keyword)
  } else if (state.targetType && state.targetCode) {
    params.set('targetType', state.targetType)
    params.set('targetCode', state.targetCode)
  }

  if (state.mock) {
    params.set('mock', '1')
  }

  return params
}

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

export const getCommunityBoardTargetName = (
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

  return state.targetCode
}

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
    getNextPageParam: lastPage => {
      if (!isCommunityListSuccess(lastPage)) {
        return undefined
      }

      return getCommunityNextPageParam(
        getCommunityPageSlice(lastPage, state.view),
        state.view,
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
    onNavigate: () => {
      try {
        const adjacent = createCommunityAdjacentState(
          posts,
          post.postId,
          contextKey,
        )

        if (adjacent) {
          saveAdjacentPosts(window.sessionStorage, adjacent)
        }
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
  const writeHref = state.mock
    ? '/community/register?mock=1'
    : hasHydrated && !viewer.authenticated
      ? getCommunityLoginHref('/community/register')
      : '/community/register'
  const locationValue: CommunityLocationValue = {
    targetType: state.targetType,
    targetCode: state.targetCode,
    targetName: boardTargetName,
  }

  const replaceAction = (action: CommunityListUrlAction) => {
    router.replace(createCommunityListActionHref(pathname, state, action), {
      scroll: false,
    })
  }

  const handleSearchSubmit = () => {
    replaceAction({ type: 'search', keyword: searchValue })
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
      emptyCause={emptyCause}
      errorMessage={errorMessage}
      hasNextPage={Boolean(listQuery.hasNextPage)}
      isFetchingNextPage={listQuery.isFetchingNextPage}
      keyword={state.keyword}
      loadMoreErrorMessage={loadMoreErrorMessage}
      locationPicker={
        <CommunityLocationPicker
          disabled={Boolean(state.keyword) || state.view === 'liked'}
          mockEnabled={state.mock}
          onChange={handleLocationChange}
          value={locationValue}
        />
      }
      onEmptyAction={handleEmptyAction}
      onLoadMore={() => {
        void listQuery.fetchNextPage()
      }}
      onRetry={() => {
        void listQuery.refetch()
      }}
      onRetryLoadMore={() => {
        void listQuery.fetchNextPage({ cancelRefetch: false })
      }}
      onSearchSubmit={handleSearchSubmit}
      onSearchValueChange={value => {
        setSearchDraft({ scope: state.keyword, value })
      }}
      onViewChange={handleViewChange}
      posts={viewPosts}
      searchValue={searchValue}
      searchWholeRegionNotice={Boolean(state.keyword)}
      status={status}
      view={state.view}
      writeHref={writeHref}
    />
  )
}
