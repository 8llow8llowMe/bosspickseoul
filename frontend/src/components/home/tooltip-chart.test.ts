import { describe, it, expect } from 'vitest'
import { tooltipAreaChart } from './tooltip-chart'

describe('tooltipAreaChart', () => {
  it('returns empty paths and a centered lastPoint for <2 values', () => {
    const empty = tooltipAreaChart([], 140, 28)
    expect(empty.linePath).toBe('')
    expect(empty.areaPath).toBe('')
    expect(empty.lastPoint).toEqual({ x: 0, y: 14 })

    const single = tooltipAreaChart([5], 140, 28)
    expect(single.linePath).toBe('')
    expect(single.areaPath).toBe('')
    expect(single.lastPoint).toEqual({ x: 0, y: 14 })
  })

  it('builds a smooth cubic-bezier line path starting at the first point', () => {
    const { linePath, lastPoint } = tooltipAreaChart([1, 3, 2, 5], 140, 28)
    expect(linePath.startsWith('M ')).toBe(true)
    expect(linePath).toContain('C ')
    // last data point sits at the right edge of the chart
    expect(lastPoint.x).toBeCloseTo(140, 1)
  })

  it('builds a closed, fillable area path anchored to the baseline', () => {
    const { areaPath } = tooltipAreaChart([1, 3, 2, 5], 140, 28)
    expect(areaPath.length).toBeGreaterThan(0)
    expect(areaPath.trim().endsWith('Z')).toBe(true)
    expect(areaPath.startsWith('M ')).toBe(true)
    // closes down to the baseline (bottom of the chart box) before Z
    expect(areaPath).toContain(`${28} L`)
  })
})
