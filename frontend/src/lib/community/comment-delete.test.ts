import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  COMMUNITY_COMMENT_ALREADY_DELETED,
  countHiddenCommunityComments,
  createDeferredCommit,
  filterHiddenCommunityComments,
  getCommunityCommentDeleteToastKey,
  undoCommunityCommentDelete,
} from '@/lib/community/comment-delete'
import type { CommunityComment, CommunityReply } from '@/types/community'

const CREATED = '2026-07-27T08:35:00.000Z'

const reply = (id: string, parent: string): CommunityReply => ({
  commentId: id,
  postId: '1',
  memberId: '8200',
  parentCommentId: parent,
  content: `답글 ${id}`,
  likeCount: 0,
  createdAt: CREATED,
  updatedAt: CREATED,
})

const comment = (
  id: string,
  replies: CommunityReply[] = [],
): CommunityComment => ({
  commentId: id,
  postId: '1',
  memberId: '8101',
  content: `댓글 ${id}`,
  likeCount: 0,
  createdAt: CREATED,
  updatedAt: CREATED,
  replies,
})

const comments = [
  comment('101', [reply('201', '101'), reply('202', '101')]),
  comment('102'),
]

describe('filterHiddenCommunityComments — 낙관적 숨김', () => {
  it('숨길 것이 없으면 같은 배열을 돌려준다', () => {
    expect(filterHiddenCommunityComments(comments, new Set())).toBe(comments)
  })

  it('루트 댓글을 숨기면 딸린 답글까지 화면에서 빠지지만, 반응 바 수는 BE 처럼 1 만 준다', () => {
    const hidden = new Set(['101'])

    expect(
      filterHiddenCommunityComments(comments, hidden).map(c => c.commentId),
    ).toEqual(['102'])
    // BE 는 루트 삭제 때 답글을 남기고 commentCount 를 1 만 줄인다 — 1 + 답글 수를 빼면 응답 뒤 수가 튄다.
    expect(countHiddenCommunityComments(comments, hidden)).toBe(1)
  })

  it('답글 하나만 숨기면 그 답글만 빠진다', () => {
    const hidden = new Set(['202'])
    const [first] = filterHiddenCommunityComments(comments, hidden)

    expect(first?.replies.map(r => r.commentId)).toEqual(['201'])
    expect(countHiddenCommunityComments(comments, hidden)).toBe(1)
  })
})

describe('createDeferredCommit — 되돌리기 기간이 끝나야 삭제한다', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('예약한 뒤 시간이 지나면 한 번 실행한다', () => {
    vi.useFakeTimers()
    const commit = vi.fn()
    const queue = createDeferredCommit<string>({ delayMs: 10000, commit })

    queue.schedule('101')
    vi.advanceTimersByTime(9999)
    expect(commit).not.toHaveBeenCalled()
    expect(queue.has('101')).toBe(true)

    vi.advanceTimersByTime(1)
    expect(commit).toHaveBeenCalledExactlyOnceWith('101')
    expect(queue.has('101')).toBe(false)
  })

  it('기간 안에 되돌리면 실행하지 않는다 — 서버에는 아무것도 가지 않는다', () => {
    vi.useFakeTimers()
    const commit = vi.fn()
    const queue = createDeferredCommit<string>({ delayMs: 10000, commit })

    queue.schedule('101')
    expect(queue.undo('101')).toBe(true)
    vi.advanceTimersByTime(20000)

    expect(commit).not.toHaveBeenCalled()
    expect(queue.undo('101')).toBe(false)
  })

  it('페이지를 떠나면(flush) 기다리던 삭제를 바로 모두 보낸다', () => {
    vi.useFakeTimers()
    const commit = vi.fn()
    const queue = createDeferredCommit<string>({ delayMs: 10000, commit })

    queue.schedule('101')
    queue.schedule('102')
    expect(queue.flush()).toEqual(['101', '102'])
    expect(commit.mock.calls).toEqual([['101'], ['102']])

    vi.advanceTimersByTime(20000)
    expect(commit).toHaveBeenCalledTimes(2)
  })
})

describe('undoCommunityCommentDelete — 되돌리기 눌림', () => {
  it('예약이 남아 있으면 숨김을 푼다', () => {
    const onRestored = vi.fn()
    const onAlreadyDeleted = vi.fn()

    expect(
      undoCommunityCommentDelete({
        undo: () => true,
        onRestored,
        onAlreadyDeleted,
      }),
    ).toBe(true)
    expect(onRestored).toHaveBeenCalledOnce()
    expect(onAlreadyDeleted).not.toHaveBeenCalled()
  })

  it('이미 보냈으면(undo false) 조용히 닫지 않고 「이미 삭제됐어요」를 알린다', () => {
    const onRestored = vi.fn()
    const onAlreadyDeleted = vi.fn()

    expect(
      undoCommunityCommentDelete({
        undo: () => false,
        onRestored,
        onAlreadyDeleted,
      }),
    ).toBe(false)
    expect(onRestored).not.toHaveBeenCalled()
    expect(onAlreadyDeleted).toHaveBeenCalledOnce()
    expect(COMMUNITY_COMMENT_ALREADY_DELETED).toBe('댓글이 이미 삭제됐어요.')
  })

  it('토스트 키는 댓글마다 다르다 — 닫을 때 그 댓글 것만 닫는다', () => {
    expect(getCommunityCommentDeleteToastKey('101')).not.toBe(
      getCommunityCommentDeleteToastKey('102'),
    )
  })
})
