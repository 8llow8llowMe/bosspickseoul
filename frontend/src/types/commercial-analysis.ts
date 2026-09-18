import type { ApiResponse } from '@/types/api'

type NullableNumber = number | null

export type CommercialServiceCategory = {
  serviceCode?: string | null
  serviceName?: string | null
  serviceType?: {
    code?: string | null
    name?: string | null
    description?: string | null
  } | null
}

export type DistrictArea = {
  districtCode?: string | null
  districtName?: string | null
}

export type CommercialFootTraffic = {
  byTimeSlotItem?: {
    footTrafficTime00To06?: NullableNumber
    footTrafficTime06To11?: NullableNumber
    footTrafficTime11To14?: NullableNumber
    footTrafficTime14To17?: NullableNumber
    footTrafficTime17To21?: NullableNumber
    footTrafficTime21To24?: NullableNumber
  } | null
  byDayOfWeekItem?: {
    mondayFootTraffic?: NullableNumber
    tuesdayFootTraffic?: NullableNumber
    wednesdayFootTraffic?: NullableNumber
    thursdayFootTraffic?: NullableNumber
    fridayFootTraffic?: NullableNumber
    saturdayFootTraffic?: NullableNumber
    sundayFootTraffic?: NullableNumber
  } | null
  byAgeGroupItem?: {
    age10FootTraffic?: NullableNumber
    age20FootTraffic?: NullableNumber
    age30FootTraffic?: NullableNumber
    age40FootTraffic?: NullableNumber
    age50FootTraffic?: NullableNumber
    age60PlusFootTraffic?: NullableNumber
  } | null
  byAgeGenderPercentItem?: Record<string, NullableNumber> | null
}

export type CommercialSales = {
  amountByTimeSlotItem?: {
    salesAmountTime00To06?: NullableNumber
    salesAmountTime06To11?: NullableNumber
    salesAmountTime11To14?: NullableNumber
    salesAmountTime14To17?: NullableNumber
    salesAmountTime17To21?: NullableNumber
    salesAmountTime21To24?: NullableNumber
  } | null
  amountByDayOfWeekItem?: {
    mondaySalesAmount?: NullableNumber
    tuesdaySalesAmount?: NullableNumber
    wednesdaySalesAmount?: NullableNumber
    thursdaySalesAmount?: NullableNumber
    fridaySalesAmount?: NullableNumber
    saturdaySalesAmount?: NullableNumber
    sundaySalesAmount?: NullableNumber
  } | null
  amountByAgeItem?: {
    age10SalesAmount?: NullableNumber
    age20SalesAmount?: NullableNumber
    age30SalesAmount?: NullableNumber
    age40SalesAmount?: NullableNumber
    age50SalesAmount?: NullableNumber
    age60PlusSalesAmount?: NullableNumber
  } | null
  amountByAgeGenderPercentItem?: Record<string, NullableNumber> | null
  countByDayOfWeekItem?: Record<string, NullableNumber> | null
  countByTimeSlotItem?: Record<string, NullableNumber> | null
  countByGenderItem?: {
    maleSalesCount?: NullableNumber
    femaleSalesCount?: NullableNumber
  } | null
}

export type RegionalSalesSummary = {
  code?: string | null
  name?: string | null
  serviceCode?: string | null
  serviceName?: string | null
  monthlySalesAmount?: NullableNumber
}

export type CommercialSalesSummary = {
  district?: RegionalSalesSummary | null
  administration?: RegionalSalesSummary | null
  commercial?: RegionalSalesSummary | null
}

export type CommercialStoreAnalysis = {
  totalStoreCount?: NullableNumber
  similarStoreCount?: NullableNumber
  openingRate?: NullableNumber
  openedStoreCount?: NullableNumber
  closureRate?: NullableNumber
  closedStoreCount?: NullableNumber
  franchiseStoreCount?: NullableNumber
  peerStores?: Array<{
    serviceCode?: string | null
    serviceName?: string | null
    totalStoreCount?: NullableNumber
    openingRate?: NullableNumber
    closureRate?: NullableNumber
  }> | null
}

