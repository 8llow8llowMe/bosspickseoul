'use client'

import { useState, type FocusEvent, type KeyboardEvent } from 'react'
import styled, { css } from 'styled-components'
import { districts } from '@/data/districts'
import {
  SEOUL_STATUS_FEATURES,
  SEOUL_STATUS_VIEW_BOX,
} from '@/data/seoul-status-map'
import {
  formatStatusRankSummary,
  STATUS_METRIC_LABELS,
} from '@/lib/status/status-formatters'
import {
  createStatusMapLabels,
  findSelectedStatusMapFeature,
  resolveStatusMapLabelModes,
  resolveStatusMapValueSteps,
  STATUS_MAP_LABEL_BREAKPOINT_PX,
  STATUS_MAP_LABEL_TIERS,
  STATUS_MAP_VALUE_STEPS,
  statusMapValueStepFill,
} from '@/lib/status/status-map-model'
import type { StatusMetric, StatusRankedItem } from '@/types/status'

type StatusMapProps = {
  metric: StatusMetric
  /** 현재 지표의 **전체 순위**(최대 25). 단계 색·툴팁은 전부를, 순위 점은 앞 10개만 쓴다. */
  items: StatusRankedItem[]
  selectedDistrictCode: string | null
  onSelect: (districtCode: string) => void
  onBackgroundClick?: () => void
  backgroundAction?: 'expand' | 'collapse'
  /**
   * 목록 ↔ 지도 hover 연동(`status-highlight-store`). 주면 hover 상태를 바깥이 쥐고, 목록
   * 행을 가리켜도 지도가 강조·툴팁을 띄운다. 없으면 지도 혼자 hover 를 관리한다.
   */
  highlightedDistrictCode?: string | null
  onHighlightEnter?: (districtCode: string) => void
  onHighlightLeave?: (districtCode: string) => void
}

// 단계 색(5분위 다섯 칸)은 `lib/status/status-map-model.ts` 가 정본이다 — 홈 지도도 같은 칸을 쓴다(#588).

const STATUS_MAP_VIEW_BOX_SIZE = {
  width: 800,
  height: 620,
} as const

const Figure = styled.figure`
  min-width: 0;
  display: grid;
  gap: 12px;
`

const MapCanvas = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 800 / 620;
  overflow: hidden;
  container-type: size;
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

// 라벨 크기는 캔버스가 아니라 **실제 지도 폭**으로 정한다(`container-type`). 캔버스가
// 넓어도 높이에 막혀 지도가 좁게 그려질 수 있어서다. narrow/wide 판정 모델과 짝이다.
const MapViewport = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: min(100cqw, 129.032258cqh);
  height: min(100cqh, 77.5cqw);
  container-type: size;
  pointer-events: none;
  transform: translate(-50%, -50%);
