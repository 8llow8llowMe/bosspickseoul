'use client'

import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import styled from 'styled-components'

import { touchHitArea } from '@/styles/touch-target'

import { countOptions } from '@/lib/option-filter'
import OptionPicker, {
  type OptionGroup,
  type OptionItem,
  type OptionPickerFeatured,
} from '@/components/ui/option-picker'
import {
  POPULAR_SERVICE_CODES,
  POPULAR_SERVICE_LABEL,
} from '@/lib/recommend/popular-services'
import { resolveServiceIcon } from '@/lib/recommend/service-icons'
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
  position: relative;
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
  ${touchHitArea()}

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background: var(--color-surface-muted);
  }
`

/*
 * 시트에서는 손잡이 줄이 이미 「업종 선택 / 중랑구 · 중화1동」을 말한다. 바로 아래에 같은
 * 제목을 한 번 더 그리면 중복이라(#647) 화면에서는 감추고 스크린리더 헤딩·포커스 자리로만
 * 남긴다. 뒤로 가기와 개수는 그대로 보인다. 데스크톱 패널에는 손잡이가 없어 그대로 그린다.
 */
const Heading = styled.h2<{ $isVisuallyHidden: boolean }>`
  flex: 1;
  min-width: 0;
  color: var(--color-text-900);
  font-size: 17px;
  font-weight: 700;
  outline: none;

  ${props =>
    props.$isVisuallyHidden &&
    `
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      white-space: nowrap;
    `}
`

const Count = styled.span`
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--color-text-caption);
  font-size: 12px;
`

const Body = styled.div`
  min-height: 0;
  overflow-y: auto;
`

/* 인기 섹션에만 아이콘을 붙인다. 전체 목록 30개에 다 붙이면 음식점 10개가 같은
   대분류 아이콘으로 반복돼 구분에 기여하지 않고 잡음만 된다(ux-followups A-3-2). */
const POPULAR_SERVICES: OptionPickerFeatured = {
  label: POPULAR_SERVICE_LABEL,
  codes: POPULAR_SERVICE_CODES,
  iconFor: item => {
    const Icon = resolveServiceIcon(item.code)

    return <Icon />
  },
}

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
        <Heading
          ref={headingRef}
          $isVisuallyHidden={variant === 'sheet'}
          tabIndex={-1}
        >
          {label} 선택
        </Heading>
        <Count>{totalCount}개</Count>
      </Header>
      <Body>
        <OptionPicker
          groups={groups}
          items={groups ? undefined : items}
          // 업종은 30개를 6그룹으로 훑어야 해서 좌측정렬 2열 격자로 두고(이름이
          // 길어 칩 격자는 접힌다), 지역은 이름이 짧아 칩 격자가 낫다.
          layout={step === 'service' ? 'grid-wide' : 'grid'}
          featured={step === 'service' ? POPULAR_SERVICES : undefined}
          emptyFallback={step === 'service' ? POPULAR_SERVICES : undefined}
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
