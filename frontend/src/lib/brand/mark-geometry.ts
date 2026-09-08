/**
 * BossPickSeoul 브랜드 심볼의 기하·컬러 정본.
 *
 * 이 좌표가 React 컴포넌트, `public/brand/*.svg`, `app/icon.svg`,
 * `app/apple-icon.tsx`, `app/opengraph-image.tsx` 다섯 곳에서 쓰인다.
 * 네 번 손으로 적으면 반드시 어긋나므로 여기가 유일한 출처다.
 * 정적 SVG 파일은 `brand-assets.test.ts` 가 이 모듈과 대조한다.
 *
 * 설계 근거는 `docs/superpowers/specs/2026-09-08-brand-logo-design.md`.
 */

export const BRAND_INK = '#191f28'
export const BRAND_ACCENT = '#00795c'
export const BRAND_GHOST = '#edf0f3'

/**
 * 어두운 배경용 반전 팔레트.
 *
 * 본래 강조색 `#00795c` 를 어두운 배경에 그대로 쓰면 반전 고스트(`#252d3a`)
 * 대비가 2.04 로 무너져 강조 칸이 카운터에 녹는다. 그래서 반전에서만 밝힌다.
 * `grey800` 의 `#333d4b` 는 배경 대비가 1.51 로 너무 잘 보여 카운터가 채워진
 * 것처럼 읽히고 B 판독성이 무너진다. 라이트 모드 고스트는 배경 대비 1.14 이고
 * `#252d3a` 는 1.19 로 그 미묘함을 맞춘다.
 * `#12a47c` 는 흰 본체 대비 3.17, 반전 고스트 대비 3.47 로 양쪽을 지킨다.
 */
export const BRAND_INVERSE_BODY = '#ffffff'
export const BRAND_INVERSE_ACCENT = '#12a47c'
export const BRAND_INVERSE_GHOST = '#252d3a'

/**
 * 컨테이너 변 길이 대비 심볼 높이 비율(명세 §8). `containerSideFor`,
 * `BrandMark`(container 모드), `apple-icon.tsx` 세 곳에 흩어져 있던
 * `0.625` 리터럴을 여기 하나로 모은다. 브랜드 상수이므로 값이 조용히
 * 바뀌면 아이콘 전부가 같이 리사이즈된다 — `mark-geometry.test.ts` 가 못박는다.
 */
export const CONTAINER_SYMBOL_RATIO = 0.625

/**
 * 컨테이너 border-radius 대비 변 길이 비율(명세 §8). `BrandMark`(container
 * 모드)와 `apple-icon.tsx` 에 중복돼 있던 `0.25` 리터럴을 여기로 모은다.
 */
export const CONTAINER_RADIUS_RATIO = 0.25

export type BrandMarkVariant = 'primary' | 'grid' | 'solid'

export type MarkCell = { readonly x: number; readonly y: number }

/** 격자 변형 — 모듈 4, 갭 1, pitch 5. Primary 와 Grid 가 공유한다. */
export const GRID_VIEWBOX = { width: 19, height: 34 } as const
export const GRID_MODULE = 4

export const GRID_BODY_CELLS: readonly MarkCell[] = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  { x: 10, y: 0 },
  { x: 0, y: 5 },
  { x: 15, y: 5 },
  { x: 0, y: 10 },
  { x: 15, y: 10 },
  { x: 0, y: 15 },
  { x: 5, y: 15 },
  { x: 10, y: 15 },
  { x: 0, y: 20 },
  { x: 15, y: 20 },
  { x: 0, y: 25 },
  { x: 15, y: 25 },
  { x: 0, y: 30 },
  { x: 5, y: 30 },
  { x: 10, y: 30 },
]

/** 카운터 8칸 중 강조 1칸을 뺀 7칸. Primary 변형에서만 그린다. */
export const GRID_GHOST_CELLS: readonly MarkCell[] = [
  { x: 5, y: 5 },
  { x: 10, y: 5 },
  { x: 5, y: 10 },
  { x: 10, y: 10 },
  { x: 5, y: 20 },
  { x: 10, y: 20 },
  { x: 5, y: 25 },
]

/** 아래 카운터 2×2 의 우하단. */
export const GRID_ACCENT_CELL: MarkCell = { x: 10, y: 25 }

/**
 * 3열 노치. **어떤 변형에서도 채우지 않는다.**
 * 여기를 메우면 실루엣이 4×7 사각형이 되어 B 가 죽는다. 값으로 남겨두는 것은
 * 기하 테스트가 「비어 있음」을 검사할 대상이 필요하기 때문이다.
 */
export const GRID_NOTCH_CELLS: readonly MarkCell[] = [
  { x: 15, y: 0 },
  { x: 15, y: 15 },
  { x: 15, y: 30 },
]

/** Solid 변형 — 갭 없이 모듈 4 가 인접한다. 33px 이하에서 쓴다. */
export const SOLID_VIEWBOX = { width: 16, height: 28 } as const
export const SOLID_MODULE = 4

export const SOLID_BODY_CELLS: readonly MarkCell[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 8, y: 0 },
  { x: 0, y: 4 },
  { x: 12, y: 4 },
  { x: 0, y: 8 },
  { x: 12, y: 8 },
  { x: 0, y: 12 },
  { x: 4, y: 12 },
  { x: 8, y: 12 },
  { x: 0, y: 16 },
  { x: 12, y: 16 },
  { x: 0, y: 20 },
  { x: 12, y: 20 },
  { x: 0, y: 24 },
  { x: 4, y: 24 },
  { x: 8, y: 24 },
]

export const SOLID_ACCENT_CELL: MarkCell = { x: 8, y: 20 }

/**
 * 크기가 변형을 결정한다(명세 §7).
 *
 * 34px 에서 갭이 정확히 1px 로 렌더된다. 27px 는 0.79px 로 흐리고 20px 는
 * 0.59px 로 깨진다 — 브라우저 1배율 실측. 그래서 33px 이하는 갭이 없는
 * Solid 로 내려가고, 고스트는 48px 이상에서만 판독을 방해하지 않는다.
 */
export const resolveMarkVariant = (height: number): BrandMarkVariant => {
  if (height >= 48) return 'primary'
  if (height >= 34) return 'grid'
  return 'solid'
}

export const viewBoxFor = (
  variant: BrandMarkVariant,
): { readonly width: number; readonly height: number } =>
  variant === 'solid' ? SOLID_VIEWBOX : GRID_VIEWBOX

export const moduleFor = (variant: BrandMarkVariant): number =>
  variant === 'solid' ? SOLID_MODULE : GRID_MODULE

export const markWidthFor = (
  variant: BrandMarkVariant,
  height: number,
): number => {
  const box = viewBoxFor(variant)
  return (height * box.width) / box.height
}

/**
 * 컨테이너 변 길이. 명세 §8 「심볼 높이 = 변 길이 × 0.625」의 역산이다.
 * 심볼 박스 단위로 계산하므로 Solid 는 44.8, 격자는 54.4 가 되고 오프셋과
 * radius 가 모두 소수 한 자리로 떨어진다.
 */
export const containerSideFor = (variant: BrandMarkVariant): number =>
  viewBoxFor(variant).height / CONTAINER_SYMBOL_RATIO
