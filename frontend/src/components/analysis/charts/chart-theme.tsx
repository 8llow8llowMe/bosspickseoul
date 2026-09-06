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

/** `toFixed` 결과에서 의미 없는 0 을 턴다. 1.50 → '1.5', 2.00 → '2'. */
const trimZeros = (text: string): string =>
  text.includes('.') ? text.replace(/\.?0+$/, '') : text

type AxisUnit = { divisor: number; suffix: string }

/**
 * 눈금 라벨이 **자기 눈금을 정확히 가리키는** 최소 소수 자리.
 *
 * ⚠️ 자리를 1 로 고정하면 서로 다른 눈금이 같은 글자가 된다. 분기별 추이 축이 실제로
 * **「1.4억 · 1.4억 · 1.5억 · 1.5억」**으로 그려졌다 — 눈금선은 네 개인데 읽을 수 있는
 * 값은 두 개뿐이라, 그 사이 값을 가늠할 수 없었다. 이 축은 자리를 2 로 늘려
 * 「1.4억 · 1.45억 · 1.5억 · 1.55억」이 된다.
 *
 * **「서로 다른 글자면 된다」로는 부족하다.** 눈금 `[0, 0.5억, 2.5억]` 은 소수 0 자리로도
 * 「0 · 1억 · 3억」이라 다 다르지만, 0.5 를 1 로 적는 것은 **틀린 값**이다. 그래서
 * 기준을 반올림 오차로 둔다 — 오차가 **눈금 간격의 절반**보다 작아야 그 라벨이 옆
 * 눈금이 아니라 자기 눈금을 가리킨다.
 */
const pickDecimals = (values: readonly number[], unit: AxisUnit): number => {
  const scaled = [...new Set(values)]
    .map(value => value / unit.divisor)
    .sort((a, b) => a - b)
  if (scaled.length < 2) return scaled.some(v => !Number.isInteger(v)) ? 1 : 0

  const minGap = scaled
    .slice(1)
    .reduce(
      (gap, value, index) => Math.min(gap, value - scaled[index]),
      Infinity,
    )
  // 간격이 0 이면(중복 눈금) 비교할 것이 없다.
  const tolerance = minGap > 0 ? minGap / 2 : Infinity

  for (const decimals of [0, 1, 2]) {
    const worstError = scaled.reduce(
      (max, value) =>
        Math.max(max, Math.abs(Number(value.toFixed(decimals)) - value)),
      0,
    )
    if (worstError < tolerance) return decimals
  }

  return 2
}

/** 값의 크기에 맞는 단위 하나. 1만 미만이면 단위 없이 콤마 표기다. */
const pickAxisUnit = (magnitude: number): AxisUnit => {
  if (magnitude >= 100_000_000) return { divisor: 100_000_000, suffix: '억' }
  if (magnitude >= 10_000) return { divisor: 10_000, suffix: '만' }
  return { divisor: 1, suffix: '' }
}

const formatWithUnit = (
  value: number,
  unit: AxisUnit,
  decimals: number,
): string => {
  if (!Number.isFinite(value)) return ''
  if (value === 0) return '0'

  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)

  return unit.suffix
    ? `${sign}${trimZeros((abs / unit.divisor).toFixed(decimals))}${unit.suffix}`
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
 *
 * 소수 자리도 여기서 함께 정한다 — `pickDecimals` 참고.
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
  const finite = values.filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  )
  const decimals = pickDecimals(finite, unit)

  return value => formatWithUnit(value, unit, decimals)
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
