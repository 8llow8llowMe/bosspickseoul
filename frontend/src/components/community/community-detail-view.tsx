'use client'

import Link from 'next/link'
import styled from 'styled-components'
import CommunityCommentThread from '@/components/community/community-comment-thread'
import CommunityFeedback from '@/components/community/community-feedback'
import CommunityReportDialog from '@/components/community/community-report-dialog'
import {
  formatCommunityCount,
  formatCommunityDate,
  formatRelativeTime,
  getCommunityExcerpt,
} from '@/lib/community'
import type { AdjacentPostState } from '@/lib/community/adjacent-posts'
import { createCommunityPostHref } from '@/lib/community/community-state'
import type { CommunityViewer } from '@/lib/community/community-state'
import type {
  CommunityComment,
  CommunityCommentLikeBody,
  CommunityPostDetail,
  CommunityPostSummary,
  CommunityReportCreateRequest,
} from '@/types/community'

type LoadStatus = 'loading' | 'error' | 'empty' | 'ready'

export type CommunityDetailViewProps = {
  status: Exclude<LoadStatus, 'empty'>
  detail: CommunityPostDetail | null
  errorMessage: string | null
  commentsStatus: LoadStatus
  comments: CommunityComment[]
  commentsErrorMessage: string | null
  relatedStatus: LoadStatus
  relatedPosts: CommunityPostSummary[]
  relatedErrorMessage: string | null
  viewer: CommunityViewer
  authReady: boolean
  listHref: string
  editHref: string | null
  postLiked: boolean | null
  postLikePending: boolean
  postDeletePending?: boolean
  postMutationError: string | null
  commentMutationError: string | null
  reportTarget: Pick<
    CommunityReportCreateRequest,
    'targetKind' | 'targetId'
  > | null
  reportPending: boolean
  reportErrorMessage: string | null
  reportStatusMessage: string | null
  adjacent: AdjacentPostState | null
  fromContext?: string | null
  mockEnabled: boolean
  onRetryDetail: () => void
  onRetryComments: () => void
  onRetryRelated: () => void
  onRequireLogin: () => void
  onTogglePostLike: () => Promise<unknown>
  onDeletePost: () => void
  onCreateComment: (payload: {
    content: string
    parentCommentId?: number
  }) => Promise<boolean>
  onDeleteComment: (commentId: number) => Promise<boolean>
  onToggleCommentLike: (
    commentId: number,
  ) => Promise<CommunityCommentLikeBody | null>
  onOpenReport: (
    target: Pick<CommunityReportCreateRequest, 'targetKind' | 'targetId'>,
  ) => void
  onCloseReport: () => void
  onSubmitReport: (reason: string) => void
}

const Page = styled.main`
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 28px 0 72px;

  @media (max-width: 640px) {
    width: min(100% - 24px, 1180px);
    padding-top: 20px;
  }
`

const BackLink = styled(Link)`
  min-height: 44px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 4px;
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 700;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const Layout = styled.div`
  display: grid;
  gap: 20px;

  @media (min-width: 768px) {
    grid-template-columns: minmax(0, 1fr) 300px;
    align-items: start;
  }
`

const MainColumn = styled.div`
  min-width: 0;
  display: grid;
  gap: 20px;
`

const Article = styled.article`
  display: grid;
  gap: 24px;
  padding: 28px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);

  @media (max-width: 640px) {
    gap: 20px;
    padding: 20px 18px;
  }
`

const ArticleHeader = styled.header`
  display: grid;
  gap: 14px;
`

const TargetBadge = styled.span`
  min-height: 30px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 12px;
  font-weight: 700;
`

const ArticleTitle = styled.h1`
  color: var(--color-text-900);
  font-size: clamp(24px, 4vw, 34px);
  line-height: 1.28;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px 14px;
  flex-wrap: wrap;
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.6;
`

const Author = styled.span`
  color: var(--color-text-700);
  font-weight: 700;
