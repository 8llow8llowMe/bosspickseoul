import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { setSession } from '@/lib/auth/session'
import { extractCookieValue } from '@/lib/auth/set-cookie'
import { isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

type LoginBody = { accessToken: string; memberId: string }
const PROVIDERS = new Set(['kakao']) // google/naver는 백엔드 준비 후 추가

export async function GET(
  request: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params
  const url = new URL(request.url)
  const fail = () => NextResponse.redirect(new URL('/login?error=social', url))

  if (!PROVIDERS.has(provider)) return fail()

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) return fail()

  const { backendApiUrl } = getServerEnv()
  const upstream = await fetch(
    `${backendApiUrl}/api/v1/auth/${provider}/login?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    { method: 'GET', headers: { Accept: 'application/json' } },
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
  return NextResponse.redirect(new URL('/', url))
}
