// @vitest-environment jsdom
import { createElement, type ComponentProps } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CommunityCommentThread from '@/components/community/community-comment-thread'
import type { CommunityComment, CommunityReply } from '@/types/community'

/*
  댓글 영역의 상호작용 계약(community.md §S4 「개편 2단계 — 댓글」, CM-026)을 실제 DOM 에서 잠근다.
  마크업 계약은 community-comment-thread.test.ts.

  댓글 더보기는 글 더보기와 같은 메뉴다 — 폭 판정 `matchMedia('(max-width: 479px)')` 를
  스텁한다(false = 팝오버).
*/

const stubMatchMedia = (matches: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

const flushFrames = async (count = 2) => {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    })
  }
}

const CREATED = '2026-07-27T08:35:00.000Z'

const reply = (id: string): CommunityReply => ({
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
})

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

type ThreadProps = ComponentProps<typeof CommunityCommentThread>

const renderThread = (overrides: Partial<ThreadProps> = {}) => {
  const props: ThreadProps = {
    comments: [comment('101')],
    postWriterId: '9001',
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
    ...overrides,
  }

  return { ...render(createElement(CommunityCommentThread, props)), props }
}

const getTextArea = () => {
  const textarea = document.body.querySelector<HTMLTextAreaElement>(
    'textarea[aria-label="댓글 내용"]',
  )
  if (!textarea) {
    throw new Error('댓글 입력칸이 없다')
  }
  return textarea
}

const findButton = (text: string) =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(
    button => button.textContent?.trim() === text,
  ) ?? null

describe('댓글 입력칸 접힘·펼침', () => {
  it('포커스하면 3줄로 펼치고 글자 수·등록을 보이며, 비어 있는 채로 벗어나면 다시 접는다', () => {
    renderThread()
    const textarea = getTextArea()

    expect(textarea.rows).toBe(1)
    expect(findButton('등록')).toBeNull()

    fireEvent.focus(textarea)
    expect(textarea.rows).toBe(3)
    expect(findButton('등록')).not.toBeNull()
    expect(document.body.textContent).toContain('0/1,000자')

    fireEvent.blur(textarea)
    expect(textarea.rows).toBe(1)
    expect(findButton('등록')).toBeNull()
  })

  it('내용이 있으면 벗어나도 펼친 채로 둔다', () => {
    renderThread()
    const textarea = getTextArea()

    fireEvent.focus(textarea)
    fireEvent.change(textarea, { target: { value: '좋은 글이에요' } })
    fireEvent.blur(textarea)

    expect(textarea.rows).toBe(3)
    expect(findButton('등록')).not.toBeNull()
  })

  it('입력칸에서 등록 버튼으로 옮겨 가는 동안은 접지 않는다', () => {
    renderThread()
    const textarea = getTextArea()

    fireEvent.focus(textarea)
    const submit = findButton('등록')!
    fireEvent.blur(textarea, { relatedTarget: submit })

    expect(findButton('등록')).toBe(submit)
  })
})

describe('답글 접기(CM-026)', () => {
  it('답글 5개는 3개만 보이고 「답글 2개 더 보기」를 누르면 5개가 되며 포커스는 버튼에 남는다', () => {
    renderThread({
      comments: [
        comment('101', {
          replies: ['201', '202', '203', '204', '205'].map(reply),
        }),
      ],
    })

    const countReplies = () =>
      document.body.querySelectorAll('[data-community-comment="reply"]').length

    expect(countReplies()).toBe(3)

    const more = findButton('답글 2개 더 보기')!
    more.focus()
    fireEvent.click(more)

    expect(countReplies()).toBe(5)
    expect(document.body.textContent).toContain('답글 본문 205')
    expect(more.textContent).toBe('답글 접기')
    expect(more.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(more)

    fireEvent.click(more)
    expect(countReplies()).toBe(3)
  })

  it('접힌 댓글에 답글을 달면 방금 쓴 답글이 보이게 펼친다', async () => {
    const { props } = renderThread({
      comments: [
        comment('101', {
          replies: ['201', '202', '203', '204'].map(reply),
        }),
      ],
    })

    fireEvent.click(findButton('답글 달기')!)
    const replyArea = document.body.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="답글 내용"]',
    )!
    fireEvent.change(replyArea, { target: { value: '저도 궁금해요' } })
    await act(async () => {
      fireEvent.submit(replyArea.form!)
    })

    expect(props.onCreateComment).toHaveBeenCalledWith({
      content: '저도 궁금해요',
      parentCommentId: '101',
    })
    expect(findButton('답글 접기')).not.toBeNull()
  })
})

