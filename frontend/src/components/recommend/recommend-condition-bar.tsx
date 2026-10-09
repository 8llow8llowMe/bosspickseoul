'use client'

import { ChevronRight } from 'lucide-react'
import { useId } from 'react'
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

/**
 * 조건 바에 그릴 이름. **빈 문자열도 `null` 로 본다.**
 *
 * URL 로 복원할 때 행정동은 코드만 알고 이름은 목록이 와야 안다(`{ code, name: '' }`).
 * 그대로 두면 `??` 를 통과해 조각이 **글자 없이 빈 채로** 그려진다. 자리표시자를
 * 보여 주는 편이 낫다 — 그 조각은 목록을 불러오는 동안 어차피 잠겨 있다.
 */
export const readRecommendConditionName = (
  draft: RecommendationCriteria,
  step: RecommendConditionStep,
): string | null => {
  const name = draft[step]?.name?.trim()

  return name ? name : null
}

/** 잠긴 행정동 칩이 왜 잠겼는지 말하는 문장. 주어·목적어를 줄이지 않는다. */
export const RECOMMEND_ADMINISTRATION_LOCKED_REASON =
  '자치구를 먼저 골라 주세요'

export type RecommendConditionBarProps = {
  draft: RecommendationCriteria
  /** 행정동을 불러오는 중이면 그 조각을 잠근다. */
  isAdministrationsLoading?: boolean
  onOpenStep: (step: RecommendConditionStep) => void
}

const Bar = styled.ol`
  display: flex;
  /* 조각들이 같은 높이로 늘어나야 한 줄로 읽힌다 — 이름이 길어 두 줄이 되는
     조각이 생겨도 나머지가 따라 커진다. */
  align-items: stretch;
  gap: 4px;
  min-width: 0;
`

const Slot = styled.li`
  /* 세 조각이 폭을 나눠 가진다. min-width: 0 이 없으면 긴 이름이 트랙을 밀어
     조각 폭이 들쭉날쭉해진다. */
  flex: 1 1 0;
  min-width: 0;
  display: inline-flex;
  align-items: stretch;
  gap: 4px;
`

const SlotButton = styled.button<{ $filled: boolean; $next: boolean }>`
  width: 100%;
  min-width: 0;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  /* button 은 border 를 선언하지 않으면 UA 기본 2px outset 이 그대로 나온다.
     전역 리셋은 font·color 만 다룬다(global-styles.ts).
     고르지 않은 칩은 테두리로 「누를 수 있는 칸」임을 말한다. 다음에 눌러야 할 칩은
     primary-700 테두리를 한 겹 더 두른다(보조 신호라 1.4.11 필수 대상이 아니다.
     칩 식별은 grey800 글자가 한다). */
  border: 1px solid
    ${props =>
      props.$filled
        ? 'transparent'
        : props.$next
          ? 'var(--color-primary-700)'
          : 'var(--color-border-300)'};
  box-shadow: ${props =>
    props.$next ? 'inset 0 0 0 1px var(--color-primary-700)' : 'none'};
  border-radius: var(--radius-field);
  /* 조각이 「누를 수 있는 칸」으로 읽혀야 한다. 투명하게 두면 배경과 구분되지
     않아 버튼인지 알 수 없다 — 채움형 필드와 같은 회색 면을 준다. */
  background: ${props =>
    props.$filled ? 'var(--color-primary-100)' : 'var(--color-surface-muted)'};
  color: ${props =>
    props.$filled
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-800)'};
  font-size: 14px;
  font-weight: ${props => (props.$filled ? 700 : 500)};
  line-height: 1.35;
  text-align: center;
  /* 이름을 잘라내지 않는다. 길면 두 줄로 가고 나머지 조각이 같이 커진다. */
  word-break: keep-all;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover:not(:disabled) {
    background: ${props =>
      props.$filled ? 'var(--color-primary-100)' : 'var(--color-border-200)'};
  }

  &:disabled {
    border-color: transparent;
    box-shadow: none;
    background: var(--color-surface-muted);
    color: var(--color-placeholder);
    cursor: not-allowed;
    opacity: 0.6;
  }
`

/** 화면에는 안 보이고 스크린리더만 읽는다 — 잠긴 칩의 사유를 칩에 연결한다. */
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const Divider = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
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
  // RecommendPanel 이 데스크톱·모바일에 동시에 마운트되므로 id 는 인스턴스마다 달라야 한다.
  const reasonId = useId()
  const isDisabled = (step: RecommendConditionStep) =>
    !canOpenRecommendConditionStep(draft, step) ||
    (step === 'administration' && isAdministrationsLoading)
  /**
   * 아직 비어 있고 열 수 있는 첫 칩 — 사용자가 다음에 눌러야 할 자리다. 로딩으로 잠긴 것은
   * 따지지 않는다(`canOpen` 만 본다) — 불러오는 동안에도 강조가 행정동에 머물러 업종으로 튀지 않는다.
   */
  const nextStep =
    RECOMMEND_CONDITION_STEPS.find(
      step =>
        readRecommendConditionName(draft, step) === null &&
        canOpenRecommendConditionStep(draft, step),
    ) ?? null

  return (
    <Bar aria-label="추천 조건">
      {RECOMMEND_CONDITION_STEPS.map((step, index) => {
        const name = readRecommendConditionName(draft, step)
        const disabled = isDisabled(step)
        // 로딩 중 잠김은 사유가 다르다(불러오는 중). 자치구가 비어 잠긴 경우만 연결한다.
        const lockedReason =
          step === 'administration' &&
          !canOpenRecommendConditionStep(draft, step)
            ? RECOMMEND_ADMINISTRATION_LOCKED_REASON
            : null

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
              $next={step === nextStep}
              aria-describedby={lockedReason ? reasonId : undefined}
              aria-label={`${RECOMMEND_CONDITION_LABELS[step]} ${
                name ? `— 현재 ${name}` : '선택'
              }`}
              data-next={step === nextStep ? 'true' : undefined}
              data-step={step}
              disabled={disabled}
              title={
                lockedReason ?? name ?? RECOMMEND_CONDITION_PLACEHOLDERS[step]
              }
              onClick={() => onOpenStep(step)}
            >
              {name ?? RECOMMEND_CONDITION_PLACEHOLDERS[step]}
            </SlotButton>
            {lockedReason ? (
              <VisuallyHidden id={reasonId}>{lockedReason}</VisuallyHidden>
            ) : null}
          </Slot>
        )
      })}
    </Bar>
  )
}
