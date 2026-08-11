import { describe, expect, it } from 'vitest'

import {
  ANALYSIS_PERIOD_CODE,
  buildAnalysisPeriod,
  parseAnalysisPeriod,
  createAnalysisExplorerHref,
  createAnalysisResultHref,
  createEmptyAnalysisSelection,
  getActiveAnalysisStep,
  isCompleteAnalysisSelection,
  parseAnalysisSelection,
  selectAdministrationWithParent,
  selectAnalysisValue,
  selectCommercialWithParents,
  shouldAutoNavigateToAnalysis,
  type AnalysisSelection,
} from '@/lib/analysis/selection'

const completeSelection: AnalysisSelection = {
  districtCode: '11680',
  administrationCode: '11680640',
  commercialCode: '3110008',
  serviceCode: 'CS100001',
  periodCode: ANALYSIS_PERIOD_CODE,
}

describe('analysis period helpers', () => {
  it('기간 코드를 연/분기로 분해하고 다시 합친다', () => {
    expect(parseAnalysisPeriod('20233')).toEqual({ year: 2023, quarter: 3 })
    expect(parseAnalysisPeriod('20214')).toEqual({ year: 2021, quarter: 4 })
    expect(buildAnalysisPeriod(2023, 3)).toBe('20233')
    expect(buildAnalysisPeriod(2021, 4)).toBe('20214')
  })
})

describe('analysis selection', () => {
  it('상위 선택을 바꾸면 하위 선택을 초기화한다', () => {
    expect(selectAnalysisValue(completeSelection, 'district', '11710')).toEqual(
      {
        districtCode: '11710',
        administrationCode: null,
        commercialCode: null,
        serviceCode: null,
        periodCode: '20233',
      },
    )
    expect(
      selectAnalysisValue(completeSelection, 'commercial', '3110010'),
    ).toEqual({
      ...completeSelection,
      commercialCode: '3110010',
      serviceCode: null,
    })
  })

  it('선택 완료 여부와 다음 활성 단계를 계산한다', () => {
    expect(isCompleteAnalysisSelection(completeSelection)).toBe(true)
    expect(getActiveAnalysisStep(completeSelection)).toBe('service')
    expect(
      getActiveAnalysisStep({
        ...completeSelection,
        administrationCode: null,
        commercialCode: null,
        serviceCode: null,
      }),
    ).toBe('administration')
  })

  it('탐색과 결과 URL을 코드만으로 만든다', () => {
    expect(createAnalysisExplorerHref(completeSelection)).toBe(
      '/analysis?districtCode=11680&administrationCode=11680640&commercialCode=3110008&serviceCode=CS100001',
    )
    expect(createAnalysisResultHref(completeSelection, 'summary')).toBe(
      '/analysis/result?districtCode=11680&administrationCode=11680640&commercialCode=3110008&serviceCode=CS100001&periodCode=20233&tab=summary',
    )
  })

  it('쿼리에서 선택을 읽고 지원하지 않는 시점은 기본값으로 정규화한다', () => {
    const params = new URLSearchParams({
      districtCode: '11680',
      administrationCode: '11680640',
      commercialCode: '3110008',
      serviceCode: 'CS100001',
      periodCode: '20241',
    })

    expect(parseAnalysisSelection(params)).toEqual(completeSelection)
  })
})

describe('selectAdministrationWithParent', () => {
  it('동 선택 시 구(앞5자리)도 세팅하고 하위는 초기화', () => {
    const r = selectAdministrationWithParent(
      createEmptyAnalysisSelection(),
      '11215530',
    )
    expect(r.administrationCode).toBe('11215530')
    expect(r.districtCode).toBe('11215')
    expect(r.commercialCode).toBeNull()
    expect(r.serviceCode).toBeNull()
  })
})

describe('selectCommercialWithParents', () => {
  it('상권+부모 동/구 세팅, serviceCode는 보존', () => {
    const base = {
      ...createEmptyAnalysisSelection(),
      serviceCode: 'CS100010',
    }
    const r = selectCommercialWithParents(base, {
      commercialCode: '3110954',
      administrationCode: '11215530',
    })
    expect(r.commercialCode).toBe('3110954')
    expect(r.administrationCode).toBe('11215530')
    expect(r.districtCode).toBe('11215')
    expect(r.serviceCode).toBe('CS100010')
  })
})

describe('shouldAutoNavigateToAnalysis', () => {
  it('4개 코드 모두 있으면 true', () => {
    expect(
      shouldAutoNavigateToAnalysis({
        districtCode: '11215',
        administrationCode: '11215530',
        commercialCode: '3110954',
        serviceCode: 'CS100010',
        periodCode: '20233',
      }),
    ).toBe(true)
  })
  it('하나라도 없으면 false', () => {
    expect(
      shouldAutoNavigateToAnalysis({
        districtCode: '11215',
        administrationCode: '11215530',
        commercialCode: null,
        serviceCode: 'CS100010',
        periodCode: '20233',
      }),
    ).toBe(false)
  })
})
