/**
 * 상권 비교 게시글 초안 (`POST /community/posts/drafts/commercial-comparisons`).
 * 인증 불필요 — 저장(`POST /community/posts`)만 `bearerAuth` 다.
 *
 * `community.ts` 와 나눠 둔 이유: 초안은 게시글 CRUD 가 아니라 **글쓰기 화면을 채우는
 * 재료**를 얻는 호출이고, 비교(추천) 쪽 상수와 규약을 함께 들고 있어야 한다.
 */

import { apiClient } from '@/lib/api/client'
import { RECOMMENDATION_PERIOD_CODE } from '@/lib/api/recommend'
import type { ComparisonDraftParams } from '@/lib/community/comparison-draft-url'
import type { CommunityComparisonDraftResponse } from '@/types/community'

const DRAFT_PATH = '/community/posts/drafts/commercial-comparisons'

/**
 * 요청 본문 조립을 여기 한 곳에 둔다 — 화면이 각자 `targetType` 을 정하면
 * 게시글이 어떤 대상에 붙는지가 화면마다 갈린다.
 *
 * **대상은 행정동이다.** 비교는 두 상권에 관한 글이라 한쪽 상권에 붙이면 임의적이고,
 * 행정동 피드에서 발견되지도 않는다.
 *
 * `periodCode` 는 비교 화면이 표를 그릴 때 쓴 상수를 그대로 쓴다
 * (`recommend-compare-page.tsx`). 초안이 다른 분기를 말하면 사용자가 방금 읽은
 * 숫자와 글이 어긋난다.
 */
export const createCommercialComparisonDraft = async (
  {
    leftCommercialCode,
    rightCommercialCode,
    serviceCode,
    administrationCode,
  }: ComparisonDraftParams,
  signal?: AbortSignal,
) => {
  const response = await apiClient.post<CommunityComparisonDraftResponse>(
    DRAFT_PATH,
    {
      targetType: 'ADMINISTRATION',
      targetCode: administrationCode,
      leftCommercialCode,
      rightCommercialCode,
      serviceCode,
      periodCode: RECOMMENDATION_PERIOD_CODE,
    },
    { signal },
  )

  return response.data
}
