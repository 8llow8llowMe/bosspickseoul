# Commercial Analysis Map Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 최신 OpenAPI에 맞는 공개 지도 탐색형 `/analysis`와 URL 기반 `/analysis/result` 리포트를 구현한다.

**Architecture:** 선택 코드는 URL을 정본으로 두고 React Query는 지역 목록·지도 geometry·분석 지표의 서버 상태만 관리한다. Kakao loader와 추천 지도 geometry를 재사용하며, 결과 화면은 하나의 `AnalysisResultView`를 독립 페이지와 App Router intercepting modal이 공유한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, TanStack React Query, styled-components, Kakao Map SDK, Vitest

**Commit policy:** 승인된 명세는 `docs: 상권 분석 UX 명세 확정`으로 커밋했다. 아래 구현 변경은 사용자의 추가 요청 전까지 커밋하지 않는다.

---

## 파일 구조

| 파일                                                   | 책임                                               |
| ------------------------------------------------------ | -------------------------------------------------- |
| `middleware.ts`                                        | `/analysis` 공개, `/analysis/simulation` 보호 경계 |
| `src/lib/map/geometry.ts`                              | 지도 좌표·bounds 범용 유틸                         |
| `src/lib/analysis/selection.ts`                        | 선택 단계, URL 파싱·직렬화·하위 초기화             |
| `src/lib/analysis/presentation.ts`                     | 결과 탭, 숫자·분기·지표 배열 표현 유틸             |
| `src/types/commercial-analysis.ts`                     | 저장된 OpenAPI 기반 분석 DTO                       |
| `src/lib/api/commercial-analysis.ts`                   | 저장된 OpenAPI 경로만 호출하는 BFF adapter         |
| `src/components/analysis/analysis-map.tsx`             | Kakao 지도·bounds·폴리곤·SDK 상태                  |
| `src/components/analysis/analysis-selection-panel.tsx` | 4단계 후보·상태·CTA                                |
| `src/components/analysis/analysis-mobile-sheet.tsx`    | 모바일 접힘/펼침 선택 surface                      |
| `src/components/analysis/analysis-page.tsx`            | 탐색 query와 URL·지도·패널 orchestration           |
| `src/components/analysis/analysis-result-section.tsx`  | 섹션별 loading/error/empty 경계                    |
| `src/components/analysis/analysis-metric-list.tsx`     | 차트 패키지 없는 반응형 막대 지표                  |
| `src/components/analysis/analysis-result-view.tsx`     | 공유 리포트 헤더·탭·조회·액션                      |
| `src/components/analysis/analysis-result-page.tsx`     | 독립 결과 페이지 shell                             |
| `src/components/analysis/analysis-result-modal.tsx`    | 데스크톱 dialog와 모바일 full-screen surface       |
| `app/(shell)/analysis/layout.tsx` 및 `@modal/*`        | parallel/intercepting route                        |

---

### Task 1: 공개 분석 경로와 시뮬레이션 보호 경계

**Files:**

- Modify: `middleware.ts`
- Create: `middleware.test.ts`

- [ ] **Step 1: 실패하는 경로 분류 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import { isProtectedPath } from './middleware'

describe('isProtectedPath', () => {
  it.each(['/analysis', '/analysis/result'])('%s는 공개한다', pathname => {
    expect(isProtectedPath(pathname)).toBe(false)
  })

  it.each([
    '/analysis/simulation',
    '/analysis/simulation/report',
    '/simulation',
    '/community',
  ])('%s는 보호한다', pathname => {
    expect(isProtectedPath(pathname)).toBe(true)
  })
})
```

- [ ] **Step 2: 테스트가 기존 `/analysis` 보호 때문에 실패하는지 확인**

Run: `pnpm vitest run middleware.test.ts`

Expected: `/analysis`, `/analysis/result` 케이스 FAIL

- [ ] **Step 3: 명시적인 보호 prefix 구현**

```ts
export const PROTECTED_PATHS = [
  '/analysis/simulation',
  '/simulation',
  '/community',
  '/chatting',
  '/profile',
] as const

export const isProtectedPath = (pathname: string) =>
  PROTECTED_PATHS.some(
    path => pathname === path || pathname.startsWith(`${path}/`),
  )
