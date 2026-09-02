import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { clearSession, getSession } from '@/lib/auth/session'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { PASSWORD_PATTERN, PASSWORD_RULE_TEXT } from '@/lib/auth/password-rules'
import type { ApiResponse } from '@/types/api'

/**
 * 비밀번호 **변경**(`POST /api/v1/members/me/password`)과
 * **소셜 전용 전환**(`DELETE /api/v1/members/me/password`). 둘 다 `bearerAuth`.
 *
 * BFF 범용 프록시(`app/api/bff/[...path]`)로 보내지 않는 이유는 탈퇴·로그아웃과 같다:
 * 그쪽은 토큰만 주입하고 **서버 세션을 그대로 남긴다.** 이 두 동작은 백엔드가 토큰을
 * 무효화하므로(BE `MemberWebUseCase` 가 `tokenId` 를 받는다) 세션이 남으면 죽은 토큰을
 * 들고 로그인한 것처럼 보이다가 모든 호출이 실패한다.
 *
 * ⚠️ **최초 설정은 여기가 아니다.** `password/setup` 은 `tokenId` 를 받지 않아 세션을
 * 건드리지 않는다 — 한 핸들러에 몰면 그 차이를 실수한다. 라우트를 BE 모양대로 나눴다.
 */

const UPSTREAM_PATH = '/api/v1/members/me/password'

type Outcome =
  | { ok: true }
  | { ok: false; status: number; message: string; code: string | null }

const unauthorized = () =>
  NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })

/**
 * 백엔드를 부르고 성공/실패만 판정한다. **세션은 건드리지 않는다** — 호출부가
 * 성공했을 때만 지우도록 남겨 둔다.
 */
const callUpstream = async (
  accessToken: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<Outcome> => {
  const { backendApiUrl } = getServerEnv()

  let upstream: Response
  try {
    upstream = await fetch(`${backendApiUrl}${UPSTREAM_PATH}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
      },
    })
  } catch {
    return {
      ok: false,
      status: 502,
      message: '요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
      code: null,
    }
  }

  const data = (await upstream
    .json()
    .catch(() => null)) as ApiResponse<unknown> | null

  /*
   * 상태코드와 본문을 **둘 다** 본다. 이 백엔드는 200 에 `success: false` 를 싣는
   * 경우가 있다(`isApiSuccess` 가 그래서 있다). 상태코드만 믿으면 "안 바뀌었는데
   * 바뀌었다"고 말하면서 세션까지 지운다 — 사용자는 새 비밀번호로 로그인을 시도한다.
   */
  if (!upstream.ok || !isApiSuccess(data ?? undefined)) {
    return {
      ok: false,
      status: upstream.status === 200 ? 500 : upstream.status,
      message: getApiMessage(data ?? undefined, fallbackMessage),
      /*
       * `resultCode` 를 그대로 흘려보낸다. `MEMBER_007/008/009` 는 "화면이 들고 있는
       * 계정 상태가 낡았다"는 신호라 화면이 다른 처리(정보 재조회)를 해야 한다.
       */
      code: data?.dataHeader.resultCode ?? null,
    }
  }

  return { ok: true }
}

const failure = (outcome: Extract<Outcome, { ok: false }>) =>
  NextResponse.json(
    { message: outcome.message, code: outcome.code },
    { status: outcome.status },
  )

/** 비밀번호 변경. 성공하면 **재로그인이 필요하다** → 세션을 파괴한다. */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return unauthorized()

  const body = (await request.json().catch(() => null)) as {
    currentPassword?: unknown
    newPassword?: unknown
  } | null

  const currentPassword =
    typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword =
    typeof body?.newPassword === 'string' ? body.newPassword : ''

  /*
   * 규칙 검사는 화면이 이미 했다. 여기서 한 번 더 보는 것은 같은 정본 상수를 쓰는
   * 값싼 방어라서다 — 규칙을 새로 적는 것이 아니므로 두 벌이 어긋날 일이 없다.
   */
  if (!currentPassword || !PASSWORD_PATTERN.test(newPassword)) {
    return NextResponse.json(
      { message: PASSWORD_RULE_TEXT, code: null },
      { status: 400 },
    )
  }

  const outcome = await callUpstream(
    session.accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    },
    '비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  )

  // 실패했으면 비밀번호는 그대로다. 세션을 지우면 "로그아웃됐는데 안 바뀐" 상태가 된다.
  if (!outcome.ok) return failure(outcome)

  await clearSession()

  return NextResponse.json({ ok: true }, { status: 200 })
}

/** 소셜 전용 전환(비밀번호 제거). 성공하면 **전 기기 로그아웃**이다 → 세션을 파괴한다. */
export async function DELETE() {
  const session = await getSession()
  if (!session) return unauthorized()

  const outcome = await callUpstream(
    session.accessToken,
    { method: 'DELETE' },
    '소셜 전용 계정으로 전환하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  )

  if (!outcome.ok) return failure(outcome)

  await clearSession()

  return NextResponse.json({ ok: true }, { status: 200 })
}
