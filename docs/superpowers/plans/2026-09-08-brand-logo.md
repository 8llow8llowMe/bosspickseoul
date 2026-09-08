# BossPickSeoul 브랜드 로고 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BossPickSeoul 자체 로고(B 4×7 모듈 격자 심볼 + 워드마크 락업)를 자산·컴포넌트·문서로 구현하고, DESIGN.md의 타사 브랜드 컬러 의존을 제거한다.

**Architecture:** 기하를 `src/lib/brand/mark-geometry.ts` 한 곳에 두고 모든 산출물이 거기서 파생된다. `BrandMark`는 styled-components 없는 순수 인라인 SVG라서 서버·클라이언트·정적 파일 어디서나 같은 형태를 낸다. 정적 SVG 파일은 손으로 쓰되 계약 테스트가 기하 모듈과 영원히 묶어둔다. 락업은 워드마크 조판이 필요하므로 styled-components를 쓰고 헤더·푸터만 소비한다.

**Tech Stack:** Next.js 16.2.1 App Router, React 19.2.4, TypeScript, styled-components 6.3.12, vitest(`environment: 'node'`), `next/og` ImageResponse, Pretendard(`next/font/local`)

**Spec:** `docs/superpowers/specs/2026-09-08-brand-logo-design.md` (커밋 `5d0b0534`)

## Global Constraints

- 브랜드 컬러는 정확히 이 값이다. `Brand Ink #191f28` / `Brand Accent #00795c` / `Brand Ghost #edf0f3`. 소문자 16진수로 쓴다(저장소 `global-styles.ts` 관례).
- **`#00795c`는 로고 전용이다.** `src/lib/brand/`, `src/components/brand/`, `public/brand/`, `app/icon.svg`, `app/apple-icon.tsx`, `app/opengraph-image.tsx`, `frontend/DESIGN.md` 밖에서 등장하면 안 된다. Task 2가 이걸 테스트로 못박는다.
- 로고는 `--color-blue-500`(`#0ea5e9`)을 쓰지 않는다. DESIGN.md 원칙 4 보존.
- 격자 기하는 고정이다. `viewBox="0 0 19 34"`, 모듈 `4`, 갭 `1`, pitch `5`, `rx` 없음(각진 모듈).
- **3열 노치 3칸 `(15,0) (15,15) (15,30)`은 어떤 변형에서도 채우지 않는다.** 채우면 실루엣이 사각형이 되어 B가 죽는다.
- 강조 칸은 아래 카운터 우하단 하나다. 격자 변형에서 `(10,25)`, Solid 변형에서 `(8,20)`.
- **강조색은 본체 색이 결정한다.** 본체가 잉크면 `#00795c`, 본체가 흰색이면 `#12a47c` 다. 잉크 컨테이너 안(본체 흰색)에서 `#00795c` 를 쓰면 반전 고스트 대비가 2.04 로 무너지므로 고스트가 없는 Solid 변형이라도 규칙을 갈라 쓰지 않는다 — 한 팔레트로 통일한다.
- 크기→변형 규칙: `48px 이상` Primary(고스트 포함), `34~47px` Grid(고스트 없음), `33px 이하` Solid(갭 없음).
- 컨테이너 비례: 변 길이 = 심볼 박스 높이 ÷ 0.625, `border-radius` = 변 길이 × 0.25.
- 워드마크는 `BossPick` 700 + `Seoul` 400, `letter-spacing: -0.01em`. 서체는 Pretendard(저장소가 실제로 로드하는 서체).
- 테스트는 저장소 관례를 따른다. `environment: 'node'`, jsdom·testing-library 없음, `renderToStaticMarkup(createElement(...))` 결과 **문자열**에 assertion. 파일명은 `*.test.ts`(`.tsx` 아님), 대상 파일과 같은 디렉터리.
- 각 Task 마지막에 `pnpm test`를 돌린다. Task 6·7·8 끝에서는 `pnpm qa:verify`도 돌린다(`format:check` → `lint` → `typecheck` → `build`).

## 명세와 다른 점 3개 (구현하면서 확정한 것)

계획을 쓰면서 명세대로 만들 수 없는 것 둘과 명세에 빠진 것 하나를 찾았다. 명세는 이 계획이 끝난 뒤 Task 8에서 함께 갱신한다.

1. **`public/brand/lockup-horizontal.svg` · `lockup-vertical.svg`를 만들지 않는다.** 정적 SVG에 워드마크를 넣으려면 `<text>`를 쓰거나 글자를 아웃라인 패스로 변환해야 한다. `<text>`는 파일을 여는 사람 컴퓨터에 Pretendard가 있어야 제대로 보이므로 배포용 브랜드 파일로 쓸 수 없고, 아웃라인화는 저장소에 도구가 없다(`fontTools`·`pyftsubset` 부재를 확인했다). **락업은 React 컴포넌트로만 제공한다.** 정적 락업 파일은 Pretendard TTF/OTF를 저장소에 넣은 뒤의 후속 과제다.
2. **OG 이미지에 워드마크를 넣지 않는다.** `next/og`의 satori는 **WOFF2를 지원하지 않고** 저장소에는 WOFF2만 있다. 폴백 서체로 워드마크를 그리면 브랜드를 잘못 표현하므로, OG 이미지는 잉크 배경 + Grid 심볼(반전) 구성으로 간다. 텍스트가 없으므로 폰트를 아예 싣지 않는다. 공유 카드의 제목·설명은 `app/layout.tsx`의 메타 태그가 이미 제공한다.
3. **반전 팔레트를 신설한다.** 명세는 어두운 배경용 본체(`#ffffff`)만 정하고 고스트·강조의 반전값을 비워뒀다. `app/apple-icon.tsx`(잉크 바탕 + 흰 본체 + 고스트 7칸)가 그 값을 요구한다. 명세 §6.1과 같은 방법(이웃 두 색 모두와 대비 확보)으로 산출했다.

   | 역할 | 값 | 흰 본체 대비 | 고스트 대비 |
   | --- | --- | --- | --- |
   | `BRAND_INVERSE_BODY` | `#ffffff` | — | 11.0 |
   | `BRAND_INVERSE_GHOST` | `#252d3a` | 13.9 | — |
   | `BRAND_INVERSE_ACCENT` | `#12a47c` | 3.17 | 3.47 |

   본래 강조색 `#00795c`를 어두운 배경에 그대로 쓰면 고스트(`#252d3a`) 대비가 **2.57**밖에 안 되어 강조 칸이 카운터에 녹는다. 그래서 반전에서는 강조색을 밝힌다 — `#12a47c` 는 같은 고스트 대비 4.37 다.

---

## File Structure

### 신규

| 경로 | 책임 |
| --- | --- |
| `frontend/src/lib/brand/mark-geometry.ts` | 기하와 컬러의 **단일 정본**. 셀 좌표, 팔레트, 크기→변형 규칙, 폭 산출 |
| `frontend/src/lib/brand/mark-geometry.test.ts` | 기하 불변식(셀 수·중복 없음·노치 비어 있음·변형 임계점) |
| `frontend/src/lib/brand/brand-assets.test.ts` | 정적 SVG 파일이 기하 모듈과 일치하는지 계약 테스트 |
| `frontend/src/components/brand/brand-mark.tsx` | 심볼 렌더. 순수 인라인 SVG, styled-components 없음 |
| `frontend/src/components/brand/brand-mark.test.ts` | 변형·톤·컨테이너·접근성 |
| `frontend/src/components/brand/brand-lockup.tsx` | 락업(심볼 + 워드마크). 가로·세로, 톤 |
| `frontend/src/components/brand/brand-lockup.test.ts` | 무게 분리·간격·톤·줄바꿈 방지 |
| `frontend/public/brand/mark-primary.svg` | Primary 심볼 배포 파일 |
| `frontend/public/brand/mark-grid.svg` | Grid 심볼 배포 파일 |
| `frontend/public/brand/mark-solid.svg` | Solid 심볼 배포 파일 |
| `frontend/app/icon.svg` | 파비콘. 컨테이너 + Solid |
| `frontend/app/apple-icon.tsx` | 180×180 `ImageResponse` |
| `frontend/app/opengraph-image.tsx` | 1200×630 `ImageResponse` |

### 변경

| 경로 | 변경 |
| --- | --- |
| `frontend/src/styles/global-styles.ts` | `--color-brand-ink` / `-accent` / `-ghost` 추가 |
| `frontend/src/styles/global-styles.test.ts` | 브랜드 토큰과 로고 전용 규약 테스트 추가 |
| `frontend/src/components/layout/site-header.tsx` | `Brand`(57행 정의, 502행 사용)의 텍스트를 락업으로 교체 |
| `frontend/src/components/layout/site-footer.tsx` | `Title`(43행)을 락업으로 교체 |
| `frontend/DESIGN.md` | 3행 프론트맷터, 40~41행 타사 컬러, 75행 서체 서술 정정 + 브랜드 자산 섹션 신설 |

### 왜 이렇게 나눴나

기하가 **네 곳**(React 컴포넌트, 정적 SVG 3개, `ImageResponse` 2개, 문서)에서 쓰인다. 좌표를 네 번 적으면 반드시 어긋나므로 `mark-geometry.ts`를 정본으로 두고, 손으로 쓸 수밖에 없는 정적 SVG는 계약 테스트로 묶는다.

`brand-mark.tsx`가 styled-components를 쓰지 않는 것이 핵심 경계다. 이 컴포넌트가 만드는 SVG 문자열이 정적 파일의 기준이 되고, 서버 컴포넌트에서도 쓸 수 있어야 한다.

---

## Task 1: 브랜드 기하 정본 모듈

**Files:**
- Create: `frontend/src/lib/brand/mark-geometry.ts`
- Test: `frontend/src/lib/brand/mark-geometry.test.ts`

