import { describe, expect, it } from 'vitest'

import { buildCommunityMetadataDescription } from '@/lib/community'
import type {
  CommunityLikedPostsResponse,
  CommunityPostListResponse,
} from '@/types/community'

import {
  COMMUNITY_ANONYMOUS_VIEWER,
  communityKeys,
  createCommunityContextKey,
  createCommunityPostHref,
  getCommunityLoginHref,
  getCommunityNextPageParam,
  getCommunityPageSlice,
  getCommunityViewerKey,
  isCommunityMockEnabled,
  parseCommunityListState,
  parseCommunityPostId,
  parseCommunityTargetType,
  serializeCommunityListState,
  validateCommunityDraft,
} from './community-state'

const dataHeader = {
  success: true,
  resultCode: 'SUCCESS',
  resultMessage: '성공',
}

const postsResponse: CommunityPostListResponse = {
  dataHeader,
  dataBody: {
    board: null,
    posts: {
      contents: [
        {
          postId: '7',
          memberId: '1',
          targetType: null,
          targetCode: null,
          targetName: null,
          title: '일반 글',
          previewContent: '본문',
          likeCount: 13,
          commentCount: 2,
          viewCount: 40,
          liked: null,
          createdAt: '2026-07-27T00:00:00Z',
          thumbnailUrl: null,
          category: null,
        },
      ],
      hasNext: true,
    },
  },
}

const likedPostsResponse: CommunityLikedPostsResponse = {
  dataHeader,
  dataBody: {
    posts: {
      contents: [
        {
          ...postsResponse.dataBody.posts.contents[0],
          likedAt: '2026-07-27T01:00:00Z',
        },
      ],
      hasNext: true,
    },
  },
}

