import { describe, expect, it } from 'vitest'
import {
  clampTooltipPosition,
  placeBesideRect,
  tooltipScale,
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

/**
 * 툴팁은 지도 좌표계(viewBox) 안에 그려져 지도와 함께 줄어든다. 좌우 분할로 지도 칸이 좁아지면
 * (1024 폭 배율 0.59) 글자가 7px 대로 내려가 읽을 수 없다 — 화면에서 설계 크기 아래로 줄지
 * 않게 되돌려 키운다(hero-split-layout.md D4-4).
 */
describe('tooltipScale', () => {
  it('지도가 설계 크기보다 작게 그려지면 그만큼 되돌려 키운다', () => {
    expect(tooltipScale(0.5)).toBe(2)
  })

  it('지도가 같거나 크게 그려지면 그대로(키우지 않는다)', () => {
    expect(tooltipScale(1)).toBe(1)
    expect(tooltipScale(1.27)).toBe(1)
  })

  it('배율을 아직 모르면(0·음수·NaN) 1', () => {
    expect(tooltipScale(0)).toBe(1)
    expect(tooltipScale(Number.NaN)).toBe(1)
  })
})
