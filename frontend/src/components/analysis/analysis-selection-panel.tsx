'use client'

import { memo } from 'react'
import { Check, ChevronRight, RotateCcw } from 'lucide-react'
import styled from 'styled-components'

import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { isRetryable, type NormalizedApiError } from '@/lib/api/api-error'
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
  /**
   * `status === 'error'`일 때의 정규화된 오류(`resolveApiError(query)`).
   * `kind === 'not-found'`면 재시도 버튼 없이 서버 문구만 노출한다.
   *
   * optional 이 아니다 — 빠뜨리면 404 에도 재시도 버튼이 붙는 예전 UX 로 조용히 되돌아가고
   * 타입체커가 잡지 못한다. `AnalysisResultSection`·`StatusFeedback` 과 시그니처를 맞춘다.
   * (오류 종류를 알 수 없는 실패는 호출부가 명시적으로 `null` 을 넘긴다.)
   */
  error: NormalizedApiError | null
  onStepChange: (step: AnalysisStep) => void
  onSelect: (code: string) => void
  onPreviewChange: (code: string | null) => void
  onRetry: () => void
  onSubmit: () => void
  variant?: 'panel' | 'sheet'
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
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 700;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 24px;
  font-weight: 700;
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
  /* minmax(0, 1fr)로 트랙을 고정한다. 기본 1fr(=minmax(auto,1fr))은 긴 선택명이
     트랙을 밀어 폭이 들쭉날쭉해지므로, 내용과 무관하게 항상 4등분되게 한다. */
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-200);
`

const StepButton = styled.button<{ $active: boolean; $completed: boolean }>`
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 60px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
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
  padding: 10px 8px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
  word-break: keep-all;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`

const StepNumber = styled.span`
  font-size: 10px;
  line-height: 14px;
  font-weight: 600;
  opacity: 0.8;
`

// 선택명이 길어도 트랙을 넘치지 않도록 한 줄 말줄임. 전체 이름은 버튼 title로 노출.
const StepName = styled.span`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Body = styled.div<{ $variant: 'panel' | 'sheet' }>`
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px 24px;

  ${props =>
    props.$variant === 'sheet' &&
    `
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* legacy Edge */
      &::-webkit-scrollbar {
        display: none;
      }
    `}
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

const CandidateList = styled.ul<{ $variant: 'panel' | 'sheet' }>`
  display: grid;
  gap: 8px;
  ${props =>
    props.$variant === 'sheet' &&
    `grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));`}
`

const CandidateButton = styled.button<{
  $selected: boolean
  $variant: 'panel' | 'sheet'
}>`
  width: 100%;
  min-height: 52px;
  height: ${props => (props.$variant === 'sheet' ? '100%' : 'auto')};
  display: flex;
  align-items: ${props =>
    props.$variant === 'sheet' ? 'flex-start' : 'center'};
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
    border-color: var(--color-primary-600);
    outline: none;
  }
