'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { isAxiosError } from 'axios'
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'

import CommunityNotificationsView, {
  getCommunityNotificationsFooter,
  type CommunityNotificationsStatus,
} from '@/components/community/community-notifications-view'
import { useCommunityNotificationUnreadCount } from '@/hooks/use-community-notification-unread-count'
import {
  fetchCommunityNotifications,
  markAllCommunityNotificationsRead,
  markCommunityNotificationRead,
} from '@/lib/api/community'
import { getCommunityLoginHref } from '@/lib/community/community-state'
import {
  COMMUNITY_NOTIFICATION_INITIAL_CURSOR,
  COMMUNITY_NOTIFICATIONS_PATH,
  communityNotificationKeys,
  createCommunityNotificationParams,
  dedupeCommunityNotifications,
  getCommunityNotificationNextCursor,
  markCommunityNotificationReadInPages,
  type CommunityNotificationCursor,
} from '@/lib/community/notifications'
import { useAuthStore } from '@/stores/auth-store'
import type {
  CommunityNotificationItem,
  CommunityNotificationListResponse,
} from '@/types/community'

/** 주소의 「안 읽은 것만」. 뒤로 가기·새로고침이 같은 보기를 낸다. */
export const COMMUNITY_NOTIFICATIONS_UNREAD_PARAM = 'unread'

export const parseCommunityNotificationsUnreadOnly = (
  searchParams: URLSearchParams,
) => searchParams.get(COMMUNITY_NOTIFICATIONS_UNREAD_PARAM) === '1'

export const createCommunityNotificationsHref = (unreadOnly: boolean) =>
  unreadOnly
    ? `${COMMUNITY_NOTIFICATIONS_PATH}?${COMMUNITY_NOTIFICATIONS_UNREAD_PARAM}=1`
    : COMMUNITY_NOTIFICATIONS_PATH

/**
 * 단건 읽음을 기다리는 최대 시간. 읽음은 이동의 부가 동작이라, 응답이 늦어도 이동을 오래 막지 않는다.
 * 요청은 그대로 진행되고 결과는 헤더 배지 갱신이 반영한다.
 */
export const COMMUNITY_NOTIFICATION_READ_WAIT_MS = 1500

class CommunityNotificationsQueryError extends Error {
  constructor() {
    super('알림을 불러오지 못했어요.')
    this.name = 'CommunityNotificationsQueryError'
  }
}

const validateListResponse = (response: CommunityNotificationListResponse) => {
  if (
    !response?.dataHeader?.success ||
    !Array.isArray(response.dataBody?.notifications?.contents)
  ) {
    throw new CommunityNotificationsQueryError()
  }

  return response
}

const isUnauthorized = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 401

/** 4xx(없는 API 404 포함)는 다시 불러도 같다 — 한 번만 다시 시도하는 것은 5xx·네트워크 오류뿐이다. */
export const shouldRetryCommunityNotifications = (
  failureCount: number,
  error: unknown,
) => {
  if (isAxiosError(error)) {
    const status = error.response?.status
    if (status !== undefined && status < 500) {
      return false
    }
  }

  return (
    !(error instanceof CommunityNotificationsQueryError) && failureCount < 1
  )
}

const isModifiedClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey

const wait = (ms: number) =>
  new Promise<void>(resolve => {
    window.setTimeout(resolve, ms)
  })

type NotificationPages = InfiniteData<
  CommunityNotificationListResponse,
  CommunityNotificationCursor
>

/**
 * 커뮤니티 알림 목록(#536, community.md §S4 「알림 목록」). 로그인 전용이다 — 미들웨어가 세션 쿠키 없는
 * 진입을 로그인으로 보내고, 쿠키는 있는데 세션이 없거나(확인 결과 비로그인) 목록이 401 이면 여기서 보낸다.
 */
