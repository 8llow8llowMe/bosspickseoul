import { normalizeBoundary } from '@/lib/map/geometry'
import type { AreaBoundaryItem } from '@/types/recommend'

/**
 * 지도 라벨(`drawAreaLabelLayer`)끼리 겹칠 때 무엇을 남길지 정하는 순수 함수 모음.
 *
 * 상권 단계(줌 4 이하)는 한 화면에 라벨이 수십~수백 개라 서로 덮이면 어느 이름이
 * 어느 면인지 읽을 수 없다(#602). 그래서 **우선순위가 높은 라벨부터 자리를 잡고,
 * 이미 자리 잡은 라벨과 겹치는 라벨은 숨긴다**(그리디). 숨긴 상권은 선택 패널의
 * 목록·검색으로 고를 수 있고, 폴리곤에 올리면(호버·포커스) 라벨이 다시 뜬다.
 *
 * 우선순위: 선택된 라벨 → 호출부가 준 순위(인기 등, 작을수록 앞) → 폴리곤 면적이 큰 순
 * → 코드 사전순(동률에서도 결과가 매번 같도록).
 */

export type LabelRect = {
  code: string
  /** 지도 컨테이너 기준 라벨 중심 좌표(px). 라벨은 xAnchor·yAnchor 0.5 로 얹힌다. */
  centerX: number
  centerY: number
  width: number
  height: number
}

/** 라벨 사이에 최소한 남기는 여백(px). 맞닿은 두 알약은 한 덩어리로 읽힌다. */
export const LABEL_COLLISION_GAP = 4

/**
 * `.area-map-label` 의 실제 크기를 아직 잴 수 없을 때(jsdom, 그리기 전) 쓰는 근사치.
 * 전역 스타일(font 12px·700, 좌우 패딩 10px, 테두리 1px, min-width 44px, min-height 34px)
 * 기준이다. 실측(1440px Chromium)에서 한글 5자 라벨이 74px 이었다.
 */
export const LABEL_HEIGHT_ESTIMATE = 34
const LABEL_MIN_WIDTH = 44
const LABEL_HORIZONTAL_CHROME = 22
const WIDE_GLYPH_WIDTH = 10.5
const NARROW_GLYPH_WIDTH = 7
const SPACE_WIDTH = 3.5

const isWideGlyph = (char: string): boolean => /[ᄀ-ᇿ㄰-㆏가-힯一-鿿]/.test(char)

export const estimateLabelWidth = (text: string): number => {
  const glyphs = Array.from(text).reduce((sum, char) => {
    if (char === ' ') return sum + SPACE_WIDTH
    return sum + (isWideGlyph(char) ? WIDE_GLYPH_WIDTH : NARROW_GLYPH_WIDTH)
  }, 0)
  return Math.max(LABEL_MIN_WIDTH, Math.ceil(glyphs + LABEL_HORIZONTAL_CHROME))
}

/**
 * 경계 좌표의 넓이(경위도 제곱, 신발끈 공식). **순위 비교에만** 쓴다 — 서울 안에서는
 * 위도에 따른 경도 축척 차이가 1% 남짓이라 m² 로 바꾸지 않아도 순서가 같다.
 */
export const polygonAreaScore = (area: AreaBoundaryItem): number => {
  const points = normalizeBoundary(area.boundaryCoords)
  if (points.length < 3) return 0
  let twice = 0
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    twice += current.lng * next.lat - next.lng * current.lat
  }
  return Math.abs(twice) / 2
}

export type RankAreaLabelsOptions = {
  selectedCode: string | null
  /** 인기 순위 등 호출부가 아는 우선순위. 값이 작을수록 먼저 자리를 잡는다. */
  priorityByCode?: ReadonlyMap<string, number>
}

/** 라벨을 자리 잡을 순서대로 정렬한 코드 목록. O(n log n). */
export const rankAreaLabels = (
  areas: readonly AreaBoundaryItem[],
  { selectedCode, priorityByCode }: RankAreaLabelsOptions,
): string[] => {
  const entries = areas.map(area => {
    const code = String(area.areaCode)
    return {
      code,
      selected: code === selectedCode,
      priority: priorityByCode?.get(code) ?? Number.POSITIVE_INFINITY,
      size: polygonAreaScore(area),
    }
  })

  entries.sort((a, b) => {
    if (a.selected !== b.selected) return a.selected ? -1 : 1
    if (a.priority !== b.priority) return a.priority < b.priority ? -1 : 1
    if (a.size !== b.size) return b.size - a.size
    if (a.code === b.code) return 0
    return a.code < b.code ? -1 : 1
  })

  return entries.map(entry => entry.code)
}

type Box = { left: number; top: number; right: number; bottom: number }

const toBox = (rect: LabelRect, inflate: number): Box => ({
  left: rect.centerX - rect.width / 2 - inflate,
  top: rect.centerY - rect.height / 2 - inflate,
  right: rect.centerX + rect.width / 2 + inflate,
  bottom: rect.centerY + rect.height / 2 + inflate,
})

/** 맞닿기만 한 것은 겹침이 아니다. 여백은 `inflate` 로 이미 반영했다. */
const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

/**
 * 우선순위 순으로 받은 라벨 중 **앞선 라벨과 겹치지 않는 것만** 남긴다.
 *
 * 균일 격자(셀 = 가장 큰 라벨 변 + 여백)에 자리 잡은 상자를 꽂아 두고, 후보는 자기가
 * 걸치는 셀(최대 2×2)만 본다. 그래서 정렬을 뺀 이 단계는 라벨 밀도가 일정할 때 O(n) 이다.
 * 여백은 양쪽 상자를 절반씩 부풀려 반영한다 — 부풀린 두 상자가 겹치면 둘은 적어도 한
 * 셀을 공유하므로 이웃 셀만 보는 것으로 빠짐이 없다.
 */
export const selectVisibleLabels = (
  rectsInPriorityOrder: readonly LabelRect[],
  gap: number = LABEL_COLLISION_GAP,
): Set<string> => {
  const visible = new Set<string>()
  if (rectsInPriorityOrder.length === 0) return visible

  const inflate = gap / 2
  const cellSize = Math.max(
    1,
    ...rectsInPriorityOrder.map(
      rect => Math.max(rect.width, rect.height) + gap,
    ),
  )
  const grid = new Map<string, Box[]>()
  const cellRange = (box: Box) => ({
    x0: Math.floor(box.left / cellSize),
    x1: Math.floor(box.right / cellSize),
    y0: Math.floor(box.top / cellSize),
    y1: Math.floor(box.bottom / cellSize),
  })

  rectsInPriorityOrder.forEach(rect => {
    if (visible.has(rect.code)) return
    const box = toBox(rect, inflate)
    const { x0, x1, y0, y1 } = cellRange(box)

    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        const placed = grid.get(`${x}:${y}`)
        if (placed?.some(other => overlaps(box, other))) return
      }
    }

    visible.add(rect.code)
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        const key = `${x}:${y}`
        const placed = grid.get(key)
        if (placed) placed.push(box)
        else grid.set(key, [box])
      }
    }
  })

  return visible
}
