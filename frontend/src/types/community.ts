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

/**
 * 인기순 기간(#531, BE #472). 작성 시각 기준 롤링 기간이다 — `WEEK` 최근 7일 · `MONTH` 최근 30일 ·
 * `ALL` 전체. 서버 기본값은 `WEEK` 라 **생략은 전체 기간이 아니다.** 라벨·URL 해석은
 * `lib/community/popular-period.ts`.
 */
export type CommunityPopularPeriod = 'WEEK' | 'MONTH' | 'ALL'

export type CommunityMetadata = {
  code: string
  name: string
  description: string
} | null

/**
 * 게시글 말머리 code(#529, BE #470). 요청·URL 에는 이 네 값만 싣는다(대문자). 표시명·URL 해석은
 * `lib/community/post-category.ts`. 응답의 말머리는 `CommunityMetadata` 라 code 가 `string` 이다 —
 * BE 가 값을 더해도 화면이 죽지 않게 받고, 분기·필터는 알려진 값만 쓴다.
 */
export type CommunityPostCategoryCode =
  'QUESTION' | 'EXPERIENCE' | 'TOGETHER' | 'NEWS'

export type CommunityPostSummary = {
  postId: CommunityId
  memberId: CommunityId
  /**
   * 작성자 닉네임 (BE #271). **null 가능** — 탈퇴 회원은 `"탈퇴회원"` 으로 내려오고,
   * 회원 서비스 장애·미존재 회원이면 null 이다. 화면은 null 을 대체 문구로 적는다
   * (`formatCommunityWriter`). 스냅샷이 아니라 실조회라 닉네임 변경이 바로 반영된다.
   */
  writerNickname?: string | null
  /** 작성자 프로필 이미지 URL. null 이면 이니셜 아바타를 그린다. */
  writerProfileImageUrl?: string | null
  targetType: CommunityMetadata
  targetCode: string | null
  targetName: string | null
  /**
   * 말머리(#529). `null` 은 말머리 없는 글이다(기존 글 전부). 배지 문구는 `category.name`.
   * 옛 BE 응답에는 필드가 없을 수 있어 렌더는 `category?.name` 으로 쓴다.
   */
  category: CommunityMetadata
  title: string
  previewContent: string
  likeCount: number
  commentCount: number
  /** 조회 수(#471). 상세 진입 때 늘어난다. */
  viewCount: number
  /**
   * 내가 이 글을 좋아요했는가(#471). 피드·검색·상세는 선택 인증이라 **`null` 은 「비로그인이라 모름」이지
   * 「안 누름」이 아니다** — 화면은 `liked === true` 일 때만 눌린 하트를 그린다. 좋아요한 글 목록은 늘 true.
   * 옛 BE 응답에는 필드가 없을 수 있어 렌더는 값이 없어도 깨지지 않게 쓴다.
   */
  liked: boolean | null
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

/**
 * 게시글에 붙은 **분석 첨부**. 지금은 상권 비교 초안에서만 생긴다.
 *
 * 사용자가 입력하는 값이 아니다 — 초안 응답이 준 것을 저장 때 그대로 되돌려 보낸다.
 * 그래서 글쓰기 폼(`CommunityEditorValue`)에는 넣지 않는다.
 *
 * ⚠️ **`analysisType` 의 타입이 자리마다 다르다.** 초안·상세 응답은 메타데이터 객체인데
 * **작성 요청은 코드 문자열**이다(`analysisType.code`). 배선할 때 그 변환을 빠뜨리면
 * 400 `COMMUNITY_015` 가 난다 — 변환은 `toAnalysisAttachment` 한 곳에만 둔다.
 */
export type CommunityAnalysisAttachment = {
  /** 예: `COMMERCIAL_COMPARISON`. 작성 요청에는 이 코드만 보낸다. */
  analysisType: string
  /** 예: `3110008:3110012:CS100001:20233`. 최대 100자. */
  analysisRefCode: string | null
  /** 사람이 읽는 표시명. 최대 200자. */
  analysisRefName: string | null
  /** 스냅샷 오브젝트 키. 최대 200자. */
  analysisSnapshotKey: string | null
}

export type CommunityPostDetail = {
  postId: CommunityId
  memberId: CommunityId
  /**
   * 작성자 닉네임 (BE #271). **null 가능** — 탈퇴 회원은 `"탈퇴회원"` 으로 내려오고,
   * 회원 서비스 장애·미존재 회원이면 null 이다. 화면은 null 을 대체 문구로 적는다
   * (`formatCommunityWriter`). 스냅샷이 아니라 실조회라 닉네임 변경이 바로 반영된다.
   */
  writerNickname?: string | null
  /** 작성자 프로필 이미지 URL. null 이면 이니셜 아바타를 그린다. */
  writerProfileImageUrl?: string | null
  targetType: CommunityMetadata
  targetCode: string | null
  targetName: string | null
  /**
   * 말머리(#529). `null` 은 말머리 없는 글이다(기존 글 전부). 배지 문구는 `category.name`.
   * 옛 BE 응답에는 필드가 없을 수 있어 렌더는 `category?.name` 으로 쓴다.
   */
  category: CommunityMetadata
  title: string
  content: string
  likeCount: number
  commentCount: number
  viewCount: number
  /**
   * 내가 이 글을 좋아요했는가(#471). 피드·검색·상세는 선택 인증이라 **`null` 은 「비로그인이라 모름」이지
   * 「안 누름」이 아니다** — 화면은 `liked === true` 일 때만 눌린 하트를 그린다. 좋아요한 글 목록은 늘 true.
   * 옛 BE 응답에는 필드가 없을 수 있어 렌더는 값이 없어도 깨지지 않게 쓴다.
   */
  liked: boolean | null
  createdAt: string
  updatedAt: string
  /** 첨부 이미지. `sortOrder` 오름차순이 노출 순서다. */
  images: CommunityPostImage[]
  /** 분석 첨부. 비교 초안으로 쓴 글에만 값이 있다. */
  analysisType?: CommunityMetadata | null
  analysisRefCode?: string | null
  analysisRefName?: string | null
  analysisSnapshotKey?: string | null
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
  /**
   * 작성자 닉네임 (BE #271). **null 가능** — 탈퇴 회원은 `"탈퇴회원"` 으로 내려오고,
   * 회원 서비스 장애·미존재 회원이면 null 이다. 화면은 null 을 대체 문구로 적는다
   * (`formatCommunityWriter`). 스냅샷이 아니라 실조회라 닉네임 변경이 바로 반영된다.
   */
  writerNickname?: string | null
  /** 작성자 프로필 이미지 URL. null 이면 이니셜 아바타를 그린다. */
  writerProfileImageUrl?: string | null
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
  /**
   * 작성자 닉네임 (BE #271). **null 가능** — 탈퇴 회원은 `"탈퇴회원"` 으로 내려오고,
   * 회원 서비스 장애·미존재 회원이면 null 이다. 화면은 null 을 대체 문구로 적는다
   * (`formatCommunityWriter`). 스냅샷이 아니라 실조회라 닉네임 변경이 바로 반영된다.
   */
  writerNickname?: string | null
  /** 작성자 프로필 이미지 URL. null 이면 이니셜 아바타를 그린다. */
  writerProfileImageUrl?: string | null
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
  /** 말머리(#529, 선택). 고르지 않았으면 키째 뺀다(말머리 없음). */
  category?: CommunityPostCategoryCode
  /**
   * 분석 첨부(선택). 초안으로 시작한 글만 싣는다.
   *
   * **수정 요청에는 없다.** 백엔드가 부분 컬럼만 갱신하므로 보내지 않으면 보존된다 —
   * 이미지(`imageKeys`)와 정반대 규칙이라 헷갈리지 않게 적어 둔다.
   */
  analysisType?: string
  analysisRefCode?: string
  analysisRefName?: string
  analysisSnapshotKey?: string
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
  /**
   * 말머리(#529). **「수정 후 값」이다 — 생략하면 말머리를 지운다(전체 교체).**
   *
   * `imageKeys` 와 같은 결이다. 사용자가 말머리를 건드리지 않았어도 지금 말머리를 **다시 실어야**
   * 남는다. 빼는 것은 사용자가 해제했을 때뿐이다(`createCommunityEditorPayload`). 「말머리 없음」을
   * 뜻할 수 있어 `imageKeys` 처럼 필수로 두지 못한다 — 대신 페이로드 테스트가 지킨다.
   */
  category?: CommunityPostCategoryCode
}

export type CommunityCommentCreateRequest = {
  parentCommentId?: CommunityId
  content: string
}

/**
 * 신고 사유 코드(#532, BE #473). 라벨·순서는 `lib/community/report-reason.ts`.
 */
export type CommunityReportReasonCode =
  'SPAM' | 'ABUSE' | 'PRIVACY' | 'FALSE_INFO' | 'ETC'

/**
 * 신고 요청(#532). 사유 코드와 상세를 나눠 보낸다. 레거시 `reason` 은 호환용으로 BE 에 남아 있지만
 * **보내지 않는다** — `reasonCode` 가 있으면 서버가 무시한다.
 */
export type CommunityReportCreateRequest = {
  targetKind: 'POST' | 'COMMENT'
  targetId: CommunityId
  reasonCode: CommunityReportReasonCode
  /** 선택, 500자 이하. `ETC` 만 필수다. 걷어 내서 비면 키째 뺀다. */
  detail?: string
}

export type CommunityCursorParams = {
  sortType: CommunitySortType
  orderType: CommunityOrderType
  lastPostId: CommunityId
  lastLikeCount: number
  size: number
}

export type CommunityListParams = CommunityCursorParams & {
  /** `sortType=POPULAR` 일 때만 싣는다. `LATEST` 에서는 서버가 무시한다. */
  period?: CommunityPopularPeriod
  /**
   * 말머리 필터(#529). 피드(`GET /posts`)에만 있다 — 검색·좋아요한 글에는 없다. 생략이 「전체」다
   * (말머리 없는 글 포함). 대상 필터·정렬·기간과 함께 쓴다.
   */
  category?: CommunityPostCategoryCode
  targetType?: CommunityTargetType
  targetCode?: string
}

export type CommunitySearchParams = CommunityCursorParams & {
  /** 목록과 같다 — 인기순 검색에만 싣는다. */
  period?: CommunityPopularPeriod
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
 * 초안 응답. 제목·본문 말고 **분석 첨부 4필드**도 준다.
 *
 * 전에는 그 4필드를 일부러 받지 않았다 — 작성 요청·상세 응답에 자리가 없어 보낼 곳이
 * 없었기 때문이다(배선 반쪽). 백엔드가 나머지 절반을 뚫었으므로(작성 요청/상세 응답에
 * 4필드 추가) 이제 받아서 저장까지 잇는다.
 */
export type CommunityComparisonDraft = {
  targetType: CommunityMetadata
  targetCode: string | null
  targetName: string | null
  title: string
  content: string
  /** 예: `COMMERCIAL_COMPARISON`. **작성 요청에는 `.code` 만 보낸다.** */
  analysisType?: CommunityMetadata | null
  analysisRefCode?: string | null
  analysisRefName?: string | null
  analysisSnapshotKey?: string | null
}

/**
 * 커뮤니티 알림 종류 code(#535·#536, 설계 `backend/docs/services/community-notification-design.md` §5-1).
 * 응답의 종류는 `CommunityMetadata` 라 code 가 `string` 이다 — BE 가 값을 더해도 화면이 죽지 않게 받고,
 * 문구 분기는 알려진 두 값만 쓴다(`lib/community/notifications.ts`).
 */
export type CommunityNotificationTypeCode =
  'COMMENT_ON_POST' | 'REPLY_ON_COMMENT'

/**
 * 알림 목록 항목(설계 §7-1). 수신자별 **묶음 행**이다 — 같은 글(답글이면 같은 부모 댓글)에 안 읽은 채
 * 쌓인 댓글이 한 행으로 모이고, `eventCount` 는 그 **댓글 수**다(사람 수가 아니다).
 *
 * 메시지 본문은 내려오지 않는다. 화면이 `notificationType` · `actorNickname` · `eventCount` · `postTitle`
 * 로 조립한다(`formatCommunityNotificationMessage`).
 */
export type CommunityNotificationItem = {
  notificationId: CommunityId
  notificationType: CommunityMetadata
  postId: CommunityId
  /** 게시글이 ACTIVE 가 아니면 null(조회 시점 강등, 설계 §10). */
  postTitle: string | null
  /** 게시글이 ACTIVE 인가. false 면 「삭제된 글」로 적고 이동을 막는다. */
  targetAvailable: boolean
  /** 마지막으로 알림을 만든 댓글. 댓글 앵커(`#comment-{id}`)에 쓴다. */
  commentId: CommunityId | null
  /** 그 댓글 미리보기(최대 100자). 댓글이 지워졌으면 null. */
  commentPreview: string | null
  actorMemberId: CommunityId | null
  /**
   * 마지막 행위자 닉네임. 작성자 표시와 같은 계약이다 — 탈퇴 회원은 `"탈퇴회원"`, 회원 서비스 장애면 null.
   * null 은 대체 문구로 적는다(`COMMUNITY_WRITER_FALLBACK`).
   */
  actorNickname: string | null
  actorProfileImageUrl: string | null
  /** 묶인 댓글 수. */
  eventCount: number
  read: boolean
  /** 마지막 이벤트 시각(ISO-8601, 시간대 없음). 정렬·다음 쪽 커서의 앞 키다. 받은 문자열을 그대로 되돌려 보낸다. */
  lastEventAt: string
  createdAt: string
}

export type CommunityNotificationListBody = {
  /** `SliceResponse<CommunityNotificationItem>` — 게시글 목록 `posts` 와 같은 모양. */
  notifications: CommunityPostSlice<CommunityNotificationItem>
}

/**
 * 알림 목록 요청(설계 §7). 첫 쪽은 `lastNotificationId: '0'` 이고 `lastEventAt` 을 싣지 않는다.
 * 다음 쪽은 **마지막 항목의 `lastEventAt` + `notificationId` 를 그대로** 보낸다 — `lastNotificationId` 가
 * 0 이 아니면 `lastEventAt` 이 필수다(빠지면 400).
 */
export type CommunityNotificationListParams = {
  unreadOnly: boolean
  lastNotificationId: CommunityId
  lastEventAt?: string
  size: number
}

export type CommunityNotificationUnreadCountBody = {
  unreadCount: number
}

export type CommunityNotificationReadBody = {
  notificationId: CommunityId
  read: boolean
}

export type CommunityNotificationReadAllBody = {
  updatedCount: number
}

export type CommunityNotificationListResponse =
  ApiResponse<CommunityNotificationListBody>
export type CommunityNotificationUnreadCountResponse =
  ApiResponse<CommunityNotificationUnreadCountBody>
export type CommunityNotificationReadResponse =
  ApiResponse<CommunityNotificationReadBody>
export type CommunityNotificationReadAllResponse =
  ApiResponse<CommunityNotificationReadAllBody>

export type CommunityPostListResponse = ApiResponse<CommunityPostListBody>
export type CommunityLikedPostsResponse = ApiResponse<CommunityLikedPostsBody>
export type CommunityPostDetailResponse = ApiResponse<CommunityPostDetail>
export type CommunityPostLikeResponse = ApiResponse<CommunityLikeBody>
export type CommunityCommentsResponse = ApiResponse<CommunityCommentsBody>
export type CommunityCommentLikeResponse = ApiResponse<CommunityCommentLikeBody>
export type CommunityVoidResponse = ApiResponse<null>
export type CommunityComparisonDraftResponse =
  ApiResponse<CommunityComparisonDraft>
