import type { SessionPayload } from '@/lib/auth/session'
import { extractCookieValue } from '@/lib/auth/set-cookie'
import { isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

type ReissueBody = { accessToken: string }

export const reissueSession = async (
  current: SessionPayload,
  backendApiUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SessionPayload | null> => {
  const res = await fetchImpl(`${backendApiUrl}/api/v1/auth/token/reissue`, {
    method: 'POST',
    headers: { Cookie: `refreshToken=${current.refreshToken}` },
  })
  if (!res.ok) return null
  const data = (await res.json()) as ApiResponse<ReissueBody>
  if (!isApiSuccess(data) || !data.dataBody?.accessToken) return null
  const setCookie = res.headers.getSetCookie?.() ?? res.headers.get('set-cookie')
  const rotated = extractCookieValue(setCookie, 'refreshToken')
  return {
    accessToken: data.dataBody.accessToken,
    refreshToken: rotated ?? current.refreshToken,
    memberId: current.memberId,
  }
}