**Interfaces:**
- Consumes: 없음(첫 태스크)
- Produces:
  - `BRAND_INK`, `BRAND_ACCENT`, `BRAND_GHOST`, `BRAND_INVERSE_BODY`, `BRAND_INVERSE_ACCENT`, `BRAND_INVERSE_GHOST`: `string`
  - `type BrandMarkVariant = 'primary' | 'grid' | 'solid'`
  - `type MarkCell = { readonly x: number; readonly y: number }`
  - `GRID_VIEWBOX`, `SOLID_VIEWBOX`: `{ readonly width: number; readonly height: number }`
  - `GRID_MODULE`, `SOLID_MODULE`: `number`
  - `GRID_BODY_CELLS`, `GRID_GHOST_CELLS`, `GRID_NOTCH_CELLS`, `SOLID_BODY_CELLS`: `readonly MarkCell[]`
  - `GRID_ACCENT_CELL`, `SOLID_ACCENT_CELL`: `MarkCell`
  - `resolveMarkVariant(height: number): BrandMarkVariant`
  - `viewBoxFor(variant: BrandMarkVariant): { readonly width: number; readonly height: number }`
  - `moduleFor(variant: BrandMarkVariant): number`
  - `markWidthFor(variant: BrandMarkVariant, height: number): number`
  - `containerSideFor(variant: BrandMarkVariant): number`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`frontend/src/lib/brand/mark-geometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  GRID_ACCENT_CELL,
  GRID_BODY_CELLS,
  GRID_GHOST_CELLS,
  GRID_MODULE,
  GRID_NOTCH_CELLS,
  GRID_VIEWBOX,
  SOLID_ACCENT_CELL,
  SOLID_BODY_CELLS,
  SOLID_VIEWBOX,
  containerSideFor,
  markWidthFor,
  resolveMarkVariant,
  type MarkCell,
} from './mark-geometry'

const key = (cell: MarkCell): string => `${cell.x},${cell.y}`

describe('격자 변형 기하', () => {
  // 4열 × 7행 = 28칸이 남지도 겹치지도 않아야 한다.
  it('28칸을 본체 17 · 고스트 7 · 강조 1 · 노치 3 으로 정확히 나눈다', () => {
    expect(GRID_BODY_CELLS).toHaveLength(17)
    expect(GRID_GHOST_CELLS).toHaveLength(7)
    expect(GRID_NOTCH_CELLS).toHaveLength(3)

    const all = [
      ...GRID_BODY_CELLS,
      ...GRID_GHOST_CELLS,
      ...GRID_NOTCH_CELLS,
      GRID_ACCENT_CELL,
    ]

    expect(all).toHaveLength(28)
    expect(new Set(all.map(key)).size).toBe(28)
  })

  it('모든 칸이 pitch 5 격자 위에 있고 viewBox 안에 들어간다', () => {
    const all = [
      ...GRID_BODY_CELLS,
      ...GRID_GHOST_CELLS,
      ...GRID_NOTCH_CELLS,
      GRID_ACCENT_CELL,
    ]

    for (const cell of all) {
      expect(cell.x % 5).toBe(0)
      expect(cell.y % 5).toBe(0)
      expect(cell.x + GRID_MODULE).toBeLessThanOrEqual(GRID_VIEWBOX.width)
      expect(cell.y + GRID_MODULE).toBeLessThanOrEqual(GRID_VIEWBOX.height)
    }
  })

  /**
   * 회귀 방지 — 고스트를 빈 칸 전부에 채웠던 초안은 3열 노치를 메워
   * 실루엣을 사각형으로 만들었고 B 판독성이 무너졌다. 노치는 비어 있어야 한다.
   */
  it('3열 노치는 고스트가 아니다', () => {
    const ghostKeys = new Set(GRID_GHOST_CELLS.map(key))

    expect(GRID_NOTCH_CELLS.map(key)).toEqual(['15,0', '15,15', '15,30'])
    for (const notch of GRID_NOTCH_CELLS) {
      expect(ghostKeys.has(key(notch))).toBe(false)
    }
  })

  // 강조 칸은 아래 카운터의 우하단 하나다.
  it('강조 칸은 아래 카운터 우하단이다', () => {
    expect(GRID_ACCENT_CELL).toEqual({ x: 10, y: 25 })

    const lowerCounter = ['5,20', '10,20', '5,25', '10,25']
    const ghostKeys = GRID_GHOST_CELLS.map(key)

    expect(lowerCounter.filter(k => ghostKeys.includes(k))).toEqual([
      '5,20',
      '10,20',
      '5,25',
    ])
  })
})

describe('Solid 변형 기하', () => {
  it('본체 17칸과 강조 1칸을 갭 없이 배치한다', () => {
    expect(SOLID_BODY_CELLS).toHaveLength(17)
    expect(SOLID_ACCENT_CELL).toEqual({ x: 8, y: 20 })

    for (const cell of [...SOLID_BODY_CELLS, SOLID_ACCENT_CELL]) {
      expect(cell.x % 4).toBe(0)
      expect(cell.y % 4).toBe(0)
    }
  })

  // 격자 변형과 셀 배치가 같아야 한다 — 같은 글자여야 하니까.
  it('격자 변형과 같은 칸 배치를 가진다', () => {
    const scaled = (cells: readonly MarkCell[], pitch: number): string[] =>
      cells.map(cell => `${cell.x / pitch},${cell.y / pitch}`).sort()

    expect(scaled(SOLID_BODY_CELLS, 4)).toEqual(scaled(GRID_BODY_CELLS, 5))
    expect(scaled([SOLID_ACCENT_CELL], 4)).toEqual(
      scaled([GRID_ACCENT_CELL], 5),
    )
  })
})

describe('resolveMarkVariant — 크기가 변형을 결정한다', () => {
  /**
   * 명세 §7.1. 갭이 1px 미만이면 격자가 무너진다. 34px 에서 갭이 정확히
   * 1px 이므로 그 아래는 갭 없는 Solid 로 내려간다.
   */
  it('임계점 34 와 48 을 지킨다', () => {
    expect(resolveMarkVariant(16)).toBe('solid')
    expect(resolveMarkVariant(20)).toBe('solid')
    expect(resolveMarkVariant(33)).toBe('solid')
    expect(resolveMarkVariant(34)).toBe('grid')
    expect(resolveMarkVariant(47)).toBe('grid')
    expect(resolveMarkVariant(48)).toBe('primary')
    expect(resolveMarkVariant(240)).toBe('primary')
  })
})

describe('치수 산출', () => {
  it('폭을 높이에서 파생한다', () => {
    expect(markWidthFor('grid', 34)).toBe(19)
    expect(markWidthFor('primary', 34)).toBe(19)
    expect(markWidthFor('solid', 28)).toBe(16)
  })

  // 컨테이너 변 길이 × 0.625 = 심볼 박스 높이.
  it('컨테이너 변 길이는 심볼 높이의 1.6 배다', () => {
    expect(containerSideFor('solid')).toBeCloseTo(44.8, 5)
    expect(containerSideFor('grid')).toBeCloseTo(54.4, 5)
    expect(containerSideFor('solid') * 0.625).toBeCloseTo(
      SOLID_VIEWBOX.height,
      5,
    )
    expect(containerSideFor('grid') * 0.625).toBeCloseTo(
      GRID_VIEWBOX.height,
      5,
    )
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd frontend && pnpm vitest run src/lib/brand/mark-geometry.test.ts`
Expected: FAIL — `Failed to resolve import "./mark-geometry"`

- [ ] **Step 3: 기하 모듈을 만든다**

`frontend/src/lib/brand/mark-geometry.ts`:

```ts
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
 * `#12a47c` 는 흰 본체 대비 3.17, 반전 고스트 대비 3.47 로 양쪽을 지킨다.
 */
export const BRAND_INVERSE_BODY = '#ffffff'
export const BRAND_INVERSE_ACCENT = '#12a47c'
export const BRAND_INVERSE_GHOST = '#252d3a'

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
  viewBoxFor(variant).height / 0.625
```

- [ ] **Step 4: 통과를 확인한다**

Run: `cd frontend && pnpm vitest run src/lib/brand/mark-geometry.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 5: 커밋한다**

```bash
git add frontend/src/lib/brand/mark-geometry.ts frontend/src/lib/brand/mark-geometry.test.ts
git commit -m "[FE] feat: 브랜드 심볼 기하 정본 모듈을 만든다

좌표가 컴포넌트·정적 SVG·OG 이미지 다섯 곳에서 쓰이므로 한 곳에 모은다.
3열 노치가 비어 있는지 검사하는 테스트를 넣었다 - 고스트를 빈 칸 전부에
채우면 실루엣이 사각형이 되어 B 가 죽는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: 브랜드 컬러 토큰과 로고 전용 규약

**Files:**
- Modify: `frontend/src/styles/global-styles.ts` (`:root` 블록, `--color-purple-500` 선언 뒤)
- Test: `frontend/src/styles/global-styles.test.ts` (기존 파일에 `describe` 추가)

**Interfaces:**
- Consumes: Task 1의 `BRAND_INK`, `BRAND_ACCENT`, `BRAND_GHOST`
- Produces: CSS 변수 `--color-brand-ink`, `--color-brand-accent`, `--color-brand-ghost`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`frontend/src/styles/global-styles.test.ts` **맨 끝에 추가**한다. 파일 상단의 `squeeze`·`renderGlobalCss` 헬퍼를 그대로 쓴다. 아래 import 두 줄을 파일 상단 import 블록에 더한다:

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
```

`__dirname` 을 쓰지 않는다 — vitest 는 ESM 으로 돌아 정의되지 않는다. 저장소는 이미 `import.meta.url` 관례를 쓴다(`src/components/analysis/analysis-map-shell.route.test.ts:16`).

