'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bookmark,
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  Settings,
  UserPlus,
  X,
} from 'lucide-react'
import styled from 'styled-components'
import { clearMemberInfoQuery } from '@/lib/member-info-query'
import { clearMemberBookmarksQuery } from '@/lib/recommend/recommend-bookmarks'
import { useAuthStore } from '@/stores/auth-store'

const Header = styled.header<{ $isScrolled: boolean }>`
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid
    ${props => (props.$isScrolled ? 'var(--color-border-200)' : 'transparent')};
  background-color: white;
  box-shadow: ${props =>
    props.$isScrolled ? 'var(--shadow-level-1)' : 'none'};
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard);
`

// 페이지별 헤더 콘텐츠 폭. 메인은 기본(1120), 상권분석·상권추천은 풀블리드 맵에
// 맞춰 최대, 구별현황은 페이지 본문 폭(min(1400px, calc(100% - 48px)))에 맞춘다.
type HeaderWidthVariant = 'default' | 'full' | 'status'

const INNER_WIDTH: Record<HeaderWidthVariant, string> = {
  default: 'min(1120px, calc(100% - 40px))',
  full: 'calc(100% - 40px)',
  status: 'min(1400px, calc(100% - 48px))',
}

const Inner = styled.div<{ $width: HeaderWidthVariant }>`
  position: relative;
  width: ${props => INNER_WIDTH[props.$width]};
  min-height: 64px;
  padding: 10px 0;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    width: min(100% - 32px, 1120px);
  }
`

const Brand = styled(Link)`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  color: var(--color-text-900);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 28px;
`

const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;

  @media (max-width: 960px) {
    display: none;
  }
`

const NavLink = styled(Link)<{ $active?: boolean }>`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: var(--radius-control);
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-600)'};
  font-size: 14px;
  font-weight: 600;
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'transparent'};
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-primary-100);
    color: var(--color-primary-700);
  }
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`

const ActionLink = styled(Link)<{ $primary?: boolean }>`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid
    ${props =>
      props.$primary ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$primary ? 'var(--color-primary-700)' : 'var(--color-surface)'};
  color: ${props => (props.$primary ? 'white' : 'var(--color-text-700)')};
  font-size: 14px;
  font-weight: 600;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: ${props =>
      props.$primary ? 'var(--color-primary-600)' : 'var(--color-primary-100)'};
    background: ${props =>
      props.$primary ? 'var(--color-primary-600)' : 'var(--color-primary-100)'};
    color: ${props => (props.$primary ? 'white' : 'var(--color-primary-700)')};
  }

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

// 데스크톱 전용 로그인/회원가입. 모바일·태블릿(≤960)에서는 햄버거 패널로만
// 노출해 헤더 우측에 인증 버튼이 중복 표시되지 않게 한다.
const DesktopAuthLink = styled(ActionLink)`
  @media (max-width: 960px) {
    display: none;
  }
`

const AvatarButton = styled.button`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 6px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text-700);
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-100);
    background: var(--color-primary-100);
    color: var(--color-primary-700);
  }
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
      : 'var(--color-surface-muted)'};
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;
`

const AvatarLabel = styled.span`
  color: currentColor;
  font-size: 14px;
  font-weight: 600;

  @media (max-width: 640px) {
    display: none;
  }
`

const IconSlot = styled.span`
  width: 18px;
  height: 18px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: currentColor;

  svg {
    width: 100%;
    height: 100%;
    stroke: currentColor;
  }
`

// 로그인 상태 아바타·드롭다운도 데스크톱 전용. 모바일·태블릿에서는 햄버거
// 패널 안 계정 영역으로 통일한다(햄버거 + 아바타 동시 노출 방지).
const DropdownWrap = styled.div`
  position: relative;

  @media (max-width: 960px) {
    display: none;
  }
`

const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 200px;
  padding: 8px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-sheet);
  background: var(--color-float-background);
  box-shadow: var(--shadow-level-3);
`

const DropdownItem = styled.button`
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-control);
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
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-700);
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  @media (max-width: 960px) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  &:hover {
    background: var(--color-primary-100);
    color: var(--color-primary-700);
  }

  svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
  }
`

// 햄버거 패널: 문서 흐름에서 빠져(absolute) 하단 콘텐츠를 밀지 않고, 헤더 우측
// 햄버거 버튼 바로 아래에 오른쪽 정렬로 떠오른다.
const MobilePanel = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 30;
  width: min(180px, calc(100vw - 32px));
  display: none;

  @media (max-width: 960px) {
    display: block;
  }
`

const MobileList = styled.div`
  display: grid;
  gap: 4px;
  padding: 12px;
  max-height: calc(100dvh - 96px);
  overflow-y: auto;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-float-background);
  box-shadow: var(--shadow-level-3);
`

const MobileAccount = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 10px;
  color: var(--color-text-800);
`

const MobileAccountName = styled.span`
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MobileDivider = styled.div`
  height: 1px;
  margin: 6px 4px;
  background: var(--color-border-200);
`

const MobileLink = styled(Link)<{ $active?: boolean }>`
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: var(--radius-control);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'transparent'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-size: 14px;
  font-weight: 600;

  &:hover {
    background: var(--color-primary-100);
    color: var(--color-primary-700);
  }
`

const navigationItems = [
  { href: '/status', label: '구별현황' },
  { href: '/analysis', label: '상권분석' },
  { href: '/recommend', label: '상권추천' },
  // 독립 진입점(/simulation)만 노출한다. /analysis/simulation 은 상권분석 하위
  // 흐름이라 isPathActive 가 '/analysis' 를 활성으로 잡는 게 의도된 동작이다.
  { href: '/simulation', label: '시뮬레이션' },
  // 상권분석 + AI 리포트 방향 강조를 위해 커뮤니티·채팅은 헤더에서 임시 숨김.
  // 라우트/페이지는 유지되므로 재노출 시 아래 두 줄의 주석만 해제하면 됨.
  // { href: '/community/list', label: '커뮤니티' },
  // { href: '/chatting/list', label: '채팅' },
] as const

