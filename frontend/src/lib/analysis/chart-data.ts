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

/**
 * 조각별 정수 비율(%). 합이 늘 100 이 되도록 **최대 나머지 방식**으로 남는 1%p 를 나눈다.
 *
 * ⚠️ 성비 막대(`ShareBar`)와 성비 문장(`describeGenderShare`)이 **이 함수 하나**를 쓴다.
 * 둘이 반올림을 따로 하면 48.5/51.5 에서 막대는 49/51, 문장은 「여성이 52%」가 되어 한 카드
 * 안에서 숫자가 갈렸다. 음수 값은 0 으로 본다.
 */
export const toShares = (values: readonly number[]): number[] => {
  const safe = values.map(value =>
    Number.isFinite(value) ? Math.max(0, value) : 0,
  )
  const total = safe.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return safe.map(() => 0)
  const exact = safe.map(value => (value / total) * 100)
  const floors = exact.map(Math.floor)
  let remaining = 100 - floors.reduce((sum, share) => sum + share, 0)
  // 나머지가 큰 조각부터 1%p 씩. 동률이면 앞 조각이 먼저 받는다.
  const order = exact
    .map((share, index) => ({ index, remainder: share - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const { index } of order) {
    if (remaining <= 0) break
    floors[index] += 1
    remaining -= 1
  }
  return floors
}
