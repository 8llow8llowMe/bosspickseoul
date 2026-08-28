'use client'

import type { Ref } from 'react'
import styled, { css, keyframes } from 'styled-components'
import type { NormalizedApiError } from '@/lib/api/api-error'
import type {
  RecommendationCriteria,
  RecommendationOption,
  RecommendationView,
  SubmittedRecommendation,
} from '@/lib/recommend/recommend-state'
import type {
  AdministrationArea,
  CandidateCommercial,
  RecommendationBasis,
} from '@/types/recommend'
import RecommendConditionForm from './recommend-condition-form'
import RecommendFeedback from './recommend-feedback'
import RecommendResultList, {
  type RecommendResultFeedback,
} from './recommend-result-list'

export type RecommendPanelProps = {
  variant?: 'desktop' | 'sheet'
  view: RecommendationView
  draft: RecommendationCriteria
  submitted: SubmittedRecommendation | null
  administrations: AdministrationArea[]
  candidatesCount: number
  results: CandidateCommercial[]
  /** 서버가 정한 추천 기준(프리셋·우선 지표·요약). 못 읽으면 `null`. */
  recommendationBasis?: RecommendationBasis | null
  selectedCommercialCode: string | null
  previewedCommercialCode?: string | null
  periodLabel: string
  isAdministrationsLoading: boolean
  isCandidatesLoading: boolean
  isRecommendationLoading: boolean
  administrationsError?: NormalizedApiError | null
  candidatesError?: NormalizedApiError | null
  feedback: RecommendResultFeedback | null
  bookmarkError?: string | null
  isBookmarked?: (commercialCode: string) => boolean
  isBookmarkPending?: (commercialCode: string) => boolean
  onDistrictChange: (district: RecommendationOption) => void
  onAdministrationChange: (administration: RecommendationOption) => void
  onServiceChange: (service: RecommendationOption) => void
  onSubmit: () => void
  onEdit: () => void
  onResultSelect: (commercialCode: string) => void
  onResultPreviewChange?: (commercialCode: string | null) => void
  onBookmarkToggle?: (commercialCode: string, commercialName: string) => void
  onRetry: () => void
  onRetryAdministrations?: () => void
  onRetryCandidates?: () => void
  resultHeadingRef?: Ref<HTMLHeadingElement>
}

export const getRecommendPanelTransitionKey = (
  view: RecommendationView,
): RecommendationView => view

const desktopSurface = css`
  width: min(390px, calc(100vw - 32px));
  max-height: calc(100dvh - 112px);
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-level-2);
`

const sheetSurface = css`
  width: 100%;
  max-height: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
`

const Surface = styled.section<{ $variant: 'desktop' | 'sheet' }>`
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
  background: var(--color-surface);

  ${props => (props.$variant === 'sheet' ? sheetSurface : desktopSurface)}
`

const contentEnter = keyframes`
  from {
    opacity: 0;
    transform: translateX(8px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
`

const Content = styled.div`
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 22px;
  animation: ${contentEnter} var(--motion-standard) var(--ease-standard);
  -webkit-overflow-scrolling: touch;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Header = styled.header`
  display: grid;
  gap: 8px;
`

const Heading = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  line-height: 30px;
`

const SummaryHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const EditButton = styled.button`
  min-width: 76px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`

const SubmittedSummary = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const SummaryItem = styled.li`
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

const Period = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 20px;
`

/* 서버가 정한 추천 기준. 사용자가 고른 조건(SubmittedSummary)과 시각적으로
   구분돼야 한다 — 같은 칩으로 그리면 사용자가 고른 것처럼 읽힌다. */
const Basis = styled.section`
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: var(--radius-field);
  background: var(--color-surface-muted);
`

const BasisTitle = styled.h3`
  color: var(--color-text-700);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
`

const BasisList = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-items: baseline;

  dt {
    color: var(--color-text-caption);
    font-size: 12px;
    line-height: 18px;
  }

  dd {
    color: var(--color-text-900);
    font-size: 13px;
    font-weight: 600;
    line-height: 18px;
  }
`

const BasisNote = styled.p`
  color: var(--color-text-600);
  font-size: 12px;
  line-height: 18px;
