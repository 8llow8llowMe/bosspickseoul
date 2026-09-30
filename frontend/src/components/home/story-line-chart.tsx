'use client'

import { useId } from 'react'
import styled from 'styled-components'

import { computeNiceYScale } from '@/lib/analysis/chart-scale'

/**
 * 판단 흐름 02·04 데모 전용 꺾은선(story-panel-redesign.md D4-6).
 *
 * 공용 `LineChart`(recharts)를 쓰지 않는 이유: 홈에서 문제였던 것(곡선 보간이 없는 굴곡을
 * 만든다 · 눈금 라벨이 빠져 80/85/90/100 처럼 보인다 · 고정 툴팁)은 그 컴포넌트의 설정인데,
 * 분석 결과·AI 리포트·현황 상세도 같은 컴포넌트를 쓴다. 홈 때문에 세 화면을 바꾸지 않는다.
 *
 * 그리는 방식: **SVG 는 선·면·격자만**, 글자와 점은 HTML 로 겹친다. SVG 를
 * `preserveAspectRatio="none"` 으로 칸에 맞춰 늘려도 글자가 찌그러지지 않고, 좌표가 전부
 * % 라 서버 렌더에서 폭을 몰라도 된다.
 */

export type StoryLinePoint = { label: string; value: number }

export type StoryLineHighlight = {
  index: number
  label: string
  /** value — 점 옆 선 색 글자 · callout — 어두운 말풍선과 세로 점선 */
  tone: 'value' | 'callout'
}

export type StoryLineChartProps = {
  points: readonly StoryLinePoint[]
  /** 플롯 높이(px). x 라벨 줄은 따로 붙는다. */
  height: number
  ariaLabel: string
  formatTick?: (value: number) => string
  /** area — 선 아래를 옅게 · split — 0 아래는 음수색, 위는 양수색 */
  fill: 'area' | 'split'
  highlight?: StoryLineHighlight
  /** x 라벨을 몇 개마다 하나씩 보일지. */
  xLabelStep?: number
  /**
   * 눈금 개수 목표(`computeNiceYScale` 의 tickCount). 짧은 플롯에 눈금이 다섯 개면 빽빽하다 —
   * 02 는 3(80·90·100)을 쓴다.
   */
  tickCount?: number
}

/**
 * 값을 0~100 % 좌표로 옮긴다. y 는 위가 0 이다(SVG 와 CSS `top` 이 같은 방향).
 * 도메인 폭이 0 이면 가운데에 놓는다 — 나눗셈 NaN 이 화면에 새지 않게.
 */
export function storyLineGeometry(
  values: readonly number[],
  domain: readonly [number, number],
): { x: number; y: number }[] {
  const [min, max] = domain
  const span = max - min
  const last = values.length - 1

  return values.map((value, index) => {
    const x = last <= 0 ? 50 : (index / last) * 100
    const raw = span > 0 ? ((max - value) / span) * 100 : 50
    return { x, y: Math.min(100, Math.max(0, raw)) }
  })
}

const round = (value: number) => Math.round(value * 100) / 100

const defaultFormatTick = (value: number) =>
  new Intl.NumberFormat('ko-KR').format(value)

/* 오른쪽 여백은 마지막 점의 값 라벨(02)과 마지막 x 라벨이 칸 밖으로 잘리지 않게 한다. */
const Figure = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 12px;
  padding-right: 36px;
`

const YAxis = styled.div`
  position: relative;
  min-width: 40px;
`

const YTick = styled.span`
  position: absolute;
  right: 0;
  transform: translateY(-50%);
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const Plot = styled.div`
  position: relative;

  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
`

const Dot = styled.span`
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid var(--color-surface);
  border-radius: 50%;
  background: var(--color-primary-600);
  transform: translate(-50%, -50%);
`

const ValueLabel = styled.span`
  position: absolute;
  transform: translate(10px, -50%);
  color: var(--color-primary-600);
  font-size: 13px;
  font-weight: 700;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const Callout = styled.span<{ $flip: boolean }>`
  position: absolute;
  top: 0;
  transform: ${p =>
    p.$flip ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)'};
  padding: 4px 10px;
  border-radius: var(--radius-control);
  background: var(--color-text-900);
  color: var(--color-surface);
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  white-space: nowrap;
`

const XAxis = styled.div`
  position: relative;
  grid-column: 2;
  height: 26px;
