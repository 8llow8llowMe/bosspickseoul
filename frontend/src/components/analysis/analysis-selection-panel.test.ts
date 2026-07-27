import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisSelectionPanel from '@/components/analysis/analysis-selection-panel'
import { createEmptyAnalysisSelection } from '@/lib/analysis/selection'

describe('AnalysisSelectionPanel', () => {
  it('4단계와 미완료 안내를 표시한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisSelectionPanel, {
        activeStep: 'district',
        selection: createEmptyAnalysisSelection(),
        selectedNames: {},
        items: [{ code: '11680', name: '강남구' }],
        status: 'ready',
        onStepChange: () => undefined,
        onSelect: () => undefined,
        onPreviewChange: () => undefined,
        onRetry: () => undefined,
        onSubmit: () => undefined,
      }),
    )

    expect(markup).toContain('자치구')
    expect(markup).toContain('행정동')
    expect(markup).toContain('상권')
    expect(markup).toContain('업종')
    expect(markup).toContain('상권과 업종을 선택해 주세요')
  })

  it('현재 선택 후보에 aria-selected를 제공한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisSelectionPanel, {
        activeStep: 'district',
        selection: {
          ...createEmptyAnalysisSelection(),
          districtCode: '11680',
        },
        selectedNames: { district: '강남구' },
        items: [{ code: '11680', name: '강남구' }],
        status: 'ready',
        onStepChange: () => undefined,
        onSelect: () => undefined,
        onPreviewChange: () => undefined,
        onRetry: () => undefined,
        onSubmit: () => undefined,
      }),
    )

    expect(markup).toContain('aria-selected="true"')
  })
})
