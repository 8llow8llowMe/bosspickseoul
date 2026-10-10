'use client'

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type PropsWithChildren,
} from 'react'
import styled from 'styled-components'

import {
  BOTTOM_SHEET_COLLAPSED_HEIGHT,
  BOTTOM_SHEET_EXPANDED_RATIO,
  BOTTOM_SHEET_MINIMUM_MAP_HEIGHT,
  didBottomSheetDrag,
  getBottomSheetHeightBounds,
  resolveBottomSheetSnapFromDrag,
  resolveBottomSheetViewportHeight,
  shouldSuppressBottomSheetClick,
} from '@/lib/map/bottom-sheet-state'
import type {
  RecommendationSheetSnap,
  RecommendationView,
} from '@/lib/recommend/recommend-state'

export type { RecommendationSheetSnap } from '@/lib/recommend/recommend-state'

/**
 * 시트의 규격·스냅 판정은 **`lib/map/bottom-sheet-state` 가 정본이다.** 이 파일이
 * 자기 복사본을 들고 있던 동안 분석 시트와 접힘 높이(44 vs 72px)·판정이 어긋났다
 * (ux-followups C). 남은 것은 포인터 캡처·포커스 복원처럼 이 시트만 쓰는 배관이다.
 */
export type RecommendationSheetBounds = {
  collapsedHeight: number
  expandedHeight: number
}

type RecommendationPointerStartInput = {
  isPrimary: boolean
  hasActivePointer: boolean
  pointerType: string
  button: number
}

type RecommendationPointerCaptureTarget = {
  setPointerCapture?: (pointerId: number) => void
  hasPointerCapture?: (pointerId: number) => boolean
  releasePointerCapture?: (pointerId: number) => void
}

type RecommendationSheetFocusBody = {
  contains: (target: Node | null) => boolean
}

type RecommendationSheetFocusHandle = {
  focus: () => void
}

type DragVisualState = {
  deltaY: number
  startSnap: RecommendationSheetSnap
}

type PointerSample = {
  y: number
  time: number
}

export const getRecommendationSheetReleaseVelocity = (
  previousSample: PointerSample | null,
  currentY: number,
  currentTime: number,
  fallbackVelocity: number,
): number => {
  if (
    !previousSample ||
    !Number.isFinite(currentY) ||
    !Number.isFinite(currentTime)
  ) {
    return fallbackVelocity
  }

  const elapsed = currentTime - previousSample.time
  const distance = currentY - previousSample.y

  return elapsed > 0 && distance !== 0 ? distance / elapsed : fallbackVelocity
}

export const canStartRecommendationSheetPointer = ({
  isPrimary,
  hasActivePointer,
  pointerType,
  button,
}: RecommendationPointerStartInput): boolean =>
  isPrimary && !hasActivePointer && (pointerType !== 'mouse' || button === 0)

export const isRecommendationSheetInteractive = (
  view: RecommendationView,
): boolean => view === 'criteria' || view === 'picker' || view === 'results'

export const releaseRecommendationSheetPointerCapture = (
  target: RecommendationPointerCaptureTarget | null,
  pointerId: number,
): void => {
  if (typeof target?.releasePointerCapture !== 'function') {
    return
  }

  try {
    if (
      typeof target.hasPointerCapture === 'function' &&
      !target.hasPointerCapture(pointerId)
    ) {
      return
    }
  } catch {
    // A failing support check should not prevent a best-effort release.
  }

  try {
    target.releasePointerCapture(pointerId)
  } catch {
    // Pointer capture support differs across embedded browsers.
  }
}

export const tryCaptureRecommendationSheetPointer = (
  target: RecommendationPointerCaptureTarget | null,
  pointerId: number,
): boolean => {
  if (
    typeof target?.setPointerCapture !== 'function' ||
    typeof target.hasPointerCapture !== 'function' ||
    typeof target.releasePointerCapture !== 'function'
  ) {
    return false
  }

  try {
    target.setPointerCapture(pointerId)
    return target.hasPointerCapture(pointerId)
  } catch {
    releaseRecommendationSheetPointerCapture(target, pointerId)
    return false
  }
}

