'use client'

import { useEffect, useState } from 'react'

/** 좁은 뷰포트 기준. 선택 패널이 바텀시트로 바뀌는 지점과 같다. */
export const NARROW_VIEWPORT_QUERY = '(max-width: 1024px)'

/**
 * SSR 안전한 `matchMedia` 래퍼. **모바일 지도 언마운트 판정에만** 쓴다.
 *
 * `null` = 아직 측정 전(SSR·hydration 완료 전)이다. `false` 로 시작하지 않는 이유:
 * 결과 레이어가 열린 상태로 하드 로드되면 첫 페인트에서 지도를 잠깐 마운트했다가
 * 곧바로 언마운트하게 되는데(모바일), 카카오 지도 인스턴스 생성은 모바일에서 가장
 * 비싼 작업이다. "모른다"를 별도 상태로 두면 호출부가
 * `!resultOpen || narrow === false` 로 "hydration 완료 + 넓은 화면"을 한 번에 판정한다.
 */
export const useNarrowViewport = (
  query: string = NARROW_VIEWPORT_QUERY,
): boolean | null => {
  const [narrow, setNarrow] = useState<boolean | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia(query)
    const sync = (matches: boolean) => setNarrow(matches)

    // 마운트 직후 1회 측정. 초기값이 `null`(모른다)이라 이 커밋에서만 실제 값이 생긴다.
    sync(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => sync(event.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query])

  return narrow
}

export default useNarrowViewport