```

matcher는 `/analysis/simulation/:path*`만 분석 하위에서 검사한다. redirect에는 `pathname + search`를 넣어 원래 결과 조건을 잃지 않는다.

- [ ] **Step 4: 단위 테스트 통과 확인**

Run: `pnpm vitest run middleware.test.ts`

Expected: PASS

---

### Task 2: 추천과 분석이 공유하는 지도 geometry

**Files:**

- Create: `src/lib/map/geometry.ts`
- Create: `src/lib/map/geometry.test.ts`
- Modify: `src/lib/recommend/recommend-map-model.ts`
- Modify: `src/lib/recommend/recommend-map-model.test.ts`

- [ ] **Step 1: 좌표 정규화와 bounds 실패 테스트 작성**

```ts
expect(
  normalizeBoundary([
    [127.01, 37.51],
    [Number.NaN, 37.5],
  ]),
).toEqual([{ lng: 127.01, lat: 37.51 }])
expect(createBounds([])).toBeNull()
expect(
  normalizeViewportBounds({
    lngSW: 127,
    latSW: 38,
    lngNE: 126,
    latNE: 37,
  }),
).toBeNull()
```

- [ ] **Step 2: 신규 테스트의 import 실패 확인**

Run: `pnpm vitest run src/lib/map/geometry.test.ts`

Expected: module not found FAIL

- [ ] **Step 3: 범용 유틸 이동**

`MapPoint`, `normalizeBoundary`, `createBounds`, `createCenterFallbackBounds`, `normalizeViewportBounds`를 `src/lib/map/geometry.ts`로 이동한다. 추천 모델은 다음처럼 재수출해 기존 import 호환성을 유지한다.

```ts
export {
  createBounds,
  createCenterFallbackBounds,
  normalizeBoundary,
  normalizeViewportBounds,
  type MapPoint,
} from '@/lib/map/geometry'
```

- [ ] **Step 4: 지도 유틸과 추천 회귀 테스트**

Run: `pnpm vitest run src/lib/map/geometry.test.ts src/lib/recommend/recommend-map-model.test.ts src/components/recommend/recommend-map.test.ts`

Expected: PASS

---

### Task 3: OpenAPI 기반 분석 타입과 API adapter

**Files:**

- Create: `src/types/commercial-analysis.ts`
- Create: `src/lib/api/commercial-analysis.ts`
- Create: `src/lib/api/commercial-analysis.test.ts`

- [ ] **Step 1: URL 생성 계약 테스트 작성**

Axios adapter를 호출하지 않고도 경로를 검증할 수 있도록 search param builder를 export한다.

```ts
expect(
  buildAnalysisContextSearchParams({
    districtCode: '11680',
    administrationCode: '11680640',
    serviceCode: 'CS100001',
    periodCode: '20233',
  }).toString(),
).toBe(
  'districtCode=11680&administrationCode=11680640&serviceCode=CS100001&periodCode=20233',
)

expect(
  buildTrendSearchParams({
    serviceCode: 'CS100001',
    metricType: 'SALES',
    periodCode: '20233',
    periodCount: 4,
  }).toString(),
).toBe('serviceCode=CS100001&metricType=SALES&periodCode=20233&periodCount=4')
```

- [ ] **Step 2: 신규 모듈 부재로 실패 확인**

Run: `pnpm vitest run src/lib/api/commercial-analysis.test.ts`

Expected: module not found FAIL

- [ ] **Step 3: OpenAPI DTO 정의**

`CommercialServiceCategory`, `CommercialFootTraffic`, `CommercialSales`, `CommercialSalesSummary`, `CommercialStoreAnalysis`, `CommercialResidentPopulation`, `CommercialIncomeAndExpense`, `CommercialIncomeSummary`, `CommercialFacility`, `CommercialTrend`, `CommercialBenchmark`와 각 `ApiResponse<T>` alias를 작성한다. 모든 OpenAPI optional property는 `?`와 `null`을 허용해 실데이터 유실에 안전하게 둔다.

- [ ] **Step 4: 정본 endpoint 함수 구현**

```ts
export const fetchCommercialServiceCategories = (commercialCode: string) =>
  apiClient
    .get<CommercialServiceCategoriesResponse>(
      `/commercials/${commercialCode}/service-categories`,
    )
    .then(response => response.data)

