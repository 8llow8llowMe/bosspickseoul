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

describe('POST /api/auth/login', () => {
  it('on backend success, seals session and returns memberId', async () => {
    const setCookie = 'refreshToken=r.t.k; Path=/; HttpOnly'
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dataHeader: {
            success: true,
            resultCode: null,
            resultMessage: null,
          },
          dataBody: { accessToken: 'a.t.k', memberId: '42' },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': setCookie,
          },
        },
      ),
    )
    const { POST } = await import('./route')
    const res = await POST(
      new Request('http://x/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.com', password: 'Passw0rd!' }),
      }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ memberId: '42' })
    expect(setSession).toHaveBeenCalledWith({
      accessToken: 'a.t.k',
      refreshToken: 'r.t.k',
      memberId: '42',
    })
  })

  it('on backend failure, returns 401 with message and no session', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dataHeader: {
            success: false,
            resultCode: 'AUTH_001',
            resultMessage: '이메일 또는 비밀번호가 올바르지 않습니다.',
          },
          dataBody: null,
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    )
    const { POST } = await import('./route')
    const res = await POST(
      new Request('http://x/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.com', password: 'x' }),
      }),
    )
    expect(res.status).toBe(401)
    expect((await res.json()).message).toContain('올바르지')
    expect(setSession).not.toHaveBeenCalled()
  })
})

describe('기기 세션용 User-Agent 전달', () => {
  const okResponse = () =>
    new Response(
      JSON.stringify({
        dataHeader: { success: true, resultCode: null, resultMessage: null },
        dataBody: { accessToken: 'a.t.k', memberId: '42' },
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'refreshToken=r.t.k; Path=/; HttpOnly',
        },
      },
    )

  it('브라우저 UA 를 백엔드로 넘긴다 (deviceInfo 의 원천이다)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse())
    global.fetch = fetchMock
    const { POST } = await import('./route')
    await POST(
      new Request('http://x/api/auth/login', {
        method: 'POST',
        headers: { 'user-agent': 'Mozilla/5.0 (iPhone)' },
        body: JSON.stringify({ email: 'a@b.com', password: 'Passw0rd!' }),
      }),
    )

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['User-Agent']).toBe('Mozilla/5.0 (iPhone)')
  })

  it('UA 가 없으면 헤더를 만들어 내지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse())
    global.fetch = fetchMock
    const { POST } = await import('./route')
    await POST(
      new Request('http://x/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.com', password: 'Passw0rd!' }),
      }),
    )

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['User-Agent']).toBeUndefined()
    expect(init.headers['Content-Type']).toBe('application/json')
  })
})
