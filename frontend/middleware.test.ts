import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import {
  config,
  isProtectedPath,
  middleware,
  PROTECTED_PATHS,
} from './middleware'

describe('middleware', () => {
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
    '/analysis/simulation',
    '/analysis/simulation/report',
    '/simulation',
    '/community',
    '/chatting/room',
    '/profile',
  ])('keeps %s protected', pathname => {
    expect(isProtectedPath(pathname)).toBe(true)
  })

  it('redirects a protected simulation route and preserves its query', () => {
    const req = new NextRequest(
      new URL('http://x/analysis/simulation?serviceCode=CS100001'),
    )
    const res = middleware(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toBeTruthy()
    const url = new URL(location as string)
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe(
      '/analysis/simulation?serviceCode=CS100001',
    )
  })

  it('passes a protected route through when the session cookie is present', () => {
    const req = new NextRequest(new URL('http://x/analysis/simulation'))
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

  it('registers only the protected analysis subtree in the matcher', () => {
    expect(config.matcher).toContain('/analysis/simulation/:path*')
    expect(config.matcher).not.toContain('/analysis/:path*')
    expect(PROTECTED_PATHS).not.toContain('/analysis')
  })

  it('keeps /profile protected without a session cookie', () => {
    const req = new NextRequest(new URL('http://x/profile'))
    const res = middleware(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toBeTruthy()
    const url = new URL(location as string)
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe('/profile')
  })
})
