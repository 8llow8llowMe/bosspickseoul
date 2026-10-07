import { describe, expect, it } from 'vitest'

import {
  getCommunityListFilterSummary,
  hasCommunityListFilter,
} from '@/lib/community/list-filter'

describe('hasCommunityListFilter', () => {
  it('is only available in the latest and popular feeds without a keyword', () => {
    expect(hasCommunityListFilter('latest', '')).toBe(true)
    expect(hasCommunityListFilter('popular', '')).toBe(true)
    expect(hasCommunityListFilter('liked', '')).toBe(false)
    expect(hasCommunityListFilter('latest', '점심')).toBe(false)
    expect(hasCommunityListFilter('popular', '점심')).toBe(false)
  })
})

describe('getCommunityListFilterSummary', () => {
  it('says 「필터」 and is not active with the defaults', () => {
    expect(
      getCommunityListFilterSummary({
        view: 'latest',
        category: null,
        period: 'WEEK',
      }),
    ).toEqual({ label: '필터', active: false })
    expect(
      getCommunityListFilterSummary({
        view: 'popular',
        category: null,
        period: 'WEEK',
      }),
    ).toEqual({ label: '필터', active: false })
  })

  it('names the chosen category', () => {
    expect(
      getCommunityListFilterSummary({
        view: 'latest',
        category: 'QUESTION',
        period: 'WEEK',
      }),
    ).toEqual({ label: '질문', active: true })
  })

  it('joins the category and a non-default period in the popular feed', () => {
    expect(
      getCommunityListFilterSummary({
        view: 'popular',
        category: 'QUESTION',
        period: 'MONTH',
      }),
    ).toEqual({ label: '질문 · 이번 달', active: true })
    expect(
      getCommunityListFilterSummary({
        view: 'popular',
        category: null,
        period: 'MONTH',
      }),
    ).toEqual({ label: '이번 달', active: true })
    expect(
      getCommunityListFilterSummary({
        view: 'popular',
        category: 'NEWS',
        period: 'ALL',
      }),
    ).toEqual({ label: '동네 소식 · 전체 기간', active: true })
  })

  it('ignores the period outside the popular feed', () => {
    expect(
      getCommunityListFilterSummary({
        view: 'latest',
        category: null,
        period: 'MONTH',
      }),
    ).toEqual({ label: '필터', active: false })
  })
})
