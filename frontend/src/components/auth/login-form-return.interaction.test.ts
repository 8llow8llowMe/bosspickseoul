// @vitest-environment jsdom
import { createElement } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'

/*
  로그인 성공 뒤 복귀 경로(#576 검증 공백).
  로그인 폼은 세션을 확인(hydrate)한 뒤 `router.replace(returnTo)` 를 부른다. 같은 확인으로
  `isLoggedIn` 이 켜지면 바깥 `GuestOnly` 도 「로그인한 사람은 내보낸다」며 `router.replace` 를
  부른다. 둘이 다른 곳을 가리키면 늦게 부른 쪽(GuestOnly 의 effect)이 이겨 사용자가 홈으로 떨어진다.
  그래서 GuestOnly 도 같은 복귀 경로로 보내야 한다 — 마지막 이동이 returnTo 인지 본다.
  스토어는 목이 아니라 실물을 쓴다(경쟁이 실제 갱신 순서에서 생기므로).
*/

const searchBox = vi.hoisted(() => ({ current: '' }))
const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace }),
  useSearchParams: () => new URLSearchParams(searchBox.current),
}))

const { default: LoginForm } = await import('./login-form')

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

beforeEach(() => {
  searchBox.current = ''
  replace.mockReset()
  window.sessionStorage.clear()
  useAuthStore.setState({
    hasHydrated: true,
    isLoggedIn: false,
    memberInfo: null,
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url === '/api/auth/login') return json({ memberId: '7' })
      if (url === '/api/auth/me') {
        return json({
          authenticated: true,
          member: { memberId: '7', nickname: '사장님' },
        })
      }
      throw new Error(`예상하지 못한 호출: ${url}`)
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useAuthStore.setState({
    hasHydrated: false,
    isLoggedIn: false,
    memberInfo: null,
  })
})

const loginAs = async () => {
  render(createElement(LoginForm, { assumeGuest: true }))
  const email = document.querySelector<HTMLInputElement>('input[name="email"]')!
  const password = document.querySelector<HTMLInputElement>(
    'input[name="password"]',
  )!
  fireEvent.change(email, { target: { value: 'owner@example.com' } })
  fireEvent.change(password, { target: { value: 'Passw0rd!' } })
  await act(async () => {
    fireEvent.submit(document.querySelector('form')!)
  })
  await waitFor(() => expect(replace).toHaveBeenCalled())
  // GuestOnly 의 effect 가 뒤따라 부를 기회를 준다.
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

describe('LoginForm — 로그인 뒤 복귀 경로', () => {
  it('가입 직후 화면에서 로그인하면 원래 가려던 화면으로 간다 — 홈으로 덮이지 않는다', async () => {
    searchBox.current = 'signup=1&redirect=%2Fanalysis'

    await loginAs()

    expect(replace.mock.calls.at(-1)?.[0]).toBe('/analysis')
    expect(replace.mock.calls.map(call => call[0])).not.toContain('/')
  })

  it('복귀 경로가 없으면 홈으로 간다', async () => {
    await loginAs()

    expect(replace.mock.calls.at(-1)?.[0]).toBe('/')
  })

  it('복귀 경로가 외부 주소면 홈으로 간다', async () => {
    searchBox.current = 'redirect=%2F%2Fevil.example'

    await loginAs()

    expect(replace.mock.calls.map(call => call[0])).toEqual(
      expect.arrayContaining(['/']),
    )
    expect(
      replace.mock.calls.some(call => String(call[0]).includes('evil')),
    ).toBe(false)
  })
})
