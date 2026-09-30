import { describe, expect, it } from 'vitest'

import { ANALYSIS_PERIOD_CODE } from '@/lib/analysis/selection'
import { buildStatusDetailPath, buildStatusTopTenPath } from '@/lib/api/status'

/*
 * 두 호출이 분기를 싣지 않던 동안 백엔드 기본값(20233)으로 화면이 묶여 있었다(#409).
 * 기본값에 기대지 않고 **늘 명시해서** 보낸다. previousPeriodCode 는 생략해 백엔드가
 * 직전 분기를 쓰게 둔다.
 */
describe('구별현황 요청 경로', () => {
  it('Top10 은 기본으로 최신 분기를 currentPeriodCode 로 싣는다', () => {
    expect(buildStatusTopTenPath()).toBe(
      `/districts/top-ten?currentPeriodCode=${ANALYSIS_PERIOD_CODE}`,
    )
  })

  it('Top10 은 고른 분기를 그대로 싣는다', () => {
    expect(buildStatusTopTenPath('20233')).toBe(
      '/districts/top-ten?currentPeriodCode=20233',
    )
  })

  it('상세는 구 코드와 분기를 함께 싣는다', () => {
    expect(buildStatusDetailPath('11680', '20241')).toBe(
      '/districts/11680?currentPeriodCode=20241',
    )
    expect(buildStatusDetailPath('11680')).toBe(
      `/districts/11680?currentPeriodCode=${ANALYSIS_PERIOD_CODE}`,
    )
  })

  it('비교 분기(previousPeriodCode)는 보내지 않는다', () => {
    expect(buildStatusTopTenPath('20233')).not.toContain('previousPeriodCode')
    expect(buildStatusDetailPath('11680', '20233')).not.toContain(
      'previousPeriodCode',
    )
  })
})
