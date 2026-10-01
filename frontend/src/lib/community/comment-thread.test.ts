import { describe, expect, it, vi } from 'vitest'

import {
  COMMUNITY_COMMENT_ENTRY_SELECTOR,
  focusCommunityCommentEntry,
  getCommunityCommentMenuActions,
  getCommunityReplyPreview,
  isCommunityPostWriter,
  shouldShowCommunityBottomBar,
} from './comment-thread'

const replies = (count: number) =>
  Array.from({ length: count }, (_, index) => `답글 ${index + 1}`)

describe('getCommunityReplyPreview — 답글 접기(CM-026)', () => {
  it('답글이 3개 이하면 전부 보이고 더 보기가 없다', () => {
    expect(getCommunityReplyPreview(replies(3), false)).toEqual({
      visible: replies(3),
      hiddenCount: 0,
    })
    expect(getCommunityReplyPreview([], false)).toEqual({
      visible: [],
      hiddenCount: 0,
    })
  })

  it('4개부터는 앞 3개만 보이고 나머지 수를 센다', () => {
    expect(getCommunityReplyPreview(replies(4), false)).toEqual({
      visible: replies(3),
      hiddenCount: 1,
    })
    expect(getCommunityReplyPreview(replies(5), false)).toEqual({
      visible: replies(3),
      hiddenCount: 2,
    })
  })

  it('펼치면 전부 보인다', () => {
    expect(getCommunityReplyPreview(replies(5), true)).toEqual({
      visible: replies(5),
      hiddenCount: 0,
    })
  })
})

describe('getCommunityCommentMenuActions', () => {
  it('내 댓글은 삭제만, 남의 댓글은 신고만 — 댓글은 수정하지 않는다', () => {
    expect(getCommunityCommentMenuActions(true)).toEqual(['delete'])
    expect(getCommunityCommentMenuActions(false)).toEqual(['report'])
  })
})

describe('isCommunityPostWriter — 글쓴이 배지(CM-025)', () => {
  it('댓글 작성자 memberId 가 글 작성자와 같을 때만 true', () => {
    expect(isCommunityPostWriter('42', '42')).toBe(true)
    expect(isCommunityPostWriter('42', '43')).toBe(false)
    expect(isCommunityPostWriter('42', null)).toBe(false)
    expect(isCommunityPostWriter('', '')).toBe(false)
  })
})

describe('shouldShowCommunityBottomBar — 모바일 하단 고정 바(CM-027)', () => {
  it('<480 에서 반응 바와 입력칸이 둘 다 화면 밖일 때만 보인다', () => {
    expect(
      shouldShowCommunityBottomBar({
        narrow: true,
        reactionVisible: false,
        composerVisible: false,
      }),
    ).toBe(true)
  })

  it('입력칸이 보이면 숨는다', () => {
    expect(
      shouldShowCommunityBottomBar({
        narrow: true,
        reactionVisible: false,
        composerVisible: true,
      }),
    ).toBe(false)
  })

  it('반응 바가 보이면 숨는다', () => {
    expect(
      shouldShowCommunityBottomBar({
        narrow: true,
        reactionVisible: true,
        composerVisible: false,
      }),
    ).toBe(false)
  })

  it('≥480 이거나 폭을 아직 모르면(SSR) 숨는다', () => {
    for (const narrow of [false, null]) {
      expect(
        shouldShowCommunityBottomBar({
          narrow,
          reactionVisible: false,
          composerVisible: false,
        }),
      ).toBe(false)
    }
  })

  it('관찰 결과가 아직 없으면(IO 미지원·첫 보고 전) 숨는다', () => {
    expect(
      shouldShowCommunityBottomBar({
        narrow: true,
        reactionVisible: null,
        composerVisible: false,
      }),
    ).toBe(false)
    expect(
      shouldShowCommunityBottomBar({
        narrow: true,
        reactionVisible: false,
        composerVisible: null,
      }),
    ).toBe(false)
  })
})

describe('focusCommunityCommentEntry', () => {
  it('입력 자리를 data 속성으로 찾아 가운데로 스크롤한 뒤 스크롤 없이 포커스한다', () => {
    const calls: string[] = []
    const entry = {
      scrollIntoView: vi.fn(() => calls.push('scroll')),
      focus: vi.fn(() => calls.push('focus')),
    }
    const querySelector = vi.fn(() => entry)

    expect(
      focusCommunityCommentEntry({
        querySelector,
      } as unknown as ParentNode),
    ).toBe(true)
    expect(querySelector).toHaveBeenCalledWith(COMMUNITY_COMMENT_ENTRY_SELECTOR)
    expect(COMMUNITY_COMMENT_ENTRY_SELECTOR).toBe(
      '[data-community-comment-entry]',
    )
    expect(entry.scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
    expect(entry.focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(calls).toEqual(['scroll', 'focus'])
  })

  it('입력 자리가 없으면(댓글 로딩·오류) 아무것도 하지 않는다', () => {
    expect(
      focusCommunityCommentEntry({
        querySelector: () => null,
      } as unknown as ParentNode),
    ).toBe(false)
  })
})
