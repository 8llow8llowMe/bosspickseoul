import { apiClient } from '@/lib/api/client'
import type {
  DistrictDetailResponse,
  DistrictTopTenResponse,
} from '@/types/status'

export const fetchStatusTopTen = async () => {
  const response =
    await apiClient.get<DistrictTopTenResponse>('/districts/top-ten')

  return response.data
}

export const fetchStatusDetail = async (districtCode: string) => {
  const response = await apiClient.get<DistrictDetailResponse>(
    `/districts/${districtCode}`,
  )

  return response.data
}
