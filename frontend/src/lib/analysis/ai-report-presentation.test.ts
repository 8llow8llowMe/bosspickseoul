import { describe, expect, it } from 'vitest'

import {
  buildAiLevelKey,
  isAiReportActive,
  isCommercialReportEmpty,
  resolveAiReportLevel,
  resolveAiReportTargetCode,
  resolveAiReportVisibility,
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

describe('buildAiLevelKey', () => {
  it('level과 code가 모두 있으면 조합 키를 만든다', () => {
    expect(buildAiLevelKey('district', '11680')).toBe('district:11680')
    expect(buildAiLevelKey('commercial', '3110008')).toBe('commercial:3110008')
  })

  it('level 또는 code 중 하나라도 없으면 null이다', () => {
    expect(buildAiLevelKey(null, '11680')).toBeNull()
    expect(buildAiLevelKey('district', null)).toBeNull()
    expect(buildAiLevelKey(null, null)).toBeNull()
  })
})

describe('isAiReportActive', () => {
  it('activeKey가 levelKey와 같은 비-null 값일 때만 active다', () => {
    expect(isAiReportActive('district:11680', 'district:11680')).toBe(true)
  })

  it('levelKey가 null이면 activeKey가 무엇이든 active가 아니다', () => {
    expect(isAiReportActive(null, null)).toBe(false)
    expect(isAiReportActive(null, 'district:11680')).toBe(false)
  })

  it('activeKey가 없거나 다른 키를 가리키면 active가 아니다', () => {
    expect(isAiReportActive('district:11680', null)).toBe(false)
    expect(isAiReportActive('district:11680', 'administration:11680640')).toBe(
      false,
    )
  })
})

describe('resolveAiReportVisibility', () => {
  it('enabled=false면 levelKey/panelOpen과 무관하게 둘 다 숨긴다', () => {
    expect(
      resolveAiReportVisibility({
        enabled: false,
        levelKey: 'district:11680',
        panelOpen: false,
      }),
    ).toEqual({ showCard: false, showPanel: false })
    expect(
      resolveAiReportVisibility({
        enabled: false,
        levelKey: 'district:11680',
        panelOpen: true,
      }),
    ).toEqual({ showCard: false, showPanel: false })
  })

  it('levelKey가 null이면 enabled와 무관하게 둘 다 숨긴다', () => {
    expect(
      resolveAiReportVisibility({ enabled: true, levelKey: null, panelOpen: false }),
    ).toEqual({ showCard: false, showPanel: false })
    expect(
      resolveAiReportVisibility({ enabled: true, levelKey: null, panelOpen: true }),
    ).toEqual({ showCard: false, showPanel: false })
  })

  it('enabled && levelKey 상태에서 panelOpen이 카드/패널을 상호 배타적으로 전환한다', () => {
    expect(
      resolveAiReportVisibility({
        enabled: true,
        levelKey: 'district:11680',
        panelOpen: false,
      }),
    ).toEqual({ showCard: true, showPanel: false })
    expect(
      resolveAiReportVisibility({
        enabled: true,
        levelKey: 'district:11680',
        panelOpen: true,
      }),
    ).toEqual({ showCard: false, showPanel: true })
  })
})
