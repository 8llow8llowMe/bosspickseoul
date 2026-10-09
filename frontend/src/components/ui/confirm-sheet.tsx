'use client'

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { Button } from '@/components/ui/button'
import {
  getDialogFocusableElements,
  getDialogFocusTargetIndex,
} from '@/lib/ui/dialog-focus'

export type ConfirmSheetProps = {
  open: boolean
  /** 묻는 한 줄(`글을 삭제할까요?`). */
  title: string
  /** 누르면 무슨 일이 생기는지 한 줄(`글을 삭제하면 달린 댓글도 함께 사라져요.`). */
  description: string
  /** 확인 버튼 문구(`삭제`). 동사 하나로 짧게. */
  confirmLabel: string
  cancelLabel?: string
  /** 되돌릴 수 없는 동작이면 danger(기본), 아니면 primary. */
  tone?: 'danger' | 'primary'
  /** 확인 요청 중 — 확인 버튼은 로딩, 취소·Esc·바깥 누름은 막는다(반쯤 끝난 동작을 버리지 않게). */
  pending?: boolean
  pendingLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const MOBILE = '@media (max-width: 479px)'

/* 커뮤니티 공용 시트(community-sheet.tsx)와 같은 레이어·모양: `<480` 바텀시트, `≥480` 가운데 420. */
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

const Panel = styled.div`
  width: min(100%, 420px);
  display: grid;
  gap: 8px;
  padding: 24px 20px 20px;
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-4);

  &:focus {
    outline: none;
  }

  ${MOBILE} {
    width: 100%;
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
    border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  }
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
  word-break: keep-all;
`

const Description = styled.p`
  color: var(--color-text-600);
  font-size: 15px;
  line-height: 1.6;
  word-break: keep-all;
`

/* 버튼 두 개는 늘 같은 폭 — 위험 동작이 더 커 보이지 않게 색으로만 가른다(DESIGN.md §4.2 Confirm Dialog). */
const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 16px;

  > button {
    width: 100%;
  }
`

/**
 * 확인 시트(#581). `window.confirm` 을 대신한다 — 인앱 브라우저(카카오톡·네이버)는 confirm 에 도메인을
 * 붙이고, 위험 동작의 색 구분이 없으며, 「…하시겠습니까?」로 결과를 말하지 못한다.
 *
 * - `role="alertdialog"` · 제목·설명 연결. 첫 포커스는 **취소**다 — 실수로 Enter 를 눌러도 지우지 않는다.
 * - Tab 은 시트 안을 돈다(`lib/ui/dialog-focus`). Esc · 바깥 누름은 취소다.
 * - 닫히면 열기 직전에 포커스가 있던 요소(보통 메뉴 트리거)로 돌려준다.
 * - 확인 버튼은 danger 48(`size="large"`), 취소는 ghost. 둘 다 같은 폭.
 *
 * 채팅·커뮤니티가 함께 써서 공용 ui 에 둔다.
 */
export default function ConfirmSheet({ open, ...props }: ConfirmSheetProps) {
  if (!open) {
    return null
  }

  return <ConfirmSheetContent {...props} />
}

function ConfirmSheetContent({
  title,
  description,
  confirmLabel,
  cancelLabel = '취소',
  tone = 'danger',
  pending = false,
  pendingLabel,
  onConfirm,
  onCancel,
}: Omit<ConfirmSheetProps, 'open'>) {
  const id = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const pendingRef = useRef(pending)

  useEffect(() => {
    pendingRef.current = pending

    /*
      요청이 시작되면 두 버튼이 잠긴다. 잠긴 버튼에 포커스가 남으면 브라우저가 body 로 떨어뜨려(Chrome)
      Esc·Tab 을 시트가 받지 못한다 — 포커스를 패널로 옮겨 키 처리를 시트 안에 둔다. 패널은 tabIndex -1 이고
      Tab 은 잠긴 동안 갈 곳이 없어 패널에 머문다.
    */
    if (pending) {
      panelRef.current?.focus()
    }
  }, [pending])

  useEffect(() => {
    const returnTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = requestAnimationFrame(() => {
      ;(cancelRef.current ?? panelRef.current)?.focus()
    })

    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      // 트리거가 그사이 사라졌으면(지운 행 등) 돌려줄 곳이 없다 — 문서에 남아 있을 때만.
      if (returnTarget?.isConnected) {
        returnTarget.focus()
      }
    }
  }, [])

  const cancel = () => {
    if (!pendingRef.current) {
      onCancel()
    }
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancel()
      return
    }

    if (event.key !== 'Tab' || !panelRef.current) {
      return
    }

    const focusable = getDialogFocusableElements(panelRef.current)
    const targetIndex = getDialogFocusTargetIndex(
      focusable.length,
      focusable.indexOf(document.activeElement as HTMLElement),
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
      cancel()
    }
  }

  const sheet = (
    <Overlay onMouseDown={handleBackdropMouseDown}>
      <Panel
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <Title id={`${id}-title`}>{title}</Title>
        <Description id={`${id}-description`}>{description}</Description>
        <Actions>
          <Button
            ref={cancelRef}
            type="button"
            size="large"
            variant="ghost"
            disabled={pending}
            onClick={cancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="large"
            variant={tone}
            isLoading={pending}
            loadingLabel={pendingLabel}
            onClick={() => {
              if (!pendingRef.current) {
                onConfirm()
              }
            }}
          >
            {confirmLabel}
          </Button>
        </Actions>
      </Panel>
    </Overlay>
  )

  /* body 로 포털한다 — 여는 버튼이 sticky 머리(쌓임 맥락) 안에 있어도 헤더·FAB 위에 뜬다(community-sheet 와 같다). */
  return typeof document === 'undefined'
    ? sheet
    : createPortal(sheet, document.body)
}
