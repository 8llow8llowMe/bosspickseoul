'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Archive,
  ArrowUpRight,
  Bookmark,
  Check,
  ExternalLink,
  Share2,
  X,
} from 'lucide-react'
import styled, { css } from 'styled-components'

import AnalysisMetricList from '@/components/analysis/analysis-metric-list'
import {
  Banknote,
  Footprints,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'

import AnalysisResultSection from '@/components/analysis/analysis-result-section'
import ExpenseProvenanceNote from '@/components/analysis/expense-provenance-note'
import AnalysisSummaryCards, {
  type SummaryCard,
} from '@/components/analysis/analysis-summary-cards'
import AnalysisSummaryInsights, {
  type SummaryInsight,
} from '@/components/analysis/analysis-summary-insights'
import BarChart from '@/components/analysis/charts/bar-chart'
import { genderColorsFor } from '@/components/analysis/charts/chart-theme'
import HorizontalBarChart from '@/components/analysis/charts/horizontal-bar-chart'
import PopulationPyramid from '@/components/analysis/charts/population-pyramid'
import ShareBar from '@/components/analysis/charts/share-bar'
import AnalysisTrendSummary, {
  resolveTrendSectionState,
} from '@/components/analysis/analysis-trend-summary'
import AnalysisResultNav from '@/components/analysis/analysis-result-nav'
import AnalysisPeriodSelect from '@/components/analysis/analysis-period-select'
import { Badge } from '@/components/ui/badge'
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
  formatSignedPercentPoint,
  splitPeerStoreChangeRows,
  splitPeerStoreRows,
  toPeerStoreChangeRows,
  toPeerStoreRows,
} from '@/lib/analysis/presentation'
import {
  createRows,
  footTimeDefinitions,
  footDayDefinitions,
  salesTimeDefinitions,
  salesDayDefinitions,
  salesAgeDefinitions,
  populationAgeDefinitions,
} from '@/lib/analysis/commercial-chart-selectors'
import { toPerHourRows } from '@/lib/analysis/time-slot'
import {
  describeFootAgeGenderPeak,
  describeFootDayPattern,
  describeFootTimePeak,
  describeGenderShare,
  describePopulationAgePeak,
  describeSalesAgePeak,
  describeSalesDayPeak,
  describeSalesTimeShare,
  describeStoreCompetition,
} from '@/lib/analysis/chart-insights'
import {
  EXPENSE_PROXY_BADGE_LABEL,
  hasExpenseByCategory,
  hasRegionalExpense,
  toExpenseCategoryRows,
  toExpenseProvenanceView,
  toRegionalExpenseProxyNote,
  toRegionalExpenseRows,
} from '@/lib/analysis/expense-presentation'
import { toDistrictIncomeView } from '@/lib/analysis/district-income-presentation'
import {
  formatSalesPerStoreIndex,
  formatStoreCount,
  toBenchmarkSalesView,
} from '@/lib/analysis/benchmark-presentation'
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
import { createRecommendHandoffLabel } from '@/lib/analysis/recommend-handoff'
import {
  describeSalesPerStoreEmpty,
  describeSalesPerStoreSentence,
  describeSalesShareSentence,
  describeTotalSalesCaption,
  resolveMonthlySalesPerStore,
} from '@/lib/analysis/summary-sales'
import { useActivatedSections } from '@/lib/analysis/use-activated-sections'
import { useScrollSpy } from '@/lib/analysis/use-scroll-spy'
import { useResolvedAnalysisPeriod } from '@/hooks/use-resolved-analysis-period'
import { invalidateMemberBookmarksQuery } from '@/lib/recommend/recommend-bookmarks'
import { createRecommendHrefFromCodes } from '@/lib/recommend/recommend-url'
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
import { shellWidth } from '@/styles/layout'
import { touchHitArea } from '@/styles/touch-target'

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
  ${shellWidth}
  padding: 10px 0 0;

  @media (max-width: 640px) {
    width: min(100% - 28px, 1320px);
    padding-top: 8px;
  }
`

/**
 * 헤더 한 줄: [상권명][위치 메타][기간 선택][닫기].
 *
 * 기간 선택은 **여기 하나만** 둔다. 예전에는 7개 그룹 머리마다 같은 select 가 있었는데
 * 모두 URL 의 periodCode 하나를 바꿨다 — 일곱 개로 보이면 사용자는 그룹마다 따로 바뀐다고
 * 읽는다. sticky 헤더에 두면 어느 그룹을 읽든 지금 보는 분기가 보인다.
 *
 * 모바일(≤640px)은 두 줄이다: [상권명][닫기] / [위치 메타][기간 선택].
 */
const HeaderTop = styled.div`
  display: grid;
  /* 메타 칸 최소 96px — 상권명이 길면 이름이 먼저 말줄임되고 위치 메타는 남는다. */
  grid-template-columns: minmax(0, max-content) minmax(96px, 1fr) auto auto;
  grid-template-areas: 'name meta period close';
  align-items: center;
  column-gap: 12px;
  row-gap: 4px;
  padding-bottom: 8px;

  h1 {
    grid-area: name;
    overflow: hidden;
    color: var(--color-text-900);
    font-size: 20px;
    font-weight: 700;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'name close'
      'meta period';

    h1 {
      font-size: 16px;
    }
  }
`

const HeaderMeta = styled.span`
  grid-area: meta;
  overflow: hidden;
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const HeaderPeriod = styled.div`
  grid-area: period;
  justify-self: end;
`

const HeaderClose = styled.div`
  grid-area: close;
  justify-self: end;
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

  /*
    hover 와 포커스를 한 선택자에 묶고 'outline: none' 까지 두면 키보드 포커스가
    화면에서 사라진다 — 마우스로 지나간 것과 똑같이 보이고, 링도 없다. 배경 변화는
    둘 다 유지하고 포커스에서는 전역 :focus-visible 링을 그대로 살려 둔다.
  */
  &:hover,
  &:focus-visible {
    background: var(--color-surface-muted);
    color: var(--color-text-900);
  }

  svg {
    width: 21px;
    height: 21px;
  }
`

/** 헤더 전용 타이트 탭 버튼. 공유 TabButton을 확장(다른 화면의 탭에는 영향 없음). */
const HeaderTabButton = styled(TabButton)`
  padding: 0 10px;
  font-size: 13px;
`

const Content = styled.div`
  ${shellWidth}
  padding: 28px 0 56px;
  display: grid;
  gap: 28px;

  @media (max-width: 640px) {
    width: min(100% - 28px, 1320px);
    padding: 20px 0 max(36px, env(safe-area-inset-bottom));
  }
`

/**
 * 데스크톱: [사이드바][콘텐츠] 2컬럼. ≤1024px 는 단일 컬럼 + 상단 가로 탭.
 *
 * 1024 는 지도 셸(`useNarrowViewport`)과 같은 분기다. 840 이던 때는 841~1024px 태블릿이
 * 사이드바를 단 데스크톱 모달을 받아 콘텐츠 열이 600px 안팎으로 좁았다.
 */
const ResultLayout = styled.div`
  ${shellWidth}
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 28px;
  padding: 20px 0 56px;

  @media (max-width: 1024px) {
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

  @media (max-width: 1024px) {
    display: none;
  }
`

/** 사이드바 오른쪽 콘텐츠 컬럼. 폭/패딩은 ResultLayout이 담당. */
const ContentColumn = styled.div`
  min-width: 0;
  display: grid;
  gap: 28px;
`

/**
 * 모바일 전용 상단 가로 탭. 데스크톱에서는 숨김.
 *
 * 탭 7개가 375px 에 다 들어가지 않는데 스크롤바가 없어(`TabList` 의 `scrollbar-width: none`)
 * 「지역 평균 대비」가 잘린 채로 끝처럼 보였다. 가려진 쪽 끝을 흐리게 해 더 있다고 알린다 —
 * 흐림은 실제로 가려진 쪽에만 둔다(끝까지 밀었는데 흐리면 마지막 탭이 잘려 보인다).
 * `position: relative` 는 활성 탭 자동 스크롤이 `offsetLeft` 를 이 목록 기준으로 읽게 한다.
 */
