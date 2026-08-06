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
}: DrawAreaPolygonLayerParams): (() => void) => {
  const polygons: KakaoMapPolygon[] = []
  const listeners: Array<{
    target: object
    type: 'click' | 'mouseover' | 'mouseout'
    handler: () => void
  }> = []

  areas.forEach((area, index) => {
    const code = String(area.areaCode)
    const points = normalizeBoundary(area.boundaryCoords)
    if (points.length < 3) return

    const state = resolveAreaPolygonState(code, selectedCode, hoveredCode)
    const style = resolveAreaPolygonStyle(state, tokens, index + 10)

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

  return () => {
    listeners.forEach(({ target, type, handler }) => {
      maps.event.removeListener(target, type, handler)
    })
    polygons.forEach(polygon => polygon.setMap(null))
  }
}
