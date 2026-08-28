/**
 * 지표 점수를 색으로 옮기기 전에 **방향**을 되묻는 곳.
 *
 * 추천 API 의 `scoreDescription` 이 지표마다 방향을 다르게 말한다.
 *
 * | 지표     | scoreDescription                            | 점수가 높으면 |
 * | -------- | ------------------------------------------- | ------------- |
 * | 기회도   | "점수가 높을수록 진입 기회가 높습니다"      | 좋다          |
 * | 거주수요 | "점수가 높을수록 소비 수요가 높습니다"      | 좋다          |
 * | 위험도   | "점수가 높을수록 위험 요인이 큽니다"        | **나쁘다**    |
 * | 혼잡도   | "점수가 높을수록 혼잡과 경쟁 체감이 큽니다" | **나쁘다**    |
 *
 * 점수를 그대로 초록↔빨강에 매핑하면 **「위험도 100(=매우 위험)」이 초록**이 되고,
 * 「위험도 0」은 빨강이 된다. 좋은 것을 나쁘게 칠하는 셈이다.
 */

export type MetricPolarity = 'higher-is-better' | 'lower-is-better'

/**
 * 색이 말하는 것. **점수가 아니라 이것을 토큰에 잇는다.**
 * `neutral` 은 「색으로 판단하지 않는다」는 뜻이지 「보통」이 아니다.
 */
export type ScoreQuality = 'good' | 'fair' | 'poor' | 'neutral'

export const METRIC_POLARITY: Readonly<Record<string, MetricPolarity>> = {
  OPPORTUNITY_SCORE: 'higher-is-better',
  RESIDENT_POPULATION_SCORE: 'higher-is-better',
  RISK_SCORE: 'lower-is-better',
  CONGESTION_SCORE: 'lower-is-better',
}

/** 종합 점수에는 `metricType` 이 없다. 높을수록 좋다. */
export const COMPOSITE_SCORE_POLARITY: MetricPolarity = 'higher-is-better'

/** DESIGN.md §Score Scale — HIGH ≥ 70 / MEDIUM 40~70 / LOW < 40. */
const GOOD_THRESHOLD = 70
const FAIR_THRESHOLD = 40

/**
 * 모르는 코드는 `null` 이다. 백엔드가 지표를 추가했을 때 **아무 방향이나 가정하지
 * 않기 위해서다** — 잘못 가정하면 화면이 조용히 반대로 말한다.
 */
export const resolveMetricPolarity = (
  metricCode: unknown,
): MetricPolarity | null => {
  if (typeof metricCode !== 'string') return null

  return METRIC_POLARITY[metricCode.trim()] ?? null
}

/**
 * 「좋음/보통/나쁨」. 방향을 모르면 `neutral` 이고, 그때는 색으로 판단하지 않는다.
 *
 * `lower-is-better` 지표는 **등급을 매기기 전에** 점수를 뒤집는다. 뒤집는 것은
 * 등급뿐이고 **점수 자체(호가 채우는 양)는 그대로 둔다** — 호까지 뒤집으면 가운데
 * 숫자와 그림이 어긋난다.
 */
export const resolveScoreQuality = (
  score: unknown,
  polarity: MetricPolarity | null,
): ScoreQuality => {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'neutral'
  if (polarity === null) return 'neutral'

  const clamped = Math.min(Math.max(score, 0), 100)
  const goodness = polarity === 'higher-is-better' ? clamped : 100 - clamped

  if (goodness >= GOOD_THRESHOLD) return 'good'
  return goodness >= FAIR_THRESHOLD ? 'fair' : 'poor'
}

const QUALITY_TOKENS: Readonly<Record<ScoreQuality, string>> = {
  good: 'var(--score-high)',
  fair: 'var(--score-mid)',
  poor: 'var(--score-low)',
  neutral: 'var(--score-neutral)',
}

export const getScoreQualityColor = (quality: ScoreQuality): string =>
  QUALITY_TOKENS[quality]

const QUALITY_LABELS: Readonly<Record<ScoreQuality, string>> = {
  good: '좋음',
  fair: '보통',
  poor: '나쁨',
  neutral: '',
}

/**
 * 스크린리더용 등급 문구. `neutral` 은 빈 문자열이다 — 판단하지 않은 것을
 * 「보통」이라고 말하면 그것도 거짓이다.
 */
export const getScoreQualityLabel = (quality: ScoreQuality): string =>
  QUALITY_LABELS[quality]
