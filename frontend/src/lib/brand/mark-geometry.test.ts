import { describe, expect, it } from 'vitest'

import {
  GRID_ACCENT_CELL,
  GRID_BODY_CELLS,
  GRID_GHOST_CELLS,
  GRID_MODULE,
  GRID_NOTCH_CELLS,
  GRID_VIEWBOX,
  SOLID_ACCENT_CELL,
  SOLID_BODY_CELLS,
  SOLID_VIEWBOX,
  containerSideFor,
  markWidthFor,
  resolveMarkVariant,
  type MarkCell,
} from './mark-geometry'

const key = (cell: MarkCell): string => `${cell.x},${cell.y}`

describe('격자 변형 기하', () => {
  // 4열 × 7행 = 28칸이 남지도 겹치지도 않아야 한다.
  it('28칸을 본체 17 · 고스트 7 · 강조 1 · 노치 3 으로 정확히 나눈다', () => {
    expect(GRID_BODY_CELLS).toHaveLength(17)
    expect(GRID_GHOST_CELLS).toHaveLength(7)
    expect(GRID_NOTCH_CELLS).toHaveLength(3)

    const all = [
      ...GRID_BODY_CELLS,
      ...GRID_GHOST_CELLS,
      ...GRID_NOTCH_CELLS,
      GRID_ACCENT_CELL,
    ]

    expect(all).toHaveLength(28)
    expect(new Set(all.map(key)).size).toBe(28)
  })

  it('모든 칸이 pitch 5 격자 위에 있고 viewBox 안에 들어간다', () => {
    const all = [
      ...GRID_BODY_CELLS,
      ...GRID_GHOST_CELLS,
      ...GRID_NOTCH_CELLS,
      GRID_ACCENT_CELL,
    ]

    for (const cell of all) {
      expect(cell.x % 5).toBe(0)
      expect(cell.y % 5).toBe(0)
      expect(cell.x + GRID_MODULE).toBeLessThanOrEqual(GRID_VIEWBOX.width)
      expect(cell.y + GRID_MODULE).toBeLessThanOrEqual(GRID_VIEWBOX.height)
    }
  })

  /**
   * 회귀 방지 — 고스트를 빈 칸 전부에 채웠던 초안은 3열 노치를 메워
   * 실루엣을 사각형으로 만들었고 B 판독성이 무너졌다. 노치는 비어 있어야 한다.
   */
  it('3열 노치는 고스트가 아니다', () => {
    const ghostKeys = new Set(GRID_GHOST_CELLS.map(key))

    expect(GRID_NOTCH_CELLS.map(key)).toEqual(['15,0', '15,15', '15,30'])
    for (const notch of GRID_NOTCH_CELLS) {
      expect(ghostKeys.has(key(notch))).toBe(false)
    }
  })

  // 강조 칸은 아래 카운터의 우하단 하나다.
  it('강조 칸은 아래 카운터 우하단이다', () => {
    expect(GRID_ACCENT_CELL).toEqual({ x: 10, y: 25 })

    const lowerCounter = ['5,20', '10,20', '5,25', '10,25']
    const ghostKeys = GRID_GHOST_CELLS.map(key)

    expect(lowerCounter.filter(k => ghostKeys.includes(k))).toEqual([
      '5,20',
      '10,20',
      '5,25',
    ])
  })
})

describe('Solid 변형 기하', () => {
  it('본체 17칸과 강조 1칸을 갭 없이 배치한다', () => {
    expect(SOLID_BODY_CELLS).toHaveLength(17)
    expect(SOLID_ACCENT_CELL).toEqual({ x: 8, y: 20 })

    for (const cell of [...SOLID_BODY_CELLS, SOLID_ACCENT_CELL]) {
      expect(cell.x % 4).toBe(0)
      expect(cell.y % 4).toBe(0)
    }
  })

  // 격자 변형과 셀 배치가 같아야 한다 — 같은 글자여야 하니까.
  it('격자 변형과 같은 칸 배치를 가진다', () => {
    const scaled = (cells: readonly MarkCell[], pitch: number): string[] =>
      cells.map(cell => `${cell.x / pitch},${cell.y / pitch}`).sort()

    expect(scaled(SOLID_BODY_CELLS, 4)).toEqual(scaled(GRID_BODY_CELLS, 5))
    expect(scaled([SOLID_ACCENT_CELL], 4)).toEqual(
      scaled([GRID_ACCENT_CELL], 5),
    )
  })
})

describe('resolveMarkVariant — 크기가 변형을 결정한다', () => {
  /**
   * 명세 §7.1. 갭이 1px 미만이면 격자가 무너진다. 34px 에서 갭이 정확히
   * 1px 이므로 그 아래는 갭 없는 Solid 로 내려간다.
   */
  it('임계점 34 와 48 을 지킨다', () => {
    expect(resolveMarkVariant(16)).toBe('solid')
    expect(resolveMarkVariant(20)).toBe('solid')
    expect(resolveMarkVariant(33)).toBe('solid')
    expect(resolveMarkVariant(34)).toBe('grid')
    expect(resolveMarkVariant(47)).toBe('grid')
    expect(resolveMarkVariant(48)).toBe('primary')
    expect(resolveMarkVariant(240)).toBe('primary')
  })
})

describe('치수 산출', () => {
  it('폭을 높이에서 파생한다', () => {
    expect(markWidthFor('grid', 34)).toBe(19)
    expect(markWidthFor('primary', 34)).toBe(19)
    expect(markWidthFor('solid', 28)).toBe(16)
  })

  // 컨테이너 변 길이 × 0.625 = 심볼 박스 높이.
  it('컨테이너 변 길이는 심볼 높이의 1.6 배다', () => {
    expect(containerSideFor('solid')).toBeCloseTo(44.8, 5)
    expect(containerSideFor('grid')).toBeCloseTo(54.4, 5)
    expect(containerSideFor('solid') * 0.625).toBeCloseTo(
      SOLID_VIEWBOX.height,
      5,
    )
    expect(containerSideFor('grid') * 0.625).toBeCloseTo(GRID_VIEWBOX.height, 5)
  })
})
