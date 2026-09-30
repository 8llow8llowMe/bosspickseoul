import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'
import StatusMetricTabs from './status-metric-tabs'
import StatusMap from './status-map'
import type { StatusRankedItem } from '@/types/status'

const renderStyles = (element: ReturnType<typeof createElement>): string => {
  const styleSheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(styleSheet.collectStyles(element))
    return styleSheet.getStyleTags()
  } finally {
    styleSheet.seal()
  }
}

const items: StatusRankedItem[] = [
  {
    rank: 1,
    districtCode: '11680',
    districtName: '강남구',
    value: 100,
    changeRate: 10,
  },
]

/**
 * DESIGN.md §Touch target: 버튼 최소 36px, 모바일 헤더 액션 최소 40px.
 */
describe('상태 화면 터치 타깃 (DESIGN.md §Touch target)', () => {
  it('지표 탭은 최소 36px 이다', () => {
    const styles = renderStyles(
      createElement(StatusMetricTabs, {
        value: 'footTraffic',
        onChange: () => undefined,
      }),
    )

    expect(styles).toContain('min-height:36px;')
    expect(styles).not.toContain('min-height:34px;')
  })

  it('지도는 라벨이 아니라 폴리곤이 표적이라 라벨은 포인터를 가로채지 않는다', () => {
    // 예전엔 순위 배지가 유일한 버튼이라 36px 을 억지로 맞췄다. 이제 구 영역 전체가
    // 표적이고, 라벨은 폴리곤 위에 얹힌 글자일 뿐이다 — 누르면 아래 폴리곤이 받는다.
    const styles = renderStyles(
      createElement(StatusMap, {
        items,
        metric: 'footTraffic',
        selectedDistrictCode: null,
        onSelect: () => undefined,
      }),
    )

    expect(styles).toContain('pointer-events:visiblePainted;')
    expect(styles).not.toContain('min-width:38px;min-height:36px;')
  })
})
