import { apiClient } from '@/lib/api/client'
import type {
  StatusDetailResponse,
  StatusTopListResponse,
} from '@/types/status'

export const fetchTopList = async () => {
  const response =
    await apiClient.get<StatusTopListResponse>('/district/top/ten')

  return response.data
}

export const fetchStatusDetail = async (districtCode: number) => {
  const response = await apiClient.get<StatusDetailResponse>(
    `/district/detail/${districtCode}`,
  )

  return response.data
}
