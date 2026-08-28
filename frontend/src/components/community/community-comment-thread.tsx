'use client'

import { useId, useState, type FormEvent } from 'react'
import styled from 'styled-components'
import {
  formatCommunityCount,
  formatCommunityDate,
  formatRelativeTime,
} from '@/lib/community'
import type { CommunityViewer } from '@/lib/community/community-state'
import type {
  CommunityComment,
  CommunityCommentLikeBody,
  CommunityReply,
} from '@/types/community'

type CommentItem = CommunityComment | CommunityReply

export type CommunityCommentThreadProps = {
  comments: CommunityComment[]
  viewer: CommunityViewer
  authReady: boolean
  errorMessage: string | null
  onRequireLogin: () => void
  onCreateComment: (payload: {
    content: string
    parentCommentId?: number
  }) => Promise<boolean>
  onDeleteComment: (commentId: number) => Promise<boolean>
  onToggleCommentLike: (
    commentId: number,
  ) => Promise<CommunityCommentLikeBody | null>
  onReport: (target: { targetKind: 'COMMENT'; targetId: number }) => void
}

const MAX_COMMENT_LENGTH = 1000

const Section = styled.section`
  display: grid;
  gap: 20px;
  padding: 22px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);

  @media (max-width: 640px) {
    padding: 18px;
  }
`

const SectionHeader = styled.header`
  display: grid;
  gap: 6px;
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 20px;
  line-height: 1.4;
`

const Description = styled.p`
  color: var(--color-text-500);
  font-size: 14px;
  line-height: 1.6;
`

const Composer = styled.form`
  display: grid;
  gap: 10px;
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 112px;
  padding: 14px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  resize: vertical;
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  font-size: 14px;
  line-height: 1.65;

  &:focus-visible {
    outline: none;
    border-color: var(--color-primary-600);
    box-shadow: var(--shadow-focus-primary-strong);
  }

  &:disabled {
    cursor: not-allowed;
    background: var(--color-surface-muted);
  }
`

const ComposerFooter = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const Message = styled.p<{ $error?: boolean }>`
  color: ${props =>
    props.$error ? 'var(--color-danger)' : 'var(--color-text-500)'};
  font-size: 12px;
  line-height: 1.5;
`

const Button = styled.button<{ $primary?: boolean }>`
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid
    ${props =>
      props.$primary ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$primary ? 'var(--color-primary-700)' : 'var(--color-surface)'};
  color: ${props =>
    props.$primary ? 'var(--color-surface)' : 'var(--color-text-700)'};
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

const List = styled.ol`
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const CommentCard = styled.li<{ $reply?: boolean }>`
  display: grid;
  gap: 12px;
  margin-left: ${props => (props.$reply ? '24px' : '0')};
  padding: 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: ${props =>
    props.$reply ? 'var(--color-surface-muted)' : 'var(--color-surface)'};

  @media (max-width: 640px) {
    margin-left: ${props => (props.$reply ? '12px' : '0')};
    padding: 16px;
  }
`

const CommentHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const Author = styled.p`
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
`

const Meta = styled.p`
  color: var(--color-text-500);
  font-size: 12px;
  line-height: 1.5;
`

const Content = styled.p`
  color: var(--color-text-700);
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`

const ActionButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-600);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: var(--color-surface-muted);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

const ReplyComposer = styled.div`
  display: grid;
  gap: 10px;
  padding-top: 4px;
`

const ReplyActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const InlineAlert = styled.p`
  padding: 12px 14px;
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--color-danger) 8%, var(--color-surface));
  color: var(--color-danger);
  font-size: 13px;
  line-height: 1.6;
`

