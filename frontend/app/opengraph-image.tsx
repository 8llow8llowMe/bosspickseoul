import { ImageResponse } from 'next/og'

import {
  BRAND_INK,
  BRAND_INVERSE_ACCENT,
  BRAND_INVERSE_BODY,
  GRID_ACCENT_CELL,
  GRID_BODY_CELLS,
  GRID_MODULE,
  GRID_VIEWBOX,
  type MarkCell,
} from '@/lib/brand/mark-geometry'

/**
 * 공유 카드 이미지.
 *
 * **워드마크를 넣지 않는다.** satori 는 WOFF2 를 지원하지 않고 저장소에는
 * Pretendard WOFF2 만 있다. 폴백 서체로 워드마크를 그리면 브랜드를 잘못
 * 표현하므로 심볼만 쓴다. 제목·설명은 `app/layout.tsx` 의 메타 태그가
 * 이미 제공하고, 플랫폼이 그걸 카드에 붙인다.
 *
 * 고스트를 쓰지 않는 Grid 변형이다 — 큰 크기에서 고스트가 필요하긴 하지만,
 * 여기서는 배경이 잉크라 고스트가 판독을 돕지 않는다.
 */

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'BossPickSeoul'

const MARK_HEIGHT = 240
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

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        background: BRAND_INK,
      }}
    >
      {GRID_BODY_CELLS.map(item => cell(item, BRAND_INVERSE_BODY))}
      {cell(GRID_ACCENT_CELL, BRAND_INVERSE_ACCENT)}
    </div>,
    { ...size },
  )
}
