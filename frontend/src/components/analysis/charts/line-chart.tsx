'use client'

import styled from 'styled-components'
import {
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { TrendPoint } from '@/lib/analysis/chart-data'
import {
  CHART_COLORS,
  ChartTooltipContent,
  formatAxisTick,
} from './chart-theme'

const DIRECTION_META: Record<
  'INCREASE' | 'DECREASE' | 'STAGNANT',
  { symbol: string; label: string; token: string }
> = {
  INCREASE: { symbol: '↑', label: '상승', token: CHART_COLORS.positive },
  DECREASE: { symbol: '↓', label: '하락', token: CHART_COLORS.negative },
  STAGNANT: { symbol: '→', label: '보합', token: 'var(--color-text-600)' },
}

const Wrap = styled.div`
  width: 100%;
`

const Badge = styled.span<{ $token: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  color: ${props => props.$token};
  font-size: 12px;
  font-weight: 700;
`

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

export type LineChartProps = {
  points: TrendPoint[]
  unit: string
  direction?: 'INCREASE' | 'DECREASE' | 'STAGNANT' | null
  ariaLabel?: string
  /** Chart plot height in px (default 240). */
  height?: number
}

export const hasLineData = (points: readonly TrendPoint[]): boolean =>
  points.some(point => typeof point.value === 'number')

export default function LineChart({
  points,
  unit,
  direction,
  ariaLabel = '분기별 추세 라인 차트',
  height = 240,
}: LineChartProps) {
  if (!hasLineData(points)) return <Empty>데이터 없음</Empty>

  const meta = direction ? DIRECTION_META[direction] : null

  return (
    <Wrap role="img" aria-label={ariaLabel}>
      {meta ? (
        <Badge $token={meta.token}>
          {meta.symbol} {meta.label}
        </Badge>
      ) : null}
      <ResponsiveContainer
        width="100%"
        height={height}
        initialDimension={{ width: 300, height }}
      >
        <ReLineChart
          data={points}
          margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
        >
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="periodLabel"
            tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
          />
          <YAxis
            width={44}
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={value => formatAxisTick(value)}
          />
          <Tooltip
            content={<ChartTooltipContent unit={unit} />}
            cursor={{ stroke: CHART_COLORS.grid }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name="값"
            stroke={CHART_COLORS.seriesPrimary}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_COLORS.seriesPrimary }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
        </ReLineChart>
      </ResponsiveContainer>
    </Wrap>
  )
}
