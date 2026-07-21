import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSession = vi.fn()
const clearSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ getSession, clearSession }))

const session = { accessToken: 'a.t.k', refreshToken: 'r', memberId: '1' }

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = 'test-secret-key-at-least-32-chars-long!!'
  process.env.BACKEND_API_URL = 'http://backend:8080'
  getSession.mockReset()
  clearSession.mockReset()
})

describe('POST /api/auth/logout', () => {
  it('calls the backend logout with the Bearer token and clears the session', async () => {
    getSession.mockResolvedValue(session)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }))
    global.fetch = fetchMock
    const { POST } = await import('./route')
    const res = await POST()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend:8080/api/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer a.t.k' },
      }),
    )
    expect(clearSession).toHaveBeenCalledTimes(1)
  })

  it('still clears the local session and returns 200 when the backend fetch throws', async () => {
    getSession.mockResolvedValue(session)
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    const { POST } = await import('./route')
    const res = await POST()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(clearSession).toHaveBeenCalledTimes(1)
  })
})
