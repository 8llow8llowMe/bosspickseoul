# 상권 분석 결과 SVG 차트 (High 슬라이스) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 차트 라이브러리 없이 자체 SVG 프리미티브(라인·도넛·피라미드)로 트렌드 추세, 유동인구 연령×성별, 성별 분포를 효과적으로 시각화한다.

**Architecture:** 표현/데이터 분리 — API DTO는 `chart-data.ts` 순수함수로 정규화 series로 변환하고, 차트 컴포넌트는 정규화 배열만 받아 SVG를 그린다. 공통 골격(반응형 viewBox 래퍼 + 호버 툴팁)은 `charts/` 하위에 모은다. 값은 항상 노출하고 호버/포커스 시 상세 툴팁을 얹는다.

**Tech Stack:** Next.js 16 (App Router, React 19), styled-components 6, vitest 4 (`renderToStaticMarkup` 기반), 차트 라이브러리 미도입.

## Global Constraints

- 차트 라이브러리 신규 도입 금지 — SVG/semantic HTML만 (명세 D0/D3-4).
- 색상·spacing·radius는 `src/styles/global-styles.ts` 토큰만 사용. 화면 파일 임시 상수 금지 (DESIGN.md §구현 규칙).
- 한 차트 내 강조색 1 + 보조색 2 이내. 추세 배지/changeRate만 양수 `--color-positive`(green500)·음수 `--color-negative`(red500).
- `null` 값은 0으로 표시 금지 → "데이터 없음" (`formatAnalysisValue` 재사용, 명세 D6).
- hover만으로 정보가 드러나면 안 됨 — 값 상시 노출 + 툴팁은 보강 (DESIGN.md §접근성).
- 차트는 full-width·반응형·aspect 유지 (`viewBox`).
- UI 카피 전부 한국어. 완료 보고 전 `pnpm test`(vitest) + `pnpm qa:verify` 통과. 미실행 명령을 통과했다고 보고하지 않는다.
- 공통 컴포넌트는 화면 파일에 중복 정의하지 않고 `src/components/analysis/charts/`에 둔다.

## 파일 구조

| 파일 | 책임 |
| --- | --- |
| `src/lib/analysis/chart-data.ts` (신규) | DTO → 정규화 series 순수함수 (`toTrendPoints`, `toPyramidRows`, `toGenderSegments`) |
| `src/lib/analysis/chart-data.test.ts` (신규) | 위 순수함수 단위 테스트 |
| `src/components/analysis/charts/chart-frame.tsx` (신규) | 반응형 SVG 래퍼 + 툴팁 오버레이 컨테이너 |
| `src/components/analysis/charts/use-chart-tooltip.ts` (신규) | `'use client'` 호버/포커스 툴팁 상태 훅 |
| `src/components/analysis/charts/line-chart.tsx` (신규) | 분기별 라인 + 추세 배지 |
| `src/components/analysis/charts/donut-chart.tsx` (신규) | 성별 도넛(2 세그먼트) |
| `src/components/analysis/charts/population-pyramid.tsx` (신규) | 연령×성별 좌우 막대 |
| `src/components/analysis/charts/*.test.ts` (신규) | 각 차트 정적 마크업 테스트 |
| `src/styles/global-styles.ts` (수정) | `--color-chart-female`, `--color-chart-grid`, `--color-positive`/`--color-negative` 별칭 추가 |
| `src/components/analysis/analysis-result-view.tsx` (수정) | 트렌드/유동/거주/매출 탭에 차트 마운트 |
| `docs/features/analysis/result.md` (수정) | 차트 설계·피라미드 배치 정정 반영 |

---

## Task 1: 데이터 정규화 순수함수 (`chart-data.ts`)

**Files:**
- Create: `src/lib/analysis/chart-data.ts`
- Test: `src/lib/analysis/chart-data.test.ts`

