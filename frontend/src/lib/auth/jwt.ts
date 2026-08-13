import 'server-only'

/** JWT payload의 exp(초)를 읽는다. 서명 검증 안 함(만료 판단 전용). 실패 시 null(throw 없음). */
export const decodeJwtExp = (token: string): number | null => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const json = Buffer.from(parts[1], 'base64url').toString('utf8')
    const payload = JSON.parse(json) as Record<string, unknown>
    const exp = payload.exp
    return typeof exp === 'number' && Number.isFinite(exp) ? exp : null
  } catch {
    return null
  }
}

/**
 * accessToken이 만료(또는 skewSec 이내 임박)인지.
 * exp를 못 읽으면 false(판단 불가 → 선재발급 스킵, 반응형 401 경로에 위임).
 */
export const isAccessTokenExpired = (
  token: string,
  nowMs: number,
  skewSec = 30,
): boolean => {
  const exp = decodeJwtExp(token)
  if (exp === null) return false
  return exp * 1000 <= nowMs + skewSec * 1000
}
