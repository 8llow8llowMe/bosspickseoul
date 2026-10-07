import { describe, it, expect, vi, beforeEach } from 'vitest'

const setSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({ setSession }))

type DeletedCookie = string | { name: string; path?: string }

/**
 * 요청 쿠키를 이름별로 흉내 낸다. `delete` 는 실제처럼 값을 지우고, 받은 인자를
 * 그대로 `deleted` 에 남긴다 — `social_state` 가 **path 와 함께** 지워졌는지 본다.
 *
 * `value` 는 복귀 경로 쿠키(`auth_return`)의 줄임이다(기존 테스트가 쓴다).
 */
const cookieStore = vi.hoisted(() => {
  const store = {
    jar: {} as Record<string, string>,
    deleted: [] as DeletedCookie[],
    get value(): string | undefined {
      return store.jar.auth_return
    },
    set value(next: string | undefined) {
      if (next === undefined) delete store.jar.auth_return
      else store.jar.auth_return = next
    },
  }
  return store
})

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: vi.fn(),
    get: (name: string) =>
      cookieStore.jar[name] !== undefined
        ? { name, value: cookieStore.jar[name] }
        : undefined,
    delete: (arg: DeletedCookie) => {
      cookieStore.deleted.push(arg)
      delete cookieStore.jar[typeof arg === 'string' ? arg : arg.name]
    },
  }),
}))

const STATE_COOKIE_DELETE = { name: 'social_state', path: '/api/auth/social' }

beforeEach(() => {
  process.env.AUTH_SESSION_SECRET = 'test-secret-key-at-least-32-chars-long!!'
  process.env.BACKEND_API_URL = 'http://backend:8080'
  setSession.mockReset()
  // 기본은 「이 브라우저가 authorize 로 시작한 로그인」이다 — 쿼리 state=s 와 맞다.
  cookieStore.jar = { social_state: 's' }
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
      // 콜백은 state 쿠키를 지운다 — 매 회차 새 로그인처럼 다시 심는다.
      cookieStore.jar.social_state = 's'
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
    // AUTH_010 은 이제 social_state 로 간다(TC-SST-006). 여기서는 그 밖의 실패를 본다.
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dataHeader: {
            success: false,
            resultCode: 'COMMON_500',
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

/** 백엔드 `/login` 실패 응답. 계약 §0-2 의 상태 코드를 그대로 쓴다. */
const mockBackendFailure = (resultCode: string, status: number) => {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        dataHeader: { success: false, resultCode, resultMessage: '실패' },
        dataBody: null,
      }),
      { status, headers: { 'content-type': 'application/json' } },
    ),
  )
}

/**
 * `cookieHeader` 는 브라우저가 실제로 보낸 원본 `Cookie` 헤더다. `next/headers` 목(jar)은
 * Next 처럼 이름당 값 하나만 들고, 같은 이름이 여러 번 실린 상황은 이 헤더로 표현한다.
 */
const callbackWith = async (query: string, cookieHeader?: string) => {
  const { GET } = await import('./route')
  return GET(
    new Request(
      `http://x/api/auth/social/kakao${query}`,
      cookieHeader ? { headers: { cookie: cookieHeader } } : undefined,
    ),
    ctx('kakao'),
  )
}

