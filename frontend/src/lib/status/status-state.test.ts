import { describe, expect, it } from 'vitest'

import {
  applyStatusSheetContentTransition,
  createStatusHref,
  STATUS_SHEET_COLLAPSED_HEIGHT,
  STATUS_SHEET_EXPANDED_RATIO,
  STATUS_SHEET_FULL_TOP_GAP,
  STATUS_SHEET_MINIMUM_MAP_HEIGHT,
  createStatusQuery,
  getStatusSheetHeightBounds,
  getNextSheetSnap,
  getToggledSheetSnap,
  normalizeStatusSelection,
  parseStatusMetric,
  parseStatusPeriod,
  resolveSheetSnapFromDrag,
  resolveStatusSelectedDistrict,
  resolveStatusSheetSnap,
} from './status-state'
import type { StatusRankedItem } from '@/types/status'

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
    'returns the snap heights for a %spx viewport',
    (height, expectedExpanded) => {
      const bounds = getStatusSheetHeightBounds(height)

      expect(bounds.collapsedHeight).toBe(STATUS_SHEET_COLLAPSED_HEIGHT)
      expect(bounds.expandedHeight).toBeCloseTo(expectedExpanded, 5)
      // 비율 상한을 넘지 않는지도 함께 확인한다.
      expect(bounds.expandedHeight).toBeLessThanOrEqual(
        height * STATUS_SHEET_EXPANDED_RATIO,
      )
      // 전체 펼침은 무대 위 끝만 조금 남긴다.
      expect(bounds.fullHeight).toBeCloseTo(
        height - STATUS_SHEET_FULL_TOP_GAP,
        5,
      )
    },
  )

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    'falls back to the collapsed height for an invalid viewport: %s',
    height => {
      expect(getStatusSheetHeightBounds(height)).toEqual({
        collapsedHeight: 52,
        expandedHeight: 52,
        fullHeight: 52,
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
  const districtCodes = ['11680', '11740', '11110']

  it('keeps any Seoul district code, not only the current top ten', () => {
    expect(normalizeStatusSelection('11110', districtCodes)).toBe('11110')
  })

  it.each(['99999', '', null, undefined])(
    'returns null when the selected district code is not a Seoul district: %s',
    districtCode => {
      expect(normalizeStatusSelection(districtCode, districtCodes)).toBeNull()
    },
  )
})

describe('resolveStatusSelectedDistrict', () => {
  const records = [
    { gooCode: 11680, gooName: '강남구' },
    { gooCode: 11650, gooName: '서초구' },
  ]
  const items: StatusRankedItem[] = [
    {
      rank: 1,
      districtCode: '11680',
      districtName: '강남구',
      value: 100,
      changeRate: 2.5,
    },
  ]

  it('attaches the ranked item when the district is in the current top ten', () => {
    expect(resolveStatusSelectedDistrict('11680', items, records)).toEqual({
      districtCode: '11680',
      districtName: '강남구',
      rankedItem: items[0],
    })
  })

  it('selects a district outside the top ten with a null ranked item', () => {
    expect(resolveStatusSelectedDistrict('11650', items, records)).toEqual({
      districtCode: '11650',
      districtName: '서초구',
      rankedItem: null,
    })
  })

  it.each([null, '99999'])(
    'returns null without a resolvable district: %s',
    districtCode => {
      expect(
        resolveStatusSelectedDistrict(districtCode, items, records),
      ).toBeNull()
    },
  )
})

describe('createStatusQuery', () => {
  it('always includes the metric', () => {
    expect(
      createStatusQuery(new URLSearchParams(), 'sales', null, null).toString(),
    ).toBe('metric=sales')
  })

  it('includes the district only when it is selected', () => {
    expect(
      createStatusQuery(
        new URLSearchParams(),
        'opened',
        '11680',
        null,
      ).toString(),
    ).toBe('metric=opened&district=11680')
  })

  it('preserves query parameters not owned by the status page', () => {
    expect(
      createStatusQuery(
        new URLSearchParams('from=campaign&metric=closed&district=11110'),
        'sales',
        '11680',
        null,
      ).toString(),
    ).toBe('from=campaign&metric=sales&district=11680')
  })

  it('removes only the district when returning to exploration', () => {
    expect(
      createStatusQuery(
        new URLSearchParams('metric=sales&district=11680&from=campaign'),
        'sales',
        null,
        null,
      ).toString(),
    ).toBe('metric=sales&from=campaign')
  })

  it('writes a chosen period and keeps the district', () => {
    expect(
      createStatusQuery(
        new URLSearchParams('metric=sales&district=11680'),
        'sales',
        '11680',
        '20233',
      ).toString(),
    ).toBe('metric=sales&district=11680&periodCode=20233')
  })

  // `/status` 는 「최신 분기 현황」이다. 최신(null)은 URL 에 적지 않는다(status.md 1.6). 최신 분기를 고르면
  // 페이지가 null 을 넘긴다(period-catalog.md D3-3).
  it('drops the period param for the latest (null) period', () => {
    expect(
      createStatusQuery(
        new URLSearchParams('metric=sales&periodCode=20233'),
        'sales',
        null,
        null,
      ).toString(),
    ).toBe('metric=sales')
  })
})

describe('parseStatusPeriod', () => {
  it('reads a missing param as the latest period (null)', () => {
    expect(parseStatusPeriod(null)).toBeNull()
    expect(parseStatusPeriod('')).toBeNull()
  })

  it('keeps a well-formed period from 2021', () => {
    expect(parseStatusPeriod('20233')).toBe('20233')
    expect(parseStatusPeriod('20211')).toBe('20211')
  })

  /* 상한은 서버 기본 분기를 알아야 판정한다 — 페이지가 카탈로그로 내린다(resolveAnalysisPeriod). */
  it('keeps a future period for the page to clamp once the catalog arrives', () => {
    expect(parseStatusPeriod('20264')).toBe('20264')
  })

  it.each(['20204', '2023', 'abc', '202331'])(
    'reads a malformed or pre-2021 value %s as the latest period (null)',
    value => {
      expect(parseStatusPeriod(value)).toBeNull()
    },
  )
})

describe('getNextSheetSnap', () => {
  it.each([
    ['collapsed', 'expand', 'expanded'],
    ['expanded', 'expand', 'full'],
    ['full', 'expand', 'full'],
    ['full', 'collapse', 'expanded'],
    ['expanded', 'collapse', 'collapsed'],
    ['collapsed', 'collapse', 'collapsed'],
  ] as const)('returns %s + %s as %s', (currentSnap, action, expectedSnap) => {
    expect(getNextSheetSnap(currentSnap, action)).toBe(expectedSnap)
  })
})

describe('getToggledSheetSnap', () => {
  // 탭은 접혀 있으면 펼치고 그 밖에는 한 단계 접는다. full 은 끌어서만 간다.
  it.each([
    ['collapsed', 'expanded'],
    ['expanded', 'collapsed'],
    ['full', 'expanded'],
  ] as const)('toggles %s to %s', (currentSnap, expectedSnap) => {
    expect(getToggledSheetSnap(currentSnap)).toBe(expectedSnap)
  })
})

describe('resolveSheetSnapFromDrag', () => {
  describe('52 / 343.28 / 661px bounds', () => {
    const bounds = {
      collapsedHeight: 52,
      expandedHeight: 343.28,
      fullHeight: 661,
    }
    const lowerMidpoint = (bounds.expandedHeight - bounds.collapsedHeight) / 2
    const upperMidpoint = (bounds.fullHeight - bounds.expandedHeight) / 2

    it.each([
      ['collapsed', 'lower midpoint - 1', -(lowerMidpoint - 1), 'collapsed'],
      ['collapsed', 'lower midpoint exact', -lowerMidpoint, 'expanded'],
      ['collapsed', 'lower midpoint + 1', -(lowerMidpoint + 1), 'expanded'],
      ['expanded', 'lower midpoint + 1', lowerMidpoint - 1, 'expanded'],
      ['expanded', 'lower midpoint exact', lowerMidpoint, 'expanded'],
      ['expanded', 'lower midpoint - 1', lowerMidpoint + 1, 'collapsed'],
      ['expanded', 'upper midpoint - 1', -(upperMidpoint - 1), 'expanded'],
      ['expanded', 'upper midpoint exact', -upperMidpoint, 'full'],
      ['full', 'upper midpoint + 1', upperMidpoint + 1, 'expanded'],
      ['full', 'all the way down', 1_000, 'collapsed'],
      ['collapsed', 'all the way up', -1_000, 'full'],
    ] as const)(
      'resolves %s at %s',
      (startSnap, _boundary, deltaY, expectedSnap) => {
        expect(resolveSheetSnapFromDrag(startSnap, deltaY, bounds)).toBe(
          expectedSnap,
        )
      },
    )
  })

  it.each([
    ['collapsed', 0, 0, 700],
    ['collapsed', 400, 300, 700],
    ['expanded', Number.NaN, 500, 700],
    ['expanded', 52, 52, 52],
  ] as const)(
    'keeps %s when the height bounds are invalid: %s, %s, %s',
    (startSnap, collapsedHeight, expandedHeight, fullHeight) => {
      expect(
        resolveSheetSnapFromDrag(startSnap, 100, {
          collapsedHeight,
          expandedHeight,
          fullHeight,
        }),
      ).toBe(startSnap)
    },
  )

  it('still reaches full on a short stage where expanded equals collapsed', () => {
    // 가로로 눕힌 폰(무대 약 257px): 펼침 = 접힘 = 52px. 전체 단계가 유일한 출구다.
    expect(
      resolveSheetSnapFromDrag('collapsed', -1_000, {
        collapsedHeight: 52,
        expandedHeight: 52,
        fullHeight: 245,
      }),
    ).toBe('full')
  })
})

describe('resolveStatusSheetSnap', () => {
  it.each([
    [{ districtCode: '11680', snap: 'full' }, '11680', 'full'],
    // 고른 구로 URL 이 따라오기 전 한 번의 렌더 — 전체 단계에서 펼침으로 떨어지지 않는다.
    [{ districtCode: '11680', snap: 'full' }, null, 'full'],
    [{ districtCode: null, snap: 'full' }, '11680', 'full'],
    // 접힌 채 링크·뒤로가기로 다른 구가 열리면 펼친다.
    [{ districtCode: null, snap: 'collapsed' }, '11680', 'expanded'],
    [{ districtCode: '11680', snap: 'collapsed' }, '11680', 'collapsed'],
  ] as const)('%o with %s → %s', (state, code, expected) => {
    expect(resolveStatusSheetSnap(state, code)).toBe(expected)
  })
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
