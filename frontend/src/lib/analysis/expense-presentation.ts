import {
  createRows,
  expenseDefinitions,
} from '@/lib/analysis/commercial-chart-selectors'
import {
  hasPositiveRow,
  type AnalysisMetricRow,
} from '@/lib/analysis/presentation'
import type {
  CommercialIncomeAndExpense,
  CommercialIncomeSummary,
} from '@/types/commercial-analysis'

/**
 * 소비 지표의 **표시 로직**. 네트워크도 React 도 모른다.
 *
 * 상권 단위와 지역 단위를 한 섹션에 섞지 않는 이유는 데이터 사정이 다르기 때문이다.
 * 서울 열린데이터광장이 상권 단위 소득·소비 제공을 중단해서,
 *
 * - 월 평균 소득은 2020년 수급이 끊긴 뒤 2026-05-13 자로 원천 컬럼까지 사라졌고
 *   (그래서 화면에서 통째로 걷어냈다),
 * - 항목별 소비는 `20241` 분기부터 원천이 **전 행 0** 이라 백엔드가 9개 항목 합이
 *   0 이면 `expenseByCategoryItem` 을 `null` 로 강등해 내려준다.
 *
 * 반면 `/summaries/income` 의 자치구·행정동은 원천이 살아 있다. 상권 한 단위만
 * 비는 것이 지금의 **정상 상태**다.
 */

/** 「항목별 소비」 가로 막대 행. 9개 항목 순서는 `expenseDefinitions` 가 정본이다. */
export const toExpenseCategoryRows = (
  income: CommercialIncomeAndExpense | null | undefined,
): AnalysisMetricRow[] =>
  createRows(
    income?.expenseByCategoryItem as
      Record<string, number | null | undefined> | null | undefined,
    expenseDefinitions,
  )

/**
 * 「항목별 소비」를 그릴 수 있는가.
 *
 * 백엔드가 이미 전 항목 0 을 `null` 로 강등하지만, 화면도 **양수가 하나라도 있는지**로
 * 판단한다 — 길이 0 인 막대 아홉 줄은 값이 없는 것과 구분되지 않는다
 * (`hasPositiveRow` 와 같은 이유). 그릴 것이 없으면 9줄을 「데이터 없음」으로
 * 늘어놓지 말고 **섹션 단위 빈 상태**로 원천 중단 사실을 적는다.
 */
export const hasExpenseByCategory = (
  income: CommercialIncomeAndExpense | null | undefined,
): boolean => hasPositiveRow(toExpenseCategoryRows(income))

export type RegionalExpenseScope = 'district' | 'administration' | 'commercial'

export type RegionalExpenseRow = {
  scope: RegionalExpenseScope
  /** 응답이 이름을 주면 그 이름, 없으면 단위 기본 라벨('자치구'·'행정동'·'상권'). */
  label: string
  /** 총 지출액. 해당 단위가 통째로 비면 `null`. */
  totalExpenseAmount: number | null
}

const REGIONAL_EXPENSE_SCOPES = [
  ['district', '자치구'],
  ['administration', '행정동'],
  ['commercial', '상권'],
] as const satisfies readonly (readonly [RegionalExpenseScope, string])[]

/**
 * 「지역별 소비」의 자치구 → 행정동 → 상권 세 줄.
 *
 * ⚠️ **없는 단위도 줄을 지우지 않는다.** 세 단위는 각각 독립적으로 null 이고, 상권만
 * 비는 것이 지금의 정상 상태다. 줄을 지우면 「이 상권은 값이 없다」는 사실 자체가
 * 화면에서 사라져 자치구 값이 상권 값처럼 읽힌다.
 */
export const toRegionalExpenseRows = (
  summary: CommercialIncomeSummary | null | undefined,
): RegionalExpenseRow[] =>
  REGIONAL_EXPENSE_SCOPES.map(([scope, fallbackLabel]) => {
    const item = summary?.[scope]
    const amount = item?.totalExpenseAmount
    const name = typeof item?.name === 'string' ? item.name.trim() : ''

    return {
      scope,
      label: name.length > 0 ? name : fallbackLabel,
      totalExpenseAmount:
        typeof amount === 'number' && Number.isFinite(amount) ? amount : null,
    }
  })

/** 세 단위 중 하나라도 값이 있는가. 전부 비면 섹션을 빈 상태로 둔다. */
export const hasRegionalExpense = (
  rows: readonly RegionalExpenseRow[],
): boolean => rows.some(row => row.totalExpenseAmount !== null)
