import { describe, expect, it } from 'vitest'
import {
  SIGNUP_EMAIL_STORAGE_KEY,
  buildRegisterHref,
  buildSignupCompleteLoginHref,
  rememberSignupEmail,
  takeSignupEmail,
} from './auth-flow'

/*
  로그인 ↔ 가입 사이에서 복귀 경로를 들고 가는 링크와, 가입 직후 이메일 미리 채우기(#576).
  복귀 경로는 결국 로그인 성공 뒤 이동·카카오 콜백 Location 으로 흘러가므로, 링크를 만드는
  단계에서도 `safeReturnPath` 와 같은 판정으로 외부 주소를 걸러야 한다.
*/

const UNSAFE_RETURN_PATHS = [
  'https://evil.example/phish',
  '//evil.example',
  '/\\evil.example',
  '\\\\evil.example',
  'javascript:alert(1)',
  '/analysis\r\nSet-Cookie: x=1',
  // 로그인·가입 화면으로 되돌리면 GuestOnly 가 다시 튕겨 내 고리가 된다.
  '/login',
  '/register?redirect=/analysis',
]

describe('buildRegisterHref', () => {
  it('내부 경로면 redirect 로 들고 간다', () => {
    expect(buildRegisterHref('/analysis?district=11680')).toBe(
      '/register?redirect=%2Fanalysis%3Fdistrict%3D11680',
    )
  })

  it('홈이거나 값이 없으면 쿼리를 붙이지 않는다', () => {
    expect(buildRegisterHref('/')).toBe('/register')
    expect(buildRegisterHref(null)).toBe('/register')
    expect(buildRegisterHref(undefined)).toBe('/register')
  })

  it.each(UNSAFE_RETURN_PATHS)(
    '안전하지 않은 값(%j)은 버리고 쿼리 없이 만든다',
    value => {
      expect(buildRegisterHref(value)).toBe('/register')
    },
  )
})

describe('buildSignupCompleteLoginHref', () => {
  it('가입 완료 표시와 복귀 경로를 함께 싣는다', () => {
    expect(buildSignupCompleteLoginHref('/simulation/report')).toBe(
      '/login?signup=1&redirect=%2Fsimulation%2Freport',
    )
  })

  it('복귀 경로가 홈이면 가입 완료 표시만 싣는다', () => {
    expect(buildSignupCompleteLoginHref('/')).toBe('/login?signup=1')
  })

  it.each(UNSAFE_RETURN_PATHS)(
    '안전하지 않은 값(%j)은 버린다 — 오픈 리다이렉트가 생기지 않는다',
    value => {
      expect(buildSignupCompleteLoginHref(value)).toBe('/login?signup=1')
    },
  )
})

const memoryStorage = () => {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
  }
}

describe('가입 이메일 미리 채우기', () => {
  it('맡겨 둔 이메일을 한 번만 꺼내고 지운다', () => {
    const storage = memoryStorage()
    rememberSignupEmail(storage, 'owner@example.com')

    expect(storage.map.get(SIGNUP_EMAIL_STORAGE_KEY)).toBe('owner@example.com')
    expect(takeSignupEmail(storage)).toBe('owner@example.com')
    expect(storage.map.has(SIGNUP_EMAIL_STORAGE_KEY)).toBe(false)
    expect(takeSignupEmail(storage)).toBeNull()
  })

  it('이메일 형식이 아니면 버린다(지우기도 한다)', () => {
    const storage = memoryStorage()
    storage.setItem(SIGNUP_EMAIL_STORAGE_KEY, '<script>')

    expect(takeSignupEmail(storage)).toBeNull()
    expect(storage.map.has(SIGNUP_EMAIL_STORAGE_KEY)).toBe(false)
  })

  it('저장소가 없거나 막혀 있어도 던지지 않는다', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }

    expect(() => rememberSignupEmail(blocked, 'a@b.com')).not.toThrow()
    expect(takeSignupEmail(blocked)).toBeNull()
    expect(() => rememberSignupEmail(null, 'a@b.com')).not.toThrow()
    expect(takeSignupEmail(null)).toBeNull()
  })
})
