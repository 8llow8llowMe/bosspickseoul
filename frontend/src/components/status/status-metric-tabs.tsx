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

const TabList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

// 지표 선택은 콘텐츠(지도/리스트)에 폭을 양보하도록 컴팩트한 칩으로 둔다.
const TabButton = styled.button<{ $selected: boolean }>`
  min-height: 36px;
  padding: 0 13px;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-card);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-size: 13px;
  font-weight: ${props => (props.$selected ? 700 : 600)};
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-primary-700);
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
