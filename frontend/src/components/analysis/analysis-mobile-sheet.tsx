'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type PropsWithChildren,
  type ReactNode,
} from 'react'
import { ChevronLeft, Sparkles } from 'lucide-react'
import styled from 'styled-components'

import {
  ANALYSIS_SHEET_COLLAPSED_HEIGHT,
  ANALYSIS_SHEET_EXPANDED_RATIO,
  ANALYSIS_SHEET_MINIMUM_MAP_HEIGHT,
  didAnalysisSheetDrag,
  getAnalysisSheetHeightBounds,
  resolveAnalysisSheetSnapFromDrag,
  resolveAnalysisSheetViewportHeight,
  shouldSuppressAnalysisSheetClick,
  type AnalysisSheetSnap,
} from '@/lib/analysis/analysis-sheet-state'

export type AnalysisMobileSheetProps = PropsWithChildren<{
  stepLabel: string
  summary: string
  /** 현재 선택 레벨의 AI 리포트. 있으면 진입 칩과 리포트 뷰를 노출한다. */
  aiReport?: { title: string; content: ReactNode } | null
  /**
   * 값이 바뀔 때마다 시트를 펼친다(예: 지도에서 상권 선택 → 업종 선택 유도).
   * 부모가 증가시키는 카운터를 넘긴다. 마운트 시엔 펼치지 않는다.
   */
  expandSignal?: number
}>

type SheetView = 'selection' | 'report'

type DragVisualState = {
  deltaY: number
  startSnap: AnalysisSheetSnap
}

const Sheet = styled.section<{
  $dragDeltaY: number
  $isDragging: boolean
  $snap: AnalysisSheetSnap
}>`
  --analysis-sheet-collapsed-height: ${ANALYSIS_SHEET_COLLAPSED_HEIGHT}px;
  --analysis-sheet-expanded-height: max(
    ${ANALYSIS_SHEET_COLLAPSED_HEIGHT}px,
    min(
      ${ANALYSIS_SHEET_EXPANDED_RATIO * 100}%,
      calc(100% - ${ANALYSIS_SHEET_MINIMUM_MAP_HEIGHT}px)
    )
  );

  position: absolute;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  height: ${props => `clamp(
    var(--analysis-sheet-collapsed-height),
    calc(
      ${
        props.$snap === 'expanded'
          ? 'var(--analysis-sheet-expanded-height)'
          : 'var(--analysis-sheet-collapsed-height)'
      } - ${props.$dragDeltaY}px
    ),
    var(--analysis-sheet-expanded-height)
  )`};
  display: grid;
  grid-template-rows: var(--analysis-sheet-collapsed-height) minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--color-border-200);
  border-bottom: 0;
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  background: var(--color-surface);
  box-shadow: var(--shadow-level-4);
  transition: ${props =>
    props.$isDragging
      ? 'none'
      : 'height var(--motion-standard) var(--ease-standard)'};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const HandleRow = styled.div`
  position: relative;
  height: var(--analysis-sheet-collapsed-height);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px max(8px, env(safe-area-inset-bottom));

  &::before {
    position: absolute;
    top: 7px;
    left: 50%;
    width: 40px;
    height: 4px;
    border-radius: var(--radius-pill);
    background: var(--color-border-300);
    content: '';
    transform: translateX(-50%);
  }
`

const HandleToggle = styled.button`
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  color: var(--color-text-900);
  padding: 0;
  text-align: left;
  cursor: ns-resize;
  touch-action: none;
  user-select: none;
`

const HandleCopy = styled.span`
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 2px;

  strong {
    font-size: 14px;
    font-weight: 700;
  }

  small {
    overflow: hidden;
    color: var(--color-text-caption);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const AiChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-700);
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  svg {
    width: 14px;
    height: 14px;
    color: var(--color-text-600);
  }

  &:hover,
  &:focus-visible {
    background: var(--color-surface);
    color: var(--color-text-900);
    outline: none;
  }
