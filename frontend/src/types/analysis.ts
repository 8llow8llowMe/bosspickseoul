import type { ApiResponse } from '@/types/api'

export type SelectedServiceType = {
  serviceCode: string
  serviceCodeName: string
  serviceType: string
}

export type TimeSlotFootTraffic = {
  footTraffic00: number
  footTraffic06: number
  footTraffic11: number
  footTraffic14: number
  footTraffic17: number
  footTraffic21: number
}

export type DayOfWeekFootTraffic = {
  monFootTraffic: number
  tueFootTraffic: number
  wedFootTraffic: number
  thuFootTraffic: number
  friFootTraffic: number
  satFootTraffic: number
  sunFootTraffic: number
}

export type AgeGroupFootTraffic = {
  teenFootTraffic: number
  twentyFootTraffic: number
  thirtyFootTraffic: number
  fortyFootTraffic: number
  fiftyFootTraffic: number
  sixtyFootTraffic: number
}

export type AgeGenderPercentFootTraffic = {
  maleTeenFootTrafficPercent: number
  femaleTeenFootTrafficPercent: number
  maleTwentyFootTrafficPercent: number
  femaleTwentyFootTrafficPercent: number
  maleThirtyFootTrafficPercent: number
  femaleThirtyFootTrafficPercent: number
  maleFortyFootTrafficPercent: number
  femaleFortyFootTrafficPercent: number
  maleFiftyFootTrafficPercent: number
  femaleFiftyFootTrafficPercent: number
  maleSixtyFootTrafficPercent: number
  femaleSixtyFootTrafficPercent: number
}

export type FlowPopulationDataBody = {
  timeSlotFootTraffic: TimeSlotFootTraffic
  dayOfWeekFootTraffic: DayOfWeekFootTraffic
  ageGroupFootTraffic: AgeGroupFootTraffic
  ageGenderPercentFootTraffic: AgeGenderPercentFootTraffic
}

export type TimeSalesInfo = {
  sales00: number
  sales06: number
  sales11: number
  sales14: number
  sales17: number
  sales21: number
}

export type DaySalesInfo = {
  monSales: number
  tueSales: number
  wedSales: number
  thuSales: number
  friSales: number
  satSales: number
  sunSales: number
}

export type AgeSalesInfo = {
  teenSales: number
  twentySales: number
  thirtySales: number
  fortySales: number
  fiftySales: number
  sixtySales: number
}

export type AgeGenderPercentSales = {
  maleTeenSalesPercent: number
  femaleTeenSalesPercent: number
  maleTwentySalesPercent: number
  femaleTwentySalesPercent: number
  maleThirtySalesPercent: number
  femaleThirtySalesPercent: number
  maleFortySalesPercent: number
  femaleFortySalesPercent: number
  maleFiftySalesPercent: number
  femaleFiftySalesPercent: number
  maleSixtySalesPercent: number
  femaleSixtySalesPercent: number
}

export type DaySalesCountInfo = {
  monSalesCount: number
  tueSalesCount: number
  wedSalesCount: number
  thuSalesCount: number
  friSalesCount: number
  satSalesCount: number
  sunSalesCount: number
}

export type TimeSalesCountInfo = {
  salesCount00: number
  salesCount06: number
  salesCount11: number
  salesCount14: number
  salesCount17: number
  salesCount21: number
}

export type GenderSalesCountInfo = {
  maleSalesCount: number
  femaleSalesCount: number
}

export type AnnualQuarterSalesInfo = {
  periodCode: string
  totalSales: number
}

export type SalesDataBody = {
  timeSalesInfo: TimeSalesInfo
  daySalesInfo: DaySalesInfo
  ageSalesInfo: AgeSalesInfo
  ageGenderPercentSales: AgeGenderPercentSales
  daySalesCountInfo: DaySalesCountInfo
  timeSalesCountInfo: TimeSalesCountInfo
  genderSalesCountInfo: GenderSalesCountInfo
  annualQuarterSalesInfos: AnnualQuarterSalesInfo[]
}

export type DistrictTotalSalesInfo = {
  districtCode: string
  districtCodeName: string
  totalSales: number
}

