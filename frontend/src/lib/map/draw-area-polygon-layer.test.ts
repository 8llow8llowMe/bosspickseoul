import { describe, expect, it, vi } from 'vitest'

import { drawAreaPolygonLayer } from '@/lib/map/draw-area-polygon-layer'
import type { AreaBoundaryItem } from '@/types/recommend'

const tokens = { baseStroke: '#0ea5e9', activeStroke: '#2272eb', fill: '#0ea5e9' }

const areas: AreaBoundaryItem[] = [
  {
    areaCode: '11680',
    areaName: '강남구',
    centerLng: 127.05,
    centerLat: 37.51,
    boundaryCoords: [
      [127.04, 37.5],
      [127.06, 37.5],
      [127.05, 37.52],
    ],
  },
]

const createFakeMaps = () => {
  const listeners: Array<{ target: object; type: string; handler: () => void }> =
    []
  const polygons: Array<{ options: Record<string, unknown>; map: unknown }> = []
  const setBounds = vi.fn()
  const maps = {
    LatLng: class {
      constructor(
        public lat: number,
        public lng: number,
      ) {}
    },
    LatLngBounds: class {
      extend() {}
    },
    Polygon: class {
      map: unknown
      constructor(public options: Record<string, unknown>) {
        this.map = options.map
        polygons.push(this)
      }
      setMap(value: unknown) {
        this.map = value
      }
      setOptions() {}
      setZIndex() {}
    },
    event: {
      addListener: (target: object, type: string, handler: () => void) =>
        listeners.push({ target, type, handler }),
      removeListener: (target: object, type: string, handler: () => void) => {
        const index = listeners.findIndex(
          entry =>
            entry.target === target &&
            entry.type === type &&
            entry.handler === handler,
        )
        if (index >= 0) listeners.splice(index, 1)
      },
    },
  }
  const map = { setBounds, setCenter: vi.fn() }
  return { maps, map, listeners, polygons, setBounds }
}

describe('drawAreaPolygonLayer', () => {
  it('경계점 3개 이상인 area마다 폴리곤 1개를 그린다', () => {
    const { maps, map, polygons } = createFakeMaps()
    drawAreaPolygonLayer({
      map: map as never,
      maps: maps as never,
      areas,
      selectedCode: null,
      hoveredCode: null,
      onSelect: () => undefined,
      onHoverChange: () => undefined,
      tokens,
    })
    expect(polygons).toHaveLength(1)
  })

  it('click은 onSelect, mouseover/mouseout은 onHoverChange를 호출한다', () => {
    const { maps, map, listeners } = createFakeMaps()
    const onSelect = vi.fn()
    const onHoverChange = vi.fn()
    drawAreaPolygonLayer({
      map: map as never,
      maps: maps as never,
      areas,
      selectedCode: null,
      hoveredCode: null,
      onSelect,
      onHoverChange,
      tokens,
    })
    listeners.find(l => l.type === 'click')?.handler()
    listeners.find(l => l.type === 'mouseover')?.handler()
    listeners.find(l => l.type === 'mouseout')?.handler()
    expect(onSelect).toHaveBeenCalledWith('11680')
    expect(onHoverChange).toHaveBeenNthCalledWith(1, '11680')
    expect(onHoverChange).toHaveBeenNthCalledWith(2, null)
  })

  it('selectedCode가 있으면 setBounds로 확대한다', () => {
    const { maps, map, setBounds } = createFakeMaps()
    drawAreaPolygonLayer({
      map: map as never,
      maps: maps as never,
      areas,
      selectedCode: '11680',
      hoveredCode: null,
      onSelect: () => undefined,
      onHoverChange: () => undefined,
      tokens,
    })
    expect(setBounds).toHaveBeenCalledTimes(1)
  })

  it('cleanup은 리스너를 모두 제거하고 폴리곤을 지운다', () => {
    const { maps, map, listeners, polygons } = createFakeMaps()
    const cleanup = drawAreaPolygonLayer({
      map: map as never,
      maps: maps as never,
      areas,
      selectedCode: null,
      hoveredCode: null,
      onSelect: () => undefined,
      onHoverChange: () => undefined,
      tokens,
    })
    cleanup()
    expect(listeners).toHaveLength(0)
    expect(polygons[0].map).toBeNull()
  })
})
