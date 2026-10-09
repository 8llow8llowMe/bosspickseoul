import type { BrowserContext, Request, Route } from '@playwright/test'
import {
  communityMockLocations,
  createCommunityMockSource,
  MOCK_COMMUNITY_MEMBER_ID,
} from '../../src/lib/community/community-mock'
import { SESSION_COOKIE } from '../../src/lib/auth/session-constants'
import type { ApiResponse } from '../../src/types/api'
import type { MemberInfo } from '../../src/types/auth'
import type {
  CommunityCommentCreateRequest,
  CommunityCursorParams,
  CommunityNotificationItem,
  CommunityPostCreateRequest,
  CommunityPostUpdateRequest,
  CommunityReportCreateRequest,
  CommunitySortType,
  CommunityOrderType,
  CommunityPopularPeriod,
  CommunityPostCategoryCode,
  CommunityTargetType,
} from '../../src/types/community'

/**
 * 커뮤니티 BFF 고정 응답 — **목 모드(`?mock=1`) 없이** 커뮤니티 화면을 연다.
 *
 * 목 모드는 `NODE_ENV !== 'production'` 에서만 켜져 프로덕션 빌드(`pnpm start`)에서는 돌지 않는다.
 * 그래서 화면은 실데이터 경로 그대로 두고, 브라우저가 내보내는 BFF 호출만 여기서 가로챈다(#469 (a)).
 * 응답은 **목 데이터 소스(`createCommunityMockSource`)가 그대로 만든다** — fixture 를 두 벌 두지 않고,
 * 목 소스가 이미 실제 응답과 같은 타입(`CommunityDataSource`)을 지킨다. 페이지마다 새 소스를 만들어
 * 테스트끼리 좋아요·댓글 상태가 새지 않는다.
 *
 * 로그인은 두 곳에서 흉내 낸다.
 * - 미들웨어(`middleware.ts`)는 세션 쿠키가 **있는지만** 본다 → 아무 값이나 담은 쿠키를 둔다.
 *   서버는 그 값을 복호화하지 못해 세션 없음으로 읽는다(`decryptSession`).
 * - 화면의 로그인 상태는 브라우저의 `GET /api/auth/me` 로 정해진다 → 목 회원(9001)으로 답한다.
 *
 * 가로채지 않은 `/api/bff/*` 호출은 501 로 막고 `unhandled` 에 남긴다. CI 에는 백엔드가 없으므로
 * 새 호출이 생기면 조용히 실패하지 말고 여기서 드러나야 한다. 처리 중 난 예외(목 소스의 「없는 글」·
 * 「권한 없음」, 이 파일 자체의 버그)도 실패 envelope 로 답하되 `errors` 에 남긴다 — 기대한 실패인지는
 * 테스트가 정한다(`./community/test.ts` 가 끝날 때 둘 다 비었는지 본다).
 *
 * 라우트는 page 가 아니라 **context** 에 건다. 새 탭·팝업으로 연 화면도 같은 고정 응답을 받는다.
 */

export type CommunityApi = {
  /** 이 파일이 답하지 못한 BFF 호출(메서드 + 경로 + 쿼리). */
  unhandled: string[]
  /** 처리하다 예외가 난 호출과 그 메시지. 실패를 기대하는 테스트는 확인한 뒤 비운다. */
  errors: string[]
}

const MOCK_MEMBER: MemberInfo = {
  memberId: MOCK_COMMUNITY_MEMBER_ID,
  email: 'e2e-member@bosspick.test',
  name: '김사장',
  nickname: '역삼동 김사장',
  profileImageUrl: '',
  role: { code: 'USER', name: '일반 회원', description: '일반 회원' },
  provider: null,
  hasPassword: true,
}

const ok = <T>(dataBody: T): ApiResponse<T> => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody,
})

