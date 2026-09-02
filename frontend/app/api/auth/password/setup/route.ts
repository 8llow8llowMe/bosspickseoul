import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { getSession } from '@/lib/auth/session'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { PASSWORD_PATTERN, PASSWORD_RULE_TEXT } from '@/lib/auth/password-rules'
import type { ApiResponse } from '@/types/api'

/**
 * 비밀번호 **최초 설정**(`POST /api/v1/members/me/password/setup`, `bearerAuth`).
 * 소셜로만 가입해 비밀번호가 없는 계정에 이메일 로그인 수단을 더한다.
 *
 * ⚠️ **세 동작 중 이것만 세션을 유지한다.** BE `MemberWebUseCase.setupPassword` 는
 * 변경·전환과 달리 `tokenId` 를 받지 않는다 — 토큰을 건드리지 않으므로 로그인이
 * 그대로 살아 있다. 여기서 세션을 지우면 **아무 이유 없이 로그아웃**시키는 것이다.
 * (그래서 `clearSession` 을 import 조차 하지 않는다.)
 *
 * 그럼에도 BFF 범용 프록시가 아니라 전용 라우트인 이유: 형제 동작 둘이 전용 라우트라
 * 셋을 한자리에 모아 두는 편이 "무엇이 세션을 파괴하는가"를 읽기 쉽게 한다.
 */
export async function POST(request: Request) {
  const { backendApiUrl } = getServerEnv()
  const session = await getSession()

  if (!session) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.' },
      { status: 401 },
    )
  }

  const body = (await request.json().catch(() => null)) as {
    newPassword?: unknown
  } | null
  const newPassword =
    typeof body?.newPassword === 'string' ? body.newPassword : ''

  if (!PASSWORD_PATTERN.test(newPassword)) {
    return NextResponse.json(
      { message: PASSWORD_RULE_TEXT, code: null },
      { status: 400 },
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(
      `${backendApiUrl}/api/v1/members/me/password/setup`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      },
    )
  } catch {
    return NextResponse.json(
      {
        message: '요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
        code: null,
      },
      { status: 502 },
    )
  }

  const data = (await upstream
    .json()
    .catch(() => null)) as ApiResponse<unknown> | null

  if (!upstream.ok || !isApiSuccess(data ?? undefined)) {
    return NextResponse.json(
      {
        message: getApiMessage(
          data ?? undefined,
          '비밀번호를 설정하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        ),
        // `MEMBER_008`(이미 비밀번호가 있음)은 화면이 들고 있는 상태가 낡았다는 신호다.
        code: data?.dataHeader.resultCode ?? null,
      },
      { status: upstream.status === 200 ? 500 : upstream.status },
    )
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
