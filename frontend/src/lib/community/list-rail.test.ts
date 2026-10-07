import { describe, expect, it } from 'vitest'

import type { CommunityListState } from '@/lib/community/community-state'
import { COMMUNITY_CURSOR_START } from '@/lib/community/community-state'
import type { CommunityPostListResponse } from '@/types/community'

import {
  COMMUNITY_LIST_NAV_QUERY,
  COMMUNITY_LIST_RAIL_QUERY,
  COMMUNITY_POPULAR_RAIL_SIZE,
  createCommunityPopularParams,
  getCommunityPopularRailPosts,
  getCommunityRailAnalysisLink,
  getCommunityRailAskTitle,
  getCommunityRailPopularTitle,
} from './list-rail'

/*
  목록 우 레일(community.md §S4 「목록 3단」, CM-039). 인기 글 요청 범위·제목·분석 연결 분기를 잠근다.
*/

const baseState: CommunityListState = {
  view: 'latest',
  keyword: '',
  targetType: undefined,
  targetCode: undefined,
  period: 'WEEK',
  mock: false,
}

const districtState: CommunityListState = {
  ...baseState,
  targetType: 'DISTRICT',
  targetCode: '11200',
}

describe('list rail breakpoints', () => {
  it('opens the rail at 1080 and the left nav at 1360', () => {
    expect(COMMUNITY_LIST_RAIL_QUERY).toBe('(min-width: 1080px)')
    expect(COMMUNITY_LIST_NAV_QUERY).toBe('(min-width: 1360px)')
  })
})

describe('createCommunityPopularParams', () => {
  it('asks the list API for five popular posts of this week from the first page', () => {
    expect(COMMUNITY_POPULAR_RAIL_SIZE).toBe(5)
    expect(createCommunityPopularParams(baseState)).toEqual({
      sortType: 'POPULAR',
      orderType: 'DESC',
      period: 'WEEK',
      lastPostId: COMMUNITY_CURSOR_START,
      lastLikeCount: 0,
      size: 5,
    })
  })

  it('keeps the rail on this week even while the feed shows another period (#531)', () => {
    expect(
      createCommunityPopularParams({
        ...baseState,
        view: 'popular',
        period: 'ALL',
      }),
    ).toMatchObject({ sortType: 'POPULAR', period: 'WEEK' })
  })

  it('scopes to the selected target', () => {
    expect(createCommunityPopularParams(districtState)).toMatchObject({
      sortType: 'POPULAR',
      size: 5,
      targetType: 'DISTRICT',
      targetCode: '11200',
    })
  })

  it('uses the same target in the popular view', () => {
    expect(
      createCommunityPopularParams({ ...districtState, view: 'popular' }),
    ).toMatchObject({ targetType: 'DISTRICT', targetCode: '11200' })
  })

  it('falls back to all of Seoul while searching or in the liked view', () => {
    const searching = createCommunityPopularParams({
      ...districtState,
      keyword: '점심',
    })
    const liked = createCommunityPopularParams({
      ...districtState,
      view: 'liked',
    })

    for (const params of [searching, liked]) {
      expect(params).not.toHaveProperty('targetType')
      expect(params).not.toHaveProperty('targetCode')
      expect(params).not.toHaveProperty('keyword')
      expect(params.sortType).toBe('POPULAR')
      expect(params.size).toBe(5)
    }
  })
})

describe('getCommunityPopularRailPosts', () => {
  const response = (
    contents: CommunityPostListResponse['dataBody']['posts']['contents'],
    success = true,
  ): CommunityPostListResponse => ({
    dataHeader: {
      success,
      resultCode: success ? null : 'FAIL',
      resultMessage: success ? null : '실패',
    },
    dataBody: { board: null, posts: { contents, hasNext: false } },
  })
  const post = (index: number) =>
    ({
      postId: String(index),
      title: `글 ${index}`,
      likeCount: index,
    }) as CommunityPostListResponse['dataBody']['posts']['contents'][number]

  it('returns at most five posts', () => {
    const posts = getCommunityPopularRailPosts(
      response([1, 2, 3, 4, 5, 6].map(post)),
    )

    expect(posts.map(item => item.postId)).toEqual(['1', '2', '3', '4', '5'])
  })

  it('returns nothing for a missing or failed response', () => {
    expect(getCommunityPopularRailPosts(undefined)).toEqual([])
    expect(getCommunityPopularRailPosts(response([post(1)], false))).toEqual([])
  })
})

describe('rail copy', () => {
  it('titles popular posts by the board name when known', () => {
    expect(getCommunityRailPopularTitle('성동구')).toBe(
      '성동구 이번 주 인기 글',
    )
    expect(getCommunityRailPopularTitle(null)).toBe('이번 주 인기 글')
  })

  it('asks about the board when known, otherwise the owners', () => {
    expect(getCommunityRailAskTitle('성수1가1동')).toBe(
      '성수1가1동에 대해 물어보세요',
    )
    expect(getCommunityRailAskTitle(null)).toBe('사장님들께 물어보세요')
  })
})

describe('getCommunityRailAnalysisLink', () => {
  it('links a district board to its district analysis', () => {
    expect(getCommunityRailAnalysisLink(districtState, '성동구')).toEqual({
      label: '성동구 상권 분석 보기',
      href: '/analysis?districtCode=11200',
    })
  })

  it('keeps the district link without a name before the board name arrives', () => {
    expect(getCommunityRailAnalysisLink(districtState, null)).toEqual({
      label: '상권 분석 보기',
      href: '/analysis?districtCode=11200',
    })
  })

  it('sends administration, commercial, and no-target boards to the explorer', () => {
    const generic = {
      label: '상권 분석에서 찾아보기',
      href: '/analysis',
    }

    expect(
      getCommunityRailAnalysisLink(
        {
          ...baseState,
          targetType: 'ADMINISTRATION',
          targetCode: '1120065000',
        },
        '성수1가1동',
      ),
    ).toEqual(generic)
    expect(
      getCommunityRailAnalysisLink(
        { ...baseState, targetType: 'COMMERCIAL', targetCode: '3110008' },
        '성수역',
      ),
    ).toEqual(generic)
    expect(getCommunityRailAnalysisLink(baseState, null)).toEqual(generic)
  })

  it('ignores the district while searching or in the liked view', () => {
    expect(
      getCommunityRailAnalysisLink({ ...districtState, keyword: '점심' }, null),
    ).toEqual({ label: '상권 분석에서 찾아보기', href: '/analysis' })
  })
})
