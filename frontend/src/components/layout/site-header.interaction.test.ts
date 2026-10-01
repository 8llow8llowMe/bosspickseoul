// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SiteHeader from '@/components/layout/site-header'
import {
  COMMUNITY_HEADER_HIDDEN_ATTRIBUTE,
  COMMUNITY_HEADER_HIDDEN_SELECTOR,
} from '@/lib/community/hidden-header'

/*
  목록 숨는 헤더(community.md §S4 「숨는 헤더」, CM-043)에서 사이트 헤더 쪽 계약.
  헤더는 목록이 켠 <html> 속성을 CSS 로 읽기만 한다 — 그 선택자가 언제 헤더에 걸리는지를
  jsdom 의 선택자 엔진으로 잠근다(실제 transform 은 CSS 라 jsdom 이 계산하지 않는다).
*/

const pathnameBox = vi.hoisted(() => ({ current: '/community/list' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameBox.current,
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

const renderHeader = (pathname: string) => {
  pathnameBox.current = pathname
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    createElement(QueryClientProvider, { client }, createElement(SiteHeader)),
  )
}

const hiddenHeader = () =>
  document.querySelector(
    `${COMMUNITY_HEADER_HIDDEN_SELECTOR} [data-site-header]`,
  )

/* 토글은 CSS 로 ≤960 에서만 보인다. jsdom 은 미디어를 계산하지 않아 역할 조회 대신 이름표로 찾는다. */
const menuToggle = (label: string) => {
  const button = document.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  )

  if (!button) {
    throw new Error(`${label} 버튼이 없다`)
  }

  return button
}

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute(COMMUNITY_HEADER_HIDDEN_ATTRIBUTE)
})

describe('SiteHeader — 목록 숨는 헤더 연결', () => {
  it('matches the hide rule only while the list sets the root attribute', () => {
    renderHeader('/community/list')

    expect(hiddenHeader()).toBeNull()

    document.documentElement.setAttribute(
      COMMUNITY_HEADER_HIDDEN_ATTRIBUTE,
      'true',
    )
    expect(hiddenHeader()).not.toBeNull()
  })

  it('never hides while the mobile menu panel is open', () => {
    renderHeader('/community/list')
    document.documentElement.setAttribute(
      COMMUNITY_HEADER_HIDDEN_ATTRIBUTE,
      'true',
    )

    act(() => {
      fireEvent.click(menuToggle('메뉴 열기'))
    })

    expect(
      document
        .querySelector('[data-site-header]')
        ?.getAttribute('data-menu-open'),
    ).toBe('true')
    expect(hiddenHeader()).toBeNull()

    act(() => {
      fireEvent.click(menuToggle('메뉴 닫기'))
    })

    expect(
      document
        .querySelector('[data-site-header]')
        ?.hasAttribute('data-menu-open'),
    ).toBe(false)
    expect(hiddenHeader()).not.toBeNull()
  })

  it('comes back while keyboard focus is inside the header', () => {
    const { getByRole } = renderHeader('/community/list')
    document.documentElement.setAttribute(
      COMMUNITY_HEADER_HIDDEN_ATTRIBUTE,
      'true',
    )

    act(() => {
      getByRole('link', { name: 'BossPickSeoul 홈' }).focus()
    })

    expect(hiddenHeader()).toBeNull()
  })

  it('does not set the attribute by itself on any screen when scrolling', () => {
    for (const pathname of ['/', '/analysis', '/community/list']) {
      renderHeader(pathname)
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: 600,
      })
      window.dispatchEvent(new Event('scroll'))

      expect(
        document.documentElement.hasAttribute(
          COMMUNITY_HEADER_HIDDEN_ATTRIBUTE,
        ),
      ).toBe(false)
      expect(hiddenHeader()).toBeNull()
      cleanup()
    }
  })
})
