import { describe, expect, it } from 'vitest'

import {
  COMMUNITY_NOTIFICATION_INITIAL_CURSOR,
  COMMUNITY_NOTIFICATION_PAGE_SIZE,
  communityNotificationKeys,
  createCommunityNotificationHref,
  createCommunityNotificationParams,
  dedupeCommunityNotifications,
  findCommunityCommentAnchorTarget,
  formatCommunityNotificationBadge,
  formatCommunityNotificationMessage,
  getCommunityCommentAnchorId,
  getCommunityNotificationBellLabel,
  getCommunityNotificationNextCursor,
  markCommunityNotificationReadInPages,
  parseCommunityCommentAnchor,
  readCommunityNotificationUnreadCount,
} from '@/lib/community/notifications'
import type {
  CommunityComment,
  CommunityNotificationItem,
  CommunityNotificationUnreadCountResponse,
} from '@/types/community'

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

const item = (
  overrides: Partial<CommunityNotificationItem> = {},
): CommunityNotificationItem => ({
  notificationId: '7312345678901234567',
  notificationType: {
    code: 'COMMENT_ON_POST',
    name: '내 글에 댓글',
    description: '내가 쓴 글에 새 댓글이 달렸습니다.',
  },
  postId: '7312000000000000001',
  postTitle: '강남역 상권 어떤가요',
  targetAvailable: true,
  commentId: '7312000000000000099',
  commentPreview: '저도 같은 고민이었는데',
  actorMemberId: '12',
  actorNickname: '길동',
  actorProfileImageUrl: null,
  eventCount: 3,
  read: false,
  lastEventAt: '2026-10-02T10:15:30.123456',
  createdAt: '2026-10-01T22:03:11.000001',
  ...overrides,
})

const reply = (overrides: Partial<CommunityNotificationItem> = {}) =>
  item({
    notificationType: {
      code: 'REPLY_ON_COMMENT',
      name: '내 댓글에 답글',
      description: '내가 쓴 댓글에 답글이 달렸습니다.',
    },
    ...overrides,
  })

