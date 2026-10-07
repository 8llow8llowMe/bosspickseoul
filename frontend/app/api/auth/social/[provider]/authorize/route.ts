import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { withClientUserAgent } from '@/lib/auth/device-headers'
import {
  SOCIAL_PROVIDERS,
  SOCIAL_STATE_COOKIE,
  extractStateFromAuthorizationUrl,
  pickConsentQuery,
  socialStateCookieOptions,
} from '@/lib/auth/social-state'
import { isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

type AuthorizeBody = { authorizationUrl: string }

const NO_STORE = { 'Cache-Control': 'no-store' }

/** 이 라우트가 직접 만드는 실패. 클라이언트가 읽는 `ApiResponse` 모양을 지킨다. */
const failure = (status: number, message: string) =>
  NextResponse.json(
    {
      dataHeader: { success: false, resultCode: null, resultMessage: message },
      dataBody: null,
    } satisfies ApiResponse<null>,
    { status, headers: NO_STORE },
  )

/**
 * 소셜 인가 URL 을 받아 주면서 `state` 를 이 브라우저의 HttpOnly 쿠키에 남긴다 (#527).
 *
 * 범용 BFF 프록시(`/api/bff/...`)로도 인가 URL 을 받을 수 있지만 쿠키가 심기지 않아 그 URL 은
 * 콜백에서 거절된다. 응답 본문은 범용 프록시와 같은 `ApiResponse<{ authorizationUrl }>` 이다.
 * 대조는 콜백(`../route.ts`)이 한다.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params
  if (!SOCIAL_PROVIDERS.has(provider)) {
    return failure(404, '지원하지 않는 로그인 방식입니다.')
  }

  const { searchParams } = new URL(request.url)
  const { backendApiUrl } = getServerEnv()

  let upstream: Response
  try {
    upstream = await fetch(
      `${backendApiUrl}/api/v1/auth/${provider}/authorize${pickConsentQuery(searchParams)}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: withClientUserAgent(request, { Accept: 'application/json' }),
      },
    )
  } catch {
    return failure(502, '소셜 로그인을 시작하지 못했습니다.')
  }

  const text = await upstream.text()
  let data: ApiResponse<AuthorizeBody> | null = null
  try {
    data = JSON.parse(text) as ApiResponse<AuthorizeBody>
  } catch {
    data = null
  }

  // 실패는 상태와 본문을 그대로 넘긴다. 쿠키는 남기지 않는다.
  if (!upstream.ok || !isApiSuccess(data)) {
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') ?? 'application/json',
        ...NO_STORE,
      },
    })
  }

  const url = data?.dataBody?.authorizationUrl
  const state =
    typeof url === 'string' ? extractStateFromAuthorizationUrl(url) : null
  // state 없이 보내면 콜백이 반드시 거절한다 — 카카오까지 보내지 않고 여기서 멈춘다.
  if (!state) {
    return failure(502, '소셜 로그인을 시작하지 못했습니다.')
  }

  const response = NextResponse.json(data, { headers: NO_STORE })
  response.cookies.set(SOCIAL_STATE_COOKIE, state, socialStateCookieOptions())
  return response
}
