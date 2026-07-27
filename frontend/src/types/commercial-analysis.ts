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

export type CommercialIncomeAndExpense = {
  averageIncomeItem?: {
    monthlyAverageIncomeAmount?: NullableNumber
    incomeBracketCode?: NullableNumber
  } | null
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
