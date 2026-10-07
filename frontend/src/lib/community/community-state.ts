import {
  COMMUNITY_DEFAULT_POPULAR_PERIOD,
  parseCommunityPopularPeriod,
} from '@/lib/community/popular-period'
import type {
  CommunityCursorParams,
  CommunityId,
  CommunityLikedPostsResponse,
  CommunityPopularPeriod,
  CommunityPostListResponse,
  CommunityPostSlice,
  CommunityTargetType,
} from '@/types/community'

export type CommunityListView = 'latest' | 'popular' | 'liked'

export type CommunityListState = {
  view: CommunityListView
  keyword: string
  targetType?: CommunityTargetType
  targetCode?: string
  /**
   * 인기 기간(#531). 인기 보기·검색어 없음일 때만 기본값(`WEEK`)이 아닐 수 있다 — 그 밖에서는 칩이 없어
   * 파싱이 늘 기본값으로 돌린다. 목록 쿼리 키에 상태 전체가 들어가므로 기간을 바꾸면 커서가 처음부터다.
   */
  period: CommunityPopularPeriod
  mock: boolean
}

export type CommunityViewer = {
  authenticated: boolean
  memberId: string | null
}

/** 비로그인 조회자의 쿼리 키 세그먼트. */
export const COMMUNITY_ANONYMOUS_VIEWER = 'anonymous'

/**
 * 쿼리 키의 조회자 세그먼트(#530). 목록·인기·상세·관련 글 응답의 `liked` 는 **누가 부르느냐**로
 * 달라진다(비로그인은 null). 기본 `staleTime` 이 5분이라 키에 조회자를 넣지 않으면 로그아웃·
 * 다른 계정 로그인 뒤에도 앞사람의 `liked` 가 캐시에서 그대로 나온다. 목 모드 조회자는 부르는 쪽이
 * 목 회원 id 를 `memberId` 로 넣어 준다.
 */
export const getCommunityViewerKey = (viewer: CommunityViewer) =>
  viewer.memberId ?? COMMUNITY_ANONYMOUS_VIEWER

/**
 * 공개 쿼리(목록·인기·상세)를 시작해도 되는가(#530). 로그인 확인(`/api/auth/me`) 전에는 조회자를 몰라
 * 키가 'anonymous' 다. 그때 시작하면 BFF 는 세션 토큰을 붙여 회원 응답(`liked` true/false)을 받아
 * 'anonymous' 키에 넣고, 확인이 끝나 키가 회원 id 로 바뀌면 같은 목록을 한 번 더 받는다(상세면 조회수도 두 번).
 * 목 모드는 조회자가 정해져 있어 기다리지 않는다.
 *
 * `waitExpired` — 확인을 기다린 지 `COMMUNITY_VIEWER_WAIT_LIMIT_MS` 가 지났다. 확인 요청에는 타임아웃이
 * 없어 멈추면 공개 화면이 수 분간 스켈레톤에 갇힌다. 그때는 익명으로 보고 시작한다 — 나중에 확인이 끝나
 * 회원으로 바뀌면 키가 바뀌어 한 번 더 받는 것은 감수한다.
 */
export const isCommunityViewerReady = (
  mock: boolean,
  hasHydrated: boolean,
  waitExpired = false,
) => mock || hasHydrated || waitExpired

/**
 * 공개 목록·상세가 로그인 확인을 기다리는 상한(ms). 앱 전역 확인(auth-store)은 그대로 두고 커뮤니티
 * 쪽에서만 끊는다. 보통 확인은 수백 ms 안에 끝나 이 상한에 닿지 않는다.
 */
export const COMMUNITY_VIEWER_WAIT_LIMIT_MS = 2500

export const parseCommunityTargetType = (value: string | null) => {
  if (
    value === 'DISTRICT' ||
    value === 'ADMINISTRATION' ||
    value === 'COMMERCIAL'
  ) {
    return value
  }

  return undefined
}

/**
 * 커서의 "처음부터" 를 뜻하는 값.
 *
 * 백엔드가 `lastPostId <= 0` 을 첫 페이지로 읽는다. 식별자가 문자열이 되면서
 * 숫자 0 을 그대로 둘 수 없어 한 곳에 모았다 — 두 화면이 각자 리터럴을 들고 있으면
 * 한쪽만 고쳐질 때 목록이 조용히 빈다.
 */