describe('댓글 더보기 — 글 더보기와 같은 메뉴', () => {
  const openMenu = async (index: number) => {
    const triggers = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        'button[aria-label="댓글 더보기"]',
      ),
    )
    const trigger = triggers[index]!
    trigger.focus()
    fireEvent.click(trigger)
    await flushFrames()
    return trigger
  }

  const menuItems = () =>
    Array.from(
      document.body.querySelectorAll<HTMLElement>(
        '[role="menu"] [role="menuitem"]',
      ),
    ).map(item => item.getAttribute('aria-label'))

  it('내 댓글은 삭제만 — 확인 창 없이 그 댓글을 넘기고(되돌리기는 페이지 몫, #581) 포커스를 댓글 제목에 둔다', async () => {
    stubMatchMedia(false)
    const { props } = renderThread({
      comments: [comment('101', { memberId: '9999' })],
    })

    await openMenu(0)
    expect(menuItems()).toEqual(['댓글 삭제'])
    expect(
      document.body.querySelector('[role="menu"]')?.getAttribute('aria-label'),
    ).toBe('댓글 더보기')

    fireEvent.click(
      document.body.querySelector<HTMLButtonElement>(
        'button[aria-label="댓글 삭제"]',
      )!,
    )
    await flushFrames(4)

    expect(props.onDeleteComment).toHaveBeenCalledWith('101')
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull()
    expect(document.activeElement?.tagName).toBe('H2')
    expect(document.activeElement?.textContent).toBe('댓글 1')
  })

  it('남의 댓글은 신고만 — 신고 대상으로 그 댓글을 넘긴다', async () => {
    stubMatchMedia(false)
    const { props } = renderThread({
      comments: [comment('101'), comment('103', { memberId: '9999' })],
    })

    await openMenu(0)
    expect(menuItems()).toEqual(['댓글 신고'])

    fireEvent.click(
      document.body.querySelector<HTMLButtonElement>(
        'button[aria-label="댓글 신고"]',
      )!,
    )

    expect(props.onReport).toHaveBeenCalledWith({
      targetKind: 'COMMENT',
      targetId: '101',
    })
  })

  it('비로그인이 남의 댓글을 신고하면 로그인으로 보낸다', async () => {
    stubMatchMedia(false)
    const { props } = renderThread({
      viewer: { authenticated: false, memberId: null },
    })

    await openMenu(0)
    fireEvent.click(
      document.body.querySelector<HTMLButtonElement>(
        'button[aria-label="댓글 신고"]',
      )!,
    )

    expect(props.onRequireLogin).toHaveBeenCalledTimes(1)
    expect(props.onReport).not.toHaveBeenCalled()
  })
})

