// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CommunityNotificationsPage, {
  shouldRetryCommunityNotifications,
} from '@/components/community/community-notifications-page'
import { getCommunityNotificationsFooter } from '@/components/community/community-notifications-view'
import { useAuthStore } from '@/stores/auth-store'
import type { CommunityNotificationItem } from '@/types/community'

/*
  알림 목록(#536, community.md §S4 「알림 목록」)의 상호작용 계약을 실제 DOM 에서 잠근다.
  문구 조립·커서·배지 표기는 lib/community/notifications.test.ts.
*/

const navigation = vi.hoisted(() => ({
  search: '',
  push: vi.fn(),
  replace: vi.fn(),
}))

const api = vi.hoisted(() => ({
  fetchNotifications: vi.fn(),
  fetchUnreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/community/notifications',
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => ({
    push: navigation.push,
    replace: navigation.replace,
    back: () => undefined,
  }),
}))

vi.mock('@/lib/api/community', () => ({
  fetchCommunityNotifications: (params: unknown) =>
    api.fetchNotifications(params),
  fetchCommunityNotificationUnreadCount: () => api.fetchUnreadCount(),
  markCommunityNotificationRead: (id: string) => api.markRead(id),
  markAllCommunityNotificationsRead: () => api.markAllRead(),
}))

const ok = <T>(dataBody: T) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody,
})

const notification = (
  id: string,
  overrides: Partial<CommunityNotificationItem> = {},
): CommunityNotificationItem => ({
  notificationId: id,
  notificationType: {
    code: 'COMMENT_ON_POST',
    name: '내 글에 댓글',
    description: '내가 쓴 글에 새 댓글이 달렸습니다.',
  },
  postId: `post-${id}`,
  postTitle: `제목 ${id}`,
  targetAvailable: true,
  commentId: `comment-of-${id}`,
  commentPreview: `미리보기 ${id}`,
  actorMemberId: '12',
  actorNickname: '길동',
  actorProfileImageUrl: null,
  eventCount: 2,
  read: false,
  lastEventAt: '2026-10-02T10:15:30.123456',
  createdAt: '2026-10-01T22:03:11.000001',
  ...overrides,
})

const page = (contents: CommunityNotificationItem[], hasNext = false) =>
  ok({ notifications: { contents, hasNext } })

const member = {
  memberId: '7',
  email: 'a@test.local',
  name: '테스트',
  nickname: '사장님',
  profileImageUrl: '',
  role: { code: 'USER', name: '회원', description: '' },
  socialProvider: null,
  hasPassword: true,
}

const signIn = () =>
  useAuthStore.setState({
    hasHydrated: true,
    isLoggedIn: true,
    memberInfo: member as never,
  })

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(CommunityNotificationsPage),
    ),
  )
}

const rows = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('[data-community-notification]'),
  )

const findButton = (text: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    button => button.textContent?.trim() === text,
  ) ?? null

beforeEach(() => {
  navigation.search = ''
  navigation.push = vi.fn()
  navigation.replace = vi.fn()
  api.fetchNotifications = vi.fn(async () =>
    page([
      notification('1'),
      notification('2', {
        targetAvailable: false,
        postTitle: null,
        commentPreview: null,
      }),
      notification('3', { read: true, actorNickname: null, eventCount: 1 }),
    ]),
  )
  api.fetchUnreadCount = vi.fn(async () => ok({ unreadCount: 2 }))
  api.markRead = vi.fn(async (id: string) =>
    ok({ notificationId: id, read: true }),
  )
  api.markAllRead = vi.fn(async () => ok({ updatedCount: 2 }))
})

afterEach(() => {
  cleanup()
  useAuthStore.setState({
    hasHydrated: false,
    isLoggedIn: false,
    memberInfo: null,
  })
})

