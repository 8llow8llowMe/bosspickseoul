'use client'

import type { Ref } from 'react'
import Link from 'next/link'
import styled, { css, keyframes } from 'styled-components'
import type { NormalizedApiError } from '@/lib/api/api-error'
import {
  ANALYSIS_PERIOD_CODE,
  createAnalysisResultHref,
} from '@/lib/analysis/selection'
import {
  COMPARE_MAX_COMMERCIALS,
  COMPARE_MIN_COMMERCIALS,
  createCompareHref,
} from '@/lib/recommend/compare-url'
import type {
  RecommendConditionStep,
  RecommendationCriteria,
  RecommendationView,
  SubmittedRecommendation,
} from '@/lib/recommend/recommend-state'
import type { OptionGroup, OptionItem } from '@/components/ui/option-picker'
import type {
  AdministrationArea,
  CandidateCommercial,
  RecommendationBasis,
} from '@/types/recommend'
import RecommendConditionForm from './recommend-condition-form'
import RecommendConditionPicker from './recommend-condition-picker'
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
  /** 비로그인이면 북마크가 저장이 아니라 로그인 이동이다 — 버튼이 미리 말한다. */
  isBookmarkLoginRequired?: boolean
  /** `view === 'picker'` 일 때 어느 조건을 고르는 중인지. */
  pickerStep?: RecommendConditionStep | null
  /** 선택 뷰가 보여줄 항목. 지역은 평면, 업종은 그룹으로 온다. */
  pickerItems?: readonly OptionItem[]
  pickerGroups?: readonly OptionGroup[]
  onOpenStep: (step: RecommendConditionStep) => void
  onClosePicker: () => void
  onPickerPreviewChange?: (code: string | null) => void
  onPickerSelect: (code: string) => void
  onSubmit: () => void
  onEdit: () => void
  onResultSelect: (commercialCode: string) => void
  onResultPreviewChange?: (commercialCode: string | null) => void
  onBookmarkToggle?: (commercialCode: string, commercialName: string) => void
  /** 비교 담기 선택. URL 에 넣지 않는 화면 안 일시 상태다. */
  compareSelection?: readonly string[]
  onCompareToggle?: (commercialCode: string) => void
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

const COMPARE_GAP_ID = 'recommend-compare-gap'

const CompareBar = styled.div`
  position: sticky;
  bottom: 0;
  display: grid;
  gap: 8px;
  padding: 12px 0 max(12px, env(safe-area-inset-bottom));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border-200);
`

