'use client'

import { useEffect, useState } from 'react'

/** 좁은 뷰포트 기준. 선택 패널이 바텀시트로 바뀌는 지점과 같다. */
export const NARROW_VIEWPORT_QUERY = '(max-width: 1024px)'

/**
 * SSR 안전한 `matchMedia` 래퍼. CSS 로는 못 하고 **렌더 분기 자체를 폭으로 갈라야 할 때만** 쓴다.
 * 기본 쿼리는 `NARROW_VIEWPORT_QUERY`(≤1024)이고, 호출부가 자기 구간 쿼리를 넘길 수 있다.
 *
 * 지금 사용처:
 * - 분석 지도 셸(`analysis-map-shell.tsx`) — 좁은 폭 + 결과 열림이면 카카오 지도를 언마운트(기본 쿼리)
 * - 추천 페이지(`recommend-page.tsx`) — 데스크톱 패널 슬롯이 보이는 폭(≥1024)인지
 * - 커뮤니티 더보기(`community-more-menu.tsx`) — `<480` 바텀시트 / `≥480` 팝오버. 시트는 body
 *   포털이라 CSS 로 숨길 수 없다
 * - 커뮤니티 상세 하단 고정 바(`community-detail-bottom-bar.tsx`) — `<480` 에서만 화면 안팎을 관찰한다
 * - 홈 「지금 많이 본 지역」(`popular-districts.tsx`) — 행 ↔ 지도 호버 강조(≥901 정밀 포인터)와
 *   연결선(≥1200 정밀 포인터). 터치에서 핸들러를 붙이지 않아야 탭이 강조를 남기지 않는다
 *
 * `null` = 아직 측정 전(SSR·hydration 완료 전)이다. `false` 로 시작하지 않는 이유(분석 지도 셸):
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
