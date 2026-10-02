import {
  toShares,
  type PyramidRow,
  type TrendPoint,
} from '@/lib/analysis/chart-data'
import type { AnalysisMetricRow } from '@/lib/analysis/presentation'

/*
  결과 화면 차트 카드의 **결론 문장**. 카드가 제목과 차트만 갖고 있으면 사용자는 막대를
  직접 비교해 답을 찾아야 했다. 카드 설명 자리에 데이터에서 계산한 한 문장을 둔다.

  카피 규칙(주어·목적어를 생략하지 않는다)을 지킨다 — 「가장 많아요」가 아니라
  「17~21시에 유동인구가 가장 많아요」. 데이터가 모자라면 null 을 돌려 문장을 빼고,
  틀릴 수 있는 문장은 만들지 않는다.
*/

const WEEKDAY_NAMES: Record<string, string> = {
  월: '월요일',
  화: '화요일',
  수: '수요일',
  목: '목요일',
  금: '금요일',
  토: '토요일',
  일: '일요일',
}

const WEEKEND = new Set(['토', '일'])

/**
 * 모든 행이 숫자인가. 「가장 많아요」·「매출의 N%」는 빠진 구간이 있으면 틀릴 수 있다 — 비어
 * 있는 구간이 실제 최댓값일 수 있고, 비중의 분모도 작아진다. 그래서 하나라도 비면 문장을
 * 만들지 않는다.
 */
const isComplete = (rows: readonly AnalysisMetricRow[]): boolean =>
  rows.length > 0 &&
  rows.every(row => typeof row.value === 'number' && Number.isFinite(row.value))

const numeric = (rows: readonly AnalysisMetricRow[]) =>
  rows.filter(
    (row): row is AnalysisMetricRow & { value: number } =>
      typeof row.value === 'number' && Number.isFinite(row.value),
  )

/** 가장 큰 양수 값의 행. 같은 값이 여럿이면 앞의 행이다(차트의 `highlightMax` 와 같다). */
export const findPeakRow = (
  rows: readonly AnalysisMetricRow[],
): (AnalysisMetricRow & { value: number }) | null =>
  numeric(rows).reduce<(AnalysisMetricRow & { value: number }) | null>(
    (best, row) =>
      row.value > 0 && (best === null || row.value > best.value) ? row : best,
    null,
  )

const roundPercent = (rate: number): number => Math.round(Math.abs(rate))

/** 「17~21시에 유동인구가 가장 많아요」 */
export const describeFootTimePeak = (
  rows: readonly AnalysisMetricRow[],
): string | null => {
  if (!isComplete(rows)) return null
  const peak = findPeakRow(rows)
  return peak ? `${peak.label}에 유동인구가 가장 많아요` : null
}

/**
 * 주말 하루 평균과 평일 하루 평균을 비교한다. 7일이 다 있어야 평균이 공정하므로 하나라도
 * 비면 문장을 만들지 않는다.
 */
export const describeFootDayPattern = (
  rows: readonly AnalysisMetricRow[],
): string | null => {
  if (rows.length !== 7 || !isComplete(rows)) return null
  const values = numeric(rows)
  const average = (list: typeof values) =>
    list.reduce((sum, row) => sum + row.value, 0) / list.length
  const weekend = average(values.filter(row => WEEKEND.has(row.label)))
  const weekday = average(values.filter(row => !WEEKEND.has(row.label)))
  if (weekday <= 0) return null
  const rate = ((weekend - weekday) / weekday) * 100
  const percent = roundPercent(rate)
  if (percent < 1) return '주말과 평일의 하루 유동인구가 비슷해요'
  return `주말 하루 유동인구가 평일보다 ${percent}% ${rate > 0 ? '많아요' : '적어요'}`
}

