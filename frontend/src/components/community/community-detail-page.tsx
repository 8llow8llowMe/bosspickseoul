'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import { getCommunityCategoryLabel } from '@/data/community-categories'
import {
  formatCommunityCount,
  formatCommunityDate,
  formatRelativeTime,
  getCommunityExcerpt,
} from '@/lib/community'
import {
  createCommunityComment,
  deleteCommunityComment,
  deleteCommunityData,
  getCommunityCommentsData,
  getCommunityDetailData,
  getCommunityListData,
  updateCommunityComment,
} from '@/lib/api/community'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { useAuthStore } from '@/stores/auth-store'

const Page = styled.main`
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: 40px 0 72px;
  display: grid;
  gap: 24px;
`

const Article = styled.article`
  display: grid;
  gap: 24px;
  padding: 32px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: white;
  box-shadow: var(--shadow-level-1);
`

const Header = styled.header`
  display: grid;
  gap: 18px;
`

const HeaderTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const HeaderCopy = styled.div`
  display: grid;
  gap: 12px;
`

const CategoryBadge = styled.span`
  display: inline-flex;
  width: fit-content;
  min-height: 30px;
  align-items: center;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 12px;
  font-weight: 700;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 26px;
  line-height: 1.12;
  letter-spacing: 0;
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--color-text-500);
  font-size: 14px;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const SecondaryLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 1px solid var(--color-primary-700);
  border-radius: var(--radius-control);
  background: white;
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 700;
`

const GhostButton = styled.button`
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: white;
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const Gallery = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const GalleryImage = styled.img`
  width: 100%;
  min-height: 260px;
  border-radius: var(--radius-card);
  object-fit: cover;
  background: var(--color-surface-muted);
`

const Content = styled.div`
  color: var(--color-text-700);
  font-size: 16px;
  line-height: 1.9;
  white-space: pre-wrap;
`

const Section = styled.section`
  display: grid;
  gap: 18px;
  padding: 28px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: white;
  box-shadow: var(--shadow-level-1);
`

const SectionHeader = styled.div`
  display: grid;
  gap: 8px;
`

const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: 0;
`

const SectionBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

const Notice = styled.div<{ $tone?: 'error' | 'info' }>`
  padding: 16px 18px;
  border-radius: var(--radius-card);
  background: ${props =>
    props.$tone === 'error'
      ? 'rgba(240, 68, 82, 0.1)'
      : 'var(--color-primary-100)'};
  color: ${props =>
    props.$tone === 'error'
      ? 'var(--color-danger)'
      : 'var(--color-primary-700)'};
  line-height: 1.75;
`

const CommentComposer = styled.div`
  display: grid;
  gap: 12px;
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 140px;
  padding: 16px 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  resize: vertical;
  background: white;
  color: var(--color-text-900);
  line-height: 1.75;
`

const ComposerFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const Helper = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
`

const PrimaryButton = styled.button`
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const CommentList = styled.div`
  display: grid;
  gap: 14px;
`

const CommentCard = styled.article`
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

const CommentHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const CommentAuthor = styled.div`
  display: grid;
  gap: 6px;
`

const CommentAuthorName = styled.p`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
`

const CommentMeta = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
`

const CommentActions = styled.div`
  display: flex;
  gap: 8px;
`

const CommentActionButton = styled.button`
  border: none;
  background: transparent;
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`

const CommentContent = styled.p`
  color: var(--color-text-700);
  line-height: 1.8;
  white-space: pre-wrap;
`

const RelatedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const RelatedCard = styled(Link)`
  display: grid;
  gap: 10px;
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: white;
`

const RelatedTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 18px;
  line-height: 1.4;
