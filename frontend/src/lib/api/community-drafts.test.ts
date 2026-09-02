import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/lib/api/client'
import { RECOMMENDATION_PERIOD_CODE } from '@/lib/api/recommend'

import { createCommercialComparisonDraft } from './community-drafts'

const response = {
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: {
    targetType: { code: 'ADMINISTRATION', name: '행정동', description: '' },
    targetCode: '11680640',
    targetName: '역삼1동',
    title: '선정릉역 4번 vs 역삼역 4번',
    content: '두 상권을 비교해 봤습니다.',
  },
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createCommercialComparisonDraft', () => {
  it('행정동을 대상으로 초안을 요청한다', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: response })

    const result = await createCommercialComparisonDraft({
      leftCommercialCode: '3110971',
      rightCommercialCode: '3110958',
      serviceCode: 'CS100001',
      administrationCode: '11680640',
    })

    expect(post).toHaveBeenCalledWith(
      '/community/posts/drafts/commercial-comparisons',
      {
        targetType: 'ADMINISTRATION',
        targetCode: '11680640',
        leftCommercialCode: '3110971',
        rightCommercialCode: '3110958',
        serviceCode: 'CS100001',
        periodCode: RECOMMENDATION_PERIOD_CODE,
      },
      { signal: undefined },
    )
    expect(result).toBe(response)
  })

  /*
   * 비교 화면이 그린 표와 **같은 분기**여야 한다. 초안이 다른 분기를 말하면
   * 사용자가 방금 읽은 숫자와 글이 어긋난다.
   */
  it('비교 화면과 같은 분기 상수를 쓴다', () => {
    expect(RECOMMENDATION_PERIOD_CODE).toBe('20233')
  })
})
