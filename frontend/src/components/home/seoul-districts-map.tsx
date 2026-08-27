'use client'

import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import styled, { css, keyframes } from 'styled-components'
import { districts } from '@/data/districts'
import { getDistrictMetric, TOP_DISTRICT_CODES } from '@/data/district-metrics'
import {
  SEOUL_STATUS_FEATURES,
  SEOUL_STATUS_VIEW_BOX,
} from '@/data/seoul-status-map'
import { tooltipAreaChart } from '@/components/home/tooltip-chart'
import { clampTooltipPosition } from '@/components/home/tooltip-geometry'

const districtNameByCode = new Map(
  districts.map(district => [String(district.gooCode), district.gooName]),
)

const viewBoxNumbers = SEOUL_STATUS_VIEW_BOX.split(' ').map(Number)
const VIEW_BOX_SIZE = {
  width: viewBoxNumbers[viewBoxNumbers.length - 2],
  height: viewBoxNumbers[viewBoxNumbers.length - 1],
}

const TOOLTIP_SIZE = { width: 188, height: 116 }
const TOOLTIP_PADDING = 12
const CHART_WIDTH = 152
const CHART_HEIGHT = 40
const CHART_OFFSET = { x: 18, y: 62 }

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
  font-weight: 600;
`

const TooltipAreaPath = styled.path`
  stroke: none;
`

const TooltipLinePath = styled.path`
  fill: none;
  stroke: var(--color-primary-700);
  stroke-width: 2px;
  stroke-linecap: round;
  stroke-linejoin: round;
`

const TooltipEndDot = styled.circle`
  fill: var(--color-primary-700);
  stroke: var(--color-surface);
  stroke-width: 1.5px;
`

const TooltipBaseline = styled.line`
  stroke: var(--color-border-200);
  stroke-width: 1px;
`

type SeoulDistrictsMapProps = {
  onHoverChange?: (districtCode: string | null) => void
}

export default function SeoulDistrictsMap({
  onHoverChange,
}: SeoulDistrictsMapProps = {}) {
  const router = useRouter()
  const gradientId = useId()
  const shadowId = useId()
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
  const tooltipChart = hoveredMetric
    ? tooltipAreaChart(hoveredMetric.trend, CHART_WIDTH, CHART_HEIGHT)
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
        {hoveredFeature && hoveredMetric && tooltipPosition && tooltipChart ? (
          <TooltipGroup>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary-700)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary-700)"
                  stopOpacity={0}
                />
              </linearGradient>
              <filter
                id={shadowId}
                x="-20%"
                y="-20%"
                width="140%"
                height="150%"
              >
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="4"
                  floodColor="#020913"
                  floodOpacity={0.16}
                />
              </filter>
            </defs>
            <TooltipBackground
              x={tooltipPosition.x}
              y={tooltipPosition.y}
              width={TOOLTIP_SIZE.width}
              height={TOOLTIP_SIZE.height}
              rx={10}
              filter={`url(#${shadowId})`}
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
              transform={`translate(${tooltipPosition.x + CHART_OFFSET.x}, ${
                tooltipPosition.y + CHART_OFFSET.y
              })`}
            >
              <TooltipBaseline
                x1={0}
                y1={CHART_HEIGHT}
                x2={CHART_WIDTH}
                y2={CHART_HEIGHT}
              />
              <TooltipAreaPath
                d={tooltipChart.areaPath}
                fill={`url(#${gradientId})`}
              />
              <TooltipLinePath d={tooltipChart.linePath} />
              <TooltipEndDot
                cx={tooltipChart.lastPoint.x}
                cy={tooltipChart.lastPoint.y}
                r={3}
              />
            </g>
          </TooltipGroup>
        ) : null}
      </MapSvg>
    </Wrapper>
  )
}
