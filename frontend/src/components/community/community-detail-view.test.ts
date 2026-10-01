import { readFileSync } from 'node:fs'
import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatCommunityDate } from '@/lib/community'

import { communityMockFixtures } from '@/lib/community/community-mock'
import { communityKeys } from '@/lib/community/community-state'
import type {
  CommunityComment,
  CommunityCommentLikeBody,
  CommunityCommentsResponse,
  CommunityPostDetail,
  CommunityPostDetailResponse,
  CommunityPostLikeResponse,
  CommunityPostListResponse,
  CommunityPostSummary,
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
import { CommunityMoreMenuActions } from './community-more-menu'

// 픽스처는 deepFreeze 로 readonly 다. 목 내부(`createState`)와 같은 방식으로 캐스팅한다.
const detail = structuredClone(
  communityMockFixtures.details[0],
) as CommunityPostDetail
const comments = structuredClone(
  communityMockFixtures.comments.filter(
    comment => comment.postId === detail.postId,
  ),
) as CommunityComment[]
const relatedPosts = structuredClone(
  communityMockFixtures.posts.slice(1, 4),
) as CommunityPostSummary[]
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
    previous: { postId: '8', title: '이전 운영 이야기' },
    next: { postId: '2', title: '다음 운영 이야기' },
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
  it('renders the complete article, comments, replies, related posts, and writer nicknames', () => {
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
    // 글·댓글·답글 작성자는 응답의 닉네임이다. 탈퇴 회원의 "탈퇴회원" 도 값이라 그대로 적는다.
    expect(markup).toContain('역삼동 김사장')
    expect(markup).toContain('연남동 소품샵')
    expect(markup).toContain('탈퇴회원')
    // 1 (글) + 3 (댓글 2 · 답글 1)
    expect(markup.match(/data-community-writer="true"/g)).toHaveLength(4)
    expect(markup).not.toContain('프로필')
    expect(markup).not.toContain('닉네임')
  })

  /*
   * `writerNickname` 이 null 인 경우는 회원 서비스 장애·미존재 회원 두 가지다(BE #271).
   * 응답 자체는 성공이므로 글은 그대로 보이고 작성자만 대체 문구로 채운다.
   */
  it('falls back to a generic writer when the nickname is null', () => {
    const { markup } = renderWithStyles({
      detail: {
        ...detail,
        writerNickname: null,
        writerProfileImageUrl: null,
      },
      comments: comments.map(comment => ({
        ...comment,
        writerNickname: null,
        replies: comment.replies.map(reply => ({
          ...reply,
          writerNickname: null,
        })),
      })),
    })

    expect(markup).toContain(detail.title)
    expect(markup).not.toContain('역삼동 김사장')
    expect(markup).not.toContain('연남동 소품샵')
    expect(markup.match(/>사장님</g)).toHaveLength(4)
  })

  it('renders like, comment and share in the reaction bar, comment actions without edit, and keeps unknown likes neutral', () => {
    const { markup } = renderWithStyles({
      viewer: { authenticated: true, memberId: String(detail.memberId) },
      editHref: `/community/register?postId=${detail.postId}&mock=1`,
    })

    expect(markup).toContain('aria-label="게시글 반응"')
    expect(markup).toContain('aria-label="게시글 좋아요')
    expect(markup).toContain('aria-pressed="false"')
    expect(markup).toContain('aria-label="댓글로 이동"')
    expect(markup).toContain('aria-label="게시글 공유"')
    expect(markup).toContain('>공유</span>')
    expect(markup).toContain('답글 쓰기')
    expect(markup).toContain('댓글 삭제')
    expect(markup).toContain('댓글 신고')
    expect(markup).not.toContain('댓글 수정')
    // 수정·삭제·신고는 더보기(⋯) 안으로 들어갔다 — 닫힌 채로는 그리지 않는다.
    expect(markup).not.toContain('aria-label="게시글 삭제"')
    expect(markup).not.toContain('aria-label="게시글 신고"')
  })

  it('renders the head row with a list link and a closed more button', () => {
    const { markup } = renderWithStyles()

    expect(markup).toContain('href="/community/list?mock=1"')
    expect(markup).toContain('>목록</span>')
    expect(markup).not.toContain('목록으로')
    expect(markup).toContain('aria-label="게시글 더보기"')
    expect(markup).toContain('aria-haspopup="menu"')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup.indexOf('>목록</span>')).toBeLessThan(
      markup.indexOf('aria-label="게시글 더보기"'),
    )
    expect(markup.indexOf('aria-label="게시글 더보기"')).toBeLessThan(
      markup.indexOf(detail.title),
    )
  })

  it('disables the more button while the post is being deleted', () => {
    const { markup } = renderWithStyles({
      viewer: { authenticated: true, memberId: String(detail.memberId) },
      editHref: `/community/register?postId=${detail.postId}&mock=1`,
      postDeletePending: true,
    })

    expect(markup).toMatch(
      /aria-label="게시글 더보기"[^>]*aria-busy="true"[^>]*disabled=""/,
    )
  })

  it('fills the heart and marks the like pressed when the viewer liked the post', () => {
    const liked = renderWithStyles({ postLiked: true }).markup
    const neutral = renderWithStyles({ postLiked: null }).markup

    expect(liked).toContain('aria-pressed="true"')
    expect(liked).toMatch(/data-liked="true"[^]*?fill="currentColor"/)
    expect(neutral).toContain('data-liked="false"')
    expect(neutral).not.toContain('fill="currentColor"')
  })

  it('keeps the like label steady while pending — aria-busy and disabled instead of 처리 중', () => {
    const { markup } = renderWithStyles({ postLikePending: true })

    expect(markup).not.toContain('처리 중')
    expect(markup).toMatch(
      /aria-label="게시글 좋아요 4"[^>]*aria-busy="true"[^>]*disabled=""/,
    )
    expect(markup).toContain('>좋아요</span>')
  })

  it('centers the read column and the 300px rail together at 1080 and makes the rail sticky only there', () => {
    const { styles } = renderWithStyles()

    expect(styles).toMatch(/display:grid/)
    expect(styles).toContain('justify-content:center')
    expect(styles).toMatch(
      /@media \(min-width:\s*1080px\)\{[^}]*grid-template-columns:minmax\(0,\s*var\(--w-read\)\)\s+300px/,
    )
    // CM-020 — 본문과 레일 사이 간격 24 이하
    expect(styles).toMatch(
      /@media \(min-width:\s*1080px\)\{[^}]*column-gap:24px/,
    )
    expect(styles).toMatch(
      /@media \(min-width:\s*1080px\)\{[^}]*position:sticky/,
    )
    expect(styles).not.toMatch(/minmax\(0,\s*1fr\)\s+300px/)
    expect(styles).toContain('var(--radius-card)')
  })

  it('puts the article on the page background and separates comments with an 8px grey50 band', () => {
    const { markup, styles } = renderWithStyles()

    expect(markup).toContain('data-community-section-band="true"')
    expect(markup.indexOf('data-community-section-band="true"')).toBeLessThan(
      markup.indexOf(comments[0]!.content),
    )
    expect(styles).toMatch(
      /height:8px;[^}]*background:var\(--color-background-muted\)/,
    )
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
    expect(error).toContain('>목록</span>')
    expect(error).not.toContain('data-community-article="true"')
  })

  it('disables authenticated mutation controls until auth hydration is ready', () => {
    const { markup } = renderWithStyles({
      authReady: false,
      viewer: { authenticated: false, memberId: null },
    })

    expect(markup).toMatch(
      /aria-label="게시글 좋아요 4" aria-pressed="false"[^>]*disabled=""/,
    )
    // 공유는 로그인이 필요 없어 인증 준비 전에도 누를 수 있다.
    expect(markup).not.toMatch(/aria-label="게시글 공유"[^>]*disabled=""/)
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

describe('CommunityDetailView — 머리·메타·지역 (개편 1단계)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const districtDetail: CommunityPostDetail = {
    ...detail,
    targetType: {
      code: 'DISTRICT',
      name: '자치구',
      description: '자치구 게시판',
    },
    targetCode: '11680',
    targetName: '강남구',
  }

  it('writes the date once — relative time in the text, absolute date only in the time title (CM-023)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(
      new Date(new Date(detail.createdAt).getTime() + 3 * 3600_000),
    )

    const { markup } = renderWithStyles()
    const absolute = formatCommunityDate(detail.createdAt)

    expect(markup).toContain(
      `<time dateTime="${detail.createdAt}" title="${absolute}">3시간 전</time>`,
    )
    // 글 머리 안에서 절대 날짜는 title 한 번뿐이다(댓글 날짜는 2단계 범위라 세지 않는다).
    const article = markup.slice(
      markup.indexOf('data-community-article="true"'),
      markup.indexOf('</article>'),
    )
    expect(article.split(absolute)).toHaveLength(2)
    expect(article).not.toContain('날짜 정보 없음')
    expect(markup).toContain(`조회 ${detail.viewCount}`)
    expect(markup).not.toContain('수정됨')
  })

  it('adds 수정됨 only when updatedAt is more than a minute after createdAt', () => {
    const edited = renderWithStyles({
      detail: {
        ...detail,
        updatedAt: new Date(
          new Date(detail.createdAt).getTime() + 2 * 60_000,
        ).toISOString(),
      },
    }).markup
    const savedLate = renderWithStyles({
      detail: {
        ...detail,
        updatedAt: new Date(
          new Date(detail.createdAt).getTime() + 30_000,
        ).toISOString(),
      },
    }).markup

    expect(edited).toContain('수정됨')
    expect(savedLate).not.toContain('수정됨')
  })

  it('links the region chip to that region list while keeping mock', () => {
    const { markup } = renderWithStyles({ detail: districtDetail })

    expect(markup).toContain(
      'href="/community/list?targetType=DISTRICT&amp;targetCode=11680&amp;mock=1"',
    )
    expect(markup).toContain('data-community-region-chip="link"')
    expect(markup).toContain('강남구 최신 글')
    expect(markup).not.toContain('현재 지역')
  })

  it('keeps the code on the chip but never in the rail title when the target has no name', () => {
    const { markup } = renderWithStyles({
      detail: { ...districtDetail, targetName: null },
      relatedStatus: 'empty',
      relatedPosts: [],
    })

    expect(markup).toMatch(
      /data-community-region-chip="link"[^>]*><span>11680<\/span>/,
    )
    expect(markup).toContain('이 지역 최신 글')
    expect(markup).toContain('이 지역의 다음 이야기를 남겨 보세요')
    expect(markup).not.toContain('11680 최신 글')
  })

  it('drops mock from the region chip outside mock mode', () => {
    const { markup } = renderWithStyles({
      detail: districtDetail,
      mockEnabled: false,
    })

    expect(markup).toContain(
      'href="/community/list?targetType=DISTRICT&amp;targetCode=11680"',
    )
  })

  it('renders 서울 전체 as a plain label when the post has no target', () => {
    const { markup } = renderWithStyles()

    expect(markup).toContain('data-community-region-chip="label"')
    expect(markup).not.toContain('data-community-region-chip="link"')
    expect(markup).not.toContain('href="/community/list?targetType')
    expect(markup).toContain('서울 전체 최신 글')
  })

  it('turns an empty rail into a write prompt for that region', () => {
    const mock = renderWithStyles({
      detail: districtDetail,
      relatedStatus: 'empty',
      relatedPosts: [],
    }).markup
    const real = renderWithStyles({
      detail: districtDetail,
      relatedStatus: 'empty',
      relatedPosts: [],
      mockEnabled: false,
    }).markup

    expect(mock).toContain('강남구의 다음 이야기를 남겨 보세요')
    expect(mock).toContain('href="/community/register?mock=1"')
    expect(mock).toContain('>글쓰기</a>')
    expect(mock).not.toContain('같은 지역의 다른 게시글이 아직 없어요')
    expect(real).toContain('href="/community/register"')
  })
})