/** 「20대 여성이 가장 많이 지나가요」 */
export const describeFootAgeGenderPeak = (
  rows: readonly PyramidRow[],
): string | null => {
  if (
    rows.length === 0 ||
    rows.some(
      row => typeof row.male !== 'number' || typeof row.female !== 'number',
    )
  )
    return null
  let best: { label: string; value: number } | null = null
  for (const row of rows) {
    for (const [gender, value] of [
      ['남성', row.male],
      ['여성', row.female],
    ] as const) {
      if (
        typeof value === 'number' &&
        value > 0 &&
        (!best || value > best.value)
      )
        best = {
          label: `${row.ageLabel.replace('+', ' 이상')} ${gender}`,
          value,
        }
    }
  }
  return best ? `${best.label}이 가장 많이 지나가요` : null
}

/** 「매출의 38%가 11~14시에 나와요」 — 합계가 있어야 비중을 말할 수 있다. */
export const describeSalesTimeShare = (
  rows: readonly AnalysisMetricRow[],
): string | null => {
  if (!isComplete(rows)) return null
  const peak = findPeakRow(rows)
  if (!peak) return null
  const total = numeric(rows).reduce(
    (sum, row) => sum + Math.max(0, row.value),
    0,
  )
  if (total <= 0) return null
  return `매출의 ${Math.round((peak.value / total) * 100)}%가 ${peak.label}에 나와요`
}

/** 「목요일 매출이 가장 높아요」 */
export const describeSalesDayPeak = (
  rows: readonly AnalysisMetricRow[],
): string | null => {
  if (!isComplete(rows)) return null
  const peak = findPeakRow(rows)
  return peak
    ? `${WEEKDAY_NAMES[peak.label] ?? peak.label} 매출이 가장 높아요`
    : null
}

/** 「40대 매출이 가장 커요」 */
export const describeSalesAgePeak = (
  rows: readonly AnalysisMetricRow[],
): string | null => {
  if (!isComplete(rows)) return null
  const peak = findPeakRow(rows)
  return peak ? `${peak.label} 매출이 가장 커요` : null
}

/** 「20대 상주인구가 가장 많아요」 */
export const describePopulationAgePeak = (
  rows: readonly AnalysisMetricRow[],
): string | null => {
  if (!isComplete(rows)) return null
  const peak = findPeakRow(rows)
  return peak ? `${peak.label} 상주인구가 가장 많아요` : null
}

/**
 * 성비 한 줄. `subject` 는 조사까지 붙은 주제어다(「결제 건수는」·「상주인구는」).
 * 비율은 두 값의 합으로 계산하므로 건수·퍼센트 어느 쪽을 넣어도 된다.
 */
export const describeGenderShare = (
  male: number | null | undefined,
  female: number | null | undefined,
  subject: string,
): string | null => {
  if (typeof male !== 'number' || typeof female !== 'number') return null
  if (!(male + female > 0)) return null
  // 막대(`ShareBar`)와 같은 `toShares` 로 나눠 카드 안 숫자가 갈리지 않게 한다.
  const [maleShare, femaleShare] = toShares([male, female])
  if (maleShare === femaleShare) return `${subject} 남성과 여성이 반반이에요`
  return femaleShare > maleShare
    ? `${subject} 여성이 ${femaleShare}%예요`
    : `${subject} 남성이 ${maleShare}%예요`
}

const formatPercent = (rate: number): string => {
  const abs = Math.abs(rate)
  return `${abs < 10 ? Number(abs.toFixed(1)) : Math.round(abs)}%`
}

export type TrendDirection = 'INCREASE' | 'DECREASE' | 'STAGNANT'

export type LatestChange = {
  direction: TrendDirection
  sentence: string
}

/**
 * 마지막 두 시점으로 「직전 분기 대비」 문장을 만든다. `subject` 는 조사까지 붙은 주어다
 * (「매출이」·「유동인구가」·「점포 수가」) — 「직전 분기보다 줄었어요」만 쓰면 무엇이 줄었는지
 * 문장에 없다.
 *
 * 서버 `changeRate` 도 같은 식(직전 분기 대비 비율)이지만 쓰지 않고 마지막 두 점의 값에서
 * 계산한다 — 문장이 말하는 「직전 분기」와 계산에 쓴 두 점이 늘 같도록, 둘 중 하나가 비면
 * 문장을 만들지 않는다.
 */
