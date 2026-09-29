'use client'

import { useEffect } from 'react'

export const SCROLLING_ATTRIBUTE = 'data-scrolling'

/** 스크롤이 이만큼 멈추면 막대를 다시 투명하게 만든다. */
export const SCROLLBAR_HIDE_DELAY_MS = 900

/**
 * 스크롤 중인 요소에 `data-scrolling` 을 붙였다가 멈추면 뗀다. 막대의 색은
 * global-styles 의 `[data-scrolling]::-webkit-scrollbar-thumb` 가 입힌다.
 *
 * - `scroll` 은 버블링되지 않는다. 영역마다 리스너를 다는 대신 document 에 **capture**
 *   로 하나만 달아 모든 영역을 받는다. 나중에 열리는 모달·시트도 자동으로 잡힌다.
 * - 페이지 전체 스크롤은 target 이 `document` 로 온다. 속성은 `documentElement` 가 아니라
 *   `body` 에 붙인다 — Chrome 에서 페이지 스크롤바 의사요소가 반응하는 쪽이 body 다.
 * - 타이머는 요소마다 따로 둔다. 하나로 두면 두 영역을 번갈아 스크롤할 때 먼저 멈춘
 *   쪽이 다른 쪽 표시까지 지운다. WeakMap 은 순회할 수 없어 cleanup 용으로 Set 을 함께 든다.
 *
 * 반환값은 리스너·타이머·속성을 모두 치우는 cleanup 이다.
 */
export const watchScrolling = (
  doc: Document,
  hideDelay: number = SCROLLBAR_HIDE_DELAY_MS,
): (() => void) => {
  const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>()
  const pending = new Set<Element>()

  const handleScroll = (event: Event) => {
    const target =
      event.target === doc
        ? doc.body
        : event.target instanceof Element
          ? event.target
          : null

    if (!target) return

    const previous = timers.get(target)
    if (previous !== undefined) clearTimeout(previous)

    target.setAttribute(SCROLLING_ATTRIBUTE, '')
    pending.add(target)

    timers.set(
      target,
      setTimeout(() => {
        target.removeAttribute(SCROLLING_ATTRIBUTE)
        timers.delete(target)
        pending.delete(target)
      }, hideDelay),
    )
  }

  doc.addEventListener('scroll', handleScroll, { capture: true, passive: true })

  return () => {
    doc.removeEventListener('scroll', handleScroll, { capture: true })

    for (const element of pending) {
      clearTimeout(timers.get(element))
      element.removeAttribute(SCROLLING_ATTRIBUTE)
    }

    pending.clear()
  }
}

/** 화면에 아무것도 그리지 않는다. 루트 레이아웃에 한 번만 마운트한다. */
export default function ScrollbarReveal() {
  useEffect(() => watchScrolling(document), [])

  return null
}