`

const SeoulSilhouette = styled.svg`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
`

/*
 * 폴리곤이 곧 선택 버튼이다. 예전엔 폴리곤이 aria-hidden 이고 버튼은 순위 라벨뿐이라
 * 순위 밖 15개 구는 눌러도 반응이 없었다 — 네이버 지도처럼 영역을 누르면 고른다.
 * 25개 구가 모두 Tab 으로 닿는다(홈 지도 `seoul-districts-map` 과 같은 방식).
 */
const DistrictPath = styled.path`
  fill: var(--color-surface-muted);
  stroke: var(--color-border-300);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
  cursor: pointer;
  pointer-events: visiblePainted;
  transition:
    fill var(--motion-fast) var(--ease-standard),
    opacity var(--motion-fast) var(--ease-standard);

  ${STATUS_MAP_VALUE_STEPS.map(
    ({ step, mixPercent }) => `
      &[data-value-step='${step}'] {
        fill: ${statusMapValueStepFill(mixPercent)};
      }
    `,
  ).join('')}

  /* 선택 중에는 나머지 구를 낮춰 선택 구에 눈이 가게 한다. */
  svg[data-has-selection='true'] &:not([aria-pressed='true']) {
    opacity: 0.5;
  }

  /* hover 는 채움을 바꾸지 않는다 — 단계 색 위에서 채움이 바뀌면 값 구간을 오독한다. 강조는
     위에 겹쳐 그리는 테두리(ActiveDistrictOutline)가 맡는다.
     포커스 표시는 점선(FocusedDistrictOutline)이 맡고 CSS 로도 한 겹 둔다 — 상태가
     어긋나도 포커스를 받은 구가 보이지 않는 일은 없어야 한다(WCAG 2.4.7). */
  &:focus {
    outline: none;
  }

  &:focus-visible {
    stroke: var(--color-blue-500);
    stroke-width: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

// 인접 폴리곤이 경계선을 덮지 않도록 강조선은 맨 위에 한 번 더 그린다.
const ActiveDistrictOutline = styled.path`
  fill: none;
  stroke: var(--color-primary-600);
  stroke-width: 2px;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
`

const SelectedDistrictPath = styled.path`
  fill: var(--color-primary-600);
  fill-opacity: 0.45;
  stroke: var(--color-primary-600);
  stroke-width: 3px;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
`

const FocusedDistrictOutline = styled.path`
  fill: none;
  stroke: var(--color-blue-500);
  stroke-width: 3px;
  stroke-dasharray: 6 3;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
`

const MapBackgroundButton = styled.button`
  position: absolute;
  inset: 0;
  z-index: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--color-blue-500);
    outline-offset: -4px;
  }
`

const MapLabelLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
`

const atViewBoxPoint = css<{ $x: number; $y: number }>`
  position: absolute;
  top: ${props => (props.$y / STATUS_MAP_VIEW_BOX_SIZE.height) * 100}%;
  left: ${props => (props.$x / STATUS_MAP_VIEW_BOX_SIZE.width) * 100}%;
`

const LabelName = styled.span``

const RankDot = styled.span`
  min-width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0 3px;
  border-radius: var(--radius-pill);
  background: var(--color-fill-primary-text);
  color: var(--color-surface);
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-shadow: none;
  /* 단계 색 위에서도 점이 묻히지 않게 흰 테를 두른다. */
  box-shadow: 0 0 0 1.5px var(--color-surface);
`

/*
 * 라벨은 **폴리곤 중심에 고정**하고 움직이지 않는다(`resolveStatusMapLabelModes`).
 * 겹칠 때는 옮기는 대신 줄인다 — 이름을 빼고 순위 점만 남기거나(badge), 순위 없는
 * 이름을 숨긴다(hidden). 모드는 지도 폭 등급마다 따로 정해 두고 @container 로 고른다.
 */
const MapLabel = styled.span<{ $x: number; $y: number; $selected: boolean }>`
  ${atViewBoxPoint}
  z-index: ${props => (props.$selected ? 2 : 1)};
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--color-text-700);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  text-shadow:
    0 0 2px var(--color-surface),
    0 1px 2px var(--color-surface);
  white-space: nowrap;
  transform: translate(-50%, -50%);
  transition: opacity var(--motion-fast) var(--ease-standard);

  &[data-ranked='true'] {
    color: var(--color-text-900);
  }

  [data-has-selection='true'] > &:not([data-selected='true']) {
    opacity: 0.6;
  }

  &[data-wide-mode='hidden'] {
    display: none;
  }

  &[data-wide-mode='badge'] > ${LabelName} {
    display: none;
  }

  &[data-wide-mode='stacked'] {
    flex-direction: column;
    gap: 1px;
  }

  @container (max-width: ${STATUS_MAP_LABEL_BREAKPOINT_PX}px) {
    font-size: 9.5px;

    & > ${RankDot} {
      min-width: 13px;
      height: 13px;
      padding: 0 2px;
      font-size: 9px;
    }

    &[data-wide-mode] {
      display: inline-flex;
      flex-direction: row;
      gap: 3px;
    }

    &[data-wide-mode] > ${LabelName} {
      display: inline;
    }

    &[data-narrow-mode='hidden'] {
      display: none;
    }

    &[data-narrow-mode='badge'] > ${LabelName} {
      display: none;
    }

    &[data-narrow-mode='stacked'] {
      flex-direction: column;
      gap: 1px;
    }
  }
