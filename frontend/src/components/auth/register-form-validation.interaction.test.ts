// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SIGNUP_EMAIL_STORAGE_KEY } from './auth-flow'
import { REGISTER_FIELD_MESSAGES } from './register-machine'

/*
  가입 폼이 잠근 이유를 입력칸 옆에서 말한다(#578) · 가입을 마치면 안내와 함께 로그인으로
  잇고 원래 가려던 화면을 기억한다(#576).
*/

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { hasHydrated: boolean; isLoggedIn: boolean }) => unknown,
  ) => selector({ hasHydrated: true, isLoggedIn: false }),
}))

const searchBox = vi.hoisted(() => ({ current: '' }))
const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace }),
  useSearchParams: () => new URLSearchParams(searchBox.current),
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
  searchBox.current = ''
  fetchMock.mockReset()
  replace.mockReset()
  window.sessionStorage.clear()
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

const queryButton = (label: RegExp) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    candidate => label.test(candidate.textContent ?? ''),
  ) ?? null

const button = (label: RegExp) => {
  const element = queryButton(label)
  if (!element) throw new Error(`버튼이 없다: ${label}`)
  return element
}

const click = async (element: HTMLElement) => {
  await act(async () => {
    fireEvent.click(element)
  })
}

/** 입력칸이 `aria-describedby` 로 가리키는 글을 모두 이어 붙인다. */
const describedText = (element: HTMLElement) =>
  (element.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent ?? '')
    .join(' | ')

const sendCode = async (email = 'a@b.com') => {
  fireEvent.change(input('email'), { target: { value: email } })
  fetchMock.mockResolvedValueOnce(ok())
  await click(button(/인증코드 발송/))
}

const reachVerified = async () => {
  await sendCode()
  fireEvent.change(input('code'), { target: { value: '123456' } })
  fetchMock.mockResolvedValueOnce(ok())
  await click(button(/인증 확인/))
}

const agreeAll = () =>
  fireEvent.click(document.getElementById('register-consent-all') as Element)

describe('RegisterForm — 잠근 이유를 입력칸 옆에서 말한다(#578)', () => {
  it('이메일 형식이 틀려도 발송 버튼은 켜져 있고, 누르면 이메일 칸에 이유가 붙는다', async () => {
    render(createElement(RegisterForm))
    fireEvent.change(input('email'), { target: { value: 'not-an-email' } })

    const send = button(/인증코드 발송/)
    expect(send.disabled).toBe(false)
    await click(send)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(input('email').getAttribute('aria-invalid')).toBe('true')
    expect(describedText(input('email'))).toBe(
      '올바른 이메일 형식을 입력해주세요.',
    )
  })

  it('이메일 칸을 떠날 때 형식을 보고, 고쳐서 맞으면 오류를 걷는다', () => {
    render(createElement(RegisterForm))
    fireEvent.change(input('email'), { target: { value: 'a@b' } })
    fireEvent.blur(input('email'))

    expect(input('email').getAttribute('aria-invalid')).toBe('true')

    fireEvent.change(input('email'), { target: { value: 'a@b.com' } })
    expect(input('email').getAttribute('aria-invalid')).toBeNull()
    expect(input('email').getAttribute('aria-describedby')).toBeNull()
  })

  it('빈 이메일 칸은 지나가도 탓하지 않는다', () => {
    render(createElement(RegisterForm))
    fireEvent.blur(input('email'))

    expect(input('email').getAttribute('aria-invalid')).toBeNull()
  })

  it('인증코드가 비어도 확인 버튼은 켜져 있고, 누르면 코드 칸에 이유가 붙는다', async () => {
    render(createElement(RegisterForm))
    await sendCode()

    const verify = button(/인증 확인/)
    expect(verify.disabled).toBe(false)
    await click(verify)

    expect(describedText(input('code'))).toBe('인증코드를 입력해주세요.')
  })

  it('코드를 보낸 뒤 이메일을 고치면 발송 단계로 돌아가고 입력한 코드도 버린다', async () => {
    render(createElement(RegisterForm))
    await sendCode('a@b.com')
    fireEvent.change(input('code'), { target: { value: '123456' } })

    fireEvent.change(input('email'), { target: { value: 'c@d.com' } })

    expect(document.querySelector('input[name="code"]')).toBeNull()
    expect(queryButton(/인증 확인/)).toBeNull()
    expect(button(/인증코드 발송/).disabled).toBe(false)
  })

  it('비밀번호 칸은 규칙 체크리스트를 aria-describedby 로 읽고, 항목마다 지켰는지 말한다', async () => {
    render(createElement(RegisterForm))
    await reachVerified()

    const password = input('password')
    fireEvent.change(password, { target: { value: 'abc1' } })

    const rules = document.getElementById('register-password-rules')
    expect(rules?.tagName).toBe('UL')
    expect(password.getAttribute('aria-describedby')).toBe(
      'register-password-rules',
    )
    const items = Array.from(rules?.querySelectorAll('li') ?? []).map(
      item => item.textContent,
    )
    expect(items).toEqual([
      '영문자 충족',
      '숫자 충족',
      '특수문자 미충족',
      '공백 없이 8~20자 미충족',
    ])
  })

  it('비밀번호는 blur 로 오류 줄을 끼워 넣지 않는다 — 아래 「회원가입」 클릭이 밀려 빗나가지 않게', async () => {
    render(createElement(RegisterForm))
    await reachVerified()
    const password = input('password')

    fireEvent.change(password, { target: { value: 'weak' } })
    fireEvent.blur(password)

    expect(password.getAttribute('aria-invalid')).toBeNull()
    expect(document.getElementById('register-password-error')).toBeNull()
  })

  it('제출로 붙은 비밀번호 오류는 aria-describedby 로 규칙 목록과 함께 읽히고, 고치면 걷는다', async () => {
    render(createElement(RegisterForm))
    await reachVerified()
    const password = input('password')

    fireEvent.change(password, { target: { value: 'weak' } })
    await click(button(/^회원가입$/))

    expect(password.getAttribute('aria-invalid')).toBe('true')
    expect(password.getAttribute('aria-describedby')).toBe(
      'register-password-rules register-password-error',
    )
    expect(
      document.getElementById('register-password-error')?.textContent,
    ).toBe(REGISTER_FIELD_MESSAGES.password)

    fireEvent.change(password, { target: { value: 'Passw0rd!' } })
    expect(password.getAttribute('aria-invalid')).toBeNull()
    expect(document.getElementById('register-password-error')).toBeNull()
  })

  it('가입 버튼은 켜져 있고, 누르면 막힌 칸마다 이유를 붙이고 첫 칸으로 포커스한다', async () => {
    render(createElement(RegisterForm))
    await reachVerified()
    agreeAll()
    fireEvent.change(input('password'), { target: { value: 'weak' } })
    const callsBefore = fetchMock.mock.calls.length
    const seen: (string | null)[] = []
    input('password').addEventListener('focus', event => {
      seen.push((event.target as HTMLElement).getAttribute('aria-invalid'))
    })

    const submit = button(/^회원가입$/)
    expect(submit.disabled).toBe(false)
    await click(submit)

    expect(fetchMock.mock.calls.length).toBe(callsBefore)
    expect(input('password').getAttribute('aria-invalid')).toBe('true')
    expect(describedText(input('name'))).toBe(REGISTER_FIELD_MESSAGES.name)
    expect(describedText(input('nickname'))).toBe(
      REGISTER_FIELD_MESSAGES.nickname,
    )
    // 오류가 붙은 **뒤** 포커스가 간다 — 스크린리더가 오류 없는 칸을 읽지 않는다.
    expect(document.activeElement).toBe(input('password'))
    expect(seen).toEqual(['true'])
  })
})

