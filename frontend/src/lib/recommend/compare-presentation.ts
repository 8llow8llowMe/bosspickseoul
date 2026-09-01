import { formatAnalysisValue } from '@/lib/analysis/presentation'
import type { CandidateCommercial, CommercialProfile } from '@/types/recommend'

import {
  COMPOSITE_SCORE_POLARITY,
  resolveMetricPolarity,
  resolveScoreQuality,
  type ScoreQuality,
} from './metric-polarity'

/**
 * 비교 표의 **표시 로직**. 네트워크도 React 도 모른다.
 *
 * 점수는 방향이 정의돼 있어 색으로 판단하고, 원지표는 방향이 정의돼 있지 않아
 * 사실만 말한다. 이 구분이 이 모듈의 존재 이유다 — §5.2 참고.
 */

/**
 * 화면에서 **빼지 않는다.** 점수 옆에 색이 붙는 순간 사용자는 그것을 "더 나은
 * 선택"으로 읽는다. 이 표에는 그 판단의 근거가 없다.
 */
export const COMPARE_NEUTRAL_NOTICE =
  '점수는 추천 기준으로 매긴 것이고, 아래 지표는 값 그대로예요. 어느 상권이 더 나은지는 업종과 계획에 따라 달라져요.'

/** 값이 없는 칸. 표에서는 '데이터 없음'보다 짧아야 열이 안 밀린다. */
export const COMPARE_EMPTY_CELL = '—'

export type CompareColumnInput = {
  commercialCode: string
  candidate: CandidateCommercial | null
  profile: CommercialProfile | null
}

export type CompareScoreCell = {
  commercialCode: string
  score: number | null
  quality: ScoreQuality
}

export type CompareScoreRow = {
  key: string
  label: string
  cells: CompareScoreCell[]
}

export type CompareMetricCell = {
  commercialCode: string
  value: number | null
  formatted: string
  isHighest: boolean
}

export type CompareMetricRow = {
  key: string
  label: string
  cells: CompareMetricCell[]
}

/** 종합 점수는 `metricType` 이 없어 breakdown 이 아니라 따로 읽는다. */
const COMPOSITE_ROW = { key: 'composite', label: '종합 점수' } as const

const SCORE_ROWS: readonly { key: string; label: string }[] = [
  { key: 'OPPORTUNITY_SCORE', label: '기회도' },
  { key: 'RISK_SCORE', label: '위험도' },
  { key: 'CONGESTION_SCORE', label: '혼잡도' },
  { key: 'RESIDENT_POPULATION_SCORE', label: '거주 수요' },
]

type MetricKey = keyof NonNullable<CommercialProfile['keyMetrics']>

const METRIC_ROWS: readonly { key: MetricKey; label: string; unit: string }[] =
  [
    { key: 'totalSalesAmount', label: '월 매출', unit: '원' },
    { key: 'totalFootTraffic', label: '유동인구', unit: '명' },
    { key: 'totalStoreCount', label: '점포 수', unit: '개' },
    { key: 'similarStoreCount', label: '동일 업종 점포 수', unit: '개' },
    { key: 'openingRate', label: '개업률', unit: '%' },
    { key: 'closureRate', label: '폐업률', unit: '%' },
    { key: 'totalResidentPopulation', label: '상주인구', unit: '명' },
    { key: 'monthlyAverageIncomeAmount', label: '월 평균 소득', unit: '원' },
    { key: 'totalFacilityCount', label: '집객시설', unit: '개' },
  ]

const readScore = (
  candidate: CandidateCommercial | null,
  metricCode: string,
): number | null => {
  const item = candidate?.metricBreakdown?.find(
    entry => entry.metricType?.code === metricCode,
  )

  return typeof item?.score === 'number' ? item.score : null
}

const isFinite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const toCompareScoreRows = (
  columns: readonly CompareColumnInput[],
): CompareScoreRow[] => [
  {
    ...COMPOSITE_ROW,
    cells: columns.map(({ commercialCode, candidate }) => {
      const score = isFinite(candidate?.compositeScore)
        ? candidate!.compositeScore
        : null

      return {
        commercialCode,
        score,
        quality: resolveScoreQuality(score, COMPOSITE_SCORE_POLARITY),
      }
    }),
  },
  ...SCORE_ROWS.map(row => ({
    ...row,
    cells: columns.map(({ commercialCode, candidate }) => {
      const score = readScore(candidate, row.key)

      return {
        commercialCode,
        score,
        // 방향은 여기서 정하지 않는다. METRIC_POLARITY 가 정본이고,
        // 모르는 코드면 neutral 이라 색으로 판단하지 않는다.
        quality: resolveScoreQuality(score, resolveMetricPolarity(row.key)),
      }
    }),
  })),
]

export const toCompareMetricRows = (
  columns: readonly CompareColumnInput[],
): CompareMetricRow[] =>
  METRIC_ROWS.map(row => {
    const values = columns.map(({ profile }) => {
      const raw = profile?.keyMetrics?.[row.key]

      return isFinite(raw) ? raw : null
    })

    const present = values.filter(isFinite)
    const max = present.length > 0 ? Math.max(...present) : null
    /**
     * 「가장 높음」은 **견줄 것이 있을 때만** 참이다. 값이 하나뿐이거나 전부 같으면
     * 배지를 붙이지 않는다 — 그때 「가장 높음」은 아무 정보도 주지 않으면서
     * 그 열이 우세하다는 인상만 준다.
     */
    const comparable =
      present.length >= 2 && present.some(value => value !== max)

    return {
      key: row.key,
      label: row.label,
      cells: columns.map((column, index) => {
        const value = values[index]

        return {
          commercialCode: column.commercialCode,
          value,
          formatted:
            value === null
              ? COMPARE_EMPTY_CELL
              : formatAnalysisValue(value, row.unit),
          isHighest: comparable && value === max,
        }
      }),
    }
  })
