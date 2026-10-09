'use client'

import { useId, useState, type Ref } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import styled, { css, keyframes } from 'styled-components'
import type { NormalizedApiError } from '@/lib/api/api-error'
import { createAnalysisResultHref } from '@/lib/analysis/selection'
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
import { RECOMMEND_CONDITION_LABELS } from './recommend-condition-bar'
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
  /**
   * 결과 헤더의 조건 칩. 그 조건의 선택 뷰로 곧장 보낸다(#570). 생략하면 칩은 글자로만 남는다.
   */
  onEditStep?: (step: RecommendConditionStep) => void
  /**
   * 조건 화면의 「이전 결과로 돌아가기」. `submitted` 가 있을 때만 버튼이 뜬다(#570).
   */
  onRestorePreviousResults?: () => void
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

/**
 * 조건 화면의 첫 포커스 자리 표시. 선택 뷰를 닫고 돌아왔을 때 화면이 이 요소로 포커스를
 * 옮긴다(#570). 「이전 결과로 돌아가기」가 있으면 그 버튼, 없으면 조건 화면 제목에 붙는다.
 * 패널이 데스크톱·시트 두 벌이라 ref 대신 표시를 달고, 화면이 보이는 쪽을 고른다.
 */
export const CRITERIA_FOCUS_ATTRIBUTE = 'data-criteria-focus'

const criteriaFocusProps = { [CRITERIA_FOCUS_ATTRIBUTE]: 'true' }

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

/** `CompareBar` 가 스크롤 영역의 아래 여백을 덮어야 해서 값을 공유한다. */
const CONTENT_PADDING = 22

const Content = styled.div`
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: ${CONTENT_PADDING}px;
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

/*
 * 결과 헤더의 조건 칩 — **누르면 그 조건의 선택 뷰로 간다**(#570). 글자만 있던 칩은
 * 눌러 보게 생겼는데 아무 일도 없었다. 조건 바 조각과 같은 회색 채움 면을 쓰고, 터치
 * 대상 44px 을 지킨다. 연필 아이콘 대신 접근성 이름이 「바꾸기」를 말한다.
 */
const SummaryChipButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-800);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary-600);
  }
`

/* 조건 화면 머리의 「이전 결과로 돌아가기」 줄. 결과가 남아 있다는 사실을 먼저 말한다. */
const PreviousResults = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 10px 12px 10px 14px;
  border-radius: var(--radius-field);
  background: var(--color-surface-muted);
`

const PreviousResultsCopy = styled.p`
  min-width: 0;
  flex: 1 1 160px;
  display: grid;
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
  overflow-wrap: anywhere;
  word-break: keep-all;

  strong {
    color: var(--color-text-900);
    font-weight: 700;
  }
`

const PreviousResultsButton = styled.button`
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-900);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
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
  border-radius: var(--radius-field);
  background: var(--color-surface-muted);
`

/*
 * 기본 접힘(#569). 펼친 상자가 모바일 첫 화면 약 120px 을 차지해 1위 카드를 밀어냈다.
 * 접힌 줄에도 추천 성향·우선 지표 이름은 남겨 「무엇으로 줄 세웠는지」는 바로 읽힌다.
 */
const BasisToggle = styled.button`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-field);
  background: transparent;
  color: var(--color-text-700);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  text-align: left;
  cursor: pointer;

  svg {
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
    margin-left: auto;
    transition: transform var(--motion-fast) var(--ease-standard);
  }

  &[aria-expanded='true'] svg {
    transform: rotate(180deg);
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
  }
`

const BasisSummary = styled.span`
  min-width: 0;
  color: var(--color-text-900);
  font-weight: 600;
  overflow-wrap: anywhere;
  word-break: keep-all;
`

const BasisBody = styled.div`
  display: grid;
  gap: 6px;
  padding: 0 14px 12px;

  /* 위의 display: grid 가 브라우저 기본 [hidden] 을 덮으므로 접힘을 다시 적는다. */
  &[hidden] {
    display: none;
  }
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

