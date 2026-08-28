'use client'

import { useId, type ChangeEvent, type FormEvent } from 'react'
import styled from 'styled-components'
import { districts } from '@/data/districts'
import { simulationCatalog } from '@/data/simulation-catalog'
import { isRetryable, type NormalizedApiError } from '@/lib/api/api-error'
import type {
  RecommendationCriteria,
  RecommendationOption,
} from '@/lib/recommend/recommend-state'
import type { AdministrationArea } from '@/types/recommend'

export type RecommendConditionFormProps = {
  draft: RecommendationCriteria
  administrations: AdministrationArea[]
  candidatesCount: number
  isAdministrationsLoading: boolean
  isCandidatesLoading: boolean
  /** 정규화된 실패. 재시도 버튼 노출은 `isRetryable(kind)`로만 판단한다. */
  administrationsError?: NormalizedApiError | null
  candidatesError?: NormalizedApiError | null
  onRetryAdministrations?: () => void
  onRetryCandidates?: () => void
  onDistrictChange: (district: RecommendationOption) => void
  onAdministrationChange: (administration: RecommendationOption) => void
  onServiceChange: (service: RecommendationOption) => void
  onSubmit: () => void
}

const districtOptions: RecommendationOption[] = districts.map(district => ({
  code: String(district.gooCode),
  name: district.gooName,
}))

const Form = styled.form`
  display: grid;
  gap: 20px;
`

const Field = styled.div`
  display: grid;
  gap: 8px;
`

const Label = styled.label`
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
`

const Select = styled.select`
  width: 100%;
  min-height: 48px;
  padding: 0 40px 0 14px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-field);
  background: var(--color-surface);
  color: var(--color-text-900);
  cursor: pointer;

  &:disabled {
    background: var(--color-surface-muted);
    color: var(--color-text-caption);
  }
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
  administrations,
  candidatesCount,
  isAdministrationsLoading,
  isCandidatesLoading,
  administrationsError,
  candidatesError,
  onRetryAdministrations,
  onRetryCandidates,
  onDistrictChange,
  onAdministrationChange,
  onServiceChange,
  onSubmit,
}: RecommendConditionFormProps) {
  const idPrefix = useId()
  const districtId = `${idPrefix}-district`
  const administrationId = `${idPrefix}-administration`
  const serviceId = `${idPrefix}-service`
  const administrationHelpId = `${idPrefix}-administration-help`
  const candidateHelpId = `${idPrefix}-candidate-help`

  const administrationHelp = !draft.district
    ? '자치구를 먼저 선택해 주세요.'
    : isAdministrationsLoading
      ? '행정동을 불러오는 중입니다.'
      : administrationsError
        ? administrationsError.message
        : administrations.length === 0
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitRecommendationIfEnabled(isSubmitDisabled, onSubmit)
  }

  const handleDistrictChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selected = districtOptions.find(
      district => district.code === event.target.value,
    )

    if (selected) onDistrictChange(selected)
  }

  const handleAdministrationChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const selected = administrations.find(
      administration =>
        administration.administrationCode === event.target.value,
    )

    if (selected) {
      onAdministrationChange({
        code: selected.administrationCode,
        name: selected.administrationName,
      })
    }
  }

  const handleServiceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selected = Object.values(simulationCatalog)
      .flat()
      .find(service => service.code === event.target.value)

    if (selected) {
      onServiceChange({ code: selected.code, name: selected.name })
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Field>
        <Label htmlFor={districtId}>자치구</Label>
        <Select
          id={districtId}
          value={draft.district?.code ?? ''}
          onChange={handleDistrictChange}
        >
          <option value="">자치구 선택</option>
          {districtOptions.map(district => (
            <option key={district.code} value={district.code}>
              {district.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field>
        <Label htmlFor={administrationId}>행정동</Label>
        <Select
          id={administrationId}
          aria-describedby={
            [
              administrationHelp && administrationHelpId,
              candidateHelp && candidateHelpId,
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          aria-invalid={Boolean(administrationsError) || undefined}
          disabled={!draft.district || isAdministrationsLoading}
          value={draft.administration?.code ?? ''}
          onChange={handleAdministrationChange}
        >
          <option value="">행정동 선택</option>
          {administrations.map(administration => (
            <option
              key={administration.administrationCode}
              value={administration.administrationCode}
            >
              {administration.administrationName}
            </option>
          ))}
        </Select>
        {administrationHelp ? (
          <Helper
            $isError={Boolean(administrationsError)}
            data-tone={administrationsError ? 'error' : undefined}
            id={administrationHelpId}
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
            id={candidateHelpId}
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
      </Field>

      <Field>
        <Label htmlFor={serviceId}>업종</Label>
        <Select
          id={serviceId}
          disabled={!draft.administration}
          value={draft.service?.code ?? ''}
          onChange={handleServiceChange}
        >
          <option value="">업종 선택</option>
          {Object.entries(simulationCatalog).map(([category, services]) => (
            <optgroup key={category} label={category}>
              {services.map(service => (
                <option key={service.code} value={service.code}>
                  {service.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>

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
