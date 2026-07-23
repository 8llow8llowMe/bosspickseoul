import type { ApiResponse } from '@/types/api'

export type StatusMetric = 'footTraffic' | 'sales' | 'opened' | 'closed'

export type DistrictFootTrafficTopTenItem = {
  districtCode: string
  districtName: string
  totalFootTraffic: number
  footTrafficChangeRate: number
}

export type DistrictSalesTopTenItem = {
  districtCode: string
  districtName: string
  totalSalesAmount: number
  salesChangeRate: number
}

export type DistrictOpenedStoreTopTenItem = {
  districtCode: string
  districtName: string
  openedStoreCount: number
  openingChangeRate: number
}

export type DistrictClosedStoreTopTenItem = {
  districtCode: string
  districtName: string
  closedStoreCount: number
  closureChangeRate: number
}

export type DistrictTopTenSummary = {
  footTrafficTopTenItems: DistrictFootTrafficTopTenItem[]
  salesTopTenItems: DistrictSalesTopTenItem[]
  openedStoreTopTenItems: DistrictOpenedStoreTopTenItem[]
  closedStoreTopTenItems: DistrictClosedStoreTopTenItem[]
}

export type StatusRankedItem = {
  rank: number
  districtCode: string
  districtName: string
  value: number
  changeRate: number
}

export type StatusTopTenByMetric = Record<StatusMetric, StatusRankedItem[]>

export type CodeNameDescriptionMetadata = {
  code: string
  name: string
  description: string
}

export type ChangeIndicator = {
  changeIndicatorCode: string
  changeIndicatorName: string
  averageOpenedMonths: number
  averageClosedMonths: number
}

export type DistrictPeriodFootTrafficItem = {
  periodCode: string
  totalFootTraffic: number
}

export type DistrictTimeSlotFootTrafficItem = {
  footTrafficTime00To06: number
  footTrafficTime06To11: number
  footTrafficTime11To14: number
  footTrafficTime14To17: number
  footTrafficTime17To21: number
  footTrafficTime21To24: number
  dominantTimeSlotType: CodeNameDescriptionMetadata
}

export type DistrictGenderFootTrafficItem = {
  maleFootTraffic: number
  femaleFootTraffic: number
  dominantGenderType: CodeNameDescriptionMetadata
}

export type DistrictAgeGroupFootTrafficItem = {
  age10FootTraffic: number
  age20FootTraffic: number
  age30FootTraffic: number
  age40FootTraffic: number
  age50FootTraffic: number
  age60PlusFootTraffic: number
  dominantAgeGroupType: CodeNameDescriptionMetadata
}

export type DistrictDayOfWeekFootTrafficItem = {
  mondayFootTraffic: number
  tuesdayFootTraffic: number
  wednesdayFootTraffic: number
  thursdayFootTraffic: number
  fridayFootTraffic: number
  saturdayFootTraffic: number
  sundayFootTraffic: number
  dominantDayOfWeekType: CodeNameDescriptionMetadata
}

export type DistrictFootTrafficDetail = {
  periodTrend: CodeNameDescriptionMetadata
  periodTotalFootTrafficList: DistrictPeriodFootTrafficItem[]
  timeSlot: DistrictTimeSlotFootTrafficItem
  gender: DistrictGenderFootTrafficItem
  ageGroup: DistrictAgeGroupFootTrafficItem
  dayOfWeek: DistrictDayOfWeekFootTrafficItem
}

export type DistrictStoreServiceTopItem = {
  serviceCode: string
  serviceName: string
  totalStoreCount: number
}

export type DistrictOpenedStoreAdministrationTopItem = {
  administrationCode: string
  administrationName: string
  openedStoreCount: number
  openingRate: number
}

export type DistrictClosedStoreAdministrationTopItem = {
  administrationCode: string
  administrationName: string
  closedStoreCount: number
  closureRate: number
}

export type DistrictStoreDetail = {
  topStoreServices: DistrictStoreServiceTopItem[]
  topOpenedAdministrations: DistrictOpenedStoreAdministrationTopItem[]
  topClosedAdministrations: DistrictClosedStoreAdministrationTopItem[]
}

export type DistrictSalesServiceTopItem = {
  serviceCode: string
  serviceName: string
  salesChangeRate: number
}

export type DistrictSalesAdministrationTopItem = {
  administrationCode: string
  administrationName: string
  totalSalesAmount: number
  salesChangeRate: number
}

export type DistrictSalesDetail = {
  topSalesServices: DistrictSalesServiceTopItem[]
  topSalesAdministrations: DistrictSalesAdministrationTopItem[]
}

export type DistrictDetail = {
  changeIndicator: ChangeIndicator
  footTraffic: DistrictFootTrafficDetail
  store: DistrictStoreDetail
  sales: DistrictSalesDetail
}

export type DistrictTopTenResponse = ApiResponse<DistrictTopTenSummary>
export type DistrictDetailResponse = ApiResponse<DistrictDetail>
