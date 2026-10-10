import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_HYDRATE_TIMEOUT_MS, useAuthStore } from './auth-store'

/*
  세션 확인이 끝나지 않으면 헤더가 회색 자리에 영원히 머문다(#579 후속).
  상한(5초)을 넘기면 요청을 끊고 비로그인으로 확정한다.
*/

const reset = () =>
  useAuthStore.setState({
    hasHydrated: false,
    isLoggedIn: false,
    memberInfo: null,
  })

beforeEach(() => {
  reset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  reset()
})

/** 신호가 끊길 때까지 답하지 않는 fetch. */
const hangingFetch = vi.fn(
  (_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('aborted', 'AbortError')),
      )
    }),
)

describe('useAuthStore.hydrate', () => {
  it('응답이 상한 안에 오지 않으면 요청을 끊고 비로그인으로 확정한다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', hangingFetch)

    const pending = useAuthStore.getState().hydrate()
    await vi.advanceTimersByTimeAsync(AUTH_HYDRATE_TIMEOUT_MS - 1)
    expect(useAuthStore.getState().hasHydrated).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await pending

    expect(AUTH_HYDRATE_TIMEOUT_MS).toBe(5000)
    expect(useAuthStore.getState()).toMatchObject({
      hasHydrated: true,
      isLoggedIn: false,
      memberInfo: null,
    })
    const init = hangingFetch.mock.calls[0][1]
    expect(init?.signal?.aborted).toBe(true)
  })

  it('상한 안에 오면 응답대로 확정한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              authenticated: true,
              member: { memberId: '7', nickname: '사장님' },
            }),
          ),
      ),
    )

    await useAuthStore.getState().hydrate()

    expect(useAuthStore.getState()).toMatchObject({
      hasHydrated: true,
      isLoggedIn: true,
    })
  })

  it('네트워크가 실패해도 비로그인으로 확정한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network')
      }),
    )

    await useAuthStore.getState().hydrate()

    expect(useAuthStore.getState()).toMatchObject({
      hasHydrated: true,
      isLoggedIn: false,
    })
  })
})
