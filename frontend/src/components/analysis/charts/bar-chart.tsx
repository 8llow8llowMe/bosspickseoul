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

import type { AnalysisMetricRow } from '@/lib/analysis/presentation'
import {
  CHART_COLORS,
  ChartTooltipContent,
  formatChartValue,
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
}: BarChartProps) {
  const cells = resolveBarCells(items, emphasisLabels)
  const hasData = cells.some(cell => typeof cell.value === 'number')
  if (!hasData) return <Empty>데이터 없음</Empty>

  return (
    <ResponsiveContainer width="100%" height={240} role="img" aria-label={ariaLabel}>
      <ReBarChart data={cells} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: CHART_COLORS.grid }}
        />
        <YAxis
          width={40}
          tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={value => formatChartValue(value)}
        />
        <Tooltip
          content={<ChartTooltipContent unit={unit} />}
          cursor={{ fill: 'var(--color-primary-100)' }}
        />
        <Bar dataKey="value" name="값" radius={[4, 4, 0, 0]} isAnimationActive={false}>
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
