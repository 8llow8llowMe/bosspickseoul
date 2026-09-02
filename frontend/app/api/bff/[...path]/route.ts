import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import {
  getSession,
  setSession,
  clearSession,
  type SessionPayload,
} from '@/lib/auth/session'
import { isAccessTokenExpired } from '@/lib/auth/jwt'
import { refreshSessionOnce } from '@/lib/auth/refresh-single-flight'

const HOP = new Set([
  'host',
  'connection',
  'content-length',
  'set-cookie',
  'cookie',
])

/**
 * 백엔드가 **요청 쿠키의 refresh 토큰**을 읽어야 하는 경로.
 *
 * `GET /auth/sessions` 는 쿠키의 refresh jti 를 세션 목록과 대조해 어느 행이
 * 「현재 기기」인지 표시한다(BE 66a9e21d). 그런데 이 프록시는 `cookie` 를 홉바이홉으로
 * 지우고, 애초에 브라우저에는 refresh 쿠키가 없다 — 이 저장소는 refresh 를 서버 세션에
 * 보관하고 `reissue.ts` 처럼 필요할 때만 명시적으로 실어 보낸다. 그대로 두면 백엔드가
 * 받는 refresh 는 항상 null 이고 `current` 가 전부 false 로 내려온다.
 *
 * **백엔드가 실제로 읽는 곳에만 넣는다.** `DELETE /auth/sessions/{id}` 는 세션 id 만
 * 쓰므로 제외한다 — 자격증명은 필요한 경로에만 흘린다.
 */
const REFRESH_COOKIE_GETS = new Set(['auth/sessions'])

const buildHeaders = (
  req: Request,
  accessToken: string | null,
  refreshCookie: string | null,
) => {
  const h = new Headers()
  req.headers.forEach((v, k) => {
    if (!HOP.has(k.toLowerCase())) h.set(k, v)
  })
  h.delete('authorization') // BFF is the sole injector; drop any client-supplied Authorization
  if (accessToken) h.set('Authorization', `Bearer ${accessToken}`)
  if (refreshCookie) h.set('Cookie', `refreshToken=${refreshCookie}`)
  return h
}

const forward = async (
  req: Request,
  backendApiUrl: string,
  path: string,
  search: string,
  session: SessionPayload | null,
  body: ArrayBuffer | undefined,
) => {
  const needsRefreshCookie =
    req.method === 'GET' && REFRESH_COOKIE_GETS.has(path)
  return fetch(`${backendApiUrl}/api/v1/${path}${search}`, {
    method: req.method,
    headers: buildHeaders(
      req,
      session?.accessToken ?? null,
      needsRefreshCookie ? (session?.refreshToken ?? null) : null,
    ),
    body: body && body.byteLength > 0 ? body : undefined,
    redirect: 'manual',
  })
}

async function handle(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { backendApiUrl } = getServerEnv()
  const { path } = await ctx.params
  const joined = path.join('/')
  const search = new URL(req.url).search
  const body =
    req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : await req.arrayBuffer()

  let session = await getSession()

  // 선재발급: accessToken이 만료(임박)면 forward 전에 갱신을 시도한다.
  // 백엔드가 만료 토큰에 401이 아닌 500을 주는 문제를 우회 — 만료 토큰을 애초에 보내지 않는다.
  if (session && isAccessTokenExpired(session.accessToken, Date.now())) {
    const next = await refreshSessionOnce(session, backendApiUrl)
    if (next) {
      await setSession(next)
      session = next
    } else {
      // 재발급도 실패 → 세션 제거 후 토큰 없이(익명) 전달. 공개 API는 200, 보호 API는 백엔드 401.
      await clearSession()
      session = null
    }
  }

  let upstream = await forward(
    req,
    backendApiUrl,
    joined,
    search,
    session,
    body,
  )

  if (upstream.status === 401 && session) {
    const next = await refreshSessionOnce(session, backendApiUrl)
    if (!next) {
      await clearSession()
      return NextResponse.json(
        { message: '세션이 만료되었습니다. 다시 로그인해 주세요.' },
        { status: 401 },
      )
    }
    await setSession(next)
    session = next
    upstream = await forward(req, backendApiUrl, joined, search, session, body)
  }

  const resBody = await upstream.arrayBuffer()
  const headers = new Headers()
  const STRIP_RES = new Set([
    'set-cookie',
    'content-encoding',
    'content-length',
    'transfer-encoding',
  ])
  upstream.headers.forEach((v, k) => {
    // 백엔드 Set-Cookie 브라우저로 전파 금지 + 이미 압축 해제된 본문에 대한 content-encoding/length 헤더 스킵
    if (!STRIP_RES.has(k.toLowerCase())) headers.set(k, v)
  })
  return new NextResponse(resBody, { status: upstream.status, headers })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
