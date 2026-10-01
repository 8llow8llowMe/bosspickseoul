'use client'

import { useEffect, useState } from 'react'

export type ScrollSpyEntry = {
  id: string
  isIntersecting: boolean
  /** Distance in px from the viewport top to the section's top edge. */
  top: number
}

/**
 * Pure decision function extracted from the IntersectionObserver callback so
 * it can be unit tested without a real DOM/observer.
 *
 * Picks the section that is currently intersecting a thin band near the top
 * of the viewport. When multiple sections intersect at once (a brief overlap
 * while scrolling fast), the one whose top edge sits closest to the viewport
 * top wins. When nothing intersects, the previous id is kept so the
 * highlight doesn't flicker back to the first tab while scrolling between
 * two distant sections.
 */
export const resolveActiveSpyId = (
  entries: readonly ScrollSpyEntry[],
  ids: readonly string[],
  previousId: string,
): string => {
  const intersecting = entries.filter(entry => entry.isIntersecting)
  if (intersecting.length === 0) {
    return previousId
  }
  const closestToTop = [...intersecting].sort(
    (a, b) => Math.abs(a.top) - Math.abs(b.top),
  )[0]
  return closestToTop && ids.includes(closestToTop.id)
    ? closestToTop.id
    : previousId
}

/**
 * Sticky header height (matches `ReportSection`'s `scroll-margin-top` in
 * `analysis-result-view.tsx`, desktop value). Used as the top inset of the
 * observer's `rootMargin` so a section only counts as "current" once it has
 * scrolled clear of the header — without this, a section registers as
 * intersecting while it's still hidden underneath the sticky header, which
 * shows the *previous* tab's neighbor as active.
 */
const HEADER_OFFSET_PX = 112

/**
 * 실제로 쓸 상단 inset. 섹션의 `scroll-margin-top` 이 더 크면 그 값을 쓴다 — ≤640px 은 헤더가
 * 두 줄(상권명 / 메타·기간 선택) + 탭 바라 약 134px 이고 `scroll-margin-top` 도 148px 인데,
 * 112 로 고정하면 섹션 머리가 아직 헤더 밑에 있을 때 탭이 먼저 넘어갔다. 두 값이 같은 출처
 * (섹션 CSS)를 보게 해 헤더가 다시 바뀌어도 어긋나지 않게 한다.
 */
const resolveHeaderOffset = (el: Element): number => {
  const margin = Number.parseFloat(window.getComputedStyle(el).scrollMarginTop)
  return Number.isFinite(margin)
    ? Math.max(HEADER_OFFSET_PX, margin)
    : HEADER_OFFSET_PX
}

/**
 * Walks up from `el` looking for the nearest ancestor that actually scrolls
 * (`overflow-y: auto|scroll`) — e.g. the analysis-result modal's inner
 * `ScrollArea` on desktop, where the page itself never scrolls but that
 * wrapper does. Stops before `<body>`/`<html>`; returns `null` when none is
 * found, which tells `IntersectionObserver` to use the default viewport
 * root (the plain, non-modal `/analysis/result` page).
 */
const findScrollContainer = (el: Element): Element | null => {
  let node = el.parentElement
  while (node && node !== document.body && node !== document.documentElement) {
    const overflowY = window.getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return node
    }
    node = node.parentElement
  }
  return null
}

/**
 * IntersectionObserver-backed scroll-spy: returns the id of the section
 * currently sitting at the top of the viewport (or the modal's scroll
 * container, whichever actually scrolls), out of `ids`. SSR-safe — all
 * DOM/observer access happens inside an effect.
 *
 * Pass a referentially stable `ids` array (e.g. a module-level constant) —
 * it drives the effect's dependency and re-subscribes the observer whenever
 * it changes.
 */
export function useScrollSpy(ids: readonly string[]): string {
  const [activeId, setActiveId] = useState<string>(ids[0] ?? '')

  useEffect(() => {
    if (typeof window === 'undefined' || ids.length === 0) return

    const elements = ids
      .map(id => ({ id, el: document.getElementById(id) }))
      .filter(
        (entry): entry is { id: string; el: HTMLElement } => entry.el !== null,
      )
    if (elements.length === 0) return

    const state = new Map<string, ScrollSpyEntry>()
    const root = findScrollContainer(elements[0].el)

    const connect = (offset: number): IntersectionObserver => {
      const observer = new IntersectionObserver(
        observedEntries => {
          observedEntries.forEach(entry => {
            const matched = elements.find(item => item.el === entry.target)
            if (!matched) return
            state.set(matched.id, {
              id: matched.id,
              isIntersecting: entry.isIntersecting,
              // Relative to the observing root's own top edge, not the
              // browser viewport — inside the modal, `root` sits offset from
              // the viewport, and boundingClientRect alone doesn't know that.
              top: entry.boundingClientRect.top - (entry.rootBounds?.top ?? 0),
            })
          })
          const known = ids
            .map(id => state.get(id))
            .filter((entry): entry is ScrollSpyEntry => entry !== undefined)
          setActiveId(current => resolveActiveSpyId(known, ids, current))
        },
        {
          root,
          rootMargin: `-${offset}px 0px -60% 0px`,
          threshold: [0, 1],
        },
      )
      elements.forEach(({ el }) => observer.observe(el))
      return observer
    }

    let offset = resolveHeaderOffset(elements[0].el)
    let observer = connect(offset)
    // 폭이 640px 를 넘나들면 헤더 높이가 바뀐다. inset 이 달라졌을 때만 다시 붙인다.
    const handleResize = () => {
      const next = resolveHeaderOffset(elements[0].el)
      if (next === offset) return
      offset = next
      observer.disconnect()
      observer = connect(offset)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    }
  }, [ids])

  return activeId
}
