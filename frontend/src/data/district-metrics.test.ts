import { describe, expect, it } from 'vitest'
import { SEOUL_STATUS_FEATURES } from '@/data/seoul-status-map'
import { TOP_DISTRICT_CODES } from '@/data/district-metrics'

describe('district-metrics', () => {
  it('상위 상권 코드는 모두 실제 지도 자치구다', () => {
    const codes = new Set(SEOUL_STATUS_FEATURES.map(f => f.districtCode))
    expect(TOP_DISTRICT_CODES.length).toBe(3)
    for (const code of TOP_DISTRICT_CODES) {
      expect(codes.has(code), `top code ${code} not on map`).toBe(true)
    }
  })
})
