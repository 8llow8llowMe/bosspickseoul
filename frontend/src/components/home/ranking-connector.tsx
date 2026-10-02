'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import styled from 'styled-components'
import { SEOUL_STATUS_FEATURES } from '@/data/seoul-status-map'

/**
 * 활성 행 → 지도의 그 구 중심을 잇는 연결선(ranking-mini-map.md D4-2).
 *
 * 목록 래퍼를 덮는 장식 SVG 다(`aria-hidden`, `pointer-events: none`) — 행 클릭·호버를 가로채지
 * 않고, 정보는 늘 목록과 지도에 있다. 좌표는 래퍼 기준이라 스크롤에는 다시 재지 않는다.
 *
 * 행은 `[data-rank-column="view|metric"] [data-rank-key="<구 코드>"]` 로 찾는다. 많이 본 행은 오른쪽
 * 가장자리, 지표 행은 왼쪽 가장자리의 세로 가운데에서 시작한다(지도가 두 목록 사이에 있다).
 */

export type RankingConnectorSide = 'view' | 'metric'

type Point = { x: number; y: number }

type Line = {
  /** 이 선이 가리키는 구. 활성 구와 다르면 지난 측정이 남은 것이라 그리지 않는다. */
  code: string
  side: RankingConnectorSide
  start: Point
  end: Point
  /** 끝이 배지 가장자리에서 멈췄는가. 그때는 배지가 끝 표시라 점을 찍지 않는다. */
  endsAtBadge: boolean
}

/** 배지 화면 반지름(11px) + 테두리 여유. 미니 지도의 `BADGE_RADIUS` 와 같은 크기다. */
const BADGE_INSET_PX = 12

const featureCenter = new Map<string, { x: number; y: number }>(
  SEOUL_STATUS_FEATURES.map(feature => [feature.districtCode, feature.center]),
)

/** 가로 베지어. 두 제어점이 시작·끝과 같은 높이에 있어 행에서 수평으로 나가 구에 수평으로 닿는다. */
export const connectorPath = (start: Point, end: Point): string => {
  const dx = (end.x - start.x) * 0.5
  const round = (value: number) => Math.round(value * 10) / 10
  return `M ${round(start.x)} ${round(start.y)} C ${round(start.x + dx)} ${round(start.y)} ${round(end.x - dx)} ${round(end.y)} ${round(end.x)} ${round(end.y)}`
}

const Overlay = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
`

const Stroke = styled.path`
  fill: none;
  stroke: var(--color-primary-700);
  stroke-width: 1.5px;
  stroke-linecap: round;
`

const EndDot = styled.circle`
  fill: var(--color-primary-700);