**Interfaces:**
- Consumes: `formatPeriodCode` from `@/lib/analysis/presentation`; `CommercialTrend`, `CommercialFootTraffic` from `@/types/commercial-analysis`.
- Produces:
  - `type TrendPoint = { periodLabel: string; value: number | null; changeRate: number | null }`
  - `type PyramidRow = { ageLabel: string; male: number | null; female: number | null }`
  - `type GenderSegment = { label: string; value: number }`
  - `toTrendPoints(trend: CommercialTrend | null | undefined): TrendPoint[]`
  - `toPyramidRows(item: Record<string, number | null> | null | undefined): PyramidRow[]`
  - `toGenderSegments(male: number | null | undefined, female: number | null | undefined): GenderSegment[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/analysis/chart-data.test.ts
import { describe, expect, it } from 'vitest'

import {
  toTrendPoints,
  toPyramidRows,
  toGenderSegments,
} from '@/lib/analysis/chart-data'

describe('toTrendPoints', () => {
  it('periodCode를 라벨로 변환하고 null 값을 보존한다', () => {
    const points = toTrendPoints({
      periods: [
        { periodCode: '20232', value: 100, changeRate: null },
        { periodCode: '20233', value: null, changeRate: 5 },
      ],
    })
    expect(points).toEqual([
      { periodLabel: '2023년 2분기', value: 100, changeRate: null },
      { periodLabel: '2023년 3분기', value: null, changeRate: 5 },
    ])
  })

  it('빈/누락 입력은 빈 배열을 반환한다', () => {
    expect(toTrendPoints(null)).toEqual([])
    expect(toTrendPoints({ periods: null })).toEqual([])
  })
})

describe('toPyramidRows', () => {
  it('연령대별 남/여 퍼센트를 매핑하고 누락은 null로 둔다', () => {
    const rows = toPyramidRows({
      maleAge10Percent: 3,
      femaleAge10Percent: 4,
      maleAge60PlusPercent: 2,
    })
    expect(rows[0]).toEqual({ ageLabel: '10대', male: 3, female: 4 })
    expect(rows[5]).toEqual({ ageLabel: '60대+', male: 2, female: null })
    expect(rows).toHaveLength(6)
  })
})

describe('toGenderSegments', () => {
  it('존재하는 성별 값만 세그먼트로 만든다', () => {
    expect(toGenderSegments(60, 40)).toEqual([
      { label: '남성', value: 60 },
      { label: '여성', value: 40 },
    ])
    expect(toGenderSegments(null, 40)).toEqual([{ label: '여성', value: 40 }])
    expect(toGenderSegments(null, null)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/analysis/chart-data.test.ts`
Expected: FAIL — `chart-data` 모듈/함수 미정의.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/analysis/chart-data.ts
import { formatPeriodCode } from '@/lib/analysis/presentation'
import type {
  CommercialTrend,
  CommercialFootTraffic,
} from '@/types/commercial-analysis'

export type TrendPoint = {
  periodLabel: string
  value: number | null
  changeRate: number | null
}

export type PyramidRow = {
  ageLabel: string
  male: number | null
  female: number | null
}

export type GenderSegment = { label: string; value: number }

const numOrNull = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const AGE_KEYS = [
  ['10대', 'Age10'],
  ['20대', 'Age20'],
  ['30대', 'Age30'],
  ['40대', 'Age40'],
  ['50대', 'Age50'],
  ['60대+', 'Age60Plus'],
] as const

export const toTrendPoints = (
  trend: CommercialTrend | null | undefined,
): TrendPoint[] =>
  (trend?.periods ?? []).map(period => ({
    periodLabel: period.periodCode
      ? formatPeriodCode(period.periodCode)
      : '시점 정보 없음',
    value: numOrNull(period.value),
    changeRate: numOrNull(period.changeRate),
  }))

export const toPyramidRows = (
  item: Record<string, number | null> | null | undefined,
): PyramidRow[] =>
  AGE_KEYS.map(([ageLabel, key]) => ({
    ageLabel,
    male: numOrNull(item?.[`male${key}Percent`]),
    female: numOrNull(item?.[`female${key}Percent`]),
  }))

export const toGenderSegments = (
  male: number | null | undefined,
  female: number | null | undefined,
): GenderSegment[] => {
  const segments: GenderSegment[] = []
  const m = numOrNull(male)
  const f = numOrNull(female)
  if (m !== null) segments.push({ label: '남성', value: Math.max(0, m) })
  if (f !== null) segments.push({ label: '여성', value: Math.max(0, f) })
  return segments
}

// CommercialFootTraffic 은 byAgeGenderPercentItem 접근 타입 참조용으로 import 유지
export type FootTrafficAgeGender = NonNullable<
  CommercialFootTraffic['byAgeGenderPercentItem']
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/analysis/chart-data.test.ts`
Expected: PASS (3 describe 블록 모두 통과).

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/chart-data.ts src/lib/analysis/chart-data.test.ts
git commit -m "[FE] feat: 분석 차트 데이터 정규화 순수함수 추가"
```

---

## Task 2: 차트 색상 토큰 + 공통 프레임/툴팁

