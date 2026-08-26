import { describe, expect, it } from 'vitest'

import { createMapCamera } from '@/lib/analysis/map-camera'
import {
  ANALYSIS_PERIOD_CODE,
  buildAnalysisPeriod,
  parseAnalysisPeriod,
  createAnalysisExplorerHref,
  createAnalysisResultHref,
  createAiReportHref,
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
    expect(createAiReportHref(completeSelection)).toBe(
      '/analysis/report?districtCode=11680&administrationCode=11680640&commercialCode=3110008&serviceCode=CS100001&periodCode=20233',
    )
  })

  it('쿼리에서 선택을 읽고 유효한 기간 코드를 그대로 채택한다', () => {
    const params = new URLSearchParams({
      districtCode: '11680',
      administrationCode: '11680640',
      commercialCode: '3110008',
      serviceCode: 'CS100001',
      periodCode: '20221',
    })

    // periodCode 는 URL 이 정본이다 — 사용자가 고른 분기가 새로고침 뒤에도 남는다.
    expect(parseAnalysisSelection(params)).toEqual({
      ...completeSelection,
      periodCode: '20221',
    })
  })

  it('형식이 어긋나거나 지원하지 않는 기간 코드는 조용히 기본 분기로 폐기한다', () => {
    // 형식 위반 + 드롭다운이 제공하지 않는 연도(2024·2019). `<select>` 가 옵션에 없는
    // 값을 첫 옵션으로 그려 헤더와 어긋나는 화면이 되는 것을 막는다.
    const cases = [
      '2024',
      '202413',
      'abcde',
      '20240',
      '20245',
      '',
      ' ',
      '20241',
      '20191',
    ]

    cases.forEach(periodCode => {
      const params = new URLSearchParams({ districtCode: '11680', periodCode })
      expect(parseAnalysisSelection(params).periodCode).toBe(
        ANALYSIS_PERIOD_CODE,
      )
    })

    expect(
      parseAnalysisSelection(new URLSearchParams({ districtCode: '11680' }))
        .periodCode,
    ).toBe(ANALYSIS_PERIOD_CODE)
  })

  it('선택을 바꿔도 사용자가 고른 기간을 유지한다', () => {
    const custom: AnalysisSelection = {
      ...completeSelection,
      periodCode: '20221',
    }

    expect(selectAnalysisValue(custom, 'district', '11710').periodCode).toBe(
      '20221',
    )
    expect(selectAdministrationWithParent(custom, '11215530').periodCode).toBe(
      '20221',
    )
    expect(
      selectCommercialWithParents(custom, {
        commercialCode: '3110010',
        administrationCode: '11215530',
      }).periodCode,
    ).toBe('20221')
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

describe('href 빌더의 카메라 보존 (map-shell.md D4-1)', () => {
  const camera = createMapCamera(37.54893, 127.06612, 3)

  // TC-MS-020
  it('탐색 href의 쿼리 마지막에 c=lat,lng,level 을 붙인다', () => {
    const href = createAnalysisExplorerHref(completeSelection, camera)

    expect(href).toBe(
      '/analysis?districtCode=11680&administrationCode=11680640&commercialCode=3110008&serviceCode=CS100001&c=37.54893%2C127.06612%2C3',
    )
    expect(new URL(href, 'http://x').searchParams.get('c')).toBe(
      '37.54893,127.06612,3',
    )
  })

  // TC-MS-021 — 하위호환
  it('카메라가 없으면 c 파라미터가 아예 없고 기존 출력과 동일하다', () => {
    expect(createAnalysisExplorerHref(completeSelection, null)).toBe(
      createAnalysisExplorerHref(completeSelection),
    )
    expect(createAnalysisExplorerHref(completeSelection)).not.toContain('c=')
    expect(createAnalysisResultHref(completeSelection, 'summary', null)).toBe(
      createAnalysisResultHref(completeSelection, 'summary'),
    )
  })

  // TC-MS-022
  it('결과 href는 조건·기간·탭·카메라를 모두 포함한다', () => {
    const params = new URL(
      createAnalysisResultHref(completeSelection, 'sales', camera),
      'http://x',
    ).searchParams

    expect(params.get('districtCode')).toBe('11680')
    expect(params.get('administrationCode')).toBe('11680640')
    expect(params.get('commercialCode')).toBe('3110008')
    expect(params.get('serviceCode')).toBe('CS100001')
    expect(params.get('periodCode')).toBe(ANALYSIS_PERIOD_CODE)
    expect(params.get('tab')).toBe('sales')
    expect(params.get('c')).toBe('37.54893,127.06612,3')
  })

  // TC-MS-026
  it('AI 리포트 href에는 카메라가 붙지 않는다 (/analysis/report 에 지도가 없다)', () => {
    expect(createAiReportHref(completeSelection)).not.toContain('c=')
  })

  it('비기본 기간은 탐색 href에도 실어 왕복 손실을 막는다', () => {
    const custom: AnalysisSelection = {
      ...completeSelection,
      periodCode: '20221',
    }

    // 기본 분기면 기존 출력 그대로(파라미터가 늘지 않는다)
    expect(createAnalysisExplorerHref(completeSelection)).not.toContain(
      'periodCode',
    )
    expect(createAnalysisExplorerHref(custom)).toContain('periodCode=20221')
  })
})
