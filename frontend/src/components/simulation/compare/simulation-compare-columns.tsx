'use client'

import { ArrowRight, Info } from 'lucide-react'
import styled from 'styled-components'

import { CHART_COLORS } from '@/components/analysis/charts/chart-theme'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { formatLargeWon } from '@/lib/format'
import {
  describeCompareConditionLine,
  describeMirrorRowGap,
  describeSimulationCostGap,
  formatMirrorAmount,
  SIMULATION_COMPARE_NEUTRAL_NOTICE,
  SIMULATION_COMPARE_SIDE_LABELS,
  SIMULATION_COMPARE_SIDE_MARKS,
  toMirrorCostRows,
} from '@/lib/simulation/compare-presentation'
import { withSimulationAnalysisContext } from '@/lib/simulation/analysis-context'
import { buildSimulationReportHref } from '@/lib/simulation/report-route'
import type { SimulationReportVariant } from '@/lib/simulation/report-route'
import { buildSimulationReportRequest } from '@/lib/api/simulation'
import type { SimulationReport } from '@/types/simulation'
import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

export type SimulationCompareColumnsProps = {
  left: SimulationReport
  right: SimulationReport
  variant?: SimulationReportVariant
  /** 분석 경유 화면의 분석 컨텍스트(`ctx` 키, #635). 열별 리포트 링크에 덧붙여 들고 다닌다. */
  contextParams?: URLSearchParams | null
}

/** 결과 제목 id. 비교에 성공하면 화면이 여기로 스크롤하고 포커스를 옮긴다(C3). */
export const SIMULATION_COMPARE_RESULT_HEADING_ID = 'simulation-compare-result'

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;
  box-shadow: var(--shadow-level-2);

  @media ${SIMULATION_MEDIA.mobile} {
    padding: 20px;
  }

  /* 프로그램으로 포커스를 받는 제목이라 tabIndex -1. sticky 사이트 헤더(65px) 아래로 스크롤한다. */
  h2 {
    scroll-margin-top: 96px;
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary-700);
      outline-offset: 2px;
    }
  }
`

/* 좌우 헤드라인. ≤767px 는 세로 스택 — 미러 막대도 같은 분기에서 함께 접힌다. */
const Heads = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media ${SIMULATION_MEDIA.mobile} {
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

/* 헤드 바탕이 grey100·blue50 이라 grey600 은 4.19·4.11 로 미달이다 — 밴드 캡션 토큰. */
const Side = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-caption-on-band);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Total = styled.p`
  color: var(--color-text-900);
  font-size: 24px;
  font-weight: 700;
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

/* 범례 + 항목 행. 범례(ul)는 dl 안에 둘 수 없어 묶음을 따로 둔다. */
const Breakdown = styled.div`
  display: grid;
  gap: 12px;
  border-top: 1px solid var(--color-border-200);
  padding-top: 16px;
`

const Rows = styled.dl`
  display: grid;
  gap: 12px;
`

const Row = styled.div`
  display: grid;
  gap: 6px;
`

/*
  항목 이름 + 행별 차액(C7). 차액은 이름 **바로 옆**에 붙인다 — 양 끝으로 벌리면 1440 에서 둘이
  1,300px 떨어져 같은 줄로 읽히지 않았다.
*/
const RowLabel = styled.dt`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: flex-start;
  gap: 2px 12px;
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;

  span {
    color: var(--color-text-900);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`

/* 범례. 막대 색과 A·B 표식을 묶어 둔다 — 색만으로는 두 계열을 가를 수 없다(C4). */
const Legend = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-text-700);
    font-size: 13px;
    line-height: 20px;
  }
`

const LegendSwatch = styled.i<{ $side: 'left' | 'right' }>`
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: ${props =>
    props.$side === 'left'
      ? CHART_COLORS.seriesPrimary
      : CHART_COLORS.seriesSecondary};
