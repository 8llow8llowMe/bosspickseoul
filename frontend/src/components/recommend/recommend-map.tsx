'use client'

import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

import RecommendFeedback from '@/components/recommend/recommend-feedback'
import { env } from '@/lib/env'
import { loadKakaoMapSdk } from '@/lib/kakao-map'
import {
  getScoreFillOpacity,
  normalizeBoundary,
  normalizeViewportBounds,
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
  previewedCommercialCode?: string | null
  onDistrictSelect: (districtCode: string) => void
  onAdministrationSelect: (administrationCode: string) => void
  onCommercialSelect: (commercialCode: string) => void
  onCommercialPreviewChange?: (commercialCode: string | null) => void
  onBackgroundClick?: () => void
  onViewportBoundsChange?: (bounds: GeoBounds) => void
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

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }
const SEOUL_BOUNDS: MapPoint[] = [
  { lat: 37.4133, lng: 126.7341 },
  { lat: 37.7151, lng: 127.2693 },
]
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

export const createRankMarkerAriaLabel = (
  item: RecommendationMapItem,
): string => {
  const score =
    item.compositeScore !== null && Number.isFinite(item.compositeScore)
      ? `${Math.round(item.compositeScore)}점`
      : '점수 집계 중'

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

export const updateResultLayerPreviewVisuals = (
  entries: ResultLayerVisualEntry[],
  selectedCommercialCode: string | null,
  previewedCommercialCode: string | null,
  primaryColor: string,
  selectedColor: string,
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
    const selected = entry.item.commercialCode === selectedCommercialCode
    const previewed =
      !selected && entry.item.commercialCode === previewedCommercialCode
    const zIndex = zIndexes.get(entry.item.commercialCode) ?? 0

    entry.marker?.setAttribute('aria-pressed', String(selected))
    entry.marker?.setAttribute('data-previewed', String(previewed))
    entry.polygon?.setOptions({
      strokeColor: selected ? selectedColor : primaryColor,
      strokeWeight: selected ? 3 : previewed ? 2 : 1,
    })
    entry.polygon?.setZIndex(zIndex + 10)
    entry.overlay?.setZIndex(zIndex + 100)
  })
}

