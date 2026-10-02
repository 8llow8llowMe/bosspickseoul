'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import styled, { css, keyframes } from 'styled-components'
import { districts } from '@/data/districts'
import { TOP_DISTRICT_CODES } from '@/data/district-metrics'
import {
  SEOUL_STATUS_FEATURES,
  SEOUL_STATUS_VIEW_BOX,
} from '@/data/seoul-status-map'
import { toDistrictRhythm } from '@/components/home/district-rhythm'
import DistrictTooltip, {
  TOOLTIP_WIDTH,
  districtTooltipHeight,
  type DistrictTooltipState,
} from '@/components/home/district-tooltip'
import { clampTooltipPosition } from '@/components/home/tooltip-geometry'
import { useDistrictDetail } from '@/hooks/use-district-detail'
import { trackEvent } from '@/lib/analytics/events'

const districtNameByCode = new Map(
  districts.map(district => [String(district.gooCode), district.gooName]),
)

const viewBoxNumbers = SEOUL_STATUS_VIEW_BOX.split(' ').map(Number)
const VIEW_BOX_SIZE = {
  width: viewBoxNumbers[viewBoxNumbers.length - 2],
  height: viewBoxNumbers[viewBoxNumbers.length - 1],
}

const TOOLTIP_PADDING = 12

/**
 * hover 가 이만큼 머문 구만 상세를 받는다 — 지도를 가로지를 때 지나간 구마다 요청하지 않는다
 * (full-screen-sections-and-live-tooltip.md D4-4). 이미 받은 구는 기다리지 않고 캐시로 뜬다.
 */
const DETAIL_HOVER_DELAY_MS = 120

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`

// 히어로(hero-section.tsx)가 이 컴포넌트의 유일한 사용처이며, 데스크톱에서는
// 뷰포트 높이(100dvh - 헤더높이)에 맞춰 지도를 스케일해 25개 자치구 폴리곤이
// 모두 한 화면에 보이게 한다. Wrapper/MapSvg를 height: 100%로 두면 SVG의 기본
// preserveAspectRatio="xMidYMid meet"이 가로/세로 중 더 제약이 큰 쪽에 맞춰
// 축소하며 중앙 정렬한다(모바일처럼 상위 컨테이너 높이가 부정형이면 퍼센트
// 높이가 auto로 풀려 기존과 동일하게 폭 기준으로 자연스러운 높이를 갖는다).
const MapSvg = styled.svg`
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  /* 자치구 폴리곤/툴팁 제목 등 지도 내 텍스트가 드래그로 선택되지 않게 한다 */
  -webkit-user-select: none;
  user-select: none;
`

const topPulse = keyframes`
  0%, 100% {
    fill: var(--color-primary-100);
  }
  50% {
    fill: color-mix(in srgb, var(--color-primary-700) 22%, var(--color-surface-muted));
  }
`

const DistrictPath = styled.path<{
  $index: number
  $appear: boolean
  $isTop: boolean
}>`
  fill: var(--color-surface-muted);
  stroke: var(--color-border-200);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
  cursor: pointer;
  opacity: ${p => (p.$appear ? 1 : 0)};
  transition:
    opacity var(--motion-standard) var(--ease-standard) ${p => p.$index * 24}ms,
    fill var(--motion-slow) var(--ease-standard);
  animation: ${p =>
    p.$isTop
      ? css`
          ${topPulse} 2.4s var(--ease-standard) infinite
        `
      : 'none'};

  &:hover {
    fill: var(--color-primary-700);
    transition: fill var(--motion-fast) var(--ease-standard);
    animation: none;
  }

  /* 마우스 pointer-down(:focus) 시 브라우저 기본 파란 아웃라인 제거 */
  &:focus {
    outline: none;
  }

  &:active {
    outline: none;
  }

  /* 키보드 탐색(:focus-visible)만 fill 강조로 표시(아웃라인 없음) */
  &:focus-visible {
    outline: none;
    fill: var(--color-primary-700);
    animation: none;
  }

  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
    animation: none;
    transition: none;

    &:hover {
      transition: none;
    }
  }
`

const TooltipGroup = styled.g`
  pointer-events: none;
