'use client'

import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import styled from 'styled-components'

import { Badge } from '@/components/ui/badge'
import { formatLargeWon } from '@/lib/format'
import { formatDataBaseYearNotice } from '@/lib/simulation/report-sections'
import type { SimulationReport } from '@/types/simulation'

export type SimulationReportSummaryProps = {
  report: SimulationReport
  /** 저장·비교 CTA. B1 에서는 넘기지 않는다(B2·B3 이 채운다). */
  actions?: ReactNode
}

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;
  box-shadow: var(--shadow-level-2);

  @media (max-width: 640px) {
    padding: 20px;
  }
`

const Caption = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Headline = styled.p`
  color: var(--color-text-900);
  font-size: 30px;
  font-weight: 750;
  line-height: 40px;
  font-variant-numeric: tabular-nums;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 26px;
    line-height: 36px;
  }
`

const Conditions = styled.dl`
  display: grid;
  border-top: 1px solid var(--color-border-200);
  padding-top: 12px;

  > div {
    min-width: 0;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 0;
  }

  dt {
    flex: 0 0 auto;
    color: var(--color-text-caption);
    font-size: 13px;
    line-height: 20px;
  }

  dd {
    min-width: 0;
    color: var(--color-text-900);
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
    text-align: right;
    word-break: keep-all;
  }
`

const Notice = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 12px;
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;

  svg {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    margin-top: 2px;
    color: var(--color-text-caption);
    stroke: currentColor;
  }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button,
  a {
    flex: 1 1 160px;
  }
`

/**
 * 리포트 헤드라인 — 총 창업 비용과 그 조건.
 *
 * 권리금은 여기 없다. 총비용에 포함되지 않는 값이라 헤드라인 옆에 두면 합계로 읽힌다(G5).
 */
export default function SimulationReportSummary({
  report,
  actions,
}: SimulationReportSummaryProps) {
  const { condition } = report

  return (
    <Root aria-label="예상 총 창업 비용">
      <div>
        <Caption>예상 총 창업 비용</Caption>
        <Headline>{formatLargeWon(report.totalPrice)}</Headline>
      </div>

      <div>
        <Badge $tone="blue">
          {condition.franchisee ? '프랜차이즈' : '개인 창업'}
        </Badge>
      </div>

      <Conditions>
        <div>
          <dt>자치구</dt>
          <dd>{condition.districtName}</dd>
        </div>
        <div>
          <dt>업종</dt>
          <dd>{condition.serviceName}</dd>
        </div>
        {condition.brandName ? (
          <div>
            <dt>브랜드</dt>
            <dd>{condition.brandName}</dd>
          </div>
        ) : null}
        <div>
          <dt>매장 크기</dt>
          <dd>{condition.storeSize.toLocaleString()}㎡</dd>
        </div>
        <div>
          <dt>층 구분</dt>
          <dd>{condition.floorType.name}</dd>
        </div>
      </Conditions>

      <Notice>
        <Info aria-hidden="true" />
        <span>{formatDataBaseYearNotice(report.dataBaseYear)}</span>
      </Notice>

      {actions ? <Actions>{actions}</Actions> : null}
    </Root>
  )
}
