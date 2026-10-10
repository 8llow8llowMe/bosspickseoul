'use client'

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { districts } from '@/data/districts'
import {
  SEOUL_STATUS_FEATURES,
  SEOUL_STATUS_VIEW_BOX,
} from '@/data/seoul-status-map'
import { toDistrictRhythm } from '@/components/home/district-rhythm'
import DistrictTooltip, {
  TOOLTIP_HEIGHT,
  TOOLTIP_WIDTH,
  districtTooltipHeight,
  type DistrictTooltipState,
} from '@/components/home/district-tooltip'
import {
  clampTooltipPosition,
  placeBesideRect,
  tooltipScale,
} from '@/components/home/tooltip-geometry'
import {
  HEADER_HEIGHT,
  HERO_SPLIT_MEDIA,
  HERO_TABLET_MEDIA,
} from '@/components/home/layout-constants'
import { useDistrictDetail } from '@/hooks/use-district-detail'
import { useHomeDistrictRankings } from '@/hooks/use-home-district-rankings'
import { trackEvent } from '@/lib/analytics/events'
import { isApiSuccess } from '@/lib/api/response'
import {
  describeHeroMapDistrict,
  toHeroMapChoropleth,
} from '@/lib/home/hero-map'
import {
  STATUS_MAP_VALUE_STEPS,
  statusMapValueStepFill,
} from '@/lib/status/status-map-model'

const districtNameByCode = new Map(
  districts.map(district => [String(district.gooCode), district.gooName]),
)

const viewBoxNumbers = SEOUL_STATUS_VIEW_BOX.split(' ').map(Number)
const VIEW_BOX_SIZE = {
  width: viewBoxNumbers[viewBoxNumbers.length - 2],
  height: viewBoxNumbers[viewBoxNumbers.length - 1],
}

const TOOLTIP_PADDING = 12

/**
 * hover 가 이만큼 머문 구만 상세를 받는다 — 지도를 가로지를 때 지나간 구마다 요청하지 않는다
 * (full-screen-sections-and-live-tooltip.md D4-4). 이미 받은 구는 기다리지 않고 캐시로 뜬다.
 */
const DETAIL_HOVER_DELAY_MS = 120

/*
  지도가 눌린다는 신호(hero-picker-and-mobile-first-screen.md D4-7). 데스크톱에서 아직 아무도
  지도를 건드리지 않았으면 한 구의 툴팁을 한 번 스스로 띄운다. 대상은 강동구 — 순위를 암시하지
  않는 동쪽 끝 구다. 카드가 지도 위에 떠 있던 오버레이 배치에서는 카드 밖에 뜨는 유일한 자리라
  골랐다(D5-3). 좌우 분할(hero-split-layout.md)에서는 카드를 피할 필요가 없다.
*/
export const AUTO_DEMO_DISTRICT_CODE = '11740'
export const AUTO_DEMO_DELAY_MS = 2000
export const AUTO_DEMO_VISIBLE_MS = 4000
/** 시연 툴팁과 카드 오른쪽 끝 사이 간격(px). */
const AUTO_DEMO_GAP_PX = 16

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`

// 히어로(hero-section.tsx)가 이 컴포넌트의 유일한 사용처다. 상자는 늘 폴리곤 비율(800 : 620)
// 이라 위아래 빈 띠가 없고, 캡션이 지도 바로 아래 붙는다. 폭별로 높이 상한만 다르다 — 상한에
// 걸려 상자가 비율보다 넓어지면 preserveAspectRatio="xMidYMid meet" 이 가운데에 그린다
// (hero-split-layout.md D4-1·D4-3). 예전엔 넓은 폭에서 height: 100% 로 칸 높이를 다 써서
// 1920×1080 에서 캡션이 지도 아래 127px 떨어져 있었다.
const MapSvg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 800 / 620;
  max-width: 100%;
  /* 자치구 폴리곤/툴팁 제목 등 지도 내 텍스트가 드래그로 선택되지 않게 한다 */
  -webkit-user-select: none;
  user-select: none;
  /* 오버레이 배치에서 자동 시연 툴팁이 카드를 피해 viewBox 오른쪽 여백까지 나갈 수 있게 한다(D5-3).
     좌우 분할에서는 툴팁이 viewBox 안에 클램프되므로 영향이 없다. */
  overflow: visible;

  /* 좌우 두 칸: 히어로 한 화면(100dvh - 헤더 - 아래 여백 48px)에서 범례 한 줄과 캡션 한 줄
     (28px 씩, #588)을 뺀 높이까지. */
  @media ${HERO_SPLIT_MEDIA} {
    max-height: calc(100dvh - ${HEADER_HEIGHT} - 48px - 56px);
  }

  /* 지도 중심 배치는 제목·피커 바까지 한 화면에 담는다 — 지도 위아래 몫(제목 두 줄·피커·보조
     링크 ≈ 280px)과 범례 한 줄(28px, #588)을 뺀 높이를 넘지 않는다. 폭이 남으면 meet 이 가운데에
     그린다(D4-3). */
  @media ${HERO_TABLET_MEDIA} {
    max-height: max(320px, calc(100dvh - ${HEADER_HEIGHT} - 308px));
  }
`

