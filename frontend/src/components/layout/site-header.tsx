'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import styled from 'styled-components'
import { logoutUser } from '@/lib/api/user'
import { useAuthStore } from '@/stores/auth-store'

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--color-border-200);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
`

const Inner = styled.div`
  width: min(1200px, calc(100% - 48px));
  min-height: 72px;
  padding: 12px 0;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
`

const Brand = styled(Link)`
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
`

const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;

  @media (max-width: 960px) {
    display: none;
  }
`

const NavLink = styled(Link)<{ $active?: boolean }>`
  padding: 8px 12px;
  border-radius: 12px;
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-size: 14px;
  font-weight: 600;
  background: ${props =>
    props.$active ? 'rgba(21, 73, 181, 0.08)' : 'transparent'};
  transition:
    background-color 180ms ease,
    color 180ms ease;

  &:hover {
    background: var(--color-primary-100);
    color: var(--color-primary-700);
  }
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
`

const ActionLink = styled(Link)<{ $primary?: boolean }>`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 1px solid
    ${props =>
      props.$primary ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: 12px;
  background: ${props =>
    props.$primary ? 'var(--color-primary-700)' : 'var(--color-surface)'};
  color: ${props => (props.$primary ? 'white' : 'var(--color-text-700)')};
  font-size: 14px;
  font-weight: 700;
`

const AvatarButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 8px;
  border: 1px solid var(--color-border-200);
  border-radius: 999px;
  background: white;
  cursor: pointer;
`

const Avatar = styled.span<{ $image?: string | null }>`
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: ${props =>
    props.$image
      ? `url(${props.$image}) center / cover no-repeat`
      : 'linear-gradient(135deg, #1549b5, #336dd3)'};
  color: white;
  font-size: 13px;
  font-weight: 700;
`

const AvatarLabel = styled.span`
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 700;

  @media (max-width: 640px) {
    display: none;
  }
`

const DropdownWrap = styled.div`
  position: relative;
`

const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 200px;
  padding: 8px;
  border: 1px solid var(--color-border-200);
  border-radius: 18px;
  background: white;
  box-shadow: 0 18px 40px rgba(21, 73, 181, 0.12);
`

const DropdownItem = styled.button`
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--color-primary-100);
    color: var(--color-primary-700);
  }
`

const MobileToggle = styled.button`
  display: none;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: 12px;
  background: white;
  color: var(--color-text-700);
  font-weight: 700;
  cursor: pointer;

  @media (max-width: 960px) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
`

const MobilePanel = styled.div`
  width: 100%;
  display: none;
  padding-top: 8px;

  @media (max-width: 960px) {
    display: block;
  }
`

const MobileList = styled.div`
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: 20px;
  background: white;
`

const MobileLink = styled(Link)<{ $active?: boolean }>`
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 12px;
  background: ${props =>
    props.$active ? 'rgba(21, 73, 181, 0.08)' : 'transparent'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-weight: 700;
`

const navigationItems = [
  { href: '/status', label: '구별현황' },
  { href: '/analysis', label: '상권분석' },
  { href: '/recommend', label: '상권추천' },
  { href: '/community/list', label: '커뮤니티' },
  { href: '/chatting/list', label: '채팅' },
] as const

const profileMenuItems = [
  { href: '/profile/bookmarks/analysis', label: '북마크' },
  { href: '/profile/settings/edit', label: '개인 정보 설정' },
] as const

const isPathActive = (pathname: string, href: string) => {
  if (href === '/') {
    return pathname === href
  }

  if (href === '/community/list') {
    return pathname.startsWith('/community')
  }

  if (href === '/chatting/list') {
    return pathname.startsWith('/chatting')
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const memberInfo = useAuthStore(state => state.memberInfo)
  const clearSession = useAuthStore(state => state.clearSession)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSettled: () => {
      clearSession()
      setIsDropdownOpen(false)
      setIsMobileOpen(false)
      router.push('/')
    },
  })

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const avatarLabel = memberInfo?.nickname?.slice(0, 1) ?? 'N'

  return (
    <Header>
      <Inner>
        <Brand href="/">NowDoBoss</Brand>
        <Nav aria-label="primary">
          {navigationItems.map(item => (
            <NavLink
              key={item.href}
              href={item.href}
              $active={isPathActive(pathname, item.href)}
              onClick={() => {
                setIsMobileOpen(false)
                setIsDropdownOpen(false)
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </Nav>
        <Actions>
          <MobileToggle
            type="button"
            onClick={() => setIsMobileOpen(current => !current)}
          >
            메뉴
          </MobileToggle>
          {hasHydrated && isLoggedIn && memberInfo ? (
            <DropdownWrap ref={dropdownRef}>
              <AvatarButton
                type="button"
                onClick={() => setIsDropdownOpen(current => !current)}
              >
                <Avatar $image={memberInfo.profileImage}>
                  {memberInfo.profileImage ? null : avatarLabel}
                </Avatar>
                <AvatarLabel>{memberInfo.nickname}</AvatarLabel>
              </AvatarButton>
              {isDropdownOpen ? (
                <DropdownMenu>
                  {profileMenuItems.map(item => (
                    <DropdownItem
                      key={item.href}
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false)
                        router.push(item.href)
                      }}
                    >
                      {item.label}
                    </DropdownItem>
                  ))}
                  <DropdownItem
                    type="button"
                    onClick={() => logoutMutation.mutate()}
                  >
                    {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                  </DropdownItem>
                </DropdownMenu>
              ) : null}
            </DropdownWrap>
          ) : (
            <>
              <ActionLink
                href="/login"
                onClick={() => {
                  setIsMobileOpen(false)
                  setIsDropdownOpen(false)
                }}
              >
                로그인
              </ActionLink>
              <ActionLink
                href="/register"
                $primary
                onClick={() => {
                  setIsMobileOpen(false)
                  setIsDropdownOpen(false)
                }}
              >
                회원가입
              </ActionLink>
            </>
          )}
        </Actions>
        {isMobileOpen ? (
          <MobilePanel>
            <MobileList>
              {navigationItems.map(item => (
                <MobileLink
                  key={item.href}
                  href={item.href}
                  $active={isPathActive(pathname, item.href)}
                  onClick={() => setIsMobileOpen(false)}
                >
                  {item.label}
                </MobileLink>
              ))}
              {hasHydrated && isLoggedIn ? (
                <>
                  {profileMenuItems.map(item => (
                    <MobileLink
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                    >
                      {item.label}
                    </MobileLink>
                  ))}
                  <DropdownItem
                    type="button"
                    onClick={() => logoutMutation.mutate()}
                  >
                    {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                  </DropdownItem>
                </>
              ) : (
                <>
                  <MobileLink
                    href="/login"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    로그인
                  </MobileLink>
                  <MobileLink
                    href="/register"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    회원가입
                  </MobileLink>
                </>
              )}
            </MobileList>
          </MobilePanel>
        ) : null}
      </Inner>
    </Header>
  )
}