describe('CommunityNotificationsPage', () => {
  it('비로그인으로 확인되면 돌아올 주소를 실어 로그인으로 보낸다', async () => {
    navigation.search = 'unread=1'
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: false,
      memberInfo: null,
    })
    renderPage()

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith(
        `/login?redirect=${encodeURIComponent('/community/notifications?unread=1')}`,
      )
    })
    expect(api.fetchNotifications).not.toHaveBeenCalled()
  })

  it('로그인 확인 전에는 부르지도 보내지도 않는다', () => {
    renderPage()

    expect(api.fetchNotifications).not.toHaveBeenCalled()
    expect(navigation.replace).not.toHaveBeenCalled()
  })

  it('첫 쪽은 lastNotificationId=0 으로 받고 조립한 문구를 그린다', async () => {
    signIn()
    renderPage()

    await waitFor(() => {
      expect(rows()).toHaveLength(3)
    })
    expect(api.fetchNotifications).toHaveBeenCalledWith({
      unreadOnly: false,
      lastNotificationId: '0',
      size: 20,
    })
    expect(rows()[0].textContent).toContain(
      "'제목 1' 글에 새 댓글 2개 — 최근 길동님",
    )
    expect(rows()[0].textContent).toContain('안 읽음')
    expect(rows()[2].textContent).toContain(
      "사장님이 '제목 3' 글에 댓글을 남겼어요",
    )
    expect(rows()[2].textContent).not.toContain('안 읽음')
  })

  it('글이 사라진 알림은 「삭제된 글」로 적고 링크가 아니다', async () => {
    signIn()
    renderPage()

    await waitFor(() => {
      expect(rows()).toHaveLength(3)
    })
    const deleted = rows()[1]

    expect(deleted.tagName).toBe('DIV')
    expect(deleted.getAttribute('href')).toBeNull()
    expect(deleted.textContent).toContain('삭제된 글에 새 댓글 2개')
    expect(deleted.textContent).toContain('삭제된 글이라 열 수 없어요')
    expect(rows()[0].getAttribute('href')).toBe(
      '/community/post-1#comment-comment-of-1',
    )
  })

  it('안 읽은 알림을 누르면 단건 읽음 뒤 댓글 앵커로 이동하고 배지를 다시 받는다', async () => {
    signIn()
    renderPage()

    await waitFor(() => {
      expect(rows()).toHaveLength(3)
    })
    await waitFor(() => {
      expect(api.fetchUnreadCount).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(rows()[0])

    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(
        '/community/post-1#comment-comment-of-1',
      )
    })
    expect(api.markRead).toHaveBeenCalledWith('1')
    expect(rows()[0].getAttribute('data-read')).toBe('true')
    await waitFor(() => {
      expect(api.fetchUnreadCount).toHaveBeenCalledTimes(2)
    })
  })

  it('이미 읽은 알림은 읽음 요청 없이 이동한다', async () => {
    signIn()
    renderPage()

    await waitFor(() => {
      expect(rows()).toHaveLength(3)
    })
    fireEvent.click(rows()[2])

    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(
        '/community/post-3#comment-comment-of-3',
      )
    })
    expect(api.markRead).not.toHaveBeenCalled()
  })

  it('읽음 요청이 실패해도 이동한다', async () => {
    api.markRead = vi.fn(async () => {
      throw new Error('boom')
    })
    signIn()
    renderPage()

    await waitFor(() => {
      expect(rows()).toHaveLength(3)
    })
    fireEvent.click(rows()[0])

    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(
        '/community/post-1#comment-comment-of-1',
      )
    })
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })

  it('「안 읽은 것만」을 누르면 주소에 싣고, 그 주소는 unreadOnly 로 받는다', async () => {
    signIn()
    const view = renderPage()

    await waitFor(() => {
      expect(rows()).toHaveLength(3)
    })
    const toggle = findButton('안 읽은 것만')!
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(toggle)

    expect(navigation.replace).toHaveBeenCalledWith(
      '/community/notifications?unread=1',
      { scroll: false },
    )

    view.unmount()
    navigation.search = 'unread=1'
    renderPage()

    await waitFor(() => {
      expect(api.fetchNotifications).toHaveBeenLastCalledWith({
        unreadOnly: true,
        lastNotificationId: '0',
        size: 20,
      })
    })
    expect(findButton('안 읽은 것만')?.getAttribute('aria-pressed')).toBe(
      'true',
    )
  })

  it('「모두 읽음」 뒤 목록과 헤더 배지 수를 다시 받는다', async () => {
    signIn()
    renderPage()

    await waitFor(() => {
      expect(rows()).toHaveLength(3)
    })
    await waitFor(() => {
      expect(findButton('모두 읽음')?.disabled).toBe(false)
    })
    const listCalls = api.fetchNotifications.mock.calls.length
    const countCalls = api.fetchUnreadCount.mock.calls.length

    fireEvent.click(findButton('모두 읽음')!)

    await waitFor(() => {
      expect(api.markAllRead).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(api.fetchUnreadCount.mock.calls.length).toBeGreaterThan(countCalls)
      expect(api.fetchNotifications.mock.calls.length).toBeGreaterThan(
        listCalls,
      )
    })
  })

  it('안 읽은 알림이 없으면 「모두 읽음」이 꺼져 있다', async () => {
    api.fetchNotifications = vi.fn(async () =>
      page([notification('1', { read: true })]),
    )
    api.fetchUnreadCount = vi.fn(async () => ok({ unreadCount: 0 }))
    signIn()
    renderPage()

    await waitFor(() => {
      expect(rows()).toHaveLength(1)
    })
    expect(findButton('모두 읽음')?.disabled).toBe(true)
  })

  it('API 가 없으면(404) 일반 오류 상태를 보이고 다시 시도로 다시 부른다', async () => {
    api.fetchNotifications = vi.fn(async () => {
      throw Object.assign(new Error('Request failed with status code 404'), {
        isAxiosError: true,
        response: { status: 404 },
      })
    })
    signIn()
    renderPage()

    await waitFor(() => {
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        '알림을 불러오지 못했어요',
      )
    })
    expect(document.body.textContent).not.toContain('404')

    fireEvent.click(findButton('다시 시도')!)
    await waitFor(() => {
      expect(api.fetchNotifications).toHaveBeenCalledTimes(2)
    })
  })

  it('빈 목록은 이유를 한 줄로 알린다', async () => {
    api.fetchNotifications = vi.fn(async () => page([]))
    signIn()
    renderPage()

    await waitFor(() => {
      expect(document.body.textContent).toContain('아직 받은 알림이 없어요')
    })
  })

  it('목록이 401 이면 세션을 지우고 로그인으로 보낸다', async () => {
    api.fetchNotifications = vi.fn(async () => {
      throw Object.assign(new Error('Request failed with status code 401'), {
        isAxiosError: true,
        response: { status: 401 },
      })
    })
    signIn()
    renderPage()

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith(
        `/login?redirect=${encodeURIComponent('/community/notifications')}`,
      )
    })
    expect(useAuthStore.getState().isLoggedIn).toBe(false)
  })
})

