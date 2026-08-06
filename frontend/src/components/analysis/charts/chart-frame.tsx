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
  border-radius: var(--radius-control);
  background: var(--color-text-900);
  color: var(--color-surface);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: var(--shadow-level-3);
`

export type ChartFrameProps = {
  viewBoxWidth: number
  viewBoxHeight: number
  ariaLabel: string
  ariaRole?: 'img' | 'group'
  tooltip?: TooltipState | null
  children?: ReactNode
}

export default function ChartFrame({
  viewBoxWidth,
  viewBoxHeight,
  ariaLabel,
  ariaRole = 'img',
  tooltip,
  children,
}: ChartFrameProps) {
  return (
    <Wrapper>
      <Svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        role={ariaRole}
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        {children}
      </Svg>
      {tooltip ? (
        <Tooltip
          style={{
            left: `${(tooltip.x / viewBoxWidth) * 100}%`,
            top: `${(tooltip.y / viewBoxHeight) * 100}%`,
          }}
        >
          {tooltip.label} · {tooltip.value}
        </Tooltip>
      ) : null}
    </Wrapper>
  )
}
