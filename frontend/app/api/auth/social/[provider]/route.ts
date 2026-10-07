import { cookies } from 'next/headers'
import { getServerEnv } from '@/lib/env.server'
import { redirectToPath } from '@/lib/http/redirect'
import { AUTH_RETURN_COOKIE, safeReturnPath } from '@/lib/auth/return-path'
import { setSession } from '@/lib/auth/session'
import { extractCookieValue } from '@/lib/auth/set-cookie'
import { withClientUserAgent } from '@/lib/auth/device-headers'
import {
  SOCIAL_PROVIDERS,
  SOCIAL_STATE_COOKIE,
  SOCIAL_STATE_COOKIE_PATH,
  countCookie,
  isSameState,
  socialCallbackFailure,
} from '@/lib/auth/social-state'
import { socialLoginErrorPath } from '@/lib/auth/social-errors'
import { isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

type LoginBody = { accessToken: string; memberId: string }

export async function GET(
  request: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params
  // 오리진은 쓰지 않는다. standalone 서버가 컨테이너 바인드 주소로 오리진을 구성하므로
  // 프록시 뒤에서는 http://0.0.0.0:3000 이 되어 도달 불가능한 주소로 리다이렉트된다.
  const { searchParams } = new URL(request.url)

  /*
   * state 쿠키는 **맨 앞에서 읽고 곧바로 지운다** — 어느 분기로 끝나든 한 번만 쓴다(#527).
   * path 를 같이 넘겨야 브라우저가 지운다(심을 때 `/api/auth/social` 로 심었다).
   */
  const store = await cookies()
  const stateCookie = store.get(SOCIAL_STATE_COOKIE)?.value
  /*
   * 같은 이름이 둘 이상이면 믿지 않는다. 형제 서브도메인이 `Domain=.bosspickseoul.com; Path=/`
   * 로 심은 쿠키는 Next 파서에서 마지막 값으로 이기고, path 가 달라 아래 삭제로도 지워지지 않는다.
   * `cookies().getAll()` 은 Map 파싱이라 중복을 못 보므로 원본 헤더에서 센다.
   */
  const stateCookieCount = countCookie(
    request.headers.get('cookie'),
    SOCIAL_STATE_COOKIE,
  )
  store.delete({ name: SOCIAL_STATE_COOKIE, path: SOCIAL_STATE_COOKIE_PATH })

  /**
   * 복귀 경로를 꺼내면서 쿠키를 지운다.
   *
   * **성공·실패 어느 쪽으로 끝나든 반드시 지운다.** 남겨 두면 다음 로그인이 지난번
   * 목적지로 가 버린다. 값은 `safeReturnPath` 를 다시 통과시킨다 — 쿠키는 클라이언트가
   * 쓰는 값이라 여기서 오는 문자열을 그대로 `Location` 헤더에 실을 수 없다.
   */
  const takeReturnPath = async (): Promise<string> => {
    const store = await cookies()
    const raw = store.get(AUTH_RETURN_COOKIE)?.value
    if (raw !== undefined) store.delete(AUTH_RETURN_COOKIE)
    if (raw === undefined) return '/'

    try {
      return safeReturnPath(decodeURIComponent(raw))
    } catch {
      // decodeURIComponent 는 깨진 퍼센트 인코딩에 throw 한다.
      return '/'
    }
  }

  /**
   * 실패로 끝낸다. 복귀 경로 쿠키는 **늘** 지우고, 실패 경로가 그 값을 쓰면 넘긴다 —
   * 카카오 첫 가입 동의 화면(`/register/social`)은 복귀 경로를 `redirect` 로 이어 받는다(#495).
   */
  const fail = async (
    toPath: (returnPath: string) => string = () =>
      socialLoginErrorPath('social'),
  ) => redirectToPath(toPath(await takeReturnPath()))

  /*
   * 판정 순서를 바꾸지 않는다. 쿠키 대조가 백엔드 호출보다 늦으면 남이 보낸 콜백이
   * 정상 state 를 백엔드에서 먼저 소비해, 진행 중인 로그인을 깨뜨릴 수 있다.
   */
  if (!SOCIAL_PROVIDERS.has(provider)) return fail()

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  // 카카오 취소(`?error=access_denied`)도 code 가 없어 여기서 끝난다.
  if (!code || !state) return fail()

  // 이 브라우저가 시작한 로그인이 아니다 — 백엔드를 부르지 않는다.
  if (stateCookieCount > 1 || !isSameState(state, stateCookie))
    return fail(() => socialLoginErrorPath('social_state'))

  const { backendApiUrl } = getServerEnv()
  const upstream = await fetch(
    `${backendApiUrl}/api/v1/auth/${provider}/login?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    // 일반 로그인과 같은 이유로 UA 를 넘긴다 — 기기 세션의 deviceInfo 가 된다.
    {
      method: 'GET',
      headers: withClientUserAgent(request, { Accept: 'application/json' }),
    },
  )
  const data = (await upstream
    .json()
    .catch(() => null)) as ApiResponse<LoginBody> | null

  if (!upstream.ok || !isApiSuccess(data) || !data?.dataBody)
    return fail(returnPath =>
      socialCallbackFailure(data?.dataHeader?.resultCode, {
        provider,
        returnPath,
      }),
    )
  if (
    typeof data.dataBody.accessToken !== 'string' ||
    !data.dataBody.accessToken
  )
    return fail()

  const setCookie =
    upstream.headers.getSetCookie?.() ?? upstream.headers.get('set-cookie')
  const refreshToken = extractCookieValue(setCookie, 'refreshToken')
  if (!refreshToken) return fail()

  await setSession({
    accessToken: data.dataBody.accessToken,
    refreshToken,
    memberId: data.dataBody.memberId,
  })
  return redirectToPath(await takeReturnPath())
}
