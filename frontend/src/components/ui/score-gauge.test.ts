import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ScoreGauge, { type ScoreGaugeProps } from './score-gauge'

const render = (props: ScoreGaugeProps): string =>
  renderToStaticMarkup(createElement(ScoreGauge, props))

describe('ScoreGauge', () => {
  // T-D5 — 산정 실패를 0점짜리 빈 도넛으로 그리면 「점수가 0」이라고 거짓말한다.
  it('draws nothing without a score', () => {
    expect(
      render({ score: null, polarity: 'higher-is-better', label: '총점' }),
    ).toBe('')
    expect(
      render({
        score: Number.NaN,
        polarity: 'higher-is-better',
        label: '총점',
      }),
    ).toBe('')
  })

  // T-D6 — 게이지는 그림이라 스크린리더에 아무것도 남지 않는다.
  it('names the metric, the score and the grade for screen readers', () => {
    expect(
      render({ score: 84, polarity: 'higher-is-better', label: '기회도' }),
    ).toContain('aria-label="기회도 84점, 좋음"')
  })

  // T-D1 과 짝 — 위험도 100 은 가득 찬 호에 나쁨 색이다.
  it('fills the arc by the raw score but colors it by direction', () => {
    const risky = render({
      score: 100,
      polarity: 'lower-is-better',
      label: '위험도',
    })

    expect(risky).toContain('data-score-quality="poor"')
    expect(risky).toContain('var(--score-low)')
    expect(risky).toContain('aria-label="위험도 100점, 나쁨"')
    // 호는 뒤집지 않는다 — 뒤집으면 가운데 숫자 100 과 그림이 어긋난다.
    const circumference = 2 * Math.PI * 14
    expect(risky).toContain(
      `stroke-dasharray="${circumference} ${circumference}`,
    )
  })

  it('colors a low risk score as good', () => {
    const safe = render({
      score: 0,
      polarity: 'lower-is-better',
      label: '위험도',
    })

    expect(safe).toContain('data-score-quality="good"')
    expect(safe).toContain('var(--score-high)')
    expect(safe).toContain('stroke-dasharray="0 ')
  })

  // T-D4 — 모르는 지표는 색으로 판단하지 않고 등급도 말하지 않는다.
  it('stays neutral and silent about the grade without a direction', () => {
    const unknown = render({ score: 100, polarity: null, label: '새 지표' })

    expect(unknown).toContain('data-score-quality="neutral"')
    expect(unknown).toContain('var(--score-neutral)')
    expect(unknown).toContain('aria-label="새 지표 100점"')
  })

  it('always prints the number, not just the color', () => {
    const markup = render({
      score: 77.8,
      polarity: 'higher-is-better',
      label: '총점',
      size: 'lg',
    })

    expect(markup).toContain('>78<')
  })
})
