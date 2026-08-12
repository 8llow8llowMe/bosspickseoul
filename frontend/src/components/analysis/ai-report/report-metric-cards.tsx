'use client'

import styled, { keyframes } from 'styled-components'
import type {
  MetricCardModel,
  MetricTone,
} from '@/lib/analysis/report-section-state'

const shimmer = keyframes`
  0% {
    opacity: 0.6;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.6;
  }
`

const Grid = styled.div<{ $variant: 'full' | 'compact' }>`
  display: grid;
  grid-template-columns: ${props =>
    props.$variant === 'compact' ? '1fr' : 'repeat(4, minmax(0, 1fr))'};
  gap: 10px;

  @media (max-width: 680px) {
    grid-template-columns: ${props =>
      props.$variant === 'compact' ? '1fr' : 'repeat(2, minmax(0, 1fr))'};
  }
`

const Card = styled.div`
  display: grid;
  gap: 6px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 16px;

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

const Value = styled.strong<{ $tone?: MetricTone }>`
  color: ${props => toneColor(props.$tone)};
  font-size: 19px;
  font-weight: 750;
  line-height: 28px;
`

const Skeleton = styled.div`
  width: 60%;
  height: 22px;
  border-radius: var(--radius-compact);
  background: var(--color-border-300);
  animation: ${shimmer} 1.2s var(--ease-standard) infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
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
        <Card key={card.label} aria-busy={card.loading}>
          <span>{card.label}</span>
          {card.loading ? (
            <Skeleton aria-hidden />
          ) : (
            <Value $tone={card.tone}>{card.display}</Value>
          )}
        </Card>
      ))}
    </Grid>
  )
}