/*
  예전엔 강남·마포·송파 세 곳이 무한 펄스로 깜빡였다. 근거였던 「대표 예시」 수치가 실데이터
  툴팁으로 바뀌며 사라져 기준 없는 강조만 남았기에 걷어냈다(D0-2).

  지금은 25개 구를 유동인구 5분위로 칠한다(#588) — 구별현황 지도와 같은 다섯 칸이다. 고른 구와
  hover·키보드 포커스한 구는 그 위에 primary-700 으로 채운다. 5분위 가장 진한 칸(primary-600 60%)보다
  한 단계 진하고 채도가 같아 「고른 칸」으로 읽힌다. 값을 못 받으면 예전처럼 모두 회색이다.
*/
const valueStepRules = STATUS_MAP_VALUE_STEPS.map(
  ({ step, mixPercent }) => `
    &[data-value-step='${step}'] {
      fill: ${statusMapValueStepFill(mixPercent)};
    }
  `,
).join('')

const DistrictPath = styled.path<{
  $index: number
  $appear: boolean
}>`
  fill: var(--color-surface-muted);
  ${valueStepRules}
  stroke: var(--color-border-200);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
  cursor: pointer;
  opacity: ${p => (p.$appear ? 1 : 0)};
  transition:
    opacity var(--motion-standard) var(--ease-standard) ${p => p.$index * 24}ms,
    fill var(--motion-slow) var(--ease-standard);

  /* 단계 칠(속성 선택자)보다 뒤에 둬야 같은 명시도에서 이긴다. */
  &[data-selected='true'] {
    fill: var(--color-primary-700);
  }

  &:hover {
    fill: var(--color-primary-700);
    transition: fill var(--motion-fast) var(--ease-standard);
  }

  /* 마우스 pointer-down(:focus) 시 브라우저 기본 파란 아웃라인 제거 */
  &:focus {
    outline: none;
  }

  &:active {
    outline: none;
  }

  /* 키보드 탐색(:focus-visible)만 fill 강조로 표시(아웃라인 없음) */
  &:focus-visible {
    outline: none;
    fill: var(--color-primary-700);
  }

  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
    transition: none;

    &:hover {
      transition: none;
    }
  }
`

const TooltipGroup = styled.g`
  pointer-events: none;
`

/*
  지도가 무엇을 하는지 한 줄로 말한다(D4-5). 데스크톱은 지도 좌하단에 얹고(아래 폴리곤의
  hover 를 막지 않게 pointer-events: none), 모바일은 지도 아래 흐름에 둔다. 두 문장을 다
  렌더하고 미디어쿼리로 한쪽을 숨긴다 — SSR 과 첫 렌더가 같다.
*/
const MapCaption = styled.p`
  margin-top: 8px;
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  word-break: keep-all;

  /* 지도 중심 배치는 피커 바로 아래 안내 줄(「지도에서 구를 누르거나…」)이 같은 일을 한다 — 두 줄이
     피커를 사이에 두고 겹친다. 눈에서만 치우고 svg 의 설명(aria-describedby)으로는 남긴다. */
  @media ${HERO_TABLET_MEDIA} {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    text-align: left;
  }
`

