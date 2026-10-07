// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SocialLogin, { type SocialLoginProps } from './social-login'
import {
  EMPTY_SIGNUP_CONSENT,
  setAllSignupConsent,
} from '@/lib/auth/signup-consent'

/*
  카카오 버튼의 가입 모드(#495, 명세 §4-4 · TC-CON-006).
  동의가 모자라면 이동하지 않고 부모에게 알리고, 다 되면 동의 쿼리를 실어 authorize 를 부른다.
  authorize 는 실패로 돌려 실제 이동(window.location.assign)은 일어나지 않게 한다.
*/

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({
        dataHeader: { success: false, resultCode: null, resultMessage: 'x' },
        dataBody: null,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    ),
  )
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const clickKakao = async (props: SocialLoginProps = {}) => {
  const view = render(createElement<SocialLoginProps>(SocialLogin, props))
  const button = view.getByRole('button', { name: /카카오/ })
  await act(async () => {
    fireEvent.click(button)
  })
  return view
}

describe('SocialLogin — 가입 모드 (TC-CON-006)', () => {
  it('동의가 모자라면 authorize 를 부르지 않고 빠진 항목을 알린다', async () => {
    const onConsentIncomplete = vi.fn()

    await clickKakao({
      consent: { ...EMPTY_SIGNUP_CONSENT, termsAgreed: true },
      onConsentIncomplete,
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(onConsentIncomplete).toHaveBeenCalledWith([
      'privacyAgreed',
      'ageOver14Confirmed',
    ])
  })

  it('동의가 모자라도 버튼은 비활성화하지 않는다 — 누르면 무엇이 빠졌는지 알려 준다', () => {
    const view = render(
      createElement<SocialLoginProps>(SocialLogin, {
        consent: EMPTY_SIGNUP_CONSENT,
      }),
    )

    expect(
      (view.getByRole('button', { name: /카카오/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false)
  })

  it('동의가 다 되면 동의 쿼리를 붙여 authorize 를 부른다', async () => {
    const onConsentIncomplete = vi.fn()

    await clickKakao({
      consent: setAllSignupConsent(true),
      onConsentIncomplete,
    })

    expect(onConsentIncomplete).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/social/kakao/authorize?termsAgreed=true&privacyAgreed=true&ageOver14Confirmed=true',
      { cache: 'no-store' },
    )
  })

  it('consent 가 없으면(로그인 화면) 동의 쿼리 없이 시작한다', async () => {
    await clickKakao()

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/social/kakao/authorize', {
      cache: 'no-store',
    })
  })

  it('showDivider={false} 면 「또는」 구분선을 그리지 않는다', () => {
    const withDivider = render(createElement(SocialLogin))
    expect(withDivider.container.textContent).toContain('또는')
    cleanup()

    const withoutDivider = render(
      createElement<SocialLoginProps>(SocialLogin, { showDivider: false }),
    )
    expect(withoutDivider.container.textContent).not.toContain('또는')
  })
})
