import type { AnalysisResultTab } from '@/lib/analysis/selection'

export type AnalysisTabDefinition = {
  value: AnalysisResultTab
  label: string
}

export const ANALYSIS_TABS: readonly AnalysisTabDefinition[] = [
  { value: 'summary', label: '요약' },
  { value: 'foot-traffic', label: '유동인구' },
  { value: 'sales', label: '매출' },
  { value: 'stores', label: '점포' },
  { value: 'living', label: '생활권' },
  { value: 'trend', label: '트렌드' },
  { value: 'benchmark', label: '비교' },
] as const

const allowedTabs = new Set(ANALYSIS_TABS.map(tab => tab.value))

export const normalizeAnalysisTab = (
  value: string | null | undefined,
): AnalysisResultTab =>
  value && allowedTabs.has(value as AnalysisResultTab)
    ? (value as AnalysisResultTab)
    : 'summary'

export const formatAnalysisValue = (
  value: number | null | undefined,
  unit = '',
): string =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${new Intl.NumberFormat('ko-KR', {
        maximumFractionDigits: 1,
      }).format(value)}${unit}`
    : '데이터 없음'

export const formatPeriodCode = (periodCode: string): string => {
  const match = /^(\d{4})([1-4])$/.exec(periodCode)
  return match ? `${match[1]}년 ${match[2]}분기` : '기준 시점 정보 없음'
}

export type AnalysisMetricRow = {
  label: string
  value: number | null
}

export const toMetricRows = <
  T extends Record<string, number | null | undefined>,
>(
  source: T | null | undefined,
  definitions: readonly (readonly [label: string, key: keyof T])[],
): AnalysisMetricRow[] =>
  definitions.map(([label, key]) => {
    const value = source?.[key]
    return {
      label,
      value: typeof value === 'number' && Number.isFinite(value) ? value : null,
    }
  })

export const getMetricMaximum = (rows: readonly AnalysisMetricRow[]): number =>
  rows.reduce(
    (maximum, row) =>
      row.value === null ? maximum : Math.max(maximum, row.value),
    0,
  )
