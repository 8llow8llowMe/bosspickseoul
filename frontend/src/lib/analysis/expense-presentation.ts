import type { AnalysisMetricRow } from '@/lib/analysis/presentation'
import type {
  CommercialExpenseProvenance,
  CommercialExpenseScopeCode,
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
 * - 항목별 소비는 `20241` 분기부터 원천이 **전 행 0** 이라, 백엔드가 그 자리를
 *   **소속 행정동 소비로 대체**해 내려준다(#416).
 *
 * 대체는 값을 채우지만 뜻을 바꾼다 — 같은 행정동에 속한 상권끼리 값이 같아지고,
 * 「지역별 소비」에서는 행정동 줄과 상권 줄이 같은 숫자가 된다. 그래서 값을 숨기지도
 * 바꾸지도 않는 대신 **대체라는 사실을 화면이 말하게** 한다. 그 판정이 아래
 * `toExpenseProvenanceView` 하나로 모여 있다.
 */

/**
 * 대체 표기에 쓰는 문구. 배지는 짧게, 각주는 왜 같은 값인지까지 적는다.
 *
 * 배지 문구를 두 섹션이 함께 쓰므로 여기 하나로 둔다 — 「항목별 소비」와 「지역별 소비」가
 * 같은 사실을 다른 말로 부르면 두 가지 일이 일어난 것처럼 읽힌다.
 */
export const EXPENSE_PROXY_BADGE_LABEL = '행정동 기준 (대체)'
const PROXY_FALLBACK_SCOPE_NAME = '소속 행정동'

/**
 * 출처 메타를 화면이 바로 쓸 형태로 편다.
 *
 * `scope.code` 가 단일 분기 기준이다. 값의 유무(`expenseCategories` 가 비었는지)로
 * 되짚지 않는다 — 대체분이 0 인 분기와 제공이 아예 없는 분기는 다른 사실인데
 * 값만 보면 구분되지 않는다.
 */
export type ExpenseProvenanceView = {
  scopeCode: CommercialExpenseScopeCode
  /** 대체값인가. 배지·면책·각주를 드러낼지는 전부 이 하나로 결정한다. */
  isProxy: boolean
  /** 대체일 때만 붙이는 배지 문구. 네이티브·제공 없음이면 null. */
  badgeLabel: string | null
  /** 값을 실제로 가져온 영역 이름(예: 청운효자동). */
  scopeName: string | null
  /** 서버가 준 면책 문장. 네이티브면 null 이라 그대로 붙여도 안전하다. */
  disclaimer: string | null
  sourceLabel: string | null
  sourceUrl: string | null
  /** 값의 기준 분기. 선택한 분기와 다를 수 있어 화면이 이쪽을 우선 적는다. */
  effectivePeriodCode: string | null
}

const trimmed = (value: string | null | undefined): string | null => {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.length > 0 ? text : null
}

/**
 * `scope.code` 를 좁힌다. 모르는 코드가 오면 **네이티브로 낙관하지 않고**
 * `UNAVAILABLE` 로 떨어뜨린다 — 출처를 모르는 값을 상권 네이티브라고 단언하는 쪽이
 * 값을 못 그리는 쪽보다 나쁘다.
 */
const resolveScopeCode = (
  provenance: CommercialExpenseProvenance | null | undefined,
): CommercialExpenseScopeCode => {
  const code = provenance?.scope?.code
  return code === 'COMMERCIAL' ||
    code === 'ADMINISTRATION_PROXY' ||
    code === 'UNAVAILABLE'
    ? code
    : 'UNAVAILABLE'
}

export const toExpenseProvenanceView = (
  provenance: CommercialExpenseProvenance | null | undefined,
): ExpenseProvenanceView => {
  const scopeCode = resolveScopeCode(provenance)
  const isProxy = scopeCode === 'ADMINISTRATION_PROXY'

  return {
    scopeCode,
    isProxy,
    badgeLabel: isProxy ? EXPENSE_PROXY_BADGE_LABEL : null,
    scopeName: trimmed(provenance?.scopeName),
    disclaimer: trimmed(provenance?.disclaimer),
    sourceLabel: trimmed(provenance?.sourceLabel),
    sourceUrl: trimmed(provenance?.sourceUrl),
    effectivePeriodCode: trimmed(provenance?.effectivePeriodCode),
  }
}

/**
 * 「항목별 소비」 가로 막대 행.
 *
 * ⚠️ **항목 수가 고정이 아니다.** 상권 네이티브는 9개, 행정동 대체는 여가·문화가
 * 합쳐지고 기타·음식이 더해진 10개다. 그래서 프런트가 키 목록을 들고 있지 않고
 * 서버가 준 라벨로 **배열 순서 그대로** 그린다.
 */
export const toExpenseCategoryRows = (
  income: CommercialIncomeAndExpense | null | undefined,
): AnalysisMetricRow[] =>
  (income?.expenseCategories ?? []).flatMap(category => {
    const label = trimmed(category?.label) ?? trimmed(category?.key)
    if (label === null) return []

    const amount = category?.amount
    return [
      {
        label,
        value:
          typeof amount === 'number' && Number.isFinite(amount) ? amount : null,
      },
    ]
  })

/**
 * 「항목별 소비」를 그릴 수 있는가.
 *
 * 빈 상태는 **제공이 아예 없을 때(`UNAVAILABLE`)뿐이다.** 대체값은 값이고, 0 이 섞여
 * 있어도 「그 항목에 안 쓴다」는 정보라 지우지 않는다. 다만 그릴 행이 하나도 없으면
 * 빈 목록 대신 빈 상태로 둔다 — 스코프가 값을 약속했는데 배열이 비는 건 계약 위반이지만,
 * 화면이 빈 네모를 그리는 것보다 사실을 적는 쪽이 낫다.
 */
export const hasExpenseByCategory = (
  income: CommercialIncomeAndExpense | null | undefined,
): boolean =>
  toExpenseProvenanceView(income?.provenance).scopeCode !== 'UNAVAILABLE' &&
  toExpenseCategoryRows(income).length > 0

export type RegionalExpenseScope = 'district' | 'administration' | 'commercial'

export type RegionalExpenseRow = {
  scope: RegionalExpenseScope
  /** 응답이 이름을 주면 그 이름, 없으면 단위 기본 라벨('자치구'·'행정동'·'상권'). */
  label: string
  /** 총 지출액. 해당 단위가 통째로 비면 `null`. */
  totalExpenseAmount: number | null
  /**
   * 이 줄이 대체값인가. 자치구·행정동은 원천이 살아 있어 대체하지 않으므로
   * 상권 줄에서만 `true` 가 될 수 있다.
   */
  isProxy: boolean
}

const REGIONAL_EXPENSE_SCOPES = [
  ['district', '자치구'],
  ['administration', '행정동'],
  ['commercial', '상권'],
] as const satisfies readonly (readonly [RegionalExpenseScope, string])[]

/**
 * 「지역별 소비」의 자치구 → 행정동 → 상권 세 줄.
 *
 * ⚠️ **없는 단위도 줄을 지우지 않는다.** 세 단위는 각각 독립적으로 null 이고, 줄을
 * 지우면 「이 상권은 값이 없다」는 사실 자체가 화면에서 사라져 자치구 값이 상권 값처럼
 * 읽힌다.
 *
 * ⚠️ 대체 구간에서는 **상권 줄과 행정동 줄이 같은 숫자**가 된다. 데이터가 실제로 그런
 * 것이므로 값을 감추지 않고, 대신 상권 줄에 `isProxy` 를 세워 화면이 그 사실을 말하게 한다.
 */
export const toRegionalExpenseRows = (
  summary: CommercialIncomeSummary | null | undefined,
): RegionalExpenseRow[] => {
  const commercialProxy = toExpenseProvenanceView(
    summary?.commercialProvenance,
  ).isProxy

  return REGIONAL_EXPENSE_SCOPES.map(([scope, fallbackLabel]) => {
    const item = summary?.[scope]
    const amount = item?.totalExpenseAmount
    const name = trimmed(item?.name)
    const totalExpenseAmount =
      typeof amount === 'number' && Number.isFinite(amount) ? amount : null

    return {
      scope,
      label: name ?? fallbackLabel,
      totalExpenseAmount,
      isProxy:
        scope === 'commercial' &&
        commercialProxy &&
        totalExpenseAmount !== null,
    }
  })
}

/** 세 단위 중 하나라도 값이 있는가. 전부 비면 섹션을 빈 상태로 둔다. */
export const hasRegionalExpense = (
  rows: readonly RegionalExpenseRow[],
): boolean => rows.some(row => row.totalExpenseAmount !== null)

/**
 * 「지역별 소비」 각주. **막대 두 줄이 같아 보이는 이유**를 화면에서 먼저 말한다.
 *
 * 대체 구간이 아니면 null 이라 각주 자체가 붙지 않는다.
 */
export const toRegionalExpenseProxyNote = (
  summary: CommercialIncomeSummary | null | undefined,
): string | null => {
  const view = toExpenseProvenanceView(summary?.commercialProvenance)
  if (!view.isProxy) return null

  const scopeName = view.scopeName ?? PROXY_FALLBACK_SCOPE_NAME
  return `상권 단위 원천이 끊겨 상권 줄에 ${scopeName}의 추정 소비를 대신 넣었어요. 그래서 행정동 줄과 같은 값으로 보입니다.`
}
