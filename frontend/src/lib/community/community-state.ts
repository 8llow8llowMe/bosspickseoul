import type {
  CommunityId,
  CommunityLikedPostsResponse,
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
  mock: boolean
}

export type CommunityViewer = {
  authenticated: boolean
  memberId: string | null
}

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
      mock: isCommunityMockEnabled(params.get('mock')),
    }
  }

  return {
    view,
    keyword,
    targetType: keyword || !hasTarget ? undefined : targetType,
    targetCode: keyword || !hasTarget ? undefined : targetCode,
    mock: isCommunityMockEnabled(params.get('mock')),
  }
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

export const createCommunityContextKey = (state: CommunityListState) =>
  JSON.stringify({
    view: state.view,
    keyword: state.keyword,
    targetType: state.targetType ?? null,
    targetCode: state.targetCode ?? null,
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

export const getCommunityNextPageParam = (
  slice: CommunityPostSlice,
  view: CommunityListView,
) => {
  if (!slice.hasNext || slice.contents.length === 0) {
    return undefined
  }

  const lastPost = slice.contents.at(-1)

  if (!lastPost) {
    return undefined
  }

  return {
    lastPostId: lastPost.postId,
    lastLikeCount: view === 'popular' ? lastPost.likeCount : 0,
  }
}

export const communityKeys = {
  all: ['community'] as const,
  list: (state: CommunityListState) => ['community', 'list', state] as const,
  detail: (postId: CommunityId, mock: boolean) =>
    ['community', 'detail', postId, mock] as const,
  comments: (postId: CommunityId, mock: boolean) =>
    ['community', 'comments', postId, mock] as const,
  related: (
    targetType: CommunityTargetType,
    targetCode: string,
    mock: boolean,
  ) => ['community', 'related', targetType, targetCode, mock] as const,
  liked: (mock: boolean) => ['community', 'liked', mock] as const,
}
