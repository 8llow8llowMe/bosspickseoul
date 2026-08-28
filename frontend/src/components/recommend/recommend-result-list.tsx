'use client'

import { useId, useRef } from 'react'
import { Bookmark as BookmarkIcon } from 'lucide-react'
import styled from 'styled-components'
import { Skeleton } from '@/components/ui/skeleton'
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
  onBookmarkToggle?: (commercialCode: string, commercialName: string) => void
  onRetry: () => void
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

const Score = styled.span`
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
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
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  font-size: 13px;
  line-height: 19px;
`

const BlueOceanName = styled.span`
  min-width: 0;
  color: var(--color-text-900);
  font-weight: 700;
  overflow-wrap: anywhere;
  word-break: keep-all;
`

const BlueOceanSeparator = styled.span`
  margin-right: 4px;
  color: var(--color-text-caption);
`

const BlueOceanCounts = styled.span`
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
  min-height: 44px;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

/**
 * 점수가 `null`이면 "지표 데이터가 없어 점수를 낼 수 없다"는 뜻이다(집계 대기가 아니다).
 * 백엔드가 데이터 없는 상권을 404 대신 `compositeScore: null`로 강등해 내려준다.
 */
export const SCORE_UNAVAILABLE_LABEL = '데이터 없음'
export const SCORE_UNAVAILABLE_DESCRIPTION =
  '지표 데이터가 없어 점수를 계산하지 못했어요.'

export const BLUE_OCEAN_HEADING = '이 상권에 비어 있는 업종'
export const BLUE_OCEAN_NOTE =
  '소속 행정동에 비해 이 상권에 적게 들어온 업종이에요. 비율이 낮을수록 아직 자리가 비어 있다는 뜻이에요.'

const hasScore = (score: unknown): score is number =>
  typeof score === 'number' && Number.isFinite(score)

export const formatScore = (score: unknown): number | string =>
  hasScore(score) ? Math.round(score) : SCORE_UNAVAILABLE_LABEL

const readTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

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

const readCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : 0

/**
 * 블루오션 목록을 화면에 쓸 수 있는 형태로만 남긴다.
 * `null`·빈 배열·형태가 깨진 항목은 모두 걸러진다 — 호출부는 길이가 0이면 섹션을 렌더하지 않는다.
 */
export const readBlueOceanCategories = (
  value: unknown,
): BlueOceanCategory[] => {
  if (!Array.isArray(value)) return []

  return value.flatMap(category => {
    if (!isRecord(category)) return []

    const serviceName = readTrimmedString(category.serviceName)
    if (!serviceName) return []

    return [
      {
        serviceCode: readTrimmedString(category.serviceCode),
        serviceName,
        commercialStoreCount: readCount(category.commercialStoreCount),
        administrationStoreCount: readCount(category.administrationStoreCount),
        storeRate:
          typeof category.storeRate === 'number' &&
          Number.isFinite(category.storeRate)
            ? category.storeRate
            : Number.NaN,
      },
    ]
  })
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
  onBookmarkToggle,
  onRetry,
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
        const isScoreUnavailable = !hasScore(item.compositeScore)

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
                  <Score>{formatScore(item.compositeScore)}</Score>
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
                        <dd>{formatScore(getMetricScore(metric))}</dd>
                      </MetricRow>
                    ))}
                  </Metrics>
                  {blueOceanCategories.length > 0 ? (
                    <BlueOcean data-blue-ocean="true">
                      <BlueOceanHeading>{BLUE_OCEAN_HEADING}</BlueOceanHeading>
                      <BlueOceanNote>{BLUE_OCEAN_NOTE}</BlueOceanNote>
                      <BlueOceanList>
                        {blueOceanCategories.map((category, index) => (
                          <BlueOceanItem
                            data-blue-ocean-item="true"
                            key={`${item.commercialCode}-blue-ocean-${
                              category.serviceCode || category.serviceName
                            }-${index}`}
                          >
                            <BlueOceanName>
                              {category.serviceName}
                            </BlueOceanName>
                            {selectedServiceCode &&
                            category.serviceCode === selectedServiceCode ? (
                              <SelectedServiceBadge data-selected-service="true">
                                선택 업종
                              </SelectedServiceBadge>
                            ) : null}
                            <BlueOceanCounts>
                              <BlueOceanSeparator aria-hidden="true">
                                ·
                              </BlueOceanSeparator>
                              {formatBlueOceanCounts(category)}
                            </BlueOceanCounts>
                          </BlueOceanItem>
                        ))}
                      </BlueOceanList>
                    </BlueOcean>
                  ) : null}
                </Details>
              ) : null}

              <SecondaryActions data-result-secondary-actions="true">
                {onBookmarkToggle ? (
                  <BookmarkButton
                    $bookmarked={isSaved}
                    aria-label={
                      isSavePending
                        ? `${item.commercialName} 북마크 처리 중`
                        : `${item.commercialName} 북마크 ${
                            isSaved ? '삭제' : '추가'
                          }`
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
