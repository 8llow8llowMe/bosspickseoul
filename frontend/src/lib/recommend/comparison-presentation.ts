import { formatAnalysisValue } from '@/lib/analysis/presentation'
import type { CodeNameDescriptionMetadata } from '@/types/recommend'
import {
  COMPARISON_METRIC_GROUPS,
  COMPARISON_METRIC_GROUP_LABELS,
  type CommercialComparisonBody,
  type ComparisonMetric,
  type ComparisonMetricGroupKey,
} from '@/types/commercial-comparison'

/**
 * 백엔드 비교 응답의 **표시 로직**. 네트워크도 React 도 모른다.
 *
 * 전신인 `compare-presentation.ts` 는 추천 응답을 직접 조립해 N열 표를 만들었다.
 * 이제 비교의 정본은 백엔드이고 좌/우 두 열뿐이라 모듈을 새로 둔다.
 *
 * 🔴 **판단을 표로 옮기지 않는다.** 응답에는 지표마다 `winnerSide` 가 있지만
 * 표는 그것을 읽지 않는다. 값 옆에 승패 색이 붙는 순간 사용자는 그것을 "더 나은
 * 선택"으로 읽는데, 어느 상권이 맞는지는 업종과 계획에 달렸다. 승자·추천 이유는
 * 근거가 함께 제시되는 **리포트 영역에서만** 말한다(`toComparisonVerdict`).
 */

/** 값이 없는 칸. 표에서는 '데이터 없음'보다 짧아야 열이 안 밀린다. */
export const COMPARISON_EMPTY_CELL = '—'

export const COMPARISON_NEUTRAL_NOTICE =
  '아래 지표는 값 그대로예요. 어느 상권이 더 나은지는 업종과 계획에 따라 달라져요.'

/** 우측 값이 0 이라 상대 차이율을 낼 수 없을 때. 백엔드는 이때 `diffRate=0` 을 준다. */
export const COMPARISON_DIFF_RATE_UNAVAILABLE = '비교 불가'

/**
 * 접어 두는 **상세** 묶음 — 한 축(시간대·연령·성별)으로 쪼갠 분포다.
 *
 * 67행 중 48행(72%)이 여기라, 다 펼치면 핵심 19행을 읽은 뒤 스크롤 대부분이
 * 분포표다. 판정은 묶음 키로만 한다 — 새 필드 유무와 무관(명세 compare D4-6).
 */
export const COMPARISON_DETAIL_GROUPS: ReadonlySet<ComparisonMetricGroupKey> =
  new Set<ComparisonMetricGroupKey>([
    'salesTimeSlotMetrics',
    'salesAgeMetrics',
    'salesAgeGenderMetrics',
    'footTrafficTimeSlotMetrics',
    'footTrafficAgeMetrics',
    'footTrafficAgeGenderMetrics',
  ])

export type ComparisonRow = {
  key: string
  label: string
  left: string
  right: string
  /** 좌 - 우. 부호를 살려 적는다. 값이 없으면 빈 칸. */
  diff: string
  /** `차이율 +1.7%` · `차이율 비교 불가`. 구버전 응답이거나 계산할 값이 없으면 null. */
  diffRate: string | null
  /** 지표명 옆 도움말. 없으면 null. */
  description: string | null
}

