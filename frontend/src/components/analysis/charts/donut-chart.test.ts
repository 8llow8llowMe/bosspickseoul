import { describe, expect, it } from 'vitest'

import { toDonutSlices } from '@/components/analysis/charts/donut-chart'

describe('DonutChart / toDonutSlices', () => {
  it('각 세그먼트의 백분율을 계산한다', () => {
    const slices = toDonutSlices([
      { label: '남성', value: 30 },
      { label: '여성', value: 10 },
    ])
    expect(slices).toEqual([
      { label: '남성', value: 30, percent: 75 },
      { label: '여성', value: 10, percent: 25 },
    ])
  })

  it('합이 0이면 percent는 0', () => {
    const slices = toDonutSlices([
      { label: '남성', value: 0 },
      { label: '여성', value: 0 },
    ])
    expect(slices.every(slice => slice.percent === 0)).toBe(true)
  })
})
