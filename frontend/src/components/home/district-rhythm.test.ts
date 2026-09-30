import { describe, expect, it } from 'vitest'

import {
  barRects,
  formatSlotRange,
  formatWeekendDelta,
  roundedTopBarPath,
  toDistrictRhythm,
} from '@/components/home/district-rhythm'
import type { DistrictDetail } from '@/types/status'

const meta = (name: string) => ({ code: name, name, description: name })

/** 2026-09-30 dev 백엔드 강동구(11740) 응답에서 필요한 칸만 옮겼다. */
const gangdong = {
  changeIndicator: {
    changeIndicatorCode: 'LL',
    changeIndicatorName: '다이나믹',
    averageOpenedMonths: 111,
    averageClosedMonths: 50,
  },
  footTraffic: {
    periodTrend: meta('증가'),
    periodTotalFootTrafficList: [
      { periodCode: '20261', totalFootTraffic: 106404596 },
      { periodCode: '20252', totalFootTraffic: 105924756 },
      { periodCode: '20254', totalFootTraffic: 105146089 },
      { periodCode: '20253', totalFootTraffic: 105750741 },
    ],
    timeSlot: {
      footTrafficTime00To06: 28852160,
      footTrafficTime06To11: 21915423,
      footTrafficTime11To14: 12103915,
      footTrafficTime14To17: 12065004,
      footTrafficTime17To21: 17364859,
      footTrafficTime21To24: 14103234,
      dominantTimeSlotType: meta('00~06시'),
    },
    gender: {
      maleFootTraffic: 1,
      femaleFootTraffic: 1,
      dominantGenderType: meta('여성'),
    },
    ageGroup: {
      age10FootTraffic: 1,
      age20FootTraffic: 1,
      age30FootTraffic: 1,
      age40FootTraffic: 1,
      age50FootTraffic: 1,
      age60PlusFootTraffic: 1,
      dominantAgeGroupType: meta('30대'),
    },
    dayOfWeek: {
      mondayFootTraffic: 15057264,
      tuesdayFootTraffic: 14956787,
      wednesdayFootTraffic: 15052124,
      thursdayFootTraffic: 15025214,
      fridayFootTraffic: 15052209,
      saturdayFootTraffic: 15493109,
      sundayFootTraffic: 15767888,
      dominantDayOfWeekType: meta('일요일'),
    },
  },
  store: {
    topStoreServices: [],
    topOpenedAdministrations: [],
    topClosedAdministrations: [],
  },
  sales: { topSalesServices: [], topSalesAdministrations: [] },
} satisfies DistrictDetail

