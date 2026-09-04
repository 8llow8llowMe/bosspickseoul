/**
 * SiteHeader(sticky) 실측 높이: Inner min-height 64px + border-bottom 1px.
 *
 * border-color 는 스크롤 여부로 투명/표시만 바뀌고 border-style 은 항상 solid 라,
 * 그 1px 은 스크롤 상태와 무관하게 항상 레이아웃 공간을 차지한다.
 *
 * hero-section·product-story·popular-districts 세 곳이 같은 값을 알아야 한다.
 * 파일마다 따로 선언하면 헤더 높이가 바뀌는 날 한 곳만 고쳐진다.
 *
 * styled 템플릿에서 쓰이므로 **import 로만** 참조한다 — 같은 파일 안에서 styled
 * 선언보다 아래에 const 로 두면 템플릿이 즉시 평가되며 TDZ 에 걸려 모듈이 죽는다.
 */
export const HEADER_HEIGHT = '65px'
