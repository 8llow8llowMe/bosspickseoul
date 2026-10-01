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
import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

export type SimulationReportViewProps = {
  report: SimulationReport
  /** 요약 카드 하단 CTA 슬롯(저장·비교). ≥1024 에서만 보인다. */
  actions?: ReactNode
}

/*
  ≥1024 는 2단이다(R5) — 왼쪽 340px 요약 열(sticky), 오른쪽 섹션들. 한 줄로만 쌓으면 1440 에서
  720px 칸 좌우가 비고, 저장·비교 CTA 가 첫 카드를 지나면 화면에서 사라졌다. 입력 화면 2단과 같은
  문법이고 방향만 반대다 — 리포트는 답(총액)이 먼저라 왼쪽에 둔다. 오른쪽 섹션은 `--w-form`(880)
  에서 멈춘다. top: 96px 는 sticky 사이트 헤더(65px) 아래 여백까지 둔 값이다(입력 화면과 같다).
*/
const Layout = styled.div`
  display: grid;
  grid-template-columns: 340px minmax(0, var(--w-form));
  align-items: start;
  gap: 20px;

  @media ${SIMULATION_MEDIA.belowDesktop} {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
`

const Aside = styled.div`
  min-width: 0;

  /* 세로가 짧은 창(예: 1280×720 에 125% 배율)에서는 붙이지 않는다 — 요약 열이 뷰포트보다 길면
     저장·비교가 화면 밖에 고정된다. 그때는 그냥 흐르게 두어 스크롤로 닿게 한다. */
  @media ${SIMULATION_MEDIA.desktopTall} {
    position: sticky;
    top: 96px;
  }
`

const Sections = styled.div`
  min-width: 0;
  display: grid;
  gap: 16px;
`

/**
 * 리포트 본문 — **순수 표시**다. 네트워크·라우팅을 모른다.
 *
 * 결측 판정은 `report-sections` 의 술어만 쓴다. 여기서 `analysis == null` 을 직접 보면
 * "빈 배열"(그릴 게 없음) 같은 경우가 새어 나와 빈 차트가 그려진다.
 */
export default function SimulationReportView({
  report,
  actions,
}: SimulationReportViewProps) {
  return (
    <Layout>
      <Aside>
        <SimulationReportSummary report={report} actions={actions} />
      </Aside>

      <Sections>
        <SimulationCostBreakdown report={report} />
        <SimulationKeyMoneyCard keyMoney={report.keyMoney} />

        {report.similarFranchisees.length > 0 ? (
          <SimulationSimilarFranchisees
            items={report.similarFranchisees}
            selectedFranchiseeId={report.condition.franchiseeId}
          />
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
    </Layout>
  )
}
