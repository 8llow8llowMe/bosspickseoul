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
        rootMargin: `-${HEADER_OFFSET_PX}px 0px -60% 0px`,
        threshold: [0, 1],
      },
    )

    elements.forEach(({ el }) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids])

  return activeId
}
