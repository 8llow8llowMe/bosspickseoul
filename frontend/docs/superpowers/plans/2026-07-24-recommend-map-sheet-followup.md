# Recommend Map and Mobile Sheet Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 추천 페이지의 푸터를 제거하고, 모바일 바텀시트를 자연스러운 expanded/collapsed 동작으로 바꾸며, 현재 Kakao Map bounds로 자치구·행정동·상권 폴리곤을 조회한다.

**Architecture:** 추천 조건은 자치구·행정동·업종으로 유지한다. `RecommendMap`이 정규화된 viewport bounds를 페이지에 알리고, `RecommendPage`가 현재 depth의 지도 API만 React Query로 조회한다. 상권 지도 응답은 선택 행정동의 전체 상권 코드로 필터링하며 추천 요청 범위를 변경하지 않는다.

**Tech Stack:** Next.js 16, React 19, TypeScript, styled-components, TanStack Query, Vitest, Kakao Maps JavaScript SDK

**Commit policy:** 저장소 지침에 따라 사용자가 요청하기 전에는 커밋하지 않는다.

---

### Task 1: 추천 페이지 푸터 제외

**Files:**

- Modify: `src/components/layout/site-footer.test.ts`
- Modify: `src/components/layout/site-footer.tsx`
- Modify: `src/components/recommend/recommend-page.tsx`

- [ ] **Step 1: 모든 해상도용 footer opt-out 테스트 작성**

```ts
it('data-hide-footer main 바로 뒤의 footer를 모든 해상도에서 숨긴다', () => {
  const { styles } = renderFooter()
  expect(styles).toMatch(
    /main\[data-hide-footer=['"]true['"]\]\+[^}]+display:none/,
  )
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/layout/site-footer.test.ts`

Expected: `data-hide-footer` selector가 없어 FAIL.

- [ ] **Step 3: footer selector와 추천 page 속성 구현**

```css
main[data-hide-footer='true'] + & {
  display: none;
}
```

```tsx
<Page data-hide-footer="true">
```

- [ ] **Step 4: footer 테스트 통과 확인**

Run: `pnpm vitest run src/components/layout/site-footer.test.ts`

Expected: PASS.

### Task 2: 모바일 바텀시트 expanded/collapsed 전환

**Files:**

- Modify: `src/lib/recommend/recommend-state.ts`
- Modify: `src/components/recommend/recommend-mobile-sheet.test.ts`
- Modify: `src/components/recommend/recommend-mobile-sheet.tsx`
- Modify: `src/components/recommend/recommend-page.test.ts`
- Modify: `src/components/recommend/recommend-page.tsx`

- [ ] **Step 1: 상태와 최소 핸들 테스트 작성**

```ts
expect(RECOMMENDATION_SHEET_COLLAPSED_HEIGHT).toBe(44)
expect(renderSheet('collapsed', null, 'criteria').markup).toContain(
  'data-sheet-snap="collapsed"',
)
expect(renderSheet('collapsed').markup).not.toContain('1위')
expect(isRecommendationSheetInteractive('criteria')).toBe(true)
```

Reducer에는 criteria에서도 `sheetSnapChanged: collapsed`가 적용되고, 최초 상태는 `expanded`인지 검증한다.

- [ ] **Step 2: 바텀시트 테스트 실패 확인**

Run: `pnpm vitest run src/components/recommend/recommend-mobile-sheet.test.ts src/components/recommend/recommend-page.test.ts`

Expected: 기존 `peek` 타입, 88px 높이, criteria 비활성화 때문에 FAIL.

- [ ] **Step 3: snap 타입과 드래그 계산 구현**

```ts
export type RecommendationSheetSnap = 'expanded' | 'collapsed'
export const RECOMMENDATION_SHEET_COLLAPSED_HEIGHT = 44
export const RECOMMENDATION_SHEET_FLING_VELOCITY = 0.45

export const resolveRecommendationSheetSnap = (
  startSnap: RecommendationSheetSnap,
  deltaY: number,
  velocityY: number,
  bounds: RecommendationSheetBounds,
) => {
  if (Math.abs(velocityY) >= RECOMMENDATION_SHEET_FLING_VELOCITY) {
    return velocityY < 0 ? 'expanded' : 'collapsed'
  }
  const currentHeight =
    (startSnap === 'expanded'
      ? bounds.expandedHeight
      : bounds.collapsedHeight) - deltaY
  return currentHeight >= (bounds.expandedHeight + bounds.collapsedHeight) / 2
    ? 'expanded'
    : 'collapsed'
}
```

최근 pointer sample의 `clientY`와 `timeStamp`으로 `velocityY`를 계산한다. 드래그 중 CSS height는 기존 clamp 방식을 유지하고, 본문은 collapsed에서 `inert`와 `aria-hidden`을 적용한다.

- [ ] **Step 4: 핸들 전용 최소 UI와 모든 view 상호작용 구현**

`HandleSummary`를 제거하고 collapsed/expanded 모두 44px 핸들 행을 사용한다. criteria 강제 expanded와 disabled 처리를 제거한다. 지도 배경 클릭은 현재 view와 무관하게 collapsed를 dispatch한다.

- [ ] **Step 5: 바텀시트 테스트 통과 확인**

Run: `pnpm vitest run src/components/recommend/recommend-mobile-sheet.test.ts src/components/recommend/recommend-page.test.ts`

Expected: PASS.

### Task 3: viewport bounds 추출과 지도 API

**Files:**

- Modify: `src/types/kakao-map.d.ts`
- Modify: `src/lib/recommend/recommend-map-model.ts`
- Modify: `src/components/recommend/recommend-map.test.ts`
- Modify: `src/components/recommend/recommend-map.tsx`
- Modify: `src/lib/api/recommend.test.ts`
- Modify: `src/lib/api/recommend.ts`

