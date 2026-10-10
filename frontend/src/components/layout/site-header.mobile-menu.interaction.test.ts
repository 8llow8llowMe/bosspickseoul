// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { ServerStyleSheet } from 'styled-components'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SiteHeader from '@/components/layout/site-header'
import { useAuthStore } from '@/stores/auth-store'

/*
  햄버거 메뉴의 계정 항목을 한 줄로 묶고, 열린 메뉴가 지도 화면 바텀시트에 가리지 않게 한다.
  예전에는 회원 메뉴가 9줄(화면 이동 5 + 계정 4)이었고, 헤더(20)와 같은 층의 시트가 패널을 덮었다.
*/

const pathnameBox = vi.hoisted(() => ({ value: '/recommend' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameBox.value,
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

const element = () =>
  createElement(
    QueryClientProvider,
    {
      client: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
    },
    createElement(SiteHeader),
  )

const openMenu = () => {
  render(element())
  fireEvent.click(
    document.querySelector('button[aria-label="메뉴 열기"]') as Element,
  )
}

const accountToggle = () =>
  document.querySelector<HTMLButtonElement>('[data-mobile-account-toggle]')

afterEach(() => {
  cleanup()
  pathnameBox.value = '/recommend'
  useAuthStore.setState({
    hasHydrated: false,
    isLoggedIn: false,
    memberInfo: null,
  })
})

describe('SiteHeader — 모바일 메뉴 계정 항목', () => {
  it('회원은 이름 한 줄만 보이고, 누르면 북마크·개인 정보 설정·로그아웃이 펼쳐진다', () => {
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo: member as never,
    })
    openMenu()

    const toggle = accountToggle()
    expect(toggle?.textContent).toContain('사장님')
    expect(toggle?.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById('site-header-mobile-account')).toBeNull()

    fireEvent.click(toggle as Element)

    expect(toggle?.getAttribute('aria-expanded')).toBe('true')
    const menu = document.getElementById('site-header-mobile-account')
    expect(
      Array.from(menu?.querySelectorAll('a, button') ?? []).map(node =>
        node.textContent?.trim(),
      ),
    ).toEqual(['북마크', '개인 정보 설정', '로그아웃'])
  })

  it('계정 화면에 있으면 계정 줄을 펼친 채 연다', () => {
    pathnameBox.value = '/profile/settings/edit'
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo: member as never,
    })
    openMenu()

    expect(accountToggle()?.getAttribute('aria-expanded')).toBe('true')
  })

  it('게스트 패널은 화면 이동 5줄뿐이다 — 로그인 입구는 햄버거 옆에 있다(#601)', () => {
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: false,
      memberInfo: null,
    })
    openMenu()

    const panel = document.querySelector('[data-mobile-menu-panel]')
    expect(
      Array.from(panel?.querySelectorAll('a, button') ?? []).map(node =>
        node.textContent?.trim(),
      ),
    ).toEqual(['구별현황', '상권분석', '상권추천', '시뮬레이션', '커뮤니티'])
    expect(document.querySelector('[data-mobile-account-divider]')).toBeNull()
    expect(document.querySelector('[data-mobile-login]')).not.toBeNull()
  })
})

describe('SiteHeader — 열린 메뉴의 층', () => {
  it('메뉴가 열리면 헤더가 바텀시트(20)·모달(1000) 위, 토스트(1200) 아래로 올라간다', () => {
    const sheet = new ServerStyleSheet()
    try {
      renderToStaticMarkup(sheet.collectStyles(element()))
      const css = sheet.getStyleTags().replace(/\s+/g, '')
      expect(css).toMatch(/\[data-menu-open='true'\]\{z-index:1100;\}/)
    } finally {
      sheet.seal()
    }
  })
})
