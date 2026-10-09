// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CommunityDetailPage from '@/components/community/community-detail-page'
import ToastProvider from '@/components/ui/toast'
import { communityMockSource } from '@/lib/community/community-mock'
import { TOAST_ACTION_DURATION_MS } from '@/lib/ui/toast-state'
import type { ApiResponse } from '@/types/api'
import type { CommunityLikeBody } from '@/types/community'

/*
  상세 페이지 전체로 잠그는 참여 흐름(#580 좋아요 낙관적 갱신·직렬화, #581 확인 시트·댓글 삭제 되돌리기).
  데이터는 `?mock=1` 목 소스(조회자 = 목 회원 9001)이고, 서버 응답 시점은 스파이로 손에 쥔다.
*/

vi.mock('next/navigation', () => ({
  usePathname: () => '/community/1',
  useSearchParams: () => new URLSearchParams('mock=1'),
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

const stubMatchMedia = () => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

const flushFrames = async (count = 2) => {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    })
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  document.body.style.overflow = ''
})

/*
  토스트 프로바이더는 앱 전역이라 상세를 떠나도 남는다. `leavePage` 는 프로바이더를 그대로 두고 상세만 내린다 —
  떠난 뒤 남은 토스트를 보려면 이 모양이어야 한다.
*/
const renderPage = () => {
  stubMatchMedia()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const tree = (showPage: boolean) =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        ToastProvider,
        null,
        showPage
          ? createElement(CommunityDetailPage, { communityId: '1' })
          : null,
      ),
    )
  const view = render(tree(true))

  return {
    ...view,
    leavePage: () => {
      view.rerender(tree(false))
    },
  }
}

const ok = <T>(dataBody: T): ApiResponse<T> => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody,
})

/** 본문 반응 바의 좋아요(하단 고정 바가 아닌 쪽). */
const postLikeButton = () =>
  document.body.querySelector<HTMLButtonElement>(
    '[aria-label="게시글 반응"] button[aria-label^="게시글 좋아요"]',
  )!

const button = (text: string) =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(
    item => item.textContent?.trim() === text,
  ) ?? null

const waitForArticle = async () => {
  await waitFor(() => {
    expect(postLikeButton()).not.toBeNull()
    expect(document.body.textContent).toContain('관리 규약을 먼저 확인한다는')
  })
}

describe('글 좋아요 — 누르면 바로 바뀌고 연타는 직렬화된다(#580)', () => {
  it('응답 전에 하트·수를 바꾸고, 진행 중 연타는 마지막 의도만 서버와 맞춘다', async () => {
    // 서버 토글 흉내 — 응답 시점을 손으로 연다.
    const server = { liked: false, likeCount: 10 }
    const pending: Array<() => void> = []
    const toggle = vi
      .spyOn(communityMockSource, 'togglePostLike')
      .mockImplementation(
        () =>
          new Promise<ApiResponse<CommunityLikeBody>>(resolve => {
            pending.push(() => {
              server.liked = !server.liked
              server.likeCount += server.liked ? 1 : -1
              resolve(ok({ postId: '1', ...server }))
            })
          }),
      )
    renderPage()
    await waitForArticle()
    const initialLabel = postLikeButton().getAttribute('aria-label')!
    const initialCount = Number(initialLabel.replace(/\D/g, ''))
    const initialLiked =
      postLikeButton().getAttribute('aria-pressed') === 'true'
    server.liked = initialLiked
    server.likeCount = initialCount

    await act(async () => {
      fireEvent.click(postLikeButton())
    })
    await waitFor(() => {
      expect(postLikeButton().getAttribute('aria-pressed')).toBe(
        String(!initialLiked),
      )
    })
    expect(postLikeButton().getAttribute('aria-label')).toBe(
      `게시글 좋아요 ${initialCount + (initialLiked ? -1 : 1)}`,
    )
    expect(postLikeButton().disabled).toBe(false)

    // 응답 전에 한 번 더 — 원래대로 돌리는 의도. 요청은 겹쳐 나가지 않는다.
    await act(async () => {
      fireEvent.click(postLikeButton())
    })
    await waitFor(() => {
      expect(postLikeButton().getAttribute('aria-pressed')).toBe(
        String(initialLiked),
      )
    })
    expect(toggle).toHaveBeenCalledTimes(1)

    // 첫 응답은 마지막 의도(원래대로)와 다르다 — 한 번 더 보낸다.
    await act(async () => {
      pending.shift()?.()
    })
    await waitFor(() => {
      expect(toggle).toHaveBeenCalledTimes(2)
    })
    await act(async () => {
      pending.shift()?.()
    })

    await waitFor(() => {
      expect(postLikeButton().getAttribute('aria-pressed')).toBe(
        String(initialLiked),
      )
      expect(postLikeButton().getAttribute('aria-label')).toBe(
        `게시글 좋아요 ${initialCount}`,
      )
    })
    expect(server).toEqual({ liked: initialLiked, likeCount: initialCount })
  })

  it('실패하면 누르기 전 상태로 되돌리고 이유를 알린다', async () => {
    vi.spyOn(communityMockSource, 'togglePostLike').mockRejectedValue(
      new Error('잠시 후 다시 시도해 주세요.'),
    )
    renderPage()
    await waitForArticle()
    const before = postLikeButton().getAttribute('aria-label')
    const pressedBefore = postLikeButton().getAttribute('aria-pressed')

    await act(async () => {
      fireEvent.click(postLikeButton())
    })

    await waitFor(() => {
      expect(postLikeButton().getAttribute('aria-pressed')).toBe(pressedBefore)
      expect(postLikeButton().getAttribute('aria-label')).toBe(before)
    })
    expect(document.body.textContent).toContain('잠시 후 다시 시도해 주세요.')
  })
})

