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
import {
  clearCommunityStoredDrafts,
  getBrowserLocalStorage,
} from '@/lib/community/editor-draft'
import {
  COMMUNITY_HEADER_HIDDEN_SELECTOR,
  SITE_HEADER_MENU_OPEN_ATTRIBUTE,
} from '@/lib/community/hidden-header'
import { clearCommunityRecentRegions } from '@/lib/community/recent-regions'
import { clearMemberInfoQuery } from '@/lib/member-info-query'
import { clearMemberBookmarksQuery } from '@/lib/recommend/recommend-bookmarks'
import { useAuthStore } from '@/stores/auth-store'
import BrandLockup from '@/components/brand/brand-lockup'
import { shellWidth } from '@/styles/layout'

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
    box-shadow var(--motion-fast) var(--ease-standard),
    transform var(--motion-standard) var(--ease-standard);

  /*
    커뮤니티 목록 숨는 헤더(community.md §S4 「숨는 헤더」). 목록이 <html> 에 켠 속성을 읽기만
    한다 — 헤더는 그 속성을 쓰지 않으므로 다른 화면에서는 이 규칙이 걸리지 않는다. 메뉴 패널이
    열렸거나 헤더 안에 포커스가 있으면 선택자가 빠진다(lib/community/hidden-header.ts).
  */
  @media (max-width: 479px) {
    ${COMMUNITY_HEADER_HIDDEN_SELECTOR} & {
      transform: translateY(-100%);
    }
  }

  /*
    햄버거 메뉴가 열려 있는 동안은 화면에서 가장 위 레이어다(토스트 1200 아래). 헤더는 평소 20 이라
    같은 20 을 쓰는 지도 화면 바텀시트(상권분석·상권추천)가 DOM 상 뒤에 와서 메뉴 패널을 덮었다.
    패널(30)은 헤더의 쌓임 맥락 안에 있어 패널만 올려서는 소용이 없다 — 헤더째 올린다.
  */
  &[${SITE_HEADER_MENU_OPEN_ATTRIBUTE}='true'] {
    z-index: 1100;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/*
  헤더 콘텐츠 폭은 모든 화면에서 같다 — 셸 토큰 하나를 쓴다.

  예전에는 라우트별로 세 가지였고 페이지를 옮길 때마다 로고와 메뉴가 좌우로 튀었다.
  헤더는 본문의 일부가 아니라 앱 전체의 고정 틀이다. 이제 본문도 같은 셸을 쓰므로
  헤더가 기준이 된다.
*/
const Inner = styled.div`
  ${shellWidth}
  position: relative;
  min-height: 64px;
  padding: 10px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const Brand = styled(Link)`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  /* 조판은 BrandLockup 이 책임진다 — 여기서 폰트를 주면 두 곳이 싸운다. */
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
    props.$active
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-600)'};
  font-size: 14px;
  font-weight: 600;
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'transparent'};
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-primary-100);
    color: var(--color-text-primary-on-light);
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
      props.$primary
        ? 'var(--color-fill-primary-text)'
        : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$primary ? 'var(--color-fill-primary-text)' : 'var(--color-surface)'};
  color: ${props => (props.$primary ? 'white' : 'var(--color-text-700)')};
  font-size: 14px;
  font-weight: 600;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: ${props =>
      props.$primary
        ? 'var(--color-fill-primary-text-hover)'
        : 'var(--color-primary-100)'};
    background: ${props =>
      props.$primary
        ? 'var(--color-fill-primary-text-hover)'
        : 'var(--color-primary-100)'};
    color: ${props => (props.$primary ? 'white' : 'var(--color-text-primary-on-light)')};
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

/*
 * 모바일·태블릿(≤960) 게스트의 로그인 입구(#601). 예전에는 로그인·회원가입이 모두 햄버거 뒤에 있어
 * 게스트가 입구를 찾아야 했다. 「로그인」 한 개만 햄버거 옆에 꺼낸다 — 회원가입은 로그인 화면이
 * 잇는다(햄버거 패널에는 계정 입구를 다시 두지 않는다). 넓은 폭에서는 데스크톱 버튼(DesktopAuthLink)이 같은 일을 해서 숨긴다.
 * 테두리 없는 글자 버튼이다 — 햄버거(테두리 상자)와 나란히 서도 버튼 두 개가 겨루지 않는다.
 * 터치 영역은 44px 이다(DESIGN.md §8).
 */
