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

// 상태별 fill 농도 사다리. 기본 폴리곤은 0.08 → 0.18 → 0.28 을 그대로 쓰고,
// 자체 농도(추천 결과의 점수 기반 농도 등)를 가진 레이어는 base 만 갈아끼운 뒤
// 같은 증분을 얹어 상호작용 체감을 맞춘다.
const DEFAULT_BASE_FILL_OPACITY = 0.08
const FILL_OPACITY_STEP = { default: 0, hovered: 0.1, selected: 0.2 } as const
// 자체 농도가 이미 짙은 상위 랭크에서 증분을 그대로 더하면 색이 뭉개진다.
const MAX_FILL_OPACITY = 0.6

const resolveFillOpacity = (
  state: AreaPolygonState,
  baseFillOpacity: number,
): number =>
  Number(
    Math.min(
      MAX_FILL_OPACITY,
      baseFillOpacity + FILL_OPACITY_STEP[state],
    ).toFixed(2),
  )

export const resolveAreaPolygonStyle = (
  state: AreaPolygonState,
  tokens: AreaPolygonStyleTokens,
  baseZIndex: number,
  baseFillOpacity: number = DEFAULT_BASE_FILL_OPACITY,
): AreaPolygonStyle => {
  const fillOpacity = resolveFillOpacity(state, baseFillOpacity)

  if (state === 'selected') {
    return {
      strokeColor: tokens.activeStroke,
      strokeWeight: 2.5,
      fillColor: tokens.fill,
      fillOpacity,
      zIndex: baseZIndex + 1000,
    }
  }
  if (state === 'hovered') {
    return {
      strokeColor: tokens.activeStroke,
      strokeWeight: 2,
      fillColor: tokens.fill,
      fillOpacity,
      zIndex: baseZIndex + 500,
    }
  }
  return {
    strokeColor: tokens.baseStroke,
    strokeWeight: 1.5,
    fillColor: tokens.fill,
    fillOpacity,
    zIndex: baseZIndex,
  }
}