추가할 내용:

```ts
/**
 * 로고 강조색은 `green500`(#03b26c)과 계열이 같다. UI 에 풀리면 성공·상승
 * 시맨틱과 혼동되므로 브랜드 파일 밖에서는 등장하지 않아야 한다.
 * 이 분리는 규약으로만 유지되니 여기서 못박는다.
 */
describe('브랜드 컬러 토큰 (로고 전용)', () => {
  it('브랜드 토큰 셋을 :root 에 선언한다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).toContain('--color-brand-ink:#191f28;')
    expect(css).toContain('--color-brand-accent:#00795c;')
    expect(css).toContain('--color-brand-ghost:#edf0f3;')
  })

  it('로고 파랑 금지 — 브랜드 토큰이 blue500 을 참조하지 않는다', () => {
    const css = squeeze(renderGlobalCss())

    expect(css).not.toContain('--color-brand-accent:var(--color-blue-500)')
    expect(css).not.toContain('--color-brand-accent:#0ea5e9')
    expect(css).not.toContain('--color-brand-accent:#0064ff')
  })
})

describe('브랜드 강조색은 로고 전용이다', () => {
  const projectRoot = path.resolve(
    fileURLToPath(new URL('.', import.meta.url)),
    '../..',
  )

  /** 강조색이 허용되는 곳. 브랜드 자산과 그 문서뿐이다. */
  const allowed = [
    'src/lib/brand',
    'src/components/brand',
    'src/styles/global-styles.ts',
    'src/styles/global-styles.test.ts',
    'public/brand',
    'app/icon.svg',
    'app/apple-icon.tsx',
    'app/opengraph-image.tsx',
    'DESIGN.md',
  ].map(entry => path.join(projectRoot, entry))

  const scanned = ['src', 'app']
  const extensions = ['.ts', '.tsx', '.css', '.svg', '.md']

  const collect = (dir: string): string[] => {
    const out: string[] = []

    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue

      const full = path.join(dir, name)

      if (statSync(full).isDirectory()) {
        out.push(...collect(full))
        continue
      }

      if (extensions.some(ext => name.endsWith(ext))) out.push(full)
    }

    return out
  }

  it('#00795c 와 #12a47c 가 브랜드 파일 밖에서는 쓰이지 않는다', () => {
    const offenders = scanned
      .flatMap(entry => collect(path.join(projectRoot, entry)))
      .filter(file => !allowed.some(prefix => file.startsWith(prefix)))
      .filter(file => /#00795c|#12a47c/i.test(readFileSync(file, 'utf8')))
      .map(file => path.relative(projectRoot, file))

    expect(offenders).toEqual([])
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd frontend && pnpm vitest run src/styles/global-styles.test.ts`
Expected: FAIL — `expected '...' to contain '--color-brand-ink:#191f28;'`

- [ ] **Step 3: 토큰을 추가한다**

`frontend/src/styles/global-styles.ts` 의 `--color-purple-500: #a234c7;` 선언 **바로 뒤**에 넣는다:

```ts
    /**
     * 브랜드 컬러 — 로고 전용이다. UI 컴포넌트에서 쓰지 않는다.
     * `--color-brand-accent` 는 `green500` 과 계열이 같아 UI 에 풀면
     * 성공·상승 시맨틱과 혼동된다. 기하와 근거는
     * `src/lib/brand/mark-geometry.ts` 와 DESIGN.md 브랜드 자산 섹션.
     */
    --color-brand-ink: #191f28;
    --color-brand-accent: #00795c;
    --color-brand-ghost: #edf0f3;
```

- [ ] **Step 4: 통과를 확인한다**

Run: `cd frontend && pnpm vitest run src/styles/global-styles.test.ts`
Expected: PASS

- [ ] **Step 5: 전체 테스트를 돌린다**

Run: `cd frontend && pnpm test`
Expected: PASS

- [ ] **Step 6: 커밋한다**

```bash
git add frontend/src/styles/global-styles.ts frontend/src/styles/global-styles.test.ts
git commit -m "[FE] feat: 브랜드 컬러 토큰을 추가하고 강조색을 로고 전용으로 못박는다

--color-brand-accent(#00795c)는 green500 과 계열이 같아 UI 에 풀리면
성공·상승 시맨틱과 혼동된다. 브랜드 파일 밖에서 등장하면 깨지는 테스트를
같이 넣었다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: BrandMark 컴포넌트

**Files:**
- Create: `frontend/src/components/brand/brand-mark.tsx`
- Test: `frontend/src/components/brand/brand-mark.test.ts`

**Interfaces:**
- Consumes: Task 1 전체
- Produces:
  - `type BrandMarkTone = 'ink' | 'inverse'`
  - `type BrandMarkProps = { height: number; variant?: BrandMarkVariant; tone?: BrandMarkTone; container?: boolean; title?: string }`
  - `default export BrandMark(props: BrandMarkProps): JSX.Element`

**주의:** 이 파일은 **styled-components 를 쓰지 않는다.** 이 컴포넌트가 만드는 SVG 문자열이 Task 4 정적 파일의 기준이고, 서버 컴포넌트에서도 쓰일 수 있어야 한다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`frontend/src/components/brand/brand-mark.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import BrandMark, { type BrandMarkProps } from './brand-mark'

const render = (props: BrandMarkProps): string =>
  renderToStaticMarkup(createElement(BrandMark, props))

const countRects = (svg: string): number =>
  (svg.match(/<rect/g) ?? []).length

describe('BrandMark 변형', () => {
  it('Primary 는 본체 17 · 고스트 7 · 강조 1 = 25칸을 그린다', () => {
    const svg = render({ height: 80 })

    expect(svg).toContain('viewBox="0 0 19 34"')
    expect(countRects(svg)).toBe(25)
    expect(svg).toContain('fill="#edf0f3"')
    expect(svg).toContain('fill="#00795c"')
  })

  it('Grid 는 고스트를 그리지 않는다 — 본체 17 + 강조 1', () => {
    const svg = render({ height: 40 })

    expect(svg).toContain('viewBox="0 0 19 34"')
    expect(countRects(svg)).toBe(18)
    expect(svg).not.toContain('#edf0f3')
  })

  it('Solid 는 갭 없는 16x28 박스를 쓴다', () => {
    const svg = render({ height: 20 })

    expect(svg).toContain('viewBox="0 0 16 28"')
    expect(countRects(svg)).toBe(18)
    expect(svg).not.toContain('#edf0f3')
  })

  it('variant 를 직접 주면 높이 규칙을 덮는다', () => {
    expect(render({ height: 20, variant: 'primary' })).toContain(
      'viewBox="0 0 19 34"',
    )
  })

  /**
   * 3열 노치는 어떤 변형에서도 채우지 않는다. 채우면 실루엣이 사각형이 되어
   * B 가 죽는다 — 초안에서 실제로 그랬다.
   */
  it('3열 노치를 어떤 변형에서도 채우지 않는다', () => {
    for (const height of [20, 40, 80]) {
      const svg = render({ height })

      expect(svg).not.toContain('x="15" y="0"')
      expect(svg).not.toContain('x="15" y="15"')
      expect(svg).not.toContain('x="15" y="30"')
      expect(svg).not.toContain('x="12" y="0"')
      expect(svg).not.toContain('x="12" y="24"')
    }
  })
})

describe('BrandMark 치수', () => {
  it('폭을 높이에서 파생한다', () => {
    const svg = render({ height: 34 })

    expect(svg).toContain('height="34"')
    expect(svg).toContain('width="19"')
  })

  it('컨테이너 모드는 정사각이고 radius 가 변의 25% 다', () => {
    const svg = render({ height: 32, container: true })

    expect(svg).toContain('width="32"')
    expect(svg).toContain('height="32"')
    expect(svg).toContain('viewBox="0 0 44.8 44.8"')
    expect(svg).toContain('rx="11.2"')
    expect(svg).toContain('data-role="container"')
    // 심볼은 컨테이너 안에서 중앙에 놓인다.
    expect(svg).toContain('translate(14.4 8.4)')
  })

  it('컨테이너 32px 는 Solid 를 담는다 — 그 크기에서 갭이 무너진다', () => {
    expect(render({ height: 32, container: true })).toContain(
      'viewBox="0 0 44.8 44.8"',
    )
  })

  it('컨테이너 180px 는 Primary 를 담는다', () => {
    const svg = render({ height: 180, container: true })

    expect(svg).toContain('viewBox="0 0 54.4 54.4"')
    expect(svg).toContain('rx="13.6"')
    expect(countRects(svg)).toBe(26)
  })
})

describe('BrandMark 톤', () => {
  it('ink 톤은 본체를 잉크로, 강조를 잉크 그린으로 그린다', () => {
    const svg = render({ height: 80 })

    expect(svg).toContain('fill="#191f28"')
    expect(svg).toContain('fill="#00795c"')
  })

  it('inverse 톤은 본체를 흰색으로 하고 강조·고스트를 반전값으로 바꾼다', () => {
    const svg = render({ height: 80, tone: 'inverse' })

    expect(svg).toContain('fill="#ffffff"')
    expect(svg).toContain('fill="#12a47c"')
    expect(svg).toContain('fill="#252d3a"')
    // 반전에서 원래 강조색을 쓰면 반전 고스트 대비가 2.04 로 무너진다.
    expect(svg).not.toContain('#00795c')
  })

  /**
   * 잉크 컨테이너 안에서는 본체가 흰색이므로 반전 팔레트를 쓴다. 여기서
   * `#00795c` 를 쓰면 고스트가 있는 크기(48px+)에서 대비가 2.04 로 무너진다.
   * 고스트가 없는 Solid 라도 팔레트를 갈라 쓰지 않는다.
   */
  it('잉크 컨테이너 안은 흰 본체 + 반전 강조색이다', () => {
    const solid = render({ height: 32, container: true })

    expect(solid).toContain('data-role="container" fill="#191f28"')
    expect(solid).toContain('fill="#ffffff"')
    expect(solid).toContain('fill="#12a47c"')
    expect(solid).not.toContain('#00795c')

    const primary = render({ height: 180, container: true })

    expect(primary).toContain('fill="#252d3a"')
    expect(primary).not.toContain('#edf0f3')
  })

  it('컨테이너 inverse 는 바탕을 흰색, 심볼을 잉크로 반전한다', () => {
    const svg = render({ height: 32, container: true, tone: 'inverse' })

    expect(svg).toContain('data-role="container" fill="#ffffff"')
    expect(svg).toContain('fill="#191f28"')
  })
})

