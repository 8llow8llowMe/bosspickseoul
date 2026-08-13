import { describe, expect, it, vi } from 'vitest'
import { refreshSessionOnce } from '@/lib/auth/refresh-single-flight'

const session = (refreshToken: string) => ({
  accessToken: 'a',
  refreshToken,
  memberId: '1',
})
const next = { accessToken: 'new', refreshToken: 'r2', memberId: '1' }

describe('refreshSessionOnce', () => {
  it('같은 refreshToken 동시 호출은 reissue를 1회만 실행하고 결과를 공유한다', async () => {
    let calls = 0
    const reissue = vi.fn(async () => {
      calls += 1
      await new Promise(r => setTimeout(r, 10))
      return next
    })
    const s = session('r1')
    const results = await Promise.all([
      refreshSessionOnce(s, 'http://b', reissue),
      refreshSessionOnce(s, 'http://b', reissue),
      refreshSessionOnce(s, 'http://b', reissue),
    ])
    expect(calls).toBe(1)
    expect(results).toEqual([next, next, next])
  })

  it('정착 후 재호출은 새로 reissue를 실행한다(맵 정리)', async () => {
    const reissue = vi.fn(async () => next)
    await refreshSessionOnce(session('rA'), 'http://b', reissue)
    await refreshSessionOnce(session('rA'), 'http://b', reissue)
    expect(reissue).toHaveBeenCalledTimes(2)
  })

  it('reissue가 null이면 null을 전파하고 맵을 비운다', async () => {
    const reissue = vi.fn(async () => null)
    expect(
      await refreshSessionOnce(session('rB'), 'http://b', reissue),
    ).toBeNull()
    // 정리됐으므로 다음 호출도 reissue 다시 실행
    await refreshSessionOnce(session('rB'), 'http://b', reissue)
    expect(reissue).toHaveBeenCalledTimes(2)
  })

  it('reissue가 reject하면 모든 호출자가 같은 에러로 reject하고 맵을 비운다', async () => {
    const reissue = vi.fn(async () => {
      throw new Error('network down')
    })
    const s = session('rC')

    // 동시 호출이 모두 reject
    const promises = [
      refreshSessionOnce(s, 'http://b', reissue),
      refreshSessionOnce(s, 'http://b', reissue),
      refreshSessionOnce(s, 'http://b', reissue),
    ]

    // 모든 호출자가 같은 에러로 reject (coalesced)
    const results = await Promise.allSettled(promises)
    expect(results).toEqual([
      { status: 'rejected', reason: expect.any(Error) },
      { status: 'rejected', reason: expect.any(Error) },
      { status: 'rejected', reason: expect.any(Error) },
    ])
    expect((results[0] as PromiseRejectedResult).reason.message).toBe(
      'network down',
    )

    // reissue는 1회만 호출됨
    expect(reissue).toHaveBeenCalledTimes(1)

    // 맵이 정리됐으므로 다음 호출도 reissue 다시 실행
    // 두 번째 호출도 reject하지만, reissue가 다시 호출되는지 확인
    await expect(refreshSessionOnce(s, 'http://b', reissue)).rejects.toThrow(
      'network down',
    )
    expect(reissue).toHaveBeenCalledTimes(2)
  })
})
