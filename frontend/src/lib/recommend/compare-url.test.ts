import { describe, expect, it } from 'vitest'

import {
  createCompareHref,
  EMPTY_COMPARE_URL_STATE,
  isCompleteCompareState,
  parseCompareUrlState,
} from './compare-url'

const parse = (query: string) =>
  parseCompareUrlState(new URLSearchParams(query))

const BASE =
  'districtCode=11680&administrationCode=11680640&serviceCode=CS100010'

describe('compare-url', () => {
  it('조건과 상권 코드를 읽는다', () => {
    const state = parse(`${BASE}&commercialCodes=3120197,3120192,3110958`)

    expect(state).toEqual({
      districtCode: '11680',
      administrationCode: '11680640',
      serviceCode: 'CS100010',
      commercialCodes: ['3120197', '3120192', '3110958'],
      truncated: false,
    })
    expect(isCompleteCompareState(state)).toBe(true)
  })

  it('생성과 파싱이 왕복한다', () => {
    const href = createCompareHref({
      districtCode: '11680',
      administrationCode: '11680640',
      serviceCode: 'CS100010',
      commercialCodes: ['3120197', '3120192'],
    })

    expect(href).toBe(
      '/recommend/compare?districtCode=11680&administrationCode=11680640&serviceCode=CS100010&commercialCodes=3120197%2C3120192',
    )
    expect(parse(href.split('?')[1] ?? '')).toEqual({
      districtCode: '11680',
      administrationCode: '11680640',
      serviceCode: 'CS100010',
      commercialCodes: ['3120197', '3120192'],
      truncated: false,
    })
  })

  it('4개를 넘기면 앞 4개만 남기고 잘랐다고 알린다', () => {
    const state = parse(`${BASE}&commercialCodes=1,2,3,4,5,6`)

    expect(state.commercialCodes).toEqual(['1', '2', '3', '4'])
    expect(state.truncated).toBe(true)
  })

  it('중복은 첫 등장만 남기되 URL 순서를 지킨다', () => {
    // 정렬하지 않는다. 열 순서는 사용자가 고른 순서여야 한다.
    const state = parse(`${BASE}&commercialCodes=9,3,9,1`)

    expect(state.commercialCodes).toEqual(['9', '3', '1'])
  })

  it('2개 미만이면 완성된 상태가 아니다', () => {
    expect(
      isCompleteCompareState(parse(`${BASE}&commercialCodes=3120197`)),
    ).toBe(false)
    expect(isCompleteCompareState(parse(BASE))).toBe(false)
  })

  it('조건이 하나라도 없으면 완성된 상태가 아니다', () => {
    const noService = parse(
      'districtCode=11680&administrationCode=11680640&commercialCodes=1,2',
    )

    expect(noService.serviceCode).toBeNull()
    expect(isCompleteCompareState(noService)).toBe(false)
  })

  it('빈 쿼리는 빈 상태다', () => {
    expect(parse('')).toEqual(EMPTY_COMPARE_URL_STATE)
  })
})
