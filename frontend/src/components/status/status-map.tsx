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
  text-shadow:
    0 0 2px var(--color-surface),
    0 1px 2px var(--color-surface);
  white-space: nowrap;

  /* 좁은 지도 캔버스(모바일·태블릿)에서 비Top10 구 이름이 겹치지 않게 축소한다. */
  @container (max-width: 460px) {
    font-size: 9.5px;
  }
`

// 1~3위 배지는 success green(--color-green-500)으로 강조한다(1위 가장 진하고
// 3위로 갈수록 연하게). green은 DESIGN.md에서 'HIGH 등급/긍정 지표'의 semantic
// 색이라 상위 순위와 의미가 맞고, 선택(primary blue)과 색상이 겹치지 않는다.
const RANK_ACCENT = 'var(--color-green-500)'
const TOP_RANK_FILL: Record<number, string> = {
  1: `color-mix(in srgb, ${RANK_ACCENT} 24%, var(--color-surface))`,
  2: `color-mix(in srgb, ${RANK_ACCENT} 15%, var(--color-surface))`,
  3: `color-mix(in srgb, ${RANK_ACCENT} 8%, var(--color-surface))`,
}

const RankedDistrictLabel = styled.button<{
  $selected: boolean
  $rank: number | null
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
    ${props => {
      if (props.$selected) return 'var(--color-primary-600)'
      if (props.$rank && props.$rank <= 3)
        return `color-mix(in srgb, ${RANK_ACCENT} 55%, var(--color-border-300))`
      return 'var(--color-border-300)'
    }};
  border-radius: var(--radius-control);
  background: ${props => {
    if (props.$selected) return 'var(--color-primary-100)'
    if (props.$rank && TOP_RANK_FILL[props.$rank])
      return TOP_RANK_FILL[props.$rank]
    return 'var(--color-surface)'
  }};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-900)'};
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

  /* 좁은 지도 캔버스에서 순위 배지 크기를 줄여 겹침을 완화한다. */
  @container (max-width: 460px) {
    min-width: 32px;
    min-height: 28px;
    padding: 3px 4px;
  }
`

const RankDistrictName = styled.span`
  font-size: 10px;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;

  @container (max-width: 460px) {
    font-size: 9px;
  }
`

const RankNumber = styled.span`
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;

  @container (max-width: 460px) {
    font-size: 12px;
  }
`

const getBackgroundActionLabel = (action: 'expand' | 'collapse') =>
  action === 'expand'
    ? '지도를 눌러 구별 현황 바텀시트 펼치기'
    : '지도를 더 보기 위해 구별 현황 바텀시트 최소화'

const STATUS_MAP_VIEW_BOX_SIZE = {
  width: 800,
  height: 620,
} as const

// 최소 지원 375px 뷰포트에서 좌우 여백을 제외한 지도 내부 폭입니다.
const MINIMUM_SUPPORTED_MOBILE_VIEWPORT_WIDTH_PX = 375
const MINIMUM_SUPPORTED_MOBILE_HORIZONTAL_GUTTER_PX = 16
const MINIMUM_SUPPORTED_MOBILE_INNER_MAP_WIDTH_PX =
  MINIMUM_SUPPORTED_MOBILE_VIEWPORT_WIDTH_PX -
  2 * MINIMUM_SUPPORTED_MOBILE_HORIZONTAL_GUTTER_PX
const SELECTED_FOUR_CHARACTER_RANK_LABEL_SIZE_PX = {
  width: 52.58,
  height: 39,
} as const
const RANK_LABEL_FOCUS_OUTLINE_WIDTH_PX = 2
const RANK_LABEL_FOCUS_OUTLINE_OFFSET_PX = 2
const RANK_LABEL_FOCUS_OUTSET_PX =
  RANK_LABEL_FOCUS_OUTLINE_WIDTH_PX + RANK_LABEL_FOCUS_OUTLINE_OFFSET_PX

