// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/*
  비밀번호 표시 토글(#557). 모바일 히트 영역은 CSS 라 Playwright 가 재고, 여기서는
  접근성 계약만 본다 — 누름 상태는 aria-pressed 가 말하고, 입력 type 이 따라 바뀐다.
*/

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { hasHydrated: boolean; isLoggedIn: boolean }) => unknown,
  ) => selector({ hasHydrated: true, isLoggedIn: false }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}))

const { default: LoginForm } = await import('./login-form')

afterEach(() => cleanup())

describe('LoginForm — 비밀번호 표시 토글', () => {
  it('보이는 것은 아이콘뿐이고 아이콘은 보조기기에서 숨긴다', () => {
    const { getByRole } = render(createElement(LoginForm))
    const toggle = getByRole('button', { name: '비밀번호 표시' })

    expect(toggle.textContent).toBe('')
    expect(toggle.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

  it('누르기 전에는 aria-pressed=false 이고 입력은 password 다', () => {
    const { container, getByRole } = render(createElement(LoginForm))
    const toggle = getByRole('button', { name: '비밀번호 표시' })

    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(
      container.querySelector('input[name="password"]')?.getAttribute('type'),
    ).toBe('password')
  })

  it('누르면 aria-pressed=true, 입력은 text 가 되고 다시 누르면 돌아온다', () => {
    const { container, getByRole } = render(createElement(LoginForm))
    const toggle = getByRole('button', { name: '비밀번호 표시' })

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(
      container.querySelector('input[name="password"]')?.getAttribute('type'),
    ).toBe('text')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(
      container.querySelector('input[name="password"]')?.getAttribute('type'),
    ).toBe('password')
  })

  it('누를 때 포커스를 입력칸에 남긴다 — 공용 TextField revealable 과 같은 동작(#583)', () => {
    const { container, getByRole } = render(createElement(LoginForm))
    const password = container.querySelector<HTMLInputElement>(
      'input[name="password"]',
    )!
    password.focus()
    const toggle = getByRole('button', { name: '비밀번호 표시' })

    // fireEvent 는 기본 동작을 막았으면 false 를 돌려준다.
    expect(fireEvent.pointerDown(toggle)).toBe(false)
    expect(fireEvent.mouseDown(toggle)).toBe(false)
    fireEvent.click(toggle)

    expect(document.activeElement).toBe(password)
  })
})
