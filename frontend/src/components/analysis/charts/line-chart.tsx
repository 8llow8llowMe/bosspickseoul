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

import { computeNiceYScale } from '@/lib/analysis/chart-scale'
import type { TrendPoint } from '@/lib/analysis/chart-data'
import { ChartDataTable } from './chart-data-table'
import {
  AxisUnitCaption,
  CHART_COLORS,
  CategoryTick,
  ChartTooltipContent,
  categoryAxisHeight,
  createAxisTickFormatter,
  formatAxisUnitCaption,
} from './chart-theme'

/*
  방향 배지는 두지 않는다. 결과 화면 트렌드는 `AnalysisTrendSummary` 가 직전 분기 대비 문장
  (`describeLatestChange`)으로 말하고, 증감 색은 지표 극성으로 판정한 좋고 나쁨이다(DESIGN.md Charts, D-1).
*/
const Wrap = styled.div`
  width: 100%;
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
  ariaLabel?: string
  /** Chart plot height in px (default 240). */
  height?: number
  /** Formats the tooltip value. Defaults to a unit-based compact format. */
  valueFormatter?: (value: number) => string
}

export const hasLineData = (points: readonly TrendPoint[]): boolean =>
  points.some(point => typeof point.value === 'number')

export default function LineChart({
  points,
  unit,
  ariaLabel = '분기별 추세 라인 차트',
  height = 240,
  valueFormatter,
}: LineChartProps) {
  if (!hasLineData(points)) return <Empty>데이터 없음</Empty>

  const unitCaption = formatAxisUnitCaption(unit)
  const yScale = computeNiceYScale(points.map(point => point.value))
  // 축 전체가 같은 단위를 쓰게 눈금 집합으로 포맷터를 만든다(단위 섞임 방지).
  const formatTick = createAxisTickFormatter(yScale.ticks)

  return (
    <Wrap>
      <div role="img" aria-label={ariaLabel}>
        {unitCaption ? <AxisUnitCaption>{unitCaption}</AxisUnitCaption> : null}
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
              interval={0}
              // 첫·끝 라벨을 점 가운데에 두면 절반이 플롯 밖으로 나가 잘렸다(「2026년」 → 「2026ㄴ」).
              padding={{ left: 16, right: 16 }}
              height={categoryAxisHeight(
                points.map(point => point.periodLabel),
              )}
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
      </div>
      <ChartDataTable
        caption={ariaLabel}
        categoryHeader="기간"
        categories={points.map(point => point.periodLabel)}
        series={[{ name: '값', values: points.map(point => point.value) }]}
        unit={unit}
        valueFormatter={valueFormatter}
      />
    </Wrap>
  )
}
