import { describe, expect, it } from 'vitest'

import { footTimeDefinitions } from '@/lib/analysis/commercial-chart-selectors'
import { TIME_SLOT_HOURS, toPerHourRows } from '@/lib/analysis/time-slot'

describe('toPerHourRows', () => {
  it('구간 합계를 구간 길이로 나눠 반올림한다', () => {
    expect(
      toPerHourRows([
        { label: '00~06시', value: 407_408 },
        { label: '21~24시', value: 214_501 },
      ]),
    ).toEqual([
      { label: '00~06시', value: 67_901 },
      { label: '21~24시', value: 71_500 },
    ])
  })

  it('값이 없으면 null 그대로, 길이를 모르는 라벨은 바꾸지 않는다', () => {
    expect(
      toPerHourRows([
        { label: '11~14시', value: null },
        { label: '알 수 없음', value: 30 },
      ]),
    ).toEqual([
      { label: '11~14시', value: null },
      { label: '알 수 없음', value: 30 },
    ])
  })

  it('시간대 정의의 모든 라벨에 길이가 있고, 합이 24시간이다', () => {
    const labels = footTimeDefinitions.map(([label]) => label)
    expect(labels.every(label => TIME_SLOT_HOURS[label] > 0)).toBe(true)
    expect(labels.reduce((sum, label) => sum + TIME_SLOT_HOURS[label], 0)).toBe(
      24,
    )
  })
})
