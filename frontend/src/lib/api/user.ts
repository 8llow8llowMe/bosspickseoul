import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  LoginPayload,
  LoginResponseBody,
  RegisterPayload,
  VerifyEmailCodePayload,
} from '@/types/auth'

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

export const registerUser = async (payload: RegisterPayload) => {
  const response = await apiClient.post<ApiResponse<null>>(
    '/member/signup',
    payload,
  )

  return response.data
}

export const loginUser = async (payload: LoginPayload) => {
  const response = await apiClient.post<ApiResponse<LoginResponseBody>>(
    '/member/login',
    payload,
  )

  return response.data
}

export const logoutUser = async () => {
  const response = await apiClient.post<ApiResponse<null>>('/member/logout')

  return response.data
}

export const getSocialAuthUrl = async (provider: string) => {
  const response = await apiClient.get<ApiResponse<string>>(
    `/oauth/${provider}`,
  )

  return response.data
}

export const socialLoginUser = async (provider: string, code: string) => {
  const response = await apiClient.get<ApiResponse<LoginResponseBody>>(
    `/oauth/${provider}/login?code=${code}`,
  )

  return response.data
}
