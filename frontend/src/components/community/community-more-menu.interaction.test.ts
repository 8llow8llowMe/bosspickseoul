// @vitest-environment jsdom
import { createElement, useState, type ComponentProps } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CommunityDetailView from '@/components/community/community-detail-view'
import CommunityMoreMenu from '@/components/community/community-more-menu'
import { communityMockFixtures } from '@/lib/community/community-mock'
import type {
  CommunityPostDetail,
  CommunityReportCreateRequest,
} from '@/types/community'

/*
  더보기(⋯)의 상호작용 계약(community.md §S4 「더보기」, CM-022)을 실제 DOM 에서 잠근다.
  renderToStaticMarkup 은 이펙트·포털·이벤트를 돌리지 않아 포커스 이동·Esc·바깥 누름·rAF 정리·
  스크롤 잠금 복원을 볼 수 없다(항목 마크업 계약은 community-detail-view.test.ts).

  폭 판정은 `matchMedia('(max-width: 479px)')` 다. jsdom 에는 matchMedia 가 없어 매 테스트가
  스텁을 건다 — true 면 바텀시트(<480), false 면 팝오버(≥480).
*/

const stubMatchMedia = (matches: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

/* 팝오버 첫 포커스·삭제 확인은 requestAnimationFrame 뒤에 간다. 두 프레임을 넉넉히 흘린다. */
const flushFrames = async (count = 2) => {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    })
  }
}

type MenuProps = ComponentProps<typeof CommunityMoreMenu>

const renderMenu = (overrides: Partial<MenuProps> = {}) => {
  const props: MenuProps = {
    editHref: null,
    authReady: true,
    deletePending: false,
    onDelete: vi.fn(),
    onReport: vi.fn(),
    ...overrides,
  }
  // 바깥 누름 대상으로 쓸, 포커스를 받을 수 없는 문단을 같이 그린다.
  const result = render(
    createElement(
      'div',
      null,
      createElement('p', { 'data-testid': 'outside' }, '본문'),
      createElement(CommunityMoreMenu, props),
    ),
  )

  return { ...result, props }
}

const getTrigger = () => {
  const trigger = document.body.querySelector<HTMLButtonElement>(
    'button[aria-label="게시글 더보기"]',
  )
  if (!trigger) {
    throw new Error('더보기 트리거가 없다')
  }
  return trigger
}

const getMenu = () => document.body.querySelector<HTMLElement>('[role="menu"]')

const getMenuItems = () =>
  Array.from(
    getMenu()?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
  )

const openPopover = async () => {
  const trigger = getTrigger()
  trigger.focus()
  fireEvent.click(trigger)
  await flushFrames()
  return trigger
}

