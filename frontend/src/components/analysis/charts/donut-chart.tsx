'use client'

import styled from 'styled-components'

import type { GenderSegment } from '@/lib/analysis/chart-data'
import ChartFrame from './chart-frame'

const SIZE = 220
const R = 80
const STROKE = 34
const CENTER = SIZE / 2
const FULL_CIRCLE_THRESHOLD = 0.9999

const tokenForLabel = (label: string) =>
  label === '남성' ? 'var(--color-primary-600)' : 'var(--color-chart-female)'

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

const Legend = styled.ul`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
`

const LegendItem = styled.li<{ $token: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-700);
  font-size: 12px;
  font-weight: 600;

  &::before {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${props => props.$token};
  }
`

const polar = (fraction: number) => {
  const angle = 2 * Math.PI * fraction - Math.PI / 2
  return { x: CENTER + R * Math.cos(angle), y: CENTER + R * Math.sin(angle) }
}

export type DonutChartProps = {
  segments: GenderSegment[]
  ariaLabel: string
}

export default function DonutChart({ segments, ariaLabel }: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  if (segments.length === 0 || total <= 0) return <Empty>데이터 없음</Empty>

  const arcs = segments.reduce<
    Array<{
      segment: GenderSegment
      percent: number
      token: string
      d: string
      isFullCircle: boolean
      mid: { x: number; y: number }
      cursorEnd: number
    }>
  >((acc, segment, index) => {
    const cursorStart = index === 0 ? 0 : acc[index - 1].cursorEnd
    const fraction = segment.value / total
    const cursorEnd = cursorStart + fraction
    const start = polar(cursorStart)
    const end = polar(cursorEnd)
    const largeArc = fraction > 0.5 ? 1 : 0
    const percent = Math.round(fraction * 100)
    acc.push({
      segment,
      percent,
      token: tokenForLabel(segment.label),
      d: `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      isFullCircle: fraction >= FULL_CIRCLE_THRESHOLD,
      mid: polar(cursorStart + fraction / 2),
      cursorEnd,
    })
    return acc
  }, [])

  return (
    <div>
      <ChartFrame
        viewBoxWidth={SIZE}
        viewBoxHeight={SIZE}
        ariaLabel={ariaLabel}
      >
        {arcs.map(arc =>
          arc.isFullCircle ? (
            <circle
              key={arc.segment.label}
              cx={CENTER}
              cy={CENTER}
              r={R}
              fill="none"
              stroke={arc.token}
              strokeWidth={STROKE}
            />
          ) : (
            <path
              key={arc.segment.label}
              d={arc.d}
              fill="none"
              stroke={arc.token}
              strokeWidth={STROKE}
              strokeLinecap="butt"
            />
          ),
        )}
        {arcs.map(arc => (
          <text
            key={`${arc.segment.label}-label`}
            x={arc.mid.x}
            y={arc.mid.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fontWeight={700}
            fill="var(--color-surface)"
          >
            {arc.percent}%
          </text>
        ))}
      </ChartFrame>
      <Legend>
        {arcs.map(arc => (
          <LegendItem key={arc.segment.label} $token={arc.token}>
            {arc.segment.label} {arc.percent}%
          </LegendItem>
        ))}
      </Legend>
    </div>
  )
}
