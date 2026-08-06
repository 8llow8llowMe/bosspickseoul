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
 * IntersectionObserver-backed scroll-spy: returns the id of the section
 * currently sitting at the top of the viewport, out of `ids`. SSR-safe —
 * all DOM/observer access happens inside an effect.
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

    const observer = new IntersectionObserver(
      observedEntries => {
        observedEntries.forEach(entry => {
          const matched = elements.find(item => item.el === entry.target)
          if (!matched) return
          state.set(matched.id, {
            id: matched.id,
            isIntersecting: entry.isIntersecting,
            top: entry.boundingClientRect.top,
          })
        })
        const known = ids
          .map(id => state.get(id))
          .filter((entry): entry is ScrollSpyEntry => entry !== undefined)
        setActiveId(current => resolveActiveSpyId(known, ids, current))
      },
      { rootMargin: '0px 0px -70% 0px', threshold: [0, 1] },
    )

    elements.forEach(({ el }) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids])

  return activeId
}
