'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import styled from 'styled-components'

import { useCommunityNotificationUnreadCount } from '@/hooks/use-community-notification-unread-count'
import {
  COMMUNITY_NOTIFICATIONS_PATH,
  formatCommunityNotificationBadge,
  getCommunityNotificationBellLabel,
} from '@/lib/community/notifications'

/* 헤더의 다른 아이콘 버튼(메뉴 토글)과 같은 40px 상자·테두리·hover. */
const BellLink = styled(Link)<{ $active: boolean }>`
  position: relative;
  width: 40px;
  height: 40px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-100);
    background: var(--color-primary-100);
    color: var(--color-primary-700);
  }

  svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
  }
`

/*
  안 읽은 수 배지. 흰 글자를 얹는 빨강은 red700 이다 — red500 은 흰 글자와 AA 미달(DESIGN.md §2 Semantic).
  숫자는 장식이고 수는 링크 이름(aria-label)이 읽어 준다.
*/
const Badge = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid var(--color-surface);
  border-radius: var(--radius-pill);
  background: var(--color-red-700);
  color: var(--color-surface);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
`

type CommunityNotificationBellProps = {
  memberId: string
  pathname: string
  onNavigate?: () => void
}

/**
 * 헤더 알림 진입점(#535, community.md §S4 「알림」). **로그인한 회원에게만 그린다** — 비로그인·로그인 확인
 * 전에는 헤더가 이 컴포넌트를 마운트하지 않는다. 그래서 확인 전에 눌러 로그인으로 쫓겨나는 일이 없다
 * (CM-003 과 같은 기준).
 */
export default function CommunityNotificationBell({
  memberId,
  pathname,
  onNavigate,
}: CommunityNotificationBellProps) {
  const unreadCount = useCommunityNotificationUnreadCount(memberId)
  const badge = formatCommunityNotificationBadge(unreadCount)
  const active =
    pathname === COMMUNITY_NOTIFICATIONS_PATH ||
    pathname.startsWith(`${COMMUNITY_NOTIFICATIONS_PATH}/`)

  return (
    <BellLink
      $active={active}
      aria-current={active ? 'page' : undefined}
      aria-label={getCommunityNotificationBellLabel(unreadCount)}
      data-community-notification-bell="true"
      href={COMMUNITY_NOTIFICATIONS_PATH}
      onClick={onNavigate}
    >
      <Bell aria-hidden="true" />
      {badge ? (
        <Badge aria-hidden="true" data-community-notification-badge="true">
          {badge}
        </Badge>
      ) : null}
    </BellLink>
  )
}
