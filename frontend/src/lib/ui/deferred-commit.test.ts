import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDeferredCommit } from '@/lib/ui/deferred-commit'

describe('createDeferredCommit — 되돌리기 기간이 끝나야 삭제한다', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('예약한 뒤 시간이 지나면 한 번 실행한다', () => {
    vi.useFakeTimers()
    const commit = vi.fn()
    const queue = createDeferredCommit<string>({ delayMs: 10000, commit })

    queue.schedule('101')
    vi.advanceTimersByTime(9999)
    expect(commit).not.toHaveBeenCalled()
    expect(queue.has('101')).toBe(true)

    vi.advanceTimersByTime(1)
    expect(commit).toHaveBeenCalledExactlyOnceWith('101')
    expect(queue.has('101')).toBe(false)
  })

  it('기간 안에 되돌리면 실행하지 않는다 — 서버에는 아무것도 가지 않는다', () => {
    vi.useFakeTimers()
    const commit = vi.fn()
    const queue = createDeferredCommit<string>({ delayMs: 10000, commit })

    queue.schedule('101')
    expect(queue.undo('101')).toBe(true)
    vi.advanceTimersByTime(20000)

    expect(commit).not.toHaveBeenCalled()
    expect(queue.undo('101')).toBe(false)
  })

  it('페이지를 떠나면(flush) 기다리던 삭제를 바로 모두 보낸다', () => {
    vi.useFakeTimers()
    const commit = vi.fn()
    const queue = createDeferredCommit<string>({ delayMs: 10000, commit })

    queue.schedule('101')
    queue.schedule('102')
    expect(queue.flush()).toEqual(['101', '102'])
    expect(commit.mock.calls).toEqual([['101'], ['102']])

    vi.advanceTimersByTime(20000)
    expect(commit).toHaveBeenCalledTimes(2)
  })
})