describe('CommunityMoreMenuActions (CM-022)', () => {
  const renderActions = (
    overrides: Partial<ComponentProps<typeof CommunityMoreMenuActions>> = {},
  ) =>
    renderToStaticMarkup(
      createElement(CommunityMoreMenuActions, {
        variant: 'popover',
        editHref: null,
        authReady: true,
        deletePending: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onReport: vi.fn(),
        ...overrides,
      }),
    )

  it('offers only 신고 on someone else post', () => {
    const markup = renderActions()

    expect(markup).toContain('aria-label="게시글 신고"')
    expect(markup).toContain('>신고</span>')
    expect(markup).not.toContain('>수정</span>')
    expect(markup).not.toContain('aria-label="게시글 삭제"')
    expect(markup).toContain('role="menuitem"')
  })

  it('offers only 수정 and 삭제 on my post', () => {
    const editHref = `/community/register?postId=${detail.postId}&mock=1`
    const markup = renderActions({ editHref })

    expect(markup).toContain(
      `href="/community/register?postId=${detail.postId}&amp;mock=1"`,
    )
    expect(markup).toContain('>수정</span>')
    expect(markup).toContain('aria-label="게시글 삭제"')
    expect(markup).toContain('data-danger="true"')
    expect(markup).not.toContain('aria-label="게시글 신고"')
  })

  it('disables delete with 삭제 중 while pending and report until auth is ready', () => {
    const deleting = renderActions({
      editHref: '/community/register?postId=1',
      deletePending: true,
    })
    const hydrating = renderActions({ authReady: false })

    expect(deleting).toMatch(/aria-label="게시글 삭제"[^>]*disabled=""/)
    expect(deleting).toContain('>삭제 중</span>')
    expect(hydrating).toMatch(/aria-label="게시글 신고"[^>]*disabled=""/)
  })

  it('uses plain buttons inside the mobile sheet instead of menu roles', () => {
    const markup = renderActions({ variant: 'sheet' })

    expect(markup).toContain('aria-label="게시글 신고"')
    expect(markup).not.toContain('role="menuitem"')
  })
})

