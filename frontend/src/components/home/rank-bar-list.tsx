'use client'

import Link from 'next/link'
import styled, { css } from 'styled-components'

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

const Row = styled.li`
  display: block;
`

/*
 * href 유무로 그리드 정의가 갈리면 링크 행과 비링크 행의 열이 어긋난다.
 * 링크 자신(<a>)과 비링크 박스(<div>)가 이 스타일을 그대로 공유한다.
 *
 * 처음엔 <a> 에 display:contents 를 줘서 자식만 그리드 트랙에 놓으려 했는데,
 * display:contents 인 요소는 박스를 만들지 않아 실제 브라우저에서 키보드
 * 포커스 자체가 그 요소에 도달하지 못했다(getBoundingClientRect 가 전부 0,
 * document.activeElement 도 다른 요소를 가리킴 — display 만 flex 로 바꾸면
 * 바로 포커스가 됐다). 랭킹 링크가 이 섹션의 주 CTA 라 키보드 사용자가
 * 아예 못 누르는 상태였다. 링크 자신이 그리드 컨테이너가 되는 지금 구조는
 * 이 문제가 없다.
 */
const rowGridStyles = css<{ $highlighted: boolean }>`
  display: grid;
  grid-template-columns: 18px minmax(64px, auto) minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 6px 8px;
  border-radius: var(--radius-control);
  background: ${p =>
    p.$highlighted ? 'var(--color-primary-100)' : 'transparent'};
`

const RowLink = styled(Link)<{ $highlighted: boolean }>`
  ${rowGridStyles}
  color: inherit;
  text-decoration: none;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }
`

const RowContent = styled.div<{ $highlighted: boolean }>`
  ${rowGridStyles}
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

        const highlighted = row.key === highlightKey

        return (
          <Row key={row.key}>
            {row.href ? (
              <RowLink
                href={row.href}
                aria-label={row.ariaLabel}
                $highlighted={highlighted}
                aria-current={highlighted ? 'true' : undefined}
              >
                {body}
              </RowLink>
            ) : (
              <RowContent
                $highlighted={highlighted}
                aria-current={highlighted ? 'true' : undefined}
              >
                {body}
              </RowContent>
            )}
          </Row>
        )
      })}
    </List>
  )
}