`

const RelatedBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

type CommunityDetailPageProps = {
  communityId: number
}

export default function CommunityDetailPage({
  communityId,
}: CommunityDetailPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const memberInfo = useAuthStore(state => state.memberInfo)
  const [commentValue, setCommentValue] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editingCommentValue, setEditingCommentValue] = useState('')
  const [commentMessage, setCommentMessage] = useState<string | null>(null)

  const detailQuery = useQuery({
    queryKey: ['community-detail', communityId],
    queryFn: () => getCommunityDetailData(communityId),
  })

  const commentsQuery = useQuery({
    queryKey: ['community-comments', communityId],
    queryFn: () => getCommunityCommentsData(communityId),
  })

  const detailCategory =
    detailQuery.data && isApiSuccess(detailQuery.data)
      ? detailQuery.data.dataBody.category
      : ''

  const relatedPostsQuery = useQuery({
    queryKey: ['community-related-posts', communityId, detailCategory],
    queryFn: () => getCommunityListData(detailCategory, 0),
    enabled: Boolean(detailCategory),
  })

  const refreshCommunityQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['community-detail', communityId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['community-comments', communityId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['community-list'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['community-popular'],
      }),
    ])
  }

  const deletePostMutation = useMutation({
    mutationFn: () => deleteCommunityData(communityId),
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        setCommentMessage(getApiMessage(response))
        return
      }

      await refreshCommunityQueries()
      router.replace('/community/list')
    },
    onError: error => {
      setCommentMessage(
        error instanceof Error
          ? error.message
          : '게시글 상태를 확인한 뒤 다시 삭제해주세요.',
      )
    },
  })

  const createCommentMutation = useMutation({
    mutationFn: (content: string) =>
      createCommunityComment(communityId, {
        content,
      }),
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        setCommentMessage(getApiMessage(response))
        return
      }

      setCommentValue('')
      setCommentMessage(null)
      await refreshCommunityQueries()
    },
    onError: error => {
      setCommentMessage(
        error instanceof Error
          ? error.message
          : '댓글 내용을 확인한 뒤 다시 등록해주세요.',
      )
    },
  })

  const updateCommentMutation = useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: number
      content: string
    }) =>
      updateCommunityComment(communityId, commentId, {
        content,
      }),
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        setCommentMessage(getApiMessage(response))
        return
      }

      setEditingCommentId(null)
      setEditingCommentValue('')
      setCommentMessage(null)
      await refreshCommunityQueries()
    },
    onError: error => {
      setCommentMessage(
        error instanceof Error
          ? error.message
          : '댓글 내용을 확인한 뒤 다시 수정해주세요.',
      )
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) =>
      deleteCommunityComment(communityId, commentId),
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        setCommentMessage(getApiMessage(response))
        return
      }

      setCommentMessage(null)
      await refreshCommunityQueries()
    },
    onError: error => {
      setCommentMessage(
        error instanceof Error
          ? error.message
          : '댓글 상태를 확인한 뒤 다시 삭제해주세요.',
      )
    },
  })

  if (detailQuery.isLoading) {
    return (
      <Page>
        <Notice>게시글 상세 정보를 불러오는 중입니다.</Notice>
      </Page>
    )
  }

  if (!detailQuery.data || !isApiSuccess(detailQuery.data)) {
    return (
      <Page>
        <Notice $tone="error">
          {getApiMessage(detailQuery.data, '게시글 주소를 확인해주세요.')}
        </Notice>
      </Page>
    )
  }

  const detail = detailQuery.data.dataBody
  const currentMemberId = memberInfo?.id ?? null
  const isOwner =
    hasHydrated && isLoggedIn && currentMemberId === detail.writerId

  const comments =
    commentsQuery.data && isApiSuccess(commentsQuery.data)
      ? commentsQuery.data.dataBody
      : []

  const relatedPosts =
    relatedPostsQuery.data && isApiSuccess(relatedPostsQuery.data)
      ? relatedPostsQuery.data.dataBody
          .filter(post => post.communityId !== detail.communityId)
          .slice(0, 4)
      : []

  const handleDeletePost = () => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) {
      return
    }

    deletePostMutation.mutate()
  }

  const handleSubmitComment = () => {
    const trimmedContent = commentValue.trim()

    if (!trimmedContent) {
      setCommentMessage('댓글 내용을 입력해 주세요.')
      return
    }

    if (!isLoggedIn) {
      router.push('/login')
      return
    }

    createCommentMutation.mutate(trimmedContent)
  }

  const handleUpdateComment = (commentId: number) => {
    const trimmedContent = editingCommentValue.trim()

    if (!trimmedContent) {
      setCommentMessage('수정할 댓글 내용을 입력해 주세요.')
      return
    }

    updateCommentMutation.mutate({
      commentId,
      content: trimmedContent,
    })
  }

  const handleDeleteComment = (commentId: number) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) {
      return
    }

    deleteCommentMutation.mutate(commentId)
  }

  return (
    <Page>
      <Article>
        <Header>
          <HeaderTop>
            <HeaderCopy>
              <CategoryBadge>
                {getCommunityCategoryLabel(detail.category)}
              </CategoryBadge>
              <Title>{detail.title}</Title>
              <MetaRow>
                <span>{detail.writerNickname}</span>
                <span>{formatCommunityDate(detail.createdAt)}</span>
                <span>조회 {formatCommunityCount(detail.readCount)}</span>
                <span>댓글 {formatCommunityCount(detail.commentCount)}</span>
              </MetaRow>
            </HeaderCopy>
            <ActionRow>
              <SecondaryLink href="/community/list">목록으로</SecondaryLink>
              {isOwner ? (
                <>
                  <SecondaryLink
                    href={`/community/register?communityId=${detail.communityId}`}
                  >
                    수정
                  </SecondaryLink>
                  <GhostButton type="button" onClick={handleDeletePost}>
                    {deletePostMutation.isPending ? '삭제 중' : '삭제'}
                  </GhostButton>
                </>
              ) : null}
            </ActionRow>
          </HeaderTop>
          <Notice>
            {formatRelativeTime(detail.createdAt)} 작성된 게시글입니다. 운영
            경험과 데이터를 바탕으로 한 인사이트를 확인해 보세요.
          </Notice>
        </Header>

        {detail.images.length > 0 ? (
          <Gallery>
            {detail.images.map(image => (
              <GalleryImage
                key={image.imageId ?? image.url}
                src={image.url}
                alt={detail.title}
              />
            ))}
          </Gallery>
        ) : null}

        <Content>{detail.content}</Content>
      </Article>

      <Section>
        <SectionHeader>
          <SectionTitle>
            댓글 {formatCommunityCount(comments.length)}
          </SectionTitle>
          <SectionBody>
            의견을 남기면 글 작성자와 다른 운영자들이 이어서 논의할 수 있습니다.
          </SectionBody>
        </SectionHeader>

        <CommentComposer>
          <TextArea
            aria-label="community comment"
            placeholder={
              isLoggedIn
                ? '운영 경험이나 질문을 댓글로 남겨 보세요.'
                : '댓글 작성은 로그인 후 가능합니다.'
            }
            value={commentValue}
            onChange={event => {
              setCommentValue(event.target.value)
            }}
            disabled={!isLoggedIn || createCommentMutation.isPending}
          />
          <ComposerFooter>
            <Helper>
              {!isLoggedIn
                ? '로그인 후 댓글을 작성할 수 있습니다.'
                : '실제 운영 경험이나 후속 질문을 남기면 대화가 더 빨라집니다.'}
            </Helper>
            <PrimaryButton type="button" onClick={handleSubmitComment}>
              {createCommentMutation.isPending ? '등록 중' : '댓글 작성'}
            </PrimaryButton>
          </ComposerFooter>
        </CommentComposer>

        {commentMessage ? (
          <Notice $tone="error">{commentMessage}</Notice>
        ) : null}
        {commentsQuery.data && !isApiSuccess(commentsQuery.data) ? (
          <Notice $tone="error">{getApiMessage(commentsQuery.data)}</Notice>
        ) : null}
        {commentsQuery.isLoading ? (
          <Notice>댓글을 불러오는 중입니다.</Notice>
        ) : comments.length > 0 ? (
          <CommentList>
            {comments.map(comment => {
              const isCommentOwner =
                hasHydrated &&
                isLoggedIn &&
                currentMemberId === comment.writerId

              return (
                <CommentCard key={comment.commentId}>
                  <CommentHeader>
                    <CommentAuthor>
                      <CommentAuthorName>
                        {comment.writerNickname}
                      </CommentAuthorName>
                      <CommentMeta>
                        {formatRelativeTime(comment.createdAt)}
                      </CommentMeta>
                    </CommentAuthor>
                    {isCommentOwner ? (
                      <CommentActions>
                        <CommentActionButton
                          type="button"
                          onClick={() => {
                            if (editingCommentId === comment.commentId) {
                              setEditingCommentId(null)
                              setEditingCommentValue('')
                              return
                            }

                            setEditingCommentId(comment.commentId)
                            setEditingCommentValue(comment.content)
                          }}
                        >
                          {editingCommentId === comment.commentId
                            ? '취소'
                            : '수정'}
                        </CommentActionButton>
                        <CommentActionButton
                          type="button"
                          onClick={() => {
                            handleDeleteComment(comment.commentId)
                          }}
                        >
                          삭제
                        </CommentActionButton>
                      </CommentActions>
                    ) : null}
                  </CommentHeader>
                  {editingCommentId === comment.commentId ? (
                    <CommentComposer>
                      <TextArea
                        aria-label="edit community comment"
                        value={editingCommentValue}
                        onChange={event => {
                          setEditingCommentValue(event.target.value)
                        }}
                      />
                      <ComposerFooter>
                        <Helper>수정한 내용은 바로 반영됩니다.</Helper>
                        <PrimaryButton
                          type="button"
                          onClick={() => {
                            handleUpdateComment(comment.commentId)
                          }}
                        >
                          {updateCommentMutation.isPending ? '저장 중' : '저장'}
                        </PrimaryButton>
                      </ComposerFooter>
                    </CommentComposer>
                  ) : (
                    <CommentContent>{comment.content}</CommentContent>
                  )}
                </CommentCard>
              )
            })}
          </CommentList>
        ) : (
          <Notice>첫 댓글을 남겨 이 게시글의 논의를 시작해 보세요.</Notice>
        )}
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>비슷한 게시글</SectionTitle>
          <SectionBody>
            같은 카테고리의 다른 운영 경험도 함께 확인할 수 있습니다.
          </SectionBody>
        </SectionHeader>

        {relatedPosts.length > 0 ? (
          <RelatedGrid>
            {relatedPosts.map(post => (
              <RelatedCard
                key={post.communityId}
                href={`/community/${post.communityId}`}
              >
                <CategoryBadge>
                  {getCommunityCategoryLabel(post.category)}
                </CategoryBadge>
                <RelatedTitle>{post.title}</RelatedTitle>
                <RelatedBody>
                  {getCommunityExcerpt(post.content, 88)}
                </RelatedBody>
                <MetaRow>
                  <span>{post.writerNickname}</span>
                  <span>조회 {formatCommunityCount(post.readCount)}</span>
                  <span>댓글 {formatCommunityCount(post.commentCount)}</span>
                </MetaRow>
              </RelatedCard>
            ))}
          </RelatedGrid>
        ) : relatedPostsQuery.isLoading ? (
          <Notice>같은 카테고리의 게시글을 불러오는 중입니다.</Notice>
        ) : (
          <Notice>같은 카테고리에 표시할 다른 게시글이 아직 없어요.</Notice>
        )}
      </Section>
    </Page>
  )
}
