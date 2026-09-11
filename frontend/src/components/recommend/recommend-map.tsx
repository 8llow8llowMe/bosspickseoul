'use client'

import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

import RecommendFeedback from '@/components/recommend/recommend-feedback'
import { classifyStatus, isRetryable } from '@/lib/api/api-error'
import { env } from '@/lib/env'
import { loadKakaoMapSdk } from '@/lib/kakao-map'
import {
  createMapCamera,
  SEOUL_DEFAULT_CAMERA,
  type MapCamera,
} from '@/lib/analysis/map-camera'
import {
  resolveAreaPolygonState,
  resolveAreaPolygonStyle,
  type AreaPolygonStyleTokens,
} from '@/lib/map/area-polygon-style'
import { drawAreaLabelLayer } from '@/lib/map/draw-area-label-layer'
import { drawAreaPolygonLayer } from '@/lib/map/draw-area-polygon-layer'
import type { RecommendCameraMode } from '@/lib/recommend/recommend-state'
import {
  applyCameraMode,
  collectResultCameraPoints,
  getScoreFillOpacity,
  normalizeBoundary,
  normalizeViewportBounds,
  resolveCameraPadding,
  resolveRecommendCameraTarget,
  MIN_CAMERA_PADDING,
  type CameraPadding,
  type MapCameraTarget,
  type MapPoint,
  type RecommendationMapItem,
} from '@/lib/recommend/recommend-map-model'
import type { AreaBoundaryItem, GeoBounds } from '@/types/recommend'

export type RecommendMapProps = {
  stage: 'district' | 'administration' | 'commercial' | 'results'
  districtAreas: AreaBoundaryItem[]
  administrationAreas: AreaBoundaryItem[]
  commercialAreas: AreaBoundaryItem[]
  resultAreas: RecommendationMapItem[]
  selectedDistrictCode: string | null
  selectedAdministrationCode: string | null
  selectedCommercialCode: string | null
  /**
   * 사용자가 결과 항목을 **직접 고른** 경우에만 `true`. 결과 도착 시 1위가 자동
   * 선택되는 것과 구분해서, 그때는 카메라를 결과 전체에 맞춘다.
   */
  isResultSelectionExplicit?: boolean
  /** 추천 결과를 받아 오는 중이면 카메라를 건드리지 않는다. */
  isResultsLoading?: boolean
  previewedCommercialCode?: string | null
  onDistrictSelect: (districtCode: string) => void
  onAdministrationSelect: (administrationCode: string) => void
  onCommercialSelect: (commercialCode: string) => void
  onCommercialPreviewChange?: (commercialCode: string | null) => void
  onBackgroundClick?: () => void
  onViewportBoundsChange?: (bounds: GeoBounds) => void
  /**
   * 링크가 들고 온 카메라. **마운트 때 한 번만** 읽어 지도를 만든다 — 그 뒤 URL 은
   * 상태의 거울일 뿐이라 다시 읽으면 방금 우리가 쓴 값을 되읽는다(url-state §2-2).
   */
  initialCamera?: MapCamera | null
  /** `'url'` 이면 자동 맞춤을 전부 잠근다. 기본은 기존 동작(`'auto'`). */
  cameraMode?: RecommendCameraMode
  /** 지도가 멈출 때(`idle`) 화면이 든 카메라. URL 거울이 이 값을 `c` 로 쓴다. */
  onCameraSettle?: (camera: MapCamera) => void
  /** 「선택 범위로 이동」을 눌렀다. 그 뒤로는 카메라가 선택·결과를 따라가도 된다. */
  onRecenter?: () => void
}

type BackgroundClickGuard = {
  suppressForCurrentTask: () => void
  isSuppressed: () => boolean
}

type ResultLayerVisualEntry = {
  item: RecommendationMapItem
  marker: HTMLElement | null
  polygon: KakaoMapPolygon | null
  overlay: KakaoMapCustomOverlay | null
}

type RecommendMapLayerStructuralInput = Pick<
  RecommendMapProps,
  | 'stage'
  | 'districtAreas'
  | 'administrationAreas'
  | 'commercialAreas'
  | 'resultAreas'
  | 'selectedDistrictCode'
  | 'selectedAdministrationCode'
  | 'previewedCommercialCode'
>

const VIEWPORT_BOUNDS_DEBOUNCE_MS = 300

export const readKakaoViewportBounds = (
  map: KakaoMapInstance,
): GeoBounds | null => {
  const bounds = map.getBounds()
  const southWest = bounds.getSouthWest()
  const northEast = bounds.getNorthEast()

  return normalizeViewportBounds({
    lngSW: southWest.getLng(),
    latSW: southWest.getLat(),
    lngNE: northEast.getLng(),
    latNE: northEast.getLat(),
  })
}

/**
 * Kakao SDK 로드 실패는 **응답 자체가 없는** 실패다 → `classifyStatus(null)` = `network`.
 * 재시도 노출은 상태를 직접 비교하지 않고 공통 유틸(`isRetryable`)로만 결정한다.
 */
const MAP_SDK_ERROR_KIND = classifyStatus(null)
const IS_MAP_SDK_ERROR_RETRYABLE = isRetryable(MAP_SDK_ERROR_KIND)

