// @vitest-environment jsdom
import { createElement, useState, type ComponentProps } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CommunityDetailView from '@/components/community/community-detail-view'
import CommunityImageLightbox from '@/components/community/community-image-lightbox'
import { communityMockFixtures } from '@/lib/community/community-mock'
import { PHOTO_STRIP_GAP } from '@/lib/community/photo-viewer'
import type { CommunityComment, CommunityPostDetail } from '@/types/community'

/*
  사진 보기(community.md §S4 4단계 「사진 보기」, CM-041·042)를 실제 DOM 에서 잠근다.
  renderToStaticMarkup 은 이펙트·포털·이벤트를 돌리지 않아 포커스 이동·키보드·스와이프·스크롤 잠금
  복원·사진 줄의 지금 장 갱신을 볼 수 없다(마크업·CSS 계약은 community-detail-view.test.ts,
  판정 순수 함수는 lib/community/photo-viewer.test.ts).

  jsdom 에는 PointerEvent 가 없다 — fireEvent.pointerDown 이 좌표 없는 Event 를 만든다. MouseEvent 를
  물려받은 스텁을 걸어 clientX/Y 가 실리게 한다. matchMedia·IntersectionObserver 는 하단 바가 쓴다.
*/

class StubPointerEvent extends MouseEvent {
  readonly pointerId: number
  readonly pointerType: string
  readonly isPrimary: boolean

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 1
    this.pointerType = init.pointerType ?? 'touch'
    this.isPrimary = init.isPrimary ?? true
  }
}

class StubIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  window.IntersectionObserver =
    StubIntersectionObserver as unknown as typeof IntersectionObserver
  window.PointerEvent = StubPointerEvent as unknown as typeof PointerEvent
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, 'IntersectionObserver')
  Reflect.deleteProperty(window, 'PointerEvent')
})

const flushFrames = async (count = 2) => {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    })
  }
}

const baseDetail = structuredClone(
  communityMockFixtures.details[0],
) as CommunityPostDetail
const comments = structuredClone(
  communityMockFixtures.comments.filter(
    comment => comment.postId === baseDetail.postId,
  ),
) as CommunityComment[]

const withImages = (count: number): CommunityPostDetail => ({
  ...baseDetail,
  images: Array.from({ length: count }, (_, index) => ({
    imageKey: `photo-${index}.png`,
    imageUrl: `https://minio.test/photo-${index}.png`,
    sortOrder: index,
  })),
})

type ViewProps = ComponentProps<typeof CommunityDetailView>

const renderView = (detail: CommunityPostDetail) => {
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
    reportErrorField: null,
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
  }

  return render(createElement(CommunityDetailView, props))
}

const getPhotoButton = (position: number) => {
  const button = document.body.querySelector<HTMLButtonElement>(
    `button[aria-label="첨부 이미지 ${position} 크게 보기"]`,
  )
  if (!button) {
    throw new Error(`사진 버튼이 없다: ${position}`)
  }
  return button
}

const queryDialog = () =>
  document.body.querySelector<HTMLElement>(
    '[role="dialog"][aria-label="사진 크게 보기"]',
  )

const getDialog = () => {
  const dialog = queryDialog()
  if (!dialog) {
    throw new Error('라이트박스가 열려 있지 않다')
  }
  return dialog
}

const getCounter = () =>
  getDialog().querySelector<HTMLElement>('[aria-live="polite"]')

const getShownImage = () => getDialog().querySelector<HTMLImageElement>('img')

const queryNav = (label: '이전 사진' | '다음 사진') =>
  getDialog().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)

const getNav = (label: '이전 사진' | '다음 사진') => {
  const button = queryNav(label)
  if (!button) {
    throw new Error(`${label} 버튼이 없다`)
  }
  return button
}

const getClose = () => {
  const button = getDialog().querySelector<HTMLButtonElement>(
    'button[aria-label="닫기"]',
  )
  if (!button) {
    throw new Error('닫기 버튼이 없다')
  }
  return button
}

const press = (key: string, init: KeyboardEventInit = {}) => {
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init })
}

