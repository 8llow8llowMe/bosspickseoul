'use client'

import type { ReactNode } from 'react'
import styled from 'styled-components'

import type { TooltipState } from './use-chart-tooltip'

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`

const Svg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
`

const Tooltip = styled.div`
  position: absolute;
  transform: translate(-50%, -110%);
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--color-text-900);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
`

export type ChartFrameProps = {
  viewBoxWidth: number
  viewBoxHeight: number
  ariaLabel: string
  tooltip?: TooltipState | null
  children?: ReactNode
}

export default function ChartFrame({
  viewBoxWidth,
  viewBoxHeight,
  ariaLabel,
  tooltip,
  children,
}: ChartFrameProps) {
  return (
    <Wrapper>
      <Svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        {children}
      </Svg>
      {tooltip ? (
        <Tooltip style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.label} · {tooltip.value}
        </Tooltip>
      ) : null}
    </Wrapper>
  )
}
