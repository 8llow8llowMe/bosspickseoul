import type { StatusMetric } from '@/types/status'

const STATUS_METRICS: readonly StatusMetric[] = [
  'footTraffic',
  'sales',
  'opened',
  'closed',
]

export type StatusSheetSnap = 'collapsed' | 'expanded'

export type StatusSheetState = {
  districtCode: string | null
  snap: StatusSheetSnap
}

type StatusSheetFocusTarget = {
  focus: (options?: FocusOptions) => void
}

type StatusSheetBodyTarget = StatusSheetFocusTarget & {
  scrollTop: number
}

export const STATUS_SHEET_COLLAPSED_RATIO = 0.54
const STATUS_SHEET_MINIMUM_MAP_HEIGHT = 180
// Below about 391px, `height - 180px` constrains both 54% and 72% snaps
// to the same height, so exposing expand/collapse would be misleading.
const STATUS_SHEET_TWO_SNAP_MINIMUM_HEIGHT =
  STATUS_SHEET_MINIMUM_MAP_HEIGHT / (1 - STATUS_SHEET_COLLAPSED_RATIO)

export const createStatusHref = (
  pathname: string,
  query: URLSearchParams,
  hash: string,
): string => {
  const queryString = query.toString()
  const hashSuffix = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : ''

  return `${pathname}${queryString ? `?${queryString}` : ''}${hashSuffix}`
}

export const isStatusSheetSingleSnap = (
  statusViewportHeight: number,
): boolean =>
  !Number.isFinite(statusViewportHeight) ||
  statusViewportHeight <= STATUS_SHEET_TWO_SNAP_MINIMUM_HEIGHT

export const getNextSheetSnap = (
  current: StatusSheetSnap,
  action: 'expand' | 'collapse',
): StatusSheetSnap => {
  if (action === 'expand') {
    return current === 'collapsed' ? 'expanded' : current
  }

  return current === 'expanded' ? 'collapsed' : current
}

export const canCollapseStatusSheetFromMap = (
  isSingleSnap: boolean,
  snap: StatusSheetSnap,
): boolean => !isSingleSnap && snap === 'expanded'

export const createCollapsedStatusSheetState = (
  districtCode: string | null,
): StatusSheetState => ({ districtCode, snap: 'collapsed' })

export const applyStatusSheetContentTransition = ({
  body,
  backButton,
  handle,
  isShowingDetail,
  isSingleSnap,
}: {
  body: StatusSheetBodyTarget | null
  backButton: StatusSheetFocusTarget | null
  handle: StatusSheetFocusTarget | null
  isShowingDetail: boolean
  isSingleSnap: boolean
}): void => {
  if (body) {
    body.scrollTop = 0
  }

  const focusTarget = isShowingDetail
    ? backButton
    : isSingleSnap
      ? body
      : handle

  focusTarget?.focus({ preventScroll: true })
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
