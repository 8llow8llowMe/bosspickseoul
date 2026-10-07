'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import CommunityDetailView from '@/components/community/community-detail-view'
import { useCommunityViewerReady } from '@/hooks/use-community-viewer-ready'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { readAdjacentPosts } from '@/lib/community/adjacent-posts'
import { realCommunitySource } from '@/lib/community/community-data-source'
import {
  communityMockSource,
  MOCK_COMMUNITY_MEMBER_ID,
} from '@/lib/community/community-mock'
import {
  COMMUNITY_ANONYMOUS_VIEWER,
  COMMUNITY_CURSOR_START,
  communityKeys,
  getCommunityLoginHref,
  getCommunityViewerKey,
  isCommunityMockEnabled,
  isCommunityViewerReady,
  parseCommunityTargetType,
  type CommunityViewer,
} from '@/lib/community/community-state'
import {
  COMMUNITY_DEFAULT_POPULAR_PERIOD,
  parseCommunityPopularPeriod,
} from '@/lib/community/popular-period'
import { parseCommunityPostCategory } from '@/lib/community/post-category'
import { useAuthStore } from '@/stores/auth-store'
import type { ApiResponse } from '@/types/api'
import type {
  CommunityId,
  CommunityCommentLikeBody,
  CommunityCommentsResponse,
  CommunityListParams,
  CommunityPostDetail,
  CommunityPostDetailResponse,
  CommunityPostLikeResponse,
  CommunityPostListResponse,
  CommunityReportCreateRequest,
} from '@/types/community'

export class CommunityDetailQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CommunityDetailQueryError'
  }
}

const validateCommunityResponse = <Response extends ApiResponse<unknown>>(
  response: Response,
) => {
  if (!isApiSuccess(response)) {
    throw new CommunityDetailQueryError(getApiMessage(response))
  }

  return response
}

export const validateCommunityDetailResponse = (
  response: CommunityPostDetailResponse,
) => validateCommunityResponse(response)

export const validateCommunityCommentsResponse = (
  response: CommunityCommentsResponse,
) => validateCommunityResponse(response)

export const validateCommunityRelatedResponse = (
  response: CommunityPostListResponse,
) => validateCommunityResponse(response)

/**
 * 내가 쓴 글/댓글인가.
 *
 * `memberId` 는 이제 문자열이라 그대로 비교한다. 예전에는 숫자(그것도 Snowflake 가
 * 절삭된 값)를 `String(...)` 으로 되돌려 세션의 온전한 id 와 맞췄는데, 절삭된 쪽이
 * 복원될 리가 없어 **본인 글에서도 항상 false** 였다 — 수정·삭제 버튼이 뜨지 않았다.
 */
export const isCommunityOwner = (
  memberId: CommunityId,
  viewer: CommunityViewer,
) => viewer.authenticated && memberId === viewer.memberId

export const createCommunityRelatedParams = (
  detail: CommunityPostDetail,
): CommunityListParams | null => {
  const targetType = parseCommunityTargetType(detail.targetType?.code ?? null)
  const targetCode = detail.targetCode?.trim()

  if (!targetType || !targetCode) {
    return null
  }

  return {
    sortType: 'LATEST',
    orderType: 'DESC',
    lastPostId: COMMUNITY_CURSOR_START,
    lastLikeCount: 0,
    size: 5,
    targetType,
    targetCode,
  }
}

/**
 * 상세 하트의 상태(#530). 상세 응답의 `liked` 에서 그린다 — 첫 진입부터 내가 누른 글이면 채워진다.
 * 토글 결과는 `updateCommunityDetailLikeCache` 가 같은 캐시에 써서 이긴다. null(비로그인)·옛 BE(필드 없음)는
 * null 이고, 화면은 `=== true` 일 때만 채운다.
 */
export const getCommunityPostLiked = (detail: CommunityPostDetail | null) =>
  detail?.liked ?? null

export const updateCommunityDetailLikeCache = (
  response: CommunityPostDetailResponse,
  result: CommunityPostLikeResponse['dataBody'],
): CommunityPostDetailResponse =>
  response.dataBody.postId === result.postId
    ? {
        ...response,
        dataBody: {
          ...response.dataBody,
          likeCount: result.likeCount,
          liked: result.liked,
        },
      }
    : response

