'use client'

import styled from 'styled-components'

import { formatAnalysisValue } from '@/lib/analysis/presentation'

export const CHART_COLORS = {
  seriesPrimary: 'var(--color-primary-600)',
  seriesSecondary: 'var(--color-blue-500)',
  grid: 'var(--color-border-200)',
  axis: 'var(--color-text-caption)',
  surface: 'var(--color-surface)',
  border: 'var(--color-border-200)',
  positive: 'var(--color-positive)',
  negative: 'var(--color-negative)',
} as const

export const formatChartValue = (
  value: number | null | undefined,
  unit = '',
): string => formatAnalysisValue(value, unit)

/**
 * 축 눈금용 컴팩트 표기. 큰 수를 만/억 단위로 짧게 만들어 축이 가려지지 않게 한다.
 * 예) 600,000 → '60만', 4,500,000 → '450만', 100,000,000 → '1억',
 *     250,000,000 → '2.5억'. 1만 미만은 로케일 콤마 그대로, 0은 '0'.
 */
export const formatAxisTick = (value: number): string => {
  if (!Number.isFinite(value)) return ''
  if (value === 0) return '0'
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const trim = (n: number): string => {
    const rounded = Math.round(n * 10) / 10
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  }
  if (abs >= 100_000_000) return `${sign}${trim(abs / 100_000_000)}억`
  if (abs >= 10_000) return `${sign}${trim(abs / 10_000)}만`
  return `${sign}${abs.toLocaleString('ko-KR')}`
}

const TooltipBox = styled.div`
  border: 1px solid ${CHART_COLORS.border};
  border-radius: var(--radius-control);
  background: ${CHART_COLORS.surface};
  box-shadow: var(--shadow-level-2);
  padding: 8px 10px;
  font-size: 12px;
  line-height: 18px;

  strong {
    display: block;
    color: var(--color-text-900);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  span {
    color: var(--color-text-caption);
  }
`

export type ChartTooltipContentProps = {
  active?: boolean
  payload?: Array<{
    name?: string
    value?: number
    payload?: Record<string, unknown>
  }>
  label?: string
  unit?: string
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  unit = '',
}: ChartTooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <TooltipBox>
      {label ? <span>{label}</span> : null}
      {payload.map((entry, index) => (
        <strong key={entry.name ?? index}>
          {entry.name ? `${entry.name} ` : ''}
          {formatChartValue(entry.value, unit)}
        </strong>
      ))}
    </TooltipBox>
  )
}
