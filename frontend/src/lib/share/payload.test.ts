import { describe, expect, it } from 'vitest'
import {
  buildAdministrationAnalysisPayload,
  buildAiReportPayload,
  buildCommercialAnalysisPayload,
  isShareType,
  isSharePayloadWithinLimit,
  measureSharePayload,
  normalizeSharePayload,
  SHARE_PAYLOAD_MAX_LENGTH,
} from './payload'

const completeSelection = {
  districtCode: '11680',
  administrationCode: '11680510',
  commercialCode: '3110008',
  serviceCode: 'CS100001',
  periodCode: '20233',
}

describe('share payload builders', () => {
  it('상권 분석 payload 는 화면 복원에 필요한 최소 상태만 담는다', () => {
    expect(buildCommercialAnalysisPayload(completeSelection)).toEqual({
      districtCode: '11680',
      administrationCode: '11680510',
      commercialCode: '3110008',
      serviceCode: 'CS100001',
      periodCode: '20233',
    })
  })

  it('기본 탭(summary)은 payload 에 담지 않아 같은 화면 상태를 같은 코드로 만든다', () => {
    const withDefaultTab = buildCommercialAnalysisPayload(
      completeSelection,
      'summary',
    )
    expect(withDefaultTab).not.toHaveProperty('tab')
    expect(normalizeSharePayload(withDefaultTab!)).toBe(
      normalizeSharePayload(buildCommercialAnalysisPayload(completeSelection)!),
    )
  })

  it('기본이 아닌 탭은 payload 에 담는다', () => {
    expect(
      buildCommercialAnalysisPayload(completeSelection, 'sales'),
    ).toMatchObject({ tab: 'sales' })
  })

  it('선택이 불완전하면 null 이라 공유·보관 버튼을 막을 수 있다', () => {
    expect(
      buildCommercialAnalysisPayload({
        ...completeSelection,
        serviceCode: null,
      }),
    ).toBeNull()
    expect(
      buildCommercialAnalysisPayload({
        ...completeSelection,
        districtCode: ' ',
      }),
    ).toBeNull()
  })

  it('AI 리포트 payload 에는 탭이 없다', () => {
    expect(buildAiReportPayload(completeSelection)).toEqual({
      districtCode: '11680',
      administrationCode: '11680510',
      commercialCode: '3110008',
      serviceCode: 'CS100001',
      periodCode: '20233',
    })
  })

  it('행정동 payload 는 자치구와 행정동을 모두 요구한다', () => {
    expect(buildAdministrationAnalysisPayload('11680', '11680510')).toEqual({
      districtCode: '11680',
      administrationCode: '11680510',
    })
    expect(buildAdministrationAnalysisPayload('11680', null)).toBeNull()
  })
})

describe('share payload normalization', () => {
  it('key 순서가 달라도 같은 정규화 결과를 낸다 (백엔드가 같은 코드로 재사용)', () => {
    expect(normalizeSharePayload({ b: '2', a: '1' })).toBe(
      normalizeSharePayload({ a: '1', b: '2' }),
    )
  })

  it('2000자 제한을 넘는 payload 를 걸러낸다', () => {
    const ok = buildCommercialAnalysisPayload(completeSelection)!
    expect(measureSharePayload(ok)).toBeLessThan(SHARE_PAYLOAD_MAX_LENGTH)
    expect(isSharePayloadWithinLimit(ok)).toBe(true)

    // 분석 결과 데이터를 담으면 이렇게 된다 — 백엔드가 400 으로 거절한다.
    const tooBig = { ...ok, blob: 'x'.repeat(SHARE_PAYLOAD_MAX_LENGTH) }
    expect(isSharePayloadWithinLimit(tooBig)).toBe(false)
  })
})

describe('isShareType', () => {
  it('백엔드 ShareTargetType 5종만 통과시킨다', () => {
    expect(isShareType('COMMERCIAL_ANALYSIS')).toBe(true)
    expect(isShareType('AI_REPORT')).toBe(true)
    expect(isShareType('SIMULATION')).toBe(false)
    expect(isShareType(null)).toBe(false)
  })
})
