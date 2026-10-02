type Point = { x: number; y: number }
type Size = { width: number; height: number }

/**
 * hover 미니 툴팁의 좌상단 좌표를 계산한다. 기준점(center, 보통 자치구 중심)에서
 * offset만큼 떨어뜨려 배치하되, 툴팁이 viewBox 밖으로 나가지 않도록
 * [0, viewBox - size] 범위로 클램프한다.
 */
export function clampTooltipPosition(
  center: Point,
  size: Size,
  viewBox: Size,
  offset = 12,
): Point {
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max)
  return {
    x: clamp(center.x + offset, 0, viewBox.width - size.width),
    y: clamp(center.y + offset, 0, viewBox.height - size.height),
  }
}

/**
 * 자동 시연 툴팁의 x(viewBox 단위). 히어로 카드가 지도 가운데 위에 떠 있어 기본 자리
 * (`clampTooltipPosition`)는 폭에 따라 카드 뒤로 숨는다 — 카드 오른쪽 끝(`avoidRightPx`)
 * + `gapPx` 까지 민다. svg 는 `overflow: visible` 이라 viewBox 오른쪽 여백까지 쓸 수 있다.
 * 밀어서 svg 요소 오른쪽 끝(`boxRightPx`)을 넘으면 자리가 없으므로 null — 시연을 건너뛴다
 * (hero-picker-and-mobile-first-screen.md D5-3).
 *
 * `ctm` 은 viewBox → 화면 변환이다(`x_px = e + x * a`, `SVGGraphicsElement.getScreenCTM()`).
 */
export function placeBesideRect(
  defaultX: number,
  tooltipWidth: number,
  ctm: { a: number; e: number },
  avoidRightPx: number,
  boxRightPx: number,
  gapPx: number,
): number | null {
  const minX = (avoidRightPx + gapPx - ctm.e) / ctm.a
  const x = Math.max(defaultX, minX)
  const rightPx = ctm.e + (x + tooltipWidth) * ctm.a
  return rightPx <= boxRightPx ? x : null
}
