import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { communityMockFixtures } from '@/lib/community/community-mock'
import { communityKeys } from '@/lib/community/community-state'
import type {
  CommunityComment,
  CommunityCommentLikeBody,
  CommunityCommentsResponse,
  CommunityPostDetailResponse,
  CommunityPostLikeResponse,
  CommunityPostListResponse,
} from '@/types/community'

import {
  CommunityDetailQueryError,
  createCommunityRelatedParams,
  isCommunityDetailUnauthorizedError,
  isCommunityOwner,
  recoverCommunityPublicQueries,
  recoverCommunityDetailUnauthorized,
  refreshCommunityDetailSummaryCaches,
  shouldReadCommunityAdjacent,
  shouldRetryCommunityDetailQuery,
  startCommunityDetailUnauthorizedRecovery,
  startCommunityPublicQueryRecovery,
  updateCommunityCommentLikeCache,
  updateCommunityDetailLikeCache,
  updateCommunityRelatedLikeCache,
  validateCommunityCommentsResponse,
  validateCommunityDetailResponse,
  validateCommunityRelatedResponse,
} from './community-detail-page'
import {
  getCommunityCommentLikePresentation,
  requestCommunityCommentAccess,
} from './community-comment-thread'
import CommunityDetailView from './community-detail-view'

const detail = structuredClone(
  communityMockFixtures.details[0],
) as (typeof communityMockFixtures.details)[number]
const comments = structuredClone(
  communityMockFixtures.comments.filter(
    comment => comment.postId === detail.postId,
  ),
) as CommunityComment[]
const relatedPosts = structuredClone(communityMockFixtures.posts.slice(1, 4))
const contextKey =
  '{"view":"latest","keyword":"","targetType":null,"targetCode":null}'
const successHeader = {
  success: true,
  resultCode: null,
  resultMessage: null,
}

const handlers = {
  onRetryDetail: vi.fn(),
  onRetryComments: vi.fn(),
  onRetryRelated: vi.fn(),
  onRequireLogin: vi.fn(),
  onTogglePostLike: vi.fn(async () => null),
  onDeletePost: vi.fn(),
  onCreateComment: vi.fn(async () => true),
  onDeleteComment: vi.fn(async () => true),
  onToggleCommentLike: vi.fn(async () => null),
  onOpenReport: vi.fn(),
  onCloseReport: vi.fn(),
  onSubmitReport: vi.fn(),
}

const baseProps: ComponentProps<typeof CommunityDetailView> = {
  status: 'ready',
  detail,
  errorMessage: null,
  commentsStatus: 'ready',
  comments,
  commentsErrorMessage: null,
  relatedStatus: 'ready',
  relatedPosts,
  relatedErrorMessage: null,
  viewer: { authenticated: true, memberId: '9999' },
  authReady: true,
  listHref: '/community/list?mock=1',
  editHref: null,
  postLiked: null,
  postLikePending: false,
  postMutationError: null,
  commentMutationError: null,
  reportTarget: null,
  reportPending: false,
  reportErrorMessage: null,
  reportStatusMessage: null,
  adjacent: {
    currentPostId: detail.postId,
    contextKey,
    previous: { postId: 8, title: '이전 운영 이야기' },
    next: { postId: 2, title: '다음 운영 이야기' },
  },
  mockEnabled: true,
  ...handlers,
}

