'use client'

import { useId, useRef, type KeyboardEvent } from 'react'
import styled from 'styled-components'
import type { StatusMetric } from '@/types/status'

type StatusMetricTabsProps = {
  value: StatusMetric
  idBase?: string
  panelId?: string
  onChange: (metric: StatusMetric) => void
}

const METRIC_TABS: ReadonlyArray<{
  label: string
  value: StatusMetric
}> = [
  { value: 'footTraffic', label: '유동인구' },
  { value: 'sales', label: '매출' },
  { value: 'opened', label: '개업' },
  { value: 'closed', label: '폐업' },
]

/*
 * 세그먼트 컨트롤(DESIGN.md 「Segmented control for section switching」). 예전엔 페이지 폭
 * 카드 왼쪽에 칩 4개가 몰려 있었고 선택은 옅은 테두리뿐이었다. 네 칸이 같은 폭으로 줄을
 * 채우고, 선택 칸이 흰 바탕으로 떠올라 지금 무엇을 보는지가 먼저 보인다.
 */
const TabList = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
`

const TabButton = styled.button<{ $selected: boolean }>`
  min-width: 0;
  min-height: 36px;
  padding: 0 8px;
  border: 0;
  border-radius: calc(var(--radius-control) - 2px);
  background: ${props =>
    props.$selected ? 'var(--color-surface)' : 'transparent'};
  box-shadow: ${props => (props.$selected ? 'var(--shadow-level-1)' : 'none')};
  color: ${props =>
    props.$selected ? 'var(--color-text-900)' : 'var(--color-text-700)'};
  font-size: 14px;
  font-weight: ${props => (props.$selected ? 700 : 600)};
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    color: var(--color-text-900);
  }

  &:focus-visible {
    outline: 2px solid var(--color-blue-500);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export default function StatusMetricTabs({
  value,
  idBase,
  panelId,
  onChange,
}: StatusMetricTabsProps) {
  const generatedId = useId()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const resolvedIdBase = idBase ?? `status-metric-${generatedId}`
  const resolvedPanelId = panelId ?? `${resolvedIdBase}-panel`

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % METRIC_TABS.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + METRIC_TABS.length) % METRIC_TABS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = METRIC_TABS.length - 1
    }

    if (nextIndex === null) {
      return
    }

    event.preventDefault()
    onChange(METRIC_TABS[nextIndex].value)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <TabList
      aria-label="상권 지표 선택"
      aria-orientation="horizontal"
      role="tablist"
    >
      {METRIC_TABS.map((tab, index) => {
        const isSelected = value === tab.value

        return (
          <TabButton
            key={tab.value}
            ref={element => {
              tabRefs.current[index] = element
            }}
            $selected={isSelected}
            aria-controls={resolvedPanelId}
            aria-selected={isSelected}
            id={`${resolvedIdBase}-${tab.value}`}
            role="tab"
            tabIndex={isSelected ? 0 : -1}
            type="button"
            onClick={() => onChange(tab.value)}
            onKeyDown={event => handleKeyDown(event, index)}
          >
            {tab.label}
          </TabButton>
        )
      })}
    </TabList>
  )
}
