import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { setSession } from '@/lib/auth/session'
import { extractCookieValue } from '@/lib/auth/set-cookie'
import { isApiSuccess, getApiMessage } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

type LoginBody = { accessToken: string; memberId: string }

export async function POST(request: Request) {
  const { backendApiUrl } = getServerEnv()
  const credentials = await request.json()

  const upstream = await fetch(`${backendApiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  const data = (await upstream.json()) as ApiResponse<LoginBody>

  if (!upstream.ok || !isApiSuccess(data) || !data.dataBody) {
    return NextResponse.json(
      { message: getApiMessage(data, '로그인에 실패했습니다.') },
      { status: upstream.status === 200 ? 401 : upstream.status },
    )
  }

  const setCookie =
    upstream.headers.getSetCookie?.() ?? upstream.headers.get('set-cookie')
  const refreshToken = extractCookieValue(setCookie, 'refreshToken')
  if (!refreshToken) {
    return NextResponse.json(
      { message: '세션 초기화에 실패했습니다.' },
      { status: 502 },
    )
  }

  await setSession({
    accessToken: data.dataBody.accessToken,
    refreshToken,
    memberId: data.dataBody.memberId,
  })

  return NextResponse.json(
    { memberId: data.dataBody.memberId },
    { status: 200 },
  )
}
