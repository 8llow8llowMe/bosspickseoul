import {
  BRAND_ACCENT,
  BRAND_GHOST,
  BRAND_INK,
  BRAND_INVERSE_ACCENT,
  BRAND_INVERSE_BODY,
  BRAND_INVERSE_GHOST,
  CONTAINER_RADIUS_RATIO,
  CONTAINER_SYMBOL_RATIO,
  GRID_ACCENT_CELL,
  GRID_BODY_CELLS,
  GRID_GHOST_CELLS,
  SOLID_ACCENT_CELL,
  SOLID_BODY_CELLS,
  containerSideFor,
  markWidthFor,
  moduleFor,
  resolveMarkVariant,
  viewBoxFor,
  type BrandMarkVariant,
  type MarkCell,
} from '@/lib/brand/mark-geometry'

/**
 * BossPickSeoul 브랜드 심볼.
 *
 * **styled-components 를 쓰지 않는다.** 이 컴포넌트가 만드는 SVG 문자열이
 * `public/brand/*.svg` 와 `app/icon.svg` 의 기준이고, 서버 컴포넌트에서도
 * 쓰일 수 있어야 한다. 스타일이 필요하면 호출부가 감싼다.
 *
 * 변형은 높이가 결정한다 — 격자 갭이 1px 미만이면 형태가 무너지므로
 * 33px 이하는 갭 없는 Solid 로 내려간다. `mark-geometry.ts` 참조.
 */

export type BrandMarkTone = 'ink' | 'inverse'

export type BrandMarkProps = {
  /** 렌더 높이(px). 컨테이너 모드에서는 정사각형의 변 길이다. */
  height: number
  /** 생략하면 높이에서 자동 결정한다. 직접 주면 그 값을 쓴다. */
  variant?: BrandMarkVariant
  tone?: BrandMarkTone
  /** 정사각 컨테이너에 담아 그린다. 앱아이콘·헤더 락업용. */
  container?: boolean
  /**
   * 주면 `role="img"` 과 `<title>` 이 붙는다. 생략하면 장식으로 숨긴다 —
   * 락업 안에서는 옆의 워드마크가 이름을 이미 읽어주므로 숨기는 게 맞다.
   */
  title?: string
}

type Palette = {
  body: string
  ghost: string
  accent: string
  container: string
}

/** 잉크 바탕 위에 놓이는 팔레트 — 본체가 잉크, 강조는 원래 강조색. */
const INK_BODY_PALETTE: Palette = {
  body: BRAND_INK,
  ghost: BRAND_GHOST,
  accent: BRAND_ACCENT,
  container: BRAND_INVERSE_BODY,
}

/**
 * 흰 바탕 위에 놓이는 팔레트 — 본체가 흰색이므로 강조를 밝힌다.
 * 원래 강조색 `#00795c` 를 흰/반전 배경에 그대로 쓰면 고스트 대비가
 * 2.04 로 무너지기 때문이다(`mark-geometry.ts` 의 반전 팔레트 설명 참조).
 */
const WHITE_BODY_PALETTE: Palette = {
  body: BRAND_INVERSE_BODY,
  ghost: BRAND_INVERSE_GHOST,
  accent: BRAND_INVERSE_ACCENT,
  container: BRAND_INK,
}

/**
 * 팔레트는 `tone` 과 `container` 의 XOR 로 뒤집힌다 — `tone='inverse'` 이거나
 * (배타적으로) `container=true` 일 때만 흰 바탕 팔레트를 쓴다. 컨테이너 안은
 * 톤이 한 번 더 반전되므로(바탕이 곧 심볼의 배경), 잉크 컨테이너 안 심볼은
 * 다시 흰 바탕 팔레트가 된다 — 두 조건이 같으면(둘 다 참이거나 둘 다 거짓)
 * 서로를 상쇄해 잉크 바탕 팔레트로 되돌아간다.
 */
const paletteFor = (tone: BrandMarkTone, container: boolean): Palette => {
  const inverted = (tone === 'inverse') !== container
  return inverted ? WHITE_BODY_PALETTE : INK_BODY_PALETTE
}

const cellsFor = (
  variant: BrandMarkVariant,
): {
  body: readonly MarkCell[]
  ghost: readonly MarkCell[]
  accent: MarkCell
} =>
  variant === 'solid'
    ? { body: SOLID_BODY_CELLS, ghost: [], accent: SOLID_ACCENT_CELL }
    : {
        body: GRID_BODY_CELLS,
        ghost: variant === 'primary' ? GRID_GHOST_CELLS : [],
        accent: GRID_ACCENT_CELL,
      }

const round = (value: number): number => Math.round(value * 10) / 10

export default function BrandMark({
  height,
  variant,
  tone = 'ink',
  container = false,
  title,
}: BrandMarkProps) {
  // 컨테이너 안 심볼 높이는 변 길이의 62.5% 다(명세 §8). 정수로 내린다.
  const markHeight = container
    ? Math.floor(height * CONTAINER_SYMBOL_RATIO)
    : height
  const resolved = variant ?? resolveMarkVariant(markHeight)

  const box = viewBoxFor(resolved)
  const moduleSize = moduleFor(resolved)
  const palette = paletteFor(tone, container)
  const { body, ghost, accent } = cellsFor(resolved)

  // `pnpm typecheck` 가 유니온 스프레드를 막으면 이 부분은 자유롭게
  // 재구성해도 된다. 렌더 결과(`role="img"` + `<title>` 또는
  // `aria-hidden="true"`)만 테스트대로 유지한다.
  const accessibility = title
    ? ({ role: 'img' } as const)
    : ({ 'aria-hidden': true } as const)

  const cell = (item: MarkCell, fill: string) => (
    <rect
      key={`${fill}-${item.x}-${item.y}`}
      x={item.x}
      y={item.y}
      width={moduleSize}
      height={moduleSize}
      fill={fill}
    />
  )

  // 고스트를 먼저 깔고 본체를 덮는다. 순서가 바뀌어도 겹치지 않지만
  // 정적 SVG 파일과 rect 순서를 맞춰 계약 테스트를 단순하게 유지한다.
  const marks = (
    <>
      {ghost.map(item => cell(item, palette.ghost))}
      {body.map(item => cell(item, palette.body))}
      {cell(accent, palette.accent)}
    </>
  )

  if (!container) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={round(markWidthFor(resolved, height))}
        height={height}
        viewBox={`0 0 ${box.width} ${box.height}`}
        {...accessibility}
      >
        {title ? <title>{title}</title> : null}
        {marks}
      </svg>
    )
  }

  const side = containerSideFor(resolved)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={height}
      height={height}
      viewBox={`0 0 ${round(side)} ${round(side)}`}
      {...accessibility}
    >
      {title ? <title>{title}</title> : null}
      {/*
        prop 순서가 계약이다 — 테스트와 정적 `app/icon.svg` 가
        `data-role="container" fill="…"` 를 연속 문자열로 검사한다.
      */}
      <rect
        data-role="container"
        fill={palette.container}
        width={round(side)}
        height={round(side)}
        rx={round(side * CONTAINER_RADIUS_RATIO)}
      />
      <g
        transform={`translate(${round((side - box.width) / 2)} ${round(
          (side - box.height) / 2,
        )})`}
      >
        {marks}
      </g>
    </svg>
  )
}
