import type { CommunityNotificationUnreadCountResponse } from '@/types/community'

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
