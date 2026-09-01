import { describe, expect, it } from 'vitest'

import {
  createCommercialCodesKey,
  recommendCommercialsKey,
  recommendProfileKey,
  recommendResultsKey,
} from './recommend-query-keys'

describe('recommend query keys', () => {
  it('상권 목록 키는 recommend-page 의 모양과 같다', () => {
    expect(recommendCommercialsKey('11680', '11680640')).toEqual([
      'recommend',
      'regions',
      'commercials',
      '11680',
      '11680640',
    ])
  })

  it('추천 결과 키는 recommend-page 의 모양과 같다', () => {
    expect(
      recommendResultsKey({
        districtCode: '11680',
        administrationCode: '11680640',
        serviceCode: 'CS100010',
        periodCode: '20233',
        commercialCodesKey: '1,2,3',
      }),
    ).toEqual([
      'recommend',
      'results',
      '11680',
      '11680640',
      'CS100010',
      '20233',
      '1,2,3',
    ])
  })

  it('프로필 키는 recommend-page 의 모양과 같다', () => {
    expect(recommendProfileKey('3120197', 'CS100010', '20233')).toEqual([
      'recommend',
      'profile',
      '3120197',
      'CS100010',
      '20233',
    ])
  })

  it('코드 키는 정렬·중복제거 후 이어붙인다', () => {
    // recommend-state 의 commercialCodesKey 와 같은 규칙이어야 캐시가 맞는다.
    expect(createCommercialCodesKey(['3', 1, '2', '3'])).toBe('1,2,3')
  })
})
