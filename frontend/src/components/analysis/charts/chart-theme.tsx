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

const trimUnit = (n: number): string => {
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

type AxisUnit = { divisor: number; suffix: string }

/** 값의 크기에 맞는 단위 하나. 1만 미만이면 단위 없이 콤마 표기다. */
const pickAxisUnit = (magnitude: number): AxisUnit => {
  if (magnitude >= 100_000_000) return { divisor: 100_000_000, suffix: '억' }
  if (magnitude >= 10_000) return { divisor: 10_000, suffix: '만' }
  return { divisor: 1, suffix: '' }
}

const formatWithUnit = (value: number, unit: AxisUnit): string => {
  if (!Number.isFinite(value)) return ''
  if (value === 0) return '0'

  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)

  return unit.suffix
    ? `${sign}${trimUnit(abs / unit.divisor)}${unit.suffix}`
    : `${sign}${abs.toLocaleString('ko-KR')}`
}

/**
 * 축 전체가 **하나의 단위**를 쓰도록 포맷터를 만든다.
 *
 * ⚠️ 값마다 단위를 따로 고르면(예전 `formatAxisTick` 이 그랬다) 한 축 안에서 단위가
 * 섞인다. 손익 눈금 `[-15000, -10000, -5000, 0, 5000, 10000]` 이 실제로
 * **「-1.5만 · -1만 · -5,000 · 0 · 5,000 · 1만」**으로 그려졌다 — 1만을 넘는 값만
 * 만 단위가 되어, 같은 축의 눈금끼리 자릿수를 비교할 수 없었다.
 *
 * 그래서 **가장 큰 눈금**으로 단위를 한 번 정하고 모든 눈금에 같은 단위를 쓴다.
 * 위 예는 「-1.5만 · -1만 · -0.5만 · 0 · 0.5만 · 1만」이 된다.
 */
export const createAxisTickFormatter = (
  values: readonly (number | null | undefined)[],
): ((value: number) => string) => {
  const magnitude = values.reduce<number>(
    (max, value) =>
      typeof value === 'number' && Number.isFinite(value)
        ? Math.max(max, Math.abs(value))
        : max,
    0,
  )
  const unit = pickAxisUnit(magnitude)

  return value => formatWithUnit(value, unit)
}

export const TooltipBox = styled.div`
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
  /**
   * 값 포맷터. 지정하면 unit 기반 기본 포맷 대신 이 함수로 툴팁 값을 표기한다
   * (예: 유동인구 명 단위를 "1억 4528만명"처럼 억/만으로 축약).
   */
  valueFormatter?: (value: number) => string
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  unit = '',
  valueFormatter,
}: ChartTooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const formatValue = (value: number | undefined): string =>
    typeof value === 'number' && Number.isFinite(value) && valueFormatter
      ? valueFormatter(value)
      : formatChartValue(value, unit)
  return (
    <TooltipBox>
      {label ? <span>{label}</span> : null}
      {payload.map((entry, index) => (
        <strong key={entry.name ?? index}>
          {entry.name ? `${entry.name} ` : ''}
          {formatValue(entry.value)}
        </strong>
      ))}
    </TooltipBox>
  )
}
