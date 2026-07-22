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
  threshold: number,
): StatusSheetSnap => {
  if (deltaY < -threshold) {
    return getNextSheetSnap(startSnap, 'expand')
  }

  if (deltaY > threshold) {
    return getNextSheetSnap(startSnap, 'collapse')
  }

  return startSnap
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
  metric: StatusMetric,
  districtCode: string | null,
): URLSearchParams => {
  const query = new URLSearchParams({ metric })

  if (districtCode) {
    query.set('district', districtCode)
  }

  return query
}
