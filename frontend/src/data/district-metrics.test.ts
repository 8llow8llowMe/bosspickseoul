import { describe, expect, it } from 'vitest'
import { SEOUL_STATUS_FEATURES } from '@/data/seoul-status-map'
import { TOP_DISTRICT_CODES, getDistrictMetric } from '@/data/district-metrics'

describe('district-metrics', () => {
  it('지도에 있는 모든 자치구가 매트릭을 가진다', () => {
    for (const feature of SEOUL_STATUS_FEATURES) {
      const metric = getDistrictMetric(feature.districtCode)
      expect(metric, `no metric for ${feature.districtCode}`).toBeDefined()
      expect(metric!.salesLabel.length).toBeGreaterThan(0)
      expect(metric!.footTrafficLabel.length).toBeGreaterThan(0)
      expect(metric!.trend.length).toBeGreaterThanOrEqual(6)
    }
  })

  it('상위 상권 코드는 모두 실제 지도 자치구다', () => {
    const codes = new Set(SEOUL_STATUS_FEATURES.map(f => f.districtCode))
    expect(TOP_DISTRICT_CODES.length).toBe(3)
    for (const code of TOP_DISTRICT_CODES) {
      expect(codes.has(code), `top code ${code} not on map`).toBe(true)
    }
  })
})
