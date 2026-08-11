import { describe, expect, it } from 'vitest'
import {
  activeStepFromProgress,
  filledWordCount,
  viewportProgress,
} from '@/components/home/scroll-fill'

describe('viewportProgress', () => {
  it('요소가 뷰포트 하단에 막 진입하면 0', () => {
    // top === viewportHeight → scrolled 0
    expect(viewportProgress(800, 400, 800)).toBe(0)
  })

  it('요소가 상단을 완전히 통과하면 1', () => {
    // top === -elementHeight → scrolled === total
    expect(viewportProgress(-400, 400, 800)).toBe(1)
  })

  it('범위를 벗어나도 0~1로 클램프', () => {
    expect(viewportProgress(2000, 400, 800)).toBe(0)
    expect(viewportProgress(-5000, 400, 800)).toBe(1)
  })
})

describe('filledWordCount', () => {
  it('진행도에 비례해 반올림', () => {
    expect(filledWordCount(0, 10)).toBe(0)
    expect(filledWordCount(1, 10)).toBe(10)
    expect(filledWordCount(0.44, 10)).toBe(4)
    expect(filledWordCount(0.45, 10)).toBe(5)
  })

  it('진행도를 0~1로 클램프', () => {
    expect(filledWordCount(-1, 10)).toBe(0)
    expect(filledWordCount(2, 10)).toBe(10)
  })
})

describe('activeStepFromProgress', () => {
  it('구간별 인덱스 매핑', () => {
    expect(activeStepFromProgress(0, 4)).toBe(0)
    expect(activeStepFromProgress(0.2, 4)).toBe(0)
    expect(activeStepFromProgress(0.25, 4)).toBe(1)
    expect(activeStepFromProgress(0.75, 4)).toBe(3)
    expect(activeStepFromProgress(1, 4)).toBe(3)
  })

  it('스텝이 0 이하면 0', () => {
    expect(activeStepFromProgress(0.5, 0)).toBe(0)
  })
})