describe('formatCommunityNotificationMessage — 문구 조립', () => {
  it('내 글에 댓글 여러 개는 건수 + 최근 행위자로 적는다(eventCount 는 댓글 수)', () => {
    expect(formatCommunityNotificationMessage(item())).toBe(
      "'강남역 상권 어떤가요' 글에 새 댓글 3개 — 최근 길동님",
    )
  })

  it('댓글 하나는 누가 남겼는지로 적는다', () => {
    expect(formatCommunityNotificationMessage(item({ eventCount: 1 }))).toBe(
      "길동님이 '강남역 상권 어떤가요' 글에 댓글을 남겼어요",
    )
  })

  it('내 댓글에 답글', () => {
    expect(formatCommunityNotificationMessage(reply({ eventCount: 2 }))).toBe(
      "'강남역 상권 어떤가요' 글의 내 댓글에 새 답글 2개 — 최근 길동님",
    )
    expect(formatCommunityNotificationMessage(reply({ eventCount: 1 }))).toBe(
      "길동님이 '강남역 상권 어떤가요' 글의 내 댓글에 답글을 남겼어요",
    )
  })

  it('글이 사라졌으면(targetAvailable=false) 제목 대신 「삭제된 글」', () => {
    expect(
      formatCommunityNotificationMessage(
        item({ targetAvailable: false, postTitle: null }),
      ),
    ).toBe('삭제된 글에 새 댓글 3개 — 최근 길동님')
    expect(
      formatCommunityNotificationMessage(
        reply({ targetAvailable: false, postTitle: null, eventCount: 1 }),
      ),
    ).toBe('길동님이 삭제된 글의 내 댓글에 답글을 남겼어요')
  })

  it('targetAvailable=false 면 제목이 와도 적지 않는다', () => {
    expect(
      formatCommunityNotificationMessage(
        item({ targetAvailable: false, postTitle: '남은 제목' }),
      ),
    ).toBe('삭제된 글에 새 댓글 3개 — 최근 길동님')
  })

  it('닉네임이 null 이면 「사장님」, 탈퇴회원은 받은 대로', () => {
    expect(
      formatCommunityNotificationMessage(item({ actorNickname: null })),
    ).toBe("'강남역 상권 어떤가요' 글에 새 댓글 3개 — 최근 사장님")
    expect(
      formatCommunityNotificationMessage(
        item({ actorNickname: '  ', eventCount: 1 }),
      ),
    ).toBe("사장님이 '강남역 상권 어떤가요' 글에 댓글을 남겼어요")
    expect(
      formatCommunityNotificationMessage(item({ actorNickname: '탈퇴회원' })),
    ).toBe("'강남역 상권 어떤가요' 글에 새 댓글 3개 — 최근 탈퇴회원님")
  })

  it('살아 있는 글인데 제목이 비면 「제목 없는 글」', () => {
    expect(formatCommunityNotificationMessage(item({ postTitle: ' ' }))).toBe(
      '제목 없는 글에 새 댓글 3개 — 최근 길동님',
    )
  })

  it('이상한 건수(0·음수·NaN)는 1개, 소수는 내림으로 읽는다', () => {
    for (const eventCount of [0, -2, Number.NaN]) {
      expect(formatCommunityNotificationMessage(item({ eventCount }))).toBe(
        "길동님이 '강남역 상권 어떤가요' 글에 댓글을 남겼어요",
      )
    }
    expect(formatCommunityNotificationMessage(item({ eventCount: 2.9 }))).toBe(
      "'강남역 상권 어떤가요' 글에 새 댓글 2개 — 최근 길동님",
    )
  })

  it('모르는 종류·종류 없음은 새 알림으로 적는다(화면이 죽지 않는다)', () => {
    expect(
      formatCommunityNotificationMessage(
        item({
          notificationType: { code: 'LIKE_ON_POST', name: '', description: '' },
        }),
      ),
    ).toBe("'강남역 상권 어떤가요' 글에 새 알림 3개 — 최근 길동님")
    expect(
      formatCommunityNotificationMessage(
        item({ notificationType: null, eventCount: 1 }),
      ),
    ).toBe("'강남역 상권 어떤가요' 글에 새 알림이 있어요 — 최근 길동님")
  })
})

describe('createCommunityNotificationParams — 목록 요청', () => {
  it('첫 쪽은 lastNotificationId=0 이고 lastEventAt 을 싣지 않는다', () => {
    expect(
      createCommunityNotificationParams(
        false,
        COMMUNITY_NOTIFICATION_INITIAL_CURSOR,
      ),
    ).toEqual({
      unreadOnly: false,
      lastNotificationId: '0',
      size: COMMUNITY_NOTIFICATION_PAGE_SIZE,
    })
  })

  it('다음 쪽은 받은 lastEventAt 문자열과 notificationId 를 그대로 싣는다', () => {
    expect(
      createCommunityNotificationParams(true, {
        lastNotificationId: '7312345678901234567',
        lastEventAt: '2026-10-02T10:15:30.123456',
      }),
    ).toEqual({
      unreadOnly: true,
      lastNotificationId: '7312345678901234567',
      lastEventAt: '2026-10-02T10:15:30.123456',
      size: COMMUNITY_NOTIFICATION_PAGE_SIZE,
    })
  })
})

