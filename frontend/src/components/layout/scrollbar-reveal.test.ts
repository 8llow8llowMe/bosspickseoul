// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ScrollbarReveal, {
  SCROLLBAR_HIDE_DELAY_MS,
  SCROLLING_ATTRIBUTE,
  watchScrolling,
} from '@/components/layout/scrollbar-reveal'

/** scroll 은 버블링되지 않는다 — 실제 브라우저처럼 bubbles:false 로 쏜다. */
const scroll = (target: EventTarget) =>
  target.dispatchEvent(new Event('scroll', { bubbles: false }))

const makePanel = (): HTMLElement => {
  const panel = document.createElement('div')
  document.body.appendChild(panel)
  return panel
}

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.innerHTML = ''
  document.body.removeAttribute(SCROLLING_ATTRIBUTE)
})

describe('watchScrolling', () => {
  it('페이지 스크롤은 documentElement 가 아니라 body 에 붙인다', () => {
    const stop = watchScrolling(document)

    scroll(document)

    expect(document.body.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(true)
    expect(document.documentElement.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(
      false,
    )
    stop()
  })

  it('버블링되지 않는 안쪽 영역 스크롤도 capture 로 잡는다', () => {
    const stop = watchScrolling(document)
    const panel = makePanel()

    scroll(panel)

    expect(panel.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(true)
    expect(document.body.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(false)
    stop()
  })

  it('스크롤이 멈추고 900ms 가 지나면 뗀다', () => {
    const stop = watchScrolling(document)
    const panel = makePanel()

    scroll(panel)
    vi.advanceTimersByTime(SCROLLBAR_HIDE_DELAY_MS - 1)
    expect(panel.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(true)

    vi.advanceTimersByTime(1)
    expect(panel.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(false)
    stop()
  })

  it('계속 스크롤하는 동안에는 타이머가 다시 시작된다', () => {
    const stop = watchScrolling(document)
    const panel = makePanel()

    scroll(panel)
    vi.advanceTimersByTime(600)
    scroll(panel)
    vi.advanceTimersByTime(600)

    expect(panel.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(true)

    vi.advanceTimersByTime(300)
    expect(panel.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(false)
    stop()
  })

  /*
   * 타이머를 하나만 두면 A 를 스크롤하다 B 로 옮겼을 때 A 의 타이머가 B 의 스크롤로
   * 연장되거나, 먼저 멈춘 쪽이 다른 쪽 표시까지 지운다. 요소마다 따로 돈다.
   */
  it('두 영역의 타이머는 서로 간섭하지 않는다', () => {
    const stop = watchScrolling(document)
    const first = makePanel()
    const second = makePanel()

    scroll(first)
    vi.advanceTimersByTime(500)
    scroll(second)
    vi.advanceTimersByTime(400)

    expect(first.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(false)
    expect(second.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(true)

    vi.advanceTimersByTime(500)
    expect(second.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(false)
    stop()
  })

  it('cleanup 은 리스너를 떼고, 대기 중인 속성을 지우고, 타이머를 멈춘다', () => {
    const stop = watchScrolling(document)
    const panel = makePanel()

    scroll(document)
    scroll(panel)
    stop()

    expect(document.body.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(false)
    expect(panel.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(false)
    expect(vi.getTimerCount()).toBe(0)

    scroll(panel)
    expect(panel.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(false)
  })
})

describe('ScrollbarReveal', () => {
  it('아무것도 그리지 않고, 마운트 동안만 스크롤을 감시한다', () => {
    const { container, unmount } = render(createElement(ScrollbarReveal))

    expect(container.innerHTML).toBe('')

    scroll(document)
    expect(document.body.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(true)

    unmount()
    expect(document.body.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(false)

    scroll(document)
    expect(document.body.hasAttribute(SCROLLING_ATTRIBUTE)).toBe(false)
  })
})
