'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { PanelTopOpen } from 'lucide-react'
import styled from 'styled-components'
import SeoulDistrictsMap from '@/components/home/seoul-districts-map'
import HeroWindow, { type WindowState } from '@/components/home/hero-window'
import { glassSurface } from '@/components/home/hero-glass'
import { useWindowDrag } from '@/components/home/use-window-drag'
import { deriveWindowDisplay } from '@/components/home/window-display'

// "독으로 축소/독에서 확대" 전환 애니메이션 튜닝값.
// MINIMIZE_SCALE: 카드가 줄어드는 최종 배율(대략적인 "닫힘" 크기).
// DOCK_INSET: DockButton의 right/bottom(desktop) 값과 맞춰, 카드 우하단 모서리가
//   향할 목표 지점을 스테이지 우하단에서 얼마나 안쪽으로 잡을지 결정한다.
// TRANSITION_MS: --motion-standard(250ms)와 동일한 JS 상수. transitionend가
//   발생하지 않는 예외 상황(예: display:none 전환, 브라우저 버그)을 대비한
//   setTimeout 폴백의 기준 시간으로 쓴다.
const MINIMIZE_SCALE = 0.15
const DOCK_INSET = 20
const TRANSITION_MS = 250
const TRANSITION_FALLBACK_BUFFER_MS = 80
const FALLBACK_DOCK_TRANSFORM = `translate(220px, 160px) scale(${MINIMIZE_SCALE})`

/**
 * 카드(또는 도착 지점)의 실제 DOM 위치를 측정해, 카드 우하단 모서리가 독 버튼이
 * 있는 스테이지 우하단 모서리 쪽으로 이동하도록 하는 translate+scale 문자열을
 * 만든다. 측정에 필요한 ref가 아직 없으면(레이아웃 이전 등) 대략적인 고정값으로
 * 대체한다 — 축소 애니메이션은 "독으로 사라지는" 느낌만 주면 충분하고 픽셀
 * 단위로 정확할 필요는 없다.
 */
function computeDockTransform(
  container: HTMLElement | null,
  card: HTMLElement | null,
  baseOffset: { x: number; y: number },
): string {
  if (!container || !card) return FALLBACK_DOCK_TRANSFORM
  const containerRect = container.getBoundingClientRect()
  const cardRect = card.getBoundingClientRect()
  const dockCornerX = containerRect.right - DOCK_INSET
  const dockCornerY = containerRect.bottom - DOCK_INSET
  const dx = dockCornerX - cardRect.right
  const dy = dockCornerY - cardRect.bottom
  return `translate(${baseOffset.x + dx}px, ${baseOffset.y + dy}px) scale(${MINIMIZE_SCALE})`
}

/**
 * 카드에 transform transition이 걸려 있는 동안, transitionend(정상 종료) 또는
 * 폴백 setTimeout(transitionend가 안 오는 예외 상황) 중 먼저 오는 쪽에서
 * onDone을 정확히 한 번 호출한다. cleanup에서 리스너/타이머를 모두 정리한다.
 */
function waitForTransformTransitionEnd(
  el: HTMLElement | null,
  timeoutMs: number,
  onDone: () => void,
): () => void {
  if (!el) {
    onDone()
    return () => {}
  }
  let done = false
  const finish = () => {
    if (done) return
    done = true
    window.clearTimeout(timeoutId)
    el.removeEventListener('transitionend', handleTransitionEnd)
    onDone()
  }
  const handleTransitionEnd = (e: TransitionEvent) => {
    if (e.target !== el || e.propertyName !== 'transform') return
    finish()
  }
  const timeoutId = window.setTimeout(finish, timeoutMs)
  el.addEventListener('transitionend', handleTransitionEnd)
  return () => {
    window.clearTimeout(timeoutId)
    el.removeEventListener('transitionend', handleTransitionEnd)
  }
}

const Hero = styled.section`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 56px 20px 48px;
  background: var(--color-background);

  @media (max-width: 640px) {
    min-height: auto;
    padding: 56px 16px;
  }
`