export const getResultContextPolygonStyle = (
  primaryColor: string,
): {
  strokeColor: string
  strokeWeight: number
  fillColor: string
  fillOpacity: number
} => ({
  strokeColor: primaryColor,
  strokeWeight: 2,
  fillColor: primaryColor,
  fillOpacity: 0.1,
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
    font-weight: 800;
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
    outline: 3px solid var(--color-primary-200, #90c2ff);
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

const Badge = styled.span`
  position: absolute;
  z-index: 3;
  top: 12px;
  left: 12px;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-pill);
  background: rgb(255 255 255 / 94%);
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;
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

const setMapBounds = (
  maps: KakaoMapsNamespace,
  map: KakaoMapInstance,
  points: readonly MapPoint[],
) => {
  const targetPoints = points.length > 0 ? points : SEOUL_BOUNDS
  const bounds = new maps.LatLngBounds()

  targetPoints.forEach(point => {
    bounds.extend(new maps.LatLng(point.lat, point.lng))
  })
  map.setBounds(bounds)

  if (targetPoints.length === 1) {
    map.setCenter(new maps.LatLng(targetPoints[0].lat, targetPoints[0].lng))
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
  previewedCommercialCode = null,
  onDistrictSelect,
  onAdministrationSelect,
  onCommercialSelect,
  onCommercialPreviewChange,
  onBackgroundClick,
  onViewportBoundsChange,
}: RecommendMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<KakaoMapInstance | null>(null)
  const mapsRef = useRef<KakaoMapsNamespace | null>(null)
  const clearLayersRef = useRef<() => void>(() => undefined)
  const resultLayersRef = useRef<ResultLayerVisualEntry[]>([])
  const resultLayerColorsRef = useRef({
    primary: '#3182f6',
    selected: '#2272eb',
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
  })
  const guardRef = useRef<BackgroundClickGuard | null>(null)
  const lastViewportBoundsKeyRef = useRef('')
  const fitPointsRef = useRef<readonly MapPoint[]>(SEOUL_BOUNDS)
  const [sdkStatus, setSdkStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [loadAttempt, setLoadAttempt] = useState(0)

  callbacksRef.current = {
    onBackgroundClick,
    onDistrictSelect,
    onAdministrationSelect,
    onCommercialSelect,
    onCommercialPreviewChange,
    onViewportBoundsChange,
  }
  selectedCommercialCodeRef.current = selectedCommercialCode
  previewedCommercialCodeRef.current = previewedCommercialCode
  layerInputRef.current = {
    stage,
    districtAreas,
    administrationAreas,
    commercialAreas,
    resultAreas,
    selectedDistrictCode,
    selectedAdministrationCode,
    previewedCommercialCode,
  }
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
  const fitPoints =
    getResultPoints(selectedResult) ??
    getAreaPoints(selectedAdministration) ??
    getAreaPoints(selectedDistrict) ??
    SEOUL_BOUNDS
  const fitPointsKey = JSON.stringify(fitPoints)
  const layerSemanticKey = createRecommendMapLayerSemanticKey(
    layerInputRef.current,
  )
  fitPointsRef.current = fitPoints

  useEffect(() => {
    let cancelled = false
    let mapClickHandler: (() => void) | null = null
    let mapIdleHandler: (() => void) | null = null
    let viewportTimer: ReturnType<typeof setTimeout> | null = null

    setSdkStatus('loading')
    loadKakaoMapSdk(env.kakaoMapApiKey)
      .then(maps => {
        if (cancelled || !containerRef.current) return

        mapsRef.current = maps
        const map =
          mapRef.current ??
          new maps.Map(containerRef.current, {
            center: new maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
            level: 8,
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
      setMapBounds(maps, map, fitPointsRef.current)
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
      handler: () => void
    }> = []
    const domCleanups: Array<() => void> = []
    const resultLayerEntries: ResultLayerVisualEntry[] = []
    const selectedColor = readColorToken('--color-primary-600', '#2272eb')
    const primaryColor = readColorToken('--color-primary-500', '#3182f6')
    const neutralStroke = readColorToken('--color-border-300', '#d1d6db')
    const neutralFill = readColorToken('--color-surface-muted', '#f2f4f6')

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
    }: {
      points: readonly MapPoint[]
      zIndex: number
      strokeColor: string
      strokeWeight: number
      fillColor: string
      fillOpacity: number
      onClick?: () => void
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
        clickable: Boolean(onClick),
      })
      polygon.setZIndex(zIndex)
      polygons.push(polygon)

      if (onClick) {
        const handler = () => {
          suppressBackground()
          onClick()
        }
        maps.event.addListener(polygon, 'click', handler)
        kakaoListeners.push({ target: polygon, handler })
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

    if (layerInput.stage === 'district') {
      layerInput.districtAreas.forEach((area, index) => {
        const selected = area.areaCode === layerInput.selectedDistrictCode
        drawPolygon({
          points: normalizeBoundary(area.boundaryCoords),
          zIndex: selected ? 100 : index + 10,
          strokeColor: selected ? selectedColor : neutralStroke,
          strokeWeight: selected ? 3 : 1,
          fillColor: selected ? primaryColor : neutralFill,
          fillOpacity: selected ? 0.24 : 0.34,
          onClick: () => callbacksRef.current.onDistrictSelect(area.areaCode),
        })
      })
    }

    if (layerInput.stage === 'administration') {
      drawContextArea(
        layerInput.districtAreas.find(
          area => area.areaCode === layerInput.selectedDistrictCode,
        ),
      )
      layerInput.administrationAreas.forEach((area, index) => {
        const selected = area.areaCode === layerInput.selectedAdministrationCode
        drawPolygon({
          points: normalizeBoundary(area.boundaryCoords),
          zIndex: selected ? 100 : index + 10,
          strokeColor: selected ? selectedColor : neutralStroke,
          strokeWeight: selected ? 3 : 1,
          fillColor: selected ? primaryColor : neutralFill,
          fillOpacity: selected ? 0.24 : 0.3,
          onClick: () =>
            callbacksRef.current.onAdministrationSelect(area.areaCode),
        })
      })
    }

    if (layerInput.stage === 'commercial') {
      drawContextArea(
        layerInput.administrationAreas.find(
          area => area.areaCode === layerInput.selectedAdministrationCode,
        ),
      )
      layerInput.commercialAreas.forEach((area, index) => {
        const previewed = area.areaCode === layerInput.previewedCommercialCode
        drawPolygon({
          points: normalizeBoundary(area.boundaryCoords),
          zIndex: previewed ? 100 : index + 10,
          strokeColor: previewed ? selectedColor : neutralStroke,
          strokeWeight: previewed ? 3 : 1,
          fillColor: previewed ? primaryColor : neutralFill,
          fillOpacity: previewed ? 0.24 : 0.3,
          onClick: () =>
            callbacksRef.current.onCommercialPreviewChange?.(area.areaCode),
        })
      })
    }

    if (layerInput.stage === 'results') {
      drawContextArea(
        layerInput.administrationAreas.find(
          area => area.areaCode === layerInput.selectedAdministrationCode,
        ),
        getResultContextPolygonStyle(selectedColor),
      )
      const orderedResults = getResultDrawingOrder(
        layerInput.resultAreas,
        null,
        null,
      )

      orderedResults.forEach((area, index) => {
        const polygon = drawPolygon({
          points: normalizeBoundary(area.boundaryCoords),
          zIndex: index + 10,
          strokeColor: primaryColor,
          strokeWeight: 1,
          fillColor: primaryColor,
          fillOpacity: getScoreFillOpacity(area.compositeScore, area.rank),
          onClick: () =>
            callbacksRef.current.onCommercialSelect(area.commercialCode),
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
      resultLayerColorsRef.current = {
        primary: primaryColor,
        selected: selectedColor,
      }
      updateResultLayerPreviewVisuals(
        resultLayerEntries,
        selectedCommercialCodeRef.current,
        previewedCommercialCodeRef.current,
        primaryColor,
        selectedColor,
      )
    } else {
      resultLayersRef.current = []
    }

    const clearLayers = () => {
      kakaoListeners.forEach(({ target, handler }) => {
        maps.event.removeListener(target, 'click', handler)
      })
      domCleanups.forEach(cleanup => cleanup())
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

  useEffect(() => {
    const maps = mapsRef.current
    const map = mapRef.current
    if (sdkStatus === 'ready' && maps && map) {
      setMapBounds(maps, map, fitPointsRef.current)
    }
  }, [fitPointsKey, sdkStatus])

  useEffect(() => {
    const colors = resultLayerColorsRef.current
    updateResultLayerPreviewVisuals(
      resultLayersRef.current,
      selectedCommercialCode,
      previewedCommercialCode,
      colors.primary,
      colors.selected,
    )
  }, [previewedCommercialCode, selectedCommercialCode])

  const recenter = () => {
    const maps = mapsRef.current
    const map = mapRef.current
    if (maps && map) setMapBounds(maps, map, fitPointsRef.current)
  }

  return (
    <MapRegion aria-label="상권 추천 지도" role="region">
      <MapCanvas ref={containerRef} data-recommend-map-container="true" />
      <Badge>추천 범위 고정</Badge>
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
            description="잠시 후 다시 시도해 주세요."
            actionLabel="다시 시도"
            onAction={() => setLoadAttempt(attempt => attempt + 1)}
          />
        </FeedbackLayer>
      ) : null}
    </MapRegion>
  )
}