export const COMMUNITY_CURSOR_START: CommunityId = '0'

/**
 * URL 의 게시글 id 를 검증한다. **문자열 그대로 돌려준다.**
 *
 * 예전에는 `Number(value)` 로 바꾼 뒤 `Number.isSafeInteger` 가 아니면 null 을 냈다.
 * 그런데 게시글 id 는 Snowflake(약 7.5e17)라 **안전 정수인 적이 없다** — 즉 실제 id 는
 * 전부 null 이 되고, 호출부인 상세 라우트가 그걸 `notFound()` 로 바꿔 모든 게시글이
 * 404 가 된다. dev 커뮤니티에 글이 0건이라 아직 드러나지 않았을 뿐이다.
 *
 * 자릿수 상한을 두지 않는 이유: Snowflake 는 시간이 갈수록 커지고, 상한을 정해 두면
 * 언젠가 같은 방식으로 조용히 막힌다. 형태만 보고 존재 여부는 서버에 맡긴다.
 */
export const parseCommunityPostId = (value: string | null): string | null =>
  value && /^[1-9]\d*$/.test(value) ? value : null

export const isCommunityMockEnabled = (
  value: string | null,
  nodeEnv = process.env.NODE_ENV,
) => nodeEnv !== 'production' && value === '1'

export const parseCommunityListState = (
  params: URLSearchParams,
): CommunityListState => {
  const rawView = params.get('view')
  const view: CommunityListView =
    rawView === 'popular' || rawView === 'liked' ? rawView : 'latest'
  const keyword = (params.get('keyword') ?? '').trim()
  const targetType = parseCommunityTargetType(params.get('targetType'))
  const targetCode = (params.get('targetCode') ?? '').trim() || undefined
  const hasTarget = Boolean(targetType && targetCode)

  if (view === 'liked') {
    return {
      view,
      keyword: '',
      targetType: undefined,
      targetCode: undefined,
      period: COMMUNITY_DEFAULT_POPULAR_PERIOD,
      mock: isCommunityMockEnabled(params.get('mock')),
    }
  }

  return {
    view,
    keyword,
    targetType: keyword || !hasTarget ? undefined : targetType,
    targetCode: keyword || !hasTarget ? undefined : targetCode,
    // 검색 화면에는 기간 칩이 없다 — 검색어가 있으면 대상과 같은 결로 기본값으로 돌린다(CM-005).
    period:
      view === 'popular' && !keyword
        ? parseCommunityPopularPeriod(params.get('period'))
        : COMMUNITY_DEFAULT_POPULAR_PERIOD,
    mock: isCommunityMockEnabled(params.get('mock')),
  }
}

/**
 * 목록 상태 → 쿼리. `parseCommunityListState` 의 짝이다. 목록 화면과 상세의 지역 칩이
 * 같은 주소를 만들어야 해서 여기 둔다 — 한쪽만 규칙(검색이 대상보다 우선, mock 보존)을
 * 바꾸면 칩이 다른 목록으로 보낸다.
 */
export const serializeCommunityListState = (state: CommunityListState) => {
  const params = new URLSearchParams()

  if (state.view !== 'latest') {
    params.set('view', state.view)
  }

  if (state.keyword) {
    params.set('keyword', state.keyword)
  } else if (state.targetType && state.targetCode) {
    params.set('targetType', state.targetType)
    params.set('targetCode', state.targetCode)
  }

  // 기본 기간은 쓰지 않는다 — 기존 `view=popular` 주소·공유 링크가 그대로 이번 주를 뜻한다.
  if (
    state.view === 'popular' &&
    !state.keyword &&
    state.period !== COMMUNITY_DEFAULT_POPULAR_PERIOD
  ) {
    params.set('period', state.period)
  }

  if (state.mock) {
    params.set('mock', '1')
  }

  return params
}

export const getCommunityLoginHref = (currentHref: string) =>
  `/login?redirect=${encodeURIComponent(currentHref)}`

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