const Inner = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
`

const HeroStage = styled.div`
  position: relative;
  width: min(1120px, 100%);
  margin: 0 auto;

  /* 모바일에서는 오버레이를 해제하고 지도 → 카드 순서로 세로 정렬한다. */
  @media (max-width: 640px) {
    position: static;
  }
`

const MapLayer = styled.div`
  width: 100%;
`

const CardLayer = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 10;
  /* 스테이지 레이어 자체는 이벤트를 통과시켜 카드 바깥 폴리곤은 계속 hover/클릭 가능하다.
     카드 영역 자체의 이벤트 차단은 WindowCard(hero-window.tsx)의 pointer-events: auto가 담당한다. */
  pointer-events: none;

  @media (max-width: 640px) {
    position: static;
    inset: auto;
    padding: 0;
    margin-top: 16px;
  }
`

const DockButton = styled.button`
  position: absolute;
  right: 20px;
  bottom: 20px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--color-surface) 55%, transparent);
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  ${glassSurface}
  -webkit-backdrop-filter: blur(16px) saturate(135%);
  backdrop-filter: blur(16px) saturate(135%);
  pointer-events: auto;
  transition: background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: color-mix(in srgb, var(--color-surface) 80%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);
    outline-offset: 2px;
  }

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }

  @media (max-width: 640px) {
    right: 12px;
    bottom: 12px;
    padding: 8px 12px;
    font-size: 13px;
  }
`

