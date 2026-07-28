# Community Swagger Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저장된 Swagger 계약에 맞는 공개 커뮤니티 목록·상세와 로그인 기반 글쓰기·좋아요·댓글·대댓글·신고 UX를 반응형으로 구현한다.

**Architecture:** 기존 BFF와 React Query를 유지하고, Swagger 계약 타입/API 함수와 순수 상태 유틸리티를 먼저 만든다. 페이지 컨테이너는 URL·쿼리·mutation을 조합하고, 목록·상세·댓글·글쓰기 뷰는 작은 표시 컴포넌트로 분리한다. 개발 환경의 `?mock=1`은 명시적인 데이터 소스를 선택하며 운영과 실제 API 실패에는 개입하지 않는다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, TanStack Query, styled-components, Axios, Zustand auth store, Vitest

---

## 실행 원칙

- 작업 위치: `/Users/seonghoho/Documents/projects/nowdoboss/.worktrees/bosspick-community`
- 브랜치: `feature/fe/community`
- API 정본: `frontend/docs/api/openapi/community.json`, `region-map.json`, `auth-member.json`, `endpoints.md`
- 백엔드, 패키지 버전, lockfile, 빌드·배포 설정은 변경하지 않는다.
- 사용자 요청 전에는 커밋, 푸시, PR을 만들지 않는다. 각 작업의 마지막은 커밋 대신 검증 체크포인트로 끝낸다.
- 테스트는 실패 확인 → 최소 구현 → 통과 확인 순서로 진행한다.
- 앱 로컬 서버는 `3100` 포트를 사용한다.

## 파일 구조

### 계약과 데이터

- Modify: `frontend/src/types/community.ts` — Swagger 요청·응답과 목록 커서 타입
- Modify: `frontend/src/lib/api/community.ts` — `/community/posts` 기반 실제 API 호출
- Create: `frontend/src/lib/api/community.test.ts` — 경로·query·payload 계약
- Modify: `frontend/src/lib/community.ts` — 날짜·본문·대상 라벨·메타데이터 포맷
- Create: `frontend/src/lib/community/community-state.ts` — URL 상태, 커서, query key, 로그인 URL, 입력 검증
- Create: `frontend/src/lib/community/community-state.test.ts`
- Create: `frontend/src/lib/community/adjacent-posts.ts` — 이전·다음 글 세션 저장
- Create: `frontend/src/lib/community/adjacent-posts.test.ts`
- Create: `frontend/src/lib/community/community-data-source.ts` — 실제/mock 공통 인터페이스
- Create: `frontend/src/lib/community/community-mock.ts` — 개발 전용 fixture와 세션 내 mutation
- Create: `frontend/src/lib/community/community-mock.test.ts`

### 화면

- Create: `frontend/src/components/community/community-feedback.tsx` — 스켈레톤·오류·빈 상태
- Create: `frontend/src/components/community/community-location-picker.tsx` — 선택형 자치구·행정동·상권
- Create: `frontend/src/components/community/community-report-dialog.tsx` — 게시글·댓글 신고
- Create: `frontend/src/components/community/community-list-view.tsx` — 피드 중심 표시 컴포넌트
- Create: `frontend/src/components/community/community-list-view.test.tsx`
- Modify: `frontend/src/components/community/community-list-page.tsx` — URL/쿼리/목록 컨테이너
- Create: `frontend/src/components/community/community-comment-thread.tsx` — 댓글·대댓글 표시와 액션
- Create: `frontend/src/components/community/community-detail-view.tsx` — 반응형 본문·사이드바·인접 글
- Create: `frontend/src/components/community/community-detail-view.test.tsx`
- Modify: `frontend/src/components/community/community-detail-page.tsx` — 상세 query/mutation 컨테이너
- Create: `frontend/src/components/community/community-editor-form.tsx` — 작성·수정 표시와 검증
- Create: `frontend/src/components/community/community-editor-form.test.tsx`
- Modify: `frontend/src/components/community/community-register-page.tsx` — 작성·수정 컨테이너

### 라우팅과 정리

- Modify: `frontend/middleware.ts`
- Modify: `frontend/middleware.test.ts`
- Modify: `frontend/app/(shell)/community/[communityId]/page.tsx`
- Delete: `frontend/src/data/community-categories.ts`

## Task 1: Swagger 커뮤니티 계약과 실제 API 모듈

**Files:**

- Modify: `frontend/src/types/community.ts`
- Modify: `frontend/src/lib/api/community.ts`
- Create: `frontend/src/lib/api/community.test.ts`

- [ ] **Step 1: API 경로와 파라미터 실패 테스트 작성**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import {
  createCommunityPost,
  fetchCommunityPosts,
  fetchCommunityComments,
  searchCommunityPosts,
  toggleCommunityCommentLike,
} from './community'

describe('community API', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses Swagger list params including popularity cursor', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: {} })
    await fetchCommunityPosts({
      sortType: 'POPULAR',
      orderType: 'DESC',
      lastPostId: 30,
      lastLikeCount: 12,
      size: 20,
    })
    expect(get).toHaveBeenCalledWith('/community/posts', {
      params: {
        sortType: 'POPULAR',
        orderType: 'DESC',
        lastPostId: 30,
        lastLikeCount: 12,
        size: 20,
      },
    })
  })

  it('uses the dedicated search endpoint', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: {} })
    await searchCommunityPosts({
      keyword: '성수',
      sortType: 'LATEST',
      orderType: 'DESC',
      lastPostId: 0,
      lastLikeCount: 0,
      size: 20,
    })
    expect(get).toHaveBeenCalledWith('/community/posts/search', {
      params: expect.objectContaining({ keyword: '성수' }),
    })
  })

  it('uses Swagger create and nested comment paths', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: {} })
    await createCommunityPost({
      targetType: 'COMMERCIAL',
      targetCode: '3110008',
      title: '강남역 이야기',
      content: '본문',
    })
    await toggleCommunityCommentLike(9, 4)
    await fetchCommunityComments(9)
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/community/posts',
      expect.objectContaining({ targetCode: '3110008' }),
    )
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/community/posts/9/comments/4/likes',
    )
  })
})
```

- [ ] **Step 2: 테스트가 구 API 경로 때문에 실패하는지 확인**

Run: `cd frontend && pnpm vitest run src/lib/api/community.test.ts`

Expected: FAIL — 새 함수 export가 없거나 `/community` 구 경로가 호출된다.

- [ ] **Step 3: Swagger 타입으로 `types/community.ts` 교체**

```ts
import type { ApiResponse } from '@/types/api'

