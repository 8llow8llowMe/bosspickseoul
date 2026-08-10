'use client'

import { useEffect, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import styled, { css, keyframes } from 'styled-components'
import { districts } from '@/data/districts'
import { getDistrictMetric, TOP_DISTRICT_CODES } from '@/data/district-metrics'
import {
  SEOUL_STATUS_FEATURES,
  SEOUL_STATUS_VIEW_BOX,
} from '@/data/seoul-status-map'
import { sparklinePath } from '@/components/home/sparkline'
import { clampTooltipPosition } from '@/components/home/tooltip-geometry'

const districtNameByCode = new Map(
  districts.map(district => [String(district.gooCode), district.gooName]),
)

const viewBoxNumbers = SEOUL_STATUS_VIEW_BOX.split(' ').map(Number)
const VIEW_BOX_SIZE = {
  width: viewBoxNumbers[viewBoxNumbers.length - 2],
  height: viewBoxNumbers[viewBoxNumbers.length - 1],
}

const TOOLTIP_SIZE = { width: 184, height: 96 }
const TOOLTIP_PADDING = 12
const SPARKLINE_WIDTH = 140
const SPARKLINE_HEIGHT = 28

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`

const MapSvg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  max-width: 100%;
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

const TooltipBackground = styled.rect`
  fill: var(--color-surface);
  stroke: var(--color-border-200);
  stroke-width: 1px;
`

const TooltipTitle = styled.text`
  fill: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
`

const TooltipMetric = styled.text`
  fill: var(--color-text-700);
  font-size: 12px;
  font-weight: 500;
`

const TooltipSparkline = styled.polyline`
  fill: none;
  stroke: var(--color-primary-700);
  stroke-width: 2px;
  stroke-linecap: round;
  stroke-linejoin: round;
`

type SeoulDistrictsMapProps = {
  onHoverChange?: (districtCode: string | null) => void
}

export default function SeoulDistrictsMap({
  onHoverChange,
}: SeoulDistrictsMapProps = {}) {
  const router = useRouter()
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)
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
  const hoveredMetric = hoveredFeature
    ? getDistrictMetric(hoveredFeature.districtCode)
    : undefined
  const tooltipPosition = hoveredFeature
    ? clampTooltipPosition(
        hoveredFeature.center,
        TOOLTIP_SIZE,
        VIEW_BOX_SIZE,
        TOOLTIP_PADDING,
      )
    : null

  const goToAnalysis = (districtCode: string) => {
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
      <MapSvg viewBox={SEOUL_STATUS_VIEW_BOX}>
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
        {hoveredFeature && hoveredMetric && tooltipPosition ? (
          <TooltipGroup>
            <TooltipBackground
              x={tooltipPosition.x}
              y={tooltipPosition.y}
              width={TOOLTIP_SIZE.width}
              height={TOOLTIP_SIZE.height}
              rx={8}
            />
            <TooltipTitle x={tooltipPosition.x + 12} y={tooltipPosition.y + 20}>
              {hoveredName ?? '자치구'}
            </TooltipTitle>
            <TooltipMetric
              x={tooltipPosition.x + 12}
              y={tooltipPosition.y + 40}
            >
              {hoveredMetric.salesLabel}
            </TooltipMetric>
            <TooltipMetric
              x={tooltipPosition.x + 12}
              y={tooltipPosition.y + 56}
            >
              {hoveredMetric.footTrafficLabel}
            </TooltipMetric>
            <g
              transform={`translate(${tooltipPosition.x + 22}, ${
                tooltipPosition.y + 62
              })`}
            >
              <TooltipSparkline
                points={sparklinePath(
                  hoveredMetric.trend,
                  SPARKLINE_WIDTH,
                  SPARKLINE_HEIGHT,
                )}
              />
            </g>
          </TooltipGroup>
        ) : null}
      </MapSvg>
    </Wrapper>
  )
}
