import { apiClient } from '@/lib/api/client'
import type {
  RecommendCommercialResponse,
  RecommendSavedListResponse,
} from '@/types/map'
import type { ApiResponse } from '@/types/api'

type RecommendCodes = {
  districtCode: number
  administrationCode: number
}

type RecommendSaveCodes = RecommendCodes & {
  commercialCode: number
}

export const recommendCommercial = async (codes: RecommendCodes) => {
  const response = await apiClient.get<RecommendCommercialResponse>(
    `/recommendation/${codes.districtCode}/${codes.administrationCode}`,
  )

  return response.data
}

export const recommendSave = async (codes: RecommendSaveCodes) => {
  const response = await apiClient.post<ApiResponse<null>>(
    `/recommendation/${codes.districtCode}/${codes.administrationCode}/${codes.commercialCode}/save`,
  )

  return response.data
}

export const recommendDelete = async (codes: RecommendSaveCodes) => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/recommendation/${codes.districtCode}/${codes.administrationCode}/${codes.commercialCode}/cancel`,
  )

  return response.data
}

export const recommendSaveList = async () => {
  const response = await apiClient.get<RecommendSavedListResponse>(
    '/recommendation/save/list',
  )

  return response.data
}
