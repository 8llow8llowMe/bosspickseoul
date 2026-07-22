import { describe, expect, it } from 'vitest'

import { formatStatusChange, formatStatusValue } from './status-formatters'

describe('formatStatusValue', () => {
  it('formats foot traffic by flooring to ten-thousands', () => {
    expect(formatStatusValue('footTraffic', 5_847_230)).toBe('584만 명')
  })

  it('formats sales with eok and man-won units', () => {
    expect(formatStatusValue('sales', 15_847_230_000)).toBe('158억 4,723만원')
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
})

describe('formatStatusChange', () => {
  it.each([
    [8.5, '+8.5%'],
    [-2.3, '-2.3%'],
    [0, '0%'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatStatusChange(value)).toBe(expected)
  })
})
