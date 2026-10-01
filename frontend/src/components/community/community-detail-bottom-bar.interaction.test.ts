// @vitest-environment jsdom
import { createElement, type ComponentProps } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CommunityDetailView from '@/components/community/community-detail-view'
import { communityMockFixtures } from '@/lib/community/community-mock'
import type { CommunityComment, CommunityPostDetail } from '@/types/community'

/*
  모바일 하단 고정 바(community.md §S4 「개편 2단계 — 모바일 하단 고정 바」, CM-027·028)를
  상세 뷰 전체로 잠근다 — 바는 본문 반응 바·댓글 입력칸과 **같은 핸들러**를 써야 해서 따로 그리면
  그 계약을 볼 수 없다.

  jsdom 에는 matchMedia·IntersectionObserver·scrollIntoView 가 없다. 폭은 matchMedia 스텁(true =
  <480), 화면 안팎은 관찰 콜백을 직접 불러 흉내 낸다.
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

type Observer = {
  callback: IntersectionObserverCallback
  targets: Set<Element>
  disconnected: boolean
}

let observers: Observer[] = []

class StubIntersectionObserver {
  private readonly record: Observer

  constructor(callback: IntersectionObserverCallback) {
    this.record = { callback, targets: new Set(), disconnected: false }
    observers.push(this.record)
  }

  observe(target: Element) {
    this.record.targets.add(target)
  }

  unobserve(target: Element) {
    this.record.targets.delete(target)
  }

  disconnect() {
    this.record.disconnected = true
    this.record.targets.clear()
  }

  takeRecords() {
    return []
  }
}

/** 지금 관찰 중인 요소 중 `selector` 에 맞는 것이 화면 안/밖으로 바뀌었다고 알린다. */
const report = (selector: string, isIntersecting: boolean) => {
  const live = observers.filter(observer => !observer.disconnected)
  const target = live
    .flatMap(observer => Array.from(observer.targets))
    .find(element => element.matches(selector))

  if (!target) {
    throw new Error(`관찰 중이 아니다: ${selector}`)
  }

  act(() => {
    live
      .filter(observer => observer.targets.has(target))
      .forEach(observer => {
        observer.callback(
          [{ target, isIntersecting } as IntersectionObserverEntry],
          observer as unknown as IntersectionObserver,
        )
      })
  })
}

const REACTIONS = '[aria-label="게시글 반응"]'
const COMPOSER = '[data-community-comment-composer]'

const scrollOutOfBoth = () => {
  report(REACTIONS, false)
  report(COMPOSER, false)
}

beforeEach(() => {
  observers = []
  window.IntersectionObserver =
    StubIntersectionObserver as unknown as typeof IntersectionObserver
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, 'IntersectionObserver')
  Reflect.deleteProperty(navigator, 'share')
})

const detail = structuredClone(
  communityMockFixtures.details[0],
) as CommunityPostDetail
const comments = structuredClone(
  communityMockFixtures.comments.filter(
    comment => comment.postId === detail.postId,
  ),
) as CommunityComment[]

type ViewProps = ComponentProps<typeof CommunityDetailView>

const renderView = (overrides: Partial<ViewProps> = {}) => {
  const props: ViewProps = {
    status: 'ready',
    detail,
    errorMessage: null,
    commentsStatus: 'ready',
    comments,
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
    reportTarget: null,
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
    onOpenReport: vi.fn(),
    onCloseReport: vi.fn(),
    onSubmitReport: vi.fn(),
    ...overrides,
  }

  return { ...render(createElement(CommunityDetailView, props)), props }
}

const getBar = () =>
  document.body.querySelector<HTMLElement>('[data-community-bottom-bar]')

const getBarButton = (label: string) => {
  const button = getBar()?.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  )
  if (!button) {
    throw new Error(`하단 바 버튼이 없다: ${label}`)
  }
  return button
}

const getReactionButton = (label: string) => {
  const button = document.body
    .querySelector(REACTIONS)
    ?.querySelector<HTMLButtonElement>(`button[aria-label^="${label}"]`)
  if (!button) {
    throw new Error(`반응 바 버튼이 없다: ${label}`)
  }
  return button
}

