import { describe, expect, it } from 'vitest'

import {
  createStatusQuery,
  getNextSheetSnap,
  normalizeStatusSelection,
  parseStatusMetric,
  resolveSheetSnapFromDrag,
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

describe('getNextSheetSnap', () => {
  it.each([
    ['collapsed', 'expand', 'expanded'],
    ['expanded', 'expand', 'expanded'],
    ['expanded', 'collapse', 'collapsed'],
    ['collapsed', 'collapse', 'collapsed'],
  ] as const)('returns %s + %s as %s', (currentSnap, action, expectedSnap) => {
    expect(getNextSheetSnap(currentSnap, action)).toBe(expectedSnap)
  })
})

describe('resolveSheetSnapFromDrag', () => {
  const threshold = 48

  it('expands after an upward drag passes the threshold', () => {
    expect(resolveSheetSnapFromDrag('collapsed', -49, threshold)).toBe(
      'expanded',
    )
  })

  it('collapses after a downward drag passes the threshold', () => {
    expect(resolveSheetSnapFromDrag('expanded', 49, threshold)).toBe(
      'collapsed',
    )
  })

  it.each([
    ['collapsed', -48],
    ['expanded', 48],
    ['collapsed', -47],
    ['expanded', 47],
  ] as const)(
    'keeps %s at or below the threshold for deltaY %s',
    (startSnap, deltaY) => {
      expect(resolveSheetSnapFromDrag(startSnap, deltaY, threshold)).toBe(
        startSnap,
      )
    },
  )

  it.each([
    ['collapsed', 49],
    ['expanded', -49],
  ] as const)(
    'does not move past the available snap from %s for deltaY %s',
    (startSnap, deltaY) => {
      expect(resolveSheetSnapFromDrag(startSnap, deltaY, threshold)).toBe(
        startSnap,
      )
    },
  )
})
