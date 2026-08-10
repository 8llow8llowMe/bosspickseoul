'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { TitleBarDragHandlers } from '@/components/home/hero-window'

// hero-window.tsx owns the single declaration of TitleBarDragHandlers; this
// hook only consumes/re-exports it so callers can import either from here or
// from hero-window without a duplicate type definition existing.
export type { TitleBarDragHandlers }

type Offset = { x: number; y: number }
type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

export function clampOffset(offset: Offset, bounds: Bounds): Offset {
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max)
  return {
    x: clamp(offset.x, bounds.minX, bounds.maxX),
    y: clamp(offset.y, bounds.minY, bounds.maxY),
  }
}

export function useWindowDrag(opts: {
  enabled: boolean
  containerRef: RefObject<HTMLElement | null>
  cardRef: RefObject<HTMLElement | null>
}): { offset: Offset; handlers: TitleBarDragHandlers; reset: () => void } {
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const start = useRef<{
    px: number
    py: number
    ox: number
    oy: number
  } | null>(null)

  const computeBounds = useCallback((): Bounds => {
    const container = opts.containerRef.current
    const card = opts.cardRef.current
    if (!container || !card) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    // 카드가 중앙 배치를 기준으로 이동하므로, 컨테이너와 카드 크기 차이의 절반만큼만
    // 여유(slack)를 허용해 카드가 컨테이너 밖으로 나가지 않게 한다.
    const containerRect = container.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()
    const slackX = Math.max(0, (containerRect.width - cardRect.width) / 2)
    const slackY = Math.max(0, (containerRect.height - cardRect.height) / 2)
    return { minX: -slackX, maxX: slackX, minY: -slackY, maxY: slackY }
  }, [opts.containerRef, opts.cardRef])

  // pointerdown 시점에 추가한 리스너를 정확히 같은 함수 참조로 제거하기 위해,
  // 해제 로직을 ref에 담아 pointerup 핸들러가 "자기 자신"을 이름으로 참조하지
  // 않도록 한다(자기 참조는 TDZ 위험이 있어 lint에서 금지된다).
  const stopListening = useRef<() => void>(() => {})

  const onPointerMove = useCallback(
    (e: globalThis.PointerEvent) => {
      if (!start.current) return
      const next = {
        x: start.current.ox + (e.clientX - start.current.px),
        y: start.current.oy + (e.clientY - start.current.py),
      }
      setOffset(clampOffset(next, computeBounds()))
    },
    [computeBounds],
  )

  const onPointerUp = useCallback(() => {
    start.current = null
    stopListening.current()
  }, [])

  const onPointerDown = useCallback<TitleBarDragHandlers['onPointerDown']>(
    e => {
      if (!opts.enabled) return
      start.current = {
        px: e.clientX,
        py: e.clientY,
        ox: offset.x,
        oy: offset.y,
      }
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      stopListening.current = () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }
    },
    [opts.enabled, offset.x, offset.y, onPointerMove, onPointerUp],
  )

  // 컴포넌트가 드래그 도중 unmount되는 경우를 대비해 window 리스너를 정리한다.
  useEffect(() => {
    return () => stopListening.current()
  }, [])

  const reset = useCallback(() => {
    start.current = null
    stopListening.current()
    setOffset({ x: 0, y: 0 })
  }, [])

  return { offset, handlers: { onPointerDown }, reset }
}