const renderWithStyles = (
  overrides: Partial<ComponentProps<typeof CommunityDetailView>> = {},
) => {
  const sheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(
      sheet.collectStyles(
        createElement(CommunityDetailView, {
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

describe('CommunityDetailView', () => {
  it('renders the complete article, comments, replies, related posts, and generic authors', () => {
    const { markup } = renderWithStyles()

    expect(markup).toContain('data-community-article="true"')
    expect(markup).toContain('data-community-region-sidebar="true"')
    expect(markup).toContain(detail.title)
    expect(markup).toContain(detail.content)
    expect(markup).toContain('서울 전체')
    expect(markup).toContain(`조회 ${detail.viewCount}`)
    expect(markup).toContain(comments[0]!.content)
    expect(markup).toContain(comments[0]!.replies[0]!.content)
    expect(markup).toContain(relatedPosts[0]!.title)
    expect(markup.match(/사장님/g)?.length).toBeGreaterThanOrEqual(4)
    expect(markup).not.toContain('프로필')
    expect(markup).not.toContain('닉네임')
  })

  it('renders like, reply, delete/report actions without any comment edit action and keeps unknown likes neutral', () => {
    const { markup } = renderWithStyles({
      viewer: { authenticated: true, memberId: String(detail.memberId) },
      editHref: `/community/register?postId=${detail.postId}&mock=1`,
    })

    expect(markup).toContain('aria-label="게시글 좋아요')
    expect(markup).toContain('aria-pressed="false"')
    expect(markup).toContain('답글 쓰기')
    expect(markup).toContain('댓글 삭제')
    expect(markup).toContain('댓글 신고')
    expect(markup).toContain('게시글 신고')
    expect(markup).toContain('>수정</a>')
    expect(markup).toContain('게시글 삭제')
    expect(markup).not.toContain('댓글 수정')
  })

  it('hides owner-only article controls from non-owners', () => {
    const { markup } = renderWithStyles()

    expect(markup).not.toContain('>수정</a>')
    expect(markup).not.toContain('게시글 삭제')
  })

  it('disables the destructive article action while deletion is pending', () => {
    const { markup } = renderWithStyles({
      viewer: { authenticated: true, memberId: String(detail.memberId) },
      editHref: `/community/register?postId=${detail.postId}&mock=1`,
      postDeletePending: true,
    })

    expect(markup).toContain('aria-label="게시글 삭제"')
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('>삭제 중</button>')
  })

  it('uses a single-column base layout and switches to a main plus 300px sidebar at 768px', () => {
    const { styles } = renderWithStyles()

    expect(styles).toMatch(/display:grid/)
    expect(styles).toMatch(/@media \(min-width:\s*768px\)/)
    expect(styles).toMatch(
      /grid-template-columns:minmax\(0,\s*1fr\)\s+(?:minmax\(260px,\s*)?300px/,
    )
    expect(styles).toContain('var(--radius-card)')
  })

  it('renders adjacent links after comments with preserved from and mock query parameters', () => {
    const { markup } = renderWithStyles()
    const expectedFrom = encodeURIComponent(contextKey)

    expect(markup.indexOf(comments[0]!.content)).toBeLessThan(
      markup.indexOf('이전 운영 이야기'),
    )
    expect(markup).toContain(
      `href="/community/8?from=${expectedFrom}&amp;mock=1"`,
    )
    expect(markup).toContain(
      `href="/community/2?from=${expectedFrom}&amp;mock=1"`,
    )
  })

  it('omits the entire adjacent navigation when adjacent is null', () => {
    const { markup } = renderWithStyles({ adjacent: null })

    expect(markup).not.toContain('data-community-adjacent-navigation')
    expect(markup).not.toContain('이전 운영 이야기')
    expect(markup).not.toContain('다음 운영 이야기')
  })

  it('renders initial loading and retryable article errors through feedback', () => {
    const loading = renderWithStyles({
      status: 'loading',
      detail: null,
    }).markup
    const error = renderWithStyles({
      status: 'error',
      detail: null,
      errorMessage: '게시글을 불러오지 못했어요.',
    }).markup

    expect(loading).toContain('aria-busy="true"')
    expect(loading).toContain('게시글을 불러오는 중이에요')
    expect(error).toContain('role="alert"')
    expect(error).toContain('게시글을 불러오지 못했어요.')
    expect(error).toContain('>다시 시도</button>')
    expect(error).toContain('href="/community/list?mock=1"')
    expect(error).toContain('← 목록으로')
    expect(error).not.toContain('data-community-article="true"')
  })

  it('disables authenticated mutation controls until auth hydration is ready', () => {
    const { markup } = renderWithStyles({
      authReady: false,
      viewer: { authenticated: false, memberId: null },
    })

    expect(markup).toContain(
      'aria-label="게시글 좋아요 4" aria-pressed="false" disabled=""',
    )
    expect(markup).toContain('aria-label="게시글 신고" disabled=""')
    expect(markup).toContain('type="submit" disabled=""')
    expect(markup).toContain('>댓글 등록</button>')
  })

  it('renders a read-only login CTA instead of editable comment fields for real guests', () => {
    const { markup } = renderWithStyles({
      authReady: true,
      mockEnabled: false,
      viewer: { authenticated: false, memberId: null },
    })

    expect(markup).toContain('로그인하고 댓글 남기기')
    expect(markup).toContain('aria-label="로그인하고 댓글 작성"')
    expect(markup).not.toContain('textarea aria-label="댓글 내용"')
    expect(markup).not.toContain('textarea aria-label="답글 내용"')
  })

  it('keeps the article visible when comments fail and isolates related failures to the sidebar', () => {
    const commentsError = renderWithStyles({
      commentsStatus: 'error',
      comments: [],
      commentsErrorMessage: '댓글 요청이 실패했어요.',
    }).markup
    const relatedError = renderWithStyles({
      relatedStatus: 'error',
      relatedPosts: [],
      relatedErrorMessage: '관련 글 요청이 실패했어요.',
    }).markup

    expect(commentsError).toContain('data-community-article="true"')
    expect(commentsError).toContain(detail.title)
    expect(commentsError).toContain('댓글 요청이 실패했어요.')
    expect(relatedError).toContain('data-community-article="true"')
    expect(relatedError).toContain(detail.title)
    expect(relatedError).toContain('data-community-region-sidebar="true"')
    expect(relatedError).toContain('관련 글 요청이 실패했어요.')
  })
})

describe('community detail helpers', () => {
  const detailResponse: CommunityPostDetailResponse = {
    dataHeader: successHeader,
    dataBody: structuredClone(detail),
  }
  const commentsResponse: CommunityCommentsResponse = {
    dataHeader: successHeader,
    dataBody: { comments: structuredClone(comments) },
  }
  const relatedResponse: CommunityPostListResponse = {
    dataHeader: successHeader,
    dataBody: {
      board: null,
      posts: {
        contents: structuredClone(relatedPosts),
        hasNext: false,
      },
    },
  }

  it('compares ownership without number coercion ambiguity', () => {
    expect(
      isCommunityOwner(detail.memberId, {
        authenticated: true,
        memberId: String(detail.memberId),
      }),
    ).toBe(true)
    expect(
      isCommunityOwner(detail.memberId, {
        authenticated: false,
        memberId: String(detail.memberId),
      }),
    ).toBe(false)
  })

  it('validates successful detail, comments, and related envelopes and rejects success=false', () => {
    expect(validateCommunityDetailResponse(detailResponse)).toBe(detailResponse)
    expect(validateCommunityCommentsResponse(commentsResponse)).toBe(
      commentsResponse,
    )
    expect(validateCommunityRelatedResponse(relatedResponse)).toBe(
      relatedResponse,
    )

    const failed = {
      ...detailResponse,
      dataHeader: {
        success: false,
        resultCode: 'FAILED',
        resultMessage: '상세 요청이 거절됐어요.',
      },
    }

    expect(() => validateCommunityDetailResponse(failed)).toThrow(
      CommunityDetailQueryError,
    )
    expect(() => validateCommunityDetailResponse(failed)).toThrow(
      '상세 요청이 거절됐어요.',
    )
  })

  it('creates a latest descending related request only for a complete target', () => {
    expect(createCommunityRelatedParams(detail)).toBeNull()
    expect(
      createCommunityRelatedParams({
        ...detail,
        targetType: {
          code: 'COMMERCIAL',
          name: '상권',
          description: '상권 게시판',
        },
        targetCode: '3110008',
      }),
    ).toEqual({
      sortType: 'LATEST',
      orderType: 'DESC',
      lastPostId: 0,
      lastLikeCount: 0,
      size: 5,
      targetType: 'COMMERCIAL',
      targetCode: '3110008',
    })
  })

  it('updates exact detail and recursive comment like counts without mutating prior cache', () => {
    const postLike: CommunityPostLikeResponse['dataBody'] = {
      postId: detail.postId,
      liked: true,
      likeCount: 11,
    }
    const nextDetail = updateCommunityDetailLikeCache(detailResponse, postLike)
    const replyLike: CommunityCommentLikeBody = {
      commentId: comments[0]!.replies[0]!.commentId,
      liked: true,
      likeCount: 9,
    }
    const nextComments = updateCommunityCommentLikeCache(
      commentsResponse,
      replyLike,
    )

    expect(nextDetail.dataBody.likeCount).toBe(11)
    expect(detailResponse.dataBody.likeCount).not.toBe(11)
    expect(nextComments.dataBody.comments[0]!.replies[0]!.likeCount).toBe(9)
    expect(
      commentsResponse.dataBody.comments[0]!.replies[0]!.likeCount,
    ).not.toBe(9)
  })

  it('uses the latest comment prop count after refetch while retaining only local liked state', () => {
    const initial = getCommunityCommentLikePresentation(
      { ...comments[0]!, likeCount: 3 },
      true,
    )
    const refetched = getCommunityCommentLikePresentation(
      { ...comments[0]!, likeCount: 8 },
      true,
    )

    expect(initial).toEqual({ liked: true, likeCount: 3 })
    expect(refetched).toEqual({ liked: true, likeCount: 8 })
  })

  it('routes guest comment and reply actions to login before draft or validation work', () => {
    const onRequireLogin = vi.fn()
    const onAuthenticated = vi.fn()

    expect(
      requestCommunityCommentAccess({
        authReady: true,
        viewer: { authenticated: false, memberId: null },
        onRequireLogin,
        onAuthenticated,
      }),
    ).toBe('login')
    expect(onRequireLogin).toHaveBeenCalledOnce()
    expect(onAuthenticated).not.toHaveBeenCalled()
  })

  it('updates a matching related summary precisely and invalidates list membership plus current related data', async () => {
    const queryClient = new QueryClient()
    const relatedKey = communityKeys.related('COMMERCIAL', '3110008', false)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const result: CommunityPostLikeResponse['dataBody'] = {
      postId: relatedPosts[0]!.postId,
      liked: true,
      likeCount: 44,
    }

    const nextRelated = updateCommunityRelatedLikeCache(relatedResponse, result)
    await refreshCommunityDetailSummaryCaches({
      queryClient,
      relatedQueryKey: relatedKey,
    })

    expect(nextRelated.dataBody.posts.contents[0]!.likeCount).toBe(44)
    expect(relatedResponse.dataBody.posts.contents[0]!.likeCount).not.toBe(44)
    expect(invalidateSpy).toHaveBeenNthCalledWith(1, {
      queryKey: ['community', 'list'],
    })
    expect(invalidateSpy).toHaveBeenNthCalledWith(2, {
      queryKey: relatedKey,
      exact: true,
    })
  })

  it('reads adjacency only with a nonblank from context and classifies 401 as non-retryable', () => {
    expect(shouldReadCommunityAdjacent(contextKey)).toBe(true)
    expect(shouldReadCommunityAdjacent('  ')).toBe(false)
    expect(shouldReadCommunityAdjacent(null)).toBe(false)

    const unauthorized = {
      isAxiosError: true,
      response: { status: 401 },
    }
    expect(isCommunityDetailUnauthorizedError(unauthorized)).toBe(true)
    expect(shouldRetryCommunityDetailQuery(0, unauthorized)).toBe(false)
    expect(shouldRetryCommunityDetailQuery(0, new Error('offline'))).toBe(true)
    expect(shouldRetryCommunityDetailQuery(2, new Error('offline'))).toBe(false)
  })

  it('cancels and removes only the exact detail context before clearing a 401 session and redirecting', async () => {
    const queryClient = new QueryClient()
    const detailKey = communityKeys.detail(detail.postId, false)
    const commentsKey = communityKeys.comments(detail.postId, false)
    const relatedKey = communityKeys.related('COMMERCIAL', '3110008', false)
    const retainedDetailKey = communityKeys.detail(detail.postId + 1, false)
    const clearSession = vi.fn()
    const navigate = vi.fn()
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries')
    const removeSpy = vi.spyOn(queryClient, 'removeQueries')

    queryClient.setQueryData(detailKey, detailResponse)
    queryClient.setQueryData(commentsKey, commentsResponse)
    queryClient.setQueryData(relatedKey, relatedResponse)
    queryClient.setQueryData(retainedDetailKey, detailResponse)

    await recoverCommunityDetailUnauthorized({
      queryClient,
      queryKeys: [detailKey, commentsKey, relatedKey],
      clearSession,
      navigate,
      currentHref: `/community/${detail.postId}?from=${encodeURIComponent(
        contextKey,
      )}&mock=0`,
    })

    expect(cancelSpy).toHaveBeenCalledTimes(3)
    expect(cancelSpy).toHaveBeenNthCalledWith(1, {
      queryKey: detailKey,
      exact: true,
    })
    expect(cancelSpy).toHaveBeenNthCalledWith(2, {
      queryKey: commentsKey,
      exact: true,
    })
    expect(cancelSpy).toHaveBeenNthCalledWith(3, {
      queryKey: relatedKey,
      exact: true,
    })
    expect(removeSpy).toHaveBeenCalledTimes(3)
    expect(removeSpy).toHaveBeenNthCalledWith(1, {
      queryKey: detailKey,
      exact: true,
    })
    expect(removeSpy).toHaveBeenNthCalledWith(2, {
      queryKey: commentsKey,
      exact: true,
    })
    expect(removeSpy).toHaveBeenNthCalledWith(3, {
      queryKey: relatedKey,
      exact: true,
    })
    expect(queryClient.getQueryData(detailKey)).toBeUndefined()
    expect(queryClient.getQueryData(commentsKey)).toBeUndefined()
    expect(queryClient.getQueryData(relatedKey)).toBeUndefined()
    expect(queryClient.getQueryData(retainedDetailKey)).toBe(detailResponse)
    expect(clearSession).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith(
      `/login?redirect=${encodeURIComponent(
        `/community/${detail.postId}?from=${encodeURIComponent(
          contextKey,
        )}&mock=0`,
      )}`,
    )
    expect(
      Math.max(
        ...removeSpy.mock.invocationCallOrder,
        ...cancelSpy.mock.invocationCallOrder,
      ),
    ).toBeLessThan(clearSession.mock.invocationCallOrder[0]!)
    expect(clearSession.mock.invocationCallOrder[0]).toBeLessThan(
      navigate.mock.invocationCallOrder[0]!,
    )
  })

  it('deduplicates concurrent unauthorized recovery and resets after completion', async () => {
    let resolveRecovery!: () => void
    const recovery = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveRecovery = resolve
        }),
    )
    const recoveryRef: { current: Promise<void> | null } = { current: null }

    const first = startCommunityDetailUnauthorizedRecovery(
      recoveryRef,
      recovery,
    )
    const second = startCommunityDetailUnauthorizedRecovery(
      recoveryRef,
      recovery,
    )

    expect(recovery).toHaveBeenCalledOnce()
    expect(second).toBe(first)
    resolveRecovery()
    await first
    await Promise.resolve()
    expect(recoveryRef.current).toBeNull()

    const third = startCommunityDetailUnauthorizedRecovery(
      recoveryRef,
      async () => {},
    )
    await third
    expect(recoveryRef.current).toBeNull()
  })

  it('cancels and retries public detail queries anonymously once without removing their cache', async () => {
    const queryClient = new QueryClient()
    const detailKey = communityKeys.detail(detail.postId, false)
    const commentsKey = communityKeys.comments(detail.postId, false)
    const relatedKey = communityKeys.related('COMMERCIAL', '3110008', false)
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries')
    const removeSpy = vi.spyOn(queryClient, 'removeQueries')
    const clearSession = vi.fn()
    const refetchDetail = vi.fn(async () => {})
    const refetchComments = vi.fn(async () => {})
    const refetchRelated = vi.fn(async () => {})

    await recoverCommunityPublicQueries({
      queryClient,
      queries: [
        { queryKey: detailKey, refetch: refetchDetail },
        { queryKey: commentsKey, refetch: refetchComments },
        { queryKey: relatedKey, refetch: refetchRelated },
      ],
      clearSession,
    })

    expect(cancelSpy).toHaveBeenCalledTimes(3)
    expect(cancelSpy).toHaveBeenNthCalledWith(1, {
      queryKey: detailKey,
      exact: true,
    })
    expect(cancelSpy).toHaveBeenNthCalledWith(2, {
      queryKey: commentsKey,
      exact: true,
    })
    expect(cancelSpy).toHaveBeenNthCalledWith(3, {
      queryKey: relatedKey,
      exact: true,
    })
    expect(removeSpy).not.toHaveBeenCalled()
    expect(clearSession).toHaveBeenCalledOnce()
    expect(refetchDetail).toHaveBeenCalledOnce()
    expect(refetchComments).toHaveBeenCalledOnce()
    expect(refetchRelated).toHaveBeenCalledOnce()
    expect(Math.max(...cancelSpy.mock.invocationCallOrder)).toBeLessThan(
      clearSession.mock.invocationCallOrder[0]!,
    )
    expect(clearSession.mock.invocationCallOrder[0]).toBeLessThan(
      refetchDetail.mock.invocationCallOrder[0]!,
    )
  })

  it('allows only one public query recovery attempt per detail scope', async () => {
    const recovery = vi.fn(async () => {})
    const recoveryRef = {
      scope: null as string | null,
      attempted: false,
      current: null as Promise<void> | null,
    }

    const first = startCommunityPublicQueryRecovery(
      recoveryRef,
      'post-1',
      recovery,
    )
    const concurrent = startCommunityPublicQueryRecovery(
      recoveryRef,
      'post-1',
      recovery,
    )
    await first
    const repeated = startCommunityPublicQueryRecovery(
      recoveryRef,
      'post-1',
      recovery,
    )

    expect(concurrent).toBe(first)
    expect(repeated).toBeNull()
    expect(recovery).toHaveBeenCalledOnce()

    await startCommunityPublicQueryRecovery(recoveryRef, 'post-2', recovery)
    expect(recovery).toHaveBeenCalledTimes(2)
  })
})
