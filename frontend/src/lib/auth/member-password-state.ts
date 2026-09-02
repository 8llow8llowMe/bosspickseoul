import type { MemberInfo } from '@/types/auth'

/**
 * 비밀번호 화면이 무엇을 보여 줄지 가르는 계정 상태.
 *
 * - `change`: 일반 계정 — 변경 폼만
 * - `change-with-unlink`: 소셜 연결 + 비밀번호 있음 — 변경 폼 + 소셜 전용 전환
 * - `setup`: 소셜 전용 — 최초 설정 폼(현재 비밀번호 입력란 없음)
 * - `unknown`: 판정할 수 없음 — 폼을 주지 않는다
 */
export type MemberPasswordMode =
  | 'change'
  | 'change-with-unlink'
  | 'setup'
  | 'unknown'

/**
 * `GET /members/me` 의 `hasPassword`·`provider` 로 화면을 가른다.
 * (OpenAPI `MemberMyInfoResponse`: "provider 와 조합해 계정 상태를 구분한다")
 *
 * | hasPassword | provider | 상태                      |
 * | ----------- | -------- | ------------------------- |
 * | true        | null     | 일반 계정                 |
 * | true        | 소셜     | 소셜 연결 + 비밀번호 있음 |
 * | false       | 소셜     | 소셜 전용                 |
 * | false       | null     | **있을 수 없다**          |
 *
 * 마지막 조합은 이론상 없다(비밀번호도 소셜도 없으면 로그인할 수단이 없다). 그래도
 * `unknown` 으로 떨어뜨려 **폼을 주지 않는다** — 어느 쪽 폼을 줘도 백엔드가 400 을
 * 돌려주므로, 사용자에게 실패할 것이 뻔한 입력을 시키지 않는 편이 낫다.
 */
export const resolveMemberPasswordMode = (
  memberInfo: Pick<MemberInfo, 'provider' | 'hasPassword'> | null | undefined,
): MemberPasswordMode => {
  if (!memberInfo) return 'unknown'

  const hasSocial = Boolean(memberInfo.provider)

  if (memberInfo.hasPassword) {
    return hasSocial ? 'change-with-unlink' : 'change'
  }

  return hasSocial ? 'setup' : 'unknown'
}

/**
 * 계정 상태가 어긋났다고 백엔드가 알려 주는 오류코드들 (BE `MemberErrorCode`).
 *
 * - `MEMBER_007` 소셜 로그인 계정은 비밀번호를 사용하지 않습니다
 * - `MEMBER_008` 이미 비밀번호가 설정된 계정입니다
 * - `MEMBER_009` 소셜 로그인이 연결된 계정만 비밀번호를 제거할 수 있습니다
 *
 * 셋 다 **화면이 이미 걸러 냈어야 하는 경우**다(§3 표로 폼을 갈랐으니까). 그런데도
 * 왔다면 들고 있는 `memberInfo` 가 낡았다는 뜻이다 — 다른 탭에서 바꿨거나, 소셜을
 * 연결/해제했거나. 그래서 일반 오류로 흘리지 않고 **다시 불러오라고** 안내한다.
 */
export const STALE_MEMBER_STATE_CODES = [
  'MEMBER_007',
  'MEMBER_008',
  'MEMBER_009',
] as const

export const isStaleMemberStateCode = (
  code: string | null | undefined,
): boolean =>
  Boolean(code) &&
  (STALE_MEMBER_STATE_CODES as readonly string[]).includes(code as string)

export const STALE_MEMBER_STATE_MESSAGE =
  '계정 정보가 바뀐 것 같아요. 최신 정보를 다시 불러온 뒤 시도해 주세요.'

/**
 * 실패를 화면 문구로 옮긴다. 상태가 어긋난 경우만 문구를 갈아 끼우고, 나머지는
 * 서버가 준 문구를 그대로 쓴다 — 서버 문구가 늘 우리 추측보다 정확하다.
 */
export const resolvePasswordErrorMessage = (
  code: string | null | undefined,
  message: string,
): string =>
  isStaleMemberStateCode(code) ? STALE_MEMBER_STATE_MESSAGE : message
