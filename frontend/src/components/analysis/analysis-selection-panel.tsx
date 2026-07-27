'use client'

import { Check, ChevronRight, RotateCcw } from 'lucide-react'
import styled from 'styled-components'

import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ANALYSIS_STEPS,
  isCompleteAnalysisSelection,
  type AnalysisSelection,
  type AnalysisStep,
} from '@/lib/analysis/selection'

export type AnalysisCandidate = {
  code: string
  name: string
  description?: string | null
}

export type AnalysisSelectionPanelProps = {
  activeStep: AnalysisStep
  selection: AnalysisSelection
  selectedNames: Partial<Record<AnalysisStep, string>>
  items: readonly AnalysisCandidate[]
  status: 'loading' | 'error' | 'empty' | 'ready'
  onStepChange: (step: AnalysisStep) => void
  onSelect: (code: string) => void
  onPreviewChange: (code: string | null) => void
  onRetry: () => void
  onSubmit: () => void
}

export const ANALYSIS_STEP_LABELS: Record<AnalysisStep, string> = {
  district: '자치구',
  administration: '행정동',
  commercial: '상권',
  service: '업종',
}

const Root = styled.section`
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
`

const Header = styled.header`
  display: grid;
  gap: 8px;
  padding: 24px 24px 18px;
  border-bottom: 1px solid var(--color-border-200);
`

const Eyebrow = styled.p`
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 24px;
  font-weight: 750;
  line-height: 34px;
  word-break: keep-all;
`

const Description = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
`

const StepList = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-200);
`

const StepButton = styled.button<{ $active: boolean; $completed: boolean }>`
  min-width: 0;
  min-height: 48px;
  display: grid;
  place-items: center;
  gap: 2px;
  border: 1px solid
    ${props =>
      props.$active ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$active
      ? 'var(--color-primary-700)'
      : props.$completed
        ? 'var(--color-text-800)'
        : 'var(--color-text-caption)'};
  padding: 6px 3px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`

const StepNumber = styled.span`
  font-size: 10px;
  line-height: 14px;
`

const Body = styled.div`
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px 24px;
`

const BodyTitle = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
  }

  span {
    color: var(--color-text-caption);
    font-size: 12px;
  }
`

const CandidateList = styled.ul`
  display: grid;
  gap: 8px;
`

const CandidateButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: var(--color-text-800);
  padding: 10px 12px 10px 14px;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: var(--color-primary-500);
    outline: none;
  }
`

const CandidateCopy = styled.span`
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 2px;

  strong {
    overflow: hidden;
    font-size: 14px;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: var(--color-text-caption);
    font-size: 12px;
    line-height: 18px;
  }
`

const CandidateIcon = styled.span`
  width: 20px;
  height: 20px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-700);

  svg {
    width: 18px;
    height: 18px;
  }
`

const LoadingList = styled.div`
  display: grid;
  gap: 8px;
`

const Footer = styled.footer`
  display: grid;
  gap: 9px;
  border-top: 1px solid var(--color-border-200);
  background: var(--color-surface);
  padding: 16px 20px max(18px, env(safe-area-inset-bottom));

  button {
    width: 100%;
  }
`

const Helper = styled.p`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
`

const selectionCodeByStep = (
  selection: AnalysisSelection,
  step: AnalysisStep,
) => {
  if (step === 'district') return selection.districtCode
  if (step === 'administration') return selection.administrationCode
  if (step === 'commercial') return selection.commercialCode
  return selection.serviceCode
}

const canOpenStep = (
  selection: AnalysisSelection,
  step: AnalysisStep,
): boolean => {
  if (step === 'district') return true
  if (step === 'administration') return Boolean(selection.districtCode)
  if (step === 'commercial') return Boolean(selection.administrationCode)
  return Boolean(selection.commercialCode)
}

export default function AnalysisSelectionPanel({
  activeStep,
  selection,
  selectedNames,
  items,
  status,
  onStepChange,
  onSelect,
  onPreviewChange,
  onRetry,
  onSubmit,
}: AnalysisSelectionPanelProps) {
  const selectedCode = selectionCodeByStep(selection, activeStep)
  const isComplete = isCompleteAnalysisSelection(selection)

  return (
    <Root aria-label="상권 분석 조건 선택">
      <Header>
        <Eyebrow>상권 분석</Eyebrow>
        <Title>분석할 지역을 선택해 주세요</Title>
        <Description>
          지도와 목록에서 지역을 좁힌 뒤 원하는 업종을 선택하세요.
        </Description>
      </Header>

      <StepList aria-label="분석 조건 단계">
        {ANALYSIS_STEPS.map((step, index) => {
          const name = selectedNames[step]
          const completed = Boolean(selectionCodeByStep(selection, step))
          return (
            <li key={step}>
              <StepButton
                type="button"
                $active={activeStep === step}
                $completed={completed}
                aria-current={activeStep === step ? 'step' : undefined}
                disabled={!canOpenStep(selection, step)}
                onClick={() => onStepChange(step)}
              >
                <StepNumber>{index + 1}단계</StepNumber>
                <span>{name ?? ANALYSIS_STEP_LABELS[step]}</span>
              </StepButton>
            </li>
          )
        })}
      </StepList>

      <Body>
        <BodyTitle>
          <h2>{ANALYSIS_STEP_LABELS[activeStep]} 선택</h2>
          {status === 'ready' ? <span>{items.length}개</span> : null}
        </BodyTitle>

        {status === 'loading' ? (
          <LoadingList role="status" aria-label="선택 항목 불러오는 중">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} $height="52px" />
            ))}
          </LoadingList>
        ) : null}

        {status === 'error' ? (
          <EmptyState
            title="목록을 불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
            action={
              <Button
                size="medium"
                variant="secondary"
                leftIcon={<RotateCcw />}
                onClick={onRetry}
              >
                다시 시도
              </Button>
            }
          />
        ) : null}

        {status === 'empty' ? (
          <EmptyState
            title="선택 가능한 항목이 없어요"
            description="이전 단계에서 다른 지역을 선택해 주세요."
          />
        ) : null}

        {status === 'ready' ? (
          <CandidateList>
            {items.map(item => {
              const selected = item.code === selectedCode
              return (
                <li key={item.code}>
                  <CandidateButton
                    type="button"
                    $selected={selected}
                    aria-selected={selected}
                    onClick={() => onSelect(item.code)}
                    onFocus={() => onPreviewChange(item.code)}
                    onBlur={() => onPreviewChange(null)}
                    onPointerEnter={() => onPreviewChange(item.code)}
                    onPointerLeave={() => onPreviewChange(null)}
                  >
                    <CandidateCopy>
                      <strong>{item.name}</strong>
                      {item.description ? (
                        <small>{item.description}</small>
                      ) : null}
                    </CandidateCopy>
                    <CandidateIcon aria-hidden>
                      {selected ? <Check /> : <ChevronRight />}
                    </CandidateIcon>
                  </CandidateButton>
                </li>
              )
            })}
          </CandidateList>
        ) : null}
      </Body>

      <Footer>
        <Button size="large" disabled={!isComplete} onClick={onSubmit}>
          분석 결과 보기
        </Button>
        <Helper>
          {isComplete
            ? '2023년 3분기 기준으로 분석해요'
            : '상권과 업종을 선택해 주세요'}
        </Helper>
      </Footer>
    </Root>
  )
}
