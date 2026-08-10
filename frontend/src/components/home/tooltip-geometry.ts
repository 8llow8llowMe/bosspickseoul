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
