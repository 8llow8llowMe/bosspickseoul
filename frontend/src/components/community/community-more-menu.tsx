'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import Link from 'next/link'
import { Ellipsis, Flag, Pencil, Trash2 } from 'lucide-react'
import styled, { css } from 'styled-components'
import CommunitySheet from '@/components/community/community-sheet'
import { useNarrowViewport } from '@/hooks/use-narrow-viewport'
import {
  getCommunityPostMenuActions,
  getNextCommunityMenuIndex,
  type CommunityPostMenuAction,
} from '@/lib/community/post-detail'

/*
  커뮤니티 구간(DESIGN.md §8 피드형 화면 메모). 시트 껍데기(community-sheet.tsx)와 같은 문자열이다 —
  둘이 갈리면 「팝오버도 시트도 아닌」 폭이 생긴다.
*/
export const COMMUNITY_MOBILE_QUERY = '(max-width: 479px)'

type MenuVariant = 'popover' | 'sheet'

/** 메뉴가 다루는 대상. 트리거·항목·시트 제목의 이름이 대상을 따라간다(`게시글 더보기` · `댓글 더보기`). */
export type CommunityMoreMenuTarget = 'post' | 'comment'

const TARGET_NAME: Record<CommunityMoreMenuTarget, string> = {
  post: '게시글',
  comment: '댓글',
}

export type CommunityMoreMenuActionsProps = {
  variant: MenuVariant
  /** 기본은 게시글이다 — 기존 글 더보기 호출부는 넘기지 않는다. */
  target?: CommunityMoreMenuTarget
  /**
   * 보일 항목. 생략하면 글 규칙(CM-022 — `editHref` 가 있으면 수정·삭제, 없으면 신고)이다.
   * 댓글은 `getCommunityCommentMenuActions` 로 넘긴다(삭제 또는 신고).
   */
  actions?: readonly CommunityPostMenuAction[]
  editHref: string | null
  authReady: boolean
  deletePending: boolean
  onEdit: () => void
  onDelete: () => void
  onReport: () => void
}

const itemBase = css`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;

  svg {
    flex: 0 0 auto;
  }

  &:hover {
    background: var(--color-background-muted);
  }

  /*
    항목은 팝오버(overflow: hidden)·시트 목록(overflow-y: auto) 끝까지 꽉 차서, 전역 링
    (offset 2px, 바깥쪽)은 가장자리에서 잘린다. 같은 2px primary-700 링을 안쪽으로 그린다.
  */
  &:focus-visible {
    outline: 2px solid var(--color-primary-700);
    outline-offset: -2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

const itemSize = (variant: MenuVariant) =>
  variant === 'sheet'
    ? css`
        /* 바텀시트 행 — 터치 영역 48 이상(DESIGN.md §8 Touch Targets) */
        min-height: 52px;
        padding: 0 20px;
        font-size: 16px;
      `
    : css`
        min-height: 44px;
        padding: 0 16px;
        font-size: 14px;
      `

/* 위험 행동은 글자색으로만 구분한다 — 빨강 글자는 red700(-text) 토큰이다(DESIGN.md §2 Semantic). */
const itemColor = (danger: boolean) =>
  danger ? 'var(--color-negative-text)' : 'var(--color-text-800)'

const ItemButton = styled.button<{ $variant: MenuVariant; $danger?: boolean }>`
  ${itemBase}
  ${props => itemSize(props.$variant)}
  color: ${props => itemColor(Boolean(props.$danger))};
`

const ItemLink = styled(Link)<{ $variant: MenuVariant }>`
  ${itemBase}
  ${props => itemSize(props.$variant)}
  color: ${itemColor(false)};
`

/**
 * 더보기 항목. 팝오버와 바텀시트가 같은 목록을 그린다(CM-022 — 내 글은 수정·삭제, 남의 글은 신고).
 *
 * 팝오버는 `role="menu"` 안의 `menuitem` 이고 키보드 규약(↑↓ Home End Esc Tab)을 지킨다.
 * 시트는 이미 모달 다이얼로그라 그 안은 평범한 버튼 목록이다 — menu 역할을 두 겹으로 겹치면
 * 스크린 리더가 「대화상자 안의 메뉴」로 읽고 Tab 이동과 화살표 이동 규약이 서로 부딪힌다.
 */
export function CommunityMoreMenuActions({
  variant,
  target = 'post',
  actions: actionsOverride,
  editHref,
  authReady,
  deletePending,
  onEdit,
  onDelete,
  onReport,
}: CommunityMoreMenuActionsProps) {
  const role = variant === 'popover' ? 'menuitem' : undefined
  // 버튼 안 아이콘은 18 이다(DESIGN.md Icon Sizing Scale). 시트 행이 더 커도 아이콘은 같다.
  const iconSize = 18
  const name = TARGET_NAME[target]
  const actions =
    actionsOverride ?? getCommunityPostMenuActions(Boolean(editHref))

  return (
    <>
      {actions.map(action => {
        if (action === 'edit' && editHref) {
          return (
            <ItemLink
              key={action}
              $variant={variant}
              data-community-menu-item="true"
              href={editHref}
              role={role}
              onClick={onEdit}
            >
              <Pencil aria-hidden="true" size={iconSize} />
              <span>수정</span>
            </ItemLink>
          )
        }

        if (action === 'delete') {
          return (
            <ItemButton
              key={action}
              $danger
              $variant={variant}
              aria-label={`${name} 삭제`}
              data-community-menu-item="true"
              data-danger="true"
              disabled={!authReady || deletePending}
              role={role}
              type="button"
              onClick={onDelete}
            >
              <Trash2 aria-hidden="true" size={iconSize} />
              <span>{deletePending ? '삭제 중' : '삭제'}</span>
            </ItemButton>
          )
        }

        if (action === 'report') {
          return (
            <ItemButton
              key={action}
              $variant={variant}
              aria-label={`${name} 신고`}
              data-community-menu-item="true"
              disabled={!authReady}
              role={role}
              type="button"
              onClick={onReport}
            >
              <Flag aria-hidden="true" size={iconSize} />
              <span>신고</span>
            </ItemButton>
          )
        }

        return null
      })}
    </>
  )
}

const Root = styled.div`
  position: relative;
  flex: 0 0 auto;
