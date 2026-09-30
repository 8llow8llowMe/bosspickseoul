/**
 * 판단 흐름 스크롤 전환의 순수 계산(story-scroll-pin.md D3).
 *
 * 예전 구현은 「뷰포트 진행도 → pin 구간 → 스텝」으로 진행도를 두 번 환산하다가 첫·마지막
 * 스텝이 눌리는 결함이 있었다(interaction-polish B2·B4). 여기서는 **트랙 윗단이 헤더 아래
 * 선을 지나 올라간 거리**(= sticky 가 붙어 있는 동안 스크롤한 거리) 하나로 곧장 나눈다.
 */

/** 한 단계가 차지하는 스크롤 길이(dvh). 네 단계가 같은 몫을 갖는다. */
export const STORY_STEP_SCROLL_DVH = 60

/**
 * 고정 모드 조건. CSS 미디어 쿼리와 JS matchMedia 가 **같은 문자열**을 쓴다 — 둘이 갈리면
 * 트랙은 늘었는데 선택은 클릭 모드로 남는(또는 그 반대) 상태가 된다.
 *
 * 높이 760px: 헤더(65) + 탭(52) + 간격(24) + 패널(570) 이 한 화면에 들어와야 고정이 성립한다.
 */
export const STORY_PIN_QUERY =
  '(min-width: 1100px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)'

/**
 * pin 구간 안에서 스크롤한 거리 → 단계. 트랙에 닿기 전(음수)은 첫 단계, 지난 뒤는 마지막
 * 단계로 자른다.
 */
export function pinnedStepIndex(
  scrolled: number,
  pinSpan: number,
  count: number,
): number {
  if (count <= 0) return 0
  if (!Number.isFinite(scrolled) || pinSpan <= 0) return 0
  const share = pinSpan / count
  const index = Math.floor(scrolled / share)
  return Math.min(count - 1, Math.max(0, index))
}

/**
 * 단계 몫의 **가운데**로 가는 `window.scrollY`. 경계에 세우면 한 픽셀 차이로 옆 단계가
 * 선택될 수 있다.
 *
 * `trackDocTop` 은 문서 기준 트랙 윗단, `headerPx` 는 sticky `top`(헤더 높이)이다. 트랙
 * 윗단이 헤더 아래 선에 닿는 scrollY 가 pin 의 시작이다.
 */
export function pinnedStepScrollTop(
  trackDocTop: number,
  headerPx: number,
  pinSpan: number,
  index: number,
  count: number,
): number {
  if (count <= 0 || pinSpan <= 0) return Math.max(0, trackDocTop - headerPx)
  const clamped = Math.min(count - 1, Math.max(0, index))
  const start = trackDocTop - headerPx
  return Math.max(0, start + ((clamped + 0.5) / count) * pinSpan)
}