/*
 * sticky 는 스크롤 컨테이너의 padding 안쪽에 붙는다. `bottom: 0` 이면 바 아래로
 * Content 의 아래 여백(22px)이 남아 그 틈으로 목록이 비쳐 보였다. 여백만큼 아래로
 * 내려 붙이고(bottom·margin 음수) 그만큼 안쪽 여백으로 되돌려 바가 패널 바닥까지 덮게 한다.
 * 좌우도 같은 이유로 여백까지 넓혀 목록이 바 옆으로 새지 않게 한다.
 */
/*
 * 한 줄 바(#569). 선택이 0개면 그리지 않는다 — 고르기 전부터 떠 있던 두 줄짜리 바가
 * 모바일 첫 화면을 약 126px 먹었다. 담기는 카드마다 있는 「비교」 체크가 시작한다.
 */
const CompareBar = styled.div`
  position: sticky;
  bottom: ${-CONTENT_PADDING}px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 ${-CONTENT_PADDING}px ${-CONTENT_PADDING}px;
  padding: 8px ${CONTENT_PADDING}px
    calc(max(8px, env(safe-area-inset-bottom)) + ${CONTENT_PADDING}px);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border-200);
`

const CompareGap = styled.p`
  min-width: 0;
  flex: 1 1 auto;
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const CompareCta = styled(Link)`
  flex: 0 0 auto;
  min-height: 44px;
  margin-left: auto;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  background: var(--color-fill-primary-text);
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
  flex: 0 0 auto;
  min-height: 44px;
  margin-left: auto;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--color-fill-primary-text);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  opacity: var(--button-disabled-opacity-color);
  cursor: not-allowed;
