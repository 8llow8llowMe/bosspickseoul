import type { ApiMessage, ApiResponse } from '@/types/api'

export const isApiSuccess = <T>(response: ApiResponse<T> | null | undefined) =>
  response?.dataHeader.successCode === 0

const normalizeApiMessage = (message: ApiMessage | undefined) => {
  if (!message) {
    return null
  }

  if (typeof message === 'string') {
    return message
  }

  return Object.values(message).join('\n')
}

export const getApiMessage = (
  response: ApiResponse<unknown> | null | undefined,
  fallback = '요청 처리 중 문제가 발생했습니다.',
) => normalizeApiMessage(response?.dataHeader.resultMessage) ?? fallback