**Files:**
- Modify: `src/styles/global-styles.ts` (`:root` 토큰 블록에 추가)
- Create: `src/components/analysis/charts/use-chart-tooltip.ts`
- Create: `src/components/analysis/charts/chart-frame.tsx`
- Test: `src/components/analysis/charts/chart-frame.test.ts`

**Interfaces:**
- Produces:
  - CSS 토큰: `--color-chart-female`, `--color-chart-grid`, `--color-positive`, `--color-negative`
  - `useChartTooltip(): { active: TooltipState | null; show: (t: TooltipState) => void; hide: () => void }` where `type TooltipState = { x: number; y: number; label: string; value: string }`
  - `ChartFrame(props: { viewBoxWidth: number; viewBoxHeight: number; ariaLabel: string; tooltip?: TooltipState | null; children: React.ReactNode }): JSX.Element` — `position: relative` 래퍼 + 반응형 `<svg viewBox="0 0 W H">` + 툴팁 오버레이.

- [ ] **Step 1: Add color tokens**

`src/styles/global-styles.ts` 의 `:root`(또는 기존 토큰 선언 블록)에서 `--color-primary-600` 근처에 추가. 기존 green500/red500 토큰명이 있으면 그 값을 별칭으로 재사용한다(없으면 아래 hex 사용).

```css
--color-chart-female: #f2698f; /* 여성 계열: primary(blue)와 명도·색상 대비 확보 */
--color-chart-grid: rgba(25, 31, 40, 0.08); /* 옅은 그리드/축 */
--color-positive: #03b26c; /* green500 — 상승 */
--color-negative: #f04452; /* red500 — 하락 */
```

- [ ] **Step 2: Write the tooltip hook**

```ts
// src/components/analysis/charts/use-chart-tooltip.ts
'use client'

import { useCallback, useState } from 'react'

export type TooltipState = {
  x: number
  y: number
  label: string
  value: string
}

export const useChartTooltip = () => {
  const [active, setActive] = useState<TooltipState | null>(null)
  const show = useCallback((next: TooltipState) => setActive(next), [])
  const hide = useCallback(() => setActive(null), [])
  return { active, show, hide }
}
```

- [ ] **Step 3: Write ChartFrame + failing test**

```tsx
// src/components/analysis/charts/chart-frame.tsx
'use client'

import type { ReactNode } from 'react'
import styled from 'styled-components'

import type { TooltipState } from './use-chart-tooltip'

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`

const Svg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
`

const Tooltip = styled.div`
  position: absolute;
  transform: translate(-50%, -110%);
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--color-text-900);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
`

export type ChartFrameProps = {
  viewBoxWidth: number
  viewBoxHeight: number
  ariaLabel: string
  tooltip?: TooltipState | null
  children: ReactNode
}

export default function ChartFrame({
  viewBoxWidth,
  viewBoxHeight,
  ariaLabel,
  tooltip,
  children,
}: ChartFrameProps) {
  return (
    <Wrapper>
      <Svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        {children}
      </Svg>
      {tooltip ? (
        <Tooltip style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.label} · {tooltip.value}
        </Tooltip>
      ) : null}
    </Wrapper>
  )
}
```

```ts
// src/components/analysis/charts/chart-frame.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ChartFrame from '@/components/analysis/charts/chart-frame'

describe('ChartFrame', () => {
  it('viewBox와 aria-label을 가진 반응형 svg를 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(
        ChartFrame,
        { viewBoxWidth: 320, viewBoxHeight: 200, ariaLabel: '테스트 차트' },
        createElement('circle', { cx: 1, cy: 1, r: 1 }),
      ),
    )
    expect(markup).toContain('viewBox="0 0 320 200"')
    expect(markup).toContain('aria-label="테스트 차트"')
    expect(markup).toContain('role="img"')
  })
})
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm exec vitest run src/components/analysis/charts/chart-frame.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/global-styles.ts src/components/analysis/charts/
git commit -m "[FE] feat: 차트 색상 토큰과 공통 SVG 프레임·툴팁 훅 추가"
```

---

## Task 3: 분기별 라인 차트 + 트렌드 탭 마운트

**Files:**
- Create: `src/components/analysis/charts/line-chart.tsx`
- Test: `src/components/analysis/charts/line-chart.test.ts`
- Modify: `src/components/analysis/analysis-result-view.tsx` (트렌드 탭 `trends.map` 내부의 `AnalysisMetricList` → `LineChart`)