describe('글 삭제 — 확인 시트(#581)', () => {
  it('더보기 → 삭제는 window.confirm 이 아니라 시트로 묻고, 취소하면 지우지 않는다', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const deletePost = vi.spyOn(communityMockSource, 'deletePost')
    renderPage()
    await waitForArticle()

    const trigger = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="게시글 더보기"]',
    )!
    trigger.focus()
    fireEvent.click(trigger)
    await flushFrames()
    fireEvent.click(
      document.body.querySelector<HTMLButtonElement>(
        'button[aria-label="게시글 삭제"]',
      )!,
    )
    await flushFrames(4)

    const sheet = document.body.querySelector('[role="alertdialog"]')
    expect(sheet?.textContent).toContain('글을 삭제할까요?')
    expect(sheet?.textContent).toContain(
      '글을 삭제하면 달린 댓글도 함께 사라지고 되돌릴 수 없어요.',
    )

    fireEvent.click(button('취소')!)
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull()
    expect(deletePost).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
  })
})

const deleteOwnReply = async () => {
  const triggers = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="댓글 더보기"]',
    ),
  )
  // 목 회원(9001)이 쓴 답글 102 의 메뉴. 메뉴 항목이 「댓글 삭제」인 트리거를 찾는다.
  for (const trigger of triggers) {
    trigger.focus()
    fireEvent.click(trigger)
    await flushFrames()
    const remove = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="댓글 삭제"]',
    )
    if (remove) {
      fireEvent.click(remove)
      await flushFrames(4)
      return
    }
    fireEvent.keyDown(trigger, { key: 'Escape' })
    await flushFrames()
  }
  throw new Error('지울 수 있는 댓글이 없다')
}

describe('댓글 삭제 — 낙관적 숨김 + 되돌리기(#581)', () => {
  it('지우면 바로 숨기고 되돌리기 토스트를 띄우며, 되돌리면 서버에 아무것도 보내지 않는다', async () => {
    const deleteComment = vi.spyOn(communityMockSource, 'deleteComment')
    renderPage()
    await waitForArticle()
    expect(document.body.textContent).toContain('공사 가능 시간도 꼭')

    await deleteOwnReply()

    expect(document.body.textContent).not.toContain('공사 가능 시간도 꼭')
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull()
    expect(document.body.textContent).toContain('댓글을 삭제했어요.')
    expect(deleteComment).not.toHaveBeenCalled()

    fireEvent.click(button('되돌리기')!)

    expect(document.body.textContent).toContain('공사 가능 시간도 꼭')
    expect(deleteComment).not.toHaveBeenCalled()
  })

  it('되돌리기 전에 페이지를 떠나면 기다리던 삭제를 바로 보내고, 남아 있던 되돌리기 토스트도 닫는다', async () => {
    const deleteComment = vi
      .spyOn(communityMockSource, 'deleteComment')
      .mockResolvedValue(ok(null))
    const view = renderPage()
    await waitForArticle()

    await deleteOwnReply()
    expect(deleteComment).not.toHaveBeenCalled()
    expect(button('되돌리기')).not.toBeNull()

    act(() => {
      view.leavePage()
    })

    // 뮤테이션은 비동기로 시작한다 — 떠난 뒤에도 요청이 나가는지 기다려 본다.
    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalledExactlyOnceWith('1', '102')
    })
    // 떠난 뒤 누르면 되돌릴 것이 없다 — 성공처럼 닫히는 버튼을 남기지 않는다.
    expect(document.body.textContent).not.toContain('댓글을 삭제했어요.')
    expect(button('되돌리기')).toBeNull()
  })
})