export const createRankMarkerAriaLabel = (
  item: RecommendationMapItem,
): string => {
  // 점수가 없으면 "집계 대기"가 아니라 지표 데이터 부재다.
  const score =
    item.compositeScore !== null && Number.isFinite(item.compositeScore)
      ? `${Math.round(item.compositeScore)}점`
      : '점수 데이터 없음'

  return `${item.rank}위 ${item.commercialName}, ${score}`
}

export const selectCommercialFromRankMarker = (
  commercialCode: string,
  onSelect: (code: string) => void,
  onPreviewChange?: (code: string | null) => void,
): void => {
  onPreviewChange?.(commercialCode)
  onSelect(commercialCode)
}

export const getResultDrawingOrder = (
  areas: readonly RecommendationMapItem[],
  selectedCommercialCode: string | null,
  previewedCommercialCode: string | null,
): RecommendationMapItem[] => {
  const selected = areas.find(
    area => area.commercialCode === selectedCommercialCode,
  )
  const previewed =
    previewedCommercialCode === selectedCommercialCode
      ? undefined
      : areas.find(area => area.commercialCode === previewedCommercialCode)
  const normalAreas = areas
    .filter(area => area !== selected && area !== previewed)
    .sort((left, right) => right.rank - left.rank)

  return [
    ...normalAreas,
    ...(previewed ? [previewed] : []),
    ...(selected ? [selected] : []),
  ]
}

const getAreaSemanticValue = (area: AreaBoundaryItem | undefined) =>
  area
    ? [
        area.areaCode,
        normalizeBoundary(area.boundaryCoords).map(point => [
          point.lng,
          point.lat,
        ]),
      ]
    : null

const getResultSemanticValue = (area: RecommendationMapItem) => ({
  rank: area.rank,
  commercialCode: area.commercialCode,
  commercialName: area.commercialName,
  compositeScore: Number.isFinite(area.compositeScore)
    ? area.compositeScore
    : null,
  center: normalizeBoundary([[area.centerLng, area.centerLat]])[0] ?? null,
  boundary: normalizeBoundary(area.boundaryCoords),
})

export const createRecommendMapLayerSemanticKey = ({
  stage,
  districtAreas,
  administrationAreas,
  commercialAreas,
  resultAreas,
  selectedDistrictCode,
  selectedAdministrationCode,
  previewedCommercialCode,
}: RecommendMapLayerStructuralInput): string => {
  if (stage === 'district') {
    return JSON.stringify([
      stage,
      selectedDistrictCode,
      districtAreas.map(getAreaSemanticValue),
    ])
  }

  if (stage === 'administration') {
    return JSON.stringify([
      stage,
      getAreaSemanticValue(
        districtAreas.find(area => area.areaCode === selectedDistrictCode),
      ),
      selectedAdministrationCode,
      administrationAreas.map(getAreaSemanticValue),
    ])
  }

  if (stage === 'commercial') {
    return JSON.stringify([
      stage,
      getAreaSemanticValue(
        administrationAreas.find(
          area => area.areaCode === selectedAdministrationCode,
        ),
      ),
      previewedCommercialCode,
      commercialAreas.map(getAreaSemanticValue),
    ])
  }

  return JSON.stringify([
    stage,
    getAreaSemanticValue(
      administrationAreas.find(
        area => area.areaCode === selectedAdministrationCode,
      ),
    ),
    resultAreas.map(getResultSemanticValue),
  ])
}

// 결과 폴리곤도 단계 폴리곤과 같은 3상태 규격(1.5/2/2.5px)을 탄다.
// 다만 fill 농도는 점수 기반 값을 base 로 넘겨 순위 정보를 지도에 남긴다.
export const getResultPolygonStyle = (
  item: RecommendationMapItem,
  state: 'default' | 'hovered' | 'selected',
  tokens: AreaPolygonStyleTokens,
  baseZIndex: number,
) =>
  resolveAreaPolygonStyle(
    state,
    tokens,
    baseZIndex,
    getScoreFillOpacity(item.compositeScore, item.rank),
  )

export const updateResultLayerPreviewVisuals = (
  entries: ResultLayerVisualEntry[],
  selectedCommercialCode: string | null,
  previewedCommercialCode: string | null,
  tokens: AreaPolygonStyleTokens,
): void => {
  const drawingOrder = getResultDrawingOrder(
    entries.map(entry => entry.item),
    selectedCommercialCode,
    previewedCommercialCode,
  )
  const zIndexes = new Map(
    drawingOrder.map((item, index) => [item.commercialCode, index]),
  )

  entries.forEach(entry => {
    const code = entry.item.commercialCode
    // hovered 자리에 preview(마커 포커스/호버, 폴리곤 호버)를 대응시킨다.
    const state = resolveAreaPolygonState(
      code,
      selectedCommercialCode,
      previewedCommercialCode,
    )
    const zIndex = zIndexes.get(code) ?? 0
    const style = getResultPolygonStyle(entry.item, state, tokens, 0)

    entry.marker?.setAttribute('aria-pressed', String(state === 'selected'))
    entry.marker?.setAttribute('data-previewed', String(state === 'hovered'))
    entry.polygon?.setOptions({
      strokeColor: style.strokeColor,
      strokeWeight: style.strokeWeight,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
    })
    // z 순서는 겹침을 다루는 getResultDrawingOrder 가 이미 정한다(공용 zIndex 미사용).
    entry.polygon?.setZIndex(zIndex + 10)
    entry.overlay?.setZIndex(zIndex + 100)
  })
}

