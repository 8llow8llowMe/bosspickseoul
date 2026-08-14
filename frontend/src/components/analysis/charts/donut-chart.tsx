'use client'

import styled from 'styled-components'
import {
  Cell,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

import type { GenderSegment } from '@/lib/analysis/chart-data'
import { CHART_COLORS, formatChartValue, TooltipBox } from './chart-theme'

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
  /**
   * 조각 값의 단위. '%'이면 값 자체가 비율이므로 툴팁에 퍼센트만 표기하고,
   * 그 외(명·건 등)는 "값 단위 (비율%)"로 값과 비율을 함께 표기한다.
   */
  unit?: string
  /** 값 포맷터. 지정하면 단위 기반 기본 포맷 대신 이 함수로 값을 표기한다. */
  valueFormatter?: (value: number) => string
}

type DonutSlice = { label: string; value: number; percent: number }

// 도넛 툴팁: 조각의 값(명·건)과 비율(%)을 함께 보여 준다. 값이 이미 비율이면(%)
// 비율만 표기한다. 기존엔 unit이 '%'로 고정돼 인원 값에 '%'가 붙는 버그가 있었다.
function DonutTooltipContent({
  active,
  payload,
  unit = '',
  valueFormatter,
}: {
  active?: boolean
  payload?: Array<{ payload?: DonutSlice }>
  unit?: string
  valueFormatter?: (value: number) => string
}) {
  if (!active || !payload || payload.length === 0) return null
  const slice = payload[0]?.payload
  if (!slice) return null

  const percentText = `${slice.percent}%`
  const showValue = unit !== '%'
  const valueText = showValue
    ? valueFormatter
      ? valueFormatter(slice.value)
      : formatChartValue(slice.value, unit)
    : null

  return (
    <TooltipBox>
      <strong>
        {slice.label}{' '}
        {valueText ? `${valueText} (${percentText})` : percentText}
      </strong>
    </TooltipBox>
  )
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

export default function DonutChart({
  segments,
  ariaLabel,
  unit = '',
  valueFormatter,
}: DonutChartProps) {
  const slices = toDonutSlices(segments)
  const hasData = slices.some(slice => slice.value > 0)
  if (!hasData) return <Empty>데이터 없음</Empty>

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer
        width="100%"
        height={180}
        initialDimension={{ width: 300, height: 180 }}
      >
        <RePieChart>
          <Tooltip
            content={
              <DonutTooltipContent
                unit={unit}
                valueFormatter={valueFormatter}
              />
            }
          />
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
              <Cell
                key={slice.label}
                fill={SLICE_COLORS[index % SLICE_COLORS.length]}
              />
            ))}
          </Pie>
        </RePieChart>
      </ResponsiveContainer>
      <Legend>
        {slices.map((slice, index) => (
          <li key={slice.label}>
            <i
              style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }}
            />
            {slice.label} {slice.percent}%
          </li>
        ))}
      </Legend>
    </div>
  )
}
