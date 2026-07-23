'use client'

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import styled from 'styled-components'
import {
  applyStatusSheetContentTransition,
  getStatusSheetHeightBounds,
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

const CLICK_DRAG_TOLERANCE = 4

type DragVisualState = {
  deltaY: number
  startSnap: StatusSheetSnap
}

const Sheet = styled.section<{
  $dragDeltaY: number
  $isDragging: boolean
  $snap: StatusSheetSnap
}>`
  --status-sheet-collapsed-height: 52px;
  --status-sheet-expanded-height: max(52px, min(66%, calc(100% - 180px)));

  position: absolute;
  z-index: 10;
  right: 0;
  bottom: 0;
  left: 0;
  height: ${props => `clamp(
    var(--status-sheet-collapsed-height),
    calc(
      ${
        props.$snap === 'expanded'
          ? 'var(--status-sheet-expanded-height)'
          : 'var(--status-sheet-collapsed-height)'
      } - ${props.$dragDeltaY}px
    ),
    var(--status-sheet-expanded-height)
  )`};
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
  height: 52px;
  min-height: 52px;
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

const SheetBody = styled.div<{ $isExpanded: boolean }>`
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 16px calc(20px + env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;

  ${props =>
    !props.$isExpanded &&
    `
      visibility: hidden;
      pointer-events: none;
      overflow: hidden;
    `}
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
  const [dragVisualState, setDragVisualState] =
    useState<DragVisualState | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const startSnapRef = useRef<StatusSheetSnap | null>(null)
  const dragBoundsRef = useRef<ReturnType<
    typeof getStatusSheetHeightBounds
  > | null>(null)
  const didDragRef = useRef(false)
  const suppressPointerClickRef = useRef(false)
  const sheetRef = useRef<HTMLElement>(null)
  const sheetBodyRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const previousDetailStateRef = useRef<boolean | null>(null)
  const isShowingDetail = selectedItem !== null

  useLayoutEffect(() => {
    const previousDetailState = previousDetailStateRef.current

    if (previousDetailState === null) {
      previousDetailStateRef.current = isShowingDetail
      return
    }

    if (previousDetailState === isShowingDetail) {
      return
    }

    applyStatusSheetContentTransition({
      body: sheetBodyRef.current,
      backButton: backButtonRef.current,
      handle: handleRef.current,
      isShowingDetail,
    })

    previousDetailStateRef.current = isShowingDetail
  }, [isShowingDetail])

  useEffect(() => {
    const pointerId = pointerIdRef.current
    const startSnap = startSnapRef.current

    if (pointerId === null || startSnap === null || snap === startSnap) {
      return
    }

    const handle = handleRef.current
    suppressPointerClickRef.current = true

    if (handle?.hasPointerCapture(pointerId)) {
      handle.releasePointerCapture(pointerId)
      return
    }

    pointerIdRef.current = null
    startYRef.current = null
    startSnapRef.current = null
    dragBoundsRef.current = null
    didDragRef.current = false
    queueMicrotask(() => setDragVisualState(null))
  }, [snap])

  const clearPointerState = () => {
    pointerIdRef.current = null
    startYRef.current = null
    startSnapRef.current = null
    dragBoundsRef.current = null
    didDragRef.current = false
    setDragVisualState(null)
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
    const statusViewportHeight = sheetRef.current?.parentElement?.clientHeight

    pointerIdRef.current = event.pointerId
    startYRef.current = event.clientY
    startSnapRef.current = snap
    dragBoundsRef.current = getStatusSheetHeightBounds(
      statusViewportHeight ?? 0,
    )
    didDragRef.current = false
    suppressPointerClickRef.current = false
    setDragVisualState({ deltaY: 0, startSnap: snap })
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (
      pointerIdRef.current !== event.pointerId ||
      startYRef.current === null ||
      startSnapRef.current === null
    ) {
      return
    }

    const nextDeltaY = event.clientY - startYRef.current
    didDragRef.current =
      didDragRef.current || Math.abs(nextDeltaY) > CLICK_DRAG_TOLERANCE
    setDragVisualState({
      deltaY: nextDeltaY,
      startSnap: startSnapRef.current,
    })
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const startY = startYRef.current
    const startSnap = startSnapRef.current
    const bounds = dragBoundsRef.current

    if (
      pointerIdRef.current !== event.pointerId ||
      startY === null ||
      startSnap === null ||
      bounds === null
    ) {
      return
    }

    const nextSnap = resolveSheetSnapFromDrag(
      startSnap,
      event.clientY - startY,
      bounds.collapsedHeight,
      bounds.expandedHeight,
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
      suppressPointerClickRef.current =
        suppressPointerClickRef.current || didDragRef.current
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

  const isDraggingCurrentSnap =
    dragVisualState !== null && dragVisualState.startSnap === snap

  return (
    <Sheet
      ref={sheetRef}
      $dragDeltaY={isDraggingCurrentSnap ? dragVisualState.deltaY : 0}
      $isDragging={isDraggingCurrentSnap}
      $snap={snap}
      aria-label="구별 현황"
    >
      <HandleButton
        ref={handleRef}
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

      <SheetBody
        ref={sheetBodyRef}
        id={bodyId}
        $isExpanded={snap === 'expanded'}
        aria-hidden={snap === 'collapsed'}
        aria-label={
          selectedItem ? '선택 지역 상세' : '구별 상권 상위 10개 목록'
        }
        inert={snap === 'collapsed' || undefined}
        role="region"
      >
        {selectedItem ? (
          <>
            <BackButton
              ref={backButtonRef}
              type="button"
              onClick={onBackToTopTen}
            >
              상위 10개로 돌아가기
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
