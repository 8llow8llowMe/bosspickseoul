'use client'

import styled from 'styled-components'

import DonutChart from '@/components/analysis/charts/donut-chart'
import { toDonutSlices } from '@/lib/analysis/chart-data'
import { formatLargeWon } from '@/lib/format'
import {
  COST_COLORS,
  describeCostRounding,
  toCostBreakdown,
} from '@/lib/simulation/report-presentation'
import type { SimulationReport } from '@/types/simulation'
import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

export type SimulationCostBreakdownProps = { report: SimulationReport }

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;

  @media ${SIMULATION_MEDIA.mobile} {
    padding: 20px;
  }

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }
`

/*
  도넛 칸은 240px 로 둔다. 도넛 높이가 180px 고정이라 400px 칸은 좌우가 비고, 그만큼
  행 쪽이 좁아져 비중·설명을 붙일 자리가 없었다.
*/
const Layout = styled.div`
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  align-items: center;
  gap: 24px;

  @media ${SIMULATION_MEDIA.mobile} {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
`

const Rows = styled.dl`
  display: grid;

  > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--color-border-200);
    padding: 10px 0;
  }

  dt {
    min-width: 0;
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr);
    column-gap: 8px;
    align-items: baseline;
  }

  dd {
    flex: 0 0 auto;
    display: grid;
    justify-items: end;
    text-align: right;
  }
`

/* 색 점은 범례 역할이다. 도넛 자체 범례는 끄고 이 행이 그 자리를 맡는다. */
const Swatch = styled.i<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: ${props => props.$color};
`

const Label = styled.span`
  color: var(--color-text-700);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const Hint = styled.span`
  grid-column: 2;
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  word-break: keep-all;
`

const Amount = styled.strong`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  line-height: 24px;
  font-variant-numeric: tabular-nums;
`

const Share = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
`

/*
  합계 행. 총액은 화면 맨 위 헤드라인에도 있지만, 항목 바로 아래에 있어야 「이 넷을
  더하면 저 값」이라는 관계가 보인다. 행 목록과는 마지막 항목 행의 아랫줄로 갈린다.

  `&&` 로 명시도를 올린다. Rows 의 `> div`·`dt` 규칙과 명시도가 같으면 주입 순서에 따라
  결과가 갈리는데, 특히 dt 가 색 점 칸(10px) 격자를 물려받으면 「합계」 글자가 그 칸에 갇힌다.
*/
const TotalRow = styled.div`
  && {
    border-bottom: none;
    padding-top: 12px;
  }

  && dt {
    display: block;
    color: var(--color-text-900);
    font-size: 14px;
    font-weight: 700;
    line-height: 22px;
  }

  && dd {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
    font-variant-numeric: tabular-nums;
  }
`

const Footnote = styled.p`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  word-break: keep-all;
`

/**
 * 비용 구성. 항목 행(색 점 · 라벨 · 설명 · 금액 · 비중) 아래에 **합계 행**을 둬서 사용자가
 * 총액을 직접 검산할 수 있게 한다. 보증금이 「월 임대료 10개월분」이라는 사실은 행 설명에
 * 둔다 — V1 이 이 값을 「월 최소 목표 매출」로 잘못 표기했던 자리다.
 */
export default function SimulationCostBreakdown({
  report,
}: SimulationCostBreakdownProps) {
  const rows = toCostBreakdown(report)
  // 비중은 도넛과 같은 함수로 낸다. 따로 계산하면 반올림이 달라 도넛 툴팁과 행이 1% 어긋난다.
  const slices = toDonutSlices(
    rows.map(row => ({ label: row.label, value: row.amount })),
  )
  const roundingNote = describeCostRounding(report)

  return (
    <Root aria-label="비용 구성">
      <h2>비용 구성</h2>

      <Layout>
        <DonutChart
          segments={rows.map(row => ({ label: row.label, value: row.amount }))}
          colors={rows.map(row => COST_COLORS[row.key])}
          legend={false}
          dataTable={false}
          ariaLabel="비용 구성 비율"
          valueFormatter={formatLargeWon}
        />

        {/*
          라벨·설명, 금액·비중 사이의 {' '} 는 낭독용이다. 붙여 쓰면 「첫 달 임대료이후 매달…」
          「326만원1%」로 이어 읽힌다. 두 칸 모두 grid 라 공백만 있는 텍스트는 배치에 끼지 않는다.
        */}
        <Rows>
          {rows.map((row, index) => (
            <div key={row.key}>
              <dt>
                <Swatch $color={COST_COLORS[row.key]} aria-hidden="true" />
                <Label>{row.label}</Label>
                {row.hint ? (
                  <>
                    {' '}
                    <Hint>{row.hint}</Hint>
                  </>
                ) : null}
              </dt>
              <dd>
                <Amount>{formatLargeWon(row.amount)}</Amount>{' '}
                <Share>{slices[index]?.percent ?? 0}%</Share>
              </dd>
            </div>
          ))}
          <TotalRow>
            <dt>합계 · 예상 총 창업 비용</dt>
            <dd>{formatLargeWon(report.totalPrice)}</dd>
          </TotalRow>
        </Rows>
      </Layout>

      <Footnote>
        {`${roundingNote} 권리금은 총 창업 비용에 포함되지 않아요.`}
      </Footnote>
    </Root>
  )
}
