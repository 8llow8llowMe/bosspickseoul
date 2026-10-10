import { describe, expect, it } from 'vitest'

import {
  ANALYSIS_METRIC_POLARITY,
  ANALYSIS_TREND_POLARITY,
  CHANGE_TONE_AREA_COLOR,
  CHANGE_TONE_TEXT_COLOR,
  COMPOSITE_SCORE_POLARITY,
  describeChangeTone,
  describeMetricPolarity,
  getScoreQualityColor,
  getScoreQualityLabel,
  resolveMetricPolarity,
  resolveChangeTone,
  resolveDirectionChangeTone,
  resolveScoreQuality,
  STATUS_METRIC_POLARITY,
} from './metric-polarity'

describe('resolveMetricPolarity', () => {
  it('knows which metrics are better when low', () => {
    expect(resolveMetricPolarity('RISK_SCORE')).toBe('lower-is-better')
    expect(resolveMetricPolarity('CONGESTION_SCORE')).toBe('lower-is-better')
    expect(resolveMetricPolarity('OPPORTUNITY_SCORE')).toBe('higher-is-better')
    expect(resolveMetricPolarity('RESIDENT_POPULATION_SCORE')).toBe(
      'higher-is-better',
    )
  })

  // T-D4 — 백엔드가 지표를 추가했을 때 아무 방향이나 가정하면 화면이 조용히 반대로 말한다.
  it('refuses to guess an unknown metric', () => {
    expect(resolveMetricPolarity('SOMETHING_NEW_SCORE')).toBeNull()
    expect(resolveMetricPolarity(undefined)).toBeNull()
    expect(resolveMetricPolarity(42)).toBeNull()
  })
})

describe('resolveScoreQuality', () => {
  const forMetric = (score: number, code: string) =>
    resolveScoreQuality(score, resolveMetricPolarity(code))

  // T-D1 — 위험도 100 은 「매우 위험」이다. 점수가 높다고 좋음이 아니다.
  it('calls a high risk score bad', () => {
    expect(forMetric(100, 'RISK_SCORE')).toBe('poor')
    expect(forMetric(100, 'CONGESTION_SCORE')).toBe('poor')
  })

  // T-D2
  it('calls a low risk score good', () => {
    expect(forMetric(0, 'RISK_SCORE')).toBe('good')
  })

  // T-D3
  it('calls a high opportunity score good', () => {
    expect(forMetric(100, 'OPPORTUNITY_SCORE')).toBe('good')
    expect(forMetric(0, 'OPPORTUNITY_SCORE')).toBe('poor')
  })

  it('uses the DESIGN.md thresholds on both sides', () => {
    expect(forMetric(70, 'OPPORTUNITY_SCORE')).toBe('good')
    expect(forMetric(69, 'OPPORTUNITY_SCORE')).toBe('fair')
    expect(forMetric(40, 'OPPORTUNITY_SCORE')).toBe('fair')
    expect(forMetric(39, 'OPPORTUNITY_SCORE')).toBe('poor')
    // 뒤집힌 쪽도 같은 경계를 쓴다: 위험도 30 → goodness 70.
    expect(forMetric(30, 'RISK_SCORE')).toBe('good')
    expect(forMetric(31, 'RISK_SCORE')).toBe('fair')
  })

  // T-D4
  it('stays neutral without a direction or a score', () => {
    expect(forMetric(100, 'SOMETHING_NEW_SCORE')).toBe('neutral')
    expect(resolveScoreQuality(null, 'higher-is-better')).toBe('neutral')
    expect(resolveScoreQuality(Number.NaN, 'higher-is-better')).toBe('neutral')
  })

  it('treats the composite score as higher-is-better', () => {
    expect(resolveScoreQuality(84, COMPOSITE_SCORE_POLARITY)).toBe('good')
  })

  it('clamps scores outside 0~100', () => {
    expect(resolveScoreQuality(140, 'higher-is-better')).toBe('good')
    expect(resolveScoreQuality(-20, 'lower-is-better')).toBe('good')
  })
})

describe('score quality presentation', () => {
  it('maps every quality to a defined token', () => {
    expect(getScoreQualityColor('good')).toBe('var(--score-high)')
    expect(getScoreQualityColor('fair')).toBe('var(--score-mid)')
    expect(getScoreQualityColor('poor')).toBe('var(--score-low)')
    expect(getScoreQualityColor('neutral')).toBe('var(--score-neutral)')
  })

  // 판단하지 않은 것을 「보통」이라고 말하면 그것도 거짓이다.
  it('leaves the neutral grade unspoken', () => {
    expect(getScoreQualityLabel('good')).toBe('좋음')
    expect(getScoreQualityLabel('fair')).toBe('보통')
    // 「나쁨」은 상권을 단정한다 — 살펴볼 이유라는 뜻으로 「주의」라고 말한다(#569).
    expect(getScoreQualityLabel('poor')).toBe('주의')
    expect(getScoreQualityLabel('neutral')).toBe('')
  })
})