- [ ] **Step 1: bounds 정규화와 commercial map API 테스트 작성**

```ts
expect(
  normalizeViewportBounds({
    lngSW: 126.91234567,
    latSW: 37.41234567,
    lngNE: 127.11234567,
    latNE: 37.61234567,
  }),
).toEqual({
  lngSW: 126.912346,
  latSW: 37.412346,
  lngNE: 127.112346,
  latNE: 37.612346,
})
```

```ts
await fetchCommercialMapAreas(bounds)
expect(get).toHaveBeenCalledWith(
  '/map/commercials?lngSW=126.9&latSW=37.45&lngNE=127.1&latNE=37.7',
)
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/recommend/recommend-map.test.ts src/lib/api/recommend.test.ts`

Expected: helper와 API 함수가 없어 FAIL.

- [ ] **Step 3: Kakao bounds 타입과 정규화 helper 구현**

```ts
type KakaoMapLatLngBounds = {
  extend(position: KakaoMapLatLng): void
  getSouthWest(): KakaoMapLatLng
  getNorthEast(): KakaoMapLatLng
}

type KakaoMapInstance = {
  getBounds(): KakaoMapLatLngBounds
  // existing methods
}
```

`normalizeViewportBounds`는 네 좌표를 소수점 6자리로 반올림하고 유효하지 않거나 역전된 bounds는 `null`을 반환한다.

- [ ] **Step 4: commercial map API 구현**

```ts
export const fetchCommercialMapAreas = async (bounds: GeoBounds) => {
  const response = await apiClient.get<MapAreasResponse>(
    `/map/commercials?${buildBoundsSearchParams(bounds)}`,
  )
  return response.data
}
```

- [ ] **Step 5: Kakao idle callback 구현**

`RecommendMapProps`에 `onViewportBoundsChange?: (bounds: GeoBounds) => void`를 추가한다. SDK 준비 후 `idle` listener에서 `map.getBounds()`를 읽고 300ms debounce한다. 마지막으로 전달한 정규화 bounds와 같으면 callback을 생략하고 cleanup에서 listener와 timer를 해제한다.

- [ ] **Step 6: 지도/API 테스트 통과 확인**

Run: `pnpm vitest run src/components/recommend/recommend-map.test.ts src/lib/api/recommend.test.ts`

Expected: PASS.

### Task 4: depth별 viewport 폴리곤 연결

**Files:**

- Modify: `src/components/recommend/recommend-page.test.ts`
- Modify: `src/components/recommend/recommend-page.tsx`
- Modify: `src/components/recommend/recommend-map.test.ts`
- Modify: `src/components/recommend/recommend-map.tsx`

- [ ] **Step 1: commercial stage와 필터 동작 테스트 작성**

```ts
expect(getRecommendationStage('criteria', district, administration)).toBe(
  'commercial',
)
expect(filterAreasByCodes(commercialAreas, ['C001'])).toEqual([
  commercialAreas[0],
])
```

지도 semantic key 테스트에는 commercial stage에서 선택 행정동 경계와 상권 geometry가 포함되는지 추가한다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/components/recommend/recommend-page.test.ts src/components/recommend/recommend-map.test.ts`

Expected: `commercial` stage와 props가 없어 FAIL.

- [ ] **Step 3: 페이지 query orchestration 구현**

`viewportBounds` 상태는 `SEOUL_MAP_BOUNDS`로 시작한다. district, administration, commercial 지도 query는 현재 stage일 때만 활성화하고 query key에 정규화 bounds를 포함한다. commercial 응답은 `commercials` 목록의 코드로 필터링한다.

```ts
const commercialMapQuery = useQuery({
  queryKey: [
    'recommend',
    'map',
    'commercials',
    state.draft.administration?.code,
    viewportBounds,
  ],
  queryFn: () => fetchCommercialMapAreas(viewportBounds),
  enabled: mapStage === 'commercial' && commercials.length > 0,
})
```

- [ ] **Step 4: commercial polygon 레이어 구현**

`RecommendMap`에 `commercialAreas`를 전달한다. commercial stage에서는 선택 행정동 경계를 context로 그리고, 필터링된 상권 폴리곤은 중립색으로 표시한다. 클릭은 로컬 preview 강조만 변경하며 district/administration/service 조건과 추천 후보 코드를 변경하지 않는다. 폴리곤 이벤트는 background click guard를 호출한다.

- [ ] **Step 5: 연결 테스트 통과 확인**

Run: `pnpm vitest run src/components/recommend/recommend-page.test.ts src/components/recommend/recommend-map.test.ts`

Expected: PASS.

### Task 5: 전체 검증과 로컬 UX 확인

**Files:**

- Verify only

- [ ] **Step 1: 전체 정적 검사**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: 모든 명령 PASS. 기존 Next.js middleware deprecation warning만 허용한다.

- [ ] **Step 2: 모바일 수동 검증**

`http://localhost:5173/recommend`에서 390×844 viewport로 확인한다.

- 최초 expanded
- 지도 배경 탭 → 44px 핸들만 노출
- 핸들 탭 또는 위 드래그 → expanded
- 아래 드래그 → collapsed
- 드래그 중 시트가 포인터를 따라 이동
- 폴리곤/마커 클릭이 시트를 최소화하지 않음
- 추천 페이지 푸터 미노출

- [ ] **Step 3: 데이터 제한 기록**

dev API가 `areas: []`를 반환하면 폴리곤 E2E는 데이터 적재 후 확인 필요로 기록하고, 프런트 query·필터·렌더링 단위 테스트 결과와 구분한다.
