import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { getSession, clearSession } from '@/lib/auth/session'

export async function POST() {
  const { backendApiUrl } = getServerEnv()
  const session = await getSession()
  if (session) {
    try {
      await fetch(`${backendApiUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
    } catch {
      // 백엔드 실패해도 로컬 세션은 반드시 제거 (session-bff D6)
    }
  }
  await clearSession()
  return NextResponse.json({ ok: true }, { status: 200 })
}
