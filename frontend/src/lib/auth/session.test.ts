import { describe, it, expect, beforeEach } from 'vitest'

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = 'test-secret-key-at-least-32-chars-long!!'
  process.env.BACKEND_API_URL = 'http://localhost:8080'
})

describe('session crypto', () => {
  it('encrypt then decrypt roundtrips payload', async () => {
    const { encryptSession, decryptSession } = await import('./session')
    const p = { accessToken: 'a', refreshToken: 'r', memberId: '1' }
    const token = await encryptSession(p)
    expect(typeof token).toBe('string')
    expect(await decryptSession(token)).toEqual(p)
  })
  it('returns null on tampered token', async () => {
    const { decryptSession } = await import('./session')
    expect(await decryptSession('not-a-valid-jwe')).toBeNull()
  })
})
