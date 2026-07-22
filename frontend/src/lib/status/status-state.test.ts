import { describe, expect, it } from 'vitest'

import {
  createStatusHref,
  createStatusQuery,
  getNextSheetSnap,
  isStatusSheetSingleSnap,
  normalizeStatusSelection,
  parseStatusMetric,
  resolveSheetSnapFromDrag,
} from './status-state'

describe('createStatusHref', () => {
  const query = new URLSearchParams('metric=sales&district=11680')

  it('builds a URL without a hash when the hash is empty', () => {
    expect(createStatusHref('/status', query, '')).toBe(
      '/status?metric=sales&district=11680',
    )
  })

  it.each(['district-map', '#district-map'])(
    'adds exactly one hash prefix for %s',
    hash => {
      expect(createStatusHref('/status', query, hash)).toBe(
        '/status?metric=sales&district=11680#district-map',
      )
    },
  )

  it('omits the query delimiter when parameters are empty', () => {
    expect(createStatusHref('/status', new URLSearchParams(), '#map')).toBe(
      '/status#map',
    )
  })
})

describe('isStatusSheetSingleSnap', () => {
  it.each([Number.NaN, 0, 180, 333, 1000 / 3])(
    'uses one snap when the status viewport is too low: %s',
    height => {
      expect(isStatusSheetSingleSnap(height)).toBe(true)
    },
  )

  it.each([1000 / 3 + 0.01, 748, 780])(
    'keeps two snaps when their heights differ: %s',
    height => {
      expect(isStatusSheetSingleSnap(height)).toBe(false)
    },
  )
})

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
    expect(
      createStatusQuery(new URLSearchParams(), 'sales', null).toString(),
    ).toBe('metric=sales')
  })

  it('includes the district only when it is selected', () => {
    expect(
      createStatusQuery(new URLSearchParams(), 'opened', '11680').toString(),
    ).toBe('metric=opened&district=11680')
  })

  it('preserves query parameters not owned by the status page', () => {
    expect(
      createStatusQuery(
        new URLSearchParams('from=campaign&metric=closed&district=11110'),
        'sales',
        '11680',
      ).toString(),
    ).toBe('from=campaign&metric=sales&district=11680')
  })

  it('removes only the district when returning to exploration', () => {
    expect(
      createStatusQuery(
        new URLSearchParams('metric=sales&district=11680&from=campaign'),
        'sales',
        null,
      ).toString(),
    ).toBe('metric=sales&from=campaign')
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
  describe('375x812 viewport-derived 748px status viewport', () => {
    const collapsedHeight = 344.08
    const expandedHeight = 538.56

    it.each([
      ['collapsed', 'midpoint - 1', -96.24, 'collapsed'],
      ['collapsed', 'midpoint exact', -97.24, 'expanded'],
      ['collapsed', 'midpoint + 1', -98.24, 'expanded'],
      ['expanded', 'midpoint + 1', 96.24, 'expanded'],
      ['expanded', 'midpoint exact', 97.24, 'expanded'],
      ['expanded', 'midpoint - 1', 98.24, 'collapsed'],
    ] as const)(
      'resolves %s at %s',
      (startSnap, _boundary, deltaY, expectedSnap) => {
        expect(
          resolveSheetSnapFromDrag(
            startSnap,
            deltaY,
            collapsedHeight,
            expandedHeight,
          ),
        ).toBe(expectedSnap)
      },
    )
  })

  describe('390x844 viewport-derived 780px status viewport', () => {
    const collapsedHeight = 358.8
    const expandedHeight = 561.6

    it.each([
      ['collapsed', 'midpoint - 1', -100.4, 'collapsed'],
      ['collapsed', 'midpoint exact', -101.4, 'expanded'],
      ['collapsed', 'midpoint + 1', -102.4, 'expanded'],
      ['expanded', 'midpoint + 1', 100.4, 'expanded'],
      ['expanded', 'midpoint exact', 101.4, 'expanded'],
      ['expanded', 'midpoint - 1', 102.4, 'collapsed'],
    ] as const)(
      'resolves %s at %s',
      (startSnap, _boundary, deltaY, expectedSnap) => {
        expect(
          resolveSheetSnapFromDrag(
            startSnap,
            deltaY,
            collapsedHeight,
            expandedHeight,
          ),
        ).toBe(expectedSnap)
      },
    )
  })

  it.each([
    ['collapsed', 1_000, 'collapsed'],
    ['expanded', -1_000, 'expanded'],
  ] as const)(
    'clamps a drag beyond the available height from %s',
    (startSnap, deltaY, expectedSnap) => {
      expect(resolveSheetSnapFromDrag(startSnap, deltaY, 344.08, 538.56)).toBe(
        expectedSnap,
      )
    },
  )

  it.each([
    ['collapsed', 0, 0],
    ['expanded', 300, 300],
    ['collapsed', 400, 300],
    ['expanded', Number.NaN, 500],
  ] as const)(
    'keeps %s when the height bounds are invalid: %s, %s',
    (startSnap, collapsedHeight, expandedHeight) => {
      expect(
        resolveSheetSnapFromDrag(
          startSnap,
          100,
          collapsedHeight,
          expandedHeight,
        ),
      ).toBe(startSnap)
    },
  )
})
