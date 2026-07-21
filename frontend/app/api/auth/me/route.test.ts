import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ getSession }))

const session = { accessToken: 'a.t.k', refreshToken: 'r', memberId: '1' }

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = 'test-secret-key-at-least-32-chars-long!!'
  process.env.BACKEND_API_URL = 'http://backend:8080'
  getSession.mockReset()
})

describe('GET /api/auth/me', () => {
  it('returns unauthenticated and does not call the backend when there is no session', async () => {
    getSession.mockResolvedValue(null)
    const fetchMock = vi.fn()
    global.fetch = fetchMock
    const { GET } = await import('./route')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ authenticated: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns authenticated with the member on backend success', async () => {
    getSession.mockResolvedValue(session)
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dataHeader: { success: true, resultCode: null, resultMessage: null },
          dataBody: { id: '1', name: 'Kim' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    const { GET } = await import('./route')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      authenticated: true,
      member: { id: '1', name: 'Kim' },
    })
  })

  it('returns unauthenticated when the backend call fails', async () => {
    getSession.mockResolvedValue(session)
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dataHeader: {
            success: false,
            resultCode: 'ERR',
            resultMessage: '실패',
          },
          dataBody: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    const { GET } = await import('./route')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ authenticated: false })
  })
})
