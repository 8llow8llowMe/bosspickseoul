import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSession = vi.fn()
const setSession = vi.fn()
const clearSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ getSession, setSession, clearSession }))

const reissueSession = vi.fn()
vi.mock('@/lib/auth/reissue', () => ({ reissueSession }))

vi.mock('@/lib/env.server', () => ({
  getServerEnv: () => ({
    backendApiUrl: 'http://backend:8080',
    authSessionSecret: 'test-secret-key-at-least-32-chars-long!!',
  }),
}))

const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) })

const session1 = { accessToken: 'old-token', refreshToken: 'r1', memberId: '1' }
const session2 = { accessToken: 'new-token', refreshToken: 'r2', memberId: '1' }

beforeEach(() => {
  getSession.mockReset()
  setSession.mockReset()
  clearSession.mockReset()
  reissueSession.mockReset()
})

describe('BFF proxy /api/bff/[...path]', () => {
  it('forwards a GET to the /api/v1 prefixed backend URL', async () => {
    getSession.mockResolvedValue(null)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    global.fetch = fetchMock
    const { GET } = await import('./route')
    const req = new Request('http://x/api/bff/members/me', { method: 'GET' })
    const res = await GET(req, ctx(['members', 'me']))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://backend:8080/api/v1/members/me')
  })

  it('injects the session Bearer token and drops any inbound client Authorization header', async () => {
    getSession.mockResolvedValue(session1)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 200 }))
    global.fetch = fetchMock
    const { GET } = await import('./route')
    const req = new Request('http://x/api/bff/members/me', {
      method: 'GET',
      headers: { Authorization: 'Bearer client-supplied-token' },
    })
    await GET(req, ctx(['members', 'me']))
    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('authorization')).toBe('Bearer old-token')
  })

  it('drops an inbound client-supplied Authorization header when there is no session', async () => {
    getSession.mockResolvedValue(null)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 200 }))
    global.fetch = fetchMock
    const { GET } = await import('./route')
    const req = new Request('http://x/api/bff/members/me', {
      method: 'GET',
      headers: { Authorization: 'Bearer client-injected' },
    })
    await GET(req, ctx(['members', 'me']))
    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('authorization')).toBeNull()
    expect(headers.has('authorization')).toBe(false)
  })

  it('on a 401, reissues the session and retries once, returning the retried response', async () => {
    getSession.mockResolvedValue(session1)
    reissueSession.mockResolvedValue(session2)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(
        new Response('{"ok":true}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    global.fetch = fetchMock
    const { GET } = await import('./route')
    const req = new Request('http://x/api/bff/members/me', { method: 'GET' })
    const res = await GET(req, ctx(['members', 'me']))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(setSession).toHaveBeenCalledWith(session2)
    const [, retryInit] = fetchMock.mock.calls[1]
    expect((retryInit.headers as Headers).get('authorization')).toBe(
      'Bearer new-token',
    )
  })

  it('on a 401 with failed reissue, clears the session, returns 401, and does not fetch a third time', async () => {
    getSession.mockResolvedValue(session1)
    reissueSession.mockResolvedValue(null)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 401 }))
    global.fetch = fetchMock
    const { GET } = await import('./route')
    const req = new Request('http://x/api/bff/members/me', { method: 'GET' })
    const res = await GET(req, ctx(['members', 'me']))
    expect(res.status).toBe(401)
    expect(clearSession).toHaveBeenCalledTimes(1)
    expect(setSession).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not propagate the backend Set-Cookie header to the client response', async () => {
    getSession.mockResolvedValue(null)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'refreshToken=leaked; Path=/; HttpOnly',
        },
      }),
    )
    global.fetch = fetchMock
    const { GET } = await import('./route')
    const req = new Request('http://x/api/bff/members/me', { method: 'GET' })
    const res = await GET(req, ctx(['members', 'me']))
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('sends no body on a GET request', async () => {
    getSession.mockResolvedValue(null)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 200 }))
    global.fetch = fetchMock
    const { GET } = await import('./route')
    const req = new Request('http://x/api/bff/members/me', { method: 'GET' })
    await GET(req, ctx(['members', 'me']))
    const [, init] = fetchMock.mock.calls[0]
    expect(init.body).toBeUndefined()
  })

  it('sends no body on a HEAD request', async () => {
    getSession.mockResolvedValue(null)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }))
    global.fetch = fetchMock
    // All exported handlers point at the same `handle` fn, which branches on
    // req.method — so exercising HEAD-body-suppression just needs a Request
    // whose method is HEAD, regardless of which named export invokes it.
    const { GET } = await import('./route')
    const req = new Request('http://x/api/bff/members/me', { method: 'HEAD' })
    await GET(req, ctx(['members', 'me']))
    const [, init] = fetchMock.mock.calls[0]
    expect(init.body).toBeUndefined()
  })
})