const GuestComposerButton = styled.button`
  width: 100%;
  min-height: 112px;
  display: grid;
  align-content: center;
  gap: 6px;
  padding: 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  color: var(--color-text-700);
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const GuestComposerTitle = styled.span`
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 700;
`

const GuestComposerDescription = styled.span`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.6;
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
  | 'wait'
  | 'login'
  | 'authenticated' => {
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

export default function CommunityCommentThread({
  comments,
  viewer,
  authReady,
  errorMessage,
  onRequireLogin,
  onCreateComment,
  onDeleteComment,
  onToggleCommentLike,
  onReport,
}: CommunityCommentThreadProps) {
  const composerId = useId()
  const [draft, setDraft] = useState('')
  const [replyParentId, setReplyParentId] = useState<number | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({})
  const [pendingComposer, setPendingComposer] = useState<
    'root' | number | null
  >(null)
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<number>>(
    () => new Set(),
  )
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(
    () => new Set(),
  )
  const [likedByCommentId, setLikedByCommentId] = useState<
    Record<number, boolean>
  >({})
  const [localError, setLocalError] = useState<string | null>(null)

  const submitDraft = async (
    content: string,
    parentCommentId?: number,
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
    parentCommentId: number,
  ) => {
    event.preventDefault()
    const value = replyDrafts[parentCommentId] ?? ''

    if (await submitDraft(value, parentCommentId)) {
      setReplyDrafts(current => ({ ...current, [parentCommentId]: '' }))
      setReplyParentId(null)
    }
  }

  const handleLike = async (commentId: number) => {
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

    setPendingLikeIds(current => new Set(current).add(commentId))
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
      setPendingLikeIds(current => {
        const next = new Set(current)
        next.delete(commentId)
        return next
      })
    }
  }

  const handleDelete = async (commentId: number) => {
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

    setPendingDeleteIds(current => new Set(current).add(commentId))
    setLocalError(null)

    try {
      await onDeleteComment(commentId)
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : '댓글을 삭제하지 못했어요.',
      )
    } finally {
      setPendingDeleteIds(current => {
        const next = new Set(current)
        next.delete(commentId)
        return next
      })
    }
  }

  const handleReport = (commentId: number) => {
    if (!authReady) {
      return
    }

    if (!viewer.authenticated) {
      onRequireLogin()
      return
    }

    onReport({ targetKind: 'COMMENT', targetId: commentId })
  }

  const renderComment = (item: CommentItem, reply = false) => {
    const likePresentation = getCommunityCommentLikePresentation(
      item,
      likedByCommentId[item.commentId],
    )
    const likePending = pendingLikeIds.has(item.commentId)
    const deletePending = pendingDeleteIds.has(item.commentId)

    return (
      <CommentCard $reply={reply} key={item.commentId}>
        <CommentHeader>
          <div>
            <Author>사장님</Author>
            <Meta>
              <time dateTime={item.createdAt}>
                {formatRelativeTime(item.createdAt)} ·{' '}
                {formatCommunityDate(item.createdAt)}
              </time>
            </Meta>
          </div>
          <Actions aria-label={`댓글 ${item.commentId} 작업`}>
            <ActionButton
              type="button"
              aria-label={`댓글 좋아요 ${formatCommunityCount(
                likePresentation.likeCount,
              )}`}
              aria-pressed={likePresentation.liked}
              disabled={!authReady || likePending}
              onClick={() => {
                void handleLike(item.commentId)
              }}
            >
              {likePending
                ? '처리 중'
                : `좋아요 ${formatCommunityCount(likePresentation.likeCount)}`}
            </ActionButton>
            {!reply ? (
              <ActionButton
                type="button"
                aria-expanded={replyParentId === item.commentId}
                aria-controls={`${composerId}-${item.commentId}`}
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
                답글 쓰기
              </ActionButton>
            ) : null}
            {isOwner(item, viewer) ? (
              <ActionButton
                type="button"
                aria-label="댓글 삭제"
                disabled={!authReady || deletePending}
                onClick={() => {
                  void handleDelete(item.commentId)
                }}
              >
                {deletePending ? '삭제 중' : '삭제'}
              </ActionButton>
            ) : null}
            <ActionButton
              type="button"
              aria-label="댓글 신고"
              disabled={!authReady}
              onClick={() => {
                handleReport(item.commentId)
              }}
            >
              신고
            </ActionButton>
          </Actions>
        </CommentHeader>
        <Content>{item.content}</Content>
        {!reply && replyParentId === item.commentId ? (
          <ReplyComposer id={`${composerId}-${item.commentId}`}>
            <Composer
              onSubmit={event => {
                void handleReplySubmit(event, item.commentId)
              }}
            >
              <TextArea
                aria-label="답글 내용"
                maxLength={MAX_COMMENT_LENGTH}
                disabled={!authReady || pendingComposer !== null}
                placeholder="답글을 입력해 주세요."
                value={replyDrafts[item.commentId] ?? ''}
                onChange={event => {
                  setReplyDrafts(current => ({
                    ...current,
                    [item.commentId]: event.target.value,
                  }))
                }}
              />
              <ComposerFooter>
                <Message>
                  {(replyDrafts[item.commentId] ?? '').length}/
                  {formatCommunityCount(MAX_COMMENT_LENGTH)}자
                </Message>
                <ReplyActions>
                  <Button
                    type="button"
                    disabled={!authReady || pendingComposer !== null}
                    onClick={() => {
                      setReplyParentId(null)
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    $primary
                    type="submit"
                    disabled={!authReady || pendingComposer !== null}
                  >
                    {pendingComposer === item.commentId
                      ? '등록 중'
                      : '답글 등록'}
                  </Button>
                </ReplyActions>
              </ComposerFooter>
            </Composer>
          </ReplyComposer>
        ) : null}
      </CommentCard>
    )
  }

  return (
    <Section aria-labelledby={`${composerId}-title`}>
      <SectionHeader>
        <Title id={`${composerId}-title`}>
          댓글 {formatCommunityCount(getCommentCount(comments))}
        </Title>
        <Description>
          운영 경험과 질문을 나누고, 필요한 경우 한 단계 답글로 이어가세요.
        </Description>
      </SectionHeader>

      {authReady && !viewer.authenticated ? (
        <GuestComposerButton
          type="button"
          aria-label="로그인하고 댓글 작성"
          onClick={() => {
            requestCommunityCommentAccess({
              authReady,
              viewer,
              onRequireLogin,
              onAuthenticated: () => {},
            })
          }}
        >
          <GuestComposerTitle>로그인하고 댓글 남기기</GuestComposerTitle>
          <GuestComposerDescription>
            로그인 후 운영 경험이나 질문을 안전하게 작성할 수 있어요.
          </GuestComposerDescription>
        </GuestComposerButton>
      ) : (
        <Composer onSubmit={event => void handleRootSubmit(event)}>
          <TextArea
            aria-label="댓글 내용"
            maxLength={MAX_COMMENT_LENGTH}
            disabled={!authReady || pendingComposer !== null}
            placeholder="운영 경험이나 질문을 댓글로 남겨 주세요."
            value={draft}
            onChange={event => {
              setDraft(event.target.value)
            }}
          />
          <ComposerFooter>
            <Message>
              {draft.length}/{formatCommunityCount(MAX_COMMENT_LENGTH)}자
            </Message>
            <Button
              $primary
              type="submit"
              disabled={!authReady || pendingComposer !== null}
            >
              {pendingComposer === 'root' ? '등록 중' : '댓글 등록'}
            </Button>
          </ComposerFooter>
        </Composer>
      )}

      {localError || errorMessage ? (
        <InlineAlert role="alert">{localError ?? errorMessage}</InlineAlert>
      ) : null}

      {comments.length > 0 ? (
        <List>
          {comments.map(comment => (
            <li key={comment.commentId}>
              <List>
                {renderComment(comment)}
                {comment.replies.map(reply => renderComment(reply, true))}
              </List>
            </li>
          ))}
        </List>
      ) : null}
    </Section>
  )
}
