import 'server-only'
import { reissueSession } from '@/lib/auth/reissue'
import type { SessionPayload } from '@/lib/auth/session'

type Reissue = (
  session: SessionPayload,
  backendApiUrl: string,
) => Promise<SessionPayload | null>

// 모듈 레벨 in-memory 합류 맵. 단일 Node 프로세스 기준(제약: 명세 참고).
const inflight = new Map<string, Promise<SessionPayload | null>>()

export const refreshSessionOnce = (
  session: SessionPayload,
  backendApiUrl: string,
  reissue: Reissue = reissueSession,
): Promise<SessionPayload | null> => {
  const key = session.refreshToken
  const existing = inflight.get(key)
  if (existing) return existing

  const p = reissue(session, backendApiUrl).finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, p)
  return p
}
