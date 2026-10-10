import { describe, expect, it } from 'vitest'

import {
  COMMUNITY_COMMENT_ALREADY_DELETED,
  COMMUNITY_COMMENT_DELETE_BATCH_COPY,
  COMMUNITY_COMMENT_DELETE_COPY,
  COMMUNITY_COMMENT_DELETE_TOAST_KEY,
  countHiddenCommunityComments,
  filterHiddenCommunityComments,
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

/* 되돌리기 동작(예약이 남았는지·이미 보냈는지)은 프로필과 같이 쓰는 lib/ui/undo-batch 에서 잠근다. */
describe('댓글 삭제 되돌리기 문구(#631 묶음 토스트)', () => {
  it('토스트 키는 상세 화면 하나에 하나다 — 연달아 지운 댓글을 토스트 하나로 묶는다', () => {
    expect(COMMUNITY_COMMENT_DELETE_TOAST_KEY).toBe('community-comment-delete')
  })

  it('하나면 지금처럼, 둘 이상이면 개수를 말하는 완결 문장이다', () => {
    expect(COMMUNITY_COMMENT_DELETE_COPY).toEqual({
      removed: '댓글을 삭제했어요.',
      // 기한이 지나 하나만 남았을 때. 댓글은 이름이 없어 하나여도 개수로 말한다.
      pending: '댓글 1개는 아직 되돌릴 수 있어요.',
      alreadyDone: '댓글이 이미 삭제됐어요.',
    })
    expect(COMMUNITY_COMMENT_ALREADY_DELETED).toBe('댓글이 이미 삭제됐어요.')
    expect(COMMUNITY_COMMENT_DELETE_BATCH_COPY.removedMany(3)).toBe(
      '댓글 3개를 삭제했어요.',
    )
    expect(COMMUNITY_COMMENT_DELETE_BATCH_COPY.pendingMany(2)).toBe(
      '댓글 2개는 아직 되돌릴 수 있어요.',
    )
    expect(COMMUNITY_COMMENT_DELETE_BATCH_COPY.restoredMany(2)).toBe(
      '댓글 2개를 되살렸어요.',
    )
    expect(COMMUNITY_COMMENT_DELETE_BATCH_COPY.alreadyDoneMany(2)).toBe(
      '댓글 2개는 이미 삭제됐어요.',
    )
  })
})