describe('BrandMark 접근성', () => {
  it('title 이 없으면 장식으로 숨긴다', () => {
    const svg = render({ height: 32 })

    expect(svg).toContain('aria-hidden="true"')
    expect(svg).not.toContain('<title>')
  })

  it('title 을 주면 이미지로 노출한다', () => {
    const svg = render({ height: 32, title: 'BossPickSeoul' })

    expect(svg).toContain('role="img"')
    expect(svg).toContain('<title>BossPickSeoul</title>')
    expect(svg).not.toContain('aria-hidden')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd frontend && pnpm vitest run src/components/brand/brand-mark.test.ts`
Expected: FAIL — `Failed to resolve import "./brand-mark"`

- [ ] **Step 3: 컴포넌트를 만든다**

`frontend/src/components/brand/brand-mark.tsx`:

```tsx
import {
  BRAND_ACCENT,
  BRAND_GHOST,
  BRAND_INK,
  BRAND_INVERSE_ACCENT,
  BRAND_INVERSE_BODY,
  BRAND_INVERSE_GHOST,
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

const paletteFor = (tone: BrandMarkTone, container: boolean): Palette => {
  if (tone === 'inverse') {
    return container
      ? {
          body: BRAND_INK,
          ghost: BRAND_GHOST,
          accent: BRAND_ACCENT,
          container: BRAND_INVERSE_BODY,
        }
      : {
          body: BRAND_INVERSE_BODY,
          ghost: BRAND_INVERSE_GHOST,
          accent: BRAND_INVERSE_ACCENT,
          container: BRAND_INK,
        }
  }

  return container
    ? {
        body: BRAND_INVERSE_BODY,
        ghost: BRAND_INVERSE_GHOST,
        accent: BRAND_INVERSE_ACCENT,
        container: BRAND_INK,
      }
    : {
        body: BRAND_INK,
        ghost: BRAND_GHOST,
        accent: BRAND_ACCENT,
        container: BRAND_INVERSE_BODY,
      }
}

const cellsFor = (
  variant: BrandMarkVariant,
): { body: readonly MarkCell[]; ghost: readonly MarkCell[]; accent: MarkCell } =>
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
  const markHeight = container ? Math.floor(height * 0.625) : height
  const resolved = variant ?? resolveMarkVariant(markHeight)

  const box = viewBoxFor(resolved)
  const module = moduleFor(resolved)
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
      width={module}
      height={module}
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
        rx={round(side * 0.25)}
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
```

- [ ] **Step 4: 통과를 확인한다**

Run: `cd frontend && pnpm vitest run src/components/brand/brand-mark.test.ts`
Expected: PASS — 13 tests

- [ ] **Step 5: 커밋한다**

```bash
git add frontend/src/components/brand/brand-mark.tsx frontend/src/components/brand/brand-mark.test.ts
git commit -m "[FE] feat: BrandMark 심볼 컴포넌트를 만든다

styled-components 를 쓰지 않는다 - 이 컴포넌트가 내는 SVG 문자열이 정적
브랜드 파일의 기준이고 서버 컴포넌트에서도 쓰여야 한다.

컨테이너 모드는 뷰박스를 심볼 박스 단위(44.8 / 54.4)로 잡는다. 픽셀 단위로
계산하면 오프셋이 10.2857 같은 값이 되는데, 심볼 박스 단위면 소수 한 자리로
떨어져 정적 파일과 대조하기 쉽다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: 정적 SVG 자산과 계약 테스트

**Files:**
- Create: `frontend/public/brand/mark-primary.svg`
- Create: `frontend/public/brand/mark-grid.svg`
- Create: `frontend/public/brand/mark-solid.svg`
- Create: `frontend/app/icon.svg`
- Test: `frontend/src/lib/brand/brand-assets.test.ts`

**Interfaces:**
- Consumes: Task 1 전체
- Produces: 정적 파일 4개. `app/icon.svg` 는 Next.js App Router 관례로 파비콘이 된다(별도 메타 설정 불필요).

- [ ] **Step 1: 실패하는 계약 테스트를 쓴다**

`frontend/src/lib/brand/brand-assets.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  BRAND_ACCENT,
  BRAND_GHOST,
  BRAND_INK,
  BRAND_INVERSE_ACCENT,
  BRAND_INVERSE_BODY,
  GRID_ACCENT_CELL,
  GRID_BODY_CELLS,
  GRID_GHOST_CELLS,
  SOLID_ACCENT_CELL,
  SOLID_BODY_CELLS,
  containerSideFor,
  type MarkCell,
} from './mark-geometry'

/**
 * 정적 SVG 는 손으로 쓸 수밖에 없다(React 로 빌드 타임 생성을 하면 파일이
 * 저장소에 남지 않는다). 그래서 기하 모듈과 어긋나지 않도록 여기서 묶는다.
 * 좌표를 한쪽만 고치면 이 테스트가 깨진다.
 */

const projectRoot = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../..',
)

const readAsset = (relative: string): string =>
  readFileSync(path.join(projectRoot, relative), 'utf8')

type ParsedRect = { x: number; y: number; fill: string; container: boolean }

const parseRects = (svg: string): ParsedRect[] =>
  [...svg.matchAll(/<rect\b[^>]*>/g)].map(([tag]) => ({
    x: Number(/\bx="([-\d.]+)"/.exec(tag)?.[1] ?? '0'),
    y: Number(/\by="([-\d.]+)"/.exec(tag)?.[1] ?? '0'),
    fill: (/\bfill="([^"]+)"/.exec(tag)?.[1] ?? '').toLowerCase(),
    container: /data-role="container"/.test(tag),
  }))

const signature = (
  cells: readonly MarkCell[],
  fill: string,
): string[] => cells.map(cell => `${cell.x},${cell.y},${fill}`).sort()

const rectSignature = (rects: ParsedRect[]): string[] =>
  rects
    .filter(rect => !rect.container)
    .map(rect => `${rect.x},${rect.y},${rect.fill}`)
    .sort()

describe('public/brand/mark-primary.svg', () => {
  const svg = readAsset('public/brand/mark-primary.svg')

  it('viewBox 가 격자 박스다', () => {
    expect(svg).toContain('viewBox="0 0 19 34"')
  })

  it('본체 17 · 고스트 7 · 강조 1 을 기하 모듈과 똑같이 그린다', () => {
    expect(rectSignature(parseRects(svg))).toEqual(
      [
        ...signature(GRID_BODY_CELLS, BRAND_INK),
        ...signature(GRID_GHOST_CELLS, BRAND_GHOST),
        ...signature([GRID_ACCENT_CELL], BRAND_ACCENT),
      ].sort(),
    )
  })
})

describe('public/brand/mark-grid.svg', () => {
  const svg = readAsset('public/brand/mark-grid.svg')

  it('고스트 없이 본체 17 + 강조 1 만 그린다', () => {
    expect(svg).toContain('viewBox="0 0 19 34"')
    expect(svg.toLowerCase()).not.toContain(BRAND_GHOST)
    expect(rectSignature(parseRects(svg))).toEqual(
      [
        ...signature(GRID_BODY_CELLS, BRAND_INK),
        ...signature([GRID_ACCENT_CELL], BRAND_ACCENT),
      ].sort(),
    )
  })
})

describe('public/brand/mark-solid.svg', () => {
  const svg = readAsset('public/brand/mark-solid.svg')

  it('갭 없는 16x28 박스에 본체 17 + 강조 1 을 그린다', () => {
    expect(svg).toContain('viewBox="0 0 16 28"')
    expect(rectSignature(parseRects(svg))).toEqual(
      [
        ...signature(SOLID_BODY_CELLS, BRAND_INK),
        ...signature([SOLID_ACCENT_CELL], BRAND_ACCENT),
      ].sort(),
    )
  })
})

describe('app/icon.svg (파비콘)', () => {
  const svg = readAsset('app/icon.svg')

  it('컨테이너 비례가 명세대로다', () => {
    const side = containerSideFor('solid')

    expect(svg).toContain(`viewBox="0 0 ${side} ${side}"`)
    expect(svg).toContain(`rx="${side * 0.25}"`)
    expect(svg).toContain(`data-role="container" fill="${BRAND_INK}"`)
  })

  it('컨테이너 안에서 심볼을 중앙에 놓는다', () => {
    expect(svg).toContain('translate(14.4 8.4)')
  })

  // 본체가 흰색이므로 강조색도 반전값이다. 라이트 강조색을 쓰면 안 된다.
  it('흰 본체 17 + 반전 강조 1 을 기하 모듈과 똑같이 그린다', () => {
    expect(rectSignature(parseRects(svg))).toEqual(
      [
        ...signature(SOLID_BODY_CELLS, BRAND_INVERSE_BODY),
        ...signature([SOLID_ACCENT_CELL], BRAND_INVERSE_ACCENT),
      ].sort(),
    )
    expect(svg.toLowerCase()).not.toContain(BRAND_ACCENT)
  })

  /** 노치를 채우면 실루엣이 사각형이 되어 B 가 죽는다. */
  it('노치를 채우지 않는다', () => {
    const filled = new Set(
      parseRects(svg)
        .filter(rect => !rect.container)
        .map(rect => `${rect.x},${rect.y}`),
    )

    expect(filled.has('12,0')).toBe(false)
    expect(filled.has('12,12')).toBe(false)
    expect(filled.has('12,24')).toBe(false)
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd frontend && pnpm vitest run src/lib/brand/brand-assets.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open '.../public/brand/mark-primary.svg'`

- [ ] **Step 3: `public/brand/mark-primary.svg` 를 만든다**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 34" width="19" height="34" role="img" aria-labelledby="t"><title id="t">BossPickSeoul</title><rect x="5" y="5" width="4" height="4" fill="#edf0f3"/><rect x="10" y="5" width="4" height="4" fill="#edf0f3"/><rect x="5" y="10" width="4" height="4" fill="#edf0f3"/><rect x="10" y="10" width="4" height="4" fill="#edf0f3"/><rect x="5" y="20" width="4" height="4" fill="#edf0f3"/><rect x="10" y="20" width="4" height="4" fill="#edf0f3"/><rect x="5" y="25" width="4" height="4" fill="#edf0f3"/><rect x="0" y="0" width="4" height="4" fill="#191f28"/><rect x="5" y="0" width="4" height="4" fill="#191f28"/><rect x="10" y="0" width="4" height="4" fill="#191f28"/><rect x="0" y="5" width="4" height="4" fill="#191f28"/><rect x="15" y="5" width="4" height="4" fill="#191f28"/><rect x="0" y="10" width="4" height="4" fill="#191f28"/><rect x="15" y="10" width="4" height="4" fill="#191f28"/><rect x="0" y="15" width="4" height="4" fill="#191f28"/><rect x="5" y="15" width="4" height="4" fill="#191f28"/><rect x="10" y="15" width="4" height="4" fill="#191f28"/><rect x="0" y="20" width="4" height="4" fill="#191f28"/><rect x="15" y="20" width="4" height="4" fill="#191f28"/><rect x="0" y="25" width="4" height="4" fill="#191f28"/><rect x="15" y="25" width="4" height="4" fill="#191f28"/><rect x="0" y="30" width="4" height="4" fill="#191f28"/><rect x="5" y="30" width="4" height="4" fill="#191f28"/><rect x="10" y="30" width="4" height="4" fill="#191f28"/><rect x="10" y="25" width="4" height="4" fill="#00795c"/></svg>
```

- [ ] **Step 4: `public/brand/mark-grid.svg` 를 만든다**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 34" width="19" height="34" role="img" aria-labelledby="t"><title id="t">BossPickSeoul</title><rect x="0" y="0" width="4" height="4" fill="#191f28"/><rect x="5" y="0" width="4" height="4" fill="#191f28"/><rect x="10" y="0" width="4" height="4" fill="#191f28"/><rect x="0" y="5" width="4" height="4" fill="#191f28"/><rect x="15" y="5" width="4" height="4" fill="#191f28"/><rect x="0" y="10" width="4" height="4" fill="#191f28"/><rect x="15" y="10" width="4" height="4" fill="#191f28"/><rect x="0" y="15" width="4" height="4" fill="#191f28"/><rect x="5" y="15" width="4" height="4" fill="#191f28"/><rect x="10" y="15" width="4" height="4" fill="#191f28"/><rect x="0" y="20" width="4" height="4" fill="#191f28"/><rect x="15" y="20" width="4" height="4" fill="#191f28"/><rect x="0" y="25" width="4" height="4" fill="#191f28"/><rect x="15" y="25" width="4" height="4" fill="#191f28"/><rect x="0" y="30" width="4" height="4" fill="#191f28"/><rect x="5" y="30" width="4" height="4" fill="#191f28"/><rect x="10" y="30" width="4" height="4" fill="#191f28"/><rect x="10" y="25" width="4" height="4" fill="#00795c"/></svg>
```

- [ ] **Step 5: `public/brand/mark-solid.svg` 를 만든다**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 28" width="16" height="28" role="img" aria-labelledby="t"><title id="t">BossPickSeoul</title><rect x="0" y="0" width="4" height="4" fill="#191f28"/><rect x="4" y="0" width="4" height="4" fill="#191f28"/><rect x="8" y="0" width="4" height="4" fill="#191f28"/><rect x="0" y="4" width="4" height="4" fill="#191f28"/><rect x="12" y="4" width="4" height="4" fill="#191f28"/><rect x="0" y="8" width="4" height="4" fill="#191f28"/><rect x="12" y="8" width="4" height="4" fill="#191f28"/><rect x="0" y="12" width="4" height="4" fill="#191f28"/><rect x="4" y="12" width="4" height="4" fill="#191f28"/><rect x="8" y="12" width="4" height="4" fill="#191f28"/><rect x="0" y="16" width="4" height="4" fill="#191f28"/><rect x="12" y="16" width="4" height="4" fill="#191f28"/><rect x="0" y="20" width="4" height="4" fill="#191f28"/><rect x="12" y="20" width="4" height="4" fill="#191f28"/><rect x="0" y="24" width="4" height="4" fill="#191f28"/><rect x="4" y="24" width="4" height="4" fill="#191f28"/><rect x="8" y="24" width="4" height="4" fill="#191f28"/><rect x="8" y="20" width="4" height="4" fill="#00795c"/></svg>
```

- [ ] **Step 6: `app/icon.svg` 를 만든다**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44.8 44.8" width="44.8" height="44.8" role="img" aria-labelledby="t"><title id="t">BossPickSeoul</title><rect data-role="container" fill="#191f28" width="44.8" height="44.8" rx="11.2"/><g transform="translate(14.4 8.4)"><rect x="0" y="0" width="4" height="4" fill="#ffffff"/><rect x="4" y="0" width="4" height="4" fill="#ffffff"/><rect x="8" y="0" width="4" height="4" fill="#ffffff"/><rect x="0" y="4" width="4" height="4" fill="#ffffff"/><rect x="12" y="4" width="4" height="4" fill="#ffffff"/><rect x="0" y="8" width="4" height="4" fill="#ffffff"/><rect x="12" y="8" width="4" height="4" fill="#ffffff"/><rect x="0" y="12" width="4" height="4" fill="#ffffff"/><rect x="4" y="12" width="4" height="4" fill="#ffffff"/><rect x="8" y="12" width="4" height="4" fill="#ffffff"/><rect x="0" y="16" width="4" height="4" fill="#ffffff"/><rect x="12" y="16" width="4" height="4" fill="#ffffff"/><rect x="0" y="20" width="4" height="4" fill="#ffffff"/><rect x="12" y="20" width="4" height="4" fill="#ffffff"/><rect x="0" y="24" width="4" height="4" fill="#ffffff"/><rect x="4" y="24" width="4" height="4" fill="#ffffff"/><rect x="8" y="24" width="4" height="4" fill="#ffffff"/><rect x="8" y="20" width="4" height="4" fill="#12a47c"/></g></svg>
```

- [ ] **Step 7: 통과를 확인한다**

Run: `cd frontend && pnpm vitest run src/lib/brand/brand-assets.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 8: 커밋한다**

```bash
git add frontend/public/brand frontend/app/icon.svg frontend/src/lib/brand/brand-assets.test.ts
git commit -m "[FE] feat: 브랜드 심볼 정적 SVG 와 파비콘을 추가한다

정적 SVG 는 손으로 쓸 수밖에 없으니 기하 모듈과 대조하는 계약 테스트로
묶는다. 좌표를 한쪽만 고치면 테스트가 깨진다.

app/icon.svg 는 App Router 관례로 파비콘이 된다 - 별도 메타 설정이 없다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: BrandLockup 컴포넌트

**Files:**
- Create: `frontend/src/components/brand/brand-lockup.tsx`
- Test: `frontend/src/components/brand/brand-lockup.test.ts`

**Interfaces:**
- Consumes: Task 3의 `BrandMark`, `BrandMarkTone`
- Produces:
  - `type BrandLockupProps = { orientation?: 'horizontal' | 'vertical'; markHeight?: number; wordmarkSize?: number; tone?: BrandMarkTone }`
  - `default export BrandLockup(props: BrandLockupProps): JSX.Element`

**주의:** `site-footer.tsx` 와 같은 형태로 쓴다 — styled-components 를 쓰고 `'use client'` 는 붙이지 않는다. 저장소에서 이미 동작하는 패턴이다. `pnpm qa:verify` 의 `build` 가 이걸 검증한다. 빌드가 클라이언트 경계를 요구하면 `'use client'` 를 파일 첫 줄에 추가한다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`frontend/src/components/brand/brand-lockup.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import BrandLockup, { type BrandLockupProps } from './brand-lockup'

const squeeze = (css: string): string => css.replace(/\s+/g, '')

const renderLockup = (
  props: BrandLockupProps = {},
): { html: string; css: string } => {
  const styleSheet = new ServerStyleSheet()

  try {
    const html = renderToStaticMarkup(
      styleSheet.collectStyles(createElement(BrandLockup, props)),
    )
    return { html, css: squeeze(styleSheet.getStyleTags()) }
  } finally {
    styleSheet.seal()
  }
}

describe('BrandLockup 워드마크', () => {
  /**
   * 13자를 전부 700 으로 두면 헤더에서 한 덩어리로 뭉친다. 무게 분리는
   * 이름의 의미 구조(브랜드 + 지역)와도 일치한다 — 브라우저 실측으로 확정.
   */
  it('BossPick 700 과 Seoul 400 으로 무게를 분리한다', () => {
    const { html, css } = renderLockup()

    expect(html).toContain('BossPick')
    expect(html).toContain('Seoul')
    expect(css).toContain('font-weight:700;')
    expect(css).toContain('font-weight:400;')
  })

  it('이름 전체가 한 문자열로 읽힌다', () => {
    const { html } = renderLockup()

    expect(html.replace(/<[^>]*>/g, '')).toContain('BossPickSeoul')
  })

  it('워드마크를 조판 규약대로 그린다', () => {
    const { css } = renderLockup()

    expect(css).toContain('font-size:19px;')
    expect(css).toContain('line-height:28px;')
    expect(css).toContain('letter-spacing:-0.01em;')
    expect(css).toContain('white-space:nowrap;')
  })

  it('워드마크 크기를 바꾸면 줄 높이가 비례한다', () => {
    const { css } = renderLockup({ wordmarkSize: 38 })

    expect(css).toContain('font-size:38px;')
    expect(css).toContain('line-height:56px;')
  })
})

describe('BrandLockup 심볼', () => {
  it('기본은 컨테이너 32px 이고 그 안은 Solid 다', () => {
    const { html } = renderLockup()

    expect(html).toContain('width="32"')
    expect(html).toContain('viewBox="0 0 44.8 44.8"')
  })

  it('심볼은 장식으로 숨긴다 — 워드마크가 이름을 읽어준다', () => {
    const { html } = renderLockup()

    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('<title>')
  })

  it('markHeight 를 키우면 컨테이너가 격자를 담는다', () => {
    const { html } = renderLockup({ markHeight: 64 })

    expect(html).toContain('width="64"')
    expect(html).toContain('viewBox="0 0 54.4 54.4"')
  })
})

describe('BrandLockup 배치', () => {
  it('가로형이 기본이고 간격은 컨테이너의 25% 다', () => {
    const { css } = renderLockup()

    expect(css).toContain('flex-direction:row;')
    expect(css).toContain('gap:8px;')
    expect(css).toContain('align-items:center;')
  })

  it('세로형은 심볼 위 워드마크 아래로 쌓는다', () => {
    const { css } = renderLockup({ orientation: 'vertical', markHeight: 48 })

    expect(css).toContain('flex-direction:column;')
    expect(css).toContain('gap:12px;')
  })
})

describe('BrandLockup 톤', () => {
  it('ink 톤은 워드마크를 본문 최강색으로 그린다', () => {
    const { css } = renderLockup()

    expect(css).toContain('color:var(--color-text-900);')
  })

  it('inverse 톤은 워드마크를 흰색으로, 컨테이너를 반전한다', () => {
    const { html, css } = renderLockup({ tone: 'inverse' })

    expect(css).toContain('color:#ffffff;')
    expect(html).toContain('data-role="container" fill="#ffffff"')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd frontend && pnpm vitest run src/components/brand/brand-lockup.test.ts`
Expected: FAIL — `Failed to resolve import "./brand-lockup"`

- [ ] **Step 3: 컴포넌트를 만든다**

`frontend/src/components/brand/brand-lockup.tsx`:

```tsx
import styled from 'styled-components'

import BrandMark, { type BrandMarkTone } from '@/components/brand/brand-mark'

/**
 * 심볼 + 워드마크 락업.
 *
 * 심볼 단독으로는 락업이 성립하지 않는다 — 격자 심볼의 비례가 0.559 라
 * 텍스트 높이에 맞추면 폭 15px 의 조각이 되어 장식 불릿처럼 보인다.
 * 정사각 컨테이너가 그 문제를 해결한다(브라우저 실측으로 확인).
 *
 * 워드마크는 `BossPick` 700 + `Seoul` 400 으로 무게를 나눈다. 13자를 전부
 * 700 으로 두면 헤더에서 덩어리로 뭉친다.
 */

export type BrandLockupProps = {
  orientation?: 'horizontal' | 'vertical'
  /** 정사각 컨테이너의 변 길이(px). */
  markHeight?: number
  wordmarkSize?: number
  tone?: BrandMarkTone
}

const Root = styled.span<{ $vertical: boolean; $gap: number }>`
  display: inline-flex;
  flex-direction: ${props => (props.$vertical ? 'column' : 'row')};
  align-items: center;
  gap: ${props => props.$gap}px;
`

const Wordmark = styled.span<{ $size: number; $inverse: boolean }>`
  color: ${props =>
    props.$inverse ? '#ffffff' : 'var(--color-text-900)'};
  font-size: ${props => props.$size}px;
  /* 푸터 크기 15px 에서 22.105... 가 나오므로 반올림한다. 19→28, 38→56 은 그대로다. */
  line-height: ${props => Math.round((props.$size * 28) / 19)}px;
  letter-spacing: -0.01em;
  white-space: nowrap;
`

const Strong = styled.span`
  font-weight: 700;
`

const Regular = styled.span`
  font-weight: 400;
`

export default function BrandLockup({
  orientation = 'horizontal',
  markHeight = 32,
  wordmarkSize = 19,
  tone = 'ink',
}: BrandLockupProps) {
  return (
    <Root $vertical={orientation === 'vertical'} $gap={markHeight * 0.25}>
      <BrandMark height={markHeight} container tone={tone} />
      <Wordmark $size={wordmarkSize} $inverse={tone === 'inverse'}>
        <Strong>BossPick</Strong>
        <Regular>Seoul</Regular>
      </Wordmark>
    </Root>
  )
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `cd frontend && pnpm vitest run src/components/brand/brand-lockup.test.ts`
Expected: PASS — 10 tests

- [ ] **Step 5: 커밋한다**

```bash
git add frontend/src/components/brand/brand-lockup.tsx frontend/src/components/brand/brand-lockup.test.ts
git commit -m "[FE] feat: BrandLockup 락업 컴포넌트를 만든다

심볼 비례가 0.559 라 텍스트 높이에 맞추면 얇은 조각이 되어 장식 불릿처럼
보인다. 정사각 컨테이너로 감싸는 것이 락업 성립 조건이다.

워드마크는 BossPick 700 + Seoul 400 으로 무게를 나눈다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: 헤더·푸터에 락업을 반영한다

**Files:**
- Modify: `frontend/src/components/layout/site-header.tsx` (`Brand` 정의 57~66행, 사용 502~515행)
- Modify: `frontend/src/components/layout/site-footer.tsx` (`Title` 25~31행, 사용 43행)

**Interfaces:**
- Consumes: Task 5의 `BrandLockup`
- Produces: 없음(최종 소비자)

- [ ] **Step 1: 헤더 락업이 유지되는지 확인하는 테스트를 쓴다**

`frontend/src/components/brand/brand-lockup.test.ts` **맨 끝에 추가**한다. 헤더 전체를 렌더하면 `usePathname`·zustand·react-query가 걸려 node 환경에서 무거워지므로, 헤더가 쓰는 **설정값**을 락업 쪽에서 못박는다:

```ts
/**
 * 헤더 계약. `site-header.tsx` 의 `Brand` 는 `min-height: 40px` 이고
 * 워드마크는 19px 이다. 컨테이너 32px 는 그 안에 여유 있게 들어가고,
 * 격자를 살리려면 46px 가 필요해 들어가지 않는다 — 그래서 Solid 다.
 */
describe('헤더 기본값 계약', () => {
  // 32px 컨테이너는 헤더 min-height 40px 안에 여유 있게 들어간다.
  // 실제 여유 공간은 Step 7 의 브라우저 실측이 검증한다.
  it('기본 컨테이너는 32px 다', () => {
    const { html } = renderLockup()

    expect(html).toContain('width="32"')
  })

  it('기본 컨테이너는 격자가 아니라 Solid 를 담는다', () => {
    const { html } = renderLockup()

    // 심볼 높이는 floor(32 × 0.625) = 20px. 그 크기의 격자 갭은 0.59px 로
    // 무너지므로 갭 없는 Solid 박스(16×28 → 컨테이너 44.8)여야 한다.
    expect(html).toContain('viewBox="0 0 44.8 44.8"')
    expect(html).not.toContain('viewBox="0 0 54.4 54.4"')
  })

  it('푸터 크기(24px 컨테이너 / 15px 워드마크)도 Solid 를 담는다', () => {
    const { html, css } = renderLockup({ markHeight: 24, wordmarkSize: 15 })

    expect(html).toContain('width="24"')
    expect(html).toContain('viewBox="0 0 44.8 44.8"')
    expect(css).toContain('font-size:15px;')
    expect(css).toContain('gap:6px;')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd frontend && pnpm vitest run src/components/brand/brand-lockup.test.ts`
Expected: PASS — 이 테스트들은 Task 5 구현으로 이미 통과한다. 통과하지 않으면 Task 5를 다시 본다. (계약을 문서화하는 테스트라 실패 단계가 없다.)

- [ ] **Step 3: 헤더를 고친다**

`frontend/src/components/layout/site-header.tsx`.

먼저 import 블록에 추가한다(`import { shellWidth } from '@/styles/layout'` 바로 위):

```ts
import BrandLockup from '@/components/brand/brand-lockup'
```

`Brand` 정의(57~66행)를 아래로 교체한다. **폰트 속성을 뺀다** — 조판은 이제 락업이 책임진다:

```ts
const Brand = styled(Link)`
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  /* 조판은 BrandLockup 이 책임진다 — 여기서 폰트를 주면 두 곳이 싸운다. */
`
```

`Brand` 사용부(502~515행)의 텍스트 `BossPickSeoul` 을 락업으로 바꾼다:

```tsx
        <Brand
          href="/"
          aria-label="BossPickSeoul 홈"
          onClick={event => {
            setIsMobileOpen(false)
            setIsDropdownOpen(false)

            if (isHome) {
              event.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }}
        >
          <BrandLockup />
        </Brand>
```

- [ ] **Step 4: 푸터를 고친다**

`frontend/src/components/layout/site-footer.tsx`.

import 블록에 추가한다:

```ts
import BrandLockup from '@/components/brand/brand-lockup'
```

`Title` styled 선언(25~31행)을 아래 래퍼로 **교체한다**. `Inner` 는 건드리지 않는다:

```ts
/**
 * 락업 전용 블록 래퍼. `BrandLockup` 의 루트는 `inline-flex` 라서 블록
 * `<p>` 형제 옆에 그냥 두면 줄상자가 생긴다. `Inner > span` 같은 요소
 * 선택자로 겨냥하면 락업 구현이 바뀔 때 조용히 깨지므로 명시적으로 감싼다.
 * 간격 6px 은 기존 `Title` 의 `margin-bottom` 을 그대로 이어받는다.
 */
const LockupRow = styled.div`
  margin-bottom: 6px;
`
```

`SiteFooter` 본문에서 `<Title>BossPickSeoul</Title>` 을 바꾼다:

```tsx
        <LockupRow>
          <BrandLockup markHeight={24} wordmarkSize={15} />
        </LockupRow>
```

- [ ] **Step 5: 테스트를 돌린다**

Run: `cd frontend && pnpm test`
Expected: PASS

- [ ] **Step 6: `qa:verify` 를 돌린다**

Run: `cd frontend && pnpm qa:verify`
Expected: PASS

빌드가 `brand-lockup.tsx` 에서 클라이언트 경계를 요구하면 파일 첫 줄에 `'use client'` 를 넣고 다시 돌린다.

- [ ] **Step 7: `.next` 를 정리하고 dev 서버로 실측한다**

`qa:verify` 는 `pnpm build` 를 포함하므로 `.next/` 에 프로덕션 산출물이 섞인다. 이 상태로 dev 를 띄우면 관계없는 하이드레이션 오류가 뜬다.

```bash
cd frontend && rm -rf .next && PORT=5173 ./node_modules/.bin/next dev -p 5173
```

Bash 백그라운드로 띄우고 `curl` 로 준비를 확인한 뒤 `preview_start({ url: "http://localhost:5173" })` 로 붙는다. `preview_start` 는 `.worktrees/` 안의 바이너리를 직접 실행하지 못한다.

확인할 것:
- 홈(`/`)을 콜드 로드한다. 나머지 화면은 **클릭으로** 이동한다(`useSearchParams` 경계가 있는 라우트는 콜드 로드에서 Suspense 가 안 풀린다).
- 헤더 락업이 `min-height: 40px` 안에 들어가고 내비게이션과 겹치지 않는다.
- `resize_window` 로 데스크톱·태블릿(768)·모바일(375)에서 락업이 깨지지 않고 `document.body.scrollWidth === innerWidth` 다.
- 파비콘이 탭에 뜬다.
- 픽셀 선명도를 볼 때는 `resize_window` 를 pane 크기와 같게 줘서 DPR 1 · 1:1 캡처로 만든다. 축소 캡처로는 1px 미만 디테일을 판단할 수 없다.

- [ ] **Step 8: 커밋한다**

```bash
git add frontend/src/components/layout/site-header.tsx frontend/src/components/layout/site-footer.tsx frontend/src/components/brand/brand-lockup.test.ts
git commit -m "[FE] feat: 헤더와 푸터를 브랜드 락업으로 바꾼다

Brand·Title 에서 폰트 속성을 뺀다 - 조판을 두 곳에서 주면 싸운다.
헤더 링크에 aria-label 을 붙였다. 심볼은 장식으로 숨기고 워드마크가
이름을 읽어주지만, 링크 자체의 목적지는 따로 알려줘야 한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: apple-icon 과 opengraph-image

**Files:**
- Create: `frontend/app/apple-icon.tsx`
- Create: `frontend/app/opengraph-image.tsx`

**Interfaces:**
- Consumes: Task 1 전체
- Produces: 없음(App Router 관례 파일). `app/layout.tsx` 의 메타 설정은 **건드리지 않는다** — Next 가 이 파일들을 자동으로 붙인다.

**주의:** `BrandMark` 를 재사용하지 않는다. satori(`next/og`)는 SVG 지원이 제한적이라 절대 위치 `div` 로 그리는 것이 안전하다. 텍스트를 넣지 않으므로 폰트를 싣지 않는다 — satori 는 **WOFF2 를 지원하지 않고** 저장소에는 WOFF2 만 있다.

- [ ] **Step 1: `app/apple-icon.tsx` 를 만든다**

```tsx
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
    (
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
      </div>
    ),
    { ...size },
  )
}
```

- [ ] **Step 2: `app/opengraph-image.tsx` 를 만든다**

```tsx
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
    (
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
      </div>
    ),
    { ...size },
  )
}
```

- [ ] **Step 3: 빌드가 두 라우트를 생성하는지 확인한다**

Run: `cd frontend && pnpm qa:verify`
Expected: PASS. 빌드 출력에 `/apple-icon` 과 `/opengraph-image` 가 라우트로 나타난다.

- [ ] **Step 4: 실제 이미지를 눈으로 확인한다**

```bash
cd frontend && rm -rf .next && ./node_modules/.bin/next dev -p 5173
```

Bash 백그라운드로 띄운 뒤 `preview_start({ url: "http://localhost:5173/opengraph-image" })` 로 열고 스크린샷을 찍는다. `apple-icon` 도 같이 본다.

확인할 것:
- 두 이미지 모두 잉크 배경에 B 가 또렷하다.
- apple-icon 의 고스트 7칸이 흰 본체·강조 칸과 구분된다(반전 팔레트가 실제로 작동하는지).
- 강조 칸이 카운터에 녹지 않는다.

**실측 결과 이 조정이 실제로 필요했고 이미 반영됐다.** 초안의 `#333d4b`(= `grey800`)는 잉크 배경 대비 1.51 로 너무 잘 보여, 카운터가 「채워진 칸」으로 읽히고 B 판독성이 무너졌다 — 고스트 없는 OG 이미지와 나란히 놓으면 차이가 결정적이다. `#252d3a` 는 배경 대비 1.19 로 라이트 모드 고스트(1.14)의 미묘함을 맞춘다. 위 코드와 Task 1·3 은 이 값으로 갱신됐다.

- [ ] **Step 5: 커밋한다**

```bash
git add frontend/app/apple-icon.tsx frontend/app/opengraph-image.tsx
git commit -m "[FE] feat: apple-icon 과 OG 이미지를 ImageResponse 로 만든다

satori 는 WOFF2 를 지원하지 않고 저장소에는 Pretendard WOFF2 만 있다.
폴백 서체로 워드마크를 그리면 브랜드를 잘못 표현하므로 두 이미지 모두
심볼만 쓴다. 텍스트가 없으니 폰트를 싣지 않는다.

BrandMark 를 재사용하지 않는다 - satori 는 SVG 지원이 제한적이라 절대
위치 div 로 그린다. 좌표는 같은 기하 모듈에서 온다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: DESIGN.md 를 브랜드 자산 정본으로 갱신한다

**Files:**
- Modify: `frontend/DESIGN.md` (3행 프론트맷터, 40~41행 타사 컬러, 75행 서체 스택 서술, 14·21·83~92행 서체 표)
- Modify: `docs/superpowers/specs/2026-09-08-brand-logo-design.md` (명세와 다른 점 3개 반영)

**Interfaces:**
- Consumes: Task 1~7 전체
- Produces: 없음(문서)

- [ ] **Step 1: 프론트맷터를 고친다**

`frontend/DESIGN.md` 3행:

```yaml
brand: BossPickSeoul
```

`brand: Toss` 를 남겨두면 이 문서가 토스의 디자인 문서라는 뜻이 된다. 시스템이 토스에서 파생된 것은 1절 본문이 이미 서술한다.

- [ ] **Step 2: 타사 브랜드 컬러를 자체 값으로 교체한다**

40~41행의 "Brand (Logo/Marketing Only)" 항목 두 줄을 아래로 바꾼다:

```markdown
- **Brand Ink** (`#191f28`): `--color-brand-ink`. 심볼 본체와 워드마크. `grey900` 과 같은 값이다.
- **Brand Accent** (`#00795c`): `--color-brand-accent`. 강조 칸 전용. **UI 에서 절대 쓰지 않는다** — `green500`(`#03b26c`)과 계열이 같아 성공·상승 시맨틱과 혼동된다.
- **Brand Ghost** (`#edf0f3`): `--color-brand-ghost`. 고스트 칸 전용. 48px 이상에서만 등장한다.
- **반전 팔레트**: 어두운 배경에서 본체 `#ffffff`, 고스트 `#252d3a`, 강조 `#12a47c`. 강조색을 밝히는 이유는 원래 값(`#00795c`)이 반전 고스트 대비 2.04 로 무너지기 때문이다. 고스트가 `grey800`(`#333d4b`)이 아닌 이유는 그 값이 잉크 배경 대비 1.51 로 **너무 잘 보여** 카운터가 채워진 것처럼 읽히고 B 판독성이 무너지기 때문이다 — 라이트 모드 고스트는 배경 대비 1.14 이고 `#252d3a` 는 1.19 로 그 미묘함을 맞춘다.
```

- [ ] **Step 3: 서체 서술을 실제와 맞춘다**

75행 Font Family 의 **Primary** 줄을 바꾼다:

```markdown
- **Primary**: `Pretendard` (`next/font/local`, `src/lib/fonts.ts`). 400 / 500 / 600 / 700 네 무게를 싣는다. 폴백은 `'Toss Product Sans', 'Tossface', 'SF Pro KR', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', Roboto, 'Noto Sans KR', 'Malgun Gothic', system-ui, sans-serif`.
```

14행 문단 끝에 한 문장을 더한다:

```markdown
**단, 이 저장소는 Toss Product Sans 를 싣지 않는다.** `public/fonts/` 에는 Pretendard 만 있고 Toss Product Sans 는 폴백 목록에 이름만 있다. 위 서술은 원본 시스템의 설계 의도를 기록한 것이고, **실제 렌더 서체는 Pretendard** 다.
```

83~92행의 Hierarchy 표에서 Font 열의 `Toss Product Sans` 를 모두 `Pretendard` 로 바꾼다. 21행의 `- Toss Product Sans with ...` 항목도 `- Pretendard (Toss Product Sans 는 싣지 않는다 — 폴백 이름만 남아 있다)` 로 바꾼다.

- [ ] **Step 4: 브랜드 자산 섹션을 신설한다**

`## 2. Color Palette & Roles` **바로 앞**에 넣는다:

```markdown
## 1.5. Brand Assets

로고 기하의 정본은 `src/lib/brand/mark-geometry.ts` 다. 좌표를 고칠 일이 있으면 그 파일을 고치고, `src/lib/brand/brand-assets.test.ts` 가 정적 SVG 와의 일치를 지킨다. 설계 근거는 `docs/superpowers/specs/2026-09-08-brand-logo-design.md`.

### 심볼

B 이니셜을 **4열 × 7행 모듈 격자**로 재구성한다. `viewBox="0 0 19 34"`, 모듈 `4`, 갭 `1`, pitch `5`, 모서리는 각짐(`rx` 없음). 아래 카운터 2×2 중 **우하단 한 칸**을 강조색으로 채워 "여러 칸 중 하나를 골랐다"는 Pick 의미를 담는다.

**3열의 노치 3칸 `(15,0) (15,15) (15,30)`은 어떤 변형에서도 채우지 않는다.** 채우면 실루엣이 4×7 사각형이 되어 B 가 죽는다.

### 크기별 변형

| 변형 | 크기 | 구성 |
| --- | --- | --- |
| Primary | 48px+ | 격자 + 고스트 7칸 |
| Grid | 34~47px | 격자, 고스트 없음 |
| Solid | 33px 이하 | 갭 없음, `viewBox="0 0 16 28"` |

34px 에서 갭이 1px 로 렌더된다. 27px 는 0.79px, 20px 는 0.59px 로 무너진다 — 브라우저 1배율 실측. `resolveMarkVariant(height)` 가 이 규칙을 코드로 들고 있다.

### 컨테이너

정사각, `border-radius = 변 길이 × 0.25`, 심볼 높이 `= 변 길이 × 0.625`. 잉크 바탕 + 흰 심볼이 기본이고 어두운 배경에서는 흰 바탕 + 잉크 심볼로 반전한다.

심볼을 컨테이너 없이 워드마크 옆에 두면 안 된다 — 비례가 0.559 라 텍스트 높이에 맞추면 폭 15px 의 조각이 되어 장식 불릿처럼 보인다. 심볼 단독 사용은 34px 이상에서만 허용한다.

### 워드마크와 락업

`BossPick` **700** + `Seoul` **400**, `letter-spacing: -0.01em`. 13자를 전부 700 으로 두면 덩어리로 뭉친다.

가로형 기본값은 컨테이너 32px + 간격 8px + 워드마크 19px 다. 간격은 컨테이너 변의 25% 이고 최소 여백도 같다. `BrandLockup` 컴포넌트를 쓰고 조판을 호출부에서 다시 주지 않는다.

### 자산 파일

| 경로 | 용도 |
| --- | --- |
| `public/brand/mark-primary.svg` | 배포용 Primary 심볼 |
| `public/brand/mark-grid.svg` | 배포용 Grid 심볼 |
| `public/brand/mark-solid.svg` | 배포용 Solid 심볼 |
| `app/icon.svg` | 파비콘(컨테이너 + Solid) |
| `app/apple-icon.tsx` | 180×180 |
| `app/opengraph-image.tsx` | 1200×630 |

정적 **락업** SVG 는 없다. `<text>` 는 파일을 여는 사람 컴퓨터에 Pretendard 가 있어야 하고, 글자를 아웃라인 패스로 바꿀 도구가 저장소에 없다. `apple-icon` 과 OG 이미지에 워드마크가 없는 것도 같은 계열의 제약이다 — satori 는 WOFF2 를 지원하지 않고 저장소에는 WOFF2 만 있다. Pretendard TTF/OTF 를 싣는 것이 후속 과제다.
```

- [ ] **Step 5: 명세를 실제 구현과 맞춘다**

`docs/superpowers/specs/2026-09-08-brand-logo-design.md` 를 고친다:

1. §6 브랜드 컬러 표에 반전 팔레트 세 줄을 더한다 — `BRAND_INVERSE_BODY #ffffff`, `BRAND_INVERSE_GHOST #252d3a`, `BRAND_INVERSE_ACCENT #12a47c`. 근거로 "원래 강조색은 반전 고스트 대비 2.04 로 무너진다"와 "고스트는 배경 대비 1.19 여야 한다 — grey800 은 1.51 로 너무 잘 보여 카운터가 채워진 것처럼 읽힌다"를 적는다.
2. §11.1 에서 `lockup-horizontal.svg`·`lockup-vertical.svg` 행을 지우고, 그 자리에 "정적 락업 SVG 는 만들지 않는다 — `<text>` 는 뷰어 폰트에 의존하고 아웃라인화 도구가 저장소에 없다. 락업은 React 컴포넌트로만 제공한다"를 적는다.
3. §11.1 의 `apple-icon.png` / `opengraph-image.png` 를 `apple-icon.tsx` / `opengraph-image.tsx` 로 바꾸고, OG 설명에서 워드마크를 지운다. 이유로 "satori 는 WOFF2 미지원, 저장소에는 WOFF2 만 있음"을 적는다.
4. §13 리스크 표에 한 줄 더한다 — "정적 락업 파일과 OG 워드마크 부재 / Pretendard TTF·OTF 를 싣지 않아 아웃라인화·satori 렌더가 불가 / 후속 과제로 남긴다".

- [ ] **Step 6: 규약 위반이 없는지 확인한다**

```bash
cd frontend
grep -rn "0064FF\|0064ff\|202632" DESIGN.md || echo "타사 브랜드 컬러 없음"
grep -rn "brand: Toss" DESIGN.md || echo "프론트맷터 정정됨"
pnpm test
pnpm qa:verify
```

Expected: 앞의 두 `grep` 이 "없음"·"정정됨"을 출력하고, `test` 와 `qa:verify` 가 PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add frontend/DESIGN.md docs/superpowers/specs/2026-09-08-brand-logo-design.md
git commit -m "[FE] docs: DESIGN.md 를 브랜드 자산 정본으로 갱신한다

타사(토스) 브랜드 컬러 #0064FF / #202632 를 자체 값으로 교체하고
프론트맷터 brand: Toss 를 고친다. 남겨두면 이 문서가 토스의 디자인
문서라는 뜻이 된다.

서체 서술도 실제와 맞춘다 - 저장소는 Toss Product Sans 를 싣지 않고
Pretendard 만 로드한다. 원본 시스템의 설계 의도는 기록으로 남긴다.

명세에는 구현하면서 확정한 세 가지를 반영했다 - 반전 팔레트 신설,
정적 락업 SVG 제외, OG 이미지 워드마크 제외.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review 결과

계획을 다 쓰고 명세와 대조했다. 고친 것과 남은 것을 적어둔다.

**명세 커버리지** — §5 기하는 Task 1, §6 컬러는 Task 2, §7 변형은 Task 1·3, §8 컨테이너는 Task 3, §9 워드마크는 Task 5, §10 락업은 Task 5·6, §11 산출물은 Task 4·7, §12 검증은 각 Task 의 `test`·`qa:verify` 와 Task 6·7 의 브라우저 실측, §13 리스크는 Task 8 에서 명세에 반영. **§11 의 정적 락업 SVG 2개와 OG 워드마크는 의도적으로 제외**하고 이유를 계획 앞머리와 Task 8 에 적었다.

**타입 일관성** — `BrandMarkVariant`·`BrandMarkTone`·`MarkCell` 이름이 Task 1·3·5·7 에서 일치한다. `resolveMarkVariant`·`markWidthFor`·`containerSideFor`·`viewBoxFor`·`moduleFor` 다섯 함수만 모듈 밖으로 나간다.

**남은 미검증 하나** — 명세 §7.2 의 "16px·DPR 1 에서 강조 칸이 약 2.3px 라 사실상 안 보인다"는 수용한 한계다. Task 6 Step 7 에서 파비콘을 눈으로 확인하되, 안 보이는 것이 결함이 아님을 기억할 것.

**검토 중 잡은 모순 하나** — 초안은 `app/icon.svg` 의 강조 칸에 `#00795c` 를 넣었는데, 잉크 컨테이너 안에서는 본체가 흰색이라 `BrandMark` 가 반전 팔레트(`#12a47c`)를 낸다. 정적 파일과 컴포넌트가 다른 색을 내면 계약 테스트가 깨진다. **강조색은 본체 색이 결정한다**는 규칙을 Global Constraints 에 올리고, `icon.svg` 와 계약 테스트를 `#12a47c` 로 맞췄다. Task 2 의 로고 전용 가드도 두 색 모두를 막게 넓혔다.

고스트가 없는 Solid 변형에서는 `#00795c` 도 흰 본체 대비 5.40 으로 문제없지만, 팔레트를 크기에 따라 갈라 쓰면 규칙이 둘이 된다. 한 팔레트로 통일하는 쪽을 택했다.
