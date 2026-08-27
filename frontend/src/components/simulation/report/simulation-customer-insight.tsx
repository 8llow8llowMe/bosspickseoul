'use client'

import styled from 'styled-components'

import DonutChart from '@/components/analysis/charts/donut-chart'
import HorizontalBarChart from '@/components/analysis/charts/horizontal-bar-chart'
import {
  describeAgeSalesScope,
  describeSimulationPeriod,
  formatSalesAmountCompact,
  toAgeSalesRows,
  toGenderSalesSegments,
} from '@/lib/simulation/report-presentation'
import type {
  SimulationCondition,
  SimulationGenderAgeAnalysis,
} from '@/types/simulation'

export type SimulationCustomerInsightProps = {
  condition: SimulationCondition
  analysis: SimulationGenderAgeAnalysis
}

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
`

const Head = styled.header`
  display: grid;
  gap: 4px;

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }

  p {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  align-items: center;
  gap: 20px;

  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const SubTitle = styled.h3`
  margin-bottom: 8px;
  color: var(--color-text-800);
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
  word-break: keep-all;
`

/**
 * 고객 참고 지표.
 *
 * 이 섹션의 수치는 사용자 점포의 예상 매출이 아니다. 원천이 `sales_district` 라
 * 자치구×업종 전체의 분기 매출이고, dev 실측이 273억원 수준이다. 범위를 밝히지 않으면
 * 창업 비용을 계산하러 온 사용자가 자기 매출로 읽는다 — 그래서 범위 문구를 섹션 부제와
 * 막대 차트 소제목 양쪽에 넣고, 값은 억 단위로 축약한다.
 */
export default function SimulationCustomerInsight({
  condition,
  analysis,
}: SimulationCustomerInsightProps) {
  const scope = describeAgeSalesScope(condition)
  const period = describeSimulationPeriod(condition.periodCode)

  return (
    <Root aria-label="고객 참고 지표">
      <Head>
        <h2>고객 참고 지표</h2>
        <p>
          {scope}
          {period ? ` · ${period}` : ''}
        </p>
      </Head>

      <Layout>
        <div>
          <SubTitle>성별 매출 비중</SubTitle>
          <DonutChart
            segments={toGenderSalesSegments(analysis)}
            ariaLabel="성별 매출 비중"
            unit="%"
          />
        </div>

        <div>
          <SubTitle>연령대별 매출 — {scope}</SubTitle>
          <HorizontalBarChart
            items={toAgeSalesRows(analysis)}
            unit="원"
            ariaLabel={`연령대별 매출 (${scope})`}
            valueFormatter={formatSalesAmountCompact}
          />
        </div>
      </Layout>
    </Root>
  )
}
