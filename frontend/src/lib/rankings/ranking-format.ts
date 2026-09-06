/**
 * 분석 인기 순위(`GET /analysis-rankings`) 표기 규칙.
 *
 * 홈 「지금 많이 본 지역」과 `/analysis` 1단계의 「지금 많이 본 상권」이 **같은 API 를
 * 같은 단위로** 읽는다. 각자 포매터를 두면 한쪽만 고쳐져 같은 숫자가 두 화면에서 다르게
 * 적히므로 여기 한 곳에 둔다.
 */

/**
 * 조회 수 표기. 변화율은 **의도적으로 없다** — 집계에 「전기」가 없어서 0 으로 채우면
 * 「변동 없음」이라는 틀린 말을 하게 된다. 절대값만 적는다.
 */
export const formatViewCount = (viewCount: number): string =>
  `${new Intl.NumberFormat('ko-KR').format(Math.max(0, Math.trunc(viewCount)))}회`

/**
 * 집계 창을 문장으로. `windowHours` 가 24의 배수면 일 단위로 읽는 편이 자연스럽다.
 * 값이 이상하면(0 이하·비유한) 창 표기를 포기한다 — 틀린 기간을 적느니 안 적는다.
 */
export const formatRankingWindow = (windowHours: number): string | null => {
  if (!Number.isFinite(windowHours) || windowHours <= 0) return null

  const hours = Math.trunc(windowHours)
  if (hours % 24 === 0) {
    const days = hours / 24
    return days === 1 ? '최근 24시간' : `최근 ${days}일`
  }

  return `최근 ${hours}시간`
}
