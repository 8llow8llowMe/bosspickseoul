'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Share,
} from 'lucide-react'
import styled, { css } from 'styled-components'
import CommunityCommentThread from '@/components/community/community-comment-thread'
import CommunityDetailBottomBar from '@/components/community/community-detail-bottom-bar'
import CommunityFeedback from '@/components/community/community-feedback'
import CommunityMoreMenu from '@/components/community/community-more-menu'
import CommunityReportDialog from '@/components/community/community-report-dialog'
import CommunityWriter from '@/components/community/community-writer'
import { useToast } from '@/components/ui/toast'
import {
  formatCommunityCount,
  formatCommunityDate,
  formatRelativeTime,
  getCommunityExcerpt,
} from '@/lib/community'
import type { AdjacentPostState } from '@/lib/community/adjacent-posts'
import { focusCommunityCommentEntry } from '@/lib/community/comment-thread'
import { createCommunityPostHref } from '@/lib/community/community-state'
import type { CommunityViewer } from '@/lib/community/community-state'
import {
  COMMUNITY_SHARE_TOAST,
  createCommunityRegionListHref,
  createCommunityShareUrl,
  getCommunityRailRegionName,
  getCommunityRegionName,
  isCommunityPostEdited,
  shareCommunityPostOnce,
} from '@/lib/community/post-detail'
import { sortPostImages } from '@/lib/community/post-images'
import type {
  CommunityId,
  CommunityComment,
  CommunityCommentLikeBody,
  CommunityPostDetail,
  CommunityPostSummary,
  CommunityReportCreateRequest,
} from '@/types/community'
import { shellWidth } from '@/styles/layout'

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
    parentCommentId?: CommunityId
  }) => Promise<boolean>
  onDeleteComment: (commentId: CommunityId) => Promise<boolean>
  onToggleCommentLike: (
    commentId: CommunityId,
  ) => Promise<CommunityCommentLikeBody | null>
  onOpenReport: (
    target: Pick<CommunityReportCreateRequest, 'targetKind' | 'targetId'>,
  ) => void
  onCloseReport: () => void
  onSubmitReport: (reason: string) => void
}

/*
  커뮤니티 구간(DESIGN.md §8 피드형 화면 메모): <480 모바일 · 480–1079 태블릿(--w-read 1단) ·
  ≥1080 데스크톱(본문 --w-read + 레일 300). 레거시 640·768 은 쓰지 않는다.
*/
/*
  포커스는 전역 :focus-visible 링(global-styles.ts — 2px blue500, offset 2px) 하나로 보인다.
  여기 버튼·링크는 테두리가 파랗게 바뀌는 입력칸이 아니라 링을 끄지 않는다 — 링을 끄고
  --shadow-focus-primary-strong(4px 16%) 글로우만 남기면 흰 바탕 대비가 ~1.17:1 이라 안 보인다.
  글로우를 링과 겹쳐 두지도 않는다 — DESIGN.md §4 「Focus is one line」.
*/
const MOBILE = '@media (max-width: 479px)'
const TABLET_UP = '@media (min-width: 480px)'
const DESKTOP = '@media (min-width: 1080px)'

/*
  사이트 헤더(site-header.tsx)는 sticky top:0 · 높이 64 다. 레일은 그 아래 24 를 띄워 붙는다
  (목록 툴바는 top:64 로 헤더에 바로 붙지만, 레일은 카드라 헤더 테두리에 닿으면 끼어 보인다).
*/
const SITE_HEADER_HEIGHT = 64
const RAIL_STICKY_TOP = SITE_HEADER_HEIGHT + 24

const Page = styled.main`
  ${shellWidth}
  padding: 16px 0 64px;

  ${MOBILE} {
    padding-top: 8px;
  }
`

