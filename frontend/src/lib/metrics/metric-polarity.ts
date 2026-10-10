import type { StatusMetric } from '@/types/status'

/**
 * 지표 값을 색으로 옮기기 전에 **극성**(높을수록 좋은가)을 되묻는 곳. 추천 점수와 구별현황 증감이
 * 함께 쓴다(DESIGN.md §Charts 「증감은 좋고 나쁨으로 칠한다」, 결정 D-1).
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
 * 「위험도 0」은 빨강이 된다. 좋은 것을 나쁘게 칠하는 셈이다. 증감도 같다 — 폐업이 늘어난 것을
 * 「상승=초록」으로 칠하면 좋은 소식으로 읽힌다.
 */

/**
 * `neutral` 은 「높고 낮음에 좋고 나쁨이 없다」는 뜻이다. 극성을 **모르는** 것(`null`)과 다르지만
 * 화면에서는 둘 다 무채색이고 「개선/악화」를 말하지 않는다.
 */
export type MetricPolarity = 'higher-is-better' | 'lower-is-better' | 'neutral'

/**
 * 색이 말하는 것. **점수가 아니라 이것을 토큰에 잇는다.**
 * `neutral` 은 「색으로 판단하지 않는다」는 뜻이지 「보통」이 아니다.
 */
export type ScoreQuality = 'good' | 'fair' | 'poor' | 'neutral'

/** 추천 지표 코드(`metricType`)의 극성. */
export const METRIC_POLARITY: Readonly<Record<string, MetricPolarity>> = {
  OPPORTUNITY_SCORE: 'higher-is-better',
  RESIDENT_POPULATION_SCORE: 'higher-is-better',
  RISK_SCORE: 'lower-is-better',
  CONGESTION_SCORE: 'lower-is-better',
}

/** 종합 점수에는 `metricType` 이 없다. 높을수록 좋다. */
export const COMPOSITE_SCORE_POLARITY: MetricPolarity = 'higher-is-better'

/**
 * 구별현황 네 지표의 극성. **폐업만 낮을수록 좋다** — 폐업이 늘면 나쁜 소식이다.
 * 개업은 높을수록 좋다로 둔다. 개업이 늘면 경쟁도 늘지만, 구 단위 현황에서 개업 증가는 상권이
 * 살아 있다는 신호로 읽고 경쟁은 상권분석이 따로 말한다(status.md 「색 하나에 뜻 하나」).
 */
export const STATUS_METRIC_POLARITY: Readonly<
  Record<StatusMetric, MetricPolarity>
> = {
  footTraffic: 'higher-is-better',
  sales: 'higher-is-better',
  opened: 'higher-is-better',
  closed: 'lower-is-better',
}

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

const isDirectional = (
  polarity: MetricPolarity | null,
): polarity is 'higher-is-better' | 'lower-is-better' =>
  polarity === 'higher-is-better' || polarity === 'lower-is-better'

/**
 * 「좋음/보통/주의」(내부 값 good/fair/poor). 방향을 모르거나 중립이면 `neutral` 이고, 그때는 색으로
 * 판단하지 않는다.
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
  if (!isDirectional(polarity)) return 'neutral'

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
  // 「나쁨」은 상권을 단정한다. 점수 하나가 낮다는 것은 살펴볼 이유이지 판정이 아니다(#569).
  poor: '주의',
  neutral: '',
}

/**
 * 등급 문구. 지표 행의 배지와 게이지의 스크린리더 문구가 함께 쓴다 — **색만으로
 * 등급을 전하지 않기 위해서다**(#569). `neutral` 은 빈 문자열이다 — 판단하지 않은 것을
 * 「보통」이라고 말하면 그것도 거짓이다.
 */
export const getScoreQualityLabel = (quality: ScoreQuality): string =>
  QUALITY_LABELS[quality]

const POLARITY_LABELS: Readonly<Record<MetricPolarity, string>> = {
  'higher-is-better': '높을수록 좋아요',
  'lower-is-better': '낮을수록 좋아요',
  neutral: '',
}

/**
 * 지표의 방향을 글자로 옮긴다(#569). 화면에 숫자와 색만 있으면 「위험도 82」를
 * 좋은 점수로 읽는다. 방향을 모르거나 중립이면 빈 문자열이다 — 아무 방향이나 말하지 않는다.
 */
export const describeMetricPolarity = (
  polarity: MetricPolarity | null,
): string => (polarity === null ? '' : POLARITY_LABELS[polarity])

/* ─── 증감(변화율) ─────────────────────────────────────────────────────── */

/**
 * 증감이 **좋은 쪽인지 나쁜 쪽인지**. 색은 방향(오름·내림)이 아니라 이 판단을 따른다(D-1).
 * 변화가 없거나(0), 값이 없거나, 극성이 중립·모름이면 `neutral` 이다.
 */
export type ChangeTone = 'positive' | 'negative' | 'neutral'

export const resolveChangeTone = (
  changeRate: number | null | undefined,
  polarity: MetricPolarity | null,
): ChangeTone => {
  if (typeof changeRate !== 'number' || !Number.isFinite(changeRate)) {
    return 'neutral'
  }
  if (changeRate === 0 || !isDirectional(polarity)) return 'neutral'

  const isRising = changeRate > 0
  const isGood = polarity === 'higher-is-better' ? isRising : !isRising

  return isGood ? 'positive' : 'negative'
}

/**
 * 증감 **글자** 색. 글자는 AA 4.5:1 을 넘어야 해서 -text 토큰이다(green700·red700).
 * 면적(틴트·막대)은 3:1 기준이라 `CHANGE_TONE_AREA_COLOR` 를 쓴다.
 */
export const CHANGE_TONE_TEXT_COLOR: Readonly<Record<ChangeTone, string>> = {
  positive: 'var(--color-positive-text)',
  negative: 'var(--color-negative-text)',
  neutral: 'var(--color-text-600)',
}

/** 증감 **면적** 색(칩 틴트·테두리). 중립은 흰 바탕에 묻히지 않게 회색 테두리 색이다. */
export const CHANGE_TONE_AREA_COLOR: Readonly<Record<ChangeTone, string>> = {
  positive: 'var(--color-positive)',
  negative: 'var(--color-negative)',
  neutral: 'var(--color-border-300)',
}

const CHANGE_TONE_LABELS: Readonly<Record<ChangeTone, string>> = {
  positive: '개선',
  negative: '악화',
  neutral: '',
}

/**
 * 「개선/악화」. **색만으로 좋고 나쁨을 전하지 않기 위해** 색을 칠한 증감 옆에 늘 둔다
 * (WCAG 1.4.1). 중립은 빈 문자열이다 — 판단하지 않은 것을 말하지 않는다.
 */
export const describeChangeTone = (tone: ChangeTone): string =>
  CHANGE_TONE_LABELS[tone]
