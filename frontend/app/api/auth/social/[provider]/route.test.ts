import { describe, it, expect, vi, beforeEach } from 'vitest'

const setSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ setSession }))
vi.mock('next/headers', () => ({
  cookies: async () => ({ set: vi.fn(), get: vi.fn(), delete: vi.fn() }),
}))

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = 'test-secret-key-at-least-32-chars-long!!'
  process.env.BACKEND_API_URL = 'http://backend:8080'
  setSession.mockReset()
})

const ctx = (provider: string) => ({ params: Promise.resolve({ provider }) })

describe('GET /api/auth/social/[provider]', () => {
  it('exchanges code/state, seals session, redirects to /', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dataHeader: { success: true, resultCode: null, resultMessage: null },
          dataBody: { accessToken: 'a.t.k', memberId: '7' },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'refreshToken=r.t.k; Path=/; HttpOnly',
          },
        },
      ),
    )
    const { GET } = await import('./route')
    const res = await GET(
      new Request('http://x/api/auth/social/kakao?code=c&state=s'),
      ctx('kakao'),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('/')
    expect(setSession).toHaveBeenCalledWith({
      accessToken: 'a.t.k',
      refreshToken: 'r.t.k',
      memberId: '7',
    })
  })

  it('rejects providers outside the whitelist', async () => {
    global.fetch = vi.fn()
    const { GET } = await import('./route')
    const res = await GET(
      new Request('http://x/api/auth/social/evil?code=c&state=s'),
      ctx('evil'),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('/login?error=social')
    expect(setSession).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('redirects to /login?error=social on backend failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dataHeader: {
            success: false,
            resultCode: 'AUTH_010',
            resultMessage: '실패',
          },
          dataBody: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    const { GET } = await import('./route')
    const res = await GET(
      new Request('http://x/api/auth/social/kakao?code=c&state=s'),
      ctx('kakao'),
    )
    expect(res.headers.get('location')).toBe('/login?error=social')
    expect(setSession).not.toHaveBeenCalled()
  })
})