const CompareGap = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
`

const CompareCta = styled(Link)`
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
`

/*
 * `recommend-condition-form.tsx` 의 `SubmitButton` 과 같은 패턴이다: 네이티브
 * `disabled` + `aria-describedby` 로 「무엇이 빠졌는지 말한다」(#178 규약). 별도
 * 메커니즘(aria-disabled 등)을 새로 들이지 않는다 — 같은 기능 영역 안에서
 * 규약을 구현하는 방법이 둘로 갈리면 안 된다.
 */
const CompareCtaDisabled = styled.button`
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  opacity: var(--button-disabled-opacity-color);
  cursor: not-allowed;
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
  isBookmarkLoginRequired,
  pickerStep,
  pickerItems,
  pickerGroups,
  onOpenStep,
  onClosePicker,
  onPickerPreviewChange,
  onPickerSelect,
  onSubmit,
  onEdit,
  onResultSelect,
  onResultPreviewChange,
  onBookmarkToggle,
  compareSelection,
  onCompareToggle,
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
            administrationsCount={administrations.length}
            administrationsError={administrationsError}
            candidatesCount={candidatesCount}
            candidatesError={candidatesError}
            draft={draft}
            isAdministrationsLoading={isAdministrationsLoading}
            isCandidatesLoading={isCandidatesLoading}
            onOpenStep={onOpenStep}
            onRetryAdministrations={onRetryAdministrations}
            onRetryCandidates={onRetryCandidates}
            onSubmit={onSubmit}
          />
        </Content>
      </Surface>
    )
  }

  if (view === 'picker' && pickerStep) {
    return (
      <Surface $variant={variant}>
        <Content
          data-panel-transition-key={transitionKey}
          data-panel-view="picker"
          key={transitionKey}
        >
          <RecommendConditionPicker
            groups={pickerGroups}
            items={pickerItems}
            selectedCode={draft[pickerStep]?.code ?? null}
            step={pickerStep}
            variant={variant}
            onClose={onClosePicker}
            onPreviewChange={onPickerPreviewChange}
            onSelect={onPickerSelect}
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

  /**
   * 추천 카드 → `/analysis/result` 딥링크. 조건 넷을 모두 아는 자리이므로
   * 탐색 화면(4단계 마법사)을 거치지 않고 결과 화면으로 바로 보낸다.
   * 기간은 분석 화면의 기본 분기를 쓴다 — 추천은 기간을 조건으로 받지 않는다.
   */
  const buildAnalysisHref = (commercialCode: string) =>
    createAnalysisResultHref(
      {
        districtCode: submitted.district.code,
        administrationCode: submitted.administration.code,
        commercialCode,
        serviceCode: submitted.service.code,
        periodCode: ANALYSIS_PERIOD_CODE,
      },
      'summary',
    )

  // `compareSelection` 이 아예 없을 수도 있다 — 비교 기능을 켜지 않은 호출부다.
  // 그때는 고정 바 자체를 그리지 않는다(아래 렌더 분기), 이 값은 계산용 안전망일 뿐이다.
  const selection = compareSelection ?? []
  const isCompareFull = selection.length >= COMPARE_MAX_COMMERCIALS
  const compareGap =
    selection.length < COMPARE_MIN_COMMERCIALS
      ? `비교할 상권을 ${COMPARE_MIN_COMMERCIALS}개 이상 골라 주세요`
      : isCompareFull
        ? `한 번에 ${COMPARE_MAX_COMMERCIALS}개까지 비교할 수 있어요`
        : null
  const compareHref =
    selection.length >= COMPARE_MIN_COMMERCIALS
      ? createCompareHref({
          districtCode: submitted.district.code,
          administrationCode: submitted.administration.code,
          serviceCode: submitted.service.code,
          commercialCodes: selection,
        })
      : null

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
          isBookmarkLoginRequired={isBookmarkLoginRequired}
          feedback={feedback}
          isCompareFull={isCompareFull}
          isLoading={isRecommendationLoading}
          previewedCommercialCode={previewedCommercialCode}
          results={results}
          selectedCommercialCode={selectedCommercialCode}
          selectedServiceCode={submitted.service.code}
          buildAnalysisHref={buildAnalysisHref}
          compareSelection={compareSelection}
          onPreviewChange={onResultPreviewChange}
          onBookmarkToggle={onBookmarkToggle}
          onCompareToggle={onCompareToggle}
          onRetry={onRetry}
          onSelect={onResultSelect}
        />
        {compareSelection ? (
          <CompareBar>
            {compareGap ? (
              <CompareGap id={COMPARE_GAP_ID}>{compareGap}</CompareGap>
            ) : null}
            {compareHref ? (
              <CompareCta
                data-testid="recommend-compare-cta"
                href={compareHref}
              >
                {`비교하기 (${selection.length}/${COMPARE_MAX_COMMERCIALS})`}
              </CompareCta>
            ) : (
              <CompareCtaDisabled
                aria-describedby={compareGap ? COMPARE_GAP_ID : undefined}
                data-testid="recommend-compare-cta"
                disabled
                type="button"
              >
                {`비교하기 (${selection.length}/${COMPARE_MAX_COMMERCIALS})`}
              </CompareCtaDisabled>
            )}
          </CompareBar>
        ) : null}
      </Content>
    </Surface>
  )
}
