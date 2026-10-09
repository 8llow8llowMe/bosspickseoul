import { describe, expect, it } from 'vitest'

import {
  buildStatusDetailPath,
  buildStatusRankingsPath,
  buildStatusTopTenPath,
} from '@/lib/api/status'

/*
 * 고른 분기는 명시하고, 「최신」은 생략한다 — BE #464 이후 서버가 적재 기준 최신 분기로 해석하고 응답
 * `currentPeriodCode` 로 알려 준다(period-catalog.md D3-3). previousPeriodCode 는 생략해 백엔드가
 * 직전 분기를 쓰게 둔다.
 */
describe('구별현황 요청 경로', () => {
  it('Top10 은 분기를 주지 않으면(최신) 생략해 서버가 해석하게 한다', () => {
    expect(buildStatusTopTenPath()).toBe('/districts/top-ten')
  })

  it('Top10 은 고른 분기를 그대로 싣는다', () => {
    expect(buildStatusTopTenPath('20233')).toBe(
      '/districts/top-ten?currentPeriodCode=20233',
    )
  })

  it('전체 순위는 Top10 과 같은 분기 규칙으로 부른다', () => {
    expect(buildStatusRankingsPath()).toBe('/districts/rankings')
    expect(buildStatusRankingsPath('20233')).toBe(
      '/districts/rankings?currentPeriodCode=20233',
    )
    expect(buildStatusRankingsPath('20233')).not.toContain('previousPeriodCode')
  })

  it('상세는 구 코드와 분기를 함께 싣는다', () => {
    expect(buildStatusDetailPath('11680', '20241')).toBe(
      '/districts/11680?currentPeriodCode=20241',
    )
    expect(buildStatusDetailPath('11680')).toBe('/districts/11680')
  })

  it('비교 분기(previousPeriodCode)는 보내지 않는다', () => {
    expect(buildStatusTopTenPath('20233')).not.toContain('previousPeriodCode')
    expect(buildStatusDetailPath('11680', '20233')).not.toContain(
      'previousPeriodCode',
    )
  })
})
