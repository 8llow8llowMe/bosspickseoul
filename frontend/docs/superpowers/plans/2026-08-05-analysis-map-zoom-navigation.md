# 상권분석 지도 줌 기반 탐색 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상권분석 지도를 줌 레벨이 표시 레이어(구/동/상권)를 결정하는 지도-우선 탐색으로 바꾸고, 폴리곤 클릭 시 상위 계층을 자동 채우며, 상권+업종이 채워지면 즉시 분석으로 이동한다.

**Architecture:** 순수 로직(줌→레이어 매핑, point-in-polygon 부모 계산, selection 확장, 자동이동 조건)을 테스트 가능한 함수로 분리하고, `analysis-map`이 줌 레이어를 보고하도록, `analysis-page`가 레이어 기반으로 areas/쿼리/선택을 구성하도록 교체한다. 스냅백은 `fitToSelected`를 명시적 선택 전용으로 분리해 제거한다.

**Tech Stack:** Next.js App Router, TypeScript, styled-components, React Query, Kakao Maps SDK, Vitest.

## Global Constraints

- FE 전용. 백엔드 API·계약 변경 금지.
- 기존 디자인 토큰만 사용(임의 토큰 추가 금지).
- `pnpm qa:verify`(format/lint/typecheck/build) 통과 필수.
- 커밋 `[FE] type: 요약`, 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- 테스트는 Vitest. kakao 실객체는 fake 더블/순수 함수로 검증.
- 범위: 상권분석 페이지만. recommend 페이지 미변경.
- 분석 결과는 districtCode+administrationCode+commercialCode+serviceCode 4개 모두 필요.
- 행정동 코드 앞 5자리 = 자치구 코드.

---

### Task 1: 줌 레벨 → 레이어 매핑 순수 함수

**Files:**

- Create: `src/lib/analysis/map-layer.ts`
- Test: `src/lib/analysis/map-layer.test.ts`

**Interfaces:**

- Produces:
  - `type MapLayer = 'district' | 'administration' | 'commercial'`
  - `resolveMapLayerByZoom(level: number): MapLayer`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/lib/analysis/map-layer.test.ts
import { describe, expect, it } from 'vitest'
import { resolveMapLayerByZoom } from '@/lib/analysis/map-layer'

