import { centeredColumn } from '@/styles/layout'

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

/**
 * 홈 본문 섹션의 콘텐츠 컬럼 — `--w-wide`(1400) 중앙 그룹.
 *
 * 예전엔 보드·인기지역·벤토가 셸(상한 없음), 스토리만 1400 이라 1920 에서 왼쪽 기준선이
 * 20 → 253 → 20 으로 튀었고, 셸 쪽 섹션은 폭을 따라 늘어나 카드 한 장이 620px(2560),
 * 가로 막대가 850px 까지 갔다. 폭 체계 §5 「상한은 요소가 진다」를 홈 섹션 단위에서
 * 지는 것이다. 헤더는 셸 그대로 둔다. 전폭 배경 밴드는 스토리만 깔고, 나머지는 섹션
 * 사이 기준선을 하나로 맞추는 것이 근거다(DESIGN.md §5).
 *
 * 히어로는 여기서 빠진다 — 지도가 셸 전폭을 쓰고 카드는 가운데라 기준선이 없다.
 */
export const HOME_COLUMN = centeredColumn('var(--w-wide)')