const TOP_TEN_LABEL_COLLISION_FOOTPRINT = {
  width: Math.ceil(
    ((SELECTED_FOUR_CHARACTER_RANK_LABEL_SIZE_PX.width +
      2 * RANK_LABEL_FOCUS_OUTSET_PX) /
      MINIMUM_SUPPORTED_MOBILE_INNER_MAP_WIDTH_PX) *
      STATUS_MAP_VIEW_BOX_SIZE.width,
  ),
  height: Math.ceil(
    ((SELECTED_FOUR_CHARACTER_RANK_LABEL_SIZE_PX.height +
      2 * RANK_LABEL_FOCUS_OUTSET_PX) /
      MINIMUM_SUPPORTED_MOBILE_INNER_MAP_WIDTH_PX) *
      STATUS_MAP_VIEW_BOX_SIZE.width,
  ),
} as const

const TOP_TEN_LABEL_SAFE_BOUNDS = {
  minX: TOP_TEN_LABEL_COLLISION_FOOTPRINT.width / 2,
  maxX:
    STATUS_MAP_VIEW_BOX_SIZE.width -
    TOP_TEN_LABEL_COLLISION_FOOTPRINT.width / 2,
  minY: TOP_TEN_LABEL_COLLISION_FOOTPRINT.height / 2,
  maxY:
    STATUS_MAP_VIEW_BOX_SIZE.height -
    TOP_TEN_LABEL_COLLISION_FOOTPRINT.height / 2,
} as const

const TOP_TEN_LABEL_CANDIDATE_GRID_RADIUS = 4
const TOP_TEN_LABEL_CANDIDATE_GRID_SIZE =
  TOP_TEN_LABEL_CANDIDATE_GRID_RADIUS * 2 + 1
// 실제 지도는 현재 Top10만 전역 탐색합니다.
const TOP_TEN_LABEL_EXACT_SEARCH_MAX_LABELS = 10
// 렌더 경로에서 탐색 시간을 고정하기 위한 결정적 backtracking 상한입니다.
const TOP_TEN_LABEL_EXACT_SEARCH_NODE_BUDGET = 25_000