/*
  D1 버그 고침. 예전에는 `minmax(0, 1fr) 300px` 에 본문 열만 720 상한이라, 1440 폭에서 본문과
  레일 사이가 ≈370px 비었다. 이제 트랙 자체가 --w-read 상한이고 묶음을 가운데로 모은다(CM-020).
  1080 미만은 --w-read 1단이고 레일은 DOM 순서대로 댓글·인접 글 뒤에 온다.
*/
const Layout = styled.div<{ $withRail?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, var(--w-read));
  justify-content: center;
  gap: 32px;

  /* 레일이 없는 글(대상 없음)은 ≥1080 에서도 본문 1열 가운데다 — 빈 300 칸을 남기지 않는다. */
  ${props =>
    props.$withRail
      ? css`
          ${DESKTOP} {
            grid-template-columns: minmax(0, var(--w-read)) 300px;
            column-gap: 24px;
            align-items: start;
          }
        `
      : null}
`

const MainColumn = styled.div`
  min-width: 0;
  display: grid;
  gap: 24px;
`

const HeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  /* 버튼 안쪽 여백만큼 바깥으로 빼서 아이콘이 본문 글자 열과 같은 선에 선다. */
  margin: 0 -8px;
`

/* 머리 줄의 「← 목록」. 화면 내비게이션이라 파란 링크가 아니라 중립 글자로 둔다 — 오른쪽 ⋯ 와 같은 톤. */
const BackLink = styled(Link)`
  min-height: 44px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-radius: var(--radius-control);
  color: var(--color-text-800);
  font-size: 16px;
  font-weight: 600;

  svg {
    flex: 0 0 auto;
  }

  &:hover {
    background: var(--color-background-muted);
  }
`

/* 본문은 카드에서 꺼내 흰 바탕에 바로 둔다 — 읽기 화면에서 테두리는 소음이다(제안서 §4.2 A). */
const Article = styled.article`
  min-width: 0;
  display: grid;
  gap: 24px;

  ${MOBILE} {
    gap: 20px;
  }
`

const ArticleHeader = styled.header`
  min-width: 0;
  display: grid;
  gap: 12px;
`

const regionChipBase = css`
  min-height: 36px;
  max-width: 100%;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border-radius: var(--radius-control);
  font-size: 13px;
  font-weight: 600;

  > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg {
    flex: 0 0 auto;
  }
`

/* 지역 칩 — 그 지역 목록으로 가는 링크. 목록의 활성 칩과 같은 blue50 바탕 + blue700 글자(5.26:1). */
const RegionChipLink = styled(Link)`
  ${regionChipBase}
  background: var(--color-primary-100);
  color: var(--color-text-primary-on-light);
`

/* 대상이 없는 글. 「서울 전체」로 갈 곳은 목록 첫 화면이라 ← 목록 과 겹친다 — 링크 없는 라벨이다. */
const RegionChipLabel = styled.span`
  ${regionChipBase}
  background: var(--color-surface-muted);
  color: var(--color-text-700);
`

const ArticleTitle = styled.h1`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
  word-break: keep-all;

  ${TABLET_UP} {
    font-size: 26px;
  }
`

const Byline = styled.div`
  min-width: 0;
  display: grid;
  gap: 4px;
  justify-items: start;
`

const MetaLine = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
`

const ArticleContent = styled.div`
  color: var(--color-text-800);
  font-size: 16px;
  line-height: 1.9;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`

/*
  분석 첨부. 「이 글이 무엇을 근거로 삼았는지」를 본문 위에 밝힌다 — 본문 아래에 두면
  긴 글에서는 끝까지 읽어야 알게 되는데, 근거의 출처는 읽기 시작할 때 아는 편이 낫다.
*/
const AnalysisNote = styled.aside`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  padding: 12px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
`

const AnalysisLabel = styled.span`
  /* grey100 바탕 위라 grey600 캡션은 4.19 로 미달이다 — grey700(DESIGN.md §2 caption-on-band 값). */
  color: var(--color-text-700);
  font-size: 12px;
  font-weight: 600;
`

const AnalysisName = styled.strong`
  color: var(--color-text-900);
  font-size: 13px;
  font-weight: 700;
  word-break: keep-all;
`

const ArticleImages = styled.ul`
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;

  img {
    width: 100%;
    max-width: var(--w-read);
    height: auto;
    display: block;
    border: 1px solid var(--color-border-200);
    border-radius: var(--radius-card);
  }
