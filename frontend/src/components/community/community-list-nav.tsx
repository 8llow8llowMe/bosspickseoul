'use client'

import Link from 'next/link'
import { Heart, MapPin } from 'lucide-react'
import styled from 'styled-components'
import { COMMUNITY_LIST_SIDE_STICKY_TOP } from '@/components/community/community-list-rail'

/*
  목록 좌 내비(community.md §S4 「목록 3단」, CM-037·040). `≥1360` 에서만 렌더하고, 그때 피드 위
  탭 줄은 숨긴다 — 같은 조작이 두 곳에 있으면 어느 쪽이 지금 상태인지 헷갈린다.

  항목은 모두 목록 주소 링크다(URL 계약 그대로 — 주소는 목록 페이지가 같은 액션 함수로 만든다).
  지금 상태는 `aria-current="page"` 하나로 말한다. 탭 줄의 aria-pressed 와 섞지 않는다 — 링크는
  「누르는 토글」이 아니라 「가는 곳」이다.
*/

export type CommunityListNavItem = {
  key: string
  label: string
  href: string
  current: boolean
}

export type CommunityListNavProps = {
  views: CommunityListNavItem[]
  liked: CommunityListNavItem
  /** 비면 「최근 본 지역」 묶음을 그리지 않는다. */
  recentRegions: CommunityListNavItem[]
}

const Nav = styled.nav`
  position: sticky;
  top: ${COMMUNITY_LIST_SIDE_STICKY_TOP}px;
  min-width: 0;
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

const Group = styled.section`
  display: grid;
  gap: 4px;

  & + & {
    padding-top: 8px;
    border-top: 1px solid var(--color-border-200);
  }
`

const GroupTitle = styled.h2`
  padding: 4px 12px;
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
`

const List = styled.ul`
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const NavLink = styled(Link)`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: var(--radius-control);
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 600;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-background-muted);
  }

  &[aria-current='page'] {
    background: var(--color-primary-100);
    color: var(--color-text-primary-on-light);
    font-weight: 700;
  }

  svg {
    flex: 0 0 auto;
  }
`

const NavLabel = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const NavItemLink = ({
  item,
  icon,
}: {
  item: CommunityListNavItem
  icon?: React.ReactNode
}) => (
  <NavLink
    aria-current={item.current ? 'page' : undefined}
    href={item.href}
    replace
    scroll={false}
  >
    {icon}
    {icon ? <NavLabel>{item.label}</NavLabel> : item.label}
  </NavLink>
)

export default function CommunityListNav({
  views,
  liked,
  recentRegions,
}: CommunityListNavProps) {
  return (
    <Nav aria-label="커뮤니티 메뉴" data-community-list-nav="true">
      <Group aria-labelledby="community-list-nav-view">
        <GroupTitle id="community-list-nav-view">보기</GroupTitle>
        <List>
          {views.map(item => (
            <li key={item.key}>
              <NavItemLink item={item} />
            </li>
          ))}
        </List>
      </Group>

      <Group aria-labelledby="community-list-nav-activity">
        <GroupTitle id="community-list-nav-activity">내 활동</GroupTitle>
        <List>
          <li>
            <NavItemLink
              icon={
                <Heart
                  aria-hidden="true"
                  fill={liked.current ? 'currentColor' : 'none'}
                  size={16}
                />
              }
              item={liked}
            />
          </li>
        </List>
      </Group>

      {recentRegions.length > 0 ? (
        <Group aria-labelledby="community-list-nav-recent">
          <GroupTitle id="community-list-nav-recent">최근 본 지역</GroupTitle>
          <List>
            {recentRegions.map(item => (
              <li key={item.key}>
                <NavItemLink
                  icon={<MapPin aria-hidden="true" size={16} />}
                  item={item}
                />
              </li>
            ))}
          </List>
        </Group>
      ) : null}
    </Nav>
  )
}
