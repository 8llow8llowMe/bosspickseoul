import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AUTH_RETURN_COOKIE,
  buildLoginHref,
  currentBrowserPath,
  safeReturnPath,
} from '@/lib/auth/return-path'

describe('safeReturnPath', () => {
  it('내부 경로는 그대로 통과시킨다', () => {
    expect(safeReturnPath('/analysis/result?districtCode=11740')).toBe(
      '/analysis/result?districtCode=11740',
    )
    expect(safeReturnPath('/simulation/report?franchisee=false#summary')).toBe(
      '/simulation/report?franchisee=false#summary',
    )
  })

  it('값이 없으면 홈이다', () => {
    for (const value of [null, undefined, '', '   ']) {
      expect(safeReturnPath(value)).toBe('/')
    }
  })

  it('외부 주소로 내보내지 않는다', () => {
    for (const value of [
      'https://evil.example',
      'http://evil.example/path',
      'evil.example',
      '//evil.example',
    ]) {
      expect(safeReturnPath(value)).toBe('/')
    }
  })

  it('백슬래시로 위장한 프로토콜 상대 주소를 막는다', () => {
    // 브라우저가 `\` 를 `/` 로 정규화해서 `/\evil.example` 이 `//evil.example` 이 된다.
    expect(safeReturnPath('/\\evil.example')).toBe('/')
    expect(safeReturnPath('/\\/evil.example')).toBe('/')
  })

  it('개행이 섞인 값을 막는다', () => {
    // 이 값은 라우트 핸들러의 `Location` 헤더로 들어간다 — CR/LF 가 통과하면 헤더 주입이다.
    for (const value of [
      '/analysis\r\nSet-Cookie: a=b',
      '/analysis\nX-Injected: 1',
      '/analysis\r',
    ]) {
      expect(safeReturnPath(value)).toBe('/')
    }
  })

  it('인증 화면으로 되돌려보내지 않는다', () => {
    // 로그인 직후 다시 /login 으로 보내면 GuestOnly 가 또 한 번 튕겨 낸다.
    for (const value of ['/login', '/login?error=social', '/register']) {
      expect(safeReturnPath(value)).toBe('/')
    }
  })

  it('경로 접두사만 같은 곳은 막지 않는다', () => {
    expect(safeReturnPath('/login-guide')).toBe('/login-guide')
  })

  it('폴백을 지정할 수 있다', () => {
    expect(safeReturnPath(null, '/profile')).toBe('/profile')
    // 폴백 자체가 안전하지 않으면 홈으로 떨어진다.
    expect(safeReturnPath(null, 'https://evil.example')).toBe('/')
  })
})

describe('buildLoginHref', () => {
  it('복귀 경로를 인코딩해 싣는다', () => {
    expect(buildLoginHref('/analysis/result?a=1&b=2')).toBe(
      `/login?redirect=${encodeURIComponent('/analysis/result?a=1&b=2')}`,
    )
  })

  it('안전하지 않은 값이면 쿼리 없는 로그인 경로다', () => {
    // 홈으로 되돌아오는 건 기본 동작이라 굳이 실어 보내지 않는다.
    expect(buildLoginHref('https://evil.example')).toBe('/login')
    expect(buildLoginHref('/')).toBe('/login')
  })
})

describe('AUTH_RETURN_COOKIE', () => {
  it('쿠키 이름이 고정돼 있다', () => {
    // 쓰는 쪽(social-login)과 읽는 쪽(social 콜백 라우트)이 반드시 같은 이름을 써야 한다.
    expect(AUTH_RETURN_COOKIE).toBe('auth_return')
  })
})

describe('currentBrowserPath', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('경로와 쿼리를 이어 붙인다', () => {
    vi.stubGlobal('window', {
      location: { pathname: '/analysis/result', search: '?districtCode=11740' },
    })

    expect(currentBrowserPath()).toBe('/analysis/result?districtCode=11740')
  })

  it('서버에서는 홈이다', () => {
    // 이 함수는 이벤트 핸들러 전용이지만, 실수로 렌더 중에 불려도 던지지 않아야 한다.
    vi.stubGlobal('window', undefined)

    expect(currentBrowserPath()).toBe('/')
  })

  it('인증 화면에서 부르면 홈이다', () => {
    // /login 에서 로그인 유도가 또 일어나도 자기 자신으로 되돌아오지 않는다.
    vi.stubGlobal('window', {
      location: { pathname: '/login', search: '' },
    })

    expect(currentBrowserPath()).toBe('/')
  })
})
