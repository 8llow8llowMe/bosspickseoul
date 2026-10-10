// @vitest-environment jsdom
import { createElement, type ComponentType, type ReactNode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/*
  비로그인 방문자는 세션 확인을 기다리지 않고 폼을 본다(#579).
  서버가 세션 쿠키가 없다고 확인하면(`assumeGuest`) `/api/auth/me` 응답 전에도 폼을 그린다.
*/

const authState = vi.hoisted(() => ({
  current: { hasHydrated: false, isLoggedIn: false },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: typeof authState.current) => unknown) =>
    selector(authState.current),
}))

const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace }),
}))

const { default: GuestOnlyComponent } = await import('./guest-only')

/* children 을 createElement 의 세 번째 인자로 넘기려면 props 타입에서 children 이 선택이어야 한다. */
const GuestOnly = GuestOnlyComponent as ComponentType<{
  assumeGuest?: boolean
  redirectTo?: string
  children?: ReactNode
}>

const renderGuestOnly = async (assumeGuest?: boolean, redirectTo?: string) => {
  await act(async () => {
    render(
      createElement(
        GuestOnly,
        { assumeGuest, redirectTo },
        createElement('form', { 'aria-label': '로그인 폼' }),
      ),
    )
  })
}

const hasForm = () => document.querySelector('form') !== null

beforeEach(() => {
  replace.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('GuestOnly', () => {
  it('쿠키가 없다고 확인됐으면 세션 확인 전에도 폼을 바로 그린다', async () => {
    authState.current = { hasHydrated: false, isLoggedIn: false }

    await renderGuestOnly(true)

    expect(hasForm()).toBe(true)
    expect(document.body.textContent).not.toContain('세션 상태를 확인하는 중')
  })

  it('쿠키가 있으면(만료일 수도 있다) 예전처럼 세션 확인을 기다린다', async () => {
    authState.current = { hasHydrated: false, isLoggedIn: false }

    await renderGuestOnly(false)

    expect(hasForm()).toBe(false)
    expect(document.body.textContent).toContain(
      '세션 상태를 확인하는 중입니다.',
    )
  })

  it('확인 결과 로그인 상태면 assumeGuest 여도 폼을 거두고 홈으로 보낸다', async () => {
    authState.current = { hasHydrated: true, isLoggedIn: true }

    await renderGuestOnly(true)

    expect(hasForm()).toBe(false)
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('확인 결과 비로그인이면 폼을 그린다', async () => {
    authState.current = { hasHydrated: true, isLoggedIn: false }

    await renderGuestOnly()

    expect(hasForm()).toBe(true)
    expect(replace).not.toHaveBeenCalled()
  })

  it('로그인 상태면 받은 복귀 경로로 보낸다 — 로그인 폼의 이동과 같은 곳이라 홈으로 덮이지 않는다', async () => {
    authState.current = { hasHydrated: true, isLoggedIn: true }

    await renderGuestOnly(true, '/analysis')

    expect(replace).toHaveBeenCalledWith('/analysis')
  })

  it.each(['//evil.example', 'https://evil.example', '/\\evil.example'])(
    '복귀 경로가 외부(%s)면 홈으로 보낸다',
    async redirectTo => {
      authState.current = { hasHydrated: true, isLoggedIn: true }

      await renderGuestOnly(true, redirectTo)

      expect(replace).toHaveBeenCalledWith('/')
    },
  )
})
