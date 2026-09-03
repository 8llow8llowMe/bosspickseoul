'use client'

import styled from 'styled-components'

/*
  홈 랜딩 안에 지표(유동인구/매출/개업)를 고르는 토글이 두 군데(듀얼 랭킹 우측,
  01단계 스토리) 있었는데 각자 다른 스타일로 구현돼 있었다 — 하나는
  `primary-100` 옅은 배경 + 전역 outline, 다른 하나는 `primary-600` 채움 +
  `--shadow-focus-primary`. 같은 의미·같은 동작의 컨트롤이 한 화면에서 두 가지로
  보이는 문제라 여기 하나로 합친다.

  스타일 기준은 `src/components/status/status-metric-tabs.tsx`(/status 페이지의
  동일한 지표 선택 컨트롤) 를 따른다 — 옅은 `primary-100` 채움 + `primary-600`
  테두리는 이미 이 저장소에서 "지표를 고르는 토글"의 정본으로 자리잡은 모양이다.
  border-radius 만 pill 로 둔다 — DESIGN.md 가 pill(9999px)을 "Toggle switches,
  floating chips" 전용으로 못 박아서다. 포커스는 outline 을 죽이고
  `--shadow-focus-primary` 를 쓴다 — 이 저장소 전반(15개 이상의 컴포넌트)이 쓰는
  포커스 관례라 전역 outline 에 기대는 것보다 여기 맞추는 편이 낫다.
*/

const Group = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const ToggleButton = styled.button<{ $active: boolean }>`
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid
    ${props =>
      props.$active ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-pill);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-size: 13px;
  font-weight: ${props => (props.$active ? 700 : 600)};
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-primary-700);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }
`

export type MetricToggleGroupProps<T extends string> = {
  options: readonly T[]
  value: T
  getLabel: (option: T) => string
  onChange: (option: T) => void
  ariaLabel: string
}

export default function MetricToggleGroup<T extends string>({
  options,
  value,
  getLabel,
  onChange,
  ariaLabel,
}: MetricToggleGroupProps<T>) {
  return (
    <Group role="group" aria-label={ariaLabel}>
      {options.map(option => (
        <ToggleButton
          key={option}
          type="button"
          $active={option === value}
          aria-pressed={option === value}
          onClick={() => onChange(option)}
        >
          {getLabel(option)}
        </ToggleButton>
      ))}
    </Group>
  )
}
