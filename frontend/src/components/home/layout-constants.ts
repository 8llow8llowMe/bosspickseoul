import { css } from 'styled-components'
import { centeredColumn } from '@/styles/layout'

/**
 * SiteHeader(sticky) 실측 높이: Inner min-height 64px + border-bottom 1px.
 *
 * border-color 는 스크롤 여부로 투명/표시만 바뀌고 border-style 은 항상 solid 라,
 * 그 1px 은 스크롤 상태와 무관하게 항상 레이아웃 공간을 차지한다.
 *
 * 지금은 hero-section 만 쓴다(스토리·랭킹의 스티키는 home-restructure.md 에서 철회).
 * 헤더 높이를 아는 곳을 한 파일로 모아 두면 헤더가 바뀌는 날 한 곳만 고치면 된다.
 *
 * styled 템플릿에서 쓰이므로 **import 로만** 참조한다 — 같은 파일 안에서 styled
 * 선언보다 아래에 const 로 두면 템플릿이 즉시 평가되며 TDZ 에 걸려 모듈이 죽는다.
 */
export const HEADER_HEIGHT = '65px'

/**
 * 홈 본문 섹션은 최소 한 화면을 차지한다(full-screen-sections-and-live-tooltip.md D4-1).
 *
 * `100dvh` 가 아니라 헤더를 뺀 값이다 — 헤더가 sticky 라 섹션 윗단이 헤더 밑에 붙었을 때
 * 보이는 칸이 이만큼이다. 내용이 짧으면 세로 가운데에 선다. 위의 HEADER_HEIGHT 보다
 * 아래에 둬야 한다(템플릿이 즉시 평가된다).
 */
export const HOME_FULL_SCREEN_SECTION = css`
  min-height: calc(100dvh - ${HEADER_HEIGHT});
  display: flex;
  flex-direction: column;
  justify-content: center;
`

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
