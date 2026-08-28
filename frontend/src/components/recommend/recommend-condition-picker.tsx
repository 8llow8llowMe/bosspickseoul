'use client'

import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import styled from 'styled-components'

import { countOptions } from '@/lib/option-filter'
import OptionPicker, {
  type OptionGroup,
  type OptionItem,
} from '@/components/ui/option-picker'
import type { RecommendConditionStep } from '@/lib/recommend/recommend-state'

import {
  RECOMMEND_CONDITION_LABELS,
  RECOMMEND_CONDITION_PLACEHOLDERS,
} from './recommend-condition-bar'

export type RecommendConditionPickerProps = {
  step: RecommendConditionStep
  /** 평면 목록(자치구·행정동). `groups` 와 배타적이다. */
  items?: readonly OptionItem[]
  /** 그룹 목록(업종 6카테고리). */
  groups?: readonly OptionGroup[]
  selectedCode: string | null
  variant?: 'desktop' | 'sheet'
  /** 지도 하이라이트를 목록 호버와 맞춘다. 업종 단계에는 넘기지 않는다. */
  onPreviewChange?: (code: string | null) => void
  onSelect: (code: string) => void
  onClose: () => void
}

const Root = styled.section`
  min-height: 0;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 12px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const BackButton = styled.button`
  width: 32px;
  height: 32px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-700);
  cursor: pointer;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background: var(--color-surface-muted);
  }
`

const Heading = styled.h2`
  flex: 1;
  min-width: 0;
  color: var(--color-text-900);
  font-size: 17px;
  font-weight: 700;
  outline: none;
`

const Count = styled.span`
  flex: 0 0 auto;
  color: var(--color-text-caption);
  font-size: 12px;
`

const Body = styled.div`
  min-height: 0;
  overflow-y: auto;
`

export default function RecommendConditionPicker({
  step,
  items,
  groups,
  selectedCode,
  variant = 'desktop',
  onPreviewChange,
  onSelect,
  onClose,
}: RecommendConditionPickerProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const label = RECOMMEND_CONDITION_LABELS[step]
  const totalCount = countOptions(items, groups)

  // 뷰가 바뀌면 화면 읽기 순서가 헤딩부터 다시 시작해야 한다. 조각을 눌러
  // 들어온 사용자의 포커스가 사라진 버튼에 남아 있으면 탭 순서가 문서 처음으로
  // 튄다.
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <Root aria-label={`${label} 선택`}>
      <Header>
        <BackButton
          type="button"
          aria-label="조건으로 돌아가기"
          onClick={onClose}
        >
          <ArrowLeft />
        </BackButton>
        <Heading ref={headingRef} tabIndex={-1}>
          {label} 선택
        </Heading>
        <Count>{totalCount}개</Count>
      </Header>
      <Body>
        <OptionPicker
          groups={groups}
          items={groups ? undefined : items}
          // 업종은 백엔드가 카테고리를 설명으로 실어 주지 않는 정적 카탈로그라
          // 목록 레이아웃으로 두고, 지역은 이름이 짧아 칩 격자가 낫다.
          layout={step === 'service' ? 'list' : 'grid'}
          selectedCode={selectedCode}
          searchPlaceholder={RECOMMEND_CONDITION_PLACEHOLDERS[step].replace(
            '선택',
            '검색',
          )}
          variant={variant === 'sheet' ? 'sheet' : 'panel'}
          onPreviewChange={onPreviewChange}
          onSelect={onSelect}
        />
      </Body>
    </Root>
  )
}
