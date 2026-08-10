'use client'

import { useEffect, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import styled, { css, keyframes } from 'styled-components'
import { districts } from '@/data/districts'
import { TOP_DISTRICT_CODES } from '@/data/district-metrics'
import {
  SEOUL_STATUS_FEATURES,
  SEOUL_STATUS_VIEW_BOX,
} from '@/data/seoul-status-map'

const districtNameByCode = new Map(
  districts.map(district => [String(district.gooCode), district.gooName]),
)

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

const DistrictLabel = styled.text`
  fill: var(--color-text-900);
  stroke: var(--color-surface);
  stroke-width: 3px;
  paint-order: stroke;
  font-size: 15px;
  font-weight: 700;
  text-anchor: middle;
  pointer-events: none;
`

export default function SeoulDistrictsMap() {
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
              onMouseEnter={() => setHoveredCode(feature.districtCode)}
              onMouseLeave={() =>
                setHoveredCode(current =>
                  current === feature.districtCode ? null : current,
                )
              }
              onFocus={() => setHoveredCode(feature.districtCode)}
              onBlur={() =>
                setHoveredCode(current =>
                  current === feature.districtCode ? null : current,
                )
              }
              onClick={() => goToAnalysis(feature.districtCode)}
              onKeyDown={event => handleKeyDown(event, feature.districtCode)}
            />
          )
        })}
        {hoveredFeature && hoveredName ? (
          <DistrictLabel
            x={hoveredFeature.center.x}
            y={hoveredFeature.center.y + 14}
          >
            {hoveredName}
          </DistrictLabel>
        ) : null}
      </MapSvg>
    </Wrapper>
  )
}