export const describeLatestChange = (
  points: readonly TrendPoint[],
  subject: string,
): LatestChange | null => {
  // 「직전 분기」라고 말하므로 배열의 마지막 두 시점만 본다. 사이에 빈 분기가 끼면 그 앞
  // 값과 비교한 수치를 직전 분기 대비라고 부르게 되니 문장을 만들지 않는다.
  if (points.length < 2) return null
  const previous = points[points.length - 2].value
  const latest = points[points.length - 1].value
  if (typeof previous !== 'number' || typeof latest !== 'number') return null
  const delta = latest - previous
  if (delta === 0) {
    return { direction: 'STAGNANT', sentence: `${subject} 직전 분기와 같아요` }
  }
  const direction: TrendDirection = delta > 0 ? 'INCREASE' : 'DECREASE'
  const verb = delta > 0 ? '늘었어요' : '줄었어요'
  if (previous === 0) {
    return { direction, sentence: `${subject} 직전 분기보다 ${verb}` }
  }
  const rate = (delta / Math.abs(previous)) * 100
  // 반올림하면 0% 가 되는 변화에 ▲ 와 「0% 늘었어요」를 함께 적으면 모순으로 읽힌다.
  if (formatPercent(rate) === '0%') {
    return {
      direction: 'STAGNANT',
      sentence: `${subject} 직전 분기와 거의 같아요`,
    }
  }
  return {
    direction,
    sentence: `${subject} 직전 분기보다 ${formatPercent(rate)} ${verb}`,
  }
}

/**
 * 요약 인사이트 「경쟁」 줄 — 「같은 업종 점포가 20개 있어요. 이 분기에 1개가 문을 열고 1개가
 * 문을 닫았어요」.
 *
 * 점포 수는 `similarStoreCount`(원천 `SIMILR_INDUTY_STOR_CO`) — 프랜차이즈를 포함한 이 업종 전체다.
 * 이름과 달리 다른 업종이 섞인 수가 아니라 일반(`STOR_CO`) + 프랜차이즈(`FRC_STOR_CO`)다(dev 실측
 * 79곳 모두 성립). 개·폐업 건수도 이 수가 분모라(20개 중 1개 = 개업률 5%) 두 문장의 주어를 맞춘다.
 * 「유사 업종」이라는 원천 이름은 다른 업종으로 읽혀 화면에는 「같은 업종」이라고 쓴다.
 * 점포 수가 없으면 경쟁을 말할 수 없어 null 이다. 개·폐업 건수가 하나라도 비면 둘째 문장만 뺀다 — 한쪽만 적으면 순증을 거꾸로 읽을 수 있다.
 */
export const describeStoreCompetition = (
  similarStoreCount: number | null | undefined,
  openedStoreCount: number | null | undefined,
  closedStoreCount: number | null | undefined,
): string | null => {
  if (typeof similarStoreCount !== 'number' || similarStoreCount < 0)
    return null
  const count = new Intl.NumberFormat('ko-KR').format(similarStoreCount)
  if (similarStoreCount === 0) return '이 상권에는 같은 업종 점포가 없어요'
  const head = `같은 업종 점포가 ${count}개 있어요`
  if (
    typeof openedStoreCount !== 'number' ||
    typeof closedStoreCount !== 'number'
  )
    return head
  if (openedStoreCount === 0 && closedStoreCount === 0)
    return `${head}. 이 분기에 문을 연 점포도 닫은 점포도 없어요`
  return `${head}. 이 분기에 ${openedStoreCount}개가 문을 열고 ${closedStoreCount}개가 문을 닫았어요`
}
