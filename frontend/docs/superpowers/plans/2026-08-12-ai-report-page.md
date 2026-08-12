# AI 리포트 전용 페이지(지표+AI 결합) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상권(commercial) 선택 시, 실제 상권 지표·엄선 차트(빠른 층)를 즉시 렌더하고 AI 서술(느린 층)을 스트리밍으로 채우는 **전용 리포트 페이지** `/analysis/report`를 FE 전용으로 추가한다.

**Architecture:** 두 개의 독립 데이터 소스를 서로 기다리지 않게 그린다 — (1) 빠른 층: 기존 상권 REST 페처(react-query 병렬), (2) 느린 층: 기존 `useAiReport`(SSE job). 페이지 셸은 서버 컴포넌트(searchParams→metadata), 본체는 `'use client'`. 기존 차트·변환·AI 훅·잠금 카드를 재사용하고, 결과 뷰에 흩어진 순수 변환은 공유 셀렉터 모듈로 추출해 중복을 없앤다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `@tanstack/react-query` v5, styled-components, Zustand, recharts 3, vitest.

## Global Constraints

- **FE 전용**: 백엔드 API 계약 변경 금지. 기존 페처/훅/엔드포인트만 사용한다.
- **디자인 토큰만**: 색·radius·shadow·spacing·모션은 `DESIGN.md` 토큰만. 임의 토큰 추가 금지. 강점=green500 `#03b26c`, 주의=orange500 `#fe9800`(경고)·red500 `#f04452`(음성 변화), 양성 변화=green500.
- **라우트명 확정**: `/analysis/report` (searchParams: `districtCode`, `administrationCode`, `commercialCode`, `serviceCode`, `periodCode`). `result`와 형제·톤 일치.
- **비로그인 정책 확정**: 데이터 지표·차트(빠른 층)는 **노출**, AI 인사이트 영역만 잠금(`AiReportLockCard` + 로그인 CTA).
- **4번째 지표 확정**: "성장률(매출 변화)" — `fetchCommercialTrend({metricType:'SALES'})`의 `trendDirection` + 최신 분기 `changeRate`. (기존 결과 뷰 4번째 카드는 상주인구지만, 이 페이지는 성장률로 확정.)
- **v1 범위**: 상권(commercial) 레벨만. 지역(자치구/행정동)·결과 페이지 개편은 제외.
- **테스트 환경**: vitest `environment: 'node'`, include는 `**/*.test.ts`(=.tsx 렌더 테스트 없음). 따라서 컴포넌트 렌더 대신 **순수 로직/상태 리졸버 함수**를 `.test.ts`로 테스트한다(코드베이스 관행).
- **인코딩**: 모든 새 파일 UTF-8(no BOM). 한글 포함 파일은 Write 툴로 저장.
- **검증**: 완료 보고 전 `pnpm qa:verify`(= `format:check && lint && typecheck && build`) 실행.
- **정본 명세**: `docs/features/analysis/ai-report-page.md`(이 워크트리에 복사됨). 재사용 코드 근거는 아래 각 Task의 `Files`/`Interfaces` 참조.

---

## File Structure

**신규**
- `app/(shell)/analysis/report/page.tsx` — 서버 셸(metadata + Suspense).
- `src/components/analysis/ai-report-page.tsx` — `'use client'` 서피스(searchParams 파싱 → 뷰).
- `src/components/analysis/ai-report-page-view.tsx` — 2단 속도 오케스트레이션(쿼리+AI+섹션 조립).
- `src/components/analysis/ai-report/report-metric-cards.tsx` — 핵심 지표 4카드(성장률 포함) + 카드별 스켈레톤.
- `src/components/analysis/ai-report/report-chart-section.tsx` — 엄선 차트 3개 + 차트별 스켈레톤/빈 상태.
- `src/components/analysis/ai-report/report-insight-section.tsx` — AI 인사이트(스테퍼/스켈레톤→요약/강점/주의/추천, 잠금, 에러 재시도).
- `src/lib/analysis/commercial-chart-selectors.ts` — 결과 뷰에서 추출한 차트 정의/변환 + 리포트용 큐레이션 빌더 + 성장률 셀렉터.
- `src/lib/analysis/report-section-state.ts` — 각 영역의 순수 상태 리졸버(테스트 대상).
- 각 신규 로직 파일의 `*.test.ts`.

**수정**
- `src/lib/api/response.ts` — `getResponseBody`/`isResponseError` 추가(결과 뷰 private → 공유).
- `src/lib/analysis/selection.ts` — `createAiReportHref` 추가.
- `src/components/analysis/analysis-result-view.tsx` — 위 두 모듈에서 import(로컬 중복 제거).
- `src/components/analysis/charts/line-chart.tsx` · `bar-chart.tsx` · `population-pyramid.tsx` — optional `height` prop.
- `src/components/analysis/ai-report/ai-report-panel.tsx` — "AI 리포트 보기" CTA(전용 페이지 진입).
- `docs/features/_index.md` — analysis 상태 노트에 전용 리포트 페이지 반영.

---

## Task 1: `getResponseBody`/`isResponseError` 공유화

기존 결과 뷰의 private 헬퍼를 공용 `response.ts`로 올려 리포트 페이지와 공유(중복 방지).

**Files:**
- Modify: `src/lib/api/response.ts` (현재 `isApiSuccess` export)
- Modify: `src/components/analysis/analysis-result-view.tsx:517-522` (로컬 정의 제거→import)
- Test: `src/lib/api/response.test.ts` (없으면 생성)

**Interfaces:**
- Produces: `getResponseBody<T>(response: ApiResponse<T | null> | undefined): T | null`, `isResponseError(response: ApiResponse<unknown> | undefined): boolean`
- Consumes: `isApiSuccess`(동일 파일), `ApiResponse`(`@/types/api`)

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/api/response.test.ts`에 추가(기존 있으면 append):

```ts
import { describe, expect, it } from 'vitest'
import { getResponseBody, isResponseError } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

const ok = <T,>(body: T): ApiResponse<T> => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: body,
})
const fail = (): ApiResponse<unknown> => ({
  dataHeader: { success: false, resultCode: 'E', resultMessage: 'x' },
  dataBody: null,
})

describe('getResponseBody', () => {
  it('성공 응답은 dataBody를 반환한다', () => {
    expect(getResponseBody(ok({ a: 1 }))).toEqual({ a: 1 })
  })
  it('성공이지만 body가 null이면 null', () => {
    expect(getResponseBody(ok(null))).toBeNull()
  })
  it('undefined/실패 응답은 null', () => {
    expect(getResponseBody(undefined)).toBeNull()
    expect(getResponseBody(fail() as ApiResponse<{ a: number } | null>)).toBeNull()
  })
})

