import { describe, expect, it } from 'vitest'
import { clampTooltipPosition } from '@/components/home/tooltip-geometry'

const VIEW = { width: 800, height: 620 }
const SIZE = { width: 180, height: 96 }

describe('clampTooltipPosition', () => {
  it('중앙 근처는 offset 적용해 그대로 배치', () => {
    const p = clampTooltipPosition({ x: 400, y: 300 }, SIZE, VIEW, 12)
    expect(p.x).toBe(412)
    expect(p.y).toBe(312)
  })

  it('우/하단 경계를 넘지 않게 클램프', () => {
    const p = clampTooltipPosition({ x: 790, y: 610 }, SIZE, VIEW, 12)
    expect(p.x).toBe(VIEW.width - SIZE.width) // 620
    expect(p.y).toBe(VIEW.height - SIZE.height) // 524
  })

  it('좌/상단 경계 아래로 내려가지 않게 클램프', () => {
    const p = clampTooltipPosition({ x: -50, y: -50 }, SIZE, VIEW, 12)
    expect(p.x).toBe(0)
    expect(p.y).toBe(0)
  })
})