const MobileTabList = styled(TabList)<{
  $fadeStart: boolean
  $fadeEnd: boolean
}>`
  display: none;
  position: relative;
  ${props => {
    const mask = `linear-gradient(to right, transparent 0, #000 ${props.$fadeStart ? 28 : 0}px, #000 calc(100% - ${props.$fadeEnd ? 28 : 0}px), transparent 100%)`
    return props.$fadeStart || props.$fadeEnd
      ? css`
          -webkit-mask-image: ${mask};
          mask-image: ${mask};
        `
      : ''
  }}

  @media (max-width: 1024px) {
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
  /* 카드 그리드(DashboardGrid)가 열 수를 이 폭으로 정한다. 뷰포트가 달라도 사이드바 때문에
     콘텐츠 폭이 같을 수 있어서(1024px 뷰포트 → 990 · 1280px 뷰포트 → 990) 뷰포트로는
     정할 수 없다. */
  container: analysis-report / inline-size;
  display: grid;
  gap: 16px;
  /* 데스크톱: sticky 헤더(≈63px) 아래로 자연스럽게 안착. */
  scroll-margin-top: 76px;

  /* ≤1024px: 헤더에 가로 탭 바가 포함돼 더 높다(≈108px). */
  @media (max-width: 1024px) {
    scroll-margin-top: 116px;
  }

  /* ≤640px: 헤더가 두 줄(상권명 / 메타·기간)이 되고 탭 바(44px)가 붙는다(≈154px). */
  @media (max-width: 640px) {
    scroll-margin-top: 160px;
  }
`

/**
 * 보고서 맨 끝에 두는 추천 이탈구. **상단에는 두지 않는다** — 읽기도 전에 나가라는
 * 신호가 된다(condition-selector D8-2).
 *
 * 카드·채움 배경·큰 버튼으로 그리지 않는다. 그렇게 그리면 광고 배너로 읽히고,
 * 광고처럼 보이는 것은 눌리지 않는다(DESIGN.md 페르소나). 얇은 구분선 한 줄 위에
 * 문장과 텍스트 링크만 둔다.
 */
const RecommendHandoff = styled.div`
  display: grid;
  gap: 4px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-200);
`

const RecommendHandoffNote = styled.p`
  color: var(--color-text-caption-on-band);
  font-size: 13px;
  line-height: 20px;
`

/* 텍스트 링크지만 손가락으로도 눌린다 — 최소 44px 를 지킨다. 좌우 패딩만큼 음수
   마진을 줘 글자는 본문 왼쪽 선에 맞춘다. */
const RecommendHandoffLink = styled(Link)`
  justify-self: start;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: -8px;
  padding: 0 8px;
  border-radius: var(--radius-control);
  color: var(--color-text-primary-on-light);
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
  text-decoration: underline;
  text-underline-offset: 3px;

  & svg {
    width: 16px;
    height: 16px;
  }

  /* hover 글자색을 primary-600 으로 옮기면 grey100 위 4.07:1 이다. 색은 두고 밑줄을 굵혀 알린다. */
  &:hover {
    text-decoration-thickness: 2px;
  }

  &:focus-visible {
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

/**
 * 각 탭 그룹 좌상단에 표시하는 헤딩(요약/유동인구/매출 등). 기간 선택은 헤더로 옮겼다
 * (`HeaderTop` 참고).
 */
const GroupHeading = styled.h2`
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
`

/**
 * 열 수는 **콘텐츠 폭**(`analysis-report` 컨테이너)으로 정한다 — 1열 <640 · 2열 · 3열 ≥1080.
 *
 * 예전에는 뷰포트 1280px 에서 3열이었는데, 그 폭은 사이드바를 빼면 콘텐츠가 990px 라
 * 칸이 317px 로 좁았다. 1080 은 칸이 약 347px 가 되는 첫 폭이다(1440px 뷰포트 → 1150 · 칸 370).
 *
 * `$maxColumns={2}` 는 3열에서도 2열로 둔다. 가로 막대 두 장이 나란히 서는 그룹(점포)은
 * 3열이면 셋째 칸이 빈다.
 */
/** 카드 그리드가 3열이 되는 콘텐츠 폭. `PairSpanItem` 과 반드시 같은 값을 쓴다 — 어긋나면 그
 * 사이 구간에서 2열 그리드에 보통 칸이 되어 셋째 카드가 다시 혼자 남는다. */
const REPORT_THREE_COLUMN_MIN = 1080

const DashboardGrid = styled.div<{ $maxColumns?: 2 }>`
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

  ${props =>
    props.$maxColumns === 2
      ? ''
      : css`
          @container analysis-report (min-width: ${REPORT_THREE_COLUMN_MIN}px) {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        `}

  @container analysis-report (max-width: 639px) {
    grid-template-columns: 1fr;
  }
`

/** Wide content (line charts, the pyramid, multi-card comparisons) spans the full grid row. */
const FullSpanItem = styled.div`
  min-width: 0;
  grid-column: 1 / -1;
`

/**
 * 카드 3장 그룹에서 **2열일 때만** 한 줄을 다 쓰는 칸. 3열이면 보통 칸이다.
 *
 * 2열에서 3장을 그대로 두면 마지막 카드가 혼자 남고 옆 칸이 빈다. 넓어질수록 좋아지는
 * 카드(세로 막대 · 비교 타일)를 고른다 — 가로 막대·피라미드는 고르지 않는다(DESIGN.md 「Charts」).
 */
const PairSpanItem = styled.div`
  min-width: 0;
  grid-column: 1 / -1;

  @container analysis-report (min-width: ${REPORT_THREE_COLUMN_MIN}px) {
    grid-column: auto;
  }
`

/**
 * 3열일 때만 **두 칸**을 쓰는 칸. 2열·1열이면 보통 칸이다.
 *
 * 생활권 그룹은 카드 3장 줄 뒤에 「자치구 평균 소득」과 「주요 시설과 교통」이 남는다. 3열에서
 * 둘을 보통 칸으로 두면 셋째 칸이 비고, 시설을 한 줄 다 쓰게 하면 소득 카드가 혼자 남는다.
 * 숫자 하나뿐인 소득 카드에 한 칸, 타일 네 개인 시설 카드에 두 칸을 준다.
 */
const WideInThreeColumnsItem = styled.div`
  min-width: 0;

  @container analysis-report (min-width: ${REPORT_THREE_COLUMN_MIN}px) {
    grid-column: span 2;
  }
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

/*
  핵심 지표 카드 안에서 숫자 카드 아래 인사이트 줄을 쌓는다.

  요약 열 상한(#589). 결과 레이어 본문은 1440 에서 약 1,110px 라, 핵심 지표 카드와 인사이트 줄이
  그 폭을 다 쓰면 문장과 링크·숫자 사이가 수백 px 벌어졌다. 「넓어질수록 나빠지는」 묶음이라
  (DESIGN.md 폭 체계) 상한을 진다. 960 토큰이 없어 가장 가까운 기존 컬럼 토큰 '--w-form'(880)을
  쓴다 — 4칸 그리드는 880 에서도 4열이다(카드 묶음 ≥640). 새 리터럴 폭은 만들지 않는다.
*/
const SummaryStack = styled.div`
  display: grid;
  gap: 14px;
  width: 100%;
  max-width: var(--w-form);
`

/** 한 카드 안에서 차트 아래 보조 막대(성비)를 쌓는다. */
const ChartStack = styled.div`
  display: grid;
  gap: 20px;
`

const ContextHero = styled.section`
  /* 액션 버튼 세 칸이 아이콘을 둘 수 있는지 이 폭으로 정한다(ActionRow). */
  container: context-hero / inline-size;
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

/**
 * 데스크톱은 한 줄 [시뮬레이션][공유][화면 보관][상권 저장]. 히어로가 1열이 되는 ≤760px 은
 * 시뮬레이션(primary)이 한 줄을 다 쓰고 나머지 셋이 그 아래 한 줄 세 칸이다. 2×2 로 흘리던 때는
 * 오른쪽 칸이 비고 primary 가 셋째 줄 끝에 있었다(#482).
 *
 * DOM 도 시뮬레이션이 먼저다 — `order` 로 자리만 바꾸면 키보드 순서와 보이는 순서가 갈린다.
 */
const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button {
    min-width: 112px;
    /* 보이는 높이는 40px 그대로, 모바일에서 히트 영역만 44px. 행·열 간격이 8px 라 이웃과 겹치지 않는다. */
    ${touchHitArea()}
  }

  @media (max-width: 760px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));

    && button {
      width: 100%;
      min-width: 0;
      padding: 0 8px;
      gap: 4px;
    }

    && button:first-child {
      grid-column: 1 / -1;
    }
  }

  /*
    320px 뷰포트(또는 375px 확대)면 칸이 약 81px 인데 아이콘 + 「화면 보관」은 약 92px 라
    옆 칸과 겹친다. 그 폭에서는 아이콘을 빼고 글자만 남긴다 — 상태(「보관됨」·「저장됨」)는
    글자가 말한다. 시뮬레이션은 한 줄을 다 쓰므로 아이콘을 둔다.
  */
  @container context-hero (max-width: 339px) {
    /* 아이콘 칸(IconSlot)째 뺀다 — svg 만 숨기면 빈 칸과 gap 이 남아 글자가 한쪽으로 밀린다. */
    && button:not(:first-child) span[aria-hidden='true'] {
      display: none;
    }
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

/*
  차트에서 뺀 0 개 업종을 적는 줄. 막대로는 그릴 수 없지만(길이 0 인 막대에는 recharts 가
  값 라벨을 그리지 않는다) **없다는 사실 자체가 정보**라 문장으로 남긴다.
*/
/** 숫자 하나짜리 카드의 값. 요약 카드 값(`analysis-summary-cards` 의 `Value`)과 같은 크기다. */
const SingleFigure = styled.div`
  display: grid;
  gap: 4px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 16px;

  span {
    color: var(--color-text-caption-on-band);
    font-size: 12px;
  }

  strong {
    color: var(--color-text-900);
    font-size: 21px;
    font-weight: 700;
    line-height: 30px;
    font-variant-numeric: tabular-nums;
    word-break: keep-all;
  }
`

const AbsentNote = styled.p`
  margin-top: 10px;
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  word-break: keep-all;
`

/**
 * 비교 타일 3개(자치구 · 행정동 · 상권)의 배치는 **카드 폭**으로 정한다(`comparison` 컨테이너).
 *
 * 3열 그리드의 370px 카드에서 타일이 약 100px 가 되어 「행정동 기준 (대체)」 배지가 타일 밖으로
 * 나가고 「82억 8095만원」이 「82억 8095만 / 원」으로 꺾였다. 좁은 카드에서는 타일을 세로로 쌓고
 * 한 타일 안에서 라벨을 왼쪽, 값을 오른쪽에 둔다.
 */
const ComparisonFrame = styled.div`
  container: comparison / inline-size;
`

const ComparisonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @container comparison (max-width: 519px) {
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
    /* 라벨 옆에 「대체」 배지가 붙을 수 있다. 좁으면 배지를 아래 줄로 흘린다. */
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
    color: var(--color-text-caption-on-band);
    font-size: 12px;
  }

  strong {
    color: var(--color-text-900);
    font-size: 16px;
    font-variant-numeric: tabular-nums;
    /* 「82억 8095만원」은 띄어쓰기에서만 꺾는다 — 「만 / 원」처럼 단위가 떨어지지 않게. */
    word-break: keep-all;
  }

  @container comparison (max-width: 519px) {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 12px;

    strong {
      white-space: nowrap;
    }
  }
`

/**
 * 「비교 분석」 지수 타일 2개(자치구 = 100 · 행정동 = 100, #544). 비교 타일과 같은 `comparison`
 * 컨테이너 폭으로 배치한다 — 좁으면 세로로 쌓는다. 값 크기는 숫자 하나짜리 카드(`SingleFigure`)와 같다.
 */
const IndexGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;

  @container comparison (max-width: 519px) {
    grid-template-columns: 1fr;
  }
`

const IndexItem = styled.div`
  display: grid;
  gap: 4px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 16px;

  span,
  p {
    color: var(--color-text-caption-on-band);
    font-size: 12px;
    line-height: 18px;
    word-break: keep-all;
  }

  strong {
    color: var(--color-text-900);
    font-size: 21px;
    font-weight: 700;
    line-height: 30px;
    font-variant-numeric: tabular-nums;
    word-break: keep-all;
  }
`

/** 비교 타일 안 값 아래 보조 줄(점포 수 · 월 매출 총액). 좁은 폭의 2열 배치에서도 한 줄을 다 쓴다. */
const ComparisonMeta = styled.p`
  grid-column: 1 / -1;
  color: var(--color-text-caption-on-band);
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
  word-break: keep-all;
`

/**
 * 차트 카드의 불러오는 중 본문 높이(px). 2026-10-02 실측한 본문 높이다.
 * 세로 막대 = 그래프 240 + 축 단위 20 · 피라미드 = 그래프 260 + 범례 · 막대+성비 = 막대 260 + 간격 20 + 성비 막대.
 * 가로 막대는 행 수에 따라 172~330 이라 그 사이 값을 쓴다.
 */
const CHART_LOADING_HEIGHT = {
  bar: 260,
  pyramid: 284,
  barWithShare: 348,
  horizontalBar: 260,
} as const

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

const renderCards = (cards: readonly SummaryCard[]) => (
  <AnalysisSummaryCards cards={cards} />
)

/**
 * `이 값 / 견줄 값` 을 0~1 비율로. 견줄 값이 없거나 0 이면 막대를 그리지 않는다.
 *
 * 비율이 1 을 넘으면(상권이 상위 지역보다 크게 잡히는 이상값) `undefined` 를 낸다 —
 * 막대는 「전체 중 이만큼」을 뜻하므로 넘치는 값을 그리면 거짓이 된다.
 */
const toShareRatio = (
  value: number | null | undefined,
  total: number | null | undefined,
): number | undefined => {
  if (typeof value !== 'number' || typeof total !== 'number') return undefined
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return undefined
  }
  const ratio = value / total
  return ratio >= 0 && ratio <= 1 ? ratio : undefined
}

