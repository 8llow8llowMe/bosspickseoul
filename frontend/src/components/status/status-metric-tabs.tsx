'use client'

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
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-700);
    color: var(--color-primary-700);
  }
`

export default function StatusMetricTabs({
  value,
  onChange,
}: StatusMetricTabsProps) {
  return (
    <TabList aria-label="상권 지표 선택" role="tablist">
      {METRIC_TABS.map(tab => {
        const isSelected = value === tab.value

        return (
          <TabButton
            key={tab.value}
            $selected={isSelected}
            aria-selected={isSelected}
            role="tab"
            type="button"
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
          </TabButton>
        )
      })}
    </TabList>
  )
}