export const updateCommunityRelatedLikeCache = (
  response: CommunityPostListResponse,
  result: CommunityPostLikeResponse['dataBody'],
): CommunityPostListResponse => ({
  ...response,
  dataBody: {
    ...response.dataBody,
    posts: {
      ...response.dataBody.posts,
      contents: response.dataBody.posts.contents.map(post =>
        post.postId === result.postId
          ? { ...post, likeCount: result.likeCount, liked: result.liked }
          : post,
      ),
    },
  },
})

const updateCommunityRelatedCommentCountCache = (
  response: CommunityPostListResponse,
  postId: CommunityId,
  commentCount: number,
): CommunityPostListResponse => ({
  ...response,
  dataBody: {
    ...response.dataBody,
    posts: {
      ...response.dataBody.posts,
      contents: response.dataBody.posts.contents.map(post =>
        post.postId === postId ? { ...post, commentCount } : post,
      ),
    },
  },
})

export const updateCommunityCommentLikeCache = (
  response: CommunityCommentsResponse,
  result: CommunityCommentLikeBody,
): CommunityCommentsResponse => ({
  ...response,
  dataBody: {
    ...response.dataBody,
    comments: response.dataBody.comments.map(comment => ({
      ...comment,
      likeCount:
        comment.commentId === result.commentId
          ? result.likeCount
          : comment.likeCount,
      replies: comment.replies.map(reply =>
        reply.commentId === result.commentId
          ? { ...reply, likeCount: result.likeCount }
          : reply,
      ),
    })),
  },
})

export const shouldReadCommunityAdjacent = (from: string | null) =>
  Boolean(from?.trim())

export const isCommunityDetailUnauthorizedError = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 401

export const shouldRetryCommunityDetailQuery = (
  failureCount: number,
  error: unknown,
) => !isCommunityDetailUnauthorizedError(error) && failureCount < 2

type RecoverCommunityDetailUnauthorizedOptions = {
  queryClient: QueryClient
  queryKeys: QueryKey[]
  clearSession: () => void
  navigate: (href: string) => void
  currentHref: string
}

export const recoverCommunityDetailUnauthorized = async ({
  queryClient,
  queryKeys,
  clearSession,
  navigate,
  currentHref,
}: RecoverCommunityDetailUnauthorizedOptions) => {
  await Promise.all(
    queryKeys.map(queryKey =>
      queryClient.cancelQueries({ queryKey, exact: true }),
    ),
  )
  queryKeys.forEach(queryKey => {
    queryClient.removeQueries({ queryKey, exact: true })
  })
  clearSession()
  navigate(getCommunityLoginHref(currentHref))
}

type CommunityDetailRecoveryRef = {
  current: Promise<void> | null
}

export const startCommunityDetailUnauthorizedRecovery = (
  recoveryRef: CommunityDetailRecoveryRef,
  recover: () => Promise<void>,
) => {
  if (recoveryRef.current) {
    return recoveryRef.current
  }

  const recovery = recover()
  recoveryRef.current = recovery

  void recovery.then(
    () => {
      if (recoveryRef.current === recovery) {
        recoveryRef.current = null
      }
    },
    () => {
      if (recoveryRef.current === recovery) {
        recoveryRef.current = null
      }
    },
  )

  return recovery
}

type CommunityPublicQuery = {
  queryKey: QueryKey
  refetch: () => Promise<unknown>
  /** 키 끝에 조회자 세그먼트가 있는가(상세·관련 글, #530). 댓글 키에는 없다. */
  viewerScoped?: boolean
}

type RecoverCommunityPublicQueriesOptions = {
  queryClient: QueryClient
  /** 실패한 키의 조회자 세그먼트(`getCommunityViewerKey`). */
  viewerKey: string
  queries: CommunityPublicQuery[]
  clearSession: () => void
}

