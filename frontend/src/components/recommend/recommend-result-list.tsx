'use client'

import { createElement, useId, useRef } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Bookmark as BookmarkIcon } from 'lucide-react'
import styled from 'styled-components'
import { Skeleton } from '@/components/ui/skeleton'
import ScoreGauge from '@/components/ui/score-gauge'
import {
  COMPOSITE_SCORE_POLARITY,
  resolveMetricPolarity,
} from '@/lib/recommend/metric-polarity'
import {
  isRecord,
  readBlueOceanCategories,
  readTrimmedString,
} from '@/lib/recommend/recommend-response'
import { resolveServiceIcon } from '@/lib/recommend/service-icons'
import type { BlueOceanCategory, CandidateCommercial } from '@/types/recommend'
import RecommendFeedback from './recommend-feedback'

export type RecommendResultFeedback = {
  tone: 'info' | 'error'
  title: string
  description?: string
  actionLabel?: string
  /**
   * 재시도 버튼 노출 여부. **`isRetryable(kind)` 결과만 넣는다.**
   * 404(데이터 부재)는 재시도해도 결과가 같으므로 버튼을 띄우지 않는다.
   */
  isRetryable?: boolean
}

export type RecommendResultListProps = {
  results: CandidateCommercial[]
  selectedCommercialCode: string | null
  /** 사용자가 선택한 업종 코드. 블루오션 목록에서 같은 업종에 배지를 붙이는 데만 쓴다. */
  selectedServiceCode?: string | null
  previewedCommercialCode?: string | null
  isLoading: boolean
  feedback: RecommendResultFeedback | null
  onSelect: (commercialCode: string) => void
  onPreviewChange?: (commercialCode: string | null) => void
  isBookmarked?: (commercialCode: string) => boolean
  isBookmarkPending?: (commercialCode: string) => boolean
  /**
   * 지금 누르면 저장이 아니라 **로그인으로 이동**하는가.
   *
   * 아이콘 버튼이라 눌러 보기 전에는 무슨 일이 날지 알 수 없어, 비로그인 사용자는
   * 안내 없이 `/login` 으로 튕겼다(과업 흐름 감사 J3-1). 시뮬레이션 리포트가 이미
   * 「저장하려면 로그인」이라고 **누르기 전에** 말하므로 같은 규약으로 맞춘다.
   */
  isBookmarkLoginRequired?: boolean
  onBookmarkToggle?: (commercialCode: string, commercialName: string) => void
  /**
   * 추천받은 상권을 `/analysis` 로 넘기는 링크를 만든다.
   *
   * 추천 결과에서 상권분석으로 가는 길이 없어, 1위를 받아도 자세히 보려면
   * 4단계 마법사를 손으로 다시 밟아야 했다. 조건 넷을 모두 아는 자리이므로
   * 탐색 화면이 아니라 결과 화면으로 곧장 보낸다.
   *
   * 생략하면 링크를 그리지 않는다 — 조건이 덜 찬 화면에서도 이 목록을 쓴다.
   */
  buildAnalysisHref?: (commercialCode: string) => string | null
  onRetry: () => void
  /** 비교 담기 선택. 카드 본문 클릭(지도 포커스)과 **다른 행동**이다. */
  compareSelection?: readonly string[]
  onCompareToggle?: (commercialCode: string) => void
  /** 상한을 채웠는가. 채웠으면 안 고른 카드의 체크박스를 잠근다. */
  isCompareFull?: boolean
}

/**
 * 북마크 버튼이 스스로를 설명하는 문장. 아이콘만 있는 버튼이라 이 라벨이 유일한 설명이다.
 *
 * **순서가 규칙이다.** 처리 중이면 그 사실이 먼저고, 그다음이 로그인 여부다 —
 * 로그인하지 않았는데 처리 중일 수는 없다.
 */
export const describeBookmarkAction = (
  commercialName: string,
  {
    saved,
    pending,
    loginRequired,
  }: { saved: boolean; pending: boolean; loginRequired: boolean },
): string => {
  if (pending) return `${commercialName} 북마크 처리 중`
  if (loginRequired) return `${commercialName} 북마크하려면 로그인`
  return `${commercialName} 북마크 ${saved ? '삭제' : '추가'}`
}

