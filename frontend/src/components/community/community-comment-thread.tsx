'use client'

import { useId, useState, type FocusEvent, type FormEvent } from 'react'
import { Heart } from 'lucide-react'
import styled from 'styled-components'
import CommunityMoreMenu from '@/components/community/community-more-menu'
import CommunityWriter from '@/components/community/community-writer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatCommunityCount,
  formatCommunityDate,
  formatRelativeTime,
} from '@/lib/community'
import {
  getCommunityCommentMenuActions,
  getCommunityReplyPreview,
  isCommunityPostWriter,
} from '@/lib/community/comment-thread'
import type { CommunityViewer } from '@/lib/community/community-state'
import { isCommunityPostEdited } from '@/lib/community/post-detail'
import type {
  CommunityId,
  CommunityComment,
  CommunityCommentLikeBody,
  CommunityReply,
} from '@/types/community'

type CommentItem = CommunityComment | CommunityReply

export type CommunityCommentThreadProps = {
  comments: CommunityComment[]
  /** 글 작성자 memberId. 같은 사람이 쓴 댓글에 `글쓴이` 배지를 붙인다(CM-025). 모르면 null. */
  postWriterId: CommunityId | null
  viewer: CommunityViewer
  authReady: boolean
  errorMessage: string | null
  /**
   * 입력 자리(입력칸 또는 로그인 CTA)를 감싼 요소. 모바일 하단 고정 바가 「입력칸이 화면 안인가」를
   * 이 요소로 판정한다. 입력칸과 CTA 가 바뀌어도 감싼 요소는 그대로라 관찰을 다시 걸지 않는다.
   */
  composerRef?: (element: HTMLDivElement | null) => void
  onRequireLogin: () => void
  onCreateComment: (payload: {
    content: string
    parentCommentId?: CommunityId
  }) => Promise<boolean>
  onDeleteComment: (commentId: CommunityId) => Promise<boolean>
  onToggleCommentLike: (
    commentId: CommunityId,
  ) => Promise<CommunityCommentLikeBody | null>
  onReport: (target: { targetKind: 'COMMENT'; targetId: CommunityId }) => void
}

const MAX_COMMENT_LENGTH = 1000

/*
  커뮤니티 구간(DESIGN.md §8 피드형 화면 메모): <480 모바일. 레거시 640 은 쓰지 않는다.
  포커스는 전역 :focus-visible 링 하나로 보인다. 링을 끄는 곳은 테두리가 파래지는 입력칸뿐이다
  (DESIGN.md §4 「Focus is one line」).
*/
const MOBILE = '@media (max-width: 479px)'

/* 본문처럼 카드에서 꺼내 흰 바탕에 바로 둔다 — 본문과는 상세 뷰의 회색 띠가 나눈다. */
const Section = styled.section`
  min-width: 0;
  display: grid;
  gap: 16px;
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
`

const EmptyLine = styled.p`
  padding: 16px 0;
  border-top: 1px solid var(--color-border-200);
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 1.6;
  word-break: keep-all;
`

const ThreadList = styled.ol`
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
`

/* 카드 대신 구분선 행. 루트 댓글 하나와 그 답글이 한 묶음이다. */
const ThreadItem = styled.li`
  min-width: 0;
  display: grid;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid var(--color-border-200);
`

/* depth 1 답글은 들여 쓰고 작은 아바타(sm)로 그린다. */
const ReplyList = styled.ol`
  min-width: 0;
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0 0 0 24px;
  list-style: none;

  ${MOBILE} {
    padding-left: 16px;
  }
`

const ReplyToggleRow = styled.div`
  padding-left: 24px;

  ${MOBILE} {
    padding-left: 16px;
  }
`

const Row = styled.div`
  min-width: 0;
  display: grid;
  gap: 8px;
`

const RowHead = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`

/* 글쓴이 배지 — blue50 바탕 + blue700 글자(5.26:1). 공통 Badge 의 blue 톤 글자색만 on-light 로 바꾼다. */
const WriterBadge = styled(Badge)`
  flex: 0 0 auto;
  color: var(--color-text-primary-on-light);
`

const RowMeta = styled.span`
  flex: 0 0 auto;
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 1.5;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`

/* ⋯ 트리거(44)가 행 높이를 키우지 않게 위아래로 빼고, 아이콘을 글자 열 끝에 맞춘다. */
const RowMenu = styled.span`
  flex: 0 0 auto;
  margin: -8px -12px -8px auto;
