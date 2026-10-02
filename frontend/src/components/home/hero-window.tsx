'use client'

import {
  forwardRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  Maximize2,
  MapPinned,
  Minus,
  Search,
  X,
} from 'lucide-react'
import styled, { css } from 'styled-components'
import { glassSurface } from '@/components/home/hero-glass'
import HeroPickPreview from '@/components/home/hero-pick-preview'
import {
  HERO_PICKER_OPTIONS,
  resolveHeroPrimaryCta,
} from '@/components/home/hero-picker'
import { HEADER_HEIGHT } from '@/components/home/layout-constants'
import { trackAttrs } from '@/lib/analytics/events'

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
  /** 히어로 피커로 고른 자치구 코드. 상태는 `HeroSection` 이 갖는다(지도와 공유). */
  pickedCode: string | null
  /** 피커 값이 바뀔 때. 첫 항목(「자치구 고르기」)이면 null. */
  onPick: (code: string | null) => void
  /** 모바일 지도 탭 뒤 피커 덩어리를 화면에 데려오기 위한 ref. */
  pickerRef?: Ref<HTMLDivElement>
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

/*
  히어로 자치구 피커(hero-picker-and-mobile-first-screen.md D4-1). h1 이 묻고(「서울 어디에
  차려야 할까요?」) 바로 아래 칸이 답을 받는다. 주 버튼이 피커의 실행 버튼이다 — 버튼을
  새로 더하지 않는다(D2 #3).
*/
const PickerBlock = styled.div`
  display: grid;
  gap: 8px;
  /* 모바일 지도 탭 뒤 scrollIntoView 가 sticky 헤더 밑으로 숨지 않게(D6). */
  scroll-margin-top: calc(${HEADER_HEIGHT} + 16px);
`

const PickerRow = styled.div`
  display: flex;
  gap: 8px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`

const PickerField = styled.label`
  position: relative;
  flex: 1 1 140px;
  min-width: 140px;
  display: flex;
  align-items: center;

  > svg {
    position: absolute;
    right: 14px;
    width: 16px;
    height: 16px;
    color: var(--color-text-600);
    pointer-events: none;
  }
`

const PickerSelect = styled.select`
  width: 100%;
  min-height: 48px;
  appearance: none;
  padding: 0 40px 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: var(--color-surface);
  color: var(--color-text-900);
  /* 16px — iOS 포커스 확대 방지(DESIGN.md 편집기 규칙과 같다). */
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary-600);
  }

  /* 포커스는 hover 와 같은 색이면 구별되지 않는다 — 포커스 색 + 글로우로 갈라 놓는다. */
  &:focus-visible {
    border-color: var(--color-primary-700);
    box-shadow: var(--shadow-focus-primary);
    outline: none;
  }
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

/*
  「어디가 좋을지 모르는 사람」의 갈래. 히어로의 두 CTA 는 분석·현황이라 **이미 어디를
  볼지 아는 사람**만 연다. `/recommend` 로 가는 홈 본문 링크는 판단 흐름 03단계 하나뿐이었고
  그것은 3.2 화면 뒤에 있다(이슈 #176 잔여 ①).

  문구는 `/analysis` 선택 패널이 쓰는 것과 **같은 말**이다(`analysis-recommend-escape`).
  같은 갈래를 같은 문장으로 반복하면 학습된다 — 자리마다 다른 말을 쓰면 매번 새로 읽어야 한다.

  버튼이 아니라 텍스트 링크인 이유: 460px 카드에 같은 무게의 버튼이 셋이면 위계가 무너진다.
*/
const EscapeLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  /* 터치 영역(DESIGN.md §8). 카드 안이라 좌우 패딩은 두지 않는다. */
  min-height: 44px;
  color: var(--color-text-600);
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: var(--color-primary-700);
  }
`

const PrimaryLink = styled(Link)`
  /* 피커 옆 실행 버튼 — 「영등포구 분석하기」도 한 줄에 둔다. */
  flex: 0 0 auto;
  white-space: nowrap;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border-radius: var(--radius-control);
  background: var(--color-fill-primary-text);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  transition: background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-fill-primary-text-hover);
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
    {
      state,
      onClose,
      onToggleMinimize,
      dragHandlers,
      style,
      tinted,
      pickedCode,
      onPick,
      pickerRef,
    },
    ref,
  ) {
    const minimized = state === 'minimized'
    const primaryCta = resolveHeroPrimaryCta(pickedCode)

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
              {...trackAttrs('home_hero_cta_click', { cta: 'window_max' })}
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
            <Title>서울 어디에 차려야 할까요?</Title>
            <Body>
              자치구를 고르면 유동인구부터 바로 보여 주고, 분석 화면에서
              매출·경쟁 강도와 AI 리포트까지 이어서 볼 수 있어요.
            </Body>
            <PickerBlock ref={pickerRef}>
              <PickerRow>
                <PickerField>
                  <VisuallyHidden>창업할 자치구</VisuallyHidden>
                  <PickerSelect
                    value={pickedCode ?? ''}
                    onChange={event => onPick(event.target.value || null)}
                  >
                    <option value="">자치구 고르기</option>
                    {HERO_PICKER_OPTIONS.map(option => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </PickerSelect>
                  <ChevronDown aria-hidden="true" />
                </PickerField>
                <PrimaryLink
                  href={primaryCta.href}
                  {...trackAttrs('home_hero_cta_click', {
                    cta: 'analysis',
                    carried: primaryCta.carried,
                  })}
                >
                  <Search aria-hidden="true" />
                  {primaryCta.label}
                </PrimaryLink>
              </PickerRow>
              <HeroPickPreview code={pickedCode} />
            </PickerBlock>
            <Actions>
              <SecondaryLink
                href="/status"
                {...trackAttrs('home_hero_cta_click', { cta: 'status' })}
              >
                <MapPinned aria-hidden="true" />
                구별현황 보기
              </SecondaryLink>
            </Actions>
            <EscapeLink
              href="/recommend"
              {...trackAttrs('home_hero_cta_click', { cta: 'recommend' })}
            >
              어디가 좋을지 모르겠다면 상권 추천받기
            </EscapeLink>
          </WindowBodyInner>
        </WindowBody>
      </WindowCard>
    )
  },
)

export default HeroWindow
