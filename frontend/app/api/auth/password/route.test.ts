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

const { POST, DELETE } = await import('./route')

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

const changeRequest = (
  body: unknown = {
    currentPassword: 'oldPassword1!',
    newPassword: 'newPassword1!',
  },
) =>
  new Request('http://localhost/api/auth/password', {
    method: 'POST',
    body: JSON.stringify(body),
  })

describe('POST /api/auth/password (비밀번호 변경)', () => {
  it('세션의 토큰으로 변경을 요청하고 세션을 파괴한다', async () => {
    fetchMock.mockResolvedValue(upstream(ok))

    const response = await POST(changeRequest())

    expect(fetchMock).toHaveBeenCalledWith(
      'https://be.test/api/v1/members/me/password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'oldPassword1!',
          newPassword: 'newPassword1!',
        }),
      }),
    )
    expect(response.status).toBe(200)
    // 변경은 재로그인을 강제한다 — 세션이 남으면 죽은 토큰으로 로그인한 것처럼 보인다.
    expect(sessionBox.cleared).toBe(1)
  })

  it('로그인 상태가 아니면 백엔드를 부르지 않는다', async () => {
    sessionBox.current = null

    const response = await POST(changeRequest())

    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sessionBox.cleared).toBe(0)
  })

  /*
   * 실패하면 비밀번호는 **그대로**다. 세션을 지우면 "로그아웃됐는데 안 바뀐" 상태가
   * 되어 사용자가 성공했다고 오해하고 새 비밀번호로 로그인을 시도한다.
   */
  it('백엔드가 실패하면 세션을 지우지 않는다', async () => {
    fetchMock.mockResolvedValue(
      upstream(
        {
          dataHeader: {
            success: false,
            resultCode: 'MEMBER_004',
            resultMessage: '현재 비밀번호가 일치하지 않습니다.',
          },
          dataBody: null,
        },
        400,
      ),
    )

    const response = await POST(changeRequest())

    expect(response.status).toBe(400)
    expect(sessionBox.cleared).toBe(0)
    await expect(response.json()).resolves.toEqual({
      message: '현재 비밀번호가 일치하지 않습니다.',
      code: 'MEMBER_004',
    })
  })

  /* 이 저장소의 백엔드는 200 에 success:false 를 실어 보내기도 한다. */
  it('200 이면서 success 가 false 여도 실패로 다룬다', async () => {
    fetchMock.mockResolvedValue(
      upstream({
        dataHeader: {
          success: false,
          resultCode: 'MEMBER_007',
          resultMessage: '소셜 로그인 계정은 비밀번호를 사용하지 않습니다.',
        },
        dataBody: null,
      }),
    )

    const response = await POST(changeRequest())

    expect(response.status).toBe(500)
    expect(sessionBox.cleared).toBe(0)
  })

  /* 화면이 상태 어긋남(MEMBER_007/008/009)을 알아보려면 코드가 살아 와야 한다. */
  it('resultCode 를 그대로 전달한다', async () => {
    fetchMock.mockResolvedValue(
      upstream(
        {
          dataHeader: {
            success: false,
            resultCode: 'MEMBER_007',
            resultMessage: '소셜 로그인 계정은 비밀번호를 사용하지 않습니다.',
          },
          dataBody: null,
        },
        400,
      ),
    )

    const response = await POST(changeRequest())

    await expect(response.json()).resolves.toMatchObject({
      code: 'MEMBER_007',
    })
  })

  it('네트워크가 끊겨도 세션을 지우지 않는다', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    const response = await POST(changeRequest())

    expect(response.status).toBe(502)
    expect(sessionBox.cleared).toBe(0)
  })

  it('규칙을 어긴 새 비밀번호는 백엔드까지 가지 않는다', async () => {
    const response = await POST(
      changeRequest({ currentPassword: 'oldPassword1!', newPassword: 'short' }),
    )

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sessionBox.cleared).toBe(0)
  })

  it('현재 비밀번호가 비면 백엔드까지 가지 않는다', async () => {
    const response = await POST(
      changeRequest({ currentPassword: '', newPassword: 'newPassword1!' }),
    )

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/auth/password (소셜 전용 전환)', () => {
  it('본문 없이 DELETE 를 보내고 세션을 파괴한다', async () => {
    fetchMock.mockResolvedValue(upstream(ok))

    const response = await DELETE()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://be.test/api/v1/members/me/password',
      expect.objectContaining({
        method: 'DELETE',
        headers: { Authorization: 'Bearer token-1' },
      }),
    )
    expect(response.status).toBe(200)
    // 백엔드가 전 기기를 로그아웃시킨다 — 이 기기 세션만 남겨 둘 이유가 없다.
    expect(sessionBox.cleared).toBe(1)
  })

  it('로그인 상태가 아니면 백엔드를 부르지 않는다', async () => {
    sessionBox.current = null

    const response = await DELETE()

    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('실패하면 세션을 지우지 않고 코드를 전달한다', async () => {
    fetchMock.mockResolvedValue(
      upstream(
        {
          dataHeader: {
            success: false,
            resultCode: 'MEMBER_009',
            resultMessage:
              '소셜 로그인이 연결된 계정만 비밀번호를 제거할 수 있습니다.',
          },
          dataBody: null,
        },
        400,
      ),
    )

    const response = await DELETE()

    expect(response.status).toBe(400)
    expect(sessionBox.cleared).toBe(0)
    await expect(response.json()).resolves.toMatchObject({
      code: 'MEMBER_009',
    })
  })
})
