import { readFileSync } from 'node:fs'
import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatCommunityDate } from '@/lib/community'
import type { CommunityComment, CommunityReply } from '@/types/community'

import CommunityCommentThread from './community-comment-thread'

/*
  댓글 영역의 마크업 계약(community.md §S4 「개편 2단계 — 댓글」, CM-024~026).
  펼침·접기·메뉴 열기 같은 상호작용은 community-comment-thread.interaction.test.ts 가 본다.
*/

const POST_WRITER_ID = '9001'
const CREATED = '2026-07-27T08:35:00.000Z'
const LATER = (minutes: number) =>
  new Date(new Date(CREATED).getTime() + minutes * 60_000).toISOString()

const reply = (id: string, overrides: Partial<CommunityReply> = {}) =>
  ({
    commentId: id,
    postId: '1',
    memberId: '8200',
    writerNickname: `답글러 ${id}`,
    writerProfileImageUrl: null,
    parentCommentId: '101',
    content: `답글 본문 ${id}`,
    likeCount: 0,
    createdAt: CREATED,
    updatedAt: CREATED,
    ...overrides,
  }) satisfies CommunityReply

const comment = (
  id: string,
  overrides: Partial<CommunityComment> = {},
): CommunityComment => ({
  commentId: id,
  postId: '1',
  memberId: '8101',
  writerNickname: `댓글러 ${id}`,
  writerProfileImageUrl: null,
  content: `댓글 본문 ${id}`,
  likeCount: 3,
  createdAt: CREATED,
  updatedAt: CREATED,
  replies: [],
  ...overrides,
})

const comments: CommunityComment[] = [
  comment('101', {
    replies: [reply('102', { memberId: POST_WRITER_ID })],
  }),
  comment('103', { memberId: '9999' }),
]

type ThreadProps = ComponentProps<typeof CommunityCommentThread>

const baseProps: ThreadProps = {
  comments,
  postWriterId: POST_WRITER_ID,
  viewer: { authenticated: true, memberId: '9999' },
  authReady: true,
  errorMessage: null,
  onRequireLogin: vi.fn(),
  onCreateComment: vi.fn(async () => true),
  onDeleteComment: vi.fn(async () => true),
  onToggleCommentLike: vi.fn(async () => ({
    ok: true,
    liked: true,
    likeCount: 1,
  })),
  onReport: vi.fn(),
}

