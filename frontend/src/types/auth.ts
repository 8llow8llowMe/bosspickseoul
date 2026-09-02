export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  name: string
  nickname: string
  email: string
  password: string
  profileImage: string | null
}

export type MemberInfo = {
  memberId: string
  email: string
  name: string
  nickname: string
  profileImageUrl: string
  role: {
    code: string
    name: string
    description: string
  }
  /**
   * 소셜 로그인 제공자(`KAKAO` 등). **일반 계정이면 `null`.**
   *
   * `hasPassword` 와 조합해 계정 상태를 가른다 —
   * `true+null`=일반, `false+소셜`=소셜 전용, `true+소셜`=연결됨.
   * (`src/lib/auth/member-password-state.ts` 가 그 판정을 한다.)
   *
   * ⚠️ 두 필드는 예전부터 서버 응답에 있었고 `app/api/auth/me/route.ts` 가
   * `dataBody` 를 통째로 넘겨 이미 클라이언트에 도착해 있었다. **이 타입에만
   * 빠져 있었다** — 같은 종류의 누락이 `policyRecommendations`(#192),
   * `commercialComparisonReport`(#188)에 이어 세 번째다.
   */
  provider: string | null
  /** 비밀번호가 설정돼 있는가. 소셜로만 가입했으면 `false`. */
  hasPassword: boolean
}

export type LoginResponseBody = {
  memberInfo: MemberInfo
}

/**
 * `GET /api/v1/auth/sessions` 의 항목 하나 — 로그인 중인 기기 하나.
 *
 * `deviceInfo` 는 로그인 시점 User-Agent 를 백엔드가 정제(제어문자 제거·150자 절단)한
 * **표시용** 값이다. 신뢰가 필요한 판단에 쓰지 않는다.
 *
 * `createdAt`·`lastUsedAt` 은 백엔드 `LocalDateTime` 이라 **타임존이 없는 문자열**이다
 * (`2026-09-02T10:04:23`). `new Date(...)` 에 그대로 넣으면 브라우저가 로컬 시각으로
 * 읽는다 — 서버가 KST 로 쓰고 사용자도 KST 면 맞지만, 그 가정에 기대고 있음을 알아 둔다.
 * 백엔드가 값을 못 채우면 null 로 온다.
 */
export type AuthSessionItem = {
  sessionId: string
  deviceInfo: string | null
  createdAt: string | null
  lastUsedAt: string | null
  /**
   * 이 목록을 요청한 기기의 세션인가.
   *
   * ⚠️ BFF 가 refresh 토큰을 쿠키로 실어 보낼 때만 참이 될 수 있다
   * (`app/api/bff/[...path]/route.ts` 의 `REFRESH_COOKIE_GETS`).
   */
  current: boolean
}

export type AuthSessionsBody = {
  sessions: AuthSessionItem[]
}