export default function CommunityNotificationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const unreadOnly = parseCommunityNotificationsUnreadOnly(
    new URLSearchParams(searchParams.toString()),
  )
  const hasHydrated = useAuthStore(auth => auth.hasHydrated)
  const isLoggedIn = useAuthStore(auth => auth.isLoggedIn)
  const memberInfo = useAuthStore(auth => auth.memberInfo)
  const clearSession = useAuthStore(auth => auth.clearSession)
  const memberId =
    hasHydrated && isLoggedIn && memberInfo ? String(memberInfo.memberId) : null
  const [pendingNotificationId, setPendingNotificationId] = useState<
    string | null
  >(null)
  const listKey = useMemo(
    () => communityNotificationKeys.list(memberId ?? 'anonymous', unreadOnly),
    [memberId, unreadOnly],
  )

  useEffect(() => {
    if (hasHydrated && !isLoggedIn) {
      router.replace(
        getCommunityLoginHref(createCommunityNotificationsHref(unreadOnly)),
      )
    }
  }, [hasHydrated, isLoggedIn, router, unreadOnly])

  const listQuery = useInfiniteQuery<
    CommunityNotificationListResponse,
    Error,
    NotificationPages,
    typeof listKey,
    CommunityNotificationCursor
  >({
    queryKey: listKey,
    enabled: Boolean(memberId),
    initialPageParam: COMMUNITY_NOTIFICATION_INITIAL_CURSOR,
    retry: shouldRetryCommunityNotifications,
    // 다시 들어오면 늘 새로 받는다 — 읽음·새 알림이 바뀌는 화면이다.
    staleTime: 0,
    queryFn: async ({ pageParam }) =>
      validateListResponse(
        await fetchCommunityNotifications(
          createCommunityNotificationParams(unreadOnly, pageParam),
        ),
      ),
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getCommunityNotificationNextCursor(
        lastPage.dataBody.notifications,
        lastPageParam,
      ),
  })

  // 세션이 끝났으면 세션만 지운다 — 위 이펙트가 로그인으로 보낸다.
  useEffect(() => {
    if (isUnauthorized(listQuery.error)) {
      clearSession()
    }
  }, [clearSession, listQuery.error])

  const unreadCount = useCommunityNotificationUnreadCount(memberId)
  const items = dedupeCommunityNotifications(
    (listQuery.data?.pages ?? []).map(
      page => page.dataBody.notifications.contents,
    ),
  )

  const invalidateNotifications = async () => {
    if (!memberId) {
      return
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: communityNotificationKeys.unreadCount(memberId),
      }),
      queryClient.invalidateQueries({
        queryKey: ['community-notifications', 'list', memberId],
      }),
    ])
  }

  const readAllMutation = useMutation({
    mutationFn: async () => {
      const response = await markAllCommunityNotificationsRead()

      if (!response?.dataHeader?.success) {
        throw new Error('모두 읽음 처리에 실패했어요.')
      }

      return response
    },
    // 성공·실패 모두 서버 상태로 다시 맞춘다 — 헤더 배지와 목록이 같은 수를 보게.
    onSettled: () => invalidateNotifications(),
  })

  const handleOpen = (
    item: CommunityNotificationItem,
    href: string,
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    const markRead = () => {
      if (item.read || !memberId) {
        return Promise.resolve()
      }

      queryClient.setQueryData<NotificationPages>(listKey, current =>
        current
          ? {
              ...current,
              pages: markCommunityNotificationReadInPages(
                current.pages,
                item.notificationId,
              ),
            }
          : current,
      )

      // 읽음 실패는 이동을 막지 않는다. 배지는 서버 수로 다시 맞춘다.
      return markCommunityNotificationRead(item.notificationId)
        .catch(() => undefined)
        .finally(() => {
          void queryClient.invalidateQueries({
            queryKey: communityNotificationKeys.unreadCount(memberId),
          })
        })
    }

    // 새 탭·창으로 여는 클릭은 브라우저에 맡기고 읽음만 보낸다.
    if (isModifiedClick(event)) {
      void markRead()
      return
    }

    event.preventDefault()

    if (pendingNotificationId) {
      return
    }

    setPendingNotificationId(item.notificationId)
    void Promise.race([
      markRead(),
      wait(COMMUNITY_NOTIFICATION_READ_WAIT_MS),
    ]).then(() => {
      setPendingNotificationId(null)
      router.push(href)
    })
  }

  const waitingForMember = !memberId
  const status: CommunityNotificationsStatus =
    waitingForMember || listQuery.isPending
      ? 'loading'
      : listQuery.isError && items.length === 0
        ? 'error'
        : items.length === 0
          ? 'empty'
          : 'ready'

  return (
    <CommunityNotificationsView
      status={status}
      unreadOnly={unreadOnly}
      items={items}
      footer={getCommunityNotificationsFooter({
        itemsLength: items.length,
        hasNextPage: Boolean(listQuery.hasNextPage),
        isFetchingNextPage: listQuery.isFetchingNextPage,
        isFetchNextPageError: listQuery.isFetchNextPageError,
      })}
      hasNextPage={Boolean(listQuery.hasNextPage)}
      isFetching={listQuery.isFetching}
      canReadAll={
        status === 'ready' &&
        ((unreadCount ?? 0) > 0 || items.some(item => !item.read))
      }
      readAllPending={readAllMutation.isPending}
      readAllError={
        readAllMutation.isError
          ? '모두 읽음으로 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.'
          : null
      }
      pendingNotificationId={pendingNotificationId}
      onToggleUnreadOnly={() => {
        readAllMutation.reset()
        router.replace(createCommunityNotificationsHref(!unreadOnly), {
          scroll: false,
        })
      }}
      onRetry={() => {
        void listQuery.refetch()
      }}
      onLoadMore={() => {
        void listQuery.fetchNextPage({ cancelRefetch: false })
      }}
      onRetryLoadMore={() => {
        void listQuery.fetchNextPage({ cancelRefetch: false })
      }}
      onReadAll={() => {
        readAllMutation.mutate()
      }}
      onOpen={handleOpen}
    />
  )
}
