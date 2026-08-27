'use client'

import styled from 'styled-components'
import type {
  MetricCardModel,
  MetricTone,
} from '@/lib/analysis/report-section-state'

const Grid = styled.div<{ $variant: 'full' | 'compact' }>`
  display: grid;
  grid-template-columns: ${props =>
    props.$variant === 'compact'
      ? 'repeat(2, minmax(0, 1fr))'
      : 'repeat(4, minmax(0, 1fr))'};
  gap: 10px;

  @media (max-width: 680px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const Card = styled.div<{ $variant: 'full' | 'compact' }>`
  display: grid;
  gap: 6px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: ${props => (props.$variant === 'compact' ? '12px' : '16px')};

  span {
    color: var(--color-text-caption);
    font-size: 12px;
  }
`

const toneColor = (tone?: MetricTone) => {
  if (tone === 'positive') return 'var(--color-positive)'
  if (tone === 'negative') return 'var(--color-negative)'
  return 'var(--color-text-900)'
}

/**
 * 로딩 중에는 값 대신 `--`(`METRIC_PENDING_DISPLAY`)가 들어온다 — skeleton 블록을 쓰지
 * 않는다(DESIGN.md §4-8). 자리는 그대로 두되 색만 캡션 그레이로 낮춰, 도착한 값과
 * 아직 오지 않은 자리가 한눈에 구분되게 한다.
 */
const Value = styled.strong<{
  $tone?: MetricTone
  $variant: 'full' | 'compact'
  $pending: boolean
}>`
  color: ${props =>
    props.$pending ? 'var(--color-text-caption)' : toneColor(props.$tone)};
  font-size: ${props => (props.$variant === 'compact' ? '17px' : '19px')};
  font-weight: 700;
  line-height: ${props => (props.$variant === 'compact' ? '24px' : '28px')};
`

export default function ReportMetricCards({
  cards,
  variant = 'full',
}: {
  cards: MetricCardModel[]
  variant?: 'full' | 'compact'
}) {
  return (
    <Grid $variant={variant}>
      {cards.map(card => (
        <Card key={card.label} $variant={variant} aria-busy={card.loading}>
          <span>{card.label}</span>
          <Value $tone={card.tone} $variant={variant} $pending={card.loading}>
            {card.display}
          </Value>
        </Card>
      ))}
    </Grid>
  )
}
