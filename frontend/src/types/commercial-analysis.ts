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
 * 상권 소비 (`GET /commercials/{commercialCode}/income`).
 *
 * ⚠️ **월 평균 소득(`averageIncomeItem`)은 더 이상 내려오지 않는다.** 서울 열린데이터광장이
 * 2020년에 수급을 끊었고 2026-05-13 자로 원천 컬럼까지 삭제해, 백엔드가 응답에서 통째로
 * 걷어냈다(#414).
 *
 * ⚠️ `expenseByCategoryItem` 은 **null 일 수 있다.** 상권 단위 원천이 `20241` 분기부터
 * 전 행 0 이라, 백엔드는 9개 항목 합이 0 이면 0 으로 채워 보내는 대신 null 로 강등한다.
 * 화면은 그때 9줄을 「데이터 없음」으로 늘어놓지 말고 섹션을 빈 상태로 둔다
 * (`expense-presentation.ts`).
 */
export type CommercialIncomeAndExpense = {
  expenseByCategoryItem?: {
    groceryExpenseAmount?: NullableNumber
    clothingExpenseAmount?: NullableNumber
    medicalExpenseAmount?: NullableNumber
    householdExpenseAmount?: NullableNumber
    transportationExpenseAmount?: NullableNumber
    leisureExpenseAmount?: NullableNumber
    cultureExpenseAmount?: NullableNumber
    educationExpenseAmount?: NullableNumber
    entertainmentExpenseAmount?: NullableNumber
  } | null
}

export type RegionalIncomeSummary = {
  code?: string | null
  name?: string | null
  totalExpenseAmount?: NullableNumber
}

/**
 * 지역별 소비 요약 (`GET /commercials/{commercialCode}/summaries/income`).
 *
 * ⚠️ 세 단위는 **각각 독립적으로 null** 이다. 자치구·행정동은 원천이 살아 있어 보통 값이
 * 있고, 상권만 비는 것이 지금의 정상 상태다(위 `CommercialIncomeAndExpense` 주석).
 */
export type CommercialIncomeSummary = {
  district?: RegionalIncomeSummary | null
  administration?: RegionalIncomeSummary | null
  commercial?: RegionalIncomeSummary | null
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
