import type { DistrictRecord } from '@/data/districts'
import { readAnalysisPeriod } from '@/lib/analysis/period-catalog'
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

/**
 * 시트 3단(status.md 1.4). `full` 은 상세를 길게 읽는 단계라 끌어 올려서만 간다.
 */
export type StatusSheetSnap = 'collapsed' | 'expanded' | 'full'

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
// 펼친 시트 위에 지도가 남을 최소 몫. 지도는 이 자리에 맞춰 줄어든다(status.md 1.4).
// 무대가 이보다 작으면(가로로 눕힌 폰 등) 펼침이 접힘과 같아지고 전체 단계만 남는다.
export const STATUS_SHEET_MINIMUM_MAP_HEIGHT = 290
// 전체 펼침에서도 무대 위 끝을 조금 남겨 시트가 화면 전체를 덮은 것처럼 보이지 않게 한다.
export const STATUS_SHEET_FULL_TOP_GAP = 12

export type StatusSheetHeightBounds = {
  collapsedHeight: number
  expandedHeight: number
  fullHeight: number
}

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
): StatusSheetHeightBounds => {
  if (!Number.isFinite(statusViewportHeight) || statusViewportHeight <= 0) {
    return {
      collapsedHeight: STATUS_SHEET_COLLAPSED_HEIGHT,
      expandedHeight: STATUS_SHEET_COLLAPSED_HEIGHT,
      fullHeight: STATUS_SHEET_COLLAPSED_HEIGHT,
    }
  }

  const expandedHeight = Math.max(
    STATUS_SHEET_COLLAPSED_HEIGHT,
    Math.min(
      statusViewportHeight * STATUS_SHEET_EXPANDED_RATIO,
      statusViewportHeight - STATUS_SHEET_MINIMUM_MAP_HEIGHT,
    ),
  )

  return {
    collapsedHeight: STATUS_SHEET_COLLAPSED_HEIGHT,
    expandedHeight,
    fullHeight: Math.max(
      expandedHeight,
      statusViewportHeight - STATUS_SHEET_FULL_TOP_GAP,
    ),
  }
}

const STATUS_SHEET_SNAP_ORDER: readonly StatusSheetSnap[] = [
  'collapsed',
  'expanded',
  'full',
]

/** 한 단계 펼치거나 접는다. 끝 단계에서는 그대로다. */
export const getNextSheetSnap = (
  current: StatusSheetSnap,
  action: 'expand' | 'collapse',
): StatusSheetSnap => {
  const index = STATUS_SHEET_SNAP_ORDER.indexOf(current)
  const nextIndex = action === 'expand' ? index + 1 : index - 1

  return STATUS_SHEET_SNAP_ORDER[
    Math.min(STATUS_SHEET_SNAP_ORDER.length - 1, Math.max(0, nextIndex))
  ]
}

/**
 * 손잡이·지도 배경 탭. 접혀 있으면 펼치고, 그 밖에는 한 단계 접는다. `full` 은 끌어서만
 * 간다 — 탭 한 번에 지도가 통째로 가려지면 놀란다.
 */
export const getToggledSheetSnap = (
  current: StatusSheetSnap,
): StatusSheetSnap =>
  current === 'collapsed' ? 'expanded' : getNextSheetSnap(current, 'collapse')

type StatusSheetRowTarget = StatusSheetFocusTarget & {
  scrollIntoView?: (options?: ScrollIntoViewOptions) => void
}

/**
 * 시트 본문이 목록 ↔ 상세로 바뀔 때 스크롤과 포커스를 옮긴다.
 *
 * 상세로 갈 때는 맨 위(머리)부터 보이고 뒤로가기 버튼에 포커스가 간다. 목록으로 돌아올 때 **방금 보던 구의
 * 행(`returnRow`)이 목록에 있으면** 그 행이 보이게 스크롤하고 포커스를 돌려준다 — 25개 구로 펼친 목록의
 * 20위를 보다 돌아왔는데 맨 위로 튀면 어디를 보고 있었는지 잃는다(#565 리뷰). 행이 없으면(지도에서 고른
 * 순위 밖 구, 접힌 목록의 11위 이하) 예전처럼 맨 위로 올리고 손잡이에 포커스를 둔다.
 */
export const applyStatusSheetContentTransition = ({
  body,
  backButton,
  handle,
  isShowingDetail,
  returnRow = null,
}: {
  body: StatusSheetBodyTarget | null
  backButton: StatusSheetFocusTarget | null
  handle: StatusSheetFocusTarget | null
  isShowingDetail: boolean
  returnRow?: StatusSheetRowTarget | null
}): void => {
  if (body) {
    body.scrollTop = 0
  }

  if (!isShowingDetail && returnRow) {
    returnRow.scrollIntoView?.({ block: 'nearest' })
    returnRow.focus({ preventScroll: true })
    return
  }

  const focusTarget = isShowingDetail ? backButton : handle

  focusTarget?.focus({ preventScroll: true })
}

/**
 * 끌어 놓은 높이에서 **가장 가까운 단계**로 붙인다. 같은 거리면 높은 단계다(예전 2단의
 * 「중간점이면 펼침」과 같은 규칙).
 */
