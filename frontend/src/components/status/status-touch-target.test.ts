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
 * 시각 크기를 키우면 지도 배지가 겹치므로 좁은 캔버스에서는 ::after 로
 * 히트 영역만 넓힌다 — 그 장치가 사라지면 조용히 28px 짜리 표적이 된다.
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

  it('지도 순위 배지는 기본 36px 이다', () => {
    const styles = renderStyles(
      createElement(StatusMap, {
        items,
        metric: 'footTraffic',
        selectedDistrictCode: null,
        onSelect: () => undefined,
      }),
    )

    expect(styles).toContain('min-width:38px;min-height:36px;')
  })

  it('좁은 캔버스에서는 배지를 키우지 않고 ::after 로 36px 히트 영역을 준다', () => {
    const styles = renderStyles(
      createElement(StatusMap, {
        items,
        metric: 'footTraffic',
        selectedDistrictCode: null,
        onSelect: () => undefined,
      }),
    )

    // 시각 크기는 겹침 완화를 위해 그대로 둔다.
    expect(styles).toContain('min-width:32px;min-height:28px;')
    // 히트 영역만 정본 최소치까지 넓힌다.
    expect(styles).toContain('width:36px;height:36px;')
  })
})
