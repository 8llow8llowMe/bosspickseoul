import { describe, expect, it } from 'vitest'

import { getCommunityListHeading, getCommunityPostRank } from './list-heading'

describe('getCommunityListHeading', () => {
  it('기본 제목은 「사장님 이야기」이고 보조 한 줄을 단다', () => {
    expect(
      getCommunityListHeading({ keyword: '', boardTargetName: null }),
    ).toEqual({
      title: '사장님 이야기',
      description: '운영 경험과 동네 소식을 나눠요',
    })
  })

  it('대상이 있으면 「{대상} 이야기」이고 보조 줄은 생략한다', () => {
    expect(
      getCommunityListHeading({ keyword: '', boardTargetName: '성수1가1동' }),
    ).toEqual({ title: '성수1가1동 이야기', description: null })
  })

  it('검색 중이면 대상보다 검색어가 먼저다', () => {
    expect(
      getCommunityListHeading({ keyword: '팝업', boardTargetName: '성수동' }),
    ).toEqual({ title: '「팝업」 검색 결과', description: null })
  })
})

describe('getCommunityPostRank', () => {
  it('인기 보기의 상위 세 건에만 1·2·3 순위를 준다', () => {
    expect(
      [0, 1, 2, 3].map(index => getCommunityPostRank('popular', index)),
    ).toEqual([1, 2, 3, null])
  })

  it('최신·좋아요한 글 보기에는 순위가 없다', () => {
    expect(getCommunityPostRank('latest', 0)).toBeNull()
    expect(getCommunityPostRank('liked', 0)).toBeNull()
  })
})
