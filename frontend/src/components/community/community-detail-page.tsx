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
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { readAdjacentPosts } from '@/lib/community/adjacent-posts'
import { realCommunitySource } from '@/lib/community/community-data-source'
import {
  communityMockSource,
  MOCK_COMMUNITY_MEMBER_ID,
} from '@/lib/community/community-mock'
import {
  communityKeys,
  getCommunityLoginHref,
  isCommunityMockEnabled,
  parseCommunityTargetType,
  type CommunityViewer,
} from '@/lib/community/community-state'
import { useAuthStore } from '@/stores/auth-store'
import type { ApiResponse } from '@/types/api'
import type {
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

export const isCommunityOwner = (memberId: number, viewer: CommunityViewer) =>
  viewer.authenticated && String(memberId) === viewer.memberId

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
    lastPostId: 0,
    lastLikeCount: 0,
    size: 5,
    targetType,
    targetCode,
  }
}

export const updateCommunityDetailLikeCache = (
  response: CommunityPostDetailResponse,
  result: CommunityPostLikeResponse['dataBody'],
): CommunityPostDetailResponse => ({
  ...response,
  dataBody: {
    ...response.dataBody,
    likeCount:
      response.dataBody.postId === result.postId
        ? result.likeCount
        : response.dataBody.likeCount,
  },
})

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
          ? { ...post, likeCount: result.likeCount }
          : post,
      ),
    },
  },
})

const updateCommunityRelatedCommentCountCache = (
  response: CommunityPostListResponse,
  postId: number,
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
}

type RecoverCommunityPublicQueriesOptions = {
  queryClient: QueryClient
  queries: CommunityPublicQuery[]
  clearSession: () => void
}

export const recoverCommunityPublicQueries = async ({
  queryClient,
  queries,
  clearSession,
}: RecoverCommunityPublicQueriesOptions) => {
  await Promise.all(
    queries.map(({ queryKey }) =>
      queryClient.cancelQueries({ queryKey, exact: true }),
    ),
  )
  clearSession()
  await Promise.all(queries.map(({ refetch }) => refetch()))
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
  communityId: number
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
  const detailQueryKey = communityKeys.detail(postId, mockEnabled)
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
  const authReady = mockEnabled || hasHydrated
  const unauthorizedRecoveryRef = useRef<Promise<void> | null>(null)
  const publicQueryRecoveryRef = useRef<CommunityPublicQueryRecoveryRef>({
    scope: null,
    attempted: false,
    current: null,
  })
  const [adjacent, setAdjacent] = useState<ReturnType<
    typeof readAdjacentPosts
  > | null>(null)
  const [postLiked, setPostLiked] = useState<boolean | null>(null)
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
  )
  const relatedQuery = useQuery<
    CommunityPostListResponse,
    Error,
    CommunityPostListResponse,
    ReturnType<typeof communityKeys.related>
  >({
    queryKey: relatedQueryKey,
    enabled: Boolean(relatedParams),
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
      setPostLiked(response.dataBody.liked)
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
      parentCommentId?: number
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
    mutationFn: async (commentId: number) =>
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
    mutationFn: async (commentId: number) =>
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
  const detailStatus = detailQuery.isLoading
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
