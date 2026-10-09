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
    onToggleCommentLike: vi.fn(async () => null),
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

  it('내 댓글은 삭제만 — 확인을 거쳐 그 댓글을 지운다', async () => {
    stubMatchMedia(false)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
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
    await flushFrames(3)

    expect(confirm).toHaveBeenCalledWith('댓글을 삭제하시겠습니까?')
    expect(props.onDeleteComment).toHaveBeenCalledWith('101')
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

describe('댓글 좋아요', () => {
  it('처리 중에는 「처리 중」 글자 대신 aria-busy + 비활성이고, 끝나면 채운 하트가 된다', async () => {
    let resolve: (value: {
      commentId: string
      liked: boolean
      likeCount: number
    }) => void = () => {}
    const onToggleCommentLike = vi.fn(
      () =>
        new Promise<{ commentId: string; liked: boolean; likeCount: number }>(
          done => {
            resolve = done
          },
        ),
    )
    renderThread({ onToggleCommentLike })
    const like = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="댓글 좋아요 3"]',
    )!

    fireEvent.click(like)

    expect(like.getAttribute('aria-busy')).toBe('true')
    expect(like.disabled).toBe(true)
    expect(like.textContent).toBe('3')

    await act(async () => {
      resolve({ commentId: '101', liked: true, likeCount: 4 })
    })

    expect(like.getAttribute('aria-busy')).toBeNull()
    expect(like.getAttribute('aria-pressed')).toBe('true')
    expect(like.querySelector('svg')?.getAttribute('fill')).toBe('currentColor')
  })
})

/*
  알림에서 들어온 댓글 앵커(`#comment-{id}`, community.md §S4 「알림 목록」). 댓글은 늦게 도착하므로
  목록이 그려진 뒤 한 번만 그 댓글로 내리고, 접힌 답글이면 부모를 펼친다.
*/
describe('CommunityCommentThread — 알림 댓글 앵커', () => {
  // jsdom 에는 scrollIntoView 가 없다 — 테스트마다 기록용 함수를 달고 끝나면 뗀다.
  const stubScrollIntoView = () => {
    const scroll = vi.fn(function (this: Element) {
      return this.id
    })
    Element.prototype.scrollIntoView = scroll as never
    return scroll
  }

  afterEach(() => {
    window.history.replaceState(null, '', '/')
    delete (Element.prototype as Partial<Element>).scrollIntoView
  })

  const fiveReplies = () =>
    comment('101', {
      replies: ['201', '202', '203', '204', '205'].map(reply),
    })

  it('접힌 다섯째 답글을 가리키면 부모를 펼치고 그 답글로 내린다', async () => {
    window.history.replaceState(null, '', '/community/1#comment-205')
    const scroll = stubScrollIntoView()

    renderThread({ comments: [fiveReplies()] })

    expect(document.getElementById('comment-205')).toBeNull()
    await flushFrames(3)

    expect(document.getElementById('comment-205')).not.toBeNull()
    expect(scroll.mock.results.map(result => result.value)).toEqual([
      'comment-205',
    ])
  })

  it('댓글이 늦게 와도 도착한 뒤 한 번만 내린다', async () => {
    window.history.replaceState(null, '', '/community/1#comment-101')
    const scroll = stubScrollIntoView()

    const { rerender, props } = renderThread({ comments: [] })
    await flushFrames(2)
    expect(scroll).not.toHaveBeenCalled()

    rerender(
      createElement(CommunityCommentThread, {
        ...props,
        comments: [comment('101')],
      }),
    )
    await flushFrames(3)
    rerender(
      createElement(CommunityCommentThread, {
        ...props,
        comments: [comment('101'), comment('102')],
      }),
    )
    await flushFrames(3)

    expect(scroll).toHaveBeenCalledTimes(1)
  })

  it('앵커의 댓글이 목록에 없으면(지워짐) 아무 데도 내리지 않는다', async () => {
    window.history.replaceState(null, '', '/community/1#comment-999')
    const scroll = stubScrollIntoView()

    renderThread({ comments: [comment('101')] })
    await flushFrames(3)

    expect(scroll).not.toHaveBeenCalled()
  })
})
