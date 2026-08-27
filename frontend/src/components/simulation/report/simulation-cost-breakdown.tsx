'use client'

import styled from 'styled-components'

import DonutChart from '@/components/analysis/charts/donut-chart'
import { formatLargeWon } from '@/lib/format'
import { toCostBreakdown } from '@/lib/simulation/report-presentation'
import type { SimulationReport } from '@/types/simulation'

export type SimulationCostBreakdownProps = { report: SimulationReport }

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;

  @media (max-width: 640px) {
    padding: 20px;
  }

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: 400px minmax(0, 1fr);
  align-items: center;
  gap: 20px;

  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
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

  > div:last-child {
    border-bottom: none;
  }

  dt {
    color: var(--color-text-600);
    font-size: 14px;
    line-height: 22px;
  }

  dd {
    color: var(--color-text-900);
    font-size: 15px;
    font-weight: 700;
    line-height: 24px;
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
 * 비용 구성. 보증금이 "월 임대료 10개월분"이라는 사실을 각주로 밝힌다 —
 * V1 이 이 값을 "월 최소 목표 매출"로 잘못 표기했던 자리다.
 */
export default function SimulationCostBreakdown({
  report,
}: SimulationCostBreakdownProps) {
  const rows = toCostBreakdown(report)

  return (
    <Root aria-label="비용 구성">
      <h2>비용 구성</h2>

      <Layout>
        <DonutChart
          segments={rows.map(row => ({ label: row.label, value: row.amount }))}
          ariaLabel="비용 구성 비율"
          valueFormatter={formatLargeWon}
        />

        <Rows>
          {rows.map(row => (
            <div key={row.key}>
              <dt>{row.label}</dt>
              <dd>{formatLargeWon(row.amount)}</dd>
            </div>
          ))}
        </Rows>
      </Layout>

      <Footnote>
        보증금은 월 임대료의 10개월분으로 계산했어요. 권리금은 총 창업 비용에
        포함되지 않아요.
      </Footnote>
    </Root>
  )
}
