import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import {
  getSession,
  setSession,
  clearSession,
  type SessionPayload,
} from '@/lib/auth/session'
import { reissueSession } from '@/lib/auth/reissue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const connect = (
  backendApiUrl: string,
  jobId: string,
  accessToken: string,
  signal: AbortSignal,
) =>
  fetch(`${backendApiUrl}/api/v1/ai-reports/jobs/${jobId}/stream`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'text/event-stream' },
    signal,
    redirect: 'manual',
  })

export async function GET(
  req: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { backendApiUrl } = getServerEnv()
  const { jobId } = await ctx.params

  let session: SessionPayload | null = await getSession()
  if (!session) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }

  let upstream = await connect(backendApiUrl, jobId, session.accessToken, req.signal)
  if (upstream.status === 401) {
    const next = await reissueSession(session, backendApiUrl)
    if (!next) {
      await clearSession()
      return NextResponse.json(
        { message: '세션이 만료되었습니다. 다시 로그인해 주세요.' },
        { status: 401 },
      )
    }
    await setSession(next)
    session = next
    upstream = await connect(backendApiUrl, jobId, session.accessToken, req.signal)
  }

  // 실패 응답(404 AI_005 등)만 본문을 읽어 그대로 전달한다.
  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') ?? 'application/json',
      },
    })
  }

  // 성공: 스트림을 버퍼링 없이 그대로 파이프한다.
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