`

const ReactionBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ReactionButton = styled.button<{ $active?: boolean }>`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  /* 좋아요한 상태도 파란 글자 — 상호작용의 활성 색은 파랑 하나다(DESIGN.md §7). */
  color: ${props =>
    props.$active
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-700)'};
  font: inherit;
  font-size: 14px;
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

const ReactionCount = styled.span`
  font-variant-numeric: tabular-nums;
`

/*
  본문과 댓글 사이 회색 띠(grey50 8px). <480 에서는 셸 거터만큼 바깥으로 빼 화면 끝까지 닿는다 —
  그 폭에서 본문 열 = 셸이라 정확히 화면 폭이고 가로 스크롤이 생기지 않는다. 그 이상은 열 폭이다.
*/
const SectionBand = styled.div`
  height: 8px;
  background: var(--color-background-muted);

  ${MOBILE} {
    margin: 0 calc(var(--shell-gutter) * -1);
  }
`

const InlineMessage = styled.p<{ $error?: boolean }>`
  padding: 12px 16px;
  border-radius: var(--radius-control);
  background: ${props =>
    props.$error
      ? 'color-mix(in srgb, var(--color-danger) 8%, var(--color-surface))'
      : 'var(--color-primary-100)'};
  color: ${props =>
    props.$error
      ? 'var(--color-negative-text)'
      : 'var(--color-text-primary-on-light)'};
  font-size: 13px;
  line-height: 1.6;
`

const Rail = styled.aside`
  min-width: 0;
  display: grid;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);

  ${DESKTOP} {
    position: sticky;
    top: ${RAIL_STICKY_TOP}px;
  }
`

const RailTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
  overflow-wrap: anywhere;
`

const RelatedList = styled.ul`
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
`

const RelatedLink = styled(Link)`
  min-height: 52px;
  display: grid;
  gap: 4px;
  align-content: center;
  padding: 12px 0;
  border-top: 1px solid var(--color-border-200);
  color: var(--color-text-800);

  /* 전역 링(2px blue500)이 위 테두리 선과 직각으로 만나지 않게 모서리만 둥글린다. */
  &:focus-visible {
    border-radius: var(--radius-control);
  }
`

const RelatedTitle = styled.span`
  display: -webkit-box;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`

const RelatedExcerpt = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
`

const RailMessage = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 1.6;
  word-break: keep-all;
`

const RailButton = styled.button`
  min-height: 44px;
  width: fit-content;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-700);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`

/* 빈 레일의 글쓰기 — 보조 CTA 라 blue50 바탕 + blue700 글자(DESIGN.md §4 Secondary). */
const RailWriteLink = styled(Link)`
  min-height: 44px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-text-primary-on-light);
  font-size: 14px;
  font-weight: 700;
`

const AdjacentNavigation = styled.nav`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  ${MOBILE} {
    grid-template-columns: 1fr;
  }
`

const AdjacentLink = styled(Link)<{ $next?: boolean }>`
  min-height: 72px;
  display: grid;
  gap: 4px;
  align-content: center;
  justify-items: ${props => (props.$next ? 'end' : 'start')};
  padding: 12px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  color: var(--color-text-800);
  text-align: ${props => (props.$next ? 'right' : 'left')};
`

const AdjacentLabel = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
`

const AdjacentTitle = styled.span`
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
  overflow-wrap: anywhere;
`

const createDetailPostHref = (
  postId: CommunityId,
  contextKey: string | null | undefined,
  mockEnabled: boolean,
) => {
  if (contextKey) {
    return createCommunityPostHref(postId, contextKey, mockEnabled)
  }

  return mockEnabled ? `/community/${postId}?mock=1` : `/community/${postId}`
}

type CommunityPostReactionsProps = {
  likeCount: number
  commentCount: number
  liked: boolean
  likePending: boolean
  authReady: boolean
  /** 모바일 하단 고정 바가 「반응 바가 화면 안인가」를 이 요소로 판정한다. */
  barRef: (element: HTMLDivElement | null) => void
  onToggleLike: () => void
  onComment: () => void
  onShare: () => void
}