/**
 * 결과 단계에서 행정동은 **배경 맥락**이지 선택 대상이 아니다.
 *
 * 예전에는 primary 파랑으로 2px + fill 0.1 을 칠해, 결과 화면이 「행정동을
 * 선택한 상태」로 읽혔다 — 정작 고른 것은 그 안의 상권인데. 채움을 없애고
 * 중립색 외곽선만 남겨 어디를 보고 있는지만 알린다.
 */
export const getResultContextPolygonStyle = (
  outlineColor: string,
): {
  strokeColor: string
  strokeWeight: number
  fillColor: string
  fillOpacity: number
} => ({
  strokeColor: outlineColor,
  strokeWeight: 1.5,
  fillColor: outlineColor,
  fillOpacity: 0,
})

export const createBackgroundClickGuard = (
  scheduleReset: (callback: () => void) => void = queueMicrotask,
): BackgroundClickGuard => {
  let suppressed = false
  let actionSequence = 0

  return {
    suppressForCurrentTask: () => {
      suppressed = true
      actionSequence += 1
      const scheduledSequence = actionSequence
      scheduleReset(() => {
        if (scheduledSequence === actionSequence) {
          suppressed = false
        }
      })
    },
    isSuppressed: () => suppressed,
  }
}

const MapRegion = styled.section`
  position: relative;
  min-height: 420px;
  overflow: hidden;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);

  & .recommend-rank-marker {
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    border: 2px solid var(--color-primary-600, #2272eb);
    border-radius: var(--radius-pill, 999px);
    background: var(--color-surface, #fff);
    color: var(--color-text-900, #191f28);
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    box-shadow: 0 1px 4px rgb(0 0 0 / 14%);
    transition:
      background-color var(--motion-fast, 120ms) var(--ease-standard, ease),
      border-color var(--motion-fast, 120ms) var(--ease-standard, ease);
  }

  & .recommend-rank-marker[aria-pressed='true'] {
    border-color: var(--color-primary-600, #2272eb);
    background: var(--color-primary-700, #0ea5e9);
    color: var(--color-text-900, #191f28);
  }

  & .recommend-rank-marker[data-previewed='true']:not([aria-pressed='true']) {
    background: var(--color-primary-100, #e8f3ff);
  }

  & .recommend-rank-marker:focus-visible {
    outline: 2px solid var(--color-primary-700, #0ea5e9);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    & .recommend-rank-marker {
      transition: none;
    }
  }
`

const MapCanvas = styled.div`
  width: 100%;
  min-height: 420px;
`

const RecenterButton = styled.button`
  position: absolute;
  z-index: 3;
  top: 12px;
  right: 12px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  background: rgb(255 255 255 / 96%);
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`

const FeedbackLayer = styled.div`
  position: absolute;
  z-index: 4;
  right: 12px;
  bottom: 12px;
  left: 12px;
`

const readColorToken = (token: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim()

  return value || fallback
}

const getAreaPoints = (
  area: AreaBoundaryItem | undefined,
): MapPoint[] | null => {
  if (!area) return null

  const boundary = normalizeBoundary(area.boundaryCoords)
  if (boundary.length > 0) return boundary

  const center = normalizeBoundary([[area.centerLng, area.centerLat]])
  return center.length > 0 ? center : null
}

const getResultPoints = (
  area: RecommendationMapItem | undefined,
): MapPoint[] | null => {
  if (!area) return null

  const boundary = normalizeBoundary(area.boundaryCoords)
  if (boundary.length > 0) return boundary

  const center = normalizeBoundary([[area.centerLng, area.centerLat]])
  return center.length > 0 ? center : null
}

/**
 * 지도 위에 떠 있는 패널(`data-map-overlay`)을 지도 좌표계로 재서 카메라 패딩을 만든다.
 * CSS 폭을 상수로 베껴 두면 레이아웃이 바뀔 때 조용히 어긋나므로 실제 크기를 읽는다.
 */
const readCameraPadding = (map: KakaoMapInstance): CameraPadding => {
  if (typeof document === 'undefined') {
    return {
      top: MIN_CAMERA_PADDING,
      right: MIN_CAMERA_PADDING,
      bottom: MIN_CAMERA_PADDING,
      left: MIN_CAMERA_PADDING,
    }
  }

  const mapRect = map.getNode().getBoundingClientRect()
  const overlays = Array.from(
    document.querySelectorAll<HTMLElement>('[data-map-overlay="true"]'),
  ).flatMap(element => {
    const rect = element.getBoundingClientRect()

    if (rect.width === 0 || rect.height === 0) return []

    return [
      {
        left: rect.left - mapRect.left,
        top: rect.top - mapRect.top,
        right: rect.right - mapRect.left,
        bottom: rect.bottom - mapRect.top,
      },
    ]
  })

  return resolveCameraPadding(
    { width: mapRect.width, height: mapRect.height },
    overlays,
  )
}

