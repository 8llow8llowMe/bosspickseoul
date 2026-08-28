'use client'

import styled from 'styled-components'
import { isRetryable, type NormalizedApiError } from '@/lib/api/api-error'
import type {
  RecommendConditionStep,
  RecommendationCriteria,
} from '@/lib/recommend/recommend-state'

import RecommendConditionBar from './recommend-condition-bar'

export type RecommendConditionFormProps = {
  draft: RecommendationCriteria
  /** 자치구는 골랐는데 행정동 목록이 비는 경우를 구분하려면 개수가 필요하다. */
  administrationsCount: number
  candidatesCount: number
  isAdministrationsLoading: boolean
  isCandidatesLoading: boolean
  /** 정규화된 실패. 재시도 버튼 노출은 `isRetryable(kind)`로만 판단한다. */
  administrationsError?: NormalizedApiError | null
  candidatesError?: NormalizedApiError | null
  onRetryAdministrations?: () => void
  onRetryCandidates?: () => void
  onOpenStep: (step: RecommendConditionStep) => void
  onSubmit: () => void
}

const Form = styled.form`
  display: grid;
  gap: 16px;
`

/* 바탕은 비운다. 조각 자체가 회색 채움 칩이라, 바탕까지 회색이면 조각이 다시
   배경에 묻혀 버튼으로 안 읽힌다. */
const BarShell = styled.div`
  width: 100%;
`

const Helper = styled.div<{ $isError?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: ${props =>
    props.$isError ? 'var(--color-text-900)' : 'var(--color-text-600)'};
  font-size: 13px;
  line-height: 20px;
`

const RetryButton = styled.button`
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

const SubmitButton = styled.button`
  width: 100%;
  min-height: 52px;
  border: 1px solid var(--color-primary-700);
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    opacity var(--motion-fast) var(--ease-standard);

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

export const submitRecommendationIfEnabled = (
  isSubmitDisabled: boolean,
  onSubmit: () => void,
): void => {
  if (!isSubmitDisabled) onSubmit()
}

export default function RecommendConditionForm({
  draft,
  administrationsCount,
  candidatesCount,
  isAdministrationsLoading,
  isCandidatesLoading,
  administrationsError,
  candidatesError,
  onRetryAdministrations,
  onRetryCandidates,
  onOpenStep,
  onSubmit,
}: RecommendConditionFormProps) {
  const administrationHelp = !draft.district
    ? '자치구를 먼저 선택해 주세요.'
    : isAdministrationsLoading
      ? '행정동을 불러오는 중입니다.'
      : administrationsError
        ? administrationsError.message
        : administrationsCount === 0
          ? '현재 자치구의 행정동 데이터가 준비되지 않았습니다.'
          : null

  const candidateHelp =
    draft.administration && isCandidatesLoading
      ? '후보 상권을 불러오는 중입니다.'
      : draft.administration && candidatesError
        ? candidatesError.message
        : draft.administration &&
            !isCandidatesLoading &&
            !candidatesError &&
            candidatesCount === 0
          ? '현재 행정동에는 추천할 상권이 없어요.'
          : null

  const isSubmitDisabled =
    !draft.district ||
    !draft.administration ||
    !draft.service ||
    isAdministrationsLoading ||
    isCandidatesLoading ||
    candidatesCount === 0 ||
    Boolean(administrationsError) ||
    Boolean(candidatesError)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitRecommendationIfEnabled(isSubmitDisabled, onSubmit)
  }

  return (
    <Form onSubmit={handleSubmit}>
      <BarShell>
        <RecommendConditionBar
          draft={draft}
          isAdministrationsLoading={isAdministrationsLoading}
          onOpenStep={onOpenStep}
        />
      </BarShell>

      {administrationHelp ? (
        <Helper
          $isError={Boolean(administrationsError)}
          data-tone={administrationsError ? 'error' : undefined}
          role={administrationsError ? 'alert' : undefined}
        >
          <span>{administrationHelp}</span>
          {administrationsError &&
          isRetryable(administrationsError.kind) &&
          onRetryAdministrations ? (
            <RetryButton type="button" onClick={onRetryAdministrations}>
              행정동 다시 불러오기
            </RetryButton>
          ) : null}
        </Helper>
      ) : null}

      {candidateHelp ? (
        <Helper
          $isError={Boolean(candidatesError)}
          data-tone={candidatesError ? 'error' : undefined}
          role={candidatesError ? 'alert' : undefined}
        >
          <span>{candidateHelp}</span>
          {candidatesError &&
          isRetryable(candidatesError.kind) &&
          onRetryCandidates ? (
            <RetryButton type="button" onClick={onRetryCandidates}>
              후보 상권 다시 불러오기
            </RetryButton>
          ) : null}
        </Helper>
      ) : null}

      <SubmitButton
        data-testid="recommend-submit"
        disabled={isSubmitDisabled}
        type="submit"
      >
        상권 추천받기
      </SubmitButton>
    </Form>
  )
}
