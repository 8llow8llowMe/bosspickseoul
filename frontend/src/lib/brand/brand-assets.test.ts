import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  BRAND_ACCENT,
  BRAND_GHOST,
  BRAND_INK,
  BRAND_INVERSE_ACCENT,
  BRAND_INVERSE_BODY,
  CONTAINER_RADIUS_RATIO,
  GRID_ACCENT_CELL,
  GRID_BODY_CELLS,
  GRID_GHOST_CELLS,
  SOLID_ACCENT_CELL,
  SOLID_BODY_CELLS,
  containerSideFor,
  type MarkCell,
} from './mark-geometry'

/**
 * 정적 SVG 는 손으로 쓸 수밖에 없다(React 로 빌드 타임 생성을 하면 파일이
 * 저장소에 남지 않는다). 그래서 기하 모듈과 어긋나지 않도록 여기서 묶는다.
 * 좌표를 한쪽만 고치면 이 테스트가 깨진다.
 */

const projectRoot = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../..',
)

const readAsset = (relative: string): string =>
  readFileSync(path.join(projectRoot, relative), 'utf8')

type ParsedRect = { x: number; y: number; fill: string; container: boolean }

const parseRects = (svg: string): ParsedRect[] =>
  [...svg.matchAll(/<rect\b[^>]*>/g)].map(([tag]) => ({
    x: Number(/\bx="([-\d.]+)"/.exec(tag)?.[1] ?? '0'),
    y: Number(/\by="([-\d.]+)"/.exec(tag)?.[1] ?? '0'),
    fill: (/\bfill="([^"]+)"/.exec(tag)?.[1] ?? '').toLowerCase(),
    container: /data-role="container"/.test(tag),
  }))

const signature = (cells: readonly MarkCell[], fill: string): string[] =>
  cells.map(cell => `${cell.x},${cell.y},${fill}`).sort()

const rectSignature = (rects: ParsedRect[]): string[] =>
  rects
    .filter(rect => !rect.container)
    .map(rect => `${rect.x},${rect.y},${rect.fill}`)
    .sort()

describe('public/brand/mark-primary.svg', () => {
  const svg = readAsset('public/brand/mark-primary.svg')

  it('viewBox 가 격자 박스다', () => {
    expect(svg).toContain('viewBox="0 0 19 34"')
  })

  it('본체 17 · 고스트 7 · 강조 1 을 기하 모듈과 똑같이 그린다', () => {
    expect(rectSignature(parseRects(svg))).toEqual(
      [
        ...signature(GRID_BODY_CELLS, BRAND_INK),
        ...signature(GRID_GHOST_CELLS, BRAND_GHOST),
        ...signature([GRID_ACCENT_CELL], BRAND_ACCENT),
      ].sort(),
    )
  })
})

describe('public/brand/mark-grid.svg', () => {
  const svg = readAsset('public/brand/mark-grid.svg')

  it('고스트 없이 본체 17 + 강조 1 만 그린다', () => {
    expect(svg).toContain('viewBox="0 0 19 34"')
    expect(svg.toLowerCase()).not.toContain(BRAND_GHOST)
    expect(rectSignature(parseRects(svg))).toEqual(
      [
        ...signature(GRID_BODY_CELLS, BRAND_INK),
        ...signature([GRID_ACCENT_CELL], BRAND_ACCENT),
      ].sort(),
    )
  })
})

describe('public/brand/mark-solid.svg', () => {
  const svg = readAsset('public/brand/mark-solid.svg')

  it('갭 없는 16x28 박스에 본체 17 + 강조 1 을 그린다', () => {
    expect(svg).toContain('viewBox="0 0 16 28"')
    expect(rectSignature(parseRects(svg))).toEqual(
      [
        ...signature(SOLID_BODY_CELLS, BRAND_INK),
        ...signature([SOLID_ACCENT_CELL], BRAND_ACCENT),
      ].sort(),
    )
  })
})

describe('app/icon.svg (파비콘)', () => {
  const svg = readAsset('app/icon.svg')

  it('컨테이너 비례가 명세대로다', () => {
    const side = containerSideFor('solid')

    expect(svg).toContain(`viewBox="0 0 ${side} ${side}"`)
    expect(svg).toContain(`rx="${side * CONTAINER_RADIUS_RATIO}"`)
    expect(svg).toContain(`data-role="container" fill="${BRAND_INK}"`)
  })

  it('컨테이너 안에서 심볼을 중앙에 놓는다', () => {
    expect(svg).toContain('translate(14.4 8.4)')
  })

  // 본체가 흰색이므로 강조색도 반전값이다. 라이트 강조색을 쓰면 안 된다.
  it('흰 본체 17 + 반전 강조 1 을 기하 모듈과 똑같이 그린다', () => {
    expect(rectSignature(parseRects(svg))).toEqual(
      [
        ...signature(SOLID_BODY_CELLS, BRAND_INVERSE_BODY),
        ...signature([SOLID_ACCENT_CELL], BRAND_INVERSE_ACCENT),
      ].sort(),
    )
    expect(svg.toLowerCase()).not.toContain(BRAND_ACCENT)
  })

  /** 노치를 채우면 실루엣이 사각형이 되어 B 가 죽는다. */
  it('노치를 채우지 않는다', () => {
    const filled = new Set(
      parseRects(svg)
        .filter(rect => !rect.container)
        .map(rect => `${rect.x},${rect.y}`),
    )

    expect(filled.has('12,0')).toBe(false)
    expect(filled.has('12,12')).toBe(false)
    expect(filled.has('12,24')).toBe(false)
  })
})