describe('community detail sources — 1단계 규칙', () => {
  const sources = [
    './community-detail-view.tsx',
    './community-more-menu.tsx',
  ].map(path => ({
    path,
    source: readFileSync(new URL(path, import.meta.url), 'utf8'),
  }))

  it.each(sources)(
    '$path 는 레거시 640·760·768 분기를 쓰지 않는다',
    ({ source }) => {
      expect(source).not.toMatch(/(max|min)-width:\s*(640|760|768)px/)
    },
  )

  it.each(sources)(
    '$path 는 파란 글자에 primary-700 대신 text-primary-on-light 를 쓴다',
    ({ source }) => {
      expect(source).not.toMatch(
        /(?<![-\w])color:\s*var\(--color-primary-700\)/,
      )
    },
  )

  it('상세 본문은 파란 글자 토큰을 실제로 쓴다', () => {
    expect(sources[0]!.source).toContain('var(--color-text-primary-on-light)')
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
      lastPostId: '0',
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

describe('CommunityDetailView — 첨부 이미지', () => {
  it('첨부가 없으면 이미지 영역을 그리지 않는다', () => {
    const { markup } = renderWithStyles()

    expect(markup).not.toContain('첨부 이미지 1')
  })

  it('첨부를 sortOrder 순서대로 그린다', () => {
    const { markup } = renderWithStyles({
      detail: {
        ...detail,
        images: [
          {
            imageKey: 'b.png',
            imageUrl: 'https://minio.test/b.png',
            sortOrder: 1,
          },
          {
            imageKey: 'a.png',
            imageUrl: 'https://minio.test/a.png',
            sortOrder: 0,
          },
        ],
      },
    })

    expect(markup.indexOf('https://minio.test/a.png')).toBeLessThan(
      markup.indexOf('https://minio.test/b.png'),
    )
    expect(markup).toContain('첨부 이미지 1')
    expect(markup).toContain('첨부 이미지 2')
  })
})
