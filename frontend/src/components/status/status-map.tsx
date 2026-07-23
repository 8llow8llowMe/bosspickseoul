'use client'

import { css } from 'styled-components'
import styled from 'styled-components'
import { districts } from '@/data/districts'
import {
  SEOUL_STATUS_FEATURES,
  SEOUL_STATUS_VIEW_BOX,
} from '@/data/seoul-status-map'
import {
  createStatusMapLabels,
  findSelectedStatusMapFeature,
  type StatusMapLabel,
} from '@/lib/status/status-map-model'
import type { StatusMetric, StatusRankedItem } from '@/types/status'

type StatusMapProps = {
  metric: StatusMetric
  items: StatusRankedItem[]
  selectedDistrictCode: string | null
  onSelect: (districtCode: string) => void
  onBackgroundClick?: () => void
  backgroundAction?: 'expand' | 'collapse'
}

const METRIC_LABELS: Record<StatusMetric, string> = {
  footTraffic: '유동인구',
  sales: '매출',
  opened: '개업',
  closed: '폐업',
}

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
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

const MapViewport = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: min(100cqw, 129.032258cqh);
  height: min(100cqh, 77.5cqw);
  pointer-events: none;
  transform: translate(-50%, -50%);
`

const SeoulSilhouette = styled.svg`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
`

const DistrictPath = styled.path`
  fill: var(--color-surface-muted);
  stroke: var(--color-border-300);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
`

const SelectedDistrictPath = styled.path`
  fill: var(--color-primary-600);
  fill-opacity: 0.5;
  stroke: var(--color-primary-600);
  stroke-width: 3px;
  vector-effect: non-scaling-stroke;
`

const LabelLeaderLine = styled.path`
  fill: none;
  stroke: var(--color-border-300);
  stroke-dasharray: 3 3;
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
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

const labelPosition = css<{
  $x: number
  $y: number
}>`
  position: absolute;
  top: ${props => (props.$y / 620) * 100}%;
  left: ${props => (props.$x / 800) * 100}%;
  transform: translate(-50%, -50%);
`

const DistrictLabel = styled.div<{
  $x: number
  $y: number
}>`
  ${labelPosition}
  z-index: 2;
  pointer-events: none;
  color: var(--color-text-700);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  text-shadow: 0 1px 2px var(--color-surface);
  white-space: nowrap;
`

const RankedDistrictLabel = styled.button<{
  $selected: boolean
  $x: number
  $y: number
}>`
  ${labelPosition}
  z-index: ${props => (props.$selected ? 4 : 3)};
  min-width: 38px;
  min-height: 34px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 4px 6px;
  border: ${props => (props.$selected ? '3px' : '1px')} solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-300)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-800)'};
  box-shadow: var(--shadow-level-1);
  cursor: pointer;
  pointer-events: auto;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
    background: var(--color-primary-100);
    color: var(--color-primary-700);
  }

  &:focus-visible {
    outline: 2px solid var(--color-blue-500);
    outline-offset: 2px;
  }
`

const RankDistrictName = styled.span`
  font-size: 10px;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
`

const RankNumber = styled.span`
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
`

const Caption = styled.figcaption`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
`

const getBackgroundActionLabel = (action: 'expand' | 'collapse') =>
  action === 'expand'
    ? '지도를 눌러 구별 현황 바텀시트 펼치기'
    : '지도를 더 보기 위해 구별 현황 바텀시트 최소화'

const TOP_TEN_LABEL_BOX = {
  width: 86,
  height: 76,
} as const

const TOP_TEN_LABEL_SAFE_BOUNDS = {
  minX: TOP_TEN_LABEL_BOX.width / 2,
  maxX: 800 - TOP_TEN_LABEL_BOX.width / 2,
  minY: TOP_TEN_LABEL_BOX.height / 2,
  maxY: 620 - TOP_TEN_LABEL_BOX.height / 2,
} as const

const TOP_TEN_LABEL_CANDIDATE_OFFSETS = Array.from(
  { length: 9 * 9 },
  (_, index) => {
    const gridX = (index % 9) - 4
    const gridY = Math.floor(index / 9) - 4

    return {
      x: gridX * TOP_TEN_LABEL_BOX.width,
      y: gridY * TOP_TEN_LABEL_BOX.height,
    }
  },
).sort((first, second) => {
  const firstDistance = first.x ** 2 + first.y ** 2
  const secondDistance = second.x ** 2 + second.y ** 2

  return (
    firstDistance - secondDistance || first.y - second.y || first.x - second.x
  )
})