/**
 * 반응 바 — 좋아요 · 댓글 · 공유. 공유는 로그인 없이 된다.
 * 핸들러는 뷰가 만든다 — 모바일 하단 고정 바가 같은 핸들러를 써야 해서(community.md §S4 2단계)
 * 이 컴포넌트 안에 공유 진행 중 가드를 두면 두 바가 서로를 모른다.
 */
function CommunityPostReactions({
  likeCount,
  commentCount,
  liked,
  likePending,
  authReady,
  barRef,
  onToggleLike,
  onComment,
  onShare,
}: CommunityPostReactionsProps) {
  return (
    <ReactionBar ref={barRef} aria-label="게시글 반응" role="group">
      <ReactionButton
        $active={liked}
        type="button"
        aria-label={`게시글 좋아요 ${formatCommunityCount(likeCount)}`}
        aria-pressed={liked}
        aria-busy={likePending || undefined}
        data-liked={liked ? 'true' : 'false'}
        disabled={!authReady || likePending}
        onClick={onToggleLike}
      >
        <Heart
          aria-hidden="true"
          fill={liked ? 'currentColor' : 'none'}
          size={18}
        />
        <span>좋아요</span>
        <ReactionCount>{formatCommunityCount(likeCount)}</ReactionCount>
      </ReactionButton>
      <ReactionButton
        type="button"
        aria-label="댓글로 이동"
        onClick={onComment}
      >
        <MessageCircle aria-hidden="true" size={18} />
        <span>댓글</span>
        <ReactionCount>{formatCommunityCount(commentCount)}</ReactionCount>
      </ReactionButton>
      <ReactionButton type="button" aria-label="게시글 공유" onClick={onShare}>
        <Share aria-hidden="true" size={18} />
        <span>공유</span>
      </ReactionButton>
    </ReactionBar>
  )
}

/**
 * 공유 핸들러. 진행 중 가드(ref)가 하나라 반응 바와 하단 고정 바 어느 쪽을 눌러도 공유 시트가
 * 떠 있는 동안의 두 번째 누름은 버린다(InvalidStateError·토스트 겹침 방지).
 */
const useCommunityPostShare = () => {
  const { showToast } = useToast()
  const shareInFlightRef = useRef(false)

  return async (title: string) => {
    const result = await shareCommunityPostOnce(
      shareInFlightRef,
      { title, url: createCommunityShareUrl(window.location.href) },
      navigator,
    )

    if (!result) {
      return
    }

    const toast = COMMUNITY_SHARE_TOAST[result]

    if (toast) {
      showToast({ ...toast, dedupeKey: 'community-post-share' })
    }
  }
}

