'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import styled from 'styled-components'

import { Button } from '@/components/ui/button'
import { env } from '@/lib/env'
import { loadKakaoMapSdk } from '@/lib/kakao-map'
import {
  createBounds,
  normalizeBoundary,
  normalizeViewportBounds,
} from '@/lib/map/geometry'
import type { AnalysisStep } from '@/lib/analysis/selection'
import type { AreaBoundaryItem, GeoBounds } from '@/types/recommend'

export type AnalysisMapProps = {
  activeStep: AnalysisStep
  areas: readonly AreaBoundaryItem[]
  selectedCode: string | null
  previewedCode: string | null
  onSelect: (code: string) => void
  onPreviewChange: (code: string | null) => void
  onViewportBoundsChange: (bounds: GeoBounds) => void
}

type AnalysisMapLayerInput = Pick<
  AnalysisMapProps,
  'activeStep' | 'areas' | 'selectedCode' | 'previewedCode'
>

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }
const VIEWPORT_DEBOUNCE_MS = 250

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
  previewedCode,
}: AnalysisMapLayerInput): string =>
  JSON.stringify({
    activeStep,
    selectedCode,
    previewedCode,
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
  onViewportBoundsChange,
}: AnalysisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<KakaoMapInstance | null>(null)
  const mapsRef = useRef<KakaoMapsNamespace | null>(null)
  const clearLayersRef = useRef<() => void>(() => undefined)
  const callbacksRef = useRef({
    onSelect,
    onPreviewChange,
    onViewportBoundsChange,
  })
  const [sdkStatus, setSdkStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [loadAttempt, setLoadAttempt] = useState(0)
  const layerKey = createAnalysisMapLayerKey({
    activeStep,
    areas,
    selectedCode,
    previewedCode,
  })

  useEffect(() => {
    callbacksRef.current = {
      onSelect,
      onPreviewChange,
      onViewportBoundsChange,
    }
  }, [onPreviewChange, onSelect, onViewportBoundsChange])

  useEffect(() => {
    let cancelled = false
    let idleHandler: (() => void) | null = null
    let viewportTimer: ReturnType<typeof setTimeout> | null = null

    loadKakaoMapSdk(env.kakaoMapApiKey)
      .then(maps => {
        if (cancelled || !containerRef.current) return

        const map =
          mapRef.current ??
          new maps.Map(containerRef.current, {
            center: new maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
            level: 8,
          })
        mapsRef.current = maps
        mapRef.current = map

        idleHandler = () => {
          if (viewportTimer) clearTimeout(viewportTimer)
          viewportTimer = setTimeout(() => {
            const bounds = readViewportBounds(map)
            if (bounds) {
              callbacksRef.current.onViewportBoundsChange(bounds)
            }
          }, VIEWPORT_DEBOUNCE_MS)
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

    const polygons: KakaoMapPolygon[] = []
    const overlays: KakaoMapCustomOverlay[] = []
    const listeners: Array<{ target: object; handler: () => void }> = []
    const cleanups: Array<() => void> = []
    const primary = getColorToken('--color-primary-600', '#2272eb')
    const neutral = getColorToken('--color-border-300', '#b0b8c1')
    const fill = getColorToken('--color-primary-100', '#e8f3ff')

    areas.forEach((area, index) => {
      const code = String(area.areaCode)
      const points = normalizeBoundary(area.boundaryCoords)
      const selected = code === selectedCode
      const previewed = code === previewedCode
      const highlighted = selected || previewed

      if (points.length >= 3) {
        const polygon = new maps.Polygon({
          map,
          path: points.map(point => new maps.LatLng(point.lat, point.lng)),
          strokeWeight: highlighted ? 3 : 1,
          strokeColor: highlighted ? primary : neutral,
          strokeOpacity: 1,
          fillColor: highlighted ? primary : fill,
          fillOpacity: highlighted ? 0.24 : 0.3,
          clickable: true,
        })
        polygon.setZIndex(highlighted ? 100 : index + 1)
        const handler = () => callbacksRef.current.onSelect(code)
        maps.event.addListener(polygon, 'click', handler)
        polygons.push(polygon)
        listeners.push({ target: polygon, handler })
      }

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

      const overlay = new maps.CustomOverlay({
        map,
        position: new maps.LatLng(center.lat, center.lng),
        content: marker,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: highlighted ? 200 : index + 100,
        clickable: true,
      })
      overlays.push(overlay)
    })

    const selectedArea = areas.find(
      area => String(area.areaCode) === selectedCode,
    )
    if (selectedArea) {
      const points = normalizeBoundary(selectedArea.boundaryCoords)
      const bounds = createBounds(points)
      if (bounds) {
        const kakaoBounds = new maps.LatLngBounds()
        kakaoBounds.extend(new maps.LatLng(bounds.latSW, bounds.lngSW))
        kakaoBounds.extend(new maps.LatLng(bounds.latNE, bounds.lngNE))
        map.setBounds(kakaoBounds)
      } else {
        const center = normalizeBoundary([
          [selectedArea.centerLng, selectedArea.centerLat],
        ])[0]
        if (center) {
          map.setCenter(new maps.LatLng(center.lat, center.lng))
        }
      }
    }

    const clearLayers = () => {
      listeners.forEach(({ target, handler }) => {
        maps.event.removeListener(target, 'click', handler)
      })
      cleanups.forEach(cleanup => cleanup())
      polygons.forEach(polygon => polygon.setMap(null))
      overlays.forEach(overlay => overlay.setMap(null))
    }
    clearLayersRef.current = clearLayers

    return clearLayers
  }, [areas, layerKey, previewedCode, sdkStatus, selectedCode])

  return (
    <Root aria-label="분석 지역 지도">
      <Canvas ref={containerRef} />
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
