// src/components/home/use-scroll-progress.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { viewportProgress } from '@/components/home/scroll-fill'

/**
 * 트랙 요소의 스크롤 진행도(0~1).
 *
 * ⚠️ **`useRef` 를 받지 않는다 — 콜백 ref 를 돌려준다.** 원래는 `RefObject` 를 받아
 * `useEffect(..., [ref])` 안에서 `ref.current` 를 읽었는데, **요소가 나중에 붙는 화면에서
 * 조용히 죽었다.**
 *
 * `popular-districts` 가 그 경우다. 데이터가 오기 전에는 스켈레톤을 반환하므로 트랙이
 * 아직 없고, `ref.current` 는 null 이라 effect 가 즉시 빠져나온다. 그런데 의존성은 **ref
 * 객체**뿐이고 그 객체는 절대 바뀌지 않으니, 나중에 트랙이 붙어도 **effect 가 다시 돌지
 * 않는다.** scroll 리스너가 영영 안 걸려 진행도가 0 에 멈추고, 지표가 첫 값(유동인구)에
 * 고정된 채 스크롤해도 넘어가지 않았다.
 *
 * 콜백 ref 를 state 에 담으면 요소가 붙는 순간이 렌더로 잡히고, 그 값이 의존성에 들어가
 * effect 가 그때 다시 돈다. `product-story` 처럼 트랙이 처음부터 있는 화면은 동작이
 * 그대로다.
 */
export function useScrollProgress(): {
  /** 트랙 요소에 그대로 넘긴다. */
  ref: (node: HTMLElement | null) => void
  progress: number
  /**
   * 붙어 있는 트랙 요소. 스크롤 위치를 직접 옮기는 곳(`scrollToPinnedStep`)이 쓴다 —
   * 별도 `useRef` 를 두면 그 ref 는 렌더를 다시 태우지 않아 **위 버그가 그대로 재현된다.**
   */
  element: HTMLElement | null
} {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [progress, setProgress] = useState(0)
  const frame = useRef<number | null>(null)

  const ref = useCallback((node: HTMLElement | null) => {
    setElement(node)
  }, [])

  useEffect(() => {
    if (!element) return

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
      const rect = element.getBoundingClientRect()
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
  }, [element])

  return { ref, progress, element }
}
