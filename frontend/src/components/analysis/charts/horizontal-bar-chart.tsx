'use client'

import styled from 'styled-components'
import {
  Bar,
  BarChart as ReBarChart,
  Cell,
  LabelList,
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

/**
 * 막대 **두께**는 `maxBarSize` 로 26px 에 묶여 있는데 **길이**에는 상한이 없어서,
 * `ResponsiveContainer width="100%"` 가 넓은 칸을 만나면 가로세로비가 무너진다
 * (실측: `/status` 「업종별 점포수」가 폭 1016px 칸에서 막대 800px · 약 31:1).
 * 그러면 왼쪽 라벨과 오른쪽 값이 멀어져 **어느 라벨의 값인지 눈으로 잇기 어렵다.**
 *
 * 그래서 차트 폭 자체에 상한을 둔다. 좁은 칸에서는 아무 영향이 없고(그대로 100%),
 * 넓은 칸에서만 왼쪽 정렬로 멈춘다.
 */
const CHART_MAX_WIDTH = 560

const Bounded = styled.div<{ $maxWidth: number }>`
  width: 100%;
  max-width: ${props => props.$maxWidth}px;
`

export type HorizontalBarChartProps = {
  items: readonly AnalysisMetricRow[]
  unit: string
  ariaLabel: string
  /** Colors bars by sign (positive vs negative) instead of the primary series color. */
  diverging?: boolean
  /** Per-row height in px (drives the chart's total height). Default 34. */
  rowHeight?: number
  /**
   * Width reserved for the category (label) axis. If omitted, it auto-fits the
   * longest label so short labels (예: "반찬가게") don't leave a wide left gap.
   */
  yAxisWidth?: number
  /** Formats the value label drawn at the end of each bar. Defaults to a compact 만/억 tick. */
  valueFormatter?: (value: number) => string
  /**
   * 차트 폭 상한(px). 기본 {@link CHART_MAX_WIDTH}. 넓은 칸에서 막대가 한없이 길어져
   * 라벨과 값이 멀어지는 것을 막는다. 좁은 칸에서는 영향이 없다.
   */
  maxWidth?: number
}

/**
 * 가로 막대 차트. 카테고리(업종·행정동 등 긴 한글 라벨)를 왼쪽 축에 두어
 * 세로 막대보다 라벨이 겹치지 않고, 순위/증감 비교에 적합하다.
 */
export default function HorizontalBarChart({
  items,
  unit,
  ariaLabel,
  diverging = false,
  rowHeight = 34,
  yAxisWidth,
  valueFormatter,
  maxWidth = CHART_MAX_WIDTH,
}: HorizontalBarChartProps) {
  const hasData = items.some(item => typeof item.value === 'number')
  if (!hasData) return <Empty>데이터 없음</Empty>

  const values = items.map(item => item.value)
  const scale = computeNiceYScale(values)
  const domain: [number, number] = diverging
    ? scale.domain
    : [0, scale.domain[1]]
  const formatLabel = valueFormatter ?? formatAxisTick
  // 라벨 축 폭: 지정이 없으면 가장 긴 라벨 길이에 맞춰(한글 ≈ 13px/자) 자동 산정해
  // 짧은 라벨에서 왼쪽 여백이 과하게 벌어지는 문제를 없앤다. 52~140px로 제한.
  const longestLabelLength = items.reduce(
    (max, item) => Math.max(max, item.label.length),
    0,
  )
  const axisWidth =
    yAxisWidth ?? Math.min(140, Math.max(52, longestLabelLength * 13 + 8))
  const height = Math.max(120, items.length * rowHeight + 24)

  return (
    <Bounded $maxWidth={maxWidth}>
      <ResponsiveContainer
        width="100%"
        height={height}
        initialDimension={{ width: 300, height }}
        role="img"
        aria-label={ariaLabel}
      >
        <ReBarChart
          data={items}
          layout="vertical"
          margin={{ top: 4, right: 52, bottom: 4, left: 8 }}
        >
          <XAxis type="number" domain={domain} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={axisWidth}
            tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={
              <ChartTooltipContent
                unit={unit}
                valueFormatter={valueFormatter}
              />
            }
            cursor={{ fill: 'var(--color-primary-100)' }}
          />
          <Bar
            dataKey="value"
            name="값"
            radius={[0, 4, 4, 0]}
            maxBarSize={26}
            isAnimationActive={false}
          >
            {items.map((item, index) => (
              <Cell
                key={`${item.label}-${index}`}
                fill={
                  diverging
                    ? (item.value ?? 0) < 0
                      ? CHART_COLORS.negative
                      : CHART_COLORS.positive
                    : CHART_COLORS.seriesPrimary
                }
              />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={value =>
                typeof value === 'number' ? formatLabel(value) : ''
              }
              style={{
                fill: 'var(--color-text-700)',
                fontSize: 11,
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </Bounded>
  )
}
