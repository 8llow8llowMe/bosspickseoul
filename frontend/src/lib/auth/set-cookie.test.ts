import { describe, it, expect } from 'vitest'
import { extractCookieValue } from './set-cookie'

describe('extractCookieValue', () => {
  it('extracts named cookie from array of set-cookie headers', () => {
    const headers = [
      'refreshToken=abc.def.ghi; Path=/; HttpOnly; Secure; SameSite=Lax',
      'other=zzz; Path=/',
    ]
    expect(extractCookieValue(headers, 'refreshToken')).toBe('abc.def.ghi')
  })
  it('returns null when cookie absent', () => {
    expect(extractCookieValue(['x=1'], 'refreshToken')).toBeNull()
    expect(extractCookieValue(null, 'refreshToken')).toBeNull()
  })
})
