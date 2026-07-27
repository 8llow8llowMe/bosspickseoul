import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import SimulationUnavailablePage from '@/components/simulation/simulation-unavailable-page'

describe('SimulationUnavailablePage', () => {
  it.each([
    ['form', '창업 시뮬레이션을 준비하고 있습니다.'],
    ['report', '시뮬레이션 리포트를 준비하고 있습니다.'],
    ['compare', '시뮬레이션 비교를 준비하고 있습니다.'],
  ] as const)('renders the %s waiting state', (kind, title) => {
    const html = renderToStaticMarkup(
      createElement(SimulationUnavailablePage, { kind }),
    )

    expect(html).toContain(title)
    expect(html).toContain('V2 API 계약')
    expect(html).toContain('href="/analysis"')
    expect(html).toContain('href="/"')
    expect(html).not.toContain('NowDoBoss')
  })
})
