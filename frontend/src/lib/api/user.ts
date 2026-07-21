import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type { VerifyEmailCodePayload } from '@/types/auth'

export const sendEmailVerificationCode = async (memberEmail: string) => {
  const response = await apiClient.post<ApiResponse<null>>(
    `/email/send/${memberEmail}`,
  )

  return response.data
}

export const verifyEmailVerificationCode = async (
  payload: VerifyEmailCodePayload,
) => {
  const response = await apiClient.post<ApiResponse<null>>(
    `/email/verify/${payload.memberEmail}/${payload.emailCode}`,
  )

  return response.data
}

export const logoutUser = async () => {
  const response = await apiClient.post<ApiResponse<null>>('/member/logout')

  return response.data
}
