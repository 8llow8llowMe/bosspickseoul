import { describe, expect, it } from 'vitest'

import {
  createComparisonDraftHref,
  readComparisonDraftRequest,
  toAnalysisAttachment,
} from './comparison-draft-url'

const read = (query: string) =>
  readComparisonDraftRequest(new URLSearchParams(query))

const COMPLETE =
  'draftSource=comparison&leftCommercialCode=3110971' +
  '&rightCommercialCode=3110958&serviceCode=CS100001' +
  '&administrationCode=11680640'

describe('comparison-draft-url', () => {
  it('초안 파라미터가 없으면 초안을 요청하지 않는다', () => {
    expect(read('')).toEqual({ kind: 'none' })
    expect(read('mock=1')).toEqual({ kind: 'none' })
  })

  it('완전한 파라미터를 읽는다', () => {
    expect(read(COMPLETE)).toEqual({
      kind: 'ready',
      params: {
        leftCommercialCode: '3110971',
        rightCommercialCode: '3110958',
        serviceCode: 'CS100001',
        administrationCode: '11680640',
      },
    })
  })

  /*
   * 빠진 값을 조용히 무시하고 빈 폼을 주면 사용자는 초안이 왜 안 왔는지 모른다.
   * 화면이 안내를 띄울 수 있도록 `none` 과 구분한다.
   */
  it('초안을 요청했는데 값이 빠지면 invalid 다', () => {
    expect(read('draftSource=comparison')).toEqual({ kind: 'invalid' })
    expect(read(COMPLETE.replace('&serviceCode=CS100001', ''))).toEqual({
      kind: 'invalid',
    })
    expect(read(COMPLETE.replace('3110958', '   '))).toEqual({
      kind: 'invalid',
    })
  })

  /* 좌우가 같으면 비교가 성립하지 않는다 — 백엔드도 400 으로 막는다. */
  it('좌우 상권이 같으면 invalid 다', () => {
    expect(read(COMPLETE.replace('3110958', '3110971'))).toEqual({
      kind: 'invalid',
    })
  })

  it('모르는 draftSource 는 초안 없음으로 읽는다', () => {
    expect(read(COMPLETE.replace('comparison', 'simulation'))).toEqual({
      kind: 'none',
    })
  })

  it('생성과 파싱이 왕복한다', () => {
    const href = createComparisonDraftHref({
      leftCommercialCode: '3110971',
      rightCommercialCode: '3110958',
      serviceCode: 'CS100001',
      administrationCode: '11680640',
    })

    expect(href.startsWith('/community/register?')).toBe(true)
    expect(read(href.split('?')[1] ?? '')).toEqual({
      kind: 'ready',
      params: {
        leftCommercialCode: '3110971',
        rightCommercialCode: '3110958',
        serviceCode: 'CS100001',
        administrationCode: '11680640',
      },
    })
  })
})

/*
 * ⚠️ 이 변환이 이 파일에 있는 이유는 **`analysisType` 의 타입이 자리마다 다르기**
 * 때문이다. 초안·상세 응답은 메타데이터 객체이고 작성 요청은 코드 문자열이다.
 * 호출부가 객체를 그대로 넘기면 백엔드가 400 `COMMUNITY_015` 로 거절하는데, 그 실패는
 * 사용자가 글을 다 쓰고 **저장을 누른 가장 늦은 순간**에 드러난다.
 */
describe('toAnalysisAttachment', () => {
  const draft = {
    targetType: { code: 'ADMINISTRATION', name: '행정동', description: '' },
    targetCode: '11680640',
    targetName: '역삼1동',
    title: '제목',
    content: '본문',
    analysisType: {
      code: 'COMMERCIAL_COMPARISON',
      name: '상권 비교',
      description: '',
    },
    analysisRefCode: '3110008:3110012:CS100001:20233',
    analysisRefName: '강남역 · 역삼역 비교',
    analysisSnapshotKey: 'community/analysis/a.json',
  }

  it('메타데이터 객체를 코드 문자열로 바꾼다', () => {
    expect(toAnalysisAttachment(draft)).toEqual({
      analysisType: 'COMMERCIAL_COMPARISON',
      analysisRefCode: '3110008:3110012:CS100001:20233',
      analysisRefName: '강남역 · 역삼역 비교',
      analysisSnapshotKey: 'community/analysis/a.json',
    })
  })

  /*
   * 타입이 없으면 첨부 자체가 없는 것으로 본다 — 나머지 세 필드는 그것에 딸린 값이라,
   * 타입 없이 참조 코드만 보내면 백엔드가 무엇에 붙일지 알 수 없다.
   */
  it('타입이 없으면 첨부가 없는 것으로 본다', () => {
    expect(toAnalysisAttachment(null)).toBeNull()
    expect(toAnalysisAttachment(undefined)).toBeNull()
    expect(toAnalysisAttachment({ ...draft, analysisType: null })).toBeNull()
    expect(
      toAnalysisAttachment({
        ...draft,
        analysisType: { code: '   ', name: '', description: '' },
      }),
    ).toBeNull()
  })

  it('딸린 필드가 없으면 null 로 채운다', () => {
    expect(
      toAnalysisAttachment({
        ...draft,
        analysisRefCode: null,
        analysisRefName: null,
        analysisSnapshotKey: null,
      }),
    ).toEqual({
      analysisType: 'COMMERCIAL_COMPARISON',
      analysisRefCode: null,
      analysisRefName: null,
      analysisSnapshotKey: null,
    })
  })
})