export const fetchCommercialFootTraffic = (
  commercialCode: string,
  periodCode: string,
) =>
  apiClient
    .get<CommercialFootTrafficResponse>(
      `/commercials/${commercialCode}/foot-traffic?${new URLSearchParams({
        periodCode,
      })}`,
    )
    .then(response => response.data)
```

동일 패턴으로 sales, summaries/sales, stores, population, income, summaries/income, facilities, trend, benchmarks를 저장된 OpenAPI의 필수 query와 함께 구현한다.

- [ ] **Step 5: adapter 테스트 통과 확인**

Run: `pnpm vitest run src/lib/api/commercial-analysis.test.ts`

Expected: PASS

---

### Task 4: 선택 URL 모델

**Files:**

- Create: `src/lib/analysis/selection.ts`
- Create: `src/lib/analysis/selection.test.ts`

- [ ] **Step 1: 하위 초기화·직렬화 테스트 작성**

```ts
expect(selectAnalysisValue(completeSelection, 'district', '11710')).toEqual({
  districtCode: '11710',
  administrationCode: null,
  commercialCode: null,
  serviceCode: null,
  periodCode: '20233',
})

expect(createAnalysisResultHref(completeSelection, 'summary')).toBe(
  '/analysis/result?districtCode=11680&administrationCode=11680640&commercialCode=3110008&serviceCode=CS100001&periodCode=20233&tab=summary',
)
```

- [ ] **Step 2: 신규 모듈 부재로 실패 확인**

Run: `pnpm vitest run src/lib/analysis/selection.test.ts`

Expected: module not found FAIL

- [ ] **Step 3: 선택 순서와 query 함수 구현**

```ts
export const ANALYSIS_PERIOD_CODE = '20233' as const
export const ANALYSIS_STEPS = [
  'district',
  'administration',
  'commercial',
  'service',
] as const

