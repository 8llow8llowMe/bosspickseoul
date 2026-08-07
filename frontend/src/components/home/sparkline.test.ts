import { describe, it, expect } from 'vitest'
import { sparklinePath } from './sparkline'

describe('sparklinePath', () => {
  it('returns empty for <2 values', () => {
    expect(sparklinePath([], 100, 20)).toBe('')
    expect(sparklinePath([5], 100, 20)).toBe('')
  })

  it('maps first x to 0 and last x to width', () => {
    const pts = sparklinePath([1, 2, 3], 100, 20).split(' ')
    expect(pts).toHaveLength(3)
    expect(pts[0].startsWith('0,')).toBe(true)
    expect(pts[2].startsWith('100,')).toBe(true)
  })

  it('maps the max value to y=0 and the min value to y=height', () => {
    const pts = sparklinePath([10, 20], 100, 20).split(' ')
    // first (min) → y=20, last (max) → y=0
    expect(pts[0]).toBe('0,20')
    expect(pts[1]).toBe('100,0')
  })

  it('centers a flat series', () => {
    const pts = sparklinePath([5, 5, 5], 100, 20).split(' ')
    expect(pts.every(p => p.endsWith(',10'))).toBe(true)
  })
})
