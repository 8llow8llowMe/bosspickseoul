import { describe, expect, it } from 'vitest'

import {
  toTrendPoints,
  toPyramidRows,
  toGenderSegments,
} from '@/lib/analysis/chart-data'

describe('toTrendPoints', () => {
  it('periodCode를 라벨로 변환하고 null 값을 보존한다', () => {
    const points = toTrendPoints({
      periods: [
        { periodCode: '20232', value: 100, changeRate: null },
        { periodCode: '20233', value: null, changeRate: 5 },
      ],
    })
    expect(points).toEqual([
      { periodLabel: '2023년 2분기', value: 100, changeRate: null },
      { periodLabel: '2023년 3분기', value: null, changeRate: 5 },
    ])
  })

  it('빈/누락 입력은 빈 배열을 반환한다', () => {
    expect(toTrendPoints(null)).toEqual([])
    expect(toTrendPoints({ periods: null })).toEqual([])
  })
})

describe('toPyramidRows', () => {
  it('연령대별 남/여 퍼센트를 매핑하고 누락은 null로 둔다', () => {
    const rows = toPyramidRows({
      maleAge10Percent: 3,
      femaleAge10Percent: 4,
      maleAge60PlusPercent: 2,
    })
    expect(rows[0]).toEqual({ ageLabel: '10대', male: 3, female: 4 })
    expect(rows[5]).toEqual({ ageLabel: '60대+', male: 2, female: null })
    expect(rows).toHaveLength(6)
  })
})

describe('toGenderSegments', () => {
  it('존재하는 성별 값만 세그먼트로 만든다', () => {
    expect(toGenderSegments(60, 40)).toEqual([
      { label: '남성', value: 60 },
      { label: '여성', value: 40 },
    ])
    expect(toGenderSegments(null, 40)).toEqual([{ label: '여성', value: 40 }])
    expect(toGenderSegments(null, null)).toEqual([])
  })
})
