import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'

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
})