describe('댓글 좋아요 — 누르면 바로 바뀐다(#580)', () => {
  type Outcome = { ok: boolean; liked: boolean | null; likeCount: number }

  const likeButton = () =>
    document.body.querySelector<HTMLButtonElement>(
      'button[aria-label^="댓글 좋아요"]',
    )!

  it('응답 전에 하트를 채우고, 처리 중에도 잠그지 않는다', async () => {
    let resolve: (value: Outcome) => void = () => {}
    const onToggleCommentLike = vi.fn(
      () =>
        new Promise<Outcome>(done => {
          resolve = done
        }),
    )
    renderThread({ onToggleCommentLike })
    const like = likeButton()

    fireEvent.click(like)

    // 모르는 첫 상태(BE #594 전)는 빈 하트라 누르면 채움이 의도다. 지금 상태는 「모름」으로 넘긴다.
    expect(onToggleCommentLike).toHaveBeenCalledWith('101', true, {
      liked: null,
      likeCount: 3,
    })
    expect(like.getAttribute('aria-pressed')).toBe('true')
    expect(like.querySelector('svg')?.getAttribute('fill')).toBe('currentColor')
    expect(like.disabled).toBe(false)
    expect(like.getAttribute('aria-busy')).toBeNull()

    await act(async () => {
      resolve({ ok: true, liked: true, likeCount: 4 })
    })

    expect(like.getAttribute('aria-pressed')).toBe('true')
  })

  it('처리 중에 다시 누르면 지금 화면 상태(채움)에서 뒤집은 의도(해제)를 넘긴다', () => {
    const onToggleCommentLike = vi.fn(() => new Promise<Outcome>(() => {}))
    renderThread({ onToggleCommentLike })

    fireEvent.click(likeButton())
    fireEvent.click(likeButton())

    expect(onToggleCommentLike).toHaveBeenNthCalledWith(2, '101', false, {
      liked: true,
      likeCount: 3,
    })
    expect(likeButton().getAttribute('aria-pressed')).toBe('false')
  })

  it('실패하면 돌려받은 상태(서버가 마지막으로 확인한 상태)로 되돌린다', async () => {
    const onToggleCommentLike = vi.fn(async (): Promise<Outcome> => ({
      ok: false,
      liked: null,
      likeCount: 3,
    }))
    renderThread({ onToggleCommentLike })

    await act(async () => {
      fireEvent.click(likeButton())
    })

    expect(likeButton().getAttribute('aria-pressed')).toBe('false')
  })

  it('응답에 liked 가 있으면(BE #594) 첫 상태로 그대로 쓴다', () => {
    const onToggleCommentLike = vi.fn(() => new Promise<Outcome>(() => {}))
    renderThread({
      comments: [comment('101', { liked: true })],
      onToggleCommentLike,
    })

    expect(likeButton().getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(likeButton())
    expect(onToggleCommentLike).toHaveBeenCalledWith('101', false, {
      liked: true,
      likeCount: 3,
    })
  })
})

describe('댓글 등록 중 — 키보드를 내리지 않는다(#580)', () => {
  it('등록 중 입력칸은 disabled 가 아니라 readOnly + aria-busy, 등록 버튼만 잠근다', async () => {
    let resolve: (value: boolean) => void = () => {}
    const onCreateComment = vi.fn(
      () =>
        new Promise<boolean>(done => {
          resolve = done
        }),
    )
    renderThread({ onCreateComment })
    const textarea = getTextArea()

    textarea.focus()
    fireEvent.focus(textarea)
    fireEvent.change(textarea, { target: { value: '첫 댓글' } })
    await act(async () => {
      fireEvent.submit(textarea.form!)
    })

    expect(textarea.disabled).toBe(false)
    expect(textarea.readOnly).toBe(true)
    expect(textarea.getAttribute('aria-busy')).toBe('true')
    expect(findButton('등록 중')?.disabled).toBe(true)
    expect(document.activeElement).toBe(textarea)

    await act(async () => {
      resolve(true)
    })

    // 성공 뒤에도 펼친 채 포커스를 두고 입력값만 비운다.
    expect(textarea.value).toBe('')
    expect(textarea.readOnly).toBe(false)
    expect(textarea.getAttribute('aria-busy')).toBeNull()
    expect(textarea.rows).toBe(3)
    expect(document.activeElement).toBe(textarea)
    expect(findButton('등록')).not.toBeNull()
  })

  it('등록 버튼을 눌러도 입력칸 포커스를 빼앗지 않는다(mousedown 기본 동작을 막는다)', () => {
    renderThread()
    const textarea = getTextArea()

    textarea.focus()
    fireEvent.focus(textarea)
    const submit = findButton('등록')!
    const allowed = fireEvent.mouseDown(submit)

    expect(allowed).toBe(false)
  })

  it('답글은 등록 뒤에도 입력칸을 닫지 않고 비운 채 포커스를 둔다', async () => {
    renderThread()

    fireEvent.click(findButton('답글 달기')!)
    const replyArea = document.body.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="답글 내용"]',
    )!
    replyArea.focus()
    fireEvent.change(replyArea, { target: { value: '한 줄 더' } })
    await act(async () => {
      fireEvent.submit(replyArea.form!)
    })

    const after = document.body.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="답글 내용"]',
    )
    expect(after).toBe(replyArea)
    expect(after?.value).toBe('')
    expect(document.activeElement).toBe(replyArea)
  })
})
