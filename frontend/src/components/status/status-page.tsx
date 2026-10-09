'use client'

import {
  type ComponentProps,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import styled, { keyframes } from 'styled-components'
import { fetchStatusDetail } from '@/lib/api/status'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { isApiSuccess } from '@/lib/api/response'
import {
  isStatusTopTenAllEmpty,
  normalizeStatusRankings,
  selectStatusTopTen,
} from '@/lib/status/status-adapter'
import {
  createStatusHref,
  createStatusQuery,
  getToggledSheetSnap,
  normalizeStatusSelection,
  parseStatusMetric,
  parseStatusPeriod,
  resolveStatusSelectedDistrict,
  resolveStatusSheetSnap,
  type StatusSheetState,
} from '@/lib/status/status-state'
import { statusQueryKeys } from '@/lib/status/status-query'
import { resolveAnalysisPeriod } from '@/lib/analysis/period-catalog'
import { useAnalysisPeriodCatalog } from '@/hooks/use-analysis-period-catalog'
import { useDistrictRankings } from '@/hooks/use-district-rankings'
import { districts } from '@/data/districts'
import {
  createStatusHighlightStore,
  useStatusHighlight,
  type StatusHighlightStore,
} from '@/lib/status/status-highlight-store'
import { SEOUL_STATUS_FEATURES } from '@/data/seoul-status-map'
import StatusDetail from './status-detail'
import StatusFeedback from './status-feedback'
import StatusMap from './status-map'
import StatusMetricTabs from './status-metric-tabs'
import StatusMobileSheet, { statusSheetHeightVars } from './status-mobile-sheet'
import StatusPeriodSelect from './status-period-select'
import StatusTopTen from './status-top-ten'
import { shellWidth } from '@/styles/layout'

const METRIC_TAB_ID_BASE = 'status-metric-tab'
const METRIC_PANEL_ID = 'status-metric-content'
const STATUS_PAGE_TITLE = '구별 상권 현황'
// 선택할 수 있는 구 = 지도에 그려진 25개 구. 현재 지표 순위와 무관하다.
const SELECTABLE_DISTRICT_CODES = SEOUL_STATUS_FEATURES.map(
  feature => feature.districtCode,
)
// 구별현황은 한 화면(100dvh - 헤더 65px)에 들어오도록 세로 flex로 구성하고,
// 지도/리스트가 남는 높이를 채우며 긴 패널은 내부 스크롤로 처리한다.
const Page = styled.main`
  width: 100%;
  height: calc(100dvh - 65px);
  padding: 20px 0 24px;
  display: flex;
  flex-direction: column;

  /* 1024px 미만은 지도 + 시트 무대가 화면 아래까지 붙는다(status.md 1.4). */
  @media (max-width: 1023px) {
    padding: 12px 0 0;
  }
`

const PageInner = styled.div`
  ${shellWidth}
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 1023px) {
    gap: 12px;
  }
`

/*
 * 좌측 패널이 조종석, 지도가 주인공이다(status.md 1.3 「화면 골격」).
 *
 * 예전엔 머리말(eyebrow·h1·설명문, 세로 약 130px)과 페이지 폭 전체의 지표 칩 카드가 지도·
 * 목록 위를 차지했다. 이제 h1 과 지표 전환은 좌측 열의 **고정 머리**(`head`)이고, 그 아래
 * 한 칸(`side`)을 목록 ↔ 상세가 번갈아 쓴다. 상세를 보는 중에도 지표를 바꿀 수 있어야
 * 「선택은 지표와 무관하다」가 의미가 있다.
 *
 * tablist 는 DOM 에 하나만 둔다(탭 id 가 겹치지 않게). 모바일은 같은 머리를 grid 영역으로
 * 맨 위에 올리고 지도 + 시트(`stage`)가 아래를 채운다.
 */
const Layout = styled.div`
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: clamp(340px, 32%, 440px) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-areas:
    'head map'
    'side map';
  column-gap: 20px;

  @media (max-width: 1023px) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'head'
      'stage';
    row-gap: 12px;
  }

  /*
   * 로딩·오류 화면도 **같은 트리**(Layout > SideHead > TitleRow)를 쓴다. 화면마다 트리가
   * 다르면 평소 ↔ 오류 전환 때 분기 select 가 다시 마운트돼 포커스가 body 로 떨어진다
   * (status.md 1.6). 배치만 한 열(머리 + 안내)로 바꾼다.
   */
  &[data-feedback='true'] {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto;
    grid-template-areas:
      'head'
      'feedback';
    align-content: start;
    row-gap: 14px;

    @media (max-width: 1023px) {
      row-gap: 12px;
    }
  }
`

const FeedbackSlot = styled.div`
  grid-area: feedback;
  min-width: 0;
`

// 목록·상세·지도·시트를 한 tabpanel 로 묶되 grid 배치에는 끼지 않게 한다.
const MetricPanel = styled.div`
  display: contents;
`

// 좌측 카드의 윗부분. 아래 `DesktopSide` 와 이어져 카드 하나로 보인다.
const SideHead = styled.header`
  grid-area: head;
  min-width: 0;
  display: grid;
  gap: 12px;
  padding: 16px 16px 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card) var(--radius-card) 0 0;
  background: var(--color-surface);

  @media (max-width: 1023px) {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  /* 로딩·오류 화면에서는 카드가 아니라 제목 줄만 남는다(예전 화면과 같은 모양). */
  &[data-feedback='true'] {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
`

/*
 * 제목 줄 = 제목 + 기준 분기 select(status.md 1.6). 모바일은 제목이 시각적으로 숨으므로
 * select 만 남아 지표 전환 바로 위에 온다.
 */
const TitleRow = styled.div`
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;

  @media (max-width: 1023px) {
    justify-content: flex-start;
  }
`

/*
 * 분기를 바꾸는 동안 목록·지도는 직전 분기 응답을 자리 표시로 들고 있다(placeholderData).
 * 새 응답이 올 때까지 흐리게 두어 옛 값임을 알린다 — 화면을 로딩으로 통째로 바꾸면
 * select 가 사라져 포커스를 잃는다(status.md 1.6).
 */
const periodPendingStyles = `
  transition: opacity var(--motion-fast) var(--ease-standard);

  &[aria-busy='true'] {
    opacity: 0.6;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const PageTitle = styled.h1`
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;

  /* 모바일은 지표 전환이 맨 위다. 제목은 스크린리더·검색엔진용으로 남긴다. */
  @media (max-width: 1023px) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }
