'use client'

import styled from 'styled-components'

import { toShares } from '@/lib/analysis/chart-data'

import { formatChartValue } from './chart-theme'

/*
  두세 조각짜리 구성비를 한 줄 100% 막대로 그린다.

  성비 같은 두 조각을 도넛으로 그리면 카드 하나를 통째로 쓰면서 읽을 수 있는 것은 숫자
  두 개뿐이었다(결과 화면 「성별 매출 건수」·「성별 상주인구」). 길이 비교는 각도 비교보다
  정확하고, 한 줄이라 이웃 차트 카드 아래에 붙일 수 있다.
*/

const Wrap = styled.div`
  display: grid;
  gap: 8px;
`

const Title = styled.p`
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Track = styled.div`
  display: flex;
  overflow: hidden;
  height: 14px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  gap: 2px;
`

const Segment = styled.span<{ $share: number; $color: string }>`
  flex: 0 0 ${props => props.$share}%;
  background: ${props => props.$color};
`

const Legend = styled.ul`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-text-700);
    font-size: 12px;
    line-height: 18px;
    font-variant-numeric: tabular-nums;
  }

  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  strong {
    color: var(--color-text-900);
    font-weight: 700;
  }
`

const Empty = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
`

export type ShareBarSegment = { label: string; value: number; color: string }

export type ShareBarProps = {
  segments: readonly ShareBarSegment[]
  /** 값 단위. `%` 면 비율만, 그 밖이면 비율 옆에 값도 적는다(「45% · 1,234건」). */
  unit: string
  /** 막대 위 작은 제목(예: 「성별 결제 건수」). */
  title?: string
  ariaLabel: string
  valueFormatter?: (value: number) => string
}

export default function ShareBar({
  segments,
  unit,
  title,
  ariaLabel,
  valueFormatter,
}: ShareBarProps) {
  const shares = toShares(segments.map(segment => segment.value))
  const hasData = shares.some(share => share > 0)
  const formatValue = (value: number): string =>
    valueFormatter ? valueFormatter(value) : formatChartValue(value, unit)
  const describe = (index: number): string =>
    unit === '%'
      ? `${segments[index].label} ${shares[index]}%`
      : `${segments[index].label} ${shares[index]}% · ${formatValue(segments[index].value)}`

  return (
    <Wrap>
      {title ? <Title>{title}</Title> : null}
      {hasData ? (
        <>
          <Track
            role="img"
            aria-label={`${ariaLabel}: ${segments.map((_, index) => describe(index)).join(', ')}`}
          >
            {segments.map((segment, index) =>
              shares[index] > 0 ? (
                <Segment
                  key={segment.label}
                  $share={shares[index]}
                  $color={segment.color}
                />
              ) : null,
            )}
          </Track>
          <Legend aria-hidden>
            {segments.map((segment, index) => (
              <li key={segment.label}>
                <i style={{ background: segment.color }} />
                {segment.label}
                <strong>{shares[index]}%</strong>
                {unit === '%' ? null : (
                  <span>{formatValue(segment.value)}</span>
                )}
              </li>
            ))}
          </Legend>
        </>
      ) : (
        <Empty>데이터 없음</Empty>
      )}
    </Wrap>
  )
}