const List = styled.ol`
  display: grid;
  gap: 12px;
`

const Card = styled.article<{
  $previewed: boolean
  $selected: boolean
}>`
  overflow: hidden;
  border: 1px solid
    ${props =>
      props.$selected
        ? 'var(--color-primary-600)'
        : props.$previewed
          ? 'var(--color-primary-700)'
          : 'var(--color-border-200)'};
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: ${props =>
    props.$previewed && !props.$selected
      ? '0 0 0 2px var(--color-primary-100)'
      : 'none'};
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const SelectionButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  min-height: 72px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 0;
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  text-align: left;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);
`

const Rank = styled.span`
  min-width: 28px;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  text-align: center;
`

const Copy = styled.span`
  min-width: 0;
  display: grid;
  gap: 4px;
`

const Name = styled.span`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  line-height: 21px;
  overflow-wrap: anywhere;
  word-break: keep-all;
`

/* 추천 이유는 왜 이 순위인지를 말하는 유일한 문장이다. 잘라내면 남는 게
   "공격형 기준으로 기회도 보통을 우선 반영…" 처럼 결론이 사라진 조각뿐이다. */
const Reason = styled.span`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 19px;
  overflow-wrap: anywhere;
  word-break: keep-all;
`

/**
 * DESIGN.md §Skeleton·§Loading: 「금액·지표는 `--`(skeleton 금지 — 가짜 값처럼 보임)」.
 * 점수 칸은 지표 자리라 로딩 중 회색 블록을 두지 않고 `--` 로 비워 둔다.
 */
const ScorePending = styled.span`
  color: var(--color-text-caption);
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
`

const ScoreUnavailable = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  text-align: right;
`

const BlueOcean = styled.section`
  display: grid;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-200);
`

const BlueOceanHeading = styled.h3`
  color: var(--color-text-900);
  font-size: 13px;
  font-weight: 700;
  line-height: 19px;
`

const BlueOceanNote = styled.p`
  color: var(--color-text-600);
  font-size: 12px;
  line-height: 18px;
`

const BlueOceanList = styled.ul`
  display: grid;
  gap: 8px;
`

const BlueOceanItem = styled.li`
  display: grid;
  grid-template-columns: 20px 1fr;
  align-items: center;
  gap: 4px 8px;
  font-size: 13px;
  line-height: 19px;
`

/* 아이콘은 장식이다 — 이름 옆의 보조 신호일 뿐 아이콘만으로 업종을 식별하게 하지 않는다. */
const BlueOceanIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-500);
`

const BlueOceanHead = styled.span`
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
`

/*
 * 덤벨 — 이 상권 점포 수(●)와 행정동 점포 수(○)를 **다섯 업종 공통 눈금**에 찍고
 * 사이를 잇는다. 두 점 사이의 거리가 곧 「비어 있는 정도」다.
 *
 * 비율(`storeRate`)로 막대를 그렸더니 다섯 개가 서로 구별되지 않았다 — 「비어 있는
 * 업종」이 정의상 비율 하위 5개라 늘 85~100% 에 몰린다. 점포 수는 9~65 로 벌어진다.
 * 숫자는 원본 비율까지 그대로 남긴다: 그림은 비교를, 숫자는 사실을 말한다.
 */
const Dumbbell = styled.span`
  grid-column: 2;
  position: relative;
  display: block;
  height: 14px;
`

/* 양 끝 점이 잘리지 않게 점 반지름만큼 안쪽으로 들인다. */
const DumbbellPlot = styled.span`
  position: absolute;
  inset: 0 5px;
`

const DumbbellAxis = styled.span`
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 2px;
  transform: translateY(-50%);
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
`

const DumbbellGap = styled.span<{ $start: number; $end: number }>`
  position: absolute;
  top: 50%;
  left: ${({ $start }) => $start}%;
  width: ${({ $start, $end }) => $end - $start}%;
  height: 2px;
  transform: translateY(-50%);
  border-radius: var(--radius-pill);
  background: var(--score-high);
`