export const recoverCommunityPublicQueries = async ({
  queryClient,
  viewerKey,
  queries,
  clearSession,
}: RecoverCommunityPublicQueriesOptions) => {
  await Promise.all(
    queries.map(({ queryKey }) =>
      queryClient.cancelQueries({ queryKey, exact: true }),
    ),
  )

  /*
    회원 키는 세션을 지우면 조회자 세그먼트가 'anonymous' 로 바뀌어 새 키가 익명으로 받는다. 옛 키를 다시
    부르면 상세 GET 이 두 번 나가 조회수가 두 번 오르고, 401 을 품은 채 남기면 다시 로그인해 돌아왔을 때
    그 오류로 복구가 또 돈다 — 그래서 지우기만 한다. 조회자가 없는 키(댓글)와 익명 키는 그대로 다시 부른다.
  */
  const viewerChanges = viewerKey !== COMMUNITY_ANONYMOUS_VIEWER
  const replaced = queries.filter(query => viewerChanges && query.viewerScoped)
  const retried = queries.filter(query => !replaced.includes(query))

  replaced.forEach(({ queryKey }) => {
    queryClient.removeQueries({ queryKey, exact: true })
  })
  clearSession()
  await Promise.all(retried.map(({ refetch }) => refetch()))
}

type CommunityPublicQueryRecoveryRef = {
  scope: string | null
  attempted: boolean
  current: Promise<void> | null
}

export const startCommunityPublicQueryRecovery = (
  recoveryRef: CommunityPublicQueryRecoveryRef,
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

type RefreshCommunityDetailSummaryCachesOptions = {
  queryClient: QueryClient
  relatedQueryKey: QueryKey
}

export const refreshCommunityDetailSummaryCaches = ({
  queryClient,
  relatedQueryKey,
}: RefreshCommunityDetailSummaryCachesOptions) =>
  Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['community', 'list'],
    }),
    // 목록 레일의 인기 글(♡ 수)도 같은 요약을 보여 준다 — 목록 키와 따로 둔 키라 함께 무효화한다.
    queryClient.invalidateQueries({
      queryKey: ['community', 'popular'],
    }),
    queryClient.invalidateQueries({
      queryKey: relatedQueryKey,
      exact: true,
    }),
  ])

type CommunityContextValue = {
  view?: unknown
  keyword?: unknown
  targetType?: unknown
  targetCode?: unknown
  period?: unknown
  category?: unknown
}

export const createCommunityDetailListHref = (
  from: string | null,
  mockEnabled: boolean,
) => {
  const params = new URLSearchParams()

  if (from) {
    try {
      const value = JSON.parse(from) as CommunityContextValue
      const view =
        value.view === 'popular' || value.view === 'liked'
          ? value.view
          : 'latest'
      const keyword =
        typeof value.keyword === 'string' ? value.keyword.trim() : ''
      const targetType =
        typeof value.targetType === 'string'
          ? parseCommunityTargetType(value.targetType)
          : undefined
      const targetCode =
        typeof value.targetCode === 'string' ? value.targetCode.trim() : ''

      if (view !== 'latest') {
        params.set('view', view)
      }

      if (view !== 'liked' && keyword) {
        params.set('keyword', keyword)
      } else if (view !== 'liked' && targetType && targetCode && !keyword) {
        params.set('targetType', targetType)
        params.set('targetCode', targetCode)
      }

      // 보던 말머리로 돌아간다(#529). 검색·좋아요한 글에는 말머리 필터가 없다(계약).
      const category = parseCommunityPostCategory(value.category)

      if (view !== 'liked' && !keyword && category) {
        params.set('category', category)
      }

      // 보던 인기 기간으로 돌아간다(#531). 맥락 키에는 기본값이 아닐 때만 들어 있다.
      const period =
        typeof value.period === 'string'
          ? parseCommunityPopularPeriod(value.period)
          : COMMUNITY_DEFAULT_POPULAR_PERIOD

      if (
        view === 'popular' &&
        !keyword &&
        period !== COMMUNITY_DEFAULT_POPULAR_PERIOD
      ) {
        params.set('period', period)
      }
    } catch {
      // Malformed navigation context falls back to the unfiltered list.
    }
  }

  if (mockEnabled) {
    params.set('mock', '1')
  }

  const query = params.toString()
  return query ? `/community/list?${query}` : '/community/list'
}