/*
  범례와 기준(#588). 지도 바로 아래 한 줄이다 — 무엇을 칠했는지(「2026년 1분기 유동인구」)와
  농도의 방향(많음 → 적음)을 같이 말한다. 칸 모양은 구별현황 범례와 같다(status-map.tsx).
  값이 오기 전·실패에도 자리(20px)를 잡아 둬 캡션이 튀지 않는다. 지도 중심 배치에서 캡션은
  눈에서 치우지만 범례는 남긴다 — 칠의 뜻은 여기서만 말한다.
*/
const MapLegend = styled.p`
  min-height: 20px;
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px 12px;
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  word-break: keep-all;

  @media (max-width: 640px) {
    justify-content: flex-start;
  }
`

const LegendGroup = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-caption);
  font-weight: 500;
`

const LegendScale = styled.span`
  display: inline-flex;
  gap: 2px;
`

const LegendSwatch = styled.span<{ $fill: string }>`
  width: 12px;
  height: 12px;
  display: inline-block;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-compact);
  background: ${props => props.$fill};
`

const DesktopOnly = styled.span`
  @media (max-width: 640px) {
    display: none;
  }
`

const MobileOnly = styled.span`
  display: none;

  @media (max-width: 640px) {
    display: inline;
  }
`

type SeoulDistrictsMapProps = {
  onHoverChange?: (districtCode: string | null) => void
  /** 히어로 피커로 고른 구. 그 칸을 primary-700 으로 채운다. */
  selectedCode?: string | null
  /**
   * 있으면 폴리곤 활성화(클릭·탭·Enter·Space)가 라우팅 대신 이 콜백을 부른다 — 히어로는 모든
   * 폭에서 넘겨 지도가 피커 선택이 된다(hero-split-layout.md D4-7). 없으면 `/analysis` 로 이동한다.
   */
  onDistrictActivate?: (districtCode: string) => void
  /** false 면 호버 툴팁·호버 계측을 붙이지 않는다(모바일 — 터치가 mouseenter 를 먼저 쏜다). */
  tooltipEnabled?: boolean
  /** 참인 동안 자동 시연을 한 번 한다(데스크톱·정밀 포인터·모션 허용, 아직 안 고름). */
  autoDemo?: boolean
  /**
   * 시연 툴팁이 피해야 할 화면 x(히어로 카드 오른쪽 끝). 카드 뒤로 숨지 않게 그 오른쪽에
   * 놓고, 자리가 없으면 시연을 건너뛴다(D5-3).
   */
  demoAvoidRight?: () => number | null
}

export default function SeoulDistrictsMap({
  onHoverChange,
  selectedCode = null,
  onDistrictActivate,
  tooltipEnabled = true,
  autoDemo = false,
  demoAvoidRight,
}: SeoulDistrictsMapProps = {}) {
  const router = useRouter()
  const captionId = useId()
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)
  const [settledCode, setSettledCode] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  /* 지도 진입·포커스 한 번이면 시연은 끝이다 — 사용자가 이미 발견했다(D4-7). */
  const [interacted, setInteracted] = useState(false)
  const [demo, setDemo] = useState<{ code: string; x: number } | null>(null)
  const demoScheduledRef = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const legendId = useId()
  /* 값 칠(#588). 실패·빈 응답이면 null 이고 지도는 예전처럼 회색이다. */
  const rankingsQuery = useHomeDistrictRankings()
  const choropleth = useMemo(
    () =>
      rankingsQuery.data && isApiSuccess(rankingsQuery.data)
        ? toHeroMapChoropleth(rankingsQuery.data.dataBody)
        : null,
    [rankingsQuery.data],
  )
  /* 지도가 화면에 그려지는 배율(viewBox 1 = px). 툴팁을 설계 크기 아래로 줄이지 않는 데 쓴다. */
  const [screenScale, setScreenScale] = useState(1)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || typeof ResizeObserver === 'undefined') return
    // 관찰을 시작하면 콜백이 한 번 바로 불린다 — 첫 배율도 여기서 잡힌다.
    const observer = new ResizeObserver(() => {
      const scale = svg.getScreenCTM()?.a
      if (scale) setScreenScale(scale)
    })
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!autoDemo || interacted || demoScheduledRef.current) return
    const timer = window.setTimeout(() => {
      // 페이지당 한 번 — 닫힌 뒤 조건이 다시 참이 돼도 하지 않는다.
      demoScheduledRef.current = true
      const feature = SEOUL_STATUS_FEATURES.find(
        item => item.districtCode === AUTO_DEMO_DISTRICT_CODE,
      )
      const svg = svgRef.current
      const ctm = svg?.getScreenCTM()
      if (!feature || !svg || !ctm) return
      // 렌더와 같은 배율로 키운 크기로 자리를 잡는다(tooltipScale).
      const scale = tooltipScale(ctm.a)
      const defaultX = clampTooltipPosition(
        feature.center,
        { width: TOOLTIP_WIDTH * scale, height: TOOLTIP_HEIGHT * scale },
        VIEW_BOX_SIZE,
        TOOLTIP_PADDING,
      ).x
      const avoidRight = demoAvoidRight?.() ?? null
      const x =
        avoidRight === null
          ? defaultX
          : placeBesideRect(
              defaultX,
              TOOLTIP_WIDTH * scale,
              ctm,
              avoidRight,
              svg.getBoundingClientRect().right,
              AUTO_DEMO_GAP_PX,
            )
      // 카드 옆에 툴팁이 다 들어갈 자리가 없는 폭이면 시연하지 않는다 — 반쯤 가린 툴팁은 신호가 아니다.
      if (x === null) return
      setDemo({ code: feature.districtCode, x })
    }, AUTO_DEMO_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [autoDemo, interacted, demoAvoidRight])

  useEffect(() => {
    if (demo === null) return
    const timer = window.setTimeout(() => setDemo(null), AUTO_DEMO_VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [demo])

  /*
    시연은 사용자 행동이 아니다 — `hoveredCode` 를 건드리지 않으므로 호버 계측·카드 틴트가
    나가지 않는다. 실제 호버가 생기면 그쪽이 이긴다.
  */
  const demoVisible = autoDemo && !interacted && demo !== null
  const showingDemo = hoveredCode === null && demoVisible
  const tooltipCode = hoveredCode ?? (demoVisible ? demo.code : null)
  const tooltipFeature = SEOUL_STATUS_FEATURES.find(
    feature => feature.districtCode === tooltipCode,
  )
  const tooltipName = tooltipFeature
    ? districtNameByCode.get(tooltipFeature.districtCode)
    : undefined

  /*
    지도 호버 계측은 페이지당 1회다. 머무름 지연을 넘겨 툴팁이 실데이터를 부르는 순간만 센다 —
    지도를 스쳐 지나간 마우스는 「발견했다」가 아니다(measurement-and-deep-link.md D2).
  */
  const hoverTrackedRef = useRef(false)

  useEffect(() => {
    if (hoveredCode === null) return
    const timer = window.setTimeout(() => {
      setSettledCode(hoveredCode)
      if (!hoverTrackedRef.current) {
        hoverTrackedRef.current = true
        trackEvent('home_map_hover', { district_code: hoveredCode })
      }
    }, DETAIL_HOVER_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [hoveredCode])

  const detail = useDistrictDetail(
    tooltipCode,
    tooltipCode !== null &&
      (hoveredCode === null || settledCode === hoveredCode),
  )
  const rhythm = useMemo(
    () => (detail.data ? toDistrictRhythm(detail.data) : null),
    [detail.data],
  )
  const tooltipState: DistrictTooltipState = rhythm
    ? { status: 'ready', rhythm }
    : detail.isError
      ? { status: 'error' }
      : { status: 'loading' }
  /*
    좌우 분할로 지도 칸이 좁아지면 viewBox 안의 툴팁도 같이 줄어 글자를 읽을 수 없다(1024 폭 0.59배).
    줄어든 만큼 되돌려 키우고, 키운 크기로 자리를 잡는다(hero-split-layout.md D4-4).
  */
  const tipScale = tooltipScale(screenScale)
  const clampedPosition = tooltipFeature
    ? clampTooltipPosition(
        tooltipFeature.center,
        {
          width: TOOLTIP_WIDTH * tipScale,
          height: districtTooltipHeight(tooltipState) * tipScale,
        },
        VIEW_BOX_SIZE,
        TOOLTIP_PADDING,
      )
    : null
  const tooltipPosition =
    clampedPosition && showingDemo
      ? { x: demo.x, y: clampedPosition.y }
      : clampedPosition

  const activate = (districtCode: string) => {
    if (onDistrictActivate) {
      onDistrictActivate(districtCode)
      return
    }
    trackEvent('home_map_click', { district_code: districtCode })
    router.push(`/analysis?districtCode=${districtCode}`)
  }

  const startHover = (districtCode: string) => {
    setInteracted(true)
    setHoveredCode(districtCode)
    onHoverChange?.(districtCode)
  }

  const endHover = (districtCode: string) => {
    if (hoveredCode === districtCode) {
      setHoveredCode(null)
      onHoverChange?.(null)
    }
  }

  const hoverHandlers = (districtCode: string) => ({
    onMouseEnter: () => startHover(districtCode),
    onMouseLeave: () => endHover(districtCode),
    onFocus: () => startHover(districtCode),
    onBlur: () => endHover(districtCode),
  })

  const handleKeyDown = (
    event: KeyboardEvent<SVGPathElement>,
    districtCode: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate(districtCode)
    }
  }

  return (
    <Wrapper onPointerEnter={() => setInteracted(true)}>
      <MapSvg
        ref={svgRef}
        viewBox={SEOUL_STATUS_VIEW_BOX}
        preserveAspectRatio="xMidYMid meet"
        aria-describedby={choropleth ? `${legendId} ${captionId}` : captionId}
      >
        {SEOUL_STATUS_FEATURES.map((feature, index) => {
          const name = districtNameByCode.get(feature.districtCode)
          const selected = feature.districtCode === selectedCode
          return (
            <DistrictPath
              key={feature.districtCode}
              d={feature.path}
              role={onDistrictActivate ? 'button' : 'link'}
              aria-pressed={onDistrictActivate ? selected : undefined}
              tabIndex={0}
              aria-label={describeHeroMapDistrict(
                name || '자치구',
                choropleth?.itemsByCode.get(feature.districtCode),
              )}
              data-value-step={choropleth?.steps.get(feature.districtCode)}
              data-selected={selected ? 'true' : undefined}
              $index={index}
              $appear={mounted}
              {...(tooltipEnabled
                ? hoverHandlers(feature.districtCode)
                : { onFocus: () => setInteracted(true) })}
              onClick={() => activate(feature.districtCode)}
              onKeyDown={event => handleKeyDown(event, feature.districtCode)}
            />
          )
        })}
        {tooltipEnabled && tooltipFeature && tooltipPosition ? (
          <TooltipGroup
            transform={`translate(${tooltipPosition.x}, ${tooltipPosition.y}) scale(${tipScale})`}
          >
            <DistrictTooltip
              x={0}
              y={0}
              name={tooltipName ?? '자치구'}
              state={tooltipState}
            />
          </TooltipGroup>
        ) : null}
      </MapSvg>
      <MapLegend id={legendId} data-hero-map-legend="">
        {choropleth ? (
          <>
            <span>{choropleth.basisLabel}</span>
            <LegendGroup>
              많음
              <LegendScale aria-hidden="true">
                {STATUS_MAP_VALUE_STEPS.map(({ step, mixPercent }) => (
                  <LegendSwatch
                    key={step}
                    $fill={statusMapValueStepFill(mixPercent)}
                  />
                ))}
              </LegendScale>
              적음
            </LegendGroup>
            {choropleth.hasDistrictWithoutStep ? (
              <LegendGroup>
                <LegendSwatch
                  aria-hidden="true"
                  $fill="var(--color-surface-muted)"
                />
                데이터 없음
              </LegendGroup>
            ) : null}
          </>
        ) : null}
      </MapLegend>
      <MapCaption id={captionId}>
        <DesktopOnly>
          자치구 위에 올리면 시간대별 유동인구가 보이고, 누르면 그 구가 바로
          골라져요.
        </DesktopOnly>
        <MobileOnly>자치구를 누르면 위 칸에서 바로 골라져요.</MobileOnly>
      </MapCaption>
    </Wrapper>
  )
}
