'use client'

import { useMemo } from 'react'
import styled from 'styled-components'

import { formatAnalysisValue } from '@/lib/analysis/presentation'
import type { TrendPoint } from '@/lib/analysis/chart-data'
import ChartFrame from './chart-frame'
import { useChartTooltip } from './use-chart-tooltip'

const W = 480
const H = 240
const PAD = { top: 28, right: 24, bottom: 36, left: 24 }

const DIRECTION_META: Record<
  'INCREASE' | 'DECREASE' | 'STAGNANT',
  { symbol: string; label: string; token: string }
> = {
  INCREASE: { symbol: '↑', label: '상승', token: 'var(--color-positive)' },
  DECREASE: { symbol: '↓', label: '하락', token: 'var(--color-negative)' },
  STAGNANT: { symbol: '→', label: '보합', token: 'var(--color-text-600)' },
}

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
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

export type LineChartProps = {
  points: TrendPoint[]
  unit: string
  direction?: 'INCREASE' | 'DECREASE' | 'STAGNANT' | null
}

export default function LineChart({ points, unit, direction }: LineChartProps) {
  const { active, show, hide } = useChartTooltip()

  const geometry = useMemo(() => {
    const values = points
      .map(point => point.value)
      .filter((value): value is number => value !== null)
    if (values.length === 0) return null
    const max = Math.max(...values)
    const min = Math.min(...values)
    const span = max - min || 1
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const step = points.length > 1 ? innerW / (points.length - 1) : 0
    const coords = points.map((point, index) => ({
      point,
      x: PAD.left + step * index,
      y:
        point.value === null
          ? null
          : PAD.top + innerH - ((point.value - min) / span) * innerH,
    }))
    return { coords }
  }, [points])

  if (!geometry) return <Empty>데이터 없음</Empty>

  const runs: Array<Array<{ x: number; y: number }>> = []
  let current: Array<{ x: number; y: number }> = []
  for (const coord of geometry.coords) {
    if (coord.y === null) {
      if (current.length > 0) {
        runs.push(current)
        current = []
      }
      continue
    }
    current.push({ x: coord.x, y: coord.y })
  }
  if (current.length > 0) runs.push(current)

  const meta = direction ? DIRECTION_META[direction] : null

  return (
    <div>
      {meta ? (
        <Badge $token={meta.token}>
          {meta.symbol} {meta.label}
        </Badge>
      ) : null}
      <ChartFrame
        viewBoxWidth={W}
        viewBoxHeight={H}
        ariaLabel="분기별 추세 라인 차트"
        tooltip={active}
      >
        {runs
          .filter(run => run.length >= 2)
          .map((run, index) => (
            <polyline
              key={index}
              points={run.map(({ x, y }) => `${x},${y}`).join(' ')}
              fill="none"
              stroke="var(--color-primary-600)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        {geometry.coords.map((coord, index) =>
          coord.y === null ? null : (
            <g key={index}>
              <circle
                cx={coord.x}
                cy={coord.y}
                r={4}
                fill="var(--color-primary-600)"
                tabIndex={0}
                aria-label={`${coord.point.periodLabel} ${formatAnalysisValue(coord.point.value, unit)}`}
                onMouseEnter={() =>
                  show({
                    x: coord.x,
                    y: coord.y as number,
                    label: coord.point.periodLabel,
                    value: formatAnalysisValue(coord.point.value, unit),
                  })
                }
                onFocus={() =>
                  show({
                    x: coord.x,
                    y: coord.y as number,
                    label: coord.point.periodLabel,
                    value: formatAnalysisValue(coord.point.value, unit),
                  })
                }
                onMouseLeave={hide}
                onBlur={hide}
              />
              <text
                x={coord.x}
                y={coord.y - 10}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="var(--color-text-900)"
              >
                {formatAnalysisValue(coord.point.value, unit)}
              </text>
              <text
                x={coord.x}
                y={H - 14}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-text-600)"
              >
                {coord.point.periodLabel}
              </text>
            </g>
          ),
        )}
      </ChartFrame>
    </div>
  )
}
