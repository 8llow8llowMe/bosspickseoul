import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sessionBox = vi.hoisted(() => ({
  current: null as { accessToken: string } | null,
  cleared: 0,
}))

vi.mock('@/lib/env.server', () => ({
  getServerEnv: () => ({ backendApiUrl: 'https://be.test' }),
}))

/*
 * `clearSession` 도 함께 mock 해 둔다. 라우트가 그것을 import 하지 않는 것이 정상이라
 * 이 카운터는 **끝까지 0 이어야 한다** — 0 이 아니면 세션 유지 규칙이 깨진 것이다.
 */
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

const setupRequest = (body: unknown = { newPassword: 'newPassword1!' }) =>
  new Request('http://localhost/api/auth/password/setup', {
    method: 'POST',
    body: JSON.stringify(body),
  })

describe('POST /api/auth/password/setup (비밀번호 최초 설정)', () => {
  /**
   * **이 파일의 핵심 단언이다.** 세 동작 중 설정만 세션을 유지한다 — BE
   * `setupPassword(memberId, newPassword)` 는 형제들과 달리 `tokenId` 를 받지 않아
   * 토큰을 건드리지 않는다. 여기서 세션을 지우면 아무 이유 없이 로그아웃시키는 것이다.
   */
  it('성공해도 세션을 유지한다', async () => {
    fetchMock.mockResolvedValue(upstream(ok))

    const response = await POST(setupRequest())

    expect(fetchMock).toHaveBeenCalledWith(
      'https://be.test/api/v1/members/me/password/setup',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ newPassword: 'newPassword1!' }),
      }),
    )
    expect(response.status).toBe(200)
    expect(sessionBox.cleared).toBe(0)
  })

  it('로그인 상태가 아니면 백엔드를 부르지 않는다', async () => {
    sessionBox.current = null

    const response = await POST(setupRequest())

    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('이미 비밀번호가 있으면(MEMBER_008) 코드를 전달한다', async () => {
    fetchMock.mockResolvedValue(
      upstream(
        {
          dataHeader: {
            success: false,
            resultCode: 'MEMBER_008',
            resultMessage:
              '이미 비밀번호가 설정된 계정입니다. 비밀번호 변경을 이용해주세요.',
          },
          dataBody: null,
        },
        400,
      ),
    )

    const response = await POST(setupRequest())

    expect(response.status).toBe(400)
    expect(sessionBox.cleared).toBe(0)
    await expect(response.json()).resolves.toMatchObject({
      code: 'MEMBER_008',
    })
  })

  it('200 이면서 success 가 false 여도 실패로 다룬다', async () => {
    fetchMock.mockResolvedValue(
      upstream({
        dataHeader: {
          success: false,
          resultCode: 'MEMBER_008',
          resultMessage: '이미 비밀번호가 설정된 계정입니다.',
        },
        dataBody: null,
      }),
    )

    const response = await POST(setupRequest())

    expect(response.status).toBe(500)
    expect(sessionBox.cleared).toBe(0)
  })

  it('네트워크가 끊겨도 세션을 유지한다', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    const response = await POST(setupRequest())

    expect(response.status).toBe(502)
    expect(sessionBox.cleared).toBe(0)
  })

  it('규칙을 어긴 비밀번호는 백엔드까지 가지 않는다', async () => {
    const response = await POST(setupRequest({ newPassword: 'nodigits!!' }))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
