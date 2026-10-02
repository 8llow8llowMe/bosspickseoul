import { describe, expect, it } from 'vitest'

import { createMapCamera } from '@/lib/analysis/map-camera'
import {
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

/** URL 에 분기가 없는 선택 — 「최신」이다(period-catalog.md D5-1). */
const completeSelection: AnalysisSelection = {
  districtCode: '11680',
  administrationCode: '11680640',
  commercialCode: '3110008',
  serviceCode: 'CS100001',
  periodCode: null,
}

/** 분기를 명시한 선택. */
const periodSelection: AnalysisSelection = {
  ...completeSelection,
  periodCode: '20261',
}

describe('analysis period helpers', () => {
  it('기간 코드를 연/분기로 분해하고 다시 합친다', () => {
    expect(parseAnalysisPeriod('20261')).toEqual({ year: 2026, quarter: 1 })
    expect(parseAnalysisPeriod('20214')).toEqual({ year: 2021, quarter: 4 })
    expect(buildAnalysisPeriod(2023, 3)).toBe('20233')
    expect(buildAnalysisPeriod(2021, 4)).toBe('20214')
  })

  // 연도·분기 범위는 서버 기본 분기에서 유도한다 — period-catalog.test.ts 가 본다.
})

describe('analysis selection', () => {
  it('상위 선택을 바꾸면 하위 선택을 초기화한다', () => {
    expect(selectAnalysisValue(completeSelection, 'district', '11710')).toEqual(
      {
        districtCode: '11710',
        administrationCode: null,
        commercialCode: null,
        serviceCode: null,
        periodCode: null,
      },
    )
    expect(
      selectAnalysisValue(completeSelection, 'administration', '11680645'),
    ).toEqual({
      ...completeSelection,
      administrationCode: '11680645',
      commercialCode: null,
      serviceCode: null,
    })
  })

  it('상권만 바꿔도 업종은 유지한다', () => {
    // 같은 업종으로 후보 상권을 견주는 흐름을 지킨다. 상권을 바꿀 때마다 업종이
    // 사라지면 4단계가 리셋되고 「분석 결과 보기」가 다시 잠긴다.
    expect(
      selectAnalysisValue(completeSelection, 'commercial', '3110010'),
    ).toEqual({
      ...completeSelection,
      commercialCode: '3110010',
    })
  })

  it('지도 경로와 목록 경로가 같은 업종 유지 규칙을 쓴다', () => {
    // 지도 클릭(selectCommercialWithParents)만 업종을 보존하고 목록 클릭은
    // 버리던 불일치가 되살아나면 이 단언이 깨진다.
    const fromList = selectAnalysisValue(
      completeSelection,
      'commercial',
      '3110010',
    )
    const fromMap = selectCommercialWithParents(completeSelection, {
      commercialCode: '3110010',
      administrationCode: completeSelection.administrationCode!,
    })

    expect(fromList.serviceCode).toBe(completeSelection.serviceCode)
    expect(fromMap.serviceCode).toBe(completeSelection.serviceCode)
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
    expect(createAnalysisResultHref(periodSelection, 'summary')).toBe(
      '/analysis/result?districtCode=11680&administrationCode=11680640&commercialCode=3110008&serviceCode=CS100001&periodCode=20261&tab=summary',
    )
    expect(createAiReportHref(periodSelection)).toBe(
      '/analysis/report?districtCode=11680&administrationCode=11680640&commercialCode=3110008&serviceCode=CS100001&periodCode=20261',
    )
  })

  /* 「최신」 링크는 분기를 싣지 않는다 — 데이터가 적재되면 같은 링크가 새 분기를 보여 준다. */
  it('분기를 지정하지 않은 선택은 결과·리포트 URL 에도 분기를 싣지 않는다', () => {
    expect(
      createAnalysisResultHref(completeSelection, 'summary'),
    ).not.toContain('periodCode')
    expect(createAiReportHref(completeSelection)).not.toContain('periodCode')
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

  it('형식이 어긋나거나 2021년보다 이른 기간 코드는 조용히 「최신(null)」으로 둔다', () => {
    const cases = [
      '2024',
      '202413',
      'abcde',
      '20240',
      '20245',
      '',
      ' ',
      '20191',
      '20204',
    ]

    cases.forEach(periodCode => {
      const params = new URLSearchParams({ districtCode: '11680', periodCode })
      expect(parseAnalysisSelection(params).periodCode).toBeNull()
    })

    expect(
      parseAnalysisSelection(new URLSearchParams({ districtCode: '11680' }))
        .periodCode,
    ).toBeNull()
  })

  /*
    상한은 읽을 때 보지 않는다 — 서버 기본 분기를 알아야 판정할 수 있다. 최신보다 새 분기는 카탈로그가 온
    뒤 해석에서 최신으로 내린다(resolveAnalysisPeriod, period-catalog.test.ts).
  */
  it('아직 적재 여부를 모르는 미래 분기도 형식이 맞으면 읽어 둔다', () => {
    expect(
      parseAnalysisSelection(new URLSearchParams({ periodCode: '20264' }))
        .periodCode,
    ).toBe('20264')
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
        periodCode: null,
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
        periodCode: null,
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
      createAnalysisResultHref(periodSelection, 'sales', camera),
      'http://x',
    ).searchParams

    expect(params.get('districtCode')).toBe('11680')
    expect(params.get('administrationCode')).toBe('11680640')
    expect(params.get('commercialCode')).toBe('3110008')
    expect(params.get('serviceCode')).toBe('CS100001')
    expect(params.get('periodCode')).toBe('20261')
    expect(params.get('tab')).toBe('sales')
    expect(params.get('c')).toBe('37.54893,127.06612,3')
  })

  // TC-MS-026
  it('AI 리포트 href에는 카메라가 붙지 않는다 (/analysis/report 에 지도가 없다)', () => {
    expect(createAiReportHref(completeSelection)).not.toContain('c=')
  })

  it('고른 기간은 탐색 href에도 실어 왕복 손실을 막는다', () => {
    const custom: AnalysisSelection = {
      ...completeSelection,
      periodCode: '20221',
    }

    // 지정이 없으면(최신) 파라미터가 늘지 않는다
    expect(createAnalysisExplorerHref(completeSelection)).not.toContain(
      'periodCode',
    )
    expect(createAnalysisExplorerHref(custom)).toContain('periodCode=20221')
  })
})
