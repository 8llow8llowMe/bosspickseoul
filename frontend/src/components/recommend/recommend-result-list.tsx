'use client'

import { useId, useRef } from 'react'
import { Bookmark as BookmarkIcon } from 'lucide-react'
import styled from 'styled-components'
import { Skeleton } from '@/components/ui/skeleton'
import type { CandidateCommercial } from '@/types/recommend'
import RecommendFeedback from './recommend-feedback'

export type RecommendResultFeedback = {
  tone: 'info' | 'error'
  title: string
  description?: string
  actionLabel?: string
}

export type RecommendResultListProps = {
  results: CandidateCommercial[]
  selectedCommercialCode: string | null
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
  font-weight: 800;
  text-align: center;
`

const Copy = styled.span`
  min-width: 0;
  display: grid;
  gap: 4px;
`

const Name = styled.span`
  overflow: hidden;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  line-height: 21px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Reason = styled.span`
  overflow: hidden;
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 19px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Score = styled.span`
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
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

const formatScore = (score: unknown): number | string =>
  typeof score === 'number' && Number.isFinite(score)
    ? Math.round(score)
    : '집계 중'

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
            <Skeleton $height="24px" />
          </SkeletonRow>
        ))}
      </LoadingState>
    )
  }

  if (feedback) {
    const actionLabel =
      feedback.actionLabel ??
      (feedback.tone === 'error' ? '다시 시도' : undefined)

    return (
      <RecommendFeedback
        {...feedback}
        actionLabel={actionLabel}
        onAction={actionLabel ? onRetry : undefined}
      />
    )
  }

  if (results.length === 0) {
    return (
      <RecommendFeedback
        tone="info"
        title="추천 결과가 없어요"
        description="현재 조건으로 추천 가능한 상권이 없습니다."
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

        return (
          <li key={item.commercialCode}>
            <Card
              $previewed={isPreviewed}
              $selected={isSelected}
              data-previewed={isPreviewed || undefined}
              data-result-card="true"
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
                <Score>{formatScore(item.compositeScore)}</Score>
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