`

export default function RecommendPanel({
  variant = 'desktop',
  view,
  draft,
  submitted,
  administrations,
  candidatesCount,
  results,
  recommendationBasis,
  selectedCommercialCode,
  previewedCommercialCode,
  periodLabel,
  isAdministrationsLoading,
  isCandidatesLoading,
  isRecommendationLoading,
  administrationsError,
  candidatesError,
  feedback,
  bookmarkError,
  isBookmarked,
  isBookmarkPending,
  onDistrictChange,
  onAdministrationChange,
  onServiceChange,
  onSubmit,
  onEdit,
  onResultSelect,
  onResultPreviewChange,
  onBookmarkToggle,
  onRetry,
  onRetryAdministrations,
  onRetryCandidates,
  resultHeadingRef,
}: RecommendPanelProps) {
  const transitionKey = getRecommendPanelTransitionKey(view)

  if (view === 'criteria') {
    return (
      <Surface $variant={variant}>
        <Content
          data-panel-transition-key={transitionKey}
          data-panel-view="criteria"
          key={transitionKey}
        >
          <Header>
            <Heading>어디에 어떤 가게를 열까요?</Heading>
          </Header>
          <RecommendConditionForm
            administrations={administrations}
            administrationsError={administrationsError}
            candidatesCount={candidatesCount}
            candidatesError={candidatesError}
            draft={draft}
            isAdministrationsLoading={isAdministrationsLoading}
            isCandidatesLoading={isCandidatesLoading}
            onAdministrationChange={onAdministrationChange}
            onDistrictChange={onDistrictChange}
            onRetryAdministrations={onRetryAdministrations}
            onRetryCandidates={onRetryCandidates}
            onServiceChange={onServiceChange}
            onSubmit={onSubmit}
          />
        </Content>
      </Surface>
    )
  }

  if (!submitted) {
    return (
      <Surface $variant={variant}>
        <Content
          data-panel-transition-key={transitionKey}
          data-panel-view="results"
          key={transitionKey}
        >
          <RecommendFeedback
            actionLabel="조건 다시 선택"
            onAction={onEdit}
            title="추천 조건을 확인할 수 없어요"
            tone="info"
          />
        </Content>
      </Surface>
    )
  }

  return (
    <Surface $variant={variant}>
      <Content
        data-panel-transition-key={transitionKey}
        data-panel-view="results"
        key={transitionKey}
      >
        <Header>
          <SummaryHeader>
            <Heading ref={resultHeadingRef} aria-live="polite" tabIndex={-1}>
              {submitted.service.name} 추천 Top 5
            </Heading>
            <EditButton type="button" onClick={onEdit}>
              조건 수정
            </EditButton>
          </SummaryHeader>
          <SubmittedSummary aria-label="추천 조건">
            <SummaryItem>{submitted.district.name}</SummaryItem>
            <SummaryItem>{submitted.administration.name}</SummaryItem>
            <SummaryItem>{submitted.service.name}</SummaryItem>
          </SubmittedSummary>
          <Period>{periodLabel}</Period>
          {recommendationBasis ? (
            <Basis aria-label="추천 기준">
              <BasisTitle>이 순서를 정한 기준</BasisTitle>
              <BasisList>
                {recommendationBasis.presetName ? (
                  <>
                    <dt>추천 성향</dt>
                    <dd>{recommendationBasis.presetName}</dd>
                  </>
                ) : null}
                {recommendationBasis.priorityMetricName ? (
                  <>
                    <dt>우선 지표</dt>
                    <dd>{recommendationBasis.priorityMetricName}</dd>
                  </>
                ) : null}
              </BasisList>
              {recommendationBasis.priorityMetricDescription ? (
                <BasisNote>
                  {recommendationBasis.priorityMetricDescription}
                </BasisNote>
              ) : null}
            </Basis>
          ) : null}
        </Header>
        {bookmarkError ? (
          <RecommendFeedback
            description={bookmarkError}
            title="북마크를 처리하지 못했어요"
            tone="error"
          />
        ) : null}
        <RecommendResultList
          isBookmarked={isBookmarked}
          isBookmarkPending={isBookmarkPending}
          feedback={feedback}
          isLoading={isRecommendationLoading}
          previewedCommercialCode={previewedCommercialCode}
          results={results}
          selectedCommercialCode={selectedCommercialCode}
          selectedServiceCode={submitted.service.code}
          onPreviewChange={onResultPreviewChange}
          onBookmarkToggle={onBookmarkToggle}
          onRetry={onRetry}
          onSelect={onResultSelect}
        />
      </Content>
    </Surface>
  )
}