export type CommunityTargetType =
  | 'DISTRICT'
  | 'ADMINISTRATION'
  | 'COMMERCIAL'
export type CommunitySortType = 'LATEST' | 'POPULAR'
export type CommunityOrderType = 'ASC' | 'DESC'

export type CommunityMetadata = {
  code: string
  name: string
  description: string
} | null

export type CommunityPostSummary = {
  postId: number
  memberId: number
  targetType: CommunityMetadata
  targetCode: string | null
  targetName: string | null
  title: string
  previewContent: string
  likeCount: number
  commentCount: number
  createdAt: string
}

export type CommunityPostDetail = {
  postId: number
  memberId: number
  targetType: CommunityMetadata
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

export type CommunityPostSlice<T = CommunityPostSummary> = {
  contents: T[]
  hasNext: boolean
}

export type CommunityPostListBody = {
  board: {
    targetType: CommunityMetadata
    targetCode: string
    targetName: string
  } | null
  posts: CommunityPostSlice
}

export type CommunityLikedPost = CommunityPostSummary & { likedAt: string }
export type CommunityLikedPostsBody = {
  posts: CommunityPostSlice<CommunityLikedPost>
}

export type CommunityReply = {
  commentId: number
  postId: number
  memberId: number
  parentCommentId: number
  content: string
  likeCount: number
  createdAt: string
  updatedAt: string
}

export type CommunityComment = Omit<CommunityReply, 'parentCommentId'> & {
  replies: CommunityReply[]
}

export type CommunityCommentsBody = { comments: CommunityComment[] }
export type CommunityLikeBody = {
  postId: number
  liked: boolean
  likeCount: number
}
export type CommunityCommentLikeBody = {
  commentId: number
  liked: boolean
  likeCount: number
}

export type CommunityPostCreateRequest = {
  targetType?: CommunityTargetType
  targetCode?: string
  title: string
  content: string
}
export type CommunityPostUpdateRequest = Pick<
  CommunityPostCreateRequest,
  'title' | 'content'
>
export type CommunityCommentCreateRequest = {
  parentCommentId?: number
  content: string
}
export type CommunityReportCreateRequest = {
  targetKind: 'POST' | 'COMMENT'
  targetId: number
  reason: string
}
export type CommunityCursorParams = {
  sortType: CommunitySortType
  orderType: CommunityOrderType
  lastPostId: number
  lastLikeCount: number
  size: number
}
export type CommunityListParams = CommunityCursorParams & {
  targetType?: CommunityTargetType
  targetCode?: string
}
export type CommunitySearchParams = CommunityCursorParams & {
  keyword: string
}

export type CommunityPostListResponse = ApiResponse<CommunityPostListBody>
export type CommunityLikedPostsResponse = ApiResponse<CommunityLikedPostsBody>
export type CommunityPostDetailResponse = ApiResponse<CommunityPostDetail>
export type CommunityCommentsResponse = ApiResponse<CommunityCommentsBody>
export type CommunityPostLikeResponse = ApiResponse<CommunityLikeBody>
export type CommunityCommentLikeResponse =
  ApiResponse<CommunityCommentLikeBody>
export type CommunityVoidResponse = ApiResponse<null>
```

- [ ] **Step 4: 실제 API 함수를 Swagger 경로로 구현**

`frontend/src/lib/api/community.ts`는 named function만 제공하고 컴포넌트 로직을 포함하지 않는다.

```ts
export const fetchCommunityPosts = async (params: CommunityListParams) =>
  (await apiClient.get<CommunityPostListResponse>('/community/posts', { params }))
    .data

export const searchCommunityPosts = async (
  params: CommunitySearchParams,
) =>
  (
    await apiClient.get<CommunityPostListResponse>(
      '/community/posts/search',
      { params },
    )
  ).data

export const fetchLikedCommunityPosts = async (
  params: CommunityCursorParams,
) =>
  (
    await apiClient.get<CommunityLikedPostsResponse>(
      '/community/posts/liked',
      { params },
    )
  ).data

export const fetchCommunityPost = async (postId: number) =>
  (
    await apiClient.get<CommunityPostDetailResponse>(
      `/community/posts/${postId}`,
    )
  ).data

export const createCommunityPost = async (
  payload: CommunityPostCreateRequest,
) =>
  (
    await apiClient.post<CommunityPostDetailResponse>(
      '/community/posts',
      payload,
    )
  ).data

export const updateCommunityPost = async (
  postId: number,
  payload: CommunityPostUpdateRequest,
) =>
  (
    await apiClient.patch<CommunityPostDetailResponse>(
      `/community/posts/${postId}`,
      payload,
    )
  ).data

export const deleteCommunityPost = async (postId: number) =>
  (
    await apiClient.delete<CommunityVoidResponse>(
      `/community/posts/${postId}`,
    )
  ).data

export const toggleCommunityPostLike = async (postId: number) =>
  (
    await apiClient.post<CommunityPostLikeResponse>(
      `/community/posts/${postId}/likes`,
    )
  ).data

export const fetchCommunityComments = async (postId: number) =>
  (
    await apiClient.get<CommunityCommentsResponse>(
      `/community/posts/${postId}/comments`,
    )
  ).data

export const createCommunityComment = async (
  postId: number,
  payload: CommunityCommentCreateRequest,
) =>
  (
    await apiClient.post<CommunityCommentsResponse>(
      `/community/posts/${postId}/comments`,
      payload,
    )
  ).data

export const deleteCommunityComment = async (
  postId: number,
  commentId: number,
) =>
  (
    await apiClient.delete<CommunityVoidResponse>(
      `/community/posts/${postId}/comments/${commentId}`,
    )
  ).data

export const toggleCommunityCommentLike = async (
  postId: number,
  commentId: number,
) =>
  (
    await apiClient.post<CommunityCommentLikeResponse>(
      `/community/posts/${postId}/comments/${commentId}/likes`,
    )
  ).data

export const createCommunityReport = async (
  payload: CommunityReportCreateRequest,
) =>
  (
    await apiClient.post<CommunityVoidResponse>(
      '/community/reports',
      payload,
    )
  ).data
```

- [ ] **Step 5: API 계약 테스트 통과 확인**

Run: `cd frontend && pnpm vitest run src/lib/api/community.test.ts`

Expected: PASS.

- [ ] **Step 6: 체크포인트**

Run: `git diff --check && git status --short`

Expected: 타입/API/test 파일만 변경되며 lockfile 변경이 없다.

## Task 2: URL 상태, 커서, 로그인 URL, 인접 글 유틸리티

**Files:**

- Modify: `frontend/src/lib/community.ts`
- Create: `frontend/src/lib/community/community-state.ts`
- Create: `frontend/src/lib/community/community-state.test.ts`
- Create: `frontend/src/lib/community/adjacent-posts.ts`
- Create: `frontend/src/lib/community/adjacent-posts.test.ts`

- [ ] **Step 1: 순수 상태 실패 테스트 작성**

```ts
describe('community list state', () => {
  it('parses supported values and removes region when keyword exists', () => {
    const state = parseCommunityListState(
      new URLSearchParams(
        'view=popular&keyword=성수&targetType=COMMERCIAL&targetCode=3110008',
      ),
    )
    expect(state).toEqual({
      view: 'popular',
      keyword: '성수',
      targetType: undefined,
      targetCode: undefined,
      mock: false,
    })
  })

  it('returns both cursors for a popular page', () => {
    expect(
      getCommunityNextPageParam(
        { contents: [{ postId: 7, likeCount: 13 }], hasNext: true },
        'popular',
      ),
    ).toEqual({ lastPostId: 7, lastLikeCount: 13 })
  })

  it('allows mock only outside production', () => {
    expect(isCommunityMockEnabled('1', 'development')).toBe(true)
    expect(isCommunityMockEnabled('1', 'production')).toBe(false)
  })

  it('builds a return-safe login href', () => {
    expect(getCommunityLoginHref('/community/4?mock=1')).toBe(
      '/login?redirect=%2Fcommunity%2F4%3Fmock%3D1',
    )
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && pnpm vitest run src/lib/community/community-state.test.ts src/lib/community/adjacent-posts.test.ts`

Expected: FAIL — 유틸리티 파일이 없다.

- [ ] **Step 3: 상태 타입과 정규화 함수 구현**

```ts
export type CommunityListView = 'latest' | 'popular' | 'liked'
export type CommunityListState = {
  view: CommunityListView
  keyword: string
  targetType?: CommunityTargetType
  targetCode?: string
  mock: boolean
}

export type CommunityViewer = {
  authenticated: boolean
  memberId: string | null
}

export const parseCommunityListState = (params: URLSearchParams) => {
  const rawView = params.get('view')
  const view: CommunityListView =
    rawView === 'popular' || rawView === 'liked' ? rawView : 'latest'
  const keyword = (params.get('keyword') ?? '').trim()
  const targetType = parseCommunityTargetType(params.get('targetType'))
  const targetCode = (params.get('targetCode') ?? '').trim() || undefined

  return {
    view,
    keyword,
    targetType: keyword ? undefined : targetType,
    targetCode: keyword ? undefined : targetCode,
    mock: params.get('mock') === '1',
  }
}

export const isCommunityMockEnabled = (
  value: string | null,
  nodeEnv = process.env.NODE_ENV,
) => nodeEnv !== 'production' && value === '1'

export const getCommunityLoginHref = (currentHref: string) =>
  `/login?redirect=${encodeURIComponent(currentHref)}`

export const createCommunityContextKey = (state: CommunityListState) =>
  JSON.stringify({
    view: state.view,
    keyword: state.keyword,
    targetType: state.targetType ?? null,
    targetCode: state.targetCode ?? null,
  })

export const createCommunityPostHref = (
  postId: number,
  contextKey: string,
  mock: boolean,
) => {
  const params = new URLSearchParams({ from: contextKey })
  if (mock) params.set('mock', '1')
  return `/community/${postId}?${params.toString()}`
}

export const getCommunityPageSlice = (
  response: CommunityPostListResponse | CommunityLikedPostsResponse,
  view: CommunityListView,
) =>
  view === 'liked'
    ? (response as CommunityLikedPostsResponse).dataBody.posts
    : (response as CommunityPostListResponse).dataBody.posts

export const validateCommunityDraft = (title: string, content: string) => {
  const normalizedTitle = title.trim()
  const normalizedContent = content.trim()
  if (!normalizedTitle) return '제목을 입력해 주세요.'
  if (normalizedTitle.length > 120) return '제목은 120자까지 입력할 수 있어요.'
  if (!normalizedContent) return '내용을 입력해 주세요.'
  if (normalizedContent.length > 5000)
    return '내용은 5,000자까지 입력할 수 있어요.'
  return null
}
```

`getCommunityNextPageParam`은 `hasNext=false` 또는 빈 `contents`면 `undefined`를 반환하고 인기순에서만 마지막 `likeCount`를 사용한다. query key는 `communityKeys.list(state)`, `detail(postId)`, `comments(postId)`, `related(targetType,targetCode)`, `liked()` 형태의 factory로 정의한다.

- [ ] **Step 4: 인접 글 저장·복원 구현**

```ts
export type AdjacentPostItem = { postId: number; title: string }
export type AdjacentPostState = {
  currentPostId: number
  contextKey: string
  previous: AdjacentPostItem | null
  next: AdjacentPostItem | null
}

const STORAGE_KEY = 'community-adjacent-posts'

export const saveAdjacentPosts = (
  storage: Pick<Storage, 'setItem'>,
  value: AdjacentPostState,
) => storage.setItem(STORAGE_KEY, JSON.stringify(value))

export const readAdjacentPosts = (
  storage: Pick<Storage, 'getItem'>,
  currentPostId: number,
  contextKey: string,
) => {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as AdjacentPostState) : null
    return parsed?.currentPostId === currentPostId &&
      parsed.contextKey === contextKey
      ? parsed
      : null
  } catch {
    return null
  }
}
```

테스트는 잘못된 JSON, 다른 게시글 ID, 다른 목록 context에서 `null`을 반환하는 경우까지 포함한다.

- [ ] **Step 5: 메타데이터 포맷을 카테고리 의존성 없이 변경**

`buildCommunityMetadataDescription(targetName, content)`은 대상명이 있으면 `"{targetName} 커뮤니티 게시글 · …"`을, 없으면 `"서울 창업 커뮤니티 게시글 · …"`을 반환한다. 기존 날짜·상대 시각·count 포맷은 유지한다.

- [ ] **Step 6: 테스트 통과 확인**

Run: `cd frontend && pnpm vitest run src/lib/community/community-state.test.ts src/lib/community/adjacent-posts.test.ts`

Expected: PASS.

## Task 3: 개발 전용 데이터 소스와 fixture

**Files:**

- Create: `frontend/src/lib/community/community-data-source.ts`
- Create: `frontend/src/lib/community/community-mock.ts`
- Create: `frontend/src/lib/community/community-mock.test.ts`

- [ ] **Step 1: mock 격리와 mutation 실패 테스트 작성**

```ts
describe('community mock source', () => {
  beforeEach(() => resetCommunityMock())

  it('returns Swagger-shaped filtered posts', async () => {
    const response = await communityMockSource.getPosts({
      sortType: 'LATEST',
      orderType: 'DESC',
      targetType: 'COMMERCIAL',
      targetCode: '3110008',
      lastPostId: 0,
      lastLikeCount: 0,
      size: 20,
    })
    expect(response.dataHeader.success).toBe(true)
    expect(response.dataBody.posts.contents.every(
      post => post.targetCode === '3110008',
    )).toBe(true)
  })

  it('creates a reply under the requested parent', async () => {
    const response = await communityMockSource.createComment(1, {
      parentCommentId: 10,
      content: '답글입니다',
    })
    expect(
      response.dataBody.comments[0]?.replies.some(
        reply => reply.content === '답글입니다',
      ),
    ).toBe(true)
  })

  it('toggles a post like and updates the liked list', async () => {
    const result = await communityMockSource.togglePostLike(2)
    const liked = await communityMockSource.getLikedPosts({
      sortType: 'LATEST',
      orderType: 'DESC',
      lastPostId: 0,
      lastLikeCount: 0,
      size: 20,
    })
    expect(result.dataBody.liked).toBe(true)
    expect(liked.dataBody.posts.contents.some(post => post.postId === 2)).toBe(
      true,
    )
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && pnpm vitest run src/lib/community/community-mock.test.ts`

Expected: FAIL — 데이터 소스가 없다.

- [ ] **Step 3: 공통 데이터 소스 인터페이스 작성**

```ts
export type CommunityDataSource = {
  getPosts: (params: CommunityListParams) => Promise<CommunityPostListResponse>
  searchPosts: (
    params: CommunitySearchParams,
  ) => Promise<CommunityPostListResponse>
  getLikedPosts: (
    params: CommunityCursorParams,
  ) => Promise<CommunityLikedPostsResponse>
  getPost: (postId: number) => Promise<CommunityPostDetailResponse>
  createPost: (
    payload: CommunityPostCreateRequest,
  ) => Promise<CommunityPostDetailResponse>
  updatePost: (
    postId: number,
    payload: CommunityPostUpdateRequest,
  ) => Promise<CommunityPostDetailResponse>
  deletePost: (postId: number) => Promise<CommunityVoidResponse>
  togglePostLike: (postId: number) => Promise<CommunityPostLikeResponse>
  getComments: (postId: number) => Promise<CommunityCommentsResponse>
  createComment: (
    postId: number,
    payload: CommunityCommentCreateRequest,
  ) => Promise<CommunityCommentsResponse>
  deleteComment: (
    postId: number,
    commentId: number,
  ) => Promise<CommunityVoidResponse>
  toggleCommentLike: (
    postId: number,
    commentId: number,
  ) => Promise<CommunityCommentLikeResponse>
  createReport: (
    payload: CommunityReportCreateRequest,
  ) => Promise<CommunityVoidResponse>
}

export const realCommunitySource: CommunityDataSource = {
  getPosts: fetchCommunityPosts,
  searchPosts: searchCommunityPosts,
  getLikedPosts: fetchLikedCommunityPosts,
  getPost: fetchCommunityPost,
  createPost: createCommunityPost,
  updatePost: updateCommunityPost,
  deletePost: deleteCommunityPost,
  togglePostLike: toggleCommunityPostLike,
  getComments: fetchCommunityComments,
  createComment: createCommunityComment,
  deleteComment: deleteCommunityComment,
  toggleCommentLike: toggleCommunityCommentLike,
  createReport: createCommunityReport,
}
```

- [ ] **Step 4: fixture와 mock source 구현**

fixture는 최소 8개 게시글을 포함한다.

- 서울 전체 글 2개
- 자치구 글 2개
- 행정동 글 2개
- 상권 글 2개
- 현재 mock 회원 `memberId=9001`의 글과 다른 회원 글
- 댓글, 1단계 대댓글, 좋아요 수, 빈 댓글 글

테스트와 정적 표시 컴포넌트가 같은 계약 데이터를 재사용할 수 있도록
`communityMockFixtures.posts`, `communityMockFixtures.details`,
`communityMockFixtures.comments`를 읽기 전용 값으로 export한다. mutation
state는 이 fixture를 `structuredClone`해 사용하므로 원본을 변경하지 않는다.

지역 선택 검증을 위해 다음 형태의 `communityMockLocations`도 export한다.

```ts
export const communityMockLocations = {
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
} as const
```

모든 응답은 다음 helper로 Swagger envelope를 유지한다.

```ts
const ok = <T>(dataBody: T): ApiResponse<T> => ({
  dataHeader: {
    success: true,
    resultCode: null,
    resultMessage: null,
  },
  dataBody,
})
```

목록은 target 필터, 최신/인기 정렬, 커서 이후 slice, `hasNext`를 계산한다. 검색은 제목과 본문을 대소문자 구분 없이 검사한다. mutation은 module-local state를 갱신하며 `resetCommunityMock()`이 초기 fixture deep copy로 복원한다.

- [ ] **Step 5: mock 테스트 통과 확인**

Run: `cd frontend && pnpm vitest run src/lib/community/community-mock.test.ts`

Expected: PASS.

## Task 4: 공개 라우트와 개발 mock 인증 경계

**Files:**

- Modify: `frontend/middleware.ts`
- Modify: `frontend/middleware.test.ts`

- [ ] **Step 1: 공개/보호/mock 실패 테스트 추가**

```ts
it.each(['/community/list', '/community/10'])(
  'keeps %s public',
  pathname => {
    expect(isProtectedPath(pathname)).toBe(false)
    const res = middleware(new NextRequest(new URL(`http://x${pathname}`)))
    expect(res.headers.get('location')).toBeNull()
  },
)

it('protects only the register subtree', () => {
  expect(isProtectedPath('/community/register')).toBe(true)
  expect(config.matcher).toContain('/community/register/:path*')
  expect(config.matcher).not.toContain('/community/:path*')
})

it('allows explicit community mock register outside production', () => {
  const req = new NextRequest(
    new URL('http://x/community/register?mock=1'),
  )
  const res = middleware(req)
  expect(res.headers.get('location')).toBeNull()
})
```

mock 허용 테스트는 `NODE_ENV`를 직접 재할당하지 않고 `shouldAllowCommunityMock(pathname, searchParams, nodeEnv)` 순수 함수로 development/production을 각각 검증한다.

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && pnpm vitest run middleware.test.ts`

Expected: FAIL — 현재 `/community` 전체가 보호된다.

- [ ] **Step 3: 보호 경로 축소**

```ts
export const PROTECTED_PATHS = [
  '/analysis/simulation',
  '/simulation',
  '/community/register',
  '/chatting',
  '/profile',
] as const

export const shouldAllowCommunityMock = (
  pathname: string,
  searchParams: URLSearchParams,
  nodeEnv = process.env.NODE_ENV,
) =>
  nodeEnv !== 'production' &&
  pathname.startsWith('/community/register') &&
  searchParams.get('mock') === '1'
```

middleware는 보호 경로 확인 후 mock 허용, 세션 확인, 로그인 redirect 순서로 처리한다. matcher는 `/community/register/:path*`만 포함한다.

- [ ] **Step 4: 미들웨어 테스트 통과 확인**

Run: `cd frontend && pnpm vitest run middleware.test.ts`

Expected: PASS.

## Task 5: 공통 상태 UI, 지역 선택, 신고 다이얼로그

**Files:**

- Create: `frontend/src/components/community/community-feedback.tsx`
- Create: `frontend/src/components/community/community-location-picker.tsx`
- Create: `frontend/src/components/community/community-report-dialog.tsx`

- [ ] **Step 1: 공통 컴포넌트의 공개 props 정의**

```ts
export type CommunityFeedbackProps = {
  kind: 'loading' | 'error' | 'empty'
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export type CommunityLocationValue = {
  targetType?: CommunityTargetType
  targetCode?: string
  targetName?: string
}

export type CommunityLocationPickerProps = {
  value: CommunityLocationValue
  mockEnabled: boolean
  disabled?: boolean
  onChange: (value: CommunityLocationValue) => void
}

export type CommunityReportDialogProps = {
  open: boolean
  targetKind: 'POST' | 'COMMENT'
  targetId: number
  pending: boolean
  errorMessage: string | null
  onClose: () => void
  onSubmit: (reason: string) => void
}
```

- [ ] **Step 2: 스켈레톤·오류·빈 상태 구현**

`loading`은 `aria-busy="true"`와 3개 skeleton row를, `error`는 `role="alert"`와 재시도 버튼을, `empty`는 원인별 제목·설명·선택 액션을 렌더링한다. 모든 색상과 radius는 기존 CSS variable을 사용한다.

- [ ] **Step 3: 계층형 지역 선택 구현**

자치구는 `districts` 정적 목록을 사용한다. 실제 모드는 `fetchAdministrations`와 `fetchCommercials`, mock 모드는 `communityMockLocations`를 사용한다.

선택 규칙:

- 모두 미선택: 서울 전체, target 없음
- 자치구만 선택: `DISTRICT`
- 행정동 선택: `ADMINISTRATION`
- 상권 선택: `COMMERCIAL`
- 상위 선택 변경: 하위 선택 초기화
- `disabled=true`: 기존 대상명을 읽기 전용으로 표시

각 query의 실패는 해당 select 아래에만 오류와 재시도 버튼을 표시한다.

- [ ] **Step 4: 신고 다이얼로그 구현**

다이얼로그는 `role="dialog"`, `aria-modal="true"`, 제목, 500자 textarea, 취소·신고 버튼을 제공한다. 빈 사유와 500자 초과는 submit하지 않으며 Escape와 backdrop으로 닫을 수 있다. pending 중에는 입력과 닫기를 막는다.

- [ ] **Step 5: 공통 컴포넌트 정적 검증**

Run: `cd frontend && pnpm typecheck`

Expected: PASS.

## Task 6: 피드 중심 커뮤니티 목록

**Files:**

- Create: `frontend/src/components/community/community-list-view.tsx`
- Create: `frontend/src/components/community/community-list-view.test.tsx`
- Modify: `frontend/src/components/community/community-list-page.tsx`

- [ ] **Step 1: 목록 표시 실패 테스트 작성**

```tsx
it('renders feed controls, target tags and mobile write action', () => {
  const markup = renderToStaticMarkup(
    <CommunityListView
      state={{ view: 'latest', keyword: '', mock: true }}
      posts={[communityMockFixtures.posts[0]]}
      status="ready"
      hasNextPage={false}
      isFetchingNextPage={false}
      writeHref="/community/register?mock=1"
      onSearch={() => undefined}
      onViewChange={() => undefined}
      onLocationChange={() => undefined}
      onPostOpen={() => undefined}
      onLoadMore={() => undefined}
      onRetry={() => undefined}
    />,
  )
  expect(markup).toContain('게시글 검색')
  expect(markup).toContain('최신')
  expect(markup).toContain('인기')
  expect(markup).toContain('좋아요한 글')
  expect(markup).toContain('성수역 골목상권')
  expect(markup).toContain('data-mobile-write-action="true"')
})
```

추가 테스트는 검색 빈 상태에 `검색어 초기화`, 지역 빈 상태에 `지역 필터 해제`, 좋아요 빈 상태에 `전체 글 보기`가 표시되는지 확인한다.

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && pnpm vitest run src/components/community/community-list-view.test.tsx`

Expected: FAIL — 표시 컴포넌트가 없다.

- [ ] **Step 3: `CommunityListView` 구현**

구조는 다음 순서를 고정한다.

```tsx
<Page>
  <Hero>
    <HeroCopy />
    <WriteLink href={writeHref}>게시글 작성하기</WriteLink>
  </Hero>
  <Controls>
    <SearchForm />
    <ViewTabs aria-label="게시글 보기" />
    <CommunityLocationPicker />
    {state.keyword ? <SearchScopeNotice /> : null}
  </Controls>
  <Feed aria-live="polite">
    <CommunityFeedbackOrPostCards />
    <LoadMoreButtonOrNull />
  </Feed>
  <MobileWriteLink data-mobile-write-action="true" href={writeHref} />
</Page>
```

카드는 대상 태그, 제목, `previewContent`, `사장님`, 상대 시각, 좋아요·댓글 수만 표시한다. 이미지, 카테고리, 조회 수는 표시하지 않는다. breakpoint `640px` 이하에서 모바일 고정 글쓰기 버튼을 노출하고 페이지 하단 padding으로 버튼과 내용이 겹치지 않게 한다.

- [ ] **Step 4: 목록 컨테이너를 URL·React Query로 재작성**

`useSearchParams`를 `URLSearchParams`로 복사해 `parseCommunityListState`를 사용한다. queryFn 선택은 다음과 같다.

```ts
if (state.view === 'liked') return source.getLikedPosts(params)
if (state.keyword) return source.searchPosts(searchParams)
return source.getPosts(params)
```

- query key는 URL 상태 전체와 mock 여부를 포함한다.
- 좋아요한 글 클릭 시 실제 비로그인은 현재 목록 URL을 포함한 로그인 URL로 이동한다.
- mock 모드는 `memberId=9001` viewer로 처리한다.
- 검색 submit은 `keyword`를 set하고 `targetType`, `targetCode`를 delete한다.
- 지역 선택은 `keyword`를 delete하고 target query를 set한다.
- 카드 클릭 전 현재 평탄화 목록의 이전·다음을 `sessionStorage`에 저장한다.
- 카드 상세 URL에는 같은 `contextKey`를 `from` 쿼리로 넣는다. 상세는
  `from`이 없거나 세션 값과 다르면 이전·다음을 숨긴다.
- 상세 링크와 글쓰기 링크는 mock 모드에서 `mock=1`을 유지한다.
- 중복 `postId`는 첫 항목만 유지한다.

- [ ] **Step 5: 목록 테스트 통과 확인**

Run: `cd frontend && pnpm vitest run src/components/community/community-list-view.test.tsx src/lib/community/community-state.test.ts`

Expected: PASS.

## Task 7: 반응형 상세, 댓글·대댓글·좋아요·신고

**Files:**

- Create: `frontend/src/components/community/community-comment-thread.tsx`
- Create: `frontend/src/components/community/community-detail-view.tsx`
- Create: `frontend/src/components/community/community-detail-view.test.tsx`
- Modify: `frontend/src/components/community/community-detail-page.tsx`

- [ ] **Step 1: 상세 반응형 구조 실패 테스트 작성**

```tsx
it('renders article, regional sidebar, comments and adjacent navigation', () => {
  const markup = renderToStaticMarkup(
    <CommunityDetailView
      post={communityMockFixtures.details[0]}
      relatedPosts={[communityMockFixtures.posts[1]]}
      comments={communityMockFixtures.comments}
      adjacent={{
        currentPostId: 1,
        contextKey: 'latest',
        previous: { postId: 2, title: '이전 글' },
        next: { postId: 3, title: '다음 글' },
      }}
      viewer={{ authenticated: true, memberId: '9001' }}
      editHref="/community/register?postId=1&mock=1"
      postLikeState={null}
      status="ready"
      commentsStatus="ready"
      handlers={{
        onRequireLogin: () => undefined,
        onTogglePostLike: () => undefined,
        onCreateComment: () => undefined,
        onCreateReply: () => undefined,
        onToggleCommentLike: () => undefined,
        onDeleteComment: () => undefined,
        onOpenReport: () => undefined,
        onDeletePost: () => undefined,
      }}
    />,
  )
  expect(markup).toContain('data-community-article="true"')
  expect(markup).toContain('data-community-region-sidebar="true"')
  expect(markup).toContain('이전 글')
  expect(markup).toContain('다음 글')
  expect(markup).toContain('답글')
  expect(markup).toContain('신고')
})
```

스타일 테스트는 `@media (min-width: 768px)`에서 2열 grid가 생기고 기본은 단일 컬럼인지 `ServerStyleSheet`로 확인한다. `adjacent=null`이면 이전·다음 문자열이 없어야 한다.

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && pnpm vitest run src/components/community/community-detail-view.test.tsx`

Expected: FAIL — 새 상세 뷰가 없다.

- [ ] **Step 3: 댓글 스레드 구현**

`CommunityCommentThread`는 다음 상태를 내부에 둔다.

- 새 댓글 입력
- 답글 대상 commentId
- 답글 입력
- 댓글별 토글 응답 이후 liked 상태

작성자 표시는 모두 `사장님`이다. 본인 여부는 `String(memberId) === viewer.memberId`로 판단한다. 대댓글은 한 단계만 들여쓰고 대댓글에 다시 답글 버튼을 제공하지 않는다. 비로그인 액션은 `onRequireLogin`, 본인 댓글 삭제는 `onDeleteComment`, 신고는 `onOpenReport`를 호출한다.

표시 컴포넌트의 callback props는 required로 유지해 컨테이너가 인증,
mutation, 신고 처리를 빠뜨리면 TypeScript가 실패하게 한다.

- [ ] **Step 4: 상세 표시 컴포넌트 구현**

기본 구조:

```tsx
<Page>
  <BackLink />
  <ResponsiveLayout>
    <MainColumn>
      <Article data-community-article="true" />
      <OwnerActionsOrNull />
      <PostActions />
      <CommunityCommentThread />
      {adjacent ? <AdjacentNavigation /> : null}
    </MainColumn>
    <RegionalSidebar data-community-region-sidebar="true" />
  </ResponsiveLayout>
  <CommunityReportDialog />
</Page>
```

- 모바일 기본 단일 컬럼
- `min-width: 768px`에서 `minmax(0, 1fr) 300px`
- sidebar 관련 글 실패는 sidebar notice만 표시
- 게시글 최초 like state는 `null`이고 중립 heart로 표시
- viewer가 작성자면 수정 링크와 삭제 버튼을 표시
- mock/실제 query parameter는 모든 내부 링크에 보존
- 댓글 뒤에 이전·다음 글을 배치

- [ ] **Step 5: 상세 컨테이너 query/mutation 구현**

동시에 실행할 query:

- `source.getPost(postId)`
- `source.getComments(postId)`
- detail 성공 후 target이 있으면 `source.getPosts({targetType,targetCode,size:5,...})`

mutation:

- 게시글 좋아요: 응답 `liked`, `likeCount`로 detail cache 갱신
- 댓글 좋아요: 응답 count로 comments cache 갱신
- 댓글/대댓글 작성: 반환된 전체 comments body로 cache 교체
- 댓글 삭제: comments query invalidate
- 신고: 성공 후 다이얼로그 닫고 성공 문구
- 본인 게시글 삭제: 성공 후 `/community/list`로 이동

컨테이너는 `String(post.memberId) === viewer.memberId`일 때만
`/community/register?postId={postId}` 수정 링크를 전달하며 mock 모드에서는
`mock=1`을 함께 유지한다.

실제 비로그인은 `getCommunityLoginHref(currentHref)`로 이동한다. mock viewer는 인증된 것으로 처리한다. API envelope가 `success=false`면 `getApiMessage`를 mutation 오류로 표시한다.

- [ ] **Step 6: 상세 테스트 통과 확인**

Run: `cd frontend && pnpm vitest run src/components/community/community-detail-view.test.tsx src/lib/community/adjacent-posts.test.ts`

Expected: PASS.

## Task 8: 작성·수정 폼, 메타데이터, 레거시 정리

**Files:**

- Create: `frontend/src/components/community/community-editor-form.tsx`
- Create: `frontend/src/components/community/community-editor-form.test.tsx`
- Modify: `frontend/src/components/community/community-register-page.tsx`
- Modify: `frontend/app/(shell)/community/[communityId]/page.tsx`
- Delete: `frontend/src/data/community-categories.ts`

- [ ] **Step 1: 작성 폼 실패 테스트 작성**

```tsx
it('renders required location, limits and disabled image control', () => {
  const markup = renderToStaticMarkup(
    <CommunityEditorForm
      mode="create"
      initialValue={{ title: '', content: '', location: {} }}
      mockEnabled
      pending={false}
      errorMessage={null}
      onCancel={() => undefined}
      onSubmit={() => undefined}
    />,
  )
  expect(markup).toContain('지역·상권 (필수)')
  expect(markup).toContain('maxLength="120"')
  expect(markup).toContain('maxLength="5000"')
  expect(markup).toContain('이미지 첨부')
  expect(markup).toContain('준비 중')
  expect(markup).toContain('disabled')
})

it('shows the existing target read-only in edit mode', () => {
  const markup = renderToStaticMarkup(
    <CommunityEditorForm
      mode="edit"
      initialValue={{
        title: '제목',
        content: '본문',
        location: {
          targetType: 'COMMERCIAL',
          targetCode: '3110008',
          targetName: '강남역 상권',
        },
      }}
      mockEnabled={false}
      pending={false}
      errorMessage={null}
      onCancel={() => undefined}
      onSubmit={() => undefined}
    />,
  )
  expect(markup).toContain('강남역 상권')
  expect(markup).toContain('지역은 수정할 수 없어요')
})
```

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && pnpm vitest run src/components/community/community-editor-form.test.tsx`

Expected: FAIL — 폼 컴포넌트가 없다.

- [ ] **Step 3: 한 화면 작성 폼 구현**

폼은 `CommunityLocationPicker`, 제목 input, 본문 textarea, 비활성 이미지 버튼, 글자 수, 취소·게시 버튼을 렌더링한다.

```ts
const handleSubmit = (event: FormEvent) => {
  event.preventDefault()
  const error = validateCommunityDraft(title, content)
  if (error) {
    setValidationMessage(error)
    return
  }
  onSubmit({
    title: title.trim(),
    content: content.trim(),
    location,
  })
}
```

수정 모드에서는 picker를 읽기 전용으로 렌더링하고 mutation payload에서 target을 제외한다. pending 중 중복 제출을 막고 입력값은 mutation 실패 후 유지한다.

- [ ] **Step 4: 작성·수정 컨테이너 재작성**

- `postId` query가 유효한 양수면 수정 모드
- 수정 모드에서 `source.getPost(postId)` 조회
- 생성은 required target과 title/content 전송
- 수정은 title/content만 전송
- 성공 응답의 `postId`로 `/community/{postId}` 이동
- mock 모드에서는 링크와 이동 URL에 `mock=1` 유지
- 실제 비로그인은 middleware가 로그인으로 redirect

- [ ] **Step 5: 상세 메타데이터를 새 응답으로 변경**

`generateMetadata`는 `fetchCommunityPost`를 사용하고 다음처럼 호출한다.

```ts
description: buildCommunityMetadataDescription(
  detail.targetName,
  detail.content,
)
```

API 실패 fallback과 유효하지 않은 ID의 `notFound()` 동작은 유지한다.

- [ ] **Step 6: 레거시 카테고리 파일과 import 제거**

Run: `rg -n 'community-categories|CommunityCategory|communityId|writerNickname|readCount|firebase/upload|community/popular' frontend/src frontend/app`

Expected: 새 계약과 무관한 `communityId` route param 이름 외에는 레거시 커뮤니티 타입·API 참조가 없다.

`frontend/src/data/community-categories.ts`를 삭제하고 `frontend/src/lib/community.ts`의 category import를 제거한다.

- [ ] **Step 7: 폼 테스트 통과 확인**

Run: `cd frontend && pnpm vitest run src/components/community/community-editor-form.test.tsx`

Expected: PASS.

## Task 9: 전체 회귀 검증과 브라우저 QA

**Files:**

- Modify only if checks expose a community-scoped defect.

- [ ] **Step 1: 변경 파일 포맷**

Run:

```bash
cd frontend
pnpm prettier --write \
  middleware.ts middleware.test.ts \
  'app/(shell)/community/[communityId]/page.tsx' \
  src/types/community.ts \
  src/lib/api/community.ts src/lib/api/community.test.ts \
  src/lib/community.ts src/lib/community \
  src/components/community
```

Expected: 지정한 커뮤니티 관련 파일만 포맷된다.

- [ ] **Step 2: 커뮤니티 집중 테스트**

Run:

```bash
cd frontend
pnpm vitest run \
  middleware.test.ts \
  src/lib/api/community.test.ts \
  src/lib/community/community-state.test.ts \
  src/lib/community/adjacent-posts.test.ts \
  src/lib/community/community-mock.test.ts \
  src/components/community/community-list-view.test.tsx \
  src/components/community/community-detail-view.test.tsx \
  src/components/community/community-editor-form.test.tsx
```

Expected: 모든 집중 테스트 PASS.

- [ ] **Step 3: 전체 자동 검증**

Run:

```bash
cd frontend
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: 모든 명령 exit code 0. 실패 시 기존 실패인지 변경으로 인한 실패인지 구분하고 커뮤니티 범위 안에서만 수정한다.

- [ ] **Step 4: 3100 포트 개발 서버 실행**

Run: `cd frontend && pnpm dev -- --port 3100`

Expected: `http://localhost:3100`에서 Next.js ready. 3000 포트를 사용하지 않는다.

- [ ] **Step 5: mock 정상 상태 브라우저 검증**

확인 URL:

- `http://localhost:3100/community/list?mock=1`
- `http://localhost:3100/community/list?mock=1&view=popular`
- `http://localhost:3100/community/list?mock=1&view=liked`
- `http://localhost:3100/community/list?mock=1&keyword=성수`
- `http://localhost:3100/community/1?mock=1`
- `http://localhost:3100/community/register?mock=1`

뷰포트:

- 모바일 390×844
- 태블릿 768×1024
- 데스크톱 1440×1000

검증:

- 목록 A안 정보 위계와 모바일 고정 글쓰기
- 검색 시 지역 필터 해제 안내
- 최신/인기/좋아요 목록과 더 보기
- 상세 모바일 단일 컬럼, 태블릿 이상 sidebar
- 목록 진입 상세의 이전·다음, 직접 진입 시 숨김
- 게시글/댓글 좋아요, 댓글·대댓글, 삭제·신고
- 작성·수정과 비활성 이미지
- 키보드 focus, dialog Escape, 44px 이상 모바일 action target

- [ ] **Step 6: 실제 API 오류와 비로그인 검증**

확인 URL:

- `http://localhost:3100/community/list`
- `http://localhost:3100/community/1`
- `http://localhost:3100/community/register`

백엔드가 꺼진 상태에서 목록·상세·댓글의 오류 경계와 재시도가 표시되어야 한다. 목록·상세는 로그인 없이 라우트가 열리고, register와 로그인 필요 액션은 `/login?redirect=...`로 이동해야 한다.

- [ ] **Step 7: 최종 변경 범위 확인**

Run:

```bash
git status --short
git diff --check
git diff --stat
git diff -- frontend/package.json frontend/pnpm-lock.yaml
```

Expected:

- 백엔드 파일 변경 없음
- `frontend/package.json`, `frontend/pnpm-lock.yaml` 변경 없음
- 빌드·배포 설정 변경 없음
- 커뮤니티, 미들웨어, 테스트, 승인된 문서만 변경
- 커밋·푸시·PR 없음
