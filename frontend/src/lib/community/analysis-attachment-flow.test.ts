import { describe, expect, it } from 'vitest'

import { createCommunityEditorPayload } from '@/components/community/community-register-page'
import { communityMockSource } from '@/lib/community/community-mock'
import { toAnalysisAttachment } from '@/lib/community/comparison-draft-url'
import type { CommunityPostCreateRequest } from '@/types/community'

/**
 * 초안 → 저장 → 상세까지 **분석 첨부가 살아서 가는지** 한 흐름으로 확인한다.
 *
 * 조각별 단위 테스트로는 이 배선이 끊긴 것을 못 잡는다. 실제로 끊겨 있었다 —
 * 초안 응답은 4필드를 주는데 작성 요청에 실리지 않아 **받아도 저장할 곳이 없었다**
 * (BE 0f8b3a28 이 나머지 절반을 뚫기 전까지). 그 반쪽 상태로 되돌아가면 여기서 걸린다.
 *
 * 목 소스를 쓰는 이유: dev 의 community-service 가 내려가 있어도 배선은 검증할 수 있어야
 * 한다. 목은 실제 응답과 **모양이 같게** 만들어 두었다(특히 `analysisType` 의 비대칭).
 */
describe('분석 첨부 배선 (초안 → 저장 → 상세)', () => {
  const draftParams = {
    leftCommercialCode: '3110008',
    rightCommercialCode: '3110012',
    serviceCode: 'CS100001',
    administrationCode: '1168064000',
  }

  it('초안이 준 첨부가 상세까지 살아서 간다', async () => {
    const draftResponse =
      await communityMockSource.createComparisonDraft(draftParams)
    const draft = draftResponse.dataBody

    // 초안이 첨부를 실제로 준다.
    expect(draft?.analysisType?.code).toBe('COMMERCIAL_COMPARISON')

    const attachment = toAnalysisAttachment(draft)
    const payload = createCommunityEditorPayload(
      'create',
      {
        title: draft!.title,
        content: draft!.content,
        location: { targetType: 'ADMINISTRATION', targetCode: '1168064000' },
        images: [],
      },
      attachment,
    ) as CommunityPostCreateRequest

    /*
     * 요청의 `analysisType` 은 **코드 문자열**이어야 한다. 객체를 그대로 넘기면
     * 백엔드가 400 COMMUNITY_015 로 거절한다.
     */
    expect(payload.analysisType).toBe('COMMERCIAL_COMPARISON')
    expect(payload.analysisRefCode).toBe('3110008:3110012:CS100001:20233')

    const created = await communityMockSource.createPost(payload)

    // 상세에서는 다시 메타데이터 객체다.
    expect(created.dataBody.analysisType?.code).toBe('COMMERCIAL_COMPARISON')
    expect(created.dataBody.analysisRefCode).toBe(
      '3110008:3110012:CS100001:20233',
    )
    expect(created.dataBody.analysisRefName).toBe('3110008 · 3110012 비교')
  })

  /* 초안 없이 쓴 평범한 글에는 첨부 키가 아예 붙지 않는다. */
  it('초안 없이 쓴 글에는 첨부 필드를 싣지 않는다', async () => {
    const payload = createCommunityEditorPayload(
      'create',
      {
        title: '평범한 글',
        content: '본문',
        location: { targetType: 'ADMINISTRATION', targetCode: '1168064000' },
        images: [],
      },
      toAnalysisAttachment(null),
    ) as CommunityPostCreateRequest

    expect('analysisType' in payload).toBe(false)
    expect('analysisRefCode' in payload).toBe(false)

    const created = await communityMockSource.createPost(payload)
    expect(created.dataBody.analysisType).toBeNull()
  })

  /*
   * 수정 요청에는 첨부를 싣지 않는다. 백엔드가 분석 컬럼을 부분 갱신 대상에서 빼 두어
   * **보내지 않으면 보존된다** — 이미지(`imageKeys`)와 정반대 규칙이라 헷갈리기 쉽다.
   */
  it('수정 요청에는 첨부를 싣지 않는다', () => {
    const payload = createCommunityEditorPayload(
      'edit',
      {
        title: '고친 제목',
        content: '고친 본문',
        location: { targetType: 'ADMINISTRATION', targetCode: '1168064000' },
        images: [],
      },
      {
        analysisType: 'COMMERCIAL_COMPARISON',
        analysisRefCode: 'x',
        analysisRefName: 'y',
        analysisSnapshotKey: 'z',
      },
    )

    expect('analysisType' in payload).toBe(false)
  })
})
