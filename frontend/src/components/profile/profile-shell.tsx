'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import { getMemberInfoData } from '@/lib/api/profile'
import { isApiSuccess } from '@/lib/api/response'
import { useAuthStore } from '@/stores/auth-store'

const Container = styled.main`
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: 40px 0 72px;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
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
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: 24px;
  background: white;
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);
`

const Avatar = styled.div<{ $image?: string | null }>`
  width: 84px;
  height: 84px;
  display: grid;
  place-items: center;
  border-radius: 28px;
  background: ${props =>
    props.$image
      ? `url(${props.$image}) center / cover no-repeat`
      : 'linear-gradient(135deg, #1549b5, #336dd3)'};
  color: white;
  font-size: 28px;
  font-weight: 700;
`

const Name = styled.h2`
  margin-top: 18px;
  color: var(--color-text-900);
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: -0.03em;
`

const Email = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  word-break: break-all;
`

const ProviderPill = styled.span`
  display: inline-flex;
  margin-top: 14px;
  padding: 0 12px;
  min-height: 34px;
  align-items: center;
  border-radius: 999px;
  background: rgba(21, 73, 181, 0.08);
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
`

const NavList = styled.nav`
  display: grid;
  gap: 8px;
`

const NavLink = styled(Link)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 16px;
  border-radius: 16px;
  background: ${props =>
    props.$active ? 'rgba(21, 73, 181, 0.08)' : 'transparent'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-weight: 700;
`

const Content = styled.section`
  min-width: 0;
`

const LoadingState = styled.div`
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: 80px 0;
  color: var(--color-text-500);
`

type ProfileShellProps = {
  children: React.ReactNode
}

const navigationItems = [
  { href: '/profile/bookmarks/analysis', label: '북마크' },
  { href: '/profile/settings/edit', label: '개인 정보 설정' },
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
  const updateMemberInfo = useAuthStore(state => state.updateMemberInfo)
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
      updateMemberInfo(memberQuery.data.dataBody)
      return
    }

    clearSession()
    router.replace('/login')
  }, [clearSession, memberQuery.data, router, updateMemberInfo])

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
          <Avatar $image={resolvedMemberInfo.profileImage}>
            {resolvedMemberInfo.profileImage ? null : avatarLabel}
          </Avatar>
          <Name>{resolvedMemberInfo.nickname}</Name>
          <Email>{resolvedMemberInfo.email}</Email>
          {resolvedMemberInfo.provider ? (
            <ProviderPill>{resolvedMemberInfo.provider}</ProviderPill>
          ) : null}
        </SidebarCard>
        <SidebarCard>
          <NavList aria-label="profile navigation">
            {navigationItems.map(item => (
              <NavLink
                key={item.href}
                href={item.href}
                $active={isNavigationActive(pathname, item.href)}
              >
                {item.label}
              </NavLink>
            ))}
          </NavList>
        </SidebarCard>
      </Sidebar>
      <Content>{children}</Content>
    </Container>
  )
}