`

const ArticleContent = styled.div`
  min-height: 160px;
  padding: 8px 0;
  color: var(--color-text-800);
  font-size: 16px;
  line-height: 1.9;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`

const ArticleFooter = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-200);
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ActionButton = styled.button<{ $danger?: boolean }>`
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: ${props =>
    props.$danger ? 'var(--color-danger)' : 'var(--color-text-700)'};
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

const EditLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const InlineMessage = styled.p<{ $error?: boolean }>`
  padding: 12px 14px;
  border-radius: var(--radius-control);
  background: ${props =>
    props.$error
      ? 'color-mix(in srgb, var(--color-danger) 8%, var(--color-surface))'
      : 'var(--color-primary-100)'};
  color: ${props =>
    props.$error ? 'var(--color-danger)' : 'var(--color-primary-700)'};
  font-size: 13px;
  line-height: 1.6;
`

const Sidebar = styled.aside`
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);

  @media (min-width: 768px) {
    position: sticky;
    top: 88px;
  }
`

const SidebarSection = styled.section`
  display: grid;
  gap: 10px;
`

const SidebarTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 16px;
  line-height: 1.45;
`

const SidebarBody = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.6;
`

const RelatedList = styled.ul`
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const RelatedLink = styled(Link)`
  min-height: 44px;
  display: grid;
  gap: 4px;
  align-content: center;
  padding: 10px 0;
  border-top: 1px solid var(--color-border-200);
  color: var(--color-text-800);

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const RelatedTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
`

const RelatedExcerpt = styled.span`
  color: var(--color-text-500);
  font-size: 12px;
  line-height: 1.5;
`

const SidebarFeedback = styled.div`
  padding: 14px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 1.6;
`

const AdjacentNavigation = styled.nav`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const AdjacentLink = styled(Link)<{ $next?: boolean }>`
  min-height: 72px;
  display: grid;
  gap: 4px;
  align-content: center;
  justify-items: ${props => (props.$next ? 'end' : 'start')};
  padding: 14px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  color: var(--color-text-800);
  text-align: ${props => (props.$next ? 'right' : 'left')};

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const AdjacentLabel = styled.span`
  color: var(--color-text-500);
  font-size: 12px;