const countCommunityComments = (response: CommunityCommentsResponse) =>
  response.dataBody.comments.reduce(
    (count, comment) => count + 1 + comment.replies.length,
    0,
  )

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

type CommunityDetailPageProps = {
  communityId: CommunityId
}

type ReportTarget = Pick<
  CommunityReportCreateRequest,
  'targetKind' | 'targetId'
>

export default function CommunityDetailPage({
  communityId,
}: CommunityDetailPageProps) {
  const postId = communityId
  const router = useRouter()
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rawSearchParams = searchParams.toString()
  const mockEnabled = isCommunityMockEnabled(searchParams.get('mock'))
  const fromContext = searchParams.get('from')
  const currentHref = rawSearchParams
    ? `${pathname}?${rawSearchParams}`
    : pathname
  const listHref = createCommunityDetailListHref(fromContext, mockEnabled)
  const hasHydrated = useAuthStore(auth => auth.hasHydrated)
  const isLoggedIn = useAuthStore(auth => auth.isLoggedIn)
  const memberInfo = useAuthStore(auth => auth.memberInfo)
  const clearSession = useAuthStore(auth => auth.clearSession)
  const source = mockEnabled ? communityMockSource : realCommunitySource
  const commentsQueryKey = communityKeys.comments(postId, mockEnabled)
  const viewer: CommunityViewer = mockEnabled
    ? {
        authenticated: true,
        memberId: String(MOCK_COMMUNITY_MEMBER_ID),
      }
    : {
        authenticated: hasHydrated && isLoggedIn,
        memberId:
          hasHydrated && isLoggedIn && memberInfo?.memberId
            ? String(memberInfo.memberId)
            : null,
      }
  /*
    로그인 확인 전에는 상세·관련 글을 부르지 않는다(#530, isCommunityViewerReady) — 응답의 `liked` 가
    조회자마다 달라 키에 조회자를 넣었고, 확인 전에 부르면 같은 글을 두 번 받아 조회수가 두 번 오른다.
    확인이 멈추면 상한 뒤 익명으로 부른다(`viewerReady`). 좋아요·로그인 유도는 누구인지가 맞아야 해서
    상한과 상관없이 확인 완료(`authReady`)를 기다린다.
  */
  const authReady = isCommunityViewerReady(mockEnabled, hasHydrated)
  const viewerReady = useCommunityViewerReady(mockEnabled, hasHydrated)
  const viewerKey = getCommunityViewerKey(viewer)
  const detailQueryKey = communityKeys.detail(postId, mockEnabled, viewerKey)
  const unauthorizedRecoveryRef = useRef<Promise<void> | null>(null)
  const publicQueryRecoveryRef = useRef<CommunityPublicQueryRecoveryRef>({
    scope: null,
    attempted: false,
    current: null,
  })
  const [adjacent, setAdjacent] = useState<ReturnType<
    typeof readAdjacentPosts
  > | null>(null)
  const [postMutationError, setPostMutationError] = useState<string | null>(
    null,
  )
  const [commentMutationError, setCommentMutationError] = useState<
    string | null
  >(null)
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null)
  const [reportErrorMessage, setReportErrorMessage] = useState<string | null>(
    null,
  )
  const [reportStatusMessage, setReportStatusMessage] = useState<string | null>(
    null,
  )

  useEffect(() => {
    let active = true

    queueMicrotask(() => {
      if (!active) {
        return
      }

      if (!shouldReadCommunityAdjacent(fromContext)) {
        setAdjacent(null)
        return
      }

      try {
        setAdjacent(
          readAdjacentPosts(window.sessionStorage, postId, fromContext!),
        )
      } catch {
        setAdjacent(null)
      }
    })

    return () => {
      active = false
    }
  }, [fromContext, postId])

  const detailQuery = useQuery<
    CommunityPostDetailResponse,
    Error,
    CommunityPostDetailResponse,
    ReturnType<typeof communityKeys.detail>
  >({
    queryKey: detailQueryKey,
    enabled: viewerReady,
    retry: shouldRetryCommunityDetailQuery,
    queryFn: async () =>
      validateCommunityDetailResponse(await source.getPost(postId)),
  })

  const commentsQuery = useQuery<
    CommunityCommentsResponse,
    Error,
    CommunityCommentsResponse,
    ReturnType<typeof communityKeys.comments>
  >({
    queryKey: commentsQueryKey,
    retry: shouldRetryCommunityDetailQuery,
    queryFn: async () =>
      validateCommunityCommentsResponse(await source.getComments(postId)),
  })

  const detail = detailQuery.data?.dataBody ?? null
  const relatedParams = detail ? createCommunityRelatedParams(detail) : null
  const relatedQueryKey = communityKeys.related(
    relatedParams?.targetType ?? 'DISTRICT',
    relatedParams?.targetCode ?? '',
    mockEnabled,
    viewerKey,
  )
  const relatedQuery = useQuery<
    CommunityPostListResponse,
    Error,
    CommunityPostListResponse,
    ReturnType<typeof communityKeys.related>
  >({
    queryKey: relatedQueryKey,
    enabled: viewerReady && Boolean(relatedParams),
    retry: shouldRetryCommunityDetailQuery,
    queryFn: async () => {
      if (!relatedParams) {
        throw new CommunityDetailQueryError(
          '관련 게시글을 조회할 지역 정보가 없어요.',
        )
      }

      return validateCommunityRelatedResponse(
        await source.getPosts(relatedParams),
      )
    },
  })

  useEffect(() => {
    if (mockEnabled) {
      return
    }

    const hasUnauthorizedError = [
      detailQuery.error,
      commentsQuery.error,
      relatedQuery.error,
    ].some(isCommunityDetailUnauthorizedError)

    if (!hasUnauthorizedError) {
      return
    }

    const queries: CommunityPublicQuery[] = [
      {
        queryKey: detailQueryKey,
        viewerScoped: true,
        refetch: async () => {
          await detailQuery.refetch()
        },
      },
      {
        queryKey: commentsQueryKey,
        refetch: async () => {
          await commentsQuery.refetch()
        },
      },
    ]

    if (relatedParams) {
      queries.push({
        queryKey: relatedQueryKey,
        viewerScoped: true,
        refetch: async () => {
          await relatedQuery.refetch()
        },
      })
    }

    void startCommunityPublicQueryRecovery(
      publicQueryRecoveryRef.current,
      `${postId}:${mockEnabled ? 'mock' : 'real'}`,
      () =>
        recoverCommunityPublicQueries({
          queryClient,
          viewerKey,
          queries,
          clearSession,
        }),
    )
  }, [
    clearSession,
    commentsQuery,
    commentsQueryKey,
    detailQuery,
    detailQueryKey,
    mockEnabled,
    postId,
    queryClient,
    relatedParams,
    relatedQuery,
    relatedQueryKey,
    viewerKey,
  ])

  const requireLogin = () => {
    if (!authReady) {
      return
    }

    router.push(getCommunityLoginHref(currentHref))
  }

  const handleMutationError = (
    error: unknown,
    setMessage: (message: string | null) => void,
    fallback: string,
  ) => {
    if (!mockEnabled && isCommunityDetailUnauthorizedError(error)) {
      void startCommunityDetailUnauthorizedRecovery(
        unauthorizedRecoveryRef,
        () =>
          recoverCommunityDetailUnauthorized({
            queryClient,
            queryKeys: [detailQueryKey, commentsQueryKey, relatedQueryKey],
            clearSession,
            navigate: href => {
              router.replace(href)
            },
            currentHref,
          }),
      )
      return
    }

    setMessage(getErrorMessage(error, fallback))
  }

  const postLikeMutation = useMutation({
    mutationFn: async () =>
      validateCommunityResponse(await source.togglePostLike(postId)),
    onSuccess: async response => {
      // 하트는 상세 캐시의 liked 에서 그린다(getCommunityPostLiked) — 아래 캐시 갱신이 토글 결과를 싣는다.
      setPostMutationError(null)
      queryClient.setQueryData<CommunityPostDetailResponse>(
        detailQueryKey,
        current =>
          current
            ? updateCommunityDetailLikeCache(current, response.dataBody)
            : current,
      )
      queryClient.setQueryData<CommunityPostListResponse>(
        relatedQueryKey,
        current =>
          current
            ? updateCommunityRelatedLikeCache(current, response.dataBody)
            : current,
      )
      await refreshCommunityDetailSummaryCaches({
        queryClient,
        relatedQueryKey,
      })
    },
    onError: error => {
      handleMutationError(
        error,
        setPostMutationError,
        '게시글 좋아요를 처리하지 못했어요.',
      )
    },
  })

  const createCommentMutation = useMutation({
    mutationFn: async (payload: {
      content: string
      parentCommentId?: CommunityId
    }) =>
      validateCommunityCommentsResponse(
        await source.createComment(postId, payload),
      ),
    onSuccess: async response => {
      const commentCount = countCommunityComments(response)
      setCommentMutationError(null)
      queryClient.setQueryData(commentsQueryKey, response)
      queryClient.setQueryData<CommunityPostDetailResponse>(
        detailQueryKey,
        current =>
          current
            ? {
                ...current,
                dataBody: {
                  ...current.dataBody,
                  commentCount,
                },
              }
            : current,
      )
      queryClient.setQueryData<CommunityPostListResponse>(
        relatedQueryKey,
        current =>
          current
            ? updateCommunityRelatedCommentCountCache(
                current,
                postId,
                commentCount,
              )
            : current,
      )
      await refreshCommunityDetailSummaryCaches({
        queryClient,
        relatedQueryKey,
      })
    },
    onError: error => {
      handleMutationError(
        error,
        setCommentMutationError,
        '댓글을 등록하지 못했어요.',
      )
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: CommunityId) =>
      validateCommunityResponse(await source.deleteComment(postId, commentId)),
    onSuccess: async () => {
      setCommentMutationError(null)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: commentsQueryKey,
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: detailQueryKey,
          exact: true,
        }),
        refreshCommunityDetailSummaryCaches({
          queryClient,
          relatedQueryKey,
        }),
      ])
    },
    onError: error => {
      handleMutationError(
        error,
        setCommentMutationError,
        '댓글을 삭제하지 못했어요.',
      )
    },
  })

  const commentLikeMutation = useMutation({
    mutationFn: async (commentId: CommunityId) =>
      validateCommunityResponse(
        await source.toggleCommentLike(postId, commentId),
      ),
    onSuccess: response => {
      setCommentMutationError(null)
      queryClient.setQueryData<CommunityCommentsResponse>(
        commentsQueryKey,
        current =>
          current
            ? updateCommunityCommentLikeCache(current, response.dataBody)
            : current,
      )
    },
    onError: error => {
      handleMutationError(
        error,
        setCommentMutationError,
        '댓글 좋아요를 처리하지 못했어요.',
      )
    },
  })

  const reportMutation = useMutation({
    mutationFn: async ({
      target,
      reason,
    }: {
      target: ReportTarget
      reason: string
    }) =>
      validateCommunityResponse(
        await source.createReport({ ...target, reason }),
      ),
    onSuccess: () => {
      setReportTarget(null)
      setReportErrorMessage(null)
      setReportStatusMessage('신고가 접수됐어요.')
    },
    onError: error => {
      handleMutationError(
        error,
        setReportErrorMessage,
        '신고를 접수하지 못했어요.',
      )
    },
  })

  const deletePostMutation = useMutation({
    mutationFn: async () =>
      validateCommunityResponse(await source.deletePost(postId)),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: detailQueryKey, exact: true })
      queryClient.removeQueries({ queryKey: commentsQueryKey, exact: true })
      queryClient.removeQueries({ queryKey: relatedQueryKey, exact: true })
      await queryClient.invalidateQueries({
        queryKey: communityKeys.all,
      })
      router.replace(listHref)
    },
    onError: error => {
      handleMutationError(
        error,
        setPostMutationError,
        '게시글을 삭제하지 못했어요.',
      )
    },
  })

  const comments = commentsQuery.data?.dataBody.comments ?? []
  const relatedPosts =
    relatedQuery.data?.dataBody.posts.contents
      .filter(post => post.postId !== postId)
      .slice(0, 4) ?? []
  const ownsPost = detail ? isCommunityOwner(detail.memberId, viewer) : false
  const editHref =
    detail && ownsPost
      ? `/community/register?postId=${detail.postId}${mockEnabled ? '&mock=1' : ''}`
      : null
  const postLiked = getCommunityPostLiked(detail)
  // 로그인 확인 전에는 쿼리가 꺼져 있다 — 오류가 아니라 로딩이다(남은 익명 캐시도 그리지 않는다).
  const detailStatus =
    !viewerReady || detailQuery.isLoading
      ? 'loading'
      : detailQuery.error || !detail
        ? 'error'
        : 'ready'
  const commentsStatus = commentsQuery.isLoading
    ? 'loading'
    : commentsQuery.error
      ? 'error'
      : comments.length === 0
        ? 'empty'
        : 'ready'
  const relatedStatus = !relatedParams
    ? 'empty'
    : relatedQuery.isLoading
      ? 'loading'
      : relatedQuery.error
        ? 'error'
        : relatedPosts.length === 0
          ? 'empty'
          : 'ready'

  return (
    <CommunityDetailView
      status={detailStatus}
      detail={detail}
      errorMessage={detailQuery.error?.message ?? null}
      commentsStatus={commentsStatus}
      comments={comments}
      commentsErrorMessage={commentsQuery.error?.message ?? null}
      relatedStatus={relatedStatus}
      relatedPosts={relatedPosts}
      relatedErrorMessage={relatedQuery.error?.message ?? null}
      viewer={viewer}
      authReady={authReady}
      listHref={listHref}
      editHref={editHref}
      postLiked={postLiked}
      postLikePending={postLikeMutation.isPending}
      postDeletePending={deletePostMutation.isPending}
      postMutationError={postMutationError}
      commentMutationError={commentMutationError}
      reportTarget={reportTarget}
      reportPending={reportMutation.isPending}
      reportErrorMessage={reportErrorMessage}
      reportStatusMessage={reportStatusMessage}
      adjacent={adjacent}
      fromContext={fromContext}
      mockEnabled={mockEnabled}
      onRetryDetail={() => {
        void detailQuery.refetch()
      }}
      onRetryComments={() => {
        void commentsQuery.refetch()
      }}
      onRetryRelated={() => {
        void relatedQuery.refetch()
      }}
      onRequireLogin={requireLogin}
      onTogglePostLike={async () => {
        setPostMutationError(null)
        try {
          await postLikeMutation.mutateAsync()
        } catch {
          // Mutation error state is rendered without removing the article.
        }
      }}
      onDeletePost={() => {
        if (
          ownsPost &&
          !deletePostMutation.isPending &&
          window.confirm('게시글을 삭제하시겠습니까?')
        ) {
          setPostMutationError(null)
          deletePostMutation.mutate()
        }
      }}
      onCreateComment={async payload => {
        setCommentMutationError(null)
        try {
          await createCommentMutation.mutateAsync(payload)
          return true
        } catch {
          return false
        }
      }}
      onDeleteComment={async commentId => {
        setCommentMutationError(null)
        try {
          await deleteCommentMutation.mutateAsync(commentId)
          return true
        } catch {
          return false
        }
      }}
      onToggleCommentLike={async commentId => {
        setCommentMutationError(null)
        try {
          const response = await commentLikeMutation.mutateAsync(commentId)
          return response.dataBody
        } catch {
          return null
        }
      }}
      onOpenReport={target => {
        setReportStatusMessage(null)
        setReportErrorMessage(null)
        setReportTarget(target)
      }}
      onCloseReport={() => {
        if (!reportMutation.isPending) {
          setReportTarget(null)
          setReportErrorMessage(null)
        }
      }}
      onSubmitReport={reason => {
        if (!reportTarget || reportMutation.isPending) {
          return
        }

        setReportErrorMessage(null)
        reportMutation.mutate({ target: reportTarget, reason })
      }}
    />
  )
}
