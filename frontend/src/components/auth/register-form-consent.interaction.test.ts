// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signupConsentInputId } from './signup-consent-fieldset'
import type { SignupConsentKey } from '@/lib/auth/signup-consent'

/*
  이메일 가입 화면의 동의(#495, 명세 §4-3).
  - 동의 fieldset 은 단계와 무관하게 항상 보인다.
  - 가입 바디에 boolean 세 개를 싣고 판(version)은 싣지 않는다.
  - 동의 오류 코드가 오면 그 체크박스를 강조하고 포커스를 옮기며, 이메일 인증 상태는 그대로 둔다.
*/

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { hasHydrated: boolean; isLoggedIn: boolean }) => unknown,
  ) => selector({ hasHydrated: true, isLoggedIn: false }),
}))

const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace }),
  useSearchParams: () => new URLSearchParams(),
}))

const { default: RegisterForm } = await import('./register-form')

const PREFIX = 'register-consent'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const ok = () =>
  json({
    dataHeader: { success: true, resultCode: null, resultMessage: null },
    dataBody: null,
  })

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  replace.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const consentBox = (key: SignupConsentKey) => {
  const element = document.getElementById(signupConsentInputId(PREFIX, key))
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`체크박스가 없다: ${key}`)
  }
  return element
}

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

/**
 * 포커스가 도착한 순간의 `aria-invalid` 를 기록한다. 포커스가 강조보다 먼저 가면 스크린리더가
 * 오류 없는 체크박스를 읽는다(코드 리뷰 M1) — 커밋 뒤에 포커스해야 한다.
 */
const recordInvalidOnFocus = (key: SignupConsentKey) => {
  const seen: (string | null)[] = []
  consentBox(key).addEventListener('focus', event => {
    seen.push((event.target as HTMLElement).getAttribute('aria-invalid'))
  })
  return seen
}

const click = async (element: HTMLElement) => {
  await act(async () => {
    fireEvent.click(element)
  })
}

/** 이메일 인증을 마치고 나머지 칸을 채운 상태까지 간다. */
const reachVerified = async () => {
  fireEvent.change(input('email'), { target: { value: 'a@b.com' } })
  fetchMock.mockResolvedValueOnce(ok())
  await click(button(/인증코드 발송/))
  fireEvent.change(input('code'), { target: { value: '123456' } })
  fetchMock.mockResolvedValueOnce(ok())
  await click(button(/인증 확인/))
  fireEvent.change(input('password'), { target: { value: 'Passw0rd!' } })
  fireEvent.change(input('name'), { target: { value: '홍길동' } })
  fireEvent.change(input('nickname'), { target: { value: '길동짱' } })
}

