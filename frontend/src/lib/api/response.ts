import { readApiMessage } from '@/lib/api/api-error'
import type { ApiResponse } from '@/types/api'

export const isApiSuccess = <T>(response: ApiResponse<T> | null | undefined) =>
  response?.dataHeader.success === true

export const getApiMessage = (
  response: ApiResponse<unknown> | null | undefined,
  fallback = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
) => readApiMessage(response?.dataHeader.resultMessage ?? null) ?? fallback

export const isResponseError = (
  response: ApiResponse<unknown> | undefined,
): boolean => response !== undefined && !isApiSuccess(response)

export const getResponseBody = <T>(
  response: ApiResponse<T | null> | undefined,
): T | null => (isApiSuccess(response) ? (response?.dataBody ?? null) : null)
