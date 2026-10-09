import { describe, expect, it } from 'vitest'

import {
  communityNotificationKeys,
  formatCommunityNotificationBadge,
  getCommunityNotificationBellLabel,
  readCommunityNotificationUnreadCount,
} from '@/lib/community/notifications'
import type { CommunityNotificationUnreadCountResponse } from '@/types/community'

const unreadResponse = (
  unreadCount: unknown,
  success = true,
): CommunityNotificationUnreadCountResponse =>
  ({
    dataHeader: { success, resultCode: null, resultMessage: null },
    dataBody: { unreadCount },
  }) as CommunityNotificationUnreadCountResponse

describe('formatCommunityNotificationBadge — 헤더 배지 표기', () => {
  it.each([
    [0, null],
    [-1, null],
    [Number.NaN, null],
    [1, '1'],
    [9, '9'],
    [99, '99'],
    [100, '99+'],
    [12345, '99+'],
  ])('%s → %s', (count, expected) => {
    expect(formatCommunityNotificationBadge(count)).toBe(expected)
  })

  it('숫자가 아니면(응답 없음·실패) 배지를 그리지 않는다', () => {
    expect(formatCommunityNotificationBadge(null)).toBeNull()
    expect(formatCommunityNotificationBadge(undefined)).toBeNull()
  })

  it('소수는 내림해 적는다', () => {
    expect(formatCommunityNotificationBadge(3.7)).toBe('3')
  })
})

describe('getCommunityNotificationBellLabel — 종 아이콘 접근성 이름', () => {
  it('안 읽은 알림이 없거나 모르면 「알림」', () => {
    expect(getCommunityNotificationBellLabel(0)).toBe('알림')
    expect(getCommunityNotificationBellLabel(null)).toBe('알림')
  })

  it('안 읽은 수를 그대로 읽어 준다', () => {
    expect(getCommunityNotificationBellLabel(3)).toBe('알림, 안 읽은 알림 3개')
    expect(getCommunityNotificationBellLabel(99)).toBe(
      '알림, 안 읽은 알림 99개',
    )
  })

  it('상한을 넘으면 배지와 같은 뜻으로 「99개 넘게」라고 읽는다', () => {
    expect(getCommunityNotificationBellLabel(150)).toBe(
      '알림, 안 읽은 알림 99개 넘게',
    )
  })
})

describe('readCommunityNotificationUnreadCount — 응답에서 안 읽은 수 꺼내기', () => {
  it('성공 응답의 숫자를 돌려준다', () => {
    expect(readCommunityNotificationUnreadCount(unreadResponse(4))).toBe(4)
  })

  it('실패 envelope·모양이 다른 응답은 null(배지를 조용히 숨긴다)', () => {
    expect(
      readCommunityNotificationUnreadCount(unreadResponse(4, false)),
    ).toBeNull()
    expect(readCommunityNotificationUnreadCount(unreadResponse('4'))).toBeNull()
    expect(
      readCommunityNotificationUnreadCount(
        null as unknown as CommunityNotificationUnreadCountResponse,
      ),
    ).toBeNull()
    expect(
      readCommunityNotificationUnreadCount({
        dataHeader: { success: true, resultCode: null, resultMessage: null },
        dataBody: null,
      } as unknown as CommunityNotificationUnreadCountResponse),
    ).toBeNull()
  })
})

describe('communityNotificationKeys', () => {
  it('회원별로 키가 갈리고 전부 같은 접두를 쓴다', () => {
    expect(communityNotificationKeys.unreadCount('7')).toEqual([
      'community-notifications',
      'unread-count',
      '7',
    ])
    expect(communityNotificationKeys.unreadCount('7')).not.toEqual(
      communityNotificationKeys.unreadCount('8'),
    )
    expect(communityNotificationKeys.all).toEqual(['community-notifications'])
  })
})
