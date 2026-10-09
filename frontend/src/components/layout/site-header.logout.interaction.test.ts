// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SiteHeader from '@/components/layout/site-header'
import { COMMUNITY_RECENT_REGIONS_KEY } from '@/lib/community/recent-regions'
import { useAuthStore } from '@/stores/auth-store'

/*
  로그아웃이 회원 범위 브라우저 상태를 치우는지 실제 DOM 에서 잠근다. 글쓰기 임시 저장본
  (community.md §S4 「잃지 않게」)과 좌 내비 최근 본 지역(4단계 「목록 3단」)은 공용 기기에서
  다음 사람에게 남으면 안 된다.
*/

const routerBox = vi.hoisted(() => ({
  push: (() => {}) as (href: string) => void,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/community/list',
  useRouter: () => ({
    push: (href: string) => routerBox.push(href),
    replace: () => undefined,
    back: () => undefined,
  }),
}))

// 로그인 상태라 헤더 알림 종이 안 읽은 수를 부른다 — 이 테스트의 관심사가 아니라 막아 둔다.
vi.mock('@/hooks/use-community-notification-unread-count', () => ({
  useCommunityNotificationUnreadCount: () => null,
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

beforeEach(() => {
  window.localStorage.clear()
  routerBox.push = vi.fn()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 204 })),
  )
  useAuthStore.setState({
    hasHydrated: true,
    isLoggedIn: true,
    memberInfo: member as never,
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const renderAndLogout = async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    createElement(QueryClientProvider, { client }, createElement(SiteHeader)),
  )

  fireEvent.click(document.querySelector('[aria-haspopup="menu"]')!)
  const logout = Array.from(
    document.querySelectorAll('[role="menuitem"]'),
  ).find(item => item.textContent?.includes('로그아웃'))!
  fireEvent.click(logout)

  await waitFor(() => {
    expect(routerBox.push).toHaveBeenCalledWith('/')
  })
}

describe('로그아웃', () => {
  it('최근 본 지역(`community-recent-regions`)도 지운다', async () => {
    window.localStorage.setItem(
      COMMUNITY_RECENT_REGIONS_KEY,
      JSON.stringify([
        { targetType: 'DISTRICT', targetCode: '11680', targetName: '강남구' },
      ]),
    )
    window.localStorage.setItem('keep-me', '1')

    await renderAndLogout()

    expect(window.localStorage.getItem(COMMUNITY_RECENT_REGIONS_KEY)).toBeNull()
    expect(window.localStorage.getItem('keep-me')).toBe('1')
  })

  it('글쓰기 임시 저장본(`community-draft:`)을 모두 지우고 다른 값은 둔다', async () => {
    window.localStorage.setItem('community-draft:7:new', '{"title":"a"}')
    window.localStorage.setItem('community-draft:7:edit:42', '{"title":"b"}')
    window.localStorage.setItem('keep-me', '1')
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      createElement(QueryClientProvider, { client }, createElement(SiteHeader)),
    )

    fireEvent.click(document.querySelector('[aria-haspopup="menu"]')!)
    const logout = Array.from(
      document.querySelectorAll('[role="menuitem"]'),
    ).find(item => item.textContent?.includes('로그아웃'))!
    fireEvent.click(logout)

    await waitFor(() => {
      expect(routerBox.push).toHaveBeenCalledWith('/')
    })
    expect(window.localStorage.getItem('community-draft:7:new')).toBeNull()
    expect(window.localStorage.getItem('community-draft:7:edit:42')).toBeNull()
    expect(window.localStorage.getItem('keep-me')).toBe('1')
  })
})
