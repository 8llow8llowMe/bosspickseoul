import type { DistrictRecord } from '@/data/districts'
import type {
  StatusMetric,
  StatusRankedItem,
  StatusSelectedDistrict,
} from '@/types/status'

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

export const STATUS_SHEET_COLLAPSED_HEIGHT = 52
export const STATUS_SHEET_EXPANDED_RATIO = 0.6
// 지도를 상단 정렬로 두므로, 펼친 시트가 지도를 가리지 않도록 지도 몫을 크게 잡는다.
export const STATUS_SHEET_MINIMUM_MAP_HEIGHT = 290

export const createStatusHref = (
  pathname: string,
  query: URLSearchParams,
  hash: string,
): string => {
  const queryString = query.toString()
  const hashSuffix = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : ''

  return `${pathname}${queryString ? `?${queryString}` : ''}${hashSuffix}`
}

export const getStatusSheetHeightBounds = (
  statusViewportHeight: number,
): { collapsedHeight: number; expandedHeight: number } => {
  if (!Number.isFinite(statusViewportHeight) || statusViewportHeight <= 0) {
    return {
      collapsedHeight: STATUS_SHEET_COLLAPSED_HEIGHT,
      expandedHeight: STATUS_SHEET_COLLAPSED_HEIGHT,
    }
  }

  return {
    collapsedHeight: STATUS_SHEET_COLLAPSED_HEIGHT,
    expandedHeight: Math.max(
      STATUS_SHEET_COLLAPSED_HEIGHT,
      Math.min(
        statusViewportHeight * STATUS_SHEET_EXPANDED_RATIO,
        statusViewportHeight - STATUS_SHEET_MINIMUM_MAP_HEIGHT,
      ),
    ),
  }
}

export const getNextSheetSnap = (
  current: StatusSheetSnap,
  action: 'expand' | 'collapse',
): StatusSheetSnap => {
  if (action === 'expand') {
    return current === 'collapsed' ? 'expanded' : current
  }

  return current === 'expanded' ? 'collapsed' : current
}

export const applyStatusSheetContentTransition = ({
  body,
  backButton,
  handle,
  isShowingDetail,
}: {
  body: StatusSheetBodyTarget | null
  backButton: StatusSheetFocusTarget | null
  handle: StatusSheetFocusTarget | null
  isShowingDetail: boolean
}): void => {
  if (body) {
    body.scrollTop = 0
  }

  const focusTarget = isShowingDetail ? backButton : handle

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

/**
 * `?district=` 가 **서울 자치구 코드**면 그대로, 아니면 null 로 정규화한다.
 *
 * 예전에는 현재 지표 Top10 에 든 구만 남겼다. 그래서 순위 밖 15개 구는 지도에서 눌러도
 * 반응이 없었고, 지표 탭을 바꾸면 보던 구가 새 Top10 에 없다는 이유로 선택이 풀렸다.
 * 상세(`GET /districts/{code}`)는 구 단위라 지표와 무관하다 — 선택도 지표와 떼어 둔다.
 */
export const normalizeStatusSelection = (
  districtCode: string | null | undefined,
  districtCodes: readonly string[],
): string | null =>
  districtCode && districtCodes.includes(districtCode) ? districtCode : null

/**
 * 선택한 구를 상세가 그릴 모양으로 만든다. 현재 지표 Top10 에 있으면 순위 항목을
 * 붙이고, 없으면 `rankedItem: null` 이다(상세 머리가 「상위 10위 밖」으로 적는다).
 * 이름은 순위 항목보다 정적 표를 먼저 쓴다 — 순위 밖 구에는 순위 항목이 없다.
 */
export const resolveStatusSelectedDistrict = (
  districtCode: string | null,
  items: readonly StatusRankedItem[],
  districtRecords: ReadonlyArray<Pick<DistrictRecord, 'gooCode' | 'gooName'>>,
): StatusSelectedDistrict | null => {
  if (!districtCode) return null

  const rankedItem =
    items.find(item => item.districtCode === districtCode) ?? null
  const districtName =
    districtRecords.find(record => String(record.gooCode) === districtCode)
      ?.gooName ?? rankedItem?.districtName

  if (!districtName) return null

  return { districtCode, districtName, rankedItem }
}

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
