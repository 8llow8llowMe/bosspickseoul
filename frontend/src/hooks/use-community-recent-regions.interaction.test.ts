// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useCommunityRecentRegions } from '@/hooks/use-community-recent-regions'
import {
  COMMUNITY_RECENT_REGIONS_KEY,
  type CommunityRecentRegion,
} from '@/lib/community/recent-regions'

/*
  최근 본 지역(community.md §S4 「목록 3단」, CM-040)을 목록 화면에 잇는 훅.
  저장 규칙 자체는 lib/community/recent-regions.test.ts 가 잠근다. 여기서는 마운트 뒤 읽기·대상이
  바뀔 때 기록·저장소 예외를 본다.
*/

const seongdong: CommunityRecentRegion = {
  targetType: 'DISTRICT',
  targetCode: '11200',
  targetName: '성동구',
}
const mapo: CommunityRecentRegion = {
  targetType: 'DISTRICT',
  targetCode: '11440',
  targetName: '마포구',
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('useCommunityRecentRegions', () => {
  it('reads stored regions after mount without recording when no board is open', () => {
    window.localStorage.setItem(
      COMMUNITY_RECENT_REGIONS_KEY,
      JSON.stringify([seongdong]),
    )

    const { result } = renderHook(() => useCommunityRecentRegions(null))

    expect(result.current).toEqual([seongdong])
    expect(
      JSON.parse(window.localStorage.getItem(COMMUNITY_RECENT_REGIONS_KEY)!),
    ).toEqual([seongdong])
  })

  it('records each opened board, newest first (CM-040)', () => {
    const { result, rerender } = renderHook(
      ({ current }) => useCommunityRecentRegions(current),
      { initialProps: { current: seongdong as CommunityRecentRegion | null } },
    )

    expect(result.current).toEqual([seongdong])

    rerender({ current: mapo })
    expect(result.current).toEqual([mapo, seongdong])
    expect(
      JSON.parse(window.localStorage.getItem(COMMUNITY_RECENT_REGIONS_KEY)!),
    ).toEqual([mapo, seongdong])
  })

  it('still shows the open board when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    const { result } = renderHook(() => useCommunityRecentRegions(seongdong))

    expect(result.current).toEqual([seongdong])
  })
})
