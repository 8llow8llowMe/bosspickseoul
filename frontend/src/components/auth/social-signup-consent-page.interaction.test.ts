// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signupConsentInputId } from './signup-consent-fieldset'
import { AUTH_RETURN_COOKIE } from '@/lib/auth/return-path'

/*
  카카오 첫 가입 동의 화면의 상호작용(#495). 마크업 계약은 social-signup-consent-page.test.ts.
  - 콜백이 지운 복귀 경로를 `redirect` → `returnTo` 로 받아, 카카오로 떠나기 직전 쿠키에 다시 남긴다.
  - 동의가 모자라면 강조가 그려진 뒤 첫 항목으로 포커스를 옮긴다.
*/

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { hasHydrated: boolean; isLoggedIn: boolean }) => unknown,
  ) => selector({ hasHydrated: true, isLoggedIn: false }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
}))

const { default: SocialSignupConsentPage } =
  await import('./social-signup-consent-page')

const PREFIX = 'social-signup-consent'
const fetchMock = vi.fn()
const assign = vi.fn()
const originalLocation = window.location

const clearReturnCookie = () => {
  document.cookie = `${AUTH_RETURN_COOKIE}=; path=/; max-age=0`
}

beforeEach(() => {
  fetchMock.mockReset()
  assign.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  // jsdom 은 다른 문서로의 이동을 구현하지 않는다 — assign 만 갈아끼운다.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, assign, protocol: 'http:' },
  })
  clearReturnCookie()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  })
  clearReturnCookie()
})

const kakao = () => {
  const element = Array.from(document.querySelectorAll('button')).find(
    candidate => /카카오/.test(candidate.textContent ?? ''),
  )
  if (!element) throw new Error('카카오 버튼이 없다')
  return element
}

const consentBox = (key: string) =>
  document.getElementById(`${PREFIX}-${key}`) as HTMLInputElement

describe('SocialSignupConsentPage — 상호작용', () => {
  it('redirect 로 받은 복귀 경로를 카카오로 떠나기 직전 auth_return 쿠키에 남긴다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          dataHeader: { success: true, resultCode: null, resultMessage: null },
          dataBody: {
            authorizationUrl: 'https://kauth.kakao.com/oauth?state=s',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    render(
      createElement(SocialSignupConsentPage, {
        reason: 'terms',
        returnTo: '/community?tab=1',
      }),
    )
    fireEvent.click(document.getElementById(`${PREFIX}-all`) as HTMLElement)

    await act(async () => {
      fireEvent.click(kakao())
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/social/kakao/authorize?termsAgreed=true&privacyAgreed=true&ageOver14Confirmed=true',
      { cache: 'no-store' },
    )
    expect(document.cookie).toContain(
      `${AUTH_RETURN_COOKIE}=${encodeURIComponent('/community?tab=1')}`,
    )
    expect(assign).toHaveBeenCalledWith('https://kauth.kakao.com/oauth?state=s')
  })

  it('동의가 모자라면 강조가 그려진 뒤 첫 빠진 항목으로 포커스를 옮긴다', async () => {
    render(
      createElement(SocialSignupConsentPage, {
        reason: 'terms',
        returnTo: '/',
      }),
    )
    const seen: (string | null)[] = []
    consentBox('termsAgreed').addEventListener('focus', event => {
      seen.push((event.target as HTMLElement).getAttribute('aria-invalid'))
    })

    await act(async () => {
      fireEvent.click(kakao())
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(
      document.getElementById(signupConsentInputId(PREFIX, 'termsAgreed')),
    )
    expect(seen).toEqual(['true'])
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      '카카오로 가입하려면 필수 항목에 모두 동의해 주세요.',
    )
    expect(document.cookie).not.toContain(AUTH_RETURN_COOKIE)
  })
})