const DumbbellDot = styled.span<{ $at: number; $whole: boolean }>`
  position: absolute;
  top: 50%;
  left: ${({ $at }) => $at}%;
  box-sizing: border-box;
  width: 9px;
  height: 9px;
  margin-left: -4.5px;
  transform: translateY(-50%);
  border: 2px solid
    ${({ $whole }) => ($whole ? 'var(--score-high)' : 'var(--color-text-700)')};
  border-radius: 50%;
  background: ${({ $whole }) =>
    $whole ? 'var(--color-surface)' : 'var(--color-text-700)'};
`

const BlueOceanLegend = styled.p`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  color: var(--color-text-600);
  font-size: 12px;
  line-height: 18px;
`

const LegendKey = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

const LegendDot = styled.span<{ $whole: boolean }>`
  box-sizing: border-box;
  width: 9px;
  height: 9px;
  border: 2px solid
    ${({ $whole }) => ($whole ? 'var(--score-high)' : 'var(--color-text-700)')};
  border-radius: 50%;
  background: ${({ $whole }) =>
    $whole ? 'var(--color-surface)' : 'var(--color-text-700)'};
`

const BlueOceanName = styled.span`
  min-width: 0;
  color: var(--color-text-900);
  font-weight: 700;
  overflow-wrap: anywhere;
  word-break: keep-all;
`

const BlueOceanCounts = styled.span`
  grid-column: 2;
  color: var(--color-text-600);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
`

const SelectedServiceBadge = styled.span`
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  font-size: 12px;
  font-weight: 700;
`

const Details = styled.div`
  display: grid;
  gap: 14px;
  padding: 14px;
  border-top: 1px solid var(--color-border-200);
`

const BadgeList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Badge = styled.li`
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-700);
  font-size: 12px;
  font-weight: 700;
`

const Metrics = styled.dl`
  display: grid;
`

const MetricRow = styled.div`
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--color-border-200);
  color: var(--color-text-700);
  font-size: 13px;

  &:first-child {
    border-top: 0;
  }

  dd {
    display: flex;
    align-items: center;
    color: var(--color-text-900);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`

const SecondaryActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 14px 14px;
`

const CompareCheckbox = styled.label`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:has(input:disabled) {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

const BookmarkButton = styled.button<{ $bookmarked: boolean }>`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid
    ${props =>
      props.$bookmarked
        ? 'var(--color-primary-600)'
        : 'var(--color-border-300)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$bookmarked ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: var(--color-text-900);
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

/* 북마크(아이콘 정사각)와 같은 줄에 서므로 높이를 맞춘다. 보조 행동이라
   채움 없이 테두리만 두고 주 선택 버튼과 무게를 다르게 한다. */
const AnalysisLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-900);
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-primary-700);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

const LoadingState = styled.div`
  display: grid;
  gap: 12px;
`

const SkeletonRow = styled.div`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
`

/**
 * 점수가 `null`이면 "지표 데이터가 없어 점수를 낼 수 없다"는 뜻이다(집계 대기가 아니다).
 * 백엔드가 데이터 없는 상권을 404 대신 `compositeScore: null`로 강등해 내려준다.
 */
export const SCORE_UNAVAILABLE_LABEL = '데이터 없음'
export const SCORE_UNAVAILABLE_DESCRIPTION =
  '지표 데이터가 없어 점수를 계산하지 못했어요.'

export const BLUE_OCEAN_HEADING = '이 상권에 비어 있는 업종'
export const BLUE_OCEAN_NOTE =
  '소속 행정동에 비해 이 상권에 적게 들어온 업종이에요. 두 점 사이가 멀수록 아직 자리가 비어 있다는 뜻이에요.'

const hasScore = (score: unknown): score is number =>
  typeof score === 'number' && Number.isFinite(score)

export const formatScore = (score: unknown): number | string =>
  hasScore(score) ? Math.round(score) : SCORE_UNAVAILABLE_LABEL

const uniqueLabels = (labels: readonly unknown[]): string[] => [
  ...new Set(labels.map(readTrimmedString).filter(Boolean)),
]

const getMetricLabel = (metric: unknown, index: number): string => {
  if (!isRecord(metric)) return `세부 지표 ${index + 1}`

  const summaryLabel = readTrimmedString(metric.summaryLabel)
  if (summaryLabel) return summaryLabel

  const metricType = isRecord(metric.metricType) ? metric.metricType : null
  return readTrimmedString(metricType?.name) || `세부 지표 ${index + 1}`
}

const getMetricKeyPart = (metric: unknown): string => {
  if (!isRecord(metric) || !isRecord(metric.metricType)) return 'unknown'
  return readTrimmedString(metric.metricType.code) || 'unknown'
}

const getMetricScore = (metric: unknown): unknown =>
  isRecord(metric) ? metric.score : null

const getMetricCode = (metric: unknown): string =>
  isRecord(metric) && isRecord(metric.metricType)
    ? readTrimmedString(metric.metricType.code)
    : ''

/** 게이지에 넘길 점수. 숫자가 아니면 `null` 이고, 그때 게이지는 그려지지 않는다. */
const readGaugeScore = (score: unknown): number | null =>
  hasScore(score) ? score : null

/**
 * 다섯 업종이 함께 쓰는 가로 눈금의 최댓값 = 행정동 점포 수 중 가장 큰 값.
 *
 * **눈금을 공유해야 비교가 성립한다.** 항목마다 제 눈금을 쓰면 선 길이가 아무것도
 * 말하지 않는다.
 */
export const getBlueOceanAxisMax = (
  categories: readonly BlueOceanCategory[],
): number =>
  categories.reduce(
    (max, category) => Math.max(max, category.administrationStoreCount),
    0,
  )

/** 덤벨의 두 점 위치(%). `start` 는 이 상권, `end` 는 행정동 전체. */
export type BlueOceanRange = { start: number; end: number }

/**
 * **비율이 아니라 점포 수를 그린다.**
 *
 * 「비어 있는 업종」은 정의상 `storeRate` 하위 5개라 비율은 늘 좁은 띠(85~100%)에
 * 몰린다 — 비율로 그린 막대는 다섯 개가 서로 구별되지 않았다. 점포 수는 9~65 로
 * 크게 벌어지고, 덤으로 **비율이 감추던 것**을 드러낸다: 행정동에도 9곳뿐인 업종은
 * 비율이 낮아도 기회의 크기 자체가 작다.
 *
 * 두 점 사이의 거리가 곧 「비어 있는 정도」다. 비율을 안 쓰므로 방향이 뒤집힐 여지가
 * 애초에 없다.
 */
export const getBlueOceanRange = (
  category: BlueOceanCategory,
  axisMax: number,
): BlueOceanRange | null => {
  if (!Number.isFinite(axisMax) || axisMax <= 0) return null

  const here = Math.min(Math.max(category.commercialStoreCount, 0), axisMax)
  const whole = Math.min(
    Math.max(category.administrationStoreCount, 0),
    axisMax,
  )

  // 상권이 행정동보다 많은 것은 데이터가 뒤집힌 경우다. 「비어 있다」로 그리지 않는다.
  if (whole < here) return null

  return { start: (here / axisMax) * 100, end: (whole / axisMax) * 100 }
}

/** 소수점 둘째 자리까지만 남기고 불필요한 0은 지운다. 3.33 → "3.33", 5 → "5". */
export const formatStoreRate = (storeRate: number): string | null =>
  Number.isFinite(storeRate) ? String(Number(storeRate.toFixed(2))) : null

/** `상권 N곳 / 행정동 M곳 (X%)` — 비율을 알 수 없으면 괄호를 생략한다. */
export const formatBlueOceanCounts = (category: BlueOceanCategory): string => {
  const counts = `상권 ${category.commercialStoreCount}곳 / 행정동 ${category.administrationStoreCount}곳`
  const rate = formatStoreRate(category.storeRate)

  return rate === null ? counts : `${counts} (${rate}%)`
}

export type RecommendationPreviewInteraction = {
  focusedCommercialCode: string | null
  hoveredCommercialCode: string | null
}

export type RecommendationPreviewInteractionEvent = {
  type: 'focus' | 'blur' | 'pointerEnter' | 'pointerLeave'
  commercialCode: string
}

export const createRecommendationPreviewInteraction =
  (): RecommendationPreviewInteraction => ({
    focusedCommercialCode: null,
    hoveredCommercialCode: null,
  })

export const applyRecommendationPreviewInteraction = (
  state: RecommendationPreviewInteraction,
  event: RecommendationPreviewInteractionEvent,
): string | null => {
  if (event.type === 'focus') {
    state.focusedCommercialCode = event.commercialCode
  } else if (
    event.type === 'blur' &&
    state.focusedCommercialCode === event.commercialCode
  ) {
    state.focusedCommercialCode = null
  } else if (event.type === 'pointerEnter') {
    state.hoveredCommercialCode = event.commercialCode
  } else if (
    event.type === 'pointerLeave' &&
    state.hoveredCommercialCode === event.commercialCode
  ) {
    state.hoveredCommercialCode = null
  }

  return state.hoveredCommercialCode ?? state.focusedCommercialCode
}

export const forwardRecommendationSelection = (
  commercialCode: string,
  onSelect: (selectedCode: string) => void,
): void => {
  onSelect(commercialCode)
}

export const forwardRecommendationPreview = (
  commercialCode: string,
  onPreviewChange?: (selectedCode: string | null) => void,
): void => {
  onPreviewChange?.(commercialCode)
}

export const clearRecommendationPreviewIfInactive = (
  isFocused: boolean,
  isHovered: boolean,
  onPreviewChange?: (selectedCode: string | null) => void,
): void => {
  if (!isFocused && !isHovered) onPreviewChange?.(null)
}

export default function RecommendResultList({
  results,
  selectedCommercialCode,
  selectedServiceCode = null,
  previewedCommercialCode = null,
  isLoading,
  feedback,
  onSelect,
  onPreviewChange,
  isBookmarked = () => false,
  isBookmarkPending = () => false,
  isBookmarkLoginRequired = false,
  onBookmarkToggle,
  buildAnalysisHref,
  onRetry,
  compareSelection = [],
  onCompareToggle,
  isCompareFull = false,
}: RecommendResultListProps) {
  const detailsIdPrefix = useId()
  const previewInteractionRef = useRef<RecommendationPreviewInteraction>(
    createRecommendationPreviewInteraction(),
  )
  const handlePreviewInteraction = (
    event: RecommendationPreviewInteractionEvent,
  ) => {
    onPreviewChange?.(
      applyRecommendationPreviewInteraction(
        previewInteractionRef.current,
        event,
      ),
    )
  }

  if (isLoading) {
    return (
      <LoadingState aria-busy="true" aria-live="polite" role="status">
        <VisuallyHidden>추천 Top 5를 불러오는 중입니다.</VisuallyHidden>
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonRow
            aria-hidden="true"
            data-result-skeleton="true"
            key={`result-skeleton-${index + 1}`}
          >
            <Skeleton $height="28px" />
            <Skeleton $height="40px" />
            <ScorePending>--</ScorePending>
          </SkeletonRow>
        ))}
      </LoadingState>
    )
  }

  if (feedback) {
    // 오류 피드백의 재시도 노출은 `isRetryable(kind)` 결과(= feedback.isRetryable)로만 결정한다.
    // 404처럼 재시도해도 결과가 같은 실패에는 버튼을 띄우지 않고 서버 문구만 보여준다.
    // info 톤의 안내 액션(예: 조건 다시 선택)은 오류 재시도가 아니므로 그대로 유지한다.
    const canAct = feedback.tone === 'info' || feedback.isRetryable === true
    const actionLabel = canAct
      ? (feedback.actionLabel ??
        (feedback.tone === 'error' ? '다시 시도' : undefined))
      : undefined

    return (
      <RecommendFeedback
        actionLabel={actionLabel}
        description={feedback.description}
        title={feedback.title}
        tone={feedback.tone}
        onAction={actionLabel ? onRetry : undefined}
      />
    )
  }

  if (results.length === 0) {
    return (
      <RecommendFeedback
        tone="info"
        title="추천 결과가 없어요"
        description="현재 조건으로 추천할 상권이 없어요."
      />
    )
  }

  return (
    <List aria-label="추천 상권 목록">
      {results.map(item => {
        const isSelected = item.commercialCode === selectedCommercialCode
        const isPreviewed = item.commercialCode === previewedCommercialCode
        const isSaved = isBookmarked(item.commercialCode)
        const isSavePending = isBookmarkPending(item.commercialCode)
        const detailsId = `${detailsIdPrefix}-${item.commercialCode}-details`
        const reasonTags = Array.isArray(item.reasonTags) ? item.reasonTags : []
        const metricBreakdown = Array.isArray(item.metricBreakdown)
          ? item.metricBreakdown.filter(isRecord)
          : []
        const detailLabels = uniqueLabels([
          item.opportunityLabel,
          item.riskLabel,
          ...reasonTags,
        ]).slice(0, 3)
        const blueOceanCategories = readBlueOceanCategories(
          item.blueOceanCategories,
        )
        // 눈금을 공유해야 다섯 업종의 선 길이가 서로 비교된다.
        const blueOceanAxisMax = getBlueOceanAxisMax(blueOceanCategories)
        const isScoreUnavailable = !hasScore(item.compositeScore)
        const analysisHref = buildAnalysisHref?.(item.commercialCode) ?? null

        return (
          <li key={item.commercialCode}>
            <Card
              $previewed={isPreviewed}
              $selected={isSelected}
              data-previewed={isPreviewed || undefined}
              data-result-card="true"
              data-score-unavailable={isScoreUnavailable || undefined}
            >
              <SelectionButton
                $selected={isSelected}
                aria-controls={isSelected ? detailsId : undefined}
                aria-expanded={isSelected}
                aria-pressed={isSelected}
                type="button"
                onClick={() =>
                  forwardRecommendationSelection(item.commercialCode, onSelect)
                }
                onBlur={() =>
                  handlePreviewInteraction({
                    type: 'blur',
                    commercialCode: item.commercialCode,
                  })
                }
                onFocus={() =>
                  handlePreviewInteraction({
                    type: 'focus',
                    commercialCode: item.commercialCode,
                  })
                }
                onPointerEnter={() =>
                  handlePreviewInteraction({
                    type: 'pointerEnter',
                    commercialCode: item.commercialCode,
                  })
                }
                onPointerLeave={() =>
                  handlePreviewInteraction({
                    type: 'pointerLeave',
                    commercialCode: item.commercialCode,
                  })
                }
              >
                <Rank>{item.rank}위</Rank>
                <Copy>
                  <Name>{item.commercialName}</Name>
                  {item.selectionReason ? (
                    <Reason>{item.selectionReason}</Reason>
                  ) : null}
                </Copy>
                {isScoreUnavailable ? (
                  <ScoreUnavailable>
                    {SCORE_UNAVAILABLE_LABEL}
                    <VisuallyHidden>
                      {` ${SCORE_UNAVAILABLE_DESCRIPTION}`}
                    </VisuallyHidden>
                  </ScoreUnavailable>
                ) : (
                  <ScoreGauge
                    label="종합 점수"
                    polarity={COMPOSITE_SCORE_POLARITY}
                    score={readGaugeScore(item.compositeScore)}
                    size="lg"
                  />
                )}
              </SelectionButton>

              {isSelected ? (
                <Details id={detailsId}>
                  {detailLabels.length > 0 ? (
                    <BadgeList aria-label="추천 이유">
                      {detailLabels.map(label => (
                        <Badge data-reason-badge="true" key={label}>
                          {label}
                        </Badge>
                      ))}
                    </BadgeList>
                  ) : null}
                  <Metrics>
                    {metricBreakdown.map((metric, index) => (
                      <MetricRow
                        key={`${item.commercialCode}-metric-${getMetricKeyPart(
                          metric,
                        )}-${index}`}
                      >
                        <dt>{getMetricLabel(metric, index)}</dt>
                        <dd>
                          {hasScore(getMetricScore(metric)) ? (
                            <ScoreGauge
                              label={getMetricLabel(metric, index)}
                              polarity={resolveMetricPolarity(
                                getMetricCode(metric),
                              )}
                              score={readGaugeScore(getMetricScore(metric))}
                            />
                          ) : (
                            formatScore(getMetricScore(metric))
                          )}
                        </dd>
                      </MetricRow>
                    ))}
                  </Metrics>
                  {blueOceanCategories.length > 0 ? (
                    <BlueOcean data-blue-ocean="true">
                      <BlueOceanHeading>{BLUE_OCEAN_HEADING}</BlueOceanHeading>
                      <BlueOceanNote>{BLUE_OCEAN_NOTE}</BlueOceanNote>
                      <BlueOceanLegend aria-hidden="true">
                        <LegendKey>
                          <LegendDot $whole={false} />이 상권
                        </LegendKey>
                        <LegendKey>
                          <LegendDot $whole />
                          행정동 전체
                        </LegendKey>
                      </BlueOceanLegend>
                      <BlueOceanList>
                        {blueOceanCategories.map((category, index) => {
                          const range = getBlueOceanRange(
                            category,
                            blueOceanAxisMax,
                          )

                          return (
                            <BlueOceanItem
                              data-blue-ocean-item="true"
                              key={`${item.commercialCode}-blue-ocean-${
                                category.serviceCode || category.serviceName
                              }-${index}`}
                            >
                              <BlueOceanIcon aria-hidden="true">
                                {createElement(
                                  resolveServiceIcon(category.serviceCode),
                                  { size: 16, strokeWidth: 1.8 },
                                )}
                              </BlueOceanIcon>
                              <BlueOceanHead>
                                <BlueOceanName>
                                  {category.serviceName}
                                </BlueOceanName>
                                {selectedServiceCode &&
                                category.serviceCode === selectedServiceCode ? (
                                  <SelectedServiceBadge data-selected-service="true">
                                    선택 업종
                                  </SelectedServiceBadge>
                                ) : null}
                              </BlueOceanHead>
                              {range === null ? null : (
                                <Dumbbell
                                  aria-hidden="true"
                                  data-dumbbell={`${category.commercialStoreCount}-${category.administrationStoreCount}`}
                                >
                                  <DumbbellPlot>
                                    <DumbbellAxis />
                                    <DumbbellGap
                                      $end={range.end}
                                      $start={range.start}
                                    />
                                    <DumbbellDot $at={range.end} $whole />
                                    <DumbbellDot
                                      $at={range.start}
                                      $whole={false}
                                    />
                                  </DumbbellPlot>
                                </Dumbbell>
                              )}
                              <BlueOceanCounts>
                                {formatBlueOceanCounts(category)}
                              </BlueOceanCounts>
                            </BlueOceanItem>
                          )
                        })}
                      </BlueOceanList>
                    </BlueOcean>
                  ) : null}
                </Details>
              ) : null}

              <SecondaryActions data-result-secondary-actions="true">
                {analysisHref ? (
                  <AnalysisLink
                    aria-label={`${item.commercialName} 상권 분석 보기`}
                    data-analysis-link="true"
                    href={analysisHref}
                  >
                    상권 분석 보기
                    <ArrowUpRight aria-hidden="true" />
                  </AnalysisLink>
                ) : null}
                {onCompareToggle ? (
                  <CompareCheckbox>
                    <input
                      aria-label={`${item.commercialName} 비교 담기`}
                      checked={compareSelection.includes(item.commercialCode)}
                      disabled={
                        isCompareFull &&
                        !compareSelection.includes(item.commercialCode)
                      }
                      type="checkbox"
                      onChange={() => onCompareToggle(item.commercialCode)}
                    />
                    <span>비교</span>
                  </CompareCheckbox>
                ) : null}
                {onBookmarkToggle ? (
                  <BookmarkButton
                    $bookmarked={isSaved}
                    aria-label={describeBookmarkAction(item.commercialName, {
                      saved: isSaved,
                      pending: isSavePending,
                      loginRequired: isBookmarkLoginRequired,
                    })}
                    title={
                      isBookmarkLoginRequired
                        ? '북마크하려면 로그인이 필요해요'
                        : undefined
                    }
                    aria-pressed={isSaved}
                    disabled={isSavePending}
                    type="button"
                    onClick={() => {
                      if (!isSavePending) {
                        onBookmarkToggle(
                          item.commercialCode,
                          item.commercialName,
                        )
                      }
                    }}
                  >
                    <BookmarkIcon
                      aria-hidden="true"
                      fill={isSaved ? 'currentColor' : 'none'}
                      size={20}
                    />
                  </BookmarkButton>
                ) : null}
              </SecondaryActions>
            </Card>
          </li>
        )
      })}
    </List>
  )
}
