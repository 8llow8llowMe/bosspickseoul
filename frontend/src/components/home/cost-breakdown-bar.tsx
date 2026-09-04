'use client'

import styled from 'styled-components'

/**
 * 대표 예시 수치 — 실데이터가 아니다.
 *
 * 실 API 를 쓰지 않는 이유: `POST /simulations/reports` 는 쓰기 동사이고
 * `store-sizes` GET 이 선행돼야 해서, 랜딩 방문자마다 계산 요청이 나간다.
 * 데모 하나가 치를 값이 아니다.
 */
const REVENUE = 4200

/**
 * 매출이 어디로 가는가. **넷을 합치면 매출과 정확히 같다** — 매출은 또 하나의
 * 세그먼트가 아니라 막대의 "전체"이므로 헤더로 따로 적는다.
 *
 * 이전 구현(`CostWaterfall`)은 이름만 워터폴이고 렌더는 독립 막대 5개였다. 각
 * 막대가 앞 막대가 끝난 지점에서 시작하지 않아 4,200 − 1,050 − 1,200 − 350 =
 * 1,600 이라는 관계가 화면에 존재하지 않고 독자가 암산해야 했다.
 */
const SEGMENTS = [
  { key: 'rent', label: '임차료', amount: 1050, kind: 'cost' },
  { key: 'labor', label: '인건비', amount: 1200, kind: 'cost' },
  { key: 'etc', label: '기타', amount: 350, kind: 'cost' },
  { key: 'net', label: '순이익', amount: 1600, kind: 'net' },
] as const

/*
  색은 두 가지뿐이다 — 기존 `kind: 'cost'`·`kind: 'net'` 색을 그대로 계승한다.
  비용 3항목끼리는 색이 아니라 세그먼트 구분선과 범례 순서로 구분한다: 카테고리
  3개에 억지로 3가지 색을 배정하면 없는 의미 차이를 암시한다.
*/
const COST_COLOR = 'var(--color-border-200)'
const NET_COLOR = 'var(--color-primary-600)'

const segmentColor = (kind: 'cost' | 'net'): string =>
  kind === 'net' ? NET_COLOR : COST_COLOR

/** 소수점 1자리 백분율. 반올림 후에도 네 값의 합이 100.0 이다. */
export const segmentShare = (amount: number, total: number): number =>
  Math.round((amount / total) * 1000) / 10

const Wrap = styled.div`
  display: grid;
  gap: 10px;
`

const Head = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`

const HeadLabel = styled.span`
  font-size: 12px;
  color: var(--color-text-600);
`

const HeadAmount = styled.span`
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-900);
`

const Bar = styled.div`
  display: flex;
  height: 40px;
  border-radius: var(--radius-control);
  overflow: hidden;
`

/*
  마지막 세그먼트에는 구분선을 두지 않는다 — 막대 오른쪽 끝에 선이 남는다.
*/
const Segment = styled.span`
  display: block;
  height: 100%;
  border-right: 1px solid var(--color-surface);

  &:last-child {
    border-right: none;
  }
`

/* 범례 순서는 세그먼트 순서와 같다 — 다르면 위치 대응이 깨진다. */
const Legend = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const LegendItem = styled.li`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-600);
`

const Swatch = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 2px;
`

const LegendAmount = styled.span`
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-700);
`

const LegendShare = styled.span`
  font-variant-numeric: tabular-nums;
  color: var(--color-text-caption);
`

const Caption = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--color-text-caption);
`

export default function CostBreakdownBar() {
  return (
    <Wrap>
      <Head aria-hidden="true">
        <HeadLabel>월매출</HeadLabel>
        <HeadAmount>{REVENUE.toLocaleString('ko-KR')}만원</HeadAmount>
      </Head>
      <Bar
        role="img"
        aria-label="월 손익 구조 예시. 월매출 4,200만원에서 임차료·인건비·기타를 빼면 순이익 1,600만원입니다."
      >
        {SEGMENTS.map(segment => (
          <Segment
            key={segment.key}
            aria-hidden="true"
            style={{
              width: `${segmentShare(segment.amount, REVENUE)}%`,
              background: segmentColor(segment.kind),
            }}
          />
        ))}
      </Bar>
      {/*
        라벨을 막대 밖에 두면 「기타」가 8.3% 로 얇아도 읽힌다 — 세로 막대에서는
        그 막대 자체가 13px 라 값을 얹기 어려웠다.
      */}
      <Legend aria-hidden="true">
        {SEGMENTS.map(segment => (
          <LegendItem key={segment.key}>
            <Swatch style={{ background: segmentColor(segment.kind) }} />
            {segment.label}
            <LegendAmount>
              {segment.amount.toLocaleString('ko-KR')}
            </LegendAmount>
            <LegendShare>
              {segmentShare(segment.amount, REVENUE).toFixed(1)}%
            </LegendShare>
          </LegendItem>
        ))}
      </Legend>
      <Caption>단위: 만원 · 대표 예시 데이터</Caption>
    </Wrap>
  )
}
