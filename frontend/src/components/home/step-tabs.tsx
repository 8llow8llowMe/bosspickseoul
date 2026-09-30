'use client'

import { useRef, type KeyboardEvent } from 'react'
import styled from 'styled-components'

import type { StoryStep } from '@/components/home/story-steps'

/** 패널은 하나다 — 네 탭이 모두 같은 패널을 가리키고, 패널이 활성 탭으로 이름을 얻는다. */
export const STORY_PANEL_ID = 'story-panel'

/** 홈에 판단 흐름은 한 번뿐이라는 전제의 고정 id. 재사용이 생기면 useId 로 바꾼다. */
export const storyTabId = (step: string) => `story-tab-${step}`

/**
 * WAI-ARIA Tabs 키보드 판정. 숫자면 그 탭을 선택·포커스하고, null 이면 기본 동작을 둔다.
 *
 * ↑/↓ 는 쓰지 않는다 — 2×2 로 접혀도 탭 순서는 01→04 한 줄이고, ↑/↓ 는 페이지 스크롤로
 * 남겨야 키보드 사용자가 섹션을 벗어날 수 있다.
 */
export function nextTabIndex(
  current: number,
  key: string,
  count: number,
): number | null {
  if (count <= 0) return null
  if (key === 'ArrowRight') return (current + 1) % count
  if (key === 'ArrowLeft') return (current - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

/*
  한 줄 밑줄 탭(story-panel-redesign.md D4-1). 예전 카드형 탭은 높이 약 120px 에 번호·
  아이콘·이름·수치를 실었는데, 이름과 수치가 바로 아래 패널과 겹쳐 새 정보가 없었다.
  수치는 패널 왼쪽의 큰 숫자가 맡는다.

  768 이하는 4열 균등 + 짧은 이름 두 줄이다. 한 줄 가로 스크롤은 쓰지 않는다 — 숨는
  탭이 생겨 네 단계가 한눈에 보이지 않는다.
*/
const List = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--color-border-200);

  @media (max-width: 768px) {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
  }
`

const Tab = styled.button<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  /* 터치 영역(DESIGN.md §8): 리스트 행 52px 이상. */
  min-height: 52px;
  padding: 14px 16px;
  border: none;
  border-radius: var(--radius-control) var(--radius-control) 0 0;
  background: transparent;
  /*
    비활성은 text-700 이다. 탭이 판단 흐름의 회색 밴드(grey50) 위에 바로 놓여, caption
    (grey600)은 4.42:1 로 AA 에 못 미쳤다(e2e 대비 지표). 활성은 굵기·밑줄로 가른다.
  */
  color: ${p =>
    p.$active ? 'var(--color-text-900)' : 'var(--color-text-700)'};
  cursor: pointer;
  transition:
    color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard);

  /* 목록 아래 1px 선 위에 겹쳐 그린다 — 활성 탭만 선이 굵어진 것처럼 보인다. */
  &::after {
    content: '';
    position: absolute;
    right: 12px;
    bottom: -1px;
    left: 12px;
    height: 2px;
    border-radius: 2px;
    background: ${p => (p.$active ? 'var(--color-text-900)' : 'transparent')};
  }

  &:hover {
    color: var(--color-text-900);
    background: var(--color-surface-muted);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 10px 4px 12px;

    &::after {
      right: 8px;
      left: 8px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* 번호에 primary-700(#0ea5e9)을 쓰지 않는다 — 회색 밴드 위 2.65:1 이다. */
const Num = styled.span`
  color: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
`

const Title = styled.span<{ $active: boolean }>`
  font-size: 16px;
  font-weight: ${p => (p.$active ? 700 : 600)};
  line-height: 24px;
  white-space: nowrap;

  @media (max-width: 768px) {
    display: none;
  }
`

const ShortTitle = styled.span<{ $active: boolean }>`
  display: none;
  font-size: 14px;
  font-weight: ${p => (p.$active ? 700 : 600)};
  line-height: 20px;
  white-space: nowrap;

  @media (max-width: 768px) {
    display: inline;
  }
`

type StepTabsProps = {
  steps: readonly StoryStep[]
  selected: number
  onSelect: (index: number) => void
}

export default function StepTabs({ steps, selected, onSelect }: StepTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  /*
    자동 활성화: 포커스를 옮기면 바로 선택된다. 패널 전환이 캐시된 쿼리를 다시 그릴
    뿐이라 수동 활성화(Enter 로 확정)를 둘 이유가 없다.
  */
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    // Alt/Cmd+← 는 브라우저 뒤로가기다 — 수정자 키가 붙으면 가로채지 않는다.
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const next = nextTabIndex(selected, event.key, steps.length)
    if (next === null) return
    event.preventDefault()
    onSelect(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <List role="tablist" aria-label="판단 흐름 네 단계">
      {steps.map((step, index) => {
        const active = index === selected
        return (
          <Tab
            key={step.step}
            ref={element => {
              tabRefs.current[index] = element
            }}
            type="button"
            role="tab"
            id={storyTabId(step.step)}
            aria-label={`${step.step} ${step.title}`}
            aria-selected={active}
            aria-controls={STORY_PANEL_ID}
            tabIndex={active ? 0 : -1}
            $active={active}
            onClick={() => onSelect(index)}
            onKeyDown={handleKeyDown}
          >
            <Num>{step.step}</Num>
            <Title $active={active}>{step.title}</Title>
            <ShortTitle $active={active}>{step.shortTitle}</ShortTitle>
          </Tab>
        )
      })}
    </List>
  )
}
