/**
 * 기기 세션 목록(`GET /auth/sessions`)을 화면 문구로 바꾸는 순수 함수들.
 *
 * `deviceInfo` 는 로그인 시점 User-Agent 를 백엔드가 정제한 **표시용** 문자열이다
 * (`src/lib/auth/device-headers.ts`). 여기서 하는 해석도 표시용이며, 신뢰가 필요한
 * 판단(권한·보안)에 쓰지 않는다.
 */

import { formatDateTime } from '@/lib/format'
import type { AuthSessionItem } from '@/types/auth'

/**
 * 해제가 **무엇을 하는지**. 백엔드는 refresh 세션만 지우므로 그 기기의 access 토큰은
 * 만료까지 살아 있다. "지금 끊긴다"고 적으면 사용자는 해제 직후 그 기기가 여전히
 * 동작하는 것을 배신으로 읽는다 — 그래서 즉시성을 약속하지 않는다.
 */
export const SESSION_REVOKE_NOTICE =
  '해제한 기기는 다음 로그인 갱신 때 로그아웃돼요. 즉시 끊기지는 않아요.'

/** 현재 기기 행에 붙는 설명. 자기 자신을 해제하는 대신 로그아웃으로 보낸다. */
export const CURRENT_SESSION_NOTICE =
  '지금 보고 있는 기기예요. 이 기기를 끝내려면 로그아웃을 쓰세요.'

/**
 * 브라우저 판정. **순서가 규칙이다** — Edge·삼성인터넷·웨일 UA 는 `Chrome` 을 품고,
 * Chrome UA 는 `Safari` 를 품는다. 넓은 쪽을 먼저 검사하면 전부 Safari 가 된다.
 */
const BROWSER_RULES: readonly [RegExp, string][] = [
  [/Edg[A-Za-z]*\//, 'Edge'],
  [/SamsungBrowser\//, '삼성 인터넷'],
  [/Whale\//, '웨일'],
  [/FxiOS\/|Firefox\//, 'Firefox'],
  [/CriOS\/|Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]

const OS_RULES: readonly [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Windows NT/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
]

/** 알아보지 못한 UA 를 그대로 흘릴 때의 상한. 150자 원문이 카드를 밀어낸다. */
const RAW_FALLBACK_MAX = 48

const matchFirst = (
  rules: readonly [RegExp, string][],
  value: string,
): string | null => rules.find(([pattern]) => pattern.test(value))?.[1] ?? null

/**
 * `deviceInfo` → 사람이 읽는 한 줄.
 *
 * 판정에 실패하면 **원문을 자른 채로 보여 준다.** 「알 수 없는 기기」로 뭉개면
 * 사용자가 여러 행을 구별할 방법이 사라진다 — 목록의 목적 자체가 없어진다.
 */
export const describeDeviceLabel = (deviceInfo: string | null): string => {
  const raw = deviceInfo?.trim() ?? ''
  if (!raw) return '알 수 없는 기기'

  const browser = matchFirst(BROWSER_RULES, raw)
  const os = matchFirst(OS_RULES, raw)
  const parts = [browser, os].filter((part): part is string => part !== null)

  if (parts.length > 0) return parts.join(' · ')

  return raw.length > RAW_FALLBACK_MAX
    ? `${raw.slice(0, RAW_FALLBACK_MAX)}…`
    : raw
}

/**
 * 시각 표기. 백엔드가 값을 못 채우면 null 로 오고, 그때 빈 칸을 두면 라벨만 떠서
 * 「무엇이 비었는지」를 알 수 없다.
 */
export const formatSessionTime = (value: string | null): string =>
  value ? formatDateTime(value) : '알 수 없음'

/**
 * 이 행에 해제 버튼을 둘 것인가.
 *
 * 현재 기기는 제외한다. 백엔드는 자기 세션 해제도 받아 주지만, 화면에 남은 채로
 * 세션만 끊긴 **반쯤 로그인된 상태**가 만들어져 사용자가 무슨 일이 났는지 알 수 없다.
 */
export const canRevokeSession = (session: AuthSessionItem): boolean =>
  !session.current