`

const Content = styled.p`
  color: var(--color-text-800);
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`

const RowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  /* 버튼 안쪽 여백만큼 바깥으로 빼서 하트가 본문 글자 열과 같은 선에 선다. */
  margin-left: -8px;
`

/* 행 안 작은 동작 — 터치 영역 36(DESIGN.md §8 small). */
const RowActionButton = styled.button<{ $active?: boolean }>`
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: ${props =>
    props.$active
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-600)'};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);

  svg {
    flex: 0 0 auto;
  }

  &:hover {
    background: var(--color-background-muted);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }

  /* 처리 중에는 흐리게 하지 않는다 — 누를 때마다 버튼이 깜박이면 실패처럼 보인다. */
  &:disabled[aria-busy='true'] {
    cursor: progress;
    opacity: 1;
  }
`

const ReplyToggleButton = styled(RowActionButton)`
  margin-left: -8px;
  color: var(--color-text-primary-on-light);
`

const Count = styled.span`
  font-variant-numeric: tabular-nums;
`

const ComposerForm = styled.form`
  display: grid;
  gap: 8px;
`

/*
  입력칸은 흰 바탕 테두리형(DESIGN.md §4 Inputs — 커뮤니티 폼은 1px 테두리를 유지).
  평소 한 줄(48)로 접혀 있다가 펼치면 rows 3 이 높이를 정한다.
*/
const TextArea = styled.textarea<{ $expanded: boolean }>`
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  resize: ${props => (props.$expanded ? 'vertical' : 'none')};
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  font-size: 15px;
  line-height: 1.5;

  /* 포커스 신호는 테두리 하나다 — 전역 :focus-visible 링을 끈다(DESIGN.md §Inputs & Forms). */
  &,
  &:focus,
  &:focus-visible {
    outline: none;
  }

  &:focus-visible {
    border-color: var(--color-primary-700);
    box-shadow: var(--shadow-focus-primary-strong);
  }

  &:disabled {
    cursor: not-allowed;
    background: var(--color-surface-muted);
  }
`

const ComposerFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const CharacterCount = styled.p`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
`

const ComposerButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const InlineAlert = styled.p`
  padding: 12px 16px;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--color-danger) 8%, var(--color-surface));
  color: var(--color-negative-text);
  font-size: 13px;
  line-height: 1.6;
`

/* 비로그인 자리 — 접힌 입력칸과 같은 높이·모양이라 로그인 뒤에도 자리가 흔들리지 않는다. */
const GuestComposerButton = styled.button`
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: var(--color-surface);
  color: var(--color-text-primary-on-light);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--color-background-muted);
  }
`

const getCommentCount = (comments: CommunityComment[]) =>
  comments.reduce((count, comment) => count + 1 + comment.replies.length, 0)

const isOwner = (item: CommentItem, viewer: CommunityViewer) =>
  viewer.authenticated && String(item.memberId) === viewer.memberId

export const getCommunityCommentLikePresentation = (
  item: Pick<CommentItem, 'likeCount'>,
  liked: boolean | undefined,
) => ({
  liked: liked ?? false,
  likeCount: item.likeCount,
})

type RequestCommunityCommentAccessOptions = {
  authReady: boolean
  viewer: CommunityViewer
  onRequireLogin: () => void
  onAuthenticated: () => void
}

export const requestCommunityCommentAccess = ({
  authReady,
  viewer,
  onRequireLogin,
  onAuthenticated,
}: RequestCommunityCommentAccessOptions):
  'wait' | 'login' | 'authenticated' => {
  if (!authReady) {
    return 'wait'
  }

  if (!viewer.authenticated) {
    onRequireLogin()
    return 'login'
  }

  onAuthenticated()
  return 'authenticated'
}

const addId = (current: Set<CommunityId>, id: CommunityId) =>
  new Set(current).add(id)

const removeId = (current: Set<CommunityId>, id: CommunityId) => {
  const next = new Set(current)
  next.delete(id)
  return next
}

/**
 * 댓글 영역(community.md §S4 「개편 2단계 — 댓글」). `댓글 N` → 목록 → 입력칸 순서다 — 읽고 나서 쓴다.
 */
