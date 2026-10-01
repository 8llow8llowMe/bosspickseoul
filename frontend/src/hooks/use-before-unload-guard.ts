'use client'

import { useEffect } from 'react'

/**
 * 켜져 있는 동안 새로고침·탭 닫기에 브라우저 확인을 띄운다(community.md §S4 「잃지 않게」).
 *
 * 앱 안 링크 이동(App Router)은 막지 않는다 — 그건 `beforeunload` 가 나지 않고, 임시 저장이
 * 대신 지킨다. 브라우저가 문구를 무시하므로 `returnValue` 는 빈 문자열이면 된다.
 */
export function useBeforeUnloadGuard(active: boolean) {
  useEffect(() => {
    if (!active) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // 오래된 브라우저(Chrome < 119 등)는 returnValue 를 채워야 확인을 띄운다.
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [active])
}

export default useBeforeUnloadGuard
