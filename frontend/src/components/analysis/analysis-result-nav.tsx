'use client'

import {
  Activity,
  BarChart3,
  Footprints,
  LayoutDashboard,
  Store,
  Users,
  Wallet,
} from 'lucide-react'
import styled from 'styled-components'

import type { AnalysisResultTab } from '@/lib/analysis/selection'

const ICON_BY_TAB: Record<AnalysisResultTab, typeof Activity> = {
  summary: LayoutDashboard,
  'foot-traffic': Footprints,
  sales: Wallet,
  stores: Store,
  living: Users,
  trend: Activity,
  benchmark: BarChart3,
}

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Item = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: var(--radius-control);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'transparent'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  padding: 10px 12px;
  font-size: 14px;
  font-weight: ${props => (props.$active ? 700 : 600)};
  text-align: left;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &::before {
    position: absolute;
    top: 8px;
    bottom: 8px;
    left: 0;
    width: 3px;
    border-radius: 2px;
    background: ${props =>
      props.$active ? 'var(--color-primary-600)' : 'transparent'};
    content: '';
  }

  &:hover {
    background: var(--color-surface-muted);
    color: var(--color-primary-700);
  }

  svg {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
  }
`

export type AnalysisResultNavProps = {
  tabs: readonly { value: AnalysisResultTab; label: string }[]
  activeTab: AnalysisResultTab
  onSelect: (tab: AnalysisResultTab) => void
}

export default function AnalysisResultNav({
  tabs,
  activeTab,
  onSelect,
}: AnalysisResultNavProps) {
  return (
    <Nav aria-label="분석 결과 항목">
      {tabs.map(tab => {
        const Icon = ICON_BY_TAB[tab.value]
        const active = tab.value === activeTab
        return (
          <Item
            key={tab.value}
            type="button"
            $active={active}
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(tab.value)}
          >
            <Icon aria-hidden />
            {tab.label}
          </Item>
        )
      })}
    </Nav>
  )
}
