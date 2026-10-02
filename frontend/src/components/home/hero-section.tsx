'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { PanelTopOpen } from 'lucide-react'
import styled from 'styled-components'
import {
  HEADER_HEIGHT,
  HERO_FLUID_MEDIA,
  HERO_FLUID_NARROW_MEDIA,
  HERO_SPLIT_MEDIA,
  HERO_STACKED_MEDIA,
  HERO_TABLET_MEDIA,
  HERO_WINDOW_CHROME,
  HOME_COLUMN,
} from '@/components/home/layout-constants'
import SeoulDistrictsMap from '@/components/home/seoul-districts-map'
import HeroWindow, { type WindowState } from '@/components/home/hero-window'
import { glassSurface } from '@/components/home/hero-glass'
import { useWindowDrag } from '@/components/home/use-window-drag'
import { deriveWindowDisplay } from '@/components/home/window-display'
import { trackEvent } from '@/lib/analytics/events'

// "독으로 축소/독에서 확대" 전환 애니메이션 튜닝값.
// MINIMIZE_SCALE: 카드가 줄어드는 최종 배율(대략적인 "닫힘" 크기).
// DOCK_INSET: DockButton의 right/bottom(desktop) 값과 맞춰, 카드 우하단 모서리가
//   향할 목표 지점을 스테이지 우하단에서 얼마나 안쪽으로 잡을지 결정한다.
// TRANSITION_MS: --motion-standard(250ms)와 동일한 JS 상수. transitionend가
//   발생하지 않는 예외 상황(예: display:none 전환, 브라우저 버그)을 대비한
//   setTimeout 폴백의 기준 시간으로 쓴다.
const MINIMIZE_SCALE = 0.15
const DOCK_INSET = 24
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
  height: calc(100dvh - ${HEADER_HEIGHT});
  min-height: calc(100dvh - ${HEADER_HEIGHT});
  display: flex;
  flex-direction: column;
  padding: 0 0 48px;
  background: var(--color-background);

  /* 좁은 폭: [카드][지도][캡션] 순서로 쌓는다. 카드가 헤더 바로 아래라 h1·피커·주 버튼이
     첫 화면에 든다(hero-picker-and-mobile-first-screen.md D4-4·D5-1, hero-split-layout.md D4-3). */
  @media ${HERO_STACKED_MEDIA} {
    height: auto;
    min-height: auto;
  }

  @media (max-width: 640px) {
    padding: 0 0 24px;
  }
`

/* 아래 섹션과 같은 1400 컬럼이다 — 1440 을 넘으면 지도를 더 키우지 않고 가운데에 선다(D4-5). */
const Inner = styled.div`
  ${HOME_COLUMN}
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;

  @media ${HERO_STACKED_MEDIA} {
    flex: none;
  }
