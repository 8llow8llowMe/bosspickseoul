'use client'

import { ChevronRight } from 'lucide-react'
import styled from 'styled-components'

import type {
  RecommendConditionStep,
  RecommendationCriteria,
} from '@/lib/recommend/recommend-state'

export const RECOMMEND_CONDITION_STEPS: readonly RecommendConditionStep[] = [
  'district',
  'administration',
  'service',
]

export const RECOMMEND_CONDITION_LABELS: Record<
  RecommendConditionStep,
  string
> = {
  district: '자치구',
  administration: '행정동',
  service: '업종',
}

export const RECOMMEND_CONDITION_PLACEHOLDERS: Record<
  RecommendConditionStep,
  string
> = {
  district: '자치구 선택',
  administration: '행정동 선택',
  service: '업종 선택',
}

/** 상위 조건이 비면 하위는 고를 수 없다. 조각의 비활성 여부를 여기서 정한다. */
export const canOpenRecommendConditionStep = (
  draft: RecommendationCriteria,
  step: RecommendConditionStep,
): boolean => {
  if (step === 'district') return true
  if (step === 'administration') return draft.district !== null

  return true
}

export const readRecommendConditionName = (
  draft: RecommendationCriteria,
  step: RecommendConditionStep,
): string | null => draft[step]?.name ?? null

export type RecommendConditionBarProps = {
  draft: RecommendationCriteria
  /** 행정동을 불러오는 중이면 그 조각을 잠근다. */
  isAdministrationsLoading?: boolean
  onOpenStep: (step: RecommendConditionStep) => void
}

const Bar = styled.ol`
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
`

const Slot = styled.li`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
`

const SlotButton = styled.button<{ $filled: boolean }>`
  min-width: 0;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  /* button 은 border 를 선언하지 않으면 UA 기본 2px outset 이 그대로 나온다.
     전역 리셋은 font·color 만 다룬다(global-styles.ts). */
  border: none;
  border-radius: var(--radius-field);
  background: transparent;
  color: ${props =>
    props.$filled ? 'var(--color-text-900)' : 'var(--color-placeholder)'};
  font-size: 15px;
  font-weight: ${props => (props.$filled ? 700 : 400)};
  /* 조건 바는 한 줄이 존재 이유다. 좁으면 말줄임하고 줄바꿈하지 않는다. */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);

  /* 바탕(BarShell)이 이미 surface-muted 라, 호버도 같은 회색이면 아무 일도
     일어나지 않는다. 눌리는 자리는 흰 면으로 떠오르게 한다. */
  &:hover:not(:disabled) {
    background: var(--color-surface);
  }

  &:disabled {
    color: var(--color-placeholder);
    cursor: not-allowed;
  }
`

const Divider = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--color-placeholder);

  svg {
    width: 14px;
    height: 14px;
  }
`

export default function RecommendConditionBar({
  draft,
  isAdministrationsLoading = false,
  onOpenStep,
}: RecommendConditionBarProps) {
  return (
    <Bar aria-label="추천 조건">
      {RECOMMEND_CONDITION_STEPS.map((step, index) => {
        const name = readRecommendConditionName(draft, step)
        const disabled =
          !canOpenRecommendConditionStep(draft, step) ||
          (step === 'administration' && isAdministrationsLoading)

        return (
          <Slot key={step}>
            {index > 0 ? (
              <Divider aria-hidden>
                <ChevronRight />
              </Divider>
            ) : null}
            <SlotButton
              type="button"
              $filled={name !== null}
              aria-label={`${RECOMMEND_CONDITION_LABELS[step]} ${
                name ? `— 현재 ${name}` : '선택'
              }`}
              data-step={step}
              disabled={disabled}
              title={name ?? RECOMMEND_CONDITION_PLACEHOLDERS[step]}
              onClick={() => onOpenStep(step)}
            >
              {name ?? RECOMMEND_CONDITION_PLACEHOLDERS[step]}
            </SlotButton>
          </Slot>
        )
      })}
    </Bar>
  )
}
