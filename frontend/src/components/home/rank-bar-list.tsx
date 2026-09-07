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
  /**
   * 행의 밀도.
   *
   * - `compact`(기본) — 한 줄에 순위·이름·막대·값을 나란히. 스토리 01 단계처럼 **좁은
   *   패널에 10행**을 넣어야 하는 자리를 위한 것이다.
   * - `card` — 순위를 배지로 키우고 막대를 이름 아래 제 줄에 둔다. 「지금 많이 본 지역」
   *   처럼 **한 섹션을 통째로 쓰는** 자리용.
   *
   * 기본값을 `compact` 로 둔 것은 의도다 — 기존 사용처(01 단계)의 모양이 바뀌지 않는다.
   */
  variant?: 'compact' | 'card'
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

/* 카드 변형은 행마다 테두리가 있어 compact 보다 간격을 넓게 준다. */
const CardList = styled(List)`
  gap: 8px;
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

/*
  카드 변형. 한 줄에 다 넣는 대신 **두 줄**로 나눈다 — 위에 이름과 값, 아래에 막대.
  막대가 제 줄을 가지면 폭을 다 쓰므로 1위와 8위의 차이가 눈에 훨씬 크게 들어온다
  (compact 에서는 이름·값에 폭을 뺏겨 막대가 짧아진다).
*/
const cardGridStyles = css<{ $highlighted: boolean }>`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  grid-template-areas:
    'badge head'
    'badge bar';
  column-gap: 12px;
  row-gap: 6px;
  align-items: center;
  /* 터치 영역(DESIGN.md §8): 리스트 행 52px 이상. */
  min-height: 52px;
  padding: 10px 12px;
  border-radius: var(--radius-control);
  background: ${p =>
    p.$highlighted ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  border: 1px solid
    ${p =>
      p.$highlighted ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard);
`

const CardRowLink = styled(Link)<{ $highlighted: boolean }>`
  ${cardGridStyles}
  color: inherit;
  text-decoration: none;

  &:hover {
    border-color: var(--color-primary-600);
    box-shadow: var(--shadow-level-1);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }
`

const CardRowContent = styled.div<{ $highlighted: boolean }>`
  ${cardGridStyles}
`

/*
  1~3 위만 채운 배지를 준다. 순위표에서 위쪽 몇 개가 먼저 읽히는 것이 자연스러운데,
  전부 같은 모양이면 눈이 1위를 찾는 데도 숫자를 읽어야 한다. 네 번째부터 채우지 않는
  이유는 그 아래로는 등수 차이가 의미를 갖지 않기 때문이다.
*/
const RankBadge = styled.span<{ $top: boolean }>`
  grid-area: badge;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-control);
  background: ${p =>
    p.$top ? 'var(--color-primary-600)' : 'var(--color-surface-muted)'};
  color: ${p => (p.$top ? 'white' : 'var(--color-text-600)')};
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`

const CardHead = styled.span`
  grid-area: head;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
`

const CardName = styled.span`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CardValue = styled.span`
  flex: none;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const CardTrack = styled.span`
  grid-area: bar;
  display: block;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--color-background-muted);
  overflow: hidden;
`

const CardFill = styled.span<{ $top: boolean }>`
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  background: ${p =>
    p.$top ? 'var(--color-primary-600)' : 'var(--color-primary-100)'};
  transition: width var(--motion-slow) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
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

/** 배지·막대를 채워 강조하는 상위 등수. */
const TOP_RANK_LIMIT = 3

export default function RankBarList({
  rows,
  highlightKey = null,
  ariaLabel,
  variant = 'compact',
}: RankBarListProps) {
  const max = Math.max(0, ...rows.map(row => (row.value > 0 ? row.value : 0)))

  if (variant === 'card') {
    return (
      <CardList aria-label={ariaLabel}>
        {rows.map(row => {
          const percent = barPercent(row.value, max)
          const top = row.rank <= TOP_RANK_LIMIT
          const highlighted = row.key === highlightKey
          const body = (
            <>
              <RankBadge $top={top} aria-hidden="true">
                {row.rank}
              </RankBadge>
              <CardHead>
                <CardName>{row.name}</CardName>
                <CardValue>
                  {row.valueLabel}
                  {row.changeLabel ? (
                    <Change $direction={row.changeDirection ?? 'up'}>
                      {row.changeLabel}
                    </Change>
                  ) : null}
                </CardValue>
              </CardHead>
              <CardTrack aria-hidden="true">
                <CardFill $top={top} style={{ width: `${percent}%` }} />
              </CardTrack>
            </>
          )

          return (
            <Row key={row.key}>
              {row.href ? (
                <CardRowLink
                  href={row.href}
                  aria-label={row.ariaLabel}
                  $highlighted={highlighted}
                  aria-current={highlighted ? 'true' : undefined}
                >
                  {body}
                </CardRowLink>
              ) : (
                <CardRowContent
                  $highlighted={highlighted}
                  aria-current={highlighted ? 'true' : undefined}
                >
                  {body}
                </CardRowContent>
              )}
            </Row>
          )
        })}
      </CardList>
    )
  }

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