const TOP_TEN_LABEL_CANDIDATE_OFFSETS = Array.from(
  {
    length:
      TOP_TEN_LABEL_CANDIDATE_GRID_SIZE * TOP_TEN_LABEL_CANDIDATE_GRID_SIZE,
  },
  (_, index) => {
    const gridX =
      (index % TOP_TEN_LABEL_CANDIDATE_GRID_SIZE) -
      TOP_TEN_LABEL_CANDIDATE_GRID_RADIUS
    const gridY =
      Math.floor(index / TOP_TEN_LABEL_CANDIDATE_GRID_SIZE) -
      TOP_TEN_LABEL_CANDIDATE_GRID_RADIUS

    return {
      x: gridX * TOP_TEN_LABEL_COLLISION_FOOTPRINT.width,
      y: gridY * TOP_TEN_LABEL_COLLISION_FOOTPRINT.height,
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

type TopTenLabelCandidate = Pick<
  PositionedStatusMapTopTenLabel,
  'displayX' | 'displayY'
>

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const hasTopTenLabelCollision = (
  candidate: TopTenLabelCandidate,
  positionedLabels: readonly PositionedStatusMapTopTenLabel[],
) =>
  positionedLabels.some(
    label =>
      Math.abs(candidate.displayX - label.displayX) <
        TOP_TEN_LABEL_COLLISION_FOOTPRINT.width &&
      Math.abs(candidate.displayY - label.displayY) <
        TOP_TEN_LABEL_COLLISION_FOOTPRINT.height,
  )

const createTopTenLabelCandidates = (
  label: Pick<StatusMapLabel, 'x' | 'y'>,
): TopTenLabelCandidate[] => {
  const candidateKeys = new Set<string>()

  return TOP_TEN_LABEL_CANDIDATE_OFFSETS.flatMap(offset => {
    const candidate = {
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
    }
    const candidateKey = `${candidate.displayX}:${candidate.displayY}`

    if (candidateKeys.has(candidateKey)) return []

    candidateKeys.add(candidateKey)
    return [candidate]
  })
}

const toPositionedTopTenLabel = (
  label: StatusMapLabel & { rank: number },
  candidate: TopTenLabelCandidate,
): PositionedStatusMapTopTenLabel => ({
  districtCode: label.districtCode,
  rank: label.rank,
  originalX: label.x,
  originalY: label.y,
  ...candidate,
})

const countTopTenLabelCollisions = (
  candidate: TopTenLabelCandidate,
  positionedLabels: readonly PositionedStatusMapTopTenLabel[],
) =>
  positionedLabels.filter(label => hasTopTenLabelCollision(candidate, [label]))
    .length

const findBestEffortTopTenLabelPositions = (
  rankedLabels: readonly (StatusMapLabel & { rank: number })[],
  candidatesByLabel: readonly TopTenLabelCandidate[][],
) => {
  const positionedLabels: PositionedStatusMapTopTenLabel[] = []

  for (const [index, label] of rankedLabels.entries()) {
    const candidates = candidatesByLabel[index]
    const bestCandidate = candidates.reduce((best, candidate) =>
      countTopTenLabelCollisions(candidate, positionedLabels) <
      countTopTenLabelCollisions(best, positionedLabels)
        ? candidate
        : best,
    )

    positionedLabels.push(toPositionedTopTenLabel(label, bestCandidate))
  }

  return positionedLabels
}

const findExactTopTenLabelPositions = (
  rankedLabels: readonly (StatusMapLabel & { rank: number })[],
  candidatesByLabel: readonly TopTenLabelCandidate[][],
): PositionedStatusMapTopTenLabel[] | null => {
  if (rankedLabels.length > TOP_TEN_LABEL_EXACT_SEARCH_MAX_LABELS) {
    return null
  }

  const assignedLabels = Array<PositionedStatusMapTopTenLabel | undefined>(
    rankedLabels.length,
  )
  let visitedNodeCount = 0

  const search = (remainingIndexes: readonly number[]): boolean => {
    if (remainingIndexes.length === 0) return true
    if (visitedNodeCount >= TOP_TEN_LABEL_EXACT_SEARCH_NODE_BUDGET) return false

    const positionedLabels = assignedLabels.filter(
      (label): label is PositionedStatusMapTopTenLabel => label !== undefined,
    )
    const nextLabel = remainingIndexes
      .map(index => ({
        index,
        candidates: candidatesByLabel[index].filter(
          candidate => !hasTopTenLabelCollision(candidate, positionedLabels),
        ),
      }))
      .sort(
        (first, second) =>
          first.candidates.length - second.candidates.length ||
          rankedLabels[first.index].rank - rankedLabels[second.index].rank ||
          rankedLabels[first.index].districtCode.localeCompare(
            rankedLabels[second.index].districtCode,
          ),
      )[0]

    if (nextLabel.candidates.length === 0) return false

    const nextRemainingIndexes = remainingIndexes.filter(
      index => index !== nextLabel.index,
    )

    for (const candidate of nextLabel.candidates) {
      if (visitedNodeCount >= TOP_TEN_LABEL_EXACT_SEARCH_NODE_BUDGET) {
        return false
      }

      visitedNodeCount += 1
      assignedLabels[nextLabel.index] = toPositionedTopTenLabel(
        rankedLabels[nextLabel.index],
        candidate,
      )

      if (search(nextRemainingIndexes)) return true

      assignedLabels[nextLabel.index] = undefined
    }

    return false
  }

  const found = search(rankedLabels.map((_, index) => index))

  return found
    ? assignedLabels.filter(
        (label): label is PositionedStatusMapTopTenLabel => label !== undefined,
      )
    : null
}

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
  const candidatesByLabel = rankedLabels.map(createTopTenLabelCandidates)

  // 완전 해를 찾지 못해도 충돌 수가 가장 적은 결정적 배치를 반환합니다.
  return (
    findExactTopTenLabelPositions(rankedLabels, candidatesByLabel) ??
    findBestEffortTopTenLabelPositions(rankedLabels, candidatesByLabel)
  )
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
                  $rank={label.rank}
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
    </Figure>
  )
}
