import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = 'test-secret-key-at-least-32-chars-long!!'
  process.env.BACKEND_API_URL = 'http://backend:8080'
})

const ctx = (provider: string) => ({ params: Promise.resolve({ provider }) })

const authorize = async (query = '', provider = 'kakao') => {
  const { GET } = await import('./route')
  return GET(
    new Request(
      `http://x/api/auth/social/${provider}/authorize${query}`,
      // 콜백 라우트처럼 브라우저 UA 를 넘기는지 본다.
      { headers: { 'user-agent': 'test-browser' } },
    ),
    ctx(provider),
  )
}

const successBody = (authorizationUrl: string) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: { authorizationUrl },
})

const mockBackend = (body: unknown, status = 200) => {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  )
}

const fetchedUrl = () => vi.mocked(global.fetch).mock.calls[0]?.[0] as string

describe('GET /api/auth/social/[provider]/authorize', () => {
  it('TC-SAU-001 백엔드 인가 URL 의 state 를 HttpOnly 쿠키로 남기고 본문은 그대로 돌려준다', async () => {
    const body = successBody(
      'https://kauth.kakao.com/oauth/authorize?client_id=x&state=abc',
    )
    mockBackend(body)

    const res = await authorize()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(body)
    expect(fetchedUrl()).toBe('http://backend:8080/api/v1/auth/kakao/authorize')
    const init = vi.mocked(global.fetch).mock.calls[0]?.[1] as RequestInit
    expect(init.cache).toBe('no-store')
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      'User-Agent': 'test-browser',
    })

    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('social_state=abc')
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/SameSite=lax/i)
    expect(setCookie).toContain('Path=/api/auth/social')
    expect(setCookie).toContain('Max-Age=600')
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('TC-SAU-002 동의 키 중 값이 true 인 것만 백엔드로 넘긴다', async () => {
    mockBackend(successBody('https://kauth.kakao.com/oauth?state=abc'))

    await authorize(
      '?termsAgreed=true&privacyAgreed=false&ageOver14Confirmed=true&evil=1',
    )

    expect(fetchedUrl()).toBe(
      'http://backend:8080/api/v1/auth/kakao/authorize?termsAgreed=true&ageOver14Confirmed=true',
    )
  })

  it('TC-SAU-003 인가 URL 에 state 가 없으면 502 이고 쿠키를 남기지 않는다', async () => {
    mockBackend(successBody('https://kauth.kakao.com/oauth?client_id=x'))

    const res = await authorize()

    expect(res.status).toBe(502)
    expect(res.headers.get('set-cookie')).toBeNull()
    const body = (await res.json()) as {
      dataHeader: { success: boolean }
      dataBody: unknown
    }
    expect(body.dataHeader.success).toBe(false)
    expect(body.dataBody).toBeNull()
  })

  it('TC-SAU-004 백엔드 실패는 상태와 본문을 그대로 전하고 쿠키를 남기지 않는다', async () => {
    const failure = {
      dataHeader: {
        success: false,
        resultCode: 'COMMON_400',
        resultMessage: '잘못된 요청입니다.',
      },
      dataBody: null,
    }
    mockBackend(failure, 400)

    const res = await authorize()

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual(failure)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('200 에 success:false 가 와도 쿠키를 남기지 않는다', async () => {
    // 이 백엔드는 200 에 실패를 실어 보내는 경우가 있다(isApiSuccess 가 그래서 있다).
    const failure = {
      dataHeader: { success: false, resultCode: 'X', resultMessage: '실패' },
      dataBody: null,
    }
    mockBackend(failure, 200)

    const res = await authorize()

    expect(await res.json()).toEqual(failure)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('백엔드에 닿지 못하면 502 이고 쿠키를 남기지 않는다', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'))

    const res = await authorize()

    expect(res.status).toBe(502)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('TC-SAU-005 화이트리스트 밖 provider 는 404 이고 백엔드를 부르지 않는다', async () => {
    global.fetch = vi.fn()

    const res = await authorize('', 'evil')

    expect(res.status).toBe(404)
    expect(global.fetch).not.toHaveBeenCalled()
    expect(res.headers.get('set-cookie')).toBeNull()
    const body = (await res.json()) as { dataHeader: { success: boolean } }
    expect(body.dataHeader.success).toBe(false)
  })
})
