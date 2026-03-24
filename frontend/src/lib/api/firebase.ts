import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type { FcmSubscribePayload, FcmTopicPayload } from '@/types/chatting'

export const saveFcmDeviceToken = async (deviceToken: string) => {
  const response = await apiClient.post<ApiResponse<null>>(
    `/firebase/message/${encodeURIComponent(deviceToken)}`,
  )

  return response.data
}

export const deleteFcmDeviceToken = async (deviceToken: string) => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/firebase/message/${encodeURIComponent(deviceToken)}`,
  )

  return response.data
}

export const subscribeFcmTopic = async (payload: FcmSubscribePayload) => {
  const response = await apiClient.post<ApiResponse<null>>(
    '/firebase/message/subscribe',
    payload,
  )

  return response.data
}

export const sendFcmTopicMessage = async (payload: FcmTopicPayload) => {
  const response = await apiClient.post<ApiResponse<null>>(
    '/firebase/message/topic',
    payload,
  )

  return response.data
}
