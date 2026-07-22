import type { StatusMetric } from '@/types/status'

const STATUS_METRICS: readonly StatusMetric[] = [
  'footTraffic',
  'sales',
  'opened',
  'closed',
]

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
