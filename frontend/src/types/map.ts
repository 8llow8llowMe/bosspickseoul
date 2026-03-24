import type { ApiResponse } from '@/types/api'

export type PlaceOption = {
  name: string
  code: number
}

export type AdministrationArea = {
  administrationCodeName: string
  administrationCode: number
  centerLat: number
  centerLng: number
}

export type CommercialArea = {
  commercialCode: number
  commercialCodeName: string
  commercialClassificationCode: string
  commercialClassificationCodeName: string
  centerLat: number
  centerLng: number
}

export type RecommendCommercial = {
  commercialCode: number
  commercialCodeName: string
  salesCommercialInfo: {
    mySales: number
    administrationSales: number
    otherSales: number
  }
  footTrafficCommercialInfo: {
    myFootTraffic: number
    administrationFootTraffic: number
    otherFootTraffic: number
  }
  storeCommercialInfo: {
    myStores: number
    administrationStores: number
    otherStores: number
  }
  closedRateCommercialInfo: {
    myClosedRate: number
    administrationClosedRate: number
    otherClosedRate: number
  }
  blueOceanInfo: {
    serviceCodeName: string
    myStore: number
    totalStore: number
    storeRate: number
  }[]
}

export type RecommendSavedItem = {
  userId: number
  commercialCode: string
  commercialCodeName: string
  districtCode: string
  districtCodeName: string
  administrationCode: string
  administrationCodeName: string
  createdAt: string
}

export type RecommendSavedListBody = {
  data: RecommendSavedItem[]
  pageInfo: {
    page: number
    size: number
    totalElements: number
    totalPages: number
  }
}

export type AdministrationAreasResponse = ApiResponse<AdministrationArea[]>
export type CommercialAreasResponse = ApiResponse<CommercialArea[]>
export type RecommendCommercialResponse = ApiResponse<RecommendCommercial[]>
export type RecommendSavedListResponse = ApiResponse<RecommendSavedListBody>
