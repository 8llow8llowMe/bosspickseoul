'use client'

import styled from 'styled-components'
import {
  Bar,
  BarChart as ReBarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { computeNiceYScale } from '@/lib/analysis/chart-scale'
import type { AnalysisMetricRow } from '@/lib/analysis/presentation'
import {
  CHART_COLORS,
  ChartTooltipContent,
  formatAxisTick,
} from './chart-theme'

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

export type BarChartProps = {
  items: readonly AnalysisMetricRow[]
  unit: string
  ariaLabel: string
  /** Labels (matched against `item.label`) whose bar renders in a distinct primary shade. */
  emphasisLabels?: readonly string[]
  /** Caps bar thickness (px). Prevents overly wide bars when there are few categories. */
  maxBarSize?: number
  /** Chart plot height in px (default 240). */
  height?: number
  /** Formats the tooltip value. Defaults to a unit-based compact format. */
  valueFormatter?: (value: number) => string
}

export const resolveBarCells = (
  items: readonly AnalysisMetricRow[],
  emphasisLabels: readonly string[] = [],
): Array<{ label: string; value: number | null; emphasis: boolean }> => {
  const emphasis = new Set(emphasisLabels)
  return items.map(item => ({
    label: item.label,
    value: item.value,
    emphasis: emphasis.has(item.label),
  }))
}

export default function BarChart({
  items,
  unit,
  ariaLabel,
  emphasisLabels,
  maxBarSize,
  height = 240,
  valueFormatter,
}: BarChartProps) {
  const cells = resolveBarCells(items, emphasisLabels)
  const hasData = cells.some(cell => typeof cell.value === 'number')
  if (!hasData) return <Empty>데이터 없음</Empty>

  const yScale = computeNiceYScale(cells.map(cell => cell.value))

  return (
    <ResponsiveContainer
      width="100%"
      height={height}
      initialDimension={{ width: 300, height }}
      role="img"
      aria-label={ariaLabel}
    >
      <ReBarChart
        data={cells}
        margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
      >
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: CHART_COLORS.grid }}
        />
        <YAxis
          width={44}
          tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          domain={yScale.domain}
          ticks={yScale.ticks}
          allowDataOverflow
          tickFormatter={value => formatAxisTick(value)}
        />
        <Tooltip
          content={
            <ChartTooltipContent unit={unit} valueFormatter={valueFormatter} />
          }
          cursor={{ fill: 'var(--color-primary-100)' }}
        />
        <Bar
          dataKey="value"
          name="값"
          radius={[4, 4, 0, 0]}
          maxBarSize={maxBarSize}
          isAnimationActive={false}
        >
          {cells.map(cell => (
            <Cell
              key={cell.label}
              fill={
                cell.emphasis
                  ? CHART_COLORS.seriesPrimary
                  : CHART_COLORS.seriesSecondary
              }
            />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  )
}