export type CommercialResidentPopulation = {
  byAgeItem?: {
    totalResidentPopulation?: NullableNumber
    age10ResidentPopulation?: NullableNumber
    age20ResidentPopulation?: NullableNumber
    age30ResidentPopulation?: NullableNumber
    age40ResidentPopulation?: NullableNumber
    age50ResidentPopulation?: NullableNumber
    age60PlusResidentPopulation?: NullableNumber
  } | null
  malePercentage?: NullableNumber
  femalePercentage?: NullableNumber
}

/**
 * 소비 값을 어느 영역에서 가져왔는가.
 *
 * - `COMMERCIAL` — 상권 단위 원천 그대로. 화면에 배지도 면책도 붙이지 않는다.
 * - `ADMINISTRATION_PROXY` — 상권 원천이 끊겨 **소속 행정동 값으로 대체**했다.
 * - `UNAVAILABLE` — 대체할 행정동 값도 없다. 이때만 섹션을 빈 상태로 둔다.
 */
export type CommercialExpenseScopeCode =
  | 'COMMERCIAL'
  | 'ADMINISTRATION_PROXY'
  | 'UNAVAILABLE'

/**
 * 소비 지표의 출처 메타. 값이 없을 때도 중단 사실을 전하므로 백엔드가 **항상** 채운다.
 *
 * 분기는 반드시 `scope.code` 로 한다 — `scopeCode` 는 값을 가져온 **영역 코드**(행정동
 * 코드 같은 것)라 이름이 비슷할 뿐 뜻이 다르다.
 */
export type CommercialExpenseProvenance = {
  scope?: {
    code?: CommercialExpenseScopeCode | null
    name?: string | null
    description?: string | null
  } | null
  /** 값을 실제로 가져온 영역 코드. `UNAVAILABLE` 이면 null. */
  scopeCode?: string | null
  /** 값을 실제로 가져온 영역 이름(예: 청운효자동). `UNAVAILABLE` 이면 null. */
  scopeName?: string | null
  sourceId?: string | null
  sourceLabel?: string | null
  sourceUrl?: string | null
  /** 값의 기준 분기. 선택한 분기와 다를 수 있다. */
  effectivePeriodCode?: string | null
  /** 대체·중단일 때만 채워지는 면책 문장. 네이티브(`COMMERCIAL`)면 null. */
  disclaimer?: string | null
}

/**
 * 소비 항목 하나. **항목 수와 구성이 고정이 아니다** — 상권 네이티브는 9개,
 * 행정동 대체는 여가·문화가 합쳐지고 기타·음식이 더해진 10개다. 라벨을 서버가
 * 내려주므로 화면은 **키를 해석하지 말고 배열 순서대로** 그린다.
 */
export type CommercialExpenseCategory = {
  key?: string | null
  label?: string | null
  amount?: NullableNumber
}

/**
 * 상권 소비 (`GET /commercials/{commercialCode}/income`).
 *
 * ⚠️ **월 평균 소득(`averageIncomeItem`)은 더 이상 내려오지 않는다.** 서울 열린데이터광장이
 * 2020년에 수급을 끊었고 2026-05-13 자로 원천 컬럼까지 삭제해, 백엔드가 응답에서 통째로
 * 걷어냈다(#414).
 *
 * ⚠️ 상권 단위 원천이 `20241` 분기부터 전 행 0 이지만, 백엔드가 그 자리를 **소속 행정동
 * 소비로 대체**해 값을 채워 준다(#416). 그래서 소비 행이 없던 상권도 404 가 아니라 200 이다.
 * 값이 대체분인지 네이티브인지는 `provenance.scope.code` 만 보고 가른다
 * (`expense-presentation.ts`).
 */