`

const SUBMITTED_STEPS: readonly RecommendConditionStep[] = [
  'district',
  'administration',
  'service',
]

/** 접힌 줄에 남기는 한 줄 요약. 「공격형 · 기회도 우선」 */
export const summarizeRecommendationBasis = (
  basis: RecommendationBasis,
): string =>
  [
    basis.presetName,
    basis.priorityMetricName ? `${basis.priorityMetricName} 우선` : null,
  ]
    .filter(Boolean)
    .join(' · ')

/**
 * 「이 순서를 정한 기준」. **기본 접힘**(#569) — 첫 화면은 1위 카드의 자리다.
 * 펼침 상태는 화면 안 일시 상태라 리듀서·URL 에 올리지 않는다.
 */
function RecommendBasisDisclosure({
  basis,
  defaultExpanded = false,
}: {
  basis: RecommendationBasis
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const bodyId = useId()
  const summary = summarizeRecommendationBasis(basis)
  const hasBody = Boolean(
    basis.presetName ||
    basis.priorityMetricName ||
    basis.priorityMetricDescription,
  )

  return (
    <Basis aria-label="추천 기준">
      <BasisToggle
        aria-controls={hasBody ? bodyId : undefined}
        aria-expanded={isExpanded}
        data-basis-toggle="true"
        type="button"
        onClick={() => setIsExpanded(current => !current)}
      >
        <span>이 순서를 정한 기준</span>
        {summary ? <BasisSummary>{summary}</BasisSummary> : null}
        <ChevronDown aria-hidden="true" />
      </BasisToggle>
      {/* 접혀 있어도 본문은 DOM 에 둔다 — aria-controls 가 가리킬 id 가 늘 있어야 한다. */}
      {hasBody ? (
        <BasisBody hidden={!isExpanded} id={bodyId}>
          <BasisList>
            {basis.presetName ? (
              <>
                <dt>추천 성향</dt>
                <dd>{basis.presetName}</dd>
              </>
            ) : null}
            {basis.priorityMetricName ? (
              <>
                <dt>우선 지표</dt>
                <dd>{basis.priorityMetricName}</dd>
              </>
            ) : null}
          </BasisList>
          {basis.priorityMetricDescription ? (
            <BasisNote>{basis.priorityMetricDescription}</BasisNote>
          ) : null}
        </BasisBody>
      ) : null}
    </Basis>
  )
}

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
  onEditStep,
  onRestorePreviousResults,
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
  const hasPreviousResults = Boolean(submitted && onRestorePreviousResults)

  if (view === 'criteria') {
    return (
      <Surface $variant={variant}>
        <Content
          data-panel-transition-key={transitionKey}
          data-panel-view="criteria"
          key={transitionKey}
        >
          <Header>
            <Heading
              {...(hasPreviousResults ? {} : criteriaFocusProps)}
              tabIndex={-1}
            >
              어디에 어떤 가게를 열까요?
            </Heading>
            {submitted && onRestorePreviousResults ? (
              <PreviousResults data-previous-results="true">
                <PreviousResultsCopy>
                  <strong>직전 추천 결과가 남아 있어요</strong>
                  <span>{`${submitted.district.name} ${submitted.administration.name} · ${submitted.service.name}`}</span>
                </PreviousResultsCopy>
                <PreviousResultsButton
                  {...criteriaFocusProps}
                  type="button"
                  onClick={onRestorePreviousResults}
                >
                  이전 결과로 돌아가기
                </PreviousResultsButton>
              </PreviousResults>
            ) : null}
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
   * 기간은 싣지 않는다(최신) — 추천은 기간을 조건으로 받지 않고, 결과 화면이 서버 기본 분기로 해석한다
   * (period-catalog.md D4-5).
   */
  const buildAnalysisHref = (commercialCode: string) =>
    createAnalysisResultHref(
      {
        districtCode: submitted.district.code,
        administrationCode: submitted.administration.code,
        commercialCode,
        serviceCode: submitted.service.code,
        periodCode: null,
      },
      'summary',
    )

  // `compareSelection` 이 아예 없을 수도 있다 — 비교 기능을 켜지 않은 호출부다.
  // 없거나 비었으면 고정 바 자체를 그리지 않는다(아래 렌더 분기, #569). 이 값은 계산용 안전망일 뿐이다.
  const selection = compareSelection ?? []
  const isCompareFull = selection.length >= COMPARE_MAX_COMMERCIALS
  /*
   * 정원 문구는 하나로 말한다(#559). 「2개 이상」과 「2개까지」가 함께 뜨면 정원이 2개라는
   * 사실이 오히려 흐려졌다 — 비교 계약이 좌/우 두 자리라 정확히 2개다(compare-url).
   */
  const compareCount = `(${selection.length}/${COMPARE_MAX_COMMERCIALS})`
  const compareGap =
    selection.length < COMPARE_MIN_COMMERCIALS
      ? `비교할 상권 ${COMPARE_MAX_COMMERCIALS}개를 골라 주세요 ${compareCount}`
      : null
  const compareStatus =
    compareGap ??
    `비교할 상권 ${COMPARE_MAX_COMMERCIALS}개를 골랐어요 ${compareCount}`
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
            {SUBMITTED_STEPS.map(step => {
              const name = submitted[step].name

              return onEditStep ? (
                <li key={step}>
                  <SummaryChipButton
                    aria-label={`${RECOMMEND_CONDITION_LABELS[step]} 바꾸기, 지금 조건 ${name}`}
                    data-summary-step={step}
                    type="button"
                    onClick={() => onEditStep(step)}
                  >
                    {name}
                  </SummaryChipButton>
                </li>
              ) : (
                <SummaryItem key={step}>{name}</SummaryItem>
              )
            })}
          </SubmittedSummary>
          <Period>{periodLabel}</Period>
          {recommendationBasis ? (
            <RecommendBasisDisclosure basis={recommendationBasis} />
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
        {compareSelection && compareSelection.length > 0 ? (
          <CompareBar data-compare-bar="true">
            <CompareGap id={COMPARE_GAP_ID}>{compareStatus}</CompareGap>
            {compareHref ? (
              <CompareCta
                data-testid="recommend-compare-cta"
                href={compareHref}
              >
                비교하기
              </CompareCta>
            ) : (
              <CompareCtaDisabled
                aria-describedby={compareGap ? COMPARE_GAP_ID : undefined}
                data-testid="recommend-compare-cta"
                disabled
                type="button"
              >
                비교하기
              </CompareCtaDisabled>
            )}
          </CompareBar>
        ) : null}
      </Content>
    </Surface>
  )
}
