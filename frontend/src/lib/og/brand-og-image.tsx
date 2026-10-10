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
 * 기본 공유 카드 이미지(심볼만). 루트 `app/opengraph-image.tsx` 와 공유 링크 이미지
 * (`app/(shell)/s/[shareCode]/opengraph-image.tsx`)의 폴백이 같은 그림을 쓴다.
 *
 * **워드마크를 넣지 않는다.** 제목·설명은 메타 태그가 이미 제공하고, 플랫폼이 그걸 카드에 붙인다.
 * 폰트 없이 그릴 수 있어야 폴백이 폰트 읽기 실패에도 살아남는다.
 *
 * `MARK_HEIGHT = 240` 은 `resolveMarkVariant` 의 Primary 대역(48px 이상)이라
 * Primary 변형(격자 + 고스트 7칸)을 그린다. 반전 고스트 `#252d3a` 는 잉크
 * 배경 대비를 라이트 모드와 맞춘 값이라(`mark-geometry.ts` 의 반전 팔레트
 * 설명 참조) 이 잉크 배경에서도 판독을 돕는다 — `apple-icon.tsx` 와 동일.
 */

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const

const MARK_HEIGHT = 240
const SCALE = MARK_HEIGHT / GRID_VIEWBOX.height
const OFFSET_X = (OG_IMAGE_SIZE.width - GRID_VIEWBOX.width * SCALE) / 2
const OFFSET_Y = (OG_IMAGE_SIZE.height - MARK_HEIGHT) / 2
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

export const BrandOgImage = () => (
  <div
    style={{
      position: 'relative',
      display: 'flex',
      width: '100%',
      height: '100%',
      background: BRAND_INK,
    }}
  >
    {GRID_GHOST_CELLS.map(item => cell(item, BRAND_INVERSE_GHOST))}
    {GRID_BODY_CELLS.map(item => cell(item, BRAND_INVERSE_BODY))}
    {cell(GRID_ACCENT_CELL, BRAND_INVERSE_ACCENT)}
  </div>
)