describe('getCommunityNotificationNextCursor — 다음 쪽 커서', () => {
  it('마지막 항목의 lastEventAt + notificationId (id 는 문자열 그대로)', () => {
    const last = item({
      notificationId: '9007199254740993123',
      lastEventAt: '2026-10-01T08:00:00.000001',
    })

    expect(
      getCommunityNotificationNextCursor({
        contents: [item(), last],
        hasNext: true,
      }),
    ).toEqual({
      lastNotificationId: '9007199254740993123',
      lastEventAt: '2026-10-01T08:00:00.000001',
    })
  })

  it('끝이거나 빈 쪽이면 없다', () => {
    expect(
      getCommunityNotificationNextCursor({
        contents: [item()],
        hasNext: false,
      }),
    ).toBeUndefined()
    expect(
      getCommunityNotificationNextCursor({ contents: [], hasNext: true }),
    ).toBeUndefined()
  })

  it('보낸 커서와 같은 커서가 다시 나오면 끝으로 친다(무한 반복 방지)', () => {
    const page = { contents: [item()], hasNext: true }
    const cursor = getCommunityNotificationNextCursor(page)

    expect(getCommunityNotificationNextCursor(page, cursor)).toBeUndefined()
  })
})

describe('createCommunityNotificationHref — 이동 주소', () => {
  it('글 상세 + 댓글 앵커', () => {
    expect(createCommunityNotificationHref(item())).toBe(
      '/community/7312000000000000001#comment-7312000000000000099',
    )
  })

  it('댓글 id 가 없으면 글까지만', () => {
    expect(createCommunityNotificationHref(item({ commentId: null }))).toBe(
      '/community/7312000000000000001',
    )
  })

  it('글이 사라졌으면 이동하지 않는다', () => {
    expect(
      createCommunityNotificationHref(item({ targetAvailable: false })),
    ).toBeNull()
  })
})

describe('댓글 앵커', () => {
  const comments: CommunityComment[] = [
    {
      commentId: '100',
      postId: '1',
      memberId: '2',
      content: '부모',
      likeCount: 0,
      createdAt: '',
      updatedAt: '',
      replies: [
        {
          commentId: '101',
          postId: '1',
          memberId: '3',
          parentCommentId: '100',
          content: '답글',
          likeCount: 0,
          createdAt: '',
          updatedAt: '',
        },
      ],
    },
  ]

  it('id 와 해시를 오간다', () => {
    expect(getCommunityCommentAnchorId('100')).toBe('comment-100')
    expect(parseCommunityCommentAnchor('#comment-100')).toBe('100')
    expect(parseCommunityCommentAnchor('comment-100')).toBe('100')
    expect(parseCommunityCommentAnchor('#comment-')).toBeNull()
    expect(parseCommunityCommentAnchor('#top')).toBeNull()
    expect(parseCommunityCommentAnchor('')).toBeNull()
  })

  it('최상위 댓글과 답글(부모 포함)을 찾는다', () => {
    expect(findCommunityCommentAnchorTarget(comments, '100')).toEqual({
      commentId: '100',
      parentCommentId: null,
    })
    expect(findCommunityCommentAnchorTarget(comments, '101')).toEqual({
      commentId: '101',
      parentCommentId: '100',
    })
    expect(findCommunityCommentAnchorTarget(comments, '999')).toBeNull()
  })
})

describe('목록 캐시 다루기', () => {
  it('같은 알림이 두 쪽에 걸쳐 오면 한 번만 둔다', () => {
    const a = item({ notificationId: 'a' })
    const b = item({ notificationId: 'b' })

    expect(
      dedupeCommunityNotifications([[a, b], [b]]).map(
        notification => notification.notificationId,
      ),
    ).toEqual(['a', 'b'])
  })

  it('단건 읽음은 그 항목만 read=true 로 바꾸고 원본은 건드리지 않는다', () => {
    const pages = [
      {
        dataHeader: { success: true, resultCode: null, resultMessage: null },
        dataBody: {
          notifications: {
            contents: [
              item({ notificationId: 'a' }),
              item({ notificationId: 'b' }),
            ],
            hasNext: false,
          },
        },
      },
    ]
    const next = markCommunityNotificationReadInPages(pages, 'b')

    expect(
      next[0].dataBody.notifications.contents.map(entry => entry.read),
    ).toEqual([false, true])
    expect(pages[0].dataBody.notifications.contents[1].read).toBe(false)
  })
})
