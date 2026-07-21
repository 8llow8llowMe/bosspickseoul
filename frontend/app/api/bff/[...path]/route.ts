import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { getSession, setSession, clearSession, type SessionPayload } from '@/lib/auth/session'
import { reissueSession } from '@/lib/auth/reissue'

const HOP = new Set(['host', 'connection', 'content-length', 'set-cookie', 'cookie'])

const buildHeaders = (req: Request, accessToken: string | null) => {
  const h = new Headers()
  req.headers.forEach((v, k) => {
    if (!HOP.has(k.toLowerCase())) h.set(k, v)
  })
  if (accessToken) h.set('Authorization', `Bearer ${accessToken}`)
  return h
}

const forward = async (
  req: Request,
  backendApiUrl: string,
  path: string,
  search: string,
  session: SessionPayload | null,
  body: ArrayBuffer | undefined,
) =>
  fetch(`${backendApiUrl}/${path}${search}`, {
    method: req.method,
    headers: buildHeaders(req, session?.accessToken ?? null),
    body: body && body.byteLength > 0 ? body : undefined,
    redirect: 'manual',
  })

async function handle(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { backendApiUrl } = getServerEnv()
  const { path } = await ctx.params
  const joined = path.join('/')
  const search = new URL(req.url).search
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer()

  let session = await getSession()
  let upstream = await forward(req, backendApiUrl, joined, search, session, body)

  if (upstream.status === 401 && session) {
    const next = await reissueSession(session, backendApiUrl)
    if (!next) {
      await clearSession()
      return NextResponse.json({ message: '세션이 만료되었습니다. 다시 로그인해 주세요.' }, { status: 401 })
    }
    await setSession(next)
    session = next
    upstream = await forward(req, backendApiUrl, joined, search, session, body)
  }

  const resBody = await upstream.arrayBuffer()
  const headers = new Headers()
  upstream.headers.forEach((v, k) => {
    if (k.toLowerCase() !== 'set-cookie') headers.set(k, v) // 백엔드 Set-Cookie 브라우저로 전파 금지
  })
  return new NextResponse(resBody, { status: upstream.status, headers })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
