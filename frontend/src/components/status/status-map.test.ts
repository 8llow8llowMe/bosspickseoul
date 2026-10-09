import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import StatusMap from './status-map'
import { SEOUL_STATUS_FEATURES } from '@/data/seoul-status-map'
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

/* 25개 구 전체 순위. 지도 데이터 순서대로 값을 하나씩 낮춰 1~25위를 매긴다. */
const fullItems: StatusRankedItem[] = SEOUL_STATUS_FEATURES.map(
  (feature, index) => ({
    rank: index + 1,
    districtCode: feature.districtCode,
    districtName: feature.districtCode,
    value: (25 - index) * 100_000_000,
    changeRate: index === 13 ? null : -2.1,
  }),
)

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
    expect(markup.indexOf('</svg>')).toBeLessThan(
      markup.indexOf('data-status-map-label-layer="800x620"'),
    )
  })

  it('라벨을 폴리곤 중심에서 옮기지 않고 리더 라인도 그리지 않는다', () => {
    // 예전엔 겹치는 순위 라벨을 이웃 구 너머로 밀어내고 점선으로 이었다(「중구 7」이 은평구 위).
    const markup = renderMap()

    expect(markup).not.toContain('data-status-label-leader')
    expect(markup.match(/data-wide-mode=/g)).toHaveLength(25)
    expect(markup.match(/data-narrow-mode=/g)).toHaveLength(25)
  })

  it('폴리곤 25개가 모두 누를 수 있는 버튼이고 라벨은 보조 표시다', () => {
    const markup = renderMap()
    const paths =
      markup.match(/<path[^>]*data-status-district-path[^>]*>/g) ?? []

    expect(paths).toHaveLength(25)
    for (const path of paths) {
      expect(path).toContain('role="button"')
      expect(path).toContain('tabindex="0"')
    }
    // 라벨은 폴리곤과 같은 이름을 한 번 더 읽지 않도록 접근성 트리에서 뺀다.
    expect(markup).toMatch(
      /aria-hidden="true"[^>]*data-status-map-label-layer="800x620"/,
    )
    expect(markup).not.toContain('<button aria-pressed')
  })

  it('폴리곤 접근성 이름에 지표 기준 순위와 값을, 순위에 없으면 그 사실을 적는다', () => {
    const markup = renderMap()

    expect(markup).toContain('aria-label="강남구, 유동인구 1위 · 100명 · +10%"')
    expect(markup).toContain('aria-label="종로구, 유동인구 2위 · 90명 · +5%"')
    expect(markup).toContain('aria-label="서초구, 유동인구 데이터 없음"')
    expect(markup.match(/data-status-rank=/g)).toHaveLength(2)
  })

  it('Top10 밖 구도 순위·값·변화율을 적고, 변화율 null 은 결측으로 적는다', () => {
    const markup = renderMap({ items: fullItems, metric: 'sales' })
    const fourteenth = fullItems[13]
    const fifteenth = fullItems[14]

    expect(markup).toContain(
      `data-status-district-path="${fifteenth.districtCode}"`,
    )
    expect(markup).toMatch(
      new RegExp(
        `aria-label="[^"]+, 매출 15위 · 11억원 · -2\\.1%"[^>]*data-status-district-path="${fifteenth.districtCode}"`,
      ),
    )
    expect(markup).toMatch(
      new RegExp(
        `aria-label="[^"]+, 매출 14위 · 12억원 · 변화율 데이터 없음"[^>]*data-status-district-path="${fourteenth.districtCode}"`,
      ),
    )
    expect(markup).not.toContain('10위 밖')
  })

  it('순위 점은 Top10 에만 찍는다', () => {
    const markup = renderMap({ items: fullItems })

    expect(markup.match(/data-status-rank=/g)).toHaveLength(10)
  })

  it('선택한 자치구 폴리곤을 한 번만 강조한다', () => {
    const markup = renderMap({ selectedDistrictCode: '11680' })

    expect(markup.match(/data-selected-district-code="11680"/g)).toHaveLength(1)
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(markup).toMatch(
      /aria-pressed="true"[^>]*data-status-district-path="11680"/,
    )
  })

  it('순위 밖 자치구도 선택 강조를 받는다', () => {
    const markup = renderMap({ selectedDistrictCode: '11650' })

    expect(markup).toContain('data-selected-district-code="11650"')
  })

  it('전체 순위면 25개 구를 모두 다섯 단계 중 하나로 칠한다', () => {
    const markup = renderMap({ items: fullItems })
    const steps = [...markup.matchAll(/data-value-step="([1-5])"/g)].map(
      match => match[1],
    )

    expect(steps).toHaveLength(25)
    expect(new Set(steps)).toEqual(new Set(['1', '2', '3', '4', '5']))
    // 모든 구에 값이 있으면 범례에 「데이터 없음」 칸을 두지 않는다.
    expect(markup).not.toContain('<span>데이터 없음</span>')
  })

  it('순위에 없는 구는 단계가 없고 범례에 「데이터 없음」 칸이 뜬다', () => {
    const markup = renderMap()

    expect(markup).toMatch(
      /data-value-step="1"[^>]*data-status-district-path="11680"/,
    )
    expect(markup).not.toMatch(
      /data-value-step="[0-9]"[^>]*data-status-district-path="11650"/,
    )
    expect(markup).toContain('<span>데이터 없음</span>')
  })

  it('순위 데이터가 있을 때만 범례를 그린다', () => {
    expect(renderMap()).toContain('data-status-map-legend')
    expect(renderMap({ items: [] })).not.toContain('data-status-map-legend')
  })

  it('선택하면 나머지 구를 낮추도록 지도에 선택 여부를 적는다', () => {
    expect(renderMap({ selectedDistrictCode: '11680' })).toContain(
      'data-has-selection="true"',
    )
    expect(renderMap()).not.toContain('data-has-selection="true"')
  })

  it('바깥이 강조를 쥐면 목록에서 가리킨 구에 툴팁을 띄운다', () => {
    const markup = renderMap({
      highlightedDistrictCode: '11680',
      onHighlightEnter: vi.fn(),
      onHighlightLeave: vi.fn(),
    })

    expect(markup).toContain('data-status-map-tooltip="11680"')
    expect(markup).toContain('유동인구 1위 · 100명 · +10%')
  })

  it('hover 전에는 툴팁을 그리지 않는다', () => {
    expect(renderMap()).not.toContain('data-status-map-tooltip')
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
