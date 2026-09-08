import { ImageResponse } from 'next/og'

import {
  BRAND_INK,
  BRAND_INVERSE_ACCENT,
  BRAND_INVERSE_BODY,
  BRAND_INVERSE_GHOST,
  GRID_ACCENT_CELL,
  GRID_BODY_CELLS,
  GRID_GHOST_CELLS,
  GRID_MODULE,
  GRID_VIEWBOX,
  type MarkCell,
} from '@/lib/brand/mark-geometry'

/**
 * iOS 홈 화면 아이콘. 잉크 컨테이너 + 흰 본체 + 반전 팔레트.
 *
 * `BrandMark` 를 쓰지 않는다 — satori 는 SVG 지원이 제한적이라 절대 위치
 * `div` 로 그린다. 텍스트가 없으므로 폰트를 싣지 않는다(satori 는 WOFF2 를
 * 지원하지 않고 저장소에는 WOFF2 만 있다).
 */

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const MARK_HEIGHT = Math.floor(size.height * 0.625)
const SCALE = MARK_HEIGHT / GRID_VIEWBOX.height
const OFFSET_X = (size.width - GRID_VIEWBOX.width * SCALE) / 2
const OFFSET_Y = (size.height - MARK_HEIGHT) / 2
const CELL = GRID_MODULE * SCALE

const cell = (item: MarkCell, background: string) => (
  <div
    key={`${background}-${item.x}-${item.y}`}
    style={{
      position: 'absolute',
      left: OFFSET_X + item.x * SCALE,
      top: OFFSET_Y + item.y * SCALE,
      width: CELL,
      height: CELL,
      background,
    }}
  />
)

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        background: BRAND_INK,
        borderRadius: size.width * 0.25,
      }}
    >
      {GRID_GHOST_CELLS.map(item => cell(item, BRAND_INVERSE_GHOST))}
      {GRID_BODY_CELLS.map(item => cell(item, BRAND_INVERSE_BODY))}
      {cell(GRID_ACCENT_CELL, BRAND_INVERSE_ACCENT)}
    </div>,
    { ...size },
  )
}
