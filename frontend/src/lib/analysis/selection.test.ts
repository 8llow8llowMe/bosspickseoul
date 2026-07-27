import { describe, expect, it } from 'vitest'

import {
  ANALYSIS_PERIOD_CODE,
  createAnalysisExplorerHref,
  createAnalysisResultHref,
  getActiveAnalysisStep,
  isCompleteAnalysisSelection,
  parseAnalysisSelection,
  selectAnalysisValue,
  type AnalysisSelection,
} from '@/lib/analysis/selection'

const completeSelection: AnalysisSelection = {
  districtCode: '11680',
  administrationCode: '11680640',
  commercialCode: '3110008',
  serviceCode: 'CS100001',
  periodCode: ANALYSIS_PERIOD_CODE,
}

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
