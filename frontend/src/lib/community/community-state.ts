import type {
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

export const parseCommunityPostId = (value: string | null) => {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return null
  }

  const postId = Number(value)
  return Number.isSafeInteger(postId) ? postId : null
}

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
  postId: number,
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
  detail: (postId: number, mock: boolean) =>
    ['community', 'detail', postId, mock] as const,
  comments: (postId: number, mock: boolean) =>
    ['community', 'comments', postId, mock] as const,
  related: (
    targetType: CommunityTargetType,
    targetCode: string,
    mock: boolean,
  ) => ['community', 'related', targetType, targetCode, mock] as const,
  liked: (mock: boolean) => ['community', 'liked', mock] as const,
}
