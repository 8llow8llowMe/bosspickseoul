/**
 * 게시글 상세의 「참여」 판정 모음(community.md §S4 「화면 구성 — 개편 2단계 「참여」」).
 *
 * 댓글 행·답글 접기·모바일 하단 고정 바를 화면 없이 검증할 수 있게 순수 함수로 둔다.
 * DOM 은 인자로 받는다(`focusCommunityCommentEntry`). module scope 에서 `document` 를 읽지 않는다
 * (docs/engineering/client-boundary).
 */

import type { CommunityPostMenuAction } from './post-detail'

/** 답글을 접기 시작하는 개수 — 4개 이상이면 앞 3개만 보인다. */
const COMMUNITY_REPLY_COLLAPSE_MIN = 4
const COMMUNITY_REPLY_PREVIEW_COUNT = 3

/**
 * 답글 접기(CM-026). 4개 이상이고 펼치지 않았으면 앞 3개와 숨긴 수를 돌려준다.
 * 앞쪽을 보이는 이유: 답글은 시간순이라 앞이 대화의 시작이고, 뒤를 펼쳐야 최신이 보인다.
 */
export const getCommunityReplyPreview = <T>(
  replies: readonly T[],
  expanded: boolean,
): { visible: readonly T[]; hiddenCount: number } => {
  if (expanded || replies.length < COMMUNITY_REPLY_COLLAPSE_MIN) {
    return { visible: replies, hiddenCount: 0 }
  }

  return {
    visible: replies.slice(0, COMMUNITY_REPLY_PREVIEW_COUNT),
    hiddenCount: replies.length - COMMUNITY_REPLY_PREVIEW_COUNT,
  }
}

/** 댓글 더보기 항목. 댓글은 수정 API 가 없다 — 내 댓글은 삭제, 남의 댓글은 신고. */
export const getCommunityCommentMenuActions = (
  isOwner: boolean,
): CommunityPostMenuAction[] => (isOwner ? ['delete'] : ['report'])

/** 글쓴이 배지(CM-025). 글 작성자 memberId 를 모르면 붙이지 않는다. */
export const isCommunityPostWriter = (
  commentMemberId: string,
  postWriterId: string | null | undefined,
) => Boolean(postWriterId) && commentMemberId === postWriterId

export type CommunityBottomBarVisibility = {
  /** `<480` 인가. null 은 아직 측정 전(SSR·hydration 전)이다. */
  narrow: boolean | null
  /** 본문 끝 반응 바가 화면 안인가. null 은 관찰 결과가 아직 없다(IO 미지원 포함). */
  reactionVisible: boolean | null
  /** 댓글 입력칸이 화면 안인가. 입력칸이 아예 없으면(댓글 로딩·오류) 호출부가 false 를 넘긴다. */
  composerVisible: boolean | null
}

/**
 * 모바일 하단 고정 바(CM-027). 반응 바와 입력칸이 **둘 다 확실히** 화면 밖일 때만 보인다 —
 * 모르는 값은 숨김 쪽으로 판정한다(뜨다 사라지는 깜박임보다 안 뜨는 편이 낫다).
 */
export const shouldShowCommunityBottomBar = ({
  narrow,
  reactionVisible,
  composerVisible,
}: CommunityBottomBarVisibility) =>
  narrow === true && reactionVisible === false && composerVisible === false

/**
 * 댓글 입력 자리. 로그인한 사람은 입력칸, 비로그인은 그 자리의 「로그인하고 댓글 남기기」다.
 * 문구(aria-label)에 묶으면 문구를 다듬는 순간 진입 버튼이 조용히 아무것도 안 한다.
 */
export const COMMUNITY_COMMENT_ENTRY_SELECTOR = '[data-community-comment-entry]'

/**
 * 반응 바의 「댓글」과 하단 바의 「댓글을 남겨 보세요」가 같이 쓴다. 가운데로 스크롤한 뒤
 * 스크롤 없이 포커스한다 — 포커스의 기본 스크롤은 입력칸을 화면 끝에 붙여, 하단 바나 키보드에
 * 가린다. 찾았으면 true.
 */
export const focusCommunityCommentEntry = (root: ParentNode) => {
  const entry = root.querySelector<HTMLElement>(
    COMMUNITY_COMMENT_ENTRY_SELECTOR,
  )

  if (!entry) {
    return false
  }

  entry.scrollIntoView({ block: 'center' })
  entry.focus({ preventScroll: true })
  return true
}