export type ComparisonGroup = {
  key: ComparisonMetricGroupKey
  label: string
  /** `comparisonGuide.metricGroups[].description`. 없으면 null. */
  description: string | null
  /**
   * 묶음의 **모든 행**(2행 이상)이 같은 설명을 가지면 그 문장. 이때 각 행의
   * `description` 은 null 이다 — 같은 문장에 행마다 도움말 버튼(Tab 정지)을 두지
   * 않고 묶음 설명 아래에 한 번만 적는다(명세 compare D4-5).
   */
  sharedRowDescription: string | null
  /** 접어 두는 분포 묶음인가(`COMPARISON_DETAIL_GROUPS`). */
  isDetail: boolean
  rows: ComparisonRow[]
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const readList = (value: string[] | null | undefined): string[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

const readText = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const readUnit = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

/** 백엔드가 주는 자릿수는 0 또는 1 이다. 이상한 값은 기존(최대 1자리)으로 물러난다. */
const MAX_DISPLAY_PRECISION = 4

const readPrecision = (value: number | null | undefined): number | null =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= MAX_DISPLAY_PRECISION
    ? value
    : null

/**
 * 단위가 있는 숫자. 천 단위 구분 + 자릿수 **고정**(53 → `53.0%`) — 옆 칸과 자릿수가
 * 맞아야 오른쪽 정렬한 열을 눈으로 비교할 수 있다. 금액도 **줄이지 않는다**:
 * `formatKoreanMoney` 는 만원 미만을 절사해 서로 다른 두 값이 같아 보인다(D6).
 */
const formatNumber = (
  value: number,
  precision: number | null,
  signDisplay: 'auto' | 'exceptZero' = 'auto',
): string =>
  new Intl.NumberFormat('ko-KR', {
    ...(precision === null
      ? { maximumFractionDigits: 1 }
      : {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }),
    signDisplay,
  }).format(value)

/**
 * 부호 있는 숫자(차이·차이율). 반올림과 부호를 **Intl 에 함께** 맡긴다.
 *
 * - `exceptZero` 는 반올림한 결과로 부호를 정한다 — `-0.04`(자릿수 1)는 `0.0` 이지
 *   `-0.0` 이 아니다.
 * - Intl 기본 반올림(halfExpand)은 부호와 무관하게 대칭이다(±2.5 → ±3). 예전
 *   `Math.round` 는 .5 를 +∞ 쪽으로 올려 -0.05 → 0.0, +0.05 → +0.1 로 갈렸다.
 */
const formatSigned = (value: number, precision: number | null): string =>
  formatNumber(value, precision, 'exceptZero')

const formatValue = (
  value: number | null | undefined,
  metric: ComparisonMetric,
): string => {
  if (!isFiniteNumber(value)) return COMPARISON_EMPTY_CELL
  const unit = readUnit(metric.unit)
  // 구버전 응답 — 기존 표시 그대로. 라벨에서 단위를 추측하지 않는다.
  if (!unit) return formatAnalysisValue(value)
  return `${formatNumber(value, readPrecision(metric.displayPrecision))}${unit}`
}

/**
 * 차이는 **부호를 남긴다.** 좌가 크면 `+`, 작으면 `-`.
 *
 * 백엔드가 준 `diffValue` 를 그대로 쓴다(좌 - 우). 화면이 반올림한 좌·우 값을 다시
 * 빼면 백엔드 계산과 어긋나 같은 행에서 좌·우·차이가 서로 안 맞는 표가 된다
 * (53.84 / 52.96 → 표시 53.8% / 53.0%, 차이는 원시 0.88 → `+0.9%p`).
 *
 * `differenceUnit` 이 없으면 `unit` 을 빌리지 않는다 — 비율 지표에 `%` 를 붙이면
 * %p 를 %로 읽힌다. 그때는 기존 표시로 물러난다.
 */
const formatDiff = (metric: ComparisonMetric): string => {
  if (!isFiniteNumber(metric.diffValue)) return COMPARISON_EMPTY_CELL
  const unit = readUnit(metric.differenceUnit)

  if (!unit) {
    if (metric.diffValue === 0) return '0'
    const sign = metric.diffValue > 0 ? '+' : '-'
    return `${sign}${formatAnalysisValue(Math.abs(metric.diffValue))}`
  }

  return `${formatSigned(metric.diffValue, readPrecision(metric.displayPrecision))}${unit}`
}

/**
 * 상대 차이율. `diffRate` 는 이미 % 값이다(×100 하지 않는다).
 *
 * - 구버전 응답(`differenceUnit` 없음)은 그리지 않는다 — 기존 화면에 없던 칸이다.
 * - `rightValue=0` 이면 백엔드가 계산 불가 대체값 `0` 을 준다. `0%` 로 적으면
 *   「차이 없음」으로 읽혀 거짓이므로 `비교 불가` 다. 좌·우 둘 다 0 이어도 0/0 이다.
 */
const formatDiffRate = (metric: ComparisonMetric): string | null => {
  if (!readUnit(metric.differenceUnit)) return null
  if (!isFiniteNumber(metric.rightValue)) return null
  if (metric.rightValue === 0) {
    return `차이율 ${COMPARISON_DIFF_RATE_UNAVAILABLE}`
  }
  if (!isFiniteNumber(metric.diffRate)) return null

  return `차이율 ${formatSigned(metric.diffRate, 1)}%`
}

/**
 * 모든 행이 같은 설명이면 그 문장. 한 행짜리 묶음은 「같다」가 자명해 올리지
 * 않는다 — 다른 핵심 행처럼 도움말 버튼으로 둔다. 설명이 빠진 행이 하나라도
 * 있으면 공통 설명이 아니다.
 */
const readSharedDescription = (
  rows: readonly ComparisonRow[],
): string | null => {
  if (rows.length < 2) return null
  const [first] = rows
  if (!first.description) return null
  return rows.every(row => row.description === first.description)
    ? first.description
    : null
}

const readGroupDescriptions = (
  body: CommercialComparisonBody,
): Map<string, string> => {
  const groups = body.comparisonGuide?.metricGroups
  if (!Array.isArray(groups)) return new Map()

  return new Map(
    groups.flatMap(group => {
      const description = readText(group?.description)
      return group && typeof group.code === 'string' && description
        ? [[group.code, description] as const]
        : []
    }),
  )
}

/**
 * 지표 묶음들을 표로 세운다.
 *
 * 값이 하나도 없는 묶음은 **버린다** — 빈 소제목만 열두 개 늘어서면 표를 읽을 수 없다.
 * 응답에 새 묶음이 생기면 `COMPARISON_METRIC_GROUPS` 에만 추가하면 된다.
 */
export const toComparisonGroups = (
  body: CommercialComparisonBody | null | undefined,
): ComparisonGroup[] => {
  if (!body) return []

  // `code` 는 지표 배열 필드명과 같다. 모르는 code 는 아래 루프가 찾지 않아 버려진다.
  const groupDescriptions = readGroupDescriptions(body)

  return COMPARISON_METRIC_GROUPS.flatMap(key => {
    const metrics = body[key]
    if (!Array.isArray(metrics) || metrics.length === 0) return []

    const rows = metrics
      .filter(metric => metric && typeof metric.label === 'string')
      .map((metric, index) => ({
        key: `${key}-${index}`,
        label: metric.label,
        left: formatValue(metric.leftValue, metric),
        right: formatValue(metric.rightValue, metric),
        diff: formatDiff(metric),
        diffRate: formatDiffRate(metric),
        description: readText(metric.description),
      }))

    if (rows.length === 0) return []

    const sharedRowDescription = readSharedDescription(rows)
    return [
      {
        key,
        label: COMPARISON_METRIC_GROUP_LABELS[key],
        description: groupDescriptions.get(key) ?? null,
        sharedRowDescription,
        isDetail: COMPARISON_DETAIL_GROUPS.has(key),
        rows: sharedRowDescription
          ? rows.map(row => ({ ...row, description: null }))
          : rows,
      },
    ]
  })
}

/**
 * 표 위 「비교 기준」 문장들. 받은 문장을 **그대로**, 기간 → 업종 범위 → 차이 →
 * 차이율 순서로 돌려준다. 빈 문구는 건너뛴다. 추천 면책 문구는 표가 아니라 리포트
 * 영역 몫이라 여기 싣지 않는다(`toComparisonVerdict`).
 */
export const toComparisonBases = (
  body: CommercialComparisonBody | null | undefined,
): string[] => {
  const guide = body?.comparisonGuide
  if (!guide) return []

  return [
    guide.periodBasis,
    guide.serviceBasis,
    guide.differenceBasis,
    guide.diffRateBasis,
  ].flatMap(text => {
    const value = readText(text)
    return value ? [value] : []
  })
}

export type ComparisonVerdict = {
  /** 어느 쪽을 추천하는지. 코드는 백엔드 것, 이름은 표시용. */
  recommendedSideName: string | null
  summary: string | null
  businessFitSummary: string | null
  reasons: string[]
  cautions: string[]
  highlights: string[]
  /** `comparisonGuide.recommendationDisclaimer`. 구버전 응답이면 null. */
  disclaimer: string | null
}

/**
 * 추천측을 **상권 이름**으로 바꾼다.
 *
 * 백엔드 `recommendedSide.name` 은 "우측 상권 우세" 같은 방향 라벨이라 그대로 적으면
 * 사용자가 "우측이 어느 쪽이더라" 하고 표를 되짚어야 한다(실측에서 확인). `code`
 * (LEFT/RIGHT)로 실제 이름을 찾아 준다. 이름을 모르면 방향 라벨로 물러난다.
 */
const resolveRecommendedName = (
  side: CodeNameDescriptionMetadata,
  leftName: string | null,
  rightName: string | null,
): string | null => {
  if (!side) return null
  if (side.code === 'LEFT' && leftName) return leftName
  if (side.code === 'RIGHT' && rightName) return rightName
  return readText(side.name)
}

/**
 * 리포트 영역이 쓸 **판단** 묶음. 표는 이걸 보지 않는다.
 *
 * `comparisonHighlights` 와 `highlights` 는 백엔드에 둘 다 있고 내용이 겹칠 수
 * 있어 합친 뒤 중복을 없앤다 — 같은 문장이 두 번 적히면 읽는 사람은 강조가 아니라
 * 실수로 읽는다.
 */
export const toComparisonVerdict = (
  body: CommercialComparisonBody | null | undefined,
): ComparisonVerdict | null => {
  if (!body) return null

  const verdict: ComparisonVerdict = {
    recommendedSideName: resolveRecommendedName(
      body.recommendedSide,
      body.left?.commercialName ?? null,
      body.right?.commercialName ?? null,
    ),
    summary: readText(body.comparisonSummary),
    businessFitSummary: readText(body.businessFitSummary),
    reasons: readList(body.recommendedReasons),
    cautions: readList(body.cautionPoints),
    highlights: Array.from(
      new Set([
        ...readList(body.comparisonHighlights),
        ...readList(body.highlights),
      ]),
    ),
    disclaimer: readText(body.comparisonGuide?.recommendationDisclaimer),
  }

  // 면책 문구만으로는 리포트를 세우지 않는다 — 면책할 추천이 없다.

  const hasAnything =
    verdict.recommendedSideName ||
    verdict.summary ||
    verdict.businessFitSummary ||
    verdict.reasons.length > 0 ||
    verdict.cautions.length > 0 ||
    verdict.highlights.length > 0

  return hasAnything ? verdict : null
}
