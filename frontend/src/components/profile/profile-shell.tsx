'use client'

import Link from 'next/link'
import { useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Bookmark, Settings } from 'lucide-react'
import styled from 'styled-components'
import ProfileLegalLinks from '@/components/profile/profile-legal-links'
import { getMemberInfoData } from '@/lib/api/profile'
import {
  applyResolvedMemberInfoResponse,
  getMemberInfoQueryKey,
  isMemberInfoQueryEnabled,
  resolveMemberInfoResponse,
} from '@/lib/member-info-query'
import { buildLoginHref, currentBrowserPath } from '@/lib/auth/return-path'
import { useAuthStore } from '@/stores/auth-store'
import { shellWidth } from '@/styles/layout'

const Container = styled.main`
  ${shellWidth}
  padding: 40px 0 72px;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 640px) {
    padding: 28px 0 56px;
  }
`

/*
  1024px 이하(#575). 데스크톱 사이드바의 카드 세 장(아바타·메뉴·약관)이 본문 위로 그대로 쌓여 입력칸이 약 750px
  아래에서 시작했다. 좁은 화면에서는 머리를 「48px 아바타 + 닉네임」 한 줄로 접고, 메뉴는 가로 탭으로, 약관 카드는
  숨긴다(같은 링크가 사이트 푸터에 있다).
*/
const COMPACT = '@media (max-width: 1024px)'

const Sidebar = styled.aside`
  position: sticky;
  top: 96px;
  align-self: start;
  display: grid;
  gap: 16px;

  ${COMPACT} {
    position: static;
    gap: 12px;
  }
`

const SidebarCard = styled.section`
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
`

const IdentityCard = styled(SidebarCard)`
  ${COMPACT} {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr);
    align-items: center;
    column-gap: 12px;
    padding: 12px 16px;
  }
`

const MenuCard = styled(SidebarCard)`
  ${COMPACT} {
    padding: 0;
    border: none;
    background: transparent;
    box-shadow: none;
  }
`

const LegalCard = styled(SidebarCard)`
  ${COMPACT} {
    display: none;
  }
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

  ${COMPACT} {
    width: 48px;
    height: 48px;
    font-size: 18px;
  }
`

const Name = styled.h2`
  margin-top: 18px;
  color: var(--color-text-900);
  font-size: 22px;
  line-height: 30px;
  letter-spacing: 0;

  ${COMPACT} {
    margin-top: 0;
    overflow: hidden;
    font-size: 17px;
    line-height: 24px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const Email = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  word-break: break-all;

  ${COMPACT} {
    display: none;
  }
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

  ${COMPACT} {
    display: none;
  }
`

const NavList = styled.nav`
  display: grid;
  gap: 8px;

  ${COMPACT} {
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
    gap: 2px;
    padding: 3px;
    border-radius: var(--radius-control);
    background: var(--color-surface-muted);
  }
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
    props.$active
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-700)'};
  font-weight: 600;

  &:hover {
    background: var(--color-primary-100);
    color: var(--color-text-primary-on-light);
  }

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }

  /* 가로 탭 — 두 칸이 같은 폭으로 줄을 채우고 선택 칸만 흰 바탕으로 떠오른다(세그먼트). */
  ${COMPACT} {
    justify-content: center;
    min-height: 44px;
    padding: 0 12px;
    border-radius: calc(var(--radius-control) - 2px);
    background: ${props =>
      props.$active ? 'var(--color-surface)' : 'transparent'};
    box-shadow: ${props => (props.$active ? 'var(--shadow-level-1)' : 'none')};
    color: ${props =>
      props.$active ? 'var(--color-text-900)' : 'var(--color-text-700)'};
    white-space: nowrap;

    &:hover {
      background: ${props =>
        props.$active ? 'var(--color-surface)' : 'transparent'};
      color: var(--color-text-900);
    }
  }
`

const Content = styled.section`
  min-width: 0;
`

const LoadingState = styled.div`
  ${shellWidth}
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
  const requestedMemberId = memberInfo?.memberId ?? null
  const isMemberQueryEnabled = isMemberInfoQueryEnabled(
    requestedMemberId,
    hasHydrated,
    isLoggedIn,
  )

  const memberQuery = useQuery({
    queryKey: getMemberInfoQueryKey(requestedMemberId ?? ''),
    queryFn: ({ signal }) => getMemberInfoData(signal),
    enabled: isMemberQueryEnabled,
  })
  const resolvedResponse = useMemo(
    () => resolveMemberInfoResponse(memberQuery.data, requestedMemberId),
    [memberQuery.data, requestedMemberId],
  )

  useEffect(() => {
    applyResolvedMemberInfoResponse(resolvedResponse, {
      setSession,
      onError: () => {
        clearSession()
        router.replace(buildLoginHref(currentBrowserPath()))
      },
    })
  }, [clearSession, resolvedResponse, router, setSession])

  const resolvedMemberInfo =
    resolvedResponse.status === 'success'
      ? resolvedResponse.memberInfo
      : memberInfo

  const profileError =
    resolvedResponse.status === 'error'
      ? resolvedResponse.message
      : memberQuery.error instanceof Error
        ? memberQuery.error.message
        : null

  if (profileError) {
    return (
      <LoadingState aria-live="assertive" role="alert">
        {profileError}
      </LoadingState>
    )
  }

  if (!resolvedMemberInfo) {
    return <LoadingState>프로필 정보를 불러오는 중입니다.</LoadingState>
  }

  const avatarLabel = resolvedMemberInfo.nickname?.slice(0, 1) ?? 'N'

  return (
    <Container>
      <Sidebar>
        <IdentityCard>
          <Avatar $image={resolvedMemberInfo.profileImageUrl}>
            {resolvedMemberInfo.profileImageUrl ? null : avatarLabel}
          </Avatar>
          <Name>{resolvedMemberInfo.nickname}</Name>
          <Email>{resolvedMemberInfo.email}</Email>
          {resolvedMemberInfo.role?.description ? (
            <RolePill>{resolvedMemberInfo.role.description}</RolePill>
          ) : null}
        </IdentityCard>
        <MenuCard>
          <NavList aria-label="프로필 메뉴">
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
        </MenuCard>
        <LegalCard>
          <ProfileLegalLinks />
        </LegalCard>
      </Sidebar>
      <Content>{children}</Content>
    </Container>
  )
}
