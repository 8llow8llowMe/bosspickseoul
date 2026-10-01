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
import { getCommunityCommentMenuActions } from '@/lib/community/comment-thread'

// 픽스처는 deepFreeze 로 readonly 다. 목 내부(`createState`)와 같은 방식으로 캐스팅한다.
const detail = structuredClone(
  communityMockFixtures.details[0],
) as CommunityPostDetail
const comments = structuredClone(
  communityMockFixtures.comments.filter(
    comment => comment.postId === detail.postId,
  ),
) as CommunityComment[]
/* 픽스처 첫 글은 대상이 없다. 레일(이 지역 최신 글)은 대상이 있는 글에만 있다. */
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
    const { markup } = renderWithStyles({ detail: districtDetail })

    expect(markup).toContain('data-community-article="true"')
    expect(markup).toContain('data-community-region-sidebar="true"')
    expect(markup).toContain(detail.title)
    expect(markup).toContain(detail.content)
    expect(markup).toContain('강남구 최신 글')
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
    // 2단계: 답글은 「답글 달기」, 삭제·신고는 댓글 행마다 닫힌 더보기(⋯) 안이다(항목은 아래 CommunityMoreMenuActions).
    expect(markup.match(/>답글 달기</g)).toHaveLength(comments.length)
    expect(markup.match(/aria-label="댓글 더보기"/g)).toHaveLength(
      comments.reduce((count, item) => count + 1 + item.replies.length, 0),
    )
    expect(markup).not.toContain('aria-label="댓글 삭제"')
    expect(markup).not.toContain('aria-label="댓글 신고"')
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
    const { styles } = renderWithStyles({ detail: districtDetail })

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
    // 입력칸은 접힌 한 줄이고(등록 버튼은 펼칠 때 나온다) 인증 준비 전에는 잠겨 있다.
    expect(markup).toMatch(
      /<textarea[^>]*aria-label="댓글 내용"[^>]*disabled=""/,
    )
    expect(markup).toMatch(/aria-label="댓글 좋아요 [^"]*"[^>]*disabled=""/)
    expect(markup).not.toContain('로그인하고 댓글 남기기')
  })

  it('renders a read-only login CTA instead of editable comment fields for real guests', () => {
    const { markup } = renderWithStyles({
      authReady: true,
      mockEnabled: false,
      viewer: { authenticated: false, memberId: null },
    })

    // 접근 가능한 이름은 보이는 글자 그대로다(WCAG 2.5.3 — 예전 aria-label 「…작성」은 글자와 달랐다).
    expect(markup).toMatch(/<button[^>]*>로그인하고 댓글 남기기<\/button>/)
    expect(markup).not.toContain('aria-label="로그인하고 댓글')
    expect(markup).not.toContain('textarea aria-label="댓글 내용"')
    expect(markup).not.toContain('textarea aria-label="답글 내용"')
  })

  /*
    반응 바의 「댓글」은 이 data 속성으로 입력 자리를 찾는다. aria-label 문구에 묶으면 문구를
    다듬는 순간 버튼이 조용히 아무것도 안 하게 된다.
  */
  it('marks the comment entry — the root textarea for members, the login CTA for guests', () => {
    const member = renderWithStyles().markup
    const guest = renderWithStyles({
      mockEnabled: false,
      viewer: { authenticated: false, memberId: null },
    }).markup

    expect(member).toMatch(
      /<textarea[^>]*aria-label="댓글 내용"[^>]*data-community-comment-entry="true"/,
    )
    expect(member.match(/data-community-comment-entry=/g)).toHaveLength(1)
    expect(guest).toMatch(
      /<button[^>]*data-community-comment-entry="true"[^>]*>로그인하고 댓글 남기기<\/button>/,
    )
    expect(guest.match(/data-community-comment-entry=/g)).toHaveLength(1)
  })

  it('uses only 16·18·24 icons (DESIGN.md Icon Sizing Scale)', () => {
    const { markup } = renderWithStyles({
      detail: districtDetail,
      editHref: '/community/register?postId=1',
    })
    const sizes = Array.from(markup.matchAll(/<svg[^>]*\swidth="(\d+)"/g)).map(
      match => Number(match[1]),
    )

    expect(sizes.length).toBeGreaterThan(0)
    expect(sizes.filter(size => ![16, 18, 24].includes(size))).toEqual([])
  })

  it('keeps the article visible when comments fail and isolates related failures to the sidebar', () => {
    const commentsError = renderWithStyles({
      commentsStatus: 'error',
      comments: [],
      commentsErrorMessage: '댓글 요청이 실패했어요.',
    }).markup
    const relatedError = renderWithStyles({
      detail: districtDetail,
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
  })

  /*
    대상이 없는 글은 관련 글을 조회하지 않는다(relatedParams=null → relatedStatus 'empty').
    그 'empty' 는 「비었다」가 아니라 「묻지 않았다」라, 레일을 그리면 근거 없이 「서울 전체의 다음
    이야기를 남겨 보세요」를 말하게 된다(community.md §S4 「이 지역 글」).
  */
  /*
    4단계부터 인접 글도 레일에 오른다(「상세 레일 보강」) — 「레일 없음」은 대상도 인접 글도 없을 때다.
    대상 없음 + 인접 글은 아래 「상세 레일 보강」 묶음이 본다.
  */
  it('draws no rail for a post without a target and keeps the read column alone and centered at 1080', () => {
    const { markup, styles } = renderWithStyles({
      relatedStatus: 'empty',
      relatedPosts: [],
      adjacent: null,
    })

    expect(markup).not.toContain('data-community-rail=')
    expect(markup).not.toContain('data-community-region-sidebar')
    expect(markup).not.toContain('최신 글')
    expect(markup).not.toContain('다음 이야기를 남겨 보세요')
    expect(markup).not.toContain('href="/community/register')
    expect(markup).toContain('data-community-layout="single"')
    // 빈 300 칸을 남기지 않는다 — 2열 트랙 자체가 없다.
    expect(styles).not.toMatch(/var\(--w-read\)\)\s+300px/)
    expect(styles).toContain('justify-content:center')
  })

  it('keeps the rail and the two-track grid when the post has a target', () => {
    const { markup, styles } = renderWithStyles({ detail: districtDetail })

    expect(markup).toContain('data-community-layout="with-rail"')
    expect(markup).toContain('data-community-region-sidebar="true"')
    expect(styles).toMatch(/var\(--w-read\)\)\s+300px/)
  })

  /* CM-031 — 레일의 글쓰기는 이 글의 대상으로 지역 칩을 채워 연다(mock 은 끝에 보존). */
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
    expect(mock).toContain(
      'href="/community/register?targetType=DISTRICT&amp;targetCode=11680&amp;targetName=%EA%B0%95%EB%82%A8%EA%B5%AC&amp;mock=1"',
    )
    expect(mock).toContain('>글쓰기</a>')
    expect(mock).not.toContain('같은 지역의 다른 게시글이 아직 없어요')
    expect(real).toContain(
      'href="/community/register?targetType=DISTRICT&amp;targetCode=11680&amp;targetName=%EA%B0%95%EB%82%A8%EA%B5%AC"',
    )
  })
})

