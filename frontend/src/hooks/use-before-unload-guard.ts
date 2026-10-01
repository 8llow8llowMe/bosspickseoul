'use client'

import { useEffect } from 'react'

/**
 * 켜져 있는 동안 새로고침·탭 닫기에 브라우저 확인을 띄운다(community.md §S4 「잃지 않게」).
 *
 * 앱 안 링크 이동(App Router)은 막지 않는다 — 그건 `beforeunload` 가 나지 않고, 임시 저장이
 * 대신 지킨다. 브라우저는 문구를 무시하고 자기 문구를 띄운다.
 */
export function useBeforeUnloadGuard(active: boolean) {
  useEffect(() => {
    if (!active) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // 오래된 브라우저(Chrome < 119 등)는 preventDefault 를 보지 않고 returnValue 가 **참 값**이어야
      // 확인을 띄운다 — 빈 문자열은 거짓이라 아무것도 막지 못한다. 문구는 어차피 무시된다.
      event.returnValue = true
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [active])
}

export default useBeforeUnloadGuard
