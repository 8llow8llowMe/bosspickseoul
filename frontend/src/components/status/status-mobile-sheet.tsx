'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import styled from 'styled-components'
import {
  getNextSheetSnap,
  resolveSheetSnapFromDrag,
  type StatusSheetSnap,
} from '@/lib/status/status-state'
import type {
  DistrictDetail,
  StatusMetric,
  StatusRankedItem,
} from '@/types/status'
import StatusDetail from './status-detail'
import StatusTopTen from './status-top-ten'

type StatusMobileSheetProps = {
  metric: StatusMetric
  items: StatusRankedItem[]
  selectedItem: StatusRankedItem | null
  detail: DistrictDetail | null
  isDetailLoading: boolean
  detailErrorMessage: string | null
  snap: StatusSheetSnap
  onSnapChange: (snap: StatusSheetSnap) => void
  onSelect: (districtCode: string) => void
  onBackToTopTen: () => void
  onRetryDetail: () => void
}

const DRAG_THRESHOLD = 48
const CLICK_DRAG_TOLERANCE = 4

const Sheet = styled.section<{
  $dragDeltaY: number
  $isDragging: boolean
  $snap: StatusSheetSnap
}>`
  --status-sheet-collapsed-height: max(0px, min(46dvh, calc(100dvh - 180px)));
  --status-sheet-expanded-height: max(0px, min(72dvh, calc(100dvh - 180px)));

  position: fixed;
  z-index: 10;
  right: 0;
  bottom: 0;
  left: 0;
  height: clamp(
    var(--status-sheet-collapsed-height),
    calc(
      ${props =>
          props.$snap === 'expanded'
            ? 'var(--status-sheet-expanded-height)'
            : 'var(--status-sheet-collapsed-height)'} -
        ${props => props.$dragDeltaY}px
    ),
    var(--status-sheet-expanded-height)
  );
  max-height: var(--status-sheet-expanded-height);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--color-border-200);
  border-bottom: 0;
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  background: var(--color-surface);
  box-shadow: var(--shadow-level-3);
  transition: ${props =>
    props.$isDragging
      ? 'none'
      : 'height var(--motion-standard) var(--ease-standard)'};

  @media (min-width: 1024px) {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const HandleButton = styled.button`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: var(--color-surface);
  cursor: ns-resize;
  touch-action: none;
  user-select: none;
`

const HandleIndicator = styled.span`
  width: 40px;
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--color-border-300);
  pointer-events: none;
`

const SheetBody = styled.div`
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 16px calc(20px + env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
`

const BackButton = styled.button`
  min-height: 44px;
  justify-self: start;
  padding: 0 14px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-800);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-text-900);
  }
`

export default function StatusMobileSheet({
  metric,
  items,
  selectedItem,
  detail,
  isDetailLoading,
  detailErrorMessage,
  snap,
  onSnapChange,
  onSelect,
  onBackToTopTen,
  onRetryDetail,
}: StatusMobileSheetProps) {
  const bodyId = useId()
  const [dragDeltaY, setDragDeltaY] = useState<number | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const startSnapRef = useRef<StatusSheetSnap | null>(null)
  const didDragRef = useRef(false)
  const suppressPointerClickRef = useRef(false)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const wasShowingDetailRef = useRef(false)
  const isShowingDetail = selectedItem !== null

  useEffect(() => {
    if (isShowingDetail && !wasShowingDetailRef.current) {
      backButtonRef.current?.focus()
    }

    wasShowingDetailRef.current = isShowingDetail
  }, [isShowingDetail])

  const clearPointerState = () => {
    pointerIdRef.current = null
    startYRef.current = null
    startSnapRef.current = null
    didDragRef.current = false
    setDragDeltaY(null)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (
      !event.isPrimary ||
      pointerIdRef.current !== null ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    pointerIdRef.current = event.pointerId
    startYRef.current = event.clientY
    startSnapRef.current = snap
    didDragRef.current = false
    suppressPointerClickRef.current = false
    setDragDeltaY(0)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (
      pointerIdRef.current !== event.pointerId ||
      startYRef.current === null
    ) {
      return
    }

    const nextDeltaY = event.clientY - startYRef.current
    didDragRef.current =
      didDragRef.current || Math.abs(nextDeltaY) > CLICK_DRAG_TOLERANCE
    setDragDeltaY(nextDeltaY)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const startY = startYRef.current
    const startSnap = startSnapRef.current

    if (
      pointerIdRef.current !== event.pointerId ||
      startY === null ||
      startSnap === null
    ) {
      return
    }

    const nextSnap = resolveSheetSnapFromDrag(
      startSnap,
      event.clientY - startY,
      DRAG_THRESHOLD,
    )
    suppressPointerClickRef.current = didDragRef.current
    clearPointerState()

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (nextSnap !== startSnap) {
      onSnapChange(nextSnap)
    }
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return
    }

    suppressPointerClickRef.current = false
    clearPointerState()

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleLostPointerCapture = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (pointerIdRef.current === event.pointerId) {
      suppressPointerClickRef.current = didDragRef.current
      clearPointerState()
    }
  }

  const handleToggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (suppressPointerClickRef.current && event.detail !== 0) {
      suppressPointerClickRef.current = false
      return
    }

    suppressPointerClickRef.current = false
    onSnapChange(
      getNextSheetSnap(snap, snap === 'collapsed' ? 'expand' : 'collapse'),
    )
  }

  return (
    <Sheet
      $dragDeltaY={dragDeltaY ?? 0}
      $isDragging={dragDeltaY !== null}
      $snap={snap}
      aria-label="구별 현황"
    >
      <HandleButton
        aria-controls={bodyId}
        aria-expanded={snap === 'expanded'}
        aria-label={
          snap === 'collapsed'
            ? '구별 현황 바텀시트 펼치기'
            : '구별 현황 바텀시트 접기'
        }
        type="button"
        onClick={handleToggle}
        onLostPointerCapture={handleLostPointerCapture}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <HandleIndicator aria-hidden="true" />
      </HandleButton>

      <SheetBody id={bodyId}>
        {selectedItem ? (
          <>
            <BackButton
              ref={backButtonRef}
              type="button"
              onClick={onBackToTopTen}
            >
              Top 10으로 돌아가기
            </BackButton>
            <StatusDetail
              detail={detail}
              errorMessage={detailErrorMessage}
              isLoading={isDetailLoading}
              metric={metric}
              selectedItem={selectedItem}
              onRetry={onRetryDetail}
            />
          </>
        ) : (
          <StatusTopTen
            items={items}
            metric={metric}
            selectedDistrictCode={null}
            onSelect={onSelect}
          />
        )}
      </SheetBody>
    </Sheet>
  )
}
