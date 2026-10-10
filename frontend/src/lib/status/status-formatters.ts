import {
  CHANGE_TONE_TEXT_COLOR,
  describeChangeTone,
  resolveChangeTone,
  STATUS_METRIC_POLARITY,
  type ChangeTone,
} from '@/lib/metrics/metric-polarity'
import type { StatusMetric, StatusRankedItem } from '@/types/status'

const koreanNumberFormatter = new Intl.NumberFormat('ko-KR')
const koreanChangeFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 1,
})

export const STATUS_METRIC_LABELS: Record<StatusMetric, string> = {
  footTraffic: '유동인구',
  sales: '매출',
  opened: '개업',
  closed: '폐업',
}

const EMPTY_STATUS_VALUE = '데이터 없음'
const TEN_THOUSAND = 10_000

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isValidTotal = (value: number | null | undefined): value is number =>
  isFiniteNumber(value) && value >= 0 && Number.isInteger(value)

const EOK = TEN_THOUSAND * TEN_THOUSAND

/**
 * 큰 수를 **가장 큰 두 자리 단위 + 쉼표**로 표기한다. 둘째 단위에서 반올림한다.
 * 예) 145,283,456 → "1억 4,528만명", 3,134,652,050,000 → "3조 1,347억원"
 *
 * 예전에는 억 아래를 모두 만으로 적어 "31346억 5205만원"처럼 다섯 자리 억이 나왔다.
 * 자릿수를 세어야 크기가 들어와 조 단위를 올리고, 셋째 단위(만)는 버린다 — 순위
 * 목록에서 비교하는 건 앞 두 자리다. 시뮬레이션의 `formatLargeWon` 과 같은 쉼표 규칙이다.
 * 1만 미만은 반올림 없이 그대로 표기한다(작은 개수 등).
 */
export const formatSinoUnit = (
  value: number | null | undefined,
  suffix: string,
): string => {
  if (!isFiniteNumber(value) || value < 0) {
    return EMPTY_STATUS_VALUE
  }

  if (value < TEN_THOUSAND) {
    return `${koreanNumberFormatter.format(Math.round(value))}${suffix}`
  }

  // 반올림한 값으로 자리를 정한다. 9999만 5천은 "10,000만"이 아니라 "1억"이다.
  const totalMan = Math.round(value / TEN_THOUSAND)

  if (totalMan < TEN_THOUSAND) {
    return `${koreanNumberFormatter.format(totalMan)}만${suffix}`
  }

  const totalEok = Math.round(value / EOK)
  const [major, minor, majorLabel, minorLabel] =
    totalEok < TEN_THOUSAND
      ? [
          Math.floor(totalMan / TEN_THOUSAND),
          totalMan % TEN_THOUSAND,
          '억',
          '만',
        ]
      : [
          Math.floor(totalEok / TEN_THOUSAND),
          totalEok % TEN_THOUSAND,
          '조',
          '억',
        ]
  const majorText = `${koreanNumberFormatter.format(major)}${majorLabel}`

  return minor > 0
    ? `${majorText} ${koreanNumberFormatter.format(minor)}${minorLabel}${suffix}`
    : `${majorText}${suffix}`
}

/**
 * 개월 수를 "N년 M개월" 형태로 표기한다(만 12개월 기준). 반올림해서 정수 개월로
 * 환산한다. 예) 102 → "8년 6개월", 96 → "8년", 5 → "5개월", 0 → "0개월".
 */
export const formatMonths = (value: number | null | undefined): string => {
  if (!isFiniteNumber(value) || value < 0) {
    return EMPTY_STATUS_VALUE
  }

  const totalMonths = Math.round(value)
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12

  if (years > 0 && months > 0) {
    return `${years}년 ${months}개월`
  }
  if (years > 0) {
    return `${years}년`
  }
  return `${months}개월`
}

export const formatStatusValue = (
  metric: StatusMetric,
  value: number | null | undefined,
): string => {
  if (!isValidTotal(value)) {
    return EMPTY_STATUS_VALUE
  }

  if (metric === 'footTraffic') {
    return formatSinoUnit(value, '명')
  }

  if (metric === 'sales') {
    return formatSinoUnit(value, '원')
  }

  return `${koreanNumberFormatter.format(value)}개`
}

export const formatStatusChange = (
  value: number | null | undefined,
): string => {
  if (!isFiniteNumber(value)) {
    return EMPTY_STATUS_VALUE
  }

  const formattedValue = koreanChangeFormatter.format(value)

  if (value > 0) {
    return `+${formattedValue}%`
  }

  return `${formattedValue}%`
}

/**
 * 지도 툴팁·폴리곤 접근성 이름에 쓰는 한 줄. 예) "매출 14위 · 1조 2,100억원 · -2.1%"
 *
 * - 순위는 응답의 `rank` 그대로다. 동점이면 두 구가 같은 순위로 적힌다.
 * - 변화율이 null 이면 「변화율 데이터 없음」이다. 0%(변동 없음)로 적지 않는다.
 * - 그 지표 순위에 구가 없으면(그 분기 행이 없음) 「{지표} 데이터 없음」이다.
 */
