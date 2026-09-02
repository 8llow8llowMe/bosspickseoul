/**
 * 비밀번호 변경 · 최초 설정 · 소셜 전용 전환. 셋 다 **전용 라우트를 거친다**
 * (`app/api/auth/password`, `app/api/auth/password/setup`).
 *
 * `apiClient` 로 백엔드를 직접 부르지 않는 이유: 변경과 전환은 백엔드가 토큰을
 * 무효화하는데 그 세션은 Next 서버가 들고 있다. 클라이언트에서 백엔드만 때리면
 * 죽은 토큰이 담긴 세션이 남아 로그인한 것처럼 보이다가 모든 호출이 실패한다.
 * (최초 설정은 세션을 유지하지만, 형제 동작과 같은 자리에 두는 편이 읽기 쉽다.)
 */

/**
 * 라우트가 돌려준 실패. **`code` 를 잃지 않는 것이 요점**이다 —
 * `MEMBER_007/008/009` 는 "화면이 들고 있는 계정 상태가 낡았다"는 신호라서
 * 다른 처리(정보 재조회)를 해야 하고, 평범한 `Error` 로 바꾸면 그 신호가 사라진다.
 */
export class MemberPasswordError extends Error {
  readonly code: string | null

  constructor(message: string, code: string | null) {
    super(message)
    this.name = 'MemberPasswordError'
    this.code = code
  }
}

const request = async (
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<void> => {
  const response = await fetch(path, init)

  if (response.ok) return

  const body = (await response.json().catch(() => null)) as {
    message?: string
    code?: string | null
  } | null

  throw new MemberPasswordError(
    body?.message ?? fallbackMessage,
    body?.code ?? null,
  )
}

/** 비밀번호 변경. 성공하면 **세션이 파괴돼 있다** — 호출부가 로그인 화면으로 보낸다. */
export const requestPasswordChange = (input: {
  currentPassword: string
  newPassword: string
}): Promise<void> =>
  request(
    '/api/auth/password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    '비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.',
  )

/** 비밀번호 최초 설정. **세션은 그대로 살아 있다** — 로그아웃시키지 않는다. */
export const requestPasswordSetup = (input: {
  newPassword: string
}): Promise<void> =>
  request(
    '/api/auth/password/setup',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    '비밀번호를 설정하지 못했어요. 잠시 후 다시 시도해 주세요.',
  )

/** 소셜 전용 전환(비밀번호 제거). 성공하면 **세션이 파괴돼 있다.** */
export const requestPasswordRemoval = (): Promise<void> =>
  request(
    '/api/auth/password',
    { method: 'DELETE' },
    '소셜 전용 계정으로 전환하지 못했어요. 잠시 후 다시 시도해 주세요.',
  )
