'use client'

import { Info } from 'lucide-react'
import styled from 'styled-components'

import { Badge } from '@/components/ui/badge'
import { formatLargeWon } from '@/lib/format'
import { formatDataBaseYearNotice } from '@/lib/simulation/report-sections'
import type { SimulationReport } from '@/types/simulation'

export type SimulationResultPreviewProps = {
  report: SimulationReport
}

const Root = styled.section`
  display: grid;
  gap: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;
  box-shadow: var(--shadow-level-2);

  @media (max-width: 640px) {
    padding: 20px;
  }
`

const Head = styled.header`
  display: grid;
  gap: 8px;
`

const Caption = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Headline = styled.p`
  color: var(--color-text-900);
  font-size: 32px;
  font-weight: 750;
  line-height: 42px;
  font-variant-numeric: tabular-nums;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 26px;
    line-height: 36px;
  }
`

const Conditions = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  border-top: 1px solid var(--color-border-200);
  padding-top: 20px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }

  > div {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  dt {
    color: var(--color-text-caption);
    font-size: 12px;
    line-height: 18px;
  }

  dd {
    color: var(--color-text-900);
    font-size: 15px;
    font-weight: 600;
    line-height: 22px;
    word-break: keep-all;
  }
`

const Notice = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 12px 14px;
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

const Pending = styled.div`
  display: grid;
  gap: 4px;
  border: 1px dashed var(--color-border-300);
  border-radius: var(--radius-control);
  padding: 16px;

  strong {
    color: var(--color-text-800);
    font-size: 14px;
    font-weight: 700;
    line-height: 22px;
  }

  span {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }
`

/**
 * 계산 결과 **최소 렌더**.
 *
 * 이번 슬라이스는 총 창업 비용·조건 요약·기준 연도까지만 보여준다.
 * 비용 구성·권리금·유사 프랜차이즈·성별연령·성수기는 다음 슬라이스의 리포트 화면 몫이라
 * 여기서 미리 그리지 않는다 — 두 곳에서 같은 값을 다르게 표기하는 사고를 막기 위해서다.
 *
 * 금액 단위는 **만원**이다. `formatLargeWon`이 만원 단위 입력을 "N억 M만원"으로 바꾼다.
 */
export default function SimulationResultPreview({
  report,
}: SimulationResultPreviewProps) {
  const { condition } = report

  return (
    <Root aria-label="시뮬레이션 계산 결과">
      <Head>
        <Caption>예상 총 창업 비용</Caption>
        <Headline>{formatLargeWon(report.totalPrice)}</Headline>
        <div>
          <Badge $tone="blue">
            {condition.franchisee ? '프랜차이즈' : '개인 창업'}
          </Badge>
        </div>
      </Head>

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

      <Pending>
        <strong>상세 리포트는 준비 중이에요</strong>
        <span>
          비용 구성, 권리금, 유사 프랜차이즈, 고객 분석은 곧 리포트 화면에서
          제공할 예정이에요.
        </span>
      </Pending>
    </Root>
  )
}
