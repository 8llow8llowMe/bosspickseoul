// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render } from '@testing-library/react'
import { ServerStyleSheet } from 'styled-components'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SiteHeader from '@/components/layout/site-header'
import { useAuthStore } from '@/stores/auth-store'

/*
  모바일 헤더의 로그인 입구와 메뉴 버튼 크기(#601, 진단 H10).
  ≤960 에서 로그인·회원가입이 모두 햄버거 뒤에 있어 게스트가 입구를 찾아야 했고, 햄버거는 40×40 이었다.
  하단 탭 바는 계측 뒤로 미뤘다(결정 D-7) — 여기서는 만들지 않는다.
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

const mobileLogin = () => document.querySelector('[data-mobile-login]')

/**
 * SSR 한 번으로 마크업과 styled-components 가 낸 CSS(공백 제거)를 함께 돌려준다. 클래스 해시는 렌더
 * 환경마다 달라질 수 있어 같은 렌더의 마크업에서 클래스를 읽는다.
 */
const renderSsr = (): { html: string; css: string } => {
  const sheet = new ServerStyleSheet()
  try {
    const html = renderToStaticMarkup(sheet.collectStyles(element()))
    return { html, css: sheet.getStyleTags().replace(/\s+/g, '') }
  } finally {
    sheet.seal()
  }
}

/** `marker` 속성이 붙은 요소의 마지막 클래스(스타일 클래스). */
const styleClassOf = (html: string, marker: string): string => {
  const tag = html.match(new RegExp(`<[a-z]+[^>]*${marker}[^>]*>`))?.[0] ?? ''
  const classes = tag.match(/class="([^"]+)"/)?.[1].split(' ') ?? []
  return classes.at(-1) ?? ''
}

/** 이 클래스가 받은 선언들을 한 문자열로 모은다(미디어 블록 안 포함). */
const declarationsOf = (css: string, className: string): string =>
  [...css.matchAll(new RegExp(`\\.${className}\\{([^}]*)\\}`, 'g'))]
    .map(match => match[1])
    .join(';')

afterEach(() => {
  cleanup()
  useAuthStore.setState({
    hasHydrated: false,
    isLoggedIn: false,
    memberInfo: null,
  })
})

describe('SiteHeader — 모바일 로그인 입구(#601)', () => {
  it('세션 확인이 끝난 게스트에게 햄버거 옆 「로그인」 링크를 낸다', () => {
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: false,
      memberInfo: null,
    })
    render(element())

    const link = mobileLogin()
    expect(link?.getAttribute('href')).toBe('/login')
    expect(link?.textContent).toBe('로그인')
    // 햄버거보다 앞에 온다 — 화면에서 [로그인][☰] 순서다.
    const toggle = document.querySelector('button[aria-label="메뉴 열기"]')
    expect(
      link!.compareDocumentPosition(toggle!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('세션 확인 전에는 내지 않는다 — 회원에게 잘못된 상태를 비추지 않는다(#579)', () => {
    useAuthStore.setState({
      hasHydrated: false,
      isLoggedIn: false,
      memberInfo: null,
    })
    render(element())

    expect(mobileLogin()).toBeNull()
  })

  it('회원에게는 내지 않는다', () => {
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo: member as never,
    })
    render(element())

    expect(mobileLogin()).toBeNull()
  })

  it('≤960 에서만 보이고 터치 영역이 44px 이다', () => {
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: false,
      memberInfo: null,
    })
    render(element())
    // 세션 확인 뒤에만 그려지므로 SSR(확인 전 상태)이 아니라 jsdom 에 들어간 스타일에서 읽는다.
    const className = [...mobileLogin()!.classList].at(-1)!
    const css = [...document.querySelectorAll('style')]
      .map(style => style.textContent ?? '')
      .join('')
      .replace(/\s+/g, '')
    const declarations = declarationsOf(css, className)

    expect(declarations).toContain('display:none')
    expect(declarations).toContain('min-height:44px')
    expect(declarations).toContain('min-width:44px')
    expect(css).toMatch(
      new RegExp(
        `@media\\(max-width:960px\\)\\{\\.${className}\\{display:inline-flex;\\}\\}`,
      ),
    )
  })
})

describe('SiteHeader — 메뉴 버튼 44px(#601)', () => {
  it('햄버거 토글이 44×44 다', () => {
    useAuthStore.setState({
      hasHydrated: true,
      isLoggedIn: false,
      memberInfo: null,
    })
    const { html, css } = renderSsr()
    const className = styleClassOf(html, 'aria-label="메뉴 열기"')
    const declarations = declarationsOf(css, className)

    expect(declarations).toContain('width:44px')
    expect(declarations).toContain('height:44px')
    expect(declarations).not.toContain('width:40px')
  })
})
