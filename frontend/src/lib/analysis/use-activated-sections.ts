'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Pure decision function extracted from the IntersectionObserver callback so
 * the "sticky activation" rule can be unit tested without a real DOM/observer:
 * once an id has been activated it is never removed, only added to.
 * Returns the same `previous` instance when nothing changed, so callers can
 * skip a re-render.
 */
export const applyActivatedIds = (
  previous: ReadonlySet<string>,
  enteringIds: readonly string[],
): Set<string> => {
  const next = new Set(previous)
  let changed = false
  enteringIds.forEach(id => {
    if (!next.has(id)) {
      next.add(id)
      changed = true
    }
  })
  return changed ? next : (previous as Set<string>)
}

export type UseActivatedSectionsResult = {
  /** Returns a ref callback to attach to the section element for `id`. */
  register: (id: string) => (el: Element | null) => void
  /** Ids that have been activated (near/in viewport) since mount. Sticky. */
  activated: Set<string>
}

/**
 * Viewport-proximity activation: tracks which registered section ids have
 * come near the viewport at least once, using IntersectionObserver with a
 * generous bottom rootMargin so data starts loading slightly before the
 * section is actually visible. SSR-safe — the observer is only created
 * inside an effect.
 */
export function useActivatedSections(
  initialIds: readonly string[] = [],
): UseActivatedSectionsResult {
  const [activated, setActivated] = useState<Set<string>>(
    () => new Set(initialIds),
  )
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementsRef = useRef<Map<string, Element>>(new Map())

  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new IntersectionObserver(
      entries => {
        const enteringIds: string[] = []
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          for (const [id, el] of elementsRef.current) {
            if (el === entry.target) {
              enteringIds.push(id)
              break
            }
          }
        })
        if (enteringIds.length === 0) return
        setActivated(previous => applyActivatedIds(previous, enteringIds))
      },
      { rootMargin: '0px 0px 300px 0px' },
    )
    observerRef.current = observer
    elementsRef.current.forEach(el => observer.observe(el))

    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [])

  const register = useCallback(
    (id: string) => (el: Element | null) => {
      const observer = observerRef.current
      const previousEl = elementsRef.current.get(id)
      if (previousEl && observer) observer.unobserve(previousEl)

      if (el) {
        elementsRef.current.set(id, el)
        observer?.observe(el)
      } else {
        elementsRef.current.delete(id)
      }
    },
    [],
  )

  return { register, activated }
}