/** 비율을 사람이 읽는 한 줄로. 0.043 → '4.3%'. */
const formatSharePercent = (ratio: number): string =>
  `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(ratio * 100)}%`

/**
 * 결론 문장들을 카드 설명 한 줄로 잇는다. 다른 카드 설명처럼 문장마다 마침표를 붙이고,
 * 데이터가 모자라 문장이 없으면 설명을 비운다.
 */
const toDescription = (
  ...sentences: Array<string | null>
): string | undefined => {
  const kept = sentences.filter((sentence): sentence is string => !!sentence)
  return kept.length
    ? kept.map(sentence => `${sentence}.`).join(' ')
    : undefined
}

/** 숫자 값이 하나라도 있는 행 목록인가 — 섹션 빈 상태 판정. */
const numericRows = (rows: readonly { value: number | null }[]): boolean =>
  rows.some(row => typeof row.value === 'number')

/**
 * 성별 조각에 라벨로 고른 색을 붙여 `ShareBar` 에 넘긴다. 한쪽 값만 오면 막대가 「여성 100%」가
 * 되므로 두 값이 다 있을 때만 넘기고, 아니면 빈 배열(「데이터 없음」)이다.
 */
const withGenderColors = (
  segments: readonly { label: string; value: number }[],
) => {
  if (segments.length < 2) return []
  const colors = genderColorsFor(segments)
  return segments.map((segment, index) => ({
    ...segment,
    color: colors[index],
  }))
}