const fail = (message: string): ApiResponse<null> => ({
  dataHeader: {
    success: false,
    resultCode: 'E2E_MOCK',
    resultMessage: message,
  },
  dataBody: null,
})

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json;charset=utf-8',
    body: JSON.stringify(body),
  })

/** 쿼리 → 커서 파라미터. 화면이 보낸 값을 그대로 옮기고, 숫자 칸만 숫자로 되돌린다. */
const readCursor = (search: URLSearchParams): CommunityCursorParams => ({
  sortType: (search.get('sortType') ?? 'LATEST') as CommunitySortType,
  orderType: (search.get('orderType') ?? 'DESC') as CommunityOrderType,
  lastPostId: search.get('lastPostId') ?? '',
  lastLikeCount: Number(search.get('lastLikeCount') ?? 0),
  size: Number(search.get('size') ?? 10),
})

/**
 * 인기순 기간(#531). 화면이 보낸 값만 옮긴다 — 없으면 싣지 않아 목 소스가 서버처럼 이번 주로 읽는다.
 * 값 검증은 하지 않는다(서버의 400 을 흉내 낼 고정 응답이 아직 없다).
 */
const readPeriod = (search: URLSearchParams) => {
  const period = search.get('period') as CommunityPopularPeriod | null
  return period ? { period } : {}
}

/**
 * 말머리 필터(#529). 피드(`GET /posts`)에만 옮긴다 — 없으면(「전체」) 싣지 않는다. 값 검증은 하지 않는다
 * (서버의 400 `COMMUNITY_017` 을 흉내 낼 고정 응답이 아직 없다. 화면은 알려진 값만 보낸다).
 */
const readCategory = (search: URLSearchParams) => {
  const category = search.get('category') as CommunityPostCategoryCode | null
  return category ? { category } : {}
}

const readBody = <T>(request: Request): T => request.postDataJSON() as T

/** 멀티파트 본문에서 파일 이름만 읽는다 — 목 업로드는 이름으로 키를 만들 뿐 내용을 보지 않는다. */
const readUploadedFiles = (request: Request): File[] => {
  // 파일 바이트는 깨져도 상관없다 — 헤더의 한글 파일 이름이 깨지지 않게 utf8 로 읽는다.
  const raw = request.postDataBuffer()?.toString('utf8') ?? ''
  return [...raw.matchAll(/filename="([^"]*)"/g)].map(
    ([, name]) => new File([], name),
  )
}

/**
 * 커뮤니티 알림(#535·#536). 로그인한 목 회원이면 헤더 종이 안 읽은 수를 부른다 — 고정 응답이 없으면
 * 모든 커뮤니티 e2e 가 `unhandled` 로 깨진다.
 *
 * **BE 알림 API(#533·#534)는 아직 머지 전이다.** 응답 모양은 설계 문서
 * (`backend/docs/services/community-notification-design.md` §7·§7-1)를 그대로 옮겼다. 컨텍스트마다 새 목록을
 * 만들어 읽음 상태가 테스트끼리 새지 않는다.
 *
 * 앞 네 건이 화면 갈래를 덮는다 — 접힌 다섯째 답글(906, 글 9) 앵커 · 댓글 여러 개 묶음 · 사라진 글 ·
 * 닉네임 없음(읽음). 나머지는 다음 쪽(20건 단위)을 만들기 위한 읽은 알림이다.
 */
export const E2E_NOTIFICATION_TOTAL = 26

const pad = (value: number, size = 2) => String(value).padStart(size, '0')