`

// 지도 위아래 끝에 붙은 구는 툴팁이 캔버스 밖으로 잘리므로 아래로 뒤집는다.
const TOOLTIP_FLIP_BELOW_Y = 140
const TOOLTIP_EDGE_X = 140

// DESIGN.md 「Background Float」: 떠 있는 요소는 흰 바탕. 홈 지도 툴팁과 같은 모양이다.
const DistrictTooltip = styled.span<{
  $x: number
  $y: number
  $below: boolean
  $align: 'start' | 'center' | 'end'
}>`
  ${atViewBoxPoint}
  z-index: 3;
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);
  white-space: nowrap;
  transform: translate(
    ${props =>
      props.$align === 'start'
        ? '-16px'
        : props.$align === 'end'
          ? 'calc(-100% + 16px)'
          : '-50%'},
    ${props => (props.$below ? '14px' : 'calc(-100% - 14px)')}
  );
`

const TooltipTitle = styled.strong`
  color: var(--color-text-900);
  font-size: 13px;
  font-weight: 700;
  line-height: 18px;
`

const TooltipMetric = styled.span`
  color: var(--color-text-700);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
`

// 범례는 서울 윤곽 밖이 가장 넓게 비는 왼쪽 위에 둔다(은평·강서 위쪽).
const Legend = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  color: var(--color-text-600);
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  white-space: nowrap;
  pointer-events: none;
`

/* 회색은 그 지표에 값이 없는 구다(그 분기 행이 없음). 정상 운영에서는 25개 구가 모두 값이 있어
   그런 구가 있을 때만 칸을 그린다. 좁은 지도(모바일·태블릿)에서는 빼는데, 그대로 두면 범례 오른쪽
   끝이 도봉구 라벨 자리까지 닿아 순위 점을 가린다(360·375px 실측). 툴팁이 「데이터 없음」을 말해 준다. */
const LegendOutside = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  @container (max-width: ${STATUS_MAP_LABEL_BREAKPOINT_PX}px) {
    display: none;
  }
`

const LegendScale = styled.span`
  display: inline-flex;
  gap: 2px;
`

const LegendSwatch = styled.span<{ $fill: string }>`
  width: 12px;
  height: 12px;
  display: inline-block;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-compact);
  background: ${props => props.$fill};
