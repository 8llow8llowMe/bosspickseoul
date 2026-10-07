'use client'

import { useEffect, useState } from 'react'

import {
  COMMUNITY_VIEWER_WAIT_LIMIT_MS,
  isCommunityViewerReady,
} from '@/lib/community/community-state'

/**
 * 공개 목록·상세 쿼리를 시작해도 되는가(#530). 규칙은 `isCommunityViewerReady` 이고, 이 훅은 그 대기에
 * 상한(`COMMUNITY_VIEWER_WAIT_LIMIT_MS`)을 건다 — 로그인 확인이 멈추면 익명으로 보고 시작한다.
 * 목록·상세가 같은 훅을 써서 상한이 한 곳에서만 정해진다.
 *
 * 쿼리 시작에만 쓴다. 좋아요·로그인 유도처럼 「누구인지」가 맞아야 하는 동작은 여전히 확인 완료를 본다.
 */
export const useCommunityViewerReady = (
  mock: boolean,
  hasHydrated: boolean,
) => {
  const [waitExpired, setWaitExpired] = useState(false)
  const waiting = !mock && !hasHydrated

  useEffect(() => {
    if (!waiting) {
      return
    }

    const timer = window.setTimeout(() => {
      setWaitExpired(true)
    }, COMMUNITY_VIEWER_WAIT_LIMIT_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [waiting])

  return isCommunityViewerReady(mock, hasHydrated, waitExpired)
}

export default useCommunityViewerReady
