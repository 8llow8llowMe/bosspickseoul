import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ChartFrame from '@/components/analysis/charts/chart-frame'

describe('ChartFrame', () => {
  it('viewBox와 aria-label을 가진 반응형 svg를 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(
        ChartFrame,
        { viewBoxWidth: 320, viewBoxHeight: 200, ariaLabel: '테스트 차트' },
        createElement('circle', { cx: 1, cy: 1, r: 1 }),
      ),
    )
    expect(markup).toContain('viewBox="0 0 320 200"')
    expect(markup).toContain('aria-label="테스트 차트"')
    expect(markup).toContain('role="img"')
  })
})
