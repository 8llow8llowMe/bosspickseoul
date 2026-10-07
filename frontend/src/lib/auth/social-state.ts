import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { socialLoginErrorPath } from './social-errors'
import { safeReturnPath } from './return-path'
import {
  SIGNUP_CONSENT_KEYS,
  parseSocialSignupReason,
  socialSignupPath,
  type SocialSignupReason,
} from './signup-consent'

/**
 * 소셜 로그인 `state` 를 **이 브라우저**에 묶는다 (#527).
 *
 * 백엔드는 state 를 발급·보관·1회 소비하지만, 그 state 가 어느 브라우저에서 시작됐는지는
 * 모른다. 그래서 남이 만든 인가 URL 을 피해자가 열고 인가를 마치면 피해자 브라우저에
 * 남의 계정 세션이 생기거나(login CSRF), 남이 정한 동의 값으로 피해자 이름의 회원과
 * 동의 이력이 생긴다(계약 §0-4).
 *
 * BFF 가 인가 URL 을 받아 줄 때 state 를 HttpOnly 쿠키에 남기고, 콜백에서 쿼리 state 와
 * 대조한 뒤에만 백엔드 `/login` 을 부른다. 다른 브라우저에서 시작된 state 는 쿠키가 없어
 * 백엔드까지 가지 못한다.
 */

/** 백엔드가 소셜 로그인을 지원하는 provider. google/naver 는 백엔드 준비 후 추가. */
export const SOCIAL_PROVIDERS: ReadonlySet<string> = new Set(['kakao'])

export const SOCIAL_STATE_COOKIE = 'social_state'

/**
 * authorize(`/api/auth/social/kakao/authorize`)와 콜백(`/api/auth/social/kakao`)을
 * 함께 덮는 접두. 지울 때도 **같은 path 를 넘겨야** 브라우저가 지운다.
 */
export const SOCIAL_STATE_COOKIE_PATH = '/api/auth/social'

/** 백엔드가 state 를 10분 보관하는 것과 맞춘다. */
export const SOCIAL_STATE_MAX_AGE_SECONDS = 600

/**
 * `secure` 는 세션 쿠키(`session.ts`)와 같은 판정이다 — 로컬 http 개발에서도 쿠키가 실린다.
 * `SameSite=Lax` 로 충분하다: 카카오에서 돌아오는 콜백이 최상위 GET 내비게이션이다.
 */
export const socialStateCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: SOCIAL_STATE_COOKIE_PATH,
  maxAge: SOCIAL_STATE_MAX_AGE_SECONDS,
})

/** 백엔드가 준 인가 URL 의 `state`. 비었거나 URL 이 깨졌으면 `null`. */
export const extractStateFromAuthorizationUrl = (
  url: string,
): string | null => {
  try {
    return new URL(url).searchParams.get('state') || null
  } catch {
    return null
  }
}

/**
 * 요청 `Cookie` 헤더에 `name` 쿠키가 몇 번 실렸는지 센다.
 *
 * Next 의 `cookies()` 는 헤더를 `Map` 으로 파싱해 같은 이름이면 마지막 값만 남긴다 —
 * `getAll(name)` 도 1개를 넘지 못한다. 그래서 중복은 원본 헤더에서 센다. 분리 규칙은
 * Next 파서와 같다(`; *` 로 자르고 `=` 앞을 이름으로 본다, `=` 가 없으면 통째로 이름).
 */
export const countCookie = (
  cookieHeader: string | null,
  name: string,
): number => {
  if (!cookieHeader) return 0
  let count = 0
  for (const pair of cookieHeader.split(/; */)) {
    if (!pair) continue
    const splitAt = pair.indexOf('=')
    if ((splitAt === -1 ? pair : pair.slice(0, splitAt)) === name) count += 1
  }
  return count
}

const digest = (value: string) => createHash('sha256').update(value).digest()

/**
 * 쿼리 state 와 쿠키 state 가 같은가.
 *
 * 다이제스트로 바꾼 뒤 비교한다 — `timingSafeEqual` 은 길이가 다르면 throw 하고,
 * 길이를 먼저 비교하면 그만큼 시간 차가 생긴다. 다이제스트는 항상 32바이트다.
 */
export const isSameState = (
  query: string | null,
  cookie: string | undefined,
): boolean => {
  if (!query || !cookie) return false
  return timingSafeEqual(digest(query), digest(cookie))
}

/**
 * 콜백에서 백엔드 `/login` 이 실패했을 때 보낼 **경로**.
 *
 * - `AUTH_010` — state 재사용·만료. 쿠키 대조 실패와 같은 안내를 쓴다.
 * - `AUTH_021` — 신규 회원인데 문서 동의가 없다·부족하다 → 동의 화면 `reason=terms`.
 * - `AUTH_022` — 문서 동의는 했지만 만 14세 미확인 → 동의 화면 `reason=age`.
 *   인가코드는 1회용이라 동의 화면은 반드시 authorize 부터 다시 시작한다(계약 §0-2, #495).
 *   복귀 경로는 콜백이 쿠키를 지웠으므로 `redirect` 로 넘겨 동의 화면이 다시 남기게 한다.
 * - 그 밖 — `/login?error=social`.
 *
 * `returnPath` 는 호출부가 `safeReturnPath` 로 거른 값이어야 한다.
 */
export const socialCallbackFailure = (
  resultCode: string | null | undefined,
  { provider, returnPath }: { provider: string; returnPath: string },
): string => {
  switch (resultCode) {
    case 'AUTH_010':
      return socialLoginErrorPath('social_state')
    case 'AUTH_021':
      return socialSignupPath({ provider, reason: 'terms', returnPath })
    case 'AUTH_022':
      return socialSignupPath({ provider, reason: 'age', returnPath })
    default:
      return socialLoginErrorPath('social')
  }
}

type SearchParamValue = string | string[] | undefined

/** 같은 키가 여러 번 오면(배열) 믿지 않는다. */
const single = (value: SearchParamValue): string | undefined =>
  typeof value === 'string' ? value : undefined

/**
 * 카카오 첫 가입 동의 화면(`/register/social`) 쿼리를 거른다 (#495).
 *
 * - `provider` — 화이트리스트 밖이면 `null`(화면은 `/register` 로 보낸다)
 * - `reason` — `terms` | `age`, 그 밖은 `terms`
 * - `redirect` — `safeReturnPath` 를 거친 복귀 경로. 카카오 버튼이 쿠키에 다시 남긴다
 */
export const resolveSocialSignupQuery = (
  searchParams: Record<string, SearchParamValue>,
): {
  provider: string
  reason: SocialSignupReason
  returnTo: string
} | null => {
  const provider = single(searchParams.provider)
  if (!provider || !SOCIAL_PROVIDERS.has(provider)) return null
  return {
    provider,
    reason: parseSocialSignupReason(single(searchParams.reason)),
    returnTo: safeReturnPath(single(searchParams.redirect)),
  }
}

/**
 * authorize 요청에서 백엔드로 넘길 동의 쿼리만 골라 낸다.
 *
 * 값이 정확히 `'true'` 인 동의 키만 싣고 나머지 키는 버린다 — 이 라우트는 백엔드로 가는
 * 쿼리를 그대로 중계하지 않는다. 동의가 없으면 백엔드가 `false` 로 본다.
 */
export const pickConsentQuery = (searchParams: URLSearchParams): string => {
  const picked = new URLSearchParams()
  for (const key of SIGNUP_CONSENT_KEYS) {
    if (searchParams.get(key) === 'true') picked.set(key, 'true')
  }
  const query = picked.toString()
  return query ? `?${query}` : ''
}