const renderThread = (overrides: Partial<ThreadProps> = {}) => {
  const sheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(
      sheet.collectStyles(
        createElement(CommunityCommentThread, { ...baseProps, ...overrides }),
      ),
    )
    return { markup, styles: sheet.getStyleTags() }
  } finally {
    sheet.seal()
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('CommunityCommentThread — 순서와 빈 상태', () => {
  it('댓글 N → 목록 → 입력칸 순서다(CM-024)', () => {
    const { markup } = renderThread()
    const title = markup.indexOf('댓글 3</h2>')
    const firstComment = markup.indexOf('댓글 본문 101')
    const lastComment = markup.indexOf('댓글 본문 103')
    const entry = markup.indexOf('data-community-comment-entry')

    expect(title).toBeGreaterThan(-1)
    expect(title).toBeLessThan(firstComment)
    expect(lastComment).toBeLessThan(entry)
  })

  it('비로그인 CTA 도 목록 뒤 그 자리에 둔다', () => {
    const { markup } = renderThread({
      viewer: { authenticated: false, memberId: null },
    })

    expect(markup.indexOf('댓글 본문 103')).toBeLessThan(
      markup.indexOf('로그인하고 댓글 남기기'),
    )
    expect(markup).toMatch(
      /<button[^>]*data-community-comment-entry="true"[^>]*>로그인하고 댓글 남기기<\/button>/,
    )
  })

  it('설명 문구를 두지 않는다', () => {
    const { markup } = renderThread()

    expect(markup).not.toContain('운영 경험과 질문을 나누고')
  })

  it('비었으면 목록 자리에 한 줄만 적고 입력칸은 그대로 둔다', () => {
    const { markup } = renderThread({ comments: [] })

    expect(markup).toContain('댓글 0</h2>')
    expect(markup).toContain('아직 댓글이 없어요. 첫 댓글을 남겨 보세요.')
    expect(markup).not.toContain('<ol')
    expect(markup.indexOf('아직 댓글이 없어요')).toBeLessThan(
      markup.indexOf('data-community-comment-entry'),
    )
  })
})

describe('CommunityCommentThread — 댓글 행', () => {
  it('글 작성자가 쓴 댓글에만 글쓴이 배지를 붙인다(CM-025)', () => {
    const { markup } = renderThread()

    expect(markup.match(/data-community-post-writer="true"/g)).toHaveLength(1)
    const replyRow = markup.slice(
      markup.indexOf('답글러 102'),
      markup.indexOf('답글 본문 102'),
    )
    expect(replyRow).toContain('>글쓴이</span>')
  })

  it('글 작성자를 모르면 배지를 붙이지 않는다', () => {
    const { markup } = renderThread({ postWriterId: null })

    expect(markup).not.toContain('글쓴이')
  })

  it('시간은 상대 시간 한 번이고 절대 날짜는 title 에만 있다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(new Date(CREATED).getTime() + 3 * 3600_000))

    const { markup } = renderThread({ comments: [comment('101')] })
    const absolute = formatCommunityDate(CREATED)

    expect(markup).toContain(
      `<time dateTime="${CREATED}" title="${absolute}">3시간 전</time>`,
    )
    expect(markup.split(absolute)).toHaveLength(2)
    expect(markup).not.toContain('수정됨')
  })

  it('수정됨은 글과 같은 판정(1분 넘게 차이)이다', () => {
    const edited = renderThread({
      comments: [comment('101', { updatedAt: LATER(2) })],
    }).markup
    const savedLate = renderThread({
      comments: [comment('101', { updatedAt: LATER(0.5) })],
    }).markup

    expect(edited).toMatch(/<\/time> · 수정됨/)
    expect(savedLate).not.toContain('수정됨')
  })

  it('삭제·신고는 행마다 닫힌 더보기(⋯) 안에 있다', () => {
    const { markup } = renderThread()

    expect(markup.match(/aria-label="댓글 더보기"/g)).toHaveLength(3)
    expect(markup).not.toContain('aria-label="댓글 삭제"')
    expect(markup).not.toContain('aria-label="댓글 신고"')
    expect(markup).not.toContain('>신고<')
  })

  it('좋아요는 하트 + 수, 답글 달기는 루트 댓글에만 있다', () => {
    const { markup } = renderThread()

    expect(markup).toMatch(
      /aria-label="댓글 좋아요 3" aria-pressed="false"[^>]*>[^]*?<svg[^>]*fill="none"[^]*?>3<\/span>/,
    )
    expect(markup.match(/>답글 달기</g)).toHaveLength(2)
    expect(markup).not.toContain('답글 쓰기')
    expect(markup).not.toContain('처리 중')
  })

  it('행은 카드가 아니라 구분선이고 답글은 작은 아바타로 들여 쓴다', () => {
    const { markup, styles } = renderThread()

    expect(markup.match(/data-community-comment="root"/g)).toHaveLength(2)
    expect(markup.match(/data-community-comment="reply"/g)).toHaveLength(1)
    expect(styles).toContain('border-top:1px solid var(--color-border-200)')
    // 루트는 md(32), 답글은 sm(24) 아바타.
    expect(styles).toMatch(/width:32px;height:32px/)
    expect(styles).toMatch(/width:24px;height:24px/)
    expect(styles).not.toContain('box-shadow:var(--shadow-level-1)')
  })

  it('16·18·24 아이콘만 쓴다', () => {
    const { markup } = renderThread()
    const sizes = Array.from(markup.matchAll(/<svg[^>]*\swidth="(\d+)"/g)).map(
      match => Number(match[1]),
    )

    expect(sizes.length).toBeGreaterThan(0)
    expect(sizes.filter(size => ![16, 18, 24].includes(size))).toEqual([])
  })
})