describe('하단 고정 바 — 보이기(CM-027)', () => {
  it('관찰 결과가 오기 전에는 숨어 있다', () => {
    stubMatchMedia(true)
    renderView()

    expect(getBar()).toBeNull()
  })

  it('반응 바와 입력칸이 둘 다 화면 밖이면 뜨고, 입력칸이 보이면 숨는다', () => {
    stubMatchMedia(true)
    renderView()

    scrollOutOfBoth()
    expect(getBar()).not.toBeNull()

    report(COMPOSER, true)
    expect(getBar()).toBeNull()

    report(COMPOSER, false)
    expect(getBar()).not.toBeNull()

    report(REACTIONS, true)
    expect(getBar()).toBeNull()
  })

  it('떠 있는 동안 문서 끝에 바 높이만큼 여백을 둔다(푸터까지 가리지 않게)', () => {
    stubMatchMedia(true)
    renderView()

    expect(
      document.body.querySelector('[data-community-bottom-bar-spacer]'),
    ).toBeNull()

    scrollOutOfBoth()
    const spacer = document.body.querySelector(
      '[data-community-bottom-bar-spacer]',
    )
    expect(spacer).not.toBeNull()
    expect(spacer?.parentElement).toBe(document.body)
    expect(document.body.lastElementChild).toBe(spacer)
  })

  it('≥480 에서는 화면 밖이어도 뜨지 않는다', () => {
    stubMatchMedia(false)
    renderView()

    expect(observers.filter(observer => !observer.disconnected)).toHaveLength(0)
    expect(getBar()).toBeNull()
  })

  it('IntersectionObserver 가 없으면 뜨지 않는다', () => {
    stubMatchMedia(true)
    Reflect.deleteProperty(window, 'IntersectionObserver')
    renderView()

    expect(getBar()).toBeNull()
  })

  it('댓글을 못 불러와 입력칸이 없으면 반응 바만으로 판정한다', () => {
    stubMatchMedia(true)
    renderView({ commentsStatus: 'error', comments: [] })

    report(REACTIONS, false)
    expect(getBar()).not.toBeNull()
  })

  it('댓글이 도착해 입력칸이 새로 생겨도 첫 관찰 결과 전까지 떠 있던 바를 그대로 둔다(깜빡임·slide-up 반복 없음)', () => {
    stubMatchMedia(true)
    const { props, rerender } = renderView({
      commentsStatus: 'loading',
      comments: [],
    })

    report(REACTIONS, false)
    const bar = getBar()
    const spacer = document.body.querySelector(
      '[data-community-bottom-bar-spacer]',
    )
    expect(bar).not.toBeNull()
    expect(spacer).not.toBeNull()

    rerender(
      createElement(CommunityDetailView, {
        ...props,
        commentsStatus: 'ready',
        comments,
      }),
    )

    // 입력칸은 관찰을 시작했지만 아직 결과가 없다 — 같은 노드가 남아 있어야 다시 미끄러져 올라오지 않는다.
    expect(getBar()).toBe(bar)
    expect(
      document.body.querySelector('[data-community-bottom-bar-spacer]'),
    ).toBe(spacer)

    report(COMPOSER, false)
    expect(getBar()).toBe(bar)

    report(COMPOSER, true)
    expect(getBar()).toBeNull()
  })

  it('떠나면 관찰을 끊는다', () => {
    stubMatchMedia(true)
    const { unmount } = renderView()

    expect(observers.some(observer => !observer.disconnected)).toBe(true)
    unmount()
    expect(observers.every(observer => observer.disconnected)).toBe(true)
  })
})

describe('하단 고정 바 — 댓글 진입(CM-028)', () => {
  it('「댓글을 남겨 보세요」는 입력칸으로 가운데 스크롤한 뒤 포커스한다', () => {
    stubMatchMedia(true)
    renderView()
    scrollOutOfBoth()

    const entry = document.body.querySelector<HTMLTextAreaElement>(
      'textarea[data-community-comment-entry]',
    )!
    fireEvent.click(getBarButton('댓글을 남겨 보세요'))

    expect(entry.scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
    expect(document.activeElement).toBe(entry)
  })

  it('비로그인이면 로그인 CTA 로 간다', () => {
    stubMatchMedia(true)
    renderView({
      mockEnabled: false,
      viewer: { authenticated: false, memberId: null },
    })
    scrollOutOfBoth()

    fireEvent.click(getBarButton('댓글을 남겨 보세요'))

    expect(document.activeElement?.textContent).toBe('로그인하고 댓글 남기기')
    expect(
      (document.activeElement as HTMLElement).dataset.communityCommentEntry,
    ).toBe('true')
  })
})

describe('하단 고정 바 — 본문 반응 바와 같은 핸들러', () => {
  it('좋아요는 반응 바와 같은 토글을 부르고 같은 상태를 보인다', () => {
    stubMatchMedia(true)
    const { props } = renderView({ postLiked: true })
    scrollOutOfBoth()

    const barLike = getBarButton(`게시글 좋아요 ${detail.likeCount}`)
    expect(barLike.getAttribute('aria-pressed')).toBe('true')
    expect(barLike.querySelector('svg')?.getAttribute('fill')).toBe(
      'currentColor',
    )

    fireEvent.click(barLike)
    fireEvent.click(getReactionButton('게시글 좋아요'))

    expect(props.onTogglePostLike).toHaveBeenCalledTimes(2)
  })

  it('비로그인 좋아요는 둘 다 로그인으로 보낸다', () => {
    stubMatchMedia(true)
    const { props } = renderView({
      mockEnabled: false,
      viewer: { authenticated: false, memberId: null },
    })
    scrollOutOfBoth()

    fireEvent.click(getBarButton(`게시글 좋아요 ${detail.likeCount}`))
    fireEvent.click(getReactionButton('게시글 좋아요'))

    expect(props.onRequireLogin).toHaveBeenCalledTimes(2)
    expect(props.onTogglePostLike).not.toHaveBeenCalled()
  })

  it('처리 중에는 바의 좋아요도 aria-busy + 비활성이다', () => {
    stubMatchMedia(true)
    renderView({ postLikePending: true })
    scrollOutOfBoth()

    const barLike = getBarButton(`게시글 좋아요 ${detail.likeCount}`)
    expect(barLike.getAttribute('aria-busy')).toBe('true')
    expect(barLike.disabled).toBe(true)
  })

  it('공유는 반응 바와 진행 중 가드를 함께 쓴다 — 시트가 떠 있는 동안 바에서 또 눌러도 한 번이다', async () => {
    stubMatchMedia(true)
    const share = vi.fn(() => new Promise<void>(() => {}))
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    })
    renderView()
    scrollOutOfBoth()

    await act(async () => {
      fireEvent.click(getReactionButton('게시글 공유'))
    })
    await act(async () => {
      fireEvent.click(getBarButton('공유'))
    })

    expect(share).toHaveBeenCalledTimes(1)
  })
})