`

const CandidateCopy = styled.span<{ $variant: 'panel' | 'sheet' }>`
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 2px;

  strong {
    font-size: 14px;
    font-weight: 600;
    ${props =>
      props.$variant === 'sheet'
        ? 'white-space: normal; word-break: keep-all;'
        : 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'}
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

const CandidateGrid = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
`

const ChipButton = styled.button<{ $selected: boolean }>`
  position: relative;
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-800)'};
  padding: 8px 22px;
  font-size: 14px;
  font-weight: ${props => (props.$selected ? 700 : 600)};
  line-height: 1.3;
  text-align: center;
  word-break: keep-all;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover,
  &:focus-visible {
    border-color: var(--color-primary-600);
    outline: none;
  }
`

const ChipCheck = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-700);

  svg {
    width: 14px;
    height: 14px;
  }
`

const LoadingList = styled.div<{ $variant: 'grid' | 'list' }>`
  display: grid;
  gap: 8px;

  ${props =>
    props.$variant === 'grid'
      ? 'grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));'
      : ''}
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

function AnalysisSelectionPanel({
  activeStep,
  selection,
  selectedNames,
  items,
  status,
  error,
  onStepChange,
  onSelect,
  onPreviewChange,
  onRetry,
  onSubmit,
  variant = 'panel',
}: AnalysisSelectionPanelProps) {
  const selectedCode = selectionCodeByStep(selection, activeStep)
  const isComplete = isCompleteAnalysisSelection(selection)
  // 자치구·행정동은 짧은 이름 + 설명 없음 → compact 칩 격자.
  // 상권·업종은 분류/업종 설명이 있어 가독성 위해 행 리스트 유지.
  const isChipStep =
    activeStep === 'district' || activeStep === 'administration'

  return (
    <Root aria-label="상권 분석 조건 선택">
      {variant !== 'sheet' ? (
        <Header>
          <Eyebrow>상권 분석</Eyebrow>
          <Title>분석할 지역을 선택해 주세요</Title>
          <Description>
            지도와 목록에서 지역을 좁힌 뒤 원하는 업종을 선택하세요.
          </Description>
        </Header>
      ) : null}

      <StepList aria-label="분석 조건 단계">
        {ANALYSIS_STEPS.map((step, index) => {
          const name = selectedNames[step]
          const label = name ?? ANALYSIS_STEP_LABELS[step]
          const completed = Boolean(selectionCodeByStep(selection, step))
          return (
            <li key={step}>
              <StepButton
                type="button"
                $active={activeStep === step}
                $completed={completed}
                aria-current={activeStep === step ? 'step' : undefined}
                disabled={!canOpenStep(selection, step)}
                title={label}
                onClick={() => onStepChange(step)}
              >
                <StepNumber>{index + 1}단계</StepNumber>
                <StepName>{label}</StepName>
              </StepButton>
            </li>
          )
        })}
      </StepList>

      <Body $variant={variant}>
        <BodyTitle>
          <h2>{ANALYSIS_STEP_LABELS[activeStep]} 선택</h2>
          {status === 'ready' ? <span>{items.length}개</span> : null}
        </BodyTitle>

        {status === 'loading' ? (
          <LoadingList
            role="status"
            aria-label="선택 항목 불러오는 중"
            $variant={isChipStep ? 'grid' : 'list'}
          >
            {Array.from({ length: isChipStep ? 9 : 5 }, (_, index) => (
              <Skeleton key={index} $height={isChipStep ? '44px' : '52px'} />
            ))}
          </LoadingList>
        ) : null}

        {status === 'error' ? (
          <EmptyState
            title={
              error?.kind === 'not-found'
                ? '선택 가능한 항목이 없어요'
                : '목록을 불러오지 못했어요'
            }
            description={error?.message ?? '잠시 후 다시 시도해 주세요.'}
            action={
              !error || isRetryable(error.kind) ? (
                <Button
                  size="medium"
                  variant="secondary"
                  leftIcon={<RotateCcw />}
                  onClick={onRetry}
                >
                  다시 시도
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {status === 'empty' ? (
          <EmptyState
            title="선택 가능한 항목이 없어요"
            description="이전 단계에서 다른 지역을 선택해 주세요."
          />
        ) : null}

        {status === 'ready' && isChipStep ? (
          <CandidateGrid>
            {items.map(item => {
              const selected = item.code === selectedCode
              return (
                <li key={item.code}>
                  <ChipButton
                    type="button"
                    $selected={selected}
                    aria-selected={selected}
                    title={item.name}
                    onClick={() => onSelect(item.code)}
                    onFocus={() => onPreviewChange(item.code)}
                    onBlur={() => onPreviewChange(null)}
                    onPointerEnter={() => onPreviewChange(item.code)}
                    onPointerLeave={() => onPreviewChange(null)}
                  >
                    {item.name}
                    {selected ? (
                      <ChipCheck aria-hidden>
                        <Check />
                      </ChipCheck>
                    ) : null}
                  </ChipButton>
                </li>
              )
            })}
          </CandidateGrid>
        ) : null}

        {status === 'ready' && !isChipStep ? (
          <CandidateList $variant={variant}>
            {items.map(item => {
              const selected = item.code === selectedCode
              return (
                <li key={item.code}>
                  <CandidateButton
                    type="button"
                    $selected={selected}
                    $variant={variant}
                    aria-selected={selected}
                    onClick={() => onSelect(item.code)}
                    onFocus={() => onPreviewChange(item.code)}
                    onBlur={() => onPreviewChange(null)}
                    onPointerEnter={() => onPreviewChange(item.code)}
                    onPointerLeave={() => onPreviewChange(null)}
                  >
                    <CandidateCopy $variant={variant}>
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

// 호버 미리보기(previewedCode)는 페이지 최상단 state라 값이 바뀌면 페이지가
// 리렌더된다. 패널은 previewedCode를 쓰지 않으므로 memo로 감싸 props가 실제로
// 바뀔 때만 리렌더하게 한다(호버 시 칩 25개 불필요 리렌더 차단).
export default memo(AnalysisSelectionPanel)
