import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import StatusMap, { layoutStatusMapTopTenLabels } from './status-map'
import type { StatusMapLabel } from '@/lib/status/status-map-model'
import type { StatusRankedItem } from '@/types/status'

const items: StatusRankedItem[] = [
  {
    rank: 1,
    districtCode: '11680',
    districtName: '강남구',
    value: 100,
    changeRate: 10,
  },
  {
    rank: 2,
    districtCode: '11110',
    districtName: '종로구',
    value: 90,
    changeRate: 5,
  },
]

const renderMap = (
  props: Partial<React.ComponentProps<typeof StatusMap>> = {},
) =>
  renderToStaticMarkup(
    createElement(StatusMap, {
      metric: 'footTraffic',
      items,
      selectedDistrictCode: null,
      onSelect: vi.fn(),
      ...props,
    }),
  )

describe('StatusMap', () => {
  it('25개 자치구 경계와 실제 이름 라벨을 모두 렌더링한다', () => {
    const markup = renderMap()

    expect(markup.match(/data-status-district-path=/g)).toHaveLength(25)
    expect(markup.match(/data-status-district-label=/g)).toHaveLength(25)
    expect(markup).toContain('강남구')
    expect(markup).toContain('종로구')
    expect(markup).toContain('동작구')
  })

  it('경계와 라벨을 동일한 800×620 SVG 좌표 뷰포트에 렌더링한다', () => {
    const markup = renderMap({ selectedDistrictCode: '11680' })

    expect(markup).toContain('data-status-map-label-viewport="800x620"')
    expect(markup).toContain('data-status-map-shape-layer="800x620"')
    expect(markup).toContain('data-status-map-label-layer="800x620"')
    expect(markup).not.toContain('<foreignObject')
    expect(
      markup.indexOf('data-status-map-label-viewport="800x620"'),
    ).toBeLessThan(markup.indexOf('data-status-map-shape-layer="800x620"'))
    expect(markup.indexOf('data-selected-district-code="11680"')).toBeLessThan(
      markup.indexOf('data-status-map-label-layer="800x620"'),
    )
    expect(markup).toContain('<svg aria-hidden="true"')
    expect(markup.indexOf('</svg>')).toBeLessThan(
      markup.indexOf('data-status-map-label-layer="800x620"'),
    )
  })

  it('겹치는 현재 Top10 라벨을 순위 순서로 결정적으로 배치한다', () => {
    const labels: StatusMapLabel[] = Array.from({ length: 10 }, (_, index) => ({
      districtCode: `district-${index + 1}`,
      districtName: `자치구 ${index + 1}`,
      x: 400,
      y: 310,
      rank: 10 - index,
      isTopTen: true,
    }))

    const first = layoutStatusMapTopTenLabels(labels)
    const second = layoutStatusMapTopTenLabels(labels)

    expect(first).toEqual(second)
    expect(first.map(label => label.rank)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])
    expect(
      first.some(label => label.displayX !== 400 || label.displayY !== 310),
    ).toBe(true)

    for (const label of first) {
      expect(label.originalX).toBe(400)
      expect(label.originalY).toBe(310)
      expect(label.displayX).toBeGreaterThanOrEqual(43)
      expect(label.displayX).toBeLessThanOrEqual(757)
      expect(label.displayY).toBeGreaterThanOrEqual(38)
      expect(label.displayY).toBeLessThanOrEqual(582)
    }

    for (const [index, label] of first.entries()) {
      for (const other of first.slice(index + 1)) {
        expect(
          Math.abs(label.displayX - other.displayX) >= 86 ||
            Math.abs(label.displayY - other.displayY) >= 76,
        ).toBe(true)
      }
    }
  })

  it('충돌한 Top10 라벨에만 중심과 표시 위치를 잇는 리더 라인을 렌더링한다', () => {
    const markup = renderMap({
      items: [
        ...items,
        {
          rank: 3,
          districtCode: '11650',
          districtName: '서초구',
          value: 80,
          changeRate: 2,
        },
      ],
    })

    expect(markup).toContain('data-status-label-leader="11650"')
    expect(markup).not.toContain('data-status-label-offset')
  })

  it('Top10 항목만 순위 버튼과 지표 기준 접근성 이름을 렌더링한다', () => {
    const markup = renderMap()

    expect(markup.match(/data-status-rank=/g)).toHaveLength(2)
    expect(markup).toContain('aria-label="1위 강남구, 유동인구 기준"')
    expect(markup).toContain('aria-label="2위 종로구, 유동인구 기준"')
  })

  it('선택한 자치구 폴리곤과 순위 라벨을 한 번만 강조한다', () => {
    const markup = renderMap({ selectedDistrictCode: '11680' })
    const buttons = markup.match(/<button[^>]*>/g) ?? []
    const selectedButton = buttons.find(button =>
      button.includes('data-status-district-label="11680"'),
    )

    expect(markup.match(/data-selected-district-code="11680"/g)).toHaveLength(1)
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(selectedButton).toContain('aria-pressed="true"')
  })

  it('기존 원형 마커와 값 기반 마커 접근성 이름을 렌더링하지 않는다', () => {
    const markup = renderMap()

    expect(markup).not.toContain('<circle')
    expect(markup).not.toContain('유동인구 100')
  })

  it('배경 동작과 콜백이 함께 있을 때만 해당 바텀시트 제어 버튼을 렌더링한다', () => {
    const expandMarkup = renderMap({
      backgroundAction: 'expand',
      onBackgroundClick: vi.fn(),
    })
    const collapseMarkup = renderMap({
      backgroundAction: 'collapse',
      onBackgroundClick: vi.fn(),
    })
    const callbackOnlyMarkup = renderMap({ onBackgroundClick: vi.fn() })
    const actionOnlyMarkup = renderMap({ backgroundAction: 'expand' })

    expect(expandMarkup).toContain(
      'aria-label="지도를 눌러 구별 현황 바텀시트 펼치기"',
    )
    expect(collapseMarkup).toContain(
      'aria-label="지도를 더 보기 위해 구별 현황 바텀시트 최소화"',
    )
    expect(callbackOnlyMarkup).not.toContain('바텀시트')
    expect(actionOnlyMarkup).not.toContain('바텀시트')
  })
})
