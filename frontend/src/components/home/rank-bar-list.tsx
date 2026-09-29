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
   * - `card` — 순위를 배지로 키우고 행을 52px 로 띄운 **카드 한 장 안의 목록**.
   *   「지금 많이 본 지역」처럼 **한 섹션을 통째로 쓰는** 자리용.
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

/*
  카드 변형은 **카드 한 장 안의 목록**이다. 예전엔 행마다 테두리를 둘러 카드가 8장
  쌓였는데, 셸 폭에서 행 하나가 900px 가까이 늘어나 이름과 값이 800px 떨어졌다
  (폭 체계 §5 「리스트 행」). 테두리는 목록이 한 번만 두르고 행 사이는 구분선으로 가른다.
*/
const CardList = styled(List)`
  gap: 0;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  overflow: hidden;

  > li + li {
    border-top: 1px solid var(--color-border-200);
  }
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
  카드 변형의 행. 데스크톱은 **한 줄**(배지 · 이름 · 막대 · 값)이다.

  막대 칸은 360px 상한이다(폭 체계 §Charts 「미터 행 → 360px」). 예전엔 막대가 이름
  아래 제 줄에서 행 전폭을 써 1920 에서 약 850px · 두께 8px 로 약 100:1 까지 갔다.
  남는 폭은 이름 칸(1fr)이 가져가서 막대와 값은 오른쪽에 붙어 있고 눈으로 잇기 쉽다.

  좁은 폭(≤640)에서는 막대가 이름을 밀어내지 않게 두 줄로 접는다 — 위에 이름과 값,
  아래에 막대. 360 상한을 한 줄로 고집하면 335px 칸에서 이름 칸이 0 이 된다.
*/
const cardGridStyles = css<{ $highlighted: boolean }>`
  display: grid;
  grid-template-columns: 28px minmax(64px, 1fr) minmax(0, 360px) auto;
  grid-template-areas: 'badge name bar value';
  gap: 12px;
  align-items: center;
  /* 터치 영역(DESIGN.md §8): 리스트 행 52px 이상. */
  min-height: 52px;
  padding: 10px 16px;
  background: ${p =>
    p.$highlighted ? 'var(--color-primary-100)' : 'transparent'};
  transition: background-color var(--motion-fast) var(--ease-standard);

  @media (max-width: 640px) {
    grid-template-columns: 28px minmax(0, 1fr) auto;
    grid-template-areas:
      'badge name value'
      'badge bar bar';
    row-gap: 6px;
  }
`

const CardRowLink = styled(Link)<{ $highlighted: boolean }>`
  ${cardGridStyles}
  color: inherit;
  text-decoration: none;

  &:hover {
    background: ${p =>
      p.$highlighted
        ? 'var(--color-primary-100)'
        : 'var(--color-surface-muted)'};
  }

  /* 목록이 overflow: hidden 이라 바깥 링은 잘린다 — 안쪽으로 그린다. */
  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--color-primary-700);
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
  width: 28px;
  height: 28px;
  border-radius: var(--radius-control);
  background: ${p =>
    p.$top ? 'var(--color-primary-600)' : 'var(--color-surface-muted)'};
  color: ${p => (p.$top ? 'white' : 'var(--color-text-600)')};
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`

const CardName = styled.span`
  grid-area: name;
  min-width: 0;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CardValue = styled.span`
  grid-area: value;
  justify-self: end;
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
  /*
    4위 아래는 회색이다. 예전 primary-100(#e8f3ff)은 트랙 회색 위에서 대비 약 1.05 로
    거의 보이지 않아 4·5위 막대가 없는 것처럼 읽혔다. grey-500 은 트랙(grey-50) 대비 약 2.9 ·
    흰 행 대비 약 3.0 이다(DESIGN.md 면적 채움 3:1). 시맨틱 토큰 중 이 회색으로
    이어지는 것은 뜻이 다른 것뿐이라 팔레트 토큰을 직접 쓴다. 상위 3개만 브랜드색이라는
    위계는 그대로다.
  */
  background: ${p =>
    p.$top ? 'var(--color-primary-600)' : 'var(--color-grey-500)'};
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
              <CardName>{row.name}</CardName>
              <CardValue>
                {row.valueLabel}
                {row.changeLabel ? (
                  <Change $direction={row.changeDirection ?? 'up'}>
                    {row.changeLabel}
                  </Change>
                ) : null}
              </CardValue>
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
