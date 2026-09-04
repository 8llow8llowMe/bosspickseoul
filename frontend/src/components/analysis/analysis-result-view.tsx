'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Bookmark, Check, ExternalLink, Share2, X } from 'lucide-react'
import styled from 'styled-components'

import AnalysisMetricList from '@/components/analysis/analysis-metric-list'
import AnalysisResultSection from '@/components/analysis/analysis-result-section'
import SalesComparisonBars from '@/components/analysis/sales-comparison-bars'
import BarChart from '@/components/analysis/charts/bar-chart'
import DonutChart from '@/components/analysis/charts/donut-chart'
import LineChart from '@/components/analysis/charts/line-chart'
import PopulationPyramid from '@/components/analysis/charts/population-pyramid'
import AnalysisResultNav from '@/components/analysis/analysis-result-nav'
import AnalysisPeriodSelect from '@/components/analysis/analysis-period-select'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/empty-state'
import { TabButton, TabList } from '@/components/ui/tabs'
import {
  fetchCommercialBenchmark,
  fetchCommercialFacilities,
  fetchCommercialFootTraffic,
  fetchCommercialIncome,
  fetchCommercialIncomeSummary,
  fetchCommercialPopulation,
  fetchCommercialSales,
  fetchCommercialSalesSummary,
  fetchCommercialServiceCategories,
  fetchCommercialStores,
  fetchCommercialTrend,
} from '@/lib/api/commercial-analysis'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
// getApiMessage 는 보관·공유 응답의 실패 문구를 읽는 데 계속 쓴다.
import {
  getApiMessage,
  getResponseBody,
  isApiSuccess,
} from '@/lib/api/response'
import {
  classifyAnalysisBookmarkSaveError,
  createAnalysisBookmark,
  deleteAnalysisBookmark,
} from '@/lib/api/analysis-bookmark'
import { createShareLink, createShareUrl } from '@/lib/api/share'
import { classifyShareLinkError } from '@/lib/api/share-errors'
import {
  buildCommercialAnalysisPayload,
  normalizeSharePayload,
} from '@/lib/share/payload'
import { addMemberBookmark, removeMemberBookmark } from '@/lib/api/user'
import AnalysisPolicyList from '@/components/analysis/analysis-policy-list'
import { fetchCommercialProfile } from '@/lib/api/recommend'
import {
  toGenderSegments,
  toPyramidRows,
  toTrendPoints,
} from '@/lib/analysis/chart-data'
import {
  ANALYSIS_TABS,
  formatAnalysisValue,
  formatPeriodCode,
  normalizeAnalysisTab,
} from '@/lib/analysis/presentation'
import {
  createRows,
  toLinePoints,
  footTimeDefinitions,
  footDayDefinitions,
  salesTimeDefinitions,
  salesDayDefinitions,
  salesAgeDefinitions,
  populationAgeDefinitions,
  expenseDefinitions,
} from '@/lib/analysis/commercial-chart-selectors'
import {
  MAP_CAMERA_PARAM,
  parseMapCamera,
  type MapCamera,
} from '@/lib/analysis/map-camera'
import {
  createAnalysisExplorerHref,
  createAnalysisResultHref,
  isCompleteAnalysisSelection,
  parseAnalysisSelection,
  type AnalysisResultTab,
  type AnalysisSelection,
} from '@/lib/analysis/selection'
import { useActivatedSections } from '@/lib/analysis/use-activated-sections'
import { useScrollSpy } from '@/lib/analysis/use-scroll-spy'
import { invalidateMemberBookmarksQuery } from '@/lib/recommend/recommend-bookmarks'
import { useCommercialBookmarks } from '@/hooks/use-commercial-bookmarks'
import { useToast } from '@/components/ui/toast'
import {
  rememberPendingAction,
  takePendingAction,
} from '@/lib/auth/pending-action'
import { useAuthStore } from '@/stores/auth-store'
import type {
  CommercialBenchmark,
  CommercialFacility,
  CommercialFootTraffic,
  CommercialIncomeAndExpense,
  CommercialIncomeSummary,
  CommercialResidentPopulation,
  CommercialSales,
  CommercialSalesSummary,
  CommercialServiceCategory,
  CommercialStoreAnalysis,
  CommercialTrend,
  CommercialTrendMetric,
} from '@/types/commercial-analysis'
import type { CommercialProfile } from '@/types/recommend'

export type AnalysisResultViewProps = {
  onClose?: () => void
}

export const createInvalidResultMessage = (
  selection: AnalysisSelection,
): string | null =>
  isCompleteAnalysisSelection(selection)
    ? null
    : '분석 조건을 다시 선택해 주세요'

/**
 * 탭 전환 URL. 카메라(`c`)를 **보존**한다 — 탭은 결과 뷰 상태고 카메라는 지도 뷰
 * 상태라 서로 무관하지만, 한쪽을 갱신하며 다른 쪽을 지우면 지도가 되돌아간다.
 */
export const createResultTabHref = (
  selection: AnalysisSelection,
  tab: AnalysisResultTab,
  camera?: MapCamera | null,
) => createAnalysisResultHref(selection, tab, camera)

export const getCommercialBookmarkLoginHref = (currentHref: string) =>
  `/login?redirect=${encodeURIComponent(currentHref)}`

/** 보관 동작의 토스트 키. 성공·오류·안내가 한 장을 나눠 쓴다. */
const ARCHIVE_TOAST_KEY = 'analysis-archive'

/**
 * 로그인 때문에 중단된 보관 동작의 식별자.
 *
 * payload 키를 함께 담는 이유: 동작 이름만 담으면 로그인 후 **다른 상권**으로 돌아왔을 때도
 * 이어하기가 떠서, 사용자가 고르지도 않은 화면을 보관하게 된다.
 */
const archiveIntentKey = (payloadKey: string) => `archive:${payloadKey}`

export const createReportSectionId = (tab: AnalysisResultTab) => `report-${tab}`

const REPORT_SECTION_IDS = ANALYSIS_TABS.map(tab =>
  createReportSectionId(tab.value),
)
const ANALYSIS_TAB_VALUES = ANALYSIS_TABS.map(tab => tab.value)

/**
 * `tab` and every tab that sits above it in document order. Used to force
 * those sections' lazy queries on right away (instead of waiting for
 * scroll-proximity activation) so their layout has already settled by the
 * time we scroll to `tab` — see `scrollToReportSection`.
 */