describe('CommunityDetailView — 댓글 영역 (개편 2단계)', () => {
  it('댓글이 없으면 별도 카드 없이 스레드 안 한 줄만 적는다', () => {
    const { markup } = renderWithStyles({
      commentsStatus: 'empty',
      comments: [],
    })

    expect(markup).toContain('아직 댓글이 없어요. 첫 댓글을 남겨 보세요.')
    expect(markup.match(/아직 댓글이 없어요/g)).toHaveLength(1)
    expect(markup).not.toContain('첫 댓글로 운영 경험이나 질문을 남겨 보세요.')
    expect(markup).toContain('data-community-comment-entry="true"')
  })

  it('글 작성자 memberId 를 스레드에 넘겨 그 사람의 댓글에 글쓴이 배지를 붙인다(CM-025)', () => {
    const { markup } = renderWithStyles()
    const writerReplies = comments
      .flatMap(item => [item, ...item.replies])
      .filter(item => item.memberId === detail.memberId)

    expect(writerReplies.length).toBeGreaterThan(0)
    expect(markup.match(/data-community-post-writer="true"/g)).toHaveLength(
      writerReplies.length,
    )
  })

  it('목록이 입력칸보다 앞이다(CM-024)', () => {
    const { markup } = renderWithStyles()

    expect(markup.indexOf(comments.at(-1)!.content)).toBeLessThan(
      markup.indexOf('data-community-comment-entry'),
    )
  })

  it('하단 고정 바는 서버 렌더에 없다(폭을 재기 전에는 그리지 않는다)', () => {
    const { markup } = renderWithStyles()

    expect(markup).not.toContain('data-community-bottom-bar')
    expect(markup).not.toContain('댓글을 남겨 보세요</button>')
  })
})