/*
  시간대 구간은 길이가 다르다(00~06시 6시간, 11~14시 3시간). 원천 값은 구간 합계라
  (`lib/analysis/time-slot`) 막대는 시간당 평균으로 그린다 — 합계로는 6시간짜리 00~06시가
  길이만으로 이겼다. 막대 값이 응답 숫자와 다른 이유를 각주로 알린다.
*/
const TIME_BAND_NOTE =
  '시간대 구간의 길이가 3~6시간으로 서로 달라 구간 합계를 시간 수로 나눈 시간당 평균으로 그렸어요.'

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
  const conditionReady = invalidMessage === null
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
  /*
    URL 에 분기가 없으면 「최신」이고, 서버 카탈로그(`/periods`)의 기본 분기로 해석한다. URL 에 분기가
    있으면 카탈로그를 기다리지 않는다(period-catalog.md D5-1). 해석 전에는 분기 종속 쿼리를 열지 않는다.
  */
  const { periodCode: resolvedPeriodCode, catalog: periodCatalog } =
    useResolvedAnalysisPeriod(selection.periodCode)
  const periodCode = resolvedPeriodCode ?? ''
  const enabled = conditionReady && resolvedPeriodCode !== null
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

  // 공유 링크 / 분석 화면 보관함이 공유하는 payload. 조건이 불완전하거나 분기를 아직 해석하지 못했으면
  // null 이라 버튼을 막는다. 저장에는 「최신」이 아니라 해석된 분기를 싣는다(period-catalog.md D5-2).
  const sharePayload = useMemo(
    () =>
      buildCommercialAnalysisPayload(
        { ...selection, periodCode: resolvedPeriodCode },
        searchParams.get('tab'),
      ),
    [selection, resolvedPeriodCode, searchParams],
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

  /*
    모바일 가로 탭 바: 가려진 쪽 끝 흐림 + 활성 탭을 화면 안으로 스크롤(#482).
    데스크톱에서는 탭 바가 `display: none` 이라 폭이 0 이고, 두 효과 모두 아무것도 하지 않는다.
  */
  const mobileTabListRef = useRef<HTMLElement>(null)
  const [tabFade, setTabFade] = useState({ start: false, end: false })
  useEffect(() => {
    const list = mobileTabListRef.current
    if (!list) return
    const update = () => {
      const max = list.scrollWidth - list.clientWidth
      const start = list.scrollLeft > 1
      const end = max > 1 && list.scrollLeft < max - 1
      setTabFade(prev =>
        prev.start === start && prev.end === end ? prev : { start, end },
      )
    }
    update()
    list.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(list)
    return () => {
      list.removeEventListener('scroll', update)
      observer.disconnect()
    }
    // 조건이 잘못된 URL 로 처음 열리면 탭 바가 아직 없다. 같은 화면에서 조건이 바로잡혀
    // 탭 바가 생길 때 다시 붙도록 `enabled` 를 따른다.
  }, [conditionReady])
  useEffect(() => {
    const list = mobileTabListRef.current
    if (!list || list.clientWidth === 0) return
    const active = list.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!active) return
    // 가운데로 맞춘다. `scrollIntoView` 는 세로 스크롤 컨테이너까지 움직일 수 있어 쓰지 않는다.
    const left = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    list.scrollTo({
      left: Math.max(0, left),
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }, [spyTab])
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
    /* 요약 「생활권·시설」 카드를 걷어낸 뒤(#482) 시설은 생활권 탭만 쓴다. */
    enabled: enabled && activated.has('living'),
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
    /*
      매출만은 탭을 기다리지 않는다 — 요약 인사이트(피크 시간 · 주 고객층)가 이 응답에서
      나온다(#482). 요약은 「결론 화면」이라 첫 화면에서 답해야 하고, 매출 탭이 켜질 때까지
      그 두 줄이 비어 있으면 요약이 결론을 말하지 못한다.
    */
    enabled,
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
    CommercialServiceCategory[] | null
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
  /*
    소비는 상권 단위(항목별)와 지역 단위(총 지출액)를 따로 그린다 — 원천 사정이 달라
    한쪽이 비어도 다른 쪽은 살아 있다. 판정과 행 조립은 `expense-presentation.ts` 가 한다.

    값이 상권 네이티브인지 행정동 대체인지도 거기서 가른다(#416). 대체일 때만 배지·면책·
    출처를 드러내고, 네이티브면 아무것도 붙이지 않는다 — 늘 붙는 표시는 아무 말도 못 한다.
  */
  const expenseCategoryRows = toExpenseCategoryRows(income)
  const expenseProvenance = toExpenseProvenanceView(income?.provenance)
  const regionalExpenseRows = toRegionalExpenseRows(incomeSummary)
  const regionalExpenseProxyNote = toRegionalExpenseProxyNote(incomeSummary)
  /*
    자치구 평균 소득(대체, #500)은 같은 `/income` 응답에 실려 온다. 값이 있으면 언제나 대체값이라
    배지·면책·출처를 늘 붙이고, 기준은 분기가 아니라 스냅샷 기준일로 적는다.
  */
  const districtIncome = toDistrictIncomeView(income)
  const benchmark = getResponseBody(
    benchmarkQuery.data,
  ) as CommercialBenchmark | null
  /*
    「비교 분석」의 매출 비교는 점포당 매출 지수가 주 지표다(#544). 총액은 지역 크기에 비례해
    「행정동이 상권보다 크다」만 말했다. `salesPerStore` 가 없는 구 응답이면 총액 3개로 물러선다.
  */
  const benchmarkSales = toBenchmarkSalesView(benchmark)
  // 시간대 행은 원천 구간 합계다. 막대는 시간당(`*PerHourRows`), 결론 문장은 합계를 받아
  // 안에서 시간당으로 비교한다(매출 비중은 합계가 기준이라).
  const footTimeRows = createRows(
    footTraffic?.byTimeSlotItem as Record<string, number | null> | null,
    footTimeDefinitions,
  )
  const footTimePerHourRows = toPerHourRows(footTimeRows)
  const footDayRows = createRows(
    footTraffic?.byDayOfWeekItem as Record<string, number | null> | null,
    footDayDefinitions,
  )
  const footPyramidRows = toPyramidRows(footTraffic?.byAgeGenderPercentItem)
  const salesTimeRows = createRows(
    sales?.amountByTimeSlotItem as Record<string, number | null> | null,
    salesTimeDefinitions,
  )
  const salesTimePerHourRows = toPerHourRows(salesTimeRows)
  const salesDayRows = createRows(
    sales?.amountByDayOfWeekItem as Record<string, number | null> | null,
    salesDayDefinitions,
  )
  const salesAgeRows = createRows(
    sales?.amountByAgeItem as Record<string, number | null> | null,
    salesAgeDefinitions,
  )
  const salesGenderSegments = toGenderSegments(
    sales?.countByGenderItem?.maleSalesCount,
    sales?.countByGenderItem?.femaleSalesCount,
  )
  const populationAgeRows = createRows(
    population?.byAgeItem as Record<string, number | null | undefined> | null,
    populationAgeDefinitions,
  )
  const populationGenderSegments = toGenderSegments(
    population?.malePercentage,
    population?.femalePercentage,
  )
  const trends: Array<{
    metric: CommercialTrendMetric
    label: string
    /** 직전 분기 대비 문장의 주어(조사 포함) — `describeLatestChange`. */
    subject: string
    unit: string
    query: typeof salesTrendQuery
    data: CommercialTrend | null
  }> = [
    {
      metric: 'SALES',
      label: '매출',
      subject: '매출이',
      unit: '원',
      query: salesTrendQuery,
      data: getResponseBody(salesTrendQuery.data),
    },
    {
      metric: 'FOOT_TRAFFIC',
      label: '유동인구',
      subject: '유동인구가',
      unit: '명',
      query: footTrendQuery,
      data: getResponseBody(footTrendQuery.data),
    },
    {
      /*
        BE 추이는 원천 `STOR_CO`(`totalStoreCount`)라 프랜차이즈가 빠진 수다. 핵심 지표 「점포 수」
        (프랜차이즈 포함)와 값이 달라 같은 이름을 쓰면 서로 틀려 보이므로 「일반 점포 수」로 부른다. BE 정리는 #490.
      */
      metric: 'STORE',
      label: '일반 점포 수',
      subject: '일반 점포 수가',
      unit: '개',
      query: storeTrendQuery,
      data: getResponseBody(storeTrendQuery.data),
    },
  ]
  const trendSectionState = resolveTrendSectionState(
    trends.map(({ query, data }) => ({
      pending: query.isPending,
      error: resolveApiError(query),
      hasData: toTrendPoints(data).some(
        point => typeof point.value === 'number',
      ),
    })),
  )

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

  /*
    「최신」을 정할 수 없다 — 카탈로그가 끝내 실패했거나 서버가 기본 분기를 정하지 못했다. 예시 상수로
    떨어지지 않는다(적재 안 된 분기로 화면 전체가 「데이터 없음」이 된다, period-catalog.md D5-3).
  */
  if (resolvedPeriodCode === null && periodCatalog.isUnavailable) {
    return (
      <Root>
        <Content>
          <EmptyState
            title="분석 기준 분기를 불러오지 못했어요"
            description="서버에서 최신 분기 정보를 받지 못했어요. 잠시 뒤 다시 시도해 주세요."
            action={
              <Button
                isLoading={periodCatalog.isFetching}
                onClick={periodCatalog.refetch}
              >
                다시 시도
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

  /*
    요약 카드의 **비교 맥락**. 전부 이 탭이 이미 받아 둔 응답에서 나온다 — 새 호출은
    없다. 견줄 값이 없으면 맥락을 만들지 않는다(지어내지 않는다).
  */
  const monthlySales =
    profile?.keyMetrics?.totalSalesAmount ??
    salesSummary?.commercial?.monthlySalesAmount
  const administrationSales = salesSummary?.administration?.monthlySalesAmount
  const administrationName = salesSummary?.administration?.name
  const salesShare = toShareRatio(monthlySales, administrationSales)

  const totalFootTraffic = profile?.keyMetrics?.totalFootTraffic
  const residentPopulation =
    profile?.keyMetrics?.totalResidentPopulation ??
    population?.byAgeItem?.totalResidentPopulation
  /*
    유동인구는 상위 지역 값이 없어 「전체 중 얼마」를 말할 수 없다. 대신 상주인구와의
    배수로 **상권의 성격**(사는 사람 중심인지 오가는 사람 중심인지)을 적는다. 배수는
    1 을 넘으므로 막대가 아니라 문구로만 쓴다.
  */
  const footTrafficPerResident =
    typeof totalFootTraffic === 'number' &&
    typeof residentPopulation === 'number' &&
    residentPopulation > 0
      ? totalFootTraffic / residentPopulation
      : null
  /*
    핵심 지표 「상주인구」 카드의 맥락 줄 — 성비를 붙여 「누가 사는가」를 말하게 한다.
    요약 「생활권·시설」 카드에 있던 것을 그 카드를 걷어내며(#482) 옮겼다.

    여성 비중만 적고 남성은 계산하지 않는다. `malePercentage` 와 더해 100 이 안 되는
    반올림 응답이 있어, 화면이 `100 - 여성` 을 지어내면 응답과 어긋난 수가 된다.
  */
  const femalePercentage = population?.femalePercentage
  const residentFemaleShare = toShareRatio(femalePercentage, 100)
  const residentGenderContext =
    residentFemaleShare === undefined
      ? null
      : {
          text: `여성 ${formatSharePercent(residentFemaleShare)}`,
          ratio: residentFemaleShare,
        }

  /*
    원천(서울시 상권 점포) 필드 뜻: `totalStoreCount`(`STOR_CO`)는 **프랜차이즈를 뺀** 일반 점포,
    `similarStoreCount`(`SIMILR_INDUTY_STOR_CO`)가 일반 + 프랜차이즈 = 이 업종 전체 점포다
    (dev 실측 79곳 모두 성립, 프랜차이즈가 일반보다 많은 곳이 15곳). 그래서 「점포 수」는
    `similarStoreCount` 이고, 개·폐업률의 분모도 이 값이다(20개 중 1개 = 5%).
  */
  const storeCount =
    profile?.keyMetrics?.similarStoreCount ?? stores?.similarStoreCount
  const openedStoreCount = stores?.openedStoreCount
  const closedStoreCount = stores?.closedStoreCount
  /*
    프랜차이즈 비중. 점포 탭 「점포 분석」의 「총 점포」 맥락 줄이다. 전에는 `totalStoreCount` 를
    분모로 써서 프랜차이즈가 많은 상권에서 100% 를 넘었다(최대 367%).
  */
  const franchiseShare = toShareRatio(
    stores?.franchiseStoreCount,
    stores?.similarStoreCount,
  )

  /*
    `peerStores` 는 **선택한 업종을 뺀** 나머지 업종이다(커피-음료로 조회하면 커피-음료가
    목록에 없다). 그래서 이 목록을 「상권의 업종 구성」이라고 부르면 안 된다.
  */
  const { charted: peerStoreRows, absentLabels: absentServiceNames } =
    splitPeerStoreRows(toPeerStoreRows(stores?.peerStores))
  /*
    같은 배열의 개업률·폐업률로 「어느 업종이 늘고 주는가」를 그린다. 순변화 0 은
    점포 수 0 과 같은 이유로 차트 밖 문장이다(길이 0 막대는 값 라벨이 안 찍힌다).
  */
  const {
    charted: peerStoreChangeRows,
    unchangedLabels: unchangedServiceNames,
  } = splitPeerStoreChangeRows(toPeerStoreChangeRows(stores?.peerStores))

  /* 업종 이름을 아직 못 받았으면 코드(「CS100010」)를 문장에 넣지 않고 설명을 비운다. */
  const resolvedServiceName =
    services?.find(item => item.serviceCode === serviceCode)?.serviceName ??
    salesSummary?.commercial?.serviceName

  /*
    요약 첫 숫자는 **점포당 월 매출**이다(#561). `monthlySales` 는 상권 안 이 업종 전체 합계라
    「월 매출」 하나로 적으면 한 가게 매출로 읽혔다(홍대 걷고싶은 거리 · 커피-음료: 26억 3527만원 = 점포 59개 합계, 한 곳당 4466만원).
    서버 점포당 값은 지역 평균 대비 탭(`/benchmarks`)이 받아 둔 경우에만 쓰고 요약이 따로 부르지
    않는다. 없으면 합계 ÷ 점포 수(같은 분모 `similarStoreCount`)다. 합계는 분모를 밝혀 캡션으로 남긴다.
  */
  const monthlySalesPerStore = resolveMonthlySalesPerStore({
    monthlySalesPerStore:
      benchmark?.salesPerStore?.commercial?.monthlySalesPerStore,
    monthlySales,
    storeCount,
  })
  const totalSalesCaption = describeTotalSalesCaption(
    resolvedServiceName,
    monthlySales,
  )

  const summaryCards: SummaryCard[] = [
    {
      label: '점포당 월 매출',
      value: monthlySalesPerStore,
      unit: '원',
      icon: Banknote,
      emptyText: describeSalesPerStoreEmpty(storeCount, monthlySales),
      context: totalSalesCaption === null ? null : { text: totalSalesCaption },
    },
    {
      label: '유동인구',
      value: totalFootTraffic,
      unit: '명',
      icon: Footprints,
      context:
        footTrafficPerResident === null
          ? null
          : {
              text: `상주인구의 ${new Intl.NumberFormat('ko-KR', {
                maximumFractionDigits: 0,
              }).format(footTrafficPerResident)}배`,
            },
    },
    {
      /*
        프랜차이즈를 포함한 이 업종 전체 점포 수다(`storeCount`). 맥락 줄을 두지 않는다 — 바로
        아래 인사이트 「경쟁」 줄이 같은 수와 그 분기 개·폐업 건수를 함께 말한다(#482).
      */
      label: '점포 수',
      value: storeCount,
      unit: '개',
      icon: Store,
      context: null,
    },
    {
      label: '상주인구',
      value: residentPopulation,
      unit: '명',
      icon: Users,
      context: residentGenderContext,
    },
  ]

  /*
    요약 인사이트 세 줄. 문장은 아래 차트 카드와 같은 함수로 만든다 — 같은 데이터에서 요약과
    탭이 다른 말을 하면 안 된다. 매출이 아직 안 왔으면 두 줄은 자리만 잡는다.
  */
  const salesInsightLoading = salesQuery.isPending
  const summaryInsights: SummaryInsight[] = [
    {
      key: 'peak-time',
      label: '피크 시간',
      sentence: toDescription(describeSalesTimeShare(salesTimeRows)) ?? null,
      loading: salesInsightLoading,
      tab: 'sales',
      tabLabel: '매출',
    },
    {
      key: 'customer',
      label: '주 고객층',
      sentence:
        toDescription(
          describeSalesAgePeak(salesAgeRows),
          describeGenderShare(
            sales?.countByGenderItem?.maleSalesCount,
            sales?.countByGenderItem?.femaleSalesCount,
            '결제 건수는',
          ),
        ) ?? null,
      loading: salesInsightLoading,
      tab: 'sales',
      tabLabel: '매출',
    },
    {
      key: 'competition',
      label: '경쟁',
      sentence:
        toDescription(
          describeStoreCompetition(
            stores?.similarStoreCount ?? profile?.keyMetrics?.similarStoreCount,
            openedStoreCount,
            closedStoreCount,
          ),
        ) ?? null,
      loading: storesQuery.isPending,
      tab: 'stores',
      tabLabel: '점포',
    },
  ]

  /*
    「핵심 지표」 설명 자리의 결론 문장. 「주요 수치를 먼저 확인하세요」는 아무것도 말하지
    않았다. 두 문장 다 만들 수 없으면 설명을 비운다(지어내지 않는다).

    첫 문장은 점포당 값(#561), 둘째 문장은 행정동 안 비중이다. 비중은 카드 막대에 있던 것을 문장으로
    옮겼다 — 카드 캡션이 합계(분모)를 말하게 되면서 막대가 무엇의 비율인지 흐려졌다.
  */
  const salesPerStoreSentence = describeSalesPerStoreSentence({
    commercialName: profile?.commercialName,
    serviceName: resolvedServiceName,
    storeCount,
    monthlySales,
    salesPerStore: monthlySalesPerStore,
  })
  const salesShareSentence = describeSalesShareSentence({
    administrationName,
    serviceName: resolvedServiceName,
    share: salesShare,
  })
  const coreMetricsDescription =
    [salesPerStoreSentence, salesShareSentence].filter(Boolean).join(' ') ||
    undefined

  /*
    보고서 하단 추천 링크(condition-selector D8-2 보조 동선).

    상권 코드는 싣지 않는다 — 추천은 상권을 *찾아 주는* 쪽이라 상권을 넘기면
    추천할 것이 남지 않는다. 자치구·행정동·업종 세 코드만 나르고, 파라미터 이름이
    `/analysis` 와 같아 변환은 없다(`recommend-url.ts`).
  */
  const recommendHandoffHref =
    districtCode && administrationCode && serviceCode
      ? createRecommendHrefFromCodes({
          districtCode,
          administrationCode,
          serviceCode,
        })
      : null
  const recommendHandoffLabel = createRecommendHandoffLabel({
    administrationName,
    serviceName,
    serviceCode,
  })

  const renderGroupHeading = (label: string) => (
    <GroupHeading>{label}</GroupHeading>
  )

  return (
    <Root>
      <StickyHeader>
        <HeaderInner>
          <HeaderTop>
            <h1>
              {profileQuery.isPending
                ? '상권 정보를 불러오는 중'
                : (profile?.commercialName ?? `상권 ${commercialCode}`)}
            </h1>
            {/* 분기는 바로 옆 기간 선택이 보여 주므로 메타에서 뺀다. */}
            <HeaderMeta>
              {profile
                ? `${profile.districtName} · ${profile.administrationName}`
                : null}
            </HeaderMeta>
            <HeaderPeriod>
              <AnalysisPeriodSelect
                value={resolvedPeriodCode}
                range={periodCatalog.range}
                onChange={handlePeriodChange}
              />
            </HeaderPeriod>
            {/* 닫으면 실제로 뒤에 지도가 있으므로 모든 경로에서 "닫기"가 정직한
                표현이다. 하드 로드 전용 분기(ArrowLeft + '조건 다시 선택')는 독립
                결과 페이지 개념과 함께 폐기됐다(map-shell.md D4-5). */}
            <HeaderClose>
              <IconButton
                type="button"
                aria-label="상권 분석 결과 닫기"
                onClick={
                  onClose ??
                  (() =>
                    router.replace(
                      createAnalysisExplorerHref(selection, camera),
                    ))
                }
              >
                <X />
              </IconButton>
            </HeaderClose>
          </HeaderTop>
          <MobileTabList
            ref={mobileTabListRef}
            $fadeStart={tabFade.start}
            $fadeEnd={tabFade.end}
            aria-label="분석 결과 항목"
            role="tablist"
          >
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
            {/*
              요약은 「결론 화면」이다(#482): 핵심 지표 4개 + 인사이트 세 줄 + 지원 정책.
              「점포 현황」·「생활권·시설」 카드는 점포 탭 「점포 분석」·생활권 탭 「주요 시설과
              교통」과 같은 수를 반복해서 걷어냈다. 「지역별 월 매출 비교」도 지역 평균 대비 탭과
              같은 세 값(자치구 · 행정동 · 상권 총액)이라 뺐다 — 이 상권의 비중은 핵심 지표
              설명 문장이, 업종 전체 합계는 「점포당 월 매출」 카드 캡션이 말한다(#561).
            */}
            <DashboardGrid>
              <FullSpanItem>
                <AnalysisResultSection
                  title="핵심 지표"
                  description={coreMetricsDescription}
                  loading={profileQuery.isPending}
                  error={resolveApiError(profileQuery)}
                  empty={!profile?.keyMetrics && !salesSummary && !stores}
                  onRetry={() => void profileQuery.refetch()}
                >
                  <SummaryStack>
                    {renderCards(summaryCards)}
                    <AnalysisSummaryInsights
                      items={summaryInsights}
                      onSelect={handleTabClick}
                    />
                  </SummaryStack>
                </AnalysisResultSection>
              </FullSpanItem>

              {/*
                지원 정책은 **새 호출 없이** 그린다 — 이미 도는 `profileQuery` 의
                `policyRecommendations` 를 읽는다. 백엔드가 진작 내려주고 있었는데
                타입에 없어서 버리고 있던 값이다.

                여덟 번째 탭을 만들지 않은 이유: 최대 5건이고, 정책 데이터가 없는
                환경에서는 탭 자체가 빈 화면이 된다. 요약의 실행 가능한 마무리로 둔다.
                처음에는 2건만 보이고 나머지는 펼친다 — 5건을 다 펼치면 핵심 지표보다 길다.
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
                    initialVisibleCount={2}
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
              {/* 2열에서는 시간대 막대가 한 줄을 쓰고 요일 · 연령 카드가 그 아래 나란히 선다. */}
              <PairSpanItem>
                <AnalysisResultSection
                  title="시간대별 유동인구"
                  description={toDescription(
                    describeFootTimePeak(footTimeRows),
                  )}
                  loadingHeight={CHART_LOADING_HEIGHT.bar}
                  loading={footTrafficQuery.isPending}
                  error={resolveApiError(footTrafficQuery)}
                  empty={!numericRows(footTimeRows)}
                  onRetry={() => void footTrafficQuery.refetch()}
                  footer={
                    numericRows(footTimeRows) ? TIME_BAND_NOTE : undefined
                  }
                >
                  <ChartBox $maxWidth={560}>
                    <BarChart
                      items={footTimePerHourRows}
                      unit="명"
                      unitCaption="(명, 시간당)"
                      ariaLabel="시간대별 시간당 유동인구 막대 차트"
                      highlightMax
                    />
                  </ChartBox>
                </AnalysisResultSection>
              </PairSpanItem>

              <AnalysisResultSection
                title="요일별 유동인구"
                collapsible
                description={toDescription(describeFootDayPattern(footDayRows))}
                loadingHeight={CHART_LOADING_HEIGHT.bar}
                loading={footTrafficQuery.isPending}
                error={resolveApiError(footTrafficQuery)}
                empty={!numericRows(footDayRows)}
                onRetry={() => void footTrafficQuery.refetch()}
              >
                <ChartBox $maxWidth={460}>
                  <BarChart
                    items={footDayRows}
                    unit="명"
                    ariaLabel="요일별 유동인구 막대 차트"
                    highlightMax
                  />
                </ChartBox>
              </AnalysisResultSection>

              <AnalysisResultSection
                title="연령·성별 유동인구"
                collapsible
                description={toDescription(
                  describeFootAgeGenderPeak(footPyramidRows),
                )}
                loadingHeight={CHART_LOADING_HEIGHT.pyramid}
                loading={footTrafficQuery.isPending}
                error={resolveApiError(footTrafficQuery)}
                empty={footPyramidRows.every(
                  row => row.male === null && row.female === null,
                )}
                onRetry={() => void footTrafficQuery.refetch()}
              >
                <ChartBox $maxWidth={460}>
                  <PopulationPyramid rows={footPyramidRows} unit="%" />
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
              {/* 유동인구 그룹과 같은 배치다 — 2열에서는 시간대 막대가 한 줄을 쓴다. */}
              <PairSpanItem>
                <AnalysisResultSection
                  title="시간대별 매출"
                  description={toDescription(
                    describeSalesTimeShare(salesTimeRows),
                  )}
                  loadingHeight={CHART_LOADING_HEIGHT.bar}
                  loading={salesQuery.isPending}
                  error={resolveApiError(salesQuery)}
                  empty={!numericRows(salesTimeRows)}
                  onRetry={() => void salesQuery.refetch()}
                  footer={
                    numericRows(salesTimeRows) ? TIME_BAND_NOTE : undefined
                  }
                >
                  <ChartBox $maxWidth={560}>
                    <BarChart
                      items={salesTimePerHourRows}
                      unit="원"
                      unitCaption="(원, 시간당)"
                      ariaLabel="시간대별 시간당 매출 막대 차트"
                      highlightMax
                    />
                  </ChartBox>
                </AnalysisResultSection>
              </PairSpanItem>

              <AnalysisResultSection
                title="요일별 매출"
                collapsible
                description={toDescription(describeSalesDayPeak(salesDayRows))}
                loadingHeight={CHART_LOADING_HEIGHT.bar}
                loading={salesQuery.isPending}
                error={resolveApiError(salesQuery)}
                empty={!numericRows(salesDayRows)}
                onRetry={() => void salesQuery.refetch()}
              >
                <ChartBox $maxWidth={460}>
                  <BarChart
                    items={salesDayRows}
                    unit="원"
                    ariaLabel="요일별 매출 막대 차트"
                    highlightMax
                  />
                </ChartBox>
              </AnalysisResultSection>

              {/*
                「성별 매출 건수」 도넛은 카드 하나를 쓰면서 숫자 두 개만 보여 줬다. 연령별 매출
                아래 성비 막대 한 줄로 붙인다(ShareBar).
              */}
              <AnalysisResultSection
                title="연령·성별 매출"
                collapsible
                description={toDescription(
                  describeSalesAgePeak(salesAgeRows),
                  describeGenderShare(
                    sales?.countByGenderItem?.maleSalesCount,
                    sales?.countByGenderItem?.femaleSalesCount,
                    '결제 건수는',
                  ),
                )}
                loadingHeight={CHART_LOADING_HEIGHT.barWithShare}
                loading={salesQuery.isPending}
                error={resolveApiError(salesQuery)}
                empty={
                  !numericRows(salesAgeRows) &&
                  salesGenderSegments.every(segment => segment.value <= 0)
                }
                onRetry={() => void salesQuery.refetch()}
              >
                <ChartStack>
                  <ChartBox $maxWidth={460}>
                    <BarChart
                      items={salesAgeRows}
                      unit="원"
                      ariaLabel="연령별 매출 막대 차트"
                      highlightMax
                    />
                  </ChartBox>
                  <ShareBar
                    title="성별 결제 건수"
                    segments={withGenderColors(salesGenderSegments)}
                    unit="건"
                    ariaLabel="성별 결제 건수 비율"
                  />
                </ChartStack>
              </AnalysisResultSection>
            </DashboardGrid>
          </ReportSection>

          <ReportSection
            id={createReportSectionId('stores')}
            ref={registerSection('stores')}
          >
            {renderGroupHeading('점포')}
            {/* 가로 막대 두 장이 나란히 서는 그룹이라 3열이면 셋째 칸이 빈다 — 2열로 묶는다. */}
            <DashboardGrid $maxColumns={2}>
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
                      /* 프랜차이즈 포함 전체다(`similarStoreCount`). 「점포 수」 지표와 같은 값이다. */
                      label: '총 점포',
                      value: stores?.similarStoreCount,
                      unit: '개',
                      icon: Store,
                      context:
                        typeof stores?.franchiseStoreCount === 'number'
                          ? {
                              text:
                                franchiseShare === undefined
                                  ? `프랜차이즈 ${new Intl.NumberFormat('ko-KR').format(stores.franchiseStoreCount)}개`
                                  : `프랜차이즈 ${new Intl.NumberFormat('ko-KR').format(stores.franchiseStoreCount)}개 · ${formatSharePercent(franchiseShare)}`,
                              ratio: franchiseShare,
                            }
                          : null,
                    },
                    {
                      /*
                        원천 `STOR_CO`(`totalStoreCount`)는 프랜차이즈를 뺀 수다. 「총 점포」의
                        나머지 몫이라 맥락 줄에 그 뜻을 적는다.
                      */
                      label: '일반 점포',
                      value: stores?.totalStoreCount,
                      unit: '개',
                      icon: Store,
                      context: { text: '프랜차이즈 제외' },
                    },
                    {
                      /* 건수만 있으면 상권 크기를 모르고, 비율만 있으면 몇 곳인지 모른다 — 둘 다 적는다. */
                      label: '개업 점포',
                      value: stores?.openedStoreCount,
                      unit: '개',
                      icon: TrendingUp,
                      context:
                        typeof stores?.openingRate === 'number'
                          ? {
                              text: `개업률 ${formatAnalysisValue(stores.openingRate, '%')}`,
                            }
                          : null,
                    },
                    {
                      label: '폐업 점포',
                      value: stores?.closedStoreCount,
                      unit: '개',
                      icon: TrendingDown,
                      context:
                        typeof stores?.closureRate === 'number'
                          ? {
                              text: `폐업률 ${formatAnalysisValue(stores.closureRate, '%')}`,
                            }
                          : null,
                    },
                  ])}
                </AnalysisResultSection>
              </FullSpanItem>

              {/*
                DESIGN.md 「Charts」: 가로 막대는 카드를 가로지르게 두지 않는다 —
                넓어질수록 라벨과 값이 멀어져 나빠진다. 일반 칸에 둔다.
              */}
              <div>
                <AnalysisResultSection
                  title="함께 있는 다른 업종"
                  description="선택한 업종을 뺀 나머지 업종의 점포 수입니다."
                  loadingHeight={CHART_LOADING_HEIGHT.horizontalBar}
                  loading={storesQuery.isPending}
                  error={resolveApiError(storesQuery)}
                  empty={peerStoreRows.length === 0}
                  onRetry={() => void storesQuery.refetch()}
                >
                  <ChartBox $maxWidth={460}>
                    <HorizontalBarChart
                      items={peerStoreRows}
                      unit="개"
                      ariaLabel="같은 상권의 다른 업종별 점포 수"
                      /*
                        `unit` 은 툴팁에만 쓰인다 — 막대 끝 라벨은 기본 포매터(축 눈금용)라
                        단위 없이 숫자만 찍힌다. 「40」보다 「40개」가 읽힌다.
                      */
                      valueFormatter={value =>
                        `${new Intl.NumberFormat('ko-KR').format(value)}개`
                      }
                    />
                    {absentServiceNames.length > 0 ? (
                      <AbsentNote>
                        점포가 없는 업종: {absentServiceNames.join(' · ')}
                      </AbsentNote>
                    ) : null}
                  </ChartBox>
                </AnalysisResultSection>
              </div>

              {/*
                「함께 있는 다른 업종」과 같은 폭으로 나란히 둔다(DESIGN.md 「Charts」).
                순변화 = 개업률 − 폐업률(%p). 개업률만 보면 시장이 느는지 주는지 알 수
                없고, 비율만 보면 크기를 오해하므로 라벨에 점포 수를 함께 적는다.
              */}
              <div>
                <AnalysisResultSection
                  title="늘고 주는 업종"
                  collapsible
                  description="선택한 업종을 뺀 나머지 업종의 개업률에서 폐업률을 뺀 값이에요. 위가 늘어난 업종, 아래가 줄어든 업종이에요."
                  loadingHeight={CHART_LOADING_HEIGHT.horizontalBar}
                  loading={storesQuery.isPending}
                  error={resolveApiError(storesQuery)}
                  empty={
                    peerStoreChangeRows.length === 0 &&
                    unchangedServiceNames.length === 0
                  }
                  onRetry={() => void storesQuery.refetch()}
                >
                  <ChartBox $maxWidth={460}>
                    {peerStoreChangeRows.length > 0 ? (
                      <HorizontalBarChart
                        items={peerStoreChangeRows}
                        unit="%p"
                        diverging
                        ariaLabel="같은 상권의 다른 업종별 개업률과 폐업률 차이"
                        valueFormatter={formatSignedPercentPoint}
                      />
                    ) : null}
                    {unchangedServiceNames.length > 0 ? (
                      <AbsentNote>
                        {peerStoreChangeRows.length > 0
                          ? '변화 없는 업종: '
                          : '이번 분기에 개업과 폐업이 같았어요: '}
                        {unchangedServiceNames.join(' · ')}
                      </AbsentNote>
                    ) : null}
                  </ChartBox>
                </AnalysisResultSection>
              </div>
            </DashboardGrid>
          </ReportSection>

          <ReportSection
            id={createReportSectionId('living')}
            ref={registerSection('living')}
          >
            {renderGroupHeading('생활권')}
            <DashboardGrid>
              <AnalysisResultSection
                title="연령·성별 상주인구"
                description={toDescription(
                  describePopulationAgePeak(populationAgeRows),
                  describeGenderShare(
                    population?.malePercentage,
                    population?.femalePercentage,
                    '상주인구는',
                  ),
                )}
                loadingHeight={CHART_LOADING_HEIGHT.barWithShare}
                loading={populationQuery.isPending}
                error={resolveApiError(populationQuery)}
                empty={
                  !numericRows(populationAgeRows) &&
                  populationGenderSegments.every(segment => segment.value <= 0)
                }
                onRetry={() => void populationQuery.refetch()}
              >
                <ChartStack>
                  <ChartBox $maxWidth={460}>
                    <BarChart
                      items={populationAgeRows}
                      unit="명"
                      ariaLabel="연령별 상주인구 막대 차트"
                      highlightMax
                    />
                  </ChartBox>
                  <ShareBar
                    title="성별 상주인구"
                    segments={withGenderColors(populationGenderSegments)}
                    unit="%"
                    ariaLabel="성별 상주인구 비율"
                  />
                </ChartStack>
              </AnalysisResultSection>
              {/*
                전에는 「소득과 소비」 한 섹션이 월 평균 소득 카드와 항목별 소비 막대를
                같이 그렸다. 소득은 원천이 사라져 걷어냈고(#414), 남은 소비는 상권 단위와
                지역 단위의 데이터 사정이 달라 **두 섹션으로 가른다** — 한 섹션에 섞으면
                「비었다」가 어느 쪽 이야기인지 읽을 수 없다.

                상권 항목별은 20241 분기부터 원천이 전 행 0 이라 #414 때는 통째로 비었는데,
                이제 백엔드가 그 자리를 **소속 행정동 소비로 대체**해 채워 준다(#416).
                값이 생긴 대신 뜻이 달라졌으므로 대체 구간에서는 배지·면책·출처를 붙인다.
              */}
              <AnalysisResultSection
                title="항목별 소비"
                collapsible
                /*
                  기준 분기는 **값이 실제로 딛고 선 분기**를 적는다. 대체값은 선택한 분기와
                  다른 분기에서 올 수 있어, 선택값을 그대로 쓰면 없는 사실을 말하게 된다.
                */
                description={
                  expenseProvenance.effectivePeriodCode || resolvedPeriodCode
                    ? `${formatPeriodCode(
                        expenseProvenance.effectivePeriodCode ?? periodCode,
                      )} 기준`
                    : undefined
                }
                badge={
                  expenseProvenance.badgeLabel ? (
                    <Badge $tone="teal">{expenseProvenance.badgeLabel}</Badge>
                  ) : null
                }
                footer={
                  expenseProvenance.isProxy ? (
                    <ExpenseProvenanceNote
                      description={expenseProvenance.disclaimer}
                      sourceLabel={expenseProvenance.sourceLabel}
                      sourceUrl={expenseProvenance.sourceUrl}
                    />
                  ) : null
                }
                loading={incomeQuery.isPending}
                error={resolveApiError(incomeQuery)}
                empty={!hasExpenseByCategory(income)}
                /*
                  빈 상태는 대체할 행정동 값조차 없을 때(`UNAVAILABLE`)뿐이다. 그때도 왜
                  없는지는 서버가 면책 문장으로 알려 주므로 그것을 먼저 쓴다.
                */
                emptyDescription={
                  expenseProvenance.disclaimer ??
                  '서울 열린데이터광장이 2024년 1분기부터 상권 단위 항목별 소비 제공을 중단했어요. 이 상권의 소비 규모는 아래 「지역별 소비」의 자치구·행정동 값으로 가늠해 주세요.'
                }
                onRetry={() => void incomeQuery.refetch()}
              >
                {/* 항목 수·구성이 스코프마다 다르다. 서버가 준 순서 그대로 그린다. */}
                <AnalysisMetricList rows={expenseCategoryRows} unit="원" />
              </AnalysisResultSection>
              {/* 2열에서는 한 줄을 써서 세 타일이 나란히 선다. 3열이면 보통 칸이다. */}
              <PairSpanItem>
                <AnalysisResultSection
                  title="지역별 소비"
                  collapsible
                  description={
                    resolvedPeriodCode
                      ? `${formatPeriodCode(resolvedPeriodCode)} 기준 총 지출액`
                      : undefined
                  }
                  footer={
                    regionalExpenseProxyNote ? (
                      <ExpenseProvenanceNote
                        description={regionalExpenseProxyNote}
                        sourceLabel={
                          incomeSummary?.commercialProvenance?.sourceLabel
                        }
                        sourceUrl={
                          incomeSummary?.commercialProvenance?.sourceUrl
                        }
                      />
                    ) : null
                  }
                  loading={incomeSummaryQuery.isPending}
                  error={resolveApiError(incomeSummaryQuery)}
                  empty={!hasRegionalExpense(regionalExpenseRows)}
                  emptyDescription="이 분기에는 자치구·행정동·상권 어느 단위에도 소비 데이터가 없어요."
                  onRetry={() => void incomeSummaryQuery.refetch()}
                >
                  {/*
                  값이 없는 단위도 **줄을 지우지 않는다.** 줄을 지우면 위에 남은 자치구 값이
                  이 상권 값처럼 읽힌다.

                  대체 구간에서는 상권 줄과 행정동 줄이 **같은 숫자**가 된다. 데이터가 실제로
                  그런 것이라 값을 감추거나 바꾸지 않고, 상권 줄에 배지를 달고 각주로 이유를
                  적어 「두 줄이 우연히 같다」로 읽히지 않게 한다.
                */}
                  <ComparisonFrame>
                    <ComparisonGrid>
                      {regionalExpenseRows.map(row => (
                        <ComparisonItem key={row.scope}>
                          <span>
                            {row.label}
                            {row.isProxy ? (
                              <Badge $tone="teal">
                                {EXPENSE_PROXY_BADGE_LABEL}
                              </Badge>
                            ) : null}
                          </span>
                          <strong>
                            {formatAnalysisValue(row.totalExpenseAmount, '원')}
                          </strong>
                        </ComparisonItem>
                      ))}
                    </ComparisonGrid>
                  </ComparisonFrame>
                </AnalysisResultSection>
              </PairSpanItem>
              {/*
                #414 에서 걷어낸 소득 카드의 후신(#500). 상권 단위 소득이 아니라 **자치구 평균**이고
                기준이 분기가 아니라 **스냅샷 날짜**라, 제목 아래에는 분기 대신 기준일을 적는다.
                값이 있으면 언제나 대체값이므로 배지·면책·출처를 늘 붙인다. 비교·추천·히트맵에는
                넣지 않는다 — 같은 구 상권이 모두 같은 값이라 변별력이 없다.
              */}
              <AnalysisResultSection
                title="자치구 평균 소득"
                description={
                  (districtIncome.available && districtIncome.description) ||
                  undefined
                }
                badge={
                  districtIncome.available ? (
                    <Badge $tone="teal">{districtIncome.badgeLabel}</Badge>
                  ) : null
                }
                footer={
                  districtIncome.available ? (
                    <ExpenseProvenanceNote
                      description={districtIncome.disclaimer}
                      sourceLabel={districtIncome.sourceLabel}
                      sourceUrl={districtIncome.sourceUrl}
                    />
                  ) : null
                }
                loading={incomeQuery.isPending}
                error={resolveApiError(incomeQuery)}
                empty={!districtIncome.available}
                emptyDescription={
                  districtIncome.available
                    ? undefined
                    : districtIncome.emptyDescription
                }
                onRetry={() => void incomeQuery.refetch()}
              >
                {districtIncome.available ? (
                  <SingleFigure>
                    <span>월 평균 신고소득</span>
                    <strong>
                      {formatAnalysisValue(districtIncome.amount, '원')}
                    </strong>
                  </SingleFigure>
                ) : null}
              </AnalysisResultSection>
              <WideInThreeColumnsItem>
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
              </WideInThreeColumnsItem>
            </DashboardGrid>
          </ReportSection>

          <ReportSection
            id={createReportSectionId('trend')}
            ref={registerSection('trend')}
          >
            {renderGroupHeading('트렌드')}
            <AnalysisResultSection
              title="분기별 변화"
              description="최근 분기의 매출·유동인구·점포 수를 직전 분기와 비교했어요."
              {...trendSectionState}
              onRetry={() =>
                trends.forEach(({ query }) => void query.refetch())
              }
            >
              <AnalysisTrendSummary
                items={trends.map(
                  ({ metric, label, subject, unit, query, data }) => ({
                    key: metric,
                    label,
                    subject,
                    unit,
                    points: toTrendPoints(data),
                    error: resolveApiError(query),
                    onRetry: () => void query.refetch(),
                  }),
                )}
              />
            </AnalysisResultSection>
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
                  description={
                    (benchmarkSales.mode === 'per-store'
                      ? benchmarkSales.conclusion
                      : null) ??
                    benchmark?.summary ??
                    undefined
                  }
                  loading={benchmarkQuery.isPending}
                  error={resolveApiError(benchmarkQuery)}
                  empty={!hasObjectValues(benchmark)}
                  onRetry={() => void benchmarkQuery.refetch()}
                >
                  {/*
                  지수(비교 단위 점포당 = 100)가 주 지표이고 세 단위의 점포당 월 매출 · 점포 수 ·
                  총액은 그 근거로 아래에 둔다. null 은 0 이 아니라 「데이터 없음」이고, 값이 없는
                  단위도 줄을 지우지 않는다. 서버 `benchmarkHighlights` 는 「매출 수준을 자치구
                  평균과 비교할 수 있습니다」 같은 값 없는 고정 문장이라 그리지 않는다.
                */}
                  <ComparisonFrame>
                    {benchmarkSales.mode === 'per-store' ? (
                      <>
                        <IndexGrid>
                          {benchmarkSales.indices.map(index => (
                            <IndexItem key={index.scope}>
                              <span>{index.baseName} 대비 지수</span>
                              <strong>
                                {formatSalesPerStoreIndex(index.value)}
                              </strong>
                              <p>{index.baseName} 점포 평균 = 100</p>
                            </IndexItem>
                          ))}
                        </IndexGrid>
                        <ComparisonGrid>
                          {benchmarkSales.units.map(unit => (
                            <ComparisonItem key={unit.scope}>
                              <span>{unit.label} 점포당 월 매출</span>
                              <strong>
                                {formatAnalysisValue(
                                  unit.monthlySalesPerStore,
                                  '원',
                                )}
                              </strong>
                              <ComparisonMeta>
                                {formatStoreCount(unit.storeCount)} · 월 매출{' '}
                                {formatAnalysisValue(
                                  unit.monthlySalesAmount,
                                  '원',
                                )}
                              </ComparisonMeta>
                            </ComparisonItem>
                          ))}
                        </ComparisonGrid>
                        <AbsentNote>
                          점포 수는 이 업종의 일반 점포와 프랜차이즈 점포를 합친
                          수예요.
                        </AbsentNote>
                      </>
                    ) : (
                      <ComparisonGrid>
                        {benchmarkSales.units.map(unit => (
                          <ComparisonItem key={unit.scope}>
                            <span>{unit.label}</span>
                            <strong>
                              {formatAnalysisValue(
                                unit.monthlySalesAmount,
                                '원',
                              )}
                            </strong>
                          </ComparisonItem>
                        ))}
                      </ComparisonGrid>
                    )}
                  </ComparisonFrame>
                </AnalysisResultSection>
              </FullSpanItem>
            </DashboardGrid>
          </ReportSection>

          {recommendHandoffHref === null ? null : (
            <RecommendHandoff>
              <RecommendHandoffNote>
                이 상권이 맞지 않으면 같은 조건으로 다른 상권을 찾아볼 수
                있어요.
              </RecommendHandoffNote>
              <RecommendHandoffLink
                data-analysis-recommend-link="true"
                href={recommendHandoffHref}
              >
                {recommendHandoffLabel}
                <ArrowUpRight aria-hidden />
              </RecommendHandoffLink>
            </RecommendHandoff>
          )}
        </ContentColumn>
      </ResultLayout>
    </Root>
  )
}
