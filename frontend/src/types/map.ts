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
export type RecommendSavedListResponse = ApiResponse<RecommendSavedListBody>