describe('describeMetricPolarity', () => {
  // #569 — 숫자와 색만 있으면 「위험도 82」를 좋은 점수로 읽는다.
  it('puts the direction into words for all four known metrics', () => {
    expect(
      ['OPPORTUNITY_SCORE', 'RESIDENT_POPULATION_SCORE'].map(code =>
        describeMetricPolarity(resolveMetricPolarity(code)),
      ),
    ).toEqual(['높을수록 좋아요', '높을수록 좋아요'])
    expect(
      ['RISK_SCORE', 'CONGESTION_SCORE'].map(code =>
        describeMetricPolarity(resolveMetricPolarity(code)),
      ),
    ).toEqual(['낮을수록 좋아요', '낮을수록 좋아요'])
  })

  it('says nothing when the direction is unknown', () => {
    expect(describeMetricPolarity(null)).toBe('')
  })
})

describe('neutral polarity', () => {
  // 높고 낮음에 좋고 나쁨이 없는 지표는 등급도 방향 문구도 내지 않는다.
  it('grades nothing and says nothing', () => {
    expect(resolveScoreQuality(90, 'neutral')).toBe('neutral')
    expect(describeMetricPolarity('neutral')).toBe('')
  })
})

describe('STATUS_METRIC_POLARITY', () => {
  // D-1 — 구별현황 네 지표 중 폐업만 낮을수록 좋다.
  it('treats only closures as lower-is-better', () => {
    expect(STATUS_METRIC_POLARITY).toEqual({
      footTraffic: 'higher-is-better',
      sales: 'higher-is-better',
      opened: 'higher-is-better',
      closed: 'lower-is-better',
    })
  })
})

describe('resolveChangeTone', () => {
  // D-1 — 색은 오름·내림이 아니라 좋고 나쁨을 따른다.
  it.each([
    [2.5, 'higher-is-better', 'positive'],
    [-4.3, 'higher-is-better', 'negative'],
    [26.1, 'lower-is-better', 'negative'],
    [-3, 'lower-is-better', 'positive'],
  ] as const)('%s on %s → %s', (rate, polarity, tone) => {
    expect(resolveChangeTone(rate, polarity)).toBe(tone)
  })

  it('stays neutral without a change, a value or a direction', () => {
    expect(resolveChangeTone(0, 'higher-is-better')).toBe('neutral')
    expect(resolveChangeTone(null, 'higher-is-better')).toBe('neutral')
    expect(resolveChangeTone(Number.NaN, 'lower-is-better')).toBe('neutral')
    expect(resolveChangeTone(5, 'neutral')).toBe('neutral')
    expect(resolveChangeTone(5, null)).toBe('neutral')
  })

  it('maps tones to the existing semantic tokens only', () => {
    expect(CHANGE_TONE_TEXT_COLOR).toEqual({
      positive: 'var(--color-positive-text)',
      negative: 'var(--color-negative-text)',
      neutral: 'var(--color-text-600)',
    })
    expect(CHANGE_TONE_AREA_COLOR).toEqual({
      positive: 'var(--color-positive)',
      negative: 'var(--color-negative)',
      neutral: 'var(--color-border-300)',
    })
  })

  // WCAG 1.4.1 — 색을 칠한 증감 옆에는 늘 글자가 있다. 판단하지 않은 것은 말하지 않는다.
  it('puts good and bad into words', () => {
    expect(describeChangeTone('positive')).toBe('개선')
    expect(describeChangeTone('negative')).toBe('악화')
    expect(describeChangeTone('neutral')).toBe('')
  })
})

describe('상권분석 지표 극성', () => {
  it('매출·유동인구는 높을수록, 폐업은 낮을수록 좋고 점포 수·개업은 판단하지 않는다', () => {
    expect(ANALYSIS_METRIC_POLARITY).toEqual({
      sales: 'higher-is-better',
      footTraffic: 'higher-is-better',
      storeCount: 'neutral',
      opened: 'neutral',
      closed: 'lower-is-better',
    })
  })

  it('분기별 변화 세 지표는 위 표를 따른다', () => {
    expect(ANALYSIS_TREND_POLARITY).toEqual({
      SALES: 'higher-is-better',
      FOOT_TRAFFIC: 'higher-is-better',
      STORE: 'neutral',
    })
  })
})

describe('resolveDirectionChangeTone', () => {
  it.each([
    ['INCREASE', 'higher-is-better', 'positive'],
    ['DECREASE', 'higher-is-better', 'negative'],
    ['INCREASE', 'lower-is-better', 'negative'],
    ['DECREASE', 'lower-is-better', 'positive'],
  ] as const)('%s on %s → %s', (direction, polarity, tone) => {
    expect(resolveDirectionChangeTone(direction, polarity)).toBe(tone)
  })

  it('보합·방향 없음·중립 지표는 무채색이다', () => {
    expect(resolveDirectionChangeTone('STAGNANT', 'higher-is-better')).toBe(
      'neutral',
    )
    expect(resolveDirectionChangeTone(null, 'higher-is-better')).toBe('neutral')
    expect(resolveDirectionChangeTone('INCREASE', 'neutral')).toBe('neutral')
  })
})
