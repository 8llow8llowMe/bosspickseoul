import { districts } from '@/data/districts'
import type { CommunityDataSource } from '@/lib/community/community-data-source'
import type { ComparisonDraftParams } from '@/lib/community/comparison-draft-url'
import type { ApiResponse } from '@/types/api'
import type {
  CommunityId,
  CommunityComment,
  CommunityCommentCreateRequest,
  CommunityCursorParams,
  CommunityLikedPost,
  CommunityListParams,
  CommunityMetadata,
  CommunityPostCreateRequest,
  CommunityPostDetail,
  CommunityPostImage,
  CommunityPostSummary,
  CommunityPostUpdateRequest,
  CommunityReply,
  CommunityReportCreateRequest,
  CommunitySearchParams,
  CommunityTargetType,
} from '@/types/community'
import type { AdministrationArea, CommercialArea } from '@/types/recommend'

export const MOCK_COMMUNITY_MEMBER_ID = '9001'

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? ReadonlyArray<DeepReadonly<Item>>
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T

const deepFreeze = <T>(value: T): DeepReadonly<T> => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Reflect.ownKeys(value).forEach(key => {
      deepFreeze(Reflect.get(value, key))
    })
    Object.freeze(value)
  }

  return value as DeepReadonly<T>
}

const targetMetadata: Record<
  CommunityTargetType,
  Exclude<CommunityMetadata, null>
> = {
  DISTRICT: {
    code: 'DISTRICT',
    name: '자치구',
    description: '서울시 자치구 단위 게시판',
  },
  ADMINISTRATION: {
    code: 'ADMINISTRATION',
    name: '행정동',
    description: '서울시 행정동 단위 게시판',
  },
  COMMERCIAL: {
    code: 'COMMERCIAL',
    name: '상권',
    description: '서울시 상권 단위 게시판',
  },
}

