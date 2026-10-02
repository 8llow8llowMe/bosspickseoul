import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/lib/api/client'

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

    const result = await createCommercialComparisonDraft(
      {
        leftCommercialCode: '3110971',
        rightCommercialCode: '3110958',
        serviceCode: 'CS100001',
        administrationCode: '11680640',
      },
      '20261',
    )

    expect(post).toHaveBeenCalledWith(
      '/community/posts/drafts/commercial-comparisons',
      {
        targetType: 'ADMINISTRATION',
        targetCode: '11680640',
        leftCommercialCode: '3110971',
        rightCommercialCode: '3110958',
        serviceCode: 'CS100001',
        periodCode: '20261',
      },
      { signal: undefined },
    )
    expect(result).toBe(response)
  })

  /*
   * 분기는 부르는 쪽(글쓰기 화면)이 서버 기본 분기로 넘긴다 — 비교 화면이 그 분기로 표를 그렸다
   * (period-catalog.md D5-2). 이 함수는 받은 분기를 그대로 싣는다.
   */
  it('받은 분기를 그대로 싣는다', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: response })

    await createCommercialComparisonDraft(
      {
        leftCommercialCode: '3110971',
        rightCommercialCode: '3110958',
        serviceCode: 'CS100001',
        administrationCode: '11680640',
      },
      '20262',
    )

    expect(post.mock.calls[0][1]).toMatchObject({ periodCode: '20262' })
  })
})
