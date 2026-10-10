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

/**
 * 조회 수를 **숫자로** 보일 최소값(#600).
 *
 * 초기 트래픽 구간에서는 「많이 본」 순위가 「1회」·「조회 2회」처럼 나온다(dev 2026-10-09: 홈 5곳 모두
 * 1회). 사회적 증거는 표본이 작을수록 역효과다 — 아무도 쓰지 않는 서비스처럼 읽힌다. 그래서 이 값보다
 * 작은 조회 수는 적지 않고 **순위만** 보인다. 순위 자체는 실제 집계라 그대로 둔다.
 *
 * 홈 「지금 많이 본 지역」·추천 「실시간 많이 본 상권」·상권분석 「지금 많이 본 상권」 지름길이 이
 * 한 값을 같이 쓴다 — 화면마다 다르면 같은 집계가 한 화면에서는 숫자로, 다른 화면에서는 순위로만 보인다.
 */
export const MIN_VISIBLE_VIEW_COUNT = 10

/**
 * 목록의 조회 수를 숫자로 적어도 되는가. **목록 단위로** 정한다 — 가장 적은 항목이 임계값 이상일 때만
 * 참이다. 행마다 정하면 위 몇 줄만 숫자가 있고 아래는 비어 「값을 못 받은 행」처럼 보인다.
 * 빈 목록·비유한 값은 거짓이다(적을 숫자가 없다).
 */
export const canShowViewCounts = (
  items: ReadonlyArray<{ viewCount: number }>,
): boolean =>
  items.length > 0 &&
  items.every(
    item =>
      Number.isFinite(item.viewCount) &&
      item.viewCount >= MIN_VISIBLE_VIEW_COUNT,
  )
