// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SiteHeader from '@/components/layout/site-header'
import { useAuthStore } from '@/stores/auth-store'

/*
  로그아웃이 회원 범위 브라우저 상태를 치우는지 실제 DOM 에서 잠근다. 글쓰기 임시 저장본
  (community.md §S4 「잃지 않게」)은 공용 기기에서 다음 계정에 남으면 안 된다.
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

describe('로그아웃', () => {
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
