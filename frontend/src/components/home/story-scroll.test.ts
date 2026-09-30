import { describe, expect, it } from 'vitest'

import {
  pinnedStepIndex,
  pinnedStepScrollTop,
} from '@/components/home/story-scroll'

/* pinSpan 2400 · 네 단계 → 한 단계 600 */
describe('pinnedStepIndex (TC-SP2-001)', () => {
  it('pin 시작은 첫 단계다', () => {
    expect(pinnedStepIndex(0, 2400, 4)).toBe(0)
  })

  it('몫의 경계에서 다음 단계로 넘어간다 — 네 단계가 같은 몫이다', () => {
    expect(pinnedStepIndex(599, 2400, 4)).toBe(0)
    expect(pinnedStepIndex(600, 2400, 4)).toBe(1)
    expect(pinnedStepIndex(1200, 2400, 4)).toBe(2)
    expect(pinnedStepIndex(1800, 2400, 4)).toBe(3)
  })

  it('트랙에 닿기 전은 첫 단계, 지난 뒤는 마지막 단계로 자른다', () => {
    expect(pinnedStepIndex(-300, 2400, 4)).toBe(0)
    expect(pinnedStepIndex(5000, 2400, 4)).toBe(3)
  })

  it('측정 전(0)이거나 단계가 없으면 0 — NaN 이 새지 않는다', () => {
    expect(pinnedStepIndex(100, 0, 4)).toBe(0)
    expect(pinnedStepIndex(Number.NaN, 2400, 4)).toBe(0)
    expect(pinnedStepIndex(100, 2400, 0)).toBe(0)
  })
})

describe('pinnedStepScrollTop (TC-SP2-002)', () => {
  /* 트랙 윗단 1000 · 헤더 65 → pin 시작 scrollY 935 */
  it('각 단계 몫의 가운데로 간다', () => {
    expect(pinnedStepScrollTop(1000, 65, 2400, 0, 4)).toBe(935 + 300)
    expect(pinnedStepScrollTop(1000, 65, 2400, 3, 4)).toBe(935 + 2100)
  })

  it('간 곳에서 다시 재면 같은 단계다 — 두 식이 서로 맞는다', () => {
    for (const index of [0, 1, 2, 3]) {
      const top = pinnedStepScrollTop(1000, 65, 2400, index, 4)
      const scrolled = top - 935
      expect(pinnedStepIndex(scrolled, 2400, 4)).toBe(index)
    }
  })

  it('범위 밖 단계는 양 끝으로 자르고 음수 스크롤을 내지 않는다', () => {
    expect(pinnedStepScrollTop(1000, 65, 2400, 9, 4)).toBe(935 + 2100)
    expect(pinnedStepScrollTop(10, 65, 2400, 0, 4)).toBe(245)
    expect(pinnedStepScrollTop(10, 65, 0, 2, 4)).toBe(0)
  })
})
