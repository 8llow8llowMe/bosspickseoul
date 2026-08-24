import { describe, expect, it } from 'vitest'

import {
  applyStatusSheetContentTransition,
  createStatusHref,
  STATUS_SHEET_COLLAPSED_HEIGHT,
  STATUS_SHEET_EXPANDED_RATIO,
  STATUS_SHEET_MINIMUM_MAP_HEIGHT,
  createStatusQuery,
  getStatusSheetHeightBounds,
  getNextSheetSnap,
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

describe('getStatusSheetHeightBounds', () => {
  // expandedHeight = min(높이 x EXPANDED_RATIO, 높이 - MINIMUM_MAP_HEIGHT)
  // 지도 최소 높이(290px)를 확보하는 쪽이 대개 더 작아서 아래 세 경우 모두 그쪽이 선택된다.
  // 상수를 의도적으로 바꾸면 이 표도 함께 갱신해야 한다.
  it.each([
    [560, 560 - STATUS_SHEET_MINIMUM_MAP_HEIGHT],
    [523.28, 523.28 - STATUS_SHEET_MINIMUM_MAP_HEIGHT],
    [360, 360 - STATUS_SHEET_MINIMUM_MAP_HEIGHT],
  ])(
    'returns the two snap heights for a %spx viewport',
    (height, expectedExpanded) => {
      const bounds = getStatusSheetHeightBounds(height)

      expect(bounds.collapsedHeight).toBe(STATUS_SHEET_COLLAPSED_HEIGHT)
      expect(bounds.expandedHeight).toBeCloseTo(expectedExpanded, 5)
      // 비율 상한을 넘지 않는지도 함께 확인한다.
      expect(bounds.expandedHeight).toBeLessThanOrEqual(
        height * STATUS_SHEET_EXPANDED_RATIO,
      )
    },
  )

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    'falls back to the collapsed height for an invalid viewport: %s',
    height => {
      expect(getStatusSheetHeightBounds(height)).toEqual({
        collapsedHeight: 52,
        expandedHeight: 52,
      })
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
  describe('52px collapsed and 343.28px expanded bounds', () => {
    const collapsedHeight = 52
    const expandedHeight = 343.28
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
      expect(resolveSheetSnapFromDrag(startSnap, deltaY, 52, 343.28)).toBe(
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
    })

    expect(body.scrollTop).toBe(0)
    expect(events).toEqual(['scroll:0', 'back-focus:true'])
  })

  it('resets the detail scroll before focusing the Top 10 handle', () => {
    const events: string[] = []
    const body = createBody(events, 880)

    applyStatusSheetContentTransition({
      body,
      backButton: null,
      handle: {
        focus: options =>
          events.push(`handle-focus:${String(options?.preventScroll)}`),
      },
      isShowingDetail: false,
    })

    expect(body.scrollTop).toBe(0)
    expect(events).toEqual(['scroll:0', 'handle-focus:true'])
  })
})
