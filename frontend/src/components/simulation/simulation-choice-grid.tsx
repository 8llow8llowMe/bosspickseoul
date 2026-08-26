'use client'

import { Check } from 'lucide-react'
import styled from 'styled-components'

export type SimulationChoice = {
  code: string
  name: string
  /** 칩 아래 보조 문구 (예: "36㎡ · 11평"). 없으면 이름만 보여준다. */
  hint?: string | null
}

export type SimulationChoiceGridProps = {
  label: string
  choices: readonly SimulationChoice[]
  selectedCode: string | null
  onSelect: (code: string) => void
  /** 칩 최소 너비. 자치구·업종은 좁게(96px), 프랜차이즈 여부처럼 적은 선택지는 넓게 준다. */
  minColumnWidth?: number
}

const Grid = styled.ul<{ $minColumnWidth: number }>`
  display: grid;
  grid-template-columns: ${props =>
    `repeat(auto-fill, minmax(${props.$minColumnWidth}px, 1fr))`};
  gap: 8px;
`

const Chip = styled.button<{ $selected: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
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

const Hint = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
`

const Mark = styled.span`
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

/**
 * 선택지 칩 격자.
 *
 * 상권분석 선택 패널(`analysis-selection-panel.tsx`)의 compact 칩 격자와 같은 관용구다.
 * 그 컴포넌트는 분석 단계 모델(`AnalysisStep`)에 묶여 있어 그대로 쓸 수 없어 시각·상호작용
 * 규칙만 옮겼다 — 선택 시 primary 테두리·배경, 우상단 체크, 최소 44px 터치 영역.
 */
export default function SimulationChoiceGrid({
  label,
  choices,
  selectedCode,
  onSelect,
  minColumnWidth = 96,
}: SimulationChoiceGridProps) {
  return (
    <Grid aria-label={label} $minColumnWidth={minColumnWidth}>
      {choices.map(choice => {
        const selected = choice.code === selectedCode
        return (
          <li key={choice.code}>
            <Chip
              type="button"
              $selected={selected}
              aria-pressed={selected}
              title={choice.name}
              onClick={() => onSelect(choice.code)}
            >
              {choice.name}
              {choice.hint ? <Hint>{choice.hint}</Hint> : null}
              {selected ? (
                <Mark aria-hidden="true">
                  <Check />
                </Mark>
              ) : null}
            </Chip>
          </li>
        )
      })}
    </Grid>
  )
}
