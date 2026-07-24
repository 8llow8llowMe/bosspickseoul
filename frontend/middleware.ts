import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session-constants'

// 인증 필요한 보호 경로 접두사
const PROTECTED = [
  '/analysis',
  '/simulation',
  '/community',
  '/chatting',
  '/profile',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED.some(
    p => pathname === p || pathname.startsWith(`${p}/`),
  )
  if (!isProtected) return NextResponse.next()

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value)
  if (hasSession) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.search = `?redirect=${encodeURIComponent(pathname)}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/analysis/:path*',
    '/simulation/:path*',
    '/community/:path*',
    '/chatting/:path*',
    '/profile/:path*',
  ],
}
