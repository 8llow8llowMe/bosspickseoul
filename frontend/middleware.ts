import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session-constants'

// 인증 필요한 보호 경로 접두사
export const PROTECTED_PATHS = [
  '/analysis/simulation',
  '/simulation',
  '/community',
  '/chatting',
  '/profile',
] as const

export const isProtectedPath = (pathname: string) =>
  PROTECTED_PATHS.some(
    path => pathname === path || pathname.startsWith(`${path}/`),
  )

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  if (!isProtectedPath(pathname)) return NextResponse.next()

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value)
  if (hasSession) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.search = `?redirect=${encodeURIComponent(`${pathname}${search}`)}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/analysis/simulation/:path*',
    '/simulation/:path*',
    '/community/:path*',
    '/chatting/:path*',
    '/profile/:path*',
  ],
}
