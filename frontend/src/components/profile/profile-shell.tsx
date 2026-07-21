'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Bookmark, Settings } from 'lucide-react'
import styled from 'styled-components'
import { getMemberInfoData } from '@/lib/api/profile'
import { isApiSuccess } from '@/lib/api/response'
import { useAuthStore } from '@/stores/auth-store'

const Container = styled.main`
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 40px 0 72px;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 640px) {
    width: min(100% - 32px, 1120px);
    padding: 28px 0 56px;
  }
`

const Sidebar = styled.aside`
  position: sticky;
  top: 96px;
  align-self: start;
  display: grid;
  gap: 16px;

  @media (max-width: 1024px) {
    position: static;
  }
`

const SidebarCard = styled.section`
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
`

const Avatar = styled.div<{ $image?: string | null }>`
  width: 84px;
  height: 84px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: ${props =>
    props.$image
      ? `url(${props.$image}) center / cover no-repeat`
      : 'var(--color-surface-muted)'};
  color: var(--color-text-700);
  font-size: 28px;
  font-weight: 700;
`

const Name = styled.h2`
  margin-top: 18px;
  color: var(--color-text-900);
  font-size: 22px;
  line-height: 30px;
  letter-spacing: 0;
`

const Email = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  word-break: break-all;
`

const RolePill = styled.span`
  display: inline-flex;
  margin-top: 14px;
  padding: 0 12px;
  min-height: 34px;
  align-items: center;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
`

const NavList = styled.nav`
  display: grid;
  gap: 8px;
`

const NavLink = styled(Link)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 16px;
  border-radius: var(--radius-control);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'transparent'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-weight: 600;

  &:hover {
    background: var(--color-primary-100);
    color: var(--color-primary-700);
  }

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

const Content = styled.section`
  min-width: 0;
`

const LoadingState = styled.div`
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 80px 0;
  color: var(--color-text-500);
`

type ProfileShellProps = {
  children: React.ReactNode
}

const navigationItems = [
  { href: '/profile/bookmarks/analysis', label: '북마크', icon: Bookmark },
  { href: '/profile/settings/edit', label: '개인 정보 설정', icon: Settings },
] as const

const isNavigationActive = (pathname: string, href: string) => {
  if (href.startsWith('/profile/bookmarks')) {
    return pathname.startsWith('/profile/bookmarks')
  }

  if (href.startsWith('/profile/settings')) {
    return pathname.startsWith('/profile/settings')
  }

  return pathname === href
}

export default function ProfileShell({ children }: ProfileShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const memberInfo = useAuthStore(state => state.memberInfo)
  const setSession = useAuthStore(state => state.setSession)
  const clearSession = useAuthStore(state => state.clearSession)

  const memberQuery = useQuery({
    queryKey: ['memberInfo'],
    queryFn: getMemberInfoData,
    enabled: hasHydrated && isLoggedIn,
  })

  useEffect(() => {
    if (!memberQuery.data) {
      return
    }

    if (isApiSuccess(memberQuery.data) && memberQuery.data.dataBody) {
      setSession(memberQuery.data.dataBody)
      return
    }

    clearSession()
    router.replace('/login')
  }, [clearSession, memberQuery.data, router, setSession])

  const resolvedMemberInfo =
    memberQuery.data && isApiSuccess(memberQuery.data)
      ? memberQuery.data.dataBody
      : memberInfo

  if (!resolvedMemberInfo) {
    return <LoadingState>프로필 정보를 불러오는 중입니다.</LoadingState>
  }

  const avatarLabel = resolvedMemberInfo.nickname?.slice(0, 1) ?? 'N'

  return (
    <Container>
      <Sidebar>
        <SidebarCard>
          <Avatar $image={resolvedMemberInfo.profileImageUrl}>
            {resolvedMemberInfo.profileImageUrl ? null : avatarLabel}
          </Avatar>
          <Name>{resolvedMemberInfo.nickname}</Name>
          <Email>{resolvedMemberInfo.email}</Email>
          {resolvedMemberInfo.role?.description ? (
            <RolePill>{resolvedMemberInfo.role.description}</RolePill>
          ) : null}
        </SidebarCard>
        <SidebarCard>
          <NavList aria-label="profile navigation">
            {navigationItems.map(item => {
              const ItemIcon = item.icon

              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  $active={isNavigationActive(pathname, item.href)}
                >
                  <ItemIcon aria-hidden="true" />
                  {item.label}
                </NavLink>
              )
            })}
          </NavList>
        </SidebarCard>
      </Sidebar>
      <Content>{children}</Content>
    </Container>
  )
}
