'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { HEADER_HEIGHT } from '@/components/home/layout-constants'
import {
  STORY_PIN_QUERY,
  pinnedStepIndex,
  pinnedStepScrollTop,
} from '@/components/home/story-scroll'

const HEADER_PX = Number.parseFloat(HEADER_HEIGHT)

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(STORY_PIN_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia(STORY_PIN_QUERY).matches

/* 서버는 폭을 모른다 — 클릭 모드로 그린다. 트랙 높이는 CSS 가 이미 정하므로 높이는 튀지 않는다. */
const getServerSnapshot = () => false

/**
 * 판단 흐름 고정 모드(story-scroll-pin.md D4).
 *
 * - `pinned` — 고정 모드인가(`STORY_PIN_QUERY`). 레이아웃은 CSS 가 같은 쿼리로 정한다.
 * - `attachTrack` — 트랙 요소에 넘기는 콜백 ref 다: `useRef` + `useEffect([ref])` 는 요소가 나중에
 *   붙으면 effect 가 다시 돌지 않았다(예전 `useScrollProgress` 결함).
 * - `scrollToStep(i)` — 그 단계 몫의 가운데로 스크롤한다. 선택은 스크롤 결과로 따라온다.
 *
 * 스크롤이 단계를 바꾸면 `onStep` 을 부른다. 단계가 바뀔 때만 부른다.
 */
export function useStoryPin(count: number, onStep: (index: number) => void) {
  const pinned = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [track, setTrack] = useState<HTMLElement | null>(null)
  const attachTrack = useCallback(
    (node: HTMLElement | null) => setTrack(node),
    [],
  )

  /* 콜백이 렌더마다 바뀌어도 리스너를 다시 걸지 않는다. */
  const onStepRef = useRef(onStep)
  useEffect(() => {
    onStepRef.current = onStep
  }, [onStep])

  useEffect(() => {
    if (!pinned || !track) return

    let frame: number | null = null
    let last = -1

    const measure = () => {
      frame = null
      const sticky = track.firstElementChild as HTMLElement | null
      if (!sticky) return
      const pinSpan = track.offsetHeight - sticky.offsetHeight
      const scrolled = HEADER_PX - track.getBoundingClientRect().top
      const index = pinnedStepIndex(scrolled, pinSpan, count)
      if (index === last) return
      last = index
      onStepRef.current(index)
    }

    const schedule = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(measure)
    }

    // 마운트 직후(새로고침으로 트랙 중간에 들어온 경우 포함) 스크롤 위치로 선택을 맞춘다.
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [pinned, track, count])

  const scrollToStep = useCallback(
    (index: number) => {
      if (!track) return
      const sticky = track.firstElementChild as HTMLElement | null
      if (!sticky) return
      const pinSpan = track.offsetHeight - sticky.offsetHeight
      const trackDocTop = track.getBoundingClientRect().top + window.scrollY
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      window.scrollTo({
        top: pinnedStepScrollTop(trackDocTop, HEADER_PX, pinSpan, index, count),
        behavior: reduce ? 'auto' : 'smooth',
      })
    },
    [track, count],
  )

  return { pinned, attachTrack, scrollToStep }
}
