import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import {
  config,
  isProtectedPath,
  middleware,
  PROTECTED_PATHS,
  shouldAllowCommunityMock,
} from './middleware'

describe('middleware', () => {
  // 시뮬레이션은 공개다 — 백엔드가 계산·조회 API 를 공개로 두고 저장만 인증 필수로 했다.
  // 라우트를 막으면 비로그인 사용자가 마법사에 도달조차 못 한다.
  it.each([
    '/simulation',
    '/simulation/report',
    '/simulation/compare',
    '/analysis/simulation',
    '/analysis/simulation/report',
  ])('leaves the public simulation path %s unprotected', pathname => {
    const req = new NextRequest(new URL(`http://x${pathname}`))
    const res = middleware(req)

    expect(res.headers.get('location')).toBeNull()
    expect(isProtectedPath(pathname)).toBe(false)
  })

  it.each(['/analysis', '/analysis/result'])(
    'passes the public analysis path %s through without a session cookie',
    pathname => {
      const req = new NextRequest(new URL(`http://x${pathname}`))
      const res = middleware(req)

      expect(res.headers.get('location')).toBeNull()
      expect(isProtectedPath(pathname)).toBe(false)
    },
  )

  it.each([
    '/community/register',
    '/community/register/step-two',
    '/chatting/room',
    '/profile',
  ])('keeps %s protected', pathname => {
    expect(isProtectedPath(pathname)).toBe(true)
  })

  it.each(['/community/list', '/community/10'])(
    'passes the public community path %s through without a session cookie',
    pathname => {
      const req = new NextRequest(new URL(`http://x${pathname}`))
      const res = middleware(req)

      expect(res.headers.get('location')).toBeNull()
      expect(isProtectedPath(pathname)).toBe(false)
    },
  )

  it('redirects an unauthenticated community register route and preserves its query', () => {
    const req = new NextRequest(
      new URL('http://x/community/register?from=list&draft=1'),
    )
    const res = middleware(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toBeTruthy()
    // Location 은 상대 경로다. 브라우저처럼 요청 URL 기준으로 해석해 검증한다.
    const url = new URL(location as string, 'http://x')
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe(
      '/community/register?from=list&draft=1',
    )
  })

  it('passes a community register route through when the session cookie is present', () => {
    const req = new NextRequest(new URL('http://x/community/register'))
    req.cookies.set('bps_session', 'x')

    expect(middleware(req).headers.get('location')).toBeNull()
  })

  it('passes an explicit development mock community register route through', () => {
    const req = new NextRequest(new URL('http://x/community/register?mock=1'))

    expect(middleware(req).headers.get('location')).toBeNull()
  })

  it.each([
    ['/community/register', 'mock=1', 'development', true],
    ['/community/register/step-two', 'mock=1', 'test', true],
    ['/community/register', 'mock=1', 'production', false],
    ['/community/register', 'mock=true', 'development', false],
    ['/community/register', 'mock=1&mock=0', 'development', false],
    ['/community/list', 'mock=1', 'development', false],
  ] as const)(
    'allows a community mock only for %s?%s in %s',
    (pathname, query, nodeEnv, expected) => {
      expect(
        shouldAllowCommunityMock(pathname, new URLSearchParams(query), nodeEnv),
      ).toBe(expected)
    },
  )

  it('redirects a protected chatting route and preserves its query', () => {
    const req = new NextRequest(new URL('http://x/chatting/room?roomId=12'))
    const res = middleware(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toBeTruthy()
    // Location 은 상대 경로다. 브라우저처럼 요청 URL 기준으로 해석해 검증한다.
    const url = new URL(location as string, 'http://x')
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe('/chatting/room?roomId=12')
  })

  it('passes a protected route through when the session cookie is present', () => {
    const req = new NextRequest(new URL('http://x/profile'))
    req.cookies.set('bps_session', 'x')
    const res = middleware(req)

    expect(res.headers.get('location')).toBeNull()
  })

  it.each(['/', '/status', '/recommend', '/recommend/detail'])(
    'passes the public path %s through without a session cookie',
    pathname => {
      const req = new NextRequest(new URL(`http://x${pathname}`))
      const res = middleware(req)

      expect(res.headers.get('location')).toBeNull()
    },
  )

  it('keeps the analysis subtree out of the matcher entirely', () => {
    // 시뮬레이션이 공개가 되면서 /analysis 하위에 보호 경로가 남지 않았다.
    expect(config.matcher).not.toContain('/analysis/:path*')
    expect(config.matcher).not.toContain('/analysis/simulation/:path*')
    expect(config.matcher).not.toContain('/simulation/:path*')
    expect(PROTECTED_PATHS).not.toContain('/analysis')
    expect(PROTECTED_PATHS).not.toContain('/simulation')
  })

  it('registers only the protected community register subtree in the matcher', () => {
    expect(config.matcher).toContain('/community/register/:path*')
    expect(config.matcher).not.toContain('/community/:path*')
    expect(PROTECTED_PATHS).toContain('/community/register')
    expect(PROTECTED_PATHS).not.toContain('/community')
  })

  it('keeps /profile protected without a session cookie', () => {
    const req = new NextRequest(new URL('http://x/profile'))
    const res = middleware(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toBeTruthy()
    // Location 은 상대 경로다. 브라우저처럼 요청 URL 기준으로 해석해 검증한다.
    const url = new URL(location as string, 'http://x')
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe('/profile')
  })
})