`

const Body = styled.div<{ $expanded: boolean }>`
  position: relative;
  min-height: 0;

  ${props =>
    !props.$expanded &&
    `
      visibility: hidden;
      pointer-events: none;
      overflow: hidden;
    `}
`

const Layer = styled.div<{ $active: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* legacy Edge */
  opacity: ${props => (props.$active ? 1 : 0)};
  visibility: ${props => (props.$active ? 'visible' : 'hidden')};
  pointer-events: ${props => (props.$active ? 'auto' : 'none')};
  transition: opacity var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &::-webkit-scrollbar {
    display: none;
  }

  > section {
    height: 100%;
  }
`

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-700);
  cursor: pointer;

  svg {
    width: 20px;
    height: 20px;
  }

  /* 프로그램 포커스 시 UA 기본 아웃라인(검은 테두리)이 뜨지 않게 함 */
  &:focus {
    outline: none;
  }
  &:hover,
  &:focus-visible {
    background: var(--color-surface-muted);
    color: var(--color-text-900);
  }
`

const ReportTitle = styled.strong`
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export default function AnalysisMobileSheet({
  stepLabel,
  summary,
  aiReport,
  expandSignal,
  children,
}: AnalysisMobileSheetProps) {
  const [snap, setSnap] = useState<AnalysisSheetSnap>('collapsed')
  const [view, setView] = useState<SheetView>('selection')
  const [dragVisualState, setDragVisualState] =
    useState<DragVisualState | null>(null)
  const bodyId = useId()

  // expandSignal이 바뀌면 시트를 펼친다(상권 선택 → 업종 선택 유도). 마운트 시엔
  // 펼치지 않고, 이후 사용자가 접으면 다음 신호 전까지 다시 올라오지 않는다.
  // (effect 대신 렌더 단계 파생 — report view 처리와 동일한 React 권장 패턴)
  const [prevExpandSignal, setPrevExpandSignal] = useState(expandSignal)
  if (expandSignal !== prevExpandSignal) {
    setPrevExpandSignal(expandSignal)
    if (expandSignal !== undefined) setSnap('expanded')
  }

  // 리포트가 사라지거나 다른 대상으로 바뀌면 선택 뷰로 되돌린다.
  // (effect 대신 렌더 단계 파생 — React 권장 패턴)
  const reportTitle = aiReport?.title ?? null
  const [prevReportTitle, setPrevReportTitle] = useState(reportTitle)
  if (reportTitle !== prevReportTitle) {
    setPrevReportTitle(reportTitle)
    if (view === 'report') setView('selection')
  }
  // 리포트가 없으면 항상 선택 뷰. 리포트 본문은 리포트 뷰일 때만 마운트해
  // 배경에서 SSE/쿼리가 조기 실행되는 것을 막는다.
  const effectiveView: SheetView = aiReport ? view : 'selection'

  const sheetRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const pointerIdRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const startSnapRef = useRef<AnalysisSheetSnap | null>(null)
  const dragBoundsRef = useRef<{
    collapsedHeight: number
    expandedHeight: number
  } | null>(null)
  const didDragRef = useRef(false)
  const suppressClickRef = useRef(false)

  const isExpanded = snap === 'expanded'

  // 리포트 진입 시 back 버튼으로 포커스를 옮겨 키보드/스크린리더 흐름을 잇는다.
  useEffect(() => {
    if (effectiveView === 'report')
      backButtonRef.current?.focus({ preventScroll: true })
  }, [effectiveView])

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
    // 시트는 display:contents 래퍼(MobilePanel) 안에 있어 parentElement.clientHeight가 0이다.
    // 절대배치된 시트의 offsetParent(=위치지정 조상 MapArea)가 실제 지도 영역 높이를 가지므로
    // 이를 우선 사용하고, 없으면 parentElement/innerHeight로 폴백한다.
    const offsetParent = sheetRef.current?.offsetParent
    const viewportHeight = resolveAnalysisSheetViewportHeight(
      offsetParent instanceof HTMLElement ? offsetParent.clientHeight : null,
      sheetRef.current?.parentElement?.clientHeight,
      typeof window === 'undefined' ? null : window.innerHeight,
    )

    pointerIdRef.current = event.pointerId
    startYRef.current = event.clientY
    startSnapRef.current = snap
    dragBoundsRef.current = getAnalysisSheetHeightBounds(viewportHeight)
    didDragRef.current = false
    suppressClickRef.current = false
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

    const deltaY = event.clientY - startYRef.current
    didDragRef.current = didDragRef.current || didAnalysisSheetDrag(deltaY)
    setDragVisualState({ deltaY, startSnap: startSnapRef.current })
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

    const nextSnap = resolveAnalysisSheetSnapFromDrag(
      startSnap,
      event.clientY - startY,
      bounds.collapsedHeight,
      bounds.expandedHeight,
    )
    suppressClickRef.current = didDragRef.current
    clearPointerState()

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (nextSnap !== startSnap) setSnap(nextSnap)
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== event.pointerId) return
    suppressClickRef.current = false
    clearPointerState()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleLostPointerCapture = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (pointerIdRef.current !== event.pointerId) return
    suppressClickRef.current = suppressClickRef.current || didDragRef.current
    clearPointerState()
  }

  const handleToggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (
      shouldSuppressAnalysisSheetClick(suppressClickRef.current, event.detail)
    ) {
      suppressClickRef.current = false
      return
    }
    suppressClickRef.current = false
    setSnap(current => (current === 'collapsed' ? 'expanded' : 'collapsed'))
  }

  const openReport = () => {
    setView('report')
    setSnap('expanded')
  }

  const isDraggingCurrentSnap =
    dragVisualState !== null && dragVisualState.startSnap === snap

  return (
    <Sheet
      ref={sheetRef}
      $dragDeltaY={isDraggingCurrentSnap ? dragVisualState.deltaY : 0}
      $isDragging={isDraggingCurrentSnap}
      $snap={snap}
      aria-label="분석 대상 선택"
      data-sheet-snap={snap}
    >
      <HandleRow>
        {aiReport && effectiveView === 'report' ? (
          <BackButton
            ref={backButtonRef}
            type="button"
            aria-label="선택으로 돌아가기"
            onClick={() => setView('selection')}
          >
            <ChevronLeft aria-hidden />
          </BackButton>
        ) : null}
        <HandleToggle
          ref={toggleRef}
          type="button"
          aria-controls={bodyId}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? '선택 패널 접기' : '선택 패널 펼치기'}
          onClick={handleToggle}
          onLostPointerCapture={handleLostPointerCapture}
          onPointerCancel={handlePointerCancel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {aiReport && effectiveView === 'report' ? (
            <ReportTitle>{aiReport.title}</ReportTitle>
          ) : (
            <HandleCopy>
              <strong>{stepLabel}</strong>
              <small>{summary}</small>
            </HandleCopy>
          )}
        </HandleToggle>
        {aiReport && effectiveView === 'selection' ? (
          <AiChip
            type="button"
            aria-label="AI 리포트 보기"
            onClick={openReport}
          >
            <Sparkles aria-hidden />
            AI 리포트
          </AiChip>
        ) : null}
      </HandleRow>

      <Body id={bodyId} $expanded={isExpanded} aria-hidden={!isExpanded}>
        <Layer
          $active={effectiveView === 'selection'}
          aria-hidden={effectiveView !== 'selection'}
          inert={effectiveView !== 'selection' || undefined}
        >
          {children}
        </Layer>
        <Layer
          $active={effectiveView === 'report'}
          aria-hidden={effectiveView !== 'report'}
          inert={effectiveView !== 'report' || undefined}
        >
          {aiReport && effectiveView === 'report' ? aiReport.content : null}
        </Layer>
      </Body>
    </Sheet>
  )
}
