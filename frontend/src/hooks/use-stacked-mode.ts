'use client'

import { useEffect, useState } from 'react'

/**
 * "스택 모드" 판정 — `prefers-reduced-motion: reduce` 이거나 뷰포트 폭 ≤768px.
 *
 * 초기값 `false` 로 SSR·첫 렌더는 항상 스티키 모드다(hydration 일치). 마운트 후에만
 * `true` 가 될 수 있다.
 *
 * `product-story.tsx` 안의 비공개 함수였다. 랭킹 섹션(`popular-districts.tsx`)의
 * 스크롤 트랙 폴백이 스토리와 **정확히 같은** 기준을 써야 해서 공용으로 뽑았다 —
 * 각자 다시 작성하면 두 판정 기준이 시간이 지나며 갈릴 위험이 있다.
 */
export function useStackedMode(): boolean {
  const [stacked, setStacked] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const narrow = window.matchMedia('(max-width: 768px)')
    const update = () => setStacked(reduced.matches || narrow.matches)
    update()
    reduced.addEventListener('change', update)
    narrow.addEventListener('change', update)
    return () => {
      reduced.removeEventListener('change', update)
      narrow.removeEventListener('change', update)
    }
  }, [])

  return stacked
}
