import { createBounds, normalizeBoundary } from '@/lib/map/geometry'
import {
  resolveAreaPolygonState,
  resolveAreaPolygonStyle,
  type AreaPolygonStyleTokens,
} from '@/lib/map/area-polygon-style'
import type { AreaBoundaryItem } from '@/types/recommend'

export type DrawAreaPolygonLayerParams = {
  map: KakaoMapInstance
  maps: KakaoMapsNamespace
  areas: readonly AreaBoundaryItem[]
  selectedCode: string | null
  hoveredCode: string | null
  onSelect: (code: string) => void
  onHoverChange: (code: string | null) => void
  tokens: AreaPolygonStyleTokens
  fitToSelected?: boolean
}

export type AreaPolygonLayerHandle = {
  cleanup: () => void
  // 레이어를 다시 그리지 않고 영향받는 폴리곤만 restyle 한다(호버/선택 하이라이트).
  setHighlight: (next: {
    selectedCode: string | null
    hoveredCode: string | null
  }) => void
}

export const drawAreaPolygonLayer = ({
  map,
  maps,
  areas,
  selectedCode,
  hoveredCode,
  onSelect,
  onHoverChange,
  tokens,
  fitToSelected = true,
}: DrawAreaPolygonLayerParams): AreaPolygonLayerHandle => {
  const polygons: KakaoMapPolygon[] = []
  const polygonByCode = new Map<
    string,
    { polygon: KakaoMapPolygon; baseZIndex: number }
  >()
  const listeners: Array<{
    target: object
    type: 'click' | 'mouseover' | 'mouseout'
    handler: () => void
  }> = []

  let currentSelected = selectedCode
  let currentHovered = hoveredCode

  areas.forEach((area, index) => {
    const code = String(area.areaCode)
    const points = normalizeBoundary(area.boundaryCoords)
    if (points.length < 3) return

    const baseZIndex = index + 10
    const state = resolveAreaPolygonState(code, currentSelected, currentHovered)
    const style = resolveAreaPolygonStyle(state, tokens, baseZIndex)

    const polygon = new maps.Polygon({
      map,
      path: points.map(point => new maps.LatLng(point.lat, point.lng)),
      strokeColor: style.strokeColor,
      strokeWeight: style.strokeWeight,
      strokeOpacity: 1,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
      clickable: true,
    })
    polygon.setZIndex(style.zIndex)
    polygons.push(polygon)
    polygonByCode.set(code, { polygon, baseZIndex })

    const clickHandler = () => onSelect(code)
    const overHandler = () => onHoverChange(code)
    const outHandler = () => onHoverChange(null)
    maps.event.addListener(polygon, 'click', clickHandler)
    maps.event.addListener(polygon, 'mouseover', overHandler)
    maps.event.addListener(polygon, 'mouseout', outHandler)
    listeners.push(
      { target: polygon, type: 'click', handler: clickHandler },
      { target: polygon, type: 'mouseover', handler: overHandler },
      { target: polygon, type: 'mouseout', handler: outHandler },
    )
  })

  if (fitToSelected && selectedCode) {
    const selectedArea = areas.find(
      area => String(area.areaCode) === selectedCode,
    )
    const bounds = selectedArea
      ? createBounds(normalizeBoundary(selectedArea.boundaryCoords))
      : null
    if (bounds) {
      const kakaoBounds = new maps.LatLngBounds()
      kakaoBounds.extend(new maps.LatLng(bounds.latSW, bounds.lngSW))
      kakaoBounds.extend(new maps.LatLng(bounds.latNE, bounds.lngNE))
      map.setBounds(kakaoBounds)
    }
  }

  const applyStyle = (code: string) => {
    const entry = polygonByCode.get(code)
    if (!entry) return
    const state = resolveAreaPolygonState(code, currentSelected, currentHovered)
    const style = resolveAreaPolygonStyle(state, tokens, entry.baseZIndex)
    entry.polygon.setOptions({
      strokeColor: style.strokeColor,
      strokeWeight: style.strokeWeight,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
    })
    entry.polygon.setZIndex(style.zIndex)
  }

  const setHighlight: AreaPolygonLayerHandle['setHighlight'] = next => {
    if (
      next.selectedCode === currentSelected &&
      next.hoveredCode === currentHovered
    ) {
      return
    }
    // 이전/다음 하이라이트에 해당하는 폴리곤만 다시 칠한다(O(변경분)).
    const affected = new Set<string>()
    for (const code of [
      currentSelected,
      currentHovered,
      next.selectedCode,
      next.hoveredCode,
    ]) {
      if (code) affected.add(code)
    }
    currentSelected = next.selectedCode
    currentHovered = next.hoveredCode
    affected.forEach(applyStyle)
  }

  const cleanup = () => {
    listeners.forEach(({ target, type, handler }) => {
      maps.event.removeListener(target, type, handler)
    })
    polygons.forEach(polygon => polygon.setMap(null))
  }

  return { cleanup, setHighlight }
}
