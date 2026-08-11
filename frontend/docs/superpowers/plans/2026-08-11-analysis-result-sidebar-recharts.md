# 분석 결과뷰 좌측 사이드바 + Recharts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결과 리포트 화면을 데스크톱 좌측 세로 사이드바 내비(모바일은 상단 탭 폴백)로 재구성하고, 자체 SVG 차트 4종을 Recharts 기반 래퍼로 교체한다.

**Architecture:** 롱스크롤 + scroll-spy·lazy 조회·`?tab=` 딥링크는 그대로 두고 탐색 UI의 위치/형태만 바꾼다. 차트 래퍼는 기존 props 인터페이스를 유지하고 내부만 Recharts로 교체해 호출부(`analysis-result-view.tsx`)의 차트 사용 코드를 건드리지 않는다. 각 차트는 렌더 불가능한 순수 로직(빈 판정·강조 매칭·발산 데이터 변환)을 export된 헬퍼로 분리해 jsdom에서 테스트 가능하게 한다.

**Tech Stack:** Next.js App Router, TypeScript, styled-components, Recharts 3.x, Vitest(jsdom), pnpm.

## Global Constraints

- 데이터 계약·API·백엔드 스펙 변경 금지. `fetchCommercial*`, `types/commercial-analysis`, `chart-data.ts` 매퍼 시그니처 불변.
- 색·radius·shadow·spacing은 `DESIGN.md` CSS 토큰만 사용. 하드코딩 색 금지. 차트 색은 CSS 변수 문자열(`"var(--color-primary-600)"`)로 Recharts에 전달.
- 차트 래퍼 공개 시그니처 유지: `LineChart{points,unit,direction?,ariaLabel?}`, `BarChart{items,unit,ariaLabel,emphasisLabels?}`, `DonutChart{segments,ariaLabel}`, `PopulationPyramid{rows,unit?}`.
- scroll-spy·lazy 조회·딥링크 로직 변경 금지: `useScrollSpy`, `useActivatedSections`, `scrollToReportSection`, `handleTabClick` 재사용.
- 모바일 브레이크포인트 `840px` 유지(페이지 셸·모달과 정합).
- 완료 보고 전 `pnpm qa:verify`(format:check + lint + typecheck + build) 및 `pnpm test` 통과. 미실행 명령을 통과로 보고 금지.
- 테스트 파일은 `.test.ts`(현행 관례), `renderToStaticMarkup`(react-dom/server) 사용. Recharts 측정 렌더는 jsdom에서 동작하지 않으므로 SVG 마크업 단언 대신 (a) 빈 상태 분기 + (b) export된 순수 헬퍼를 단언한다.
- 커밋 메시지 끝에 다음 줄 추가:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

## 색 토큰 규약 (모든 차트 공통)

