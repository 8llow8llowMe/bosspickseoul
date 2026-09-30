import type { DistrictDetail } from '@/types/status'

/**
 * 히어로 지도 툴팁이 그리는 값(full-screen-sections-and-live-tooltip.md D4-5).
 * `GET /districts/{code}` 응답에서 **화면이 말할 것만** 뽑는다. 값이 없으면 그 칸을 null·빈
 * 배열로 두고, 그리는 쪽이 칸째로 뺀다 — 0 으로 채우면 「유동 0명」이라는 틀린 말이 된다.
 */

/**
 * 백엔드 시간대 구간. 길이가 제각각(6·5·3·3·4·3시간)이라 합계를 그대로 그리면 긴 구간이
 * 늘 이긴다 — 그래서 시간당으로 나눈다. 응답의 `dominantTimeSlotType` 도 합계 기준이라 쓰지
 * 않는다(강남구는 합계로는 06~11시가 최다지만 시간당으로는 14~17시다).
 */
const TIME_SLOTS = [
  { key: 'footTrafficTime00To06', start: 0, end: 6 },
  { key: 'footTrafficTime06To11', start: 6, end: 11 },
  { key: 'footTrafficTime11To14', start: 11, end: 14 },
  { key: 'footTrafficTime14To17', start: 14, end: 17 },
  { key: 'footTrafficTime17To21', start: 17, end: 21 },
  { key: 'footTrafficTime21To24', start: 21, end: 24 },
] as const

const WEEKDAYS = [
  { key: 'mondayFootTraffic', label: '월', weekend: false },
  { key: 'tuesdayFootTraffic', label: '화', weekend: false },
  { key: 'wednesdayFootTraffic', label: '수', weekend: false },
  { key: 'thursdayFootTraffic', label: '목', weekend: false },
  { key: 'fridayFootTraffic', label: '금', weekend: false },
  { key: 'saturdayFootTraffic', label: '토', weekend: true },
  { key: 'sundayFootTraffic', label: '일', weekend: true },
] as const

export type RhythmSlot = {
  start: number
  end: number
  /** 그 구간의 시간당 유동인구. */
  perHour: number
  peak: boolean
}

export type RhythmDay = { label: string; value: number; peak: boolean }

export type DistrictRhythm = {
  /** 가장 최근 분기의 유동인구와 바로 앞 분기 대비 변화율(%). */
  latest: {
    periodCode: string
    total: number
    changeRate: number | null
  } | null
  /** 상권변화지표 이름(예: 다이나믹). 상태색이 아니라 회색 알약으로 그린다. */
  indicatorName: string | null
  /** 여섯 구간이 모두 있을 때만 채운다 — 한 칸이 빠지면 리듬이 틀린 모양이 된다. */
  slots: RhythmSlot[]
  days: RhythmDay[]
  /** 평일 하루 평균 대비 주말 하루 평균(%, 정수). */
  weekendDeltaPct: number | null
}

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const markPeak = <T extends { peak: boolean }>(
  items: T[],
  valueOf: (item: T) => number,
): T[] => {
  if (items.length === 0) return items
  const max = Math.max(...items.map(valueOf))
  // 같은 값이 둘이면 앞쪽 하나만 진하게 — 두 칸이 같이 진하면 「최다」가 무엇인지 흐려진다.
  const peakIndex = items.findIndex(item => valueOf(item) === max)
  return items.map((item, index) => ({ ...item, peak: index === peakIndex }))
}

