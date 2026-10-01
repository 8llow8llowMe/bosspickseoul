/**
 * 리포트 화면의 **표시 로직**. 네트워크도 React도 모른다.
 *
 * 컴포넌트에서 빼낸 이유는 두 가지다.
 * 1. 이 화면의 오독 위험(단위·집계 범위)은 전부 **문자열을 만드는 지점**에 있다. 순수 함수로
 *    두면 renderToStaticMarkup 없이 값 자체를 고정할 수 있다.
 * 2. 비교 화면이 같은 규칙으로 좌우를 그려야 한다 — 두 화면이 같은 값을 다르게 표기하면
 *    어느 쪽이 맞는지 사용자가 알 수 없다.
 */

import type { GenderSegment } from '@/lib/analysis/chart-data'
import type { AnalysisMetricRow } from '@/lib/analysis/presentation'
import type {
  SimulationCondition,
  SimulationGenderAgeAnalysis,
  SimulationReport,
} from '@/types/simulation'

export type CostBreakdownRow = {
  key: 'rentPrice' | 'deposit' | 'interior' | 'levy'
  label: string
  /** 라벨 아래 한 줄 설명. 금액이 어떻게 정해졌는지 밝혀야 오독되는 항목에만 둔다. */
  hint?: string
  /** 만원 */
  amount: number
}

/**
 * 비용 구성 행.
 *
 * `levy` 는 **null 이면 항목째 빼고 0 이면 남긴다.** 비프랜차이즈의 "해당 없음"과
 * 프랜차이즈의 "부담금 0원"은 다른 사실이고, falsy 검사로 묶으면 0원이 사라진다.
 *
 * `rentPrice` 는 월 임대료지만 총 창업 비용에는 **한 달 치만** 더해진다(BE
 * `SimulationReportProcessor` — 총액 = 월 임대료 + 보증금(월 임대료 × 10) + 인테리어 +
 * 가맹 부담금). 「월 임대료」라고 적으면 매달 나가는 돈이 일회성 총액에 섞인 것처럼
 * 읽혀서 「첫 달 임대료」로 쓰고, 매달 나간다는 사실은 hint 로 남긴다.
 */
export const toCostBreakdown = (
  report: SimulationReport,
): CostBreakdownRow[] => {
  const { rentPrice, deposit, interior, levy } = report.costDetail

  const rows: CostBreakdownRow[] = [
    {
      key: 'rentPrice',
      label: '첫 달 임대료',
      hint: '이후 매달 같은 금액이 나가요',
      amount: rentPrice,
    },
    {
      key: 'deposit',
      label: '보증금',
      hint: '월 임대료 10개월분',
      amount: deposit,
    },
    { key: 'interior', label: '인테리어', amount: interior },
  ]

  if (levy !== null && levy !== undefined) {
    rows.push({ key: 'levy', label: '가맹 부담금', amount: levy })
  }

  return rows
}

/**
 * 비용 구성의 버림 안내 한 줄. **항상 준다.**
 *
 * BE 는 모든 금액을 원 단위로 계산한 뒤 항목·총액을 **각각** 만원 미만에서 버린다. 그래서
 * 화면의 만원 값끼리는 산식이 맞지 않을 수 있다. 합계 행과 「월 임대료 10개월분」 설명을
 * 둔 순간 사용자가 직접 검산하는 자리라, 어긋나는 이유를 늘 밝혀 둔다.
 * - 보증금: 326만원 × 10 = 3,260 인데 화면은 3,265만원일 수 있다(월 임대료 원 값이 326.5만원).
 * - 합계: 항목 합은 총액보다 **0 ~ (항목 수 − 1)만원** 작을 수 있다. 이 차이는 몇 만원인지
 *   덧붙인다. 그 범위를 벗어난 차이는 버림으로 설명되지 않으므로 지어내지 않는다.
 */
export const describeCostRounding = (report: SimulationReport): string => {
  const base = '금액은 만원 미만을 버려 표시해요.'
  const rows = toCostBreakdown(report)
  const sum = rows.reduce((total, row) => total + row.amount, 0)
  const gap = report.totalPrice - sum

  if (gap < 1 || gap > rows.length - 1) return base
  return `${base} 그래서 항목을 더하면 합계와 ${gap.toLocaleString()}만원 차이가 나요.`
}

/**
 * `yyyyQ` → `2023년 3분기 기준`.
 * 형식이 어긋나면 **빈 문자열**을 준다 — 없는 기준 분기를 지어내는 것보다 표기를 생략하는 편이 낫다.
 */
export const describeSimulationPeriod = (periodCode: string): string => {
  if (!/^\d{4}[1-4]$/.test(periodCode)) return ''
  return `${periodCode.slice(0, 4)}년 ${periodCode.slice(4)}분기 기준`
}

/**
 * 집계 범위 라벨. **이 문구가 빠지면 사용자가 273억원을 자기 점포 예상 매출로 읽는다.**
 * (원천이 `sales_district` 라 자치구×업종 전체 분기 매출이다.)
 */
export const describeAgeSalesScope = (condition: SimulationCondition): string =>
  `${condition.districtName} ${condition.serviceName} 전체 기준`

/**
 * 만원 입력을 축·배지에 얹을 수 있게 **억 단위로 축약**한다.
 * `formatLargeWon`(= `273억 3,782만원`)은 본문용이고, 축에는 이 짧은 쪽을 쓴다.
 */
export const formatSalesAmountCompact = (amountInManwon: number): string => {
  if (amountInManwon >= 10_000) {
    return `${Math.floor(amountInManwon / 10_000).toLocaleString()}억원`
  }
  return `${amountInManwon.toLocaleString()}만원`
}

export const toAgeSalesRows = (
  analysis: SimulationGenderAgeAnalysis,
): AnalysisMetricRow[] =>
  analysis.topAgeGroups.map(item => ({
    label: item.ageGroupName,
    value: item.salesAmount,
  }))

export const toGenderSalesSegments = (
  analysis: SimulationGenderAgeAnalysis,
): GenderSegment[] => [
  { label: '남성', value: analysis.malePercent },
  { label: '여성', value: analysis.femalePercent },
]

/** `[3,7,12]` → `3월 · 7월 · 12월`. 비면 빈 문자열. */
export const describeSeasonMonths = (months: readonly number[]): string =>
  months.map(month => `${month}월`).join(' · ')
