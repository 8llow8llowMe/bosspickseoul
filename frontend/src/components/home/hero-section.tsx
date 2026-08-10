'use client'

import { useState } from 'react'
import { PanelTopOpen } from 'lucide-react'
import styled from 'styled-components'
import SeoulDistrictsMap from '@/components/home/seoul-districts-map'
import HeroWindow, { type WindowState } from '@/components/home/hero-window'
import { glassSurface } from '@/components/home/hero-glass'

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
  /* 카드 위에서도 뒤의 폴리곤이 hover되도록 포인터 이벤트를 통과시킨다 */
  pointer-events: none;
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

  return (
    <Hero>
      <Inner>
        <HeroStage>
          <MapLayer>
            <SeoulDistrictsMap />
          </MapLayer>
          {windowState !== 'closed' ? (
            <CardLayer>
              <HeroWindow
                state={windowState}
                onClose={() => setWindowState('closed')}
                onToggleMinimize={() =>
                  setWindowState(s =>
                    s === 'minimized' ? 'open' : 'minimized',
                  )
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
