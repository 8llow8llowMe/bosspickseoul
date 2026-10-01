import { describe, expect, it } from 'vitest'

import { toShares } from '@/lib/analysis/chart-data'

import {
  describeStoreCompetition,
  describeFootAgeGenderPeak,
  describeFootDayPattern,
  describeFootTimePeak,
  describeGenderShare,
  describeLatestChange,
  describePopulationAgePeak,
  describeSalesAgePeak,
  describeSalesDayPeak,
  describeSalesTimeShare,
  findPeakRow,
} from '@/lib/analysis/chart-insights'

const row = (label: string, value: number | null) => ({ label, value })

const pt = (periodLabel: string, value: number | null) => ({
  periodLabel,
  value,
  changeRate: null,
})

const week = (values: number[]) =>
  ['월', '화', '수', '목', '금', '토', '일'].map((label, index) =>
    row(label, values[index]),
  )

describe('chart-insights', () => {
  it('findPeakRow 는 가장 큰 양수 행을, 동률이면 앞 행을 고른다', () => {
    expect(findPeakRow([row('a', 3), row('b', 5), row('c', 5)])?.label).toBe(
      'b',
    )
    expect(findPeakRow([row('a', 0), row('b', null)])).toBeNull()
  })

  it('시간대 유동인구는 가장 많은 구간을 주어와 함께 말한다', () => {
    expect(describeFootTimePeak([row('06~11시', 10), row('17~21시', 30)])).toBe(
      '17~21시에 유동인구가 가장 많아요',
    )
    expect(describeFootTimePeak([])).toBeNull()
  })

  it('요일 유동인구는 주말·평일 하루 평균을 비교한다', () => {
    expect(
      describeFootDayPattern(week([100, 100, 100, 100, 100, 106, 106])),
    ).toBe('주말 하루 유동인구가 평일보다 6% 많아요')
    expect(
      describeFootDayPattern(week([100, 100, 100, 100, 100, 80, 80])),
    ).toBe('주말 하루 유동인구가 평일보다 20% 적어요')
    expect(
      describeFootDayPattern(week([100, 100, 100, 100, 100, 100.2, 100])),
    ).toBe('주말과 평일의 하루 유동인구가 비슷해요')
  })

  it('빠진 구간이 있으면 최댓값·비중 문장을 만들지 않는다', () => {
    const rows = week([100, 100, 100, 100, 100, 130, 0])
    rows[6] = row('일', null)
    expect(describeFootDayPattern(rows)).toBeNull()
    expect(describeSalesDayPeak(rows)).toBeNull()
    expect(
      describeSalesTimeShare([row('11~14시', 50), row('17~21시', null)]),
    ).toBeNull()
    expect(
      describeFootTimePeak([row('06~11시', 10), row('17~21시', null)]),
    ).toBeNull()
    expect(
      describeFootAgeGenderPeak([{ ageLabel: '20대', male: 12, female: null }]),
    ).toBeNull()
  })

  it('연령·성별 유동인구는 가장 큰 칸을 「20대 여성」처럼 말한다', () => {
    expect(
      describeFootAgeGenderPeak([
        { ageLabel: '20대', male: 12, female: 15 },
        { ageLabel: '60대+', male: 9, female: 10 },
      ]),
    ).toBe('20대 여성이 가장 많이 지나가요')
    expect(
      describeFootAgeGenderPeak([{ ageLabel: '60대+', male: 20, female: 10 }]),
    ).toBe('60대 이상 남성이 가장 많이 지나가요')
  })

  it('시간대 매출은 최대 구간의 비중을 말한다', () => {
    expect(
      describeSalesTimeShare([row('11~14시', 38), row('17~21시', 62 - 0)]),
    ).toBe('매출의 62%가 17~21시에 나와요')
    expect(describeSalesTimeShare([row('11~14시', 0)])).toBeNull()
  })

  it('요일·연령 매출과 상주인구는 최댓값을 말한다', () => {
    expect(describeSalesDayPeak(week([1, 1, 1, 5, 1, 1, 1]))).toBe(
      '목요일 매출이 가장 높아요',
    )
    expect(describeSalesAgePeak([row('30대', 1), row('40대', 3)])).toBe(
      '40대 매출이 가장 커요',
    )
    expect(describePopulationAgePeak([row('20대', 9), row('30대', 3)])).toBe(
      '20대 상주인구가 가장 많아요',
    )
  })

  it('성비는 많은 쪽과 비율을 말하고 값이 모자라면 문장을 만들지 않는다', () => {
    expect(describeGenderShare(45, 55, '결제 건수는')).toBe(
      '결제 건수는 여성이 55%예요',
    )
    expect(describeGenderShare(57, 43, '상주인구는')).toBe(
      '상주인구는 남성이 57%예요',
    )
    expect(describeGenderShare(50, 50, '상주인구는')).toBe(
      '상주인구는 남성과 여성이 반반이에요',
    )
    expect(describeGenderShare(null, 10, '상주인구는')).toBeNull()
    // 막대(toShares)와 같은 반올림이라 .5 경계에서도 숫자가 갈리지 않는다.
    expect(describeGenderShare(48.5, 51.5, '상주인구는')).toBe(
      '상주인구는 여성이 51%예요',
    )
    expect(describeGenderShare(50.5, 49.5, '상주인구는')).toBe(
      '상주인구는 남성이 51%예요',
    )
    expect(describeGenderShare(91, 109, '결제 건수는')).toBe(
      `결제 건수는 여성이 ${toShares([91, 109])[1]}%예요`,
    )
    expect(describeGenderShare(0, 0, '상주인구는')).toBeNull()
  })

  it('describeLatestChange 는 마지막 두 값으로 방향과 문장을 만든다', () => {
    expect(
      describeLatestChange([pt('a', 100), pt('b', 104.2)], '유동인구가'),
    ).toEqual({
      direction: 'INCREASE',
      sentence: '유동인구가 직전 분기보다 4.2% 늘었어요',
    })
    expect(
      describeLatestChange([pt('a', 10), pt('b', 10)], '점포 수가'),
    ).toEqual({
      direction: 'STAGNANT',
      sentence: '점포 수가 직전 분기와 같아요',
    })
    expect(describeLatestChange([pt('a', 0), pt('b', 3)], '점포 수가')).toEqual(
      {
        direction: 'INCREASE',
        sentence: '점포 수가 직전 분기보다 늘었어요',
      },
    )
    expect(
      describeLatestChange(
        [pt('a', 3_000_000), pt('b', 3_001_000)],
        '유동인구가',
      ),
    ).toEqual({
      direction: 'STAGNANT',
      sentence: '유동인구가 직전 분기와 거의 같아요',
    })
    expect(describeLatestChange([pt('a', 10)], '매출이')).toBeNull()
    expect(
      describeLatestChange([pt('a', 10), pt('b', 12), pt('c', null)], '매출이'),
    ).toBeNull()
  })
})

describe('describeStoreCompetition', () => {
  it('유사 업종 점포 수와 그 분기 개·폐업 건수를 같은 주어로 적는다', () => {
    expect(describeStoreCompetition(20, 1, 1)).toBe(
      '유사 업종 점포가 20개 있어요. 이 분기에 1개가 문을 열고 1개가 문을 닫았어요',
    )
  })

  it('개·폐업이 모두 0 이면 「0개가 문을 열고」 대신 없다고 적는다', () => {
    expect(describeStoreCompetition(1200, 0, 0)).toBe(
      '유사 업종 점포가 1,200개 있어요. 이 분기에 문을 연 점포도 닫은 점포도 없어요',
    )
  })

  it('개·폐업 건수가 하나라도 비면 둘째 문장을 뺀다', () => {
    expect(describeStoreCompetition(20, 3, null)).toBe(
      '유사 업종 점포가 20개 있어요',
    )
  })

  it('유사 업종 점포가 0 이면 없다고만 적고, 값이 없으면 문장을 만들지 않는다', () => {
    expect(describeStoreCompetition(0, 0, 0)).toBe(
      '이 상권에는 유사 업종 점포가 없어요',
    )
    expect(describeStoreCompetition(undefined, 1, 1)).toBeNull()
  })
})
