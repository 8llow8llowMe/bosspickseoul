import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { config, middleware } from './middleware'

describe('middleware', () => {
  it('redirects a protected route to /login?redirect=... when no session cookie is present', () => {
    const req = new NextRequest(new URL('http://x/analysis'))
    const res = middleware(req)
    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toBeTruthy()
    const url = new URL(location as string)
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe('/analysis')
  })

  it('passes a protected route through when the bps_session cookie is present', () => {
    const req = new NextRequest(new URL('http://x/analysis'))
    req.cookies.set('bps_session', 'x')
    const res = middleware(req)
    expect(res.headers.get('location')).toBeNull()
  })

  it('passes a non-protected path through without a session cookie', () => {
    const req = new NextRequest(new URL('http://x/'))
    const res = middleware(req)
    expect(res.headers.get('location')).toBeNull()
  })

  it('passes /status through without a session cookie', () => {
    const req = new NextRequest(new URL('http://x/status'))
    const res = middleware(req)
    expect(res.headers.get('location')).toBeNull()
  })

  it.each(['/recommend', '/recommend/detail'])(
    'passes the public recommendation path %s through without a session cookie',
    pathname => {
      const req = new NextRequest(new URL(`http://x${pathname}`))
      const res = middleware(req)

      expect(res.headers.get('location')).toBeNull()
    },
  )

  it('does not register the public recommendation path in the matcher', () => {
    expect(config.matcher).not.toContain('/recommend/:path*')
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