describe('RegisterForm — 가입을 마치면 로그인으로 잇는다(#576)', () => {
  const fillAndSubmit = async () => {
    await reachVerified()
    fireEvent.change(input('password'), { target: { value: 'Passw0rd!' } })
    fireEvent.change(input('name'), { target: { value: '홍길동' } })
    fireEvent.change(input('nickname'), { target: { value: '길동짱' } })
    agreeAll()
    fetchMock.mockResolvedValueOnce(ok())
    await click(button(/^회원가입$/))
  }

  it('가입 완료 표시와 원래 가려던 화면을 싣고 로그인으로 보내며, 이메일은 URL 이 아니라 탭 저장소에 맡긴다', async () => {
    searchBox.current = 'redirect=%2Fanalysis%3Fdistrict%3D11680'
    render(createElement(RegisterForm))

    await fillAndSubmit()

    expect(replace).toHaveBeenCalledWith(
      '/login?signup=1&redirect=%2Fanalysis%3Fdistrict%3D11680',
    )
    expect(String(replace.mock.calls[0][0])).not.toContain('a%40b.com')
    expect(window.sessionStorage.getItem(SIGNUP_EMAIL_STORAGE_KEY)).toBe(
      'a@b.com',
    )
  })

  it.each([
    'https%3A%2F%2Fevil.example',
    '%2F%2Fevil.example',
    '%2F%5Cevil.example',
  ])('복귀 경로가 외부(%s)면 버리고 가입 완료 표시만 싣는다', async raw => {
    searchBox.current = `redirect=${raw}`
    render(createElement(RegisterForm))

    await fillAndSubmit()

    expect(replace).toHaveBeenCalledWith('/login?signup=1')
  })

  it('「로그인」 링크도 원래 가려던 화면을 들고 간다', () => {
    searchBox.current = 'redirect=%2Fsimulation'
    render(createElement(RegisterForm))

    const link = Array.from(document.querySelectorAll('a')).find(
      anchor => anchor.textContent === '로그인',
    )
    expect(link?.getAttribute('href')).toBe('/login?redirect=%2Fsimulation')
  })

  it('카카오 버튼이 이메일 폼보다 위에 있다(#577)', () => {
    render(createElement(RegisterForm))

    const kakao = button(/카카오 로그인/)
    const form = document.querySelector('form') as HTMLFormElement
    expect(
      kakao.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