| 용도                                                     | 토큰                                               |
| -------------------------------------------------------- | -------------------------------------------------- |
| 시리즈 기본(라인 stroke, 도넛 1, 피라미드 남, 막대 강조) | `var(--color-primary-600)` (#2272eb)               |
| 시리즈 보조(도넛 2, 피라미드 여, 막대 기본)              | `var(--color-blue-500)` (#0ea5e9)                  |
| 그리드                                                   | `var(--color-border-200)`                          |
| 축 텍스트                                                | `var(--color-text-caption)`                        |
| 툴팁 배경/테두리                                         | `var(--color-surface)` / `var(--color-border-200)` |
| 상승/하락 배지                                           | `var(--color-positive)` / `var(--color-negative)`  |

---

## Task 1: Recharts 의존성 + 공유 차트 테마 모듈

**Files:**

- Modify: `package.json` (dependencies에 `recharts`)
- Create: `src/components/analysis/charts/chart-theme.ts`
- Test: `src/components/analysis/charts/chart-theme.test.ts`

**Interfaces:**

- Produces:
  - `CHART_COLORS`: `{ seriesPrimary: string; seriesSecondary: string; grid: string; axis: string; surface: string; border: string; positive: string; negative: string }` — 값은 위 표의 `"var(--...)"` 문자열.
  - `formatChartValue(value: number | null | undefined, unit?: string): string` — `formatAnalysisValue` 재noexport 래퍼(단위 포함, null → '데이터 없음').
  - `ChartTooltipContent`: Recharts `content` prop에 넘길 함수형 컴포넌트. props `{ active?: boolean; payload?: Array<{ name?: string; value?: number; payload?: Record<string, unknown> }>; label?: string; unit?: string }` → styled 툴팁 박스(라벨 + `formatChartValue(value, unit)`).

- [ ] **Step 1: recharts 설치**

Run:

```bash
pnpm add recharts
```

Expected: `package.json` dependencies에 `"recharts": "^3.10.1"` 추가, lockfile 갱신. (Recharts 3.x는 React 19 peer 지원.)

- [ ] **Step 2: 실패하는 테스트 작성**

`src/components/analysis/charts/chart-theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  CHART_COLORS,
  formatChartValue,
} from '@/components/analysis/charts/chart-theme'

describe('chart-theme', () => {
  it('시리즈 색은 디자인 토큰 CSS 변수 문자열을 노출한다', () => {
    expect(CHART_COLORS.seriesPrimary).toBe('var(--color-primary-600)')
    expect(CHART_COLORS.seriesSecondary).toBe('var(--color-blue-500)')
    expect(CHART_COLORS.grid).toBe('var(--color-border-200)')
  })

  it('formatChartValue는 단위를 붙이고 null은 데이터 없음으로 표기한다', () => {
    expect(formatChartValue(1234, '명')).toBe('1,234명')
    expect(formatChartValue(null, '명')).toBe('데이터 없음')
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `pnpm exec vitest run src/components/analysis/charts/chart-theme.test.ts`
Expected: FAIL — `chart-theme` 모듈 없음.

- [ ] **Step 4: 최소 구현**

`src/components/analysis/charts/chart-theme.ts`:

```ts
'use client'

import styled from 'styled-components'

import { formatAnalysisValue } from '@/lib/analysis/presentation'

export const CHART_COLORS = {
  seriesPrimary: 'var(--color-primary-600)',
  seriesSecondary: 'var(--color-blue-500)',
  grid: 'var(--color-border-200)',
  axis: 'var(--color-text-caption)',
  surface: 'var(--color-surface)',
  border: 'var(--color-border-200)',
  positive: 'var(--color-positive)',
  negative: 'var(--color-negative)',
} as const

export const formatChartValue = (
  value: number | null | undefined,
  unit = '',
): string => formatAnalysisValue(value, unit)

const TooltipBox = styled.div`
  border: 1px solid ${CHART_COLORS.border};
  border-radius: var(--radius-control);
  background: ${CHART_COLORS.surface};
  box-shadow: var(--shadow-level-2);
  padding: 8px 10px;
  font-size: 12px;
  line-height: 18px;

  strong {
    display: block;
    color: var(--color-text-900);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  span {
    color: var(--color-text-caption);
  }
`

export type ChartTooltipContentProps = {
  active?: boolean
  payload?: Array<{
    name?: string
    value?: number
    payload?: Record<string, unknown>
  }>
  label?: string
  unit?: string
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  unit = '',
}: ChartTooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <TooltipBox>
      {label ? <span>{label}</span> : null}
      {payload.map((entry, index) => (
        <strong key={entry.name ?? index}>
          {entry.name ? `${entry.name} ` : ''}
          {formatChartValue(entry.value, unit)}
        </strong>
      ))}
    </TooltipBox>
  )
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm exec vitest run src/components/analysis/charts/chart-theme.test.ts`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add package.json pnpm-lock.yaml src/components/analysis/charts/chart-theme.ts src/components/analysis/charts/chart-theme.test.ts
git commit -m "feat(analysis): add recharts and shared chart theme module"
```

---

## Task 2: LineChart를 Recharts로 교체

**Files:**

- Modify: `src/components/analysis/charts/line-chart.tsx` (내부 전면 교체, 시그니처 유지)
- Test: `src/components/analysis/charts/line-chart.test.ts` (Recharts 기준 재작성)

**Interfaces:**

- Consumes: `CHART_COLORS`, `ChartTooltipContent`, `formatChartValue` (Task 1); `TrendPoint` (`@/lib/analysis/chart-data`).
- Produces: default `LineChart(props: LineChartProps)` — 시그니처 불변. export `hasLineData(points: readonly TrendPoint[]): boolean` (값이 하나라도 number면 true).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/analysis/charts/line-chart.test.ts` 전체를 아래로 교체:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import LineChart, { hasLineData } from '@/components/analysis/charts/line-chart'
import type { TrendPoint } from '@/lib/analysis/chart-data'

const pt = (periodLabel: string, value: number | null): TrendPoint => ({
  periodLabel,
  value,
  changeRate: null,
})

describe('LineChart', () => {
  it('hasLineData는 number 값이 하나라도 있으면 true, 전부 null이면 false', () => {
    expect(hasLineData([pt('1분기', 10), pt('2분기', null)])).toBe(true)
    expect(hasLineData([pt('1분기', null), pt('2분기', null)])).toBe(false)
    expect(hasLineData([])).toBe(false)
  })

  it('데이터가 없으면 데이터 없음 안내를 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, {
        points: [pt('1분기', null)],
        unit: '명',
      }),
    )
    expect(markup).toContain('데이터 없음')
  })

  it('direction이 주어지면 방향 배지 라벨을 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, {
        points: [pt('1분기', 10), pt('2분기', 20)],
        unit: '명',
        direction: 'INCREASE',
      }),
    )
    expect(markup).toContain('상승')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/components/analysis/charts/line-chart.test.ts`
Expected: FAIL — `hasLineData` export 없음.

- [ ] **Step 3: 구현 (내부 Recharts 교체)**

`src/components/analysis/charts/line-chart.tsx` 전체 교체:

```tsx
'use client'

import styled from 'styled-components'
import {
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { TrendPoint } from '@/lib/analysis/chart-data'
import {
  CHART_COLORS,
  ChartTooltipContent,
  formatChartValue,
} from './chart-theme'

const DIRECTION_META: Record<
  'INCREASE' | 'DECREASE' | 'STAGNANT',
  { symbol: string; label: string; token: string }
> = {
  INCREASE: { symbol: '↑', label: '상승', token: CHART_COLORS.positive },
  DECREASE: { symbol: '↓', label: '하락', token: CHART_COLORS.negative },
  STAGNANT: { symbol: '→', label: '보합', token: 'var(--color-text-600)' },
}

const Wrap = styled.div`
  width: 100%;
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

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

export type LineChartProps = {
  points: TrendPoint[]
  unit: string
  direction?: 'INCREASE' | 'DECREASE' | 'STAGNANT' | null
  ariaLabel?: string
}

export const hasLineData = (points: readonly TrendPoint[]): boolean =>
  points.some(point => typeof point.value === 'number')

export default function LineChart({
  points,
  unit,
  direction,
  ariaLabel = '분기별 추세 라인 차트',
}: LineChartProps) {
  if (!hasLineData(points)) return <Empty>데이터 없음</Empty>

  const meta = direction ? DIRECTION_META[direction] : null

  return (
    <Wrap role="img" aria-label={ariaLabel}>
      {meta ? (
        <Badge $token={meta.token}>
          {meta.symbol} {meta.label}
        </Badge>
      ) : null}
      <ResponsiveContainer width="100%" height={240}>
        <ReLineChart
          data={points}
          margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
        >
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="periodLabel"
            tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
          />
          <YAxis
            width={40}
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={value => formatChartValue(value)}
          />
          <Tooltip
            content={<ChartTooltipContent unit={unit} />}
            cursor={{ stroke: CHART_COLORS.grid }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name="값"
            stroke={CHART_COLORS.seriesPrimary}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_COLORS.seriesPrimary }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
        </ReLineChart>
      </ResponsiveContainer>
    </Wrap>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/components/analysis/charts/line-chart.test.ts`
Expected: PASS. (비어있지 않은 경우 Recharts 컨테이너가 SSR로 렌더되지만 예외 없이 통과.)

- [ ] **Step 5: 커밋**

```bash
git add src/components/analysis/charts/line-chart.tsx src/components/analysis/charts/line-chart.test.ts
git commit -m "feat(analysis): render LineChart with recharts"
```

---

## Task 3: BarChart를 Recharts로 교체 (주말 강조 유지)

**Files:**

- Modify: `src/components/analysis/charts/bar-chart.tsx`
- Test: `src/components/analysis/charts/bar-chart.test.ts` (재작성)

**Interfaces:**

- Consumes: `CHART_COLORS`, `ChartTooltipContent`, `formatChartValue` (Task 1); `AnalysisMetricRow` (`@/lib/analysis/presentation`).
- Produces: default `BarChart(props: BarChartProps)` — 시그니처 불변. export `resolveBarCells(items: readonly AnalysisMetricRow[], emphasisLabels?: readonly string[]): Array<{ label: string; value: number | null; emphasis: boolean }>`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/analysis/charts/bar-chart.test.ts` 전체 교체:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import BarChart, {
  resolveBarCells,
} from '@/components/analysis/charts/bar-chart'

describe('BarChart', () => {
  it('resolveBarCells는 emphasisLabels에 매칭되는 항목만 emphasis=true로 표시', () => {
    const cells = resolveBarCells(
      [
        { label: '월', value: 10 },
        { label: '토', value: 30 },
      ],
      ['토', '일'],
    )
    expect(cells).toEqual([
      { label: '월', value: 10, emphasis: false },
      { label: '토', value: 30, emphasis: true },
    ])
  })

  it('emphasisLabels가 없으면 모두 emphasis=false', () => {
    const cells = resolveBarCells([{ label: '월', value: 10 }])
    expect(cells[0].emphasis).toBe(false)
  })

  it('전부 null이면 데이터 없음 안내만 보여준다', () => {
    const markup = renderToStaticMarkup(
      createElement(BarChart, {
        items: [
          { label: '월', value: null },
          { label: '화', value: null },
        ],
        unit: '명',
        ariaLabel: '요일별 유동인구 막대 차트',
      }),
    )
    expect(markup).toContain('데이터 없음')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/components/analysis/charts/bar-chart.test.ts`
Expected: FAIL — `resolveBarCells` export 없음.

- [ ] **Step 3: 구현**

`src/components/analysis/charts/bar-chart.tsx` 전체 교체:

```tsx
'use client'

import styled from 'styled-components'
import {
  Bar,
  BarChart as ReBarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { AnalysisMetricRow } from '@/lib/analysis/presentation'
import {
  CHART_COLORS,
  ChartTooltipContent,
  formatChartValue,
} from './chart-theme'

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

export type BarChartProps = {
  items: readonly AnalysisMetricRow[]
  unit: string
  ariaLabel: string
  /** Labels (matched against `item.label`) whose bar renders in a distinct primary shade. */
  emphasisLabels?: readonly string[]
}

export const resolveBarCells = (
  items: readonly AnalysisMetricRow[],
  emphasisLabels: readonly string[] = [],
): Array<{ label: string; value: number | null; emphasis: boolean }> => {
  const emphasis = new Set(emphasisLabels)
  return items.map(item => ({
    label: item.label,
    value: item.value,
    emphasis: emphasis.has(item.label),
  }))
}

export default function BarChart({
  items,
  unit,
  ariaLabel,
  emphasisLabels,
}: BarChartProps) {
  const cells = resolveBarCells(items, emphasisLabels)
  const hasData = cells.some(cell => typeof cell.value === 'number')
  if (!hasData) return <Empty>데이터 없음</Empty>

  return (
    <ResponsiveContainer
      width="100%"
      height={240}
      role="img"
      aria-label={ariaLabel}
    >
      <ReBarChart
        data={cells}
        margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
      >
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: CHART_COLORS.grid }}
        />
        <YAxis
          width={40}
          tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={value => formatChartValue(value)}
        />
        <Tooltip
          content={<ChartTooltipContent unit={unit} />}
          cursor={{ fill: 'var(--color-primary-100)' }}
        />
        <Bar
          dataKey="value"
          name="값"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        >
          {cells.map(cell => (
            <Cell
              key={cell.label}
              fill={
                cell.emphasis
                  ? CHART_COLORS.seriesPrimary
                  : CHART_COLORS.seriesSecondary
              }
            />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/components/analysis/charts/bar-chart.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/analysis/charts/bar-chart.tsx src/components/analysis/charts/bar-chart.test.ts
git commit -m "feat(analysis): render BarChart with recharts and weekend emphasis"
```

---

## Task 4: DonutChart를 Recharts로 교체

**Files:**

- Modify: `src/components/analysis/charts/donut-chart.tsx`
- Test: `src/components/analysis/charts/donut-chart.test.ts` (재작성)

**Interfaces:**

- Consumes: `CHART_COLORS`, `ChartTooltipContent` (Task 1); `GenderSegment` (`@/lib/analysis/chart-data`).
- Produces: default `DonutChart(props: DonutChartProps)`. export `toDonutSlices(segments: readonly GenderSegment[]): Array<{ label: string; value: number; percent: number }>` — percent는 0~100 반올림, 합이 0이면 percent 0.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/analysis/charts/donut-chart.test.ts` 전체 교체:

```ts
import { describe, expect, it } from 'vitest'

import { toDonutSlices } from '@/components/analysis/charts/donut-chart'

describe('DonutChart / toDonutSlices', () => {
  it('각 세그먼트의 백분율을 계산한다', () => {
    const slices = toDonutSlices([
      { label: '남성', value: 30 },
      { label: '여성', value: 10 },
    ])
    expect(slices).toEqual([
      { label: '남성', value: 30, percent: 75 },
      { label: '여성', value: 10, percent: 25 },
    ])
  })

  it('합이 0이면 percent는 0', () => {
    const slices = toDonutSlices([
      { label: '남성', value: 0 },
      { label: '여성', value: 0 },
    ])
    expect(slices.every(slice => slice.percent === 0)).toBe(true)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/components/analysis/charts/donut-chart.test.ts`
Expected: FAIL — `toDonutSlices` export 없음.

- [ ] **Step 3: 구현**

`src/components/analysis/charts/donut-chart.tsx` 전체 교체:

```tsx
'use client'

import styled from 'styled-components'
import {
  Cell,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

import type { GenderSegment } from '@/lib/analysis/chart-data'
import { CHART_COLORS, ChartTooltipContent } from './chart-theme'

const SLICE_COLORS = [CHART_COLORS.seriesPrimary, CHART_COLORS.seriesSecondary]

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

const Legend = styled.ul`
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-top: 8px;

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-text-700);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  i {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
`

export type DonutChartProps = {
  segments: GenderSegment[]
  ariaLabel: string
}

export const toDonutSlices = (
  segments: readonly GenderSegment[],
): Array<{ label: string; value: number; percent: number }> => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  return segments.map(segment => ({
    label: segment.label,
    value: segment.value,
    percent: total > 0 ? Math.round((segment.value / total) * 100) : 0,
  }))
}

export default function DonutChart({ segments, ariaLabel }: DonutChartProps) {
  const slices = toDonutSlices(segments)
  const hasData = slices.some(slice => slice.value > 0)
  if (!hasData) return <Empty>데이터 없음</Empty>

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={180}>
        <RePieChart>
          <Tooltip content={<ChartTooltipContent unit="%" />} />
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="82%"
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((slice, index) => (
              <Cell
                key={slice.label}
                fill={SLICE_COLORS[index % SLICE_COLORS.length]}
              />
            ))}
          </Pie>
        </RePieChart>
      </ResponsiveContainer>
      <Legend>
        {slices.map((slice, index) => (
          <li key={slice.label}>
            <i
              style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }}
            />
            {slice.label} {slice.percent}%
          </li>
        ))}
      </Legend>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/components/analysis/charts/donut-chart.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/analysis/charts/donut-chart.tsx src/components/analysis/charts/donut-chart.test.ts
git commit -m "feat(analysis): render DonutChart with recharts"
```

---

## Task 5: PopulationPyramid를 Recharts 발산형 막대로 교체

**Files:**

- Modify: `src/components/analysis/charts/population-pyramid.tsx`
- Test: `src/components/analysis/charts/population-pyramid.test.ts` (재작성)

**Interfaces:**

- Consumes: `CHART_COLORS`, `ChartTooltipContent`, `formatChartValue` (Task 1); `PyramidRow` (`@/lib/analysis/chart-data`).
- Produces: default `PopulationPyramid(props: PopulationPyramidProps)`. export `toPyramidChartData(rows: readonly PyramidRow[]): Array<{ ageLabel: string; maleValue: number; femaleValue: number; maleAbs: number | null; femaleAbs: number | null }>` — `maleValue`는 왼쪽 발산을 위해 음수(`-male`), null은 0으로 두되 `maleAbs`에 원본 보존.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/analysis/charts/population-pyramid.test.ts` 전체 교체:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PopulationPyramid, {
  toPyramidChartData,
} from '@/components/analysis/charts/population-pyramid'
import type { PyramidRow } from '@/lib/analysis/chart-data'

const row = (
  ageLabel: string,
  male: number | null,
  female: number | null,
): PyramidRow => ({ ageLabel, male, female })

describe('PopulationPyramid / toPyramidChartData', () => {
  it('남성 값은 좌측 발산을 위해 음수로, 원본은 abs에 보존한다', () => {
    const data = toPyramidChartData([row('20대', 12, 8)])
    expect(data[0]).toEqual({
      ageLabel: '20대',
      maleValue: -12,
      femaleValue: 8,
      maleAbs: 12,
      femaleAbs: 8,
    })
  })

  it('null은 막대값 0으로 두되 abs는 null로 보존한다', () => {
    const data = toPyramidChartData([row('20대', null, 8)])
    expect(data[0].maleValue).toBe(0)
    expect(data[0].maleAbs).toBeNull()
  })

  it('전부 null이면 데이터 없음 안내를 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(PopulationPyramid, {
        rows: [row('20대', null, null)],
      }),
    )
    expect(markup).toContain('데이터 없음')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/components/analysis/charts/population-pyramid.test.ts`
Expected: FAIL — `toPyramidChartData` export 없음.

- [ ] **Step 3: 구현**

`src/components/analysis/charts/population-pyramid.tsx` 전체 교체:

```tsx
'use client'

import styled from 'styled-components'
import {
  Bar,
  BarChart as ReBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { PyramidRow } from '@/lib/analysis/chart-data'
import {
  CHART_COLORS,
  ChartTooltipContent,
  formatChartValue,
} from './chart-theme'

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

const Legend = styled.ul`
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-top: 6px;

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-text-700);
    font-size: 12px;
  }

  i {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
`

export type PopulationPyramidProps = {
  rows: PyramidRow[]
  unit?: string
}

export const toPyramidChartData = (
  rows: readonly PyramidRow[],
): Array<{
  ageLabel: string
  maleValue: number
  femaleValue: number
  maleAbs: number | null
  femaleAbs: number | null
}> =>
  rows.map(row => ({
    ageLabel: row.ageLabel,
    maleValue: row.male === null ? 0 : -row.male,
    femaleValue: row.female === null ? 0 : row.female,
    maleAbs: row.male,
    femaleAbs: row.female,
  }))

export default function PopulationPyramid({
  rows,
  unit = '%',
}: PopulationPyramidProps) {
  const data = toPyramidChartData(rows)
  const hasData = rows.some(row => row.male !== null || row.female !== null)
  if (!hasData) return <Empty>데이터 없음</Empty>

  return (
    <div role="img" aria-label="연령·성별 인구 피라미드">
      <ResponsiveContainer width="100%" height={260}>
        <ReBarChart
          data={data}
          layout="vertical"
          stackOffset="sign"
          margin={{ top: 4, right: 12, bottom: 4, left: 12 }}
        >
          <XAxis
            type="number"
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickFormatter={value => formatChartValue(Math.abs(value), unit)}
          />
          <YAxis
            type="category"
            dataKey="ageLabel"
            width={44}
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<ChartTooltipContent unit={unit} />}
            cursor={{ fill: 'var(--color-primary-100)' }}
          />
          <Bar
            dataKey="maleValue"
            name="남성"
            fill={CHART_COLORS.seriesPrimary}
            radius={[4, 0, 0, 4]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="femaleValue"
            name="여성"
            fill={CHART_COLORS.seriesSecondary}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </ReBarChart>
      </ResponsiveContainer>
      <Legend>
        <li>
          <i style={{ background: CHART_COLORS.seriesPrimary }} /> 남성
        </li>
        <li>
          <i style={{ background: CHART_COLORS.seriesSecondary }} /> 여성
        </li>
      </Legend>
    </div>
  )
}
```

> 참고: 음수 `maleValue`가 툴팁에 -값으로 노출될 수 있다. `ChartTooltipContent`는 `formatChartValue(entry.value, unit)`을 쓰므로, 필요 시 이 태스크 리뷰에서 남성 툴팁을 `Math.abs`로 보정한다(선택). 축 라벨은 이미 `Math.abs`로 표기한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/components/analysis/charts/population-pyramid.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/analysis/charts/population-pyramid.tsx src/components/analysis/charts/population-pyramid.test.ts
git commit -m "feat(analysis): render population pyramid with recharts diverging bars"
```

---

## Task 6: 미사용 차트 프리미티브 정리

**Files:**

- Delete(조건부): `src/components/analysis/charts/chart-frame.tsx`, `src/components/analysis/charts/chart-frame.test.ts`, `src/components/analysis/charts/use-chart-tooltip.ts`
- Verify: 전체 `grep`으로 잔여 참조 확인

**Interfaces:**

- Consumes: 없음. 순수 삭제 + 검증.

- [ ] **Step 1: 잔여 참조 확인**

Run:

```bash
grep -rnE "chart-frame|use-chart-tooltip|useChartTooltip|ChartFrame" src
```

Expected: Task 2~5 교체 후 `charts/` 내부에서 더 이상 import되지 않음. 만약 다른 곳(예: 다른 차트)에서 여전히 쓰면 그 파일은 남긴다.

- [ ] **Step 2: 미참조 파일 삭제**

참조가 없을 때만:

```bash
git rm src/components/analysis/charts/chart-frame.tsx src/components/analysis/charts/chart-frame.test.ts src/components/analysis/charts/use-chart-tooltip.ts
```

(`use-chart-tooltip.ts`에 별도 테스트 파일이 있으면 함께 `git rm`.)

- [ ] **Step 3: 차트 테스트 + 타입 확인**

Run: `pnpm exec vitest run src/components/analysis/charts && pnpm typecheck`
Expected: 차트 테스트 PASS, 타입 오류 없음.

- [ ] **Step 4: 커밋**

```bash
git commit -am "chore(analysis): remove unused SVG chart primitives"
```

---

## Task 7: 결과 섹션 사이드바 내비 컴포넌트

**Files:**

- Create: `src/components/analysis/analysis-result-nav.tsx`
- Test: `src/components/analysis/analysis-result-nav.test.ts`

**Interfaces:**

- Consumes: `ANALYSIS_TABS` (`@/lib/analysis/presentation`), `AnalysisResultTab` (`@/lib/analysis/selection`), lucide 아이콘.
- Produces: default `AnalysisResultNav(props)` where

  ```ts
  type AnalysisResultNavProps = {
    tabs: readonly { value: AnalysisResultTab; label: string }[]
    activeTab: AnalysisResultTab
    onSelect: (tab: AnalysisResultTab) => void
  }
  ```

  `<nav aria-label="분석 결과 항목">` 안에 각 탭 버튼. 활성 항목은 `aria-current="true"`. 각 버튼 클릭 → `onSelect(tab.value)`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/analysis/analysis-result-nav.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisResultNav from '@/components/analysis/analysis-result-nav'
import { ANALYSIS_TABS } from '@/lib/analysis/presentation'

describe('AnalysisResultNav', () => {
  it('모든 탭 라벨을 렌더하고 활성 탭에 aria-current를 준다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisResultNav, {
        tabs: ANALYSIS_TABS,
        activeTab: 'sales',
        onSelect: () => {},
      }),
    )
    ANALYSIS_TABS.forEach(tab => expect(markup).toContain(tab.label))
    expect(markup).toContain('aria-current="true"')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm exec vitest run src/components/analysis/analysis-result-nav.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/components/analysis/analysis-result-nav.tsx`:

```tsx
'use client'

import {
  Activity,
  BarChart3,
  Footprints,
  LayoutDashboard,
  Store,
  Users,
  Wallet,
} from 'lucide-react'
import styled from 'styled-components'

import type { AnalysisResultTab } from '@/lib/analysis/selection'

const ICON_BY_TAB: Record<AnalysisResultTab, typeof Activity> = {
  summary: LayoutDashboard,
  'foot-traffic': Footprints,
  sales: Wallet,
  stores: Store,
  living: Users,
  trend: Activity,
  benchmark: BarChart3,
}

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Item = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: var(--radius-control);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'transparent'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  padding: 10px 12px;
  font-size: 14px;
  font-weight: ${props => (props.$active ? 700 : 600)};
  text-align: left;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &::before {
    position: absolute;
    top: 8px;
    bottom: 8px;
    left: 0;
    width: 3px;
    border-radius: 2px;
    background: ${props =>
      props.$active ? 'var(--color-primary-600)' : 'transparent'};
    content: '';
  }

  &:hover {
    background: var(--color-surface-muted);
    color: var(--color-primary-700);
  }

  svg {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
  }
`

export type AnalysisResultNavProps = {
  tabs: readonly { value: AnalysisResultTab; label: string }[]
  activeTab: AnalysisResultTab
  onSelect: (tab: AnalysisResultTab) => void
}

export default function AnalysisResultNav({
  tabs,
  activeTab,
  onSelect,
}: AnalysisResultNavProps) {
  return (
    <Nav aria-label="분석 결과 항목">
      {tabs.map(tab => {
        const Icon = ICON_BY_TAB[tab.value]
        const active = tab.value === activeTab
        return (
          <Item
            key={tab.value}
            type="button"
            $active={active}
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(tab.value)}
          >
            <Icon aria-hidden />
            {tab.label}
          </Item>
        )
      })}
    </Nav>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm exec vitest run src/components/analysis/analysis-result-nav.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/analysis/analysis-result-nav.tsx src/components/analysis/analysis-result-nav.test.ts
git commit -m "feat(analysis): add result section sidebar nav component"
```

---

## Task 8: 결과뷰 레이아웃 통합 (데스크톱 사이드바 + 모바일 탭 폴백)

**Files:**

- Modify: `src/components/analysis/analysis-result-view.tsx`

**Interfaces:**

- Consumes: `AnalysisResultNav` (Task 7); 기존 `spyTab`, `handleTabClick`, `ANALYSIS_TABS`, `TabList`/`HeaderTabButton`.
- Produces: 시각적 변경만. 공개 export 불변.

- [ ] **Step 1: 레이아웃 styled 컴포넌트 추가**

`analysis-result-view.tsx`의 `Content` styled 정의 근처에 추가:

```tsx
/** 데스크톱: [사이드바][콘텐츠] 2컬럼. 모바일(≤840px)은 단일 컬럼. */
const ResultLayout = styled.div`
  width: min(1320px, calc(100% - 40px));
  margin: 0 auto;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 28px;
  padding: 20px 0 56px;

  @media (max-width: 840px) {
    grid-template-columns: 1fr;
    width: min(100% - 28px, 1320px);
    gap: 0;
    padding: 16px 0 max(36px, env(safe-area-inset-bottom));
  }
`

/** 좌측 사이드바: 스크롤 컨테이너 기준 sticky. 모바일에서는 숨김. */
const SidebarColumn = styled.aside`
  position: sticky;
  top: 96px;
  align-self: start;
  height: fit-content;

  @media (max-width: 840px) {
    display: none;
  }
`

/** 모바일 전용 상단 가로 탭. 데스크톱에서는 숨김. */
const MobileTabList = styled(TabList)`
  display: none;

  @media (max-width: 840px) {
    display: flex;
  }
`
```

- [ ] **Step 2: 헤더의 데스크톱 TabList를 모바일 전용으로 강등**

기존 `StickyHeader` 내부의 `<TabList aria-label="분석 결과 항목" role="tablist">…</TabList>` 블록을 `MobileTabList`로 감싸 모바일에서만 노출:

```tsx
<MobileTabList aria-label="분석 결과 항목" role="tablist">
  {ANALYSIS_TABS.map(tab => (
    <HeaderTabButton
      key={tab.value}
      type="button"
      role="tab"
      $active={spyTab === tab.value}
      aria-selected={spyTab === tab.value}
      aria-current={spyTab === tab.value ? 'true' : undefined}
      onClick={() => handleTabClick(tab.value)}
    >
      {tab.label}
    </HeaderTabButton>
  ))}
</MobileTabList>
```

- [ ] **Step 3: 본문을 ResultLayout(사이드바 + 콘텐츠)로 감싸기**

기존 `<Content> … </Content>`(ContextHero + 모든 ReportSection)를 아래 구조로 교체 — `ContextHero`부터 마지막 `ReportSection`까지 전부 `ContentColumn` 안으로 옮긴다. `Content`는 `ContentColumn`으로 대체(패딩/폭은 `ResultLayout`이 담당하므로 내부 컬럼은 `min-width:0`만):

```tsx
const ContentColumn = styled.div`
  min-width: 0;
  display: grid;
  gap: 28px;
`
```

렌더:

```tsx
<ResultLayout>
  <SidebarColumn>
    <AnalysisResultNav
      tabs={ANALYSIS_TABS}
      activeTab={spyTab}
      onSelect={handleTabClick}
    />
  </SidebarColumn>
  <ContentColumn>
    {/* 기존 ContextHero, actionFeedback, 모든 ReportSection 그대로 이동 */}
  </ContentColumn>
</ResultLayout>
```

> 주의: 기존 `Content` styled는 제거하거나 `ContentColumn`으로 대체한다. `DashboardGrid` 등 하위 스타일은 불변.

- [ ] **Step 4: sticky 오프셋 정합 확인**

`SidebarColumn`의 `top: 96px`와 `ReportSection`의 `scroll-margin-top: 112px`(데스크톱)가 상단 sticky 바 높이와 어긋나지 않는지 점검. 사이드바 상단이 헤더에 가리면 `top` 값을 헤더 실제 높이에 맞춰 조정(88~112 범위).

- [ ] **Step 5: 타입 + 린트 + 빌드**

Run: `pnpm typecheck && pnpm lint`
Expected: 오류 0.

- [ ] **Step 6: 브라우저 검증 (데스크톱)**

- `preview_start`로 dev 서버 실행(`.claude/launch.json`에 dev 항목 없으면 `next dev`로 추가).
- 유효한 결과 URL(예: `/analysis/result?...&tab=summary`) 접속.
- 확인: 좌측 세로 사이드바 렌더 → 항목 클릭 시 해당 섹션 스크롤 + 활성 하이라이트 이동, 스크롤 시 `aria-current` 이동, 4종 차트 렌더/툴팁, 콘솔 에러 없음.
- 스크린샷 저장.

- [ ] **Step 7: 브라우저 검증 (모바일 폭)**

- `resize_window` preset `mobile`(≤840px) 후 새로고침.
- 확인: 사이드바 숨김, 상단 가로 탭 노출, 이중 스크롤 없음, 탭 클릭 동작.

- [ ] **Step 8: 커밋**

```bash
git commit -am "feat(analysis): left sidebar nav on desktop, tab fallback on mobile"
```

---

## Task 9: 정본 명세(result.md) supersede 반영

**Files:**

- Modify: `docs/features/analysis/result.md`

**Interfaces:**

- Consumes: 없음. 문서 갱신.

- [ ] **Step 1: D2 지표 시각화 갱신**

`result.md`의 D2 표에서 지표 시각화 행을 "자체 CSS/SVG 차트" → "Recharts 기반 래퍼(라인·막대·도넛·피라미드), DESIGN.md 토큰 테마, 반응형·툴팁"으로 수정.

- [ ] **Step 2: 구현 제외 범위에서 "차트 라이브러리 신규 도입" 제거**

D0 구현 제외 범위 문장에서 해당 항목 삭제.

- [ ] **Step 3: 레이아웃/탭 서술 갱신**

"헤더와 탭은 리포트 내부에서 sticky" 서술을 "데스크톱은 좌측 세로 사이드바 내비 + 오른쪽 롱스크롤(scroll-spy), 모바일(≤840px)은 상단 가로 sticky 탭 폴백"으로 수정. 스크롤·딥링크·지연 조회 동작은 불변임을 명시.

- [ ] **Step 4: 변경이력 추가**

변경이력 표에 행 추가:

```
| 1.2 | 2026-08-11 | 상단 탭 → 데스크톱 좌측 사이드바 내비(모바일 탭 폴백), 자체 SVG 차트 → Recharts 교체 | Claude |
```

- [ ] **Step 5: 커밋**

```bash
git add docs/features/analysis/result.md
git commit -m "docs(analysis): reflect sidebar layout and recharts in result spec"
```

---

## Self-Review 체크 결과

- **Spec coverage**: 설계 §2(레이아웃) → Task 7·8; §3(차트) → Task 1~5; §3.3(정리) → Task 6; supersede(§0) → Task 9. 성공 기준 1~6 모두 태스크로 커버.
- **Placeholder scan**: 모든 코드 단계에 실제 코드/명령 포함. "적절히 처리" 류 문구 없음.
- **Type consistency**: 차트 4종 공개 props 시그니처 유지, 헬퍼 이름(`hasLineData`/`resolveBarCells`/`toDonutSlices`/`toPyramidChartData`)·`AnalysisResultNavProps`·`CHART_COLORS` 일관.
- **미해결 확인 항목**: (a) Recharts 툴팁의 남성 음수값 표기(Task 5 주석) — 리뷰에서 abs 보정 여부 결정. (b) `.claude/launch.json` dev 항목 유무 — Task 8 Step 6에서 없으면 추가.
