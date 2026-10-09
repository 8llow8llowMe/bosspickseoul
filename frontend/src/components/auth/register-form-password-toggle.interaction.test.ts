// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/* 가입 화면의 비밀번호 표시 토글(#557) — 로그인과 같은 계약이다. 이메일 인증 뒤에야 나타난다. */

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { hasHydrated: boolean; isLoggedIn: boolean }) => unknown,
  ) => selector({ hasHydrated: true, isLoggedIn: false }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}))

const { default: RegisterForm } = await import('./register-form')

const ok = () =>
  new Response(
    JSON.stringify({
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: null,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const input = (name: string) => {
  const element = document.querySelector<HTMLInputElement>(
    `input[name="${name}"]`,
  )
  if (!element) throw new Error(`입력칸이 없다: ${name}`)
  return element
}

const button = (label: RegExp) => {
  const element = Array.from(
    document.querySelectorAll<HTMLButtonElement>('button'),
  ).find(candidate => label.test(candidate.textContent ?? ''))
  if (!element) throw new Error(`버튼이 없다: ${label}`)
  return element
}

const click = async (element: HTMLElement) => {
  await act(async () => {
    fireEvent.click(element)
  })
}

describe('RegisterForm — 비밀번호 표시 토글', () => {
  it('인증 뒤에 아이콘 토글이 나타나고 aria-pressed 로 상태를 말한다', async () => {
    const { getByRole } = render(createElement(RegisterForm))

    fireEvent.change(input('email'), { target: { value: 'a@b.com' } })
    fetchMock.mockResolvedValueOnce(ok())
    await click(button(/인증코드 발송/))
    fireEvent.change(input('code'), { target: { value: '123456' } })
    fetchMock.mockResolvedValueOnce(ok())
    await click(button(/인증 확인/))

    const toggle = getByRole('button', { name: '비밀번호 표시' })
    expect(toggle.textContent).toBe('')
    expect(toggle.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(input('password').type).toBe('password')

    await click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(input('password').type).toBe('text')

    await click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(input('password').type).toBe('password')
  })
})
