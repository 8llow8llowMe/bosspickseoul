import { formatCommunityWriter } from '@/lib/community'
import type {
  CommunityComment,
  CommunityId,
  CommunityNotificationItem,
  CommunityNotificationListParams,
  CommunityNotificationListResponse,
  CommunityNotificationTypeCode,
  CommunityNotificationUnreadCountResponse,
  CommunityPostSlice,
} from '@/types/community'

/*
  커뮤니티 알림(#535·#536). 계약은 `backend/docs/services/community-notification-design.md` §7 이고,
  화면 규칙은 `docs/features/community/community.md` §S4 「알림」이다.
*/

/** 헤더 배지에 적는 최대 숫자. 그보다 많으면 `99+` 다(설계 §15-4). */
export const COMMUNITY_NOTIFICATION_BADGE_MAX = 99

/** 헤더 배지 갱신 주기. 마운트·창 포커스 복귀 때도 다시 받는다(설계 §14 폴링 부하). */
export const COMMUNITY_NOTIFICATION_POLL_INTERVAL_MS = 60_000

export const COMMUNITY_NOTIFICATIONS_PATH = '/community/notifications'

/**
 * 알림 쿼리 키. 게시글 키(`['community', …]`)와 접두를 나눈다 — 글 작성·삭제의 `communityKeys.all`
 * 무효화가 알림까지 다시 부르지 않게. 회원 id 를 넣어 로그아웃·다른 계정 로그인 뒤 앞사람의 수가
 * 캐시에서 나오지 않게 한다.
 */
export const communityNotificationKeys = {
  all: ['community-notifications'] as const,
  unreadCount: (memberId: string) =>
    ['community-notifications', 'unread-count', memberId] as const,
  list: (memberId: string, unreadOnly: boolean) =>
    ['community-notifications', 'list', memberId, unreadOnly] as const,
}

const toBadgeCount = (count: number | null | undefined) =>
  typeof count === 'number' && Number.isFinite(count) && count >= 1
    ? Math.floor(count)
    : 0

/**
 * 헤더 배지 문구. 0·모름(null)이면 배지를 그리지 않는다(null). 99 를 넘으면 `99+`.
 */
export const formatCommunityNotificationBadge = (
  count: number | null | undefined,
): string | null => {
  const value = toBadgeCount(count)

  if (value === 0) {
    return null
  }

  return value > COMMUNITY_NOTIFICATION_BADGE_MAX
    ? `${COMMUNITY_NOTIFICATION_BADGE_MAX}+`
    : String(value)
}

/**
 * 종 아이콘 링크의 접근성 이름. 배지 숫자는 장식(aria-hidden)이고 이 이름이 수를 읽어 준다.
 */
export const getCommunityNotificationBellLabel = (
  count: number | null | undefined,
) => {
  const value = toBadgeCount(count)

  if (value === 0) {
    return '알림'
  }

  return value > COMMUNITY_NOTIFICATION_BADGE_MAX
    ? `알림, 안 읽은 알림 ${COMMUNITY_NOTIFICATION_BADGE_MAX}개 넘게`
    : `알림, 안 읽은 알림 ${value}개`
}

/**
 * 안 읽은 수 응답에서 숫자만 꺼낸다. 실패 envelope 이거나 모양이 다르면 null — 헤더는 배지를
 * 조용히 숨긴다(오류를 보이지 않는다).
 */
