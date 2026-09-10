import { describe, expect, it } from 'vitest'

import { createRecommendHandoffLabel } from '@/lib/analysis/recommend-handoff'

describe('createRecommendHandoffLabel', () => {
  it('행정동과 업종 이름이 다 있으면 둘을 넣어 구체적으로 말한다', () => {
    expect(
      createRecommendHandoffLabel({
        administrationName: '역삼1동',
        serviceName: '한식음식점',
        serviceCode: 'CS100001',
      }),
    ).toBe('역삼1동에서 한식음식점 창업하기 좋은 다른 상권도 추천받기')
  })

  it('업종 이름이 코드로 폴백돼 있으면 이름으로 인정하지 않는다', () => {
    expect(
      createRecommendHandoffLabel({
        administrationName: '역삼1동',
        serviceName: 'CS100001',
        serviceCode: 'CS100001',
      }),
    ).toBe('같은 조건으로 다른 상권도 추천받기')
  })

  it('업종 이름이 빈 문자열이어도 이름 없는 문구로 떨어진다', () => {
    expect(
      createRecommendHandoffLabel({
        administrationName: '역삼1동',
        serviceName: '',
        serviceCode: 'CS100001',
      }),
    ).toBe('같은 조건으로 다른 상권도 추천받기')
  })

  it('행정동 이름이 없으면 업종 이름이 있어도 이름 없는 문구를 쓴다', () => {
    expect(
      createRecommendHandoffLabel({
        administrationName: null,
        serviceName: '한식음식점',
        serviceCode: 'CS100001',
      }),
    ).toBe('같은 조건으로 다른 상권도 추천받기')
  })
})
