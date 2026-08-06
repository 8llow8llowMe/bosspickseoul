'use client'

import { useMemo } from 'react'
import styled from 'styled-components'

import {
  formatAnalysisValue,
  getMetricMaximum,
  type AnalysisMetricRow,
} from '@/lib/analysis/presentation'
import ChartFrame from './chart-frame'

const W = 460
const H = 220
const PAD = { top: 30, right: 16, bottom: 34, left: 16 }
const BAR_GAP_RATIO = 0.36
const MIN_BAR_HEIGHT = 2
const MIN_BAR_WIDTH = 4

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

export default function BarChart({
  items,
  unit,
  ariaLabel,
  emphasisLabels,
}: BarChartProps) {
  const geometry = useMemo(() => {
    if (items.length === 0 || items.every(item => item.value === null)) {
      return null
    }

    const maximum = getMetricMaximum(items) || 1
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const slot = innerW / items.length
    const barWidth = Math.max(MIN_BAR_WIDTH, slot * (1 - BAR_GAP_RATIO))
    const baseline = PAD.top + innerH

    const bars = items.map(item => {
      const height =
        item.value === null
          ? 0
          : Math.max(MIN_BAR_HEIGHT, (item.value / maximum) * innerH)
      return {
        item,
        height,
        emphasized: emphasisLabels?.includes(item.label) ?? false,
      }
    })

    return { bars, barWidth, slot, baseline }
  }, [items, emphasisLabels])

  if (!geometry) return <Empty>데이터 없음</Empty>

  const { bars, barWidth, slot, baseline } = geometry

  return (
    <ChartFrame
      viewBoxWidth={W}
      viewBoxHeight={H}
      ariaLabel={ariaLabel}
      ariaRole="group"
    >
      {bars.map((bar, index) => {
        const centerX = PAD.left + slot * (index + 0.5)
        const valueLabelY =
          bar.item.value === null ? baseline - 8 : baseline - bar.height - 8
        return (
          <g key={bar.item.label}>
            {bar.item.value !== null ? (
              <rect
                x={centerX - barWidth / 2}
                y={baseline - bar.height}
                width={barWidth}
                height={bar.height}
                rx={4}
                fill={
                  bar.emphasized
                    ? 'var(--color-primary-700)'
                    : 'var(--color-primary-600)'
                }
              >
                <title>{`${bar.item.label} ${formatAnalysisValue(bar.item.value, unit)}`}</title>
              </rect>
            ) : null}
            <text
              x={centerX}
              y={valueLabelY}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill="var(--color-text-900)"
            >
              {formatAnalysisValue(bar.item.value, unit)}
            </text>
            <text
              x={centerX}
              y={H - 14}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-text-600)"
            >
              {bar.item.label}
            </text>
          </g>
        )
      })}
    </ChartFrame>
  )
}
