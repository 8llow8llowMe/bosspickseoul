import type { StatusMetric } from '@/types/status'

const STATUS_METRICS: readonly StatusMetric[] = [
  'footTraffic',
  'sales',
  'opened',
  'closed',
]

export type StatusSheetSnap = 'collapsed' | 'expanded'

export const getNextSheetSnap = (
  current: StatusSheetSnap,
  action: 'expand' | 'collapse',
): StatusSheetSnap => {
  if (action === 'expand') {
    return current === 'collapsed' ? 'expanded' : current
  }

  return current === 'expanded' ? 'collapsed' : current
}

export const resolveSheetSnapFromDrag = (
  startSnap: StatusSheetSnap,
  deltaY: number,
  collapsedHeight: number,
  expandedHeight: number,
): StatusSheetSnap => {
  if (
    !Number.isFinite(deltaY) ||
    !Number.isFinite(collapsedHeight) ||
    !Number.isFinite(expandedHeight) ||
    collapsedHeight <= 0 ||
    expandedHeight <= collapsedHeight
  ) {
    return startSnap
  }

  const startHeight =
    startSnap === 'expanded' ? expandedHeight : collapsedHeight
  const draggedHeight = Math.min(
    expandedHeight,
    Math.max(collapsedHeight, startHeight - deltaY),
  )
  const midpoint = (collapsedHeight + expandedHeight) / 2

  return draggedHeight >= midpoint ? 'expanded' : 'collapsed'
}

export const parseStatusMetric = (value: unknown): StatusMetric =>
  typeof value === 'string' && STATUS_METRICS.includes(value as StatusMetric)
    ? (value as StatusMetric)
    : 'footTraffic'

export const normalizeStatusSelection = (
  districtCode: string | null | undefined,
  topTenCodes: readonly string[],
): string | null =>
  districtCode && topTenCodes.includes(districtCode) ? districtCode : null

export const createStatusQuery = (
  currentQuery: URLSearchParams,
  metric: StatusMetric,
  districtCode: string | null,
): URLSearchParams => {
  const query = new URLSearchParams(currentQuery)

  query.set('metric', metric)

  if (districtCode) {
    query.set('district', districtCode)
  } else {
    query.delete('district')
  }

  return query
}
