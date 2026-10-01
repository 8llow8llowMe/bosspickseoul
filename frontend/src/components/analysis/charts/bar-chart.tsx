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
  AxisUnitCaption,
  CHART_COLORS,
  CategoryTick,
  ChartTooltipContent,
  categoryAxisHeight,
  createAxisTickFormatter,
  formatAxisUnitCaption,
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
  /**
   * 가장 큰 막대 하나만 진하게 칠하고 그 위에 값을 늘 보여 준다.
   *
   * ⚠️ 진한 막대는 「가장 큰 값」으로 읽힌다. 요일 차트가 토·일을 고정 강조했을 때 매출이
   * 가장 높은 목요일이 연한 색이라 사용자가 거꾸로 읽었다. 강조는 값에서 정한다.
   * `emphasisLabels` 와 함께 주면 이쪽이 이긴다.
   */
  highlightMax?: boolean
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
  highlightMax = false,
): Array<{ label: string; value: number | null; emphasis: boolean }> => {
  if (highlightMax) {
    const max = items.reduce<number | null>(
      (best, item) =>
        typeof item.value === 'number' && (best === null || item.value > best)
          ? item.value
          : best,
      null,
    )
    // 같은 최댓값이 여럿이면 첫 막대 하나만 강조한다 — 강조가 둘이면 어느 쪽도 1등이 아니다.
    const maxIndex =
      max === null || max <= 0
        ? -1
        : items.findIndex(item => item.value === max)
    return items.map((item, index) => ({
      label: item.label,
      value: item.value,
      emphasis: index === maxIndex,
    }))
  }
  const emphasis = new Set(emphasisLabels)
  return items.map(item => ({
    label: item.label,
    value: item.value,
    emphasis: emphasis.has(item.label),
  }))
}

/**
 * recharts 에 넘길 행. 강조 막대에만 `labelValue` 를 둔다.
 *
 * ⚠️ 값 라벨을 index 로 찾으면 안 된다. recharts 는 높이 0 인 막대(0·null)를 좌표 배열에서
 * 걸러낸 뒤 LabelList 에 넘겨 content 의 index 가 원래 순서와 어긋난다 — 10대 매출이 0 이면
 * 30대에 칠한 강조 라벨이 40대 위에 떴다. 라벨 값은 행에 실어 payload 로 따라가게 한다.
 */
export const toBarChartData = (
  cells: ReturnType<typeof resolveBarCells>,
): Array<
  ReturnType<typeof resolveBarCells>[number] & { labelValue: number | null }
> =>
  cells.map(cell => ({
    ...cell,
    labelValue: cell.emphasis ? cell.value : null,
  }))

export default function BarChart({
  items,
  unit,
  ariaLabel,
  emphasisLabels,
  highlightMax = false,
  maxBarSize,
  height = 240,
  valueFormatter,
}: BarChartProps) {
  const cells = resolveBarCells(items, emphasisLabels, highlightMax)
  const hasData = cells.some(cell => typeof cell.value === 'number')
  if (!hasData) return <Empty>데이터 없음</Empty>

  // 막대는 길이로 읽으므로 기준선을 0 에 고정한다(`NiceYScaleOptions.includeZero`).
  const yScale = computeNiceYScale(
    cells.map(cell => cell.value),
    5,
    { includeZero: true },
  )
  // 축 전체가 같은 단위를 쓰게 눈금 집합으로 포맷터를 만든다(단위 섞임 방지).
  const formatTick = createAxisTickFormatter(yScale.ticks)
  const formatValue = (value: number): string =>
    valueFormatter ? valueFormatter(value) : formatChartValue(value, unit)
  const unitCaption = formatAxisUnitCaption(unit)

  return (
    <div role="img" aria-label={ariaLabel}>
      {unitCaption ? <AxisUnitCaption>{unitCaption}</AxisUnitCaption> : null}
      <ResponsiveContainer
        width="100%"
        height={height}
        initialDimension={{ width: 300, height }}
      >
        <ReBarChart
          data={toBarChartData(cells)}
          margin={{ top: highlightMax ? 20 : 8, right: 16, bottom: 4, left: 8 }}
        >
          <XAxis
            dataKey="label"
            interval={0}
            height={categoryAxisHeight(cells.map(cell => cell.label))}
            tick={<CategoryTick />}
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
            tickFormatter={formatTick}
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
            {highlightMax ? (
              <LabelList
                dataKey="labelValue"
                position="top"
                offset={6}
                content={props => {
                  const { x, y, width, value } = props
                  if (typeof value !== 'number') return null
                  return (
                    <text
                      x={Number(x) + Number(width) / 2}
                      y={Number(y) - 6}
                      fill="var(--color-text-900)"
                      fontSize={12}
                      fontWeight={700}
                      textAnchor="middle"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatValue(value)}
                    </text>
                  )
                }}
              />
            ) : null}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}