export const resolveSheetSnapFromDrag = (
  startSnap: StatusSheetSnap,
  deltaY: number,
  bounds: StatusSheetHeightBounds,
): StatusSheetSnap => {
  const { collapsedHeight, expandedHeight, fullHeight } = bounds

  if (
    !Number.isFinite(deltaY) ||
    !Number.isFinite(collapsedHeight) ||
    !Number.isFinite(expandedHeight) ||
    !Number.isFinite(fullHeight) ||
    collapsedHeight <= 0 ||
    expandedHeight < collapsedHeight ||
    fullHeight <= collapsedHeight
  ) {
    return startSnap
  }

  const heights: Record<StatusSheetSnap, number> = {
    collapsed: collapsedHeight,
    expanded: expandedHeight,
    full: Math.max(fullHeight, expandedHeight),
  }
  const draggedHeight = Math.min(
    heights.full,
    Math.max(collapsedHeight, heights[startSnap] - deltaY),
  )

  return [...STATUS_SHEET_SNAP_ORDER]
    .reverse()
    .reduce((best, snap) =>
      Math.abs(heights[snap] - draggedHeight) <
      Math.abs(heights[best] - draggedHeight)
        ? snap
        : best,
    )
}

/**
 * 지금 그릴 시트 단계. 시트 상태는 「어느 구를 볼 때의 단계」로 기록한다 — 링크·뒤로가기로
 * 다른 구가 열리면 기록이 그 구와 맞지 않는다. 그때 **접혀 있었으면 펼치고, 아니면 기록한 단계를
 * 그대로 쓴다.** 예전엔 무조건 펼침으로 떨어뜨려, 전체 단계에서 구를 고르면 URL 이 따라오기
 * 전 한 번의 렌더 동안 시트가 펼침으로 내려갔다 다시 올라왔다.
 */
export const resolveStatusSheetSnap = (
  state: StatusSheetState,
  selectedDistrictCode: string | null,
): StatusSheetSnap =>
  state.districtCode === selectedDistrictCode || state.snap !== 'collapsed'
    ? state.snap
    : 'expanded'

export const parseStatusMetric = (value: unknown): StatusMetric =>
  typeof value === 'string' && STATUS_METRICS.includes(value as StatusMetric)
    ? (value as StatusMetric)
    : 'footTraffic'

/**
 * `?periodCode=` 를 기준 분기로 읽는다. 형식이 틀리거나 2021년보다 이르면 null(= 「최신」)이다 — 손편집·
 * 낡은 링크의 코드로 백엔드를 때릴 이유가 없다(status.md 1.6). 서버 기본 분기보다 새 분기는 카탈로그가
 * 온 뒤 최신으로 내린다(`resolveAnalysisPeriod`, period-catalog.md D5-1).
 */
export const parseStatusPeriod = (
  value: string | null | undefined,
): string | null => readAnalysisPeriod(value)

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
 * 선택한 구를 상세가 그릴 모양으로 만든다. `items` 는 현재 지표의 25개 구 전체 순위라 Top10 밖
 * 구에도 순위 항목이 붙는다. 그 분기 행이 없어 순위에서 빠진 구만 `rankedItem: null` 이다(상세
 * 머리가 「{지표} 데이터 없음」으로 적는다).
 * 이름은 순위 항목보다 정적 표를 먼저 쓴다 — 순위에서 빠진 구에는 순위 항목이 없다.
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

/**
 * 순위 목록을 25개 구 모두 펼쳤는지(#565). `?list=all` 이 정본이다 — 상세를 열었다가 돌아오거나
 * 뒤로가기·새로고침을 해도 펼친 목록이 그대로다. 다른 값은 「접힘」으로 읽는다.
 */
export const STATUS_LIST_PARAM = 'list'
const STATUS_LIST_EXPANDED_VALUE = 'all'

export const parseStatusListExpanded = (
  value: string | null | undefined,
): boolean => value === STATUS_LIST_EXPANDED_VALUE

/**
 * 목록 펼침만 바꾼 쿼리. 지표·구·분기는 그대로 둔다. 접힘이 기본이라 URL 에 적지 않는다.
 */
export const createStatusListQuery = (
  currentQuery: URLSearchParams,
  isExpanded: boolean,
): URLSearchParams => {
  const query = new URLSearchParams(currentQuery)

  if (isExpanded) {
    query.set(STATUS_LIST_PARAM, STATUS_LIST_EXPANDED_VALUE)
  } else {
    query.delete(STATUS_LIST_PARAM)
  }

  return query
}

export const createStatusQuery = (
  currentQuery: URLSearchParams,
  metric: StatusMetric,
  districtCode: string | null,
  periodCode: string | null,
): URLSearchParams => {
  const query = new URLSearchParams(currentQuery)

  query.set('metric', metric)

  if (districtCode) {
    query.set('district', districtCode)
  } else {
    query.delete('district')
  }

  // `/status` 는 「최신 분기 현황」이다. 최신(null)은 적지 않고 고른 분기만 남긴다. 최신 분기를 고르면
  // 부르는 쪽이 null 을 넘긴다(status-page `handlePeriodChange`).
  if (periodCode === null) {
    query.delete('periodCode')
  } else {
    query.set('periodCode', periodCode)
  }

  // 손편집한 `?list=` 값(`all` 이 아닌 것)은 접힘이다 — URL 에 남겨 두지 않는다.
  if (!parseStatusListExpanded(query.get(STATUS_LIST_PARAM))) {
    query.delete(STATUS_LIST_PARAM)
  }

  return query
}
