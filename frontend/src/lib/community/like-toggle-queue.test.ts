import { describe, expect, it, vi } from 'vitest'

import {
  createCommunityLikeToggleQueue,
  createCommunityLikeToggleQueues,
  flipCommunityLike,
  getCommunityLikeIntent,
  type CommunityLikeResult,
} from '@/lib/community/like-toggle-queue'

/** 서버 토글 흉내 — 부를 때마다 뒤집는다. 응답은 손으로 풀어 준다(진행 중 연타를 재현). */
const createToggleServer = (initial: { liked: boolean; likeCount: number }) => {
  const state = { ...initial }
  const pending: Array<() => void> = []
  const send = vi.fn(
    () =>
      new Promise<CommunityLikeResult>(resolve => {
        pending.push(() => {
          state.liked = !state.liked
          state.likeCount += state.liked ? 1 : -1
          resolve({ ...state })
        })
      }),
  )
  const respond = async () => {
    const next = pending.shift()
    if (!next) throw new Error('보낸 요청이 없다')
    next()
    // 응답 처리(while 루프의 다음 바퀴)가 돌 시간을 준다.
    await Promise.resolve()
    await Promise.resolve()
  }

  return { state, send, respond, pendingCount: () => pending.length }
}

describe('flipCommunityLike — 누른 즉시 그릴 상태', () => {
  it('누르면 채우고 수를 하나 올린다', () => {
    expect(flipCommunityLike({ liked: false, likeCount: 3 }, true)).toEqual({
      liked: true,
      likeCount: 4,
    })
  })

  it('해제하면 수를 하나 내리되 0 아래로 내려가지 않는다', () => {
    expect(flipCommunityLike({ liked: true, likeCount: 0 }, false)).toEqual({
      liked: false,
      likeCount: 0,
    })
  })

  it('이미 그 상태면 그대로 둔다', () => {
    const state = { liked: true, likeCount: 2 }
    expect(flipCommunityLike(state, true)).toBe(state)
  })

  it('모르는 상태(null)는 빈 하트라 누르면 채움이 의도다', () => {
    expect(getCommunityLikeIntent(null)).toBe(true)
    expect(getCommunityLikeIntent(undefined)).toBe(true)
    expect(getCommunityLikeIntent(false)).toBe(true)
    expect(getCommunityLikeIntent(true)).toBe(false)
  })
})

describe('createCommunityLikeToggleQueue — 직렬화', () => {
  it('한 번 누르면 토글 한 번을 보내고 서버 결과로 끝난다', async () => {
    const server = createToggleServer({ liked: false, likeCount: 3 })
    const queue = createCommunityLikeToggleQueue()

    const done = queue.request(
      true,
      { liked: false, likeCount: 3 },
      server.send,
    )
    expect(queue.isRunning()).toBe(true)
    await server.respond()

    await expect(done).resolves.toEqual({ liked: true, likeCount: 4 })
    expect(server.send).toHaveBeenCalledTimes(1)
    expect(queue.isRunning()).toBe(false)
  })

  it('진행 중 연타는 요청을 겹쳐 보내지 않고 마지막 의도만 맞춘다 — 짝수 번이면 원래대로', async () => {
    const server = createToggleServer({ liked: false, likeCount: 3 })
    const queue = createCommunityLikeToggleQueue()
    const current = { liked: false, likeCount: 3 }

    const first = queue.request(true, current, server.send) // 채움
    const second = queue.request(false, current, server.send) // 해제 — 진행 중
    expect(server.pendingCount()).toBe(1)

    await server.respond() // 서버: 채움. 의도(해제)와 다르니 한 번 더
    expect(server.send).toHaveBeenCalledTimes(2)
    await server.respond() // 서버: 해제

    const expected = { liked: false, likeCount: 3 }
    await expect(first).resolves.toEqual(expected)
    await expect(second).resolves.toEqual(expected)
    expect(server.state).toEqual(expected)
  })

  it('진행 중 세 번(홀수) 누르면 서버는 한 번만 토글하고 채움으로 끝난다', async () => {
    const server = createToggleServer({ liked: false, likeCount: 3 })
    const queue = createCommunityLikeToggleQueue()
    const current = { liked: false, likeCount: 3 }

    const last = [true, false, true].map(desired =>
      queue.request(desired, current, server.send),
    )[2]
    await server.respond()

    await expect(last).resolves.toEqual({ liked: true, likeCount: 4 })
    expect(server.send).toHaveBeenCalledTimes(1)
  })

  it('첫 상태를 모르면(null) 한 번 보내 보고, 결과가 의도와 다르면 한 번 더 보낸다', async () => {
    // 사실은 이미 누른 댓글(BE #594 전이라 화면은 모른다).
    const server = createToggleServer({ liked: true, likeCount: 5 })
    const queue = createCommunityLikeToggleQueue()

    const done = queue.request(true, { liked: null, likeCount: 5 }, server.send)
    await server.respond() // 해제됨 → 의도(채움)와 다르다
    await server.respond()

    await expect(done).resolves.toEqual({ liked: true, likeCount: 5 })
    expect(server.send).toHaveBeenCalledTimes(2)
  })

  it('실패하면 묶인 요청이 모두 실패하고, 되돌릴 자리는 마지막으로 서버가 확인한 상태다', async () => {
    const queue = createCommunityLikeToggleQueue()
    let call = 0
    const send = vi.fn(async (): Promise<CommunityLikeResult> => {
      call += 1
      if (call === 1) return { liked: true, likeCount: 4 }
      throw new Error('네트워크')
    })
    const current = { liked: false, likeCount: 3 }

    const first = queue.request(true, current, send)
    const second = queue.request(false, current, send)

    await expect(first).rejects.toThrow('네트워크')
    await expect(second).rejects.toThrow('네트워크')
    expect(queue.getConfirmed()).toEqual({ liked: true, likeCount: 4 })
    expect(queue.isRunning()).toBe(false)
  })

  it('끝난 뒤 새로 누르면 그때의 캐시를 서버 상태로 보고 다시 시작한다', async () => {
    const server = createToggleServer({ liked: false, likeCount: 0 })
    const queue = createCommunityLikeToggleQueue()

    const first = queue.request(
      true,
      { liked: false, likeCount: 0 },
      server.send,
    )
    await server.respond()
    await first

    const second = queue.request(
      false,
      { liked: true, likeCount: 1 },
      server.send,
    )
    await server.respond()
    await expect(second).resolves.toEqual({ liked: false, likeCount: 0 })
    expect(server.send).toHaveBeenCalledTimes(2)
  })

  it('큐는 키마다 따로다 — 다른 댓글의 요청을 기다리지 않는다', () => {
    const queues = createCommunityLikeToggleQueues()

    expect(queues.get('101')).toBe(queues.get('101'))
    expect(queues.get('101')).not.toBe(queues.get('102'))
  })
})
