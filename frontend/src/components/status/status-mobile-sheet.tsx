'use client'

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import styled, { css } from 'styled-components'
import type { NormalizedApiError } from '@/lib/api/api-error'
import {
  applyStatusSheetContentTransition,
  getNextSheetSnap,
  getStatusSheetHeightBounds,
  getToggledSheetSnap,
  resolveSheetSnapFromDrag,
  STATUS_SHEET_COLLAPSED_HEIGHT,
  STATUS_SHEET_EXPANDED_RATIO,
  STATUS_SHEET_FULL_TOP_GAP,
  STATUS_SHEET_MINIMUM_MAP_HEIGHT,
  type StatusSheetSnap,
} from '@/lib/status/status-state'
import type {
  DistrictDetail,
  StatusMetric,
  StatusRankedItem,
  StatusSelectedDistrict,
} from '@/types/status'
import StatusDetail from './status-detail'
import StatusTopTen from './status-top-ten'

type StatusMobileSheetProps = {
  metric: StatusMetric
  periodCode: string
  /**
   * 분기를 바꾸는 중이라 목록이 직전 분기 응답을 자리 표시로 들고 있다(status.md 1.6).
   * 목록일 때만 흐리게 둔다 — 상세는 자기 스켈레톤이 있다.
   */
  isPeriodPending?: boolean
  items: StatusRankedItem[]
  selectedDistrict: StatusSelectedDistrict | null
  detail: DistrictDetail | null
  isDetailLoading: boolean
  detailError: NormalizedApiError | null
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

/**
 * 시트 세 단계의 높이 식(`getStatusSheetHeightBounds` 의 CSS 판). `%` 는 쓰는 자리의 기준
 * 상자(무대)를 따르므로, 시트와 무대(지도 층의 아래 끝)가 이 한 정의를 나눠 쓴다.
 */
export const statusSheetHeightVars = css`
  --status-sheet-collapsed-height: ${STATUS_SHEET_COLLAPSED_HEIGHT}px;
  --status-sheet-expanded-height: max(
    ${STATUS_SHEET_COLLAPSED_HEIGHT}px,
    min(
      ${STATUS_SHEET_EXPANDED_RATIO * 100}%,
      calc(100% - ${STATUS_SHEET_MINIMUM_MAP_HEIGHT}px)
    )
  );
  --status-sheet-full-height: max(
    var(--status-sheet-expanded-height),
    calc(100% - ${STATUS_SHEET_FULL_TOP_GAP}px)
  );
`

export const STATUS_SHEET_HEIGHT_VAR: Record<StatusSheetSnap, string> = {
  collapsed: 'var(--status-sheet-collapsed-height)',
  expanded: 'var(--status-sheet-expanded-height)',
  full: 'var(--status-sheet-full-height)',
}

const Sheet = styled.section<{
  $dragDeltaY: number
  $isDragging: boolean
  $snap: StatusSheetSnap
}>`
  ${statusSheetHeightVars}

  position: absolute;
  z-index: 10;
  right: 0;
  bottom: 0;
  left: 0;
  height: ${props => `clamp(
    var(--status-sheet-collapsed-height),
    calc(${STATUS_SHEET_HEIGHT_VAR[props.$snap]} - ${props.$dragDeltaY}px),
    var(--status-sheet-full-height)
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
  height: calc(var(--status-sheet-collapsed-height) - 1px);
  min-height: calc(var(--status-sheet-collapsed-height) - 1px);
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
  grid-auto-rows: max-content;
  align-content: start;
  gap: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 16px calc(20px + env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  transition: opacity var(--motion-fast) var(--ease-standard);

  &::-webkit-scrollbar {
    display: none;
  }

  &[aria-busy='true'] {
    opacity: 0.6;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  ${props =>
    !props.$isExpanded &&
    `
      visibility: hidden;
      pointer-events: none;
      overflow: hidden;
    `}
`

export default function StatusMobileSheet({
  metric,
  periodCode,
  isPeriodPending = false,
  items,
  selectedDistrict,
  detail,
  isDetailLoading,
  detailError,
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
  const isShowingDetail = selectedDistrict !== null

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

  /*
   * 상세 → 다른 구 상세로 곧장 옮기면 위 전환(목록 ↔ 상세)이 일어나지 않아 스크롤이
   * 이전 구의 깊이에 남는다. 25개 폴리곤이 모두 눌리게 된 뒤로 흔한 경로라, 구가
   * 바뀌면 본문을 맨 위로 되돌려 새 구의 머리부터 보이게 한다. 포커스는 건드리지 않는다.
   */
  const selectedDistrictCode = selectedDistrict?.districtCode ?? null
  const previousDistrictCodeRef = useRef(selectedDistrictCode)

  useLayoutEffect(() => {
    const previousDistrictCode = previousDistrictCodeRef.current
    previousDistrictCodeRef.current = selectedDistrictCode

    if (
      previousDistrictCode !== null &&
      selectedDistrictCode !== null &&
      previousDistrictCode !== selectedDistrictCode &&
      sheetBodyRef.current
    ) {
      sheetBodyRef.current.scrollTop = 0
    }
  }, [selectedDistrictCode])

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
      bounds,
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
    onSnapChange(getToggledSheetSnap(snap))
  }

  // 끌기의 대안(WCAG 2.5.7). 전체 단계는 끌어서만 가는 곳이라 키보드·스위치 사용자는
  // 손잡이에서 ↑/↓ 로 한 단계씩 움직인다.
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

    event.preventDefault()
    const nextSnap = getNextSheetSnap(
      snap,
      event.key === 'ArrowUp' ? 'expand' : 'collapse',
    )
    if (nextSnap !== snap) onSnapChange(nextSnap)
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
        aria-expanded={snap !== 'collapsed'}
        aria-keyshortcuts="ArrowUp ArrowDown"
        aria-label={
          snap === 'collapsed'
            ? '구별 현황 바텀시트 펼치기'
            : '구별 현황 바텀시트 접기'
        }
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
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
        $isExpanded={snap !== 'collapsed'}
        aria-busy={(isPeriodPending && !selectedDistrict) || undefined}
        aria-hidden={snap === 'collapsed'}
        aria-label={
          selectedDistrict ? '선택 지역 상세' : '구별 상권 상위 10개 목록'
        }
        inert={snap === 'collapsed' || undefined}
        role="region"
      >
        {selectedDistrict ? (
          <StatusDetail
            backButtonRef={backButtonRef}
            detail={detail}
            error={detailError}
            isLoading={isDetailLoading}
            metric={metric}
            periodCode={periodCode}
            selectedDistrict={selectedDistrict}
            variant="sheet"
            onBack={onBackToTopTen}
            onRetry={onRetryDetail}
          />
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
