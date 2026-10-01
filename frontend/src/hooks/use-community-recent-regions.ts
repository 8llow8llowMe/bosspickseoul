'use client'

import { useEffect, useState } from 'react'

import {
  readCommunityRecentRegions,
  saveCommunityRecentRegion,
  type CommunityRecentRegion,
} from '@/lib/community/recent-regions'
import type { CommunityTargetType } from '@/types/community'

const getLocalStorage = () => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * 최근 본 지역(community.md §S4 「목록 3단」, CM-040). `current` 는 지금 연 지역 게시판이다 —
 * board 이름을 응답에서 알게 된 뒤에만 넘긴다. 저장소는 마운트 뒤 이펙트에서만 읽는다(SSR 은 빈 목록).
 */
export const useCommunityRecentRegions = (
  current: CommunityRecentRegion | null,
) => {
  const [regions, setRegions] = useState<CommunityRecentRegion[]>([])
  const targetType: CommunityTargetType | undefined = current?.targetType
  const targetCode = current?.targetCode
  const targetName = current?.targetName

  useEffect(() => {
    const storage = getLocalStorage()
    const opened =
      targetType && targetCode && targetName
        ? { targetType, targetCode, targetName }
        : null

    const next = !storage
      ? opened
        ? [opened]
        : []
      : opened
        ? saveCommunityRecentRegion(storage, opened)
        : readCommunityRecentRegions(storage)

    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 뒤에만 읽을 수 있는 외부 저장소(localStorage)를 반영한다. SSR·hydration 과 같은 첫 렌더(빈 목록)를 지킨다.
    setRegions(next)
  }, [targetType, targetCode, targetName])

  return regions
}

export default useCommunityRecentRegions
