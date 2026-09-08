'use client'

import { Search } from 'lucide-react'
import { useId } from 'react'
import styled from 'styled-components'

import { TextField } from '@/components/ui/text-field'

export type SimulationChoiceSearchProps = {
  /** 접근 이름 겸 placeholder. 예: "자치구 이름으로 찾기" */
  label: string
  value: string
  /** 필터링 후 남은 개수. total 과 같으면 적지 않는다. */
  shown: number
  total: number
  onChange: (value: string) => void
}

const Count = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`

/**
 * 선택지가 많은 단계(자치구 25 · 업종 30)의 검색 한 줄.
 *
 * 단계를 나눠도 그 단계 하나는 여전히 칩 25~30개다. 검색이 없으면 단계만 얇아지고
 * 고르는 일은 그대로다 (D4-1-1).
 *
 * 겉모습은 `TextField emphasized` 에 맡긴다. 프랜차이즈 3단계에서 이 검색창과
 * 브랜드 검색이 나란히 놓이는데, 자체 styled 로 두면 같은 역할의 컨트롤 둘이 배경·
 * 테두리·아이콘 크기가 다르게 보인다(#251).
 */
export default function SimulationChoiceSearch({
  label,
  value,
  shown,
  total,
  onChange,
}: SimulationChoiceSearchProps) {
  const countId = useId()
  const narrowed = shown !== total

  return (
    <TextField
      fullWidth
      /* 흰 카드 위에 칩 격자와 나란히 놓이는 자리다 — TextField 가 emphasized 를
         켜라고 지목한 조건 그대로다. */
      emphasized
      type="search"
      aria-label={label}
      placeholder={label}
      value={value}
      /* rightSlot 은 아이콘 자리라 aria-hidden 이다. 개수는 장식이 아니라 정보이므로
         describedby 로 되살린다 — 직접 참조된 노드는 숨겨져 있어도 이름·설명 계산에
         들어간다. */
      aria-describedby={narrowed ? countId : undefined}
      leftSlot={<Search aria-hidden="true" />}
      rightSlot={
        narrowed ? <Count id={countId}>{`${shown}/${total}`}</Count> : undefined
      }
      onChange={event => onChange(event.target.value)}
    />
  )
}