const MobileLoginLink = styled(Link)`
  display: none;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  /* 좌우 6px — 320px 폭에서 [로고 167][로그인][햄버거 44] 가 한 줄에 들어야 한다(실측 283 ≤ 288). 10px 이면
     291px 로 넘쳐 로그인·햄버거가 둘째 줄로 내려갔다. 글자 폭(약 36px)+여백이라 44px 하한은 그대로 지킨다. */
  padding: 0 6px;
  border-radius: var(--radius-control);
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  @media (max-width: 960px) {
    display: inline-flex;
  }

  &:hover {
    background: var(--color-primary-100);
    color: var(--color-text-primary-on-light);
  }
`

/*
 * 세션 확인 전 자리(#579). 로그인 여부를 모르는 동안 「로그인·회원가입」도 아바타도 그리지 않는다 —
 * 회원에게 새로고침마다 비로그인 버튼이 깜빡였다. 대신 비로그인 버튼 두 개와 **같은 상자**
 * (높이·여백·글자 폭)를 회색 면으로 잡아 둔다. 대부분인 비로그인 방문자는 확인이 끝나도 폭이 그대로다.
 * 글자는 폭을 재려고만 넣고 숨긴다(visibility). 데스크톱 전용인 것도 버튼과 같다.
 */
const SessionPending = styled.span`
  display: inline-flex;
  gap: 8px;

  @media (max-width: 960px) {
    display: none;
  }
`

const SessionPendingBlock = styled.span`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  font-size: 14px;
  font-weight: 600;

  > span {
    visibility: hidden;
  }

  > span:first-child {
    width: 18px;
    height: 18px;
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
    color: var(--color-text-primary-on-light);
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
    color: var(--color-text-primary-on-light);
  }
`

// 터치 영역 44px(DESIGN.md §8, #601). 예전 40×40 은 기준에 못 미쳤다.
const MobileToggle = styled.button`
  display: none;
  width: 44px;
  height: 44px;
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
    color: var(--color-text-primary-on-light);
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

/*
 * 계정 항목은 한 줄로 묶는다. 예전에는 아바타·이름 줄 아래에 북마크·개인 정보 설정·로그아웃이 늘 펼쳐져
 * 있어 회원의 메뉴가 9줄이었다 — 화면 이동(5줄)보다 계정 줄이 더 많았다. 이름 줄을 눌러야 펼친다.
 */
const MobileAccountToggle = styled.button<{ $isOpen: boolean }>`
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 0 6px;
  border: none;
  border-radius: var(--radius-control);
  background: ${props =>
    props.$isOpen ? 'var(--color-surface-muted)' : 'transparent'};
  color: var(--color-text-800);
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--color-primary-100);
    color: var(--color-text-primary-on-light);
  }

  > [data-chevron] {
    margin-left: auto;
    transform: rotate(${props => (props.$isOpen ? '180deg' : '0deg')});
    transition: transform var(--motion-fast) var(--ease-standard);
  }

  @media (prefers-reduced-motion: reduce) {
    > [data-chevron] {
      transition: none;
    }
  }
`

const MobileAccountName = styled.span`
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MobileAccountMenu = styled.div`
  display: grid;
  gap: 4px;
  padding-left: 8px;
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
    props.$active
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-700)'};
  font-size: 14px;
  font-weight: 600;

  &:hover {
    background: var(--color-primary-100);
    color: var(--color-text-primary-on-light);
  }
`

