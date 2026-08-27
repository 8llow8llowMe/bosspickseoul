/**
 * 로그인 후 **어디로 되돌아갈지**를 다루는 한 곳.
 *
 * 검증이 한 벌이어야 하는 이유: 이 값은 두 경로로 흘러간다.
 * ① 이메일 로그인 → `router.replace()` (클라이언트 내비게이션)
 * ② 카카오 로그인 → 라우트 핸들러의 **`Location` 헤더** (서버 응답)
 *
 * ②가 있어서 검증이 오픈 리다이렉트 방지만으로는 부족하다. `Location` 에 CR/LF 가 실리면
 * 응답 헤더 주입이 된다. 두 경로가 서로 다른 판정을 쓰는 순간 느슨한 쪽이 구멍이 되므로,
 * 판정을 여기 하나로 두고 양쪽이 같이 쓴다.
 */

/**
 * 카카오로 떠나기 직전 복귀 경로를 담아 두는 쿠키.
 *
 * 왜 쿠키인가: 복귀 목적지를 정하는 주체가 **서버 라우트 핸들러**(`/api/auth/social/[provider]`)다.
 * `sessionStorage` 는 그 시점에 읽을 수 없고, OAuth `state` 는 백엔드가 생성·검증하므로
 * 우리 값을 실을 수 없다. 남는 건 쿠키뿐이다.
 *
 * `SameSite=Lax` 로 충분하다 — 카카오에서 돌아오는 요청이 최상위 GET 내비게이션이라 함께 전송된다.
 */
export const AUTH_RETURN_COOKIE = 'auth_return'

/** 로그인 왕복에 필요한 시간만 남긴다. 길게 두면 다음 로그인이 엉뚱한 곳으로 간다. */
export const AUTH_RETURN_MAX_AGE_SECONDS = 600

/** 로그인한 사람을 다시 보내면 `GuestOnly` 가 또 튕겨 내는 화면들. */
const AUTH_PATHS = ['/login', '/register']

const isAuthPath = (path: string): boolean =>
  AUTH_PATHS.some(
    authPath =>
      path === authPath ||
      path.startsWith(`${authPath}?`) ||
      path.startsWith(`${authPath}#`) ||
      path.startsWith(`${authPath}/`),
  )

/** 경로에 들어올 이유가 없는 제어문자(CR/LF 포함). `Location` 헤더 주입을 막는다. */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/

const isInternalPath = (value: string): boolean => {
  if (!value.startsWith('/')) return false
  // `//evil.example` 은 프로토콜 상대 주소다 — 외부로 나간다.
  if (value.startsWith('//')) return false
  // 브라우저가 `\` 를 `/` 로 정규화해 `/\evil.example` 이 `//evil.example` 이 된다.
  if (value.includes('\\')) return false
  return true
}

/**
 * 되돌아갈 내부 경로로 정규화한다. 안전하지 않으면 `fallback`(기본 `/`).
 *
 * `fallback` 자체도 같은 판정을 통과해야 한다 — 호출부가 실수로 외부 주소를 폴백에 넣어도
 * 여기서 막힌다.
 */
export const safeReturnPath = (
  value: string | null | undefined,
  fallback = '/',
): string => {
  // 제어문자는 **자르기 전 원본**에서 본다. `trim()` 이 후행 `\r` 을 지워 버리면
  // `/analysis\r` 같은 값이 멀쩡한 경로로 둔갑해 통과한다.
  if (typeof value === 'string' && !CONTROL_CHARACTERS.test(value)) {
    const trimmed = value.trim()
    if (trimmed && isInternalPath(trimmed) && !isAuthPath(trimmed)) {
      return trimmed
    }
  }

  if (fallback === '/') return '/'
  return safeReturnPath(fallback)
}

/**
 * 로그인 화면 링크. 되돌아갈 곳이 홈이면 쿼리를 붙이지 않는다 —
 * 기본 동작과 같은 값을 URL 에 적어 두면 링크만 길어진다.
 */
export const buildLoginHref = (returnTo: string | null | undefined): string => {
  const path = safeReturnPath(returnTo)
  return path === '/' ? '/login' : `/login?redirect=${encodeURIComponent(path)}`
}

/**
 * 지금 브라우저가 보고 있는 경로. **이벤트 핸들러나 effect 안에서만** 부른다.
 *
 * `usePathname()` + `useSearchParams()` 대신 `window` 를 읽는 이유: `useSearchParams()` 는
 * 그 컴포넌트를 클라이언트 렌더로 밀어내 가장 가까운 Suspense 경계를 요구한다. 로그인
 * 유도는 라우트 전체를 감싸는 가드(`RequireAuth` 등)에서 일어나는데, 거기에 훅을 넣으면
 * 정적 렌더 페이지가 통째로 영향을 받는다. 어차피 클릭·effect 시점이라 `window` 가 있다.
 */
export const currentBrowserPath = (): string =>
  typeof window === 'undefined'
    ? '/'
    : safeReturnPath(`${window.location.pathname}${window.location.search}`)