describe('toDistrictRhythm', () => {
  it('최근 분기와 전분기 대비를 분기 코드 순으로 정렬해 구한다', () => {
    const { latest } = toDistrictRhythm(gangdong)
    expect(latest?.periodCode).toBe('20261')
    expect(latest?.total).toBe(106404596)
    expect(latest?.changeRate).toBeCloseTo((106404596 / 105146089 - 1) * 100)
  })

  it('시간대 합계를 구간 시간 수로 나눠 시간당으로 바꾼다', () => {
    const { slots } = toDistrictRhythm(gangdong)
    expect(slots).toHaveLength(6)
    expect(slots[0].perHour).toBeCloseTo(28852160 / 6)
    expect(slots.filter(slot => slot.peak).map(formatSlotRange)).toEqual([
      '0~6시',
    ])
  })

  it('최다 구간은 합계가 아니라 시간당으로 고른다 — 강남구는 합계 최다(06~11)가 아니라 14~17시다', () => {
    /* 같은 날 강남구(11680) 응답의 시간대 칸. */
    const gangnam = {
      ...gangdong,
      footTraffic: {
        ...gangdong.footTraffic,
        timeSlot: {
          footTrafficTime00To06: 29540008,
          footTrafficTime06To11: 30038363,
          footTrafficTime11To14: 21965227,
          footTrafficTime14To17: 22097479,
          footTrafficTime17To21: 25732078,
          footTrafficTime21To24: 16014445,
          dominantTimeSlotType: meta('06~11시'),
        },
      },
    } satisfies DistrictDetail
    const peak = toDistrictRhythm(gangnam).slots.filter(slot => slot.peak)
    expect(peak.map(formatSlotRange)).toEqual(['14~17시'])
  })

  it('요일 최다와 평일 대비 주말 변화율(정수)을 낸다', () => {
    const { days, weekendDeltaPct } = toDistrictRhythm(gangdong)
    expect(days.map(day => day.label).join('')).toBe('월화수목금토일')
    expect(days.find(day => day.peak)?.label).toBe('일')
    expect(weekendDeltaPct).toBe(4)
  })

  it('상권변화지표 이름을 싣고, 비어 있으면 null 이다', () => {
    expect(toDistrictRhythm(gangdong).indicatorName).toBe('다이나믹')
    expect(
      toDistrictRhythm({
        ...gangdong,
        changeIndicator: {
          ...gangdong.changeIndicator,
          changeIndicatorName: ' ',
        },
      }).indicatorName,
    ).toBeNull()
  })

  it('한 칸이라도 빠지면 그 차트를 통째로 비운다 — 0 으로 채워 틀린 모양을 그리지 않는다', () => {
    const broken = {
      ...gangdong,
      footTraffic: {
        ...gangdong.footTraffic,
        periodTotalFootTrafficList: [
          { periodCode: '20261', totalFootTraffic: 10 },
        ],
        timeSlot: {
          ...gangdong.footTraffic.timeSlot,
          footTrafficTime11To14: null as unknown as number,
        },
        dayOfWeek: {
          ...gangdong.footTraffic.dayOfWeek,
          sundayFootTraffic: Number.NaN,
        },
      },
    } satisfies DistrictDetail
    const rhythm = toDistrictRhythm(broken)
    expect(rhythm.slots).toEqual([])
    expect(rhythm.days).toEqual([])
    expect(rhythm.weekendDeltaPct).toBeNull()
    // 앞 분기가 없으면 변화율도 없다.
    expect(rhythm.latest?.changeRate).toBeNull()
  })
})

describe('formatWeekendDelta', () => {
  it('부호를 붙이고, 0 은 「비슷」이라 적는다', () => {
    expect(formatWeekendDelta(4)).toBe('평일 대비 주말 +4%')
    expect(formatWeekendDelta(-14)).toBe('평일 대비 주말 −14%')
    expect(formatWeekendDelta(0)).toBe('주말도 비슷')
  })
})

describe('barRects', () => {
  it('0 기준이고, 폭은 span 에 비례하며 사이를 gap 만큼 띄운다', () => {
    const rects = barRects(
      [
        { span: 2, value: 50, peak: false },
        { span: 1, value: 100, peak: true },
      ],
      62,
      40,
      2,
    )
    expect(rects).toEqual([
      { x: 0, y: 20, width: 40, height: 20, peak: false },
      { x: 42, y: 0, width: 20, height: 40, peak: true },
    ])
  })

  it('그릴 수 없으면 빈 배열이다', () => {
    expect(barRects([], 100, 40, 2)).toEqual([])
    expect(barRects([{ span: 1, value: 0, peak: false }], 100, 40, 2)).toEqual(
      [],
    )
  })
})

describe('roundedTopBarPath', () => {
  it('기준선에서 시작해 위 모서리만 둥글게 닫는다', () => {
    const d = roundedTopBarPath(
      { x: 0, y: 10, width: 20, height: 30, peak: false },
      3,
    )
    expect(d.startsWith('M 0 40')).toBe(true)
    expect(d).toContain('Q 0 10 3 10')
    expect(d.endsWith('L 20 40 Z')).toBe(true)
  })
})
