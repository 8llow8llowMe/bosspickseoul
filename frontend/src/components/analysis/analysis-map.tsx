'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import styled from 'styled-components'

import { Button } from '@/components/ui/button'
import { env } from '@/lib/env'
import { loadKakaoMapSdk } from '@/lib/kakao-map'
import { resolveMapLayerByZoom, type MapLayer } from '@/lib/analysis/map-layer'
import {
  createCameraBounds,
  createMapCamera,
  MAP_IDLE_DEBOUNCE_MS,
  quantizeBoundsOutward,
  SEOUL_DEFAULT_CAMERA,
  shouldApplyUrlCamera,
  type MapCamera,
} from '@/lib/analysis/map-camera'
import {
  drawAreaPolygonLayer,
  type AreaPolygonLayerHandle,
} from '@/lib/map/draw-area-polygon-layer'
import {
  createBounds,
  normalizeBoundary,
  normalizeViewportBounds,
} from '@/lib/map/geometry'
import type { AnalysisStep } from '@/lib/analysis/selection'
import type { AreaBoundaryItem, GeoBounds } from '@/types/recommend'

/** 지도가 정지(`idle`)했을 때 한 커밋에 올라가는 카메라 파생 3종. */
export type CameraSettle = {
  /** 양자화된 카메라(URL 정본이 될 값) */
  camera: MapCamera
  /** 외향 양자화된 조회 bounds */
  bounds: GeoBounds
  /** `resolveMapLayerByZoom(level)` 결과 */
  layer: MapLayer
}

/**
 * 지도 이동 요청. `code`(영역 코드) 또는 `center`(명시 좌표) 중 하나로 목표를 지정한다.
 * `center` 는 `c` 없는 결과 URL 의 폴백(상권 profile 중심)에 쓰인다.
 */
export type MapFitRequest = {
  seq: number
  level: number
  code?: string
  center?: { lat: number; lng: number }
}

export type AnalysisMapProps = {
  activeStep: AnalysisStep
  areas: readonly AreaBoundaryItem[]
  selectedCode: string | null
  previewedCode: string | null
  onSelect: (code: string) => void
  onPreviewChange: (code: string | null) => void
  /**
   * 지도 정지 시 카메라·bounds·레이어를 **한 번에** 올린다. 세 값이 같은 타이머에서
   * 나오는데 콜백이 갈리면 렌더가 두 번 일어난다(map-shell.md D4-2).
   */
  onCameraSettle: (settle: CameraSettle) => void
  /** 지도 생성 시 1회만 쓰는 초기 카메라. 이후 변경은 `camera` 로 적용된다. */
  initialCamera?: MapCamera | null
  /**
   * URL 이 들고 있는 카메라. 지도가 emit 한 값이 되돌아온 **에코**면 적용하지 않고,
   * 뒤로가기처럼 실제로 다른 카메라일 때만 `setCenter`/`setLevel` 한다.
   */
  camera?: MapCamera | null
  fitTo?: MapFitRequest | null
}

// 레이어 재생성을 결정하는 구조적 입력만 포함한다. previewedCode(호버)는
// 레이어를 다시 그리지 않고 setHighlight로 증분 갱신하므로 키에서 제외한다.
type AnalysisMapLayerInput = Pick<
  AnalysisMapProps,
  'activeStep' | 'areas' | 'selectedCode'
>