export const restoreRecommendationSheetHandleFocus = (
  body: RecommendationSheetFocusBody | null,
  handle: RecommendationSheetFocusHandle | null,
  activeElement: Node | null,
): boolean => {
  if (!body || !handle || !activeElement) {
    return false
  }

  try {
    if (!body.contains(activeElement)) {
      return false
    }

    handle.focus()
    return true
  } catch {
    return false
  }
}

export const selectRecommendationSheetFocusEffect = <EffectHook,>(
  hasWindow: boolean,
  layoutEffect: EffectHook,
  passiveEffect: EffectHook,
): EffectHook => (hasWindow ? layoutEffect : passiveEffect)

const useRecommendationSheetFocusEffect = selectRecommendationSheetFocusEffect(
  typeof window !== 'undefined',
  useLayoutEffect,
  useEffect,
)

/** 맞춤 높이를 재는 이펙트도 그리기 전에 돈다 — 펼침 높이로 한 번 그렸다가 줄어드는 깜빡임을 막는다. */
const useRecommendationSheetMeasureEffect = useRecommendationSheetFocusEffect

/** 시트 위 테두리(`border: 1px`). 높이는 테두리를 포함해 잰다. */
const SHEET_BORDER_TOP = 1

type RecommendationSheetContentBox = {
  /** 첫 자식의 위쪽 끝(px, 뷰포트 기준). */
  firstTop: number
  /** 마지막 자식의 아래쪽 끝(px, 뷰포트 기준). */
  lastBottom: number
  paddingTop: number
  paddingBottom: number
}

/**
 * 내용에 맞춘 시트 높이(손잡이 줄 + 내용 + 위 테두리). 내용 칸은 시트 높이만큼 늘어나 있어
 * `scrollHeight` 로는 내용 높이를 알 수 없다. 그래서 첫 자식 위부터 마지막 자식 아래까지를
 * 재고 칸의 위아래 여백을 더한다. 잴 수 없으면 `null` — 시트는 펼침 높이를 그대로 쓴다.
 */
export const resolveRecommendationSheetFitHeight = (
  box: RecommendationSheetContentBox | null,
): number | null => {
  if (!box) return null

  const contentHeight =
    box.lastBottom - box.firstTop + box.paddingTop + box.paddingBottom

  if (!Number.isFinite(contentHeight) || contentHeight <= 0) return null

  return Math.ceil(
    BOTTOM_SHEET_COLLAPSED_HEIGHT + SHEET_BORDER_TOP + contentHeight,
  )
}

const readRecommendationSheetContentBox = (
  content: HTMLElement,
): RecommendationSheetContentBox | null => {
  const first = content.firstElementChild
  const last = content.lastElementChild

  if (!first || !last) return null

  const style = window.getComputedStyle(content)

  return {
    firstTop: first.getBoundingClientRect().top,
    lastBottom: last.getBoundingClientRect().bottom,
    paddingTop: Number.parseFloat(style.paddingTop) || 0,
    paddingBottom: Number.parseFloat(style.paddingBottom) || 0,
  }
}

export const finishRecommendationSheetPointer = (
  startSnap: RecommendationSheetSnap,
  deltaY: number,
  velocityY: number,
  bounds: RecommendationSheetBounds,
  wasDragging = false,
) => ({
  nextSnap: resolveBottomSheetSnapFromDrag(
    startSnap,
    deltaY,
    bounds.collapsedHeight,
    bounds.expandedHeight,
    velocityY,
  ),
  suppressClick: wasDragging || didBottomSheetDrag(deltaY),
})

