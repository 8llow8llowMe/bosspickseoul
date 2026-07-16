'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styled from 'styled-components'

const TabList = styled.nav`
  display: flex;
  gap: 4px;
  overflow-x: auto;
  border-bottom: 1px solid var(--color-border-200);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`

const TabLink = styled(Link)<{ $active: boolean }>`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 12px;
  border-bottom: 2px solid
    ${props => (props.$active ? 'var(--color-primary-700)' : 'transparent')};
  background: transparent;
  color: ${props =>
    props.$active ? 'var(--color-text-900)' : 'var(--color-text-caption)'};
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    color: var(--color-primary-700);
  }
`

type ProfileTab = {
  label: string
  href: string
}

type ProfileTabsProps = {
  tabs: readonly ProfileTab[]
}

export default function ProfileTabs({ tabs }: ProfileTabsProps) {
  const pathname = usePathname()

  return (
    <TabList aria-label="profile tabs">
      {tabs.map(tab => (
        <TabLink key={tab.href} href={tab.href} $active={pathname === tab.href}>
          {tab.label}
        </TabLink>
      ))}
    </TabList>
  )
}
