import { formatAnalysisValue } from '@/lib/analysis/presentation'
import type {
  CommercialBenchmark,
  RegionalSalesPerStore,
  RegionalSalesSummary,
} from '@/types/commercial-analysis'

/**
 * 「지역 평균 대비」 탭 「비교 분석」의 매출 비교 **표시 로직**(#544). 네트워크도 React 도 모른다.
 *
 * 예전에는 자치구·행정동·상권의 **월 매출 총액** 3개를 나란히 그렸다. 총액은 지역 크기에
 * 비례해서 「행정동이 상권보다 크다」는 당연한 사실만 보여 줬다. 백엔드가 점포당 월 매출과
 * 지수(비교 단위 점포당 = 100)를 내려주기 시작해(#485) 지수를 주 지표로 바꾼다.
 *
 * - 「점포」는 이 업종 전체 점포(일반 + 프랜차이즈)다(#490). 화면 문구도 이 뜻으로 쓴다.
 * - null 은 0 이 아니라 「데이터 없음」이다. 점포 수 0 은 실제 값이라 그대로 적는다.
 * - `salesPerStore` 키가 없는 구 응답(#485 이전)이면 지금처럼 총액 3개로 물러선다.
 */

export type BenchmarkScope = 'district' | 'administration' | 'commercial'

const SCOPES: readonly BenchmarkScope[] = [
  'district',
  'administration',
  'commercial',
]

const SCOPE_FALLBACK_LABEL: Record<BenchmarkScope, string> = {
  district: '자치구',
  administration: '행정동',
  commercial: '상권',
}

export type SalesPerStoreIndexRow = {
  scope: 'district' | 'administration'
  /** 지수 100 이 되는 비교 단위 이름(예: 노원구). 이름이 없으면 단위명. */
  baseName: string
  value: number | null
}

export type SalesPerStoreUnitRow = {
  scope: BenchmarkScope
  label: string
  /** 원/월. 점포 행이 없거나 점포 수가 0 이면 null. */
  monthlySalesPerStore: number | null
  /** 이 업종 전체 점포 수. 점포 행이 없으면 null, 0 은 그대로. */
  storeCount: number | null
  monthlySalesAmount: number | null
}

export type TotalSalesUnitRow = {
  scope: BenchmarkScope
  label: string
  monthlySalesAmount: number | null
}

export type BenchmarkSalesView =
  | {
      mode: 'per-store'
      /** 카드 설명 자리의 결론 한 문장. 지수나 업종 이름이 없으면 null. */
      conclusion: string | null
      indices: SalesPerStoreIndexRow[]
      units: SalesPerStoreUnitRow[]
    }
  | {
      mode: 'total'
      units: TotalSalesUnitRow[]
    }

const toNumber = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const trimmed = (value: string | null | undefined): string | null => {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.length > 0 ? text : null
}

const labelOf = (
  scope: BenchmarkScope,
  item: RegionalSalesPerStore | RegionalSalesSummary | null | undefined,
): string => trimmed(item?.name) ?? SCOPE_FALLBACK_LABEL[scope]

/** 지수는 소수 첫째 자리까지 온다. null 은 0 이 아니라 「데이터 없음」. */
export const formatSalesPerStoreIndex = (
  value: number | null | undefined,
): string => formatAnalysisValue(value)

/** 「점포 20개」. 점포 행이 없으면(null) 「점포 수 데이터 없음」. */
export const formatStoreCount = (value: number | null | undefined): string => {
  const count = toNumber(value)
  return count === null
    ? '점포 수 데이터 없음'
    : `점포 ${formatAnalysisValue(count)}개`
}

export const toBenchmarkSalesView = (
  benchmark: CommercialBenchmark | null | undefined,
): BenchmarkSalesView => {
  const salesPerStore = benchmark?.salesPerStore

  if (!salesPerStore) {
    const salesSummary = benchmark?.salesSummary
    return {
      mode: 'total',
      units: SCOPES.map(scope => ({
        scope,
        label: labelOf(scope, salesSummary?.[scope]),
        monthlySalesAmount: toNumber(salesSummary?.[scope]?.monthlySalesAmount),
      })),
    }
  }

  const units = SCOPES.map(scope => {
    const item = salesPerStore[scope]
    return {
      scope,
      label: labelOf(scope, item),
      monthlySalesPerStore: toNumber(item?.monthlySalesPerStore),
      storeCount: toNumber(item?.storeCount),
      monthlySalesAmount: toNumber(item?.monthlySalesAmount),
    }
  })

  const indices: SalesPerStoreIndexRow[] = [
    {
      scope: 'district',
      baseName: units[0].label,
      value: toNumber(salesPerStore.indexVsDistrict),
    },
    {
      scope: 'administration',
      baseName: units[1].label,
      value: toNumber(salesPerStore.indexVsAdministration),
    },
  ]

  /*
    결론은 자치구 지수로 말하고, 자치구 지수가 없을 때만 행정동 지수로 말한다. 업종 이름을
    못 받았으면 문장을 비운다 — 업종 코드(「CS100010」)를 문장에 넣지 않는다.
  */
  const lead = indices.find(index => index.value !== null)
  const serviceName = trimmed(salesPerStore.serviceName)
  const commercialName =
    trimmed(salesPerStore.commercial?.name) ??
    trimmed(benchmark?.commercialName) ??
    '이 상권'
  const conclusion =
    lead && lead.value !== null && serviceName
      ? `${commercialName} ${serviceName} 점포의 월 매출은 ${lead.baseName} 점포 평균의 ${formatSalesPerStoreIndex(lead.value)}% 수준이에요.`
      : null

  return { mode: 'per-store', conclusion, indices, units }
}