`

type SeoulDistrictsMapProps = {
  onHoverChange?: (districtCode: string | null) => void
}

export default function SeoulDistrictsMap({
  onHoverChange,
}: SeoulDistrictsMapProps = {}) {
  const router = useRouter()
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)
  const [settledCode, setSettledCode] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const hoveredFeature = SEOUL_STATUS_FEATURES.find(
    feature => feature.districtCode === hoveredCode,
  )
  const hoveredName = hoveredFeature
    ? districtNameByCode.get(hoveredFeature.districtCode)
    : undefined

  /*
    지도 호버 계측은 페이지당 1회다. 머무름 지연을 넘겨 툴팁이 실데이터를 부르는 순간만 센다 —
    지도를 스쳐 지나간 마우스는 「발견했다」가 아니다(measurement-and-deep-link.md D2).
  */
  const hoverTrackedRef = useRef(false)

  useEffect(() => {
    if (hoveredCode === null) return
    const timer = window.setTimeout(() => {
      setSettledCode(hoveredCode)
      if (!hoverTrackedRef.current) {
        hoverTrackedRef.current = true
        trackEvent('home_map_hover', { district_code: hoveredCode })
      }
    }, DETAIL_HOVER_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [hoveredCode])

  const detail = useDistrictDetail(
    hoveredCode,
    hoveredCode !== null && settledCode === hoveredCode,
  )
  const rhythm = useMemo(
    () => (detail.data ? toDistrictRhythm(detail.data) : null),
    [detail.data],
  )
  const tooltipState: DistrictTooltipState = rhythm
    ? { status: 'ready', rhythm }
    : detail.isError
      ? { status: 'error' }
      : { status: 'loading' }
  const tooltipPosition = hoveredFeature
    ? clampTooltipPosition(
        hoveredFeature.center,
        { width: TOOLTIP_WIDTH, height: districtTooltipHeight(tooltipState) },
        VIEW_BOX_SIZE,
        TOOLTIP_PADDING,
      )
    : null

  const goToAnalysis = (districtCode: string) => {
    trackEvent('home_map_click', { district_code: districtCode })
    router.push(`/analysis?districtCode=${districtCode}`)
  }

  const handleKeyDown = (
    event: KeyboardEvent<SVGPathElement>,
    districtCode: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      goToAnalysis(districtCode)
    }
  }

  return (
    <Wrapper>
      <MapSvg
        viewBox={SEOUL_STATUS_VIEW_BOX}
        preserveAspectRatio="xMidYMid meet"
      >
        {SEOUL_STATUS_FEATURES.map((feature, index) => {
          const name = districtNameByCode.get(feature.districtCode)
          return (
            <DistrictPath
              key={feature.districtCode}
              d={feature.path}
              role="link"
              tabIndex={0}
              aria-label={name || '자치구'}
              $index={index}
              $appear={mounted}
              $isTop={(TOP_DISTRICT_CODES as readonly string[]).includes(
                feature.districtCode,
              )}
              onMouseEnter={() => {
                setHoveredCode(feature.districtCode)
                onHoverChange?.(feature.districtCode)
              }}
              onMouseLeave={() => {
                if (hoveredCode === feature.districtCode) {
                  setHoveredCode(null)
                  onHoverChange?.(null)
                }
              }}
              onFocus={() => {
                setHoveredCode(feature.districtCode)
                onHoverChange?.(feature.districtCode)
              }}
              onBlur={() => {
                if (hoveredCode === feature.districtCode) {
                  setHoveredCode(null)
                  onHoverChange?.(null)
                }
              }}
              onClick={() => goToAnalysis(feature.districtCode)}
              onKeyDown={event => handleKeyDown(event, feature.districtCode)}
            />
          )
        })}
        {hoveredFeature && tooltipPosition ? (
          <TooltipGroup>
            <DistrictTooltip
              x={tooltipPosition.x}
              y={tooltipPosition.y}
              name={hoveredName ?? '자치구'}
              state={tooltipState}
            />
          </TooltipGroup>
        ) : null}
      </MapSvg>
    </Wrapper>
  )
}