describe('라이트박스 — 상세 본문 사진에서 (CM-041)', () => {
  it('둘째 사진을 누르면 2 / 3 으로 열고 →·← 로 옮기며 끝에서 멈추고, Esc 로 닫으면 누른 사진으로 포커스를 돌려준다', async () => {
    renderView(withImages(3))

    expect(queryDialog()).toBeNull()

    const second = getPhotoButton(2)
    second.focus()
    fireEvent.click(second)
    await flushFrames()

    const dialog = getDialog()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(getCounter()?.textContent).toBe('2 / 3')
    expect(getShownImage()?.getAttribute('src')).toBe(
      'https://minio.test/photo-1.png',
    )
    expect(getShownImage()?.getAttribute('alt')).toBe('첨부 이미지 2')
    // 열면 닫기 버튼에 포커스가 간다.
    expect(document.activeElement).toBe(getClose())

    press('ArrowRight')
    expect(getCounter()?.textContent).toBe('3 / 3')
    expect(getNav('다음 사진').getAttribute('aria-disabled')).toBe('true')
    expect(getNav('이전 사진').getAttribute('aria-disabled')).toBe('false')

    // 끝에서 순환하지 않는다.
    press('ArrowRight')
    expect(getCounter()?.textContent).toBe('3 / 3')
    fireEvent.click(getNav('다음 사진'))
    expect(getCounter()?.textContent).toBe('3 / 3')

    press('ArrowLeft')
    expect(getCounter()?.textContent).toBe('2 / 3')

    press('Escape')
    expect(queryDialog()).toBeNull()
    expect(document.activeElement).toBe(second)
  })

  it('포커스가 다이얼로그 밖(body)으로 떨어져도 키보드가 동작한다', async () => {
    renderView(withImages(3))
    fireEvent.click(getPhotoButton(1))
    await flushFrames()

    act(() => {
      ;(document.activeElement as HTMLElement | null)?.blur()
    })
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(getCounter()?.textContent).toBe('2 / 3')
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(queryDialog()).toBeNull()
  })

  it('이전/다음 버튼으로 옮기고 처음에서는 이전이 비활성이다', async () => {
    renderView(withImages(3))
    fireEvent.click(getPhotoButton(1))
    await flushFrames()

    expect(getCounter()?.textContent).toBe('1 / 3')
    expect(getNav('이전 사진').getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(getNav('이전 사진'))
    expect(getCounter()?.textContent).toBe('1 / 3')

    fireEvent.click(getNav('다음 사진'))
    expect(getCounter()?.textContent).toBe('2 / 3')
  })

  it('왼쪽으로 40px 이상 밀면 다음, 오른쪽이면 이전, 짧거나 세로가 크면 그대로다', async () => {
    renderView(withImages(3))
    fireEvent.click(getPhotoButton(1))
    await flushFrames()

    const stage = getShownImage()!.parentElement!
    const swipe = (dx: number, dy: number) => {
      fireEvent.pointerDown(stage, { clientX: 200, clientY: 300 })
      fireEvent.pointerUp(stage, { clientX: 200 + dx, clientY: 300 + dy })
    }

    swipe(-80, 10)
    expect(getCounter()?.textContent).toBe('2 / 3')
    swipe(-30, 0)
    expect(getCounter()?.textContent).toBe('2 / 3')
    swipe(-80, 120)
    expect(getCounter()?.textContent).toBe('2 / 3')
    swipe(60, -5)
    expect(getCounter()?.textContent).toBe('1 / 3')

    // 취소된 포인터는 스와이프로 세지 않는다.
    fireEvent.pointerDown(stage, { clientX: 200, clientY: 300 })
    fireEvent.pointerCancel(stage, { clientX: 100, clientY: 300 })
    fireEvent.pointerUp(stage, { clientX: 100, clientY: 300 })
    expect(getCounter()?.textContent).toBe('1 / 3')
  })

  it('닫기 버튼으로도 닫고 누른 사진으로 돌아간다', async () => {
    renderView(withImages(2))
    const first = getPhotoButton(1)
    first.focus()
    fireEvent.click(first)
    await flushFrames()

    fireEvent.click(getClose())
    expect(queryDialog()).toBeNull()
    expect(document.activeElement).toBe(first)
  })

  /* macOS Safari 는 버튼을 눌러도 포커스를 주지 않는다 — activeElement 가 아니라 누른 버튼을 기억한다. */
  it('누를 때 포커스가 없던 사진(Safari)이어도 닫으면 그 사진으로 돌아간다', async () => {
    renderView(withImages(3))
    const third = getPhotoButton(3)
    expect(document.activeElement).toBe(document.body)

    fireEvent.click(third)
    await flushFrames()
    expect(getCounter()?.textContent).toBe('3 / 3')

    press('Escape')
    expect(document.activeElement).toBe(third)
  })
})

/*
  라이트박스 단독 — 상세 뷰 없이 껍데기 계약만. returnFocusRef 를 넘기지 않아 「열기 직전 포커스」로
  돌아가는 기본 경로를 본다(누른 사진을 기억하는 경로는 위 상세 뷰 묶음의 Safari 케이스).
*/
const LightboxHarness = ({
  images,
  initialIndex = 0,
}: {
  images: string[]
  initialIndex?: number
}) => {
  const [index, setIndex] = useState<number | null>(null)

  return createElement(
    'div',
    null,
    createElement(
      'button',
      {
        type: 'button',
        onClick: () => setIndex(initialIndex),
      },
      '열기',
    ),
    createElement(CommunityImageLightbox, {
      open: index !== null,
      images,
      index: index ?? 0,
      onIndexChange: setIndex,
      onClose: () => setIndex(null),
    }),
  )
}

const openHarness = async (images: string[], initialIndex = 0) => {
  render(createElement(LightboxHarness, { images, initialIndex }))
  const trigger = document.body.querySelector<HTMLButtonElement>('button')!
  trigger.focus()
  fireEvent.click(trigger)
  await flushFrames()
  return trigger
}

describe('라이트박스 — 껍데기', () => {
  it('사진이 한 장이면 이전/다음 버튼을 그리지 않고 ←/→ 도 아무것도 하지 않는다', async () => {
    await openHarness(['https://minio.test/one.png'])

    expect(getCounter()?.textContent).toBe('1 / 1')
    expect(queryNav('이전 사진')).toBeNull()
    expect(queryNav('다음 사진')).toBeNull()
    press('ArrowRight')
    expect(getCounter()?.textContent).toBe('1 / 1')
  })

  it('Tab 은 다이얼로그 안에서 돈다(포커스 가두기)', async () => {
    await openHarness(['a.png', 'b.png', 'c.png'], 1)

    const close = getClose()
    const next = getNav('다음 사진')
    expect(document.activeElement).toBe(close)

    // 첫 요소에서 Shift+Tab → 마지막, 마지막에서 Tab → 첫 요소.
    press('Tab', { shiftKey: true })
    expect(document.activeElement).toBe(next)
    press('Tab')
    expect(document.activeElement).toBe(close)
    press('Tab')
    expect(document.activeElement).toBe(getNav('이전 사진'))

    // 밖으로 떨어진 포커스도 Tab 으로 안으로 돌아온다.
    act(() => {
      ;(document.activeElement as HTMLElement | null)?.blur()
    })
    fireEvent.keyDown(document.body, { key: 'Tab' })
    expect(getDialog().contains(document.activeElement)).toBe(true)
  })

  it('열려 있는 동안 body 스크롤을 잠그고 닫으면 원래 값으로 되돌린다', async () => {
    document.body.style.overflow = 'clip'
    const trigger = await openHarness(['a.png', 'b.png'])

    expect(document.body.style.overflow).toBe('hidden')
    press('Escape')
    expect(document.body.style.overflow).toBe('clip')
    expect(document.activeElement).toBe(trigger)
  })

  it('body 로 포털을 띄운다(sticky 쌓임 맥락에 갇히지 않게)', async () => {
    await openHarness(['a.png', 'b.png'])

    expect(getDialog().parentElement).toBe(document.body)
  })
})

/*
  핀치 확대 중(`visualViewport.scale > 1`)에는 가로로 끄는 손가락이 「확대한 사진 둘러보기」다.
  jsdom 에는 visualViewport 가 없다 — scale 을 들고 resize 를 내는 EventTarget 으로 흉내 낸다.
*/
class StubVisualViewport extends EventTarget {
  scale = 1
}

describe('라이트박스 — 핀치 확대 중', () => {
  let viewport: StubVisualViewport

  beforeEach(() => {
    viewport = new StubVisualViewport()
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: viewport,
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'visualViewport')
  })

  const zoomTo = (scale: number) => {
    act(() => {
      viewport.scale = scale
      viewport.dispatchEvent(new Event('resize'))
    })
  }

  const getStage = () => getShownImage()!.parentElement!

  /* styled-components 가 문서에 넣은 규칙에서 지금 Stage 클래스의 touch-action 을 읽는다. */
  const stageTouchAction = () => {
    const classes = [...getStage().classList]
    const rules = [...document.styleSheets].flatMap(sheet => [
      ...sheet.cssRules,
    ]) as CSSStyleRule[]
    const declarations = rules
      .filter(rule => classes.some(name => rule.selectorText === `.${name}`))
      .map(rule => rule.style.getPropertyValue('touch-action'))
      .filter(Boolean)

    return declarations.at(-1) ?? null
  }

  const swipeLeft = () => {
    fireEvent.pointerDown(getStage(), { clientX: 200, clientY: 300 })
    fireEvent.pointerUp(getStage(), { clientX: 120, clientY: 300 })
  }

  it('확대한 동안에는 스와이프로 넘기지 않고 가로 이동을 브라우저에 넘긴다', async () => {
    await openHarness(['a.png', 'b.png', 'c.png'])

    expect(getStage().getAttribute('data-zoomed')).toBe('false')
    expect(stageTouchAction()).toBe('pan-y pinch-zoom')
    zoomTo(2)
    expect(getStage().getAttribute('data-zoomed')).toBe('true')
    expect(stageTouchAction()).toBe('auto')
    swipeLeft()
    expect(getCounter()?.textContent).toBe('1 / 3')

    // 원래 배율로 돌아오면 다시 넘긴다.
    zoomTo(1)
    expect(getStage().getAttribute('data-zoomed')).toBe('false')
    swipeLeft()
    expect(getCounter()?.textContent).toBe('2 / 3')
  })

  it('누를 때는 1배였어도 떼는 순간 확대돼 있으면 넘기지 않는다(두 손가락 핀치)', async () => {
    await openHarness(['a.png', 'b.png', 'c.png'])

    fireEvent.pointerDown(getStage(), { clientX: 200, clientY: 300 })
    viewport.scale = 1.8
    fireEvent.pointerUp(getStage(), { clientX: 120, clientY: 300 })

    expect(getCounter()?.textContent).toBe('1 / 3')
  })

  it('이미 확대된 채 열어도 처음부터 확대 상태다', async () => {
    viewport.scale = 3
    await openHarness(['a.png', 'b.png'])

    expect(getStage().getAttribute('data-zoomed')).toBe('true')
  })

  it('닫으면 visualViewport 구독을 푼다', async () => {
    const remove = vi.spyOn(viewport, 'removeEventListener')
    await openHarness(['a.png', 'b.png'])

    press('Escape')

    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})

describe('모바일 사진 줄 — 지금 장 (CM-042)', () => {
  const getStrip = () => {
    const strip = document.body.querySelector<HTMLUListElement>(
      '[data-community-photo-strip="true"]',
    )
    if (!strip) {
      throw new Error('사진 줄이 없다')
    }
    return strip
  }

  const getDots = () =>
    Array.from(
      document.body.querySelectorAll<HTMLElement>('[data-community-photo-dot]'),
    )

  const getStatusText = () =>
    document.body.querySelector<HTMLElement>(
      '[data-community-photo-position="true"]',
    )?.textContent

  it('사진 3장이면 점 3개, 스크롤로 넘기면 지금 장 점과 n / 전체 가 바뀐다', async () => {
    renderView(withImages(3))

    const strip = getStrip()
    expect(getDots()).toHaveLength(3)
    expect(getDots().map(dot => dot.dataset.active)).toEqual([
      'true',
      'false',
      'false',
    ])
    expect(getStatusText()).toBe('1 / 3')

    Object.defineProperty(strip, 'clientWidth', {
      configurable: true,
      value: 358,
    })
    Object.defineProperty(strip, 'scrollLeft', {
      configurable: true,
      value: (358 + PHOTO_STRIP_GAP) * 2,
    })
    fireEvent.scroll(strip)
    await flushFrames()

    expect(getDots().map(dot => dot.dataset.active)).toEqual([
      'false',
      'false',
      'true',
    ])
    expect(getStatusText()).toBe('3 / 3')
  })

  it('스크롤 이벤트가 여러 번 와도 한 프레임에 한 번만 잰다(rAF 스로틀)', async () => {
    renderView(withImages(3))
    const strip = getStrip()
    const read = vi.fn(() => 358)
    Object.defineProperty(strip, 'clientWidth', {
      configurable: true,
      get: read,
    })

    fireEvent.scroll(strip)
    fireEvent.scroll(strip)
    fireEvent.scroll(strip)
    await flushFrames()

    expect(read).toHaveBeenCalledTimes(1)
  })

  it('사진이 한 장이면 줄도 점도 없다', () => {
    renderView(withImages(1))

    expect(
      document.body.querySelector('[data-community-photo-strip]'),
    ).toBeNull()
    expect(getDots()).toHaveLength(0)
  })
})
