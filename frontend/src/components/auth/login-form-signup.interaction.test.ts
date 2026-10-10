// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SIGNUP_EMAIL_STORAGE_KEY } from './auth-flow'

/*
  가입 직후 로그인 화면(#576) · 카카오를 맨 위에(#577).
  - `?signup=1` 이면 가입을 마쳤다는 안내를 띄우고, 탭 저장소에 맡긴 이메일을 채운 뒤 비밀번호로 포커스한다.
  - 「회원가입」 링크가 원래 가려던 화면(`redirect`)을 들고 간다.
*/

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: Object.assign(
    (
      selector: (state: {
        hasHydrated: boolean
        isLoggedIn: boolean
      }) => unknown,
    ) => selector({ hasHydrated: true, isLoggedIn: false }),
    { getState: () => ({ hydrate: async () => undefined }) },
  ),
}))

const searchBox = vi.hoisted(() => ({ current: '' }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
  useSearchParams: () => new URLSearchParams(searchBox.current),
}))

const { default: LoginForm } = await import('./login-form')

const SIGNUP_NOTICE = '가입을 마쳤어요. 방금 만든 비밀번호로 로그인해 주세요.'

const input = (name: string) => {
  const element = document.querySelector<HTMLInputElement>(
    `input[name="${name}"]`,
  )
  if (!element) throw new Error(`입력칸이 없다: ${name}`)
  return element
}

const renderLogin = async () => {
  await act(async () => {
    render(createElement(LoginForm))
  })
}

beforeEach(() => {
  searchBox.current = ''
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('LoginForm — 가입 직후(#576)', () => {
  it('signup=1 이면 안내를 띄우고 맡겨 둔 이메일을 채운 뒤 비밀번호로 포커스한다', async () => {
    searchBox.current = 'signup=1&redirect=%2Fanalysis'
    window.sessionStorage.setItem(SIGNUP_EMAIL_STORAGE_KEY, 'owner@example.com')

    await renderLogin()

    expect(document.body.textContent).toContain(SIGNUP_NOTICE)
    expect(input('email').value).toBe('owner@example.com')
    expect(document.activeElement).toBe(input('password'))
    // 한 번 꺼내면 지운다 — 새로고침하거나 다른 사람이 이 탭을 써도 남지 않는다.
    expect(window.sessionStorage.getItem(SIGNUP_EMAIL_STORAGE_KEY)).toBeNull()
  })

  it('signup=1 이 없으면 맡겨 둔 이메일을 건드리지 않는다', async () => {
    window.sessionStorage.setItem(SIGNUP_EMAIL_STORAGE_KEY, 'owner@example.com')

    await renderLogin()

    expect(document.body.textContent).not.toContain(SIGNUP_NOTICE)
    expect(input('email').value).toBe('')
    expect(window.sessionStorage.getItem(SIGNUP_EMAIL_STORAGE_KEY)).toBe(
      'owner@example.com',
    )
  })

  it('맡겨 둔 이메일이 없어도 안내는 띄운다', async () => {
    searchBox.current = 'signup=1'

    await renderLogin()

    expect(document.body.textContent).toContain(SIGNUP_NOTICE)
    expect(input('email').value).toBe('')
  })
})

describe('LoginForm — 회원가입 링크가 복귀 경로를 들고 간다(#576)', () => {
  const registerLink = () =>
    Array.from(document.querySelectorAll('a')).find(
      anchor => anchor.textContent === '회원가입',
    )

  it('내부 경로면 redirect 로 넘긴다', async () => {
    searchBox.current = 'redirect=%2Fsimulation%2Freport'

    await renderLogin()

    expect(registerLink()?.getAttribute('href')).toBe(
      '/register?redirect=%2Fsimulation%2Freport',
    )
  })

  it.each(['https%3A%2F%2Fevil.example', '%2F%2Fevil.example'])(
    '외부 주소(%s)는 넘기지 않는다',
    async raw => {
      searchBox.current = `redirect=${raw}`

      await renderLogin()

      expect(registerLink()?.getAttribute('href')).toBe('/register')
    },
  )
})

describe('LoginForm — 카카오를 맨 위에(#577)', () => {
  it('「카카오 로그인」 버튼이 이메일 폼보다 위에 있고 그 사이에 「또는 이메일로」가 있다', async () => {
    await renderLogin()

    const kakao = Array.from(document.querySelectorAll('button')).find(
      candidate => candidate.textContent === '카카오 로그인',
    )
    const form = document.querySelector('form')
    expect(kakao).toBeDefined()
    expect(form).not.toBeNull()
    expect(
      (kakao as HTMLElement).compareDocumentPosition(form as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    const text = document.body.textContent ?? ''
    const divider = text.indexOf('또는 이메일로')
    expect(text.indexOf('카카오 로그인')).toBeLessThan(divider)
    expect(divider).toBeLessThan(text.indexOf('비밀번호'))
  })
})