`

const Trigger = styled.button`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-700);
  cursor: pointer;

  &:hover {
    background: var(--color-background-muted);
  }

  /* 포커스는 전역 :focus-visible 링(2px blue500) 그대로다 — 링을 끄고 글로우만 남기면 안 보인다. */

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

/*
  버튼 아래 오른쪽 정렬. z-index 30 은 sticky 레일(쌓임 맥락 없음)·목록 툴바(10)·사이트 헤더(20)
  위, 시트·모달(1000) 아래다. 그림자 level 3 = 드롭다운·팝오버(DESIGN.md §6).
*/
const Popover = styled.div`
  position: absolute;
  z-index: 30;
  top: calc(100% + 4px);
  right: 0;
  min-width: 160px;
  display: grid;
  padding: 8px 0;
  overflow: hidden;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-float-background);
  box-shadow: var(--shadow-level-3);
`

const SheetList = styled.div`
  display: grid;
  padding: 8px 0;
`

const MENU_ITEM_SELECTOR = '[data-community-menu-item="true"]:not([disabled])'

export type CommunityMoreMenuProps = {
  target?: CommunityMoreMenuTarget
  actions?: readonly CommunityPostMenuAction[]
  editHref: string | null
  authReady: boolean
  deletePending: boolean
  onDelete: () => void
  onReport: () => void
}

/**
 * 게시글·댓글 더보기(⋯). `<480` 바텀시트(CommunitySheet), `≥480` 버튼 아래 팝오버.
 * 댓글 행도 같은 메뉴를 쓴다(community.md §S4 2단계 「신고·삭제」) — `target="comment"` 와
 * `actions` 만 바꾸고 키보드 규약·시트→신고 잠금 순서·삭제 확인 프레임 취소는 그대로다.
 *
 * 폭 판정을 CSS 가 아니라 `matchMedia` 로 하는 이유: 시트는 body 포털이라 CSS 로 숨길 수 없고,
 * 두 형태를 다 그려 두면 포커스 가두기가 숨은 쪽까지 잡는다. 서버 렌더에서는 닫혀 있어
 * 하이드레이션 차이가 없다(열 때는 이미 측정이 끝나 있다).
 */
