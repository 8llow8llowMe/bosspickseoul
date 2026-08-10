'use client'

import { useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { districts } from '@/data/districts'
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

const DistrictPath = styled.path`
  fill: var(--color-surface-muted);
  stroke: var(--color-border-200);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
  cursor: pointer;
  transition: fill var(--motion-slow) var(--ease-standard);

  &:hover {
    fill: var(--color-primary-700);
    transition: fill var(--motion-fast) var(--ease-standard);
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
        {SEOUL_STATUS_FEATURES.map(feature => {
          const name = districtNameByCode.get(feature.districtCode)
          return (
            <DistrictPath
              key={feature.districtCode}
              d={feature.path}
              role="link"
              tabIndex={0}
              aria-label={name || '자치구'}
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