export const collectTabsUpTo = (
  tab: AnalysisResultTab,
): AnalysisResultTab[] => {
  const index = ANALYSIS_TAB_VALUES.indexOf(tab)
  return index === -1 ? [tab] : ANALYSIS_TAB_VALUES.slice(0, index + 1)
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 클릭한 탭의 섹션으로 한 번만 부드럽게 스크롤한다. 상단 오프셋(헤더에 가리지
 * 않도록)은 각 `ReportSection`의 `scroll-margin-top`이 담당한다. 예전의 리플로우
 * 재정렬 보정 루프는 제거했다 — 클릭 시 자연스러운 단일 이동을 위해.
 */
const scrollToReportSection = (tab: AnalysisResultTab) => {
  if (typeof document === 'undefined') return
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
  window.requestAnimationFrame(() => {
    document
      .getElementById(createReportSectionId(tab))
      ?.scrollIntoView({ behavior, block: 'start' })
  })
}

const Root = styled.article`
  min-height: 100%;
  background: var(--color-surface-muted);
`

const StickyHeader = styled.header`
  position: sticky;
  z-index: 10;
  top: 0;
  border-bottom: 1px solid var(--color-border-200);
  background: var(--color-surface);
`

const HeaderInner = styled.div`
  width: min(1320px, calc(100% - 40px));
  margin: 0 auto;
  padding: 10px 0 0;

  @media (max-width: 640px) {
    width: min(100% - 28px, 1320px);
    padding-top: 8px;
  }
`

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 8px;
`

const HeaderCopy = styled.div`
  min-width: 0;
  flex: 1;
`

/** 상권명과 위치·기준 메타를 한 줄에 붙여 헤더 높이를 줄인다. 모바일에서는 wrap. */
const HeaderNameRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;

  h1 {
    overflow: hidden;
    max-width: 100%;
    color: var(--color-text-900);
    font-size: 20px;
    font-weight: 700;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (max-width: 640px) {
      font-size: 16px;
    }
  }

  span {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 18px;
  }
`

const IconButton = styled.button`
  width: 44px;
  height: 44px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-700);
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: var(--color-surface-muted);
    color: var(--color-text-900);
    outline: none;
  }

  svg {
    width: 21px;
    height: 21px;
  }
`

/** 헤더 전용 타이트 탭 버튼. 공유 TabButton을 확장(다른 화면의 탭에는 영향 없음). */
const HeaderTabButton = styled(TabButton)`
  min-height: 38px;
  padding: 0 10px;
  font-size: 13px;
`

const Content = styled.div`
  width: min(1320px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 56px;
  display: grid;
  gap: 28px;

  @media (max-width: 640px) {
    width: min(100% - 28px, 1320px);
    padding: 20px 0 max(36px, env(safe-area-inset-bottom));
  }
`

/** 데스크톱: [사이드바][콘텐츠] 2컬럼. 모바일(≤840px)은 단일 컬럼. */
const ResultLayout = styled.div`
  width: min(1320px, calc(100% - 40px));
  margin: 0 auto;
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 28px;
  padding: 20px 0 56px;

  @media (max-width: 840px) {
    grid-template-columns: 1fr;
    width: min(100% - 28px, 1320px);
    gap: 0;
    padding: 16px 0 max(36px, env(safe-area-inset-bottom));
  }
`

/** 좌측 사이드바: 스크롤 컨테이너 기준 sticky. 모바일에서는 숨김. */
const SidebarColumn = styled.aside`
  position: sticky;
  top: 96px;
  align-self: start;
  height: fit-content;

  @media (max-width: 840px) {
    display: none;
  }
`

/** 사이드바 오른쪽 콘텐츠 컬럼. 폭/패딩은 ResultLayout이 담당. */
const ContentColumn = styled.div`
  min-width: 0;
  display: grid;
  gap: 28px;
`

/** 모바일 전용 상단 가로 탭. 데스크톱에서는 숨김. */
const MobileTabList = styled(TabList)`
  display: none;

  @media (max-width: 840px) {
    display: flex;
  }
`

/**
 * One anchor per tab. Rendered unconditionally so the tab bar becomes a
 * scroll-spy over a single long page instead of swapping content.
 * `scroll-margin-top` keeps the section clear of the sticky header when
 * jumped to via tab click or deep-linked URL.
 */
const ReportSection = styled.section`
  display: grid;
  gap: 16px;
  /* 데스크톱: sticky 헤더(≈63px) 아래로 자연스럽게 안착. */
  scroll-margin-top: 76px;

  /* 모바일(≤840px): 헤더에 가로 탭 바가 포함돼 더 높다(≈102px). */
  @media (max-width: 840px) {
    scroll-margin-top: 116px;
  }
`

/** 각 탭 그룹 좌상단에 표시하는 헤딩(요약/유동인구/매출 등). */
const GroupHeading = styled.h2`
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
`

/** 그룹 헤딩 줄: 왼쪽 제목 + 오른쪽 기간(연/분기) 선택. */
const GroupHeadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: start;

  /* Grid items default to min-width:auto, which for a card containing an
     intrinsically-sized SVG can grow the track past the available width
     (the classic CSS Grid + replaced-element overflow bug). Reset it here
     so every card is free to shrink to its track's width. */
  & > * {
    min-width: 0;
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

/** Wide content (line charts, the pyramid, multi-card comparisons) spans the full grid row. */
const FullSpanItem = styled.div`
  min-width: 0;
  grid-column: 1 / -1;
`

/**
 * Charts render an SVG with `width: 100%; height: auto` against a fixed
 * `viewBox`, so capping the wrapper's max-width also caps height (aspect
 * ratio preserved). Centers the chart when its card is wider than the cap.
 * `min-width: 0` breaks the same auto-min-size bug at this nesting level
 * (this box is itself a grid item inside `AnalysisResultSection`'s card),
 * and `min(100%, …)` keeps the cap from ever exceeding the container.
 */
const ChartBox = styled.div<{ $maxWidth: number }>`
  width: 100%;
  min-width: 0;
  max-width: ${props => `min(100%, ${props.$maxWidth}px)`};
  margin: 0 auto;
`

const ContextHero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
  padding: 16px 20px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    padding: 14px 16px;
  }
`

const ContextCopy = styled.div`
  display: grid;
  gap: 6px;

  p {
    color: var(--color-text-caption);
    font-size: 13px;
  }

  h2 {
    color: var(--color-text-900);
    font-size: 21px;
    font-weight: 700;
    line-height: 30px;
  }
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button {
    min-width: 112px;
  }
`

/**
 * 오류 문구 전용이다. 예전에는 `$error` 가 아닐 때 `primary-700`(블루)로 성공을
 * 알리는 분기가 있었는데, 동작 피드백이 토스트로 옮겨간 뒤(#146) 호출부가 남지
 * 않아 죽은 분기였다. 블루는 상호작용 전용이라 되살릴 분기도 아니다.
 */
const Feedback = styled.p`
  color: var(--color-danger);
  font-size: 13px;
  line-height: 20px;
`

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }
`

const MetricCard = styled.div`
  display: grid;
  gap: 6px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 18px 16px 16px;

  span {
    color: var(--color-text-caption);
    font-size: 12px;
  }

  strong {
    color: var(--color-text-900);
    font-size: 21px;
    font-weight: 700;
    line-height: 30px;
  }
`

const ComparisonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

const ComparisonItem = styled.div`
  display: grid;
  gap: 5px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 14px;

  span {
    color: var(--color-text-caption);
    font-size: 12px;
  }

  strong {
    color: var(--color-text-900);
    font-size: 16px;
  }
`

const HighlightList = styled.ul`
  display: grid;
  gap: 9px;

  li {
    position: relative;
    color: var(--color-text-700);
    padding-left: 18px;
    font-size: 14px;
    line-height: 22px;
  }

  li::before {
    position: absolute;
    top: 8px;
    left: 2px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-primary-600);
    content: '';
  }
`

const hasObjectValues = (value: object | null | undefined) =>
  Boolean(
    value &&
    Object.values(value).some(
      item =>
        item !== null &&
        item !== undefined &&
        (!Array.isArray(item) || item.length > 0),
    ),
  )

const renderCards = (
  cards: readonly {
    label: string
    value: number | null | undefined
    unit: string
  }[],
) => (
  <CardGrid>
    {cards.map(card => (
      <MetricCard key={card.label}>
        <span>{card.label}</span>
        <strong>{formatAnalysisValue(card.value, card.unit)}</strong>
      </MetricCard>
    ))}
  </CardGrid>
)

export default function AnalysisResultView({
  onClose,
}: AnalysisResultViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const selection = useMemo(
    () => parseAnalysisSelection(searchParams),
    [searchParams],
  )
  const activeTab = normalizeAnalysisTab(searchParams.get('tab'))
  const invalidMessage = createInvalidResultMessage(selection)
  const enabled = invalidMessage === null
  const districtCode = selection.districtCode ?? ''
  const administrationCode = selection.administrationCode ?? ''
  const commercialCode = selection.commercialCode ?? ''
  const serviceCode = selection.serviceCode ?? ''
  /**
   * 기간(분기)은 **URL 이 정본**이다(`periodCode`). 로컬 state 였을 때는 사용자가
   * 분기를 바꾸고 새로고침하면 조용히 기본 분기로 되돌아갔다 — 카메라 복원과 같은
   * 성격의 결함이다. 분석 쿼리 10여 개의 쿼리 키이기도 하므로, URL 에서 오면 첫
   * 페인트 요청부터 올바른 분기로 나간다.
   */
  const periodCode = selection.periodCode
  /** URL 카메라. 탭·기간 전환이 `c` 를 지우지 않게 그대로 실어 보낸다. */
  const camera = useMemo(
    () => parseMapCamera(searchParams.get(MAP_CAMERA_PARAM)),
    [searchParams],
  )
  const contextParams = {
    districtCode,
    administrationCode,
    serviceCode,
    periodCode,
  }
  const currentHref = `${pathname}?${searchParams.toString()}`
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const memberId = useAuthStore(state => state.memberInfo?.memberId ?? null)
  const bookmarksQuery = useCommercialBookmarks(
    memberId,
    hasHydrated && isLoggedIn,
  )
  const { showToast } = useToast()

  /**
   * 동작 결과는 **토스트**로 알린다.
   *
   * 예전에는 본문 흐름에 `<p>` 로 끼워 넣었는데 두 가지가 문제였다: ① 뜰 때마다 아래
   * 리포트 전체가 밀렸고, ② 지우는 코드가 없어 한 번 뜨면 화면에 계속 남았다.
   *
   * `dedupeKey` 로 동작마다 한 장만 유지한다 — 보관 버튼을 연달아 누를 때
   * "저장했어요/해제했어요"가 쌓이면 지금 상태가 무엇인지 알 수 없다.
   */
  const notify = useCallback(
    (
      dedupeKey: string,
      message: string,
      tone: 'success' | 'error' = 'success',
    ) => {
      showToast({ message, tone, dedupeKey })
    },
    [showToast],
  )

  // 공유 링크 / 분석 화면 보관함이 공유하는 payload. 조건이 불완전하면 null 이라 버튼을 막는다.
  const sharePayload = useMemo(
    () => buildCommercialAnalysisPayload(selection, searchParams.get('tab')),
    [selection, searchParams],
  )
  const sharePayloadKey = sharePayload
    ? normalizeSharePayload(sharePayload)
    : ''
  /**
   * 보관된 항목 id(문자열). ⚠️ Snowflake 값이라 절대 숫자로 바꾸지 않는다.
   * 화면 상태(기간·탭)가 바뀌면 다른 화면이므로 보관 상태를 초기화한다.
   */
  const [archived, setArchived] = useState<{
    payloadKey: string
    bookmarkId: string | null
  } | null>(null)
  const archivedBookmarkId =
    archived && archived.payloadKey === sharePayloadKey
      ? archived.bookmarkId
      : null
  const isArchived = archived?.payloadKey === sharePayloadKey

  const spyId = useScrollSpy(REPORT_SECTION_IDS)
  const spyTab = normalizeAnalysisTab(spyId.replace('report-', ''))
  const {
    register: registerSection,
    activated,
    activate,
  } = useActivatedSections(collectTabsUpTo(activeTab))

  // 딥링크로 진입한 탭 섹션은 요약이 아니면 마운트 후 1회만 스크롤한다.
  const didInitialScrollRef = useRef(false)
  useEffect(() => {
    if (didInitialScrollRef.current) return
    didInitialScrollRef.current = true
    if (activeTab === 'summary') return
    scrollToReportSection(activeTab)
  }, [activeTab])

  /**
   * 기간 전환. 카메라와 같은 **`replace`** 정책이다 — `push` 면 뒤로가기가 분기 이력으로
   * 찬다. 탭 전환이 이미 `replace` 이므로 같은 방식을 따른다(map-shell.md D5).
   */
  const handlePeriodChange = (nextPeriodCode: string) => {
    router.replace(
      createResultTabHref(
        { ...selection, periodCode: nextPeriodCode },
        activeTab,
        camera,
      ),
    )
  }

  const handleTabClick = (tab: AnalysisResultTab) => {
    // 목표 섹션(과 그 위의 모든 섹션)의 lazy 쿼리를 즉시 켜서, 스크롤이
    // 끝나기 전에 레이아웃이 최종 높이로 수렴하게 한다.
    activate(collectTabsUpTo(tab))
    router.replace(createResultTabHref(selection, tab, camera))
    scrollToReportSection(tab)
  }

  const profileQuery = useQuery({
    queryKey: ['analysis', 'profile', commercialCode, serviceCode, periodCode],
    queryFn: () =>
      fetchCommercialProfile(commercialCode, serviceCode, periodCode),
    enabled,
    retry: retryUnlessClientError(1),
  })
  const servicesQuery = useQuery({
    queryKey: ['analysis', 'services', commercialCode],
    queryFn: () => fetchCommercialServiceCategories(commercialCode),
    enabled: Boolean(commercialCode),
    retry: retryUnlessClientError(1),
  })
  const salesSummaryQuery = useQuery({
    queryKey: ['analysis', 'sales-summary', commercialCode, contextParams],
    queryFn: () => fetchCommercialSalesSummary(commercialCode, contextParams),
    enabled,
    retry: retryUnlessClientError(1),
  })
  const storesQuery = useQuery({
    queryKey: ['analysis', 'stores', commercialCode, serviceCode, periodCode],
    queryFn: () =>
      fetchCommercialStores(commercialCode, serviceCode, periodCode),
    enabled,
    retry: retryUnlessClientError(1),
  })
  const populationQuery = useQuery({
    queryKey: ['analysis', 'population', commercialCode, periodCode],
    queryFn: () => fetchCommercialPopulation(commercialCode, periodCode),
    enabled,
    retry: retryUnlessClientError(1),
  })
  const incomeSummaryQuery = useQuery({
    queryKey: [
      'analysis',
      'income-summary',
      commercialCode,
      districtCode,
      administrationCode,
      periodCode,
    ],
    queryFn: () =>
      fetchCommercialIncomeSummary(
        commercialCode,
        districtCode,
        administrationCode,
        periodCode,
      ),
    enabled,
    retry: retryUnlessClientError(1),
  })
  const facilitiesQuery = useQuery({
    queryKey: ['analysis', 'facilities', commercialCode, periodCode],
    queryFn: () => fetchCommercialFacilities(commercialCode, periodCode),
    enabled,
    retry: retryUnlessClientError(1),
  })
  const footTrafficQuery = useQuery({
    queryKey: ['analysis', 'foot-traffic', commercialCode, periodCode],
    queryFn: () => fetchCommercialFootTraffic(commercialCode, periodCode),
    enabled: enabled && activated.has('foot-traffic'),
    retry: retryUnlessClientError(1),
  })
  const salesQuery = useQuery({
    queryKey: ['analysis', 'sales', commercialCode, serviceCode, periodCode],
    queryFn: () =>
      fetchCommercialSales(commercialCode, serviceCode, periodCode),
    enabled: enabled && activated.has('sales'),
    retry: retryUnlessClientError(1),
  })
  const incomeQuery = useQuery({
    queryKey: ['analysis', 'income', commercialCode, periodCode],
    queryFn: () => fetchCommercialIncome(commercialCode, periodCode),
    enabled: enabled && activated.has('living'),
    retry: retryUnlessClientError(1),
  })
  const salesTrendQuery = useQuery({
    queryKey: [
      'analysis',
      'trend',
      commercialCode,
      serviceCode,
      'SALES',
      periodCode,
    ],
    queryFn: () =>
      fetchCommercialTrend(commercialCode, {
        serviceCode,
        metricType: 'SALES',
        periodCode,
        periodCount: 4,
      }),
    enabled: enabled && activated.has('trend'),
    retry: retryUnlessClientError(1),
  })
  const footTrendQuery = useQuery({
    queryKey: [
      'analysis',
      'trend',
      commercialCode,
      serviceCode,
      'FOOT_TRAFFIC',
      periodCode,
    ],
    queryFn: () =>
      fetchCommercialTrend(commercialCode, {
        serviceCode,
        metricType: 'FOOT_TRAFFIC',
        periodCode,
        periodCount: 4,
      }),
    enabled: enabled && activated.has('trend'),
    retry: retryUnlessClientError(1),
  })
  const storeTrendQuery = useQuery({
    queryKey: [
      'analysis',
      'trend',
      commercialCode,
      serviceCode,
      'STORE',
      periodCode,
    ],
    queryFn: () =>
      fetchCommercialTrend(commercialCode, {
        serviceCode,
        metricType: 'STORE',
        periodCode,
        periodCount: 4,
      }),
    enabled: enabled && activated.has('trend'),
    retry: retryUnlessClientError(1),
  })
  const benchmarkQuery = useQuery({
    queryKey: [
      'analysis',
      'benchmark',
      commercialCode,
      serviceCode,
      periodCode,
    ],
    queryFn: () =>
      fetchCommercialBenchmark(commercialCode, serviceCode, periodCode),
    enabled: enabled && activated.has('benchmark'),
    retry: retryUnlessClientError(1),
  })

  const profile = getResponseBody(profileQuery.data) as CommercialProfile | null
  /* 응답이 필드를 안 주는 경우(구버전 배포)도 빈 목록으로 다룬다. */
  const policyRecommendations = profile?.policyRecommendations ?? []
  const services = getResponseBody(servicesQuery.data) as
    | CommercialServiceCategory[]
    | null
  const serviceName =
    services?.find(item => item.serviceCode === serviceCode)?.serviceName ??
    serviceCode
  const salesSummary = getResponseBody(
    salesSummaryQuery.data,
  ) as CommercialSalesSummary | null
  const stores = getResponseBody(
    storesQuery.data,
  ) as CommercialStoreAnalysis | null
  const population = getResponseBody(
    populationQuery.data,
  ) as CommercialResidentPopulation | null
  const incomeSummary = getResponseBody(
    incomeSummaryQuery.data,
  ) as CommercialIncomeSummary | null
  const facilities = getResponseBody(
    facilitiesQuery.data,
  ) as CommercialFacility | null
  const footTraffic = getResponseBody(
    footTrafficQuery.data,
  ) as CommercialFootTraffic | null
  const sales = getResponseBody(salesQuery.data) as CommercialSales | null
  const income = getResponseBody(
    incomeQuery.data,
  ) as CommercialIncomeAndExpense | null
  const benchmark = getResponseBody(
    benchmarkQuery.data,
  ) as CommercialBenchmark | null
  const trends: Array<{
    metric: CommercialTrendMetric
    label: string
    unit: string
    query: typeof salesTrendQuery
    data: CommercialTrend | null
  }> = [
    {
      metric: 'SALES',
      label: '매출 변화',
      unit: '원',
      query: salesTrendQuery,
      data: getResponseBody(salesTrendQuery.data),
    },
    {
      metric: 'FOOT_TRAFFIC',
      label: '유동인구 변화',
      unit: '명',
      query: footTrendQuery,
      data: getResponseBody(footTrendQuery.data),
    },
    {
      metric: 'STORE',
      label: '점포 변화',
      unit: '개',
      query: storeTrendQuery,
      data: getResponseBody(storeTrendQuery.data),
    },
  ]

  const bookmark = bookmarksQuery.bookmarks.find(
    item => item.targetCode === commercialCode,
  )
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!memberId || !profile?.commercialName) {
        throw new Error('회원 또는 상권 정보를 확인하지 못했습니다.')
      }
      return bookmark
        ? removeMemberBookmark(bookmark.bookmarkId)
        : addMemberBookmark({
            targetType: 'COMMERCIAL',
            targetCode: commercialCode,
            targetName: profile.commercialName,
          })
    },
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        throw new Error('상권 저장을 처리하지 못했습니다.')
      }
      if (memberId) {
        await invalidateMemberBookmarksQuery(queryClient, memberId)
      }
      notify(
        'commercial-bookmark',
        bookmark ? '상권 저장을 해제했어요.' : '상권을 저장했어요.',
      )
    },
    onError: error => {
      notify(
        'commercial-bookmark',
        error instanceof Error
          ? error.message
          : '상권 저장을 처리하지 못했습니다.',
        'error',
      )
    },
  })

  const shareMutation = useMutation({
    mutationFn: (payload: NonNullable<typeof sharePayload>) =>
      createShareLink({ shareType: 'COMMERCIAL_ANALYSIS', payload }),
  })

  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!sharePayload) {
        throw new Error('분석 조건을 확인하지 못했어요.')
      }
      if (archivedBookmarkId) {
        const removed = await deleteAnalysisBookmark(archivedBookmarkId)
        if (!isApiSuccess(removed)) {
          throw new Error(getApiMessage(removed, '보관을 해제하지 못했어요.'))
        }
        return { mode: 'removed' as const, bookmarkId: null }
      }

      const saved = await createAnalysisBookmark({
        shareType: 'COMMERCIAL_ANALYSIS',
        payload: sharePayload,
        ...(profile?.commercialName
          ? {
              bookmarkName: `${profile.commercialName} ${serviceName}`.slice(
                0,
                50,
              ),
            }
          : {}),
      })
      if (!isApiSuccess(saved)) {
        throw new Error(getApiMessage(saved, '보관함에 저장하지 못했어요.'))
      }
      return {
        mode: 'saved' as const,
        bookmarkId: getResponseBody(saved)?.bookmark?.bookmarkId ?? null,
      }
    },
    onSuccess: result => {
      setArchived(
        result.mode === 'saved'
          ? { payloadKey: sharePayloadKey, bookmarkId: result.bookmarkId }
          : null,
      )
      notify(
        ARCHIVE_TOAST_KEY,
        result.mode === 'saved'
          ? '이 분석 화면을 보관함에 저장했어요.'
          : '보관을 해제했어요.',
      )
    },
    onError: error => {
      const failure = classifyAnalysisBookmarkSaveError(error)

      // 409: 이미 같은 화면 상태가 있다. existingBookmarkId 가 오면 해제 토글로 이어간다.
      if (failure.kind === 'duplicate') {
        setArchived({
          payloadKey: sharePayloadKey,
          bookmarkId: failure.existingBookmarkId,
        })
        notify(
          ARCHIVE_TOAST_KEY,
          failure.existingBookmarkId
            ? '이미 보관함에 저장된 화면이에요. 한 번 더 누르면 보관을 해제해요.'
            : '이미 보관함에 저장된 화면이에요. 해제는 보관함에서 할 수 있어요.',
        )
        return
      }

      if (failure.kind === 'unauthorized') {
        router.push(getCommercialBookmarkLoginHref(currentHref))
        return
      }

      // 400 ANALYSIS_BOOKMARK_006(저장 상한)은 서버 문구를 그대로 보여준다.
      notify(ARCHIVE_TOAST_KEY, failure.message, 'error')
    },
  })

  /** 분석 화면 보관함 저장/해제. 지역 북마크(상권 저장)와는 다른 개념이다. */
  const handleArchive = useCallback(() => {
    if (!hasHydrated || archiveMutation.isPending) return
    if (!isLoggedIn) {
      // 돌아왔을 때 "무엇을 하려 했는지"를 남긴다. 이게 없으면 로그인 후 같은 버튼을
      // 다시 찾아 눌러야 한다.
      rememberPendingAction(archiveIntentKey(sharePayloadKey))
      router.push(getCommercialBookmarkLoginHref(currentHref))
      return
    }
    if (!sharePayload) {
      notify(
        ARCHIVE_TOAST_KEY,
        '분석 조건을 다시 선택한 뒤 보관해 주세요.',
        'error',
      )
      return
    }
    archiveMutation.mutate()
  }, [
    archiveMutation,
    currentHref,
    hasHydrated,
    isLoggedIn,
    notify,
    router,
    sharePayload,
    sharePayloadKey,
  ])

  /**
   * 로그인하고 돌아왔을 때 중단됐던 보관을 이어준다.
   *
   * 자동으로 실행하지 않고 **누를 거리를 하나 준다.** 보관은 토글이라, 페이지가 열리자마자
   * 조용히 실행되면 사용자가 의도하지 않은 해제까지 일어날 수 있고 되돌릴 방법이 화면에 없다.
   *
   * `takePendingAction()` 이 읽으면서 지우므로 StrictMode 의 effect 두 번 호출에도
   * 토스트는 한 장만 뜬다. 훅이라서 아래 조기 반환(`invalidMessage`)보다 **앞**에 있어야 한다.
   */
  const archiveResumeRef = useRef(false)
  useEffect(() => {
    if (archiveResumeRef.current) return
    if (!hasHydrated || !isLoggedIn || !sharePayloadKey) return

    const pending = takePendingAction()
    if (pending !== archiveIntentKey(sharePayloadKey)) return

    archiveResumeRef.current = true
    showToast({
      message: '로그인했어요. 보던 화면을 이어서 보관할 수 있어요.',
      dedupeKey: ARCHIVE_TOAST_KEY,
      action: { label: '이어서 보관하기', onAction: handleArchive },
    })
  }, [handleArchive, hasHydrated, isLoggedIn, sharePayloadKey, showToast])

  if (invalidMessage) {
    return (
      <Root>
        <Content>
          <EmptyState
            title={invalidMessage}
            description="지역, 상권, 업종을 다시 선택하면 분석을 시작할 수 있어요."
            action={
              <Button onClick={() => router.push('/analysis')}>
                조건 다시 선택
              </Button>
            }
          />
        </Content>
      </Root>
    )
  }

  /**
   * V2 공유 링크(`POST /share-links`)를 발급해 `/s/{shareCode}` 를 공유한다.
   * 로그인은 필요 없다 — BFF 세션이 있으면 최초 공유자만 기록된다.
   *
   * 같은 화면 상태는 기존 코드가 재사용된다. 연타가 정말 동시에 겹치면 백엔드가
   * 409 로 재시도를 안내하는데, 그건 `createShareLink` 가 흡수한다 — 여기서 볼 일은 없다.
   */
  const handleShare = async () => {
    if (!sharePayload) {
      notify('share', '분석 조건을 다시 선택한 뒤 공유해 주세요.', 'error')
      return
    }

    try {
      const response = await shareMutation.mutateAsync(sharePayload)
      if (!isApiSuccess(response)) {
        throw new Error(
          getApiMessage(response, '공유 링크를 발급하지 못했어요.'),
        )
      }
      const shareCode = getResponseBody(response)?.shareCode
      if (!shareCode) {
        throw new Error('공유 링크를 발급하지 못했어요.')
      }

      const shareUrl = createShareUrl(
        shareCode,
        typeof window === 'undefined' ? null : window.location.origin,
      )
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: `${profile?.commercialName ?? '상권'} 분석 결과`,
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
      }
      notify('share', '공유 링크를 준비했어요. 링크는 90일간 열 수 있어요.')
    } catch (error) {
      // 사용자가 공유 시트를 닫은 것(AbortError)은 실패가 아니다.
      if (error instanceof Error && error.name === 'AbortError') return
      notify('share', classifyShareLinkError(error).message, 'error')
    }
  }

  const handleBookmark = () => {
    if (!hasHydrated) return
    if (!isLoggedIn) {
      router.push(getCommercialBookmarkLoginHref(currentHref))
      return
    }
    bookmarkMutation.mutate()
  }

  const summaryCards = [
    {
      label: '월 매출',
      value:
        profile?.keyMetrics?.totalSalesAmount ??
        salesSummary?.commercial?.monthlySalesAmount,
      unit: '원',
    },
    {
      label: '유동인구',
      value: profile?.keyMetrics?.totalFootTraffic,
      unit: '명',
    },
    {
      label: '점포 수',
      value: profile?.keyMetrics?.totalStoreCount ?? stores?.totalStoreCount,
      unit: '개',
    },
    {
      label: '상주인구',
      value:
        profile?.keyMetrics?.totalResidentPopulation ??
        population?.byAgeItem?.totalResidentPopulation,
      unit: '명',
    },
  ] as const

  const renderGroupHeading = (label: string) => (
    <GroupHeadingRow>
      <GroupHeading>{label}</GroupHeading>
      <AnalysisPeriodSelect value={periodCode} onChange={handlePeriodChange} />
    </GroupHeadingRow>
  )

  return (
    <Root>
      <StickyHeader>
        <HeaderInner>
          <HeaderTop>
            <HeaderCopy>
              <HeaderNameRow>
                <h1>
                  {profileQuery.isPending
                    ? '상권 정보를 불러오는 중'
                    : (profile?.commercialName ?? `상권 ${commercialCode}`)}
                </h1>
                <span>
                  {profile
                    ? `${profile.districtName} · ${profile.administrationName} · ${formatPeriodCode(
                        periodCode,
                      )} 기준`
                    : `${formatPeriodCode(periodCode)} 기준`}
                </span>
              </HeaderNameRow>
            </HeaderCopy>
            {/* 닫으면 실제로 뒤에 지도가 있으므로 모든 경로에서 "닫기"가 정직한
                표현이다. 하드 로드 전용 분기(ArrowLeft + '조건 다시 선택')는 독립
                결과 페이지 개념과 함께 폐기됐다(map-shell.md D4-5). */}
            <IconButton
              type="button"
              aria-label="상권 분석 결과 닫기"
              onClick={
                onClose ??
                (() =>
                  router.replace(createAnalysisExplorerHref(selection, camera)))
              }
            >
              <X />
            </IconButton>
          </HeaderTop>
          <MobileTabList aria-label="분석 결과 항목" role="tablist">
            {ANALYSIS_TABS.map(tab => (
              <HeaderTabButton
                key={tab.value}
                type="button"
                role="tab"
                $active={spyTab === tab.value}
                aria-selected={spyTab === tab.value}
                aria-current={spyTab === tab.value ? 'true' : undefined}
                onClick={() => handleTabClick(tab.value)}
              >
                {tab.label}
              </HeaderTabButton>
            ))}
          </MobileTabList>
        </HeaderInner>
      </StickyHeader>

      <ResultLayout>
        <SidebarColumn>
          <AnalysisResultNav
            tabs={ANALYSIS_TABS}
            activeTab={spyTab}
            onSelect={handleTabClick}
          />
        </SidebarColumn>
        <ContentColumn>
          <ContextHero>
            {/* 제목은 정보여야 한다. 예전에는 `{상권}의 창업 데이터를 확인해 보세요`
                였는데, 상권명은 바로 위 sticky 헤더의 h1 이 이미 말하고 있고 데이터는
                이 블록 아래에 전부 펼쳐져 있어서 "확인해 보세요"가 남는 게 없었다.
                헤더가 말하지 않는 유일한 조건인 **업종**을 제목 자리에 올린다. */}
            <ContextCopy>
              <p>선택 업종</p>
              <h2>{serviceName}</h2>
            </ContextCopy>
            <ActionRow>
              <Button
                size="medium"
                variant="secondary"
                leftIcon={<Share2 />}
                isLoading={shareMutation.isPending}
                disabled={!sharePayload}
                onClick={() => void handleShare()}
              >
                공유
              </Button>
              <Button
                size="medium"
                variant="secondary"
                leftIcon={isArchived ? <Check /> : <Archive />}
                isLoading={archiveMutation.isPending}
                disabled={!hasHydrated || !sharePayload}
                onClick={handleArchive}
                title="업종·기간 조건까지 포함한 지금 화면을 보관함에 저장합니다"
              >
                {isArchived ? '보관됨' : '화면 보관'}
              </Button>
              <Button
                size="medium"
                variant="secondary"
                leftIcon={bookmark ? <Check /> : <Bookmark />}
                isLoading={bookmarkMutation.isPending}
                disabled={!hasHydrated || profileQuery.isPending}
                onClick={handleBookmark}
                title="상권 자체를 지역 북마크에 저장합니다"
              >
                {bookmark ? '저장됨' : '상권 저장'}
              </Button>
              <Button
                size="medium"
                rightIcon={<ExternalLink />}
                onClick={() =>
                  // V2 계약은 코드로 받는다. 예전에는 `gugun`(자치구 *이름*)과 빈
                  // `serviceCodeName` 을 보내는 V1 형태였는데, `districtCode` 가 없어
                  // 시뮬레이션 쪽 컨텍스트 카드가 자치구를 복원하지 못했다.
                  router.push(
                    `/analysis/simulation?${new URLSearchParams({
                      districtCode,
                      administrationCode,
                      commercialCode,
                      serviceCode,
                    })}`,
                  )
                }
              >
                시뮬레이션
              </Button>
            </ActionRow>
          </ContextHero>

          {/* 이건 토스트로 옮기지 않는다. 동작의 결과가 아니라 **목록 조회 실패**라
              상태가 지속되는 동안 계속 보여야 한다 — 자동으로 사라지면 안 된다. */}
          {bookmarksQuery.errorMessage ? (
            <Feedback>{bookmarksQuery.errorMessage}</Feedback>
          ) : null}

          <ReportSection
            id={createReportSectionId('summary')}
            ref={registerSection('summary')}
          >
            {renderGroupHeading('요약')}
            <DashboardGrid>
              <FullSpanItem>
                <AnalysisResultSection
                  title="핵심 지표"
                  description="선택한 상권과 업종의 주요 수치를 먼저 확인하세요."
                  loading={profileQuery.isPending}
                  error={resolveApiError(profileQuery)}
                  empty={!profile?.keyMetrics && !salesSummary && !stores}
                  onRetry={() => void profileQuery.refetch()}
                >
                  {renderCards(summaryCards)}
                </AnalysisResultSection>
              </FullSpanItem>

              {/*
                DESIGN.md 「Charts」: 「가로 막대는 카드 하나를 가로지르게(full) 두지
                않는다.」 세로 막대·꺾은선·도넛은 넓을수록 좋아지지만 가로 막대는
                나빠진다 — 일반 그리드 칸에 두어 옆 카드와 같은 폭을 쓴다.
              */}
              <div>
                <AnalysisResultSection
                  title="지역별 월 매출 비교"
                  loading={salesSummaryQuery.isPending}
                  error={resolveApiError(salesSummaryQuery)}
                  empty={!hasObjectValues(salesSummary)}
                  onRetry={() => void salesSummaryQuery.refetch()}
                >
                  <SalesComparisonBars
                    items={[
                      salesSummary?.district,
                      salesSummary?.administration,
                      salesSummary?.commercial,
                    ].map((item, index) => ({
                      label: item?.name ?? ['자치구', '행정동', '상권'][index],
                      value: item?.monthlySalesAmount,
                      strong: index === 2,
                    }))}
                  />
                </AnalysisResultSection>
              </div>

              <FullSpanItem>
                <AnalysisResultSection
                  title="점포 현황"
                  loading={storesQuery.isPending}
                  error={resolveApiError(storesQuery)}
                  empty={!hasObjectValues(stores)}
                  onRetry={() => void storesQuery.refetch()}
                >
                  {renderCards([
                    {
                      label: '총 점포',
                      value: stores?.totalStoreCount,
                      unit: '개',
                    },
                    {
                      label: '개업률',
                      value: stores?.openingRate,
                      unit: '%',
                    },
                    {
                      label: '폐업률',
                      value: stores?.closureRate,
                      unit: '%',
                    },
                    {
                      label: '프랜차이즈',
                      value: stores?.franchiseStoreCount,
                      unit: '개',
                    },
                  ])}
                </AnalysisResultSection>
              </FullSpanItem>
              <FullSpanItem>
                <AnalysisResultSection
                  title="생활권·시설"
                  loading={
                    populationQuery.isPending || facilitiesQuery.isPending
                  }
                  error={
                    resolveApiError(populationQuery) ??
                    resolveApiError(facilitiesQuery)
                  }
                  empty={
                    !hasObjectValues(population) && !hasObjectValues(facilities)
                  }
                  onRetry={() => {
                    void populationQuery.refetch()
                    void facilitiesQuery.refetch()
                  }}
                >
                  {renderCards([
                    {
                      label: '상주인구',
                      value: population?.byAgeItem?.totalResidentPopulation,
                      unit: '명',
                    },
                    {
                      label: '주요 시설',
                      value: facilities?.totalFacilityCount,
                      unit: '개',
                    },
                    {
                      label: '학교',
                      value: facilities?.schoolCountItem?.totalSchoolCount,
                      unit: '개',
                    },
                    {
                      label: '대중교통',
                      value: facilities?.totalTransportationFacilityCount,
                      unit: '개',
                    },
                  ])}
                </AnalysisResultSection>
              </FullSpanItem>

              {/*
                지원 정책은 **새 호출 없이** 그린다 — 이미 도는 `profileQuery` 의
                `policyRecommendations` 를 읽는다. 백엔드가 진작 내려주고 있었는데
                타입에 없어서 버리고 있던 값이다.

                여덟 번째 탭을 만들지 않은 이유: 최대 5건이고, 정책 데이터가 없는
                환경에서는 탭 자체가 빈 화면이 된다. 요약의 실행 가능한 마무리로 둔다.
              */}
              <FullSpanItem>
                <AnalysisResultSection
                  title="받을 수 있는 지원"
                  description="이 상권의 자치구와 업종으로 신청 가능한 지원 정책이에요. 지역 제한이 없는 전국 정책도 함께 나와요."
                  loading={profileQuery.isPending}
                  error={resolveApiError(profileQuery)}
                  empty={policyRecommendations.length === 0}
                  emptyDescription="이 조건에서 안내할 지원 정책이 없어요."
                  onRetry={() => void profileQuery.refetch()}
                >
                  <AnalysisPolicyList
                    policies={policyRecommendations}
                    districtCode={profile?.districtCode ?? null}
                    districtName={profile?.districtName ?? null}
                  />
                </AnalysisResultSection>
              </FullSpanItem>
            </DashboardGrid>
          </ReportSection>

          <ReportSection
            id={createReportSectionId('foot-traffic')}
            ref={registerSection('foot-traffic')}
          >
            {renderGroupHeading('유동인구')}
            <DashboardGrid>
              <AnalysisResultSection
                title="시간대별 유동인구"
                loading={footTrafficQuery.isPending}
                error={resolveApiError(footTrafficQuery)}
                empty={
                  !hasObjectValues(
                    footTraffic?.byTimeSlotItem as Record<
                      string,
                      number | null
                    > | null,
                  )
                }
                onRetry={() => void footTrafficQuery.refetch()}
              >
                <ChartBox $maxWidth={560}>
                  <LineChart
                    points={toLinePoints(
                      createRows(
                        footTraffic?.byTimeSlotItem as Record<
                          string,
                          number | null
                        >,
                        footTimeDefinitions,
                      ),
                    )}
                    unit="명"
                    ariaLabel="시간대별 유동인구 추이"
                  />
                </ChartBox>
              </AnalysisResultSection>

              <AnalysisResultSection
                title="요일별 유동인구"
                loading={footTrafficQuery.isPending}
                error={resolveApiError(footTrafficQuery)}
                empty={
                  !hasObjectValues(
                    footTraffic?.byDayOfWeekItem as Record<
                      string,
                      number | null
                    > | null,
                  )
                }
                onRetry={() => void footTrafficQuery.refetch()}
              >
                <ChartBox $maxWidth={460}>
                  <BarChart
                    items={createRows(
                      footTraffic?.byDayOfWeekItem as Record<
                        string,
                        number | null
                      >,
                      footDayDefinitions,
                    )}
                    unit="명"
                    ariaLabel="요일별 유동인구 막대 차트"
                    emphasisLabels={['토', '일']}
                  />
                </ChartBox>
              </AnalysisResultSection>

              <AnalysisResultSection
                title="연령·성별 유동인구"
                loading={footTrafficQuery.isPending}
                error={resolveApiError(footTrafficQuery)}
                empty={toPyramidRows(footTraffic?.byAgeGenderPercentItem).every(
                  row => row.male === null && row.female === null,
                )}
                onRetry={() => void footTrafficQuery.refetch()}
              >
                <ChartBox $maxWidth={460}>
                  <PopulationPyramid
                    rows={toPyramidRows(footTraffic?.byAgeGenderPercentItem)}
                    unit="%"
                  />
                </ChartBox>
              </AnalysisResultSection>
            </DashboardGrid>
          </ReportSection>

          <ReportSection
            id={createReportSectionId('sales')}
            ref={registerSection('sales')}
          >
            {renderGroupHeading('매출')}
            <DashboardGrid>
              <AnalysisResultSection
                title="시간대별 매출"
                loading={salesQuery.isPending}
                error={resolveApiError(salesQuery)}
                empty={
                  !hasObjectValues(
                    sales?.amountByTimeSlotItem as Record<
                      string,
                      number | null
                    > | null,
                  )
                }
                onRetry={() => void salesQuery.refetch()}
              >
                <ChartBox $maxWidth={560}>
                  <LineChart
                    points={toLinePoints(
                      createRows(
                        sales?.amountByTimeSlotItem as Record<
                          string,
                          number | null
                        >,
                        salesTimeDefinitions,
                      ),
                    )}
                    unit="원"
                    ariaLabel="시간대별 매출 추이"
                  />
                </ChartBox>
              </AnalysisResultSection>

              <AnalysisResultSection
                title="요일별 매출"
                loading={salesQuery.isPending}
                error={resolveApiError(salesQuery)}
                empty={
                  !hasObjectValues(
                    sales?.amountByDayOfWeekItem as Record<
                      string,
                      number | null
                    > | null,
                  )
                }
                onRetry={() => void salesQuery.refetch()}
              >
                <ChartBox $maxWidth={460}>
                  <BarChart
                    items={createRows(
                      sales?.amountByDayOfWeekItem as Record<
                        string,
                        number | null
                      >,
                      salesDayDefinitions,
                    )}
                    unit="원"
                    ariaLabel="요일별 매출 막대 차트"
                    emphasisLabels={['토', '일']}
                  />
                </ChartBox>
              </AnalysisResultSection>

              <AnalysisResultSection
                title="연령별 매출"
                loading={salesQuery.isPending}
                error={resolveApiError(salesQuery)}
                empty={
                  !hasObjectValues(
                    sales?.amountByAgeItem as Record<
                      string,
                      number | null
                    > | null,
                  )
                }
                onRetry={() => void salesQuery.refetch()}
              >
                <ChartBox $maxWidth={460}>
                  <BarChart
                    items={createRows(
                      sales?.amountByAgeItem as Record<string, number | null>,
                      salesAgeDefinitions,
                    )}
                    unit="원"
                    ariaLabel="연령별 매출 막대 차트"
                  />
                </ChartBox>
              </AnalysisResultSection>

              <AnalysisResultSection
                title="성별 매출 건수"
                loading={salesQuery.isPending}
                error={resolveApiError(salesQuery)}
                empty={toGenderSegments(
                  sales?.countByGenderItem?.maleSalesCount,
                  sales?.countByGenderItem?.femaleSalesCount,
                ).every(segment => segment.value <= 0)}
                onRetry={() => void salesQuery.refetch()}
              >
                <ChartBox $maxWidth={200}>
                  <DonutChart
                    segments={toGenderSegments(
                      sales?.countByGenderItem?.maleSalesCount,
                      sales?.countByGenderItem?.femaleSalesCount,
                    )}
                    ariaLabel="성별 매출 건수 도넛"
                    unit="건"
                  />
                </ChartBox>
              </AnalysisResultSection>
            </DashboardGrid>
          </ReportSection>

          <ReportSection
            id={createReportSectionId('stores')}
            ref={registerSection('stores')}
          >
            {renderGroupHeading('점포')}
            <DashboardGrid>
              <FullSpanItem>
                <AnalysisResultSection
                  title="점포 분석"
                  description="개·폐업과 프랜차이즈 현황을 함께 확인하세요."
                  loading={storesQuery.isPending}
                  error={resolveApiError(storesQuery)}
                  empty={!hasObjectValues(stores)}
                  onRetry={() => void storesQuery.refetch()}
                >
                  {renderCards([
                    {
                      label: '총 점포',
                      value: stores?.totalStoreCount,
                      unit: '개',
                    },
                    {
                      label: '유사 업종 점포',
                      value: stores?.similarStoreCount,
                      unit: '개',
                    },
                    {
                      label: '개업 점포',
                      value: stores?.openedStoreCount,
                      unit: '개',
                    },
                    {
                      label: '폐업 점포',
                      value: stores?.closedStoreCount,
                      unit: '개',
                    },
                  ])}
                </AnalysisResultSection>
              </FullSpanItem>
            </DashboardGrid>
          </ReportSection>

          <ReportSection
            id={createReportSectionId('living')}
            ref={registerSection('living')}
          >
            {renderGroupHeading('생활권')}
            <DashboardGrid>
              <AnalysisResultSection
                title="연령별 상주인구"
                loading={populationQuery.isPending}
                error={resolveApiError(populationQuery)}
                empty={!hasObjectValues(population?.byAgeItem)}
                onRetry={() => void populationQuery.refetch()}
              >
                <ChartBox $maxWidth={460}>
                  <BarChart
                    items={createRows(
                      population?.byAgeItem as Record<
                        string,
                        number | null | undefined
                      >,
                      populationAgeDefinitions,
                    )}
                    unit="명"
                    ariaLabel="연령별 상주인구 막대 차트"
                  />
                </ChartBox>
              </AnalysisResultSection>
              <AnalysisResultSection
                title="성별 상주인구"
                loading={populationQuery.isPending}
                error={resolveApiError(populationQuery)}
                empty={toGenderSegments(
                  population?.malePercentage,
                  population?.femalePercentage,
                ).every(segment => segment.value <= 0)}
                onRetry={() => void populationQuery.refetch()}
              >
                <ChartBox $maxWidth={200}>
                  <DonutChart
                    segments={toGenderSegments(
                      population?.malePercentage,
                      population?.femalePercentage,
                    )}
                    ariaLabel="성별 상주인구 도넛"
                    unit="%"
                  />
                </ChartBox>
              </AnalysisResultSection>
              <AnalysisResultSection
                title="소득과 소비"
                loading={incomeQuery.isPending}
                error={
                  // incomeSummary 는 이 섹션에서 렌더하지 않고 `empty` 계산에만 쓰인다.
                  // 그래서 던져진 실패(isError)만 오류로 보고, 본문 실패(200 + success:false)로는
                  // 이미 받아 둔 소득 데이터를 가리지 않는다 — 변경 전 조건과 등가.
                  resolveApiError(incomeQuery) ??
                  resolveApiError({ error: incomeSummaryQuery.error })
                }
                empty={
                  !hasObjectValues(income) && !hasObjectValues(incomeSummary)
                }
                onRetry={() => {
                  void incomeQuery.refetch()
                  void incomeSummaryQuery.refetch()
                }}
              >
                <MetricCard>
                  <span>월 평균 소득</span>
                  <strong>
                    {formatAnalysisValue(
                      income?.averageIncomeItem?.monthlyAverageIncomeAmount,
                      '원',
                    )}
                  </strong>
                </MetricCard>
                <AnalysisMetricList
                  rows={createRows(
                    income?.expenseByCategoryItem as Record<
                      string,
                      number | null | undefined
                    >,
                    expenseDefinitions,
                  )}
                  unit="원"
                />
              </AnalysisResultSection>
              <FullSpanItem>
                <AnalysisResultSection
                  title="주요 시설과 교통"
                  loading={facilitiesQuery.isPending}
                  error={resolveApiError(facilitiesQuery)}
                  empty={!hasObjectValues(facilities)}
                  onRetry={() => void facilitiesQuery.refetch()}
                >
                  {renderCards([
                    {
                      label: '전체 시설',
                      value: facilities?.totalFacilityCount,
                      unit: '개',
                    },
                    {
                      label: '전체 학교',
                      value: facilities?.schoolCountItem?.totalSchoolCount,
                      unit: '개',
                    },
                    {
                      label: '초·중·고',
                      value:
                        (facilities?.schoolCountItem?.elementarySchoolCount ??
                          0) +
                        (facilities?.schoolCountItem?.middleSchoolCount ?? 0) +
                        (facilities?.schoolCountItem?.highSchoolCount ?? 0),
                      unit: '개',
                    },
                    {
                      label: '대중교통 시설',
                      value: facilities?.totalTransportationFacilityCount,
                      unit: '개',
                    },
                  ])}
                </AnalysisResultSection>
              </FullSpanItem>
            </DashboardGrid>
          </ReportSection>

          <ReportSection
            id={createReportSectionId('trend')}
            ref={registerSection('trend')}
          >
            {renderGroupHeading('트렌드')}
            <DashboardGrid>
              {trends.map(({ metric, label, unit, query, data }) => (
                <AnalysisResultSection
                  key={metric}
                  title={label}
                  loading={query.isPending}
                  error={resolveApiError(query)}
                  empty={!data?.periods?.length}
                  onRetry={() => void query.refetch()}
                >
                  <ChartBox $maxWidth={560}>
                    <LineChart
                      points={toTrendPoints(data)}
                      unit={unit}
                      direction={data?.trendDirection ?? null}
                    />
                  </ChartBox>
                </AnalysisResultSection>
              ))}
            </DashboardGrid>
          </ReportSection>

          <ReportSection
            id={createReportSectionId('benchmark')}
            ref={registerSection('benchmark')}
          >
            {renderGroupHeading('지역 평균 대비')}
            <DashboardGrid>
              <FullSpanItem>
                <AnalysisResultSection
                  title="비교 분석"
                  description={benchmark?.summary ?? undefined}
                  loading={benchmarkQuery.isPending}
                  error={resolveApiError(benchmarkQuery)}
                  empty={!hasObjectValues(benchmark)}
                  onRetry={() => void benchmarkQuery.refetch()}
                >
                  {benchmark?.benchmarkHighlights?.length ? (
                    <HighlightList>
                      {benchmark.benchmarkHighlights.map(highlight => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </HighlightList>
                  ) : (
                    <EmptyState
                      title="비교 하이라이트가 없어요"
                      description="제공된 지역별 매출과 소비 수치를 확인해 주세요."
                    />
                  )}
                  <ComparisonGrid>
                    {[
                      benchmark?.salesSummary?.district,
                      benchmark?.salesSummary?.administration,
                      benchmark?.salesSummary?.commercial,
                    ].map((item, index) => (
                      <ComparisonItem key={item?.code ?? index}>
                        <span>
                          {item?.name ?? ['자치구', '행정동', '상권'][index]}
                        </span>
                        <strong>
                          {formatAnalysisValue(item?.monthlySalesAmount, '원')}
                        </strong>
                      </ComparisonItem>
                    ))}
                  </ComparisonGrid>
                </AnalysisResultSection>
              </FullSpanItem>
            </DashboardGrid>
          </ReportSection>
        </ContentColumn>
      </ResultLayout>
    </Root>
  )
}