describe('RegisterForm — 가입 동의 (#495)', () => {
  it('이메일을 입력하기 전에도 동의 체크박스가 보인다', () => {
    render(createElement(RegisterForm))

    expect(consentBox('termsAgreed')).toBeDefined()
    expect(consentBox('privacyAgreed')).toBeDefined()
    expect(consentBox('ageOver14Confirmed')).toBeDefined()
  })

  it('동의 없이 카카오를 누르면 이동하지 않고 빠진 항목을 강조한다', async () => {
    render(createElement(RegisterForm))
    const seen = recordInvalidOnFocus('privacyAgreed')

    fireEvent.click(consentBox('termsAgreed'))
    await click(button(/카카오/))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain(
      '카카오로 가입하려면 필수 항목에 모두 동의해 주세요.',
    )
    expect(consentBox('termsAgreed').getAttribute('aria-invalid')).toBeNull()
    expect(consentBox('privacyAgreed').getAttribute('aria-invalid')).toBe(
      'true',
    )
    expect(document.activeElement).toBe(consentBox('privacyAgreed'))
    expect(seen).toEqual(['true'])
    // 오류 Notice 는 role="alert" 로 알린다.
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      '카카오로 가입하려면 필수 항목에 모두 동의해 주세요.',
    )
  })

  it('동의 전에는 가입 버튼이 꺼져 있고, 동의하면 켜진다', async () => {
    render(createElement(RegisterForm))
    await reachVerified()

    expect(button(/^회원가입$/).disabled).toBe(true)

    fireEvent.click(document.getElementById(`${PREFIX}-all`) as HTMLElement)

    expect(button(/^회원가입$/).disabled).toBe(false)
  })

  it('가입 바디에 동의 세 값을 싣고 판(version)은 싣지 않는다', async () => {
    render(createElement(RegisterForm))
    await reachVerified()
    fireEvent.click(document.getElementById(`${PREFIX}-all`) as HTMLElement)
    fetchMock.mockResolvedValueOnce(ok())

    await click(button(/^회원가입$/))

    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
    expect(url).toBe('/api/bff/members/signup')
    const body = JSON.parse(String(init.body))
    expect(body).toEqual({
      email: 'a@b.com',
      password: 'Passw0rd!',
      name: '홍길동',
      nickname: '길동짱',
      termsAgreed: true,
      privacyAgreed: true,
      ageOver14Confirmed: true,
    })
    expect(JSON.stringify(body)).not.toMatch(/version/i)
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('MEMBER_116 이면 만 14세 체크박스를 강조하고 포커스를 옮기며, 인증 상태는 그대로 둔다', async () => {
    render(createElement(RegisterForm))
    await reachVerified()
    fireEvent.click(document.getElementById(`${PREFIX}-all`) as HTMLElement)
    const seen = recordInvalidOnFocus('ageOver14Confirmed')
    fetchMock.mockResolvedValueOnce(
      json(
        {
          dataHeader: {
            success: false,
            resultCode: 'MEMBER_116',
            resultMessage: {
              message: '만 14세 이상만 가입할 수 있습니다.',
              errors: [
                {
                  code: 'MEMBER_116',
                  field: 'ageOver14Confirmed',
                  message: '만 14세 이상만 가입할 수 있습니다.',
                },
              ],
            },
          },
          dataBody: null,
        },
        400,
      ),
    )

    await click(button(/^회원가입$/))

    const age = consentBox('ageOver14Confirmed')
    expect(age.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(age)
    expect(seen).toEqual(['true'])
    const errorId = age.getAttribute('aria-describedby')
    expect(document.getElementById(String(errorId))?.textContent).toBe(
      '만 14세 이상만 가입할 수 있어요.',
    )
    // 동의로 거절돼도 인증은 소비되지 않는다(계약 §0-1) — 다시 인증하게 하지 않는다.
    expect(document.body.textContent).toContain('이메일 인증 완료')
    expect(input('email').readOnly).toBe(true)
  })

  it('errors[] 에 여러 항목이 오면 모두 강조하고 첫 항목으로 포커스를 옮긴다', async () => {
    render(createElement(RegisterForm))
    await reachVerified()
    fireEvent.click(document.getElementById(`${PREFIX}-all`) as HTMLElement)
    fetchMock.mockResolvedValueOnce(
      json(
        {
          dataHeader: {
            success: false,
            resultCode: 'MEMBER_114',
            resultMessage: {
              message: '이용약관에 동의해야 합니다.',
              errors: [
                { code: 'MEMBER_114', field: 'termsAgreed', message: 'a' },
                { code: 'MEMBER_115', field: 'privacyAgreed', message: 'b' },
              ],
            },
          },
          dataBody: null,
        },
        400,
      ),
    )

    await click(button(/^회원가입$/))

    expect(consentBox('termsAgreed').getAttribute('aria-invalid')).toBe('true')
    expect(consentBox('privacyAgreed').getAttribute('aria-invalid')).toBe(
      'true',
    )
    expect(
      consentBox('ageOver14Confirmed').getAttribute('aria-invalid'),
    ).toBeNull()
    expect(document.activeElement).toBe(consentBox('termsAgreed'))
  })

  it('MEMBER_010(약관·처리방침 공용)인데 둘 다 켜져 있으면 둘 다 강조한다', async () => {
    render(createElement(RegisterForm))
    await reachVerified()
    fireEvent.click(document.getElementById(`${PREFIX}-all`) as HTMLElement)
    fetchMock.mockResolvedValueOnce(
      json(
        {
          dataHeader: {
            success: false,
            resultCode: 'MEMBER_010',
            resultMessage: '필수 약관에 동의해야 합니다.',
          },
          dataBody: null,
        },
        400,
      ),
    )

    await click(button(/^회원가입$/))

    expect(consentBox('termsAgreed').getAttribute('aria-invalid')).toBe('true')
    expect(consentBox('privacyAgreed').getAttribute('aria-invalid')).toBe(
      'true',
    )
    expect(
      consentBox('ageOver14Confirmed').getAttribute('aria-invalid'),
    ).toBeNull()
  })
})
