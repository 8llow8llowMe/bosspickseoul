import { describe, it, expect } from 'vitest'
import {
  DISTRICTS,
  INDUSTRIES,
  DEFAULT_SELECTION,
  getDemoSample,
} from './home-demo'

describe('home-demo', () => {
  it('exposes non-empty districts and industries', () => {
    expect(DISTRICTS.length).toBeGreaterThanOrEqual(4)
    expect(INDUSTRIES.length).toBeGreaterThanOrEqual(4)
  })

  it('default selection references existing ids', () => {
    expect(DISTRICTS.some(d => d.id === DEFAULT_SELECTION.districtId)).toBe(
      true,
    )
    expect(INDUSTRIES.some(i => i.id === DEFAULT_SELECTION.industryId)).toBe(
      true,
    )
  })

  it('returns the curated sample for a known combo', () => {
    const s = getDemoSample('gangnam', 'cafe')
    expect(s.districtId).toBe('gangnam')
    expect(s.industryId).toBe('cafe')
    expect(s.salesTrend.length).toBeGreaterThanOrEqual(6)
    expect(['low', 'medium', 'high']).toContain(s.competition)
  })

  it('falls back for an unknown combo but echoes the requested ids', () => {
    const s = getDemoSample('gangnam', 'gym')
    expect(s.districtId).toBe('gangnam')
    expect(s.industryId).toBe('gym')
    expect(s.salesTrend.length).toBeGreaterThanOrEqual(6)
    expect(typeof s.insight).toBe('string')
    expect(s.insight.length).toBeGreaterThan(0)
  })
})
