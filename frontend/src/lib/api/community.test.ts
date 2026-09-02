import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import type {
  CommunityCommentCreateRequest,
  CommunityCommentLikeResponse,
  CommunityCommentsBody,
  CommunityCommentsResponse,
  CommunityCursorParams,
  CommunityLikedPostsBody,
  CommunityLikedPostsResponse,
  CommunityListParams,
  CommunityPostDetail,
  CommunityPostCreateRequest,
  CommunityPostDetailResponse,
  CommunityPostListBody,
  CommunityPostListResponse,
  CommunityPostSlice,
  CommunityPostSummary,
  CommunityPostUpdateRequest,
  CommunityReportCreateRequest,
  CommunitySearchParams,
  CommunityVoidResponse,
} from '@/types/community'
import {
  createCommunityComment,
  createCommunityPost,
  createCommunityReport,
  deleteCommunityComment,
  deleteCommunityPost,
  fetchCommunityComments,
  fetchCommunityPost,
  fetchCommunityPosts,
  fetchLikedCommunityPosts,
  searchCommunityPosts,
  toggleCommunityCommentLike,
  toggleCommunityPostLike,
  updateCommunityPost,
} from './community'

const response = {
  dataHeader: {
    success: true,
    resultCode: null,
    resultMessage: null,
  },
  dataBody: null,
}

type ExpectedMetadata = {
  code: string
  name: string
  description: string
} | null

type ExpectedPostSummary = {
  postId: string
  memberId: string
  targetType: ExpectedMetadata
  targetCode: string | null
  targetName: string | null
  title: string
  previewContent: string
  likeCount: number
  commentCount: number
  createdAt: string
}

type ExpectedFieldError = {
  code: string | null
  field: string
  message: string
}

type ExpectedApiResponse<T> = {
  dataHeader: {
    success: boolean
    resultCode: string | null
    // 검증 실패 응답은 `{ message, errors[] }` 객체다 (`src/types/api.ts` 참고).
    resultMessage:
      | string
      | { message?: string; errors?: ExpectedFieldError[] }
      | null
  }
  dataBody: T
}

type Simplify<T> = { [K in keyof T]: T[K] }

type ExpectedPostDetail = {
  postId: string
  memberId: string
  targetType: ExpectedMetadata
  targetCode: string | null
  targetName: string | null
  title: string
  content: string
  likeCount: number
  commentCount: number
  viewCount: number
  createdAt: string
  updatedAt: string
}

type ExpectedCommentsBody = {
  comments: Array<{
    commentId: string
    postId: string
    memberId: string
    content: string
    likeCount: number
    createdAt: string
    updatedAt: string
    replies: Array<{
      commentId: string
      postId: string
      memberId: string
      parentCommentId: string
      content: string
      likeCount: number
      createdAt: string
      updatedAt: string
    }>
  }>
}

type ExpectedLikedPostsBody = {
  posts: {
    contents: Array<ExpectedPostSummary & { likedAt: string }>
    hasNext: boolean
  }
}

type ExpectedPostListBody = {
  board: {
    targetType: ExpectedMetadata
    targetCode: string | null
    targetName: string | null
  } | null
  posts: {
    contents: ExpectedPostSummary[]
    hasNext: boolean
  }
}

