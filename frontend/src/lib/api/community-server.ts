import 'server-only'

import { getConfiguredBackendApiUrl } from '@/lib/env.server'
import type { CommunityPostDetail } from '@/types/community'

type CommunityMetadataFetchResponse = Pick<Response, 'ok' | 'json'>
type CommunityMetadataFetcher = (
  input: string,
  init: RequestInit,
) => Promise<CommunityMetadataFetchResponse>

const isCommunityPostDetail = (
  value: unknown,
): value is CommunityPostDetail => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const detail = value as Partial<CommunityPostDetail>
  return (
    typeof detail.postId === 'number' &&
    Number.isSafeInteger(detail.postId) &&
    detail.postId > 0 &&
    typeof detail.title === 'string' &&
    typeof detail.content === 'string' &&
    (detail.targetName === null || typeof detail.targetName === 'string')
  )
}

const readCommunityPostDetail = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const response = value as {
    dataHeader?: { success?: unknown }
    dataBody?: unknown
  }

  if (
    response.dataHeader?.success !== true ||
    !isCommunityPostDetail(response.dataBody)
  ) {
    return null
  }

  return response.dataBody
}

export const fetchCommunityPostForMetadata = async (
  postId: number,
  fetcher: CommunityMetadataFetcher = fetch,
) => {
  const backendApiUrl = getConfiguredBackendApiUrl()

  if (!backendApiUrl) {
    return null
  }

  try {
    const response = await fetcher(
      `${backendApiUrl}/api/v1/community/posts/${postId}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      },
    )

    if (!response.ok) {
      return null
    }

    return readCommunityPostDetail(await response.json())
  } catch {
    return null
  }
}
