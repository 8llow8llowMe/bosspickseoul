import { describe, expect, it } from 'vitest'

import type {
  CommunityCursorParams,
  CommunityTargetType,
} from '@/types/community'

import {
  communityMockFixtures,
  communityMockLocations,
  createCommunityMockSource,
  MOCK_COMMUNITY_MEMBER_ID,
} from './community-mock'

const successHeader = {
  success: true,
  resultCode: null,
  resultMessage: null,
}

const cursor = (
  overrides: Partial<CommunityCursorParams> = {},
): CommunityCursorParams => ({
  sortType: 'LATEST',
  orderType: 'DESC',
  lastPostId: 0,
  lastLikeCount: 0,
  size: 20,
  ...overrides,
})

const fixturePost = (postId: number) => {
  const post = communityMockFixtures.posts.find(item => item.postId === postId)

  if (!post) {
    throw new Error(`테스트 fixture 게시글 ${postId}이 없습니다.`)
  }

  return post
}

const fixtureDetail = (postId: number) => {
  const detail = communityMockFixtures.details.find(
    item => item.postId === postId,
  )

  if (!detail) {
    throw new Error(`테스트 fixture 게시글 상세 ${postId}이 없습니다.`)
  }

  return detail
}

const fixturePosts = (postIds: number[]) => postIds.map(fixturePost)

