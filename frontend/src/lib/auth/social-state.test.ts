import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SOCIAL_PROVIDERS,
  SOCIAL_STATE_COOKIE,
  SOCIAL_STATE_COOKIE_PATH,
  SOCIAL_STATE_MAX_AGE_SECONDS,
  countCookie,
  extractStateFromAuthorizationUrl,
  isSameState,
  pickConsentQuery,
  socialCallbackFailure,
  socialStateCookieOptions,
} from './social-state'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('social-state 상수', () => {
  it('카카오만 허용한다', () => {
    expect(SOCIAL_PROVIDERS.has('kakao')).toBe(true)
    expect(SOCIAL_PROVIDERS.has('evil')).toBe(false)
  })

  it('쿠키 경로는 authorize 와 콜백을 함께 덮는 접두다', () => {
    // 콜백(/api/auth/social/kakao)에도 실려야 대조할 수 있다.
    expect(SOCIAL_STATE_COOKIE).toBe('social_state')
    expect(SOCIAL_STATE_COOKIE_PATH).toBe('/api/auth/social')
    expect('/api/auth/social/kakao/authorize').toMatch(
      new RegExp(`^${SOCIAL_STATE_COOKIE_PATH}/`),
    )
    expect('/api/auth/social/kakao').toMatch(
      new RegExp(`^${SOCIAL_STATE_COOKIE_PATH}/`),
    )
  })
})

describe('socialStateCookieOptions', () => {
  it('HttpOnly · SameSite=Lax · 10분 · /api/auth/social 로 묶는다', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(socialStateCookieOptions()).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/auth/social',
      maxAge: SOCIAL_STATE_MAX_AGE_SECONDS,
    })
    expect(SOCIAL_STATE_MAX_AGE_SECONDS).toBe(600)
  })

  it('production 에서만 Secure 를 켠다', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(socialStateCookieOptions().secure).toBe(true)
  })
})

describe('extractStateFromAuthorizationUrl', () => {
  it('인가 URL 의 state 쿼리를 꺼낸다', () => {
    expect(
      extractStateFromAuthorizationUrl(
        'https://kauth.kakao.com/oauth/authorize?client_id=x&state=abc',
      ),
    ).toBe('abc')
  })

  it('state 가 없거나 비면 null', () => {
    expect(
      extractStateFromAuthorizationUrl('https://kauth.kakao.com/oauth?x=1'),
    ).toBeNull()
    expect(
      extractStateFromAuthorizationUrl('https://kauth.kakao.com/oauth?state='),
    ).toBeNull()
  })

  it('깨진 URL 은 throw 하지 않고 null', () => {
    expect(extractStateFromAuthorizationUrl('not a url')).toBeNull()
    expect(extractStateFromAuthorizationUrl('')).toBeNull()
  })
})

describe('countCookie', () => {
  it('같은 이름 쿠키가 몇 번 실렸는지 센다', () => {
    // 형제 서브도메인이 Domain=.bosspickseoul.com 으로 같은 이름을 심으면 두 번 온다.
    expect(
      countCookie('social_state=a; x=1; social_state=b', 'social_state'),
    ).toBe(2)
    expect(countCookie('x=1; social_state=a', 'social_state')).toBe(1)
  })

  it('이름이 정확히 같은 것만 센다', () => {
    expect(
      countCookie(
        'social_state_x=a; xsocial_state=b; social_state',
        'social_state',
      ),
    ).toBe(1)
  })

  it('헤더가 없으면 0', () => {
    expect(countCookie(null, 'social_state')).toBe(0)
    expect(countCookie('', 'social_state')).toBe(0)
  })
})

describe('isSameState', () => {
  it('같은 값이면 true', () => {
    expect(isSameState('abc', 'abc')).toBe(true)
  })

  it('다른 값이면 false', () => {
    expect(isSameState('abc', 'abd')).toBe(false)
  })

  it('길이가 달라도 throw 하지 않고 false', () => {
    // timingSafeEqual 은 길이가 다르면 throw 한다 — 다이제스트로 길이를 맞춘다.
    expect(isSameState('abc', 'abcdef')).toBe(false)
  })

  it('둘 중 하나라도 비면 false', () => {
    expect(isSameState(null, 'abc')).toBe(false)
    expect(isSameState('abc', undefined)).toBe(false)
    expect(isSameState('', '')).toBe(false)
    expect(isSameState(null, undefined)).toBe(false)
  })
})

describe('socialCallbackFailure', () => {
  it('AUTH_010(state 재사용·만료)은 social_state', () => {
    expect(socialCallbackFailure('AUTH_010')).toBe('social_state')
  })

  it('AUTH_021·AUTH_022(신규 가입 동의 부족)는 social_signup', () => {
    expect(socialCallbackFailure('AUTH_021')).toBe('social_signup')
    expect(socialCallbackFailure('AUTH_022')).toBe('social_signup')
  })

  it('그 밖·코드 없음은 social', () => {
    expect(socialCallbackFailure('AUTH_001')).toBe('social')
    expect(socialCallbackFailure(null)).toBe('social')
    expect(socialCallbackFailure(undefined)).toBe('social')
  })
})

describe('pickConsentQuery', () => {
  it('값이 정확히 true 인 동의 키만 남기고 나머지는 버린다', () => {
    const params = new URLSearchParams(
      'termsAgreed=true&privacyAgreed=false&ageOver14Confirmed=true&evil=1',
    )
    expect(pickConsentQuery(params)).toBe(
      '?termsAgreed=true&ageOver14Confirmed=true',
    )
  })

  it('세 키가 모두 true 면 선언 순서대로 싣는다', () => {
    const params = new URLSearchParams(
      'ageOver14Confirmed=true&privacyAgreed=true&termsAgreed=true',
    )
    expect(pickConsentQuery(params)).toBe(
      '?termsAgreed=true&privacyAgreed=true&ageOver14Confirmed=true',
    )
  })

  it('TRUE·1·빈 값은 동의로 보지 않는다', () => {
    const params = new URLSearchParams(
      'termsAgreed=TRUE&privacyAgreed=1&ageOver14Confirmed=',
    )
    expect(pickConsentQuery(params)).toBe('')
  })

  it('동의 쿼리가 없으면 빈 문자열', () => {
    expect(pickConsentQuery(new URLSearchParams())).toBe('')
  })
})
