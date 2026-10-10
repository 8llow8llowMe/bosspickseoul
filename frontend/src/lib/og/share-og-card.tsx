import {
  BRAND_INK,
  BRAND_INVERSE_ACCENT,
  BRAND_INVERSE_BODY,
  CONTAINER_RADIUS_RATIO,
  CONTAINER_SYMBOL_RATIO,
  GRID_ACCENT_CELL,
  GRID_BODY_CELLS,
  GRID_MODULE,
  GRID_VIEWBOX,
  resolveMarkVariant,
  type MarkCell,
} from '@/lib/brand/mark-geometry'
import type { ShareOgCard } from '@/lib/share/share-og'

/**
 * 공유 링크 OG 카드(1200×630, #598).
 *
 * satori 는 CSS 변수를 읽지 못해 DESIGN.md 토큰을 **값으로** 옮겨 적는다. 크기는 화면 토큰의
 * 약 2배다 — 미리보기 썸네일이 600px 안팎으로 줄어들어 1배 크기로는 읽히지 않는다.
 *
 * | 쓰임          | 토큰                                  | 값        |
 * | ------------- | ------------------------------------- | --------- |
 * | 바탕          | background                            | `#ffffff` |
 * | 제목·지표 값  | grey900 (= brand ink)                 | `#191f28` |
 * | 부제          | grey700                               | `#4e5968` |
 * | 지표 라벨·분기 | grey600 (흰·grey100 바탕 4.5:1 이상) | `#6b7684` |
 * | 지표 카드     | grey100                               | `#f2f4f6` |
 * | 유형 칩       | blue50 바탕 + blue700 글자(5.26:1)    | `#e8f3ff` · `#1a5fcc` |
 *
 * 락업은 DESIGN §1.5 그대로 2배다 — 컨테이너 64 · 간격 16 · 워드마크 38, `BossPick` 700 + `Seoul` 400.
 * 컨테이너 64px 의 심볼 높이는 40px 이라 Grid 변형(고스트 없음)이다(`resolveMarkVariant`).
 */

const COLOR = {
  background: '#ffffff',
  text: BRAND_INK,
  subtitle: '#4e5968',
  caption: '#6b7684',
  surface: '#f2f4f6',
  chipBackground: '#e8f3ff',
  chipText: '#1a5fcc',
} as const

export const SHARE_OG_FONT_FAMILY = 'BPS Sans'

const CONTAINER_SIDE = 64
const SYMBOL_HEIGHT = CONTAINER_SIDE * CONTAINER_SYMBOL_RATIO
const SYMBOL_SCALE = SYMBOL_HEIGHT / GRID_VIEWBOX.height
const SYMBOL_OFFSET_X = (CONTAINER_SIDE - GRID_VIEWBOX.width * SYMBOL_SCALE) / 2
const SYMBOL_OFFSET_Y = (CONTAINER_SIDE - SYMBOL_HEIGHT) / 2

if (resolveMarkVariant(SYMBOL_HEIGHT) !== 'grid') {
  throw new Error('OG 락업 컨테이너 크기가 Grid 변형 대역을 벗어났다')
}

const symbolCell = (item: MarkCell, background: string) => (
  <div
    key={`${background}-${item.x}-${item.y}`}
    style={{
      position: 'absolute',
      left: SYMBOL_OFFSET_X + item.x * SYMBOL_SCALE,
      top: SYMBOL_OFFSET_Y + item.y * SYMBOL_SCALE,
      width: GRID_MODULE * SYMBOL_SCALE,
      height: GRID_MODULE * SYMBOL_SCALE,
      background,
    }}
  />
)

const Lockup = () => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: CONTAINER_SIDE,
        height: CONTAINER_SIDE,
        borderRadius: CONTAINER_SIDE * CONTAINER_RADIUS_RATIO,
        background: BRAND_INK,
      }}
    >
      {GRID_BODY_CELLS.map(item => symbolCell(item, BRAND_INVERSE_BODY))}
      {symbolCell(GRID_ACCENT_CELL, BRAND_INVERSE_ACCENT)}
    </div>
    <div
      style={{
        display: 'flex',
        marginLeft: CONTAINER_SIDE * CONTAINER_RADIUS_RATIO,
        fontSize: 38,
        letterSpacing: '-0.01em',
        color: BRAND_INK,
      }}
    >
      <span style={{ fontWeight: 700 }}>BossPick</span>
      <span style={{ fontWeight: 400 }}>Seoul</span>
    </div>
  </div>
)

export const ShareOgCardImage = ({ card }: { card: ShareOgCard }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      padding: '64px 80px',
      background: COLOR.background,
      color: COLOR.text,
      fontFamily: SHARE_OG_FONT_FAMILY,
    }}
  >
    <Lockup />

    <div style={{ display: 'flex', alignItems: 'center', marginTop: 48 }}>
      <div
        style={{
          display: 'flex',
          padding: '8px 20px',
          borderRadius: 16,
          background: COLOR.chipBackground,
          color: COLOR.chipText,
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        {card.kind}
      </div>
      {card.period ? (
        <div
          style={{
            display: 'flex',
            marginLeft: 20,
            fontSize: 28,
            color: COLOR.caption,
          }}
        >
          {card.period}
        </div>
      ) : null}
    </div>

    <div
      style={{
        display: 'block',
        marginTop: 24,
        fontSize: 64,
        fontWeight: 700,
        lineHeight: 1.2,
        lineClamp: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {card.title}
    </div>
    {card.subtitle ? (
      <div
        style={{
          display: 'block',
          marginTop: 12,
          fontSize: 34,
          color: COLOR.subtitle,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {card.subtitle}
      </div>
    ) : null}

    <div style={{ display: 'flex', marginTop: 'auto' }}>
      {card.metrics.map((metric, index) => (
        <div
          key={metric.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            marginLeft: index === 0 ? 0 : 24,
            padding: '24px 32px',
            borderRadius: 24,
            background: COLOR.surface,
          }}
        >
          <div style={{ display: 'flex', fontSize: 26, color: COLOR.caption }}>
            {metric.label}
          </div>
          <div
            style={{
              display: 'block',
              marginTop: 8,
              fontSize: 52,
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  </div>
)
