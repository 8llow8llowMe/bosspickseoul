import type { AnalysisMetricRow } from '@/lib/analysis/presentation'

/**
 * 백엔드 시간대 구간의 길이(시간). 라벨은 `commercial-chart-selectors` 의 시간대 정의와 같다.
 *
 * 원천 시간대 값은 **구간 합계**다. dev 실측 73곳 모두 시간대 6개의 합이 요일 7개의 합 ·
 * 연령 합(= 총 유동인구)과 같았다(매출 · 결제 건수도 같다). 그래서 길이가 6시간인 00~06시가
 * 길이만으로 커 보인다 — 합계로는 73곳 중 45곳이 「00~06시가 가장 많다」였고, 시간당으로
 * 나누면 42곳에서 가장 붐비는 시간이 바뀌었다. 홈 지도 툴팁(`district-rhythm`)도 같은 이유로
 * 시간당으로 나눈다.
 */
export const TIME_SLOT_HOURS: Readonly<Record<string, number>> = {
  '00~06시': 6,
  '06~11시': 5,
  '11~14시': 3,
  '14~17시': 3,
  '17~21시': 4,
  '21~24시': 3,
}

/**
 * 시간대 구간 합계를 시간당 평균으로 바꾼다(구간 합 ÷ 시간 수, 반올림). 값이 없으면 null 그대로다.
 * 길이를 모르는 라벨은 바꾸지 않는다 — 그런 라벨이 생기면 정의를 함께 고쳐야 한다.
 */
export const toPerHourRows = (
  rows: readonly AnalysisMetricRow[],
): AnalysisMetricRow[] =>
  rows.map(row => {
    const hours = TIME_SLOT_HOURS[row.label]
    return typeof row.value === 'number' && hours
      ? { ...row, value: Math.round(row.value / hours) }
      : { ...row }
  })
