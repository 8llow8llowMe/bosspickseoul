'use client'

import { Search } from 'lucide-react'
import styled from 'styled-components'

export type SimulationChoiceSearchProps = {
  /** 접근 이름 겸 placeholder. 예: "자치구 이름으로 찾기" */
  label: string
  value: string
  /** 필터링 후 남은 개수. total 과 같으면 적지 않는다. */
  shown: number
  total: number
  onChange: (value: string) => void
}

const Root = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: var(--color-background-muted);

  &:focus-within {
    border-color: var(--color-primary-600);
    background: var(--color-surface);
  }

  svg {
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
    color: var(--color-grey-400);
  }
`

const Field = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-900);
  font: inherit;
  font-size: 14px;

  &:focus {
    outline: none;
  }
`

const Count = styled.span`
  flex: 0 0 auto;
  color: var(--color-text-caption);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`

/**
 * 선택지가 많은 단계(자치구 25 · 업종 30)의 검색 한 줄.
 *
 * 단계를 나눠도 그 단계 하나는 여전히 칩 25~30개다. 검색이 없으면 단계만 얇아지고
 * 고르는 일은 그대로다 (D4-1-1).
 */
export default function SimulationChoiceSearch({
  label,
  value,
  shown,
  total,
  onChange,
}: SimulationChoiceSearchProps) {
  return (
    <Root>
      <Search aria-hidden="true" />
      <Field
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
      {shown === total ? null : <Count>{`${shown}/${total}`}</Count>}
    </Root>
  )
}
