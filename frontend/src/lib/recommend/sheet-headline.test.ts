import { describe, expect, it } from 'vitest'

import {
  resolveRecommendSheetHeadline,
  summarizeRecommendDraft,
} from './sheet-headline'

const emptyDraft = { district: null, administration: null, service: null }
const fullDraft = {
  district: { code: '11680', name: '강남구' },
  administration: { code: '11680640', name: '역삼1동' },
  service: { code: 'CS100010', name: '커피-음료' },
}

const headline = (
  overrides: Partial<Parameters<typeof resolveRecommendSheetHeadline>[0]>,
) =>
  resolveRecommendSheetHeadline({
    view: 'criteria',
    pickerLabel: null,
    draft: emptyDraft,
    resultCount: 0,
    selectedResult: null,
    isResultLoading: false,
    ...overrides,
  })

describe('summarizeRecommendDraft', () => {
  it('채워진 조건만 이어 붙인다', () => {
    expect(summarizeRecommendDraft(fullDraft)).toBe(
      '강남구 · 역삼1동 · 커피-음료',
    )
    expect(
      summarizeRecommendDraft({ ...emptyDraft, district: fullDraft.district }),
    ).toBe('강남구')
    expect(summarizeRecommendDraft(emptyDraft)).toBe('')
  })
})

describe('resolveRecommendSheetHeadline', () => {
  // 접힘 높이 72px 이 보여줄 줄이다. 어느 뷰에서도 빈 줄이 나오면 안 된다.
  it('어떤 상태에서도 제목과 요약이 비지 않는다', () => {
    const cases = [
      headline({}),
      headline({ view: 'picker', pickerLabel: '업종' }),
      headline({ view: 'results' }),
      headline({ view: 'results', isResultLoading: true }),
      headline({ view: 'picker', pickerLabel: null }),
    ]

    for (const item of cases) {
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.summary.length).toBeGreaterThan(0)
    }
  })

  it('조건 뷰는 고른 것을 그대로 보여준다', () => {
    expect(headline({ draft: fullDraft })).toEqual({
      title: '상권 추천 조건',
      summary: '강남구 · 역삼1동 · 커피-음료',
    })
    expect(headline({}).summary).toBe('자치구부터 선택해 주세요')
  })

  it('선택 뷰는 무엇을 고르는 중인지 말한다', () => {
    expect(
      headline({ view: 'picker', pickerLabel: '업종', draft: fullDraft }),
    ).toEqual({ title: '업종 선택', summary: '강남구 · 역삼1동 · 커피-음료' })
  })

  // pickerStep 이 없는 picker 뷰는 상태상 있을 수 없지만, 빈 제목을 만들지는 않는다.
  it('고르는 조건을 모르면 조건 뷰 문구로 떨어진다', () => {
    expect(headline({ view: 'picker', pickerLabel: null }).title).toBe(
      '상권 추천 조건',
    )
  })

  it('결과 뷰는 고른 상권을, 없으면 개수를 말한다', () => {
    expect(
      headline({
        view: 'results',
        resultCount: 5,
        selectedResult: { rank: 1, commercialName: '망원시장' },
      }).summary,
    ).toBe('1위 망원시장')
    expect(headline({ view: 'results', resultCount: 5 }).summary).toBe(
      '추천 상권 5곳',
    )
    expect(
      headline({ view: 'results', resultCount: 0, isResultLoading: true })
        .summary,
    ).toBe('추천 상권을 찾고 있어요')
    expect(headline({ view: 'results', resultCount: 0 }).summary).toBe(
      '조건에 맞는 상권이 없어요',
    )
  })
})
