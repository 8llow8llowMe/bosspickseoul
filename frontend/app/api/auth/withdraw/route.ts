import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { clearSession, getSession } from '@/lib/auth/session'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

/**
 * 회원 탈퇴 (`POST /api/v1/members/me/withdraw`, `bearerAuth`).
 *
 * BFF 범용 프록시(`app/api/bff/[...path]`)로 보내지 않는 이유: 그쪽은 토큰만 주입하고
 * **서버 세션은 그대로 남긴다.** 탈퇴 후 세션이 남으면 죽은 토큰을 들고 로그인한 것처럼
 * 보이다가 모든 호출이 실패한다. 로그아웃 라우트와 같은 이유로 전용 라우트다.
 *
 * ⚠️ **로그아웃과 딱 하나 다르다.** 로그아웃은 백엔드가 실패해도 로컬 세션을 지운다
 * (계정은 그대로이므로 맞는 처리다). 탈퇴는 실패하면 **계정이 살아 있으므로 세션을
 * 유지한다** — 지우면 "로그아웃됐는데 계정은 남은" 상태가 되어 사용자가 탈퇴됐다고
 * 오해하고, 재시도할 방법도 잃는다.
 */
export async function POST() {
  const { backendApiUrl } = getServerEnv()
  const session = await getSession()

  if (!session) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.' },
      { status: 401 },
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(`${backendApiUrl}/api/v1/members/me/withdraw`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
  } catch {
    return NextResponse.json(
      { message: '탈퇴 요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 502 },
    )
  }

  const data = (await upstream
    .json()
    .catch(() => null)) as ApiResponse<unknown> | null

  /*
   * 상태코드와 본문을 **둘 다** 본다. 이 저장소의 백엔드는 200 에 `success: false` 를
   * 실어 보내는 경우가 있어(`isApiSuccess` 가 그것을 위해 있다) 상태코드만 믿으면
   * 실패를 성공으로 읽는다 — 탈퇴에서 그 오독은 "안 지워졌는데 지워졌다고 말하는" 것이다.
   */
  if (!upstream.ok || !isApiSuccess(data ?? undefined)) {
    return NextResponse.json(
      {
        message: getApiMessage(
          data ?? undefined,
          '탈퇴에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        ),
      },
      { status: upstream.status === 200 ? 500 : upstream.status },
    )
  }

  await clearSession()

  return NextResponse.json({ ok: true }, { status: 200 })
}