`

/*
  스테이지는 셸(Inner) **안쪽**이라 폭을 다시 좁히지 않는다. --w-shell 은
  calc(100% - …) 이라 두 번 걸면 거터가 두 겹이 된다(실측 40/1880).
*/
/*
  넓은 폭은 [카드 | 지도] 두 칸이다 — 카드가 지도 가운데 위에 떠 있으면 1440×900 에서 자치구
  12/25 의 중심점을 덮었다(hero-split-layout.md D0). 좁은 폭은 카드 → 지도 순서로 세로 정렬한다.
  position 은 relative 를 유지해 독 버튼 등 absolute 자식의 기준을 잃지 않는다.
*/
const HeroStage = styled.div`
  position: relative;
  width: 100%;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(360px, 460px) minmax(0, 1fr);
  column-gap: 48px;
  align-items: center;
  min-height: 0;

  /* 1200 아래는 카드도 지도와 함께 준다 — 1200 에서의 칸 비율(460 : 652)을 그대로 지켜 경계에서
     튀지 않는다. 카드 안 여백·제목은 hero-window.tsx 가 같은 구간에서 줄인다(D4-6). */
  @media ${HERO_FLUID_MEDIA} {
    grid-template-columns: minmax(0, 460fr) minmax(0, 652fr);
    column-gap: 40px;
  }

  @media ${HERO_FLUID_NARROW_MEDIA} {
    column-gap: 32px;
  }

  /*
    지도 중심(D4-3): 카드 껍데기가 display: contents 로 풀려 제목·소개·피커·보조 링크가 이
    그리드의 칸이 된다. 칸 이름은 hero-window.tsx 의 각 덩어리가 grid-area 로 단다. DOM 순서는
    [제목][소개][피커][보조][지도] 그대로라 Tab 은 피커가 지도보다 먼저다 — 보이는 순서와 어긋나지만
    읽는 의미가 바뀌지 않는다.
  */
  @media ${HERO_TABLET_MEDIA} {
    flex: none;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'title'
      'body'
      'map'
      'picker'
      'actions';
    row-gap: 12px;
    align-items: stretch;
    padding-top: 32px;
  }

  @media (max-width: 640px) {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
`

// 지도 래퍼. 넓은 폭에서는 display:contents로 투명해져 MapLayer가 HeroStage 그리드의
// 둘째 칸이 된다. 좁은 폭에서는 카드 아래 흐름에 놓이고 높이는 지도 비율이 정한다(빈 띠 0).
const MapScreen = styled.div`
  display: contents;

  @media (max-width: 640px) {
    display: flex;
    flex-direction: column;
    height: auto;
  }
`

const MapLayer = styled.div`
  width: 100%;
  /* 지도 + 캡션 한 덩어리가 스테이지 세로 가운데에 선다(그리드 align-items: center). svg 높이 상한은
     seoul-districts-map.tsx 가 진다(D4-1). */
  min-height: 0;

  @media ${HERO_TABLET_MEDIA} {
    grid-area: map;
    margin: 4px 0;
  }

  @media (max-width: 640px) {
    margin-top: 24px;
  }
`

/*
  카드 칸. 예전엔 스테이지 전체를 덮는 absolute 오버레이였다(pointer-events: none 으로 카드 바깥
  폴리곤을 살렸다). 좌우 분할로 모든 폭에서 흐름 배치다(hero-split-layout.md D3).
*/
const CardLayer = styled.div`
  display: flex;
  justify-content: center;

  /* 넓은 폭에서만 카드를 칸 폭에 맞춘다. 좁은 폭은 WindowCard 자신의 폭 규칙(≤640 은 좌우 12px
     안쪽)을 따른다 — 같은 명시도라 여기서 폭을 주면 뒤에 정의된 이 규칙이 이겨 모바일이 바뀐다. */
  @media ${HERO_SPLIT_MEDIA} {
    > * {
      width: 100%;
    }
  }

  /* 지도 중심: 껍데기를 풀어 안쪽 덩어리를 히어로 그리드 칸에 놓는다(D4-3). */
  @media ${HERO_TABLET_MEDIA} {
    display: contents;
  }

  /* 모바일: 헤더 바로 아래 흐름에 둔다 — 첫 화면 예산(hero-picker D5-1). */
  @media (max-width: 640px) {
    padding: 24px 0 0;
  }
`

const DockButton = styled.button`
  /* 히어로 스테이지(position: relative)의 우하단에 앵커한다. 히어로가
     100dvh-헤더 높이에 맞춰지므로 스테이지 우하단은 항상 화면 안에 있고,
     전체 뷰포트 고정(position: fixed)처럼 콘텐츠와 동떨어져 보이지 않는다. */
  position: absolute;
  right: 24px;
  bottom: 24px;
  z-index: 12;
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
  /* 히어로 피커 선택. 카드(피커·미리보기)와 지도(채움·모바일 탭)가 함께 본다(D3-1). */
  const [pickedCode, setPickedCode] = useState<string | null>(null)
  /* 한 번이라도 고르면 자동 시연은 끝이다 — 해제해도 다시 하지 않는다(D4-7). */
  const [hasPicked, setHasPicked] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

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
    // 창 장식을 숨기면 드래그 핸들(제목줄)도 없다 — 시험 적용(hero-split-layout.md D4-2).
    enabled: HERO_WINDOW_CHROME && dragEnabled,
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

  // 열림(독→카드) 애니메이션 1단계: mount 직후 카드를 "identity 위치 +
  // opacity:0"로 한 프레임 그린 뒤(cardStyle의 enterTransform===null 분기),
  // 그 프레임에서 카드의 실제 위치를 측정해 독 쪽에서 출발하는 시작 transform을
  // 계산한다. isClosing이 먼저 true가 되면(열리는 도중 닫기를 누른 경우) 이
  // 단계는 개입하지 않고 바로 물러난다(Fix 2 — 닫기 쪽 effect 하나만 카드의
  // transitionend를 구독하게 한다).
  useEffect(() => {
    if (!isEntering || isClosing) return
    const container = containerRef.current
    const card = cardRef.current
    if (!container || !card) {
      setIsEntering(false)
      return
    }
    setEnterTransform(computeDockTransform(container, card, { x: 0, y: 0 }))
    // 독 쪽 시작 위치(stage 2)가 실제로 "페인트된" 다음 프레임에 enterReady를
    // 켜야, 브라우저가 transform 트랜지션의 시작점을 dock-start로 인식한다.
    // 단일 rAF는 stage 2 페인트 전에 켜질 수 있어(→ 시작·끝이 모두 identity라
    // transform 애니메이션이 생략되고 opacity fade만 남는다) 이중 rAF로 한
    // 프레임 더 기다려 "독에서 자라나는" 전환이 확실히 재생되게 한다.
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setEnterReady(true))
    })
    return () => {
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
    }
  }, [isEntering, isClosing])

  // 열림 애니메이션 2단계: enterReady가 켜진 뒤(transition 시작) 완료되면 원상
  // 복귀해, 이후 드래그가 다시 transition 없는 1:1 이동으로 동작하게 한다.
  // 마찬가지로 isClosing이 먼저 true가 되면 물러난다(Fix 2).
  useEffect(() => {
    if (!isEntering || isClosing || !enterReady) return
    return waitForTransformTransitionEnd(
      cardRef.current,
      TRANSITION_MS + TRANSITION_FALLBACK_BUFFER_MS,
      () => {
        setIsEntering(false)
        setEnterTransform(null)
        setEnterReady(false)
      },
    )
  }, [isEntering, isClosing, enterReady])

  const { displayState, showDock } = deriveWindowDisplay(
    windowState,
    isMobileViewport,
  )

  /* 모바일 지도 탭 뒤, 바뀐 버튼·미리보기가 화면 밖이면 그쪽으로 데려간다(D4-4). */
  const revealPicker = () => {
    const el = pickerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const headerBottom = Number.parseInt(HEADER_HEIGHT, 10)
    if (rect.top >= headerBottom && rect.bottom <= window.innerHeight) return
    el.scrollIntoView({
      block: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  const handlePick = (code: string | null, source: 'select' | 'map') => {
    // 값이 바뀔 때만 센다 — 같은 구를 다시 탭한 것은 새 선택이 아니다.
    if (code !== null && code !== pickedCode) {
      trackEvent('home_hero_picker_select', { district_code: code, source })
    }
    setPickedCode(code)
    if (code !== null) setHasPicked(true)
    if (source === 'map') revealPicker()
  }

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
      if (enterReady) {
        // 3단계: identity로 흘러가는 실제 애니메이션 구간.
        return {
          transform: `translate(${drag.offset.x}px, ${drag.offset.y}px)`,
          opacity: 1,
          transition: `transform var(--motion-standard) var(--ease-standard), opacity var(--motion-standard) var(--ease-standard)`,
        }
      }
      if (enterTransform) {
        // 2단계: 측정을 마친 뒤 독 쪽 시작 transform을 적용한(아직 transition
        // 없는) 프레임. 다음 프레임에 enterReady가 켜지며 3단계로 넘어간다.
        return { transform: enterTransform, opacity: 0, transition: 'none' }
      }
      // 1단계(측정 전, Fix 1): 아직 독 쪽 시작 transform을 계산하지 못한
      // 첫 프레임이다. 여기서 FALLBACK_DOCK_TRANSFORM 같은 임의의 transform을
      // 걸면 아래 measuring effect가 카드의 실제 위치 대신 "이미 변형된" 위치를
      // 측정해버려(스케일·이동이 섞인 뒤틀린 값) 독 방향 계산이 틀어진다.
      // 그래서 identity 위치를 그대로 유지하고 opacity만 0으로 감춰, 다음
      // effect가 "깨끗한" 실제 좌표를 측정하게 한다.
      return {
        transform: `translate(${drag.offset.x}px, ${drag.offset.y}px)`,
        opacity: 0,
        transition: 'none',
      }
    }
    return { transform: `translate(${drag.offset.x}px, ${drag.offset.y}px)` }
  })()

  return (
    <Hero>
      <Inner>
        <HeroStage ref={containerRef}>
          {/*
            카드가 먼저다 — 좁은 폭은 이 순서대로 쌓이고(D4-4), 넓은 폭은 이 순서가 그리드
            칸(카드 왼쪽 · 지도 오른쪽)을 정한다(hero-split-layout.md D3).
          */}
          {!showDock ? (
            <CardLayer>
              <HeroWindow
                ref={cardRef}
                state={displayState}
                onClose={handleClose}
                onToggleMinimize={() =>
                  setWindowState(s =>
                    s === 'minimized' ? 'open' : 'minimized',
                  )
                }
                dragHandlers={drag.handlers}
                style={cardStyle}
                pickedCode={pickedCode}
                onPick={code => handlePick(code, 'select')}
                pickerRef={pickerRef}
                chrome={HERO_WINDOW_CHROME}
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
          <MapScreen>
            <MapLayer>
              <SeoulDistrictsMap
                selectedCode={pickedCode}
                /*
                  모든 폭에서 지도 클릭·탭·Enter 는 「고르기」다 — 페이지는 카드의 「○○구 분석하기」를
                  눌러야 넘어간다. 예전 데스크톱 클릭 즉시 이동은 호버를 둘러보다 흐름이 끊겼다(D4-7).
                */
                onDistrictActivate={code => handlePick(code, 'map')}
                tooltipEnabled={!isMobileViewport}
                autoDemo={dragEnabled && !hasPicked}
                /*
                  카드가 지도를 덮지 않아 시연 툴팁이 피할 것이 없다. 오버레이 배치로 되돌리면
                  카드 오른쪽 끝(cardRef 의 getBoundingClientRect().right)을 demoAvoidRight 로
                  다시 넘긴다(hero-split-layout.md D3).
                */
              />
            </MapLayer>
          </MapScreen>
        </HeroStage>
      </Inner>
    </Hero>
  )
}
