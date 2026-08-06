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
