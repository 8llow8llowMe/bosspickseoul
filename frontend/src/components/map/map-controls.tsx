'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LoaderCircle, LocateFixed } from 'lucide-react'
import styled, { css, keyframes } from 'styled-components'

import { useToast } from '@/components/ui/toast'
import {
  CURRENT_LOCATION_LEVEL,
  CURRENT_LOCATION_MAX_AGE_MS,
  CURRENT_LOCATION_TIMEOUT_MS,
  CURRENT_LOCATION_WATCHDOG_MS,
  describeGeolocationError,
  OUTSIDE_SEOUL_MESSAGE,
  resolveCurrentLocation,
  type GeoPoint,
} from '@/lib/map/current-location'

/**
 * 카카오 지도 위 보조 조작 묶음(상권추천·상권분석 공용).
 *
 * 자리는 **우측 상단**이다. 두 화면 모두 모바일에서 바텀시트가 아래를 덮으므로 우측
 * 하단에 두면 시트에 가려진다. 상단 가운데는 상권분석의 안내 문구(MapNotice) 자리라 비켜 선다.
 */
export const MapControlStack = styled.div`
  position: absolute;
  /* 지도 로딩·오류 베일(상권분석 z-index 5)보다 아래라, 지도가 없을 때 잠긴 버튼이 떠 보이지 않는다. */
  z-index: 4;
  top: 12px;
  right: 12px;
  display: grid;
  gap: 8px;
`

/** 지도 위 floating action. DESIGN.md §지도: 필터 박스·요약 카드와 radius·shadow 를 공유한다. */
export const MapControlButton = styled.button`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-800);
  box-shadow: var(--shadow-level-2);
  cursor: pointer;
  transition:
    color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard);

  svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
  }

  &:hover:not(:disabled) {
    border-color: var(--color-primary-600);
    color: var(--color-text-primary-on-light);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &[aria-busy='true'] {
    cursor: progress;
  }

  &[data-active='true'] {
    color: var(--color-text-primary-on-light);
  }
`

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

const Spinner = styled(LoaderCircle)`
  animation: ${spin} 900ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const pulse = keyframes`
  from {
    opacity: 0.5;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(2.6);
  }
