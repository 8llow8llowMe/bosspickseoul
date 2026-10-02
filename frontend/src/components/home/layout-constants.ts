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
 * 히어로도 이 컬럼을 쓴다 — 1440 을 넘으면 지도를 더 키우지 않고 가운데 정렬하며, 왼쪽 기준선이
 * 아래 섹션과 같아진다(hero-split-layout.md D4-5).
 */
export const HOME_COLUMN = centeredColumn('var(--w-wide)')

/**
 * 히어로 「창」 장식(제목줄·신호등·드래그·접기·독 축소)을 켤지(hero-split-layout.md D4-2).
 *
 * 좌우 분할로 카드가 지도를 덮지 않게 되며 창을 치울 이유가 사라졌다. **시험 적용**이라
 * 코드는 지우지 않고 이 값으로 숨긴다 — `true` 로 돌리면 장식과 드래그가 함께 돌아온다
 * (오버레이 배치까지 되돌리려면 `HERO_SPLIT_MEDIA` 쪽 그리드도 되돌린다).
 *
 * 되돌릴 때 주의: 641~899 지도 중심 배치(`HERO_TABLET_MEDIA`)는 카드 껍데기를 `display: contents` 로
 * 푼다. 그 상태로는 제목줄이 그리드 맨 아래 암묵 행으로 밀리고, 접기(0fr)·닫기 transform 이 먹지
 * 않는다. 장식을 켜면 그 구간 규칙도 함께 되돌린다(hero-split-layout.md D4-3).
 */
export const HERO_WINDOW_CHROME = false

/*
 * 히어로 배치 기준은 범위 문법(`<`·`<=`)으로 쓴다 — `max-width: 640px` / `min-width: 641px` 처럼 정수로
 * 맞대면 브라우저 확대·OS 배율에서 생기는 640.8px 같은 소수 폭이 어느 쪽에도 걸리지 않는다.
 * 모바일 쪽(`max-width: 640px`)은 저장소 공용 규칙이라 그대로 두고, 태블릿이 640 초과부터 받는다.
 */

/**
 * 히어로 **세로로 흐르는** 폭 — 히어로 높이(한 화면 고정)를 푼다. 태블릿(지도 중심)과 모바일(카드 먼저)을
 * 함께 덮는다. 배치 자체는 `HERO_TABLET_MEDIA`·`(max-width: 640px)` 가 나눈다(hero-split-layout.md D4-3).
 */
export const HERO_STACKED_MEDIA = '(width < 900px)'
/** `HERO_STACKED_MEDIA` 의 반대쪽 — 좌우 두 칸일 때만 거는 규칙에 쓴다. */
export const HERO_SPLIT_MEDIA = '(width >= 900px)'
/**
 * 좌우 두 칸 중 **비율로 함께 줄어드는** 구간(hero-split-layout.md D4-6). 1200 이상은 카드 460px
 * 고정 · 지도 나머지, 이 구간은 1200 에서의 비율(460 : 652)을 지키며 카드 여백·제목도 단계로 준다
 * (글자는 vw 로 늘이지 않는다 — DESIGN.md §0).
 */
export const HERO_FLUID_MEDIA = '(900px <= width < 1200px)'
/** `HERO_FLUID_MEDIA` 의 좁은 반쪽 — 여백·칸 간격을 한 단계 더 줄인다(spacing 스케일 안에서 단계로). */
export const HERO_FLUID_NARROW_MEDIA = '(900px <= width < 1024px)'
/**
 * 지도 중심 배치 구간(hero-split-layout.md D4-3) — [제목·소개][지도][피커 바][보조 링크].
 * 카드 껍데기를 풀어 그 안의 덩어리를 히어로 그리드 칸에 직접 놓는다. ≤640 은 PR #505 그대로다.
 */
export const HERO_TABLET_MEDIA = '(640px < width < 900px)'
