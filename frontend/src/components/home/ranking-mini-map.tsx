'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import styled from 'styled-components'
import {
  SEOUL_STATUS_FEATURES,
  SEOUL_STATUS_VIEW_BOX,
} from '@/data/seoul-status-map'
import {
  STATUS_MAP_VALUE_STEPS,
  statusMapValueStepFill,
} from '@/lib/status/status-map-model'
import type { RankingMapLayers } from '@/lib/home/ranking-map'

/**
 * 「지금 많이 본 지역」 겹침 미니 지도(ranking-mini-map.md).
 *
 * 지표 Top 5 는 순위 농도로 칠하고, 많이 본 곳은 구 중심에 순위 숫자 배지로 얹는다 — 두 순위에
 * 모두 든 구는 **칠 + 배지**로 한눈에 보인다. 값·변화율은 그리지 않는다(목록에 있다).
 *
 * `/status` 의 `StatusMap` 은 쓰지 않는다. 상태 페이지 스토어·라벨 티어에 묶여 있고 이 자리는
 * 클릭·툴팁이 없는 가벼운 그림이면 된다. 색 단계값만 가져다 써 「같은 농도 = 같은 순위 뜻」을 맞춘다.
 *
 * 지도는 `role="img"` 한 덩어리다. 폴리곤·배지는 포커스되지 않고 역할이 없다 — 스크린리더는 요약
 * 한 문장을 듣고 상세는 목록에서 읽는다. 터치 타깃·Tab 수도 늘지 않는다(D4-3).
 */

/** 순위 1~5 에 하나씩 쓰는 칠 농도. `/status` 지도의 다섯 단계와 같은 값이다(D4-1). */
const FILL_MIX_PERCENTS = STATUS_MAP_VALUE_STEPS.map(step => step.mixPercent)

const fillFor = (rank: number) =>
  statusMapValueStepFill(FILL_MIX_PERCENTS[rank - 1])

/**
 * 배지 반지름(viewBox 단위). 배지 `<g>` 를 지도 배율의 역수로 키우므로 화면에서도 이 값(px)이다 —
 * 지름 22px 고정(D4-1). 히어로 툴팁 보정과 같은 방식이다.
 */
const BADGE_RADIUS = 11

/*
  등장 연출 간격(D4-4). 칠은 5위 → 1위로 80ms 씩, 배지는 칠이 끝난 뒤 8위 → 1위로 40ms 씩.
  토큰 값(--motion-standard 250 · --motion-fast 150)과 같은 수를 여기서도 쓴다 — 연출이 끝나는
  시점을 JS 가 알아야 연결선을 그 뒤에 그린다.
*/
const FILL_STAGGER_MS = 80
const BADGE_STAGGER_MS = 40
const MOTION_STANDARD_MS = 250
const MOTION_FAST_MS = 150

const introDurationMs = (fillCount: number, badgeCount: number) =>
  Math.max(0, fillCount - 1) * FILL_STAGGER_MS +
  (fillCount > 0 ? MOTION_STANDARD_MS : 0) +
  Math.max(0, badgeCount - 1) * BADGE_STAGGER_MS +
  (badgeCount > 0 ? MOTION_FAST_MS : 0)

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type SeoulFeature = (typeof SEOUL_STATUS_FEATURES)[number]

const featureByCode = new Map<string, SeoulFeature>(
  SEOUL_STATUS_FEATURES.map(feature => [feature.districtCode, feature]),
)

const Figure = styled.figure`
  margin: 0;
  display: grid;
  gap: 10px;
`

const fillRules = FILL_MIX_PERCENTS.map(
  (_, index) => `
    &[data-rank='${index + 1}'] {
      fill: ${fillFor(index + 1)};
    }
  `,
).join('')

/*
  칠은 `data-revealed` 가 참이 된 뒤에만 보인다. reduced-motion 이면 처음부터 최종 상태다 —
  JS 가 돌기 전(SSR)에도 그렇게 그려지도록 CSS 로 함께 건다.
*/
const MapSvg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 800 / 620;
  overflow: visible;
  -webkit-user-select: none;
  user-select: none;
