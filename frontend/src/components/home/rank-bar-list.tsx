'use client'

import Link from 'next/link'
import styled from 'styled-components'

export type RankBarRow = {
  key: string
  rank: number
  name: string
  /** 막대 길이 계산에 쓰는 원값. 음수는 0 으로 본다. */
  value: number
  /** 포맷이 끝난 표시용 문자열. 이 부품은 포맷하지 않는다. */
  valueLabel: string
  /** 변화율 표시 문자열. 없으면 배지를 그리지 않는다. */
  changeLabel?: string
  /** 변화 방향. `changeLabel` 이 있을 때만 본다. */
  changeDirection?: 'up' | 'down'
  href?: string
  ariaLabel?: string
}

export type RankBarListProps = {
  rows: readonly RankBarRow[]
  /** 이 키의 행을 강조한다(인사이트 문장이 가리키는 행). */
  highlightKey?: string | null
  ariaLabel: string
}

const List = styled.ol`
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Row = styled.li<{ $highlighted: boolean }>`
  display: grid;
  grid-template-columns: 18px minmax(64px, auto) minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 6px 8px;
  border-radius: var(--radius-control);
  background: ${p =>
    p.$highlighted ? 'var(--color-primary-100)' : 'transparent'};

  /* RowLink 는 grid 레이아웃을 유지하려고 display:contents 를 쓴다 — 박스가
     없어 전역 :focus-visible 아웃라인(global-styles.ts)이 앵커 자신에게는
     그려지지 않는다. 실제 박스를 가진 이 행(li)에 대신 그린다. */
  &:has(a:focus-visible) {
    outline: 2px solid var(--color-blue-500);
    outline-offset: 2px;
  }
`

const RowLink = styled(Link)`
  display: contents;
`

const Rank = styled.span`
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-caption);
`

const Name = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-900);
  white-space: nowrap;
`

const Track = styled.span`
  display: block;
  height: 14px;
  border-radius: var(--radius-control);
  background: var(--color-background-muted);
  overflow: hidden;
`

const Fill = styled.span`
  display: block;
  height: 100%;
  border-radius: var(--radius-control);
  background: var(--color-primary-600);
  transition: width var(--motion-slow) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Value = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-600);
  white-space: nowrap;
`

const Change = styled.span<{ $direction: 'up' | 'down' }>`
  margin-left: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${p =>
    p.$direction === 'up' ? 'var(--color-positive)' : 'var(--color-negative)'};
`

/** 1위 대비 비율. 최대값이 0 이하면 나눗셈을 하지 않는다(NaN 방지). */
export const barPercent = (value: number, max: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0
  return Math.max(0, Math.min(100, (value / max) * 100))
}

export default function RankBarList({
  rows,
  highlightKey = null,
  ariaLabel,
}: RankBarListProps) {
  const max = Math.max(0, ...rows.map(row => (row.value > 0 ? row.value : 0)))

  return (
    <List aria-label={ariaLabel}>
      {rows.map(row => {
        const percent = barPercent(row.value, max)
        const body = (
          <>
            <Rank aria-hidden="true">{row.rank}</Rank>
            <Name>{row.name}</Name>
            <Track aria-hidden="true">
              <Fill style={{ width: `${percent}%` }} />
            </Track>
            <Value>
              {row.valueLabel}
              {row.changeLabel ? (
                <Change $direction={row.changeDirection ?? 'up'}>
                  {row.changeLabel}
                </Change>
              ) : null}
            </Value>
          </>
        )

        return (
          <Row
            key={row.key}
            $highlighted={row.key === highlightKey}
            aria-current={row.key === highlightKey ? 'true' : undefined}
          >
            {row.href ? (
              <RowLink href={row.href} aria-label={row.ariaLabel}>
                {body}
              </RowLink>
            ) : (
              body
            )}
          </Row>
        )
      })}
    </List>
  )
}