`

const XTick = styled.span<{ $strong: boolean }>`
  position: absolute;
  top: 8px;
  transform: translateX(-50%);
  color: ${p =>
    p.$strong ? 'var(--color-text-900)' : 'var(--color-text-caption)'};
  font-size: 12px;
  font-weight: ${p => (p.$strong ? 600 : 400)};
  line-height: 16px;
  white-space: nowrap;
`

export default function StoryLineChart({
  points,
  height,
  ariaLabel,
  formatTick = defaultFormatTick,
  fill,
  highlight,
  xLabelStep = 1,
  tickCount = 4,
}: StoryLineChartProps) {
  /* useId 의 콜론은 url(#…) 참조를 깨뜨릴 수 있어 걸러 낸다. */
  const clipId = `story-line-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  if (points.length < 2) return null

  const values = points.map(point => point.value)
  const scale = computeNiceYScale(values, tickCount)
  const coords = storyLineGeometry(values, scale.domain)
  const tickCoords = storyLineGeometry(scale.ticks, scale.domain)
  const [min, max] = scale.domain
  const hasZero = min < 0 && max > 0
  const zeroY = hasZero ? storyLineGeometry([0], scale.domain)[0].y : 100

  const line = coords.map(({ x, y }) => `${round(x)},${round(y)}`).join(' ')
  const baseY = fill === 'split' ? zeroY : 100
  const area = `0,${round(baseY)} ${line} 100,${round(baseY)}`

  const target = highlight ? coords[highlight.index] : undefined
  const lastIndex = points.length - 1

  return (
    <Figure role="img" aria-label={ariaLabel}>
      <YAxis aria-hidden="true">
        {scale.ticks.map((tick, index) => (
          <YTick key={tick} style={{ top: `${tickCoords[index].y}%` }}>
            {formatTick(tick)}
          </YTick>
        ))}
      </YAxis>

      <Plot style={{ height }} aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
          {fill === 'split' ? (
            <defs>
              <clipPath id={`${clipId}-pos`}>
                <rect x="0" y="0" width="100" height={round(zeroY)} />
              </clipPath>
              <clipPath id={`${clipId}-neg`}>
                <rect
                  x="0"
                  y={round(zeroY)}
                  width="100"
                  height={round(100 - zeroY)}
                />
              </clipPath>
            </defs>
          ) : null}

          {tickCoords.map(({ y }, index) => {
            const isZero = hasZero && scale.ticks[index] === 0
            return (
              <line
                key={scale.ticks[index]}
                x1="0"
                x2="100"
                y1={round(y)}
                y2={round(y)}
                stroke={
                  isZero ? 'var(--color-grey-300)' : 'var(--color-border-200)'
                }
                strokeDasharray={isZero ? undefined : '3 4'}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}

          {fill === 'area' ? (
            <polygon
              points={area}
              fill="var(--color-primary-600)"
              fillOpacity="0.08"
            />
          ) : (
            <>
              <polygon
                points={area}
                fill="var(--color-positive)"
                fillOpacity="0.12"
                clipPath={`url(#${clipId}-pos)`}
              />
              <polygon
                points={area}
                fill="var(--color-negative)"
                fillOpacity="0.12"
                clipPath={`url(#${clipId}-neg)`}
              />
            </>
          )}

          {target && highlight?.tone === 'callout' ? (
            <line
              x1={round(target.x)}
              x2={round(target.x)}
              y1="0"
              y2="100"
              stroke="var(--color-primary-700)"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          <polyline
            points={line}
            fill="none"
            stroke={
              fill === 'split'
                ? 'var(--color-text-900)'
                : 'var(--color-primary-600)'
            }
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {target && highlight ? (
          <>
            <Dot style={{ left: `${target.x}%`, top: `${target.y}%` }} />
            {highlight.tone === 'value' ? (
              <ValueLabel style={{ left: `${target.x}%`, top: `${target.y}%` }}>
                {highlight.label}
              </ValueLabel>
            ) : (
              <Callout $flip={target.x > 70} style={{ left: `${target.x}%` }}>
                {highlight.label}
              </Callout>
            )}
          </>
        ) : null}
      </Plot>

      <XAxis aria-hidden="true">
        {points.map((point, index) =>
          index % xLabelStep === 0 ? (
            <XTick
              key={point.label}
              $strong={highlight?.tone === 'value' && index === lastIndex}
              style={{ left: `${coords[index].x}%` }}
            >
              {point.label}
            </XTick>
          ) : null,
        )}
      </XAxis>
    </Figure>
  )
}