`

/**
 * 내 위치 점의 스타일. 점은 카카오 CustomOverlay 로 지도 DOM 안에 들어가므로
 * styled 컴포넌트가 아니라 **지도를 감싼 조상**이 이 조각을 섞어 클래스로 칠한다.
 *
 * 색은 폴리곤과 같은 primary-600 이다 — 「지도 한 화면에 파랑을 둘 이상 두지 않는다」
 * (DESIGN.md §영역 폴리곤). 흰 테두리와 그림자로 폴리곤 채움 위에서도 떨어져 보인다.
 */
export const currentLocationMarkerStyles = css`
  & .map-current-location {
    position: relative;
    width: 18px;
    height: 18px;
    border: 3px solid var(--color-surface, #fff);
    border-radius: 50%;
    background: var(--color-primary-600, #2272eb);
    box-shadow: var(--shadow-level-3);
    pointer-events: none;
  }

  & .map-current-location::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: var(--color-primary-600, #2272eb);
    animation: ${pulse} 1.8s var(--ease-standard, ease-out) infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    & .map-current-location::after {
      animation: none;
      opacity: 0;
    }
  }
`

export type MapHandle = {
  maps: KakaoMapsNamespace
  map: KakaoMapInstance
}

type CurrentLocationControlProps = {
  /** 지도가 준비됐는지. 준비 전에는 옮길 카메라가 없어 버튼을 잠근다. */
  ready: boolean
  /** 지도 인스턴스는 ref 에 산다 — 렌더 중이 아니라 클릭·이펙트 때 꺼내 쓴다. */
  getMap: () => MapHandle | null
}

type LocationState = 'idle' | 'locating' | 'located'

/**
 * 「내 위치」 버튼 + 지도 위 내 위치 점.
 *
 * - 위치는 **누를 때만** 묻는다. 페이지를 열자마자 권한 창을 띄우지 않는다.
 * - 서울 밖이면 카메라를 옮기지 않고 이유를 토스트로 알린다(데이터가 서울뿐이다).
 * - 실패(권한 거부·시간 초과)도 토스트로 알리고 버튼은 다시 누를 수 있게 둔다.
 */
export function CurrentLocationControl({
  ready,
  getMap,
}: CurrentLocationControlProps) {
  const { showToast } = useToast()
  const [state, setState] = useState<LocationState>('idle')
  const overlayRef = useRef<KakaoMapCustomOverlay | null>(null)
  /** 응답이 오기 전에 언마운트되면 지도에 점을 그리지 않는다. */
  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (watchdogRef.current) clearTimeout(watchdogRef.current)
      overlayRef.current?.setMap(null)
      overlayRef.current = null
    }
  }, [])

  const placeMarker = ({ maps, map }: MapHandle, point: GeoPoint) => {
    overlayRef.current?.setMap(null)
    const dot = document.createElement('div')
    dot.className = 'map-current-location'
    dot.setAttribute('aria-hidden', 'true')
    overlayRef.current = new maps.CustomOverlay({
      map,
      position: new maps.LatLng(point.lat, point.lng),
      content: dot,
      xAnchor: 0.5,
      yAnchor: 0.5,
      // 순위 마커(100+)보다 아래, 폴리곤보다 위. 점이 마커를 가리면 마커를 못 누른다.
      zIndex: 50,
    })
  }

  const finishRequest = () => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current)
    watchdogRef.current = null
  }

  const locate = () => {
    if (state === 'locating') return

    const geolocation =
      typeof navigator === 'undefined' ? undefined : navigator.geolocation
    if (!geolocation) {
      showToast({
        message: describeGeolocationError(null),
        tone: 'error',
        dedupeKey: 'map-current-location',
      })
      return
    }

    // 요청마다 번호를 매긴다. 워치독이 먼저 풀어 준 뒤에 늦게 온 응답은 버린다.
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    const isCurrent = () =>
      mountedRef.current && requestId === requestIdRef.current
    const settle = () => setState(overlayRef.current ? 'located' : 'idle')

    setState('locating')
    finishRequest()
    watchdogRef.current = setTimeout(() => {
      if (!isCurrent()) return
      requestIdRef.current += 1
      watchdogRef.current = null
      settle()
    }, CURRENT_LOCATION_WATCHDOG_MS)

    geolocation.getCurrentPosition(
      async position => {
        if (!isCurrent()) return
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        // 서울 경계 데이터는 무거워 누른 뒤에만 불러온다(지도 화면 번들에 싣지 않는다).
        const { isInSeoul } = await import('@/lib/map/seoul-boundary')
        if (!isCurrent()) return
        finishRequest()

        const outcome = resolveCurrentLocation(point, isInSeoul)
        const handle = getMap()
        if (outcome.kind === 'outside' || !handle) {
          settle()
          if (outcome.kind === 'outside') {
            showToast({
              message: OUTSIDE_SEOUL_MESSAGE,
              tone: 'info',
              dedupeKey: 'map-current-location',
            })
          }
          return
        }

        placeMarker(handle, outcome.point)
        handle.map.setLevel(
          Math.min(handle.map.getLevel(), CURRENT_LOCATION_LEVEL),
        )
        handle.map.setCenter(
          new handle.maps.LatLng(outcome.point.lat, outcome.point.lng),
        )
        setState('located')
      },
      error => {
        if (!isCurrent()) return
        finishRequest()
        settle()
        showToast({
          message: describeGeolocationError(error.code),
          tone: 'error',
          dedupeKey: 'map-current-location',
        })
      },
      {
        enableHighAccuracy: false,
        maximumAge: CURRENT_LOCATION_MAX_AGE_MS,
        timeout: CURRENT_LOCATION_TIMEOUT_MS,
      },
    )
  }

  const isLocating = state === 'locating'

  return (
    <MapControlButton
      type="button"
      aria-label={isLocating ? '현재 위치 찾는 중' : '내 위치로 이동'}
      aria-busy={isLocating || undefined}
      data-active={state === 'located' || undefined}
      disabled={!ready}
      title="내 위치로 이동"
      onClick={locate}
    >
      {isLocating ? <Spinner aria-hidden /> : <LocateFixed aria-hidden />}
    </MapControlButton>
  )
}

export function MapControlIconButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string
  icon: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <MapControlButton
      type="button"
      aria-label={label}
      disabled={disabled}
      title={label}
      onClick={onClick}
    >
      {icon}
    </MapControlButton>
  )
}
