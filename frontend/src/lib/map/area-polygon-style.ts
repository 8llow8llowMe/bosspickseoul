export type AreaPolygonState = 'default' | 'hovered' | 'selected'

export type AreaPolygonStyleTokens = {
  baseStroke: string
  activeStroke: string
  fill: string
}

export type AreaPolygonStyle = {
  strokeColor: string
  strokeWeight: number
  fillColor: string
  fillOpacity: number
  zIndex: number
}

export const resolveAreaPolygonState = (
  code: string,
  selectedCode: string | null,
  hoveredCode: string | null,
): AreaPolygonState => {
  if (code === selectedCode) return 'selected'
  if (code === hoveredCode) return 'hovered'
  return 'default'
}

export const resolveAreaPolygonStyle = (
  state: AreaPolygonState,
  tokens: AreaPolygonStyleTokens,
  baseZIndex: number,
): AreaPolygonStyle => {
  if (state === 'selected') {
    return {
      strokeColor: tokens.activeStroke,
      strokeWeight: 4,
      fillColor: tokens.fill,
      fillOpacity: 0.55,
      zIndex: baseZIndex + 1000,
    }
  }
  if (state === 'hovered') {
    return {
      strokeColor: tokens.activeStroke,
      strokeWeight: 4,
      fillColor: tokens.fill,
      fillOpacity: 0.45,
      zIndex: baseZIndex + 500,
    }
  }
  return {
    strokeColor: tokens.baseStroke,
    strokeWeight: 3,
    fillColor: tokens.fill,
    fillOpacity: 0.28,
    zIndex: baseZIndex,
  }
}