export type CommercialIncomeAndExpense = {
  /** 항목별 지출. 배열 순서가 곧 화면 순서다. 제공이 없는 분기에는 null. */
  expenseCategories?: CommercialExpenseCategory[] | null
  /** 항목별 지출의 합계(원). 항목이 없으면 null. */
  totalExpenseAmount?: NullableNumber
  provenance?: CommercialExpenseProvenance | null
}

export type RegionalIncomeSummary = {
  code?: string | null
  name?: string | null
  totalExpenseAmount?: NullableNumber
}

/**
 * 지역별 소비 요약 (`GET /commercials/{commercialCode}/summaries/income`).
 *
 * ⚠️ 세 단위는 **각각 독립적으로 null** 이다. 자치구·행정동은 원천이 살아 있다.
 *
 * ⚠️ 상권 leg 에는 **행정동 총액이 대체로 들어오는 경우가 있다**(#416). 그때 상권 줄과
 * 행정동 줄은 같은 값이 되므로, 화면은 상권 줄이 대체값임을 드러내야 한다. 대체 여부는
 * `commercialProvenance.scope.code` 가 알려 준다 — 자치구·행정동 leg 는 대체하지 않으므로
 * 출처 메타가 상권 leg 에만 붙는다.
 */
export type CommercialIncomeSummary = {
  district?: RegionalIncomeSummary | null
  administration?: RegionalIncomeSummary | null
  commercial?: RegionalIncomeSummary | null
  commercialProvenance?: CommercialExpenseProvenance | null
}

export type CommercialFacility = {
  totalFacilityCount?: NullableNumber
  schoolCountItem?: {
    elementarySchoolCount?: NullableNumber
    middleSchoolCount?: NullableNumber
    highSchoolCount?: NullableNumber
    universityCount?: NullableNumber
    totalSchoolCount?: NullableNumber
  } | null
  totalTransportationFacilityCount?: NullableNumber
}

export type CommercialTrendMetric = 'SALES' | 'FOOT_TRAFFIC' | 'STORE'

export type CommercialTrend = {
  commercialCode?: string | null
  serviceCode?: string | null
  metricType?: CommercialTrendMetric | null
  trendDirection?: 'INCREASE' | 'DECREASE' | 'STAGNANT' | null
  periods?: Array<{
    periodCode?: string | null
    value?: NullableNumber
    changeRate?: NullableNumber
  }> | null
}

export type CommercialBenchmark = {
  commercialCode?: string | null
  commercialName?: string | null
  districtCode?: string | null
  districtName?: string | null
  administrationCode?: string | null
  administrationName?: string | null
  summary?: string | null
  salesSummary?: CommercialSalesSummary | null
  incomeSummary?: CommercialIncomeSummary | null
  benchmarkHighlights?: string[] | null
}

export type CommercialServiceCategoriesResponse = ApiResponse<
  CommercialServiceCategory[]
>
export type DistrictAreasResponse = ApiResponse<DistrictArea[]>
export type CommercialFootTrafficResponse =
  ApiResponse<CommercialFootTraffic | null>
export type CommercialSalesResponse = ApiResponse<CommercialSales | null>
export type CommercialSalesSummaryResponse =
  ApiResponse<CommercialSalesSummary | null>
export type CommercialStoreAnalysisResponse =
  ApiResponse<CommercialStoreAnalysis | null>
export type CommercialResidentPopulationResponse =
  ApiResponse<CommercialResidentPopulation | null>
export type CommercialIncomeAndExpenseResponse =
  ApiResponse<CommercialIncomeAndExpense | null>
export type CommercialIncomeSummaryResponse =
  ApiResponse<CommercialIncomeSummary | null>
export type CommercialFacilityResponse = ApiResponse<CommercialFacility | null>
export type CommercialTrendResponse = ApiResponse<CommercialTrend | null>
export type CommercialBenchmarkResponse =
  ApiResponse<CommercialBenchmark | null>
