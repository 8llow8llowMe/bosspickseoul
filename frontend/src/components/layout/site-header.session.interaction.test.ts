// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SiteHeader from '@/components/layout/site-header'
import { useAuthStore } from '@/stores/auth-store'

/*
  헤더가 잘못된 로그인 상태를 비추지 않는다(#579).
  세션 확인 전에는 「로그인·회원가입」도 아바타도 그리지 않고 같은 폭의 중립 자리만 둔다.
  예전에는 확인 전에 「로그인·회원가입」을 그려, 회원에게도 새로고침마다 비로그인 상태가 깜빡였다.
*/

vi.mock('next/navigation', () => ({
  usePathname: () => '/analysis',
  useRouter: () => ({
    push: () => undefined,
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

const renderHeader = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    createElement(QueryClientProvider, { client }, createElement(SiteHeader)),
  )
}

const authLinks = () =>
  Array.from(document.querySelectorAll('a')).filter(anchor =>
    ['/login', '/register'].includes(anchor.getAttribute('href') ?? ''),
  )

const pending = () => document.querySelector('[data-session-pending]')
const avatar = () => document.querySelector('[aria-haspopup="menu"]')

afterEach(() => {
  cleanup()
  useAuthStore.setState({
    hasHydrated: false,
    isLoggedIn: false,
    memberInfo: null,
  })
})

describe('SiteHeader — 세션 확인 전(#579)', () => {
  it('로그인·회원가입도 아바타도 그리지 않고 보조기술에 숨긴 중립 자리만 둔다', () => {
    useAuthStore.setState({
      hasHydrated: false,
      isLoggedIn: false,
      memberInfo: null,
    })

    renderHeader()

    expect(authLinks()).toEqual([])
    expect(avatar()).toBeNull()
    expect(pending()?.getAttribute('aria-hidden')).toBe('true')
    // 자리에는 링크·버튼이 없다 — 키보드 포커스가 빈 자리에 머물지 않는다.
    expect(pending()?.querySelector('a, button')).toBeNull()
  })

  it('모바일 메뉴를 열어도 계정 항목을 비워 둔다', () => {
    useAuthStore.setState({
      hasHydrated: false,
      isLoggedIn: false,
      memberInfo: null,
    })
    renderHeader()

    fireEvent.click(
      document.querySelector('button[aria-label="메뉴 열기"]') as Element,
    )

    expect(authLinks()).toEqual([])
    // 아래가 비어 있으니 구분선도 두지 않는다 — 빈 줄 하나만 남아 보이지 않게.
    expect(document.querySelector('[data-mobile-account-divider]')).toBeNull()

    act(() => {
      useAuthStore.getState().clearSession()
    })
    expect(
      document.querySelector('[data-mobile-account-divider]'),
    ).not.toBeNull()
    // 데스크톱 버튼 두 개 + 열린 모바일 패널의 두 개.
    expect(authLinks().map(anchor => anchor.getAttribute('href'))).toEqual([
      '/login',
      '/register',
      '/login',
      '/register',
    ])
  })

  it('확인 결과 비로그인이면 자리를 거두고 로그인·회원가입을 그린다', () => {
    useAuthStore.setState({
      hasHydrated: false,
      isLoggedIn: false,
      memberInfo: null,
    })
    renderHeader()

    act(() => {
      useAuthStore.getState().clearSession()
    })

    expect(pending()).toBeNull()
    expect(authLinks().map(anchor => anchor.getAttribute('href'))).toEqual([
      '/login',
      '/register',
    ])
  })

  it('확인 결과 회원이면 로그인·회원가입을 한 번도 그리지 않고 아바타로 바뀐다', () => {
    useAuthStore.setState({
      hasHydrated: false,
      isLoggedIn: false,
      memberInfo: null,
    })
    renderHeader()
    expect(authLinks()).toEqual([])

    act(() => {
      useAuthStore.getState().setSession(member as never)
    })

    expect(pending()).toBeNull()
    expect(authLinks()).toEqual([])
    expect(avatar()?.textContent).toContain('사장님')
  })
})
