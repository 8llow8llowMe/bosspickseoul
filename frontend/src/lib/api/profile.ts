import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type { MemberInfo } from '@/types/auth'

export const getMemberInfoData = async (signal?: AbortSignal) => {
  const response = signal
    ? await apiClient.get<ApiResponse<MemberInfo>>('/members/me', { signal })
    : await apiClient.get<ApiResponse<MemberInfo>>('/members/me')

  return response.data
}