export const formatStatusRankSummary = (
  metric: StatusMetric,
  item: StatusRankedItem | null | undefined,
): string => {
  const metricLabel = STATUS_METRIC_LABELS[metric]

  if (!item) return `${metricLabel} ${EMPTY_STATUS_VALUE}`

  const change = isFiniteNumber(item.changeRate)
    ? formatStatusChange(item.changeRate)
    : `변화율 ${EMPTY_STATUS_VALUE}`

  return `${metricLabel} ${item.rank}위 · ${formatStatusValue(metric, item.value)} · ${change}`
}

export type ChangeBadge = {
  changeLabel: string
  changeDirection: 'up' | 'down'
}

/**
 * 변화율 배지 필드. `changeRate` 가 유한수가 아니면(null·NaN) **빈 객체**를 낸다.
 *
 * `formatStatusChange(NaN)` 은 "데이터 없음"을 반환하고 `NaN >= 0` 은 false 라
 * `changeDirection: 'down'` 이 된다 — 그대로 쓰면 없는 하락을 있다고 말하는
 * 빨간 배지가 찍힌다. 배지를 붙이는 쪽(`RankBarList`)은 `changeLabel` 이 없으면
 * 아예 그리지 않으므로, 여기서 필드 자체를 비우는 것으로 막는다.
 */
export const toChangeBadge = (
  changeRate: number | null,
): ChangeBadge | Record<string, never> => {
  if (!isFiniteNumber(changeRate)) return {}

  return {
    changeLabel: formatStatusChange(changeRate),
    changeDirection: changeRate >= 0 ? 'up' : 'down',
  }
}

/**
 * 증감이 **좋은 쪽인지 나쁜 쪽인지**. 색은 방향이 아니라 이 판단을 따른다(DESIGN.md §Charts, 결정 D-1).
 *
 * 극성은 `lib/metrics/metric-polarity.ts` 의 `STATUS_METRIC_POLARITY` 가 정본이다 — 폐업만 낮을수록
 * 좋다. 초록=좋아짐, 빨강=나빠짐, 회색=변동 없음·데이터 없음. 목록·상세 머리·홈 툴팁이 이 함수를 쓴다.
 */
export type StatusChangeTone = ChangeTone

export const getStatusChangeTone = (
  metric: StatusMetric,
  changeRate: number | null | undefined,
): StatusChangeTone =>
  resolveChangeTone(changeRate, STATUS_METRIC_POLARITY[metric])

/** 증감 **글자** 색. 글자는 AA 4.5:1 을 넘어야 해서 -text 토큰이다(green700·red700). */
export const STATUS_CHANGE_TONE_COLOR: Readonly<
  Record<StatusChangeTone, string>
> = CHANGE_TONE_TEXT_COLOR

/**
 * 변화율의 비교 기준. 순위 호출에 `previousPeriodCode` 를 보내지 않으면 백엔드가 **직전 분기**를
 * 기준으로 쓴다(status.md 「백엔드 계약」). 화면에 기준이 없으면 「+2.5%」가 무엇과 비교한 값인지
 * 알 수 없다(#560).
 */
export const STATUS_CHANGE_BASIS = '직전 분기 대비'

export type StatusChangePresentation = {
  tone: StatusChangeTone
  /** 화면용 기호. 스크린리더에는 숨기고 `directionLabel` 로 읽힌다. 값이 없으면 null(기호 없음). */
  arrow: '▲' | '▼' | '–' | null
  /** 「증가」·「감소」·「변동 없음」. 값이 없으면 빈 문자열이다. */
  directionLabel: string
  /**
   * 「+2.5%」. 값이 없으면 「변화율 데이터 없음」 — 「– 데이터 없음」은 무엇이 없는지 말하지 않는다.
   * 지도 툴팁(`formatStatusRankSummary`)과 같은 말이다.
   */
  rateText: string
  /** 「개선」·「악화」. 변동 없음·데이터 없음이면 빈 문자열이다. */
  qualityLabel: string
}

/**
 * 증감 한 칸을 그릴 재료. **부호·화살표와 「개선/악화」 글자를 색과 늘 같이 둔다** — 색만으로
 * 좋고 나쁨을 전하지 않는다(WCAG 1.4.1). 목록 행과 상세 머리 칩이 같이 쓴다.
 */
export const presentStatusChange = (
  metric: StatusMetric,
  changeRate: number | null | undefined,
): StatusChangePresentation => {
  const tone = getStatusChangeTone(metric, changeRate)
  const rateText = formatStatusChange(changeRate)

  if (!isFiniteNumber(changeRate)) {
    return {
      tone,
      arrow: null,
      directionLabel: '',
      rateText: `변화율 ${EMPTY_STATUS_VALUE}`,
      qualityLabel: '',
    }
  }

  if (changeRate === 0) {
    return {
      tone,
      arrow: '–',
      directionLabel: '변동 없음',
      rateText,
      qualityLabel: '',
    }
  }

  return {
    tone,
    arrow: changeRate > 0 ? '▲' : '▼',
    directionLabel: changeRate > 0 ? '증가' : '감소',
    rateText,
    qualityLabel: describeChangeTone(tone),
  }
}
