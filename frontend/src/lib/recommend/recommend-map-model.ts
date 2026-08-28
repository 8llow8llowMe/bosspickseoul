import type {
  AreaBoundaryItem,
  CandidateCommercial,
  CommercialArea,
  CommercialProfile,
  CoordinateTuple,
  GeoBounds,
} from '@/types/recommend'

import {
  createBounds,
  createCenterFallbackBounds,
  normalizeBoundary,
  normalizeViewportBounds,
  type MapPoint,
} from '@/lib/map/geometry'

export {
  createBounds,
  createCenterFallbackBounds,
  normalizeBoundary,
  normalizeViewportBounds,
}
export type { MapPoint }

const isValidPoint = (lng: number, lat: number): boolean =>
  Number.isFinite(lng) &&
  Number.isFinite(lat) &&
  lng >= -180 &&
  lng <= 180 &&
  lat >= -90 &&
  lat <= 90

export const filterAreasByCodes = (
  areas: readonly AreaBoundaryItem[],
  codes: readonly (string | number)[],
): AreaBoundaryItem[] => {
  const allowedCodes = new Set(codes.map(String))

  return areas.filter(area => allowedCodes.has(String(area.areaCode)))
}

const rankOpacity = [0.42, 0.29, 0.23, 0.17, 0.11] as const

export const getScoreFillOpacity = (
  score: number | null,
  rank: number,
): number => {
  if (!Number.isFinite(score)) {
    const normalizedRank = Number.isFinite(rank)
      ? Math.min(Math.max(Math.trunc(rank), 1), 5)
      : 5

    return rankOpacity[normalizedRank - 1] ?? rankOpacity[4]
  }

  const normalizedScore = Math.min(Math.max(score ?? 0, 0), 100) / 100

  return Number((0.11 + normalizedScore * 0.31).toFixed(2))
}

export type RecommendationMapItem = {
  rank: number
  commercialCode: string
  commercialName: string
  compositeScore: number | null
  centerLng: number
  centerLat: number
  boundaryCoords: CoordinateTuple[]
}

/**
 * 폴리곤 하나를 이루는 최소 꼭짓점 수. 이보다 적으면 지도에 그릴 수 없다.
 */
const MIN_POLYGON_POINTS = 3

/**
 * 결과 상권 경계를 받아 올 bbox 의 여유분(도 단위, 약 400m).
 *
 * 뷰포트 질의가 **중심점 기준**이라 결과가 1건이면 bbox 가 한 점으로 찌그러진다.
 * 여유를 줘야 그 상권이 질의 결과에 들어온다.
 */
export const RESULT_BOUNDARY_PAD_DEGREES = 0.004

/**
 * 결과 상권들의 중심점을 감싸는 고정 bbox.
 *
 * 백엔드에 「코드로 경계 조회」가 없다 — `GET /map/commercials/{code}/profile` 은
 * `centerLng: null` / `boundaryCoords: []` 를 내려주고, 경계를 주는 것은 뷰포트 질의
 * `GET /map/commercials?lngSW=…` 뿐이다. 그래서 결과 중심점으로 bbox 를 만들어 한 번
 * 더 질의한다. **지도 뷰포트와 무관한 고정 bbox** 라 사용자가 패닝해도 결과 폴리곤이
 * 사라지지 않는다(뷰포트 목록을 그대로 조인하면 깜빡인다).
 */
export const buildResultBoundaryBounds = (
  centers: readonly { centerLng: number; centerLat: number }[],
  pad: number = RESULT_BOUNDARY_PAD_DEGREES,
): GeoBounds | null => {
  const points = centers.flatMap(({ centerLng, centerLat }) =>
    isValidPoint(centerLng, centerLat)
      ? [{ lng: centerLng, lat: centerLat }]
      : [],
  )
  const bounds = createBounds(points)

  if (!bounds) return null

  return {
    lngSW: bounds.lngSW - pad,
    latSW: bounds.latSW - pad,
    lngNE: bounds.lngNE + pad,
    latNE: bounds.latNE + pad,
  }
}

