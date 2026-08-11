'use client'

import {
  forwardRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import Link from 'next/link'
import { Maximize2, MapPinned, Minus, Search, X } from 'lucide-react'
import styled, { css } from 'styled-components'
import { glassSurface } from '@/components/home/hero-glass'

export type WindowState = 'open' | 'minimized' | 'closed'

export type TitleBarDragHandlers = {
  onPointerDown: (e: ReactPointerEvent) => void
}

export type HeroWindowProps = {
  state: WindowState
  onClose: () => void
  onToggleMinimize: () => void
  dragHandlers?: TitleBarDragHandlers
  style?: CSSProperties
  /** 지도 자치구 hover 중일 때 카드 배경에 미세한 primary 틴트를 얹는다. */
  tinted?: boolean
}

const WindowCard = styled.div<{ $tinted?: boolean }>`
  /* 카드 본문이 포인터 이벤트를 가로채 뒤에 있는 지도 폴리곤의 hover/클릭을 막는다 */
  pointer-events: auto;
  /* 카드(타이틀바 드래그 포함) 내부 텍스트가 드래그로 선택되지 않게 한다 */
  -webkit-user-select: none;
  user-select: none;
  width: min(460px, 100%);
  border-radius: 24px;
  overflow: hidden;
  /* 독으로 축소/독에서 확대되는 전환 애니메이션(hero-section.tsx의 style prop)이
     우하단 모서리를 기준으로 scale된다. translate만 쓰는 평상시 드래그
     transform은 origin의 영향을 받지 않으므로 항상 적용해도 안전하다. */
  transform-origin: bottom right;
  background: ${p =>
    p.$tinted
      ? 'color-mix(in srgb, var(--color-primary-700) 7%, color-mix(in srgb, var(--color-surface) 55%, transparent))'
      : 'color-mix(in srgb, var(--color-surface) 55%, transparent)'};
  transition: background var(--motion-fast) var(--ease-standard);
  ${glassSurface}
  -webkit-backdrop-filter: blur(14px) saturate(180%) brightness(1.04);
  backdrop-filter: blur(14px) saturate(180%) brightness(1.04);

  @media (max-width: 640px) {
    width: min(460px, calc(100% - 24px));
    border-radius: 20px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const TitleBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 40px 12px;
  border-bottom: 1px solid color-mix(in srgb, #ffffff 40%, transparent);
  user-select: none;

  @media (min-width: 641px) {
    cursor: grab;
    touch-action: none;
  }

  &:active {
    @media (min-width: 641px) {
      cursor: grabbing;
    }
  }

  @media (max-width: 640px) {
    padding: 16px 24px 10px;
    cursor: default;
    touch-action: auto;
  }
`

const WindowTitle = styled.span`
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const TrafficLights = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  /* 드래그·창 조작(닫기/접기/최대화)은 데스크톱 전용 어포던스이므로 모바일에서는
     숨긴다. 카드는 모바일에서 항상 열린 상태로 표시된다(hero-section.tsx). */
  @media (max-width: 640px) {
    display: none;
  }
`

type DotVariant = 'close' | 'min' | 'max'

const dotStyles = css<{ $variant: DotVariant }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${p =>
    p.$variant === 'close'
      ? '#ff5f57'
      : p.$variant === 'min'
        ? '#febc2e'
        : '#28c840'};

  svg {
    width: 8px;
    height: 8px;
    opacity: 0;
    stroke: rgba(0, 0, 0, 0.55);
    transition: opacity var(--motion-fast) var(--ease-standard);
  }

  &:hover svg,
  &:focus-visible svg {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
  }
`

const Dot = styled.button<{ $variant: 'close' | 'min' }>`
  ${dotStyles}
`

const DotLink = styled(Link)<{ $variant: 'max' }>`
  ${dotStyles}
  text-decoration: none;
`

const WindowBody = styled.div<{ $minimized: boolean }>`
  display: grid;
  grid-template-rows: ${p => (p.$minimized ? '0fr' : '1fr')};
  opacity: ${p => (p.$minimized ? 0 : 1)};
  transition:
    grid-template-rows var(--motion-standard) var(--ease-standard),
    opacity var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const WindowBodyInner = styled.div`
  min-height: 0;
  overflow: hidden;
  display: grid;
  gap: 20px;
  padding: 16px 40px 40px;

  @media (max-width: 640px) {
    padding: 12px 24px 24px;
    gap: 16px;
  }
`

const Title = styled.h1`
  max-width: 620px;
  color: var(--color-text-900);
  font-size: 30px;
  font-weight: 700;
  line-height: 40px;
  letter-spacing: 0;
  word-break: keep-all;
`

const Body = styled.p`
  max-width: 620px;
  color: var(--color-text-600);
  font-size: 16px;
  line-height: 24px;
  word-break: keep-all;
`

const BodyEmphasis = styled.strong`
  display: block;
  margin-top: 4px;
  color: var(--color-text-900);
  font-weight: 700;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const PrimaryLink = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  transition: background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-primary-600);
  }

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

const SecondaryLink = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 600;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: #dff0ff;
  }

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

const HeroWindow = forwardRef<HTMLDivElement, HeroWindowProps>(
  function HeroWindow(
    { state, onClose, onToggleMinimize, dragHandlers, style, tinted },
    ref,
  ) {
    const minimized = state === 'minimized'

    return (
      <WindowCard ref={ref} style={style} $tinted={tinted}>
        <TitleBar onPointerDown={dragHandlers?.onPointerDown}>
          <WindowTitle>서울 상권 데이터 분석</WindowTitle>
          <TrafficLights role="group" aria-label="분석 창 조작">
            <Dot
              type="button"
              $variant="close"
              aria-label="분석 창 닫고 지도 보기"
              onClick={onClose}
            >
              <X aria-hidden="true" />
            </Dot>
            <Dot
              type="button"
              $variant="min"
              aria-label="분석 창 접기"
              onClick={onToggleMinimize}
            >
              <Minus aria-hidden="true" />
            </Dot>
            <DotLink
              href="/analysis"
              $variant="max"
              aria-label="상권 분석 시작(전체 화면)"
            >
              <Maximize2 aria-hidden="true" />
            </DotLink>
          </TrafficLights>
        </TitleBar>
        <WindowBody
          $minimized={minimized}
          aria-hidden={minimized}
          inert={minimized ? true : undefined}
        >
          <WindowBodyInner>
            <Title>창업 전에, 상권부터 확인하세요.</Title>
            <Body>
              서울 25개 자치구의 매출·유동인구·경쟁 현황을 업종별로 분석하고, AI
              리포트로 핵심을 짚어 드립니다.
              <BodyEmphasis>
                감이 아니라 데이터와 AI로 자리를 정하세요.
              </BodyEmphasis>
            </Body>
            <Actions>
              <PrimaryLink href="/analysis">
                <Search aria-hidden="true" />내 상권 분석하기
              </PrimaryLink>
              <SecondaryLink href="/status">
                <MapPinned aria-hidden="true" />
                구별현황 보기
              </SecondaryLink>
            </Actions>
          </WindowBodyInner>
        </WindowBody>
      </WindowCard>
    )
  },
)

export default HeroWindow