`

const detailEnter = keyframes`
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

/*
 * 1024px 이상은 좌측 열(순위 ↔ 상세) + 우측 지도 2단이다(그 아래는 지도 + 시트 무대).
 *
 * 예전에는 자치구를 고르면 **지도 자리**가 상세로 바뀌었다. 방금 누른 폴리곤이 통째로
 * 사라져 어디를 골랐는지 맥락을 잃고, 다른 구로 옮기려면 닫고 다시 골라야 했다. 이제
 * 상세가 **순위 목록 자리를 덮고** 지도는 그대로 남아 선택 구를 강조한다 — 모바일 시트
 * (Top10 → 상세)·상권추천 좌측 패널과 같은 관용구다.
 *
 * 좌측 열 폭은 목록일 때와 상세일 때 **같다**(`Layout`). 예전엔 선택하면 280px → 최대
 * 480px 로 넓어져 지도가 통째로 다시 배치됐고, 방금 누른 구를 눈으로 다시 찾아야 했다.
 */
// 좌측 열은 한 칸에서 순위↔상세를 토글한다. 우측 지도는 선택과 무관하게 항상 보인다.
const DesktopSide = styled.div`
  grid-area: side;
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: grid;
  overflow: hidden;
  border: 1px solid var(--color-border-200);
  border-top: 0;
  border-radius: 0 0 var(--radius-card) var(--radius-card);
  background: var(--color-surface);
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);

  &[data-has-selection='true'] [data-status-top-ten-panel] {
    display: none;
  }

  &:not([data-has-selection='true']) [data-status-detail-slot] {
    display: none;
  }

  @media (max-width: 1023px) {
    display: none;
  }
`

const DesktopDetailSlot = styled.div`
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  animation: ${detailEnter} var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  /* 상세는 열 폭을 다 쓰고, 남는 높이 안에서 내부 스크롤(스크롤바 숨김). 좌측 카드
     안에 들어가므로 상세 자신의 테두리·그림자는 지운다(카드 안의 카드가 되지 않게). */
  & > article {
    width: 100%;
    min-width: 0;
    max-height: 100%;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    overflow-y: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`