export const readCommunityNotificationUnreadCount = (
  response: CommunityNotificationUnreadCountResponse | null | undefined,
): number | null => {
  if (!response?.dataHeader?.success) {
    return null
  }

  const value = response.dataBody?.unreadCount

  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/* ---------------------------------------------------------------------------
 * 알림 목록(#536)
 * ------------------------------------------------------------------------- */

/** 한 쪽 크기. 서버 기본값과 같다(설계 §7, 1~50). */
export const COMMUNITY_NOTIFICATION_PAGE_SIZE = 20

export type CommunityNotificationCursor = Pick<
  CommunityNotificationListParams,
  'lastNotificationId' | 'lastEventAt'
>

/** 첫 쪽 커서. `lastNotificationId` 0 이면 서버가 `lastEventAt` 을 요구하지 않는다. */
export const COMMUNITY_NOTIFICATION_INITIAL_CURSOR: CommunityNotificationCursor =
  { lastNotificationId: '0' }

export const createCommunityNotificationParams = (
  unreadOnly: boolean,
  cursor: CommunityNotificationCursor,
): CommunityNotificationListParams => ({
  unreadOnly,
  lastNotificationId: cursor.lastNotificationId,
  ...(cursor.lastNotificationId !== '0' && cursor.lastEventAt
    ? { lastEventAt: cursor.lastEventAt }
    : {}),
  size: COMMUNITY_NOTIFICATION_PAGE_SIZE,
})

/**
 * 다음 쪽 커서 = **마지막 항목의 `lastEventAt` + `notificationId`**(설계 §7-1). 정렬이
 * `last_event_at DESC, id DESC` 라 시각이 같은 묶음도 id 로 가른다. 두 값 모두 받은 문자열을 그대로 쓴다 —
 * id 는 Snowflake 라 숫자로 바꾸면 뒷자리가 날아가고, 시각은 마이크로초까지 와서 `Date` 를 거치면 잘린다.
 *
 * `previousCursor` 와 같은 커서가 다시 나오면 끝으로 친다 — 서버가 `hasNext` 를 잘못 줘도 같은 쪽을
 * 무한히 부르지 않는다(게시글 목록 `getCommunityNextPageParam` 과 같은 방어).
 */
export const getCommunityNotificationNextCursor = (
  slice: CommunityPostSlice<CommunityNotificationItem>,
  previousCursor?: CommunityNotificationCursor,
): CommunityNotificationCursor | undefined => {
  if (!slice.hasNext) {
    return undefined
  }

  const last = slice.contents.at(-1)

  if (!last) {
    return undefined
  }

  const next = {
    lastNotificationId: last.notificationId,
    lastEventAt: last.lastEventAt,
  }

  if (
    previousCursor &&
    previousCursor.lastNotificationId === next.lastNotificationId &&
    previousCursor.lastEventAt === next.lastEventAt
  ) {
    return undefined
  }

  return next
}

const knownNotificationTypes: readonly CommunityNotificationTypeCode[] = [
  'COMMENT_ON_POST',
  'REPLY_ON_COMMENT',
]

const readNotificationType = (
  item: CommunityNotificationItem,
): CommunityNotificationTypeCode | null => {
  const code = item.notificationType?.code
  return knownNotificationTypes.find(known => known === code) ?? null
}

/** 묶인 댓글 수. 이상한 값(0·음수·NaN)은 1개로 읽는다 — 알림 행이 있다는 것은 댓글이 하나는 있다는 뜻이다. */
const readEventCount = (value: number) =>
  Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1

/** 「삭제된 글」 — 글이 ACTIVE 가 아니면 서버가 제목을 지운다(설계 §10). 이동도 막는다. */
export const COMMUNITY_NOTIFICATION_DELETED_POST = '삭제된 글'

const formatSubject = (item: CommunityNotificationItem) => {
  if (!item.targetAvailable) {
    return COMMUNITY_NOTIFICATION_DELETED_POST
  }

  const title = item.postTitle?.trim()
  return title ? `'${title}' 글` : '제목 없는 글'
}

/**
 * 행위자 호칭. 닉네임이 null·공백이면 작성자 표시와 같은 대체 문구 「사장님」이다
 * (`COMMUNITY_WRITER_FALLBACK`). `"탈퇴회원"` 은 받은 대로 적는다 — FE 가 판정하지 않는다.
 */
export const formatCommunityNotificationActor = (
  nickname: string | null | undefined,
) => {
  const name = formatCommunityWriter(nickname)
  return name.endsWith('님') ? name : `${name}님`
}

/**
 * 알림 한 줄 문구. 메시지는 서버가 주지 않으므로 종류·닉네임·건수·제목으로 조립한다(설계 §7-1·§15-5).
 * `eventCount` 는 **댓글 수**다 — 사람 수로 읽히지 않게 「새 댓글 N개 — 최근 OO님」으로 쓴다.
 *
 * - 1개: 「OO님이 '제목' 글에 댓글을 남겼어요」
 * - 여러 개: 「'제목' 글에 새 댓글 3개 — 최근 OO님」
 * - 답글은 「'제목' 글의 내 댓글에 …」, 사라진 글은 제목 대신 「삭제된 글」
 * - 모르는 종류는 「새 알림」으로 적는다(BE 가 종류를 더해도 화면이 죽지 않는다)
 */
export const formatCommunityNotificationMessage = (
  item: CommunityNotificationItem,
) => {
  const subject = formatSubject(item)
  const actor = formatCommunityNotificationActor(item.actorNickname)
  const count = readEventCount(item.eventCount)
  const type = readNotificationType(item)

  if (type === 'COMMENT_ON_POST') {
    return count === 1
      ? `${actor}이 ${subject}에 댓글을 남겼어요`
      : `${subject}에 새 댓글 ${count}개 — 최근 ${actor}`
  }

  if (type === 'REPLY_ON_COMMENT') {
    return count === 1
      ? `${actor}이 ${subject}의 내 댓글에 답글을 남겼어요`
      : `${subject}의 내 댓글에 새 답글 ${count}개 — 최근 ${actor}`
  }

  return count === 1
    ? `${subject}에 새 알림이 있어요 — 최근 ${actor}`
    : `${subject}에 새 알림 ${count}개 — 최근 ${actor}`
}

const COMMENT_ANCHOR_PREFIX = 'comment-'

/** 댓글 행의 DOM id. 알림에서 들어온 주소의 해시(`#comment-{id}`)가 이 id 를 가리킨다. */
export const getCommunityCommentAnchorId = (commentId: CommunityId) =>
  `${COMMENT_ANCHOR_PREFIX}${commentId}`

/** `#comment-{id}` → id. 모양이 다르면 null. */
export const parseCommunityCommentAnchor = (hash: string) => {
  const value = hash.startsWith('#') ? hash.slice(1) : hash

  if (!value.startsWith(COMMENT_ANCHOR_PREFIX)) {
    return null
  }

  const commentId = value.slice(COMMENT_ANCHOR_PREFIX.length)
  return commentId || null
}

/**
 * 앵커가 가리키는 댓글을 찾는다. 답글이면 부모 id 도 준다 — 답글은 처음에 3개만 보여(CM-026) 부모를
 * 펼쳐야 행이 그려진다.
 */
export const findCommunityCommentAnchorTarget = (
  comments: CommunityComment[],
  commentId: CommunityId,
): { commentId: CommunityId; parentCommentId: CommunityId | null } | null => {
  for (const comment of comments) {
    if (comment.commentId === commentId) {
      return { commentId, parentCommentId: null }
    }

    if (comment.replies.some(entry => entry.commentId === commentId)) {
      return { commentId, parentCommentId: comment.commentId }
    }
  }

  return null
}

/**
 * 알림을 누르면 갈 곳. 글이 사라졌으면(`targetAvailable=false`) null — 이동을 막는다. 마지막 유발 댓글이
 * 있으면 그 댓글 앵커까지 붙인다.
 */
export const createCommunityNotificationHref = (
  item: CommunityNotificationItem,
) => {
  if (!item.targetAvailable) {
    return null
  }

  const base = `/community/${item.postId}`
  return item.commentId
    ? `${base}#${getCommunityCommentAnchorId(item.commentId)}`
    : base
}

/**
 * 쪽을 이어 붙인 목록. 같은 묶음이 두 쪽에 걸쳐 오면(쪽 사이에 묶음이 갱신돼 자리가 바뀐 경우) 처음 것만
 * 둔다 — React key 가 겹치지 않게.
 */
export const dedupeCommunityNotifications = (
  pages: CommunityNotificationItem[][],
) => {
  const seen = new Set<CommunityId>()
  const result: CommunityNotificationItem[] = []

  for (const page of pages) {
    for (const entry of page) {
      if (!seen.has(entry.notificationId)) {
        seen.add(entry.notificationId)
        result.push(entry)
      }
    }
  }

  return result
}

/** 단건 읽음 뒤 캐시의 그 항목만 `read: true` 로 바꾼 새 쪽 배열. 나머지는 같은 참조를 둔다. */
export const markCommunityNotificationReadInPages = (
  pages: CommunityNotificationListResponse[],
  notificationId: CommunityId,
): CommunityNotificationListResponse[] =>
  pages.map(page => {
    const contents = page.dataBody?.notifications?.contents

    if (
      !contents?.some(
        entry => entry.notificationId === notificationId && !entry.read,
      )
    ) {
      return page
    }

    return {
      ...page,
      dataBody: {
        ...page.dataBody,
        notifications: {
          ...page.dataBody.notifications,
          contents: contents.map(entry =>
            entry.notificationId === notificationId
              ? { ...entry, read: true }
              : entry,
          ),
        },
      },
    }
  })
