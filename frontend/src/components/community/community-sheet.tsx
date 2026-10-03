'use client'

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import styled from 'styled-components'
import {
  getDialogFocusableElements,
  getDialogFocusTargetIndex,
} from '@/lib/community/dialog-focus'

export type CommunitySheetProps = {
  open: boolean
  onClose: () => void
  title: string
  /* 선택 — createElement(Sheet, props, children) 처럼 셋째 인자로 넘길 수 있게 둔다. */
  children?: ReactNode
  /**
   * 닫을 때 포커스를 돌려줄 곳(보통 시트를 연 트리거). 없으면 열기 직전에 포커스가 있던 요소다.
   * 열 때의 요소를 잡아 둔다 — 트리거는 시트가 떠 있는 동안 그대로 있어야 한다.
   */
  returnFocusRef?: RefObject<HTMLElement | null>
  /**
   * 시트 높이를 최대 높이로 고정한다(목록은 시트 안에서 스크롤). 내용이 단계마다 바뀌는 시트용이다 —
   * 높이가 내용을 따르면 가운데·바닥 정렬 때문에 목록이 도착하는 순간 위쪽 행이 밀려, 그때 누른 손가락이
   * 다른 행을 고른다(#518). 더보기 메뉴처럼 내용이 고정된 시트는 쓰지 않는다.
   */
  fixedHeight?: boolean
}

const MOBILE = '@media (max-width: 479px)'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-overlay);

  ${MOBILE} {
    align-items: flex-end;
    padding: 0;
  }
`

const Panel = styled.div<{ $fixedHeight: boolean }>`
  width: min(100%, 420px);
  max-height: min(640px, calc(100dvh - 48px));
  ${p => (p.$fixedHeight ? 'height: min(640px, calc(100dvh - 48px));' : '')}
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-4);

  &:focus {
    outline: none;
  }

  ${MOBILE} {
    width: 100%;
    max-height: 85vh;
    max-height: 85dvh;
    ${p => (p.$fixedHeight ? 'height: 85vh; height: 85dvh;' : '')}
    padding-bottom: env(safe-area-inset-bottom);
    border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  }
`

const Header = styled.header`
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 12px 12px 20px;
  border-bottom: 1px solid var(--color-border-200);
`

const Title = styled.h2`
  min-width: 0;
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
`

const CloseButton = styled.button`
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-700);
  cursor: pointer;
`

/* 머리는 고정하고 내용만 스크롤한다. 끝에 닿아도 뒤 페이지로 스크롤이 넘어가지 않게 막는다. */
const Body = styled.div`
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
`

/**
 * 커뮤니티 공용 시트 껍데기. `<480` 바텀시트, `≥480` 가운데 다이얼로그(폭 420).
 *
 * 포커스 가두기·Esc·바깥 누름 닫기·포커스 복귀·body 스크롤 잠금을 맡는다. 무엇을 그릴지는
 * 쓰는 쪽이 정한다 — 목록의 지역 선택 시트와 상세의 더보기 메뉴가 함께 쓴다.
 * 포커스 가두기는 신고 다이얼로그(`community-report-dialog.tsx`)와 같은 규칙이다.
 */
export default function CommunitySheet({
  open,
  ...props
}: CommunitySheetProps) {
  if (!open) {
    return null
  }

  return <CommunitySheetContent {...props} />
}

function CommunitySheetContent({
  onClose,
  title,
  children,
  returnFocusRef,
  fixedHeight = false,
}: Omit<CommunitySheetProps, 'open'>) {
  const id = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const returnTarget = returnFocusRef?.current ?? previousActiveElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // 첫 포커스는 패널 자체다 — 검색칸으로 보내면 모바일에서 키보드가 목록을 가린다.
    const frame = requestAnimationFrame(() => {
      panelRef.current?.focus()
    })

    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      returnTarget?.focus()
    }
  }, [returnFocusRef])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key !== 'Tab' || !panelRef.current) {
      return
    }

    const focusable = getDialogFocusableElements(panelRef.current)
    const currentIndex = focusable.indexOf(
      document.activeElement as HTMLElement,
    )
    const targetIndex = getDialogFocusTargetIndex(
      focusable.length,
      currentIndex,
      event.shiftKey ? 'backward' : 'forward',
    )

    event.preventDefault()
    if (targetIndex === null) {
      panelRef.current.focus()
      return
    }

    focusable[targetIndex]?.focus()
  }

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const sheet = (
    <Overlay onMouseDown={handleBackdropMouseDown}>
      <Panel
        $fixedHeight={fixedHeight}
        ref={panelRef}
        aria-labelledby={`${id}-title`}
        aria-modal="true"
        role="dialog"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <Header>
          <Title id={`${id}-title`}>{title}</Title>
          <CloseButton aria-label="닫기" onClick={onClose} type="button">
            <X aria-hidden="true" size={20} />
          </CloseButton>
        </Header>
        <Body>{children}</Body>
      </Panel>
    </Overlay>
  )

  /*
    body 로 포털을 띄운다. 시트를 여는 칩은 sticky 툴바(z-index 10) 안에 있어서, 제자리에
    그리면 그 쌓임 맥락에 갇혀 사이트 헤더(20)·FAB(20) 아래로 깔린다. 서버 렌더(테스트의
    renderToStaticMarkup)에는 document 가 없으니 그때만 제자리에 그린다.
  */
  return typeof document === 'undefined'
    ? sheet
    : createPortal(sheet, document.body)
}
