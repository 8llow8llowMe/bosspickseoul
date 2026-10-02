import { describe, expect, it } from 'vitest'
import {
  clampTooltipPosition,
  placeBesideRect,
} from '@/components/home/tooltip-geometry'

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

/**
 * 자동 시연 툴팁은 히어로 카드(지도 가운데 위 유리 창) 오른쪽 밖에 놓는다
 * (hero-picker-and-mobile-first-screen.md D5-3). 1024×768 실측값으로 잠근다.
 */
describe('placeBesideRect', () => {
  // viewBox → 화면: x_px = e + x * a (1024×768 실측: 지도 배율 1.056, 왼쪽 86px)
  const CTM = { a: 1.056, e: 86 }

  it('기본 자리가 카드에 걸치면 카드 오른쪽 + 간격까지 민다', () => {
    const x = placeBesideRect(588, 212, CTM, 739, 998, 16)

    expect(x).not.toBeNull()
    expect(CTM.e + x! * CTM.a).toBeCloseTo(755)
  })

  it('기본 자리가 이미 카드 밖이면 그대로 둔다', () => {
    expect(placeBesideRect(588, 212, CTM, 600, 998, 16)).toBe(588)
  })

  it('밀어서 svg 오른쪽 끝을 넘으면 자리가 없다(null → 시연 생략)', () => {
    expect(placeBesideRect(588, 212, CTM, 800, 998, 16)).toBeNull()
  })
})