describe('CommunityCommentThread — 답글 접기(CM-026)', () => {
  it('답글 5개는 앞 3개와 「답글 2개 더 보기」만 그린다', () => {
    const { markup } = renderThread({
      comments: [
        comment('101', {
          replies: ['201', '202', '203', '204', '205'].map(id => reply(id)),
        }),
      ],
    })

    expect(markup).toContain('답글 본문 203')
    expect(markup).not.toContain('답글 본문 204')
    expect(markup).not.toContain('답글 본문 205')
    expect(markup).toMatch(
      /<button[^>]*aria-expanded="false"[^>]*>답글 2개 더 보기<\/button>/,
    )
  })

  it('답글 3개는 접지 않는다', () => {
    const { markup } = renderThread({
      comments: [
        comment('101', {
          replies: ['201', '202', '203'].map(id => reply(id)),
        }),
      ],
    })

    expect(markup).toContain('답글 본문 203')
    expect(markup).not.toContain('더 보기')
  })
})

describe('CommunityCommentThread — 입력칸', () => {
  it('평소에는 한 줄로 접혀 있고 글자 수·등록을 숨긴다', () => {
    const { markup, styles } = renderThread()

    expect(markup).toMatch(
      /<textarea[^>]*aria-label="댓글 내용"[^>]*data-community-comment-entry="true"[^>]*rows="1"/,
    )
    expect(markup).not.toContain('>등록</button>')
    expect(markup).not.toContain('/1,000자')
    expect(styles).toContain('min-height:48px')
  })

  it('인증 준비 전에는 입력칸을 잠근다', () => {
    const { markup } = renderThread({
      authReady: false,
      viewer: { authenticated: false, memberId: null },
    })

    expect(markup).toMatch(
      /<textarea[^>]*aria-label="댓글 내용"[^>]*disabled=""/,
    )
    expect(markup).not.toContain('로그인하고 댓글 남기기')
  })
})

describe('community-comment-thread.tsx 소스 — 레거시 규칙', () => {
  const source = readFileSync(
    new URL('./community-comment-thread.tsx', import.meta.url),
    'utf8',
  )

  it('레거시 640·760·768 분기를 쓰지 않는다', () => {
    expect(source).not.toMatch(/(max|min)-width:\s*(640|760|768)px/)
  })

  it('파란 글자에 primary-700 대신 text-primary-on-light 를 쓴다', () => {
    expect(source).not.toMatch(/(?<![-\w])color:\s*var\(--color-primary-700\)/)
    expect(source).toContain('var(--color-text-primary-on-light)')
  })

  /*
    입력칸(styled.textarea)만 「테두리가 파래지는」 한 줄 포커스라 전역 링을 끈다(DESIGN.md §4
    「Focus is one line」). 그 밖의 버튼이 링을 끄고 글로우만 남기면 흰 바탕에서 안 보인다.
  */
  it('입력칸이 아닌 포커스 블록은 전역 링을 끄지 않는다', () => {
    const withoutFields = source.replace(
      /styled\.textarea(?:<[^>`]*>)?`[^`]*`/g,
      '',
    )
    expect(withoutFields).not.toBe(source)
    const focusBlocks = Array.from(
      withoutFields.matchAll(/:focus-visible[^{]*\{([^}]*)\}/g),
    ).map(match => match[1] ?? '')

    expect(
      focusBlocks.filter(body => /outline\s*:\s*(none|0)\b/.test(body)),
    ).toEqual([])
    expect(withoutFields).not.toContain('--shadow-focus-primary-strong')
  })
})
