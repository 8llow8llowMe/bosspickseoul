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
  /** 만원 */
  amount: number
}

/**
 * 비용 구성 행.
 *
 * `levy` 는 **null 이면 항목째 빼고 0 이면 남긴다.** 비프랜차이즈의 "해당 없음"과
 * 프랜차이즈의 "부담금 0원"은 다른 사실이고, falsy 검사로 묶으면 0원이 사라진다.
 */
export const toCostBreakdown = (
  report: SimulationReport,
): CostBreakdownRow[] => {
  const { rentPrice, deposit, interior, levy } = report.costDetail

  const rows: CostBreakdownRow[] = [
    { key: 'rentPrice', label: '월 임대료', amount: rentPrice },
    { key: 'deposit', label: '보증금', amount: deposit },
    { key: 'interior', label: '인테리어', amount: interior },
  ]

  if (levy !== null && levy !== undefined) {
    rows.push({ key: 'levy', label: '가맹 부담금', amount: levy })
  }

  return rows
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
