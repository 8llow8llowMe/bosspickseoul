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

export type ComparisonRow = {
  key: string
  label: string
  left: string
  right: string
  /** 좌 - 우. 부호를 살려 적는다. 값이 없으면 빈 칸. */
  diff: string
}

export type ComparisonGroup = {
  key: ComparisonMetricGroupKey
  label: string
  rows: ComparisonRow[]
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const formatValue = (value: number | null | undefined): string =>
  isFiniteNumber(value) ? formatAnalysisValue(value) : COMPARISON_EMPTY_CELL

/**
 * 차이는 **부호를 남긴다.** 좌가 크면 `+`, 작으면 `-`.
 *
 * 백엔드가 준 `diffValue` 를 그대로 쓴다(좌 - 우). 화면이 다시 빼면 백엔드가
 * 반올림한 값과 어긋나 같은 행에서 좌·우·차이가 서로 안 맞는 표가 된다.
 */
const formatDiff = (metric: ComparisonMetric): string => {
  if (!isFiniteNumber(metric.diffValue)) return COMPARISON_EMPTY_CELL
  if (metric.diffValue === 0) return '0'
  const sign = metric.diffValue > 0 ? '+' : '-'
  return `${sign}${formatAnalysisValue(Math.abs(metric.diffValue))}`
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

  return COMPARISON_METRIC_GROUPS.flatMap(key => {
    const metrics = body[key]
    if (!Array.isArray(metrics) || metrics.length === 0) return []

    const rows = metrics
      .filter(metric => metric && typeof metric.label === 'string')
      .map((metric, index) => ({
        key: `${key}-${index}`,
        label: metric.label,
        left: formatValue(metric.leftValue),
        right: formatValue(metric.rightValue),
        diff: formatDiff(metric),
      }))

    if (rows.length === 0) return []
    return [{ key, label: COMPARISON_METRIC_GROUP_LABELS[key], rows }]
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
}

const readList = (value: string[] | null | undefined): string[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : []

const readText = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

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
  }

  const hasAnything =
    verdict.recommendedSideName ||
    verdict.summary ||
    verdict.businessFitSummary ||
    verdict.reasons.length > 0 ||
    verdict.cautions.length > 0 ||
    verdict.highlights.length > 0

  return hasAnything ? verdict : null
}
