import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session-constants'
import { redirectToPath } from '@/lib/http/redirect'

// 인증 필요한 보호 경로 접두사
//
// 시뮬레이션(`/simulation`, `/analysis/simulation`)은 보호 경로가 아니다.
// 백엔드가 계산·조회 API(`store-sizes`/`franchisees`/`reports`)를 공개로 두고
// 저장·이력(`histories`)만 인증 필수로 뒀다 — 비로그인 사용자도 창업 비용을 계산해 보고
// "저장" 시점에만 로그인을 유도하는 것이 설계다
// (`docs/features/simulation/simulation-report.md` D2 #11, `backend/docs/simulation-frontend-guide.md`).
// 라우트를 막으면 마법사에 도달조차 못 해 공개 API 를 둔 의미가 없어진다.
// 저장 이력 목록은 `/profile/bookmarks/simulation` 이라 `/profile` 로 이미 보호된다.
export const PROTECTED_PATHS = [
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

  // nextUrl 의 오리진을 쓰지 않는다. standalone 서버는 컨테이너 바인드 주소로 오리진을
  // 구성하므로 프록시 뒤에서는 http://0.0.0.0:3000 으로 나가 브라우저가 도달할 수 없다.
  return redirectToPath(
    `/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`,
  )
}

export const config = {
  matcher: [
    '/community/register/:path*',
    '/chatting/:path*',
    '/profile/:path*',
  ],
}