describe('GET /api/auth/social/[provider] — state 쿠키 대조 (#527)', () => {
  it('TC-SST-001 쿠키와 쿼리 state 가 같으면 로그인하고 state 쿠키를 path 와 함께 지운다', async () => {
    cookieStore.value = encodeURIComponent('/community')
    mockSuccessfulExchange()

    const res = await callback()

    expect(setSession).toHaveBeenCalledOnce()
    expect(res.headers.get('location')).toBe('/community')
    // path 가 다르면 브라우저가 지우지 않는다
    // (docs/superpowers/plans/2026-10-07-social-state-and-signup-consent.md §6).
    expect(cookieStore.deleted).toContainEqual(STATE_COOKIE_DELETE)
    expect(cookieStore.jar.social_state).toBeUndefined()
    expect(vi.mocked(global.fetch).mock.calls[0]?.[0]).toBe(
      'http://backend:8080/api/v1/auth/kakao/login?code=c&state=s',
    )
  })

  it('TC-SST-002 쿠키와 쿼리 state 가 다르면 백엔드를 부르지 않고 social_state 로 보낸다', async () => {
    // 남이 시작한 로그인을 이 브라우저에서 마치게 하는 login CSRF.
    cookieStore.jar.social_state = 'other'
    cookieStore.value = encodeURIComponent('/community')
    global.fetch = vi.fn()

    const res = await callback()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(setSession).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBe('/login?error=social_state')
    expect(cookieStore.deleted).toContainEqual(STATE_COOKIE_DELETE)
    expect(cookieStore.deleted).toContain('auth_return')
  })

  it('TC-SST-003 state 쿠키가 없으면 백엔드를 부르지 않고 social_state 로 보낸다', async () => {
    // 다른 브라우저에서 시작했거나, 범용 BFF 경로로 받은 인가 URL 이다.
    delete cookieStore.jar.social_state
    global.fetch = vi.fn()

    const res = await callback()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBe('/login?error=social_state')
  })

  it('TC-SST-004 같은 콜백을 두 번 받으면 두 번째는 백엔드를 부르지 않는다', async () => {
    mockSuccessfulExchange()
    const first = await callback()
    expect(first.headers.get('location')).toBe('/')

    vi.mocked(global.fetch).mockClear()
    const second = await callback()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(second.headers.get('location')).toBe('/login?error=social_state')
  })

  it.each(['AUTH_021', 'AUTH_022'])(
    'TC-SST-005 백엔드 %s(신규 가입 동의 부족)는 social_signup 으로 보내고 복귀 경로를 지운다',
    async resultCode => {
      cookieStore.value = encodeURIComponent('/community')
      mockBackendFailure(resultCode, 400)

      const res = await callback()

      expect(res.headers.get('location')).toBe('/login?error=social_signup')
      expect(cookieStore.deleted).toContain('auth_return')
      expect(setSession).not.toHaveBeenCalled()
    },
  )

  it('TC-SST-006 백엔드 AUTH_010(state 재사용·만료)은 social_state 로 보낸다', async () => {
    mockBackendFailure('AUTH_010', 401)

    const res = await callback()

    expect(res.headers.get('location')).toBe('/login?error=social_state')
    expect(setSession).not.toHaveBeenCalled()
  })

  it('TC-SST-007 카카오 취소(code 없음)는 백엔드를 부르지 않고 social 로 보내며 state 쿠키를 지운다', async () => {
    global.fetch = vi.fn()

    const res = await callbackWith('?error=access_denied&state=s')

    expect(global.fetch).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBe('/login?error=social')
    expect(cookieStore.deleted).toContainEqual(STATE_COOKIE_DELETE)
  })

  it('TC-SST-008 같은 이름 state 쿠키가 둘 이상이면 백엔드를 부르지 않고 social_state 로 보낸다', async () => {
    // 형제 서브도메인이 Domain=.bosspickseoul.com; Path=/ 로 심은 쿠키가 헤더 뒤에 붙으면
    // Next 파서는 그 값(마지막)을 쓴다. 쿼리 state 를 공격자 값에 맞추면 대조가 통과한다.
    cookieStore.jar.social_state = 'attacker'
    global.fetch = vi.fn()

    const res = await callbackWith(
      '?code=c&state=attacker',
      'social_state=s; social_state=attacker',
    )

    expect(global.fetch).not.toHaveBeenCalled()
    expect(setSession).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBe('/login?error=social_state')
    expect(cookieStore.deleted).toContainEqual(STATE_COOKIE_DELETE)
  })

  it('state 쿠키가 하나뿐인 원본 헤더는 그대로 통과한다', async () => {
    mockSuccessfulExchange()

    const res = await callbackWith('?code=c&state=s', 'x=1; social_state=s')

    expect(res.headers.get('location')).toBe('/')
    expect(setSession).toHaveBeenCalledOnce()
  })

  it('화이트리스트 밖 provider 여도 state 쿠키를 지운다', async () => {
    global.fetch = vi.fn()

    await GETUnknownProvider()

    expect(cookieStore.deleted).toContainEqual(STATE_COOKIE_DELETE)
  })

  it('실패 본문이 JSON 이 아니면 social 로 보낸다', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response('<html>bad gateway</html>', { status: 502 }),
      )

    const res = await callback()

    expect(res.headers.get('location')).toBe('/login?error=social')
  })
})