export function toDistrictRhythm(detail: DistrictDetail): DistrictRhythm {
  const footTraffic = detail.footTraffic

  const periods = (footTraffic?.periodTotalFootTrafficList ?? [])
    .filter(item => item?.periodCode && isCount(item.totalFootTraffic))
    .slice()
    .sort((a, b) => a.periodCode.localeCompare(b.periodCode))
  const last = periods.at(-1)
  const previous = periods.at(-2)
  const latest = last
    ? {
        periodCode: last.periodCode,
        total: last.totalFootTraffic,
        changeRate:
          previous && previous.totalFootTraffic > 0
            ? (last.totalFootTraffic / previous.totalFootTraffic - 1) * 100
            : null,
      }
    : null

  const timeSlot = footTraffic?.timeSlot
  const slotValues = TIME_SLOTS.map(slot => timeSlot?.[slot.key])
  const slots = slotValues.every(isCount)
    ? markPeak(
        TIME_SLOTS.map((slot, index) => ({
          start: slot.start,
          end: slot.end,
          perHour: (slotValues[index] as number) / (slot.end - slot.start),
          peak: false,
        })),
        slot => slot.perHour,
      )
    : []

  const dayOfWeek = footTraffic?.dayOfWeek
  const dayValues = WEEKDAYS.map(day => dayOfWeek?.[day.key])
  const days = dayValues.every(isCount)
    ? markPeak(
        WEEKDAYS.map((day, index) => ({
          label: day.label,
          value: dayValues[index] as number,
          peak: false,
        })),
        day => day.value,
      )
    : []

  let weekendDeltaPct: number | null = null
  if (days.length === WEEKDAYS.length) {
    const average = (weekend: boolean) => {
      const values = days.filter(
        (_, index) => WEEKDAYS[index].weekend === weekend,
      )
      return values.reduce((sum, day) => sum + day.value, 0) / values.length
    }
    const weekday = average(false)
    if (weekday > 0) {
      weekendDeltaPct = Math.round((average(true) / weekday - 1) * 100)
    }
  }

  return {
    latest,
    indicatorName: detail.changeIndicator?.changeIndicatorName?.trim() || null,
    slots,
    days,
    weekendDeltaPct,
  }
}

/** 「14~17시」 */
export const formatSlotRange = (slot: Pick<RhythmSlot, 'start' | 'end'>) =>
  `${slot.start}~${slot.end}시`

/** 「평일 대비 주말 −14%」. 반올림해 0 이면 「주말도 비슷」. */
export const formatWeekendDelta = (pct: number): string => {
  if (pct === 0) return '주말도 비슷'
  return `평일 대비 주말 ${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`
}

export type BarRect = {
  x: number
  y: number
  width: number
  height: number
  peak: boolean
}

const round = (value: number) => Math.round(value * 100) / 100

/**
 * 막대 기하. **0 기준**이다 — 막대를 잘라 그리면 차이가 과장된다(dataviz 원칙). 폭은
 * `span` 에 비례하고(시간대는 구간 시간 수, 요일은 1), 막대 사이는 `gap` 만큼 띄운다.
 */
export function barRects(
  items: { span: number; value: number; peak: boolean }[],
  width: number,
  height: number,
  gap: number,
): BarRect[] {
  if (items.length === 0) return []
  const max = Math.max(...items.map(item => item.value))
  const totalSpan = items.reduce((sum, item) => sum + item.span, 0)
  const drawable = width - gap * (items.length - 1)
  if (max <= 0 || totalSpan <= 0 || drawable <= 0) return []

  let cursor = 0
  return items.map(item => {
    const barWidth = (item.span / totalSpan) * drawable
    const barHeight = (item.value / max) * height
    const rect = {
      x: round(cursor),
      y: round(height - barHeight),
      width: round(barWidth),
      height: round(barHeight),
      peak: item.peak,
    }
    cursor += barWidth + gap
    return rect
  })
}

/** 위 모서리만 둥근 막대 — 끝(값)은 둥글게, 기준선 쪽은 각지게 붙인다. */
export function roundedTopBarPath(rect: BarRect, radius: number): string {
  const { x, y, width, height } = rect
  const r = Math.max(0, Math.min(radius, width / 2, height))
  const bottom = round(y + height)
  return [
    `M ${x} ${bottom}`,
    `L ${x} ${round(y + r)}`,
    `Q ${x} ${y} ${round(x + r)} ${y}`,
    `L ${round(x + width - r)} ${y}`,
    `Q ${round(x + width)} ${y} ${round(x + width)} ${round(y + r)}`,
    `L ${round(x + width)} ${bottom}`,
    'Z',
  ].join(' ')
}