describe('community API', () => {
  afterEach(() => vi.restoreAllMocks())

  /**
   * ⚠️ 이 핀은 **FE 가 스스로 어긋나는 것**만 잡는다. 백엔드가 계약을 바꿔도
   * 여기는 초록으로 남는다 — 실제로 그렇게 놓쳤다(BE 51458f57 이 식별자를
   * long -> String 으로 바꾼 뒤 일주일간 FE 는 number 인 채였다).
   * 백엔드 드리프트는 `docs/api/openapi/` 스냅샷 갱신으로만 드러난다.
   */
  it('matches the Swagger-required community type contract', () => {
    expectTypeOf<CommunityPostSummary>().toEqualTypeOf<ExpectedPostSummary>()
    expectTypeOf<CommunityPostDetail>().toEqualTypeOf<ExpectedPostDetail>()
    expectTypeOf<CommunityPostSlice>().toEqualTypeOf<{
      contents: CommunityPostSummary[]
      hasNext: boolean
    }>()
    expectTypeOf<Simplify<CommunityListParams>>().toEqualTypeOf<{
      sortType: 'LATEST' | 'POPULAR'
      orderType: 'ASC' | 'DESC'
      lastPostId: string
      lastLikeCount: number
      size: number
      targetType?: 'DISTRICT' | 'ADMINISTRATION' | 'COMMERCIAL'
      targetCode?: string
    }>()
    expectTypeOf<CommunityPostCreateRequest>().toEqualTypeOf<{
      targetType: 'DISTRICT' | 'ADMINISTRATION' | 'COMMERCIAL'
      targetCode: string
      title: string
      content: string
    }>()
    expectTypeOf<CommunityPostUpdateRequest>().toEqualTypeOf<{
      title: string
      content: string
    }>()
    expectTypeOf<CommunityCommentCreateRequest>().toEqualTypeOf<{
      parentCommentId?: string
      content: string
    }>()
    expectTypeOf<CommunityReportCreateRequest>().toEqualTypeOf<{
      targetKind: 'POST' | 'COMMENT'
      targetId: string
      reason: string
    }>()
    expectTypeOf<CommunityCursorParams>().toEqualTypeOf<{
      sortType: 'LATEST' | 'POPULAR'
      orderType: 'ASC' | 'DESC'
      lastPostId: string
      lastLikeCount: number
      size: number
    }>()
    expectTypeOf<Simplify<CommunitySearchParams>>().toEqualTypeOf<{
      sortType: 'LATEST' | 'POPULAR'
      orderType: 'ASC' | 'DESC'
      lastPostId: string
      lastLikeCount: number
      size: number
      keyword: string
    }>()
    expectTypeOf<CommunityCommentsBody>().toEqualTypeOf<ExpectedCommentsBody>()
    expectTypeOf<CommunityLikedPostsBody>().toEqualTypeOf<ExpectedLikedPostsBody>()
    expectTypeOf<CommunityPostListBody>().toEqualTypeOf<ExpectedPostListBody>()
    expectTypeOf<CommunityPostListResponse>().toEqualTypeOf<
      ExpectedApiResponse<ExpectedPostListBody>
    >()
    expectTypeOf<CommunityLikedPostsResponse>().toEqualTypeOf<
      ExpectedApiResponse<ExpectedLikedPostsBody>
    >()
    expectTypeOf<CommunityPostDetailResponse>().toEqualTypeOf<
      ExpectedApiResponse<ExpectedPostDetail>
    >()
    expectTypeOf<CommunityCommentsResponse>().toEqualTypeOf<
      ExpectedApiResponse<ExpectedCommentsBody>
    >()
    expectTypeOf<CommunityCommentLikeResponse>().toEqualTypeOf<
      ExpectedApiResponse<{
        commentId: string
        liked: boolean
        likeCount: number
      }>
    >()
    expectTypeOf<CommunityVoidResponse>().toEqualTypeOf<
      ExpectedApiResponse<null>
    >()
  })

  it('fetches community posts with the complete popular cursor', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })
    const params = {
      sortType: 'POPULAR' as const,
      orderType: 'DESC' as const,
      targetType: 'COMMERCIAL' as const,
      targetCode: '3110008',
      lastPostId: '42',
      lastLikeCount: 10,
      size: 20,
    }

    const result = await fetchCommunityPosts(params)

    expect(get).toHaveBeenCalledWith('/community/posts', { params })
    expect(result).toBe(response)
  })

  it('searches posts with the keyword cursor', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })
    const params = {
      keyword: '강남',
      sortType: 'LATEST' as const,
      orderType: 'DESC' as const,
      lastPostId: '42',
      lastLikeCount: 0,
      size: 10,
    }

    const result = await searchCommunityPosts(params)

    expect(get).toHaveBeenCalledWith('/community/posts/search', { params })
    expect(result).toBe(response)
  })

  it('fetches liked posts without unsupported target filters', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })
    const params: CommunityCursorParams = {
      sortType: 'POPULAR',
      orderType: 'DESC',
      lastPostId: '42',
      lastLikeCount: 10,
      size: 20,
    }

    const result = await fetchLikedCommunityPosts(params)

    expect(get).toHaveBeenCalledWith('/community/posts/liked', { params })
    expect(result).toBe(response)
  })

  it('fetches a post detail', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })

    const result = await fetchCommunityPost('1')

    expect(get).toHaveBeenCalledWith('/community/posts/1')
    expect(result).toBe(response)
  })

  it('creates, updates, and deletes a post with canonical paths', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: response })
    const patch = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValue({ data: response })
    const remove = vi
      .spyOn(apiClient, 'delete')
      .mockResolvedValue({ data: response })
    const createPayload: CommunityPostCreateRequest = {
      targetType: 'COMMERCIAL',
      targetCode: '3110008',
      title: '강남역 상권 분석',
      content: '본문',
    }
    const updatePayload: CommunityPostUpdateRequest = {
      title: '수정 제목',
      content: '수정 본문',
    }

    const created = await createCommunityPost(createPayload)
    const updated = await updateCommunityPost('1', updatePayload)
    const deleted = await deleteCommunityPost('1')

    expect(post).toHaveBeenCalledWith('/community/posts', createPayload)
    expect(patch).toHaveBeenCalledWith('/community/posts/1', updatePayload)
    expect(remove).toHaveBeenCalledWith('/community/posts/1')
    expect(created).toBe(response)
    expect(updated).toBe(response)
    expect(deleted).toBe(response)
  })

  it('toggles a post like', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: response })

    const result = await toggleCommunityPostLike('1')

    expect(post).toHaveBeenCalledWith('/community/posts/1/likes')
    expect(result).toBe(response)
  })

  it('fetches and creates comments', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: response })
    const payload: CommunityCommentCreateRequest = {
      parentCommentId: '2',
      content: '답글',
    }

    const comments = await fetchCommunityComments('1')
    const created = await createCommunityComment('1', payload)

    expect(get).toHaveBeenCalledWith('/community/posts/1/comments')
    expect(post).toHaveBeenCalledWith('/community/posts/1/comments', payload)
    expect(comments).toBe(response)
    expect(created).toBe(response)
  })

  it('toggles and deletes a comment with canonical paths', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: response })
    const remove = vi
      .spyOn(apiClient, 'delete')
      .mockResolvedValue({ data: response })

    const toggled = await toggleCommunityCommentLike('1', '2')
    const deleted = await deleteCommunityComment('1', '2')

    expect(post).toHaveBeenCalledWith('/community/posts/1/comments/2/likes')
    expect(remove).toHaveBeenCalledWith('/community/posts/1/comments/2')
    expect(toggled).toBe(response)
    expect(deleted).toBe(response)
  })

  it('creates a community report', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: response })
    const payload: CommunityReportCreateRequest = {
      targetKind: 'POST',
      targetId: '1',
      reason: '광고성 게시글입니다.',
    }

    const result = await createCommunityReport(payload)

    expect(post).toHaveBeenCalledWith('/community/reports', payload)
    expect(result).toBe(response)
  })
})
