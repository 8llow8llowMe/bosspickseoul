import { formatPeriodCode } from '@/lib/analysis/presentation'
import type { CommercialTrend } from '@/types/commercial-analysis'

export type TrendPoint = {
  periodLabel: string
  value: number | null
  changeRate: number | null
}

export type PyramidRow = {
  ageLabel: string
  male: number | null
  female: number | null
}

export type GenderSegment = { label: string; value: number }

const numOrNull = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const AGE_KEYS = [
  ['10대', 'Age10'],
  ['20대', 'Age20'],
  ['30대', 'Age30'],
  ['40대', 'Age40'],
  ['50대', 'Age50'],
  ['60대+', 'Age60Plus'],
] as const

export const toTrendPoints = (
  trend: CommercialTrend | null | undefined,
): TrendPoint[] =>
  (trend?.periods ?? []).map(period => ({
    periodLabel: period.periodCode
      ? formatPeriodCode(period.periodCode)
      : '시점 정보 없음',
    value: numOrNull(period.value),
    changeRate: numOrNull(period.changeRate),
  }))

export const toPyramidRows = (
  item: Record<string, number | null> | null | undefined,
): PyramidRow[] =>
  AGE_KEYS.map(([ageLabel, key]) => ({
    ageLabel,
    male: numOrNull(item?.[`male${key}Percent`]),
    female: numOrNull(item?.[`female${key}Percent`]),
  }))

export const toGenderSegments = (
  male: number | null | undefined,
  female: number | null | undefined,
): GenderSegment[] => {
  const segments: GenderSegment[] = []
  const m = numOrNull(male)
  const f = numOrNull(female)
  if (m !== null) segments.push({ label: '남성', value: Math.max(0, m) })
  if (f !== null) segments.push({ label: '여성', value: Math.max(0, f) })
  return segments
}

/**
 * 조각 비중(%, 정수 반올림). 도넛 툴팁과 그 옆 행 목록이 **같은 함수**로 비중을 내야 1% 어긋나지 않는다.
 * 합이 0 이면 모두 0 이다.
 */
export const toDonutSlices = (
  segments: readonly GenderSegment[],
): Array<{ label: string; value: number; percent: number }> => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  return segments.map(segment => ({
    label: segment.label,
    value: segment.value,
    percent: total > 0 ? Math.round((segment.value / total) * 100) : 0,
  }))
}