const TopTenPanel = styled.section`
  min-width: 0;
  min-height: 0;
  padding: 12px 10px 12px;
  overflow-y: auto;
  scrollbar-width: none;
  ${periodPendingStyles}

  &::-webkit-scrollbar {
    display: none;
  }
`

// 지도 패널은 스크롤 없이 남는 높이를 지도로 채운다(폴리곤만 배치).
const MapPanel = styled.section`
  grid-area: map;
  min-width: 0;
  min-height: 0;
  padding: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
  ${periodPendingStyles}

  > figure {
    min-height: 0;
    height: 100%;
    grid-template-rows: minmax(0, 1fr);
  }

  > figure > div {
    height: 100%;
    aspect-ratio: auto;
  }

  @media (max-width: 1023px) {
    display: none;
  }
`

/*
 * 1024px 미만(모바일·태블릿 세로)은 지도 + 바텀시트 무대다. 예전엔 768px 부터 2단이라 태블릿
 * 세로에서 좌측 열 340px 을 빼고 남은 약 340px 에 지도가 작게 떴다(status.md 1.4).
 *
 * 지도 층의 아래 끝은 **현재 시트 높이**를 따라간다. 지도는 남은 자리에 비율대로 맞춰
 * 가운데 놓이므로 시트가 지도 아래쪽(강남·서초·송파)을 덮지 않고, 시트를 접으면 지도가
 * 커진다. 높이 식은 시트와 같은 정의(`statusSheetHeightVars`)다.
 */
const MobileStage = styled.section`
  display: none;

  @media (max-width: 1023px) {
    ${statusSheetHeightVars}
    --status-stage-sheet-height: var(--status-sheet-expanded-height);

    &[data-sheet-snap='collapsed'] {
      --status-stage-sheet-height: var(--status-sheet-collapsed-height);
    }

    &[data-sheet-snap='full'] {
      --status-stage-sheet-height: var(--status-sheet-full-height);
    }

    grid-area: stage;
    position: relative;
    /* 남는 세로 공간을 지도+시트가 모두 채워 하단 빈 공간을 없앤다. */
    min-height: 0;
    width: calc(100% + var(--shell-gutter) * 2);
    display: block;
    overflow: hidden;
    margin-left: calc(var(--shell-gutter) * -1);
    border-top: 1px solid var(--color-border-200);
    background: var(--color-surface-muted);
  }
`

const MobileMapLayer = styled.div`
  position: absolute;
  inset: 0 0 var(--status-stage-sheet-height);
  min-height: 0;
  padding: 12px;
  display: grid;
  /* 시트에 가리지 않는 자리 안에서 지도를 가운데 둔다. */
  align-content: center;
  transition:
    bottom var(--motion-standard) var(--ease-standard),
    opacity var(--motion-fast) var(--ease-standard);

  &[aria-busy='true'] {
    opacity: 0.6;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  > figure {
    min-height: 0;
    height: auto;
  }

  > figure > div {
    height: auto;
    max-height: 100%;
    aspect-ratio: 800 / 620;
  }
`

type HighlightedProps = {
  highlightStore: StatusHighlightStore
}

// 목록·지도만 hover store 를 구독한다. 페이지가 구독하면 hover 마다 상세 차트까지 다시 그린다.
function HighlightedTopTen({
  highlightStore,
  ...props
}: HighlightedProps &
  Omit<
    ComponentProps<typeof StatusTopTen>,
    'highlightedDistrictCode' | 'onHighlightEnter' | 'onHighlightLeave'
  >) {
  const highlightedDistrictCode = useStatusHighlight(highlightStore)

  return (
    <StatusTopTen
      {...props}
      highlightedDistrictCode={highlightedDistrictCode}
      onHighlightEnter={highlightStore.enter}
      onHighlightLeave={highlightStore.leave}
    />
  )
}

function HighlightedMap({
  highlightStore,
  ...props
}: HighlightedProps &
  Omit<
    ComponentProps<typeof StatusMap>,
    'highlightedDistrictCode' | 'onHighlightEnter' | 'onHighlightLeave'
  >) {
  const highlightedDistrictCode = useStatusHighlight(highlightStore)

  return (
    <StatusMap
      {...props}
      highlightedDistrictCode={highlightedDistrictCode}
      onHighlightEnter={highlightStore.enter}
      onHighlightLeave={highlightStore.leave}
    />
  )
}

function StatusPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rawSearchParams = searchParams.toString()
  const metric = parseStatusMetric(searchParams.get('metric'))
  /*
    기준 분기(status.md 1.6, period-catalog.md D3-3). URL 에 분기가 없으면 「최신」이고, 순위 호출은 분기를
    생략해 보내 서버가 해석한다 — 카탈로그(`/periods`)를 기다리는 폭포가 없다. 카탈로그는 드롭다운
    범위와, 최신보다 새 분기를 내리는 데만 쓴다.
  */
  const periodCatalog = useAnalysisPeriodCatalog()
  const urlPeriodCode = parseStatusPeriod(searchParams.get('periodCode'))
  const requestedPeriodCode =
    urlPeriodCode === null
      ? null
      : resolveAnalysisPeriod(urlPeriodCode, periodCatalog.range)
  const requestedDistrictCode = searchParams.get('district')
  // 시트는 기본 '펼침'으로 하단을 Top10 리스트가 채우고, 지도는 시트 위에 남는 자리에
  // 맞춰 가운데 놓인다(지도 몫 MINIMUM_MAP_HEIGHT 보장).
  const [sheetState, setSheetState] = useState<StatusSheetState>({
    districtCode: null,
    snap: 'expanded',
  })

  const desktopSideRef = useRef<HTMLDivElement>(null)
  const desktopMapPanelRef = useRef<HTMLElement>(null)
  // 목록 ↔ 지도 hover 연동. 페이지는 구독하지 않는다 — 데스크톱 목록·지도만 다시 그린다.
  const [highlightStore] = useState(createStatusHighlightStore)
  const desktopBackButtonRef = useRef<HTMLButtonElement>(null)
  const previousSelectionRef = useRef<string | null | undefined>(undefined)

  // 25개 구 전체 순위 한 응답이 목록(앞 10개)·지도 단계 색·상세 머리를 함께 채운다(#542).
  const rankingsQuery = useDistrictRankings(requestedPeriodCode)
  const isPeriodPending = rankingsQuery.isPlaceholderData

  const rankings = useMemo(() => {
    if (!rankingsQuery.data || !isApiSuccess(rankingsQuery.data)) {
      return null
    }

    return normalizeStatusRankings(rankingsQuery.data.dataBody)
  }, [rankingsQuery.data])

  /*
    화면 전체(Top10·상세·드롭다운)가 나눠 쓰는 분기. 「최신」이면 순위 응답이 알려 준 분기를 쓴다.
    자리 표시(placeholderData)로 남은 직전 응답의 분기는 쓰지 않는다 — 고른 분기가 이긴다.
  */
  const rankingsPeriodCode =
    rankingsQuery.data && isApiSuccess(rankingsQuery.data) && !isPeriodPending
      ? (rankingsQuery.data.dataBody.currentPeriodCode ?? null)
      : null
  const periodCode =
    requestedPeriodCode ?? rankingsPeriodCode ?? periodCatalog.latest
  /*
    서버가 막 새 분기로 넘어갔는데 카탈로그는 캐시(5분)라 옛 최신 분기를 들고 있으면, 응답 분기가 드롭다운
    범위 밖이 되어 select 가 엉뚱한 분기를 그린다. 응답이 더 새로우면 카탈로그를 다시 묻는다.
  */
  const refetchPeriodCatalog = periodCatalog.refetch
  useEffect(() => {
    if (
      rankingsPeriodCode !== null &&
      periodCatalog.latest !== null &&
      rankingsPeriodCode > periodCatalog.latest
    ) {
      refetchPeriodCatalog()
    }
    // refetch 는 렌더마다 새 함수다 — 분기 값이 바뀔 때만 다시 판정한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankingsPeriodCode, periodCatalog.latest])

  /* 「최신」을 고르면 URL 에서 분기를 지워 최신 링크로 남긴다(createStatusQuery). */
  const latestPeriodCode =
    periodCatalog.latest ??
    (requestedPeriodCode === null ? rankingsPeriodCode : null)

  const currentItems = rankings?.[metric] ?? []
  const topTenItems = selectStatusTopTen(currentItems)
  const selectedDistrictCode = rankings
    ? normalizeStatusSelection(requestedDistrictCode, SELECTABLE_DISTRICT_CODES)
    : null
  const selectedDistrict = resolveStatusSelectedDistrict(
    selectedDistrictCode,
    currentItems,
    districts,
  )
  const sheetSnap = resolveStatusSheetSnap(sheetState, selectedDistrictCode)

  const detailQuery = useQuery({
    queryKey: statusQueryKeys.detail(
      periodCode ?? 'latest',
      selectedDistrictCode,
    ),
    queryFn: () => {
      if (!selectedDistrictCode) {
        throw new Error('선택한 자치구가 없습니다.')
      }

      return fetchStatusDetail(selectedDistrictCode, periodCode ?? undefined)
    },
    enabled: selectedDistrictCode !== null,
    retry: retryUnlessClientError(3),
  })

  const detail =
    detailQuery.data && isApiSuccess(detailQuery.data)
      ? detailQuery.data.dataBody
      : null
  const detailError = resolveApiError(detailQuery)
  const isDetailLoading =
    detailQuery.isPending || (detailError !== null && detailQuery.isFetching)
  useEffect(() => {
    const currentQuery = new URLSearchParams(rawSearchParams)
    const districtCode = rankings
      ? selectedDistrictCode
      : currentQuery.get('district')
    // 분기는 URL 에 적힌 대로 둔다(최신 분기를 명시한 링크도 그대로) — 여기서 지우면 쿼리 키가 바뀌어
    // 같은 데이터를 한 번 더 부른다. 최신으로 되돌리는 것은 사용자가 분기를 고를 때뿐이다.
    const normalizedQuery = createStatusQuery(
      currentQuery,
      metric,
      districtCode,
      requestedPeriodCode,
    )

    if (normalizedQuery.toString() === rawSearchParams) {
      return
    }

    router.replace(
      createStatusHref(pathname, normalizedQuery, window.location.hash),
      {
        scroll: false,
      },
    )
  }, [
    metric,
    pathname,
    requestedPeriodCode,
    rawSearchParams,
    router,
    selectedDistrictCode,
    rankings,
  ])

  /*
   * 데스크톱에서는 순위 목록과 상세가 한 자리를 번갈아 쓴다. 목록 버튼으로 상세를 열면
   * 그 버튼이 display:none 이 되며 포커스가 body 로 떨어지고, 뒤로가기로 닫으면 상세의
   * 뒤로가기 버튼이 사라지며 또 떨어진다. **포커스를 잃은 경우에만** 짝이 되는 자리로
   * 옮긴다 — 지도 폴리곤을 눌러 연 경우처럼 포커스가 살아 있으면 건드리지 않는다.
   * 모바일(시트)은 자체 전환 로직이 있어 데스크톱 열이 보일 때만 동작한다.
   */
  useLayoutEffect(() => {
    // 데이터 전 렌더는 「선택 없음」이 아니라 「아직 모름」이다. 여기서 기록하면 링크로
    // 들어온 선택이 도착하는 순간을 사용자 전환으로 오인해 페이지 진입 때 포커스를 뺏는다.
    if (!rankings) return
    const previous = previousSelectionRef.current
    previousSelectionRef.current = selectedDistrict?.districtCode ?? null
    if (previous === undefined || previous === previousSelectionRef.current) {
      return
    }

    const side = desktopSideRef.current
    if (!side || side.offsetParent === null) return

    // 막 숨겨진 목록 버튼은 브라우저가 blur 하기 전까지 activeElement 로 남아 있다.
    const active = document.activeElement
    const hasLostFocus =
      !active ||
      active === document.body ||
      (active instanceof HTMLElement &&
        side.contains(active) &&
        active.offsetParent === null)
    if (!hasLostFocus) return

    if (selectedDistrict) {
      desktopBackButtonRef.current?.focus({ preventScroll: true })
      return
    }

    // 순위 밖 구(지도에서 고른 구, 또는 지표를 바꿔 목록에서 빠진 구)는 목록 행이 없다.
    // 그때는 그 구의 지도 폴리곤으로 돌려준다.
    if (previous) {
      const listRow = side.querySelector<HTMLButtonElement>(
        `[data-status-top-ten-panel] [data-district-code="${previous}"]`,
      )
      const mapPolygon = desktopMapPanelRef.current?.querySelector<SVGElement>(
        `[data-status-district-path="${previous}"]`,
      )

      const returnTarget = listRow ?? mapPolygon

      returnTarget?.focus({ preventScroll: true })
    }
  }, [selectedDistrict, rankings])

  const pushStatusQuery = (
    nextMetric: typeof metric,
    districtCode: string | null,
    nextPeriodCode: string | null = requestedPeriodCode,
  ) => {
    const nextQuery = createStatusQuery(
      new URLSearchParams(rawSearchParams),
      nextMetric,
      districtCode,
      nextPeriodCode,
    )

    router.push(createStatusHref(pathname, nextQuery, window.location.hash), {
      scroll: false,
    })
  }

  // 지표를 바꿔도 보던 구는 그대로 둔다. 상세는 구 단위라 지표와 무관하고, 머리의
  // 숫자·순위만 새 지표로 바뀐다(25개 구 전체 순위라 Top10 밖이어도 값과 순위가 있다). 시트 높이도 유지한다.
  const handleMetricChange = (nextMetric: typeof metric) => {
    if (nextMetric === metric) {
      return
    }

    pushStatusQuery(nextMetric, selectedDistrictCode)
  }

  // 분기를 바꿔도 지표·보던 구·시트 단계는 그대로다. 상세는 같은 구의 새 분기로 다시 부른다.
  // 지표·구 선택과 같이 `push` 다 — 뒤로가기가 직전 분기로 돌아간다(status.md 1.6).
  const handlePeriodChange = (nextPeriodCode: string) => {
    if (nextPeriodCode === periodCode) {
      return
    }

    // 목록이 아직 없으면(오류 화면) 구 선택은 URL 에 있던 값을 그대로 넘긴다.
    pushStatusQuery(
      metric,
      rankings ? selectedDistrictCode : requestedDistrictCode,
      nextPeriodCode === latestPeriodCode ? null : nextPeriodCode,
    )
  }

  const periodSelect = (
    <StatusPeriodSelect
      value={periodCode}
      range={periodCatalog.range}
      onChange={handlePeriodChange}
    />
  )

  const handleDistrictSelect = (districtCode: string) => {
    // 접혀 있으면 펼치고, 그 밖에는 지금 단계를 유지한다(전체 펼침에서 고르면 그대로).
    setSheetState({
      districtCode,
      snap: sheetSnap === 'collapsed' ? 'expanded' : sheetSnap,
    })
    // 누른 행은 상세에 가려져 pointerleave 가 오지 않는다. 남은 강조가 상세 옆 지도에
    // 툴팁을 띄워 두지 않게 지운다.
    highlightStore.clear()

    if (districtCode === selectedDistrictCode) {
      return
    }

    pushStatusQuery(metric, districtCode)
  }

  const handleClearDistrict = () => {
    setSheetState({
      districtCode: null,
      snap: sheetSnap === 'collapsed' ? 'expanded' : sheetSnap,
    })
    pushStatusQuery(metric, null)
  }

  const handleMapBackgroundClick = () => {
    setSheetState({
      districtCode: selectedDistrictCode,
      snap: getToggledSheetSnap(sheetSnap),
    })
  }

  /*
   * 네 지표가 동시에 비면 「데이터가 아직 없어요」가 아니라 **장애**다. 서울 자치구는
   * 25개 고정이라 정상 운영에서 전 지표가 한꺼번에 0건이 될 수 없다. 200 + 빈 배열은
   * `!rankings` 를 통과해 정상 페이지로 렌더되고, 탭마다 결측 문구만 떠서 장애인지가
   * 늦어졌다(#371). 재시도 가능한 안내로 바꾼다.
   */
  const isSupplyOutage = rankings ? isStatusTopTenAllEmpty(rankings) : false

  const isFeedback = !rankings || isSupplyOutage
  const isFeedbackLoading =
    isFeedback && (rankingsQuery.isPending || rankingsQuery.isFetching)

  return (
    <Page data-hide-footer="true">
      <PageInner>
        <Layout data-feedback={isFeedback || undefined}>
          <SideHead data-feedback={isFeedback || undefined}>
            {/* 고른 분기가 실패해도 다른 분기로 옮길 길을 남긴다. 트리 위치가 늘 같아
                평소 ↔ 오류 전환에도 select 가 다시 마운트되지 않는다(status.md 1.6). */}
            <TitleRow>
              <PageTitle>{STATUS_PAGE_TITLE}</PageTitle>
              {periodSelect}
            </TitleRow>
            {isFeedback ? null : (
              <StatusMetricTabs
                idBase={METRIC_TAB_ID_BASE}
                panelId={METRIC_PANEL_ID}
                value={metric}
                onChange={handleMetricChange}
              />
            )}
          </SideHead>

          {isFeedback ? (
            <FeedbackSlot>
              {isFeedbackLoading ? (
                <StatusFeedback state="loading" />
              ) : (
                <StatusFeedback
                  error={resolveApiError(rankingsQuery)}
                  state="error"
                  title={
                    isSupplyOutage
                      ? '자치구 데이터를 불러오지 못했어요'
                      : undefined
                  }
                  description={
                    isSupplyOutage
                      ? '유동인구·매출·개업·폐업 네 지표가 모두 비어 있습니다. 일시적인 문제일 수 있으니 잠시 후 다시 시도해 주세요.'
                      : undefined
                  }
                  onRetry={() => void rankingsQuery.refetch()}
                />
              )}
            </FeedbackSlot>
          ) : (
            <MetricPanel
              aria-labelledby={`${METRIC_TAB_ID_BASE}-${metric}`}
              id={METRIC_PANEL_ID}
              role="tabpanel"
            >
              <DesktopSide
                ref={desktopSideRef}
                data-has-selection={selectedDistrict !== null}
              >
                <TopTenPanel
                  aria-busy={isPeriodPending || undefined}
                  data-status-top-ten-panel
                >
                  <HighlightedTopTen
                    highlightStore={highlightStore}
                    items={topTenItems}
                    metric={metric}
                    selectedDistrictCode={selectedDistrictCode}
                    onSelect={handleDistrictSelect}
                  />
                </TopTenPanel>

                <DesktopDetailSlot
                  key={selectedDistrict?.districtCode ?? 'none'}
                  data-status-detail-slot
                >
                  {selectedDistrict ? (
                    <StatusDetail
                      backButtonRef={desktopBackButtonRef}
                      detail={detail}
                      error={detailError}
                      isLoading={isDetailLoading}
                      isRankPending={isPeriodPending}
                      metric={metric}
                      periodCode={periodCode}
                      selectedDistrict={selectedDistrict}
                      onBack={handleClearDistrict}
                      onRetry={() => void detailQuery.refetch()}
                    />
                  ) : null}
                </DesktopDetailSlot>
              </DesktopSide>

              <MapPanel
                ref={desktopMapPanelRef}
                aria-busy={isPeriodPending || undefined}
                data-status-map-panel
              >
                <HighlightedMap
                  highlightStore={highlightStore}
                  items={currentItems}
                  metric={metric}
                  selectedDistrictCode={selectedDistrictCode}
                  onSelect={handleDistrictSelect}
                />
              </MapPanel>

              <MobileStage
                aria-label="서울 자치구 현황 지도와 상세 정보"
                data-sheet-snap={sheetSnap}
              >
                {/* 전체 펼침에서 지도는 높이 0 이다. 보이지 않는 폴리곤 25개가 Tab 순서에
                  남지 않게 통째로 뺀다. */}
                <MobileMapLayer
                  aria-busy={isPeriodPending || undefined}
                  aria-hidden={sheetSnap === 'full' || undefined}
                  inert={sheetSnap === 'full' || undefined}
                >
                  <StatusMap
                    items={currentItems}
                    metric={metric}
                    selectedDistrictCode={selectedDistrictCode}
                    backgroundAction={
                      sheetSnap === 'collapsed' ? 'expand' : 'collapse'
                    }
                    onBackgroundClick={handleMapBackgroundClick}
                    onSelect={handleDistrictSelect}
                  />
                </MobileMapLayer>
                <StatusMobileSheet
                  detail={detail}
                  detailError={detailError}
                  isDetailLoading={isDetailLoading}
                  isPeriodPending={isPeriodPending}
                  items={topTenItems}
                  metric={metric}
                  periodCode={periodCode}
                  selectedDistrict={selectedDistrict}
                  snap={sheetSnap}
                  onBackToTopTen={handleClearDistrict}
                  onRetryDetail={() => void detailQuery.refetch()}
                  onSelect={handleDistrictSelect}
                  onSnapChange={snap =>
                    setSheetState({ districtCode: selectedDistrictCode, snap })
                  }
                />
              </MobileStage>
            </MetricPanel>
          )}
        </Layout>
      </PageInner>
    </Page>
  )
}

function StatusPageFallback() {
  return (
    <Page data-hide-footer="true">
      <PageInner>
        <StatusFeedback state="loading" />
      </PageInner>
    </Page>
  )
}

export default function StatusPage() {
  return (
    <Suspense fallback={<StatusPageFallback />}>
      <StatusPageContent />
    </Suspense>
  )
}
