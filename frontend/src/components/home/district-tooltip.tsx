'use client'

import { useId } from 'react'
import styled from 'styled-components'

import {
  barRects,
  formatSlotRange,
  formatWeekendDelta,
  roundedTopBarPath,
  type DistrictRhythm,
} from '@/components/home/district-rhythm'
import { formatPeriodCode } from '@/lib/analysis/presentation'
import {
  STATUS_CHANGE_TONE_COLOR,
  formatSinoUnit,
  formatStatusChange,
  getStatusChangeTone,
} from '@/lib/status/status-formatters'

/*
  히어로 지도 툴팁(full-screen-sections-and-live-tooltip.md D4-5). 좌표는 지도 viewBox(800×620)
  단위라 화면에서는 지도 배율만큼 커진다(1440×900 에서 약 1.27배).

  색은 파랑 한 색이다 — 막대는 크기만 말하므로 범주색이 필요 없다. 가장 큰 칸만 진하게,
  나머지는 같은 파랑을 옅게 섞는다(새 토큰을 만들지 않는다). 글자는 글자 토큰만 쓴다.
*/
export const TOOLTIP_WIDTH = 212
export const TOOLTIP_HEIGHT = 204
export const TOOLTIP_ERROR_HEIGHT = 76

const PAD = 12
const INNER = TOOLTIP_WIDTH - PAD * 2
const SLOT_CHART = { top: 90, height: 34, gap: 2 }
const DAY_CHART = { top: 162, height: 20, gap: 4 }
const BAR_RADIUS = 3
/* 막대 왼쪽 끝(구간 시작 시각). 24 는 21 과 붙어 겹쳐 빼고, 마지막 눈금에 「시」를 붙인다. */
const SLOT_TICKS = [0, 6, 11, 14, 17, 21]

const Background = styled.rect`
  fill: var(--color-surface);
  stroke: var(--color-border-200);
  stroke-width: 1px;
`

const Name = styled.text`
  fill: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
`

const Value = styled.text`
  fill: var(--color-text-900);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`

const Label = styled.text`
  fill: var(--color-text-600);
  font-size: 11px;
  font-weight: 600;
`

const Caption = styled.text<{ $strong?: boolean }>`
  fill: ${p =>
    p.$strong ? 'var(--color-text-900)' : 'var(--color-text-caption)'};
  font-size: 11px;
  font-weight: ${p => (p.$strong ? 700 : 500)};
  font-variant-numeric: tabular-nums;
`

const PillBox = styled.rect`
  fill: var(--color-surface-muted);
`

const Bar = styled.path<{ $peak: boolean }>`
  fill: ${p =>
    p.$peak
      ? 'var(--color-primary-700)'
      : 'color-mix(in srgb, var(--color-primary-700) 32%, var(--color-surface))'};
`

const Skeleton = styled.rect`
  fill: var(--color-surface-muted);
`

const Baseline = styled.line`
  stroke: var(--color-border-200);
  stroke-width: 1px;
`

/** 글자 폭 어림(한글 1em, 그 밖 0.6em). 알약 폭을 잡는 데만 쓴다. */
const estimateWidth = (text: string, fontSize: number) =>
  Array.from(text).reduce(
    (sum, char) => sum + (/[ㄱ-힝]/.test(char) ? fontSize : fontSize * 0.6),
    0,
  )

export type DistrictTooltipState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; rhythm: DistrictRhythm }

type DistrictTooltipProps = {
  x: number
  y: number
  name: string
  state: DistrictTooltipState
}

export const districtTooltipHeight = (state: DistrictTooltipState) =>
  state.status === 'error' ? TOOLTIP_ERROR_HEIGHT : TOOLTIP_HEIGHT

export default function DistrictTooltip({
  x,
  y,
  name,
  state,
}: DistrictTooltipProps) {
  const shadowId = useId()
  const height = districtTooltipHeight(state)
  const rhythm = state.status === 'ready' ? state.rhythm : null
  const pill = rhythm?.indicatorName ?? null
  const pillWidth = pill ? estimateWidth(pill, 11) + 14 : 0

  return (
    <g transform={`translate(${x}, ${y})`} aria-hidden="true">
      <defs>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="4"
            floodColor="#020913"
            floodOpacity={0.16}
          />
        </filter>
      </defs>
      <Background
        width={TOOLTIP_WIDTH}
        height={height}
        rx={10}
        filter={`url(#${shadowId})`}
      />
      <Name x={PAD} y={24}>
        {name}
      </Name>
      {pill ? (
        <g transform={`translate(${TOOLTIP_WIDTH - PAD - pillWidth}, 11)`}>
          <PillBox width={pillWidth} height={18} rx={9} />
          <Label x={pillWidth / 2} y={13} textAnchor="middle">
            {pill}
          </Label>
        </g>
      ) : null}

      {state.status === 'error' ? (
        <>
          <Caption x={PAD} y={46} $strong>
            지금은 데이터를 불러오지 못했어요
          </Caption>
          <Caption x={PAD} y={62}>
            눌러서 분석 화면으로 이동해요
          </Caption>
        </>
      ) : null}

      {state.status === 'loading' ? <LoadingBody /> : null}
      {rhythm ? <ReadyBody rhythm={rhythm} /> : null}
    </g>
  )
}

