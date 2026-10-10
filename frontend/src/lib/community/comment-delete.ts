import type { CommunityComment, CommunityId } from '@/types/community'

/* 지연 실행 큐 `createDeferredCommit` 는 프로필 북마크 삭제도 쓰므로 `lib/ui/deferred-commit` 에 있다. */

/*
  댓글 삭제 — 확인 창 대신 「낙관적 숨김 + 지연 삭제 + 되돌리기」(#581, community.md §S4 「댓글 삭제 되돌리기」).

  BE 에 삭제한 댓글을 되살리는 API 가 없다(지운 뒤 같은 내용으로 다시 쓰면 id·작성 시각·답글 연결이
  바뀐다). 그래서 누르면 **화면에서만 숨기고**, 되돌리기 시간이 지나면 그때 `DELETE` 를 보낸다.
  되돌리기는 숨김만 푼다 — 서버에는 아무것도 가지 않았다.

  - 페이지를 떠나면(언마운트) 기다리던 삭제를 **바로** 보낸다 — 사용자는 이미 지웠다고 봤다.
  - 탭을 닫거나 새로고침하면(`pagehide`) 같은 일을 시도하지만, 브라우저가 요청을 끊을 수 있다. 끊기면
    댓글이 남는다(안전한 쪽으로 실패한다 — 지우지 않은 것을 지웠다고 하지는 않는다).
*/

/** 숨긴 댓글·답글을 뺀 목록. 루트를 숨기면 그 답글도 함께 숨는다(행이 통째로 사라진다). */
export const filterHiddenCommunityComments = (
  comments: CommunityComment[],
  hiddenIds: ReadonlySet<CommunityId>,
): CommunityComment[] =>
  hiddenIds.size === 0
    ? comments
    : comments
        .filter(comment => !hiddenIds.has(comment.commentId))
        .map(comment =>
          comment.replies.some(reply => hiddenIds.has(reply.commentId))
            ? {
                ...comment,
                replies: comment.replies.filter(
                  reply => !hiddenIds.has(reply.commentId),
                ),
              }
            : comment,
        )

/**
 * 반응 바의 `댓글 N`(상세 응답 `commentCount`)에서 뺄 수. **숨긴 댓글 하나당 1** 이다 — 루트에 답글이 달려
 * 있어도 1. BE 는 루트를 지울 때 답글을 남기고 `commentCount` 를 1 만 줄이므로(CommunityCommandProcessor
 * .deleteComment), 여기서 1 + 답글 수를 빼면 지연 삭제가 끝나 응답이 오는 순간 수가 다시 튄다.
 * 스레드 제목의 `댓글 N` 은 따로 화면에 보이는 행 수로 센다(숨긴 루트의 답글도 빠진다) — 다시 받은 목록도
 * 같은 행을 보여 주므로 그쪽도 튀지 않는다. 두 수가 어긋나는 것은 BE 동작 때문이다(community.md 「BE 확인 필요」).
 */
export const countHiddenCommunityComments = (
  comments: CommunityComment[],
  hiddenIds: ReadonlySet<CommunityId>,
) =>
  hiddenIds.size === 0
    ? 0
    : comments.reduce(
        (count, comment) =>
          count +
          (hiddenIds.has(comment.commentId) ? 1 : 0) +
          comment.replies.filter(reply => hiddenIds.has(reply.commentId))
            .length,
        0,
      )

/** 지연 삭제가 실패해 숨겼던 댓글을 되살릴 때 쓰는 첫 문장. 서버 사유가 있으면 뒤에 붙는다. */
export const COMMUNITY_COMMENT_DELETE_FAILED =
  '댓글을 삭제하지 못해 다시 보여 드려요.'

/** 되돌리기를 눌렀는데 이미 서버로 보냈다(시간이 지났거나 페이지 이탈로 보냈다). */
export const COMMUNITY_COMMENT_ALREADY_DELETED = '댓글이 이미 삭제됐어요.'

export const getCommunityCommentDeleteToastKey = (commentId: CommunityId) =>
  `community-comment-delete:${commentId}`

/**
 * 「되돌리기」 눌림. 예약이 남아 있으면 숨김을 풀고, 이미 보냈으면 그렇다고 알린다 — 아무 일도 없는데
 * 토스트만 성공처럼 닫히면 사용자는 댓글이 돌아온 줄 안다.
 */
export const undoCommunityCommentDelete = ({
  undo,
  onRestored,
  onAlreadyDeleted,
}: {
  undo: () => boolean
  onRestored: () => void
  onAlreadyDeleted: () => void
}) => {
  if (undo()) {
    onRestored()
    return true
  }

  onAlreadyDeleted()
  return false
}