const Root = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  background: var(--color-surface-muted);

  .analysis-map-label {
    min-width: 44px;
    min-height: 34px;
    border: 1px solid var(--color-border-300);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: var(--shadow-level-2);
    color: var(--color-text-800);
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  .analysis-map-label[data-selected='true'],
  .analysis-map-label:focus-visible,
  .analysis-map-label:hover {
    border-color: var(--color-primary-600);
    background: var(--color-primary-700);
    color: #fff;
    outline: none;
  }
`

const Canvas = styled.div`
  width: 100%;
  height: 100%;
`

const Status = styled.div`
  position: absolute;
  z-index: 5;
  inset: 0;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  padding: 24px;
  text-align: center;
`

const StatusContent = styled.div`
  display: grid;
  justify-items: center;
  gap: 12px;
  color: var(--color-text-700);
  font-size: 14px;
  line-height: 22px;
`

const getColorToken = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
    ? getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    : fallback
}

export const createAnalysisMapLayerKey = ({
  activeStep,
  areas,
  selectedCode,
}: AnalysisMapLayerInput): string =>
  JSON.stringify({
    activeStep,
    selectedCode,
    areas: [...areas]
      .sort((a, b) => String(a.areaCode).localeCompare(String(b.areaCode)))
      .map(area => ({
        code: String(area.areaCode),
        center: [area.centerLng, area.centerLat],
        boundary: area.boundaryCoords,
      })),
  })

const readViewportBounds = (map: KakaoMapInstance): GeoBounds | null => {
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

export default function AnalysisMap({
  activeStep,
  areas,
  selectedCode,
  previewedCode,
  onSelect,
  onPreviewChange,
  onCameraSettle,
  initialCamera,
  camera,
  fitTo,
}: AnalysisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<KakaoMapInstance | null>(null)
  const mapsRef = useRef<KakaoMapsNamespace | null>(null)
  const clearLayersRef = useRef<() => void>(() => undefined)
  const areasRef = useRef(areas)
  // 호버 하이라이트를 레이어 재생성 없이 증분 적용하기 위한 핸들/라벨 참조.
  const layerHandleRef = useRef<AreaPolygonLayerHandle | null>(null)
  const labelByCodeRef = useRef<
    Map<string, { overlay: KakaoMapCustomOverlay; baseZIndex: number }>
  >(new Map())
  // 무거운 그리기 이펙트가 최신 previewedCode를 dep 없이 seed 할 수 있게 보관.
  const previewedCodeRef = useRef(previewedCode)
  const callbacksRef = useRef({ onSelect, onPreviewChange, onCameraSettle })
  // 지도 생성은 1회뿐이므로 초기 카메라는 최신 prop 이 아니라 "마운트 시점 값"이어야
  // 한다. ref 에 담아 SDK 로딩 이펙트가 dep 없이 읽는다.
  const initialCameraRef = useRef(initialCamera ?? SEOUL_DEFAULT_CAMERA)
  /**
   * 피드백 루프 방어선(map-shell.md D4-2 / D6). 지도가 마지막으로 emit 한 카메라를
   * 기억해, 그 값이 URL 을 돌아 `camera` prop 으로 되돌아온 **에코**에는
   * `setCenter`/`setLevel` 을 하지 않는다. 이 가드가 없으면
   * `replace` → 리렌더 → `setCenter` → `idle` → `replace` 로 무한 진동한다.
   */
  const lastEmittedCameraRef = useRef<MapCamera | null>(null)
  const [sdkStatus, setSdkStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [loadAttempt, setLoadAttempt] = useState(0)
  const layerKey = createAnalysisMapLayerKey({
    activeStep,
    areas,
    selectedCode,
  })

  useEffect(() => {
    callbacksRef.current = { onSelect, onPreviewChange, onCameraSettle }
  }, [onCameraSettle, onPreviewChange, onSelect])

  // 그리기 이펙트보다 먼저 선언해, 레이어 재생성 시 최신 hover 값을 seed 하도록 한다.
  useEffect(() => {
    previewedCodeRef.current = previewedCode
  }, [previewedCode])

  useEffect(() => {
    areasRef.current = areas
  }, [areas])

  useEffect(() => {
    let cancelled = false
    let idleHandler: (() => void) | null = null
    let viewportTimer: ReturnType<typeof setTimeout> | null = null

    loadKakaoMapSdk(env.kakaoJavascriptKey)
      .then(maps => {
        if (cancelled || !containerRef.current) return

        const startCamera = initialCameraRef.current
        const map =
          mapRef.current ??
          new maps.Map(containerRef.current, {
            center: new maps.LatLng(startCamera.lat, startCamera.lng),
            level: startCamera.level,
          })
        mapsRef.current = maps
        mapRef.current = map

        // `idle` 만 구독한다. `center_changed` 는 드래그 중 프레임마다 오므로
        // 제스처 종료 신호인 `idle` + 250ms 디바운스가 옳다(map-shell.md D4-2).
        idleHandler = () => {
          if (viewportTimer) clearTimeout(viewportTimer)
          viewportTimer = setTimeout(() => {
            const center = map.getCenter()
            const level = map.getLevel()
            const settledCamera = createMapCamera(
              center.getLat(),
              center.getLng(),
              level,
            )
            const viewport = readViewportBounds(map)

            lastEmittedCameraRef.current = settledCamera
            callbacksRef.current.onCameraSettle({
              camera: settledCamera,
              bounds: viewport
                ? quantizeBoundsOutward(viewport)
                : createCameraBounds(settledCamera),
              layer: resolveMapLayerByZoom(level),
            })
          }, MAP_IDLE_DEBOUNCE_MS)
        }
        maps.event.addListener(map, 'idle', idleHandler)
        setSdkStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setSdkStatus('error')
      })

    return () => {
      cancelled = true
      if (viewportTimer) clearTimeout(viewportTimer)
      if (idleHandler && mapsRef.current && mapRef.current) {
        mapsRef.current.event.removeListener(
          mapRef.current,
          'idle',
          idleHandler,
        )
      }
    }
  }, [loadAttempt])

  useEffect(() => {
    clearLayersRef.current()

    const maps = mapsRef.current
    const map = mapRef.current
    if (sdkStatus !== 'ready' || !maps || !map) return

    const overlays: KakaoMapCustomOverlay[] = []
    const cleanups: Array<() => void> = []

    const polygonTokens = {
      baseStroke: getColorToken('--color-primary-600', '#2272eb'),
      activeStroke: getColorToken('--color-primary-600', '#2272eb'),
      fill: getColorToken('--color-primary-600', '#2272eb'),
    }

    const layerHandle = drawAreaPolygonLayer({
      map,
      maps,
      areas,
      selectedCode,
      hoveredCode: previewedCodeRef.current,
      onSelect: code => callbacksRef.current.onSelect(code),
      onHoverChange: code => callbacksRef.current.onPreviewChange(code),
      tokens: polygonTokens,
      fitToSelected: false,
    })
    layerHandleRef.current = layerHandle

    const labelByCode = new Map<
      string,
      { overlay: KakaoMapCustomOverlay; baseZIndex: number }
    >()

    areas.forEach((area, index) => {
      const code = String(area.areaCode)
      const selected = code === selectedCode
      const previewed = code === previewedCodeRef.current
      const highlighted = selected || previewed

      const center = normalizeBoundary([[area.centerLng, area.centerLat]])[0]
      if (!center) return

      const marker = document.createElement('button')
      marker.type = 'button'
      marker.className = 'analysis-map-label'
      marker.textContent = area.areaName
      marker.dataset.selected = String(selected)
      marker.setAttribute('aria-pressed', String(selected))
      marker.setAttribute('aria-label', `${area.areaName} 선택`)

      const choose = (event: Event) => {
        event.stopPropagation()
        callbacksRef.current.onSelect(code)
      }
      const preview = () => callbacksRef.current.onPreviewChange(code)
      const clearPreview = () => callbacksRef.current.onPreviewChange(null)
      marker.addEventListener('click', choose)
      marker.addEventListener('focus', preview)
      marker.addEventListener('pointerenter', preview)
      marker.addEventListener('blur', clearPreview)
      marker.addEventListener('pointerleave', clearPreview)
      cleanups.push(() => {
        marker.removeEventListener('click', choose)
        marker.removeEventListener('focus', preview)
        marker.removeEventListener('pointerenter', preview)
        marker.removeEventListener('blur', clearPreview)
        marker.removeEventListener('pointerleave', clearPreview)
      })

      const baseZIndex = index + 100
      const overlay = new maps.CustomOverlay({
        map,
        position: new maps.LatLng(center.lat, center.lng),
        content: marker,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: highlighted ? 200 : baseZIndex,
        clickable: true,
      })
      overlays.push(overlay)
      labelByCode.set(code, { overlay, baseZIndex })
    })

    labelByCodeRef.current = labelByCode

    const clearLayers = () => {
      layerHandle.cleanup()
      cleanups.forEach(cleanup => cleanup())
      overlays.forEach(overlay => overlay.setMap(null))
      layerHandleRef.current = null
      labelByCodeRef.current = new Map()
    }
    clearLayersRef.current = clearLayers

    return clearLayers
  }, [areas, layerKey, sdkStatus, selectedCode])

  // 호버(previewedCode)·선택 하이라이트를 레이어 재생성 없이 증분 적용한다.
  // 이 이펙트가 매 호버마다 25개 폴리곤을 다시 그리던 비용을 O(변경분)으로 낮춘다.
  useEffect(() => {
    layerHandleRef.current?.setHighlight({
      selectedCode,
      hoveredCode: previewedCode,
    })
    labelByCodeRef.current.forEach(({ overlay, baseZIndex }, code) => {
      const raised = code === selectedCode || code === previewedCode
      overlay.setZIndex(raised ? 200 : baseZIndex)
    })
  }, [previewedCode, selectedCode])

  // `sdkStatus` 를 의존성에 넣는 이유: 지도가 준비되기 **전에** 들어온 fit 요청(SDK
  // 로딩 실패 후 재시도 등)이 그대로 유실되지 않고, 지도가 생기는 커밋에서 한 번 더
  // 적용되게 한다.
  useEffect(() => {
    const maps = mapsRef.current
    const map = mapRef.current
    if (sdkStatus !== 'ready' || !maps || !map || !fitTo) return

    // 명시 좌표 요청(예: `c` 없는 결과 URL 의 상권 profile 중심)이 우선한다.
    if (fitTo.center) {
      map.setCenter(new maps.LatLng(fitTo.center.lat, fitTo.center.lng))
      map.setLevel(fitTo.level)
      return
    }

    const area = areasRef.current.find(a => String(a.areaCode) === fitTo.code)
    if (!area) return
    const bounds = createBounds(normalizeBoundary(area.boundaryCoords))
    if (!bounds) return
    // 클릭 영역 중심으로 이동 + 자식 레이어가 보이는 줌 레벨로 확실히 진입
    const centerLat = (bounds.latSW + bounds.latNE) / 2
    const centerLng = (bounds.lngSW + bounds.lngNE) / 2
    map.setCenter(new maps.LatLng(centerLat, centerLng))
    map.setLevel(fitTo.level)
  }, [fitTo, sdkStatus])

  /**
   * URL → 지도 방향. **에코 가드**를 통과할 때만 적용한다(map-shell.md D4-2).
   * 실질적으로 걸리는 경우는 뒤로가기·다른 카메라를 가진 링크로의 소프트 내비게이션뿐이다.
   */
  useEffect(() => {
    const maps = mapsRef.current
    const map = mapRef.current
    if (sdkStatus !== 'ready' || !maps || !map || !camera) return
    if (!shouldApplyUrlCamera(camera, lastEmittedCameraRef.current)) return

    lastEmittedCameraRef.current = camera
    map.setCenter(new maps.LatLng(camera.lat, camera.lng))
    map.setLevel(camera.level)
  }, [camera, sdkStatus])

  return (
    <Root aria-label="분석 지역 지도">
      <Canvas ref={containerRef} data-kakao-map="true" />
      {sdkStatus === 'loading' ? (
        <Status role="status">
          <StatusContent>지도를 준비하고 있어요</StatusContent>
        </Status>
      ) : null}
      {sdkStatus === 'error' ? (
        <Status role="alert">
          <StatusContent>
            <span>
              지도를 불러오지 못했어요. 목록에서 계속 선택할 수 있어요.
            </span>
            <Button
              size="medium"
              variant="secondary"
              leftIcon={<RotateCcw aria-hidden />}
              onClick={() => {
                setSdkStatus('loading')
                setLoadAttempt(attempt => attempt + 1)
              }}
            >
              지도 다시 불러오기
            </Button>
          </StatusContent>
        </Status>
      ) : null}
    </Root>
  )
}
