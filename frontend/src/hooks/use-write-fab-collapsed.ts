'use client'

import { useEffect, useState } from 'react'

import {
  createWriteFabScrollState,
  getNextWriteFabScrollState,
} from '@/lib/community/write-fab'

/**
 * 모바일 글쓰기 FAB 를 접을지(community.md §S4 「목록 — 끊기지 않는 피드」 FAB).
 *
 * `enabled` 가 아니면(`≥480` 이거나 폭을 아직 모르면) 구독하지 않고 늘 펼친다.
 * 스크롤은 passive 로 듣고 한 프레임에 한 번만 계산한다 — 스크롤 이벤트는 프레임보다 자주 온다.
 */
export const useWriteFabCollapsed = (enabled: boolean) => {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    let state = createWriteFabScrollState(window.scrollY)
    let frame: number | null = null

    const update = () => {
      frame = null
      state = getNextWriteFabScrollState(state, window.scrollY)
      setCollapsed(state.collapsed)
    }

    const handleScroll = () => {
      if (frame !== null) {
        return
      }

      frame = window.requestAnimationFrame(update)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)

      if (frame !== null) {
        window.cancelAnimationFrame(frame)
      }

      // 다시 켜질 때 옛 접힘이 남지 않게 편 상태로 돌린다.
      setCollapsed(false)
    }
  }, [enabled])

  return enabled && collapsed
}

export default useWriteFabCollapsed