export default function CommunityCommentThread({
  comments,
  postWriterId,
  viewer,
  authReady,
  errorMessage,
  composerRef,
  onRequireLogin,
  onCreateComment,
  onDeleteComment,
  onToggleCommentLike,
  onReport,
}: CommunityCommentThreadProps) {
  const composerId = useId()
  const [draft, setDraft] = useState('')
  const [composerFocused, setComposerFocused] = useState(false)
  const [replyParentId, setReplyParentId] = useState<CommunityId | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<CommunityId, string>>(
    {},
  )
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<CommunityId>>(
    () => new Set(),
  )
  const [pendingComposer, setPendingComposer] = useState<
    'root' | CommunityId | null
  >(null)
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<CommunityId>>(
    () => new Set(),
  )
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<CommunityId>>(
    () => new Set(),
  )
  const [likedByCommentId, setLikedByCommentId] = useState<
    Record<CommunityId, boolean>
  >({})
  const [localError, setLocalError] = useState<string | null>(null)

  /* 포커스했거나 쓰던 글이 있으면 펼친다. 등록 중에도 펼친 채 둔다(버튼이 사라지지 않게). */
  const composerExpanded =
    composerFocused || draft.length > 0 || pendingComposer === 'root'

  const submitDraft = async (
    content: string,
    parentCommentId?: CommunityId,
  ): Promise<boolean> => {
    let hasAccess = false
    requestCommunityCommentAccess({
      authReady,
      viewer,
      onRequireLogin,
      onAuthenticated: () => {
        hasAccess = true
      },
    })

    if (!hasAccess) {
      return false
    }

    const trimmed = content.trim()

    if (!trimmed) {
      setLocalError('댓글 내용을 입력해 주세요.')
      return false
    }

    const pendingKey = parentCommentId ?? 'root'
    if (pendingComposer !== null) {
      return false
    }

    setPendingComposer(pendingKey)
    setLocalError(null)

    try {
      return await onCreateComment({
        content: trimmed,
        ...(parentCommentId ? { parentCommentId } : {}),
      })
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : '댓글을 등록하지 못했어요. 다시 시도해 주세요.',
      )
      return false
    } finally {
      setPendingComposer(null)
    }
  }

  const handleRootSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (await submitDraft(draft)) {
      setDraft('')
    }
  }

  const handleReplySubmit = async (
    event: FormEvent,
    parentCommentId: CommunityId,
  ) => {
    event.preventDefault()
    const value = replyDrafts[parentCommentId] ?? ''

    if (await submitDraft(value, parentCommentId)) {
      setReplyDrafts(current => ({ ...current, [parentCommentId]: '' }))
      setReplyParentId(null)
      // 새 답글은 시간순 끝에 붙는다 — 접혀 있으면 방금 쓴 답글이 숨으므로 펼친다.
      setExpandedReplyIds(current => addId(current, parentCommentId))
    }
  }

  const handleComposerBlur = (event: FocusEvent<HTMLFormElement>) => {
    const next = event.relatedTarget

    if (next instanceof Node && event.currentTarget.contains(next)) {
      return
    }

    setComposerFocused(false)
  }

  const handleLike = async (commentId: CommunityId) => {
    if (!authReady) {
      return
    }

    if (!viewer.authenticated) {
      onRequireLogin()
      return
    }

    if (pendingLikeIds.has(commentId)) {
      return
    }

    setPendingLikeIds(current => addId(current, commentId))
    setLocalError(null)

    try {
      const result = await onToggleCommentLike(commentId)
      if (result) {
        setLikedByCommentId(current => ({
          ...current,
          [commentId]: result.liked,
        }))
      }
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : '댓글 좋아요를 처리하지 못했어요.',
      )
    } finally {
      setPendingLikeIds(current => removeId(current, commentId))
    }
  }

  const handleDelete = async (commentId: CommunityId) => {
    if (!authReady) {
      return
    }

    if (!viewer.authenticated) {
      onRequireLogin()
      return
    }

    if (
      pendingDeleteIds.has(commentId) ||
      !window.confirm('댓글을 삭제하시겠습니까?')
    ) {
      return
    }

    setPendingDeleteIds(current => addId(current, commentId))
    setLocalError(null)

    try {
      await onDeleteComment(commentId)
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : '댓글을 삭제하지 못했어요.',
      )
    } finally {
      setPendingDeleteIds(current => removeId(current, commentId))
    }
  }

  const handleReport = (commentId: CommunityId) => {
    if (!authReady) {
      return
    }

    if (!viewer.authenticated) {
      onRequireLogin()
      return
    }

    onReport({ targetKind: 'COMMENT', targetId: commentId })
  }

  const renderReplyComposer = (parentCommentId: CommunityId) => {
    const value = replyDrafts[parentCommentId] ?? ''

    return (
      <ComposerForm
        aria-label="답글 작성"
        id={`${composerId}-${parentCommentId}`}
        onSubmit={event => {
          void handleReplySubmit(event, parentCommentId)
        }}
      >
        <TextArea
          $expanded
          aria-label="답글 내용"
          maxLength={MAX_COMMENT_LENGTH}
          disabled={!authReady || pendingComposer !== null}
          placeholder="답글을 남겨 보세요"
          rows={3}
          value={value}
          onChange={event => {
            setReplyDrafts(current => ({
              ...current,
              [parentCommentId]: event.target.value,
            }))
          }}
        />
        <ComposerFooter>
          <CharacterCount>
            {value.length}/{formatCommunityCount(MAX_COMMENT_LENGTH)}자
          </CharacterCount>
          <ComposerButtons>
            <Button
              size="medium"
              variant="ghost"
              disabled={!authReady || pendingComposer !== null}
              onClick={() => {
                setReplyParentId(null)
              }}
            >
              취소
            </Button>
            <Button
              size="medium"
              variant="primary"
              type="submit"
              disabled={!authReady || pendingComposer !== null}
            >
              {pendingComposer === parentCommentId ? '등록 중' : '등록'}
            </Button>
          </ComposerButtons>
        </ComposerFooter>
      </ComposerForm>
    )
  }

  const renderRow = (item: CommentItem, reply: boolean) => {
    const likePresentation = getCommunityCommentLikePresentation(
      item,
      likedByCommentId[item.commentId],
    )
    const likePending = pendingLikeIds.has(item.commentId)
    const deletePending = pendingDeleteIds.has(item.commentId)
    const owner = isOwner(item, viewer)
    const edited = isCommunityPostEdited(item.createdAt, item.updatedAt)
    const likeCount = formatCommunityCount(likePresentation.likeCount)

    return (
      <Row data-community-comment={reply ? 'reply' : 'root'}>
        <RowHead>
          <CommunityWriter
            nickname={item.writerNickname}
            profileImageUrl={item.writerProfileImageUrl}
            size={reply ? 'sm' : 'md'}
          />
          {isCommunityPostWriter(item.memberId, postWriterId) ? (
            <WriterBadge $tone="blue" data-community-post-writer="true">
              글쓴이
            </WriterBadge>
          ) : null}
          {/* 시간은 한 번만 — 절대 날짜는 title 로(글 머리와 같은 규칙, CM-023). */}
          <RowMeta>
            <span aria-hidden="true">· </span>
            <time
              dateTime={item.createdAt}
              title={formatCommunityDate(item.createdAt)}
            >
              {formatRelativeTime(item.createdAt)}
            </time>
            {edited ? ' · 수정됨' : null}
          </RowMeta>
          <RowMenu>
            <CommunityMoreMenu
              target="comment"
              actions={getCommunityCommentMenuActions(owner)}
              editHref={null}
              authReady={authReady}
              deletePending={deletePending}
              onDelete={() => {
                void handleDelete(item.commentId)
              }}
              onReport={() => {
                handleReport(item.commentId)
              }}
            />
          </RowMenu>
        </RowHead>
        <Content>{item.content}</Content>
        <RowActions>
          <RowActionButton
            $active={likePresentation.liked}
            type="button"
            aria-label={`댓글 좋아요 ${likeCount}`}
            aria-pressed={likePresentation.liked}
            aria-busy={likePending || undefined}
            disabled={!authReady || likePending}
            onClick={() => {
              void handleLike(item.commentId)
            }}
          >
            <Heart
              aria-hidden="true"
              fill={likePresentation.liked ? 'currentColor' : 'none'}
              size={16}
            />
            <Count>{likeCount}</Count>
          </RowActionButton>
          {!reply ? (
            <RowActionButton
              type="button"
              aria-expanded={replyParentId === item.commentId}
              aria-controls={
                replyParentId === item.commentId
                  ? `${composerId}-${item.commentId}`
                  : undefined
              }
              disabled={!authReady}
              onClick={() => {
                requestCommunityCommentAccess({
                  authReady,
                  viewer,
                  onRequireLogin,
                  onAuthenticated: () => {
                    setReplyParentId(current =>
                      current === item.commentId ? null : item.commentId,
                    )
                  },
                })
              }}
            >
              답글 달기
            </RowActionButton>
          ) : null}
        </RowActions>
        {!reply && replyParentId === item.commentId
          ? renderReplyComposer(item.commentId)
          : null}
      </Row>
    )
  }

  const renderThread = (comment: CommunityComment) => {
    const expanded = expandedReplyIds.has(comment.commentId)
    const { visible, hiddenCount } = getCommunityReplyPreview(
      comment.replies,
      expanded,
    )
    const collapsible =
      getCommunityReplyPreview(comment.replies, false).hiddenCount > 0

    return (
      <ThreadItem key={comment.commentId}>
        {renderRow(comment, false)}
        {visible.length > 0 ? (
          <ReplyList aria-label="답글">
            {visible.map(reply => (
              <li key={reply.commentId}>{renderRow(reply, true)}</li>
            ))}
          </ReplyList>
        ) : null}
        {/*
          펼침·접기는 같은 자리의 같은 버튼이다 — 누른 뒤에도 포커스가 버튼에 남는다
          (버튼이 사라지면 포커스가 body 로 떨어진다).
        */}
        {collapsible ? (
          <ReplyToggleRow>
            <ReplyToggleButton
              type="button"
              aria-expanded={expanded}
              onClick={() => {
                setExpandedReplyIds(current =>
                  current.has(comment.commentId)
                    ? removeId(current, comment.commentId)
                    : addId(current, comment.commentId),
                )
              }}
            >
              {expanded ? '답글 접기' : `답글 ${hiddenCount}개 더 보기`}
            </ReplyToggleButton>
          </ReplyToggleRow>
        ) : null}
      </ThreadItem>
    )
  }

  return (
    <Section aria-labelledby={`${composerId}-title`}>
      <Title id={`${composerId}-title`}>
        댓글 {formatCommunityCount(getCommentCount(comments))}
      </Title>

      {comments.length > 0 ? (
        <ThreadList>{comments.map(renderThread)}</ThreadList>
      ) : (
        <EmptyLine>아직 댓글이 없어요. 첫 댓글을 남겨 보세요.</EmptyLine>
      )}

      {localError || errorMessage ? (
        <InlineAlert role="alert">{localError ?? errorMessage}</InlineAlert>
      ) : null}

      <div ref={composerRef} data-community-comment-composer="true">
        {authReady && !viewer.authenticated ? (
          <GuestComposerButton
            type="button"
            data-community-comment-entry="true"
            onClick={() => {
              requestCommunityCommentAccess({
                authReady,
                viewer,
                onRequireLogin,
                onAuthenticated: () => {},
              })
            }}
          >
            로그인하고 댓글 남기기
          </GuestComposerButton>
        ) : (
          <ComposerForm
            aria-label="댓글 작성"
            onBlur={handleComposerBlur}
            onFocus={() => {
              setComposerFocused(true)
            }}
            onSubmit={event => void handleRootSubmit(event)}
          >
            <TextArea
              $expanded={composerExpanded}
              aria-label="댓글 내용"
              data-community-comment-entry="true"
              maxLength={MAX_COMMENT_LENGTH}
              disabled={!authReady || pendingComposer !== null}
              placeholder="댓글을 남겨 보세요"
              rows={composerExpanded ? 3 : 1}
              value={draft}
              onChange={event => {
                setDraft(event.target.value)
              }}
            />
            {composerExpanded ? (
              <ComposerFooter>
                <CharacterCount>
                  {draft.length}/{formatCommunityCount(MAX_COMMENT_LENGTH)}자
                </CharacterCount>
                <Button
                  size="medium"
                  variant="primary"
                  type="submit"
                  disabled={!authReady || pendingComposer !== null}
                >
                  {pendingComposer === 'root' ? '등록 중' : '등록'}
                </Button>
              </ComposerFooter>
            ) : null}
          </ComposerForm>
        )}
      </div>
    </Section>
  )
}