describe('댓글 지연 삭제 — 되돌리기 기간이 지나면(#581)', () => {
  const REPLY_TEXT = '공사 가능 시간도 꼭'

  afterEach(() => {
    vi.useRealTimers()
  })

  /* setTimeout 만 가짜로 — 실제 시간과 함께 흐르되(shouldAdvanceTime) 10초는 건너뛸 수 있다. rAF 는 진짜다. */
  const useSkippableTimers = () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout'],
      shouldAdvanceTime: true,
    })
  }

  it('실패하면 숨김을 풀어 댓글을 되살리고 이유를 알린다', async () => {
    const deleteComment = vi
      .spyOn(communityMockSource, 'deleteComment')
      .mockRejectedValue(new Error('권한이 없어요.'))
    renderPage()
    await waitForArticle()
    useSkippableTimers()

    await deleteOwnReply()
    expect(document.body.textContent).not.toContain(REPLY_TEXT)

    await act(async () => {
      vi.advanceTimersByTime(TOAST_ACTION_DURATION_MS)
    })

    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalledExactlyOnceWith('1', '102')
      expect(document.body.textContent).toContain(REPLY_TEXT)
    })
    expect(document.body.textContent).toContain(
      '댓글을 삭제하지 못해 다시 보여 드려요. 권한이 없어요.',
    )
  })

  /* 목 소스에서 실제로 지운다 — 이 파일의 마지막 테스트로 둔다. */
  it('지나면 DELETE 를 보내고, 다시 받은 뒤에 숨김을 풀어 지운 댓글이 한 번도 다시 비치지 않는다', async () => {
    const deleteComment = vi.spyOn(communityMockSource, 'deleteComment')
    // 지운 뒤의 재조회는 실제 네트워크처럼 늦게 온다 — 그 사이 숨김을 풀면 옛 목록의 댓글이 비친다.
    const realGetComments =
      communityMockSource.getComments.bind(communityMockSource)
    const getComments = vi
      .spyOn(communityMockSource, 'getComments')
      .mockImplementation(async postId => {
        if (deleteComment.mock.calls.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        return realGetComments(postId)
      })
    renderPage()
    await waitForArticle()
    const commentCountLabel = () =>
      document.body.querySelector(
        '[aria-label="게시글 반응"] button[aria-label="댓글로 이동"]',
      )?.textContent ?? ''
    const countBefore = Number(commentCountLabel().replace(/\D/g, ''))
    useSkippableTimers()

    await deleteOwnReply()
    expect(document.body.textContent).not.toContain(REPLY_TEXT)
    // 반응 바는 숨긴 댓글 하나당 1 — BE 가 줄이는 수와 같다.
    expect(commentCountLabel()).toContain(String(countBefore - 1))

    // 숨긴 뒤로 그 댓글이 다시 그려지는지 지켜본다(숨김을 먼저 풀면 옛 목록으로 한 번 비친다).
    let reappeared = false
    const observer = new MutationObserver(() => {
      if (document.body.textContent?.includes(REPLY_TEXT)) {
        reappeared = true
      }
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    const fetchesBefore = getComments.mock.calls.length

    await act(async () => {
      vi.advanceTimersByTime(TOAST_ACTION_DURATION_MS)
    })

    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalledExactlyOnceWith('1', '102')
      expect(getComments.mock.calls.length).toBeGreaterThan(fetchesBefore)
      expect(commentCountLabel()).toContain(String(countBefore - 1))
    })
    observer.disconnect()

    expect(reappeared).toBe(false)
    expect(document.body.textContent).not.toContain(REPLY_TEXT)
  })
})
