// src/components/home/use-scroll-progress.ts
'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { viewportProgress } from '@/components/home/scroll-fill'

export function useScrollProgress(ref: RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(1)
      return
    }

    const measure = () => {
      frame.current = null
      const rect = el.getBoundingClientRect()
      setProgress(viewportProgress(rect.top, rect.height, window.innerHeight))
    }

    const onScroll = () => {
      if (frame.current !== null) return
      frame.current = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame.current !== null) window.cancelAnimationFrame(frame.current)
    }
  }, [ref])

  return progress
}
