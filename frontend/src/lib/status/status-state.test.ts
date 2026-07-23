import { describe, expect, it } from 'vitest'

import {
  applyStatusSheetContentTransition,
  canCollapseStatusSheetFromMap,
  createCollapsedStatusSheetState,
  createStatusHref,
  createStatusQuery,
  getNextSheetSnap,
  isStatusSheetSingleSnap,
  normalizeStatusSelection,
  parseStatusMetric,
  resolveSheetSnapFromDrag,
} from './status-state'

describe('createCollapsedStatusSheetState', () => {
  it('keeps the selected district while collapsing the sheet', () => {
    expect(createCollapsedStatusSheetState('11560')).toEqual({
      districtCode: '11560',
      snap: 'collapsed',
    })
  })

  it('keeps the exploration state when no district is selected', () => {
    expect(createCollapsedStatusSheetState(null)).toEqual({
      districtCode: null,
      snap: 'collapsed',
    })
  })
})

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
  const twoSnapMinimumHeight = 180 / (1 - 0.54)

  it.each([Number.NaN, 0, 180, 334, 391, twoSnapMinimumHeight])(
    'uses one snap when the status viewport is too low: %s',
    height => {
      expect(isStatusSheetSingleSnap(height)).toBe(true)
    },
  )

  it.each([twoSnapMinimumHeight + 0.01, 748, 780])(
    'keeps two snaps when their heights differ: %s',
    height => {
      expect(isStatusSheetSingleSnap(height)).toBe(false)
    },
  )
})

describe('canCollapseStatusSheetFromMap', () => {
  it.each([
    [false, true, 'expanded'],
    [false, true, 'collapsed'],
    [true, false, 'expanded'],
    [false, false, 'collapsed'],
  ] as const)(
    'returns %s when single snap is %s and sheet is %s',
    (expected, isSingleSnap, snap) => {
      expect(canCollapseStatusSheetFromMap(isSingleSnap, snap)).toBe(expected)
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
    const collapsedHeight = 403.92
    const expandedHeight = 538.56
    const midpointDelta = (expandedHeight - collapsedHeight) / 2

    it.each([
      ['collapsed', 'midpoint - 1', -(midpointDelta - 1), 'collapsed'],
      ['collapsed', 'midpoint exact', -midpointDelta, 'expanded'],
      ['collapsed', 'midpoint + 1', -(midpointDelta + 1), 'expanded'],
      ['expanded', 'midpoint + 1', midpointDelta - 1, 'expanded'],
      ['expanded', 'midpoint exact', midpointDelta, 'expanded'],
      ['expanded', 'midpoint - 1', midpointDelta + 1, 'collapsed'],
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
    const collapsedHeight = 421.2
    const expandedHeight = 561.6
    const midpointDelta = (expandedHeight - collapsedHeight) / 2

    it.each([
      ['collapsed', 'midpoint - 1', -(midpointDelta - 1), 'collapsed'],
      ['collapsed', 'midpoint exact', -midpointDelta, 'expanded'],
      ['collapsed', 'midpoint + 1', -(midpointDelta + 1), 'expanded'],
      ['expanded', 'midpoint + 1', midpointDelta - 1, 'expanded'],
      ['expanded', 'midpoint exact', midpointDelta, 'expanded'],
      ['expanded', 'midpoint - 1', midpointDelta + 1, 'collapsed'],
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
      expect(resolveSheetSnapFromDrag(startSnap, deltaY, 403.92, 538.56)).toBe(
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

describe('applyStatusSheetContentTransition', () => {
  const createBody = (events: string[], initialScrollTop: number) => {
    let scrollTop = initialScrollTop

    return {
      get scrollTop() {
        return scrollTop
      },
      set scrollTop(nextScrollTop: number) {
        scrollTop = nextScrollTop
        events.push(`scroll:${nextScrollTop}`)
      },
      focus(options?: FocusOptions) {
        events.push(`body-focus:${String(options?.preventScroll)}`)
      },
    }
  }

  it('resets the Top 10 scroll before focusing the detail back button', () => {
    const events: string[] = []
    const body = createBody(events, 640)

    applyStatusSheetContentTransition({
      body,
      backButton: {
        focus: options =>
          events.push(`back-focus:${String(options?.preventScroll)}`),
      },
      handle: null,
      isShowingDetail: true,
      isSingleSnap: false,
    })

    expect(body.scrollTop).toBe(0)
    expect(events).toEqual(['scroll:0', 'back-focus:true'])
  })

  it('resets the detail scroll before focusing the Top 10 body in single-snap mode', () => {
    const events: string[] = []
    const body = createBody(events, 880)

    applyStatusSheetContentTransition({
      body,
      backButton: null,
      handle: null,
      isShowingDetail: false,
      isSingleSnap: true,
    })

    expect(body.scrollTop).toBe(0)
    expect(events).toEqual(['scroll:0', 'body-focus:true'])
  })
})
