'use client'

import styled from 'styled-components'
import { Cell, Pie, PieChart as RePieChart, ResponsiveContainer, Tooltip } from 'recharts'

import type { GenderSegment } from '@/lib/analysis/chart-data'
import { CHART_COLORS, ChartTooltipContent } from './chart-theme'

const SLICE_COLORS = [CHART_COLORS.seriesPrimary, CHART_COLORS.seriesSecondary]

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

const Legend = styled.ul`
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-top: 8px;

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-text-700);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  i {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
`

export type DonutChartProps = {
  segments: GenderSegment[]
  ariaLabel: string
}

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

export default function DonutChart({ segments, ariaLabel }: DonutChartProps) {
  const slices = toDonutSlices(segments)
  const hasData = slices.some(slice => slice.value > 0)
  if (!hasData) return <Empty>데이터 없음</Empty>

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={180}>
        <RePieChart>
          <Tooltip content={<ChartTooltipContent unit="%" />} />
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="82%"
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((slice, index) => (
              <Cell key={slice.label} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
            ))}
          </Pie>
        </RePieChart>
      </ResponsiveContainer>
      <Legend>
        {slices.map((slice, index) => (
          <li key={slice.label}>
            <i style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }} />
            {slice.label} {slice.percent}%
          </li>
        ))}
      </Legend>
    </div>
  )
}
