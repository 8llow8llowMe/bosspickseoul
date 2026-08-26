import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session-constants'
import { redirectRequestToPath } from '@/lib/http/redirect'

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

  // 미들웨어는 절대 URL 이 필요하다 — 어댑터가 Location 을 파싱해 요청 host 와 비교한다.
  // 다만 nextUrl 의 오리진은 쓸 수 없다(standalone 바인드 주소 0.0.0.0:3000). 오리진은
  // 프록시 헤더에서 유도한다. 자세한 근거는 lib/http/redirect.ts 참고.
  return redirectRequestToPath(
    req,
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