describe('CommunityMoreMenu — 팝오버(≥480)', () => {
  it('열면 첫 항목으로 포커스가 가고 ↑↓ 는 끝에서 반대쪽으로 돈다', async () => {
    stubMatchMedia(false)
    renderMenu({ editHref: '/community/register?postId=7' })

    const trigger = await openPopover()
    const items = getMenuItems()

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(items.map(item => item.textContent)).toEqual(['수정', '삭제'])
    expect(document.activeElement).toBe(items[0])

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[0])
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[1])
  })

  it('Esc 로 닫으면 트리거로 포커스를 돌려준다', async () => {
    stubMatchMedia(false)
    renderMenu()

    const trigger = await openPopover()
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      '게시글 신고',
    )

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

    expect(getMenu()).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })

  it('바깥을 누르면 닫고, 누른 곳이 포커스를 못 받는 자리면 트리거로 돌려준다', async () => {
    stubMatchMedia(false)
    const { getByTestId } = renderMenu()

    const trigger = await openPopover()
    fireEvent.pointerDown(getByTestId('outside'))

    expect(getMenu()).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('항목이 전부 비활성이라 포커스가 트리거에 남아도 Esc 로 닫힌다', async () => {
    stubMatchMedia(false)
    // 인증 준비 전 + 남의 글 → 유일한 항목 「신고」가 disabled.
    renderMenu({ authReady: false })

    const trigger = await openPopover()
    expect(getMenu()).not.toBeNull()
    expect(document.activeElement).toBe(trigger)

    fireEvent.keyDown(trigger, { key: 'Escape' })

    expect(getMenu()).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('삭제를 누른 뒤 확인 창이 뜨기 전에 언마운트되면 onDelete 를 부르지 않는다', async () => {
    stubMatchMedia(false)
    const onDelete = vi.fn()
    const { unmount } = renderMenu({
      editHref: '/community/register?postId=7',
      onDelete,
    })

    await openPopover()
    fireEvent.click(
      document.body.querySelector<HTMLButtonElement>(
        'button[aria-label="게시글 삭제"]',
      )!,
    )
    unmount()
    await flushFrames(3)

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('언마운트되지 않으면 닫힌 화면이 그려진 뒤 onDelete 를 한 번 부른다', async () => {
    stubMatchMedia(false)
    const onDelete = vi.fn()
    renderMenu({ editHref: '/community/register?postId=7', onDelete })

    await openPopover()
    fireEvent.click(
      document.body.querySelector<HTMLButtonElement>(
        'button[aria-label="게시글 삭제"]',
      )!,
    )

    expect(getMenu()).toBeNull()
    expect(onDelete).not.toHaveBeenCalled()
    await flushFrames(3)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})

/* 상세 뷰 전체를 그린다 — 시트(메뉴 안 포털)와 신고 다이얼로그(뷰 끝)의 실제 배치 그대로다. */
const detail = structuredClone(
  communityMockFixtures.details[0],
) as CommunityPostDetail

type ReportTarget = Pick<
  CommunityReportCreateRequest,
  'targetKind' | 'targetId'
> | null

function DetailHarness() {
  const [reportTarget, setReportTarget] = useState<ReportTarget>(null)

  return createElement(CommunityDetailView, {
    status: 'ready',
    detail,
    errorMessage: null,
    commentsStatus: 'ready',
    comments: [],
    commentsErrorMessage: null,
    relatedStatus: 'empty',
    relatedPosts: [],
    relatedErrorMessage: null,
    viewer: { authenticated: true, memberId: '9999' },
    authReady: true,
    listHref: '/community/list?mock=1',
    editHref: null,
    postLiked: null,
    postLikePending: false,
    postMutationError: null,
    commentMutationError: null,
    reportTarget,
    reportPending: false,
    reportErrorMessage: null,
    reportStatusMessage: null,
    adjacent: null,
    mockEnabled: true,
    onRetryDetail: vi.fn(),
    onRetryComments: vi.fn(),
    onRetryRelated: vi.fn(),
    onRequireLogin: vi.fn(),
    onTogglePostLike: vi.fn(async () => null),
    onDeletePost: vi.fn(),
    onCreateComment: vi.fn(async () => true),
    onDeleteComment: vi.fn(async () => true),
    onToggleCommentLike: vi.fn(async () => null),
    onOpenReport: setReportTarget,
    onCloseReport: () => setReportTarget(null),
    onSubmitReport: vi.fn(),
  })
}

const getDialogs = () =>
  Array.from(document.body.querySelectorAll<HTMLElement>('[role="dialog"]'))

describe('CommunityMoreMenu — 바텀시트(<480) → 신고', () => {
  it('시트에서 신고를 고르면 시트가 닫히고 신고 다이얼로그가 열리며, 닫으면 스크롤 잠금이 풀린다', async () => {
    stubMatchMedia(true)
    render(createElement(DetailHarness))

    const trigger = getTrigger()
    trigger.focus()
    fireEvent.click(trigger)
    await flushFrames()

    expect(getMenu()).toBeNull()
    expect(getDialogs()).toHaveLength(1)
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(
      document.body.querySelector<HTMLButtonElement>(
        'button[aria-label="게시글 신고"]',
      )!,
    )
    await flushFrames()

    const dialogs = getDialogs()
    expect(dialogs).toHaveLength(1)
    expect(dialogs[0]!.textContent).not.toContain('게시글 더보기')
    expect(dialogs[0]!.querySelector('textarea')).not.toBeNull()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document.activeElement ?? dialogs[0]!, {
      key: 'Escape',
    })
    await flushFrames()

    expect(getDialogs()).toHaveLength(0)
    expect(document.body.style.overflow).toBe('')
  })
})