**Interfaces:**
- Consumes: `TrendPoint` (Task 1), `ChartFrame`/`useChartTooltip` (Task 2), `formatAnalysisValue` from presentation.
- Produces: `LineChart(props: { points: TrendPoint[]; unit: string; direction?: 'INCREASE' | 'DECREASE' | 'STAGNANT' | null }): JSX.Element`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/analysis/charts/line-chart.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import LineChart from '@/components/analysis/charts/line-chart'

const points = [
  { periodLabel: '2023년 1분기', value: 100, changeRate: null },
  { periodLabel: '2023년 2분기', value: 140, changeRate: 40 },
  { periodLabel: '2023년 3분기', value: 120, changeRate: -14 },
]

describe('LineChart', () => {
  it('각 시점 값과 라벨, 상승 배지를 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, { points, unit: '원', direction: 'INCREASE' }),
    )
    expect(markup).toContain('2023년 3분기')
    expect(markup).toContain('polyline')
    expect(markup).toContain('상승') // trendDirection 배지 텍스트
  })

  it('전부 null이면 데이터 없음을 안내한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, {
        points: [{ periodLabel: '2023년 3분기', value: null, changeRate: null }],
        unit: '원',
      }),
    )
    expect(markup).toContain('데이터 없음')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/analysis/charts/line-chart.test.ts`
Expected: FAIL — `LineChart` 미정의.

- [ ] **Step 3: Write implementation**

```tsx
// src/components/analysis/charts/line-chart.tsx
'use client'

import { useMemo } from 'react'
import styled from 'styled-components'

import { formatAnalysisValue } from '@/lib/analysis/presentation'
import type { TrendPoint } from '@/lib/analysis/chart-data'
import ChartFrame from './chart-frame'
import { useChartTooltip } from './use-chart-tooltip'

const W = 480
const H = 240
const PAD = { top: 28, right: 24, bottom: 36, left: 24 }

const DIRECTION_META: Record<
  'INCREASE' | 'DECREASE' | 'STAGNANT',
  { symbol: string; label: string; token: string }
> = {
  INCREASE: { symbol: '↑', label: '상승', token: 'var(--color-positive)' },
  DECREASE: { symbol: '↓', label: '하락', token: 'var(--color-negative)' },
  STAGNANT: { symbol: '→', label: '보합', token: 'var(--color-text-600)' },
}

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

