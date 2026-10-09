// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SiteHeader from '@/components/layout/site-header'
import { COMMUNITY_NOTIFICATION_POLL_INTERVAL_MS } from '@/lib/community/notifications'
import { useAuthStore } from '@/stores/auth-store'

/*
  헤더 알림 진입점(#535, community.md §S4 「알림」). 로그인한 회원에게만 종이 있고, 안 읽은 수는
  마운트·창 포커스 복귀·60초마다 다시 받는다. API 가 없거나 실패하면 배지만 조용히 숨는다.
*/

const pathnameBox = vi.hoisted(() => ({ current: '/community/list' }))
const apiBox = vi.hoisted(() => ({
  fetchUnreadCount: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameBox.current,
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

vi.mock('@/lib/api/community', () => ({
  fetchCommunityNotificationUnreadCount: () => apiBox.fetchUnreadCount(),
}))

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

const ok = (unreadCount: number) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: { unreadCount },
})

const renderHeader = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    createElement(QueryClientProvider, { client }, createElement(SiteHeader)),
  )
}

const bell = () =>
  document.querySelector<HTMLAnchorElement>(
    '[data-community-notification-bell]',
  )
const badge = () =>
  document.querySelector('[data-community-notification-badge]')

beforeEach(() => {
  pathnameBox.current = '/community/list'
  apiBox.fetchUnreadCount = vi.fn(async () => ok(3))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  useAuthStore.setState({
    hasHydrated: false,
    isLoggedIn: false,
    memberInfo: null,
  })
})

describe('SiteHeader — 알림 종', () => {
  it('로그인 확인 전에는 종을 그리지 않고 수도 부르지 않는다(CM-003 기준)', () => {
    useAuthStore.setState({
      hasHydrated: false,
      isLoggedIn: false,
      memberInfo: null,
    })
    renderHeader()

    expect(bell()).toBeNull()
    expect(apiBox.fetchUnreadCount).not.toHaveBeenCalled()
  })

  it('비로그인에는 종이 없다', () => {
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: false,
      memberInfo: null,
    })
    renderHeader()

    expect(bell()).toBeNull()
    expect(apiBox.fetchUnreadCount).not.toHaveBeenCalled()
  })

  it('회원이면 알림 목록으로 가는 종과 안 읽은 수 배지를 그린다', async () => {
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo: member as never,
    })
    renderHeader()

    expect(bell()?.getAttribute('href')).toBe('/community/notifications')
    await waitFor(() => {
      expect(badge()?.textContent).toBe('3')
    })
    expect(bell()?.getAttribute('aria-label')).toBe('알림, 안 읽은 알림 3개')
    expect(badge()?.getAttribute('aria-hidden')).toBe('true')
  })

  it('100개 이상이면 `99+`', async () => {
    apiBox.fetchUnreadCount = vi.fn(async () => ok(120))
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo: member as never,
    })
    renderHeader()

    await waitFor(() => {
      expect(badge()?.textContent).toBe('99+')
    })
  })

  it('0 이면 배지 없이 「알림」', async () => {
    apiBox.fetchUnreadCount = vi.fn(async () => ok(0))
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo: member as never,
    })
    renderHeader()

    await waitFor(() => {
      expect(apiBox.fetchUnreadCount).toHaveBeenCalledTimes(1)
    })
    expect(badge()).toBeNull()
    expect(bell()?.getAttribute('aria-label')).toBe('알림')
  })

  it('API 가 404 로 실패해도 종은 그대로이고 배지만 숨는다(재시도하지 않는다)', async () => {
    apiBox.fetchUnreadCount = vi.fn(async () => {
      throw Object.assign(new Error('Request failed with status code 404'), {
        isAxiosError: true,
        response: { status: 404 },
      })
    })
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo: member as never,
    })
    renderHeader()

    await waitFor(() => {
      expect(apiBox.fetchUnreadCount).toHaveBeenCalledTimes(1)
    })
    expect(bell()).not.toBeNull()
    expect(badge()).toBeNull()
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })

  it('창에 포커스가 돌아오면 다시 받는다', async () => {
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo: member as never,
    })
    renderHeader()

    await waitFor(() => {
      expect(badge()?.textContent).toBe('3')
    })
    apiBox.fetchUnreadCount = vi.fn(async () => ok(5))

    act(() => {
      window.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => {
      expect(badge()?.textContent).toBe('5')
    })
  })

  it('60초마다 다시 받는다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo: member as never,
    })
    renderHeader()

    await vi.waitFor(() => {
      expect(apiBox.fetchUnreadCount).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(COMMUNITY_NOTIFICATION_POLL_INTERVAL_MS)
    })

    await vi.waitFor(() => {
      expect(apiBox.fetchUnreadCount).toHaveBeenCalledTimes(2)
    })
  })

  it('알림 화면에 있으면 종이 현재 위치로 표시된다', () => {
    pathnameBox.current = '/community/notifications'
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo: member as never,
    })
    renderHeader()

    expect(bell()?.getAttribute('aria-current')).toBe('page')
  })
})
