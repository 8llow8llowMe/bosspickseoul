import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sessionBox = vi.hoisted(() => ({
  current: null as { accessToken: string } | null,
  cleared: 0,
}))

vi.mock('@/lib/env.server', () => ({
  getServerEnv: () => ({ backendApiUrl: 'https://be.test' }),
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: () => Promise.resolve(sessionBox.current),
  clearSession: () => {
    sessionBox.cleared += 1
    return Promise.resolve()
  },
}))

const { POST } = await import('./route')

const ok = {
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: null,
}

const fetchMock = vi.fn()

beforeEach(() => {
  sessionBox.current = { accessToken: 'token-1' }
  sessionBox.cleared = 0
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const upstream = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
})

describe('POST /api/auth/withdraw', () => {
  it('세션의 토큰으로 탈퇴를 요청하고 세션을 파괴한다', async () => {
    fetchMock.mockResolvedValue(upstream(ok))

    const response = await POST()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://be.test/api/v1/members/me/withdraw',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer token-1' },
      }),
    )
    expect(response.status).toBe(200)
    expect(sessionBox.cleared).toBe(1)
  })

  it('로그인 상태가 아니면 백엔드를 부르지 않는다', async () => {
    sessionBox.current = null

    const response = await POST()

    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sessionBox.cleared).toBe(0)
  })

  /*
   * **로그아웃과 다른 지점이다.** 로그아웃은 백엔드가 실패해도 로컬 세션을 지운다
   * (계정은 그대로이므로 맞는 처리다). 탈퇴는 실패하면 **계정이 살아 있으므로**
   * 세션을 지우면 "로그아웃됐는데 계정은 남은" 상태가 되어 사용자가 탈퇴됐다고 오해한다.
   */
  it('백엔드가 실패하면 세션을 지우지 않는다', async () => {
    fetchMock.mockResolvedValue(
      upstream(
        {
          dataHeader: {
            success: false,
            resultCode: 'MEMBER_009',
            resultMessage: '이미 탈퇴한 회원입니다.',
          },
          dataBody: null,
        },
        409,
      ),
    )

    const response = await POST()

    expect(response.status).toBe(409)
    expect(sessionBox.cleared).toBe(0)
    await expect(response.json()).resolves.toEqual({
      message: '이미 탈퇴한 회원입니다.',
    })
  })

  /* 이 저장소의 백엔드는 200 에 success:false 를 실어 보내기도 한다. */
  it('200 이면서 success 가 false 여도 실패로 다룬다', async () => {
    fetchMock.mockResolvedValue(
      upstream({
        dataHeader: {
          success: false,
          resultCode: 'MEMBER_001',
          resultMessage: '회원을 찾을 수 없습니다.',
        },
        dataBody: null,
      }),
    )

    const response = await POST()

    expect(response.status).toBe(500)
    expect(sessionBox.cleared).toBe(0)
  })

  it('네트워크가 끊겨도 세션을 지우지 않는다', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    const response = await POST()

    expect(response.status).toBe(502)
    expect(sessionBox.cleared).toBe(0)
  })
})
