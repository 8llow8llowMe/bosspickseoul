import { afterEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()
const setSession = vi.fn()
const clearSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ getSession, setSession, clearSession }))

const reissueSession = vi.fn()
vi.mock('@/lib/auth/reissue', () => ({ reissueSession }))

vi.mock('@/lib/env.server', () => ({
  getServerEnv: () => ({ backendApiUrl: 'http://backend' }),
}))

const ctx = { params: Promise.resolve({ jobId: 'j1' }) }

afterEach(() => {
  vi.unstubAllGlobals()
  getSession.mockReset()
  setSession.mockReset()
  clearSession.mockReset()
  reissueSession.mockReset()
})

describe('AI 리포트 스트리밍 라우트', () => {
  it('무세션이면 401', async () => {
    getSession.mockResolvedValue(null)
    const { GET } = await import('./route')
    const res = await GET(
      new Request('http://x/api/ai-reports/jobs/j1/stream'),
      ctx,
    )
    expect(res.status).toBe(401)
  })

  it('세션이 있으면 Bearer를 주입하고 스트림 본문을 그대로 파이프한다', async () => {
    getSession.mockResolvedValue({ accessToken: 'tok' })
    const upstreamBody = new ReadableStream()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(upstreamBody, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('./route')
    const res = await GET(
      new Request('http://x/api/ai-reports/jobs/j1/stream'),
      ctx,
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    expect(res.headers.get('cache-control')).toContain('no-transform')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://backend/api/v1/ai-reports/jobs/j1/stream')
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer tok',
    )
    expect(res.body).toBe(upstreamBody)
  })

  it('백엔드가 401을 반환하면 재발급 후 재시도한다', async () => {
    const session1 = {
      accessToken: 'old-token',
      refreshToken: 'r1',
      memberId: '1',
    }
    const session2 = {
      accessToken: 'new-token',
      refreshToken: 'r2',
      memberId: '1',
    }
    getSession.mockResolvedValue(session1)
    reissueSession.mockResolvedValue(session2)
    const upstreamBody = new ReadableStream()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(upstreamBody, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('./route')
    const res = await GET(
      new Request('http://x/api/ai-reports/jobs/j1/stream'),
      ctx,
    )
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(setSession).toHaveBeenCalledWith(session2)
    const [, retryInit] = fetchMock.mock.calls[1]
    expect((retryInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer new-token',
    )
  })

  it('401 후 재발급이 실패하면 세션을 지우고 401을 반환한다', async () => {
    const session1 = {
      accessToken: 'old-token',
      refreshToken: 'r1',
      memberId: '1',
    }
    getSession.mockResolvedValue(session1)
    reissueSession.mockResolvedValue(null)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('./route')
    const res = await GET(
      new Request('http://x/api/ai-reports/jobs/j1/stream'),
      ctx,
    )
    expect(res.status).toBe(401)
    expect(clearSession).toHaveBeenCalledTimes(1)
    expect(setSession).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('백엔드가 실패 응답(4xx)을 반환하면 본문을 읽어 그대로 전달한다', async () => {
    getSession.mockResolvedValue({ accessToken: 'tok' })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'AI_005' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('./route')
    const res = await GET(
      new Request('http://x/api/ai-reports/jobs/j1/stream'),
      ctx,
    )
    expect(res.status).toBe(404)
    expect(await res.text()).toContain('AI_005')
  })
})
