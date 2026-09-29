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
  4열, 768 이하 2x2. 한 줄 가로 스크롤은 쓰지 않는다 — 숨는 탭이 생겨 네 단계가
  한눈에 보이지 않는다(예전 보드가 하던 일을 탭이 이어받는다).
*/
const List = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
`

const Tab = styled.button<{ $active: boolean }>`
  display: grid;
  align-content: start;
  gap: 6px;
  /* 터치 영역(DESIGN.md §8): 리스트 행 52px 이상. */
  min-height: 52px;
  padding: 16px;
  border: 1px solid
    ${p => (p.$active ? 'var(--color-primary-600)' : 'var(--color-border-200)')};
  border-radius: var(--radius-card);
  background: ${p =>
    p.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: ${p =>
      p.$active ? 'var(--color-primary-600)' : 'var(--color-border-300)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }

  @media (max-width: 768px) {
    padding: 12px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Head = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
`

const IconBadge = styled.span<{ $active: boolean }>`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-control);
  background: ${p =>
    p.$active ? 'var(--color-surface)' : 'var(--color-primary-100)'};
  color: var(--color-primary-700);

  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }
`

const Num = styled.span<{ $active: boolean }>`
  color: ${p =>
    p.$active ? 'var(--color-primary-700)' : 'var(--color-text-caption)'};
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
`

const Title = styled.span`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  word-break: keep-all;

  @media (max-width: 768px) {
    font-size: 14px;
    line-height: 20px;
  }
`

const Figure = styled.span`
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
  word-break: keep-all;
`

type StepTabsProps = {
  steps: readonly StoryStep[]
  selected: number
  /** 탭마다 싣는 수치. `steps` 와 같은 순서·길이. */
  figures: readonly string[]
  onSelect: (index: number) => void
}

export default function StepTabs({
  steps,
  selected,
  figures,
  onSelect,
}: StepTabsProps) {
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
        const Icon = step.icon
        return (
          <Tab
            key={step.step}
            ref={element => {
              tabRefs.current[index] = element
            }}
            type="button"
            role="tab"
            id={storyTabId(step.step)}
            aria-selected={active}
            aria-controls={STORY_PANEL_ID}
            tabIndex={active ? 0 : -1}
            $active={active}
            onClick={() => onSelect(index)}
            onKeyDown={handleKeyDown}
          >
            <Head>
              <IconBadge $active={active} aria-hidden="true">
                <Icon />
              </IconBadge>
              <Num $active={active}>{step.step}</Num>
            </Head>
            <Title>{step.title}</Title>
            <Figure>{figures[index]}</Figure>
          </Tab>
        )
      })}
    </List>
  )
}
