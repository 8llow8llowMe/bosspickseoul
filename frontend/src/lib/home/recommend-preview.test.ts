import { describe, expect, it } from 'vitest'

import {
  RECOMMEND_PREVIEW_FALLBACK,
  toRecommendPreview,
} from '@/lib/home/recommend-preview'

const body = {
  serviceCode: 'CS100010',
  periodCode: '20233',
  topN: 5,
  items: [
    {
      rank: 1,
      commercialCode: '3120197',
      commercialName: '역삼역',
      compositeScore: 83.99470969264185,
      selectionReason: '공격형 기준으로 기회도 높음을 우선 반영했습니다.',
    },
    {
      rank: 2,
      commercialCode: '3110958',
      commercialName: '역삼역 4번',
      compositeScore: 71.2,
      selectionReason: '두 번째 이유',
    },
  ],
}

describe('toRecommendPreview', () => {
  it('순위·이름·점수를 옮긴다', () => {
    const view = toRecommendPreview(body as never)

    expect(view.rows[0]).toMatchObject({
      rank: 1,
      name: '역삼역',
      score: 83.99470969264185,
    })
  })

  it('점수를 소수 첫째 자리까지 적는다', () => {
    expect(toRecommendPreview(body as never).rows[0].scoreLabel).toBe('84.0점')
  })

  it('1위의 추천 이유만 쓴다', () => {
    const view = toRecommendPreview(body as never)

    expect(view.reason).toBe('공격형 기준으로 기회도 높음을 우선 반영했습니다.')
  })

  it('items 가 비면 예시로 본다', () => {
    const view = toRecommendPreview({ ...body, items: [] } as never)

    expect(view.isSample).toBe(true)
    expect(view.rows.length).toBeGreaterThan(0)
  })

  it('점수가 null 인 행은 버린다', () => {
    // 막대 길이를 정할 수 없어 목록 안에서 혼자 죽은 행이 된다.
    const view = toRecommendPreview({
      ...body,
      items: [body.items[0], { ...body.items[1], compositeScore: null }],
    } as never)

    expect(view.rows).toHaveLength(1)
    expect(view.isSample).toBe(false)
  })

  it('점수 있는 행이 하나도 없으면 예시로 간다', () => {
    const view = toRecommendPreview({
      ...body,
      items: body.items.map(item => ({ ...item, compositeScore: null })),
    } as never)

    expect(view.isSample).toBe(true)
  })

  it('selectionReason 이 없으면 이유를 비운다', () => {
    const view = toRecommendPreview({
      ...body,
      items: [{ ...body.items[0], selectionReason: null }],
    } as never)

    expect(view.reason).toBeNull()
  })
})

describe('RECOMMEND_PREVIEW_FALLBACK', () => {
  it('예시 표시가 켜져 있다', () => {
    expect(RECOMMEND_PREVIEW_FALLBACK.isSample).toBe(true)
    expect(RECOMMEND_PREVIEW_FALLBACK.rows).toHaveLength(5)
  })
})