const Sheet = styled.section<{
  $dragDeltaY: number
  $fitHeight: number | null
  $isDragging: boolean
  $snap: RecommendationSheetSnap
}>`
  --recommend-sheet-collapsed-height: ${BOTTOM_SHEET_COLLAPSED_HEIGHT}px;
  /* 맞춤 높이가 있으면(조건 화면) 펼침 상한 안에서 내용만큼만 올라온다. */
  --recommend-sheet-expanded-height: max(
    ${BOTTOM_SHEET_COLLAPSED_HEIGHT}px,
    min(
      ${BOTTOM_SHEET_EXPANDED_RATIO * 100}%,
      calc(100% - ${BOTTOM_SHEET_MINIMUM_MAP_HEIGHT}px)
        ${props => (props.$fitHeight === null ? '' : `, ${props.$fitHeight}px`)}
    )
  );

  position: absolute;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  height: ${props => `clamp(
    var(--recommend-sheet-collapsed-height),
    calc(
      ${
        props.$snap === 'expanded'
          ? 'var(--recommend-sheet-expanded-height)'
          : 'var(--recommend-sheet-collapsed-height)'
      } - ${props.$dragDeltaY}px
    ),
    var(--recommend-sheet-expanded-height)
  )`};
  display: grid;
  grid-template-rows: var(--recommend-sheet-collapsed-height) minmax(0, 1fr);
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

/**
 * 손잡이 줄이 **접힘 높이 전체**다. 분석 시트와 같은 규격 — 잡이 막대를 위에 두고
 * 그 아래로 제목·요약 한 줄을 보여준다. 접었을 때 아무 내용도 안 보이면 시트가
 * 「닫힌 것」처럼 읽혀 다시 펼칠 단서가 막대뿐이 된다(ux-followups C-1).
 */
const HandleButton = styled.button<{ $isExpanded: boolean }>`
  position: relative;
  width: 100%;
  height: var(--recommend-sheet-collapsed-height);
  display: flex;
  align-items: center;
  gap: 10px;
  /* 접혔을 때는 이 줄이 화면 맨 아래라 홈 인디케이터를 피해야 한다. 펼치면
     아래쪽은 본문이 맡으므로 여백을 되돌린다. */
  padding: ${props =>
    props.$isExpanded
      ? '8px 16px'
      : '8px 16px max(8px, env(safe-area-inset-bottom))'};
  border: 0;
  background: var(--color-surface);
  color: var(--color-text-900);
  text-align: left;
  cursor: ns-resize;
  touch-action: none;
  user-select: none;

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

/*
 * 본문은 **스크롤하지 않는다.** 높이만 정하고 패널(`RecommendPanel`)이 그 높이를 다 채운다.
 * 스크롤은 단계마다 한 칸이 맡는다 — 조건·결과는 패널 `Content`, 선택 뷰는 피커 `Body`.
 * 분석 시트의 `Layer > section { height: 100% }` 와 같은 구조다.
 *
 * 예전에는 여기와 패널 `Content` 가 둘 다 스크롤 칸이었다(#647). 패널은 내용 높이만큼
 * 늘어나 스스로는 스크롤할 거리가 없는데 `overscroll-behavior: contain` 을 들고 있어,
 * 휠·터치 스크롤이 그 칸에서 멈추고 바깥(이 본문)으로 넘어오지 않았다. 목록 아래쪽을
 * 누를 수 없었던 이유다. 좌우 여백도 여기 16px + 패널 22px 로 두 번 들어가 있었다.
 */
const SheetBody = styled.div<{ $isExpanded: boolean }>`
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;

  ${props =>
    !props.$isExpanded &&
    `
      visibility: hidden;
      pointer-events: none;
    `}
`

type RecommendMobileSheetProps = PropsWithChildren<{
  snap: RecommendationSheetSnap
  view: RecommendationView
  /**
   * 펼친 시트를 **내용 높이에 맞춘다.** 조건 화면은 카드 하나라 펼침 높이(72%)를 다 쓰면
   * 아래가 절반쯤 비고 지도만 가린다. 그래서 처음에는 낮게 열고, 선택 목록·결과처럼 긴
   * 화면으로 넘어갈 때 시트가 더 올라온다. 내용이 펼침 상한보다 길면 상한에서 멈추고 스크롤한다.
   */
  fitContent?: boolean
  /** 접힘 높이에 보이는 첫 줄. `resolveRecommendSheetHeadline` 이 정한다. */
  title: string
  summary: string
  onSnapChange: (snap: RecommendationSheetSnap) => void
}>