describe('CommunityMoreMenuActions — 댓글', () => {
  const renderCommentActions = (owner: boolean) =>
    renderToStaticMarkup(
      createElement(CommunityMoreMenuActions, {
        variant: 'popover',
        target: 'comment',
        actions: getCommunityCommentMenuActions(owner),
        editHref: null,
        authReady: true,
        deletePending: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onReport: vi.fn(),
      }),
    )

  it('내 댓글은 삭제만 — 이름이 댓글을 가리킨다', () => {
    const markup = renderCommentActions(true)

    expect(markup).toContain('aria-label="댓글 삭제"')
    expect(markup).toContain('data-danger="true"')
    expect(markup).not.toContain('신고')
    expect(markup).not.toContain('수정')
    expect(markup).not.toContain('게시글')
  })

  it('남의 댓글은 신고만', () => {
    const markup = renderCommentActions(false)

    expect(markup).toContain('aria-label="댓글 신고"')
    expect(markup).not.toContain('삭제')
    expect(markup).not.toContain('게시글')
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

  it('draws 18px icons in both the popover and the sheet rows', () => {
    for (const variant of ['popover', 'sheet'] as const) {
      const markup = renderActions({
        variant,
        editHref: '/community/register?postId=1',
      })
      const sizes = Array.from(markup.matchAll(/<svg[^>]*\swidth="(\d+)"/g))

      expect(sizes.map(match => match[1])).toEqual(['18', '18'])
    }
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

  /*
    전역 :focus-visible 링(2px blue500)을 끄고 4px 16% 글로우만 남기면 흰 바탕 대비가 ~1.17:1 이라
    포커스가 보이지 않는다. 테두리가 파랗게 바뀌는 입력칸(DESIGN.md §4 「Focus is one line」)이
    아니면 링을 끄지 않는다 — 이 두 파일에는 그런 입력칸이 없다.
  */
  it.each(sources)(
    '$path 는 포커스 블록에서 전역 링을 끄지 않는다',
    ({ source }) => {
      const focusBlocks = Array.from(
        source.matchAll(/:focus-visible[^{]*\{([^}]*)\}/g),
      ).map(match => match[1])

      expect(focusBlocks.length).toBeGreaterThan(0)
      expect(
        focusBlocks.filter(body => /outline\s*:\s*(none|0)\b/.test(body ?? '')),
      ).toEqual([])
    },
  )

  /*
    반응 바의 「댓글」과 하단 고정 바의 「댓글을 남겨 보세요」는 같은 진입 함수를 쓴다. 선택자는 그 함수
    (lib/community/comment-thread.ts)가 data 속성으로 들고 있다 — 동작은 하단 바 상호작용 테스트가 본다.
  */
  it('댓글로 이동은 aria-label 이 아니라 data 속성으로 입력 자리를 찾는다', () => {
    const lib = readFileSync(
      new URL('../../lib/community/comment-thread.ts', import.meta.url),
      'utf8',
    )

    expect(sources[0]!.source).toContain('focusCommunityCommentEntry(document)')
    expect(lib).toContain("'[data-community-comment-entry]'")
    for (const source of [sources[0]!.source, lib]) {
      expect(source).not.toMatch(/querySelector[^(]*\([^)]*aria-label/)
    }
  })

  it('상세 본문은 파란 글자 토큰을 실제로 쓴다', () => {
    expect(sources[0]!.source).toContain('var(--color-text-primary-on-light)')
  })
})

describe('community-detail-bottom-bar.tsx 소스 — 규칙', () => {
  const source = readFileSync(
    new URL('./community-detail-bottom-bar.tsx', import.meta.url),
    'utf8',
  )

  it('레거시 분기·primary-700 글자·링 끄기를 쓰지 않는다', () => {
    expect(source).not.toMatch(/(max|min)-width:\s*(640|760|768)px/)
    expect(source).not.toMatch(/(?<![-\w])color:\s*var\(--color-primary-700\)/)
    expect(source).not.toMatch(/outline\s*:\s*(none|0)\b/)
    expect(source).toContain('var(--color-text-primary-on-light)')
  })

  it('높이 56 + safe-area, 줄인 모션에서는 slide-up 을 끈다', () => {
    expect(source).toContain('calc(56px + env(safe-area-inset-bottom, 0px))')
    expect(source).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*animation: none;/,
    )
    expect(source).toContain('var(--motion-standard) var(--ease-enter)')
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
    // 목록 레일의 인기 글 ♡ 수도 같은 요약이라 함께 무효화한다(4단계).
    expect(invalidateSpy).toHaveBeenNthCalledWith(2, {
      queryKey: ['community', 'popular'],
    })
    expect(invalidateSpy).toHaveBeenNthCalledWith(3, {
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

/*
  styled-components 클래스는 해시라, 「이 요소에 걸린 규칙」을 보려면 마크업에서 그 요소의 클래스를
  꺼내 스타일 태그에서 찾는다. `attr` 는 요소를 고르는 data 속성 조각이다.
*/
const getElementClasses = (markup: string, attr: string) => {
  const tag = markup.match(new RegExp(`<[a-z]+[^>]*${attr}[^>]*>`))?.[0]
  if (!tag) {
    throw new Error(`요소가 없다: ${attr}`)
  }
  return tag.match(/class="([^"]+)"/)?.[1]?.split(/\s+/) ?? []
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 요소의 클래스 중 하나라도 `media`(없으면 기본) 안에서 `declaration` 을 갖는가. */
const hasRule = (
  styles: string,
  classes: string[],
  declaration: RegExp,
  media?: RegExp,
) =>
  classes.some(name => {
    const rule = `\\.${escapeRegExp(name)}\\{([^}]*)\\}`
    const pattern = media
      ? new RegExp(`${media.source}\\{${rule}`, 'g')
      : new RegExp(`(?<!\\{)${rule}`, 'g')

    return Array.from(styles.matchAll(pattern)).some(match =>
      declaration.test(match[1] ?? ''),
    )
  })

const DESKTOP_MEDIA = /@media \(min-width:\s*1080px\)/
const MOBILE_MEDIA = /@media \(max-width:\s*479px\)/

const imagesOf = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    imageKey: `photo-${index}.png`,
    imageUrl: `https://minio.test/photo-${index}.png`,
    sortOrder: index,
  }))

describe('CommunityDetailView — 사진 보기 (개편 4단계)', () => {
  it('본문 사진마다 크게 보기 버튼으로 감싸고 alt·lazy 는 그대로 둔다', () => {
    const { markup } = renderWithStyles({
      detail: { ...detail, images: imagesOf(3) },
    })

    for (const position of [1, 2, 3]) {
      expect(markup).toMatch(
        new RegExp(
          `<button[^>]*type="button"[^>]*aria-label="첨부 이미지 ${position} 크게 보기"`,
        ),
      )
    }
    expect(markup).toMatch(
      /<img[^>]*src="https:\/\/minio\.test\/photo-1\.png"[^>]*alt="첨부 이미지 2"[^>]*loading="lazy"/,
    )
    // 닫힌 라이트박스는 그리지 않는다.
    expect(markup).not.toContain('사진 크게 보기')
  })

  it('사진 2장 이상이면 <480 에서 가로 scroll-snap 줄(한 장 100%·간격 8)이 되고 ≥480 은 세로 나열이다 (CM-042)', () => {
    const { markup, styles } = renderWithStyles({
      detail: { ...detail, images: imagesOf(3) },
    })
    const strip = getElementClasses(markup, 'data-community-photo-strip="true"')

    expect(hasRule(styles, strip, /display:grid/)).toBe(true)
    expect(hasRule(styles, strip, /grid-auto-flow/)).toBe(false)
    for (const declaration of [
      /grid-auto-flow:column/,
      /grid-auto-columns:100%/,
      /gap:8px/,
      /overflow-x:auto/,
      /scroll-snap-type:x mandatory/,
    ]) {
      expect(hasRule(styles, strip, declaration, MOBILE_MEDIA)).toBe(true)
    }
    expect(styles).toMatch(/scroll-snap-align:start/)
  })

  it('점은 사진 수만큼, 스크린리더에는 n / 전체 로 알리고 ≥480 에서는 통째로 숨는다', () => {
    const { markup, styles } = renderWithStyles({
      detail: { ...detail, images: imagesOf(3) },
    })

    expect(markup.match(/data-community-photo-dot="true"/g)).toHaveLength(3)
    expect(markup).toMatch(
      /<[a-z]+[^>]*aria-hidden="true"[^>]*>(<span[^>]*data-community-photo-dot="true"[^>]*><\/span>){3}/,
    )
    expect(markup).toMatch(/data-community-photo-position="true"[^>]*>1 \/ 3</)
    const indicator = getElementClasses(
      markup,
      'data-community-photo-indicator="true"',
    )
    expect(hasRule(styles, indicator, /display:none/)).toBe(true)
    expect(hasRule(styles, indicator, /display:flex/, MOBILE_MEDIA)).toBe(true)
  })

  it('사진이 한 장이면 줄도 점도 없이 세로 그대로다', () => {
    const { markup } = renderWithStyles({
      detail: { ...detail, images: imagesOf(1) },
    })

    expect(markup).toContain('aria-label="첨부 이미지 1 크게 보기"')
    expect(markup).not.toContain('data-community-photo-strip')
    expect(markup).not.toContain('data-community-photo-dot')
    expect(markup).not.toContain('data-community-photo-indicator')
  })
})

describe('CommunityDetailView — 상세 레일 보강 (개편 4단계)', () => {
  it('≥1080 레일 맨 위에 이전 글 · 다음 글을 두고 지역 최신 글은 그 아래다', () => {
    const { markup } = renderWithStyles({ detail: districtDetail })
    const expectedFrom = encodeURIComponent(contextKey)
    const railStart = markup.indexOf('data-community-rail="true"')
    const railAdjacent = markup.indexOf('data-community-rail-adjacent="true"')
    const region = markup.indexOf('data-community-region-sidebar="true"')

    expect(railStart).toBeGreaterThan(-1)
    expect(railStart).toBeLessThan(railAdjacent)
    expect(railAdjacent).toBeLessThan(region)

    const railMarkup = markup.slice(railAdjacent, region)
    expect(railMarkup).toContain('이전 글')
    expect(railMarkup).toContain('이전 운영 이야기')
    expect(railMarkup).toContain('다음 글')
    expect(railMarkup).toContain('다음 운영 이야기')
    expect(railMarkup).toContain(
      `href="/community/8?from=${expectedFrom}&amp;mock=1"`,
    )
    expect(railMarkup).toContain(
      `href="/community/2?from=${expectedFrom}&amp;mock=1"`,
    )
  })

  it('레일 인접 글은 ≥1080 에서만, 본문 아래 인접 글 묶음은 ≥1080 에서 display:none 이다', () => {
    const { markup, styles } = renderWithStyles({ detail: districtDetail })
    const body = getElementClasses(
      markup,
      'data-community-adjacent-navigation="true"',
    )
    const rail = getElementClasses(
      markup,
      'data-community-rail-adjacent="true"',
    )

    expect(hasRule(styles, body, /display:none/, DESKTOP_MEDIA)).toBe(true)
    expect(hasRule(styles, body, /display:none/)).toBe(false)
    expect(hasRule(styles, rail, /display:none/)).toBe(true)
    expect(hasRule(styles, rail, /display:block/, DESKTOP_MEDIA)).toBe(true)
    // sticky 는 레일 묶음 전체에 건다 — 인접 글과 지역 글이 따로 붙지 않게.
    const column = getElementClasses(markup, 'data-community-rail="true"')
    expect(hasRule(styles, column, /position:sticky/, DESKTOP_MEDIA)).toBe(true)
  })

  it('낮은 화면에서도 sticky 레일 끝까지 닿도록 ≥1080 에서만 레일 칸 높이를 화면에 묶고 안에서 스크롤한다', () => {
    const { markup, styles } = renderWithStyles({ detail: districtDetail })
    const column = getElementClasses(markup, 'data-community-rail="true"')

    // 헤더 64 + 위 24(sticky top 88) + 아래 여백 24 를 뺀 높이.
    expect(
      hasRule(
        styles,
        column,
        /max-height:calc\(100dvh - 88px - 24px\)/,
        DESKTOP_MEDIA,
      ),
    ).toBe(true)
    expect(hasRule(styles, column, /overflow-y:auto/, DESKTOP_MEDIA)).toBe(true)
    expect(
      hasRule(styles, column, /overscroll-behavior:contain/, DESKTOP_MEDIA),
    ).toBe(true)
    // <1080 은 레일 내용이 댓글 뒤로 흐른다 — 높이를 묶지 않는다.
    expect(hasRule(styles, column, /max-height/)).toBe(false)
    expect(hasRule(styles, column, /overflow-y/)).toBe(false)
  })

  it('대상 없는 글도 인접 글이 있으면 레일(인접 글만)을 그리고, <1080 에서는 레일 칸째 숨긴다', () => {
    const { markup, styles } = renderWithStyles({
      relatedStatus: 'empty',
      relatedPosts: [],
    })

    expect(markup).toContain('data-community-layout="with-rail"')
    expect(markup).toContain('data-community-rail-adjacent="true"')
    // 지역 묶음은 대상이 있을 때만이다(1단계 리뷰 규칙).
    expect(markup).not.toContain('data-community-region-sidebar')
    expect(markup).not.toContain('최신 글')
    expect(markup).not.toContain('다음 이야기를 남겨 보세요')
    expect(styles).toMatch(/var\(--w-read\)\)\s+300px/)

    const column = getElementClasses(markup, 'data-community-rail="true"')
    expect(hasRule(styles, column, /display:none/)).toBe(true)
    expect(hasRule(styles, column, /display:grid/, DESKTOP_MEDIA)).toBe(true)
  })

  it('대상이 있으면 레일 칸은 <1080 에서도 보인다(지역 글이 댓글 뒤에 온다)', () => {
    const { markup, styles } = renderWithStyles({ detail: districtDetail })
    const column = getElementClasses(markup, 'data-community-rail="true"')

    expect(hasRule(styles, column, /display:none/)).toBe(false)
  })

  it('인접 글이 있어도 이전·다음이 둘 다 비면 레일에 올리지 않는다', () => {
    const { markup } = renderWithStyles({
      relatedStatus: 'empty',
      relatedPosts: [],
      adjacent: {
        currentPostId: detail.postId,
        contextKey,
        previous: null,
        next: null,
      },
    })

    expect(markup).not.toContain('data-community-rail-adjacent')
    expect(markup).toContain('data-community-layout="single"')
  })
})

describe('community-image-lightbox.tsx 소스 — 규칙', () => {
  const source = readFileSync(
    new URL('./community-image-lightbox.tsx', import.meta.url),
    'utf8',
  )

  it('레거시 분기·글로우·링 끄기·새 색 리터럴을 쓰지 않는다', () => {
    expect(source).not.toMatch(/(max|min)-width:\s*(640|760|768)px/)
    expect(source).not.toMatch(/--shadow-focus-primary/)
    expect(source).not.toMatch(
      /:focus-visible[^{]*\{[^}]*outline\s*:\s*(none|0)\b/,
    )
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
    expect(source).toContain('var(--color-overlay)')
  })

  it('시트·다이얼로그 층(1000) 이상이고 줄인 모션에서는 전환을 끈다', () => {
    const zIndex = Number(source.match(/z-index:\s*(\d+)/)?.[1])
    expect(zIndex).toBeGreaterThanOrEqual(1000)
    expect(zIndex).toBeLessThan(1200)
    expect(
      source.match(
        /@media \(prefers-reduced-motion: reduce\)\s*\{\s*animation: none;/g,
      ),
    ).toHaveLength(2)
  })

  it('포커스 가두기는 시트·신고와 같은 dialog-focus 를 쓴다', () => {
    expect(source).toContain("from '@/lib/community/dialog-focus'")
    expect(source).toContain("from '@/lib/community/photo-viewer'")
  })
})
