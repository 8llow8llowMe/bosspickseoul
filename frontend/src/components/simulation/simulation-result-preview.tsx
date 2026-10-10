'use client'

import { ArrowRight, Info, Scale } from 'lucide-react'
import styled from 'styled-components'

import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { toDonutSlices } from '@/lib/analysis/chart-data'
import { formatLargeWon } from '@/lib/format'
import { formatStoreSize } from '@/lib/simulation/conditions'
import {
  COST_COLORS,
  KEY_MONEY_EXCLUDED_NOTE,
  describeCostRounding,
  toCostBreakdown,
  type CostBreakdownRow,
} from '@/lib/simulation/report-presentation'
import { formatDataBaseYearNotice } from '@/lib/simulation/report-sections'
import type { SimulationReport } from '@/types/simulation'
import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

export type SimulationResultPreviewProps = {
  report: SimulationReport
  /** 상세 리포트 경로. 호출부가 variant 를 알고 있으므로 여기서 만들지 않는다. */
  reportHref: string
  /** 이 조건을 A 에 채운 비교 경로. 같은 이유로 호출부가 만든다. */
  compareHref: string
}

/* 카드 테두리·그림자는 감싸는 결과 패널이 갖는다 — 카드 안에 카드를 겹치지 않는다. */
const Root = styled.div`
  display: grid;
  gap: 16px;
`

const Head = styled.header`
  display: grid;
  gap: 4px;
`

/*
  계산 **전**에는 같은 문구가 `<h2>` 인데(`simulation-result-panel.tsx`) 계산 뒤에
  `<p>` 로 강등돼 있었다 — 페이지에서 제일 중요한 출력이 제목 아웃라인에서 사라져,
  제목 단위로 훑는 사용자는 답을 건너뛴다(과업 흐름 감사 J3-3).
  태그만 h2 로 올리고 크기·색은 그대로 둔다 — 보이는 모습은 변하지 않는다.
*/
const Caption = styled.h2`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Headline = styled.p`
  color: var(--color-text-900);
  font-size: 30px;
  font-weight: 700;
  line-height: 40px;
  font-variant-numeric: tabular-nums;
  word-break: keep-all;

  @media ${SIMULATION_MEDIA.mobile} {
    font-size: 26px;
    line-height: 36px;
  }
`

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
`

/**
 * 조건 요약은 **행 흐름**이다. 2열 그리드로 두면 항목이 5개일 때 마지막 하나가 홀로 남아
 * 붕 떠 보였다. 라벨 왼쪽·값 오른쪽 행은 항목 수가 몇 개든 같은 모양으로 쌓인다.
 */
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

/*
  비용 구성 행. 리포트 비용 구성(`simulation-cost-breakdown.tsx`)의 축약판이다 — 행 설명·도넛·
  합계 행은 뺐다. 합계는 바로 위 헤드라인이 맡는다. 360px 열이라 라벨과 금액을 한 줄에 둔다.
*/
const Breakdown = styled.div`
  display: grid;
  gap: 6px;
`

const CostRows = styled.dl`
  display: grid;

  > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 0;
  }

  dt {
    min-width: 0;
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 8px;
    color: var(--color-text-700);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }

  dd {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    font-variant-numeric: tabular-nums;
  }
`

/* 색 점은 리포트 도넛과 같은 항목 색이다 — 카드에서 본 색이 리포트에서도 같은 항목을 가리킨다. */
const Swatch = styled.i<{ $color: string }>`
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 3px;
  background: ${props => props.$color};
`

const CostAmount = styled.strong`
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
`

/*
  행 근거 캡션. 라벨 아래 줄로 내리고 색 점(10px) + 간격(8px)만큼 들여 라벨 첫 글자에 맞춘다.
  리포트 비용 구성의 행 설명(`Hint`)과 같은 12px 캡션이다.
*/
const RowHint = styled.span`
  flex-basis: 100%;
  padding-left: 18px;
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  word-break: keep-all;
`

/*
  카드에 근거를 붙이는 행(#554). 보증금은 금액이 왜 그만큼인지(월 임대료 10개월분) 모르면 큰 수
  하나로만 읽힌다. 첫 달 임대료의 「이후 매달…」은 라벨(「첫 달」)이 이미 말해 리포트에만 둔다.
*/
const PREVIEW_HINT_KEYS: ReadonlySet<CostBreakdownRow['key']> = new Set([
  'deposit',
])

