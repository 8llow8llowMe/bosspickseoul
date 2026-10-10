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
import ConfirmSheet from '@/components/ui/confirm-sheet'
import { useCommunityViewerReady } from '@/hooks/use-community-viewer-ready'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { readAdjacentPosts } from '@/lib/community/adjacent-posts'
import {
  COMMUNITY_COMMENT_DELETE_BATCH_COPY,
  COMMUNITY_COMMENT_DELETE_COPY,
  COMMUNITY_COMMENT_DELETE_FAILED,
  COMMUNITY_COMMENT_DELETE_TOAST_KEY,
  countHiddenCommunityComments,
  filterHiddenCommunityComments,
} from '@/lib/community/comment-delete'
import { useUndoBatch } from '@/components/ui/use-undo-batch'
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
  createCommunityLikeToggleQueues,
  flipCommunityLike,
  type CommunityLikeResult,
  type CommunityLikeState,
} from '@/lib/community/like-toggle-queue'
import {
  COMMUNITY_DEFAULT_POPULAR_PERIOD,
  parseCommunityPopularPeriod,
} from '@/lib/community/popular-period'
import { parseCommunityPostCategory } from '@/lib/community/post-category'
import {
  readCommunityReportError,
  type CommunityReportInputField,
  type CommunityReportReasonPayload,
} from '@/lib/community/report-reason'
import { useAuthStore } from '@/stores/auth-store'
import type { ApiResponse } from '@/types/api'
import type {
  CommunityId,
  CommunityCommentsResponse,
  CommunityListParams,
  CommunityPostDetail,
  CommunityPostDetailResponse,
  CommunityPostLikeResponse,
  CommunityPostListResponse,
  CommunityReportCreateRequest,
} from '@/types/community'

export class CommunityDetailQueryError extends Error {
  /**
   * 실패 응답의 `dataHeader.resultCode`. 화면 분기에는 쓰지 않고, 신고 오류의 안내 자리를 정할 때만 읽는다
   * (#532, `readCommunityReportError`). axios 오류의 `code`(ERR_BAD_REQUEST 등)와 헷갈리지 않게 이름을 따로 둔다.
   */
  readonly resultCode: string | null

  constructor(message: string, resultCode: string | null = null) {
    super(message)
    this.name = 'CommunityDetailQueryError'
    this.resultCode = resultCode
  }
}

