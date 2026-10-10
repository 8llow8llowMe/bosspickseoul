import { describe, expect, it } from 'vitest'

import { resolveRecommendationSheetFitHeight } from '@/components/recommend/recommend-mobile-sheet'

/*
 * 조건 화면의 시트는 내용 높이에 맞춰 낮게 열린다. 펼침 높이(72%)를 다 쓰면 조건 카드 아래가
 * 절반쯤 비고 지도만 가렸다. 선택 목록·결과로 넘어가면 원래 펼침 높이로 올라온다.
 */
describe('resolveRecommendationSheetFitHeight', () => {
  it('손잡이 줄(72) + 위 테두리(1) + 첫 자식 위~마지막 자식 아래 + 위아래 여백', () => {
    expect(
      resolveRecommendationSheetFitHeight({
        firstTop: 100,
        lastBottom: 380,
        paddingTop: 8,
        paddingBottom: 16,
      }),
    ).toBe(72 + 1 + 280 + 8 + 16)
  })

  it('소수 픽셀은 올림한다 — 마지막 줄이 1px 잘려 스크롤이 생기지 않게', () => {
    expect(
      resolveRecommendationSheetFitHeight({
        firstTop: 0,
        lastBottom: 200.2,
        paddingTop: 0,
        paddingBottom: 0,
      }),
    ).toBe(274)
  })

  it('잴 수 없으면 null — 시트는 펼침 높이를 그대로 쓴다', () => {
    expect(resolveRecommendationSheetFitHeight(null)).toBeNull()
    expect(
      resolveRecommendationSheetFitHeight({
        firstTop: 0,
        lastBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
      }),
    ).toBeNull()
  })
})
