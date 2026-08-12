import { describe, expect, it } from 'vitest'

import { computeNiceYScale } from '@/lib/analysis/chart-scale'

describe('computeNiceYScale', () => {
  it('클러스터된 값은 0을 기준으로 하지 않고 범위 안쪽에서 눈금을 촘촘히 만든다', () => {
    const values = [91000, 92000, 93000, 94000, 95000, 96000, 97000, 98000]
    const scale = computeNiceYScale(values)
    expect(scale.domain).toEqual([90000, 98000])
    expect(scale.ticks).toEqual([90000, 92000, 94000, 96000, 98000])
    const steps = scale.ticks.slice(1).map((t, i) => t - scale.ticks[i])
    expect(steps.every(step => step === 2000)).toBe(true)
  })

  it('값이 넓게 퍼져 있으면 0을 포함한 도메인을 만든다', () => {
    const scale = computeNiceYScale([0, 50000, 98000])
    expect(scale.domain[0]).toBe(0)
    expect(scale.domain[1]).toBeGreaterThanOrEqual(98000)
  })

  it('빈 배열은 [0,1] 기본 스케일을 반환한다', () => {
    expect(computeNiceYScale([])).toEqual({ domain: [0, 1], ticks: [0, 1] })
  })

  it('null/undefined만 있으면 [0,1] 기본 스케일을 반환한다', () => {
    expect(computeNiceYScale([null, undefined, null])).toEqual({
      domain: [0, 1],
      ticks: [0, 1],
    })
  })

  it('단일 값은 0을 기준으로 하지 않고 값 주변에 패딩된 도메인을 만든다', () => {
    const scale = computeNiceYScale([5000])
    expect(scale.domain[0]).toBeGreaterThan(0)
    expect(scale.domain[0]).toBeLessThan(5000)
    expect(scale.domain[1]).toBeGreaterThan(5000)
  })

  it('값이 모두 0이면 [0,1] 기본 스케일을 반환한다', () => {
    expect(computeNiceYScale([0, 0])).toEqual({ domain: [0, 1], ticks: [0, 1] })
  })

  it('음수 값도 지원하며 0을 강제로 포함하지 않는다', () => {
    const scale = computeNiceYScale([-500, -300, -100])
    expect(scale.domain).toEqual([-500, -100])
    expect(scale.domain[1]).toBeLessThan(0)
  })

  it('일부 null이 섞여 있어도 유효 값만으로 스케일을 계산한다', () => {
    const scale = computeNiceYScale([null, 91000, undefined, 98000])
    expect(scale.domain).toEqual([90000, 98000])
  })
})
