import { describe, expect, it } from 'vitest'

import {
  COMPOSITE_SCORE_POLARITY,
  getScoreQualityColor,
  getScoreQualityLabel,
  resolveMetricPolarity,
  resolveScoreQuality,
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
    expect(getScoreQualityLabel('poor')).toBe('나쁨')
    expect(getScoreQualityLabel('neutral')).toBe('')
  })
})
