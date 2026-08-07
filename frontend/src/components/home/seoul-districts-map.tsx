'use client'

import { useState } from 'react'
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
  transition: fill var(--motion-slow) var(--ease-standard);

  &:hover {
    fill: var(--color-primary-700);
    transition: fill var(--motion-fast) var(--ease-standard);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transition: none;
    }
  }
`

const HoverLabel = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  top: ${props => (props.$y / 620) * 100}%;
  left: ${props => (props.$x / 800) * 100}%;
  z-index: 1;
  padding: 2px 8px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text-700);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  transform: translate(-50%, -140%);
`

export default function SeoulDistrictsMap() {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)

  const hoveredFeature = SEOUL_STATUS_FEATURES.find(
    feature => feature.districtCode === hoveredCode,
  )
  const hoveredName = hoveredFeature
    ? districtNameByCode.get(hoveredFeature.districtCode)
    : undefined

  return (
    <Wrapper>
      <MapSvg viewBox={SEOUL_STATUS_VIEW_BOX} aria-hidden="true">
        {SEOUL_STATUS_FEATURES.map(feature => (
          <DistrictPath
            key={feature.districtCode}
            d={feature.path}
            onMouseEnter={() => setHoveredCode(feature.districtCode)}
            onMouseLeave={() =>
              setHoveredCode(current =>
                current === feature.districtCode ? null : current,
              )
            }
          />
        ))}
      </MapSvg>
      {hoveredFeature && hoveredName ? (
        <HoverLabel $x={hoveredFeature.center.x} $y={hoveredFeature.center.y}>
          {hoveredName}
        </HoverLabel>
      ) : null}
    </Wrapper>
  )
}