`

const DistrictPath = styled.path`
  fill: var(--color-surface-muted);
  stroke: var(--color-border-200);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
  transition:
    fill var(--motion-slow) var(--ease-standard),
    opacity var(--motion-fast) var(--ease-standard);

  svg[data-revealed='true'] & {
    ${fillRules}
  }

  svg[data-intro='true'] & {
    transition:
      fill var(--motion-standard) var(--ease-enter),
      opacity var(--motion-fast) var(--ease-standard);
  }

  /* 강조 중에는 나머지 구를 낮춘다. 배지는 낮추지 않는다(D4-1). */
  svg[data-has-active='true'] &:not([data-active='true']) {
    opacity: 0.55;
  }

  @media ${REDUCED_MOTION_QUERY} {
    ${fillRules}
    transition: none;

    svg[data-intro='true'] & {
      transition: none;
    }
  }
`

const ActiveOutline = styled.path`
  fill: none;
  stroke: var(--color-primary-700);
  stroke-width: 2.5px;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
`

const BadgePop = styled.g`
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity var(--motion-fast) var(--ease-enter),
    transform var(--motion-fast) var(--ease-enter);
  pointer-events: none;

  svg[data-revealed='true'] & {
    opacity: 1;
    transform: none;
  }

  @media ${REDUCED_MOTION_QUERY} {
    opacity: 1;
    transform: none;
    transition: none;
  }
`

const BadgeCircle = styled.circle`
  fill: var(--color-text-900);
`

const BadgeText = styled.text`
  fill: white;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`

/*
  범례 자리는 늘 잡아 둔다 — 스켈레톤에서 데이터로 넘어갈 때·지표 토글로 칠 항목이 빠질 때
  높이가 튀지 않게(D2-9).
*/
const Legend = styled.figcaption`
  min-height: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 16px;
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const Swatches = styled.span`
  display: inline-flex;
  gap: 2px;
`

const Swatch = styled.span<{ $fill: string }>`
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: ${p => p.$fill};
`