const basePosts: CommunityPostSummary[] = [
  {
    postId: '1',
    memberId: MOCK_COMMUNITY_MEMBER_ID,
    targetType: null,
    targetCode: null,
    targetName: null,
    title: '첫 가게를 준비하며 배운 것들',
    previewContent:
      '서울에서 첫 매장을 준비하며 임대차 계약 전에 확인한 항목을 공유합니다.',
    likeCount: 4,
    commentCount: 3,
    createdAt: '2026-07-27T08:30:00.000Z',
    thumbnailUrl: null,
  },
  {
    postId: '2',
    memberId: '8202',
    targetType: null,
    targetCode: null,
    targetName: null,
    title: '비 오는 날 매장 운영 팁',
    previewContent:
      '서울 전역 자영업자분들과 우천 시 배달과 방문 고객 대응 경험을 나눠요.',
    likeCount: 16,
    commentCount: 1,
    createdAt: '2026-07-27T05:00:00.000Z',
    thumbnailUrl: null,
  },
  {
    postId: '3',
    memberId: '8303',
    targetType: targetMetadata.DISTRICT,
    targetCode: '11680',
    targetName: '강남구',
    title: '강남구 점심 상권 흐름이 궁금합니다',
    previewContent:
      '오피스 점심 수요가 최근 어떻게 달라졌는지 현장 이야기를 듣고 싶어요.',
    likeCount: 25,
    commentCount: 0,
    createdAt: '2026-07-27T06:00:00.000Z',
    thumbnailUrl: null,
  },
  {
    postId: '4',
    memberId: MOCK_COMMUNITY_MEMBER_ID,
    targetType: targetMetadata.DISTRICT,
    targetCode: '11440',
    targetName: '마포구',
    title: '마포구 주말 행사를 준비하고 있어요',
    previewContent:
      '동네 가게 세 곳이 함께하는 POP-UP 행사를 기획하며 얻은 체크리스트입니다.',
    likeCount: 7,
    commentCount: 1,
    createdAt: '2026-07-27T03:00:00.000Z',
    thumbnailUrl: null,
  },
  {
    postId: '5',
    memberId: MOCK_COMMUNITY_MEMBER_ID,
    targetType: targetMetadata.ADMINISTRATION,
    targetCode: '1168064000',
    targetName: '역삼1동',
    title: '역삼1동 아침 매출 실험 후기',
    previewContent:
      '오픈 시간을 한 시간 앞당긴 뒤 출근 고객 유입이 어떻게 바뀌었는지 정리했습니다.',
    likeCount: 12,
    commentCount: 2,
    createdAt: '2026-07-27T07:00:00.000Z',
    thumbnailUrl: null,
  },
  {
    postId: '6',
    memberId: '8606',
    targetType: targetMetadata.ADMINISTRATION,
    targetCode: '1120065000',
    targetName: '성수1가1동',
    title: '성수1가1동 평일 저녁 분위기',
    previewContent:
      '퇴근 시간 이후 유동 인구와 조용한 골목 매장의 운영 경험을 공유합니다.',
    likeCount: 20,
    commentCount: 0,
    createdAt: '2026-07-27T04:00:00.000Z',
    thumbnailUrl: null,
  },
  {
    postId: '7',
    memberId: '8707',
    targetType: targetMetadata.COMMERCIAL,
    targetCode: '3110008',
    targetName: '강남역 상권',
    title: '강남역 상권 테이크아웃 동선',
    previewContent:
      '점심 피크 시간의 대기열을 줄이기 위해 픽업 위치를 바꾼 경험을 공유합니다.',
    likeCount: 31,
    commentCount: 2,
    createdAt: '2026-07-27T09:00:00.000Z',
    thumbnailUrl: null,
  },
  {
    postId: '8',
    memberId: MOCK_COMMUNITY_MEMBER_ID,
    targetType: targetMetadata.COMMERCIAL,
    targetCode: '3120015',
    targetName: '성수역 상권',
    title: '성수역 여름 POP-UP 협업 제안',
    previewContent:
      '여름 시즌에 함께 작은 팝업을 열 식음료 브랜드 사장님을 찾고 있습니다.',
    likeCount: 9,
    commentCount: 1,
    createdAt: '2026-07-27T07:45:00.000Z',
    thumbnailUrl: null,
  },
]

const contentByPostId: Record<CommunityId, string> = {
  1: '서울에서 첫 매장을 준비하며 임대차 계약 전에 확인한 항목을 공유합니다. 건물 관리 규약과 예상 공사 기간을 먼저 확인한 것이 가장 도움이 됐습니다.',
  2: '서울 전역 자영업자분들과 우천 시 배달과 방문 고객 대응 경험을 나눠요. 입구의 우산 보관 위치와 배달 포장 순서를 바꾸니 혼잡이 줄었습니다.',
  3: '오피스 점심 수요가 최근 어떻게 달라졌는지 현장 이야기를 듣고 싶어요. 메뉴 구성과 회전율을 함께 고민하고 있습니다.',
  4: '동네 가게 세 곳이 함께하는 POP-UP 행사를 기획하며 얻은 체크리스트입니다. 정산 기준과 공동 홍보 일정을 문서로 먼저 맞추는 것이 중요했습니다.',
  5: '오픈 시간을 한 시간 앞당긴 뒤 출근 고객 유입이 어떻게 바뀌었는지 정리했습니다. 테이크아웃 메뉴를 단순화하니 준비 부담도 줄었습니다.',
  6: '퇴근 시간 이후 유동 인구와 조용한 골목 매장의 운영 경험을 공유합니다. 평일과 주말의 체류 시간이 꽤 다르게 나타났습니다.',
  7: '점심 피크 시간의 대기열을 줄이기 위해 픽업 위치를 바꾼 경험을 공유합니다. 주문과 수령 동선을 분리한 뒤 고객 문의도 줄었습니다.',
  8: '여름 시즌에 함께 작은 팝업을 열 식음료 브랜드 사장님을 찾고 있습니다. 공간과 운영 시간을 유연하게 협의하고 싶습니다.',
}