export type PositionedStatusMapTopTenLabel = {
  districtCode: string
  rank: number
  originalX: number
  originalY: number
  displayX: number
  displayY: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const hasTopTenLabelCollision = (
  candidate: Pick<PositionedStatusMapTopTenLabel, 'displayX' | 'displayY'>,
  positionedLabels: readonly PositionedStatusMapTopTenLabel[],
) =>
  positionedLabels.some(
    label =>
      Math.abs(candidate.displayX - label.displayX) < TOP_TEN_LABEL_BOX.width &&
      Math.abs(candidate.displayY - label.displayY) < TOP_TEN_LABEL_BOX.height,
  )

export function layoutStatusMapTopTenLabels(
  labels: readonly StatusMapLabel[],
): PositionedStatusMapTopTenLabel[] {
  const rankedLabels = labels
    .filter(
      (label): label is StatusMapLabel & { rank: number } =>
        label.isTopTen && label.rank !== null,
    )
    .sort(
      (first, second) =>
        first.rank - second.rank ||
        first.districtCode.localeCompare(second.districtCode),
    )
  const positionedLabels: PositionedStatusMapTopTenLabel[] = []

  for (const label of rankedLabels) {
    const position = TOP_TEN_LABEL_CANDIDATE_OFFSETS.map(offset => ({
      displayX: clamp(
        label.x + offset.x,
        TOP_TEN_LABEL_SAFE_BOUNDS.minX,
        TOP_TEN_LABEL_SAFE_BOUNDS.maxX,
      ),
      displayY: clamp(
        label.y + offset.y,
        TOP_TEN_LABEL_SAFE_BOUNDS.minY,
        TOP_TEN_LABEL_SAFE_BOUNDS.maxY,
      ),
    })).find(candidate => !hasTopTenLabelCollision(candidate, positionedLabels))

    if (!position) {
      throw new Error('Top10 지도 라벨을 충돌 없이 배치할 수 없습니다.')
    }

    positionedLabels.push({
      districtCode: label.districtCode,
      rank: label.rank,
      originalX: label.x,
      originalY: label.y,
      ...position,
    })
  }

  return positionedLabels
}

export default function StatusMap({
  metric,
  items,
  selectedDistrictCode,
  onSelect,
  onBackgroundClick,
  backgroundAction,
}: StatusMapProps) {
  const labels = createStatusMapLabels(items, SEOUL_STATUS_FEATURES, districts)
  const topTenLabelPositions = layoutStatusMapTopTenLabels(labels)
  const topTenLabelPositionsByDistrictCode = new Map(
    topTenLabelPositions.map(position => [position.districtCode, position]),
  )
  const selectedFeature = findSelectedStatusMapFeature(
    SEOUL_STATUS_FEATURES,
    selectedDistrictCode,
  )

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
        <MapViewport data-status-map-label-viewport="800x620">
          <SeoulSilhouette
            aria-hidden="true"
            data-status-map-shape-layer="800x620"
            preserveAspectRatio="xMidYMid meet"
            viewBox={SEOUL_STATUS_VIEW_BOX}
          >
            {SEOUL_STATUS_FEATURES.map(feature => (
              <DistrictPath
                key={feature.districtCode}
                d={feature.path}
                data-status-district-path={feature.districtCode}
              />
            ))}
            {selectedFeature ? (
              <SelectedDistrictPath
                d={selectedFeature.path}
                data-selected-district-code={selectedFeature.districtCode}
              />
            ) : null}
            {topTenLabelPositions.map(position =>
              position.originalX === position.displayX &&
              position.originalY === position.displayY ? null : (
                <LabelLeaderLine
                  key={position.districtCode}
                  d={`M ${position.originalX} ${position.originalY} L ${position.displayX} ${position.displayY}`}
                  data-status-label-leader={position.districtCode}
                />
              ),
            )}
          </SeoulSilhouette>
          <MapLabelLayer data-status-map-label-layer="800x620">
            {labels.map(label => {
              const isSelected = label.districtCode === selectedDistrictCode
              const topTenLabelPosition =
                topTenLabelPositionsByDistrictCode.get(label.districtCode)
              const displayX = topTenLabelPosition?.displayX ?? label.x
              const displayY = topTenLabelPosition?.displayY ?? label.y

              if (!label.isTopTen || label.rank === null) {
                return (
                  <DistrictLabel
                    key={label.districtCode}
                    $x={displayX}
                    $y={displayY}
                    data-status-district-label={label.districtCode}
                  >
                    {label.districtName}
                  </DistrictLabel>
                )
              }

              return (
                <RankedDistrictLabel
                  key={label.districtCode}
                  $selected={isSelected}
                  $x={displayX}
                  $y={displayY}
                  aria-label={`${label.rank}위 ${label.districtName}, ${METRIC_LABELS[metric]} 기준`}
                  aria-pressed={isSelected}
                  data-status-district-label={label.districtCode}
                  type="button"
                  onClick={() => onSelect(label.districtCode)}
                >
                  <RankDistrictName>{label.districtName}</RankDistrictName>
                  <RankNumber data-status-rank={label.rank}>
                    {label.rank}
                  </RankNumber>
                </RankedDistrictLabel>
              )
            })}
          </MapLabelLayer>
        </MapViewport>
      </MapCanvas>
      <Caption>
        구 이름 아래 숫자는 {METRIC_LABELS[metric]} 기준 Top10 순위입니다.
      </Caption>
    </Figure>
  )
}
