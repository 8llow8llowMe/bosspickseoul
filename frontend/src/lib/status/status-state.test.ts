import { describe, expect, it } from 'vitest'

import {
  createStatusQuery,
  normalizeStatusSelection,
  parseStatusMetric,
} from './status-state'

describe('parseStatusMetric', () => {
  it.each(['footTraffic', 'sales', 'opened', 'closed'] as const)(
    'returns the valid metric %s',
    metric => {
      expect(parseStatusMetric(metric)).toBe(metric)
    },
  )

  it.each(['unknown', null, undefined])(
    'falls back to footTraffic for an invalid metric: %s',
    metric => {
      expect(parseStatusMetric(metric)).toBe('footTraffic')
    },
  )
})

describe('normalizeStatusSelection', () => {
  const topTenCodes = ['11680', '11740']

  it('keeps a selected district code included in the current top ten', () => {
    expect(normalizeStatusSelection('11680', topTenCodes)).toBe('11680')
  })

  it.each(['11110', null, undefined])(
    'returns null when the selected district code is unavailable: %s',
    districtCode => {
      expect(normalizeStatusSelection(districtCode, topTenCodes)).toBeNull()
    },
  )
})

describe('createStatusQuery', () => {
  it('always includes the metric', () => {
    expect(createStatusQuery('sales', null).toString()).toBe('metric=sales')
  })

  it('includes the district only when it is selected', () => {
    expect(createStatusQuery('opened', '11680').toString()).toBe(
      'metric=opened&district=11680',
    )
  })
})
