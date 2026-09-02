import type { ApiResponse } from '@/types/api'

/**
 * 커뮤니티 식별자 — **문자열이다. 절대 `Number(...)` 로 바꾸지 않는다.**
 *
 * 게시글·댓글·회원 id 는 Snowflake(`(timestamp - epoch) << 22`)라 현재 약 7.5e17 이고,
 * `Number.MAX_SAFE_INTEGER`(약 9.0e15)를 두 자릿수 넘는다. 숫자로 파싱하면 뒷자리가
 * 조용히 날아가 서로 다른 글이 같은 id 로 보인다 — 오류가 아니라 오염이라 추적이 어렵다.
 * 백엔드도 같은 이유로 응답 식별자를 문자열로 내린다(BE 51458f57).
 *
 * ⚠️ **경로·쿼리·요청 본문은 백엔드가 아직 `long` 으로 받는다.** 경로와 쿼리는 문자열을
 * 그대로 URL 에 넣으면 되므로 문제없다(JS 숫자를 거치지 않는다). 요청 본문의
 * `parentCommentId`·`targetId` 도 문자열로 보내고 Jackson 의 문자열→숫자 강제 변환에
 * 기댄다 — 여기서 `Number(...)` 를 쓰면 그게 바로 정밀도 손실이다.
 *
 * `bookmarkId`(`types/bookmark.ts`)가 같은 이유로 먼저 문자열이 됐다.
 */
export type CommunityId = string

export type CommunityTargetType = 'DISTRICT' | 'ADMINISTRATION' | 'COMMERCIAL'

export type CommunitySortType = 'LATEST' | 'POPULAR'

export type CommunityOrderType = 'ASC' | 'DESC'

export type CommunityMetadata = {
  code: string
  name: string
  description: string
} | null

export type CommunityPostSummary = {
  postId: CommunityId
  memberId: CommunityId
  targetType: CommunityMetadata
  targetCode: string | null
  targetName: string | null
  title: string
  previewContent: string
  likeCount: number
  commentCount: number
  createdAt: string
  /** 첨부 이미지 첫 장. 첨부가 없으면 null 이다. */
  thumbnailUrl: string | null
}

/**
 * 게시글에 붙은 이미지 한 장.
 *
 * `imageKey` 는 **서버가 생성한 오브젝트 키**다(`{prefix}/{memberId}/{yyyy}/{MM}/{uuid}.{ext}`).
 * 수정 요청에 그대로 되돌려 보내야 하는 값이라 화면이 들고 있어야 한다 — 자세한 이유는
 * `src/lib/community/post-images.ts` 를 볼 것.
 */
export type CommunityPostImage = {
  imageKey: string
  imageUrl: string
  sortOrder: number
}

/** `POST /community/posts/images` 응답 항목. 아직 게시글에 연결되지 않은 키다. */
export type CommunityPostImageUpload = {
  imageKey: string
  imageUrl: string
}

export type CommunityPostDetail = {
  postId: CommunityId
  memberId: CommunityId
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
  /** 첨부 이미지. `sortOrder` 오름차순이 노출 순서다. */
  images: CommunityPostImage[]
}

export type CommunityPostSlice<T = CommunityPostSummary> = {
  contents: T[]
  hasNext: boolean
}

export type CommunityBoardTarget = {
  targetType: CommunityMetadata
  targetCode: string | null
  targetName: string | null
}

export type CommunityPostListBody = {
  board: CommunityBoardTarget | null
  posts: CommunityPostSlice<CommunityPostSummary>
}

export type CommunityLikedPost = CommunityPostSummary & {
  likedAt: string
}

export type CommunityLikedPostsBody = {
  posts: CommunityPostSlice<CommunityLikedPost>
}

export type CommunityReply = {
  commentId: CommunityId
  postId: CommunityId
  memberId: CommunityId
  parentCommentId: CommunityId
  content: string
  likeCount: number
  createdAt: string
  updatedAt: string
}

