'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchCommunityNotificationUnreadCount } from '@/lib/api/community'
import {
  COMMUNITY_NOTIFICATION_POLL_INTERVAL_MS,
  communityNotificationKeys,
  readCommunityNotificationUnreadCount,
} from '@/lib/community/notifications'

/**
 * 헤더 배지의 안 읽은 알림 수(#535, 설계 §7 `GET /community/notifications/unread-count`).
 *
 * - **회원 id 가 있을 때만** 부른다. 비로그인·로그인 확인 전에는 요청하지 않는다.
 * - 갱신: 마운트 · 창 포커스 복귀 · 60초마다(탭이 뒤에 있으면 쉬는 React Query 기본값). 전역 기본값이
 *   포커스 갱신을 끄고 staleTime 이 5분이라 여기서 둘 다 덮는다.
 * - **실패는 조용히 삼킨다.** 재시도하지 않고, 오류 상태면 null 을 돌려 배지를 숨긴다 — API 가 아직 없는
 *   환경(404)이나 일시 장애에서 헤더가 깨지거나 오류 안내가 뜨면 안 된다.
 */
export const useCommunityNotificationUnreadCount = (
  memberId: string | null,
): number | null => {
  const query = useQuery({
    queryKey: communityNotificationKeys.unreadCount(memberId ?? 'anonymous'),
    enabled: Boolean(memberId),
    queryFn: async () =>
      readCommunityNotificationUnreadCount(
        await fetchCommunityNotificationUnreadCount(),
      ),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: COMMUNITY_NOTIFICATION_POLL_INTERVAL_MS,
  })

  if (!memberId || query.isError) {
    return null
  }

  return query.data ?? null
}

export default useCommunityNotificationUnreadCount
