'use client'

import { useEffect, useRef, useState } from 'react'
import { PanelTopOpen } from 'lucide-react'
import styled from 'styled-components'
import SeoulDistrictsMap from '@/components/home/seoul-districts-map'
import HeroWindow, { type WindowState } from '@/components/home/hero-window'
import { glassSurface } from '@/components/home/hero-glass'
import { useWindowDrag } from '@/components/home/use-window-drag'
import { deriveWindowDisplay } from '@/components/home/window-display'

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
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)
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

  const { displayState, showDock } = deriveWindowDisplay(
    windowState,
    isMobileViewport,
  )

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
                onClose={() => {
                  setWindowState('closed')
                  drag.reset()
                }}
                onToggleMinimize={() =>
                  setWindowState(s =>
                    s === 'minimized' ? 'open' : 'minimized',
                  )
                }
                dragHandlers={drag.handlers}
                style={
                  isMobileViewport
                    ? undefined
                    : {
                        transform: `translate(${drag.offset.x}px, ${drag.offset.y}px)`,
                      }
                }
              />
            </CardLayer>
          ) : (
            <DockButton
              type="button"
              aria-label="분석 창 열기"
              onClick={() => setWindowState('open')}
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
