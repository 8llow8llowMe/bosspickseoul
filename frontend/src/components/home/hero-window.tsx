'use client'

import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import Link from 'next/link'
import { Maximize2, MapPinned, Minus, Search, X } from 'lucide-react'
import styled, { css } from 'styled-components'

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
}

const WindowCard = styled.div`
  /* 카드 본문은 이벤트를 통과시키고, 내부 상호작용 요소만 다시 활성화한다 */
  pointer-events: none;
  width: min(460px, 100%);
  border-radius: 24px;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-surface) 55%, transparent);
  border: 1px solid color-mix(in srgb, #ffffff 65%, transparent);
  box-shadow: 0 24px 60px -16px rgba(2, 9, 19, 0.3);
  -webkit-backdrop-filter: blur(16px) saturate(135%);
  backdrop-filter: blur(16px) saturate(135%);

  @media (max-width: 640px) {
    width: min(460px, calc(100% - 24px));
    border-radius: 20px;
  }
`

const TitleBar = styled.div`
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 40px 12px;
  border-bottom: 1px solid color-mix(in srgb, #ffffff 40%, transparent);

  @media (max-width: 640px) {
    padding: 16px 24px 10px;
  }
`

const WindowTitle = styled.span`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const TrafficLights = styled.div`
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
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
  pointer-events: auto;
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

const Eyebrow = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
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
  /* 오버레이 카드가 이벤트를 통과시켜도 버튼은 클릭 가능해야 한다 */
  pointer-events: auto;
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

export default function HeroWindow({
  state,
  onClose,
  onToggleMinimize,
  dragHandlers,
  style,
}: HeroWindowProps) {
  const minimized = state === 'minimized'

  return (
    <WindowCard style={style}>
      <TitleBar onPointerDown={dragHandlers?.onPointerDown}>
        <WindowTitle>상권 분석</WindowTitle>
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
      <WindowBody $minimized={minimized} aria-hidden={minimized}>
        <WindowBodyInner>
          <Eyebrow>서울 상권 데이터 분석</Eyebrow>
          <Title>창업 전에, 상권부터 확인하세요.</Title>
          <Body>
            서울 25개 자치구를 업종별 매출·유동인구·경쟁 현황으로 분석합니다.
            <BodyEmphasis>감이 아니라 데이터로 자리를 정하세요.</BodyEmphasis>
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
}