export type CommunityComment = {
  commentId: CommunityId
  postId: CommunityId
  memberId: CommunityId
  content: string
  likeCount: number
  createdAt: string
  updatedAt: string
  replies: CommunityReply[]
}

export type CommunityCommentsBody = {
  comments: CommunityComment[]
}

export type CommunityLikeBody = {
  postId: CommunityId
  liked: boolean
  likeCount: number
}

export type CommunityCommentLikeBody = {
  commentId: CommunityId
  liked: boolean
  likeCount: number
}

export type CommunityPostCreateRequest = {
  targetType: CommunityTargetType
  targetCode: string
  title: string
  content: string
  /** 첨부 이미지 키. **배열 순서가 노출 순서**가 된다. 최대 5장. */
  imageKeys: string[]
}

export type CommunityPostUpdateRequest = {
  title: string
  content: string
  /**
   * **「수정 후 남길 목록」이다. 「추가할 목록」이 아니다.**
   *
   * 백엔드 `CommunityPostImageProcessor.replaceImages` 는 기존 이미지 중 이 목록에 없는
   * 것을 연결 해제하고 파일까지 지운다. 그리고 `normalize(null)` 이 **빈 목록**을 돌려주므로
   * 이 필드를 **빼고 보내면 첨부 이미지가 전부 삭제된다.** 제목만 고쳐도 그렇다.
   *
   * 그래서 선택 필드가 아니다 — 타입에서 강제해 "깜빡 빠뜨림"을 컴파일 단계에서 막는다.
   */
  imageKeys: string[]
}

export type CommunityCommentCreateRequest = {
  parentCommentId?: CommunityId
  content: string
}

export type CommunityReportCreateRequest = {
  targetKind: 'POST' | 'COMMENT'
  targetId: CommunityId
  reason: string
}

export type CommunityCursorParams = {
  sortType: CommunitySortType
  orderType: CommunityOrderType
  lastPostId: CommunityId
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

/**
 * 상권 비교 게시글 초안 (`POST /community/posts/drafts/commercial-comparisons`).
 *
 * 비교 결과를 읽은 사람이 그대로 글을 쓸 수 있도록 백엔드가 제목·본문을 만들어 준다.
 * 초안은 **글쓰기 화면을 채우는 재료일 뿐**이고, 저장은 기존
 * `CommunityPostCreateRequest` 로 한다.
 */
export type CommunityComparisonDraftRequest = {
  targetType: CommunityTargetType
  targetCode: string
  leftCommercialCode: string
  rightCommercialCode: string
  serviceCode: string
  periodCode: string
}

/**
 * ⚠️ 응답의 `analysisType`·`analysisRefCode`·`analysisRefName`·`analysisSnapshotKey` 를
 * **일부러 받지 않는다.** 게시글 저장(`CommunityPostCreateRequest`)도 조회
 * (`CommunityPostDetail`)도 그 필드를 갖고 있지 않아 **보낼 곳이 없다** — 백엔드 쪽
 * 절반이 아직 뚫려 있지 않다. 타입에 두면 "쓰이는 줄" 알고 배선하다 조용히 버려진다.
 * 계약이 갖춰지면 그때 함께 넣는다(`commercial-comparison.ts` 의 `winnerSide` 와 같은 처리).
 */
export type CommunityComparisonDraft = {
  targetType: CommunityMetadata
  targetCode: string | null
  targetName: string | null
  title: string
  content: string
}

export type CommunityPostListResponse = ApiResponse<CommunityPostListBody>
export type CommunityLikedPostsResponse = ApiResponse<CommunityLikedPostsBody>
export type CommunityPostDetailResponse = ApiResponse<CommunityPostDetail>
export type CommunityPostLikeResponse = ApiResponse<CommunityLikeBody>
export type CommunityCommentsResponse = ApiResponse<CommunityCommentsBody>
export type CommunityCommentLikeResponse = ApiResponse<CommunityCommentLikeBody>
export type CommunityVoidResponse = ApiResponse<null>
export type CommunityComparisonDraftResponse =
  ApiResponse<CommunityComparisonDraft>
