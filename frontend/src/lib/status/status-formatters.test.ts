import { describe, expect, it } from 'vitest'

import {
  formatStatusChange,
  formatStatusRankSummary,
  formatStatusValue,
  getStatusChangeTone,
  presentStatusChange,
  STATUS_CHANGE_BASIS,
  toChangeBadge,
} from './status-formatters'

describe('formatStatusValue', () => {
  it('formats foot traffic by rounding to ten-thousands', () => {
    expect(formatStatusValue('footTraffic', 5_847_230)).toBe('585만명')
  })

  it('formats sales with eok and man-won units', () => {
    expect(formatStatusValue('sales', 15_847_230_000)).toBe('158억 4,723만원')
  })

  it('lifts sales of one jo or more to jo and eok, dropping man', () => {
    // 예전 표기는 "31346억 5205만원" 이었다 — 억이 다섯 자리라 크기가 들어오지 않았다.
    expect(formatStatusValue('sales', 3_134_652_050_000)).toBe('3조 1,347억원')
    expect(formatStatusValue('sales', 1_000_000_000_000)).toBe('1조원')
  })

  it('formats foot traffic over one eok with a thousands separator', () => {
    expect(formatStatusValue('footTraffic', 145_392_456)).toBe('1억 4,539만명')
  })

  it.each([
    [99_995_000, '1억원'],
    [999_999_990_000, '1조원'],
  ])('carries a rounded value %s up to the next unit', (value, expected) => {
    expect(formatStatusValue('sales', value)).toBe(expected)
  })

  it.each(['opened', 'closed'] as const)(
    'formats %s store counts with a Korean thousands separator',
    metric => {
      expect(formatStatusValue(metric, 1_523)).toBe('1,523개')
    },
  )

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])(
    'returns the empty-data label for an invalid value: %s',
    value => {
      expect(formatStatusValue('footTraffic', value)).toBe('데이터 없음')
    },
  )

  it.each([
    ['footTraffic', -1],
    ['sales', -1],
    ['opened', -1],
    ['closed', -1],
    ['footTraffic', 1.5],
    ['sales', 1.5],
    ['opened', 1.5],
    ['closed', 1.5],
  ] as const)(
    'returns the empty-data label for invalid %s totals',
    (metric, value) => {
      expect(formatStatusValue(metric, value)).toBe('데이터 없음')
    },
  )

  it.each([
    [50_000_000, '5,000만원'],
    // 1만 미만은 만 단위 없이 그대로 표기한다 (formatSinoUnit 의 TEN_THOUSAND 분기)
    [0, '0원'],
  ])('omits the zero-eok unit for sales value %s', (value, expected) => {
    expect(formatStatusValue('sales', value)).toBe(expected)
  })
})

describe('formatStatusChange', () => {
  it.each([
    [8.5, '+8.5%'],
    [-2.3, '-2.3%'],
    [0, '0%'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatStatusChange(value)).toBe(expected)
  })

  it.each([
    [null, '데이터 없음'],
    [undefined, '데이터 없음'],
    [Number.NaN, '데이터 없음'],
    [Number.POSITIVE_INFINITY, '데이터 없음'],
    [8.55, '+8.6%'],
    [-2.34, '-2.3%'],
    [8, '+8%'],
  ])('handles change value %s as %s', (value, expected) => {
    expect(formatStatusChange(value)).toBe(expected)
  })
})

describe('getStatusChangeTone', () => {
  it.each([
    ['footTraffic', 2.5, 'positive'],
    ['sales', -4.3, 'negative'],
    ['opened', 1, 'positive'],
    // 폐업은 뒤집는다 — 폐업이 늘면 나쁘다.
    ['closed', 3, 'negative'],
    ['closed', -3, 'positive'],
    ['sales', 0, 'neutral'],
    ['sales', Number.NaN, 'neutral'],
  ] as const)('%s %s → %s', (metric, rate, tone) => {
    expect(getStatusChangeTone(metric, rate)).toBe(tone)
  })
})

describe('presentStatusChange', () => {
  it('적는 기준은 직전 분기다', () => {
    expect(STATUS_CHANGE_BASIS).toBe('직전 분기 대비')
  })

  it.each([
    ['footTraffic', 2.5, '▲', '증가', '+2.5%', '개선', 'positive'],
    ['sales', -4.3, '▼', '감소', '-4.3%', '악화', 'negative'],
    // 폐업은 극성이 반대다 — 늘면 악화, 줄면 개선.
    ['closed', 26.1, '▲', '증가', '+26.1%', '악화', 'negative'],
    ['closed', -3, '▼', '감소', '-3%', '개선', 'positive'],
  ] as const)(
    '%s %s → %s %s %s %s',
    (metric, rate, arrow, direction, rateText, quality, tone) => {
      expect(presentStatusChange(metric, rate)).toEqual({
        tone,
        arrow,
        directionLabel: direction,
        rateText,
        qualityLabel: quality,
      })
    },
  )

  it('변동 없음과 데이터 없음은 개선·악화를 말하지 않는다', () => {
    expect(presentStatusChange('sales', 0)).toEqual({
      tone: 'neutral',
      arrow: '–',
      directionLabel: '변동 없음',
      rateText: '0%',
      qualityLabel: '',
    })
    expect(presentStatusChange('closed', null)).toEqual({
      tone: 'neutral',
      arrow: null,
      directionLabel: '',
      rateText: '변화율 데이터 없음',
      qualityLabel: '',
    })
  })
})

describe('formatStatusRankSummary', () => {
  const ranked = {
    rank: 14,
    districtCode: '11545',
    districtName: '금천구',
    value: 1_210_000_000_000,
    changeRate: -2.1,
  }

  it('Top10 밖 구도 「지표 N위 · 값 · 변화율」로 적는다', () => {
    expect(formatStatusRankSummary('sales', ranked)).toBe(
      '매출 14위 · 1조 2,100억원 · -2.1%',
    )
  })

  it('변화율 null 은 0% 가 아니라 결측으로 적는다', () => {
    expect(
      formatStatusRankSummary('sales', { ...ranked, changeRate: null }),
    ).toBe('매출 14위 · 1조 2,100억원 · 변화율 데이터 없음')
    expect(formatStatusRankSummary('sales', { ...ranked, changeRate: 0 })).toBe(
      '매출 14위 · 1조 2,100억원 · 0%',
    )
  })

  it('동점은 응답 순위 그대로 같은 순위로 적는다', () => {
    const tied = { ...ranked, rank: 2, value: 3, changeRate: 1 }

    expect(formatStatusRankSummary('opened', tied)).toBe('개업 2위 · 3개 · +1%')
    expect(
      formatStatusRankSummary('opened', { ...tied, districtCode: '11710' }),
    ).toBe('개업 2위 · 3개 · +1%')
  })

  it('지표 순위에 없는 구는 「지표 데이터 없음」이다', () => {
    expect(formatStatusRankSummary('footTraffic', undefined)).toBe(
      '유동인구 데이터 없음',
    )
    expect(formatStatusRankSummary('closed', null)).toBe('폐업 데이터 없음')
  })
})

describe('toChangeBadge', () => {
  it('변화율 null 이면 배지를 만들지 않는다', () => {
    expect(toChangeBadge(null)).toEqual({})
  })
})