describe('resolveMapLayerByZoom', () => {
  it('level 7 이상은 자치구', () => {
    expect(resolveMapLayerByZoom(9)).toBe('district')
    expect(resolveMapLayerByZoom(7)).toBe('district')
  })
  it('level 5~6은 행정동', () => {
    expect(resolveMapLayerByZoom(6)).toBe('administration')
    expect(resolveMapLayerByZoom(5)).toBe('administration')
  })
  it('level 4 이하는 상권', () => {
    expect(resolveMapLayerByZoom(4)).toBe('commercial')
    expect(resolveMapLayerByZoom(1)).toBe('commercial')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/lib/analysis/map-layer.test.ts` → FAIL(모듈 없음)

- [ ] **Step 3: 구현**

```ts
// src/lib/analysis/map-layer.ts
export type MapLayer = 'district' | 'administration' | 'commercial'

export const resolveMapLayerByZoom = (level: number): MapLayer => {
  if (level >= 7) return 'district'
  if (level >= 5) return 'administration'
  return 'commercial'
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm exec vitest run src/lib/analysis/map-layer.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/map-layer.ts src/lib/analysis/map-layer.test.ts
git commit -m "$(printf '[FE] feat: 줌 레벨 → 지도 레이어 매핑 순수 함수 추가\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: 기하 포함관계 부모 계산 유틸

**Files:**

- Modify: `src/lib/map/geometry.ts` (함수 추가)
- Test: `src/lib/map/geometry.test.ts` (케이스 추가; 기존 테스트 유지)

**Interfaces:**

- Consumes: 기존 `MapPoint`, `normalizeBoundary`, `@/types/recommend`(`AreaBoundaryItem`).
- Produces:
  - `isPointInPolygon(point: MapPoint, ring: readonly MapPoint[]): boolean`
  - `findContainingArea(point: MapPoint, areas: readonly AreaBoundaryItem[]): AreaBoundaryItem | null`
  - `resolveDistrictCodeFromAdministration(administrationCode: string): string`

- [ ] **Step 1: 실패 테스트 작성 (기존 geometry.test.ts 하단에 추가)**

```ts
// src/lib/map/geometry.test.ts 에 추가
import {
  isPointInPolygon,
  findContainingArea,
  resolveDistrictCodeFromAdministration,
} from '@/lib/map/geometry'
import type { AreaBoundaryItem } from '@/types/recommend'

describe('isPointInPolygon', () => {
  const square = [
    { lng: 0, lat: 0 },
    { lng: 0, lat: 10 },
    { lng: 10, lat: 10 },
    { lng: 10, lat: 0 },
  ]
  it('내부 점은 true', () => {
    expect(isPointInPolygon({ lng: 5, lat: 5 }, square)).toBe(true)
  })
  it('외부 점은 false', () => {
    expect(isPointInPolygon({ lng: 15, lat: 5 }, square)).toBe(false)
  })
})

describe('findContainingArea', () => {
  const areas: AreaBoundaryItem[] = [
    {
      areaCode: '11215530',
      areaName: '자양동',
      centerLng: 5,
      centerLat: 5,
      boundaryCoords: [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
      ],
    },
  ]
  it('포함하는 area를 반환', () => {
    expect(findContainingArea({ lng: 5, lat: 5 }, areas)?.areaCode).toBe(
      '11215530',
    )
  })
  it('어디에도 없으면 최근접 중심점 area로 fallback', () => {
    expect(findContainingArea({ lng: 100, lat: 100 }, areas)?.areaCode).toBe(
      '11215530',
    )
  })
  it('빈 배열이면 null', () => {
    expect(findContainingArea({ lng: 5, lat: 5 }, [])).toBeNull()
  })
})

describe('resolveDistrictCodeFromAdministration', () => {
  it('앞 5자리를 반환', () => {
    expect(resolveDistrictCodeFromAdministration('11215530')).toBe('11215')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/lib/map/geometry.test.ts` → FAIL

- [ ] **Step 3: 구현 (geometry.ts 하단에 추가)**

```ts
// src/lib/map/geometry.ts 에 추가
import type { AreaBoundaryItem } from '@/types/recommend'

export const isPointInPolygon = (
  point: MapPoint,
  ring: readonly MapPoint[],
): boolean => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i].lng
    const yi = ring[i].lat
    const xj = ring[j].lng
    const yj = ring[j].lat
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export const findContainingArea = (
  point: MapPoint,
  areas: readonly AreaBoundaryItem[],
): AreaBoundaryItem | null => {
  if (areas.length === 0) return null
  for (const area of areas) {
    const ring = normalizeBoundary(area.boundaryCoords)
    if (ring.length >= 3 && isPointInPolygon(point, ring)) return area
  }
  // fallback: 중심점 최근접
  let nearest = areas[0]
  let best = Infinity
  for (const area of areas) {
    const dl = area.centerLng - point.lng
    const da = area.centerLat - point.lat
    const dist = dl * dl + da * da
    if (dist < best) {
      best = dist
      nearest = area
    }
  }
  return nearest
}

export const resolveDistrictCodeFromAdministration = (
  administrationCode: string,
): string => administrationCode.slice(0, 5)
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm exec vitest run src/lib/map/geometry.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/map/geometry.ts src/lib/map/geometry.test.ts
git commit -m "$(printf '[FE] feat: 기하 포함관계 부모 계산 유틸(point-in-polygon 등) 추가\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: selection 확장 + 자동이동 조건

**Files:**

- Modify: `src/lib/analysis/selection.ts`
- Test: `src/lib/analysis/selection.test.ts` (없으면 생성)

**Interfaces:**

- Consumes: 기존 `AnalysisSelection`, `ANALYSIS_PERIOD_CODE`, Task 2 `resolveDistrictCodeFromAdministration`.
- Produces:
  - `selectAdministrationWithParent(selection, administrationCode: string): AnalysisSelection`
  - `selectCommercialWithParents(selection, args: { commercialCode: string; administrationCode: string }): AnalysisSelection` — **serviceCode는 보존**
  - `shouldAutoNavigateToAnalysis(selection: AnalysisSelection): boolean`

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/lib/analysis/selection.test.ts (추가 또는 신규)
import { describe, expect, it } from 'vitest'
import {
  createEmptyAnalysisSelection,
  selectAdministrationWithParent,
  selectCommercialWithParents,
  shouldAutoNavigateToAnalysis,
} from '@/lib/analysis/selection'

describe('selectAdministrationWithParent', () => {
  it('동 선택 시 구(앞5자리)도 세팅하고 하위는 초기화', () => {
    const r = selectAdministrationWithParent(
      createEmptyAnalysisSelection(),
      '11215530',
    )
    expect(r.administrationCode).toBe('11215530')
    expect(r.districtCode).toBe('11215')
    expect(r.commercialCode).toBeNull()
    expect(r.serviceCode).toBeNull()
  })
})

describe('selectCommercialWithParents', () => {
  it('상권+부모 동/구 세팅, serviceCode는 보존', () => {
    const base = {
      ...createEmptyAnalysisSelection(),
      serviceCode: 'CS100010',
    }
    const r = selectCommercialWithParents(base, {
      commercialCode: '3110954',
      administrationCode: '11215530',
    })
    expect(r.commercialCode).toBe('3110954')
    expect(r.administrationCode).toBe('11215530')
    expect(r.districtCode).toBe('11215')
    expect(r.serviceCode).toBe('CS100010')
  })
})

describe('shouldAutoNavigateToAnalysis', () => {
  it('4개 코드 모두 있으면 true', () => {
    expect(
      shouldAutoNavigateToAnalysis({
        districtCode: '11215',
        administrationCode: '11215530',
        commercialCode: '3110954',
        serviceCode: 'CS100010',
        periodCode: '20233',
      }),
    ).toBe(true)
  })
  it('하나라도 없으면 false', () => {
    expect(
      shouldAutoNavigateToAnalysis({
        districtCode: '11215',
        administrationCode: '11215530',
        commercialCode: null,
        serviceCode: 'CS100010',
        periodCode: '20233',
      }),
    ).toBe(false)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/lib/analysis/selection.test.ts` → FAIL

- [ ] **Step 3: 구현 (selection.ts에 추가)**

```ts
// src/lib/analysis/selection.ts 에 추가
import { resolveDistrictCodeFromAdministration } from '@/lib/map/geometry'

export const selectAdministrationWithParent = (
  selection: AnalysisSelection,
  administrationCode: string,
): AnalysisSelection => ({
  districtCode: resolveDistrictCodeFromAdministration(administrationCode),
  administrationCode,
  commercialCode: null,
  serviceCode: null,
  periodCode: ANALYSIS_PERIOD_CODE,
})

export const selectCommercialWithParents = (
  selection: AnalysisSelection,
  {
    commercialCode,
    administrationCode,
  }: {
    commercialCode: string
    administrationCode: string
  },
): AnalysisSelection => ({
  districtCode: resolveDistrictCodeFromAdministration(administrationCode),
  administrationCode,
  commercialCode,
  serviceCode: selection.serviceCode,
  periodCode: ANALYSIS_PERIOD_CODE,
})

export const shouldAutoNavigateToAnalysis = (
  selection: AnalysisSelection,
): boolean =>
  Boolean(
    selection.districtCode &&
    selection.administrationCode &&
    selection.commercialCode &&
    selection.serviceCode,
  )
```

주의: `AnalysisSelection`에 `periodCode` 필드가 있는지 확인하고, 없으면 위 객체에서 제외한다(기존 `selectAnalysisValue`의 반환 형태와 정확히 일치시킬 것 — 기존 코드가 `periodCode: ANALYSIS_PERIOD_CODE`를 넣으면 동일하게, 아니면 빼기).

- [ ] **Step 4: 통과 확인 + 기존 selection 테스트 회귀**

Run: `pnpm exec vitest run src/lib/analysis/selection.test.ts` → PASS
Run: `pnpm exec tsc --noEmit --incremental false` → 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/selection.ts src/lib/analysis/selection.test.ts
git commit -m "$(printf '[FE] feat: 상권/동 선택 시 부모 코드 세팅 및 자동분석 조건 함수 추가\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 4: analysis-map — 줌 레이어 보고 + 스냅백 제거

지도 idle 시 현재 줌 레벨을 레이어로 변환해 상위로 보고하고, 폴리곤 재드로우 시 자동 확대(스냅백)를 제거한다. 명시적 확대는 별도 prop 트리거로만.

**Files:**

- Modify: `src/components/analysis/analysis-map.tsx`
- Test: `src/components/analysis/analysis-map.test.ts` (기존 통과 유지)

**Interfaces:**

- Consumes: Task 1 `resolveMapLayerByZoom`, 공통 `drawAreaPolygonLayer`.
- Produces (props 확장): `AnalysisMapProps`에
  `onZoomLayerChange?: (layer: MapLayer) => void`,
  `fitToCode?: string | null`(이 값이 바뀔 때만 그 area로 setBounds) 추가.

- [ ] **Step 1: 기존 테스트 기준선 확인**

Run: `pnpm exec vitest run src/components/analysis/analysis-map.test.ts` → PASS

- [ ] **Step 2: idle 핸들러에서 줌 레이어 보고 추가**

idle 핸들러(현재 `readViewportBounds`만 호출) 안에서, viewport와 함께 레벨을 보고한다:

```ts
idleHandler = () => {
  if (viewportTimer) clearTimeout(viewportTimer)
  viewportTimer = setTimeout(() => {
    const bounds = readViewportBounds(map)
    if (bounds) callbacksRef.current.onViewportBoundsChange(bounds)
    callbacksRef.current.onZoomLayerChange?.(
      resolveMapLayerByZoom(map.getLevel()),
    )
  }, VIEWPORT_DEBOUNCE_MS)
}
```

import: `import { resolveMapLayerByZoom, type MapLayer } from '@/lib/analysis/map-layer'`. `callbacksRef`에 `onZoomLayerChange`를 포함하도록 기존 ref 갱신 로직에 추가.

- [ ] **Step 3: drawAreaPolygonLayer 호출에서 fitToSelected 분리 (스냅백 제거)**

폴리곤 렌더 이펙트의 `drawAreaPolygonLayer(...)` 호출에 `fitToSelected: false`를 명시해 재드로우 시 확대를 막는다. 대신 별도 이펙트에서 `fitToCode`가 바뀔 때만 해당 area로 `setBounds`:

```ts
useEffect(() => {
  const maps = mapsRef.current
  const map = mapRef.current
  if (!maps || !map || !fitToCode) return
  const area = areas.find(a => String(a.areaCode) === fitToCode)
  if (!area) return
  const bounds = createBounds(normalizeBoundary(area.boundaryCoords))
  if (!bounds) return
  const kb = new maps.LatLngBounds()
  kb.extend(new maps.LatLng(bounds.latSW, bounds.lngSW))
  kb.extend(new maps.LatLng(bounds.latNE, bounds.lngNE))
  map.setBounds(kb)
}, [fitToCode]) // eslint 경고 시 areas는 ref로 읽기
```

`drawAreaPolygonLayer` 호출부: 기존 호출에 `fitToSelected: false` 추가.

- [ ] **Step 4: 타입/테스트 확인**

Run: `pnpm exec vitest run src/components/analysis/analysis-map.test.ts` → PASS
Run: `pnpm exec tsc --noEmit --incremental false` → 0 errors
Run: `pnpm exec eslint src/components/analysis/analysis-map.tsx --max-warnings=0`

- [ ] **Step 5: 라이브 확인 (컨트롤러가 수행)**

`localhost:5173/analysis`에서 지도를 팬/줌해도 되돌아가지 않고, 줌 인/아웃 시 콘솔에 레이어 전환이 보고되는지(임시 로그 또는 좌측 단계 반영은 Task 5에서) 확인.

- [ ] **Step 6: Commit**

```bash
git add src/components/analysis/analysis-map.tsx
git commit -m "$(printf '[FE] feat: analysis-map 줌 레이어 보고 및 스냅백 제거(fitToCode 분리)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 5: analysis-page — 줌-주도 레이어 + 부모 자동채움 + 자동이동

표시 레이어를 줌 레이어 기준으로 바꾸고, 지도 클릭 시 부모를 계산해 selection에 반영하며, 상권+업종 완성 시 자동 이동한다.

**Files:**

- Modify: `src/components/analysis/analysis-page.tsx`
- Test: `src/components/analysis/analysis-page.test.ts` (기존 통과 유지)

**Interfaces:**

- Consumes: Task 1 `MapLayer`/`resolveMapLayerByZoom`, Task 2 `findContainingArea`, Task 3 `selectAdministrationWithParent`/`selectCommercialWithParents`/`shouldAutoNavigateToAnalysis`.

- [ ] **Step 1: 기존 테스트 기준선 확인**

Run: `pnpm exec vitest run src/components/analysis/analysis-page.test.ts` → PASS

- [ ] **Step 2: mapLayer 상태 추가 + 지도 area 쿼리 enable을 레이어 기준으로**

```ts
const [mapLayer, setMapLayer] = useState<MapLayer>('district')
```

지도 area 쿼리의 `enabled`를 selection 기준 → 레이어 기준으로 변경:

- `administrationMapQuery.enabled`: `mapLayer === 'administration' || mapLayer === 'commercial'`
  (상권 줌에서 부모 계산용 행정동 경계가 필요하므로 commercial 레이어에서도 로드)
- `commercialMapQuery.enabled`: `mapLayer === 'commercial'`

- [ ] **Step 3: mapAreas/선택코드를 레이어 기준으로 (raw viewport areas 사용)**

```ts
const mapAreas =
  mapLayer === 'district'
    ? allDistrictAreas
    : mapLayer === 'administration'
      ? allAdministrationAreas
      : allCommercialAreas
const mapSelectedCode =
  mapLayer === 'district'
    ? selection.districtCode
    : mapLayer === 'administration'
      ? selection.administrationCode
      : selection.commercialCode
```

(줌-주도에서는 부모 미선택 상태에서도 뷰포트 전체 폴리곤을 보여야 하므로,
dropdown 리스트로 필터링된 `districtAreas` 대신 **raw** `allDistrictAreas` 등을 사용.)

- [ ] **Step 4: 지도 클릭 핸들러 → 레이어별 부모 계산 후 selection 반영**

```ts
const handleMapSelect = (code: string) => {
  let next: AnalysisSelection
  if (mapLayer === 'district') {
    next = selectAnalysisValue(selection, 'district', code)
  } else if (mapLayer === 'administration') {
    next = selectAdministrationWithParent(selection, code)
  } else {
    const clicked = allCommercialAreas.find(a => String(a.areaCode) === code)
    const admin = clicked
      ? findContainingArea(
          { lng: clicked.centerLng, lat: clicked.centerLat },
          allAdministrationAreas,
        )
      : null
    next = admin
      ? selectCommercialWithParents(selection, {
          commercialCode: code,
          administrationCode: String(admin.areaCode),
        })
      : selectAnalysisValue(selection, 'commercial', code)
  }
  router.replace(createAnalysisExplorerHref(next))
}
```

`<AnalysisMap>` props: `onSelect={handleMapSelect}`, `onZoomLayerChange={setMapLayer}`,
`activeStep`/`areas`/`selectedCode`를 위 레이어 기준 값으로, `fitToCode`는 아래 Step 5의 값으로 전달.

- [ ] **Step 5: 좌측 패널 선택 → 지도 1회 확대(fitToCode)**

패널에서 지역을 선택하면 그 area로 확대. `fitToCode`는 "가장 구체적으로 선택된 코드"로 두되, 지도 클릭으로 인한 selection 변경에는 확대가 재발하지 않도록 소스를 구분한다(예: 패널 onSelect에서만 `setFitRequest(code)` 세팅, 지도 클릭 경로에서는 세팅 안 함).

```ts
const [fitRequest, setFitRequest] = useState<string | null>(null)
// 패널 onSelect:
onSelect={code => { handleSelect(activeStep, code); setFitRequest(code) }}
// AnalysisMap: fitToCode={fitRequest}
```

- [ ] **Step 6: 상권+업종 완성 시 자동 이동 effect**

```ts
useEffect(() => {
  if (shouldAutoNavigateToAnalysis(selection)) {
    router.push(createAnalysisResultHref(selection, 'summary'))
  }
}, [selection, router])
```

(결과 페이지는 별도 라우트라 루프 없음. explorer 페이지에서만 이 effect가 동작.)

- [ ] **Step 7: 타입/테스트/lint**

Run: `pnpm exec vitest run src/components/analysis/analysis-page.test.ts` → PASS
Run: `pnpm exec tsc --noEmit --incremental false` → 0 errors
Run: `pnpm exec eslint src/components/analysis/analysis-page.tsx --max-warnings=0`

- [ ] **Step 8: 라이브 확인 (컨트롤러가 수행)**

`localhost:5173/analysis`:

- 줌아웃=자치구/줌인=행정동/더 줌인=상권 폴리곤 자동 전환
- 구 클릭→그 구 확대→행정동 표시, 동 클릭→구도 채워지고 확대→상권, 상권 클릭→동/구 자동 채움
- 업종 선택까지 되면 자동으로 분석 결과로 이동
- 팬/줌해도 스냅백 없음

- [ ] **Step 9: Commit**

```bash
git add src/components/analysis/analysis-page.tsx
git commit -m "$(printf '[FE] feat: analysis-page 줌-주도 레이어/부모 자동채움/자동분석 이동\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 6: 전체 검증 및 줌 임계값 튜닝

**Files:**

- Modify(선택): `src/lib/analysis/map-layer.ts` (임계값 조정 시 Task 1 테스트도 갱신)

- [ ] **Step 1: 전체 테스트** — Run: `pnpm test` → 전부 PASS
- [ ] **Step 2: qa:verify** — Run: `pnpm qa:verify` → 통과
- [ ] **Step 3: 라이브 최종 확인 및 임계값 튜닝** — 레이어 전환이 자연스러운지 확인, 어색하면 `resolveMapLayerByZoom` 임계값만 조정하고 Task 1 테스트 기대값 동기화.
- [ ] **Step 4: (튜닝 시) Commit**

```bash
git add src/lib/analysis/map-layer.ts src/lib/analysis/map-layer.test.ts
git commit -m "$(printf '[FE] style: 줌 레이어 전환 임계값 튜닝\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Self-Review

**Spec coverage:**

- 요구1(패널 선택→지도 갱신) → Task 5 Step 5 fitRequest. ✅
- 요구2(스냅백 제거) → Task 4 Step 3 (fitToSelected:false + fitToCode 분리). ✅
- 요구3(줌 스코프별 구/동/상권 표시) → Task 1 + Task 5 Step 2-3. ✅
- 요구4(폴리곤 클릭 시 상위 자동 채움) → Task 2 + Task 3 + Task 5 Step 4. ✅
- 요구5(상권+업종→자동 분석) → Task 3 + Task 5 Step 6. ✅

**Placeholder scan:** 순수 태스크(1-3)는 실제 코드. 통합 태스크(4-5)는 구체 스니펫+정확한 파일/함수 지정. "적절히" 류 없음.

**Type consistency:** `MapLayer`, `resolveMapLayerByZoom`, `findContainingArea`, `selectCommercialWithParents`, `shouldAutoNavigateToAnalysis` 이름이 Task 1→5에서 일치. `AnalysisSelection` 반환 형태는 기존 `selectAnalysisValue`와 맞추도록 Task 3에 명시(periodCode 유무 확인).

**구현자 주의:**

- Task 5에서 raw areas(`allDistrictAreas` 등)를 쓰면 기존 `filterAreasByCodes` 필터가 빠진다. 표시가 과다하면(예: 뷰포트 밖 경계 걸침) 뷰포트 필터는 kakao가 클리핑하므로 문제 없음. dropdown 리스트(`districts/administrations/commercials`)는 패널용으로 그대로 유지.
- 패널↔지도 무한루프 방지: fitToCode는 패널 선택 경로에서만 세팅(지도 클릭 경로 제외).
- 자동이동 effect는 selection 4개 완성 시 1회 push. 결과 페이지 진입 후에는 이 컴포넌트가 언마운트되므로 재실행 없음.
