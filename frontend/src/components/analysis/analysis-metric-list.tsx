import styled from 'styled-components'

import {
  formatAnalysisValue,
  getMetricMaximum,
  type AnalysisMetricRow,
} from '@/lib/analysis/presentation'

export type AnalysisMetricListProps = {
  rows: readonly AnalysisMetricRow[]
  unit?: string
}

const List = styled.ul`
  display: grid;
  min-width: 0;
  max-width: 100%;
  gap: 14px;
`

const Row = styled.li`
  display: grid;
  grid-template-columns: minmax(70px, 0.45fr) minmax(120px, 1fr) auto;
  align-items: center;
  gap: 12px;

  @media (max-width: 520px) {
    grid-template-columns: 68px minmax(80px, 1fr);
  }
`

const Label = styled.span`
  overflow: hidden;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Track = styled.div`
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-border-200);
`

const Fill = styled.div<{ $width: number }>`
  width: ${props => `${props.$width}%`};
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary-600);
`

const Value = styled.strong`
  min-width: 92px;
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 800;
  text-align: right;

  @media (max-width: 520px) {
    grid-column: 2;
    min-width: 0;
    margin-top: -7px;
    text-align: left;
  }
`

export default function AnalysisMetricList({
  rows,
  unit = '',
}: AnalysisMetricListProps) {
  const maximum = getMetricMaximum(rows)

  return (
    <List>
      {rows.map(row => {
        const width =
          row.value === null || maximum <= 0
            ? 0
            : Math.max(3, (row.value / maximum) * 100)
        return (
          <Row key={row.label}>
            <Label>{row.label}</Label>
            <Track
              role={row.value === null ? undefined : 'progressbar'}
              aria-label={`${row.label} ${formatAnalysisValue(row.value, unit)}`}
              aria-valuemin={row.value === null ? undefined : 0}
              aria-valuemax={row.value === null ? undefined : maximum}
              aria-valuenow={row.value ?? undefined}
            >
              <Fill $width={width} />
            </Track>
            <Value>{formatAnalysisValue(row.value, unit)}</Value>
          </Row>
        )
      })}
    </List>
  )
}