export const getActiveAnalysisStep = (
  selection: AnalysisSelection,
): AnalysisStep => {
  if (!selection.districtCode) return 'district'
  if (!selection.administrationCode) return 'administration'
  if (!selection.commercialCode) return 'commercial'
  return 'service'
}
```

`parseAnalysisSelection`, `selectAnalysisValue`, `createAnalysisExplorerHref`, `createAnalysisResultHref`, `isCompleteAnalysisSelection`을 순수 함수로 구현한다.

- [ ] **Step 4: 선택 모델 테스트 통과 확인**

Run: `pnpm vitest run src/lib/analysis/selection.test.ts`

Expected: PASS

---

### Task 5: 분석용 Kakao Map

**Files:**

- Create: `src/components/analysis/analysis-map.tsx`
- Create: `src/components/analysis/analysis-map.test.ts`
- Modify: `src/types/kakao-map.d.ts`

- [ ] **Step 1: server rendering과 semantic key 테스트 작성**

```ts
const markup = renderToStaticMarkup(
  createElement(AnalysisMap, {
    areas: [],
    activeStep: 'district',
    selectedCode: null,
    previewedCode: null,
    onSelect: () => undefined,
    onPreviewChange: () => undefined,
    onViewportBoundsChange: () => undefined,
  }),
)
expect(markup).toContain('분석 지역 지도')
expect(createAnalysisMapLayerKey(inputA)).toBe(
  createAnalysisMapLayerKey(inputB),
)
```

- [ ] **Step 2: 컴포넌트 부재로 실패 확인**

Run: `pnpm vitest run src/components/analysis/analysis-map.test.ts`

Expected: module not found FAIL

- [ ] **Step 3: 지도 초기화와 폴리곤 구현**

`loadKakaoMapSdk`, `normalizeBoundary`, `normalizeViewportBounds`를 사용한다. `idle`은 250ms debounce 후 bounds를 전달하고, polygon click은 code 선택, marker button focus/pointerenter는 preview를 전달한다.

```ts
const polygon = new maps.Polygon({
  map,
  path: points.map(point => new maps.LatLng(point.lat, point.lng)),
  clickable: true,
  strokeColor,
  fillColor,
  fillOpacity,
})
maps.event.addListener(polygon, 'click', () =>
  onSelectRef.current(area.areaCode),
)
```

SDK 실패 surface는 “지도를 불러오지 못했어요”와 재시도 버튼을 렌더링하고 children panel에는 영향을 주지 않는다.

- [ ] **Step 4: 지도 테스트와 추천 회귀 확인**

Run: `pnpm vitest run src/components/analysis/analysis-map.test.ts src/components/recommend/recommend-map.test.ts`

Expected: PASS

---

### Task 6: 단계형 선택 패널과 모바일 sheet

**Files:**

- Create: `src/components/analysis/analysis-selection-panel.tsx`
- Create: `src/components/analysis/analysis-selection-panel.test.ts`
- Create: `src/components/analysis/analysis-mobile-sheet.tsx`
- Create: `src/components/analysis/analysis-mobile-sheet.test.ts`

- [ ] **Step 1: 선택·상태·접근성 테스트 작성**

```ts
expect(markup).toContain('자치구')
expect(markup).toContain('행정동')
expect(markup).toContain('상권')
expect(markup).toContain('업종')
expect(markup).toContain('aria-selected="true"')
expect(markup).toContain('상권과 업종을 선택해 주세요')
```

모바일 sheet는 `aria-expanded`, 44px handle, collapsed/expanded 상태와 safe-area 스타일을 검증한다.

- [ ] **Step 2: 컴포넌트 부재로 실패 확인**

Run: `pnpm vitest run src/components/analysis/analysis-selection-panel.test.ts src/components/analysis/analysis-mobile-sheet.test.ts`

Expected: module not found FAIL

- [ ] **Step 3: 패널 구현**

패널 props는 `step`, `selection`, `items`, `selectedNames`, `status`, `onStepChange`, `onSelect`, `onPreviewChange`, `onRetry`, `onSubmit`으로 제한한다. loading은 `Skeleton`, error/empty는 `EmptyState`, 후보는 최소 높이 44px button과 `aria-selected`를 사용한다.

- [ ] **Step 4: 모바일 sheet 구현**

접힘 상태에는 현재 단계와 선택 요약을 표시하고 handle click/keyboard로 펼친다. 펼침 상태에서 panel body만 스크롤하며 `prefers-reduced-motion`에서는 transition을 제거한다.

- [ ] **Step 5: 패널 테스트 통과 확인**

Run: `pnpm vitest run src/components/analysis/analysis-selection-panel.test.ts src/components/analysis/analysis-mobile-sheet.test.ts`

Expected: PASS

---

### Task 7: `/analysis` 지도 탐색 orchestration

**Files:**

- Replace: `src/components/analysis/analysis-page.tsx`
- Create: `src/components/analysis/analysis-page.test.ts`
- Modify: `app/(shell)/analysis/page.tsx`

- [ ] **Step 1: 공개 탐색 markup과 footer 제거 테스트 작성**

```ts
expect(markup).toContain('data-hide-footer="true"')
expect(markup).toContain('분석할 지역을 선택해 주세요')
expect(markup).toContain('2023년 3분기 기준')
```

순수 query helpers를 통해 상위 선택 변경 시 하위 query가 비활성화되고 결과 CTA가 완성된 URL을 사용하는지 검증한다.

- [ ] **Step 2: 기존 카드형 화면 때문에 실패 확인**

Run: `pnpm vitest run src/components/analysis/analysis-page.test.ts`

Expected: 지도·문구·footer attribute assertion FAIL

- [ ] **Step 3: 지역·geometry queries 연결**

기존 추천 adapter의 `fetchDistrictMapAreas`, `fetchAdministrations`, `fetchAdministrationMapAreas`, `fetchCommercials`, `fetchCommercialMapAreas`, `fetchCommercialProfile`과 신규 service category adapter를 사용한다.

```ts
const administrationsQuery = useQuery({
  queryKey: ['analysis', 'administrations', selection.districtCode],
  queryFn: () => fetchAdministrations(selection.districtCode!),
  enabled: Boolean(selection.districtCode),
})
```

OpenAPI envelope가 success가 아니거나 `dataBody`가 예상 배열/객체가 아니면 error/empty 상태로 정규화한다.

- [ ] **Step 4: URL 동기화와 결과 이동**

선택 click은 `router.replace(createAnalysisExplorerHref(next))`, 결과 CTA는 `router.push(createAnalysisResultHref(selection, 'summary'))`를 사용한다. hover/focus는 URL을 바꾸지 않는다.

- [ ] **Step 5: 반응형 layout 구현**

데스크톱은 380px panel + map, 모바일은 full map + `AnalysisMobileSheet`로 구성하고 root `Page`에 `data-hide-footer="true"`를 지정한다.

- [ ] **Step 6: 탐색 테스트 통과 확인**

Run: `pnpm vitest run src/components/analysis/analysis-page.test.ts src/lib/analysis/selection.test.ts`

Expected: PASS

---

### Task 8: 결과 표현 순수 모델과 섹션 UI

**Files:**

- Create: `src/lib/analysis/presentation.ts`
- Create: `src/lib/analysis/presentation.test.ts`
- Create: `src/components/analysis/analysis-result-section.tsx`
- Create: `src/components/analysis/analysis-metric-list.tsx`

- [ ] **Step 1: 탭·포맷·지표 배열 테스트 작성**

```ts
expect(normalizeAnalysisTab('unknown')).toBe('summary')
expect(formatAnalysisValue(null, '원')).toBe('데이터 없음')
expect(formatPeriodCode('20233')).toBe('2023년 3분기')
expect(
  toMetricRows({ mondayFootTraffic: 10 }, [['월', 'mondayFootTraffic']]),
).toEqual([{ label: '월', value: 10 }])
```

- [ ] **Step 2: 신규 모듈 부재로 실패 확인**

Run: `pnpm vitest run src/lib/analysis/presentation.test.ts`

Expected: module not found FAIL

- [ ] **Step 3: 표현 유틸 구현**

`ANALYSIS_TABS`, `normalizeAnalysisTab`, `formatAnalysisValue`, `formatPeriodCode`, `toMetricRows`, `getMetricMaximum`을 구현한다. null은 0으로 바꾸지 않고 빈 배열은 empty로 판정한다.

- [ ] **Step 4: 섹션과 막대 리스트 구현**

`AnalysisResultSection`은 `loading`, `error`, `empty`, `onRetry`, `children`를 받고 상태별로 하나의 surface만 표시한다. `AnalysisMetricList`는 `max` 대비 CSS width와 실제 숫자 텍스트를 함께 제공한다.

- [ ] **Step 5: 표현 테스트 통과 확인**

Run: `pnpm vitest run src/lib/analysis/presentation.test.ts`

Expected: PASS

---

### Task 9: 공유 분석 리포트와 탭별 lazy query

**Files:**

- Create: `src/components/analysis/analysis-result-view.tsx`
- Replace: `src/components/analysis/analysis-result-page.tsx`
- Create: `src/components/analysis/analysis-result-page.test.ts`
- Modify: `src/hooks/use-commercial-bookmarks.ts`

- [ ] **Step 1: 잘못된 URL·탭·공개 결과 테스트 작성**

```ts
expect(createInvalidResultMessage(incompleteParams)).toBe(
  '분석 조건을 다시 선택해 주세요',
)
expect(createResultTabHref(validParams, 'trend')).toContain('tab=trend')
expect(getCommercialBookmarkLoginHref(currentHref)).toBe(
  `/login?redirect=${encodeURIComponent(currentHref)}`,
)
```

SSR markup은 “상권 분석 리포트”, 7개 탭, “2023년 3분기 기준”, `data-hide-footer="true"`를 검증한다.

- [ ] **Step 2: 기존 레거시 결과가 기대와 달라 실패하는지 확인**

Run: `pnpm vitest run src/components/analysis/analysis-result-page.test.ts`

Expected: 탭·문구·footer assertion FAIL

- [ ] **Step 3: 컨텍스트와 요약 query 구현**

profile, sales summary, stores, population, income summary, facilities를 독립 `useQuery`로 선언한다. `enabled`는 필수 코드 검증 결과를 공유하고 각 카드가 자체 loading/error/empty를 표시한다.

- [ ] **Step 4: 상세 탭 lazy query 구현**

활성 탭에만 foot traffic, sales, income, trend 3개 metric, benchmark query를 enable한다. stores/population/facilities는 summary query cache를 재사용한다.

- [ ] **Step 5: 공유·저장·시뮬레이션 액션**

공유는 `navigator.share` 우선, clipboard fallback을 사용한다. 북마크 payload는 다음 범위만 보낸다.

```ts
{
  targetType: 'COMMERCIAL',
  targetCode: params.commercialCode,
  targetName: profile.commercialName,
}
```

비로그인은 현재 result URL 전체를 로그인 redirect에 넣는다. CTA 라벨은 “상권 저장”이다.

- [ ] **Step 6: 결과 페이지 테스트 통과 확인**

Run: `pnpm vitest run src/components/analysis/analysis-result-page.test.ts src/lib/analysis/presentation.test.ts`

Expected: PASS

---

### Task 10: App Router 라우트 모달

**Files:**

- Create: `app/(shell)/analysis/layout.tsx`
- Create: `app/(shell)/analysis/@modal/default.tsx`
- Create: `app/(shell)/analysis/@modal/(.)result/page.tsx`
- Modify: `app/(shell)/analysis/result/page.tsx`
- Create: `src/components/analysis/analysis-result-modal.tsx`
- Create: `src/components/analysis/analysis-result-modal.test.ts`

- [ ] **Step 1: dialog 접근성 markup 테스트 작성**

```ts
expect(markup).toContain('role="dialog"')
expect(markup).toContain('aria-modal="true"')
expect(markup).toContain('상권 분석 결과 닫기')
```

- [ ] **Step 2: 신규 modal 부재로 실패 확인**

Run: `pnpm vitest run src/components/analysis/analysis-result-modal.test.ts`

Expected: module not found FAIL

- [ ] **Step 3: parallel/intercepting route 구현**

```tsx
export default function AnalysisLayout({
  children,
  modal,
}: {
  children: ReactNode
  modal: ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
```

`@modal/(.)result/page.tsx`는 `AnalysisResultModal`, canonical `result/page.tsx`는 `AnalysisResultPage`를 렌더링한다.

- [ ] **Step 4: modal interaction 구현**

데스크톱은 overlay 내부 24~32px 여백, 자체 scroll, sticky header를 사용한다. mount 시 이전 focus를 저장하고 첫 닫기 버튼에 focus, Tab 순환, Escape `router.back()`, unmount 시 focus 복원과 body scroll 복구를 구현한다. 모바일 media query에서는 overlay 여백과 radius를 제거해 full-screen으로 표시한다.

- [ ] **Step 5: 라우트와 dialog 테스트 통과 확인**

Run: `pnpm vitest run src/components/analysis/analysis-result-modal.test.ts src/components/analysis/analysis-result-page.test.ts`

Expected: PASS

---

### Task 11: 전체 회귀와 로컬 브라우저 검증

**Files:**

- Modify only if checks expose analysis-scope defects.

- [ ] **Step 1: analysis 집중 테스트**

Run:

```bash
pnpm vitest run \
  middleware.test.ts \
  src/lib/map/geometry.test.ts \
  src/lib/api/commercial-analysis.test.ts \
  src/lib/analysis/selection.test.ts \
  src/lib/analysis/presentation.test.ts \
  src/components/analysis
```

Expected: PASS

- [ ] **Step 2: 전체 테스트**

Run: `pnpm test`

Expected: Vitest 전체와 Node test PASS

- [ ] **Step 3: 정적 검증**

Run: `pnpm qa:verify`

Expected: format check, lint, typecheck, build 모두 exit 0

- [ ] **Step 4: 데스크톱 브라우저 검증**

`pnpm dev --hostname 0.0.0.0`로 실행하고 다음을 확인한다.

1. 비로그인 `/analysis` 접근
2. 지도 로딩/실패 fallback과 목록 독립 동작
3. 4단계 선택과 URL 갱신
4. 결과 CTA 후 inset modal
5. 7개 탭 URL과 partial 상태
6. Escape/닫기/뒤로가기 선택 복원
7. 푸터 미표시

- [ ] **Step 5: 모바일 브라우저 검증**

390×844 viewport에서 sheet 접힘/펼침, 44px touch target, 결과 full-screen, 탭 수평 스크롤, safe-area, 푸터 미표시를 확인한다.

- [ ] **Step 6: 실데이터 제약 기록**

API가 빈 배열이면 fixture 단위 테스트 결과와 실제 브라우저에서 확인 가능한 loading/error/empty 상태를 구분해 최종 보고한다. 실데이터가 있어야만 확인 가능한 폴리곤 좌표·숫자 단위·trend/benchmark 조합을 명시한다.
