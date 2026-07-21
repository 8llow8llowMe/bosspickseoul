import { describe, it, expect, vi } from 'vitest'
import { reissueSession } from './reissue'

const current = { accessToken: 'old', refreshToken: 'r1', memberId: '1' }

describe('reissueSession', () => {
  it('returns new session on success (rotates refresh if provided)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ dataHeader: { success: true, resultCode: null, resultMessage: null }, dataBody: { accessToken: 'new' } }),
        { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': 'refreshToken=r2; Path=/; HttpOnly' } },
      ),
    )
    const next = await reissueSession(current, 'http://b', fetchImpl)
    expect(next).toEqual({ accessToken: 'new', refreshToken: 'r2', memberId: '1' })
  })
  it('returns null on reissue failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }))
    expect(await reissueSession(current, 'http://b', fetchImpl)).toBeNull()
  })
})