export default function CommunityMoreMenu({
  target = 'post',
  actions,
  editHref,
  authReady,
  deletePending,
  onDelete,
  onReport,
}: CommunityMoreMenuProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const narrow = useNarrowViewport(COMMUNITY_MOBILE_QUERY)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const confirmFrameRef = useRef<number | null>(null)
  const sheetMode = narrow === true
  const popoverOpen = open && !sheetMode
  const name = TARGET_NAME[target]

  const getItems = () =>
    Array.from(
      popoverRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR) ??
        [],
    )

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) {
      triggerRef.current?.focus()
    }
  }

  /*
    신고는 **같은 핸들러에서** 메뉴를 닫고 다이얼로그를 연다. 시트와 신고 다이얼로그는 둘 다
    body.style.overflow 를 「열 때 이전 값 저장 → 닫을 때 복원」으로 다룬다. 한 업데이트로 묶으면
    React 가 passive cleanup(시트 닫기: 복원 + 트리거 포커스)을 mount(다이얼로그: 저장 + 잠금 +
    textarea 포커스)보다 먼저 돌린다. 시트가 떠 있는 채로 다이얼로그를 따로 열면 다이얼로그가
    'hidden' 을 이전 값으로 저장해, 다 닫은 뒤에도 페이지가 잠긴 채 남는다.
  */
  const closeThen = (action: () => void) => {
    close(!sheetMode)
    action()
  }

  /*
    삭제는 메뉴를 닫은 화면이 한 번 그려진 뒤(두 프레임 뒤)에 넘긴다. 글은 확인 시트(ConfirmSheet, #581)를
    띄우는데, 같은 업데이트로 묶으면 메뉴 시트의 overflow 복원·트리거 포커스와 확인 시트의 잠금·첫 포커스가 엇갈린다.
    댓글은 확인 없이 숨기고 되돌리기 토스트를 띄운다.
    두 프레임 사이에 메뉴가 사라지면(다른 글로 이동 등) 지금 프레임 id 를 들고 있다가 취소한다 —
    떠난 화면에서 삭제 확인이 뜨면 안 된다.
  */
  const cancelConfirmFrame = () => {
    if (confirmFrameRef.current !== null) {
      cancelAnimationFrame(confirmFrameRef.current)
      confirmFrameRef.current = null
    }
  }

  const closeThenConfirm = (action: () => void) => {
    close(!sheetMode)
    cancelConfirmFrame()
    confirmFrameRef.current = requestAnimationFrame(() => {
      confirmFrameRef.current = requestAnimationFrame(() => {
        confirmFrameRef.current = null
        action()
      })
    })
  }

  useEffect(() => cancelConfirmFrame, [])

  // 팝오버를 열면 첫 항목으로 포커스.
  useEffect(() => {
    if (!popoverOpen) {
      return
    }

    const frame = requestAnimationFrame(() => {
      popoverRef.current
        ?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)
        ?.focus()
    })

    return () => cancelAnimationFrame(frame)
  }, [popoverOpen])

  // 바깥을 누르면 닫는다. 누른 곳이 포커스를 받을 수 없는 자리면 트리거로 돌려준다.
  useEffect(() => {
    if (!popoverOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (!(target instanceof Node) || rootRef.current?.contains(target)) {
        return
      }

      const focusable =
        target instanceof Element &&
        target.closest('a[href], button, input, select, textarea, [tabindex]')
      setOpen(false)
      if (!focusable) {
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [popoverOpen])

  /*
    Esc·Tab 은 트리거와 팝오버를 감싼 Root 에서 받는다. 항목이 전부 비활성이면(인증 준비 전의
    남의 글 — 신고 하나) 포커스가 팝오버로 못 들어가 트리거에 남는데, 팝오버에서만 받으면
    Esc 로 닫을 길이 없다. 시트일 때는 건드리지 않는다 — 시트가 자기 Esc·Tab 을 처리하고,
    포털이라도 React 이벤트는 여기까지 올라온다.
  */
  const handleRootKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!popoverOpen) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
      return
    }

    if (event.key === 'Tab') {
      // 메뉴는 Tab 정지점이 아니다 — 닫고 자연스러운 다음 칸으로 보낸다.
      setOpen(false)
    }
  }

  const handlePopoverKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = getItems()
    const current = items.indexOf(document.activeElement as HTMLElement)
    const next = getNextCommunityMenuIndex(items.length, current, event.key)

    if (next !== null) {
      event.preventDefault()
      items[next]?.focus()
    }
  }

  const handlePopoverBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget

    if (nextTarget instanceof Node && rootRef.current?.contains(nextTarget)) {
      return
    }

    if (nextTarget) {
      setOpen(false)
    }
  }

  const actionProps = {
    target,
    actions,
    editHref,
    authReady,
    deletePending,
    onEdit: () => setOpen(false),
    onDelete: () => closeThenConfirm(onDelete),
    onReport: () => closeThen(onReport),
  }

  return (
    <Root ref={rootRef} onKeyDown={handleRootKeyDown}>
      <Trigger
        ref={triggerRef}
        aria-label={`${name} 더보기`}
        aria-haspopup={sheetMode ? 'dialog' : 'menu'}
        aria-expanded={open}
        aria-controls={popoverOpen ? `${id}-menu` : undefined}
        aria-busy={deletePending || undefined}
        disabled={deletePending}
        type="button"
        onClick={() => setOpen(current => !current)}
        onKeyDown={event => {
          // 메뉴 버튼 규약: ↓ 로도 연다.
          if (event.key === 'ArrowDown' && !open && !sheetMode) {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <Ellipsis aria-hidden="true" size={18} />
      </Trigger>

      {popoverOpen ? (
        <Popover
          ref={popoverRef}
          aria-label={`${name} 더보기`}
          id={`${id}-menu`}
          role="menu"
          onBlur={handlePopoverBlur}
          onKeyDown={handlePopoverKeyDown}
        >
          <CommunityMoreMenuActions variant="popover" {...actionProps} />
        </Popover>
      ) : null}

      <CommunitySheet
        open={open && sheetMode}
        returnFocusRef={triggerRef}
        title={`${name} 더보기`}
        onClose={() => setOpen(false)}
      >
        <SheetList aria-label={`${name} 관리`} role="group">
          <CommunityMoreMenuActions variant="sheet" {...actionProps} />
        </SheetList>
      </CommunitySheet>
    </Root>
  )
}
