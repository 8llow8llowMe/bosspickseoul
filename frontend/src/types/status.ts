import type { ApiResponse } from '@/types/api'

export type TopListItem = {
  districtCode: string
  districtCodeName: string
  total: number
  totalRate: number
  level: number
}

export type StatusTopList = {
  footTrafficTopTenList: TopListItem[]
  openedRateTopTenList: TopListItem[]
  salesTopTenList: TopListItem[]
  closedRateTopTenList: TopListItem[]
}

export type ChangeIndicatorDistrictDetail = {
  changeIndicator: string
  changeIndicatorName: string
  openedMonths: number
  closedMonths: number
}

export type FootTrafficSeries = {
  summary: string
  data: Record<string, number>
}

export type FootTrafficDistrictDetail = {
  footTrafficDistrictListByPeriod: FootTrafficSeries
  footTrafficDistrictListByTime: FootTrafficSeries
  footTrafficDistrictListByGender: FootTrafficSeries
  footTrafficDistrictListByAge: FootTrafficSeries
  footTrafficDistrictListByDay: FootTrafficSeries
}

export type StoreDistrictTotalTopEightList = {
  serviceCode: string
  serviceCodeName: string
  totalStore: number
}

export type OpenedStoreAdministrationTopFiveList = {
  administrationCode: string
  administrationCodeName: string
  curOpenedRate: number
}

export type ClosedStoreAdministrationTopFiveList = {
  administrationCode: string
  administrationCodeName: string
  curClosedRate: number
}

export type StoreDistrictDetail = {
  storeDistrictTotalTopEightList: StoreDistrictTotalTopEightList[]
  openedStoreAdministrationTopFiveList: OpenedStoreAdministrationTopFiveList[]
  closedStoreAdministrationTopFiveList: ClosedStoreAdministrationTopFiveList[]
}

export type SalesDistrictSalesTopFiveList = {
  serviceCode: string
  serviceCodeName: string
  monthSalesChangeRate: number
}

export type SalesAdministrationTopFiveList = {
  administrationCode: string
  administrationCodeName: string
  monthSalesChangeRate: number
}

export type SalesDistrictDetail = {
  salesDistrictSalesTopFiveList: SalesDistrictSalesTopFiveList[]
  salesAdministrationTopFiveList: SalesAdministrationTopFiveList[]
}

export type StatusDetail = {
  changeIndicatorDistrictDetail: ChangeIndicatorDistrictDetail
  footTrafficDistrictDetail: FootTrafficDistrictDetail
  storeDistrictDetail: StoreDistrictDetail
  salesDistrictDetail: SalesDistrictDetail
}

export type StatusTopListResponse = ApiResponse<StatusTopList>
export type StatusDetailResponse = ApiResponse<StatusDetail>