export default function HeroSection() {
  const [windowState, setWindowState] = useState<WindowState>('open')
  const [dragEnabled, setDragEnabled] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)

  // "독으로 축소" 닫기 전환 상태. isClosing이 true인 동안 windowState는 여전히
  // 'open'/'minimized'이므로 카드는 mount된 채로 남고(deriveWindowDisplay상
  // showDock도 false), 애니메이션이 끝나야 실제로 windowState를 'closed'로
  // 전환해 독 버튼을 노출한다.
  const [isClosing, setIsClosing] = useState(false)
  const [closingTransform, setClosingTransform] = useState<string | null>(null)

  // "독에서 확대" 열기 전환 상태(닫기의 역방향). enterReady가 false인 첫 프레임은
  // transition 없이 독 쪽 시작 위치에 배치하고, 다음 프레임에 enterReady를 true로
  // 바꿔 transition과 함께 identity 위치로 흘러가게 한다(reveal.tsx와 동일한
  // "두 프레임" 패턴).
  const [isEntering, setIsEntering] = useState(false)
  const [enterTransform, setEnterTransform] = useState<string | null>(null)
  const [enterReady, setEnterReady] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const drag = useWindowDrag({
    enabled: dragEnabled,
    containerRef,
    cardRef,
  })

  useEffect(() => {
    const desktopQuery = window.matchMedia(
      '(min-width: 641px) and (pointer: fine)',
    )
    const mobileQuery = window.matchMedia('(max-width: 640px)')
    const reducedMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )
    const update = () => {
      setDragEnabled(desktopQuery.matches && !reducedMotionQuery.matches)
      setIsMobileViewport(mobileQuery.matches)
      setReduceMotion(reducedMotionQuery.matches)
    }
    update()
    desktopQuery.addEventListener('change', update)
    mobileQuery.addEventListener('change', update)
    reducedMotionQuery.addEventListener('change', update)
    return () => {
      desktopQuery.removeEventListener('change', update)
      mobileQuery.removeEventListener('change', update)
      reducedMotionQuery.removeEventListener('change', update)
    }
  }, [])

  // 닫힘 애니메이션 실행: transitionend(정상) 또는 폴백 타이머 중 먼저 오는
  // 쪽에서 windowState를 'closed'로 확정하고 드래그 오프셋을 리셋한다.
  useEffect(() => {
    if (!isClosing) return
    return waitForTransformTransitionEnd(
      cardRef.current,
      TRANSITION_MS + TRANSITION_FALLBACK_BUFFER_MS,
      () => {
        setWindowState('closed')
        setIsClosing(false)
        setClosingTransform(null)
        drag.reset()
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drag는 stable 참조가 아니라 reset()만 필요
  }, [isClosing])

  // 열림(독→카드) 애니메이션 1단계: mount 직후 카드의 실제 위치를 측정해 독
  // 쪽에서 출발하는 시작 transform을 계산하고, 다음 프레임에 identity로
  // 전환되도록 enterReady를 켠다.
  useEffect(() => {
    if (!isEntering) return
    const container = containerRef.current
    const card = cardRef.current
    if (!container || !card) {
      setIsEntering(false)
      return
    }
    setEnterTransform(computeDockTransform(container, card, { x: 0, y: 0 }))
    const raf = window.requestAnimationFrame(() => {
      setEnterReady(true)
    })
    return () => window.cancelAnimationFrame(raf)
  }, [isEntering])

  // 열림 애니메이션 2단계: enterReady가 켜진 뒤(transition 시작) 완료되면 원상
  // 복귀해, 이후 드래그가 다시 transition 없는 1:1 이동으로 동작하게 한다.
  useEffect(() => {
    if (!isEntering || !enterReady) return
    return waitForTransformTransitionEnd(
      cardRef.current,
      TRANSITION_MS + TRANSITION_FALLBACK_BUFFER_MS,
      () => {
        setIsEntering(false)
        setEnterTransform(null)
        setEnterReady(false)
      },
    )
  }, [isEntering, enterReady])

  const { displayState, showDock } = deriveWindowDisplay(
    windowState,
    isMobileViewport,
  )

  const handleClose = () => {
    if (reduceMotion || isMobileViewport) {
      setWindowState('closed')
      drag.reset()
      return
    }
    setClosingTransform(
      computeDockTransform(containerRef.current, cardRef.current, drag.offset),
    )
    setIsClosing(true)
  }

  const handleOpenFromDock = () => {
    setWindowState('open')
    if (reduceMotion) return
    setIsEntering(true)
  }

  const cardStyle = ((): CSSProperties | undefined => {
    if (isMobileViewport) return undefined
    if (isClosing) {
      return {
        transform: closingTransform ?? FALLBACK_DOCK_TRANSFORM,
        opacity: 0,
        pointerEvents: 'none',
        transition: reduceMotion
          ? 'none'
          : `transform var(--motion-standard) var(--ease-standard), opacity var(--motion-standard) var(--ease-standard)`,
      }
    }
    if (isEntering) {
      return {
        transform: enterReady
          ? `translate(${drag.offset.x}px, ${drag.offset.y}px)`
          : (enterTransform ?? FALLBACK_DOCK_TRANSFORM),
        opacity: enterReady ? 1 : 0,
        transition: enterReady
          ? `transform var(--motion-standard) var(--ease-standard), opacity var(--motion-standard) var(--ease-standard)`
          : 'none',
      }
    }
    return { transform: `translate(${drag.offset.x}px, ${drag.offset.y}px)` }
  })()

  return (
    <Hero>
      <Inner>
        <HeroStage ref={containerRef}>
          <MapLayer>
            <SeoulDistrictsMap onHoverChange={setHoveredCode} />
          </MapLayer>
          {!showDock ? (
            <CardLayer>
              <HeroWindow
                ref={cardRef}
                state={displayState}
                tinted={hoveredCode != null}
                onClose={handleClose}
                onToggleMinimize={() =>
                  setWindowState(s =>
                    s === 'minimized' ? 'open' : 'minimized',
                  )
                }
                dragHandlers={drag.handlers}
                style={cardStyle}
              />
            </CardLayer>
          ) : (
            <DockButton
              type="button"
              aria-label="분석 창 열기"
              onClick={handleOpenFromDock}
            >
              <PanelTopOpen aria-hidden="true" />
              분석 창 열기
            </DockButton>
          )}
        </HeroStage>
      </Inner>
    </Hero>
  )
}