const applyCameraTarget = (
  maps: KakaoMapsNamespace,
  map: KakaoMapInstance,
  target: MapCameraTarget | null,
) => {
  // `keep` 은 「지금 보고 있는 화면을 그대로 둔다」다. 추천 결과가 0건일 때
  // 행정동으로 확대하거나 서울 전역으로 튕기면, 사용자는 자기가 보던 화면을 잃는다.
  if (!target || target.kind === 'keep') return

  // 아직 아무것도 안 골랐으면 맞출 대상이 없다. 예전에는 서울 전역 bbox 에
  // 억지로 fit 해서 level 9 / 중심 (37.564, 127.001) 로 밀렸는데, 상권분석은
  // 같은 상황에서 기본 카메라(level 8 / 서울시청)를 그대로 둔다. 첫 진입 화면이
  // 두 페이지에서 달라 보이던 원인이라 여기서도 기본 카메라로 맞춘다.
  if (target.kind === 'reset') {
    map.setCenter(
      new maps.LatLng(SEOUL_DEFAULT_CAMERA.lat, SEOUL_DEFAULT_CAMERA.lng),
    )
    map.setLevel(SEOUL_DEFAULT_CAMERA.level)
    return
  }

  const { points } = target
  const bounds = new maps.LatLngBounds()

  points.forEach(point => {
    bounds.extend(new maps.LatLng(point.lat, point.lng))
  })

  const padding = readCameraPadding(map)
  map.setBounds(
    bounds,
    padding.top,
    padding.right,
    padding.bottom,
    padding.left,
  )

  if (points.length === 1) {
    map.setCenter(new maps.LatLng(points[0].lat, points[0].lng))
  }
}