`

/* 막대 앞 A·B 표식. 색이 아니라 글자라 색을 가르지 못해도 읽힌다. */
const Mark = styled.span`
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  border-radius: 4px;
  background: var(--color-surface-muted);
  color: var(--color-text-700);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
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

  @media ${SIMULATION_MEDIA.mobile} {
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
  /* 트랙에 상한이 생겨 칸이 남는다. 두 트랙이 가운데에서 만나도록 왼쪽은 오른쪽 끝, 오른쪽은
     왼쪽 끝에 붙이고, 금액·표식은 트랙 바깥에 바로 붙인다. */
  justify-content: ${props =>
    props.$side === 'left' ? 'flex-end' : 'flex-start'};
  gap: 8px;

  /*
    세로로 쌓이면 두 줄 모두 오른쪽 끝에 붙인다. row-reverse 에서는 flex-start 가 오른쪽 끝이다 —
    둘 다 flex-end 로 두면 트랙 상한(360) 때문에 남는 칸이 생기는 480~767 폭에서 A 는 오른쪽,
    B 는 왼쪽에 붙어 같은 항목의 두 막대가 엇갈렸다.
  */
  @media ${SIMULATION_MEDIA.mobile} {
    flex-direction: ${props =>
      props.$side === 'right' ? 'row-reverse' : 'row'};
    justify-content: ${props =>
      props.$side === 'right' ? 'flex-start' : 'flex-end'};
  }
`

/*
  미터 트랙은 360px · 14px 에서 멈춘다(DESIGN §미터 행, C6). 상한이 없으면 1440 에서 약 59:1 이 돼
  양쪽 끝의 금액과 막대를 눈으로 잇기 어려웠다. 360:14 ≈ 26:1 이지만 두 막대가 가운데에서
  마주 보는 미러라 한쪽 길이만 읽는다.
*/
const Track = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  max-width: 360px;
  height: 14px;
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

  @media ${SIMULATION_MEDIA.mobile} {
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

  @media ${SIMULATION_MEDIA.mobile} {
    grid-template-columns: minmax(0, 1fr);
  }
`

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
  contextParams: URLSearchParams | null,
): string => {
  const { condition } = report

  const href = buildSimulationReportHref(
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
  return withSimulationAnalysisContext(href, contextParams)
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
  contextParams = null,
}: SimulationCompareColumnsProps) {
  const gap = describeSimulationCostGap(left, right)
  const rows = toMirrorCostRows(left, right)

  return (
    <Root aria-label="조건 비교 결과">
      <h2 id={SIMULATION_COMPARE_RESULT_HEADING_ID} tabIndex={-1}>
        예상 총 창업 비용 비교
      </h2>

      <Heads>
        <Head $lower={gap.winner === 'left'}>
          <Side>
            {SIMULATION_COMPARE_SIDE_LABELS.left}
            {gap.winner === 'left' ? (
              <Badge $tone="blue">비용 낮음</Badge>
            ) : null}
          </Side>
          <Total>{formatLargeWon(left.totalPrice)}</Total>
          <ConditionLine>
            {describeCompareConditionLine(left.condition)}
          </ConditionLine>
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
            {describeCompareConditionLine(right.condition)}
          </ConditionLine>
        </Head>
      </Heads>

      <Gap>{gap.message}</Gap>

      <Notice>
        <Info aria-hidden="true" />
        <span>{SIMULATION_COMPARE_NEUTRAL_NOTICE}</span>
      </Notice>

      <Breakdown>
        <Legend aria-label="막대 범례">
          <li>
            <LegendSwatch $side="left" aria-hidden="true" />
            {`${SIMULATION_COMPARE_SIDE_MARKS.left} · ${SIMULATION_COMPARE_SIDE_LABELS.left}`}
          </li>
          <li>
            <LegendSwatch $side="right" aria-hidden="true" />
            {`${SIMULATION_COMPARE_SIDE_MARKS.right} · ${SIMULATION_COMPARE_SIDE_LABELS.right}`}
          </li>
        </Legend>
        <Rows>
          {rows.map(row => {
            const rowGap = describeMirrorRowGap(row)
            return (
              <Row key={row.key}>
                <RowLabel>
                  {row.label}
                  {rowGap ? (
                    <>
                      {' '}
                      <span>{rowGap}</span>
                    </>
                  ) : null}
                </RowLabel>
                <Mirror>
                  <Half $side="left">
                    <Mark>{SIMULATION_COMPARE_SIDE_MARKS.left}</Mark>
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
                    <Mark>{SIMULATION_COMPARE_SIDE_MARKS.right}</Mark>
                  </Half>
                </Mirror>
              </Row>
            )
          })}
        </Rows>
      </Breakdown>

      <Links>
        <ButtonLink
          variant="secondary"
          href={toReportHref(left, variant, contextParams)}
          rightIcon={<ArrowRight />}
        >
          {SIMULATION_COMPARE_SIDE_LABELS.left} 상세 리포트 보기
        </ButtonLink>
        <ButtonLink
          variant="secondary"
          href={toReportHref(right, variant, contextParams)}
          rightIcon={<ArrowRight />}
        >
          {SIMULATION_COMPARE_SIDE_LABELS.right} 상세 리포트 보기
        </ButtonLink>
      </Links>
    </Root>
  )
}