/*
  댓글 진입. 로그인한 사람은 입력칸, 비로그인은 그 자리의 「로그인하고 댓글 남기기」로 간다.
  둘 다 댓글 스레드가 `data-community-comment-entry` 로 표시한다(focusCommunityCommentEntry).
*/
const goToCommentEntry = () => {
  focusCommunityCommentEntry(document)
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
  /* 훅은 로딩·오류의 이른 반환보다 앞에 둔다. */
  const sharePost = useCommunityPostShare()
  const [reactionsElement, setReactionsElement] =
    useState<HTMLDivElement | null>(null)
  const [composerElement, setComposerElement] = useState<HTMLDivElement | null>(
    null,
  )

  const backLink = (
    <BackLink href={listHref}>
      <ArrowLeft aria-hidden="true" size={18} />
      <span>목록</span>
    </BackLink>
  )

  if (status === 'loading') {
    return (
      <Page>
        <Layout>
          <MainColumn>
            <HeadRow>{backLink}</HeadRow>
            <CommunityFeedback
              kind="loading"
              title="게시글을 불러오는 중이에요"
            />
          </MainColumn>
        </Layout>
      </Page>
    )
  }

  if (status === 'error' || !detail) {
    return (
      <Page>
        <Layout>
          <MainColumn>
            <HeadRow>{backLink}</HeadRow>
            <CommunityFeedback
              kind="error"
              title="게시글을 불러오지 못했어요."
              description={errorMessage ?? undefined}
              onAction={onRetryDetail}
            />
          </MainColumn>
        </Layout>
      </Page>
    )
  }

  const contextKey = fromContext ?? adjacent?.contextKey ?? null
  /* 첨부는 비교 초안으로 쓴 글에만 있다. `analysisType` 이 없으면 첨부 자체가 없다. */
  const analysisTypeName =
    detail.analysisType?.name?.trim() || detail.analysisType?.code?.trim() || ''
  const regionHref = createCommunityRegionListHref(detail, mockEnabled)
  const regionName = regionHref ? getCommunityRegionName(detail) : '서울 전체'
  /*
    대상이 없는 글은 관련 글을 조회하지 않는다(createCommunityRelatedParams → null). 그때 relatedStatus
    'empty' 는 「비었다」가 아니라 「묻지 않았다」라 레일 자체를 그리지 않는다(community.md §S4).
    지역 칩 링크와 같은 판정(대상 종류·코드가 둘 다 유효)을 쓴다.
  */
  const showRail = regionHref !== null
  const railRegionName = getCommunityRailRegionName(detail)
  const edited = isCommunityPostEdited(detail.createdAt, detail.updatedAt)
  /* 글쓰기는 보호 경로라 비로그인이면 미들웨어·작성 화면이 로그인으로 보낸다(돌아올 자리 보존). */
  const writeHref = mockEnabled
    ? '/community/register?mock=1'
    : '/community/register'

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

  /* 반응 바와 하단 고정 바가 같이 쓴다 — 인증 게이트를 한 곳에서 건다. */
  const handleToggleLike = () => {
    requireAuth(() => {
      void onTogglePostLike()
    })
  }

  const handleShare = () => {
    void sharePost(detail.title)
  }

  return (
    <Page>
      <Layout
        $withRail={showRail}
        data-community-layout={showRail ? 'with-rail' : 'single'}
      >
        <MainColumn>
          <HeadRow>
            {backLink}
            <CommunityMoreMenu
              editHref={editHref}
              authReady={authReady}
              deletePending={postDeletePending}
              onDelete={onDeletePost}
              onReport={() => {
                requireAuth(() => {
                  onOpenReport({
                    targetKind: 'POST',
                    targetId: detail.postId,
                  })
                })
              }}
            />
          </HeadRow>

          <Article data-community-article="true">
            <ArticleHeader>
              {regionHref ? (
                <RegionChipLink
                  href={regionHref}
                  data-community-region-chip="link"
                >
                  <span>{regionName}</span>
                  <ChevronRight aria-hidden="true" size={16} />
                </RegionChipLink>
              ) : (
                <RegionChipLabel data-community-region-chip="label">
                  <span>{regionName}</span>
                </RegionChipLabel>
              )}
              <ArticleTitle>{detail.title}</ArticleTitle>
              <Byline>
                <CommunityWriter
                  nickname={detail.writerNickname}
                  profileImageUrl={detail.writerProfileImageUrl}
                  size="md"
                />
                {/*
                  날짜는 한 번만 적는다(CM-023). 절대 날짜는 `<time>` 의 title 로 — 마우스를 올리면
                  보이고, 화면에는 상대 시간 하나만 남는다. 댓글 수는 반응 바에 있어 여기서 뺐다.
                */}
                <MetaLine>
                  <time
                    dateTime={detail.createdAt}
                    title={formatCommunityDate(detail.createdAt)}
                  >
                    {formatRelativeTime(detail.createdAt)}
                  </time>
                  {` · 조회 ${formatCommunityCount(detail.viewCount)}`}
                  {edited ? ' · 수정됨' : null}
                </MetaLine>
              </Byline>
            </ArticleHeader>

            {/*
              첨부 이름이 없으면 종류만 적는다. 링크는 걸지 않는다 —
              `analysisRefCode` 가 `좌:우:업종:분기` 를 이어붙인 문자열인데 그 형식은
              계약으로 보장된 것이 아니라 예시로만 적혀 있다. 잘못 갈라 링크를 만들면
              깨진 링크가 되므로, 형식이 계약에 오르면 그때 잇는다.
            */}
            {analysisTypeName ? (
              <AnalysisNote aria-label="분석 첨부">
                <AnalysisLabel>근거로 삼은 분석</AnalysisLabel>
                <AnalysisName>
                  {detail.analysisRefName?.trim() || analysisTypeName}
                </AnalysisName>
              </AnalysisNote>
            ) : null}

            <ArticleContent>{detail.content}</ArticleContent>

            {detail.images.length > 0 ? (
              <ArticleImages>
                {sortPostImages(detail.images).map((image, index) => (
                  <li key={image.imageKey}>
                    {/*
                      MinIO 공개 URL 이라 `next/image` 최적화 대상이 아니다 — 원격
                      호스트를 `next.config` 에 등록하지 않으면 런타임에 실패한다.
                      `loading="lazy"` 로 목록 아래 이미지는 늦게 받는다.
                    */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.imageUrl}
                      alt={`첨부 이미지 ${index + 1}`}
                      loading="lazy"
                    />
                  </li>
                ))}
              </ArticleImages>
            ) : null}

            {postMutationError ? (
              <InlineMessage $error role="alert">
                {postMutationError}
              </InlineMessage>
            ) : null}
            {reportStatusMessage ? (
              <InlineMessage role="status">{reportStatusMessage}</InlineMessage>
            ) : null}

            <CommunityPostReactions
              likeCount={detail.likeCount}
              commentCount={detail.commentCount}
              liked={postLiked === true}
              likePending={postLikePending}
              authReady={authReady}
              barRef={setReactionsElement}
              onToggleLike={handleToggleLike}
              onComment={goToCommentEntry}
              onShare={handleShare}
            />
          </Article>

          <SectionBand aria-hidden="true" data-community-section-band="true" />

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
            /* 빈 상태는 스레드 안 한 줄이다 — 별도 카드를 띄우지 않는다(community.md §S4 2단계). */
            <CommunityCommentThread
              comments={comments}
              postWriterId={detail.memberId}
              viewer={viewer}
              authReady={authReady}
              errorMessage={commentMutationError}
              composerRef={setComposerElement}
              onRequireLogin={onRequireLogin}
              onCreateComment={onCreateComment}
              onDeleteComment={onDeleteComment}
              onToggleCommentLike={onToggleCommentLike}
              onReport={onOpenReport}
            />
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

        {showRail ? (
          <Rail
            aria-labelledby="community-region-rail-title"
            data-community-region-sidebar="true"
          >
            <RailTitle id="community-region-rail-title">
              {railRegionName} 최신 글
            </RailTitle>
            {relatedStatus === 'loading' ? (
              <RailMessage role="status">
                관련 글을 불러오는 중이에요.
              </RailMessage>
            ) : relatedStatus === 'error' ? (
              <>
                <RailMessage role="alert">
                  {relatedErrorMessage ?? '관련 글을 불러오지 못했어요.'}
                </RailMessage>
                <RailButton type="button" onClick={onRetryRelated}>
                  다시 시도
                </RailButton>
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
              <>
                <RailMessage>
                  {railRegionName}의 다음 이야기를 남겨 보세요
                </RailMessage>
                <RailWriteLink href={writeHref}>글쓰기</RailWriteLink>
              </>
            )}
          </Rail>
        ) : null}
      </Layout>

      <CommunityDetailBottomBar
        likeCount={detail.likeCount}
        liked={postLiked === true}
        likePending={postLikePending}
        authReady={authReady}
        reactionsElement={reactionsElement}
        /* 댓글 로딩·오류면 스레드가 없어 콜백 ref 가 null 로 돌아온다 — 반응 바만으로 판정한다. */
        composerElement={composerElement}
        onToggleLike={handleToggleLike}
        onComment={goToCommentEntry}
        onShare={handleShare}
      />

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
