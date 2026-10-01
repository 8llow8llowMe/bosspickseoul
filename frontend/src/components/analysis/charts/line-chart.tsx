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
import {
  AxisUnitCaption,
  CHART_COLORS,
  CategoryTick,
  ChartTooltipContent,
  categoryAxisHeight,
  createAxisTickFormatter,
  formatAxisUnitCaption,
} from './chart-theme'

type Direction = 'INCREASE' | 'DECREASE' | 'STAGNANT'

/*
  ⚠️ 증감에 빨강·초록을 싣지 않는다. 국내 사용자는 주식 관례로 빨강을 「상승」으로 읽는데
  예전 배지는 하락을 빨강으로 칠했다. 방향은 기호와 문장이 말하고 색은 중립으로 둔다.
*/
const DIRECTION_META: Record<Direction, { symbol: string; label: string }> = {
  INCREASE: { symbol: '▲', label: '상승' },
  DECREASE: { symbol: '▼', label: '하락' },
  STAGNANT: { symbol: '–', label: '보합' },
}

const Wrap = styled.div`
  width: 100%;
`

const Badge = styled.p`
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0 0 8px;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;

  span {
    font-size: 11px;
  }
`

const formatPercent = (rate: number): string => {
  const abs = Math.abs(rate)
  return `${abs < 10 ? Number(abs.toFixed(1)) : Math.round(abs)}%`
}

export type LatestChange = {
  direction: Direction
  sentence: string
}

/**
 * 마지막 두 시점으로 「직전 분기 대비」 문장을 만든다. `subject` 는 조사까지 붙은 주어다
 * (「매출이」·「유동인구가」·「점포 수가」) — 「직전 분기보다 줄었어요」만 쓰면 무엇이 줄었는지
 * 문장에 없다.
 *
 * 서버 `changeRate` 도 같은 식(직전 분기 대비 비율)이지만 쓰지 않고 마지막 두 점의 값에서
 * 계산한다 — 문장이 말하는 「직전 분기」와 계산에 쓴 두 점이 늘 같도록, 둘 중 하나가 비면
 * 문장을 만들지 않는다.
 */
export const describeLatestChange = (
  points: readonly TrendPoint[],
  subject: string,
): LatestChange | null => {
  // 「직전 분기」라고 말하므로 배열의 마지막 두 시점만 본다. 사이에 빈 분기가 끼면 그 앞
  // 값과 비교한 수치를 직전 분기 대비라고 부르게 되니 문장을 만들지 않는다.
  if (points.length < 2) return null
  const previous = points[points.length - 2].value
  const latest = points[points.length - 1].value
  if (typeof previous !== 'number' || typeof latest !== 'number') return null
  const delta = latest - previous
  if (delta === 0) {
    return { direction: 'STAGNANT', sentence: `${subject} 직전 분기와 같아요` }
  }
  const direction: Direction = delta > 0 ? 'INCREASE' : 'DECREASE'
  const verb = delta > 0 ? '늘었어요' : '줄었어요'
  if (previous === 0) {
    return { direction, sentence: `${subject} 직전 분기보다 ${verb}` }
  }
  const rate = (delta / Math.abs(previous)) * 100
  // 반올림하면 0% 가 되는 변화에 ▲ 와 「0% 늘었어요」를 함께 적으면 모순으로 읽힌다.
  if (formatPercent(rate) === '0%') {
    return {
      direction: 'STAGNANT',
      sentence: `${subject} 직전 분기와 거의 같아요`,
    }
  }
  return {
    direction,
    sentence: `${subject} 직전 분기보다 ${formatPercent(rate)} ${verb}`,
  }
}

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

export type LineChartProps = {
  points: TrendPoint[]
  unit: string
  direction?: Direction | null
  /**
   * 직전 분기 대비 문장의 주어(조사 포함). 주면 배지가 「▼ 매출이 직전 분기보다 4.2%
   * 줄었어요」가 되고, 없으면 서버 `direction` 라벨만 보인다.
   */
  changeSubject?: string
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
  direction,
  changeSubject,
  ariaLabel = '분기별 추세 라인 차트',
  height = 240,
  valueFormatter,
}: LineChartProps) {
  if (!hasLineData(points)) return <Empty>데이터 없음</Empty>

  const change = changeSubject
    ? describeLatestChange(points, changeSubject)
    : null
  const badgeDirection = change?.direction ?? direction ?? null
  const meta = badgeDirection ? DIRECTION_META[badgeDirection] : null
  const unitCaption = formatAxisUnitCaption(unit)
  const yScale = computeNiceYScale(points.map(point => point.value))
  // 축 전체가 같은 단위를 쓰게 눈금 집합으로 포맷터를 만든다(단위 섞임 방지).
  const formatTick = createAxisTickFormatter(yScale.ticks)

  return (
    <Wrap>
      {/* 증감 문장은 role="img" 밖에 둔다 — img 의 자식은 보조기기에 읽히지 않는다. */}
      {meta ? (
        <Badge>
          <span aria-hidden>{meta.symbol}</span>
          {change ? change.sentence : meta.label}
        </Badge>
      ) : null}
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
    </Wrap>
  )
}
