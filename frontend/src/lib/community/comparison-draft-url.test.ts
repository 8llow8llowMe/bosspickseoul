import { describe, expect, it } from 'vitest'

import {
  createComparisonDraftHref,
  readComparisonDraftRequest,
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
