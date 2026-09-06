'use client'

import styled from 'styled-components'

import LineChart from '@/components/analysis/charts/line-chart'

/**
 * 스토리 04 단계 데모 — **언제 본전을 뽑는가.**
 *
 * 전에는 매출을 임차료·인건비·기타·순이익으로 나눈 가로 스택 바(`CostBreakdownBar`)였다.
 * 두 가지가 문제였다.
 *
 * 1. **헐렁했다.** 스택 바 + 범례는 153px 인데 패널의 데모 영역은 494px 이라 31% 만
 *    찼다(01 단계는 87%). 네 번 미뤄진 「04단계 패널 여백」(이슈 #223)의 실체가 이것이다.
 * 2. **단계가 답하는 질문과 달랐다.** 04 는 「이 가게를 열어도 되는가」를 묻는 자리인데,
 *    비용 구성비는 **한 달 안의 배분**만 말하고 시간축이 없다. 창업 판단에서 정작 궁금한
 *    「투자한 돈을 언제 회수하는가」는 그 그림에 없었다.
 *
 * 그래서 **누적 손익 곡선**으로 바꾼다. 초기 투자에서 음수로 시작해 매달 순이익만큼
 * 올라가고, 0 을 넘는 달이 손익분기다. 세로 공간을 쓰는 그림이라 여백 문제도 함께 풀린다.
 *
 * ⚠️ **전부 대표 예시 수치다 — 실 API 를 부르지 않는다.** 이유는 이전 구현과 같다:
 * `POST /simulations/reports` 는 쓰기 동사이고 `store-sizes` GET 이 선행돼야 해서,
 * 랜딩 방문자마다 계산 요청이 나간다. 데모 하나가 치를 값이 아니다.
 */

/** 월 매출·비용 (만원). 이전 구현의 예시 값을 그대로 잇는다. */
const MONTHLY_REVENUE = 4200
const MONTHLY_COST = 1050 + 1200 + 350
const MONTHLY_NET = MONTHLY_REVENUE - MONTHLY_COST

/**
 * 초기 투자 (만원) — 보증금·권리금·인테리어 합.
 *
 * 위 매출·비용과 **같은 종류의 대표 예시 값**이다. 이 수치가 있어야 손익분기라는 질문이
 * 성립한다. 화면에는 「대표 예시 데이터」 라벨이 항상 붙는다.
 */
const INITIAL_INVESTMENT = 12000

const MONTHS = 12

/**
 * 누적 손익. `-초기투자 + 월순이익 × n`.
 *
 * 0 개월(개업 시점)부터 그린다 — 첫 점이 그대로 초기 투자액이라 **얼마에서 시작하는지**가
 * 그림 안에 있다. 1개월부터 그리면 시작점이 이미 한 달 벌어들인 뒤라 투자액이 사라진다.
 */
export const buildCumulativeProfit = (
  months = MONTHS,
): { periodLabel: string; value: number; changeRate: null }[] =>
  Array.from({ length: months + 1 }, (_, month) => ({
    periodLabel: `${month}개월`,
    value: -INITIAL_INVESTMENT + MONTHLY_NET * month,
    changeRate: null,
  }))

/**
 * 누적 손익이 처음 0 이상이 되는 달. 기간 안에 못 넘으면 `null`.
 *
 * `Math.ceil` 로 계산하지 않고 실제 계열에서 찾는 이유: 계열과 다른 식으로 구하면
 * 둘이 어긋날 때 **문구는 8개월이라 하는데 선은 9개월에서 넘는** 상태가 된다.
 */
export const findBreakEvenMonth = (
  points: readonly { value: number }[],
): number | null => {
  const index = points.findIndex(point => point.value >= 0)
  return index === -1 ? null : index
}

const Wrap = styled.div`
  display: grid;
  gap: 10px;
`

const Headline = styled.p`
  margin: 0;
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
  word-break: keep-all;

  strong {
    color: var(--color-primary-700);
    font-variant-numeric: tabular-nums;
  }
`

const Summary = styled.dl`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 0;
`

const SummaryItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
`

const SummaryLabel = styled.dt`
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
`

const SummaryValue = styled.dd`
  margin: 0;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
`

const Caption = styled.p`
  margin: 0;
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
`

const formatManwon = (value: number): string =>
  `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}만원`

export default function BreakEvenChart() {
  const points = buildCumulativeProfit()
  const breakEven = findBreakEvenMonth(points)

  return (
    <Wrap>
      <Headline>
        {breakEven === null ? (
          <>{MONTHS}개월 안에는 투자금을 회수하지 못합니다.</>
        ) : (
          <>
            <strong>{breakEven}개월</strong>째에 투자금을 회수합니다.
          </>
        )}
      </Headline>

      <Summary>
        <SummaryItem>
          <SummaryLabel>초기 투자</SummaryLabel>
          <SummaryValue>{formatManwon(INITIAL_INVESTMENT)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>월 매출</SummaryLabel>
          <SummaryValue>{formatManwon(MONTHLY_REVENUE)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>월 순이익</SummaryLabel>
          <SummaryValue>{formatManwon(MONTHLY_NET)}</SummaryValue>
        </SummaryItem>
      </Summary>

      <LineChart
        points={points}
        unit="만원"
        direction={null}
        height={200}
        ariaLabel={`개업 후 ${MONTHS}개월 누적 손익`}
      />

      <Caption>대표 예시 데이터</Caption>
    </Wrap>
  )
}
