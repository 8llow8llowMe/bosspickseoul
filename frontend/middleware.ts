import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session-constants'

// 인증 필요한 보호 경로 접두사
export const PROTECTED_PATHS = [
  '/analysis/simulation',
  '/simulation',
  '/community/register',
  '/chatting',
  '/profile',
] as const

export const isProtectedPath = (pathname: string) =>
  PROTECTED_PATHS.some(
    path => pathname === path || pathname.startsWith(`${path}/`),
  )

export const shouldAllowCommunityMock = (
  pathname: string,
  searchParams: URLSearchParams,
  nodeEnv = process.env.NODE_ENV,
) => {
  const mockValues = searchParams.getAll('mock')

  return (
    nodeEnv !== 'production' &&
    (pathname === '/community/register' ||
      pathname.startsWith('/community/register/')) &&
    mockValues.length === 1 &&
    mockValues[0] === '1'
  )
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  if (!isProtectedPath(pathname)) return NextResponse.next()
  if (shouldAllowCommunityMock(pathname, req.nextUrl.searchParams)) {
    return NextResponse.next()
  }

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
    '/community/register/:path*',
    '/chatting/:path*',
    '/profile/:path*',
  ],
}
