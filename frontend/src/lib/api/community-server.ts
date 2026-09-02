import 'server-only'

import { getConfiguredBackendApiUrl } from '@/lib/env.server'
import type { CommunityId, CommunityPostDetail } from '@/types/community'

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
    // postId 는 Snowflake 문자열이다. 예전의 `typeof === 'number' && isSafeInteger`
    // 검사는 실제 응답을 전부 탈락시켜 메타데이터가 조용히 기본값으로 떨어졌다.
    typeof detail.postId === 'string' &&
    /^[1-9]\d*$/.test(detail.postId) &&
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
  postId: CommunityId,
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