const navigationItems = [
  { href: '/status', label: '구별현황' },
  { href: '/analysis', label: '상권분석' },
  { href: '/recommend', label: '상권추천' },
  // 독립 진입점(/simulation)만 노출한다. /analysis/simulation 은 상권분석 하위
  // 흐름이라 isPathActive 가 '/analysis' 를 활성으로 잡는 게 의도된 동작이다.
  { href: '/simulation', label: '시뮬레이션' },
  // 커뮤니티는 개편 1단계와 함께 2026-10-01 재노출했다 — 숨긴 채로는 개편 효과를 잴 수 없다
  // (docs/features/community/community.md §S4 「전역 내비」).
  { href: '/community/list', label: '커뮤니티' },
  // 채팅은 상권분석 + AI 리포트 방향 강조를 위해 계속 임시 숨김. 라우트/페이지는 유지되므로
  // 재노출 시 아래 줄의 주석만 해제하면 된다.
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
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const memberInfo = useAuthStore(state => state.memberInfo)
  const clearSession = useAuthStore(state => state.clearSession)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobileAccountOpen, setIsMobileAccountOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(() => !isHome)

  const logoutMutation = useMutation<Response, Error, string | null>({
    mutationFn: () => fetch('/api/auth/logout', { method: 'POST' }),
    onSettled: (...settlement) => {
      const loggedOutMemberId = settlement[2]
      if (loggedOutMemberId) {
        void clearMemberBookmarksQuery(queryClient, loggedOutMemberId)
        void clearMemberInfoQuery(queryClient, loggedOutMemberId)
      }
      // 글쓰기 임시 저장본은 브라우저에 남는다 — 공용 기기의 다음 사람에게 넘기지 않는다.
      // storage 실패는 함수 안에서 삼킨다(try/catch).
      clearCommunityStoredDrafts(getBrowserLocalStorage)
      // 최근 본 지역(좌 내비)도 같은 이유로 지운다. 비로그인 열람 기록은 브라우저 단위로 둔다.
      clearCommunityRecentRegions(getBrowserLocalStorage)
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
    <Header
      $isScrolled={isScrolled}
      data-site-header
      {...(isMobileOpen ? { [SITE_HEADER_MENU_OPEN_ATTRIBUTE]: 'true' } : {})}
    >
      <Inner ref={innerRef}>
        <Brand
          href="/"
          aria-label="BossPickSeoul 홈"
          onClick={event => {
            setIsMobileOpen(false)
            setIsDropdownOpen(false)

            if (isHome) {
              event.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }}
        >
          <BrandLockup />
        </Brand>
        <Nav aria-label="주요 메뉴">
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
          {/* 세션 확인이 끝난 게스트에게만 — 확인 전에는 비워 둔다(#579). 회원은 패널 안 계정 영역이다. */}
          {hasHydrated && !(isLoggedIn && memberInfo) ? (
            <MobileLoginLink
              href="/login"
              data-mobile-login=""
              onClick={() => {
                setIsMobileOpen(false)
                setIsDropdownOpen(false)
              }}
            >
              로그인
            </MobileLoginLink>
          ) : null}
          <MobileToggle
            aria-expanded={isMobileOpen}
            aria-label={isMobileOpen ? '메뉴 닫기' : '메뉴 열기'}
            type="button"
            onClick={() => {
              setIsMobileOpen(current => !current)
              // 메뉴를 열 때마다 계정 줄은 접힌 채로 시작한다. 계정 화면에 있을 때만 펼쳐 둔다.
              setIsMobileAccountOpen(pathname.startsWith('/profile'))
            }}
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
          ) : !hasHydrated ? (
            <SessionPending aria-hidden="true" data-session-pending="">
              <SessionPendingBlock>
                <span />
                <span>로그인</span>
              </SessionPendingBlock>
              <SessionPendingBlock>
                <span />
                <span>회원가입</span>
              </SessionPendingBlock>
            </SessionPending>
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
          <MobilePanel data-mobile-menu-panel="">
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
              {/*
               * 계정 항목은 회원에게만 있다. 세션 확인 전(#579)에는 상태를 모르니 비우고, 게스트는
               * 햄버거 옆 「로그인」(#601)이 입구라 패널에 다시 두지 않는다 — 화면 이동 5줄만 남는다.
               * 회원가입은 로그인 화면이 잇는다. 아래가 빌 때는 구분선도 두지 않는다.
               */}
              {hasHydrated && isLoggedIn && memberInfo ? (
                <>
                  <MobileDivider data-mobile-account-divider="" />
                  <MobileAccountToggle
                    $isOpen={isMobileAccountOpen}
                    aria-controls="site-header-mobile-account"
                    aria-expanded={isMobileAccountOpen}
                    data-mobile-account-toggle=""
                    type="button"
                    onClick={() => setIsMobileAccountOpen(current => !current)}
                  >
                    <Avatar $image={memberInfo.profileImageUrl}>
                      {memberInfo.profileImageUrl ? null : avatarLabel}
                    </Avatar>
                    <MobileAccountName>{memberInfo.nickname}</MobileAccountName>
                    <IconSlot aria-hidden="true" data-chevron="">
                      <ChevronDown />
                    </IconSlot>
                  </MobileAccountToggle>
                  {isMobileAccountOpen ? (
                    <MobileAccountMenu id="site-header-mobile-account">
                      {profileMenuItems.map(item => {
                        const ItemIcon = item.icon

                        return (
                          <MobileLink
                            key={item.href}
                            href={item.href}
                            $active={isPathActive(pathname, item.href)}
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
                        onClick={() =>
                          logoutMutation.mutate(memberInfo.memberId)
                        }
                      >
                        <IconSlot aria-hidden="true">
                          <LogOut />
                        </IconSlot>
                        {logoutMutation.isPending
                          ? '로그아웃 중...'
                          : '로그아웃'}
                      </DropdownItem>
                    </MobileAccountMenu>
                  ) : null}
                </>
              ) : null}
            </MobileList>
          </MobilePanel>
        ) : null}
      </Inner>
    </Header>
  )
}
