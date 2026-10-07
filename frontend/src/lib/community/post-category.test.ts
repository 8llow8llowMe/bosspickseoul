import { describe, expect, it } from 'vitest'

import {
  COMMUNITY_POST_CATEGORIES,
  COMMUNITY_POST_CATEGORY_LABELS,
  getCommunityPostCategoryCode,
  parseCommunityPostCategory,
} from './post-category'

describe('말머리 표(#529)', () => {
  it('네 code 와 표시명이 BE `name` 과 글자까지 같다 — 순서가 곧 칩 순서다', () => {
    expect(
      COMMUNITY_POST_CATEGORIES.map(({ value, label }) => [value, label]),
    ).toEqual([
      ['QUESTION', '질문'],
      ['EXPERIENCE', '경험 공유'],
      ['TOGETHER', '같이 해요'],
      ['NEWS', '동네 소식'],
    ])
    expect(COMMUNITY_POST_CATEGORY_LABELS.NEWS).toBe('동네 소식')
  })

  it('URL·저장본 값은 알려진 대문자 code 만 받는다', () => {
    expect(parseCommunityPostCategory('QUESTION')).toBe('QUESTION')
    expect(parseCommunityPostCategory('NEWS')).toBe('NEWS')
    // 서버는 대소문자를 가리지 않지만 화면 주소는 하나의 모양만 쓴다.
    expect(parseCommunityPostCategory('question')).toBeNull()
    expect(parseCommunityPostCategory('BOGUS')).toBeNull()
    expect(parseCommunityPostCategory('')).toBeNull()
    expect(parseCommunityPostCategory(null)).toBeNull()
    expect(parseCommunityPostCategory(undefined)).toBeNull()
    expect(parseCommunityPostCategory(3)).toBeNull()
  })

  it('응답 말머리에서 분기용 code 를 꺼낸다 — 모르는 code·null 은 말머리 없음이다', () => {
    expect(
      getCommunityPostCategoryCode({
        code: 'TOGETHER',
        name: '같이 해요',
        description: '같이 해요',
      }),
    ).toBe('TOGETHER')
    // BE 가 값을 더해도 화면이 죽지 않는다 — 분기·필터는 알려진 값만.
    expect(
      getCommunityPostCategoryCode({
        code: 'EVENT',
        name: '행사',
        description: '행사',
      }),
    ).toBeNull()
    expect(getCommunityPostCategoryCode(null)).toBeNull()
    expect(getCommunityPostCategoryCode(undefined)).toBeNull()
  })
})