`

const AdjacentTitle = styled.span`
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
`

const createDetailPostHref = (
  postId: number,
  contextKey: string | null | undefined,
  mockEnabled: boolean,
) => {
  if (contextKey) {
    return createCommunityPostHref(postId, contextKey, mockEnabled)
  }

  return mockEnabled ? `/community/${postId}?mock=1` : `/community/${postId}`
}

export default function CommunityDetailView({
  status,
  detail,
  errorMessage,
  commentsStatus,
  comments,
  commentsErrorMessage,
  relatedStatus,
  relatedPosts,
  relatedErrorMessage,
  viewer,
  authReady,
  listHref,
  editHref,
  postLiked,
  postLikePending,
  postDeletePending = false,
  postMutationError,
  commentMutationError,
  reportTarget,
  reportPending,
  reportErrorMessage,
  reportStatusMessage,
  adjacent,
  fromContext,
  mockEnabled,
  onRetryDetail,
  onRetryComments,
  onRetryRelated,
  onRequireLogin,
  onTogglePostLike,
  onDeletePost,
  onCreateComment,
  onDeleteComment,
  onToggleCommentLike,
  onOpenReport,
  onCloseReport,
  onSubmitReport,
}: CommunityDetailViewProps) {
  if (status === 'loading') {
    return (
      <Page>
        <CommunityFeedback kind="loading" title="게시글을 불러오는 중이에요" />
      </Page>
    )
  }

  if (status === 'error' || !detail) {
    return (
      <Page>
        <BackLink href={listHref}>← 목록으로</BackLink>
        <CommunityFeedback
          kind="error"
          title="게시글을 불러오지 못했어요."
          description={errorMessage ?? undefined}
          onAction={onRetryDetail}
        />
      </Page>
    )
  }

  const contextKey = fromContext ?? adjacent?.contextKey ?? null
  const targetName = detail.targetName?.trim() || '서울 전체'

  const requireAuth = (action: () => void) => {
    if (!authReady) {
      return
    }

    if (!viewer.authenticated) {
      onRequireLogin()
      return
    }

    action()
  }

  return (
    <Page>
      <BackLink href={listHref}>← 목록으로</BackLink>
      <Layout>
        <MainColumn>
          <Article data-community-article="true">
            <ArticleHeader>
              <TargetBadge>{targetName}</TargetBadge>
              <ArticleTitle>{detail.title}</ArticleTitle>
              <MetaRow>
                <Author>사장님</Author>
                <time dateTime={detail.createdAt}>
                  {formatRelativeTime(detail.createdAt)} ·{' '}
                  {formatCommunityDate(detail.createdAt)}
                </time>
                <span>조회 {formatCommunityCount(detail.viewCount)}</span>
                <span>댓글 {formatCommunityCount(detail.commentCount)}</span>
              </MetaRow>
            </ArticleHeader>

            <ArticleContent>{detail.content}</ArticleContent>

            {postMutationError ? (
              <InlineMessage $error role="alert">
                {postMutationError}
              </InlineMessage>
            ) : null}
            {reportStatusMessage ? (
              <InlineMessage role="status">{reportStatusMessage}</InlineMessage>
            ) : null}

            <ArticleFooter>
              <Actions aria-label="게시글 반응">
                <ActionButton
                  type="button"
                  aria-label={`게시글 좋아요 ${formatCommunityCount(detail.likeCount)}`}
                  aria-pressed={postLiked ?? false}
                  disabled={!authReady || postLikePending}
                  onClick={() => {
                    requireAuth(() => {
                      void onTogglePostLike()
                    })
                  }}
                >
                  {postLikePending
                    ? '처리 중'
                    : `좋아요 ${formatCommunityCount(detail.likeCount)}`}
                </ActionButton>
                <ActionButton
                  type="button"
                  aria-label="댓글로 이동"
                  onClick={() => {
                    document
                      .querySelector<HTMLTextAreaElement>(
                        'textarea[aria-label="댓글 내용"]',
                      )
                      ?.focus()
                  }}
                >
                  댓글 {formatCommunityCount(detail.commentCount)}
                </ActionButton>
                <ActionButton
                  type="button"
                  aria-label="게시글 신고"
                  disabled={!authReady}
                  onClick={() => {
                    requireAuth(() => {
                      onOpenReport({
                        targetKind: 'POST',
                        targetId: detail.postId,
                      })
                    })
                  }}
                >
                  신고
                </ActionButton>
              </Actions>
              {editHref ? (
                <Actions aria-label="내 게시글 관리">
                  <EditLink href={editHref}>수정</EditLink>
                  <ActionButton
                    $danger
                    type="button"
                    aria-label="게시글 삭제"
                    disabled={!authReady || postDeletePending}
                    onClick={onDeletePost}
                  >
                    {postDeletePending ? '삭제 중' : '삭제'}
                  </ActionButton>
                </Actions>
              ) : null}
            </ArticleFooter>
          </Article>

          {commentsStatus === 'loading' ? (
            <CommunityFeedback
              kind="loading"
              title="댓글을 불러오는 중이에요"
            />
          ) : commentsStatus === 'error' ? (
            <CommunityFeedback
              kind="error"
              title="댓글을 불러오지 못했어요."
              description={commentsErrorMessage ?? undefined}
              onAction={onRetryComments}
            />
          ) : (
            <>
              <CommunityCommentThread
                comments={comments}
                viewer={viewer}
                authReady={authReady}
                errorMessage={commentMutationError}
                onRequireLogin={onRequireLogin}
                onCreateComment={onCreateComment}
                onDeleteComment={onDeleteComment}
                onToggleCommentLike={onToggleCommentLike}
                onReport={onOpenReport}
              />
              {commentsStatus === 'empty' || comments.length === 0 ? (
                <CommunityFeedback
                  kind="empty"
                  title="아직 댓글이 없어요"
                  description="첫 댓글로 운영 경험이나 질문을 남겨 보세요."
                />
              ) : null}
            </>
          )}

          {adjacent ? (
            <AdjacentNavigation
              aria-label="이전 및 다음 게시글"
              data-community-adjacent-navigation="true"
            >
              {adjacent.previous ? (
                <AdjacentLink
                  href={createDetailPostHref(
                    adjacent.previous.postId,
                    adjacent.contextKey,
                    mockEnabled,
                  )}
                >
                  <AdjacentLabel>이전 글</AdjacentLabel>
                  <AdjacentTitle>{adjacent.previous.title}</AdjacentTitle>
                </AdjacentLink>
              ) : (
                <span aria-hidden="true" />
              )}
              {adjacent.next ? (
                <AdjacentLink
                  $next
                  href={createDetailPostHref(
                    adjacent.next.postId,
                    adjacent.contextKey,
                    mockEnabled,
                  )}
                >
                  <AdjacentLabel>다음 글</AdjacentLabel>
                  <AdjacentTitle>{adjacent.next.title}</AdjacentTitle>
                </AdjacentLink>
              ) : null}
            </AdjacentNavigation>
          ) : null}
        </MainColumn>

        <Sidebar data-community-region-sidebar="true">
          <SidebarSection>
            <SidebarTitle>현재 지역</SidebarTitle>
            <TargetBadge>{targetName}</TargetBadge>
            <SidebarBody>
              {detail.targetType
                ? `${detail.targetType.name} 게시판의 최신 이야기를 함께 확인해 보세요.`
                : '서울 전체 사장님들과 나누는 이야기입니다.'}
            </SidebarBody>
          </SidebarSection>

          <SidebarSection>
            <SidebarTitle>같은 지역의 최신 글</SidebarTitle>
            {relatedStatus === 'loading' ? (
              <SidebarFeedback role="status">
                관련 글을 불러오는 중이에요.
              </SidebarFeedback>
            ) : relatedStatus === 'error' ? (
              <>
                <SidebarFeedback role="alert">
                  {relatedErrorMessage ?? '관련 글을 불러오지 못했어요.'}
                </SidebarFeedback>
                <ActionButton type="button" onClick={onRetryRelated}>
                  다시 시도
                </ActionButton>
              </>
            ) : relatedStatus === 'ready' && relatedPosts.length > 0 ? (
              <RelatedList>
                {relatedPosts.map(post => (
                  <li key={post.postId}>
                    <RelatedLink
                      href={createDetailPostHref(
                        post.postId,
                        contextKey,
                        mockEnabled,
                      )}
                    >
                      <RelatedTitle>{post.title}</RelatedTitle>
                      <RelatedExcerpt>
                        {getCommunityExcerpt(post.previewContent, 46)}
                      </RelatedExcerpt>
                    </RelatedLink>
                  </li>
                ))}
              </RelatedList>
            ) : (
              <SidebarFeedback role="status">
                같은 지역의 다른 게시글이 아직 없어요.
              </SidebarFeedback>
            )}
          </SidebarSection>
        </Sidebar>
      </Layout>

      <CommunityReportDialog
        open={Boolean(reportTarget)}
        targetKind={reportTarget?.targetKind ?? 'POST'}
        targetId={reportTarget?.targetId ?? detail.postId}
        pending={reportPending}
        errorMessage={reportErrorMessage}
        onClose={onCloseReport}
        onSubmit={onSubmitReport}
      />
    </Page>
  )
}