export type AdministrationTotalSalesInfo = {
  administrationCode: string
  administrationCodeName: string
  totalSales: number
}

export type CommercialTotalSalesInfo = {
  commercialCode: string
  commercialCodeName: string
  totalSales: number
}

export type TotalSalesDataBody = {
  districtTotalSalesInfo: DistrictTotalSalesInfo
  administrationTotalSalesInfo: AdministrationTotalSalesInfo
  commercialTotalSalesInfo: CommercialTotalSalesInfo
}

export type SameStoreInfo = {
  serviceCodeName: string
  totalStore: number
}

export type FranchiseStoreInfo = {
  normalStore: number
  franchiseStore: number
  normalStorePercentage: number
  franchisePercentage: number
}

export type OpenAndCloseStoreInfo = {
  openedRate: number
  closedRate: number
}

export type StoreCountDataBody = {
  sameStoreInfos: SameStoreInfo[]
  sameTotalStore: number
  franchiseStoreInfo: FranchiseStoreInfo
  openAndCloseStoreInfo: OpenAndCloseStoreInfo
}

export type PopulationInfo = {
  totalPopulation: number
  teenPopulation: number
  twentyPopulation: number
  thirtyPopulation: number
  fortyPopulation: number
  fiftyPopulation: number
  sixtyPopulation: number
}

export type ResidentPopulationDataBody = {
  populationInfo: PopulationInfo
  malePercentage: number
  femalePercentage: number
}

export type AvgIncomeInfo = {
  monthAvgIncome: number
  incomeSectionCode: number
}

export type AnnualQuarterIncomeInfo = {
  periodCode: string
  totalPrice: number
}

export type TypeIncomeInfo = {
  groceryPrice: number
  clothesPrice: number
  medicalPrice: number
  lifePrice: number
  trafficPrice: number
  leisurePrice: number
  culturePrice: number
  educationPrice: number
  luxuryPrice: number
}

export type ExpenditureDataBody = {
  avgIncomeInfo: AvgIncomeInfo
  annualQuarterIncomeInfos: AnnualQuarterIncomeInfo[]
  typeIncomeInfo: TypeIncomeInfo
}

export type DistrictTotalIncomeInfo = {
  districtCode: string
  districtCodeName: string
  totalPrice: number
}

export type AdministrationTotalIncomeInfo = {
  administrationCode: string
  administrationCodeName: string
  totalPrice: number
}

export type CommercialTotalIncomeInfo = {
  commercialCode: string
  commercialCodeName: string
  totalPrice: number
}

export type TotalExpenditureDataBody = {
  districtTotalIncomeInfo: DistrictTotalIncomeInfo
  administrationTotalIncomeInfo: AdministrationTotalIncomeInfo
  commercialTotalIncomeInfo: CommercialTotalIncomeInfo
}

export type AnalysisBookmarkRequest = {
  districtCode: string
  districtCodeName: string
  administrationCode: string
  administrationCodeName: string
  commercialCode: string
  commercialCodeName: string
  serviceType: string
  serviceCode: string
  serviceCodeName: string
}

export type AnalysisBookmark = {
  districtCode: string
  districtCodeName: string
  administrationCode: string
  administrationCodeName: string
  commercialCode: string
  commercialCodeName: string
  serviceType: string
  serviceCode: string
  serviceCodeName: string
  createdAt: string
}

export type AnalysisBookmarksBody = {
  data: AnalysisBookmark[]
}

export type ServiceListResponse = ApiResponse<SelectedServiceType[]>
export type FlowPopulationResponse = ApiResponse<FlowPopulationDataBody>
export type SalesResponse = ApiResponse<SalesDataBody>
export type TotalSalesResponse = ApiResponse<TotalSalesDataBody>
export type StoreCountResponse = ApiResponse<StoreCountDataBody>
export type ResidentPopulationResponse = ApiResponse<ResidentPopulationDataBody>
export type ExpenditureResponse = ApiResponse<ExpenditureDataBody>
export type TotalExpenditureResponse = ApiResponse<TotalExpenditureDataBody>
export type AnalysisBookmarksResponse = ApiResponse<AnalysisBookmarksBody>
