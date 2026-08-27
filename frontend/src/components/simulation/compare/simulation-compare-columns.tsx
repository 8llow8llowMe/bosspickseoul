'use client'

import { ArrowRight, Info } from 'lucide-react'
import styled from 'styled-components'

import { CHART_COLORS } from '@/components/analysis/charts/chart-theme'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { formatLargeWon } from '@/lib/format'
import {
  describeSimulationCostGap,
  formatMirrorAmount,
  SIMULATION_COMPARE_NEUTRAL_NOTICE,
  SIMULATION_COMPARE_SIDE_LABELS,
  toMirrorCostRows,
} from '@/lib/simulation/compare-presentation'
import { buildSimulationReportHref } from '@/lib/simulation/report-route'
import type { SimulationReportVariant } from '@/lib/simulation/report-route'
import { buildSimulationReportRequest } from '@/lib/api/simulation'
import type { SimulationCondition, SimulationReport } from '@/types/simulation'

export type SimulationCompareColumnsProps = {
  left: SimulationReport
  right: SimulationReport
  variant?: SimulationReportVariant
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

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }
`

/* 좌우 헤드라인. ≤767px 는 세로 스택 — 미러 막대도 같은 분기에서 함께 접힌다. */
const Heads = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Head = styled.div<{ $lower: boolean }>`
  min-width: 0;
  display: grid;
  gap: 6px;
  border: 1px solid
    ${props =>
      props.$lower ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$lower ? 'var(--color-primary-100)' : 'var(--color-surface-muted)'};
  padding: 16px;
`

const Side = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Total = styled.p`
  color: var(--color-text-900);
  font-size: 24px;
  font-weight: 750;
  line-height: 34px;
  font-variant-numeric: tabular-nums;
  word-break: keep-all;
`

const ConditionLine = styled.p`
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const Gap = styled.p`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  line-height: 24px;
  word-break: keep-all;
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

const Rows = styled.dl`
  display: grid;
  gap: 12px;
  border-top: 1px solid var(--color-border-200);
  padding-top: 16px;
`

const Row = styled.div`
  display: grid;
  gap: 6px;
`

const RowLabel = styled.dt`
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

/**
 * 미러 막대 한 줄. 가운데 라벨 없이 **왼쪽은 오른쪽 정렬, 오른쪽은 왼쪽 정렬**로 마주 본다.
 * 축이 가운데에서 만나야 "어느 쪽이 긴가"를 길이만으로 읽을 수 있다.
 */
const Mirror = styled.dd`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 8px;

  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
`

/**
 * 금액은 **양쪽 모두 바깥쪽**에 둔다(왼쪽은 맨 왼쪽, 오른쪽은 맨 오른쪽).
 *
 * 금액을 가운데로 모으면 축이 만나는 자리가 글자에 밀려 좌우 막대의 시작점이 달라진다 —
 * 미러의 요점이 사라진다. JSX 의 자녀 순서가 그대로 시각 순서다.
 *
 * 세로 스택(≤767px)에서는 미러가 성립하지 않으므로 두 줄을 **같은 순서로** 읽히게 한다:
 * 오른쪽 절반만 뒤집어 양쪽 모두 `금액 → 막대` 가 되게 한다. 그러지 않으면 위 줄은
 * 금액이 왼쪽, 아래 줄은 금액이 오른쪽에 붙어 같은 항목의 두 값을 눈으로 잇기 어렵다.
 */
const Half = styled.div<{ $side: 'left' | 'right' }>`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 767px) {
    flex-direction: ${props =>
      props.$side === 'right' ? 'row-reverse' : 'row'};
    justify-content: flex-end;
  }
`

const Track = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  height: 10px;
  border-radius: 999px;
  background: var(--color-surface-muted);
  overflow: hidden;
  display: flex;
`

const Fill = styled.div<{ $ratio: number; $side: 'left' | 'right' }>`
  width: ${props => `${Math.round(props.$ratio * 100)}%`};
  height: 100%;
  border-radius: 999px;
  margin-left: ${props => (props.$side === 'left' ? 'auto' : '0')};
  /* 두 계열 색은 차트 테마에서 가져온다 — 도넛·막대와 같은 쌍을 써야 좌우가
     "같은 대비의 두 계열"로 읽힌다. (직접 쓴 --color-primary-300 은 정의되지 않은
     토큰이라 오른쪽 막대가 투명하게 렌더됐다.) */
  background: ${props =>
    props.$side === 'left'
      ? CHART_COLORS.seriesPrimary
      : CHART_COLORS.seriesSecondary};

  @media (max-width: 767px) {
    margin-left: 0;
  }
