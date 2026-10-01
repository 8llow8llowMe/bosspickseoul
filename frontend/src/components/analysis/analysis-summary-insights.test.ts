import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisSummaryInsights, {
  type SummaryInsight,
} from '@/components/analysis/analysis-summary-insights'

const insight = (overrides: Partial<SummaryInsight> = {}): SummaryInsight => ({
  key: 'peak-time',
  label: '피크 시간',
  sentence: '매출의 38%가 11~14시에 나와요.',
  loading: false,
  tab: 'sales',
  tabLabel: '매출',
  ...overrides,
})

const render = (items: SummaryInsight[]) =>
  renderToStaticMarkup(
    createElement(AnalysisSummaryInsights, {
      items,
      onSelect: () => undefined,
    }),
  )

describe('AnalysisSummaryInsights', () => {
  it('줄마다 라벨 · 결론 문장 · 근거 탭으로 가는 버튼을 둔다', () => {
    const markup = render([insight()])

    expect(markup).toContain('피크 시간')
    expect(markup).toContain('매출의 38%가 11~14시에 나와요.')
    expect(markup).toContain('매출 보기')
    expect(markup).toContain('type="button"')
  })

  it('문장을 만들 수 없는 줄은 그리지 않는다', () => {
    const markup = render([
      insight(),
      insight({ key: 'customer', label: '주 고객층', sentence: null }),
    ])

    expect(markup).toContain('피크 시간')
    expect(markup).not.toContain('주 고객층')
  })

  it('불러오는 중이면 줄 자리를 잡고 버튼은 두지 않는다', () => {
    const markup = render([insight({ loading: true, sentence: null })])

    expect(markup).toContain('피크 시간 불러오는 중')
    expect(markup).not.toContain('매출 보기')
  })

  it('남는 줄이 없으면 목록을 그리지 않는다', () => {
    expect(render([insight({ sentence: null })])).toBe('')
  })
})