export const buildRecommendationMapItems = (
  results: readonly CandidateCommercial[],
  profiles: readonly CommercialProfile[],
  commercials: readonly CommercialArea[],
  boundaries: readonly AreaBoundaryItem[] = [],
): RecommendationMapItem[] => {
  const profilesByCode = new Map(
    profiles.map(profile => [String(profile.commercialCode), profile]),
  )
  const commercialsByCode = new Map(
    commercials.map(commercial => [
      String(commercial.commercialCode),
      commercial,
    ]),
  )
  const boundariesByCode = new Map(
    boundaries.map(boundary => [String(boundary.areaCode), boundary]),
  )

  return results.flatMap(result => {
    const commercialCode = String(result.commercialCode)
    const profile = profilesByCode.get(commercialCode)
    const commercial = commercialsByCode.get(commercialCode)
    const boundaryArea = boundariesByCode.get(commercialCode)
    const hasValidProfileCenter =
      profile !== undefined &&
      isValidPoint(profile.centerLng, profile.centerLat)
    const centerLng = hasValidProfileCenter
      ? profile.centerLng
      : (commercial?.centerLng ?? boundaryArea?.centerLng)
    const centerLat = hasValidProfileCenter
      ? profile.centerLat
      : (commercial?.centerLat ?? boundaryArea?.centerLat)

    if (
      centerLng === undefined ||
      centerLat === undefined ||
      !isValidPoint(centerLng, centerLat)
    ) {
      return []
    }

    // profile 이 경계를 비워 보내는 것이 현재 백엔드의 정상 동작이라,
    // 뷰포트 질의로 따로 받아 둔 경계를 폴백으로 쓴다. 이게 없으면 결과 폴리곤이
    // 한 개도 그려지지 않는다(`drawPolygon` 이 3점 미만이면 null 을 반환한다).
    const profileBoundary = hasValidProfileCenter
      ? profile.boundaryCoords.filter(([lng, lat]) => isValidPoint(lng, lat))
      : []
    const boundaryCoords =
      profileBoundary.length >= MIN_POLYGON_POINTS
        ? profileBoundary
        : (boundaryArea?.boundaryCoords.filter(([lng, lat]) =>
            isValidPoint(lng, lat),
          ) ?? [])

    return [
      {
        rank: result.rank,
        commercialCode,
        commercialName: result.commercialName,
        compositeScore: result.compositeScore,
        centerLng,
        centerLat,
        boundaryCoords,
      },
    ]
  })
}

export type RecommendMapStage =
  | 'district'
  | 'administration'
  | 'commercial'
  | 'results'

/**
 * 카메라를 어떻게 할지. **`keep` 과 `reset` 을 구분하는 것이 핵심**이다 —
 * 예전에는 「맞출 대상 없음」을 `null` 하나로 표현해서, 결과가 0건일 때 서울 기본
 * 카메라로 튕겨 나갔다. 사용자는 자기가 보던 화면을 잃는다.
 */
export type MapCameraTarget =
  | { kind: 'fit'; points: readonly MapPoint[] }
  | { kind: 'keep' }
  | { kind: 'reset' }

export type RecommendCameraInput = {
  stage: RecommendMapStage
  /** 추천 결과를 받아 오는 중이면 카메라를 건드리지 않는다. */
  isResultsLoading: boolean
  /** 사용자가 결과 항목을 **직접 고른** 경우에만 채운다(B-3). */
  selectedResultPoints: readonly MapPoint[] | null
  /** 결과 상권 전체를 담는 점들(B-2). */
  resultPoints: readonly MapPoint[]
  administrationPoints: readonly MapPoint[] | null
  districtPoints: readonly MapPoint[] | null
}

/**
 * 결과 상권들을 카메라에 담기 위한 점 목록. 경계가 있으면 경계를, 없으면 중심점을 쓴다.
 */
