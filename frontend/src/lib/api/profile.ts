import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type { MemberInfo } from '@/types/auth'
import type {
  ChangePasswordPayload,
  UpdateMemberInfoPayload,
} from '@/types/profile'

export const getMemberInfoData = async () => {
  const response = await apiClient.get<ApiResponse<MemberInfo>>('/member/get')

  return response.data
}

export const uploadProfileImage = async (payload: FormData) => {
  const response = await apiClient.post<ApiResponse<string>>(
    '/firebase/upload',
    payload,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )

  return response.data
}

export const updateMemberInfo = async (payload: UpdateMemberInfoPayload) => {
  const response = await apiClient.patch<ApiResponse<null>>(
    '/member/update',
    payload,
  )

  return response.data
}

export const changeMemberPassword = async (payload: ChangePasswordPayload) => {
  const response = await apiClient.patch<ApiResponse<null>>(
    '/member/password/change',
    payload,
  )

  return response.data
}

export const deleteAccount = async () => {
  const response = await apiClient.delete<ApiResponse<null>>('/member/delete')

  return response.data
}
