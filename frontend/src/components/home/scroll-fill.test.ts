import { describe, expect, it } from 'vitest'
import {
  activeStepFromProgress,
  filledWordCount,
  pinnedStepProgress,
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

describe('pinnedStepProgress', () => {
  /*
   * useScrollProgress 의 진행도 정의: progress = (vh - top) / (H + vh).
   * 스티키가 실제로 pin 되는 구간은 progress ∈ [vh/(H+vh), H/(H+vh)] 이므로,
   * 스텝 중앙 목표를 그 범위로 클램프해야 트랙 위/아래로 튀지 않는다.
   */
  it('스토리(4스텝, 3600px 트랙, 900px 뷰포트)의 첫·끝 스텝을 pin 구간으로 클램프한다', () => {
    // denom 4500 → pinStart 0.2, pinEnd 0.8, margin 0.02
    expect(pinnedStepProgress(0, 4, 3600, 900)).toBeCloseTo(0.22, 5)
    expect(pinnedStepProgress(3, 4, 3600, 900)).toBeCloseTo(0.78, 5)
  })

  it('가운데 스텝은 중앙값을 그대로 쓴다', () => {
    expect(pinnedStepProgress(1, 4, 3600, 900)).toBeCloseTo(0.375, 5)
    expect(pinnedStepProgress(2, 4, 3600, 900)).toBeCloseTo(0.625, 5)
  })

  /*
   * 랭킹 섹션은 지표 3종 → 2700px 트랙이다(300dvh, 900px 뷰포트 기준).
   * 같은 공식이 스텝 수와 트랙 높이만 달라져도 성립해야 한다.
   */
  it('랭킹(3지표, 2700px 트랙)에도 같은 공식이 성립한다', () => {
    // denom 3600 → pinStart 0.25, pinEnd 0.75
    expect(pinnedStepProgress(0, 3, 2700, 900)).toBeCloseTo(0.27, 5)
    expect(pinnedStepProgress(1, 3, 2700, 900)).toBeCloseTo(0.5, 5)
    expect(pinnedStepProgress(2, 3, 2700, 900)).toBeCloseTo(0.73, 5)
  })

  it('높이가 0이면 0을 낸다(0 나눗셈 방지)', () => {
    expect(pinnedStepProgress(0, 3, 0, 0)).toBe(0)
    expect(pinnedStepProgress(0, 0, 2700, 900)).toBe(0)
  })
})
