'use client'

import { useRef, type KeyboardEvent } from 'react'
import styled from 'styled-components'
import type { StatusMetric } from '@/types/status'

type StatusMetricTabsProps = {
  value: StatusMetric
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
  gap: 8px;
`

const TabButton = styled.button<{ $selected: boolean }>`
  min-width: 72px;
  min-height: 44px;
  padding: 0 16px;
  border: ${props => (props.$selected ? '2px' : '1px')} solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$selected ? 'var(--color-text-900)' : 'var(--color-text-700)'};
  font-size: 14px;
  font-weight: ${props => (props.$selected ? 800 : 700)};
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-text-900);
  }
`

export default function StatusMetricTabs({
  value,
  onChange,
}: StatusMetricTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % METRIC_TABS.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
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
            aria-controls="status-metric-content"
            aria-selected={isSelected}
            id={`status-metric-tab-${tab.value}`}
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
