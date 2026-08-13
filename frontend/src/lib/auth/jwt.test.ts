import { describe, expect, it } from 'vitest'
import { decodeJwtExp, isAccessTokenExpired } from '@/lib/auth/jwt'

// 서명 검증 안 하므로 sig는 아무 값이나 가능
const jwtWithExp = (exp: number): string =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.sig`

describe('decodeJwtExp', () => {
  it('정상 JWT에서 exp(초)를 읽는다', () => {
    expect(decodeJwtExp(jwtWithExp(1_700_000_000))).toBe(1_700_000_000)
  })
  it('세그먼트가 3개가 아니면 null', () => {
    expect(decodeJwtExp('not-a-jwt')).toBeNull()
    expect(decodeJwtExp('a.b')).toBeNull()
  })
  it('payload에 exp가 없거나 숫자가 아니면 null', () => {
    const noExp = `h.${Buffer.from(JSON.stringify({ sub: '1' })).toString('base64url')}.s`
    const strExp = `h.${Buffer.from(JSON.stringify({ exp: 'x' })).toString('base64url')}.s`
    expect(decodeJwtExp(noExp)).toBeNull()
    expect(decodeJwtExp(strExp)).toBeNull()
  })
  it('payload가 깨진 base64/JSON이면 null(throw 안 함)', () => {
    expect(decodeJwtExp('h.@@@notbase64@@@.s')).toBeNull()
    const badJson = `h.${Buffer.from('{not json').toString('base64url')}.s`
    expect(decodeJwtExp(badJson)).toBeNull()
  })
})

describe('isAccessTokenExpired', () => {
  const now = 1_700_000_000_000 // ms
  it('exp가 now(+skew) 이하이면 만료로 본다', () => {
    // exp = now/1000 - 10s → 만료
    expect(isAccessTokenExpired(jwtWithExp(now / 1000 - 10), now)).toBe(true)
  })
  it('skew(30s) 이내 임박도 만료로 본다', () => {
    // exp = now + 20s → 30s skew 이내 → 만료 취급
    expect(isAccessTokenExpired(jwtWithExp(now / 1000 + 20), now)).toBe(true)
  })
  it('충분히 미래면 유효', () => {
    expect(isAccessTokenExpired(jwtWithExp(now / 1000 + 3600), now)).toBe(false)
  })
  it('exp를 못 읽으면 false(판단 불가 → 선재발급 스킵)', () => {
    expect(isAccessTokenExpired('opaque-token', now)).toBe(false)
  })
  it('skewSec를 조정할 수 있다', () => {
    expect(isAccessTokenExpired(jwtWithExp(now / 1000 + 20), now, 0)).toBe(
      false,
    )
  })
})
