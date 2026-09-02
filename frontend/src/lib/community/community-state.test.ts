import { describe, expect, it } from 'vitest'

import { buildCommunityMetadataDescription } from '@/lib/community'
import type {
  CommunityLikedPostsResponse,
  CommunityPostListResponse,
} from '@/types/community'

import {
  communityKeys,
  createCommunityContextKey,
  createCommunityPostHref,
  getCommunityLoginHref,
  getCommunityNextPageParam,
  getCommunityPageSlice,
  isCommunityMockEnabled,
  parseCommunityListState,
  parseCommunityPostId,
  parseCommunityTargetType,
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
          createdAt: '2026-07-27T00:00:00Z',
          thumbnailUrl: null,
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
    }
    expect(createCommunityContextKey({ ...base, mock: false })).toBe(
      createCommunityContextKey({ ...base, mock: true }),
    )
    expect(createCommunityContextKey({ ...base, mock: false })).not.toBe(
      createCommunityContextKey({ ...base, targetCode: '222', mock: false }),
    )
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

  it('namespaced query keys를 안정적으로 만든다', () => {
    const state = parseCommunityListState(new URLSearchParams('view=latest'))
    expect(communityKeys.list(state)).toEqual(['community', 'list', state])
    expect(communityKeys.detail('1', true)).toEqual([
      'community',
      'detail',
      '1',
      true,
    ])
    expect(communityKeys.comments('1', false)).toEqual([
      'community',
      'comments',
      '1',
      false,
    ])
    expect(communityKeys.related('DISTRICT', '111', false)).toEqual([
      'community',
      'related',
      'DISTRICT',
      '111',
      false,
    ])
    expect(communityKeys.liked(true)).toEqual(['community', 'liked', true])
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
