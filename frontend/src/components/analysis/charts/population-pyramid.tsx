'use client'

import styled from 'styled-components'

import { formatAnalysisValue } from '@/lib/analysis/presentation'
import type { PyramidRow } from '@/lib/analysis/chart-data'
import ChartFrame from './chart-frame'

const W = 480
const ROW_H = 30
const GAP = 8
const CENTER_LABEL_W = 60
const SIDE_PAD = 20
const MALE_TOKEN = 'var(--color-primary-600)'
const FEMALE_TOKEN = 'var(--color-chart-female)'

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
  margin-bottom: 8px;
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
    border-radius: 3px;
    background: ${props => props.$token};
  }
`

export type PopulationPyramidProps = {
  rows: PyramidRow[]
  unit?: string
}

export default function PopulationPyramid({
  rows,
  unit = '%',
}: PopulationPyramidProps) {
  const values = rows.flatMap(row =>
    [row.male, row.female].filter((v): v is number => v !== null),
  )
  if (values.length === 0) return <Empty>데이터 없음</Empty>

  const max = Math.max(...values, 1)
  const half = (W - CENTER_LABEL_W) / 2 - SIDE_PAD
  const centerLeft = SIDE_PAD + half
  const centerRight = centerLeft + CENTER_LABEL_W
  const height = rows.length * (ROW_H + GAP)

  return (
    <div>
      <Legend>
        <LegendItem $token={MALE_TOKEN}>남성</LegendItem>
        <LegendItem $token={FEMALE_TOKEN}>여성</LegendItem>
      </Legend>
      <ChartFrame
        viewBoxWidth={W}
        viewBoxHeight={height}
        ariaLabel="연령별 성별 인구 피라미드"
      >
        {rows.map((row, index) => {
          const y = index * (ROW_H + GAP)
          const maleW = row.male === null ? 0 : (row.male / max) * half
          const femaleW = row.female === null ? 0 : (row.female / max) * half
          return (
            <g key={row.ageLabel}>
              <rect
                x={centerLeft - maleW}
                y={y}
                width={maleW}
                height={ROW_H}
                rx={4}
                fill={MALE_TOKEN}
              >
                <title>{`${row.ageLabel} 남성 ${formatAnalysisValue(row.male, unit)}`}</title>
              </rect>
              <rect
                x={centerRight}
                y={y}
                width={femaleW}
                height={ROW_H}
                rx={4}
                fill={FEMALE_TOKEN}
              >
                <title>{`${row.ageLabel} 여성 ${formatAnalysisValue(row.female, unit)}`}</title>
              </rect>
              <text
                x={W / 2}
                y={y + ROW_H / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={700}
                fill="var(--color-text-900)"
              >
                {row.ageLabel}
              </text>
              <text
                x={centerLeft - maleW - 6}
                y={y + ROW_H / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--color-text-600)"
              >
                {formatAnalysisValue(row.male, unit)}
              </text>
              <text
                x={centerRight + femaleW + 6}
                y={y + ROW_H / 2}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--color-text-600)"
              >
                {formatAnalysisValue(row.female, unit)}
              </text>
            </g>
          )
        })}
      </ChartFrame>
    </div>
  )
}