/**
 * 목 이미지의 표시용 URL. 실제 파일이 없으므로 **네트워크를 타지 않는 data URI** 를 쓴다
 * — 깨진 이미지 아이콘을 보여 주면 목 데이터가 고장 난 것처럼 읽힌다.
 */
const mockImageUrl = (imageKey: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#e5e7eb"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="14" fill="#6b7280">mock ${imageKey.slice(-8)}</text></svg>`,
  )}`

const toMockImages = (imageKeys: string[]): CommunityPostImage[] =>
  imageKeys.map((imageKey, index) => ({
    imageKey,
    imageUrl: mockImageUrl(imageKey),
    sortOrder: index,
  }))

const baseDetails: CommunityPostDetail[] = basePosts.map(post => ({
  images: [],
  postId: post.postId,
  memberId: post.memberId,
  targetType: post.targetType,
  targetCode: post.targetCode,
  targetName: post.targetName,
  title: post.title,
  content: contentByPostId[post.postId] ?? '',
  likeCount: post.likeCount,
  commentCount: post.commentCount,
  viewCount: Number(post.postId) * 37,
  createdAt: post.createdAt,
  updatedAt: post.createdAt,
}))

const baseComments: CommunityComment[] = [
  {
    commentId: '101',
    postId: '1',
    memberId: '8101',
    content: '관리 규약을 먼저 확인한다는 부분이 특히 도움 됐어요.',
    likeCount: 3,
    createdAt: '2026-07-27T08:35:00.000Z',
    updatedAt: '2026-07-27T08:35:00.000Z',
    replies: [
      {
        commentId: '102',
        postId: '1',
        memberId: MOCK_COMMUNITY_MEMBER_ID,
        parentCommentId: '101',
        content: '공사 가능 시간도 꼭 함께 확인해 보세요.',
        likeCount: 1,
        createdAt: '2026-07-27T08:38:00.000Z',
        updatedAt: '2026-07-27T08:38:00.000Z',
      },
    ],
  },
  {
    commentId: '103',
    postId: '1',
    memberId: '8103',
    content: '체크리스트를 공유해 주셔서 감사합니다.',
    likeCount: 2,
    createdAt: '2026-07-27T08:42:00.000Z',
    updatedAt: '2026-07-27T08:42:00.000Z',
    replies: [],
  },
  {
    commentId: '201',
    postId: '2',
    memberId: MOCK_COMMUNITY_MEMBER_ID,
    content: '우산 보관 위치를 바꾸는 방법을 저도 시도해 볼게요.',
    likeCount: 4,
    createdAt: '2026-07-27T05:20:00.000Z',
    updatedAt: '2026-07-27T05:20:00.000Z',
    replies: [],
  },
  {
    commentId: '401',
    postId: '4',
    memberId: '8401',
    content: '정산 기준 문서가 필요하면 예시를 공유할 수 있어요.',
    likeCount: 5,
    createdAt: '2026-07-27T03:20:00.000Z',
    updatedAt: '2026-07-27T03:20:00.000Z',
    replies: [],
  },
  {
    commentId: '501',
    postId: '5',
    memberId: '8501',
    content: '아침 메뉴는 몇 가지로 운영하셨나요?',
    likeCount: 6,
    createdAt: '2026-07-27T07:10:00.000Z',
    updatedAt: '2026-07-27T07:10:00.000Z',
    replies: [
      {
        commentId: '502',
        postId: '5',
        memberId: MOCK_COMMUNITY_MEMBER_ID,
        parentCommentId: '501',
        content: '음료 두 가지와 샌드위치 한 가지로 시작했습니다.',
        likeCount: 2,
        createdAt: '2026-07-27T07:15:00.000Z',
        updatedAt: '2026-07-27T07:15:00.000Z',
      },
    ],
  },
  {
    commentId: '701',
    postId: '7',
    memberId: '8701',
    content: '수령 동선을 분리한 위치가 궁금합니다.',
    likeCount: 8,
    createdAt: '2026-07-27T09:05:00.000Z',
    updatedAt: '2026-07-27T09:05:00.000Z',
    replies: [
      {
        commentId: '702',
        postId: '7',
        memberId: '8707',
        parentCommentId: '701',
        content: '출입문 반대편 선반을 픽업 전용으로 사용했어요.',
        likeCount: 3,
        createdAt: '2026-07-27T09:08:00.000Z',
        updatedAt: '2026-07-27T09:08:00.000Z',
      },
    ],
  },
  {
    commentId: '801',
    postId: '8',
    memberId: '8801',
    content: '디저트 브랜드도 참여할 수 있을까요?',
    likeCount: 1,
    createdAt: '2026-07-27T08:00:00.000Z',
    updatedAt: '2026-07-27T08:00:00.000Z',
    replies: [],
  },
]

export const communityMockFixtures = deepFreeze({
  posts: basePosts,
  details: baseDetails,
  comments: baseComments,
})

export const communityMockLocations = deepFreeze({
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
} satisfies {
  administrationsByDistrict: Record<string, AdministrationArea[]>
  commercialsByAdministration: Record<string, CommercialArea[]>
})

const initialLikedPosts = deepFreeze([
  { postId: '7', likedAt: '2026-07-27T09:10:00.000Z' },
  { postId: '1', likedAt: '2026-07-27T08:40:00.000Z' },
])

type CommunityMockState = {
  posts: CommunityPostSummary[]
  details: CommunityPostDetail[]
  comments: CommunityComment[]
  likedAtByPostId: Map<CommunityId, string>
  likedCommentIds: Set<CommunityId>
  /** 다음에 발급할 식별자. 목이라 단조 증가면 충분하다 — 문자열로 들고 BigInt 로 올린다. */
  nextPostId: CommunityId
  nextCommentId: CommunityId
  currentTimestampMs: number
}

const ok = <T>(dataBody: T): ApiResponse<T> => ({
  dataHeader: {
    success: true,
    resultCode: null,
    resultMessage: null,
  },
  dataBody: structuredClone(dataBody),
})

const createState = (): CommunityMockState => {
  const posts = structuredClone(
    communityMockFixtures.posts,
  ) as CommunityPostSummary[]
  const details = structuredClone(
    communityMockFixtures.details,
  ) as CommunityPostDetail[]
  const comments = structuredClone(
    communityMockFixtures.comments,
  ) as CommunityComment[]
  const likedPosts = structuredClone(initialLikedPosts)
  const commentIds = comments.flatMap(comment => [
    comment.commentId,
    ...comment.replies.map(reply => reply.commentId),
  ])

  return {
    posts,
    details,
    comments,
    likedAtByPostId: new Map(
      likedPosts.map(item => [item.postId, item.likedAt]),
    ),
    likedCommentIds: new Set(),
    nextPostId: nextIdAfter(posts.map(post => post.postId)),
    nextCommentId: nextIdAfter(commentIds),
    currentTimestampMs: Math.max(
      ...details.flatMap(detail => [
        Date.parse(detail.createdAt),
        Date.parse(detail.updatedAt),
      ]),
      ...comments.flatMap(comment => [
        Date.parse(comment.createdAt),
        Date.parse(comment.updatedAt),
        ...comment.replies.flatMap(reply => [
          Date.parse(reply.createdAt),
          Date.parse(reply.updatedAt),
        ]),
      ]),
      ...likedPosts.map(item => Date.parse(item.likedAt)),
    ),
  }
}

const nextTimestamp = (state: CommunityMockState) => {
  state.currentTimestampMs += 1_000
  return new Date(state.currentTimestampMs).toISOString()
}

const districtTargetNames = Object.fromEntries(
  districts.map(district => [String(district.gooCode), district.gooName]),
)

const targetNames: Record<CommunityTargetType, Record<string, string>> = {
  DISTRICT: districtTargetNames,
  ADMINISTRATION: {
    '1168064000': '역삼1동',
    '1120065000': '성수1가1동',
  },
  COMMERCIAL: {
    '3110008': '강남역 상권',
    '3120015': '성수역 상권',
  },
}

const resolveTarget = (
  targetType?: CommunityTargetType,
  targetCode?: string,
) => {
  if (!targetType && !targetCode) {
    return {
      targetType: null,
      targetCode: null,
      targetName: null,
    }
  }

  if (!targetType || !targetCode) {
    throw new Error('대상 타입과 대상 코드는 함께 입력해야 합니다.')
  }

  const targetName = targetNames[targetType][targetCode]

  if (!targetName) {
    throw new Error(`${targetType} 대상 ${targetCode}을 찾을 수 없습니다.`)
  }

  return {
    targetType: targetMetadata[targetType],
    targetCode,
    targetName,
  }
}

/**
 * 식별자 대소 비교. **BigInt 로 한다.**
 *
 * 문자열 사전순으로 비교하면 자릿수가 다를 때 틀린다("9" > "10"). 실제 Snowflake 는
 * 대개 자릿수가 같지만, 목 데이터는 1~N 처럼 짧은 값을 쓰므로 여기서 바로 드러난다.
 * Number 로 되돌리는 것은 애초에 이 변경이 없애려는 정밀도 손실이라 쓰지 않는다.
 */
const compareIds = (left: CommunityId, right: CommunityId) =>
  left === right ? 0 : BigInt(left) < BigInt(right) ? -1 : 1

/** 주어진 식별자들 다음 값. 목 데이터의 발급기다. */
const nextIdAfter = (ids: readonly CommunityId[]): CommunityId =>
  String(
    ids.reduce((max, id) => (BigInt(id) > max ? BigInt(id) : max), BigInt(0)) +
      BigInt(1),
  )

/** 식별자를 하나 올린다. */
const incrementId = (id: CommunityId): CommunityId =>
  String(BigInt(id) + BigInt(1))

const comparePosts = (
  left: CommunityPostSummary,
  right: CommunityPostSummary,
  params: CommunityCursorParams,
) => {
  const direction = params.orderType === 'DESC' ? -1 : 1

  if (params.sortType === 'POPULAR') {
    return (
      direction * (left.likeCount - right.likeCount) ||
      direction * compareIds(left.postId, right.postId)
    )
  }

  return direction * compareIds(left.postId, right.postId)
}

const isAfterCursor = (
  post: CommunityPostSummary,
  params: CommunityCursorParams,
) => {
  if (compareIds(params.lastPostId, '0') <= 0) {
    return true
  }

  if (params.sortType === 'LATEST') {
    return params.orderType === 'ASC'
      ? compareIds(post.postId, params.lastPostId) > 0
      : compareIds(post.postId, params.lastPostId) < 0
  }

  if (params.orderType === 'ASC') {
    return (
      post.likeCount > params.lastLikeCount ||
      (post.likeCount === params.lastLikeCount &&
        compareIds(post.postId, params.lastPostId) > 0)
    )
  }

  return (
    post.likeCount < params.lastLikeCount ||
    (post.likeCount === params.lastLikeCount &&
      compareIds(post.postId, params.lastPostId) < 0)
  )
}

const paginate = <Post extends CommunityPostSummary>(
  posts: Post[],
  params: CommunityCursorParams,
) => {
  const sorted = posts
    .filter(post => isAfterCursor(post, params))
    .sort((left, right) => comparePosts(left, right, params))
  const size = Math.max(0, Math.floor(params.size))
  const contents = sorted.slice(0, size)

  return {
    contents,
    hasNext: contents.length < sorted.length,
  }
}

const getPreviewContent = (content: string) => content.slice(0, 160)

const findPost = (state: CommunityMockState, postId: CommunityId) => {
  const post = state.posts.find(item => item.postId === postId)

  if (!post) {
    throw new Error(`게시글 ${postId}을 찾을 수 없습니다.`)
  }

  return post
}

const findDetail = (state: CommunityMockState, postId: CommunityId) => {
  const detail = state.details.find(item => item.postId === postId)

  if (!detail) {
    throw new Error(`게시글 ${postId}을 찾을 수 없습니다.`)
  }

  return detail
}

const updatePostCommentCount = (
  state: CommunityMockState,
  postId: CommunityId,
  difference: number,
) => {
  const post = findPost(state, postId)
  const detail = findDetail(state, postId)
  post.commentCount = Math.max(0, post.commentCount + difference)
  detail.commentCount = post.commentCount
}

type CommentLocation =
  | {
      comment: CommunityComment
      parent: null
    }
  | {
      comment: CommunityReply
      parent: CommunityComment
    }

const findComment = (
  state: CommunityMockState,
  postId: CommunityId,
  commentId: CommunityId,
): CommentLocation => {
  for (const comment of state.comments) {
    if (comment.postId !== postId) continue

    if (comment.commentId === commentId) {
      return { comment, parent: null }
    }

    const reply = comment.replies.find(item => item.commentId === commentId)

    if (reply) {
      return { comment: reply, parent: comment }
    }
  }

  throw new Error(`댓글 ${commentId}을 찾을 수 없습니다.`)
}

export const createCommunityMockSource = (): CommunityDataSource => {
  const state = createState()

  return {
    async getPosts(params: CommunityListParams) {
      const hasBoardTarget = Boolean(params.targetType && params.targetCode)
      const filtered = hasBoardTarget
        ? state.posts.filter(
            post =>
              post.targetType?.code === params.targetType &&
              post.targetCode === params.targetCode,
          )
        : state.posts
      const board = hasBoardTarget
        ? {
            ...resolveTarget(params.targetType, params.targetCode),
          }
        : null

      return ok({
        board,
        posts: paginate(filtered, params),
      })
    },

    async searchPosts(params: CommunitySearchParams) {
      const keyword = params.keyword.trim().toLocaleLowerCase()
      const detailsByPostId = new Map(
        state.details.map(detail => [detail.postId, detail]),
      )
      const filtered = state.posts.filter(post => {
        const detail = detailsByPostId.get(post.postId)
        return (
          post.title.toLocaleLowerCase().includes(keyword) ||
          detail?.content.toLocaleLowerCase().includes(keyword)
        )
      })

      return ok({
        board: null,
        posts: paginate(filtered, params),
      })
    },

    async getLikedPosts(params: CommunityCursorParams) {
      const posts = state.posts.flatMap<CommunityLikedPost>(post => {
        const likedAt = state.likedAtByPostId.get(post.postId)
        return likedAt ? [{ ...post, likedAt }] : []
      })

      return ok({
        posts: paginate(posts, params),
      })
    },

    async getPost(postId: CommunityId) {
      findPost(state, postId)
      const detail = findDetail(state, postId)
      detail.viewCount += 1
      return ok(detail)
    },

    /**
     * 실제 백엔드는 좌·우 지표를 읽어 문장을 만든다. 목은 그 문장을 흉내 내지 않고
     * **모양만** 맞춘다 — 목이 그럴듯한 분석 문장을 지어내면 화면을 볼 때 진짜 초안과
     * 구별이 안 된다. 대상 코드가 목에 없으면 `resolveTarget` 이 던지고, 화면은
     * 그것을 초안 실패로 다룬다(실제 404 와 같은 경로다).
     */
    async createComparisonDraft(params: ComparisonDraftParams) {
      const target = resolveTarget('ADMINISTRATION', params.administrationCode)

      return ok({
        ...target,
        title: `${params.leftCommercialCode} · ${params.rightCommercialCode} 상권 비교`,
        content: `[목 초안] ${target.targetName}의 두 상권을 비교한 내용을 여기에 적습니다.`,
      })
    },

    async uploadPostImages(files: File[]) {
      /*
       * 목은 파일을 어디에도 올리지 않는다. 키 모양만 실제와 맞춘다
       * (`{prefix}/{memberId}/{yyyy}/{MM}/{name}`) — 화면이 키를 그대로 되돌려 보내는
       * 흐름을 목에서도 그대로 밟게 하려는 것이다.
       */
      return files.map((file, index) => {
        const imageKey = `community/posts/${MOCK_COMMUNITY_MEMBER_ID}/mock/${state.nextPostId}-${index}-${file.name}`
        return { imageKey, imageUrl: mockImageUrl(imageKey) }
      })
    },

    async createPost(payload: CommunityPostCreateRequest) {
      const target = resolveTarget(payload.targetType, payload.targetCode)
      const createdAt = nextTimestamp(state)
      const postId = state.nextPostId
      state.nextPostId = incrementId(postId)
      const images = toMockImages(payload.imageKeys)
      const detail: CommunityPostDetail = {
        postId,
        memberId: MOCK_COMMUNITY_MEMBER_ID,
        ...target,
        title: payload.title,
        content: payload.content,
        likeCount: 0,
        commentCount: 0,
        viewCount: 0,
        createdAt,
        updatedAt: createdAt,
        images,
      }
      const summary: CommunityPostSummary = {
        postId,
        memberId: MOCK_COMMUNITY_MEMBER_ID,
        ...target,
        title: payload.title,
        previewContent: getPreviewContent(payload.content),
        likeCount: 0,
        commentCount: 0,
        createdAt,
        thumbnailUrl: images[0]?.imageUrl ?? null,
      }

      state.details.push(detail)
      state.posts.push(summary)

      return ok(detail)
    },

    async updatePost(postId: CommunityId, payload: CommunityPostUpdateRequest) {
      const post = findPost(state, postId)
      const detail = findDetail(state, postId)

      if (post.memberId !== MOCK_COMMUNITY_MEMBER_ID) {
        throw new Error(`게시글 ${postId}을 수정할 권한이 없습니다.`)
      }

      post.title = payload.title
      post.previewContent = getPreviewContent(payload.content)
      detail.title = payload.title
      detail.content = payload.content
      detail.updatedAt = nextTimestamp(state)
      /*
       * **백엔드와 같은 규칙을 흉내 낸다.** `imageKeys` 는 「수정 후 남길 목록」이라
       * 여기 없는 기존 이미지는 사라진다. 목이 이 규칙을 안 따르면 `?mock=1` 로는
       * 멀쩡한데 실서버에서만 사진이 지워지는, 가장 늦게 발견되는 종류의 차이가 생긴다.
       */
      detail.images = toMockImages(payload.imageKeys)
      post.thumbnailUrl = detail.images[0]?.imageUrl ?? null

      return ok(detail)
    },

    async deletePost(postId: CommunityId) {
      const post = findPost(state, postId)

      if (post.memberId !== MOCK_COMMUNITY_MEMBER_ID) {
        throw new Error(`게시글 ${postId}을 삭제할 권한이 없습니다.`)
      }

      const removedCommentIds = state.comments
        .filter(comment => comment.postId === postId)
        .flatMap(comment => [
          comment.commentId,
          ...comment.replies.map(reply => reply.commentId),
        ])

      state.posts = state.posts.filter(post => post.postId !== postId)
      state.details = state.details.filter(detail => detail.postId !== postId)
      state.comments = state.comments.filter(
        comment => comment.postId !== postId,
      )
      state.likedAtByPostId.delete(postId)
      removedCommentIds.forEach(commentId =>
        state.likedCommentIds.delete(commentId),
      )

      return ok(null)
    },

    async togglePostLike(postId: CommunityId) {
      const post = findPost(state, postId)
      const detail = findDetail(state, postId)
      const liked = !state.likedAtByPostId.has(postId)

      if (liked) {
        state.likedAtByPostId.set(postId, nextTimestamp(state))
        post.likeCount += 1
      } else {
        state.likedAtByPostId.delete(postId)
        post.likeCount = Math.max(0, post.likeCount - 1)
      }
      detail.likeCount = post.likeCount

      return ok({
        postId,
        liked,
        likeCount: post.likeCount,
      })
    },

    async getComments(postId: CommunityId) {
      findPost(state, postId)
      return ok({
        comments: state.comments.filter(comment => comment.postId === postId),
      })
    },

    async createComment(
      postId: CommunityId,
      payload: CommunityCommentCreateRequest,
    ) {
      findPost(state, postId)
      let parent: CommunityComment | undefined

      if (payload.parentCommentId !== undefined) {
        const location = findComment(state, postId, payload.parentCommentId)

        if (location.parent) {
          throw new Error('답글에는 추가 답글을 작성할 수 없습니다.')
        }

        parent = location.comment
      }

      const createdAt = nextTimestamp(state)
      const commentId = state.nextCommentId
      state.nextCommentId = incrementId(commentId)

      if (parent) {
        parent.replies.push({
          commentId,
          postId,
          memberId: MOCK_COMMUNITY_MEMBER_ID,
          parentCommentId: parent.commentId,
          content: payload.content,
          likeCount: 0,
          createdAt,
          updatedAt: createdAt,
        })
      } else {
        state.comments.push({
          commentId,
          postId,
          memberId: MOCK_COMMUNITY_MEMBER_ID,
          content: payload.content,
          likeCount: 0,
          createdAt,
          updatedAt: createdAt,
          replies: [],
        })
      }

      updatePostCommentCount(state, postId, 1)

      return ok({
        comments: state.comments.filter(comment => comment.postId === postId),
      })
    },

    async deleteComment(postId: CommunityId, commentId: CommunityId) {
      findPost(state, postId)
      const location = findComment(state, postId, commentId)

      if (location.comment.memberId !== MOCK_COMMUNITY_MEMBER_ID) {
        throw new Error(`댓글 ${commentId}을 삭제할 권한이 없습니다.`)
      }

      const removedIds = location.parent
        ? [commentId]
        : [
            location.comment.commentId,
            ...location.comment.replies.map(reply => reply.commentId),
          ]

      if (location.parent) {
        location.parent.replies = location.parent.replies.filter(
          reply => reply.commentId !== commentId,
        )
        state.likedCommentIds.delete(commentId)
        updatePostCommentCount(state, postId, -1)
      } else {
        state.comments = state.comments.filter(
          comment => comment.commentId !== commentId,
        )
        removedIds.forEach(id => state.likedCommentIds.delete(id))
        updatePostCommentCount(state, postId, -removedIds.length)
      }

      return ok(null)
    },

    async toggleCommentLike(postId: CommunityId, commentId: CommunityId) {
      findPost(state, postId)
      const { comment } = findComment(state, postId, commentId)
      const liked = !state.likedCommentIds.has(commentId)

      if (liked) {
        state.likedCommentIds.add(commentId)
        comment.likeCount += 1
      } else {
        state.likedCommentIds.delete(commentId)
        comment.likeCount = Math.max(0, comment.likeCount - 1)
      }

      return ok({
        commentId,
        liked,
        likeCount: comment.likeCount,
      })
    },

    async createReport(payload: CommunityReportCreateRequest) {
      if (payload.targetKind === 'POST') {
        findPost(state, payload.targetId)
      } else {
        const exists = state.comments.some(
          comment =>
            comment.commentId === payload.targetId ||
            comment.replies.some(reply => reply.commentId === payload.targetId),
        )

        if (!exists) {
          throw new Error(`댓글 ${payload.targetId}을 찾을 수 없습니다.`)
        }
      }

      return ok(null)
    },
  }
}

export const communityMockSource = createCommunityMockSource()
