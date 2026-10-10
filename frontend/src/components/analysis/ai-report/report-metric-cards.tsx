'use client'

import styled from 'styled-components'
import type {
  MetricCardModel,
  MetricTone,
} from '@/lib/analysis/report-section-state'
import { CHANGE_TONE_TEXT_COLOR } from '@/lib/metrics/metric-polarity'

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

  /* 라벨만이다 — 값 안의 화살표 span 까지 캡션 크기로 줄이지 않는다. */
  > span {
    color: var(--color-text-caption);
    font-size: 12px;
  }
`

/*
  값은 글자다(17·19px). grey100 카드 위 green500·red500 은 2.5 / 3.4:1 이라 -text 토큰을 쓴다.
  색은 오름·내림이 아니라 **좋고 나쁨**이다(DESIGN.md §Charts, D-1) — `tone` 은 지표 극성으로
  이미 판정돼 들어온다. 판단하지 않는 값(보합·데이터 없음·tone 없음)은 본문 색이다.
*/
const toneColor = (tone?: MetricTone) =>
  tone === 'positive' || tone === 'negative'
    ? CHANGE_TONE_TEXT_COLOR[tone]
    : 'var(--color-text-900)'

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

const ValueLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 6px;
`

/** 「개선」·「악화」. 색만으로 좋고 나쁨을 전하지 않는다(WCAG 1.4.1). 글자색은 값과 같다. */
const ToneLabel = styled.em<{ $tone?: MetricTone }>`
  color: ${props => toneColor(props.$tone)};
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
  line-height: 18px;
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
          <ValueLine>
            <Value $tone={card.tone} $variant={variant} $pending={card.loading}>
              {card.arrow ? (
                <span aria-hidden="true">{card.arrow} </span>
              ) : null}
              {card.display}
            </Value>
            {card.toneLabel ? (
              <ToneLabel $tone={card.tone}>{card.toneLabel}</ToneLabel>
            ) : null}
          </ValueLine>
        </Card>
      ))}
    </Grid>
  )
}
