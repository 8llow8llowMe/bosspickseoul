import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import StatusMap from './status-map'
import type { StatusRankedItem } from '@/types/status'

const item: StatusRankedItem = {
  rank: 1,
  districtCode: '11680',
  districtName: '강남구',
  value: 100,
  changeRate: 10,
}

describe('StatusMap', () => {
  it('선택한 자치구 폴리곤을 한 번만 강조한다', () => {
    const markup = renderToStaticMarkup(
      createElement(StatusMap, {
        metric: 'footTraffic',
        items: [item],
        selectedDistrictCode: '11680',
        onSelect: vi.fn(),
      }),
    )

    expect(markup.match(/data-selected-district-code="11680"/g)).toHaveLength(1)
  })

  it('바텀시트 최소화 콜백이 있을 때만 지도 배경 버튼을 렌더링한다', () => {
    const withBackgroundButton = renderToStaticMarkup(
      createElement(StatusMap, {
        metric: 'footTraffic',
        items: [item],
        selectedDistrictCode: null,
        onSelect: vi.fn(),
        onBackgroundClick: vi.fn(),
      }),
    )
    const withoutBackgroundButton = renderToStaticMarkup(
      createElement(StatusMap, {
        metric: 'footTraffic',
        items: [item],
        selectedDistrictCode: null,
        onSelect: vi.fn(),
      }),
    )

    expect(withBackgroundButton).toContain(
      'aria-label="지도를 더 보기 위해 구별 현황 바텀시트 최소화"',
    )
    expect(withoutBackgroundButton).not.toContain('바텀시트 최소화')
  })
})