const BadgeSwatch = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-text-900);
`

export type RankingMiniMapProps = {
  /** 그릴 레이어. null 이면 같은 크기의 회색 실루엣(스켈레톤)이다. */
  layers: RankingMapLayers | null
  /** 칠 레이어의 지표 이름(범례). */
  metricLabel?: string | null
  /** 강조할 구. 테두리를 굵게 하고 나머지 구를 낮춘다. */
  activeCode?: string | null
  /** 정밀 포인터에서만 넘긴다 — 터치에서 탭이 hover 를 흉내 내 강조가 남지 않게(D4-3). */
  onDistrictEnter?: (code: string) => void
  onDistrictLeave?: (code: string) => void
  /** 연결선이 구 중심의 화면 좌표를 재는 데 쓴다(`getScreenCTM`). */
  svgRef?: RefObject<SVGSVGElement | null>
  /** 등장 연출이 끝났는지. 연결선은 이 뒤에 그린다(D4-4 의 4). */
  onIntroDoneChange?: (done: boolean) => void
}

export default function RankingMiniMap({
  layers,
  metricLabel = null,
  activeCode = null,
  onDistrictEnter,
  onDistrictLeave,
  svgRef,
  onIntroDoneChange,
}: RankingMiniMapProps) {
  const figureRef = useRef<HTMLElement | null>(null)
  const ownSvgRef = useRef<SVGSVGElement | null>(null)
  const mapSvgRef = svgRef ?? ownSvgRef
  const [revealed, setRevealed] = useState(false)
  const [introDone, setIntroDone] = useState(false)
  /* 지도가 화면에 그려지는 배율(viewBox 1 = px). 배지를 화면 22px 로 지키는 데 쓴다. */
  const [screenScale, setScreenScale] = useState(1)

  const hasLayers =
    layers !== null && (layers.fills.size > 0 || layers.badges.length > 0)

  /* 지도 상자가 30% 보이면 한 번 연다. reduced-motion 이면 처음부터 연 상태다. */
  useEffect(() => {
    const figure = figureRef.current
    if (!figure) return
    if (
      window.matchMedia?.(REDUCED_MOTION_QUERY).matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealed(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(figure)
    return () => observer.disconnect()
  }, [])

  /*
    연출은 「보였다」와 「데이터가 왔다」가 둘 다 참인 첫 순간에 시작한다 — 데이터가 늦으면 도착한
    뒤에 한다. 끝나면 간격(transition-delay)을 걷어 지표 토글이 바로 크로스페이드되게 한다.
  */
  const fillCount = layers?.fills.size ?? 0
  const badgeCount = layers?.badges.length ?? 0
  const introRunning = revealed && hasLayers && !introDone
  useEffect(() => {
    if (!revealed || !hasLayers || introDone) return
    const reduced = window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false
    const timer = window.setTimeout(
      () => setIntroDone(true),
      reduced ? 0 : introDurationMs(fillCount, badgeCount),
    )
    return () => window.clearTimeout(timer)
    // 연출 길이는 시작 순간의 개수로 정한다 — 도중에 토글해도 다시 재지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, hasLayers, introDone])

  useEffect(() => {
    onIntroDoneChange?.(introDone)
  }, [introDone, onIntroDoneChange])

  useEffect(() => {
    const svg = mapSvgRef.current
    if (!svg || typeof ResizeObserver === 'undefined') return
    // 관찰을 시작하면 콜백이 한 번 바로 불린다 — 첫 배율도 여기서 잡힌다.
    const observer = new ResizeObserver(() => {
      const scale = svg.getScreenCTM()?.a
      if (scale) setScreenScale(scale)
    })
    observer.observe(svg)
    return () => observer.disconnect()
  }, [mapSvgRef])

  const fills = layers?.fills ?? new Map<string, number>()
  const badges = layers?.badges ?? []
  const activeFeature =
    activeCode !== null ? featureByCode.get(activeCode) : undefined
  const badgeScale = 1 / screenScale
  /* 높은 순위가 가려지지 않게 낮은 순위부터 그린다 — 나중에 그린 것이 위에 온다(D6). */
  const badgesBottomUp = [...badges].sort((a, b) => b.rank - a.rank)

  return (
    <Figure ref={figureRef} data-ranking-mini-map>
      <MapSvg
        ref={mapSvgRef}
        viewBox={SEOUL_STATUS_VIEW_BOX}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={
          layers === null
            ? '서울 지도를 불러오는 중이에요.'
            : hasLayers
              ? layers.summary
              : '서울 지도에 표시할 순위가 아직 없어요.'
        }
        data-revealed={revealed && hasLayers ? 'true' : 'false'}
        data-intro={introRunning ? 'true' : 'false'}
        data-has-active={activeFeature ? 'true' : 'false'}
      >
        {SEOUL_STATUS_FEATURES.map(feature => {
          const rank = fills.get(feature.districtCode)
          const active = feature.districtCode === activeCode
          return (
            <DistrictPath
              key={feature.districtCode}
              d={feature.path}
              data-district-code={feature.districtCode}
              data-rank={rank}
              data-active={active ? 'true' : undefined}
              style={
                introRunning && rank !== undefined
                  ? {
                      transitionDelay: `${(fillCount - rank) * FILL_STAGGER_MS}ms`,
                    }
                  : undefined
              }
              onPointerEnter={
                onDistrictEnter
                  ? () => onDistrictEnter(feature.districtCode)
                  : undefined
              }
              onPointerLeave={
                onDistrictLeave
                  ? () => onDistrictLeave(feature.districtCode)
                  : undefined
              }
            />
          )
        })}
        {activeFeature ? <ActiveOutline d={activeFeature.path} /> : null}
        {badgesBottomUp.map(badge => {
          const feature = featureByCode.get(badge.code)
          if (!feature) return null
          const badgeDelay =
            Math.max(0, fillCount - 1) * FILL_STAGGER_MS +
            (fillCount > 0 ? MOTION_STANDARD_MS : 0) +
            (badgeCount - badge.rank) * BADGE_STAGGER_MS
          return (
            <g
              key={badge.code}
              data-badge-rank={badge.rank}
              transform={`translate(${feature.center.x} ${feature.center.y}) scale(${badgeScale})`}
            >
              <BadgePop
                style={
                  introRunning
                    ? { transitionDelay: `${badgeDelay}ms` }
                    : undefined
                }
              >
                <BadgeCircle r={BADGE_RADIUS} />
                <BadgeText
                  textAnchor="middle"
                  dominantBaseline="central"
                  aria-hidden="true"
                >
                  {badge.rank}
                </BadgeText>
              </BadgePop>
            </g>
          )
        })}
      </MapSvg>
      <Legend aria-hidden="true" data-ranking-map-legend>
        {fills.size > 0 && metricLabel ? (
          <LegendItem data-legend-item="fill">
            <Swatches>
              {Array.from({ length: fills.size }, (_, index) => (
                <Swatch key={index} $fill={fillFor(index + 1)} />
              ))}
            </Swatches>
            {metricLabel} Top {fills.size} · 진할수록 위
          </LegendItem>
        ) : null}
        {badges.length > 0 ? (
          <LegendItem data-legend-item="badge">
            <BadgeSwatch />
            많이 본 순위
          </LegendItem>
        ) : null}
      </Legend>
    </Figure>
  )
}