const profileMenuItems = [
  { href: '/profile/bookmarks/analysis', label: '북마크', icon: Bookmark },
  { href: '/profile/settings/edit', label: '개인 정보 설정', icon: Settings },
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
  const queryClient = useQueryClient()
  const isHome = pathname === '/'
  const headerWidth: HeaderWidthVariant =
    pathname === '/analysis' || pathname === '/recommend'
      ? 'full'
      : pathname === '/status'
        ? 'status'
        : 'default'
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const memberInfo = useAuthStore(state => state.memberInfo)
  const clearSession = useAuthStore(state => state.clearSession)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(() => !isHome)

  const logoutMutation = useMutation<Response, Error, string | null>({
    mutationFn: () => fetch('/api/auth/logout', { method: 'POST' }),
    onSettled: (...settlement) => {
      const loggedOutMemberId = settlement[2]
      if (loggedOutMemberId) {
        void clearMemberBookmarksQuery(queryClient, loggedOutMemberId)
        void clearMemberInfoQuery(queryClient, loggedOutMemberId)
      }
      clearSession()
      setIsDropdownOpen(false)
      setIsMobileOpen(false)
      router.push('/')
    },
  })

  useEffect(() => {
    let frame = 0

    const syncHeaderState = () => {
      frame = 0
      setIsScrolled(!isHome || window.scrollY > 28)
    }

    const handleScroll = () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }

      frame = window.requestAnimationFrame(syncHeaderState)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isHome])

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

  // 햄버거 패널: 헤더(Inner) 바깥 클릭 또는 Esc로 닫는다.
  useEffect(() => {
    if (!isMobileOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        innerRef.current &&
        !innerRef.current.contains(event.target as Node)
      ) {
        setIsMobileOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileOpen])

  const avatarLabel = memberInfo?.nickname?.slice(0, 1) ?? 'N'

  return (
    <Header $isScrolled={isScrolled} data-site-header>
      <Inner ref={innerRef} $width={headerWidth}>
        <Brand
          href="/"
          onClick={event => {
            setIsMobileOpen(false)
            setIsDropdownOpen(false)

            if (isHome) {
              event.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }}
        >
          BossPickSeoul
        </Brand>
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
            aria-expanded={isMobileOpen}
            aria-label={isMobileOpen ? '메뉴 닫기' : '메뉴 열기'}
            type="button"
            onClick={() => setIsMobileOpen(current => !current)}
          >
            {isMobileOpen ? <X /> : <Menu />}
          </MobileToggle>
          {hasHydrated && isLoggedIn && memberInfo ? (
            <DropdownWrap ref={dropdownRef}>
              <AvatarButton
                aria-expanded={isDropdownOpen}
                aria-haspopup="menu"
                type="button"
                onClick={() => setIsDropdownOpen(current => !current)}
              >
                <Avatar $image={memberInfo.profileImageUrl}>
                  {memberInfo.profileImageUrl ? null : avatarLabel}
                </Avatar>
                <AvatarLabel>{memberInfo.nickname}</AvatarLabel>
                <IconSlot aria-hidden="true">
                  <ChevronDown />
                </IconSlot>
              </AvatarButton>
              {isDropdownOpen ? (
                <DropdownMenu role="menu">
                  {profileMenuItems.map(item => {
                    const ItemIcon = item.icon

                    return (
                      <DropdownItem
                        key={item.href}
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false)
                          router.push(item.href)
                        }}
                      >
                        <IconSlot aria-hidden="true">
                          <ItemIcon />
                        </IconSlot>
                        {item.label}
                      </DropdownItem>
                    )
                  })}
                  <DropdownItem
                    role="menuitem"
                    type="button"
                    onClick={() => logoutMutation.mutate(memberInfo.memberId)}
                  >
                    <IconSlot aria-hidden="true">
                      <LogOut />
                    </IconSlot>
                    {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                  </DropdownItem>
                </DropdownMenu>
              ) : null}
            </DropdownWrap>
          ) : (
            <>
              <DesktopAuthLink
                href="/login"
                onClick={() => {
                  setIsMobileOpen(false)
                  setIsDropdownOpen(false)
                }}
              >
                <LogIn aria-hidden="true" />
                로그인
              </DesktopAuthLink>
              <DesktopAuthLink
                href="/register"
                $primary
                onClick={() => {
                  setIsMobileOpen(false)
                  setIsDropdownOpen(false)
                }}
              >
                <UserPlus aria-hidden="true" />
                회원가입
              </DesktopAuthLink>
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
              <MobileDivider />
              {hasHydrated && isLoggedIn && memberInfo ? (
                <>
                  <MobileAccount>
                    <Avatar $image={memberInfo.profileImageUrl}>
                      {memberInfo.profileImageUrl ? null : avatarLabel}
                    </Avatar>
                    <MobileAccountName>{memberInfo.nickname}</MobileAccountName>
                  </MobileAccount>
                  {profileMenuItems.map(item => {
                    const ItemIcon = item.icon

                    return (
                      <MobileLink
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                      >
                        <IconSlot aria-hidden="true">
                          <ItemIcon />
                        </IconSlot>
                        {item.label}
                      </MobileLink>
                    )
                  })}
                  <DropdownItem
                    type="button"
                    onClick={() => logoutMutation.mutate(memberInfo.memberId)}
                  >
                    <IconSlot aria-hidden="true">
                      <LogOut />
                    </IconSlot>
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