describe('isResponseError', () => {
  it('undefined는 에러 아님(미도착)', () => {
    expect(isResponseError(undefined)).toBe(false)
  })
  it('실패 응답은 에러', () => {
    expect(isResponseError(fail())).toBe(true)
  })
})
```

> ⚠️ 구현 시 `@/types/api`의 `ApiResponse` 실제 필드명(`dataHeader.success`, `dataBody`)을 확인해 픽스처를 맞춘다(현재 `src/types/api.ts:9`).

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/lib/api/response.test.ts`. Expected: FAIL(`getResponseBody`/`isResponseError` not exported).

- [ ] **Step 3: 구현** — `src/lib/api/response.ts`에 추가:

```ts
import type { ApiResponse } from '@/types/api'

export const isResponseError = (
  response: ApiResponse<unknown> | undefined,
): boolean => response !== undefined && !isApiSuccess(response)

export const getResponseBody = <T,>(
  response: ApiResponse<T | null> | undefined,
): T | null => (isApiSuccess(response) ? (response?.dataBody ?? null) : null)
```

그리고 `analysis-result-view.tsx`의 로컬 `isResponseError`/`getResponseBody`(L517-522) 삭제 후, 기존 import에 추가:

```ts
import { getResponseBody, isApiSuccess, isResponseError } from '@/lib/api/response'
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/lib/api/response.test.ts`. Expected: PASS. 또한 `pnpm exec tsc --noEmit --incremental false`로 결과 뷰 타입 회귀 없음 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/api/response.ts src/lib/api/response.test.ts src/components/analysis/analysis-result-view.tsx
git commit -m "refactor(analysis): getResponseBody/isResponseError를 공용 response로 승격"
```

---

## Task 2: `createAiReportHref` 링크 빌더

사이드바 CTA와 깔때기에서 쓸 전용 페이지 URL 빌더. `createAnalysisResultHref` 패턴을 그대로 따른다.

**Files:**
- Modify: `src/lib/analysis/selection.ts:163` 근처(`createAnalysisResultHref` 옆)
- Test: `src/lib/analysis/selection.test.ts` (기존 URL 테스트에 append)

**Interfaces:**
- Consumes: private `createSelectionSearchParams(selection, includePeriod)`(동일 파일, `includePeriod=true`면 `periodCode=ANALYSIS_PERIOD_CODE`), `AnalysisSelection`
- Produces: `createAiReportHref(selection: AnalysisSelection): string` → `/analysis/report?districtCode=…&administrationCode=…&commercialCode=…&serviceCode=…&periodCode=20233`

- [ ] **Step 1: 실패 테스트 작성** — `selection.test.ts`의 `'탐색과 결과 URL을 코드만으로 만든다'` it 블록에 추가하고, import에 `createAiReportHref` 추가:

```ts
expect(createAiReportHref(completeSelection)).toBe(
  '/analysis/report?districtCode=11680&administrationCode=11680640&commercialCode=3110008&serviceCode=CS100001&periodCode=20233',
)
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/lib/analysis/selection.test.ts`. Expected: FAIL(`createAiReportHref` is not exported).

- [ ] **Step 3: 구현** — `selection.ts`에 `createAnalysisResultHref` 바로 아래 추가:

```ts
export const createAiReportHref = (selection: AnalysisSelection) => {
  const params = createSelectionSearchParams(selection, true)
  return `/analysis/report?${params}`
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/lib/analysis/selection.test.ts`. Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/analysis/selection.ts src/lib/analysis/selection.test.ts
git commit -m "feat(analysis): createAiReportHref 링크 빌더 추가"
```

---

## Task 3: 공유 상권 차트 셀렉터 모듈

결과 뷰에 module-private로 있는 차트 정의·변환을 공유 모듈로 옮기고(중복 제거), 리포트가 쓸 큐레이션 빌더 3종 + 성장률 셀렉터를 추가한다.

**Files:**
- Create: `src/lib/analysis/commercial-chart-selectors.ts`
- Create: `src/lib/analysis/commercial-chart-selectors.test.ts`
- Modify: `src/components/analysis/analysis-result-view.tsx` (L552-632의 `createRows`/`toLinePoints`/`*Definitions` 삭제 → import)

**Interfaces:**
- Consumes: `toMetricRows`/`AnalysisMetricRow`(`@/lib/analysis/presentation`), `toPyramidRows`/`TrendPoint`/`PyramidRow`(`@/lib/analysis/chart-data`), 타입 `CommercialFootTraffic`/`CommercialSales`/`CommercialTrend`(`@/types/commercial-analysis`)
- Produces:
  - `footTimeDefinitions`, `footDayDefinitions`, `salesTimeDefinitions`, `salesDayDefinitions`, `salesAgeDefinitions`, `populationAgeDefinitions`, `expenseDefinitions` (각 `readonly (readonly [string,string])[]`)
  - `createRows(source, definitions): AnalysisMetricRow[]`
  - `toLinePoints(rows: readonly AnalysisMetricRow[]): TrendPoint[]`
  - `buildSalesTimeLine(sales: CommercialSales | null): TrendPoint[]` — 시간대별 매출 Line
  - `buildFootDayBars(foot: CommercialFootTraffic | null): AnalysisMetricRow[]` — 요일별 유동인구 Bar
  - `buildFootAgeGenderPyramid(foot: CommercialFootTraffic | null): PyramidRow[]` — 연령·성별 유동인구 Pyramid
  - `type SalesGrowth = { direction: 'INCREASE'|'DECREASE'|'STAGNANT'|null; changeRate: number | null }`
  - `selectSalesGrowth(trend: CommercialTrend | null): SalesGrowth`

- [ ] **Step 1: 실패 테스트 작성** — `commercial-chart-selectors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  buildFootDayBars,
  buildSalesTimeLine,
  selectSalesGrowth,
} from '@/lib/analysis/commercial-chart-selectors'
import type { CommercialSales, CommercialTrend } from '@/types/commercial-analysis'

describe('buildSalesTimeLine', () => {
  it('시간대별 매출을 6개 라인 포인트로 변환한다', () => {
    const sales = {
      amountByTimeSlotItem: {
        salesAmountTime00To06: 10,
        salesAmountTime06To11: 20,
        salesAmountTime11To14: null,
        salesAmountTime14To17: 40,
        salesAmountTime17To21: 50,
        salesAmountTime21To24: 60,
      },
    } as unknown as CommercialSales
    const points = buildSalesTimeLine(sales)
    expect(points).toHaveLength(6)
    expect(points[0]).toEqual({ periodLabel: '00~06시', value: 10, changeRate: null })
    expect(points[2].value).toBeNull()
  })
  it('null 입력은 6개 null 포인트', () => {
    expect(buildSalesTimeLine(null).every(p => p.value === null)).toBe(true)
  })
})

describe('buildFootDayBars', () => {
  it('요일 7개 막대 행을 만든다', () => {
    expect(buildFootDayBars(null)).toHaveLength(7)
    expect(buildFootDayBars(null)[0].label).toBe('월')
  })
})

describe('selectSalesGrowth', () => {
  it('마지막 분기 변화율과 방향을 뽑는다', () => {
    const trend = {
      trendDirection: 'INCREASE',
      periods: [
        { periodCode: '20232', value: 100, changeRate: 0.1 },
        { periodCode: '20233', value: 118, changeRate: 0.18 },
      ],
    } as unknown as CommercialTrend
    expect(selectSalesGrowth(trend)).toEqual({ direction: 'INCREASE', changeRate: 0.18 })
  })
  it('빈/비유한 변화율은 null', () => {
    expect(selectSalesGrowth(null)).toEqual({ direction: null, changeRate: null })
    const noRate = { trendDirection: 'STAGNANT', periods: [{ periodCode: '20233', value: 1, changeRate: null }] } as unknown as CommercialTrend
    expect(selectSalesGrowth(noRate)).toEqual({ direction: 'STAGNANT', changeRate: null })
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/lib/analysis/commercial-chart-selectors.test.ts`. Expected: FAIL(module not found).

- [ ] **Step 3: 구현** — `commercial-chart-selectors.ts` 작성. `*Definitions`는 `analysis-result-view.tsx:572-632`에서 **그대로** 옮긴다(값 변경 없음):

```ts
import { toMetricRows, type AnalysisMetricRow } from '@/lib/analysis/presentation'
import {
  toPyramidRows,
  type PyramidRow,
  type TrendPoint,
} from '@/lib/analysis/chart-data'
import type {
  CommercialFootTraffic,
  CommercialSales,
  CommercialTrend,
} from '@/types/commercial-analysis'

export const footTimeDefinitions = [
  ['00~06시', 'footTrafficTime00To06'],
  ['06~11시', 'footTrafficTime06To11'],
  ['11~14시', 'footTrafficTime11To14'],
  ['14~17시', 'footTrafficTime14To17'],
  ['17~21시', 'footTrafficTime17To21'],
  ['21~24시', 'footTrafficTime21To24'],
] as const
export const footDayDefinitions = [
  ['월', 'mondayFootTraffic'],
  ['화', 'tuesdayFootTraffic'],
  ['수', 'wednesdayFootTraffic'],
  ['목', 'thursdayFootTraffic'],
  ['금', 'fridayFootTraffic'],
  ['토', 'saturdayFootTraffic'],
  ['일', 'sundayFootTraffic'],
] as const
export const salesTimeDefinitions = [
  ['00~06시', 'salesAmountTime00To06'],
  ['06~11시', 'salesAmountTime06To11'],
  ['11~14시', 'salesAmountTime11To14'],
  ['14~17시', 'salesAmountTime14To17'],
  ['17~21시', 'salesAmountTime17To21'],
  ['21~24시', 'salesAmountTime21To24'],
] as const
export const salesDayDefinitions = [
  ['월', 'mondaySalesAmount'],
  ['화', 'tuesdaySalesAmount'],
  ['수', 'wednesdaySalesAmount'],
  ['목', 'thursdaySalesAmount'],
  ['금', 'fridaySalesAmount'],
  ['토', 'saturdaySalesAmount'],
  ['일', 'sundaySalesAmount'],
] as const
export const salesAgeDefinitions = [
  ['10대', 'age10SalesAmount'],
  ['20대', 'age20SalesAmount'],
  ['30대', 'age30SalesAmount'],
  ['40대', 'age40SalesAmount'],
  ['50대', 'age50SalesAmount'],
  ['60대 이상', 'age60PlusSalesAmount'],
] as const
export const populationAgeDefinitions = [
  ['10대', 'age10ResidentPopulation'],
  ['20대', 'age20ResidentPopulation'],
  ['30대', 'age30ResidentPopulation'],
  ['40대', 'age40ResidentPopulation'],
  ['50대', 'age50ResidentPopulation'],
  ['60대 이상', 'age60PlusResidentPopulation'],
] as const
export const expenseDefinitions = [
  ['식료품', 'groceryExpenseAmount'],
  ['의류·신발', 'clothingExpenseAmount'],
  ['의료', 'medicalExpenseAmount'],
  ['생활용품', 'householdExpenseAmount'],
  ['교통', 'transportationExpenseAmount'],
  ['여가·오락', 'leisureExpenseAmount'],
  ['문화·취미', 'cultureExpenseAmount'],
  ['교육', 'educationExpenseAmount'],
  ['유흥', 'entertainmentExpenseAmount'],
] as const

export const createRows = (
  source: Record<string, number | null | undefined> | null | undefined,
  definitions: readonly (readonly [string, string])[],
): AnalysisMetricRow[] =>
  toMetricRows(
    source,
    definitions as readonly (readonly [
      string,
      keyof Record<string, number | null | undefined>,
    ])[],
  )

/** 시간대별 항목(라벨+값)을 LineChart 분기 추세 포인트 형태로 재사용한다. */
export const toLinePoints = (
  rows: readonly AnalysisMetricRow[],
): TrendPoint[] =>
  rows.map(row => ({ periodLabel: row.label, value: row.value, changeRate: null }))

export const buildSalesTimeLine = (
  sales: CommercialSales | null,
): TrendPoint[] =>
  toLinePoints(
    createRows(
      sales?.amountByTimeSlotItem as Record<string, number | null> | null | undefined,
      salesTimeDefinitions,
    ),
  )

export const buildFootDayBars = (
  foot: CommercialFootTraffic | null,
): AnalysisMetricRow[] =>
  createRows(
    foot?.byDayOfWeekItem as Record<string, number | null> | null | undefined,
    footDayDefinitions,
  )

export const buildFootAgeGenderPyramid = (
  foot: CommercialFootTraffic | null,
): PyramidRow[] => toPyramidRows(foot?.byAgeGenderPercentItem)

export type SalesGrowth = {
  direction: 'INCREASE' | 'DECREASE' | 'STAGNANT' | null
  changeRate: number | null
}

export const selectSalesGrowth = (
  trend: CommercialTrend | null,
): SalesGrowth => {
  const periods = trend?.periods ?? []
  const last = periods[periods.length - 1]
  const rate = last?.changeRate
  return {
    direction: trend?.trendDirection ?? null,
    changeRate: typeof rate === 'number' && Number.isFinite(rate) ? rate : null,
  }
}
```

그 후 `analysis-result-view.tsx`에서 옮긴 정의/헬퍼(L552-632) 삭제하고 import 추가:

```ts
import {
  createRows,
  toLinePoints,
  footTimeDefinitions,
  footDayDefinitions,
  salesTimeDefinitions,
  salesDayDefinitions,
  salesAgeDefinitions,
  populationAgeDefinitions,
  expenseDefinitions,
} from '@/lib/analysis/commercial-chart-selectors'
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/lib/analysis/commercial-chart-selectors.test.ts` (PASS) + `pnpm exec tsc --noEmit --incremental false`(결과 뷰 회귀 없음).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/analysis/commercial-chart-selectors.ts src/lib/analysis/commercial-chart-selectors.test.ts src/components/analysis/analysis-result-view.tsx
git commit -m "refactor(analysis): 상권 차트 셀렉터 공유 모듈 추출 + 성장률 셀렉터"
```

---

## Task 4: 차트 컴포넌트 optional `height` prop

리포트 맥락(더 낮은 높이)에 맞추려면 차트 높이를 조절해야 한다. 현재 `LineChart`(240)·`BarChart`(240)·`PopulationPyramid`(260)는 하드코딩이므로 optional prop을 추가한다(기본값=현재 값 → 기존 사용처 무변).

**Files:**
- Modify: `src/components/analysis/charts/line-chart.tsx` (props L51-56, height L80)
- Modify: `src/components/analysis/charts/bar-chart.tsx` (props L28-34, height L61)
- Modify: `src/components/analysis/charts/population-pyramid.tsx` (props L48-51, height L82)
- Test: 각 차트의 기존 `*.test.ts`에 prop 기본값/전달 순수 검증 추가(렌더 대신 export된 상수/기본값 확인). 렌더 불가 시, 최소한 컴포넌트 파일이 `height`를 받는지 소스 문자열 검증으로 대체.

**Interfaces:**
- Produces(각 차트): 새 optional prop `height?: number`. `LineChart` 기본 240, `BarChart` 기본 240, `PopulationPyramid` 기본 260. 내부 `ResponsiveContainer height={height}`.

- [ ] **Step 1: 실패 테스트 작성** — `src/components/analysis/charts/line-chart.test.ts`에 소스 계약 테스트 추가(node 환경 관행):

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

it('LineChart는 optional height prop을 노출한다', () => {
  const src = readFileSync(
    fileURLToPath(new URL('./line-chart.tsx', import.meta.url)),
    'utf8',
  )
  expect(src).toContain('height?: number')
  expect(src).toContain('height = 240')
})
```

(`bar-chart.test.ts`는 `height = 240`, `population-pyramid.test.ts`는 `height = 260`으로 동일 패턴.)

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/components/analysis/charts/line-chart.test.ts`. Expected: FAIL.

- [ ] **Step 3: 구현** — 각 차트에서 props 타입에 `height?: number` 추가, 구조분해에 `height = 240`(pyramid는 260) 기본값, 내부 `ResponsiveContainer`의 `height={240}`(하드코딩)을 `height={height}`로 교체. 예(`line-chart.tsx`):

```tsx
export type LineChartProps = {
  points: TrendPoint[]
  unit: string
  direction?: 'INCREASE' | 'DECREASE' | 'STAGNANT' | null
  ariaLabel?: string
  height?: number
}

export default function LineChart({
  points,
  unit,
  direction = null,
  ariaLabel = '분기별 추세 라인 차트',
  height = 240,
}: LineChartProps) {
  // …
  // <ResponsiveContainer width="100%" height={height}> 로 교체
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/components/analysis/charts/`. Expected: PASS. 기존 차트 테스트도 그대로 통과(기본값이 현행과 동일).

- [ ] **Step 5: 커밋**

```bash
git add src/components/analysis/charts/line-chart.tsx src/components/analysis/charts/bar-chart.tsx src/components/analysis/charts/population-pyramid.tsx src/components/analysis/charts/*.test.ts
git commit -m "feat(charts): Line/Bar/Pyramid에 optional height prop 추가"
```

---

## Task 5: 라우트 셸 + 클라이언트 서피스(searchParams)

`/analysis/report` 서버 셸과 클라이언트 서피스를 만든다. 결과 페이지 패턴(`result/page.tsx` → `analysis-result-page.tsx`)을 그대로 미러링한다.

**Files:**
- Create: `app/(shell)/analysis/report/page.tsx`
- Create: `src/components/analysis/ai-report-page.tsx`
- Create: `app/(shell)/analysis/report/report-route.test.ts` (소스 계약 테스트)

**Interfaces:**
- Consumes: `createPageMetadata`(`@/lib/metadata`), `useSearchParams`(next/navigation), `parseAnalysisSelection`(`@/lib/analysis/selection`)
- Produces: default export `Page`(server), `AiReportPage`(client, 이후 Task 9에서 `<AiReportPageView/>` 렌더). 이 Task에서는 서피스가 selection을 파싱해 `<AiReportPageView selection=… />` 자리를 잡되, 뷰가 아직 없으면 임시로 selection 요약만 렌더하고 Task 9에서 교체.

- [ ] **Step 1: 실패 테스트 작성** — `app/(shell)/analysis/report/report-route.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('analysis/report route', () => {
  it('page.tsx는 metadata path와 Suspense를 갖는다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./page.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain("path: '/analysis/report'")
    expect(src).toContain('Suspense')
    expect(src).toContain('AiReportPage')
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run "app/(shell)/analysis/report/report-route.test.ts"`. Expected: FAIL.

- [ ] **Step 3: 구현** — `app/(shell)/analysis/report/page.tsx`:

```tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import AiReportPage from '@/components/analysis/ai-report-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'AI 상권 리포트',
  description: '선택한 상권·업종의 핵심 지표와 AI 리포트를 한 화면에서 확인합니다.',
  path: '/analysis/report',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AiReportPage />
    </Suspense>
  )
}
```

`src/components/analysis/ai-report-page.tsx`(임시 뷰, Task 9에서 교체):

```tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { parseAnalysisSelection } from '@/lib/analysis/selection'

export default function AiReportPage() {
  const searchParams = useSearchParams()
  const selection = parseAnalysisSelection(searchParams)
  // Task 9에서 <AiReportPageView selection={selection} /> 로 교체
  return <main data-hide-footer="true" data-selection={selection.commercialCode ?? ''} />
}
```

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run "app/(shell)/analysis/report/report-route.test.ts"`. Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add "app/(shell)/analysis/report/page.tsx" src/components/analysis/ai-report-page.tsx "app/(shell)/analysis/report/report-route.test.ts"
git commit -m "feat(analysis): /analysis/report 라우트 셸 + 클라이언트 서피스"
```

---

## Task 6: 핵심 지표 4카드(성장률 포함) + 상태 리졸버

`fetchCommercialProfile.keyMetrics` 기반 3카드(월매출/유동인구/점포수) + 성장률 카드. 각 카드 로딩 시 스켈레톤.

**Files:**
- Create: `src/lib/analysis/report-section-state.ts` (순수 상태 리졸버 — 이 Task에서 지표 부분 시작)
- Create: `src/components/analysis/ai-report/report-metric-cards.tsx`
- Test: `src/lib/analysis/report-section-state.test.ts`

**Interfaces:**
- Consumes: `CommercialProfile`(`@/types/recommend`), `SalesGrowth`(Task 3), `formatAnalysisValue`(`@/lib/analysis/presentation`)
- Produces:
  - `type MetricCardModel = { label: string; display: string; loading: boolean; tone?: 'positive'|'negative'|'neutral' }`
  - `resolveMetricCards(input: { profile: CommercialProfile | null; profileLoading: boolean; growth: SalesGrowth; growthLoading: boolean }): MetricCardModel[]` — 항상 4개(월매출/유동인구/점포수/성장률). 로딩이면 `loading:true, display:''`. 성장률: `changeRate`를 `+xx.x%`/`-xx.x%`로, tone=direction(INCREASE→positive, DECREASE→negative, else neutral).
  - 컴포넌트 `ReportMetricCards({ cards }: { cards: MetricCardModel[] })` — 4열 그리드(모바일 스택), `loading`이면 스켈레톤 박스, 아니면 label+display(tone 색). 색: positive=green500, negative=red500, neutral=text 기본(모두 DESIGN.md 토큰).

- [ ] **Step 1: 실패 테스트 작성** — `report-section-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveMetricCards } from '@/lib/analysis/report-section-state'
import type { CommercialProfile } from '@/types/recommend'

const profile = {
  commercialName: '역삼동',
  keyMetrics: {
    totalSalesAmount: 345_000_000,
    totalFootTraffic: 32000,
    totalStoreCount: 32,
    totalResidentPopulation: 12000,
  },
} as unknown as CommercialProfile

describe('resolveMetricCards', () => {
  it('4개 카드를 순서대로 만든다(월매출/유동인구/점포수/성장률)', () => {
    const cards = resolveMetricCards({
      profile,
      profileLoading: false,
      growth: { direction: 'INCREASE', changeRate: 0.182 },
      growthLoading: false,
    })
    expect(cards.map(c => c.label)).toEqual(['월 매출', '유동인구', '점포 수', '성장률'])
    expect(cards[3].display).toBe('+18.2%')
    expect(cards[3].tone).toBe('positive')
    expect(cards[0].loading).toBe(false)
  })
  it('로딩 중이면 loading=true, display 빈 문자열', () => {
    const cards = resolveMetricCards({
      profile: null,
      profileLoading: true,
      growth: { direction: null, changeRate: null },
      growthLoading: true,
    })
    expect(cards.every(c => c.loading)).toBe(true)
  })
  it('성장률 변화율 없으면 데이터 없음·neutral', () => {
    const cards = resolveMetricCards({
      profile,
      profileLoading: false,
      growth: { direction: 'STAGNANT', changeRate: null },
      growthLoading: false,
    })
    expect(cards[3].display).toBe('데이터 없음')
    expect(cards[3].tone).toBe('neutral')
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/lib/analysis/report-section-state.test.ts`. Expected: FAIL.

- [ ] **Step 3: 구현** — `report-section-state.ts`에 지표 리졸버:

```ts
import { formatAnalysisValue } from '@/lib/analysis/presentation'
import type { SalesGrowth } from '@/lib/analysis/commercial-chart-selectors'
import type { CommercialProfile } from '@/types/recommend'

export type MetricTone = 'positive' | 'negative' | 'neutral'
export type MetricCardModel = {
  label: string
  display: string
  loading: boolean
  tone?: MetricTone
}

const formatGrowth = (growth: SalesGrowth): { display: string; tone: MetricTone } => {
  if (growth.changeRate === null) return { display: '데이터 없음', tone: 'neutral' }
  const pct = growth.changeRate * 100
  const sign = pct > 0 ? '+' : ''
  const tone: MetricTone =
    growth.direction === 'INCREASE' ? 'positive' : growth.direction === 'DECREASE' ? 'negative' : 'neutral'
  return { display: `${sign}${pct.toFixed(1)}%`, tone }
}

export const resolveMetricCards = ({
  profile,
  profileLoading,
  growth,
  growthLoading,
}: {
  profile: CommercialProfile | null
  profileLoading: boolean
  growth: SalesGrowth
  growthLoading: boolean
}): MetricCardModel[] => {
  const km = profile?.keyMetrics ?? null
  const g = formatGrowth(growth)
  return [
    { label: '월 매출', loading: profileLoading, display: profileLoading ? '' : formatAnalysisValue(km?.totalSalesAmount, '원') },
    { label: '유동인구', loading: profileLoading, display: profileLoading ? '' : formatAnalysisValue(km?.totalFootTraffic, '명') },
    { label: '점포 수', loading: profileLoading, display: profileLoading ? '' : formatAnalysisValue(km?.totalStoreCount, '개') },
    { label: '성장률', loading: growthLoading, display: growthLoading ? '' : g.display, tone: growthLoading ? undefined : g.tone },
  ]
}
```

그리고 `report-metric-cards.tsx`(styled-components, DESIGN.md 토큰; tone 색은 `theme.color`에서 green500/red500 사용, 로딩은 스켈레톤 박스, `aria-busy`):

```tsx
'use client'
import styled from 'styled-components'
import type { MetricCardModel } from '@/lib/analysis/report-section-state'
// Grid/Card/Skeleton styled 정의(기존 MetricCard 스타일 톤 준수), tone→색 매핑
export default function ReportMetricCards({ cards }: { cards: MetricCardModel[] }) {
  return (
    <Grid>
      {cards.map(card => (
        <Card key={card.label} aria-busy={card.loading}>
          <span>{card.label}</span>
          {card.loading ? <Skeleton aria-hidden /> : <Value $tone={card.tone}>{card.display}</Value>}
        </Card>
      ))}
    </Grid>
  )
}
```

> ⚠️ 구현 시 `theme` 토큰 접근 방식은 기존 차트/카드 styled 컴포넌트(`src/components/analysis/charts/*`, `analysis-result-view.tsx`의 `MetricCard`)와 동일 패턴을 따른다. reduced-motion에서 스켈레톤 shimmer 제거(`@media (prefers-reduced-motion: reduce)`).

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/lib/analysis/report-section-state.test.ts`. Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/analysis/report-section-state.ts src/lib/analysis/report-section-state.test.ts src/components/analysis/ai-report/report-metric-cards.tsx
git commit -m "feat(analysis): 리포트 핵심 지표 4카드(성장률) + 상태 리졸버"
```

---

## Task 7: 엄선 차트 섹션(3개) + 빈/로딩 상태

시간대별 매출(Line)·요일별 유동인구(Bar)·연령·성별 유동인구(Pyramid). 각 차트별 스켈레톤/"데이터 없음".

**Files:**
- Modify: `src/lib/analysis/report-section-state.ts` (차트 상태 리졸버 추가)
- Create: `src/components/analysis/ai-report/report-chart-section.tsx`
- Test: `src/lib/analysis/report-section-state.test.ts` (append)

**Interfaces:**
- Consumes: `buildSalesTimeLine`/`buildFootDayBars`/`buildFootAgeGenderPyramid`(Task 3), `hasLineData`(`@/components/analysis/charts/line-chart`), 차트 컴포넌트(Task 4, `height` prop)
- Produces:
  - `type ChartSlotState = 'loading' | 'ready' | 'empty'`
  - `resolveChartSlot(loading: boolean, isEmpty: boolean): ChartSlotState` — loading우선 → empty → ready
  - 컴포넌트 `ReportChartSection({ sales, foot, salesLoading, footLoading }: { sales, foot, salesLoading, footLoading })` — 3개 차트 카드. 각 카드는 `resolveChartSlot`으로 skeleton/empty/chart 분기. 차트는 `height`를 리포트용(예: 200)으로 전달.

- [ ] **Step 1: 실패 테스트 작성** — append:

```ts
import { resolveChartSlot } from '@/lib/analysis/report-section-state'

describe('resolveChartSlot', () => {
  it('로딩이 최우선', () => {
    expect(resolveChartSlot(true, true)).toBe('loading')
  })
  it('로딩 아니고 비었으면 empty', () => {
    expect(resolveChartSlot(false, true)).toBe('empty')
  })
  it('데이터 있으면 ready', () => {
    expect(resolveChartSlot(false, false)).toBe('ready')
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/lib/analysis/report-section-state.test.ts`. Expected: FAIL(`resolveChartSlot` 없음).

- [ ] **Step 3: 구현** — 리졸버:

```ts
export type ChartSlotState = 'loading' | 'ready' | 'empty'
export const resolveChartSlot = (loading: boolean, isEmpty: boolean): ChartSlotState =>
  loading ? 'loading' : isEmpty ? 'empty' : 'ready'
```

`report-chart-section.tsx`(빈 검사: Line은 `hasLineData(points)`, Bar는 모든 value null 여부, Pyramid는 모든 male/female null; 각 차트 `height={200}`):

```tsx
'use client'
import styled from 'styled-components'
import LineChart, { hasLineData } from '@/components/analysis/charts/line-chart'
import BarChart from '@/components/analysis/charts/bar-chart'
import PopulationPyramid from '@/components/analysis/charts/population-pyramid'
import {
  buildSalesTimeLine,
  buildFootDayBars,
  buildFootAgeGenderPyramid,
} from '@/lib/analysis/commercial-chart-selectors'
import { resolveChartSlot } from '@/lib/analysis/report-section-state'
import type { CommercialFootTraffic, CommercialSales } from '@/types/commercial-analysis'
// 각 차트를 카드로 감싸고 제목(언제 파나/붐비나/누가 오나)과 slot 분기 렌더
export default function ReportChartSection(props: {
  sales: CommercialSales | null
  foot: CommercialFootTraffic | null
  salesLoading: boolean
  footLoading: boolean
}) { /* … 3 slot 렌더 … */ }
```

> ⚠️ 빈 검사 헬퍼는 Task 3의 빌더 결과에 대해 계산한다(예: Bar `items.every(r => r.value === null)`, Pyramid `rows.every(r => r.male === null && r.female === null)`). 차트 카드 스타일은 결과 뷰 차트 카드 톤을 따른다.

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/lib/analysis/report-section-state.test.ts`. Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/analysis/report-section-state.ts src/lib/analysis/report-section-state.test.ts src/components/analysis/ai-report/report-chart-section.tsx
git commit -m "feat(analysis): 리포트 엄선 차트 3섹션 + 슬롯 상태"
```

---

## Task 8: AI 인사이트 섹션(2단 속도) + 잠금 + 에러

`useAiReport` 상태를 받아: loading→진행 스테퍼+스켈레톤, ready-commercial→요약/강점(green)/주의(warning)/추천(칩), error→재시도, empty→안내. 비로그인→`AiReportLockCard`.

**Files:**
- Modify: `src/lib/analysis/report-section-state.ts` (AI 섹션 상태 리졸버)
- Create: `src/components/analysis/ai-report/report-insight-section.tsx`
- Test: `src/lib/analysis/report-section-state.test.ts` (append)

**Interfaces:**
- Consumes: `AiReportState`(`@/hooks/use-ai-report`), `CommercialReportView`(`@/lib/analysis/ai-report-presentation`), `AiReportLockCard`(default, props `{ level, loginHref }`), `resolveAiReportVisibility`(`@/lib/analysis/ai-report-presentation`)
- Produces:
  - `type InsightMode = 'locked' | 'loading' | 'ready' | 'empty' | 'error'`
  - `resolveInsightMode(input: { hydrated: boolean; isLoggedIn: boolean; state: AiReportState }): InsightMode` — 비로그인(hydrated)→`locked`; 그 외 state.status 매핑(loading→loading, ready-commercial→ready, empty→empty, error→error, idle→loading).
  - 컴포넌트 `ReportInsightSection({ mode, state, loginHref, onRetry })` — mode별 렌더. ready일 때 `state.view`(CommercialReportView) 사용: `headline.summary`+`insight`, `strengths[]`(green 카드+체크), `risks[]`(warning 카드), `actions[]`(칩 리스트). 진행 스테퍼는 `state.stage`/`progressMessages`. `aria-live="polite"`로 진행 안내.

- [ ] **Step 1: 실패 테스트 작성** — append:

```ts
import { resolveInsightMode } from '@/lib/analysis/report-section-state'
import type { AiReportState } from '@/hooks/use-ai-report'

const loading: AiReportState = { status: 'loading', stage: null, progressMessages: [] }

describe('resolveInsightMode', () => {
  it('비로그인(hydrated)이면 locked', () => {
    expect(resolveInsightMode({ hydrated: true, isLoggedIn: false, state: loading })).toBe('locked')
  })
  it('로그인 + loading이면 loading', () => {
    expect(resolveInsightMode({ hydrated: true, isLoggedIn: true, state: loading })).toBe('loading')
  })
  it('ready-commercial이면 ready', () => {
    const state = { status: 'ready-commercial', view: {} } as AiReportState
    expect(resolveInsightMode({ hydrated: true, isLoggedIn: true, state })).toBe('ready')
  })
  it('error이면 error', () => {
    const state = { status: 'error', message: 'x', errorKind: 'generic', canRetry: true } as AiReportState
    expect(resolveInsightMode({ hydrated: true, isLoggedIn: true, state })).toBe('error')
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/lib/analysis/report-section-state.test.ts`. Expected: FAIL.

- [ ] **Step 3: 구현** — 리졸버:

```ts
import type { AiReportState } from '@/hooks/use-ai-report'

export type InsightMode = 'locked' | 'loading' | 'ready' | 'empty' | 'error'
export const resolveInsightMode = ({
  hydrated,
  isLoggedIn,
  state,
}: {
  hydrated: boolean
  isLoggedIn: boolean
  state: AiReportState
}): InsightMode => {
  if (hydrated && !isLoggedIn) return 'locked'
  switch (state.status) {
    case 'ready-commercial':
      return 'ready'
    case 'empty':
      return 'empty'
    case 'error':
      return 'error'
    default:
      return 'loading'
  }
}
```

`report-insight-section.tsx` — mode별 UI. ready는 `state.status === 'ready-commercial'`일 때 `state.view` 사용(타입 내로잉). 강점=green500 카드, 주의=orange500 카드, 추천=칩. 진행 스테퍼는 `state.status==='loading'`의 `stage?.name`/`stage?.description`+`progressMessages`. locked는 `<AiReportLockCard level="commercial" loginHref={loginHref} />`. error는 메시지+`onRetry` 버튼(`canRetry`).

> ⚠️ `state.view` 접근은 반드시 `state.status === 'ready-commercial'` 가드 안에서. 잠금/스텝/스켈레톤 스타일은 기존 `report-blocks.tsx`·`ai-report-panel.tsx` 톤을 따른다. reduced-motion에서 스켈레톤 shimmer/전환 제거.

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/lib/analysis/report-section-state.test.ts`. Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/analysis/report-section-state.ts src/lib/analysis/report-section-state.test.ts src/components/analysis/ai-report/report-insight-section.tsx
git commit -m "feat(analysis): AI 인사이트 섹션(2단 속도/잠금/에러) + 모드 리졸버"
```

---

## Task 9: 오케스트레이션 뷰 + 사이드바 진입 CTA + 상태 갱신

빠른 층(병렬 쿼리)과 느린 층(useAiReport)을 조립하고, 헤더·푸터·깔때기 링크를 붙인다. 사이드바에 "AI 리포트 보기" CTA를 추가한다.

**Files:**
- Create: `src/components/analysis/ai-report-page-view.tsx`
- Modify: `src/components/analysis/ai-report-page.tsx` (임시 렌더 → `<AiReportPageView selection={selection} />`)
- Modify: `src/components/analysis/ai-report/ai-report-panel.tsx` (헤더/푸터에 `createAiReportHref` CTA)
- Modify: `docs/features/_index.md` (analysis 노트에 전용 리포트 페이지 반영)
- Test: `src/components/analysis/ai-report/ai-report-panel.test.ts` (CTA href 존재 소스 검증 — 기존 테스트 톤)

**Interfaces:**
- Consumes: `parseAnalysisSelection`/`isCompleteAnalysisSelection`/`createAiReportHref`/`createAnalysisResultHref`(selection.ts), `resolveAiReportLevel`/`resolveAiReportTargetCode`(ai-report-presentation), `useAiReport`(hooks), `useAuthStore`(stores/auth-store), `fetchCommercialProfile`(`@/lib/api/recommend`), `fetchCommercialSales`/`fetchCommercialFootTraffic`/`fetchCommercialTrend`(`@/lib/api/commercial-analysis`), `getResponseBody`(Task 1), `selectSalesGrowth`(Task 3), `resolveMetricCards`/`resolveInsightMode`(Task 6/8), 세 섹션 컴포넌트(Task 6/7/8)
- Produces: `AiReportPageView({ selection }: { selection: AnalysisSelection })`

- [ ] **Step 1: 실패 테스트 작성** — `ai-report-panel.test.ts`에 CTA 소스 계약 추가:

```ts
it('패널은 전용 AI 리포트 페이지 CTA를 렌더한다', () => {
  const src = readFileSync(
    fileURLToPath(new URL('./ai-report-panel.tsx', import.meta.url)),
    'utf8',
  )
  expect(src).toContain('createAiReportHref')
  expect(src).toContain('AI 리포트 보기')
})
```

(파일 상단에 `readFileSync`/`fileURLToPath` import가 없으면 추가.)

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/components/analysis/ai-report/ai-report-panel.test.ts`. Expected: FAIL.

- [ ] **Step 3: 구현** — `ai-report-page-view.tsx`(오케스트레이션):

```tsx
'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import type { AnalysisSelection } from '@/lib/analysis/selection'
import { createAnalysisResultHref } from '@/lib/analysis/selection'
import {
  resolveAiReportLevel,
  resolveAiReportTargetCode,
} from '@/lib/analysis/ai-report-presentation'
import { useAiReport } from '@/hooks/use-ai-report'
import { useAuthStore } from '@/stores/auth-store'
import { getResponseBody } from '@/lib/api/response'
import {
  fetchCommercialSales,
  fetchCommercialFootTraffic,
  fetchCommercialTrend,
} from '@/lib/api/commercial-analysis'
import { fetchCommercialProfile } from '@/lib/api/recommend'
import { selectSalesGrowth } from '@/lib/analysis/commercial-chart-selectors'
import {
  resolveMetricCards,
  resolveInsightMode,
} from '@/lib/analysis/report-section-state'
import ReportMetricCards from '@/components/analysis/ai-report/report-metric-cards'
import ReportChartSection from '@/components/analysis/ai-report/report-chart-section'
import ReportInsightSection from '@/components/analysis/ai-report/report-insight-section'

const PERIOD = '20233' // ANALYSIS_PERIOD_CODE (selection.periodCode 우선)

export default function AiReportPageView({ selection }: { selection: AnalysisSelection }) {
  const hasHydrated = useAuthStore(s => s.hasHydrated)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)

  const commercialCode = selection.commercialCode
  const serviceCode = selection.serviceCode
  const periodCode = selection.periodCode ?? PERIOD
  const enabled = Boolean(commercialCode && serviceCode)

  const profileQuery = useQuery({
    queryKey: ['analysis', 'profile', commercialCode, serviceCode, periodCode],
    queryFn: () => fetchCommercialProfile(commercialCode!, serviceCode!, periodCode),
    enabled,
    retry: 1,
  })
  const salesQuery = useQuery({
    queryKey: ['analysis', 'sales', commercialCode, serviceCode, periodCode],
    queryFn: () => fetchCommercialSales(commercialCode!, serviceCode!, periodCode),
    enabled,
    retry: 1,
  })
  const footQuery = useQuery({
    queryKey: ['analysis', 'foot-traffic', commercialCode, periodCode],
    queryFn: () => fetchCommercialFootTraffic(commercialCode!, periodCode),
    enabled: Boolean(commercialCode),
    retry: 1,
  })
  const salesTrendQuery = useQuery({
    queryKey: ['analysis', 'trend', commercialCode, serviceCode, 'SALES', periodCode],
    queryFn: () =>
      fetchCommercialTrend(commercialCode!, {
        serviceCode: serviceCode!,
        metricType: 'SALES',
        periodCode,
        periodCount: 4,
      }),
    enabled,
    retry: 1,
  })

  const profile = getResponseBody(profileQuery.data)
  const sales = getResponseBody(salesQuery.data)
  const foot = getResponseBody(footQuery.data)
  const growth = selectSalesGrowth(getResponseBody(salesTrendQuery.data))

  const cards = resolveMetricCards({
    profile,
    profileLoading: profileQuery.isLoading,
    growth,
    growthLoading: salesTrendQuery.isLoading,
  })

  const level = resolveAiReportLevel(selection)
  const code = level ? resolveAiReportTargetCode(selection, level) : null
  const { state, retry } = useAiReport({
    level,
    code,
    serviceCode,
    active: true,
    enabled: hasHydrated && isLoggedIn,
  })
  const insightMode = resolveInsightMode({ hydrated: hasHydrated, isLoggedIn, state })

  const loginHref = useMemo(
    () => `/login?redirect=${encodeURIComponent('/analysis/report?commercialCode=' + (commercialCode ?? ''))}`,
    [commercialCode],
  )
  const resultHref = createAnalysisResultHref(selection, 'summary')

  return (
    <Main data-hide-footer="true">
      <Header>
        <h1>{profile?.commercialName ?? '상권 리포트'}</h1>
        {/* 업종명은 profile 없을 때 serviceCode 표기 */}
      </Header>
      <ReportMetricCards cards={cards} />
      <ReportChartSection
        sales={sales}
        foot={foot}
        salesLoading={salesQuery.isLoading}
        footLoading={footQuery.isLoading}
      />
      <ReportInsightSection mode={insightMode} state={state} loginHref={loginHref} onRetry={retry} />
      <Footer>
        <a href={resultHref}>전체 데이터 분석 보기</a>
      </Footer>
    </Main>
  )
}
```

`ai-report-page.tsx`의 임시 렌더를 `<AiReportPageView selection={selection} />`로 교체. `ai-report-panel.tsx` 헤더/푸터에 `createAiReportHref(selection)`로 "AI 리포트 보기" 링크(next `Link` 또는 앵커, 기존 패널 CTA 스타일 준수) 추가.

`docs/features/_index.md`의 analysis 노트에 문장 추가: "전용 AI 리포트 페이지(`/analysis/report`, 상권 v1, 2단 속도) 구현".

> ⚠️ 구현 시 확정: (1) `fetchCommercialProfile` 반환이 `ApiResponse` 엔벌롭이므로 `getResponseBody`로 언랩 확인. (2) `useAiReport`의 `active` 의미(기존 패널은 패널 오픈 상태를 전달) — 전용 페이지는 항상 활성이므로 `active:true`. (3) 헤더 업종명 소스(profile엔 serviceName 없음): 필요시 기존 `fetchCommercialServiceCategories`로 매핑하거나 serviceCode 표기로 시작. (4) styled `Main`은 결과 뷰 `AnalysisResultPageSurface`(`data-hide-footer`) 톤을 따른다.

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/components/analysis/ai-report/ai-report-panel.test.ts`. Expected: PASS. 이어서 전체 검증: `pnpm qa:verify`(format:check → lint → typecheck → build) 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/components/analysis/ai-report-page-view.tsx src/components/analysis/ai-report-page.tsx src/components/analysis/ai-report/ai-report-panel.tsx src/components/analysis/ai-report/ai-report-panel.test.ts docs/features/_index.md
git commit -m "feat(analysis): AI 리포트 전용 페이지 2단 속도 오케스트레이션 + 진입 CTA"
```

---

## Self-Review (작성자 체크)

**1. 스펙 커버리지 (D2 요구사항 → Task)**
- D2-1 빠른 층 즉시 렌더 → Task 6/7/9. D2-2 느린 층 자리+스테퍼 → Task 8. D2-3 도착 시 채움 → Task 8/9. D2-4 차트 3종 → Task 7. D2-5 지표 4카드 → Task 6. D2-6 강점/주의 색 위계 → Task 8(green/warning). D2-7 비로그인 잠금 → Task 8(resolveInsightMode locked). D2-8 결과 페이지 위임 링크 → Task 9(footer). D2-9 부분 실패 격리 → 쿼리별 독립 상태(Task 6/7/9, react-query per-query). D2-10 DESIGN 토큰·reduced-motion → 각 UI Task ⚠️ 노트.
- 열린 결정: 라우트명(report), 비로그인(차트 노출+AI 잠금), 필드 매핑(공유 셀렉터 Task 3), 성장률 소스(SALES trend Task 3/6) — 모두 확정·반영.

**2. 플레이스홀더 스캔** — 각 Task는 실제 테스트/구현 코드를 포함. UI 컴포넌트의 styled 세부는 "기존 톤 준수" ⚠️ 노트로 위임(렌더 테스트 불가 환경 특성상 순수 로직만 강제 테스트). TODO/미정 문구 없음.

**3. 타입 일관성** — `getResponseBody`(Task 1)·`SalesGrowth`/`selectSalesGrowth`(Task 3)·`MetricCardModel`/`resolveMetricCards`(Task 6)·`ChartSlotState`/`resolveChartSlot`(Task 7)·`InsightMode`/`resolveInsightMode`(Task 8)의 시그니처가 Task 9 소비처와 일치. `AiReportState` 내로잉(`ready-commercial`) 일관.

## 실행 격리 / 참고
- 워크트리: `.worktrees/bosspick-ai-report`(브랜치 `feature/fe/ai-report-page`, `develop@38bef6c` 기준). 의존성 설치 완료.
- 명세 정본: 이 워크트리 `docs/features/analysis/ai-report-page.md`(PR #109 브랜치에서 복사).
- 각 Task의 부분 검증은 `pnpm exec vitest run <경로>`, 최종은 `pnpm qa:verify`.
