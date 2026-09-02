import { cookies } from 'next/headers'
import { getServerEnv } from '@/lib/env.server'
import { redirectToPath } from '@/lib/http/redirect'
import { AUTH_RETURN_COOKIE, safeReturnPath } from '@/lib/auth/return-path'
import { setSession } from '@/lib/auth/session'
import { extractCookieValue } from '@/lib/auth/set-cookie'
import { withClientUserAgent } from '@/lib/auth/device-headers'
import { isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

type LoginBody = { accessToken: string; memberId: string }
const PROVIDERS = new Set(['kakao']) // google/naver는 백엔드 준비 후 추가

export async function GET(
  request: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params
  // 오리진은 쓰지 않는다. standalone 서버가 컨테이너 바인드 주소로 오리진을 구성하므로
  // 프록시 뒤에서는 http://0.0.0.0:3000 이 되어 도달 불가능한 주소로 리다이렉트된다.
  const { searchParams } = new URL(request.url)

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

  const fail = async () => {
    await takeReturnPath()
    return redirectToPath('/login?error=social')
  }

  if (!PROVIDERS.has(provider)) return fail()

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state) return fail()

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

  if (!upstream.ok || !isApiSuccess(data) || !data?.dataBody) return fail()
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
