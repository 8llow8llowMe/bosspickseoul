'use client'

import styled from 'styled-components'
import {
  SEOUL_STATUS_FEATURES,
  SEOUL_STATUS_VIEW_BOX,
} from '@/data/seoul-status-map'
import {
  createStatusMapMarkers,
  findSelectedStatusMapFeature,
  type StatusMapMarker,
} from '@/lib/status/status-map-model'
import { formatStatusValue } from '@/lib/status/status-formatters'
import type { StatusMetric, StatusRankedItem } from '@/types/status'

type StatusMapProps = {
  metric: StatusMetric
  items: StatusRankedItem[]
  selectedDistrictCode: string | null
  onSelect: (districtCode: string) => void
  onBackgroundClick?: () => void
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
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
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
  stroke: none;
`

const SelectedDistrictPath = styled.path`
  fill: var(--color-primary-600);
  fill-opacity: 0.5;
  stroke: var(--color-primary-600);
  stroke-width: 3px;
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

const MarkerButton = styled.button<{
  $selected: boolean
  $x: number
  $y: number
}>`
  position: absolute;
  z-index: ${props => (props.$selected ? 3 : 2)};
  top: ${props => (props.$y / 620) * 100}%;
  left: ${props => (props.$x / 800) * 100}%;
  width: ${props => (props.$selected ? '52px' : '44px')};
  height: ${props => (props.$selected ? '52px' : '44px')};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: ${props => (props.$selected ? '3px' : '1px')} solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-300)'};
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text-800);
  box-shadow: var(--shadow-level-1);
  font-size: ${props => (props.$selected ? '15px' : '13px')};
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition:
    width var(--motion-fast) var(--ease-standard),
    height var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-text-900);
  }
`

const Caption = styled.figcaption`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
`

const EmptyMessage = styled.p`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--color-text-600);
  font-size: 14px;
`

const getMarkerLabel = (metric: StatusMetric, marker: StatusMapMarker) =>
  `${marker.rank}위 ${marker.districtName}, ${METRIC_LABELS[metric]} ${formatStatusValue(metric, marker.value)}`

export default function StatusMap({
  metric,
  items,
  selectedDistrictCode,
  onSelect,
  onBackgroundClick,
}: StatusMapProps) {
  const markers = createStatusMapMarkers(items, SEOUL_STATUS_FEATURES)
  const selectedFeature = findSelectedStatusMapFeature(
    SEOUL_STATUS_FEATURES,
    selectedDistrictCode,
  )

  return (
    <Figure>
      <MapCanvas>
        {onBackgroundClick ? (
          <MapBackgroundButton
            aria-label="지도를 더 보기 위해 구별 현황 바텀시트 최소화"
            type="button"
            onClick={onBackgroundClick}
          />
        ) : null}
        <SeoulSilhouette
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
          viewBox={SEOUL_STATUS_VIEW_BOX}
        >
          {SEOUL_STATUS_FEATURES.map(feature => (
            <DistrictPath key={feature.districtCode} d={feature.path} />
          ))}
          {selectedFeature ? (
            <SelectedDistrictPath
              d={selectedFeature.path}
              data-selected-district-code={selectedFeature.districtCode}
            />
          ) : null}
        </SeoulSilhouette>
        {markers.map(marker => {
          const isSelected = marker.districtCode === selectedDistrictCode

          return (
            <MarkerButton
              key={marker.districtCode}
              $selected={isSelected}
              $x={marker.x}
              $y={marker.y}
              aria-label={getMarkerLabel(metric, marker)}
              aria-pressed={isSelected}
              type="button"
              onClick={() => onSelect(marker.districtCode)}
            >
              {marker.rank}
            </MarkerButton>
          )
        })}
        {markers.length === 0 ? <EmptyMessage>데이터 없음</EmptyMessage> : null}
      </MapCanvas>
      <Caption>지도의 숫자는 {METRIC_LABELS[metric]} 기준 순위입니다.</Caption>
    </Figure>
  )
}
