import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  createInvalidResultMessage,
  createResultTabHref,
  getCommercialBookmarkLoginHref,
} from '@/components/analysis/analysis-result-view'
import { AnalysisResultPageSurface } from '@/components/analysis/analysis-result-page'
import {
  ANALYSIS_PERIOD_CODE,
  type AnalysisSelection,
} from '@/lib/analysis/selection'

const validSelection: AnalysisSelection = {
  districtCode: '11680',
  administrationCode: '11680640',
  commercialCode: '3110008',
  serviceCode: 'CS100001',
  periodCode: ANALYSIS_PERIOD_CODE,
}

describe('analysis result helpers', () => {
  it('불완전한 조건의 안내를 만든다', () => {
    expect(
      createInvalidResultMessage({
        ...validSelection,
        serviceCode: null,
      }),
    ).toBe('분석 조건을 다시 선택해 주세요')
    expect(createInvalidResultMessage(validSelection)).toBeNull()
  })

  it('선택 조건을 유지한 탭 URL을 만든다', () => {
    expect(createResultTabHref(validSelection, 'trend')).toBe(
      '/analysis/result?districtCode=11680&administrationCode=11680640&commercialCode=3110008&serviceCode=CS100001&periodCode=20233&tab=trend',
    )
  })

  it('현재 결과 URL 전체를 로그인 redirect에 보존한다', () => {
    const currentHref =
      '/analysis/result?commercialCode=3110008&serviceCode=CS100001'
    expect(getCommercialBookmarkLoginHref(currentHref)).toBe(
      `/login?redirect=${encodeURIComponent(currentHref)}`,
    )
  })
})

describe('AnalysisResultPageSurface', () => {
  it('독립 결과 페이지에서 푸터를 제거한다', () => {
    const markup = renderToStaticMarkup(
      createElement(
        AnalysisResultPageSurface,
        null,
        createElement('div', null, '상권 분석 리포트'),
      ),
    )

    expect(markup).toContain('data-hide-footer="true"')
    expect(markup).toContain('상권 분석 리포트')
  })
})