function LoadingBody() {
  return (
    <>
      <Skeleton x={PAD} y={34} width={120} height={14} rx={4} />
      <Skeleton x={PAD} y={54} width={150} height={10} rx={4} />
      <Skeleton
        x={PAD}
        y={SLOT_CHART.top}
        width={INNER}
        height={SLOT_CHART.height}
        rx={4}
      />
      <Skeleton
        x={PAD}
        y={DAY_CHART.top}
        width={INNER}
        height={DAY_CHART.height}
        rx={4}
      />
    </>
  )
}

function ReadyBody({ rhythm }: { rhythm: DistrictRhythm }) {
  const { latest, slots, days, weekendDeltaPct } = rhythm
  const slotBars = barRects(
    slots.map(slot => ({
      span: slot.end - slot.start,
      value: slot.perHour,
      peak: slot.peak,
    })),
    INNER,
    SLOT_CHART.height,
    SLOT_CHART.gap,
  )
  const dayBars = barRects(
    days.map(day => ({ span: 1, value: day.value, peak: day.peak })),
    INNER,
    DAY_CHART.height,
    DAY_CHART.gap,
  )
  const peakSlot = slots.find(slot => slot.peak)
  const hourToX = (hour: number) => PAD + (hour / 24) * INNER

  return (
    <>
      {latest ? (
        <>
          <Value x={PAD} y={46}>
            {formatSinoUnit(latest.total, '명')}
            {latest.changeRate !== null ? (
              <tspan
                dx={6}
                fontSize={12}
                fontWeight={600}
                style={{
                  fill: STATUS_CHANGE_TONE_COLOR[
                    getStatusChangeTone('footTraffic', latest.changeRate)
                  ],
                }}
              >
                {formatStatusChange(latest.changeRate)}
              </tspan>
            ) : null}
          </Value>
          <Caption x={PAD} y={62}>
            {formatPeriodCode(latest.periodCode)} 유동인구
            {latest.changeRate !== null ? ' · 전분기 대비' : ''}
          </Caption>
        </>
      ) : null}

      {slotBars.length > 0 ? (
        <>
          <Label x={PAD} y={SLOT_CHART.top - 8}>
            시간대별 · 시간당
          </Label>
          {peakSlot ? (
            <Caption
              x={TOOLTIP_WIDTH - PAD}
              y={SLOT_CHART.top - 8}
              textAnchor="end"
              $strong
            >
              {formatSlotRange(peakSlot)} 최다
            </Caption>
          ) : null}
          <g transform={`translate(${PAD}, ${SLOT_CHART.top})`}>
            {slotBars.map(bar => (
              <Bar
                key={bar.x}
                $peak={bar.peak}
                d={roundedTopBarPath(bar, BAR_RADIUS)}
              />
            ))}
            <Baseline
              x1={0}
              y1={SLOT_CHART.height}
              x2={INNER}
              y2={SLOT_CHART.height}
            />
          </g>
          {SLOT_TICKS.map((hour, index) => (
            <Caption
              key={hour}
              x={hourToX(hour)}
              y={SLOT_CHART.top + SLOT_CHART.height + 12}
              textAnchor={index === 0 ? 'start' : 'middle'}
            >
              {index === SLOT_TICKS.length - 1 ? `${hour}시` : hour}
            </Caption>
          ))}
        </>
      ) : null}

      {dayBars.length > 0 ? (
        <>
          <Label x={PAD} y={DAY_CHART.top - 8}>
            요일별
          </Label>
          {weekendDeltaPct !== null ? (
            <Caption
              x={TOOLTIP_WIDTH - PAD}
              y={DAY_CHART.top - 8}
              textAnchor="end"
              $strong
            >
              {formatWeekendDelta(weekendDeltaPct)}
            </Caption>
          ) : null}
          <g transform={`translate(${PAD}, ${DAY_CHART.top})`}>
            {dayBars.map((bar, index) => (
              <g key={days[index].label}>
                <Bar $peak={bar.peak} d={roundedTopBarPath(bar, BAR_RADIUS)} />
                <Caption
                  x={bar.x + bar.width / 2}
                  y={DAY_CHART.height + 12}
                  textAnchor="middle"
                  $strong={bar.peak}
                >
                  {days[index].label}
                </Caption>
              </g>
            ))}
            <Baseline
              x1={0}
              y1={DAY_CHART.height}
              x2={INNER}
              y2={DAY_CHART.height}
            />
          </g>
        </>
      ) : null}
    </>
  )
}
