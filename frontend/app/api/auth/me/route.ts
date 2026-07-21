import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import { getSession } from '@/lib/auth/session'
import { isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ authenticated: false }, { status: 200 })
  const { backendApiUrl } = getServerEnv()
  const res = await fetch(`${backendApiUrl}/api/v1/members/me`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
  const data = (await res.json()) as ApiResponse<unknown>
  if (!res.ok || !isApiSuccess(data)) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
  return NextResponse.json({ authenticated: true, member: data.dataBody }, { status: 200 })
}
