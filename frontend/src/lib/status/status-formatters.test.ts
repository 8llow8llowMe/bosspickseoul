import { describe, expect, it } from 'vitest'

import { formatStatusChange, formatStatusValue } from './status-formatters'

describe('formatStatusValue', () => {
  it('formats foot traffic by rounding to ten-thousands', () => {
    expect(formatStatusValue('footTraffic', 5_847_230)).toBe('585만명')
  })

  it('formats sales with eok and man-won units', () => {
    expect(formatStatusValue('sales', 15_847_230_000)).toBe('158억 4723만원')
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
    [50_000_000, '5000만원'],
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
