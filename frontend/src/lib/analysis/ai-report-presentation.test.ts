import { describe, expect, it } from 'vitest'

import {
  isCommercialReportEmpty,
  resolveAiReportLevel,
  resolveAiReportTargetCode,
  toCommercialReportView,
  toRegionReportView,
} from '@/lib/analysis/ai-report-presentation'
import { createEmptyAnalysisSelection } from '@/lib/analysis/selection'

const base = createEmptyAnalysisSelection()

describe('resolveAiReportLevel', () => {
  it('가장 깊게 선택된 레벨을 고른다(분야는 무관)', () => {
    expect(resolveAiReportLevel(base)).toBeNull()
    expect(resolveAiReportLevel({ ...base, districtCode: '11680' })).toBe('district')
    expect(
      resolveAiReportLevel({ ...base, districtCode: '11680', administrationCode: '11680640' }),
    ).toBe('administration')
    expect(
      resolveAiReportLevel({
        ...base,
        districtCode: '11680',
        administrationCode: '11680640',
        commercialCode: '3110008',
        serviceCode: 'CS100001',
      }),
    ).toBe('commercial')
  })
})

describe('resolveAiReportTargetCode', () => {
  it('레벨에 해당하는 코드를 돌려준다', () => {
    const sel = { ...base, districtCode: '11680', administrationCode: '11680640' }
    expect(resolveAiReportTargetCode(sel, 'district')).toBe('11680')
    expect(resolveAiReportTargetCode(sel, 'administration')).toBe('11680640')
    expect(resolveAiReportTargetCode(sel, 'commercial')).toBeNull()
  })
})

describe('toCommercialReportView', () => {
  it('3블록으로 매핑하고 빈/null 리스트는 제거·공백은 정리한다', () => {
    const view = toCommercialReportView({
      summary: ' 요약 ',
      strengths: ['유동 많음', '  ', null as unknown as string],
      risks: null,
      recommendedBusinessCategories: ['카페'],
      recommendedCustomerSegments: [],
      recommendedOperatingHours: ['점심'],
      avoidOperatingHours: null,
      targetAgeGroups: ['20대'],
      targetGenders: null,
      operationTips: null,
      businessInsight: '창업 코멘트',
      generatedAt: '2026-08-07T00:00:00Z',
    })
    expect(view.headline).toEqual({ summary: '요약', insight: '창업 코멘트' })
    expect(view.strengths).toEqual(['유동 많음'])
    expect(view.risks).toEqual([])
    expect(view.actions).toEqual([
      { title: '추천 업종군', items: ['카페'] },
      { title: '추천 운영 시간', items: ['점심'] },
      { title: '타깃 연령', items: ['20대'] },
    ])
  })
})

describe('toRegionReportView / empty guards', () => {
  it('지역 리포트를 정규화한다', () => {
    const view = toRegionReportView({
      summary: '시장 요약',
      marketStatus: '성장',
      recommendedBusinessCategories: ['카페'],
      cautionBusinessCategories: null,
      businessInsight: '코멘트',
      generatedAt: '2026-08-07',
    })
    expect(view.headline).toEqual({ summary: '시장 요약', marketStatus: '성장' })
    expect(view.recommended).toEqual(['카페'])
    expect(view.caution).toEqual([])
  })

  it('완전히 빈 상권 뷰는 empty로 판정한다', () => {
    const empty = toCommercialReportView({
      summary: null, strengths: null, risks: null,
      recommendedBusinessCategories: null, recommendedCustomerSegments: null,
      recommendedOperatingHours: null, avoidOperatingHours: null,
      targetAgeGroups: null, targetGenders: null, operationTips: null,
      businessInsight: null, generatedAt: null,
    })
    expect(isCommercialReportEmpty(empty)).toBe(true)
  })
})