export default function RecommendMap({
  stage,
  districtAreas,
  administrationAreas,
  commercialAreas,
  resultAreas,
  selectedDistrictCode,
  selectedAdministrationCode,
  selectedCommercialCode,
  isResultSelectionExplicit = false,
  isResultsLoading = false,
  previewedCommercialCode = null,
  onDistrictSelect,
  onAdministrationSelect,
  onCommercialSelect,
  onCommercialPreviewChange,
  onBackgroundClick,
  onViewportBoundsChange,
  initialCamera = null,
  cameraMode = 'auto',
  onCameraSettle,
  onRecenter,
}: RecommendMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  /*
   * 지도 생성 이펙트는 `[loadAttempt]` 라 마운트 뒤에도 다시 돌 수 있다(SDK 재시도).
   * 그때 최신 prop 을 쓰면 사용자가 옮겨 둔 화면이 링크 카메라로 되감긴다 — 마운트
   * 시점 값을 ref 로 잡아 둔다.
   */
  const initialCameraRef = useRef(initialCamera)
  const mapRef = useRef<KakaoMapInstance | null>(null)
  const mapsRef = useRef<KakaoMapsNamespace | null>(null)
  const clearLayersRef = useRef<() => void>(() => undefined)
  const resultLayersRef = useRef<ResultLayerVisualEntry[]>([])
  const resultLayerTokensRef = useRef<AreaPolygonStyleTokens>({
    baseStroke: '#2272eb',
    activeStroke: '#2272eb',
    fill: '#2272eb',
  })
  const selectedCommercialCodeRef = useRef(selectedCommercialCode)
  const previewedCommercialCodeRef = useRef(previewedCommercialCode)
  const layerInputRef = useRef<RecommendMapLayerStructuralInput>({
    stage,
    districtAreas,
    administrationAreas,
    commercialAreas,
    resultAreas,
    selectedDistrictCode,
    selectedAdministrationCode,
    previewedCommercialCode,
  })
  const callbacksRef = useRef({
    onBackgroundClick,
    onDistrictSelect,
    onAdministrationSelect,
    onCommercialSelect,
    onCommercialPreviewChange,
    onViewportBoundsChange,
    onCameraSettle,
    onRecenter,
  })
  const guardRef = useRef<BackgroundClickGuard | null>(null)
  const lastViewportBoundsKeyRef = useRef('')
  /** 모드를 씌운 타깃. 이펙트·ResizeObserver 는 이것만 본다. */
  const cameraTargetRef = useRef<MapCameraTarget | null>(null)
  /** 모드를 씌우기 **전**의 타깃. 「선택 범위로 이동」만 이것을 쓴다. */
  const rawCameraTargetRef = useRef<MapCameraTarget | null>(null)
  /** 마지막으로 실제 적용한 카메라 타깃의 키. 모드 전환 이펙트와 recenter 가 공유한다. */
  const lastAppliedCameraKeyRef = useRef<string | null>(null)
  const [sdkStatus, setSdkStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [hoveredAreaCode, setHoveredAreaCode] = useState<string | null>(null)
  /*
   * 아래 대입들은 **최신값 ref** 관용구다. 지도 이벤트 핸들러와 레이어 그리기는
   * 이펙트 안에서 한 번 등록되고 오래 산다. 그 안에서 최신 prop 을 보려면 매 렌더
   * 값을 ref 에 옮겨 두는 수밖에 없다 — 핸들러를 매번 다시 등록하면 카카오 SDK
   * 오버레이를 통째로 다시 만들게 된다.
   *
   * `react-hooks/refs` 는 렌더 중 ref 쓰기를 막는다. 옳은 규칙이고, 이펙트로 옮기면
   * 한 커밋 늦게 반영된다 — `layerInputRef` 는 같은 렌더가 만든 `layerSemanticKey`
   * 로 도는 이펙트가 읽으므로 그 지연이 곧 어긋남이다. 그래서 여기서는 관용구를
   * 유지하고 **줄 단위로** 끈다. 파일 전체를 열어 두던 예외를 걷은 것이라, 이 파일에
   * 새로 들어오는 코드는 규칙을 그대로 받는다.
   *
   * 정식 해소는 `useEffectEvent` 이관이다 — 지도 실화면 검증 경로가 생긴 뒤에 한다.
   */
  const hoveredAreaCodeRef = useRef<string | null>(null)
  // eslint-disable-next-line react-hooks/refs -- 최신값 ref 관용구. 사유는 위 주석
  hoveredAreaCodeRef.current = hoveredAreaCode
  // 현재 단계 레이어들의 호버 하이라이트 적용 함수. 레이어를 다시 그릴 때 교체된다.
  const stageHighlightsRef = useRef<Array<(hovered: string | null) => void>>([])

  // eslint-disable-next-line react-hooks/refs -- 최신값 ref 관용구. 사유는 위 주석
  callbacksRef.current = {
    onBackgroundClick,
    onDistrictSelect,
    onAdministrationSelect,
    onCommercialSelect,
    onCommercialPreviewChange,
    onViewportBoundsChange,
    onCameraSettle,
    onRecenter,
  }
  // eslint-disable-next-line react-hooks/refs -- 최신값 ref 관용구. 사유는 위 주석
  selectedCommercialCodeRef.current = selectedCommercialCode
  // eslint-disable-next-line react-hooks/refs -- 최신값 ref 관용구. 사유는 위 주석
  previewedCommercialCodeRef.current = previewedCommercialCode

  const layerInput = {
    stage,
    districtAreas,
    administrationAreas,
    commercialAreas,
    resultAreas,
    selectedDistrictCode,
    selectedAdministrationCode,
    previewedCommercialCode,
  }

  // eslint-disable-next-line react-hooks/refs -- 최신값 ref 관용구. 사유는 위 주석
  layerInputRef.current = layerInput
  guardRef.current ??= createBackgroundClickGuard()

  const selectedResult = resultAreas.find(
    area => area.commercialCode === selectedCommercialCode,
  )
  const selectedAdministration = administrationAreas.find(
    area => area.areaCode === selectedAdministrationCode,
  )
  const selectedDistrict = districtAreas.find(
    area => area.areaCode === selectedDistrictCode,
  )
  const cameraTarget = resolveRecommendCameraTarget({
    stage,
    isResultsLoading,
    // 결과 도착 시 자동 선택된 1위로 카메라를 당기면 나머지 추천이 화면 밖으로 밀린다.
    selectedResultPoints: isResultSelectionExplicit
      ? getResultPoints(selectedResult)
      : null,
    resultPoints: collectResultCameraPoints(resultAreas),
    administrationPoints: getAreaPoints(selectedAdministration),
    districtPoints: getAreaPoints(selectedDistrict),
  })
  /*
   * 모드를 **키를 만들기 전에** 씌운다. `'url'` 동안 키가 `keep` 하나로 고정되므로
   * 복원 사슬이 데이터를 받아 타깃을 바꿔도 이펙트가 돌지 않고, 사용자 의도 액션으로
   * 모드가 `'auto'` 가 되는 순간 키가 바뀌어 **한 번** 맞춰진다.
   */
  const effectiveCameraTarget = applyCameraMode(cameraTarget, cameraMode)
  const cameraTargetKey = JSON.stringify(effectiveCameraTarget)
  const layerSemanticKey = createRecommendMapLayerSemanticKey(layerInput)
  // eslint-disable-next-line react-hooks/refs -- 최신값 ref 관용구. 사유는 위 주석
  cameraTargetRef.current = effectiveCameraTarget
  // eslint-disable-next-line react-hooks/refs -- 최신값 ref 관용구. 사유는 위 주석
  rawCameraTargetRef.current = cameraTarget

  useEffect(() => {
    let cancelled = false
    let mapClickHandler: (() => void) | null = null
    let mapIdleHandler: (() => void) | null = null
    let viewportTimer: ReturnType<typeof setTimeout> | null = null

    loadKakaoMapSdk(env.kakaoJavascriptKey)
      .then(maps => {
        if (cancelled || !containerRef.current) return

        mapsRef.current = maps
        // 링크가 카메라를 들고 왔으면 그 화면으로 연다. 없거나 무효면 서울 기본이다.
        const startCamera = initialCameraRef.current ?? SEOUL_DEFAULT_CAMERA
        const map =
          mapRef.current ??
          new maps.Map(containerRef.current, {
            center: new maps.LatLng(startCamera.lat, startCamera.lng),
            level: startCamera.level,
          })
        mapRef.current = map
        mapClickHandler = () => {
          if (!guardRef.current?.isSuppressed()) {
            callbacksRef.current.onBackgroundClick?.()
          }
        }
        mapIdleHandler = () => {
          if (viewportTimer) clearTimeout(viewportTimer)

          viewportTimer = setTimeout(() => {
            /*
             * 카메라를 **bounds dedupe 보다 먼저** 올린다. 확대·축소나 같은 창
             * 안에서의 미세 팬은 양자화된 bounds 키가 같아 아래에서 조기 반환되는데,
             * 카메라는 그때도 바뀌므로 여기 걸리면 `c` 가 갱신되지 않는다.
             */
            const center = map.getCenter()
            callbacksRef.current.onCameraSettle?.(
              createMapCamera(center.getLat(), center.getLng(), map.getLevel()),
            )

            const viewportBounds = readKakaoViewportBounds(map)
            if (!viewportBounds) return

            const viewportBoundsKey = JSON.stringify(viewportBounds)
            if (viewportBoundsKey === lastViewportBoundsKeyRef.current) return

            lastViewportBoundsKeyRef.current = viewportBoundsKey
            callbacksRef.current.onViewportBoundsChange?.(viewportBounds)
          }, VIEWPORT_BOUNDS_DEBOUNCE_MS)
        }
        maps.event.addListener(map, 'click', mapClickHandler)
        maps.event.addListener(map, 'idle', mapIdleHandler)
        setSdkStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setSdkStatus('error')
      })

    return () => {
      cancelled = true
      const maps = mapsRef.current
      const map = mapRef.current

      if (viewportTimer) clearTimeout(viewportTimer)
      if (maps && map && mapClickHandler) {
        maps.event.removeListener(map, 'click', mapClickHandler)
      }
      if (maps && map && mapIdleHandler) {
        maps.event.removeListener(map, 'idle', mapIdleHandler)
      }
    }
  }, [loadAttempt])

  useEffect(() => {
    const map = mapRef.current
    if (
      sdkStatus !== 'ready' ||
      !map ||
      typeof ResizeObserver === 'undefined'
    ) {
      return
    }

    const observer = new ResizeObserver(() => {
      const maps = mapsRef.current
      if (!maps) return

      map.relayout()
      // 맞출 대상이 없을 때는 건드리지 않는다 — 사용자가 옮겨 둔 화면을
      // 창 크기 변화만으로 기본 카메라로 되돌리면 안 된다.
      applyCameraTarget(maps, map, cameraTargetRef.current)
    })
    if (containerRef.current) observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [sdkStatus])

  useEffect(() => {
    clearLayersRef.current()

    const maps = mapsRef.current
    const map = mapRef.current
    if (sdkStatus !== 'ready' || !maps || !map) return
    const layerInput = layerInputRef.current

    const polygons: KakaoMapPolygon[] = []
    const overlays: KakaoMapCustomOverlay[] = []
    const kakaoListeners: Array<{
      target: object
      type: 'click' | 'mouseover' | 'mouseout'
      handler: () => void
    }> = []
    const domCleanups: Array<() => void> = []
    const polygonLayerCleanups: Array<() => void> = []
    stageHighlightsRef.current = []
    const resultLayerEntries: ResultLayerVisualEntry[] = []
    // 지도 위 파랑은 primary-600 하나로 통일한다(상권분석 지도와 동일).
    // 예전에는 결과 단계가 미정의 토큰 --color-primary-500 을 읽어 폴백 #3182f6 으로,
    // 단계 폴리곤은 primary-700 으로 칠해져 한 화면에 파랑이 셋이었다.
    const mapPrimaryColor = readColorToken('--color-primary-600', '#2272eb')
    const neutralStroke = readColorToken('--color-border-300', '#d1d6db')
    const neutralFill = readColorToken('--color-surface-muted', '#f2f4f6')
    const areaPolygonTokens = {
      baseStroke: mapPrimaryColor,
      activeStroke: mapPrimaryColor,
      fill: mapPrimaryColor,
    }

    const suppressBackground = () => {
      guardRef.current?.suppressForCurrentTask()
      maps.event.preventMap()
    }

    const drawPolygon = ({
      points,
      zIndex,
      strokeColor,
      strokeWeight,
      fillColor,
      fillOpacity,
      onClick,
      onHoverChange,
    }: {
      points: readonly MapPoint[]
      zIndex: number
      strokeColor: string
      strokeWeight: number
      fillColor: string
      fillOpacity: number
      onClick?: () => void
      onHoverChange?: (hovered: boolean) => void
    }): KakaoMapPolygon | null => {
      if (points.length < 3) return null

      const polygon = new maps.Polygon({
        map,
        path: points.map(point => new maps.LatLng(point.lat, point.lng)),
        strokeColor,
        strokeWeight,
        strokeOpacity: 1,
        fillColor,
        fillOpacity,
        clickable: Boolean(onClick || onHoverChange),
      })
      polygon.setZIndex(zIndex)
      polygons.push(polygon)

      if (onClick) {
        const handler = () => {
          suppressBackground()
          onClick()
        }
        maps.event.addListener(polygon, 'click', handler)
        kakaoListeners.push({ target: polygon, type: 'click', handler })
      }

      if (onHoverChange) {
        const overHandler = () => onHoverChange(true)
        const outHandler = () => onHoverChange(false)
        maps.event.addListener(polygon, 'mouseover', overHandler)
        maps.event.addListener(polygon, 'mouseout', outHandler)
        kakaoListeners.push(
          { target: polygon, type: 'mouseover', handler: overHandler },
          { target: polygon, type: 'mouseout', handler: outHandler },
        )
      }

      return polygon
    }

    const drawContextArea = (
      area: AreaBoundaryItem | undefined,
      style = {
        strokeColor: neutralStroke,
        strokeWeight: 2,
        fillColor: neutralFill,
        fillOpacity: 0.18,
      },
    ) => {
      const points = area ? normalizeBoundary(area.boundaryCoords) : []
      drawPolygon({
        points,
        zIndex: 1,
        ...style,
      })
    }

    // 한 단계의 면(폴리곤)과 이름표(뱃지)를 함께 그린다. 면만 있으면 어느
    // 폴리곤이 어디인지 지도만 보고는 알 수 없고, 뱃지는 폴리곤 클릭이 닿지
    // 않는 키보드 사용자에게 유일한 선택 수단이기도 하다.
    const drawSelectableAreas = (
      areas: readonly AreaBoundaryItem[],
      selectedCode: string | null,
      onSelect: (code: string) => void,
    ) => {
      const polygonHandle = drawAreaPolygonLayer({
        map,
        maps,
        areas,
        selectedCode,
        hoveredCode: hoveredAreaCodeRef.current,
        onSelect,
        onHoverChange: setHoveredAreaCode,
        tokens: areaPolygonTokens,
      })
      const labelHandle = drawAreaLabelLayer({
        map,
        maps,
        areas,
        selectedCode,
        previewedCode: hoveredAreaCodeRef.current,
        onSelect,
        onPreviewChange: setHoveredAreaCode,
        onBeforeSelect: suppressBackground,
      })
      polygonLayerCleanups.push(polygonHandle.cleanup, labelHandle.cleanup)
      // 선택이 바뀌면 layerSemanticKey 가 바뀌어 레이어를 통째로 다시 그린다.
      // 여기서 갱신하는 건 호버/포커스뿐이라 selectedCode 는 닫아 두면 된다.
      stageHighlightsRef.current.push(hovered => {
        polygonHandle.setHighlight({ selectedCode, hoveredCode: hovered })
        labelHandle.setHighlight({ selectedCode, previewedCode: hovered })
      })
    }

    if (layerInput.stage === 'district') {
      drawSelectableAreas(
        layerInput.districtAreas,
        layerInput.selectedDistrictCode,
        code => callbacksRef.current.onDistrictSelect(code),
      )
    }

    if (layerInput.stage === 'administration') {
      drawContextArea(
        layerInput.districtAreas.find(
          area => area.areaCode === layerInput.selectedDistrictCode,
        ),
      )
      drawSelectableAreas(
        layerInput.administrationAreas,
        layerInput.selectedAdministrationCode,
        code => callbacksRef.current.onAdministrationSelect(code),
      )
    }

    if (layerInput.stage === 'commercial') {
      drawContextArea(
        layerInput.administrationAreas.find(
          area => area.areaCode === layerInput.selectedAdministrationCode,
        ),
      )
      drawSelectableAreas(
        layerInput.commercialAreas,
        selectedCommercialCodeRef.current,
        code => callbacksRef.current.onCommercialSelect(code),
      )
    }

    if (layerInput.stage === 'results') {
      drawContextArea(
        layerInput.administrationAreas.find(
          area => area.areaCode === layerInput.selectedAdministrationCode,
        ),
        getResultContextPolygonStyle(neutralStroke),
      )
      const orderedResults = getResultDrawingOrder(
        layerInput.resultAreas,
        null,
        null,
      )

      orderedResults.forEach((area, index) => {
        const defaultStyle = getResultPolygonStyle(
          area,
          'default',
          areaPolygonTokens,
          0,
        )
        const polygon = drawPolygon({
          points: normalizeBoundary(area.boundaryCoords),
          zIndex: index + 10,
          strokeColor: defaultStyle.strokeColor,
          strokeWeight: defaultStyle.strokeWeight,
          fillColor: defaultStyle.fillColor,
          fillOpacity: defaultStyle.fillOpacity,
          onClick: () =>
            callbacksRef.current.onCommercialSelect(area.commercialCode),
          // 순위 마커에만 있던 preview 를 폴리곤 본체에도 연다(단계 폴리곤과 동일).
          onHoverChange: hovered =>
            callbacksRef.current.onCommercialPreviewChange?.(
              hovered ? area.commercialCode : null,
            ),
        })
        const entry: ResultLayerVisualEntry = {
          item: area,
          marker: null,
          polygon,
          overlay: null,
        }
        resultLayerEntries.push(entry)

        const center = normalizeBoundary([[area.centerLng, area.centerLat]])[0]
        if (!center) return

        const marker = document.createElement('button')
        marker.type = 'button'
        marker.className = 'recommend-rank-marker'
        marker.textContent = String(area.rank)
        marker.setAttribute('aria-label', createRankMarkerAriaLabel(area))
        marker.setAttribute('aria-pressed', 'false')

        const select = (event: Event) => {
          event.stopPropagation()
          suppressBackground()
          selectCommercialFromRankMarker(
            area.commercialCode,
            callbacksRef.current.onCommercialSelect,
            callbacksRef.current.onCommercialPreviewChange,
          )
        }
        const preview = () =>
          callbacksRef.current.onCommercialPreviewChange?.(area.commercialCode)
        const clearPreview = () =>
          callbacksRef.current.onCommercialPreviewChange?.(null)

        marker.addEventListener('click', select)
        marker.addEventListener('focus', preview)
        marker.addEventListener('pointerenter', preview)
        marker.addEventListener('blur', clearPreview)
        marker.addEventListener('pointerleave', clearPreview)
        domCleanups.push(() => {
          marker.removeEventListener('click', select)
          marker.removeEventListener('focus', preview)
          marker.removeEventListener('pointerenter', preview)
          marker.removeEventListener('blur', clearPreview)
          marker.removeEventListener('pointerleave', clearPreview)
        })

        const overlay = new maps.CustomOverlay({
          map,
          position: new maps.LatLng(center.lat, center.lng),
          content: marker,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: index + 100,
          clickable: true,
        })
        overlay.setZIndex(index + 100)
        overlays.push(overlay)
        entry.marker = marker
        entry.overlay = overlay
      })
      resultLayersRef.current = resultLayerEntries
      resultLayerTokensRef.current = areaPolygonTokens
      updateResultLayerPreviewVisuals(
        resultLayerEntries,
        selectedCommercialCodeRef.current,
        previewedCommercialCodeRef.current,
        areaPolygonTokens,
      )
    } else {
      resultLayersRef.current = []
    }

    const clearLayers = () => {
      kakaoListeners.forEach(({ target, type, handler }) => {
        maps.event.removeListener(target, type, handler)
      })
      domCleanups.forEach(cleanup => cleanup())
      polygonLayerCleanups.forEach(cleanup => cleanup())
      stageHighlightsRef.current = []
      polygons.forEach(polygon => polygon.setMap(null))
      overlays.forEach(overlay => overlay.setMap(null))
      if (resultLayersRef.current === resultLayerEntries) {
        resultLayersRef.current = []
      }
    }
    clearLayersRef.current = clearLayers

    return () => {
      clearLayers()
      if (clearLayersRef.current === clearLayers) {
        clearLayersRef.current = () => undefined
      }
    }
  }, [layerSemanticKey, sdkStatus])

  // 호버·포커스는 레이어를 다시 그리지 않고 증분 적용한다. 예전에는
  // `hoveredAreaCode` 가 위 이펙트의 의존성이라 호버 한 번에 레이어가 통째로
  // 새로 그려졌다 — 이름 뱃지는 <button> 이라, 키보드로 탭해 들어간 순간
  // 포커스가 preview 를 켜고 그 버튼이 파괴되며 포커스를 잃는다.
  useEffect(() => {
    stageHighlightsRef.current.forEach(apply => apply(hoveredAreaCode))
  }, [hoveredAreaCode])

  useEffect(() => {
    const maps = mapsRef.current
    const map = mapRef.current
    if (sdkStatus !== 'ready' || !maps || !map) return
    if (lastAppliedCameraKeyRef.current === cameraTargetKey) return
    applyCameraTarget(maps, map, cameraTargetRef.current)
    lastAppliedCameraKeyRef.current = cameraTargetKey
  }, [cameraTargetKey, sdkStatus])

  useEffect(() => {
    updateResultLayerPreviewVisuals(
      resultLayersRef.current,
      selectedCommercialCode,
      previewedCommercialCode,
      resultLayerTokensRef.current,
    )
  }, [previewedCommercialCode, selectedCommercialCode])

  /*
   * 「선택 범위로 이동」은 **모드와 무관하게 즉시 맞춘다** — 사용자가 원한 것이다.
   * 그래서 모드를 씌우지 않은 원래 타깃을 쓰고, 그 뒤로 자동 맞춤을 다시 허용하도록
   * 화면에 알린다(url-state §2-2).
   * 맞출 대상이 `keep` 이면(결과 로딩 중 등) 잠금도 풀지 않는다 — 아무 일도 안 일어난
   * 버튼이 몇 초 뒤 결과 도착과 함께 화면을 옮기면 안 된다.
   * 직접 적용한 타깃의 키를 기록해 모드 전환 이펙트가 같은 fit 을 되풀이하지 않게 한다.
   */
  const recenter = () => {
    const maps = mapsRef.current
    const map = mapRef.current
    const target = rawCameraTargetRef.current
    if (!target || target.kind === 'keep') return
    if (maps && map) applyCameraTarget(maps, map, target)
    lastAppliedCameraKeyRef.current = JSON.stringify(target)
    callbacksRef.current.onRecenter?.()
  }

  return (
    <MapRegion aria-label="상권 추천 지도" role="region">
      <MapCanvas
        ref={containerRef}
        data-recommend-map-container="true"
        data-kakao-map="true"
      />
      <RecenterButton
        type="button"
        disabled={sdkStatus !== 'ready'}
        onClick={recenter}
      >
        선택 범위로 이동
      </RecenterButton>
      {sdkStatus === 'error' ? (
        <FeedbackLayer>
          <RecommendFeedback
            tone="error"
            title="지도를 불러오지 못했어요"
            description={
              IS_MAP_SDK_ERROR_RETRYABLE
                ? '잠시 후 다시 시도해 주세요.'
                : '지도 서비스를 사용할 수 없어요.'
            }
            actionLabel={IS_MAP_SDK_ERROR_RETRYABLE ? '다시 시도' : undefined}
            onAction={
              IS_MAP_SDK_ERROR_RETRYABLE
                ? () => {
                    /*
                     * 「불러오는 중」으로 되돌리는 일은 **이 클릭**이 한다. 예전에는
                     * 로딩 이펙트 첫 줄에서 했는데, 이펙트 몸통의 setState 는 연쇄
                     * 렌더를 만든다(`react-hooks/set-state-in-effect`). 첫 마운트에는
                     * 초기값이 이미 `'loading'` 이라 그 호출이 하는 일도 없었다.
                     * 이펙트가 다시 도는 경로는 이 버튼뿐이므로 여기가 제자리다.
                     * 두 갱신은 같은 이벤트라 한 번의 렌더로 묶인다.
                     */
                    setSdkStatus('loading')
                    setLoadAttempt(attempt => attempt + 1)
                  }
                : undefined
            }
          />
        </FeedbackLayer>
      ) : null}
    </MapRegion>
  )
}
