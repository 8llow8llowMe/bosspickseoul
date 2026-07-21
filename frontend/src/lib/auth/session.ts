import 'server-only'
import { EncryptJWT, jwtDecrypt } from 'jose'
import { createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import { getServerEnv } from '@/lib/env.server'

export type SessionPayload = {
  accessToken: string
  refreshToken: string
  memberId: string
}

export const SESSION_COOKIE = 'bps_session'

const secretKey = () =>
  createHash('sha256').update(getServerEnv().authSessionSecret).digest() // 32 bytes for A256GCM

export const encryptSession = async (payload: SessionPayload): Promise<string> =>
  new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .encrypt(secretKey())

export const decryptSession = async (
  token: string,
): Promise<SessionPayload | null> => {
  try {
    const { payload } = await jwtDecrypt(token, secretKey())
    const { accessToken, refreshToken, memberId } = payload as Record<string, unknown>
    if (
      typeof accessToken === 'string' &&
      typeof refreshToken === 'string' &&
      typeof memberId === 'string'
    ) {
      return { accessToken, refreshToken, memberId }
    }
    return null
  } catch {
    return null
  }
}

export const getSession = async (): Promise<SessionPayload | null> => {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value
  return raw ? decryptSession(raw) : null
}

export const setSession = async (payload: SessionPayload): Promise<void> => {
  const token = await encryptSession(payload)
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export const clearSession = async (): Promise<void> => {
  ;(await cookies()).delete(SESSION_COOKIE)
}
