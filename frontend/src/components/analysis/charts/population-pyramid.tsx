'use client'

import styled from 'styled-components'
import {
  Bar,
  BarChart as ReBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { PyramidRow } from '@/lib/analysis/chart-data'
import {
  CHART_COLORS,
  ChartTooltipContent,
  formatChartValue,
} from './chart-theme'

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
  margin-top: 6px;

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-text-700);
    font-size: 12px;
  }

  i {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
`

export type PopulationPyramidProps = {
  rows: PyramidRow[]
  unit?: string
  /** Chart plot height in px (default 260). */
  height?: number
}

export const toPyramidChartData = (
  rows: readonly PyramidRow[],
): Array<{
  ageLabel: string
  maleValue: number
  femaleValue: number
  maleAbs: number | null
  femaleAbs: number | null
}> =>
  rows.map(row => ({
    ageLabel: row.ageLabel,
    maleValue: row.male === null ? 0 : -row.male,
    femaleValue: row.female === null ? 0 : row.female,
    maleAbs: row.male,
    femaleAbs: row.female,
  }))

export default function PopulationPyramid({
  rows,
  unit = '%',
  height = 260,
}: PopulationPyramidProps) {
  const data = toPyramidChartData(rows)
  const hasData = rows.some(row => row.male !== null || row.female !== null)
  if (!hasData) return <Empty>데이터 없음</Empty>

  return (
    <div role="img" aria-label="연령·성별 인구 피라미드">
      <ResponsiveContainer
        width="100%"
        height={height}
        initialDimension={{ width: 300, height }}
      >
        <ReBarChart
          data={data}
          layout="vertical"
          stackOffset="sign"
          margin={{ top: 4, right: 12, bottom: 4, left: 12 }}
        >
          <XAxis
            type="number"
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickFormatter={value => formatChartValue(Math.abs(value), unit)}
          />
          <YAxis
            type="category"
            dataKey="ageLabel"
            width={44}
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-primary-100)' }}
            content={({ active, payload, label }) => (
              <ChartTooltipContent
                active={active}
                label={typeof label === 'string' ? label : undefined}
                unit={unit}
                payload={(payload ?? []).map(entry => ({
                  name: entry.name as string | undefined,
                  value:
                    typeof entry.value === 'number'
                      ? Math.abs(entry.value)
                      : (entry.value as number | undefined),
                }))}
              />
            )}
          />
          <Bar
            dataKey="maleValue"
            name="남성"
            fill={CHART_COLORS.seriesPrimary}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="femaleValue"
            name="여성"
            fill={CHART_COLORS.seriesSecondary}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </ReBarChart>
      </ResponsiveContainer>
      <Legend>
        <li>
          <i style={{ background: CHART_COLORS.seriesPrimary }} /> 남성
        </li>
        <li>
          <i style={{ background: CHART_COLORS.seriesSecondary }} /> 여성
        </li>
      </Legend>
    </div>
  )
}
