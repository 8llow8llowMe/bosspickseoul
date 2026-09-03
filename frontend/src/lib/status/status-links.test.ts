import { describe, expect, it } from 'vitest'
import {
  createDistrictAdministrationHref,
  createDistrictServiceHref,
  formatChangeSuffix,
  formatRateSuffix,
} from '@/lib/status/status-links'

describe('createDistrictAdministrationHref', () => {
  it('자치구·행정동을 채운 상권분석 링크를 만든다', () => {
    expect(createDistrictAdministrationHref('11680', '11680580')).toBe(
      '/analysis?districtCode=11680&administrationCode=11680580',
    )
  })

  /* 누를 데가 없는 링크를 만들지 않는다 — 명세 D5 「링크 생성 규칙」 */
  it('코드가 하나라도 없으면 링크를 만들지 않는다', () => {
    expect(createDistrictAdministrationHref('11680', null)).toBeUndefined()
    expect(createDistrictAdministrationHref(null, '11680580')).toBeUndefined()
    expect(createDistrictAdministrationHref('11680', '   ')).toBeUndefined()
    expect(createDistrictAdministrationHref('', '11680580')).toBeUndefined()
  })

  /*
   * `/status?district=` 로 보내면 안 된다. `normalizeStatusSelection` 이 지표별
   * top-10 밖 코드를 버리고 행정동은 화면 자체가 없다.
   */
  it('목적지는 /analysis 다 — /status 로 보내지 않는다', () => {
    const href = createDistrictAdministrationHref('11680', '11680580')
    expect(href?.startsWith('/analysis')).toBe(true)
    expect(href).not.toContain('/status')
  })
})

describe('createDistrictServiceHref', () => {
  it('자치구·업종을 채운 상권분석 링크를 만든다', () => {
    expect(createDistrictServiceHref('11680', 'CS100001')).toBe(
      '/analysis?districtCode=11680&serviceCode=CS100001',
    )
  })

  it('코드가 하나라도 없으면 링크를 만들지 않는다', () => {
    expect(createDistrictServiceHref('11680', null)).toBeUndefined()
    expect(createDistrictServiceHref(null, 'CS100001')).toBeUndefined()
  })
})

describe('formatRateSuffix', () => {
  it('비율에 라벨을 붙여 적는다 — 부호는 붙이지 않는다', () => {
    expect(formatRateSuffix('개업률', 8.5)).toBe('개업률 8.5%')
    expect(formatRateSuffix('폐업률', 4.3)).toBe('폐업률 4.3%')
  })

  it('소수 둘째 자리에서 반올림한다', () => {
    expect(formatRateSuffix('개업률', 8.46)).toBe('개업률 8.5%')
  })

  /*
   * 명세 D2-2. 집계가 없는 것과 0인 것은 다른 말이다 — `0%` 로 채우면
   * 「개업이 전혀 없었다」는 틀린 정보를 준다.
   */
  it('값이 없으면 undefined — 0% 로 채우지 않는다', () => {
    expect(formatRateSuffix('개업률', null)).toBeUndefined()
    expect(formatRateSuffix('개업률', undefined)).toBeUndefined()
    expect(formatRateSuffix('개업률', Number.NaN)).toBeUndefined()
    expect(formatRateSuffix('개업률', Number.POSITIVE_INFINITY)).toBeUndefined()
  })

  it('실제 0 은 0% 로 적는다 — 없는 것과 구별한다', () => {
    expect(formatRateSuffix('개업률', 0)).toBe('개업률 0%')
  })
})

describe('formatChangeSuffix', () => {
  it('증감률은 부호를 붙인다', () => {
    expect(formatChangeSuffix(7.2)).toBe('+7.2%')
    expect(formatChangeSuffix(-5.6)).toBe('-5.6%')
  })

  it('0 은 부호 없이 적는다', () => {
    expect(formatChangeSuffix(0)).toBe('0%')
  })

  it('값이 없으면 undefined', () => {
    expect(formatChangeSuffix(null)).toBeUndefined()
    expect(formatChangeSuffix(Number.NaN)).toBeUndefined()
  })
})