`

/**
 * 한 줄. 활성 구가 바뀌면 부모가 `key` 를 바꿔 새로 마운트한다 — 이전 선은 남기지 않는다.
 *
 * 그리기는 마운트 때 한 번만 한다. 끝나면 대시를 걷어내, 이후 크기가 바뀌어 길이가 달라져도 선이
 * 잘리지 않는다.
 */
function ConnectorStroke({ d }: { d: string }) {
  const ref = useRef<SVGPathElement | null>(null)

  useLayoutEffect(() => {
    const path = ref.current
    if (!path || typeof path.getTotalLength !== 'function') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const length = path.getTotalLength()
    if (!(length > 0)) return

    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    // 시작 상태를 확정한 뒤 전환을 건다(같은 프레임에 걸면 시작 상태가 건너뛰어진다).
    path.getBoundingClientRect()
    path.style.transition =
      'stroke-dashoffset var(--motion-standard) var(--ease-enter)'
    path.style.strokeDashoffset = '0'

    const clear = () => {
      path.style.transition = ''
      path.style.strokeDasharray = ''
      path.style.strokeDashoffset = ''
    }
    path.addEventListener('transitionend', clear, { once: true })
    return () => path.removeEventListener('transitionend', clear)
  }, [])

  return <Stroke ref={ref} d={d} data-ranking-connector-line />
}

export type RankingConnectorProps = {
  /** 연결선이 덮는 목록 래퍼. `position: relative` 여야 한다. */
  containerRef: RefObject<HTMLElement | null>
  mapSvgRef: RefObject<SVGSVGElement | null>
  activeCode: string | null
  /** ≥1200 · 정밀 포인터 · 등장 연출이 끝난 뒤에만 참이다. */
  enabled: boolean
  /** 목록 내용이 바뀌는 계기(지표 토글). 바뀌면 다시 잰다. */
  revision: string
  /**
   * 순위 배지가 얹힌 구. 이 구로 가는 선은 배지 가장자리에서 멈춘다 — 중심까지 그으면 선과 끝점이
   * 배지 숫자를 가린다.
   */
  badgeCodes?: readonly string[]
}

export default function RankingConnector({
  containerRef,
  mapSvgRef,
  activeCode,
  enabled,
  revision,
  badgeCodes = [],
}: RankingConnectorProps) {
  const [lines, setLines] = useState<Line[]>([])
  const [measureTick, setMeasureTick] = useState(0)
  /* 배지 목록은 내용으로 비교한다 — 부모가 렌더마다 새 배열을 넘긴다. */
  const badgeKey = badgeCodes.join(',')

  /* 래퍼·지도 크기가 바뀌거나 폰트가 늦게 와 행 높이가 바뀌면 다시 잰다. */
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    const svg = mapSvgRef.current
    if (!container || !svg || typeof ResizeObserver === 'undefined') return
    const bump = () => setMeasureTick(tick => tick + 1)
    const observer = new ResizeObserver(bump)
    observer.observe(container)
    observer.observe(svg)
    let cancelled = false
    void document.fonts?.ready.then(() => {
      if (!cancelled) bump()
    })
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [enabled, containerRef, mapSvgRef])

  useLayoutEffect(() => {
    const container = containerRef.current
    const svg = mapSvgRef.current
    const center = activeCode !== null ? featureCenter.get(activeCode) : null
    const ctm = svg?.getScreenCTM()
    if (!enabled || !container || !svg || !center || !ctm) {
      setLines(current => (current.length ? [] : current))
      return
    }

    const box = container.getBoundingClientRect()
    const screenEnd = new DOMPoint(center.x, center.y).matrixTransform(ctm)
    const center2d = { x: screenEnd.x - box.left, y: screenEnd.y - box.top }
    const endsAtBadge = badgeKey.split(',').includes(activeCode!)

    const next: Line[] = []
    for (const side of ['view', 'metric'] as const) {
      const row = container.querySelector(
        `[data-rank-column="${side}"] [data-rank-key="${CSS.escape(activeCode!)}"]`,
      )
      if (!row) continue
      const rect = row.getBoundingClientRect()
      const start = {
        x: (side === 'view' ? rect.right : rect.left) - box.left,
        y: rect.top + rect.height / 2 - box.top,
      }
      // 베지어가 수평으로 닿으므로 끝을 가로로만 당기면 배지 가장자리에 닿는다.
      const direction = Math.sign(center2d.x - start.x) || 1
      next.push({
        code: activeCode!,
        side,
        start,
        end: endsAtBadge
          ? { x: center2d.x - direction * BADGE_INSET_PX, y: center2d.y }
          : center2d,
        endsAtBadge,
      })
    }
    setLines(next)
  }, [
    enabled,
    activeCode,
    revision,
    measureTick,
    containerRef,
    mapSvgRef,
    badgeKey,
  ])

  /*
    활성 구가 바뀐 첫 렌더에는 `lines` 가 아직 지난 구의 측정이다. 그대로 새 key 로 마운트하면 새 선이
    지난 선의 길이로 대시 애니메이션을 시작한다 — 측정이 따라올 때까지 그리지 않는다.
  */
  const current = lines.filter(line => line.code === activeCode)
  if (!enabled || current.length === 0) return null

  return (
    <Overlay aria-hidden="true" data-ranking-connector>
      {current.map(line => (
        <g key={`${line.code}-${line.side}`}>
          <ConnectorStroke d={connectorPath(line.start, line.end)} />
          {line.endsAtBadge ? null : (
            <EndDot cx={line.end.x} cy={line.end.y} r={3} />
          )}
        </g>
      ))}
    </Overlay>
  )
}
