import { describe, it, expect, vi, beforeEach } from 'vitest'

const setSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ setSession }))

/** 복귀 경로 쿠키를 흉내 낸다. `deleteCookie` 로 지워졌는지 확인한다. */
const cookieStore = vi.hoisted(() => ({
  value: undefined as string | undefined,
  deleted: [] as string[],
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: vi.fn(),
    get: (name: string) =>
      name === 'auth_return' && cookieStore.value !== undefined
        ? { name, value: cookieStore.value }
        : undefined,
    delete: (name: string) => {
      cookieStore.deleted.push(name)
      cookieStore.value = undefined
    },
  }),
}))

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = 'test-secret-key-at-least-32-chars-long!!'
  process.env.BACKEND_API_URL = 'http://backend:8080'
  setSession.mockReset()
  cookieStore.value = undefined
  cookieStore.deleted = []
})

/** 로그인 성공 응답. 복귀 경로 검증에서 매번 다시 쓴다. */
const mockSuccessfulExchange = () => {
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
}

const callback = async () => {
  const { GET } = await import('./route')
  return GET(
    new Request('http://x/api/auth/social/kakao?code=c&state=s'),
    ctx('kakao'),
  )
}

const ctx = (provider: string) => ({ params: Promise.resolve({ provider }) })

const GETUnknownProvider = async () => {
  const { GET } = await import('./route')
  return GET(
    new Request('http://x/api/auth/social/evil?code=c&state=s'),
    ctx('evil'),
  )
}

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

  it('복귀 경로 쿠키가 있으면 그 화면으로 돌려보내고 쿠키를 지운다', async () => {
    // 이게 없으면 카카오 로그인은 항상 홈에 착지한다 — 사용자가 있던 화면을 잃는다.
    cookieStore.value = encodeURIComponent(
      '/analysis/result?districtCode=11740',
    )
    mockSuccessfulExchange()

    const res = await callback()

    expect(res.headers.get('location')).toBe(
      '/analysis/result?districtCode=11740',
    )
    expect(cookieStore.deleted).toContain('auth_return')
  })

  it('실패로 끝나도 복귀 경로 쿠키를 지운다', async () => {
    // 남겨 두면 다음 로그인이 지난번 목적지로 가 버린다.
    cookieStore.value = encodeURIComponent('/analysis/result')
    global.fetch = vi.fn()

    const res = await GETUnknownProvider()

    expect(res.headers.get('location')).toBe('/login?error=social')
    expect(cookieStore.deleted).toContain('auth_return')
  })

  it('쿠키에 담긴 외부 주소로 내보내지 않는다', async () => {
    // 쿠키는 클라이언트가 쓰는 값이라 그대로 Location 에 실을 수 없다.
    for (const evil of ['https://evil.example', '//evil.example', '/login']) {
      cookieStore.value = encodeURIComponent(evil)
      cookieStore.deleted = []
      mockSuccessfulExchange()

      const res = await callback()

      expect(res.headers.get('location')).toBe('/')
    }
  })

  it('깨진 퍼센트 인코딩은 홈으로 떨어뜨린다', async () => {
    cookieStore.value = '%E0%A4%A'
    mockSuccessfulExchange()

    const res = await callback()

    expect(res.headers.get('location')).toBe('/')
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