describe('community state', () => {
  it('게시글 ID는 정규 양의 정수 문자열을 그대로 돌려준다', () => {
    expect(parseCommunityPostId('1')).toBe('1')

    // 핵심 회귀: Snowflake 는 안전 정수를 훨씬 넘는다. 예전 구현은 Number 로 바꾼 뒤
    // isSafeInteger 로 걸러서 **실제 게시글 id 를 전부 null 로 만들었고**, 상세 라우트가
    // 그걸 notFound() 로 바꿔 모든 글이 404 가 됐다.
    const snowflake = '751234567890123456'
    expect(Number.isSafeInteger(Number(snowflake))).toBe(false)
    expect(parseCommunityPostId(snowflake)).toBe(snowflake)

    // 문자열 그대로 나르므로 자릿수가 손상되지 않는다.
    expect(parseCommunityPostId(snowflake)).not.toBe(String(Number(snowflake)))

    for (const invalid of [
      null,
      '',
      '0',
      '-1',
      '1.5',
      '1e2',
      '+1',
      ' 1',
      '1 ',
      '01',
    ]) {
      expect(parseCommunityPostId(invalid)).toBeNull()
    }
  })

  it('정상 view와 공백을 정규화한다', () => {
    expect(
      parseCommunityListState(
        new URLSearchParams(
          'view=popular&targetType=DISTRICT&targetCode=%20%20111%20',
        ),
      ),
    ).toMatchObject({
      view: 'popular',
      keyword: '',
      targetType: 'DISTRICT',
      targetCode: '111',
    })
    expect(
      parseCommunityListState(new URLSearchParams('view=unsupported')),
    ).toMatchObject({ view: 'latest' })
  })

  it('검색어가 있으면 지역 조건을 제거한다', () => {
    expect(
      parseCommunityListState(
        new URLSearchParams(
          'keyword=%20카페%20&targetType=DISTRICT&targetCode=111',
        ),
      ),
    ).toMatchObject({
      keyword: '카페',
      targetType: undefined,
      targetCode: undefined,
    })
  })

  it('인기 기간은 인기 보기에서만 읽고 기본값(이번 주)은 주소에 쓰지 않는다(#531)', () => {
    const popularMonth = parseCommunityListState(
      new URLSearchParams(
        'view=popular&period=MONTH&targetType=DISTRICT&targetCode=111',
      ),
    )
    expect(popularMonth).toMatchObject({ view: 'popular', period: 'MONTH' })
    expect(serializeCommunityListState(popularMonth).toString()).toBe(
      'view=popular&targetType=DISTRICT&targetCode=111&period=MONTH',
    )

    const popularAll = parseCommunityListState(
      new URLSearchParams('view=popular&period=ALL'),
    )
    expect(serializeCommunityListState(popularAll).toString()).toBe(
      'view=popular&period=ALL',
    )

    // 기본값·잘못된 값은 이번 주이고 주소에서 빠진다.
    for (const query of [
      'view=popular',
      'view=popular&period=WEEK',
      'view=popular&period=YEAR',
      'view=popular&period=month',
    ]) {
      const state = parseCommunityListState(new URLSearchParams(query))
      expect(state.period).toBe('WEEK')
      expect(serializeCommunityListState(state).toString()).toBe('view=popular')
    }

    // 최신·좋아요한 글·검색에는 기간 칩이 없다 — 의미 없는 값을 상태에 남기지 않는다.
    for (const query of [
      'period=MONTH',
      'view=liked&period=ALL',
      'view=popular&keyword=카페&period=MONTH',
    ]) {
      expect(parseCommunityListState(new URLSearchParams(query)).period).toBe(
        'WEEK',
      )
    }
    expect(
      serializeCommunityListState({
        view: 'latest',
        keyword: '',
        period: 'MONTH',
        mock: false,
      }).toString(),
    ).toBe('')
  })

  it('말머리 필터는 최신·인기 피드에서만 읽고 검색·좋아요한 글에서는 버린다(#529)', () => {
    const popular = parseCommunityListState(
      new URLSearchParams(
        'view=popular&period=MONTH&targetType=DISTRICT&targetCode=111&category=QUESTION',
      ),
    )
    expect(popular).toMatchObject({
      view: 'popular',
      period: 'MONTH',
      category: 'QUESTION',
    })
    expect(serializeCommunityListState(popular).toString()).toBe(
      'view=popular&targetType=DISTRICT&targetCode=111&category=QUESTION&period=MONTH',
    )

    const latest = parseCommunityListState(new URLSearchParams('category=NEWS'))
    expect(latest.category).toBe('NEWS')
    expect(serializeCommunityListState(latest).toString()).toBe('category=NEWS')

    // 「전체」는 주소에 쓰지 않는다. 모르는 값·소문자는 「전체」로 읽는다(서버는 400 COMMUNITY_017).
    for (const query of [
      '',
      'category=',
      'category=question',
      'category=BOGUS',
    ]) {
      const state = parseCommunityListState(new URLSearchParams(query))
      expect(state.category).toBeUndefined()
      expect(serializeCommunityListState(state).toString()).toBe('')
    }

    // 계약: 검색·좋아요한 글에는 말머리 필터가 없다 — 의미 없는 값을 상태에 남기지 않는다.
    for (const query of [
      'view=liked&category=NEWS',
      'keyword=카페&category=NEWS',
      'view=popular&keyword=카페&category=NEWS',
    ]) {
      expect(
        parseCommunityListState(new URLSearchParams(query)).category,
      ).toBeUndefined()
    }
    expect(
      serializeCommunityListState({
        view: 'latest',
        keyword: '카페',
        period: 'WEEK',
        category: 'NEWS',
        mock: false,
      }).toString(),
    ).toBe('keyword=%EC%B9%B4%ED%8E%98')
    expect(
      serializeCommunityListState({
        view: 'liked',
        keyword: '',
        period: 'WEEK',
        category: 'NEWS',
        mock: false,
      }).toString(),
    ).toBe('view=liked')
  })

  it('지원하는 대상 타입만 허용한다', () => {
    expect(parseCommunityTargetType('ADMINISTRATION')).toBe('ADMINISTRATION')
    expect(parseCommunityTargetType('INVALID')).toBeUndefined()
  })

  it('production에서는 mock 쿼리를 무시한다', () => {
    expect(isCommunityMockEnabled('1', 'development')).toBe(true)
    expect(isCommunityMockEnabled('1', 'production')).toBe(false)
  })

  it('로그인 redirect를 URL 인코딩한다', () => {
    expect(getCommunityLoginHref('/community/4?mock=1')).toBe(
      '/login?redirect=%2Fcommunity%2F4%3Fmock%3D1',
    )
  })

  it('좋아요 목록은 검색과 지역 조건을 제거한다', () => {
    expect(
      parseCommunityListState(
        new URLSearchParams(
          'view=liked&keyword=카페&targetType=DISTRICT&targetCode=111',
        ),
      ),
    ).toMatchObject({
      view: 'liked',
      keyword: '',
      targetType: undefined,
      targetCode: undefined,
    })
  })

  it('지역 조건은 유효한 타입과 코드가 함께 있을 때만 유지한다', () => {
    expect(
      parseCommunityListState(new URLSearchParams('targetType=DISTRICT')),
    ).toMatchObject({ targetType: undefined, targetCode: undefined })
    expect(
      parseCommunityListState(new URLSearchParams('targetCode=111')),
    ).toMatchObject({ targetType: undefined, targetCode: undefined })
    expect(
      parseCommunityListState(
        new URLSearchParams(
          'targetType=ADMINISTRATION&targetCode=%20%20111%20',
        ),
      ),
    ).toMatchObject({ targetType: 'ADMINISTRATION', targetCode: '111' })
  })

  it('글 작성 내용을 검증한다', () => {
    expect(validateCommunityDraft(' ', '본문')).toBe('제목을 입력해 주세요.')
    expect(validateCommunityDraft('a'.repeat(121), '본문')).toBe(
      '제목은 120자까지 입력할 수 있어요.',
    )
    expect(validateCommunityDraft('제목', ' ')).toBe('내용을 입력해 주세요.')
    expect(validateCommunityDraft('제목', 'a'.repeat(5001))).toBe(
      '내용은 5,000자까지 입력할 수 있어요.',
    )
    expect(validateCommunityDraft(' 제목 ', ' 본문 ')).toBeNull()
  })

  it('context key에서 mock을 제외하고 목록 조건을 반영한다', () => {
    const base = {
      view: 'latest' as const,
      keyword: '',
      targetType: 'DISTRICT' as const,
      targetCode: '111',
      period: 'WEEK' as const,
    }
    expect(createCommunityContextKey({ ...base, mock: false })).toBe(
      createCommunityContextKey({ ...base, mock: true }),
    )
    expect(createCommunityContextKey({ ...base, mock: false })).not.toBe(
      createCommunityContextKey({ ...base, targetCode: '222', mock: false }),
    )
  })

  it('context key 는 기본 기간이면 예전 모양 그대로고, 다른 기간이면 갈린다(#531)', () => {
    const popular = {
      view: 'popular' as const,
      keyword: '',
      mock: false,
    }
    // 이미 sessionStorage 에 저장된 스크롤·이웃 글 키를 깨지 않는다.
    expect(createCommunityContextKey({ ...popular, period: 'WEEK' })).toBe(
      JSON.stringify({
        view: 'popular',
        keyword: '',
        targetType: null,
        targetCode: null,
      }),
    )
    expect(createCommunityContextKey({ ...popular, period: 'MONTH' })).not.toBe(
      createCommunityContextKey({ ...popular, period: 'WEEK' }),
    )
    expect(
      JSON.parse(createCommunityContextKey({ ...popular, period: 'ALL' })),
    ).toMatchObject({ view: 'popular', period: 'ALL' })
  })

  it('context key 는 말머리가 없으면 예전 모양 그대로고, 있으면 갈린다(#529)', () => {
    const latest = {
      view: 'latest' as const,
      keyword: '',
      period: 'WEEK' as const,
      mock: false,
    }
    expect(createCommunityContextKey(latest)).toBe(
      JSON.stringify({
        view: 'latest',
        keyword: '',
        targetType: null,
        targetCode: null,
      }),
    )
    expect(
      JSON.parse(createCommunityContextKey({ ...latest, category: 'NEWS' })),
    ).toMatchObject({ view: 'latest', category: 'NEWS' })
    expect(
      createCommunityContextKey({ ...latest, category: 'QUESTION' }),
    ).not.toBe(createCommunityContextKey({ ...latest, category: 'NEWS' }))
  })

  it('글 링크에 목록 context와 활성 mock만 포함한다', () => {
    expect(createCommunityPostHref('7', '{"view":"latest"}', false)).toBe(
      '/community/7?from=%7B%22view%22%3A%22latest%22%7D',
    )
    expect(createCommunityPostHref('7', '검색 목록', true)).toBe(
      '/community/7?from=%EA%B2%80%EC%83%89+%EB%AA%A9%EB%A1%9D&mock=1',
    )
  })

  it('목록 응답과 좋아요 응답에서 posts slice를 정규화한다', () => {
    expect(getCommunityPageSlice(postsResponse, 'latest')).toBe(
      postsResponse.dataBody.posts,
    )
    expect(getCommunityPageSlice(likedPostsResponse, 'liked')).toBe(
      likedPostsResponse.dataBody.posts,
    )
  })

  it('view별 다음 커서를 생성하고 끝에서는 중단한다', () => {
    const slice = postsResponse.dataBody.posts
    expect(getCommunityNextPageParam(slice, 'latest')).toEqual({
      lastPostId: '7',
      lastLikeCount: 0,
    })
    expect(getCommunityNextPageParam(slice, 'popular')).toEqual({
      lastPostId: '7',
      lastLikeCount: 13,
    })
    expect(
      getCommunityNextPageParam(likedPostsResponse.dataBody.posts, 'liked'),
    ).toEqual({ lastPostId: '7', lastLikeCount: 0 })
    expect(
      getCommunityNextPageParam({ contents: [], hasNext: true }, 'latest'),
    ).toBeUndefined()
    expect(
      getCommunityNextPageParam({ ...slice, hasNext: false }, 'popular'),
    ).toBeUndefined()
  })

  it('커서가 직전 쪽에서 전진하지 않으면 다음 쪽을 끝낸다(무한 요청 방지)', () => {
    const slice = postsResponse.dataBody.posts

    // 최신·좋아요한 글: 마지막 글 id 가 직전 커서와 같으면 같은 쪽을 또 받는다.
    expect(
      getCommunityNextPageParam(slice, 'latest', {
        lastPostId: '7',
        lastLikeCount: 0,
      }),
    ).toBeUndefined()
    expect(
      getCommunityNextPageParam(slice, 'latest', {
        lastPostId: '9',
        lastLikeCount: 0,
      }),
    ).toEqual({ lastPostId: '7', lastLikeCount: 0 })

    // 인기: 커서는 (lastPostId, lastLikeCount) 쌍이다(CM-004). 쌍이 같을 때만 멈춘다.
    expect(
      getCommunityNextPageParam(slice, 'popular', {
        lastPostId: '7',
        lastLikeCount: 13,
      }),
    ).toBeUndefined()
    expect(
      getCommunityNextPageParam(slice, 'popular', {
        lastPostId: '7',
        lastLikeCount: 14,
      }),
    ).toEqual({ lastPostId: '7', lastLikeCount: 13 })
  })

  it('namespaced query keys를 안정적으로 만든다', () => {
    const state = parseCommunityListState(new URLSearchParams('view=latest'))
    expect(communityKeys.list(state, 'anonymous')).toEqual([
      'community',
      'list',
      state,
      'anonymous',
    ])
    expect(communityKeys.detail('1', true, '9001')).toEqual([
      'community',
      'detail',
      '1',
      true,
      '9001',
    ])
    expect(communityKeys.comments('1', false)).toEqual([
      'community',
      'comments',
      '1',
      false,
    ])
    expect(communityKeys.related('DISTRICT', '111', false, '42')).toEqual([
      'community',
      'related',
      'DISTRICT',
      '111',
      false,
      '42',
    ])
    expect(communityKeys.liked(true)).toEqual(['community', 'liked', true])
  })

  it('목록 우 레일 인기 글 키는 목록 키와 섞이지 않고 대상·목 모드·조회자로 갈린다', () => {
    expect(
      communityKeys.popular('DISTRICT', '11200', false, 'anonymous'),
    ).toEqual(['community', 'popular', 'DISTRICT', '11200', false, 'anonymous'])
    expect(communityKeys.popular(null, null, true, '9001')).toEqual([
      'community',
      'popular',
      null,
      null,
      true,
      '9001',
    ])
    // 목록 쪽 prefix(['community', 'list']) 무효화·취소에 걸리지 않는다.
    expect(
      communityKeys.popular(null, null, false, 'anonymous').slice(0, 2),
    ).not.toEqual(['community', 'list'])
  })

  it('조회자 세그먼트는 회원 id, 비로그인은 anonymous 다(#530 — liked 가 조회자별 응답)', () => {
    expect(getCommunityViewerKey({ authenticated: true, memberId: '42' })).toBe(
      '42',
    )
    expect(
      getCommunityViewerKey({ authenticated: false, memberId: null }),
    ).toBe(COMMUNITY_ANONYMOUS_VIEWER)
    expect(COMMUNITY_ANONYMOUS_VIEWER).toBe('anonymous')
    // 같은 글이라도 조회자가 다르면 다른 캐시다 — 로그아웃 뒤 남의 liked 를 5분 동안 보이지 않게.
    expect(communityKeys.detail('1', false, '42')).not.toEqual(
      communityKeys.detail('1', false, COMMUNITY_ANONYMOUS_VIEWER),
    )
  })

  it('대상명이 없으면 서울 창업 커뮤니티 메타데이터를 만든다', () => {
    expect(buildCommunityMetadataDescription('강남구', '  테스트 본문  ')).toBe(
      '강남구 커뮤니티 게시글 · 테스트 본문',
    )
    expect(buildCommunityMetadataDescription(' ', '본문')).toBe(
      '서울 창업 커뮤니티 게시글 · 본문',
    )
  })
})
