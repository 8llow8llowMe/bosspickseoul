import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import GoogleAnalytics, {
  buildGaInitScript,
  isValidMeasurementId,
} from './google-analytics'

describe('isValidMeasurementId', () => {
  it('GA4 측정 ID 형식만 받는다', () => {
    expect(isValidMeasurementId('G-AB12CD34EF')).toBe(true)
  })

  // 값이 인라인 스크립트에 들어가므로, 다른 키를 붙여 넣은 실수는 태그를 싣지 않는다.
  it('빈 값·UA 속성·다른 문자열은 거른다', () => {
    expect(isValidMeasurementId('')).toBe(false)
    expect(isValidMeasurementId('UA-12345-1')).toBe(false)
    expect(isValidMeasurementId('G-abc')).toBe(false)
    expect(isValidMeasurementId("G-1');alert(1);//")).toBe(false)
  })
})

describe('GoogleAnalytics', () => {
  it('측정 ID 가 없으면 아무것도 렌더하지 않는다', () => {
    expect(
      renderToStaticMarkup(
        createElement(GoogleAnalytics, { measurementId: '' }),
      ),
    ).toBe('')
  })

  it('형식이 틀린 측정 ID 도 렌더하지 않는다', () => {
    expect(
      renderToStaticMarkup(
        createElement(GoogleAnalytics, { measurementId: 'UA-12345-1' }),
      ),
    ).toBe('')
  })
})

// 처리방침 제9조(광고 목적 미사용·Google 신호 미사용)를 관리 화면 설정이 아니라 태그가 지킨다.
describe('buildGaInitScript', () => {
  it('Google 신호와 광고 개인화 신호를 끈 채 config 한다', () => {
    const script = buildGaInitScript('G-AB12CD34EF')

    expect(script).toContain(
      `gtag('config', "G-AB12CD34EF", { allow_google_signals: false, allow_ad_personalization_signals: false })`,
    )
  })
})