const Badge = styled.span<{ $token: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  color: ${props => props.$token};
  font-size: 12px;
  font-weight: 700;
`

export type LineChartProps = {
  points: TrendPoint[]
  unit: string
  direction?: 'INCREASE' | 'DECREASE' | 'STAGNANT' | null
}

export default function LineChart({ points, unit, direction }: LineChartProps) {
  const { active, show, hide } = useChartTooltip()

  const geometry = useMemo(() => {
    const values = points
      .map(point => point.value)
      .filter((value): value is number => value !== null)
    if (values.length === 0) return null
    const max = Math.max(...values)
    const min = Math.min(...values)
    const span = max - min || 1
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const step = points.length > 1 ? innerW / (points.length - 1) : 0
    const coords = points.map((point, index) => ({
      point,
      x: PAD.left + step * index,
      y:
        point.value === null
          ? null
          : PAD.top + innerH - ((point.value - min) / span) * innerH,
    }))
    return { coords }
  }, [points])

  if (!geometry) return <Empty>데이터 없음</Empty>

  const line = geometry.coords
    .filter(coord => coord.y !== null)
    .map(coord => `${coord.x},${coord.y as number}`)
    .join(' ')

  const meta = direction ? DIRECTION_META[direction] : null

  return (
    <div>
      {meta ? (
        <Badge $token={meta.token}>
          {meta.symbol} {meta.label}
        </Badge>
      ) : null}
      <ChartFrame
        viewBoxWidth={W}
        viewBoxHeight={H}
        ariaLabel="분기별 추세 라인 차트"
        tooltip={active}
      >
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-primary-600)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {geometry.coords.map(coord =>
          coord.y === null ? null : (
            <g key={coord.point.periodLabel}>
              <circle
                cx={coord.x}
                cy={coord.y}
                r={4}
                fill="var(--color-primary-600)"
                tabIndex={0}
                role="button"
                aria-label={`${coord.point.periodLabel} ${formatAnalysisValue(coord.point.value, unit)}`}
                onMouseEnter={() =>
                  show({
                    x: coord.x,
                    y: coord.y as number,
                    label: coord.point.periodLabel,
                    value: formatAnalysisValue(coord.point.value, unit),
                  })
                }
                onFocus={() =>
                  show({
                    x: coord.x,
                    y: coord.y as number,
                    label: coord.point.periodLabel,
                    value: formatAnalysisValue(coord.point.value, unit),
                  })
                }
                onMouseLeave={hide}
                onBlur={hide}
              />
              <text
                x={coord.x}
                y={coord.y - 10}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="var(--color-text-900)"
              >
                {formatAnalysisValue(coord.point.value, unit)}
              </text>
              <text
                x={coord.x}
                y={H - 14}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-text-600)"
              >
                {coord.point.periodLabel}
              </text>
            </g>
          ),
        )}
      </ChartFrame>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm exec vitest run src/components/analysis/charts/line-chart.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into trend tab**

`src/components/analysis/analysis-result-view.tsx` 상단 import에 추가:

```tsx
import LineChart from '@/components/analysis/charts/line-chart'
import { toTrendPoints } from '@/lib/analysis/chart-data'
```

트렌드 탭(`activeTab === 'trend'`)의 `trends.map(...)` 내부에서 `AnalysisMetricList` 블록을 교체:

```tsx
<LineChart
  points={toTrendPoints(data)}
  unit={unit}
  direction={data?.trendDirection ?? null}
/>
```

- [ ] **Step 6: Verify build + commit**

Run: `pnpm exec vitest run src/components/analysis/charts/ && pnpm typecheck`
Expected: PASS / 타입 오류 없음.

```bash
git add src/components/analysis/charts/line-chart.tsx src/components/analysis/charts/line-chart.test.ts src/components/analysis/analysis-result-view.tsx
git commit -m "[FE] feat: 트렌드 탭 분기별 라인 차트 도입"
```

---

## Task 4: 성별 도넛 차트 + 거주·매출 탭 마운트

**Files:**
- Create: `src/components/analysis/charts/donut-chart.tsx`
- Test: `src/components/analysis/charts/donut-chart.test.ts`
- Modify: `src/components/analysis/analysis-result-view.tsx` (거주 탭 성별 도넛 섹션, 매출 탭 성별 매출건수 섹션)

**Interfaces:**
- Consumes: `GenderSegment` (Task 1), `ChartFrame`/`useChartTooltip` (Task 2).
- Produces: `DonutChart(props: { segments: GenderSegment[]; unit?: string; ariaLabel: string }): JSX.Element`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/analysis/charts/donut-chart.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import DonutChart from '@/components/analysis/charts/donut-chart'

describe('DonutChart', () => {
  it('세그먼트별 비율과 라벨을 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(DonutChart, {
        segments: [
          { label: '남성', value: 60 },
          { label: '여성', value: 40 },
        ],
        ariaLabel: '성별 분포',
      }),
    )
    expect(markup).toContain('남성')
    expect(markup).toContain('여성')
    expect(markup).toContain('60%')
    expect(markup).toContain('path') // 도넛 arc
  })

  it('세그먼트가 없으면 데이터 없음을 안내한다', () => {
    const markup = renderToStaticMarkup(
      createElement(DonutChart, { segments: [], ariaLabel: '성별 분포' }),
    )
    expect(markup).toContain('데이터 없음')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/analysis/charts/donut-chart.test.ts`
Expected: FAIL — `DonutChart` 미정의.

- [ ] **Step 3: Write implementation**

```tsx
// src/components/analysis/charts/donut-chart.tsx
'use client'

import styled from 'styled-components'

import type { GenderSegment } from '@/lib/analysis/chart-data'
import ChartFrame from './chart-frame'

const SIZE = 220
const R = 80
const STROKE = 34
const CENTER = SIZE / 2
const SEGMENT_TOKENS = ['var(--color-primary-600)', 'var(--color-chart-female)']

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

const Legend = styled.ul`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
`

const LegendItem = styled.li<{ $token: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-700);
  font-size: 12px;
  font-weight: 600;

  &::before {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${props => props.$token};
  }
`

const polar = (fraction: number) => {
  const angle = 2 * Math.PI * fraction - Math.PI / 2
  return { x: CENTER + R * Math.cos(angle), y: CENTER + R * Math.sin(angle) }
}

export type DonutChartProps = {
  segments: GenderSegment[]
  unit?: string
  ariaLabel: string
}

export default function DonutChart({
  segments,
  ariaLabel,
}: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  if (segments.length === 0 || total <= 0) return <Empty>데이터 없음</Empty>

  let cursor = 0
  const arcs = segments.map((segment, index) => {
    const fraction = segment.value / total
    const start = polar(cursor)
    cursor += fraction
    const end = polar(cursor)
    const largeArc = fraction > 0.5 ? 1 : 0
    const percent = Math.round(fraction * 100)
    return {
      segment,
      percent,
      token: SEGMENT_TOKENS[index % SEGMENT_TOKENS.length],
      d: `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      mid: polar(cursor - fraction / 2),
    }
  })

  return (
    <div>
      <ChartFrame
        viewBoxWidth={SIZE}
        viewBoxHeight={SIZE}
        ariaLabel={ariaLabel}
      >
        {arcs.map(arc => (
          <path
            key={arc.segment.label}
            d={arc.d}
            fill="none"
            stroke={arc.token}
            strokeWidth={STROKE}
            strokeLinecap="butt"
          />
        ))}
        {arcs.map(arc => (
          <text
            key={`${arc.segment.label}-label`}
            x={arc.mid.x}
            y={arc.mid.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fontWeight={700}
            fill="#fff"
          >
            {arc.percent}%
          </text>
        ))}
      </ChartFrame>
      <Legend>
        {arcs.map(arc => (
          <LegendItem key={arc.segment.label} $token={arc.token}>
            {arc.segment.label} {arc.percent}%
          </LegendItem>
        ))}
      </Legend>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm exec vitest run src/components/analysis/charts/donut-chart.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into 거주 + 매출 탭**

`analysis-result-view.tsx` import 추가:

```tsx
import DonutChart from '@/components/analysis/charts/donut-chart'
import { toGenderSegments } from '@/lib/analysis/chart-data'
```

거주 탭(`activeTab === 'living'`)의 "연령별 상주인구" `AnalysisResultSection` 다음에 새 섹션 추가:

```tsx
<AnalysisResultSection
  title="성별 상주인구"
  loading={populationQuery.isPending}
  error={
    populationQuery.isError ||
    isResponseError(populationQuery.data as ApiResponse<unknown>)
  }
  empty={
    toGenderSegments(population?.malePercentage, population?.femalePercentage)
      .length === 0
  }
  onRetry={() => void populationQuery.refetch()}
>
  <DonutChart
    segments={toGenderSegments(
      population?.malePercentage,
      population?.femalePercentage,
    )}
    ariaLabel="성별 상주인구 도넛"
  />
</AnalysisResultSection>
```

매출 탭(`activeTab === 'sales'`)의 `.map(...)` 블록 뒤(닫는 `</>` 직전)에 성별 매출건수 섹션 추가:

```tsx
<AnalysisResultSection
  title="성별 매출 건수"
  loading={salesQuery.isPending}
  error={
    salesQuery.isError ||
    isResponseError(salesQuery.data as ApiResponse<unknown>)
  }
  empty={
    toGenderSegments(
      sales?.countByGenderItem?.maleSalesCount,
      sales?.countByGenderItem?.femaleSalesCount,
    ).length === 0
  }
  onRetry={() => void salesQuery.refetch()}
>
  <DonutChart
    segments={toGenderSegments(
      sales?.countByGenderItem?.maleSalesCount,
      sales?.countByGenderItem?.femaleSalesCount,
    )}
    ariaLabel="성별 매출 건수 도넛"
  />
</AnalysisResultSection>
```

- [ ] **Step 6: Verify + commit**

Run: `pnpm exec vitest run src/components/analysis/charts/ && pnpm typecheck`
Expected: PASS.

```bash
git add src/components/analysis/charts/donut-chart.tsx src/components/analysis/charts/donut-chart.test.ts src/components/analysis/analysis-result-view.tsx
git commit -m "[FE] feat: 거주·매출 탭 성별 도넛 차트 도입"
```

---

## Task 5: 연령×성별 인구 피라미드 + 유동인구 탭 마운트

**Files:**
- Create: `src/components/analysis/charts/population-pyramid.tsx`
- Test: `src/components/analysis/charts/population-pyramid.test.ts`
- Modify: `src/components/analysis/analysis-result-view.tsx` (유동인구 탭에 신규 섹션)

**Interfaces:**
- Consumes: `PyramidRow` (Task 1), `ChartFrame`/`useChartTooltip` (Task 2).
- Produces: `PopulationPyramid(props: { rows: PyramidRow[]; unit?: string }): JSX.Element`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/analysis/charts/population-pyramid.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PopulationPyramid from '@/components/analysis/charts/population-pyramid'

describe('PopulationPyramid', () => {
  it('연령 라벨과 남/여 값을 좌우로 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(PopulationPyramid, {
        rows: [
          { ageLabel: '20대', male: 12, female: 18 },
          { ageLabel: '30대', male: 10, female: 8 },
        ],
        unit: '%',
      }),
    )
    expect(markup).toContain('20대')
    expect(markup).toContain('남성')
    expect(markup).toContain('여성')
    expect(markup).toContain('18%')
  })

  it('모든 값이 null이면 데이터 없음을 안내한다', () => {
    const markup = renderToStaticMarkup(
      createElement(PopulationPyramid, {
        rows: [{ ageLabel: '20대', male: null, female: null }],
        unit: '%',
      }),
    )
    expect(markup).toContain('데이터 없음')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/analysis/charts/population-pyramid.test.ts`
Expected: FAIL — `PopulationPyramid` 미정의.

- [ ] **Step 3: Write implementation**

```tsx
// src/components/analysis/charts/population-pyramid.tsx
'use client'

import styled from 'styled-components'

import { formatAnalysisValue } from '@/lib/analysis/presentation'
import type { PyramidRow } from '@/lib/analysis/chart-data'
import ChartFrame from './chart-frame'

const W = 480
const ROW_H = 30
const GAP = 8
const CENTER_LABEL_W = 60
const SIDE_PAD = 20
const MALE_TOKEN = 'var(--color-primary-600)'
const FEMALE_TOKEN = 'var(--color-chart-female)'

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

const Legend = styled.ul`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 8px;
`

const LegendItem = styled.li<{ $token: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-700);
  font-size: 12px;
  font-weight: 600;

  &::before {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: ${props => props.$token};
  }
`

export type PopulationPyramidProps = {
  rows: PyramidRow[]
  unit?: string
}

export default function PopulationPyramid({
  rows,
  unit = '%',
}: PopulationPyramidProps) {
  const values = rows.flatMap(row =>
    [row.male, row.female].filter((v): v is number => v !== null),
  )
  if (values.length === 0) return <Empty>데이터 없음</Empty>

  const max = Math.max(...values, 1)
  const half = (W - CENTER_LABEL_W) / 2 - SIDE_PAD
  const centerLeft = SIDE_PAD + half
  const centerRight = centerLeft + CENTER_LABEL_W
  const height = rows.length * (ROW_H + GAP)

  return (
    <div>
      <Legend>
        <LegendItem $token={MALE_TOKEN}>남성</LegendItem>
        <LegendItem $token={FEMALE_TOKEN}>여성</LegendItem>
      </Legend>
      <ChartFrame
        viewBoxWidth={W}
        viewBoxHeight={height}
        ariaLabel="연령별 성별 인구 피라미드"
      >
        {rows.map((row, index) => {
          const y = index * (ROW_H + GAP)
          const maleW = row.male === null ? 0 : (row.male / max) * half
          const femaleW = row.female === null ? 0 : (row.female / max) * half
          return (
            <g key={row.ageLabel}>
              <rect
                x={centerLeft - maleW}
                y={y}
                width={maleW}
                height={ROW_H}
                rx={4}
                fill={MALE_TOKEN}
              >
                <title>{`${row.ageLabel} 남성 ${formatAnalysisValue(row.male, unit)}`}</title>
              </rect>
              <rect
                x={centerRight}
                y={y}
                width={femaleW}
                height={ROW_H}
                rx={4}
                fill={FEMALE_TOKEN}
              >
                <title>{`${row.ageLabel} 여성 ${formatAnalysisValue(row.female, unit)}`}</title>
              </rect>
              <text
                x={W / 2}
                y={y + ROW_H / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={700}
                fill="var(--color-text-900)"
              >
                {row.ageLabel}
              </text>
              <text
                x={centerLeft - maleW - 6}
                y={y + ROW_H / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--color-text-600)"
              >
                {formatAnalysisValue(row.male, unit)}
              </text>
              <text
                x={centerRight + femaleW + 6}
                y={y + ROW_H / 2}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--color-text-600)"
              >
                {formatAnalysisValue(row.female, unit)}
              </text>
            </g>
          )
        })}
      </ChartFrame>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm exec vitest run src/components/analysis/charts/population-pyramid.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into 유동인구 탭**

`analysis-result-view.tsx` import 추가:

```tsx
import PopulationPyramid from '@/components/analysis/charts/population-pyramid'
import { toPyramidRows } from '@/lib/analysis/chart-data'
```

유동인구 탭(`activeTab === 'foot-traffic'`)의 세 막대 섹션 `.map(...)` 뒤(닫는 `</>` 직전)에 신규 섹션 추가:

```tsx
<AnalysisResultSection
  title="연령·성별 유동인구"
  loading={footTrafficQuery.isPending}
  error={
    footTrafficQuery.isError ||
    isResponseError(footTrafficQuery.data as ApiResponse<unknown>)
  }
  empty={
    toPyramidRows(footTraffic?.byAgeGenderPercentItem).every(
      row => row.male === null && row.female === null,
    )
  }
  onRetry={() => void footTrafficQuery.refetch()}
>
  <PopulationPyramid
    rows={toPyramidRows(footTraffic?.byAgeGenderPercentItem)}
    unit="%"
  />
</AnalysisResultSection>
```

- [ ] **Step 6: Verify + commit**

Run: `pnpm exec vitest run src/components/analysis/charts/ && pnpm typecheck`
Expected: PASS.

```bash
git add src/components/analysis/charts/population-pyramid.tsx src/components/analysis/charts/population-pyramid.test.ts src/components/analysis/analysis-result-view.tsx
git commit -m "[FE] feat: 유동인구 연령·성별 인구 피라미드 도입"
```

---

## Task 6: 정본 명세 갱신 + 전체 검증

**Files:**
- Modify: `docs/features/analysis/result.md`

- [ ] **Step 1: 명세 갱신**

`result.md`에 다음을 반영한다.

- **D0 구현 제외 범위**: "차트 라이브러리 신규 도입" 유지(자체 SVG 사용). 변경 없음 확인.
- **D3-4 지표 시각화** 행에 "자체 SVG 차트 프리미티브(라인·도넛·피라미드)를 `components/analysis/charts/`에 둔다" 명시.
- **D4-2 탭별 지연 조회** 아래 표현 규칙에 추가:
  - 트렌드: 분기별 **라인 차트** + `trendDirection` 배지(↑↓→) + `changeRate`.
  - 유동인구: `byAgeGenderPercentItem` 기반 **연령×성별 인구 피라미드** 추가.
  - 거주: 전체 성비(`malePercentage`/`femalePercentage`) **성별 도넛**. 연령별 성별 데이터 부재로 피라미드는 두지 않는다.
  - 매출: `countByGenderItem` 기반 **성별 매출건수 도넛** 추가.
- **변경 이력**에 행 추가: `1.1 | 2026-08-06 | High 슬라이스 SVG 차트(라인·도넛·피라미드) 도입, 피라미드는 데이터 근거상 유동인구에 배치 | Claude`.

- [ ] **Step 2: 전체 테스트 + 품질 검증**

Run: `pnpm test`
Expected: vitest 전부 PASS.

Run: `pnpm qa:verify`
Expected: format:check, lint, typecheck, build 전부 PASS.

- [ ] **Step 3: Commit**

```bash
git add docs/features/analysis/result.md
git commit -m "[FE] docs: 분석 결과 차트 설계 정본 명세(result.md) 반영"
```

---

## Self-Review

- **Spec coverage**: 트렌드 라인(Task 3), 유동 피라미드(Task 5), 성별 도넛 거주·매출(Task 4), 표현/데이터 분리(Task 1), 공통 프레임·토큰·툴팁(Task 2), 명세 갱신(Task 6) — 설계문서 §3~§6 전 항목 커버.
- **비목표 확인**: 시간/요일/연령 바 교체, z-score, 미러 바, 개폐업 도넛은 계획에 없음(의도적, 다음 슬라이스).
- **Type consistency**: `TrendPoint`/`PyramidRow`/`GenderSegment` 정의(Task 1)와 소비(Task 3/4/5) 일치. `ChartFrame` props(Task 2)와 사용처 일치. `toTrendPoints`/`toPyramidRows`/`toGenderSegments` 시그니처 일관.
- **데이터 필드 검증**: `byAgeGenderPercentItem`(male/femaleAge{10..60Plus}Percent), `countByGenderItem.male/femaleSalesCount`, `malePercentage`/`femalePercentage`, `trendDirection`('INCREASE'|'DECREASE'|'STAGNANT'), `CommercialTrend.periods[]` 모두 `types/commercial-analysis.ts`·OpenAPI로 확인됨.
- **주의**: `--color-text-600/700/900`, `--color-surface-muted` 등은 기존 토큰 가정 — Task 2 구현 시 `global-styles.ts`에서 실제 토큰명을 확인하고 없으면 근접 토큰으로 맞춘다.