`

const getBackgroundActionLabel = (action: 'expand' | 'collapse') =>
  action === 'expand'
    ? '지도를 눌러 구별 현황 바텀시트 펼치기'
    : '지도를 더 보기 위해 구별 현황 바텀시트 최소화'

export default function StatusMap({
  metric,
  items,
  selectedDistrictCode,
  onSelect,
  onBackgroundClick,
  backgroundAction,
  highlightedDistrictCode,
  onHighlightEnter,
  onHighlightLeave,
}: StatusMapProps) {
  // hover 와 키보드 포커스는 따로 둔다. 한 상태를 나눠 쓰면 Tab 으로 고른 구 위를 마우스가
  // 스치고 떠날 때 포커스 표시까지 지워진다.
  const [localHoveredCode, setLocalHoveredCode] = useState<string | null>(null)
  const isHighlightControlled = onHighlightEnter !== undefined
  const hoveredCode = isHighlightControlled
    ? (highlightedDistrictCode ?? null)
    : localHoveredCode
  const [focusedCode, setFocusedCode] = useState<string | null>(null)
  const labels = createStatusMapLabels(items, SEOUL_STATUS_FEATURES, districts)
  const labelsByDistrictCode = new Map(
    labels.map(label => [label.districtCode, label]),
  )
  // 같은 구가 두 번 오면 앞 항목을 쓴다(단계 계산과 같은 규칙).
  const itemsByDistrictCode = new Map<string, StatusRankedItem>()
  for (const item of items) {
    if (!itemsByDistrictCode.has(item.districtCode)) {
      itemsByDistrictCode.set(item.districtCode, item)
    }
  }
  const valueSteps = resolveStatusMapValueSteps(items)
  const hasDistrictWithoutStep = SEOUL_STATUS_FEATURES.some(
    feature => !valueSteps.has(feature.districtCode),
  )
  const wideModes = resolveStatusMapLabelModes(
    labels,
    STATUS_MAP_LABEL_TIERS.wide,
  )
  const narrowModes = resolveStatusMapLabelModes(
    labels,
    STATUS_MAP_LABEL_TIERS.narrow,
  )
  const selectedFeature = findSelectedStatusMapFeature(
    SEOUL_STATUS_FEATURES,
    selectedDistrictCode,
  )
  const hoveredFeature = findSelectedStatusMapFeature(
    SEOUL_STATUS_FEATURES,
    hoveredCode,
  )
  const focusedFeature = findSelectedStatusMapFeature(
    SEOUL_STATUS_FEATURES,
    focusedCode,
  )
  // 툴팁은 하나만 띄운다. 마우스가 가리키는 곳이 지금 보는 곳이라 hover 가 먼저다.
  const tooltipCode = hoveredCode ?? focusedCode
  const tooltipLabel = tooltipCode
    ? labelsByDistrictCode.get(tooltipCode)
    : undefined

  const clearIfCurrent = (districtCode: string) => (current: string | null) =>
    current === districtCode ? null : current

  const handleKeyDown = (
    event: KeyboardEvent<SVGPathElement>,
    districtCode: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(districtCode)
    }
  }

  // 마우스로 눌러도 path 에 포커스가 간다. 툴팁은 키보드 포커스(:focus-visible)에만 띄워
  // 터치 탭 뒤에 툴팁이 남아 지도를 가리지 않게 한다.
  const handleFocus = (
    event: FocusEvent<SVGPathElement>,
    districtCode: string,
  ) => {
    if (event.currentTarget.matches(':focus-visible')) {
      setFocusedCode(districtCode)
    }
  }

  return (
    <Figure>
      <MapCanvas>
        {onBackgroundClick && backgroundAction ? (
          <MapBackgroundButton
            aria-label={getBackgroundActionLabel(backgroundAction)}
            type="button"
            onClick={onBackgroundClick}
          />
        ) : null}
        {items.length > 0 ? (
          <Legend aria-hidden="true" data-status-map-legend>
            <span>많음</span>
            <LegendScale>
              {STATUS_MAP_VALUE_STEPS.map(({ step, mixPercent }) => (
                <LegendSwatch
                  key={step}
                  $fill={statusMapValueStepFill(mixPercent)}
                />
              ))}
            </LegendScale>
            <span>적음</span>
            {hasDistrictWithoutStep ? (
              <LegendOutside>
                <LegendSwatch $fill="var(--color-surface-muted)" />
                <span>데이터 없음</span>
              </LegendOutside>
            ) : null}
          </Legend>
        ) : null}
        <MapViewport data-status-map-label-viewport="800x620">
          <SeoulSilhouette
            aria-label={`서울 자치구 지도, ${STATUS_METRIC_LABELS[metric]} 기준`}
            data-has-selection={selectedDistrictCode !== null}
            data-status-map-shape-layer="800x620"
            preserveAspectRatio="xMidYMid meet"
            role="group"
            viewBox={SEOUL_STATUS_VIEW_BOX}
          >
            {SEOUL_STATUS_FEATURES.map(feature => {
              const label = labelsByDistrictCode.get(feature.districtCode)
              if (!label) return null

              return (
                <DistrictPath
                  key={feature.districtCode}
                  aria-label={`${label.districtName}, ${formatStatusRankSummary(
                    metric,
                    itemsByDistrictCode.get(feature.districtCode),
                  )}`}
                  aria-pressed={feature.districtCode === selectedDistrictCode}
                  d={feature.path}
                  data-value-step={valueSteps.get(feature.districtCode)}
                  data-status-district-path={feature.districtCode}
                  role="button"
                  tabIndex={0}
                  onBlur={() =>
                    setFocusedCode(clearIfCurrent(feature.districtCode))
                  }
                  onClick={() => onSelect(feature.districtCode)}
                  onFocus={event => handleFocus(event, feature.districtCode)}
                  onKeyDown={event =>
                    handleKeyDown(event, feature.districtCode)
                  }
                  onPointerEnter={event => {
                    if (event.pointerType === 'touch') return
                    if (isHighlightControlled) {
                      onHighlightEnter(feature.districtCode)
                    } else {
                      setLocalHoveredCode(feature.districtCode)
                    }
                  }}
                  onPointerLeave={() => {
                    // 렌더 시점 값이 아니라 지금 값과 비교해 지운다(store·업데이터).
                    if (isHighlightControlled) {
                      onHighlightLeave?.(feature.districtCode)
                    } else {
                      setLocalHoveredCode(clearIfCurrent(feature.districtCode))
                    }
                  }}
                />
              )
            })}
            {selectedFeature ? (
              <SelectedDistrictPath
                d={selectedFeature.path}
                data-selected-district-code={selectedFeature.districtCode}
              />
            ) : null}
            {/* hover 강조는 선택 구에 겹치지 않는다. 키보드 포커스는 선택 구 위에도 점선으로 보인다. */}
            {hoveredFeature &&
            hoveredFeature.districtCode !== selectedDistrictCode ? (
              <ActiveDistrictOutline d={hoveredFeature.path} />
            ) : null}
            {focusedFeature ? (
              <FocusedDistrictOutline
                d={focusedFeature.path}
                data-status-map-focus={focusedFeature.districtCode}
              />
            ) : null}
          </SeoulSilhouette>
          <MapLabelLayer
            aria-hidden="true"
            data-has-selection={selectedDistrictCode !== null}
            data-status-map-label-layer="800x620"
          >
            {labels.map(label => (
              <MapLabel
                key={label.districtCode}
                $selected={label.districtCode === selectedDistrictCode}
                $x={label.x}
                $y={label.y}
                data-narrow-mode={narrowModes.get(label.districtCode)}
                data-ranked={label.rank !== null}
                data-selected={label.districtCode === selectedDistrictCode}
                data-status-district-label={label.districtCode}
                data-wide-mode={wideModes.get(label.districtCode)}
              >
                {label.rank !== null ? (
                  <RankDot data-status-rank={label.rank}>{label.rank}</RankDot>
                ) : null}
                <LabelName>{label.districtName}</LabelName>
              </MapLabel>
            ))}
            {tooltipLabel ? (
              <DistrictTooltip
                $align={
                  tooltipLabel.x < TOOLTIP_EDGE_X
                    ? 'start'
                    : tooltipLabel.x >
                        STATUS_MAP_VIEW_BOX_SIZE.width - TOOLTIP_EDGE_X
                      ? 'end'
                      : 'center'
                }
                $below={tooltipLabel.y < TOOLTIP_FLIP_BELOW_Y}
                $x={tooltipLabel.x}
                $y={tooltipLabel.y}
                data-status-map-tooltip={tooltipLabel.districtCode}
              >
                <TooltipTitle>{tooltipLabel.districtName}</TooltipTitle>
                <TooltipMetric>
                  {formatStatusRankSummary(
                    metric,
                    itemsByDistrictCode.get(tooltipLabel.districtCode),
                  )}
                </TooltipMetric>
              </DistrictTooltip>
            ) : null}
          </MapLabelLayer>
        </MapViewport>
      </MapCanvas>
    </Figure>
  )
}
