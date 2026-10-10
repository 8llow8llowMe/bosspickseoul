'use client'

import {
  useId,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type MouseEvent,
} from 'react'
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
import { communityOutlinedField } from '@/lib/community/field-styles'
import { touchHitArea } from '@/styles/touch-target'
import {
  getCommunityLikeIntent,
  type CommunityLikeOutcome,
  type CommunityLikeState,
} from '@/lib/community/like-toggle-queue'
import { isCommunityPostEdited } from '@/lib/community/post-detail'
import type {
  CommunityId,
  CommunityComment,
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
  /** 확인 없이 바로 부른다 — 페이지가 숨기고 되돌리기 토스트를 띄운다(#581). */
  onDeleteComment: (commentId: CommunityId) => Promise<boolean>
  /**
   * 좋아요(#580). 스레드는 누른 즉시 하트를 뒤집고 의도·지금 상태를 넘긴다. 결과가 오면 그 상태로 맞춘다
   * (실패면 되돌린 상태). 진행 중에도 버튼을 잠그지 않는다 — 직렬화는 페이지가 한다.
   */
  onToggleCommentLike: (
    commentId: CommunityId,
    desired: boolean,
    current: CommunityLikeState,
  ) => Promise<CommunityLikeOutcome>
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

/*
  행 안 작은 동작 — 보이는 높이 36(DESIGN.md §Touch Targets small). 모바일은 히트 영역만 44(#633).
  이웃 버튼과 가로 간격이 4 다. 히트 영역은 폭이 44 에 못 미칠 때만 가로로 늘고 한쪽 확장은 (44 - 폭) / 2 라,
  폭이 36 이상이면 한쪽 4 이하로 간격 4 를 넘지 않는다(좋아요 숫자 한 자리가 가장 좁고 약 44 다). 위아래는 4씩
  늘며 위는 본문 글자, 아래는 행 여백·다음 행 동작이다 — 실제 배치는 `e2e/community/touch-targets.spec.ts` 가 잰다.
*/
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

  ${touchHitArea()}
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
  평소 한 줄(48)로 접혀 있다가 펼치면 rows 3 이 높이를 정한다. 손잡이로 늘이지 않는다(resize: none) —
  글자는 16 이라 iOS 가 포커스 때 화면을 확대하지 않는다.
*/
const TextArea = styled.textarea`
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  font-size: 16px;
  line-height: 1.5;

  /* 포커스·오류·크기 — 커뮤니티 입력칸 공통 조각(안쪽 한 줄, 글로우 없음, resize none). */
  ${communityOutlinedField}

  &:disabled {
    cursor: not-allowed;
    background: var(--color-surface-muted);
  }

  /* 등록 중(readOnly + aria-busy) — 포커스와 키보드는 그대로 두고 글자만 못 고치게 한다(#580). */
  &[aria-busy='true'] {
    cursor: progress;
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

/**
 * 하트 상태. 로컬(누른 결과)이 먼저고, 없으면 응답의 `liked`(BE #594 — 생기면 쓴다), 그것도 없으면 빈 하트다.
 * 수는 늘 캐시(props)에서 — 페이지가 낙관적으로 쓰고 응답으로 덮는다.
 */
export const getCommunityCommentLikePresentation = (
  item: Pick<CommentItem, 'likeCount' | 'liked'>,
  liked: boolean | undefined,
) => ({
  liked: liked ?? item.liked ?? false,
  likeCount: item.likeCount,
})

/** 지금 아는 상태(직렬화 큐의 출발점). 모르면 liked 는 null 이다. */
const getCommunityCommentLikeState = (
  item: Pick<CommentItem, 'likeCount' | 'liked'>,
  liked: boolean | undefined,
): CommunityLikeState => ({
  liked: liked ?? item.liked ?? null,
  likeCount: item.likeCount,
})

/*
  등록 버튼을 눌러도 입력칸 포커스를 빼앗지 않는다 — 모바일에서 포커스가 버튼으로 가면 키보드가 내려가고
  연달아 쓸 때 입력칸을 다시 눌러야 한다(#580). 키보드(Enter·Space)로 누르는 길은 그대로다.
*/
const keepComposerFocus = (event: MouseEvent<HTMLButtonElement>) => {
  event.preventDefault()
}

/**
 * 등록이 끝나면 입력칸에 포커스를 둔다 — 포커스가 그 폼 안에 있었거나(키보드로 등록 버튼을 눌렀다), 잠긴
 * 등록 버튼에서 body 로 떨어졌을 때만. 사용자가 그사이 다른 곳으로 옮겼으면 건드리지 않는다.
 */
const restoreComposerFocus = (form: HTMLFormElement) => {
  const active = document.activeElement

  if (!active || active === document.body || form.contains(active)) {
    form.querySelector('textarea')?.focus()
  }
}

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
  const [likedByCommentId, setLikedByCommentId] = useState<
    Record<CommunityId, boolean | undefined>
  >({})
  const [localError, setLocalError] = useState<string | null>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

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

  /* 성공하면 입력값만 비운다 — 포커스와 펼침은 그대로다(#580, 연달아 쓰기). */
  const handleRootSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    if (await submitDraft(draft)) {
      setDraft('')
      restoreComposerFocus(form)
    }
  }

  /*
    답글 등록이 성공해도 입력칸을 닫지 않는다(#580) — 입력값만 비우고 포커스·펼침을 그대로 둔다. 이어서
    한 줄 더 쓰는 일이 잦고, 닫히면 모바일 키보드가 내려간다. 닫기는 「취소」로 한다.
  */
  const handleReplySubmit = async (
    event: FormEvent<HTMLFormElement>,
    parentCommentId: CommunityId,
  ) => {
    event.preventDefault()
    const form = event.currentTarget
    const value = replyDrafts[parentCommentId] ?? ''

    if (await submitDraft(value, parentCommentId)) {
      setReplyDrafts(current => ({ ...current, [parentCommentId]: '' }))
      restoreComposerFocus(form)
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

  /*
    누르면 하트를 바로 뒤집는다(잠그지 않는다). 연타해도 같은 큐에 묶여 모두 같은 최종 결과로 끝나므로,
    결과가 올 때마다 그 상태로 맞추면 마지막 화면이 서버와 같다. 실패면 되돌린 상태가 온다.
  */
  const handleLike = async (item: CommentItem) => {
    if (!authReady) {
      return
    }

    if (!viewer.authenticated) {
      onRequireLogin()
      return
    }

    const commentId = item.commentId
    const current = getCommunityCommentLikeState(
      item,
      likedByCommentId[commentId],
    )
    const desired = getCommunityLikeIntent(current.liked)

    setLikedByCommentId(state => ({ ...state, [commentId]: desired }))
    setLocalError(null)

    const outcome = await onToggleCommentLike(commentId, desired, current)
    setLikedByCommentId(state => ({
      ...state,
      [commentId]: outcome.liked ?? undefined,
    }))
  }

  /*
    확인 창 없이 지운다(#581) — 페이지가 행을 숨기고 「되돌리기」 토스트를 띄운다. 행이 사라지면 메뉴 트리거도
    사라지니 포커스를 댓글 제목으로 옮긴다(body 로 떨어지면 키보드 사용자가 자리를 잃는다).
  */
  const handleDelete = (commentId: CommunityId) => {
    if (!authReady) {
      return
    }

    if (!viewer.authenticated) {
      onRequireLogin()
      return
    }

    setLocalError(null)
    void onDeleteComment(commentId)
    requestAnimationFrame(() => {
      titleRef.current?.focus()
    })
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
          aria-label="답글 내용"
          maxLength={MAX_COMMENT_LENGTH}
          disabled={!authReady}
          /* 등록 중에는 disabled 대신 readOnly — 포커스(모바일 키보드)를 잃지 않는다(#580). */
          readOnly={pendingComposer !== null}
          aria-busy={pendingComposer === parentCommentId || undefined}
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
              onMouseDown={keepComposerFocus}
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
              deletePending={false}
              onDelete={() => {
                handleDelete(item.commentId)
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
            disabled={!authReady}
            onClick={() => {
              void handleLike(item)
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
      <Title id={`${composerId}-title`} ref={titleRef} tabIndex={-1}>
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
              aria-label="댓글 내용"
              data-community-comment-entry="true"
              maxLength={MAX_COMMENT_LENGTH}
              disabled={!authReady}
              /* 등록 중에는 disabled 대신 readOnly — 포커스(모바일 키보드)를 잃지 않는다(#580). */
              readOnly={pendingComposer !== null}
              aria-busy={pendingComposer === 'root' || undefined}
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
                  onMouseDown={keepComposerFocus}
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
