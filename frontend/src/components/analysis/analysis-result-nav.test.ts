import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisResultNav from '@/components/analysis/analysis-result-nav'
import { ANALYSIS_TABS } from '@/lib/analysis/presentation'

describe('AnalysisResultNav', () => {
  it('모든 탭 라벨을 렌더하고 활성 탭에 aria-current를 준다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisResultNav, {
        tabs: ANALYSIS_TABS,
        activeTab: 'sales',
        onSelect: () => {},
      }),
    )
    ANALYSIS_TABS.forEach(tab => expect(markup).toContain(tab.label))
    expect(markup).toContain('aria-current="true"')
  })
})