/** 서버처럼 시간대 없는 ISO(LocalDateTime) — 브라우저는 현지 시각으로 읽는다. */
const toLocalDateTime = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(
    date.getMilliseconds(),
    3,
  )}000`

const minutesAgo = (now: number, minutes: number) =>
  toLocalDateTime(new Date(now - minutes * 60_000))

const COMMENT_ON_POST = {
  code: 'COMMENT_ON_POST',
  name: '내 글에 댓글',
  description: '내가 쓴 글에 새 댓글이 달렸습니다.',
}
const REPLY_ON_COMMENT = {
  code: 'REPLY_ON_COMMENT',
  name: '내 댓글에 답글',
  description: '내가 쓴 댓글에 답글이 달렸습니다.',
}

const fillerTitles = [
  ['1', '첫 가게를 준비하며 배운 것들'],
  ['2', '비 오는 날 매장 운영 팁'],
  ['4', '마포구 주말 행사를 준비하고 있어요'],
  ['5', '역삼1동 아침 매출 실험 후기'],
  ['7', '강남역 상권 테이크아웃 동선'],
] as const

const createE2ENotifications = (): CommunityNotificationItem[] => {
  const now = Date.now()
  const base = {
    actorMemberId: '8200',
    actorProfileImageUrl: null,
    createdAt: minutesAgo(now, 60 * 24 * 3),
  }
  const head: CommunityNotificationItem[] = [
    {
      ...base,
      notificationId: '7400000000000000026',
      notificationType: REPLY_ON_COMMENT,
      postId: '9',
      postTitle: '가게 앞 화단을 바꾼 전후 사진',
      targetAvailable: true,
      commentId: '906',
      commentPreview: '다섯 번째 답글 — 접힌 자리까지 내려가야 보인다',
      actorNickname: '답글러',
      eventCount: 2,
      read: false,
      lastEventAt: minutesAgo(now, 3),
    },
    {
      ...base,
      notificationId: '7400000000000000025',
      notificationType: COMMENT_ON_POST,
      postId: '1',
      postTitle: '첫 가게를 준비하며 배운 것들',
      targetAvailable: true,
      commentId: '103',
      commentPreview: '저도 첫 달에 같은 고민을 했어요. 재고부터 줄였습니다.',
      actorNickname: '성수동 박사장',
      eventCount: 3,
      read: false,
      lastEventAt: minutesAgo(now, 42),
    },
    {
      ...base,
      notificationId: '7400000000000000024',
      notificationType: COMMENT_ON_POST,
      postId: '99',
      postTitle: null,
      targetAvailable: false,
      commentId: '9901',
      commentPreview: null,
      actorNickname: '탈퇴회원',
      eventCount: 1,
      read: false,
      lastEventAt: minutesAgo(now, 60 * 5),
    },
    {
      ...base,
      notificationId: '7400000000000000023',
      notificationType: COMMENT_ON_POST,
      postId: '7',
      postTitle: '강남역 상권 테이크아웃 동선',
      targetAvailable: true,
      commentId: '702',
      commentPreview: '점심 피크에 줄 서는 위치를 바꿔 보세요.',
      actorNickname: null,
      eventCount: 1,
      read: true,
      lastEventAt: minutesAgo(now, 60 * 26),
    },
  ]
  const filler = Array.from(
    { length: E2E_NOTIFICATION_TOTAL - head.length },
    (_, index): CommunityNotificationItem => {
      const [postId, postTitle] = fillerTitles[index % fillerTitles.length]
      return {
        ...base,
        notificationId: `74000000000000000${pad(22 - index)}`,
        notificationType: COMMENT_ON_POST,
        postId,
        postTitle,
        targetAvailable: true,
        commentId: null,
        commentPreview: null,
        actorNickname: `이웃 사장 ${index + 1}`,
        eventCount: (index % 3) + 1,
        read: true,
        lastEventAt: minutesAgo(now, 60 * 48 + index * 60 * 6),
      }
    },
  )

  return [...head, ...filler]
}

/** `last_event_at DESC, id DESC` 와 같은 순서. id 는 길이가 같은 숫자 문자열이라 BigInt 로 비교한다. */
const isAfterCursor = (
  item: CommunityNotificationItem,
  lastEventAt: string,
  lastNotificationId: string,
) =>
  item.lastEventAt < lastEventAt ||
  (item.lastEventAt === lastEventAt &&
    BigInt(item.notificationId) < BigInt(lastNotificationId))

const handleNotifications = (
  notifications: CommunityNotificationItem[],
  request: Request,
  segments: string[],
  search: URLSearchParams,
): unknown | undefined => {
  const method = request.method()

  if (method === 'GET' && segments.length === 0) {
    const unreadOnly = search.get('unreadOnly') === 'true'
    const lastNotificationId = search.get('lastNotificationId') ?? '0'
    const lastEventAt = search.get('lastEventAt')
    const size = Number(search.get('size') ?? 20)

    if (lastNotificationId !== '0' && !lastEventAt) {
      throw new Error('lastEventAt 없이 다음 쪽을 요청했다')
    }

    const sorted = [...notifications]
      .filter(item => !unreadOnly || !item.read)
      .sort((left, right) =>
        left.lastEventAt === right.lastEventAt
          ? Number(BigInt(right.notificationId) - BigInt(left.notificationId))
          : right.lastEventAt.localeCompare(left.lastEventAt),
      )
      .filter(
        item =>
          lastNotificationId === '0' ||
          isAfterCursor(item, lastEventAt ?? '', lastNotificationId),
      )

    return ok({
      notifications: {
        contents: sorted.slice(0, size),
        hasNext: sorted.length > size,
      },
    })
  }

  if (
    method === 'GET' &&
    segments.length === 1 &&
    segments[0] === 'unread-count'
  ) {
    return ok({
      unreadCount: notifications.filter(item => !item.read).length,
    })
  }

  if (method === 'PATCH' && segments.length === 1 && segments[0] === 'read') {
    const unread = notifications.filter(item => !item.read)
    unread.forEach(item => {
      item.read = true
    })
    return ok({ updatedCount: unread.length })
  }

  if (method === 'PATCH' && segments.length === 2 && segments[1] === 'read') {
    const target = notifications.find(
      item => item.notificationId === segments[0],
    )
    if (!target) {
      throw new Error('없는 알림이다')
    }
    target.read = true
    return ok({ notificationId: target.notificationId, read: true })
  }

  return undefined
}

const handleCommunity = async (
  source: ReturnType<typeof createCommunityMockSource>,
  notifications: CommunityNotificationItem[],
  request: Request,
  segments: string[],
  search: URLSearchParams,
): Promise<unknown | undefined> => {
  const method = request.method()
  const [head, postId, child, commentId, grandChild] = segments

  if (head === 'notifications') {
    return handleNotifications(
      notifications,
      request,
      segments.slice(1),
      search,
    )
  }
  if (head === 'reports' && segments.length === 1 && method === 'POST') {
    return source.createReport(readBody<CommunityReportCreateRequest>(request))
  }
  if (head !== 'posts') return undefined

  if (segments.length === 1) {
    if (method === 'GET') {
      const targetType = search.get('targetType') as CommunityTargetType | null
      const targetCode = search.get('targetCode')
      return source.getPosts({
        ...readCursor(search),
        ...readPeriod(search),
        ...readCategory(search),
        ...(targetType ? { targetType } : {}),
        ...(targetCode ? { targetCode } : {}),
      })
    }
    if (method === 'POST') {
      return source.createPost(readBody<CommunityPostCreateRequest>(request))
    }
    return undefined
  }

  if (postId === 'search' && method === 'GET') {
    return source.searchPosts({
      ...readCursor(search),
      ...readPeriod(search),
      keyword: search.get('keyword') ?? '',
    })
  }
  if (postId === 'liked' && method === 'GET') {
    return source.getLikedPosts(readCursor(search))
  }
  if (postId === 'images' && method === 'POST') {
    return ok(await source.uploadPostImages(readUploadedFiles(request)))
  }
  if (
    postId === 'drafts' &&
    child === 'commercial-comparisons' &&
    method === 'POST'
  ) {
    const body = readBody<{
      targetCode: string
      leftCommercialCode: string
      rightCommercialCode: string
      serviceCode: string
      periodCode: string
    }>(request)
    return source.createComparisonDraft(
      {
        administrationCode: body.targetCode,
        leftCommercialCode: body.leftCommercialCode,
        rightCommercialCode: body.rightCommercialCode,
        serviceCode: body.serviceCode,
      },
      body.periodCode,
    )
  }

  if (segments.length === 2) {
    if (method === 'GET') return source.getPost(postId)
    if (method === 'PATCH') {
      return source.updatePost(
        postId,
        readBody<CommunityPostUpdateRequest>(request),
      )
    }
    if (method === 'DELETE') return source.deletePost(postId)
    return undefined
  }

  if (child === 'likes' && segments.length === 3 && method === 'POST') {
    return source.togglePostLike(postId)
  }

  if (child === 'comments') {
    if (segments.length === 3) {
      if (method === 'GET') return source.getComments(postId)
      if (method === 'POST') {
        return source.createComment(
          postId,
          readBody<CommunityCommentCreateRequest>(request),
        )
      }
    }
    if (segments.length === 4 && method === 'DELETE') {
      return source.deleteComment(postId, commentId)
    }
    if (segments.length === 5 && grandChild === 'likes' && method === 'POST') {
      return source.toggleCommentLike(postId, commentId)
    }
  }

  return undefined
}

/** 지역 선택 시트가 부르는 행정동·상권 목록. 목 모드와 같은 지역 값을 준다. */
const handleRegions = (segments: string[]): unknown | undefined => {
  const [head, districtCode, child, administrationCode, grandChild] = segments
  if (head !== 'districts' || child !== 'administrations') return undefined

  if (segments.length === 3) {
    const byDistrict: Record<string, readonly unknown[]> =
      communityMockLocations.administrationsByDistrict
    return ok([...(byDistrict[districtCode] ?? [])])
  }
  if (segments.length === 5 && grandChild === 'commercials') {
    const byAdministration: Record<string, readonly unknown[]> =
      communityMockLocations.commercialsByAdministration
    return ok([...(byAdministration[administrationCode] ?? [])])
  }
  return undefined
}

export const routeCommunityApi = async (
  context: BrowserContext,
  baseURL: string,
): Promise<CommunityApi> => {
  const source = createCommunityMockSource()
  const notifications = createE2ENotifications()
  const api: CommunityApi = { unhandled: [], errors: [] }

  await context.addCookies([
    { name: SESSION_COOKIE, value: 'e2e-community', url: baseURL },
  ])

  await context.route('**/api/auth/me', route =>
    json(route, 200, { authenticated: true, member: MOCK_MEMBER }),
  )

  await context.route('**/api/bff/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const [area, ...segments] = url.pathname
      .replace(/^\/api\/bff\//, '')
      .split('/')
      .filter(Boolean)
      .map(decodeURIComponent)

    try {
      const body =
        area === 'community'
          ? await handleCommunity(
              source,
              notifications,
              request,
              segments,
              url.searchParams,
            )
          : area === 'regions'
            ? handleRegions(segments)
            : // 분석 기준 분기 카탈로그 — 글쓰기의 비교 초안이 서버 기본 분기로 요청한다(period-catalog.md D5-2).
              area === 'commercials' && segments[0] === 'periods'
              ? ok({ defaultPeriodCode: '20261' })
              : undefined

      if (body !== undefined) {
        await json(route, 200, body)
        return
      }
    } catch (error) {
      // 목 소스는 없는 글·권한 없음을 예외로 알린다 — 백엔드처럼 실패 envelope 로 돌려준다.
      const message = error instanceof Error ? error.message : String(error)
      api.errors.push(`${request.method()} ${url.pathname}: ${message}`)
      await json(route, message.includes('권한') ? 403 : 404, fail(message))
      return
    }

    api.unhandled.push(`${request.method()} ${url.pathname}${url.search}`)
    await json(route, 501, fail('e2e 고정 응답이 없는 BFF 호출입니다.'))
  })

  return api
}