const validateCommunityResponse = <Response extends ApiResponse<unknown>>(
  response: Response,
) => {
  if (!isApiSuccess(response)) {
    throw new CommunityDetailQueryError(
      getApiMessage(response),
      response.dataHeader.resultCode ?? null,
    )
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

/** 상세 캐시에 좋아요 상태를 쓴다. 토글 결과·낙관적 상태·되돌릴 상태(liked 를 모르면 null)가 모두 이 길이다. */
type CommunityPostLikeCacheValue = Omit<
  CommunityPostLikeResponse['dataBody'],
  'liked'
> & { liked: boolean | null }

export const updateCommunityDetailLikeCache = (
  response: CommunityPostDetailResponse,
  result: CommunityPostLikeCacheValue,
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
  result: CommunityPostLikeCacheValue,
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

/**
 * 댓글·답글 캐시에 좋아요 **수**를 쓴다(토글 결과 · 낙관적 상태 · 되돌릴 상태). `liked` 는 쓰지 않는다 —
 * 댓글 캐시 키에 조회자가 없어서(`communityKeys.comments`) 쓰면 같은 탭에서 로그아웃·다른 계정 로그인 뒤
 * 앞사람의 하트가 비친다. 하트는 스레드의 로컬 상태가 들고, 응답의 `liked`(BE #594)만 캐시에서 온다.
 * #594 착수 때 댓글 키에 조회자를 넣는다(community.md 「좋아요」).
 */
export const updateCommunityCommentLikeCache = (
  response: CommunityCommentsResponse,
  result: { commentId: CommunityId; liked: boolean | null; likeCount: number },
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
  const [reportErrorField, setReportErrorField] =
    useState<CommunityReportInputField | null>(null)
  const [reportStatusMessage, setReportStatusMessage] = useState<string | null>(
    null,
  )
  /* 글 삭제 확인 시트(#581 — window.confirm 대신). */
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  /*
    좋아요 직렬화(#580). 글 하나 · 댓글 하나마다 큐가 하나다 — 진행 중 연타는 마지막 의도만 남긴다.
    seq 는 「이 클릭이 마지막인가」를 잰다. 같은 실행에 묶인 클릭은 모두 같은 결과로 끝나므로, 캐시 쓰기·무효화는
    마지막 클릭 하나만 한다.
  */
  const [likeQueues] = useState(createCommunityLikeToggleQueues)
  const likeSeqRef = useRef(new Map<string, number>())
  /*
    댓글 삭제 되돌리기(#581). 누르면 숨기고(hiddenCommentIds) 되돌리기 시간이 지나야 DELETE 를 보낸다
    (lib/community/comment-delete). 실행 함수는 렌더마다 바뀌는 뮤테이션을 부르므로 ref 로 최신을 잡는다.
  */
  const [hiddenCommentIds, setHiddenCommentIds] = useState<
    ReadonlySet<CommunityId>
  >(() => new Set())
  const runCommentDeleteRef = useRef<(commentId: CommunityId) => void>(
    () => undefined,
  )
  /*
    연달아 지운 댓글은 되돌리기 토스트 하나로 묶는다(#631 — 프로필 보관함과 같은 components/ui/use-undo-batch).
    기한(10초)은 댓글마다 따로 재고, 기한이 지난 댓글만 DELETE 를 보낸다. 페이지를 떠나면(언마운트·pagehide) 기다리던
    삭제를 바로 보내고 묶음 토스트를 닫는다 — 사용자는 이미 지웠다고 봤고, 떠난 뒤 누르면 되돌릴 것이 없다. 탭 닫기·
    새로고침은 브라우저가 요청을 끊을 수 있다(그러면 댓글이 남는다 — 안전한 쪽 실패).
  */
  const commentDeleteBatch = useUndoBatch<
    CommunityId,
    typeof COMMUNITY_COMMENT_DELETE_COPY
  >({
    scope: COMMUNITY_COMMENT_DELETE_TOAST_KEY,
    batchCopy: COMMUNITY_COMMENT_DELETE_BATCH_COPY,
    commit: commentId => runCommentDeleteRef.current(commentId),
    restore: commentIds => {
      setHiddenCommentIds(current => {
        const next = new Set(current)
        commentIds.forEach(commentId => next.delete(commentId))
        return next
      })
    },
  })

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

  /** 401 이면 로그인 복구를 시작하고 true. 오류 문구는 띄우지 않는다. */
  const recoverMutationUnauthorized = (error: unknown) => {
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
      return true
    }

    return false
  }

  const handleMutationError = (
    error: unknown,
    setMessage: (message: string | null) => void,
    fallback: string,
  ) => {
    if (recoverMutationUnauthorized(error)) {
      return
    }

    setMessage(getErrorMessage(error, fallback))
  }

  const nextLikeSeq = (key: string) => {
    const seq = (likeSeqRef.current.get(key) ?? 0) + 1
    likeSeqRef.current.set(key, seq)
    return seq
  }
  const isLatestLike = (key: string, seq: number) =>
    likeSeqRef.current.get(key) === seq

  const writePostLikeCaches = (state: CommunityLikeState) => {
    const value = { postId, ...state }
    queryClient.setQueryData<CommunityPostDetailResponse>(
      detailQueryKey,
      current =>
        current ? updateCommunityDetailLikeCache(current, value) : current,
    )
    queryClient.setQueryData<CommunityPostListResponse>(
      relatedQueryKey,
      current =>
        current ? updateCommunityRelatedLikeCache(current, value) : current,
    )
  }

  /*
    글 좋아요(#580). 누르면 onMutate 가 캐시를 먼저 뒤집고(하트는 상세 캐시의 liked 에서 그린다), 요청은 큐가
    직렬화한다. 성공하면 서버 결과로 덮고, 실패하면 서버가 마지막으로 확인한 상태로 되돌린다.
  */
  const postLikeKey = `post:${postId}`
  const postLikeMutation = useMutation({
    mutationFn: ({
      desired,
      current,
    }: {
      desired: boolean
      current: CommunityLikeState
      seq: number
    }) =>
      likeQueues
        .get(postLikeKey)
        .request(desired, current, async (): Promise<CommunityLikeResult> => {
          const response = validateCommunityResponse(
            await source.togglePostLike(postId),
          )
          return {
            liked: response.dataBody.liked,
            likeCount: response.dataBody.likeCount,
          }
        }),
    onMutate: async ({ desired, current }) => {
      setPostMutationError(null)
      // 진행 중 조회가 낙관적 값을 옛 값으로 덮지 않게 먼저 끊는다.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailQueryKey, exact: true }),
        queryClient.cancelQueries({ queryKey: relatedQueryKey, exact: true }),
      ])
      writePostLikeCaches(flipCommunityLike(current, desired))
    },
    onSuccess: async (result, { seq }) => {
      if (!isLatestLike(postLikeKey, seq)) {
        return
      }

      writePostLikeCaches(result)
      await refreshCommunityDetailSummaryCaches({
        queryClient,
        relatedQueryKey,
      })
    },
    onError: (error, { seq }) => {
      if (!isLatestLike(postLikeKey, seq)) {
        return
      }

      const confirmed = likeQueues.get(postLikeKey).getConfirmed()
      if (confirmed) {
        writePostLikeCaches(confirmed)
      }
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

  const unhideComment = (commentId: CommunityId) => {
    setHiddenCommentIds(current => {
      if (!current.has(commentId)) {
        return current
      }

      const next = new Set(current)
      next.delete(commentId)
      return next
    })
  }

  /*
    되돌리기 시간이 지난 뒤 실제 삭제. 성공하면 댓글을 다시 받고 나서 숨김을 푼다 — 먼저 풀면 지운 댓글이
    한 번 다시 비친다. 실패하면 숨김을 풀어 댓글을 되살리고 이유를 알린다.
  */
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: CommunityId) =>
      validateCommunityResponse(await source.deleteComment(postId, commentId)),
    onSuccess: async (_response, commentId) => {
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
      unhideComment(commentId)
    },
    onError: (error, commentId) => {
      unhideComment(commentId)
      if (recoverMutationUnauthorized(error)) {
        return
      }

      // 숨겼던 댓글이 다시 나타난 이유를 먼저 말하고, 서버가 준 사유가 있으면 뒤에 붙인다.
      const reason = error instanceof Error ? error.message.trim() : ''
      setCommentMutationError(
        reason
          ? `${COMMUNITY_COMMENT_DELETE_FAILED} ${reason}`
          : COMMUNITY_COMMENT_DELETE_FAILED,
      )
    },
  })

  useEffect(() => {
    runCommentDeleteRef.current = commentId => {
      deleteCommentMutation.mutate(commentId)
    }
  }, [deleteCommentMutation])

  /*
    댓글 좋아요(#580). 글 좋아요와 같은 길 — 개수는 댓글 캐시에 낙관적으로 쓰고, 하트(liked)는 스레드가
    로컬로 들고 있다가 결과(CommunityCommentLikeOutcome)로 맞춘다. 첫 상태는 BE #594 전이라 모를 수 있다.
  */
  const commentLikeMutation = useMutation({
    mutationFn: ({
      commentId,
      desired,
      current,
    }: {
      commentId: CommunityId
      desired: boolean
      current: CommunityLikeState
      seq: number
    }) =>
      likeQueues
        .get(`comment:${commentId}`)
        .request(desired, current, async (): Promise<CommunityLikeResult> => {
          const response = validateCommunityResponse(
            await source.toggleCommentLike(postId, commentId),
          )
          return {
            liked: response.dataBody.liked,
            likeCount: response.dataBody.likeCount,
          }
        }),
    onMutate: async ({ commentId, desired, current }) => {
      setCommentMutationError(null)
      await queryClient.cancelQueries({
        queryKey: commentsQueryKey,
        exact: true,
      })
      queryClient.setQueryData<CommunityCommentsResponse>(
        commentsQueryKey,
        cache =>
          cache
            ? updateCommunityCommentLikeCache(cache, {
                commentId,
                ...flipCommunityLike(current, desired),
              })
            : cache,
      )
    },
    onSuccess: (result, { commentId, seq }) => {
      if (!isLatestLike(`comment:${commentId}`, seq)) {
        return
      }

      queryClient.setQueryData<CommunityCommentsResponse>(
        commentsQueryKey,
        cache =>
          cache
            ? updateCommunityCommentLikeCache(cache, { commentId, ...result })
            : cache,
      )
    },
    onError: (error, { commentId, seq }) => {
      if (!isLatestLike(`comment:${commentId}`, seq)) {
        return
      }

      const confirmed = likeQueues.get(`comment:${commentId}`).getConfirmed()
      if (confirmed) {
        queryClient.setQueryData<CommunityCommentsResponse>(
          commentsQueryKey,
          cache =>
            cache
              ? updateCommunityCommentLikeCache(cache, {
                  commentId,
                  ...confirmed,
                })
              : cache,
        )
      }
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
      reason: CommunityReportReasonPayload
    }) =>
      validateCommunityResponse(
        await source.createReport({ ...target, ...reason }),
      ),
    onSuccess: () => {
      setReportTarget(null)
      setReportErrorMessage(null)
      setReportErrorField(null)
      setReportStatusMessage('신고가 접수됐어요.')
    },
    onError: error => {
      if (recoverMutationUnauthorized(error)) {
        return
      }

      // 서버 검증 오류는 resultCode 로 사유·상세 자리를 정한다(#532 — 계약이 field 를 입력칸 이름으로 주지 않는다).
      const { field, message } = readCommunityReportError(
        error,
        '신고를 접수하지 못했어요.',
      )
      setReportErrorField(field)
      setReportErrorMessage(message)
    },
  })

  const deletePostMutation = useMutation({
    mutationFn: async () =>
      validateCommunityResponse(await source.deletePost(postId)),
    onSuccess: async () => {
      setDeleteConfirmOpen(false)
      queryClient.removeQueries({ queryKey: detailQueryKey, exact: true })
      queryClient.removeQueries({ queryKey: commentsQueryKey, exact: true })
      queryClient.removeQueries({ queryKey: relatedQueryKey, exact: true })
      await queryClient.invalidateQueries({
        queryKey: communityKeys.all,
      })
      router.replace(listHref)
    },
    onError: error => {
      setDeleteConfirmOpen(false)
      handleMutationError(
        error,
        setPostMutationError,
        '게시글을 삭제하지 못했어요.',
      )
    },
  })

  const loadedComments = commentsQuery.data?.dataBody.comments ?? []
  // 되돌리기를 기다리는 댓글은 화면에서 뺀다. 반응 바의 `댓글 N` 도 같이 줄인다.
  const comments = filterHiddenCommunityComments(
    loadedComments,
    hiddenCommentIds,
  )
  const hiddenCommentCount = countHiddenCommunityComments(
    loadedComments,
    hiddenCommentIds,
  )
  const viewDetail =
    detail && hiddenCommentCount > 0
      ? {
          ...detail,
          commentCount: Math.max(0, detail.commentCount - hiddenCommentCount),
        }
      : detail
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
    <>
      <CommunityDetailView
        status={detailStatus}
        detail={viewDetail}
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
        reportErrorField={reportErrorField}
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
          const cached =
            queryClient.getQueryData<CommunityPostDetailResponse>(
              detailQueryKey,
            )
          if (!cached) {
            return
          }

          // 지금 화면이 그리는 상태에서 뒤집는다(연타면 앞 클릭의 낙관적 상태에서).
          const current: CommunityLikeState = {
            liked: cached.dataBody.liked ?? null,
            likeCount: cached.dataBody.likeCount,
          }
          try {
            await postLikeMutation.mutateAsync({
              desired: current.liked !== true,
              current,
              seq: nextLikeSeq(postLikeKey),
            })
          } catch {
            // 되돌림과 오류 문구는 onError 가 맡는다. 글은 그대로 둔다.
          }
        }}
        onDeletePost={() => {
          if (ownsPost && !deletePostMutation.isPending) {
            setDeleteConfirmOpen(true)
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
          // 확인 창 대신 숨기고 되돌리기 토스트를 띄운다(#581). 실제 삭제는 토스트가 사라질 무렵이다.
          setCommentMutationError(null)
          setHiddenCommentIds(current => new Set(current).add(commentId))
          commentDeleteBatch.remove(commentId, COMMUNITY_COMMENT_DELETE_COPY)
          return true
        }}
        onToggleCommentLike={async (commentId, desired, current) => {
          try {
            const result = await commentLikeMutation.mutateAsync({
              commentId,
              desired,
              current,
              seq: nextLikeSeq(`comment:${commentId}`),
            })
            return { ok: true, ...result }
          } catch {
            const confirmed =
              likeQueues.get(`comment:${commentId}`).getConfirmed() ?? current
            return { ok: false, ...confirmed }
          }
        }}
        onOpenReport={target => {
          setReportStatusMessage(null)
          setReportErrorMessage(null)
          setReportErrorField(null)
          setReportTarget(target)
        }}
        onCloseReport={() => {
          if (!reportMutation.isPending) {
            setReportTarget(null)
            setReportErrorMessage(null)
            setReportErrorField(null)
          }
        }}
        onSubmitReport={reason => {
          if (!reportTarget || reportMutation.isPending) {
            return
          }

          setReportErrorMessage(null)
          setReportErrorField(null)
          reportMutation.mutate({ target: reportTarget, reason })
        }}
      />
      <ConfirmSheet
        open={deleteConfirmOpen}
        title="글을 삭제할까요?"
        description="글을 삭제하면 달린 댓글도 함께 사라지고 되돌릴 수 없어요."
        confirmLabel="삭제"
        pending={deletePostMutation.isPending}
        pendingLabel="삭제 중"
        onCancel={() => {
          setDeleteConfirmOpen(false)
        }}
        onConfirm={() => {
          setPostMutationError(null)
          deletePostMutation.mutate()
        }}
      />
    </>
  )
}
