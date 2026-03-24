'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styled from 'styled-components'

const TabList = styled.nav`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
`

const TabLink = styled(Link)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid
    ${props =>
      props.$active ? 'rgba(21, 73, 181, 0.24)' : 'var(--color-border-200)'};
  background: ${props =>
    props.$active ? 'rgba(21, 73, 181, 0.08)' : 'var(--color-surface)'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-500)'};
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
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
