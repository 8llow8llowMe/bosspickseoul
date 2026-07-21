import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('serverEnv', () => {
  const OLD = process.env
  beforeEach(() => {
    process.env = { ...OLD }
  })
  afterEach(() => {
    process.env = OLD
  })

  it('reads AUTH_SESSION_SECRET and backend url', async () => {
    process.env.AUTH_SESSION_SECRET = 'x'.repeat(32)
    process.env.BACKEND_API_URL = 'http://gw:8080/'
    const { getServerEnv } = await import('./env.server')
    const env = getServerEnv()
    expect(env.authSessionSecret).toHaveLength(32)
    expect(env.backendApiUrl).toBe('http://gw:8080') // trailing slash trimmed
  })

  it('throws when AUTH_SESSION_SECRET missing', async () => {
    delete process.env.AUTH_SESSION_SECRET
    const { getServerEnv } = await import('./env.server')
    expect(() => getServerEnv()).toThrow(/AUTH_SESSION_SECRET/)
  })
})