export const collectResultCameraPoints = (
  items: readonly RecommendationMapItem[],
): MapPoint[] =>
  items.flatMap(item => {
    const boundary = normalizeBoundary(item.boundaryCoords)

    return boundary.length > 0
      ? boundary
      : normalizeBoundary([[item.centerLng, item.centerLat]])
  })

/**
 * 결과 단계에서는 **제출 시점이 아니라 결과를 받은 뒤** 카메라를 정한다.
 * 결과가 0건인데 행정동으로 확대되면 사용자는 아무것도 없는 화면으로 끌려간다.
 */
export const resolveRecommendCameraTarget = ({
  stage,
  isResultsLoading,
  selectedResultPoints,
  resultPoints,
  administrationPoints,
  districtPoints,
}: RecommendCameraInput): MapCameraTarget => {
  if (stage === 'results') {
    if (selectedResultPoints && selectedResultPoints.length > 0) {
      return { kind: 'fit', points: selectedResultPoints }
    }

    if (isResultsLoading) return { kind: 'keep' }

    return resultPoints.length > 0
      ? { kind: 'fit', points: resultPoints }
      : { kind: 'keep' }
  }

  if (administrationPoints && administrationPoints.length > 0) {
    return { kind: 'fit', points: administrationPoints }
  }

  if (districtPoints && districtPoints.length > 0) {
    return { kind: 'fit', points: districtPoints }
  }

  return { kind: 'reset' }
}

export type CameraPadding = {
  top: number
  right: number
  bottom: number
  left: number
}

export type OverlayRect = {
  left: number
  top: number
  right: number
  bottom: number
}

/** 카메라가 늘 남겨 두는 최소 여백(px). 폴리곤이 화면 가장자리에 붙지 않게 한다. */
export const MIN_CAMERA_PADDING = 24

/**
 * 패딩이 지도 절반을 넘으면 맞출 공간이 사라진다. 각 축에서 이 비율까지만 쓴다.
 */
const MAX_CAMERA_PADDING_RATIO = 0.45

/**
 * 지도 위에 떠 있는 패널을 피해 카메라를 맞추기 위한 패딩.
 *
 * `/recommend` 는 조건·결과 패널이 **지도 위에 떠 있다**(`/analysis` 의 좌측 고정
 * 패널과 다른 점이다). 지도 전체 폭에 맞추면 추천 상권이 패널 뒤로 들어가서,
 * 「결과를 지도에 보여 준다」는 것이 말만 남는다.
 *
 * 패널이 세로로 길면 옆 패널, 가로로 길면 위아래 바로 보고 가까운 가장자리에 붙인다.
 */
export const resolveCameraPadding = (
  map: { width: number; height: number },
  overlays: readonly OverlayRect[],
  base: number = MIN_CAMERA_PADDING,
): CameraPadding => {
  const padding: CameraPadding = {
    top: base,
    right: base,
    bottom: base,
    left: base,
  }

  if (map.width <= 0 || map.height <= 0) return padding

  overlays.forEach(overlay => {
    const width = overlay.right - overlay.left
    const height = overlay.bottom - overlay.top

    if (width <= 0 || height <= 0) return

    const isSidePanel = height / map.height > width / map.width

    if (isSidePanel) {
      const key = overlay.left <= map.width - overlay.right ? 'left' : 'right'
      const inset =
        key === 'left' ? overlay.right + base : map.width - overlay.left + base

      padding[key] = Math.max(padding[key], inset)
      return
    }

    const key = overlay.top <= map.height - overlay.bottom ? 'top' : 'bottom'
    const inset =
      key === 'top' ? overlay.bottom + base : map.height - overlay.top + base

    padding[key] = Math.max(padding[key], inset)
  })

  const maxHorizontal = map.width * MAX_CAMERA_PADDING_RATIO
  const maxVertical = map.height * MAX_CAMERA_PADDING_RATIO

  return {
    top: Math.round(Math.min(padding.top, maxVertical)),
    right: Math.round(Math.min(padding.right, maxHorizontal)),
    bottom: Math.round(Math.min(padding.bottom, maxVertical)),
    left: Math.round(Math.min(padding.left, maxHorizontal)),
  }
}
