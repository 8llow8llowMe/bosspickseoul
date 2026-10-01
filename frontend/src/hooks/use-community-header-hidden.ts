'use client'

import { useEffect } from 'react'

import { COMMUNITY_HEADER_HIDDEN_ATTRIBUTE } from '@/lib/community/hidden-header'

/**
 * 목록 숨는 헤더(community.md §S4 「숨는 헤더」). `hidden` 인 동안 `<html>` 에 속성을 켠다.
 *
 * 스크롤을 따로 듣지 않는다 — 호출부가 FAB 접힘(`useWriteFabCollapsed`) 값을 그대로 넘긴다.
 * 같은 스크롤 신호를 두 번 구독하면 두 판정이 한 프레임 어긋날 수 있다.
 * 꺼질 때와 목록이 사라질 때(정리 함수) 반드시 속성을 지워 다른 화면 헤더에 남지 않게 한다.
 */
export const useCommunityHeaderHidden = (hidden: boolean) => {
  useEffect(() => {
    if (!hidden || typeof document === 'undefined') {
      return
    }

    const root = document.documentElement
    root.setAttribute(COMMUNITY_HEADER_HIDDEN_ATTRIBUTE, 'true')

    return () => {
      root.removeAttribute(COMMUNITY_HEADER_HIDDEN_ATTRIBUTE)
    }
  }, [hidden])
}

export default useCommunityHeaderHidden