/**
 * 목록 맥락 키(스크롤 복원·이웃 글·상세 `← 목록`). 기간은 기본값이 아닐 때만 넣는다 — 그래야 이미
 * sessionStorage 에 저장된 키·열려 있는 상세 주소의 `from` 이 예전 모양 그대로 맞는다(#531).
 */
export const createCommunityContextKey = (state: CommunityListState) =>
  JSON.stringify({
    view: state.view,
    keyword: state.keyword,
    targetType: state.targetType ?? null,
    targetCode: state.targetCode ?? null,
    ...(state.period !== COMMUNITY_DEFAULT_POPULAR_PERIOD
      ? { period: state.period }
      : {}),
  })

export const createCommunityPostHref = (
  postId: CommunityId,
  contextKey: string,
  mock: boolean,
) => {
  const params = new URLSearchParams({ from: contextKey })

  if (mock) {
    params.set('mock', '1')
  }

  return `/community/${postId}?${params.toString()}`
}

export const getCommunityPageSlice = (
  response: CommunityPostListResponse | CommunityLikedPostsResponse,
  view: CommunityListView,
) =>
  view === 'liked'
    ? (response as CommunityLikedPostsResponse).dataBody.posts
    : (response as CommunityPostListResponse).dataBody.posts

type CommunityNextCursor = Pick<
  CommunityCursorParams,
  'lastPostId' | 'lastLikeCount'
>

/**
 * 다음 쪽 커서. 인기 보기는 좋아요 수를 함께 보낸다(CM-004).
 *
 * `previousCursor` 는 이 쪽을 받을 때 보낸 커서다(React Query `lastPageParam`). 새 커서가 그것과
 * 같으면(인기는 `lastPostId`+`lastLikeCount` 쌍) 서버가 `hasNext` 를 잘못 줘도 같은 쪽을 또 부르게
 * 되어 자동 다음 쪽(CM-029)이 무한히 돈다 — 그때는 끝으로 친다.
 */
export const getCommunityNextPageParam = (
  slice: CommunityPostSlice,
  view: CommunityListView,
  previousCursor?: CommunityNextCursor,
): CommunityNextCursor | undefined => {
  if (!slice.hasNext || slice.contents.length === 0) {
    return undefined
  }

  const lastPost = slice.contents.at(-1)

  if (!lastPost) {
    return undefined
  }

  const next = {
    lastPostId: lastPost.postId,
    lastLikeCount: view === 'popular' ? lastPost.likeCount : 0,
  }

  if (
    previousCursor &&
    previousCursor.lastPostId === next.lastPostId &&
    (view !== 'popular' || previousCursor.lastLikeCount === next.lastLikeCount)
  ) {
    return undefined
  }

  return next
}

export const communityKeys = {
  all: ['community'] as const,
  /** 마지막 세그먼트는 조회자(`getCommunityViewerKey`) — 좋아요한 글 보기도 이 자리 하나만 쓴다. */
  list: (state: CommunityListState, viewer: string) =>
    ['community', 'list', state, viewer] as const,
  detail: (postId: CommunityId, mock: boolean, viewer: string) =>
    ['community', 'detail', postId, mock, viewer] as const,
  comments: (postId: CommunityId, mock: boolean) =>
    ['community', 'comments', postId, mock] as const,
  related: (
    targetType: CommunityTargetType,
    targetCode: string,
    mock: boolean,
    viewer: string,
  ) => ['community', 'related', targetType, targetCode, mock, viewer] as const,
  liked: (mock: boolean) => ['community', 'liked', mock] as const,
  /**
   * 목록 우 레일 인기 글(community.md §S4 「목록 3단」). 목록 키(`['community','list',…]`)와 따로 둔다 —
   * 목록 401 복구가 exact 키로 취소·제거할 때 섞이지 않게. 글 작성·삭제는 `communityKeys.all` 무효화로
   * 함께 갱신된다.
   */
  popular: (
    targetType: CommunityTargetType | null,
    targetCode: string | null,
    mock: boolean,
    viewer: string,
  ) => ['community', 'popular', targetType, targetCode, mock, viewer] as const,
}