export default function RecommendMobileSheet({
  snap,
  view,
  fitContent = false,
  title,
  summary,
  onSnapChange,
  children,
}: RecommendMobileSheetProps) {
  const isInteractive = isRecommendationSheetInteractive(view)
  const effectiveSnap = snap
  const bodyId = useId()
  const sheetRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const previousSnapRef = useRef(effectiveSnap)
  const pointerIdRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const startSnapRef = useRef<RecommendationSheetSnap | null>(null)
  const dragBoundsRef = useRef<RecommendationSheetBounds | null>(null)
  const lastPointerSampleRef = useRef<PointerSample | null>(null)
  const velocityYRef = useRef(0)
  const didDragRef = useRef(false)
  const suppressPointerClickRef = useRef(false)
  const [dragVisualState, setDragVisualState] =
    useState<DragVisualState | null>(null)
  const [fitHeight, setFitHeight] = useState<number | null>(null)
  const appliedFitHeight = fitContent ? fitHeight : null

  /*
   * 내용 칸(`[data-panel-view]`)은 뷰가 바뀔 때마다 새로 붙으므로 `view` 로 다시 찾는다. 칸 안
   * 자식(제목·조건 폼)의 크기가 바뀌면(오류 문구·「이전 결과로 돌아가기」 상자) 다시 잰다.
   */
  useRecommendationSheetMeasureEffect(() => {
    if (!fitContent) return

    const content =
      bodyRef.current?.querySelector<HTMLElement>('[data-panel-view]')

    if (!content) return

    const measure = () => {
      const next = resolveRecommendationSheetFitHeight(
        readRecommendationSheetContentBox(content),
      )
      setFitHeight(current => (current === next ? current : next))
    }

    measure()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(content)
    for (const child of Array.from(content.children)) {
      observer.observe(child)
    }

    return () => observer.disconnect()
  }, [fitContent, view])

  const clearPointerState = () => {
    pointerIdRef.current = null
    startYRef.current = null
    startSnapRef.current = null
    dragBoundsRef.current = null
    lastPointerSampleRef.current = null
    velocityYRef.current = 0
    didDragRef.current = false
    setDragVisualState(null)
  }

  useEffect(() => {
    const pointerId = pointerIdRef.current
    const startSnap = startSnapRef.current

    if (
      pointerId === null ||
      startSnap === null ||
      (isInteractive && effectiveSnap === startSnap)
    ) {
      return
    }

    const handle = handleRef.current
    suppressPointerClickRef.current = true

    pointerIdRef.current = null
    startYRef.current = null
    startSnapRef.current = null
    dragBoundsRef.current = null
    lastPointerSampleRef.current = null
    velocityYRef.current = 0
    didDragRef.current = false

    releaseRecommendationSheetPointerCapture(handle, pointerId)

    queueMicrotask(() => setDragVisualState(null))
  }, [effectiveSnap, isInteractive])

  useRecommendationSheetFocusEffect(() => {
    const previousSnap = previousSnapRef.current
    previousSnapRef.current = effectiveSnap

    if (
      previousSnap === 'expanded' &&
      effectiveSnap === 'collapsed' &&
      typeof document !== 'undefined'
    ) {
      restoreRecommendationSheetHandleFocus(
        bodyRef.current,
        handleRef.current,
        document.activeElement,
      )
    }
  }, [effectiveSnap])

  useEffect(() => {
    const handle = handleRef.current

    return () => {
      const pointerId = pointerIdRef.current

      pointerIdRef.current = null
      startYRef.current = null
      startSnapRef.current = null
      dragBoundsRef.current = null
      lastPointerSampleRef.current = null
      velocityYRef.current = 0
      didDragRef.current = false

      if (pointerId !== null) {
        releaseRecommendationSheetPointerCapture(handle, pointerId)
      }
    }
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (
      !isInteractive ||
      !canStartRecommendationSheetPointer({
        isPrimary: event.isPrimary,
        hasActivePointer: pointerIdRef.current !== null,
        pointerType: event.pointerType,
        button: event.button,
      })
    ) {
      return
    }

    // 시트는 display:contents 래퍼 안에 있어 parentElement.clientHeight 가 0 일 수
    // 있다. 절대배치된 시트의 offsetParent(=지도 영역)를 먼저 본다.
    const offsetParent = sheetRef.current?.offsetParent
    const viewportHeight = resolveBottomSheetViewportHeight(
      offsetParent instanceof HTMLElement ? offsetParent.clientHeight : null,
      sheetRef.current?.parentElement?.clientHeight,
      typeof window === 'undefined' ? null : window.innerHeight,
    )

    suppressPointerClickRef.current = false

    if (
      !tryCaptureRecommendationSheetPointer(
        event.currentTarget,
        event.pointerId,
      )
    ) {
      return
    }

    pointerIdRef.current = event.pointerId
    startYRef.current = event.clientY
    startSnapRef.current = effectiveSnap
    const bounds = getBottomSheetHeightBounds(viewportHeight)
    // 맞춤 높이로 펼친 시트는 그 높이가 여정의 끝이다 — 스냅 판정도 같은 높이로 한다.
    dragBoundsRef.current =
      appliedFitHeight === null
        ? bounds
        : {
            ...bounds,
            expandedHeight: Math.max(
              bounds.collapsedHeight,
              Math.min(bounds.expandedHeight, appliedFitHeight),
            ),
          }
    lastPointerSampleRef.current = {
      y: event.clientY,
      time: event.timeStamp,
    }
    velocityYRef.current = 0
    didDragRef.current = false
    setDragVisualState({ deltaY: 0, startSnap: effectiveSnap })
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (
      !isInteractive ||
      pointerIdRef.current !== event.pointerId ||
      startYRef.current === null ||
      startSnapRef.current === null
    ) {
      return
    }

    const deltaY = event.clientY - startYRef.current
    const previousSample = lastPointerSampleRef.current
    const elapsed = event.timeStamp - (previousSample?.time ?? event.timeStamp)

    if (previousSample && elapsed > 0) {
      velocityYRef.current = (event.clientY - previousSample.y) / elapsed
    }
    lastPointerSampleRef.current = {
      y: event.clientY,
      time: event.timeStamp,
    }
    didDragRef.current = didDragRef.current || didBottomSheetDrag(deltaY)
    setDragVisualState({
      deltaY,
      startSnap: startSnapRef.current,
    })
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const startY = startYRef.current
    const startSnap = startSnapRef.current
    const bounds = dragBoundsRef.current
    const previousSample = lastPointerSampleRef.current

    if (
      !isInteractive ||
      pointerIdRef.current !== event.pointerId ||
      startY === null ||
      startSnap === null ||
      bounds === null
    ) {
      return
    }

    const velocityY = getRecommendationSheetReleaseVelocity(
      previousSample,
      event.clientY,
      event.timeStamp,
      velocityYRef.current,
    )
    const { nextSnap, suppressClick } = finishRecommendationSheetPointer(
      startSnap,
      event.clientY - startY,
      velocityY,
      bounds,
      didDragRef.current,
    )

    suppressPointerClickRef.current = suppressClick
    clearPointerState()

    releaseRecommendationSheetPointerCapture(
      event.currentTarget,
      event.pointerId,
    )

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

    releaseRecommendationSheetPointerCapture(
      event.currentTarget,
      event.pointerId,
    )
  }

  const handleLostPointerCapture = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (pointerIdRef.current !== event.pointerId) {
      return
    }

    suppressPointerClickRef.current =
      suppressPointerClickRef.current || didDragRef.current
    clearPointerState()
  }

  const handleToggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (
      shouldSuppressBottomSheetClick(
        suppressPointerClickRef.current,
        event.detail,
      )
    ) {
      suppressPointerClickRef.current = false
      return
    }

    suppressPointerClickRef.current = false
    onSnapChange(effectiveSnap === 'collapsed' ? 'expanded' : 'collapsed')
  }

  const isExpanded = effectiveSnap === 'expanded'
  const isDraggingCurrentSnap =
    dragVisualState !== null && dragVisualState.startSnap === effectiveSnap
  const handleLabel = `상권 추천 바텀시트 ${isExpanded ? '접기' : '펼치기'}`

  return (
    <Sheet
      ref={sheetRef}
      $dragDeltaY={isDraggingCurrentSnap ? dragVisualState.deltaY : 0}
      $fitHeight={appliedFitHeight}
      $isDragging={isDraggingCurrentSnap}
      $snap={effectiveSnap}
      aria-label="상권 추천"
      data-map-overlay="true"
      data-sheet-snap={effectiveSnap}
    >
      <HandleButton
        ref={handleRef}
        $isExpanded={isExpanded}
        aria-controls={bodyId}
        aria-expanded={isExpanded}
        aria-label={handleLabel}
        type="button"
        onClick={handleToggle}
        onLostPointerCapture={handleLostPointerCapture}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <HandleCopy>
          <strong>{title}</strong>
          <small>{summary}</small>
        </HandleCopy>
      </HandleButton>

      <SheetBody
        ref={bodyRef}
        id={bodyId}
        $isExpanded={isExpanded}
        aria-hidden={!isExpanded}
        aria-label="상권 추천 내용"
        inert={!isExpanded || undefined}
        role="region"
      >
        {children}
      </SheetBody>
    </Sheet>
  )
}