/* 「100%」가 와도 줄이 흔들리지 않게 폭을 고정한다. */
const CostShare = styled.span`
  min-width: 3.5em;
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  text-align: right;
`

const Footnote = styled.p`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  word-break: keep-all;
`

/* ButtonLink 는 내용 폭으로 줄어든다. 패널의 「계산하기」와 같은 자리·같은 폭으로 둔다. */
const Actions = styled.div`
  display: grid;
  gap: 8px;

  > a {
    width: 100%;
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

/**
 * 계산 결과 **요약 카드**.
 *
 * 총 창업 비용 · 비용 구성 행 · 조건 요약 · 기준 연도까지 보여주고, 다음 행동 두 개
 * (`상세 리포트 보기` · `다른 조건과 비교`)를 준다. 계산 직후 사용자가 보는 것은 리포트가
 * 아니라 이 카드라, 총액만 두면 「무엇이 이만큼인가」를 알려고 화면을 옮겨야 했다(B8).
 *
 * 비용 구성은 리포트와 **같은 함수**로 그린다 — 행은 `toCostBreakdown`, 비중은 도넛과 같은
 * `toDonutSlices`, 색은 `COST_COLORS`. 두 곳이 같은 값을 다르게 반올림하면 어느 쪽이 맞는지
 * 사용자가 알 수 없다. 셋 다 `lib` 에서 가져온다 — 도넛·리포트 컴포넌트 모듈을 import 하면
 * recharts 가 입력 화면 첫 로드에 딸려 온다. 권리금·유사 프랜차이즈·성별연령·성수기는 여전히 리포트 몫이다.
 * 다만 권리금이 **총액에 빠졌다는 사실**은 카드 각주에도 둔다(#554) — 금액은 리포트에만 있다.
 *
 * 금액 단위는 **만원**이다. `formatLargeWon`이 만원 단위 입력을 "N억 M만원"으로 바꾼다.
 */
export default function SimulationResultPreview({
  report,
  reportHref,
  compareHref,
}: SimulationResultPreviewProps) {
  const { condition } = report
  const costRows = toCostBreakdown(report)
  const slices = toDonutSlices(
    costRows.map(row => ({ label: row.label, value: row.amount })),
  )

  return (
    <Root>
      <Head>
        <Caption>예상 총 창업 비용</Caption>
        <Headline>{formatLargeWon(report.totalPrice)}</Headline>
        <Tags>
          <Badge $tone="blue">
            {condition.franchisee ? '프랜차이즈' : '개인 창업'}
          </Badge>
        </Tags>
      </Head>

      {/* 금액·비중 사이 {' '} 는 낭독용이다. 붙이면 「300만원3%」로 이어 읽힌다. */}
      <Breakdown>
        <CostRows>
          {costRows.map((row, index) => (
            <div key={row.key}>
              <dt>
                <Swatch $color={COST_COLORS[row.key]} aria-hidden="true" />
                {row.label}
                {row.hint && PREVIEW_HINT_KEYS.has(row.key) ? (
                  <>
                    {' '}
                    <RowHint>{row.hint}</RowHint>
                  </>
                ) : null}
              </dt>
              <dd>
                <CostAmount>{formatLargeWon(row.amount)}</CostAmount>{' '}
                <CostShare>{slices[index]?.percent ?? 0}%</CostShare>
              </dd>
            </div>
          ))}
        </CostRows>
        {/* 권리금 제외는 리포트와 같은 문장이다(#554) — 카드에서 멈추는 사용자가 대부분이다. */}
        <Footnote>{`${describeCostRounding(report)} ${KEY_MONEY_EXCLUDED_NOTE}`}</Footnote>
      </Breakdown>

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
          <dd>{formatStoreSize(condition.storeSize)}</dd>
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

      <Actions>
        <ButtonLink href={reportHref} size="large" rightIcon={<ArrowRight />}>
          상세 리포트 보기
        </ButtonLink>
        {/* 이 조건을 A 에, 그 복사본을 B 에 채운 비교 화면을 연다(#567). */}
        <ButtonLink
          href={compareHref}
          size="large"
          variant="secondary"
          leftIcon={<Scale />}
        >
          다른 조건과 비교
        </ButtonLink>
      </Actions>
    </Root>
  )
}