`

const Amount = styled.span`
  flex: 0 0 auto;
  color: var(--color-text-900);
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
`

const Links = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

/** 조건 한 줄. 리포트 헤드라인의 조건 표를 좁은 컬럼용으로 눌러 담은 것이다. */
const describeConditionLine = (condition: SimulationCondition): string => {
  const parts = [
    condition.districtName,
    condition.serviceName,
    `${condition.storeSize.toLocaleString()}㎡`,
    condition.floorType.name,
  ]
  if (condition.brandName) parts.splice(2, 0, condition.brandName)
  return parts.join(' · ')
}

/**
 * 응답의 조건을 다시 요청 본문으로 옮긴다 — `상세 리포트 보기` 링크를 만들기 위해서다.
 *
 * 원래 요청을 props 로 받지 않는 이유: 이 컴포넌트는 **순수 표시**여야 하고, 리포트 응답
 * 안에 조건이 전부 되채워져 있다. 두 벌을 받으면 둘이 어긋날 수 있는 자리가 생긴다.
 * `periodCode` 는 싣지 않는다 — 요청 코덱이 싣지 않으므로 링크에도 남지 않는다.
 */
const toReportHref = (
  report: SimulationReport,
  variant: SimulationReportVariant,
): string => {
  const { condition } = report

  return buildSimulationReportHref(
    buildSimulationReportRequest({
      franchisee: condition.franchisee,
      franchiseeId: condition.franchiseeId,
      districtCode: condition.districtCode,
      serviceCode: condition.serviceCode,
      storeSize: condition.storeSize,
      floorType: condition.floorType.code,
    }),
    variant,
    condition.brandName,
  )
}

/**
 * 좌우 비교 결과 — **순수 표시**다. 네트워크·라우팅 상태를 모른다.
 *
 * 비용이 낮은 쪽에 테두리·배경 강조가 붙는다. 그 강조를 "추천"으로 읽지 않게 하는 것이
 * `SIMULATION_COMPARE_NEUTRAL_NOTICE` 의 유일한 일이므로 **강조와 문구를 함께 렌더한다.**
 */
export default function SimulationCompareColumns({
  left,
  right,
  variant = 'standalone',
}: SimulationCompareColumnsProps) {
  const gap = describeSimulationCostGap(left, right)
  const rows = toMirrorCostRows(left, right)

  return (
    <Root aria-label="조건 비교 결과">
      <h2>예상 초기 비용 비교</h2>

      <Heads>
        <Head $lower={gap.winner === 'left'}>
          <Side>
            {SIMULATION_COMPARE_SIDE_LABELS.left}
            {gap.winner === 'left' ? (
              <Badge $tone="blue">비용 낮음</Badge>
            ) : null}
          </Side>
          <Total>{formatLargeWon(left.totalPrice)}</Total>
          <ConditionLine>{describeConditionLine(left.condition)}</ConditionLine>
        </Head>

        <Head $lower={gap.winner === 'right'}>
          <Side>
            {SIMULATION_COMPARE_SIDE_LABELS.right}
            {gap.winner === 'right' ? (
              <Badge $tone="blue">비용 낮음</Badge>
            ) : null}
          </Side>
          <Total>{formatLargeWon(right.totalPrice)}</Total>
          <ConditionLine>
            {describeConditionLine(right.condition)}
          </ConditionLine>
        </Head>
      </Heads>

      <Gap>{gap.message}</Gap>

      <Notice>
        <Info aria-hidden="true" />
        <span>{SIMULATION_COMPARE_NEUTRAL_NOTICE}</span>
      </Notice>

      <Rows>
        {rows.map(row => (
          <Row key={row.key}>
            <RowLabel>{row.label}</RowLabel>
            <Mirror>
              <Half $side="left">
                <Amount>{formatMirrorAmount(row.leftAmount)}</Amount>
                <Track>
                  <Fill $ratio={row.leftRatio} $side="left" />
                </Track>
              </Half>
              <Half $side="right">
                <Track>
                  <Fill $ratio={row.rightRatio} $side="right" />
                </Track>
                <Amount>{formatMirrorAmount(row.rightAmount)}</Amount>
              </Half>
            </Mirror>
          </Row>
        ))}
      </Rows>

      <Links>
        <ButtonLink
          variant="secondary"
          href={toReportHref(left, variant)}
          rightIcon={<ArrowRight />}
        >
          {SIMULATION_COMPARE_SIDE_LABELS.left} 상세 리포트 보기
        </ButtonLink>
        <ButtonLink
          variant="secondary"
          href={toReportHref(right, variant)}
          rightIcon={<ArrowRight />}
        >
          {SIMULATION_COMPARE_SIDE_LABELS.right} 상세 리포트 보기
        </ButtonLink>
      </Links>
    </Root>
  )
}