describe('shouldRetryCommunityNotifications', () => {
  const httpError = (status: number) =>
    Object.assign(new Error(String(status)), {
      isAxiosError: true,
      response: { status },
    })

  it('4xx 는 다시 부르지 않고 5xx 는 한 번만 다시 부른다', () => {
    expect(shouldRetryCommunityNotifications(0, httpError(404))).toBe(false)
    expect(shouldRetryCommunityNotifications(0, httpError(401))).toBe(false)
    expect(shouldRetryCommunityNotifications(0, httpError(503))).toBe(true)
    expect(shouldRetryCommunityNotifications(1, httpError(503))).toBe(false)
  })
})

describe('getCommunityNotificationsFooter', () => {
  const base = {
    itemsLength: 3,
    hasNextPage: true,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
  }

  it('다음 쪽 실패 > 받는 중 > 감시 요소 > 끝', () => {
    expect(
      getCommunityNotificationsFooter({ ...base, isFetchNextPageError: true }),
    ).toBe('load-more-error')
    expect(
      getCommunityNotificationsFooter({ ...base, isFetchingNextPage: true }),
    ).toBe('loading-more')
    expect(getCommunityNotificationsFooter(base)).toBe('sentinel')
    expect(
      getCommunityNotificationsFooter({ ...base, hasNextPage: false }),
    ).toBe('end')
    expect(getCommunityNotificationsFooter({ ...base, itemsLength: 0 })).toBe(
      null,
    )
  })
})
