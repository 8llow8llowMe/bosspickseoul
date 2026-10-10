import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import ProfileShell from '@/components/profile/profile-shell'

vi.mock('next/navigation', () => ({
  usePathname: () => '/profile/settings/edit',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: Record<string, unknown>) => unknown) =>
    select({
      hasHydrated: false,
      isLoggedIn: true,
      memberInfo: {
        memberId: 'member-1',
        email: 'owner@example.com',
        nickname: '길동이',
        profileImageUrl: '',
        role: { code: 'USER', name: '일반 회원', description: '일반 회원' },
      },
      setSession: () => {},
      clearSession: () => {},
    }),
}))

const renderShell = () => {
  const sheet = new ServerStyleSheet()
  try {
    const markup = renderToStaticMarkup(
      sheet.collectStyles(
        createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          createElement(ProfileShell, null, createElement('p', null, '본문')),
        ),
      ),
    )
    return { markup, styles: sheet.getStyleTags().replace(/\s+/g, '') }
  } finally {
    sheet.seal()
  }
}

/*
  #575 — 1024px 이하에서 사이드바 카드 세 장이 본문 위로 쌓여 입력칸이 약 750px 아래에서 시작했다. 좁은 화면에서는
  머리를 「48px 아바타 + 닉네임」 한 줄로 접고, 메뉴는 가로 탭, 약관 카드는 숨긴다(푸터에 같은 링크가 있다).
*/
describe('ProfileShell — 좁은 화면 머리', () => {
  it('아바타를 48px 로 줄인다', () => {
    expect(renderShell().styles).toMatch(
      /@media\(max-width:1024px\)\{[^}]*\{width:48px;height:48px;/,
    )
  })

  it('메뉴를 가로 탭(한 줄 두 칸)으로 펼친다', () => {
    expect(renderShell().styles).toContain(
      'grid-auto-columns:minmax(0,1fr);grid-auto-flow:column;',
    )
  })

  it('약관 카드와 이메일·회원 유형을 숨긴다', () => {
    const { styles } = renderShell()

    expect(
      styles.match(/@media\(max-width:1024px\)\{[^}]*\{display:none;\}/g)
        ?.length,
    ).toBeGreaterThanOrEqual(3)
  })

  it('메뉴 글자에 primary-700(blue500)을 쓰지 않는다 — 흰 바탕 위 2.77:1 이다', () => {
    const { styles } = renderShell()

    expect(styles).not.toMatch(/(?<![-\w])color:var\(--color-primary-700\)/)
  })

  it('본문과 메뉴는 그대로 그린다', () => {
    const { markup } = renderShell()

    expect(markup).toContain('본문')
    expect(markup).toContain('aria-label="프로필 메뉴"')
  })
})