describe('community mock source', () => {
  it('Swagger 요약·상세 fixture를 2/2/2/2 대상 분포와 작성자 혼합으로 제공한다', () => {
    type DistributionKey = CommunityTargetType | 'SEOUL'
    const isTargetType = (
      value: string | undefined,
    ): value is CommunityTargetType =>
      value === 'DISTRICT' ||
      value === 'ADMINISTRATION' ||
      value === 'COMMERCIAL'
    const distribution = communityMockFixtures.posts.reduce(
      (counts, post) => {
        const targetType = post.targetType?.code
        const key: DistributionKey = isTargetType(targetType)
          ? targetType
          : 'SEOUL'
        counts[key] += 1
        return counts
      },
      {
        SEOUL: 0,
        DISTRICT: 0,
        ADMINISTRATION: 0,
        COMMERCIAL: 0,
      } satisfies Record<DistributionKey, number>,
    )

    expect(distribution).toEqual({
      SEOUL: 2,
      DISTRICT: 2,
      ADMINISTRATION: 2,
      COMMERCIAL: 2,
    })
    expect(
      communityMockFixtures.posts.some(
        post => post.memberId === MOCK_COMMUNITY_MEMBER_ID,
      ),
    ).toBe(true)
    expect(
      communityMockFixtures.posts.some(
        post => post.memberId !== MOCK_COMMUNITY_MEMBER_ID,
      ),
    ).toBe(true)
    expect(
      new Set(communityMockFixtures.posts.map(post => post.createdAt)).size,
    ).toBe(8)
    expect(
      new Set(communityMockFixtures.posts.map(post => post.likeCount)).size,
    ).toBe(8)

    expect(communityMockFixtures.details).toHaveLength(8)
    communityMockFixtures.details.forEach(detail => {
      const summary = fixturePost(detail.postId)

      expect(detail).toEqual({
        postId: summary.postId,
        memberId: summary.memberId,
        targetType: summary.targetType,
        targetCode: summary.targetCode,
        targetName: summary.targetName,
        title: summary.title,
        content: expect.any(String),
        likeCount: summary.likeCount,
        commentCount: summary.commentCount,
        viewCount: expect.any(Number),
        createdAt: summary.createdAt,
        updatedAt: expect.any(String),
      })
      expect(detail.content.length).toBeGreaterThan(0)
      expect('previewContent' in detail).toBe(false)
    })
  })

  it('최상위 댓글·1단계 답글과 댓글 없는 게시글 fixture를 제공한다', () => {
    expect(
      communityMockFixtures.comments.some(
        comment => comment.replies.length > 0,
      ),
    ).toBe(true)
    expect(
      communityMockFixtures.comments.every(comment =>
        comment.replies.every(
          reply =>
            reply.parentCommentId === comment.commentId &&
            reply.postId === comment.postId,
        ),
      ),
    ).toBe(true)

    const emptyCommentPost = communityMockFixtures.posts.find(
      post =>
        post.commentCount === 0 &&
        !communityMockFixtures.comments.some(
          comment => comment.postId === post.postId,
        ),
    )
    expect(emptyCommentPost).toBeDefined()
  })

  it('완전한 상세 성공 envelope를 반환하고 조회수를 일관되게 증가시킨다', async () => {
    const source = createCommunityMockSource()
    const detail = fixtureDetail(1)

    expect(await source.getPost(1)).toEqual({
      dataHeader: successHeader,
      dataBody: {
        ...detail,
        viewCount: detail.viewCount + 1,
      },
    })
    expect(await source.getPost(1)).toEqual({
      dataHeader: successHeader,
      dataBody: {
        ...detail,
        viewCount: detail.viewCount + 2,
      },
    })
  })

  it('완전한 성공 envelope로 대상 게시글과 board를 반환한다', async () => {
    const source = createCommunityMockSource()
    const response = await source.getPosts({
      ...cursor(),
      targetType: 'COMMERCIAL',
      targetCode: '3110008',
    })

    expect(response).toEqual({
      dataHeader: successHeader,
      dataBody: {
        board: {
          targetType: {
            code: 'COMMERCIAL',
            name: '상권',
            description: '서울시 상권 단위 게시판',
          },
          targetCode: '3110008',
          targetName: '강남역 상권',
        },
        posts: {
          contents: [fixturePost(7)],
          hasNext: false,
        },
      },
    })
  })

  it('대상 타입과 코드가 모두 있을 때만 필터와 board를 적용한다', async () => {
    const source = createCommunityMockSource()
    const typeOnly = await source.getPosts({
      ...cursor(),
      targetType: 'DISTRICT',
    })
    const codeOnly = await source.getPosts({
      ...cursor(),
      targetCode: '11680',
    })

    const expected = {
      dataHeader: successHeader,
      dataBody: {
        board: null,
        posts: {
          contents: fixturePosts([8, 7, 6, 5, 4, 3, 2, 1]),
          hasNext: false,
        },
      },
    }
    expect(typeOnly).toEqual(expected)
    expect(codeOnly).toEqual(expected)
  })

  it('LATEST는 postId, POPULAR는 좋아요 수와 postId 내림차순으로 정렬한다', async () => {
    const source = createCommunityMockSource()
    const latest = await source.getPosts(cursor())
    const popular = await source.getPosts(
      cursor({ sortType: 'POPULAR', lastLikeCount: 0 }),
    )

    expect(latest.dataBody.posts.contents.map(post => post.postId)).toEqual([
      8, 7, 6, 5, 4, 3, 2, 1,
    ])
    expect(popular.dataBody.posts.contents.map(post => post.postId)).toEqual([
      7, 3, 6, 2, 5, 8, 4, 1,
    ])
  })

  it('인기순 커서의 좋아요 수와 게시글 ID 뒤에서 다음 페이지를 시작한다', async () => {
    const source = createCommunityMockSource()
    const first = await source.getPosts(
      cursor({ sortType: 'POPULAR', size: 2 }),
    )
    const last = first.dataBody.posts.contents.at(-1)

    expect(first.dataBody.posts.hasNext).toBe(true)
    expect(first.dataBody.posts.contents.map(post => post.postId)).toEqual([
      7, 3,
    ])
    expect(last?.postId).toBe(3)

    const second = await source.getPosts(
      cursor({
        sortType: 'POPULAR',
        lastLikeCount: last?.likeCount ?? 0,
        lastPostId: last?.postId ?? 0,
        size: 2,
      }),
    )
    expect(second).toEqual({
      dataHeader: successHeader,
      dataBody: {
        board: null,
        posts: {
          contents: fixturePosts([6, 2]),
          hasNext: true,
        },
      },
    })
  })

  it('같은 좋아요 수에서는 postId 내림차순으로 정렬하고 동률 내부 커서를 적용한다', async () => {
    const source = createCommunityMockSource()
    const older = await source.createPost({
      title: '동률 첫 게시글',
      content: '좋아요 수가 같은 첫 게시글입니다.',
    })
    const newer = await source.createPost({
      title: '동률 둘째 게시글',
      content: '좋아요 수가 같은 둘째 게시글입니다.',
    })

    const popular = await source.getPosts(
      cursor({ sortType: 'POPULAR', size: 20 }),
    )
    expect(
      popular.dataBody.posts.contents.slice(-2).map(post => post.postId),
    ).toEqual([newer.dataBody.postId, older.dataBody.postId])

    const afterNewer = await source.getPosts(
      cursor({
        sortType: 'POPULAR',
        lastPostId: newer.dataBody.postId,
        lastLikeCount: 0,
        size: 1,
      }),
    )
    expect(afterNewer).toEqual({
      dataHeader: successHeader,
      dataBody: {
        board: null,
        posts: {
          contents: [
            {
              postId: older.dataBody.postId,
              memberId: older.dataBody.memberId,
              targetType: older.dataBody.targetType,
              targetCode: older.dataBody.targetCode,
              targetName: older.dataBody.targetName,
              title: older.dataBody.title,
              previewContent: older.dataBody.content,
              likeCount: older.dataBody.likeCount,
              commentCount: older.dataBody.commentCount,
              createdAt: older.dataBody.createdAt,
            },
          ],
          hasNext: false,
        },
      },
    })
  })

  it('삭제된 LATEST 커서 행 뒤에서도 postId 경계를 유지한다', async () => {
    const source = createCommunityMockSource()

    await source.deletePost(5)
    const response = await source.getPosts(
      cursor({
        lastPostId: 5,
        size: 2,
      }),
    )

    expect(response.dataBody.posts.contents.map(post => post.postId)).toEqual([
      4, 3,
    ])
    expect(response.dataBody.posts.hasNext).toBe(true)
  })

  it('POPULAR 커서 행의 좋아요 수가 바뀌어도 이전 tuple 경계를 유지한다', async () => {
    const source = createCommunityMockSource()

    await source.togglePostLike(2)
    const response = await source.getPosts(
      cursor({
        sortType: 'POPULAR',
        lastLikeCount: 16,
        lastPostId: 2,
        size: 2,
      }),
    )

    expect(response.dataBody.posts.contents.map(post => post.postId)).toEqual([
      5, 8,
    ])
    expect(response.dataBody.posts.hasNext).toBe(true)
  })

  it('ASC keyset은 LATEST postId와 POPULAR tuple의 다음 경계를 반환한다', async () => {
    const source = createCommunityMockSource()
    const latest = await source.getPosts(
      cursor({
        orderType: 'ASC',
        lastPostId: 3,
        size: 2,
      }),
    )
    const popular = await source.getPosts(
      cursor({
        sortType: 'POPULAR',
        orderType: 'ASC',
        lastLikeCount: 9,
        lastPostId: 8,
        size: 2,
      }),
    )

    expect(latest.dataBody.posts.contents.map(post => post.postId)).toEqual([
      4, 5,
    ])
    expect(popular.dataBody.posts.contents.map(post => post.postId)).toEqual([
      5, 2,
    ])
  })

  it('search와 liked 목록도 동일한 keyset 경계를 사용한다', async () => {
    const source = createCommunityMockSource()
    const first = await source.createPost({
      title: 'KEYSET 공통 검색',
      content: '첫 게시글',
    })
    const second = await source.createPost({
      title: 'KEYSET 공통 검색',
      content: '둘째 게시글',
    })

    const search = await source.searchPosts({
      ...cursor({
        lastPostId: second.dataBody.postId,
        size: 1,
      }),
      keyword: 'keyset',
    })
    const liked = await source.getLikedPosts(
      cursor({
        lastPostId: 7,
        size: 1,
      }),
    )

    expect(search.dataBody.posts.contents.map(post => post.postId)).toEqual([
      first.dataBody.postId,
    ])
    expect(liked.dataBody.posts.contents.map(post => post.postId)).toEqual([1])
  })

  it('제목과 본문을 대소문자 구분 없이 검색한다', async () => {
    const source = createCommunityMockSource()
    const response = await source.searchPosts({
      ...cursor(),
      keyword: 'PoP-UP',
    })

    expect(response).toEqual({
      dataHeader: successHeader,
      dataBody: {
        board: null,
        posts: {
          contents: [fixturePost(8), fixturePost(4)],
          hasNext: false,
        },
      },
    })
  })

  it('mock 회원이 좋아요한 글을 likedAt과 함께 반환한다', async () => {
    const source = createCommunityMockSource()
    const response = await source.getLikedPosts(cursor())

    expect(response).toEqual({
      dataHeader: successHeader,
      dataBody: {
        posts: {
          contents: [
            {
              ...fixturePost(7),
              likedAt: '2026-07-27T09:10:00.000Z',
            },
            {
              ...fixturePost(1),
              likedAt: '2026-07-27T08:40:00.000Z',
            },
          ],
          hasNext: false,
        },
      },
    })
  })

  it('factory 인스턴스와 immutable base fixture를 서로 격리한다', async () => {
    const sourceA = createCommunityMockSource()
    const sourceB = createCommunityMockSource()
    const basePostCount = communityMockFixtures.posts.length
    const baseLikeCount = fixturePost(2).likeCount

    await sourceA.createPost({
      title: 'A 전용 게시글',
      content: '다른 source에는 없어야 합니다.',
    })
    await sourceA.togglePostLike(2)

    const sourceAPosts = await sourceA.getPosts(cursor())
    const sourceBPosts = await sourceB.getPosts(cursor())

    expect(sourceAPosts.dataBody.posts.contents).toHaveLength(basePostCount + 1)
    expect(sourceBPosts.dataBody.posts.contents).toHaveLength(basePostCount)
    expect(
      sourceBPosts.dataBody.posts.contents.find(post => post.postId === 2)
        ?.likeCount,
    ).toBe(baseLikeCount)
    expect(communityMockFixtures.posts).toHaveLength(basePostCount)
    expect(fixturePost(2).likeCount).toBe(baseLikeCount)
    expect(Object.isFrozen(communityMockFixtures)).toBe(true)
    expect(Object.isFrozen(communityMockFixtures.posts)).toBe(true)
    expect(Object.isFrozen(communityMockFixtures.comments[0]?.replies)).toBe(
      true,
    )
  })

  it('게시글을 만들고 제목·본문만 수정한 뒤 관련 상태와 함께 삭제한다', async () => {
    const source = createCommunityMockSource()
    const created = await source.createPost({
      targetType: 'COMMERCIAL',
      targetCode: '3110008',
      title: ' 새 게시글 ',
      content: ' 새 본문 ',
    })

    expect(created.dataHeader).toEqual(successHeader)
    expect(created.dataBody).toEqual({
      postId: expect.any(Number),
      memberId: MOCK_COMMUNITY_MEMBER_ID,
      targetType: {
        code: 'COMMERCIAL',
        name: '상권',
        description: '서울시 상권 단위 게시판',
      },
      targetCode: '3110008',
      targetName: '강남역 상권',
      title: ' 새 게시글 ',
      content: ' 새 본문 ',
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
    expect(
      (await source.getPosts(cursor())).dataBody.posts.contents[0]?.postId,
    ).toBe(created.dataBody.postId)

    const updated = await source.updatePost(created.dataBody.postId, {
      title: ' 수정한 제목 ',
      content: ' 수정한 본문 ',
    })

    expect(updated.dataBody).toEqual({
      ...created.dataBody,
      title: ' 수정한 제목 ',
      content: ' 수정한 본문 ',
      updatedAt: expect.any(String),
    })

    expect(await source.deletePost(created.dataBody.postId)).toEqual({
      dataHeader: successHeader,
      dataBody: null,
    })
    await expect(source.getPost(created.dataBody.postId)).rejects.toThrow(
      `게시글 ${created.dataBody.postId}을 찾을 수 없습니다.`,
    )
  })

  it('지역 picker가 제공하는 모든 자치구 중 강동구 게시글을 생성한다', async () => {
    const source = createCommunityMockSource()
    const created = await source.createPost({
      targetType: 'DISTRICT',
      targetCode: '11740',
      title: '강동구 운영 이야기',
      content: '강동구 매장 운영 경험입니다.',
    })

    expect(created.dataBody).toMatchObject({
      targetType: {
        code: 'DISTRICT',
        name: '자치구',
      },
      targetCode: '11740',
      targetName: '강동구',
    })
  })

  it('mock 계층은 빈 값과 공백을 정규화하지 않고 payload 그대로 저장한다', async () => {
    const source = createCommunityMockSource()
    const created = await source.createPost({
      title: '  ',
      content: ' 본문 양끝 공백 ',
    })

    expect(created.dataBody.title).toBe('  ')
    expect(created.dataBody.content).toBe(' 본문 양끝 공백 ')
    expect(
      (await source.getPosts(cursor())).dataBody.posts.contents.find(
        post => post.postId === created.dataBody.postId,
      ),
    ).toMatchObject({
      title: '  ',
      previewContent: ' 본문 양끝 공백 ',
    })

    const updated = await source.updatePost(created.dataBody.postId, {
      title: '',
      content: ' ',
    })
    expect(updated.dataBody.title).toBe('')
    expect(updated.dataBody.content).toBe(' ')
    expect(
      (await source.getPosts(cursor())).dataBody.posts.contents.find(
        post => post.postId === created.dataBody.postId,
      ),
    ).toMatchObject({
      title: '',
      previewContent: ' ',
    })

    const comments = await source.createComment(created.dataBody.postId, {
      content: '  ',
    })
    expect(comments.dataBody.comments[0]?.content).toBe('  ')

    expect(
      await source.createReport({
        targetKind: 'POST',
        targetId: created.dataBody.postId,
        reason: '가'.repeat(501),
      }),
    ).toEqual({ dataHeader: successHeader, dataBody: null })
    expect(
      await source.createReport({
        targetKind: 'POST',
        targetId: created.dataBody.postId,
        reason: ' ',
      }),
    ).toEqual({ dataHeader: successHeader, dataBody: null })
  })

  it('거부된 부모 댓글 요청은 timestamp와 다음 commentId를 소비하지 않는다', async () => {
    const sourceWithRejectedRequests = createCommunityMockSource()
    const cleanSource = createCommunityMockSource()

    await expect(
      sourceWithRejectedRequests.createComment(1, {
        parentCommentId: 99999,
        content: '없는 부모 답글',
      }),
    ).rejects.toThrow('댓글 99999을 찾을 수 없습니다.')
    await expect(
      sourceWithRejectedRequests.createComment(1, {
        parentCommentId: 102,
        content: '2단계 답글',
      }),
    ).rejects.toThrow('답글에는 추가 답글을 작성할 수 없습니다.')

    const afterRejected = await sourceWithRejectedRequests.createComment(3, {
      content: '정상 댓글',
    })
    const clean = await cleanSource.createComment(3, {
      content: '정상 댓글',
    })

    expect(afterRejected).toEqual(clean)
  })

  it('게시글 좋아요를 토글하고 좋아요 목록을 함께 갱신한다', async () => {
    const source = createCommunityMockSource()
    const original = fixturePost(2)
    const originalDetail = fixtureDetail(2)

    const liked = await source.togglePostLike(2)
    expect(liked).toEqual({
      dataHeader: successHeader,
      dataBody: {
        postId: 2,
        liked: true,
        likeCount: original.likeCount + 1,
      },
    })

    const likedPosts = await source.getLikedPosts(cursor())
    expect(
      likedPosts.dataBody.posts.contents.find(post => post.postId === 2),
    ).toEqual({
      ...original,
      likeCount: original.likeCount + 1,
      likedAt: expect.any(String),
    })
    expect((await source.getPost(2)).dataBody).toEqual({
      ...originalDetail,
      likeCount: original.likeCount + 1,
      viewCount: originalDetail.viewCount + 1,
    })

    const unliked = await source.togglePostLike(2)
    expect(unliked.dataBody).toEqual({
      postId: 2,
      liked: false,
      likeCount: original.likeCount,
    })
    expect(
      (await source.getLikedPosts(cursor())).dataBody.posts.contents.some(
        post => post.postId === 2,
      ),
    ).toBe(false)
    expect((await source.getPost(2)).dataBody).toEqual({
      ...originalDetail,
      likeCount: original.likeCount,
      viewCount: originalDetail.viewCount + 2,
    })
  })

  it('좋아요와 댓글이 있는 게시글 삭제 시 연관 상태를 제거한다', async () => {
    const source = createCommunityMockSource()
    const comment = communityMockFixtures.comments.find(
      item => item.postId === 1,
    )

    await source.deletePost(1)

    expect(
      (await source.getPosts(cursor())).dataBody.posts.contents.some(
        post => post.postId === 1,
      ),
    ).toBe(false)
    expect(
      (await source.getLikedPosts(cursor())).dataBody.posts.contents.some(
        post => post.postId === 1,
      ),
    ).toBe(false)
    await expect(source.getPost(1)).rejects.toThrow(
      '게시글 1을 찾을 수 없습니다.',
    )
    await expect(source.getComments(1)).rejects.toThrow(
      '게시글 1을 찾을 수 없습니다.',
    )
    await expect(
      source.createReport({
        targetKind: 'POST',
        targetId: 1,
        reason: '삭제 후 신고',
      }),
    ).rejects.toThrow('게시글 1을 찾을 수 없습니다.')
    await expect(
      source.createReport({
        targetKind: 'COMMENT',
        targetId: comment?.commentId ?? 0,
        reason: '삭제 후 댓글 신고',
      }),
    ).rejects.toThrow(`댓글 ${comment?.commentId}을 찾을 수 없습니다.`)
  })

  it('최상위 댓글과 1단계 답글을 만들고 각각 삭제한다', async () => {
    const source = createCommunityMockSource()
    const topLevel = await source.createComment(3, {
      content: '첫 댓글입니다.',
    })
    const parent = topLevel.dataBody.comments[0]

    expect(parent).toEqual({
      commentId: expect.any(Number),
      postId: 3,
      memberId: MOCK_COMMUNITY_MEMBER_ID,
      content: '첫 댓글입니다.',
      likeCount: 0,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      replies: [],
    })

    const withReply = await source.createComment(3, {
      parentCommentId: parent?.commentId,
      content: '첫 답글입니다.',
    })
    const reply = withReply.dataBody.comments[0]?.replies[0]

    expect(reply).toEqual({
      commentId: expect.any(Number),
      postId: 3,
      memberId: MOCK_COMMUNITY_MEMBER_ID,
      parentCommentId: parent?.commentId,
      content: '첫 답글입니다.',
      likeCount: 0,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })

    await source.deleteComment(3, reply?.commentId ?? 0)
    expect((await source.getComments(3)).dataBody.comments[0]?.replies).toEqual(
      [],
    )

    await source.deleteComment(3, parent?.commentId ?? 0)
    expect(await source.getComments(3)).toEqual({
      dataHeader: successHeader,
      dataBody: { comments: [] },
    })
  })

  it('댓글과 답글의 좋아요 수를 같은 응답 계약으로 토글한다', async () => {
    const source = createCommunityMockSource()
    const comment = communityMockFixtures.comments[0]
    const reply = comment?.replies[0]

    if (!comment || !reply) {
      throw new Error('댓글 좋아요 테스트 fixture가 없습니다.')
    }

    expect(
      await source.toggleCommentLike(comment.postId, comment.commentId),
    ).toEqual({
      dataHeader: successHeader,
      dataBody: {
        commentId: comment.commentId,
        liked: true,
        likeCount: comment.likeCount + 1,
      },
    })
    expect(
      await source.toggleCommentLike(reply.postId, reply.commentId),
    ).toEqual({
      dataHeader: successHeader,
      dataBody: {
        commentId: reply.commentId,
        liked: true,
        likeCount: reply.likeCount + 1,
      },
    })

    const persisted = await source.getComments(comment.postId)
    expect(persisted.dataBody.comments[0]?.likeCount).toBe(
      comment.likeCount + 1,
    )
    expect(persisted.dataBody.comments[0]?.replies[0]?.likeCount).toBe(
      reply.likeCount + 1,
    )

    expect(
      await source.toggleCommentLike(comment.postId, comment.commentId),
    ).toEqual({
      dataHeader: successHeader,
      dataBody: {
        commentId: comment.commentId,
        liked: false,
        likeCount: comment.likeCount,
      },
    })
    expect(
      await source.toggleCommentLike(reply.postId, reply.commentId),
    ).toEqual({
      dataHeader: successHeader,
      dataBody: {
        commentId: reply.commentId,
        liked: false,
        likeCount: reply.likeCount,
      },
    })
    const restored = await source.getComments(comment.postId)
    expect(restored.dataBody.comments[0]?.likeCount).toBe(comment.likeCount)
    expect(restored.dataBody.comments[0]?.replies[0]?.likeCount).toBe(
      reply.likeCount,
    )
  })

  it('댓글과 답글 삭제가 요약·상세 commentCount를 함께 갱신한다', async () => {
    const source = createCommunityMockSource()
    const topLevel = await source.createComment(3, {
      content: '삭제할 최상위 댓글',
    })
    const parentId = topLevel.dataBody.comments[0]?.commentId ?? 0
    const withReply = await source.createComment(3, {
      parentCommentId: parentId,
      content: '삭제할 답글',
    })
    const replyId = withReply.dataBody.comments[0]?.replies[0]?.commentId ?? 0

    await source.deleteComment(3, replyId)
    expect(
      (await source.getPosts(cursor())).dataBody.posts.contents.find(
        post => post.postId === 3,
      )?.commentCount,
    ).toBe(1)
    expect((await source.getPost(3)).dataBody.commentCount).toBe(1)

    await source.deleteComment(3, parentId)
    expect(
      (await source.getPosts(cursor())).dataBody.posts.contents.find(
        post => post.postId === 3,
      )?.commentCount,
    ).toBe(0)
    expect((await source.getPost(3)).dataBody.commentCount).toBe(0)
  })

  it('유효한 게시글과 댓글의 중복 신고도 성공 envelope로 반환한다', async () => {
    const source = createCommunityMockSource()
    const comment = communityMockFixtures.comments[0]
    const postReport = {
      targetKind: 'POST' as const,
      targetId: 1,
      reason: '중복 홍보 게시글입니다.',
    }

    expect(await source.createReport(postReport)).toEqual({
      dataHeader: successHeader,
      dataBody: null,
    })
    expect(await source.createReport(postReport)).toEqual({
      dataHeader: successHeader,
      dataBody: null,
    })
    expect(
      await source.createReport({
        targetKind: 'COMMENT',
        targetId: comment?.commentId ?? 0,
        reason: '부적절한 댓글입니다.',
      }),
    ).toEqual({ dataHeader: successHeader, dataBody: null })
  })

  it('다른 mock 회원의 게시글·댓글·답글 변경을 거부한다', async () => {
    const source = createCommunityMockSource()

    await expect(
      source.updatePost(2, {
        title: '권한 없는 수정',
        content: '권한 없는 본문',
      }),
    ).rejects.toThrow('게시글 2을 수정할 권한이 없습니다.')
    await expect(source.deletePost(2)).rejects.toThrow(
      '게시글 2을 삭제할 권한이 없습니다.',
    )
    await expect(source.deleteComment(1, 101)).rejects.toThrow(
      '댓글 101을 삭제할 권한이 없습니다.',
    )
    await expect(source.deleteComment(7, 702)).rejects.toThrow(
      '댓글 702을 삭제할 권한이 없습니다.',
    )
  })

  it('존재하지 않는 게시글·댓글·신고 대상은 명확한 Error로 거부한다', async () => {
    const source = createCommunityMockSource()

    await expect(source.getPost(99999)).rejects.toThrow(
      '게시글 99999을 찾을 수 없습니다.',
    )
    await expect(
      source.updatePost(99999, { title: '수정', content: '본문' }),
    ).rejects.toThrow('게시글 99999을 찾을 수 없습니다.')
    await expect(source.deletePost(99999)).rejects.toThrow(
      '게시글 99999을 찾을 수 없습니다.',
    )
    await expect(source.togglePostLike(99999)).rejects.toThrow(
      '게시글 99999을 찾을 수 없습니다.',
    )
    await expect(source.getComments(99999)).rejects.toThrow(
      '게시글 99999을 찾을 수 없습니다.',
    )
    await expect(
      source.createComment(99999, { content: '댓글' }),
    ).rejects.toThrow('게시글 99999을 찾을 수 없습니다.')
    await expect(
      source.createComment(1, { parentCommentId: 99999, content: '답글' }),
    ).rejects.toThrow('댓글 99999을 찾을 수 없습니다.')
    await expect(source.deleteComment(1, 99999)).rejects.toThrow(
      '댓글 99999을 찾을 수 없습니다.',
    )
    await expect(source.toggleCommentLike(1, 99999)).rejects.toThrow(
      '댓글 99999을 찾을 수 없습니다.',
    )
    await expect(
      source.createReport({
        targetKind: 'POST',
        targetId: 99999,
        reason: '신고',
      }),
    ).rejects.toThrow('게시글 99999을 찾을 수 없습니다.')
    await expect(
      source.createReport({
        targetKind: 'COMMENT',
        targetId: 99999,
        reason: '신고',
      }),
    ).rejects.toThrow('댓글 99999을 찾을 수 없습니다.')
  })

  it('강남구·역삼1동·강남역 상권을 기존 추천 지역 타입 형태로 제공한다', () => {
    expect(communityMockLocations).toEqual({
      administrationsByDistrict: {
        '11680': [
          {
            administrationCode: '1168064000',
            administrationName: '역삼1동',
            centerLat: 37.499,
            centerLng: 127.036,
          },
        ],
      },
      commercialsByAdministration: {
        '1168064000': [
          {
            commercialCode: '3110008',
            commercialName: '강남역 상권',
            commercialClassificationCode: 'A',
            commercialClassificationName: '발달상권',
            centerLat: 37.498,
            centerLng: 127.028,
          },
        ],
      },
    })
  })
})
