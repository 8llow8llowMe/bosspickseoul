'use client'

import type { ReactNode } from 'react'
import styled from 'styled-components'

import SimulationCostBreakdown from '@/components/simulation/report/simulation-cost-breakdown'
import SimulationCustomerInsight from '@/components/simulation/report/simulation-customer-insight'
import SimulationKeyMoneyCard from '@/components/simulation/report/simulation-key-money-card'
import SimulationReportSummary from '@/components/simulation/report/simulation-report-summary'
import SimulationSeasonCard from '@/components/simulation/report/simulation-season-card'
import SimulationSimilarFranchisees from '@/components/simulation/report/simulation-similar-franchisees'
import {
  hasGenderAgeAnalysis,
  hasSeasonAnalysis,
} from '@/lib/simulation/report-sections'
import type { SimulationReport } from '@/types/simulation'

export type SimulationReportViewProps = {
  report: SimulationReport
  /** 헤드라인 카드 하단 CTA 슬롯. B2(저장)·B3(비교에 추가)가 채운다. */
  actions?: ReactNode
}

const Sections = styled.div`
  display: grid;
  gap: 16px;
`

/**
 * 리포트 본문 — **순수 표시**다. 네트워크·라우팅을 모르므로 비교 화면이 그대로 재사용한다.
 *
 * 결측 판정은 `report-sections` 의 술어만 쓴다. 여기서 `analysis == null` 을 직접 보면
 * "빈 배열"(그릴 게 없음) 같은 경우가 새어 나와 빈 차트가 그려진다.
 */
export default function SimulationReportView({
  report,
  actions,
}: SimulationReportViewProps) {
  return (
    <Sections>
      <SimulationReportSummary report={report} actions={actions} />
      <SimulationCostBreakdown report={report} />
      <SimulationKeyMoneyCard keyMoney={report.keyMoney} />

      {report.similarFranchisees.length > 0 ? (
        <SimulationSimilarFranchisees items={report.similarFranchisees} />
      ) : null}

      {hasGenderAgeAnalysis(report.genderAgeAnalysis) ? (
        <SimulationCustomerInsight
          condition={report.condition}
          analysis={report.genderAgeAnalysis}
        />
      ) : null}

      {hasSeasonAnalysis(report.seasonAnalysis) ? (
        <SimulationSeasonCard
          condition={report.condition}
          analysis={report.seasonAnalysis}
        />
      ) : null}
    </Sections>
  )
}
