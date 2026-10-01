'use client'

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import styled, { css, keyframes } from 'styled-components'
import {
  getDialogFocusableElements,
  getDialogFocusTargetIndex,
} from '@/lib/community/dialog-focus'
import {
  formatPhotoPosition,
  getPhotoSwipeStep,
  stepPhotoIndex,
} from '@/lib/community/photo-viewer'

export type CommunityImageLightboxProps = {
  open: boolean
  /** 첨부 순서(sortOrder)대로 정렬한 사진 URL. `alt` 는 본문과 같은 `첨부 이미지 n` 이다. */
  images: string[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  /**
   * 닫을 때 포커스를 돌려줄 곳 — 누른 사진 버튼. 없으면 열기 직전에 포커스가 있던 요소다.
   * macOS Safari 는 버튼을 눌러도 포커스를 주지 않아 activeElement 로는 누른 사진을 못 찾는다.
   */
  returnFocusRef?: RefObject<HTMLElement | null>
}

const TABLET_UP = '@media (min-width: 480px)'

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

/*
  어두운 바탕은 --color-overlay(0.5)를 세 겹 쌓는다 — 1 − 0.5³ = 0.875 로 DESIGN.md §2 Overlay Scrim
  범위(0.5~0.91) 안이다. 0.5 한 겹은 사진 뒤로 본문 글자가 비쳐 사진을 보는 화면이 되지 못하고,
  새 색 토큰은 만들지 않는다.
  z-index 1000 은 시트·신고 다이얼로그와 같은 층(토스트 1200 아래). 이 화면의 모달은 한 번에 하나만
  열린다 — 라이트박스는 본문 사진에서만 열리고, 열려 있는 동안 다른 모달 트리거는 가려져 있다.
*/
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
    env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
  background:
    linear-gradient(var(--color-overlay), var(--color-overlay)),
    linear-gradient(var(--color-overlay), var(--color-overlay)),
    var(--color-overlay);
  color: var(--color-surface);
  animation: ${fadeIn} var(--motion-standard) var(--ease-enter);

  /* 다이얼로그 자체는 포커스가 갈 곳을 잃었을 때의 받침이다 — 화면 전체에 링을 두르지 않는다. */
  &:focus {
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const TopBar = styled.div`
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 8px 8px 20px;
`

const Counter = styled.p`
  font-size: 14px;
  font-weight: 600;
  line-height: 1.57;
  font-variant-numeric: tabular-nums;
`

const iconButtonBase = css`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-pill);
  color: var(--color-surface);
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);

  svg {
    flex: 0 0 auto;
  }
`

const CloseButton = styled.button`
  ${iconButtonBase}
  width: 44px;
  height: 44px;
  background: transparent;

  &:hover {
    background: var(--color-overlay);
  }
`

/*
  사진은 비율을 지킨 채(contain) 남은 칸을 채운다. 세로 이동과 핀치 확대는 브라우저에 맡기고
  가로 이동만 포인터 이벤트로 받는다(touch-action) — 가로 팬을 브라우저가 가져가면 pointercancel 로
  스와이프가 끊긴다. `≥480` 은 좌우 64 를 비워 이전/다음 버튼이 사진을 덮지 않게 한다.
*/
const Stage = styled.div`
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 16px;
  touch-action: pan-y pinch-zoom;
  user-select: none;

  ${TABLET_UP} {
    padding: 0 64px 24px;
  }
`

const Photo = styled.img`
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  animation: ${fadeIn} var(--motion-fast) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/*
  이전/다음은 화면 세로 가운데 양끝. 밝은 사진 위에서도 보이게 바탕을 한 겹 깐다.
  끝에서는 `disabled` 대신 `aria-disabled` 다 — 누른 버튼이 비활성이 되는 순간 포커스가 body 로
  떨어져 키보드 사용자가 다이얼로그를 잃는다.
*/
const NavButton = styled.button<{ $side: 'previous' | 'next' }>`
  ${iconButtonBase}
  position: absolute;
  top: 50%;
  ${props => (props.$side === 'previous' ? 'left: 8px;' : 'right: 8px;')}
  width: 48px;
  height: 48px;
  background: var(--color-overlay);
  transform: translateY(-50%);

  &[aria-disabled='true'] {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

/**
 * 상세 본문 사진의 전체 화면 보기(community.md §S4 4단계 「사진 보기」, CM-041).
 *
 * 포커스 가두기·Esc·←/→·좌우 스와이프·포커스 복귀·body 스크롤 잠금을 맡는다. 가두기 셀렉터는
 * 시트·신고 다이얼로그와 같은 `dialog-focus` 다. 사진이 하나면 이전/다음을 그리지 않는다.
 */
export default function CommunityImageLightbox({
  open,
  ...props
}: CommunityImageLightboxProps) {
  if (!open || props.images.length === 0) {
    return null
  }

  return <CommunityImageLightboxContent {...props} />
}

function CommunityImageLightboxContent({
  images,
  index,
  onIndexChange,
  onClose,
  returnFocusRef,
}: Omit<CommunityImageLightboxProps, 'open'>) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const pointerStartRef = useRef<{ id: number; x: number; y: number } | null>(
    null,
  )
  const count = images.length
  const current = Math.min(Math.max(index, 0), count - 1)
  const hasMany = count > 1
  const atStart = current === 0
  const atEnd = current === count - 1

  /*
    열 때 저장하고 닫을 때 되돌린다(시트·신고 다이얼로그와 같은 방식). 이 화면에서 모달은 동시에
    둘 열리지 않는다는 전제다 — 둘이 겹쳐 닫히는 순서가 바뀌면 먼저 닫힌 쪽이 잠금을 풀어 버린다.
  */
  useEffect(() => {
    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const returnTarget = returnFocusRef?.current ?? previousActiveElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    closeRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      returnTarget?.focus()
    }
  }, [returnFocusRef])

  /*
    키보드는 document 에서 받는다. 다이얼로그에 onKeyDown 을 걸면 포커스가 body 로 떨어졌을 때
    (사진을 마우스로 누른 뒤 등) ←/→/Esc 가 먹지 않고, Tab 이 뒤 페이지로 빠진다.
  */
  useEffect(() => {
    const go = (step: number) => {
      const next = stepPhotoIndex(current, step, count)

      if (next !== current) {
        onIndexChange(next)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current

      if (!dialog) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault()
        go(event.key === 'ArrowRight' ? 1 : -1)
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = getDialogFocusableElements(dialog)
      const targetIndex = getDialogFocusTargetIndex(
        focusable.length,
        focusable.indexOf(document.activeElement as HTMLElement),
        event.shiftKey ? 'backward' : 'forward',
      )

      event.preventDefault()
      if (targetIndex === null) {
        dialog.focus()
        return
      }

      focusable[targetIndex]?.focus()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [count, current, onClose, onIndexChange])

  const step = (delta: number) => {
    const next = stepPhotoIndex(current, delta, count)

    if (next !== current) {
      onIndexChange(next)
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) {
      return
    }

    pointerStartRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current
    pointerStartRef.current = null

    if (!start || start.id !== event.pointerId || !hasMany) {
      return
    }

    const delta = getPhotoSwipeStep(
      event.clientX - start.x,
      event.clientY - start.y,
    )

    if (delta !== 0) {
      step(delta)
    }
  }

  const handlePointerCancel = () => {
    pointerStartRef.current = null
  }

  const lightbox = (
    <Overlay
      ref={dialogRef}
      aria-label="사진 크게 보기"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
      data-community-lightbox="true"
    >
      <TopBar>
        <Counter aria-atomic="true" aria-live="polite">
          {formatPhotoPosition(current, count)}
        </Counter>
        <CloseButton
          ref={closeRef}
          aria-label="닫기"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={24} />
        </CloseButton>
      </TopBar>
      <Stage
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/*
          MinIO 공개 URL 이라 `next/image` 최적화 대상이 아니다(본문 사진과 같은 이유).
          `key` 로 장이 바뀔 때마다 새로 그려 짧게 페이드한다 — 줄인 모션이면 바로 바뀐다.
        */}
        <Photo
          key={current}
          alt={`첨부 이미지 ${current + 1}`}
          draggable={false}
          src={images[current]}
        />
      </Stage>
      {hasMany ? (
        <>
          <NavButton
            $side="previous"
            aria-disabled={atStart}
            aria-label="이전 사진"
            onClick={() => step(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={24} />
          </NavButton>
          <NavButton
            $side="next"
            aria-disabled={atEnd}
            aria-label="다음 사진"
            onClick={() => step(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={24} />
          </NavButton>
        </>
      ) : null}
    </Overlay>
  )

  /*
    body 로 포털을 띄운다(시트와 같은 이유 — sticky 레일·하단 바의 쌓임 맥락에 갇히지 않게).
    서버 렌더(테스트의 renderToStaticMarkup)에는 document 가 없으니 그때만 제자리에 그린다.
  */
  return typeof document === 'undefined'
    ? lightbox
    : createPortal(lightbox, document.body)
}
