# 지도 폴리곤 상호작용 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상권분석·상권추천 지도의 지역 폴리곤을 잘 보이게 하고, hover→강조 / 클릭→선택+드릴다운+확대 상호작용을 공통 모듈로 통일한다.

**Architecture:** 폴리곤 상태별 스타일 계산은 순수 함수(`area-polygon-style.ts`)로, kakao 폴리곤 렌더링+이벤트+bounds 확대는 cleanup을 반환하는 순수 오케스트레이션 함수(`draw-area-polygon-layer.ts`)로 분리한다. `analysis-map`·`recommend-map`은 기존 `useEffect` 안에서 이 함수를 호출하도록 교체한다. 라벨(태그)은 각 지도가 기존대로 유지한다.

**Tech Stack:** Next.js App Router, TypeScript, styled-components, Kakao Maps SDK, Vitest.

## Global Constraints

- FE 전용. 백엔드 API·계약 변경 금지.
- 임의 색상·radius·shadow·spacing 토큰 추가 금지 → 기존 디자인 토큰만 사용.
- 클라이언트 노출 env는 `NEXT_PUBLIC_*`.
- 완료 보고 전 `pnpm qa:verify` (= `format:check && lint && typecheck && build`) 통과 필수.
- 커밋 컨벤션: `[FE] type: 요약` (한국어). 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- 테스트는 Vitest. kakao 실객체는 테스트 환경에 없으므로 **fake maps 더블**로 검증.
- hover는 순수 시각 변경만 — 백엔드 호출 금지.

---

### Task 1: 폴리곤 상태별 스타일 순수 함수

**Files:**

- Create: `src/lib/map/area-polygon-style.ts`
- Test: `src/lib/map/area-polygon-style.test.ts`

**Interfaces:**

- Consumes: 없음.
- Produces:
  - `type AreaPolygonState = 'default' | 'hovered' | 'selected'`
  - `type AreaPolygonStyleTokens = { baseStroke: string; activeStroke: string; fill: string }`
  - `type AreaPolygonStyle = { strokeColor: string; strokeWeight: number; fillColor: string; fillOpacity: number; zIndex: number }`
  - `resolveAreaPolygonState(code: string, selectedCode: string | null, hoveredCode: string | null): AreaPolygonState`
  - `resolveAreaPolygonStyle(state: AreaPolygonState, tokens: AreaPolygonStyleTokens, baseZIndex: number): AreaPolygonStyle`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/map/area-polygon-style.test.ts
import { describe, expect, it } from 'vitest'

import {
  resolveAreaPolygonState,
  resolveAreaPolygonStyle,
} from '@/lib/map/area-polygon-style'

const tokens = {
  baseStroke: '#0ea5e9',
  activeStroke: '#2272eb',
  fill: '#0ea5e9',
}

describe('resolveAreaPolygonState', () => {
  it('선택된 코드는 selected가 우선한다', () => {
    expect(resolveAreaPolygonState('a', 'a', 'a')).toBe('selected')
  })
  it('선택 아님 + hover면 hovered', () => {
    expect(resolveAreaPolygonState('a', 'b', 'a')).toBe('hovered')
  })
  it('둘 다 아니면 default', () => {
    expect(resolveAreaPolygonState('a', 'b', 'c')).toBe('default')
  })
})

describe('resolveAreaPolygonStyle', () => {
  it('default는 baseStroke 2px, fill 0.16', () => {
    expect(resolveAreaPolygonStyle('default', tokens, 10)).toEqual({
      strokeColor: '#0ea5e9',
      strokeWeight: 2,
      fillColor: '#0ea5e9',
      fillOpacity: 0.16,
      zIndex: 10,
    })
  })
  it('hovered는 activeStroke 3px, fill 0.32, zIndex 상향', () => {
    expect(resolveAreaPolygonStyle('hovered', tokens, 10)).toEqual({
      strokeColor: '#2272eb',
      strokeWeight: 3,
      fillColor: '#0ea5e9',
      fillOpacity: 0.32,
      zIndex: 510,
    })
  })
  it('selected는 activeStroke 3px, fill 0.40, 최상단', () => {
    expect(resolveAreaPolygonStyle('selected', tokens, 10)).toEqual({
      strokeColor: '#2272eb',
      strokeWeight: 3,
      fillColor: '#0ea5e9',
      fillOpacity: 0.4,
      zIndex: 1010,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/map/area-polygon-style.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/map/area-polygon-style.ts
export type AreaPolygonState = 'default' | 'hovered' | 'selected'

export type AreaPolygonStyleTokens = {
  baseStroke: string
  activeStroke: string
  fill: string
}

export type AreaPolygonStyle = {
  strokeColor: string
  strokeWeight: number
  fillColor: string
  fillOpacity: number
  zIndex: number
}

export const resolveAreaPolygonState = (
  code: string,
  selectedCode: string | null,
  hoveredCode: string | null,
): AreaPolygonState => {
  if (code === selectedCode) return 'selected'
  if (code === hoveredCode) return 'hovered'
  return 'default'
}

export const resolveAreaPolygonStyle = (
  state: AreaPolygonState,
  tokens: AreaPolygonStyleTokens,
  baseZIndex: number,
): AreaPolygonStyle => {
  if (state === 'selected') {
    return {
      strokeColor: tokens.activeStroke,
      strokeWeight: 3,
      fillColor: tokens.fill,
      fillOpacity: 0.4,
      zIndex: baseZIndex + 1000,
    }
  }
  if (state === 'hovered') {
    return {
      strokeColor: tokens.activeStroke,
      strokeWeight: 3,
      fillColor: tokens.fill,
      fillOpacity: 0.32,
      zIndex: baseZIndex + 500,
    }
  }
  return {
    strokeColor: tokens.baseStroke,
    strokeWeight: 2,
    fillColor: tokens.fill,
    fillOpacity: 0.16,
    zIndex: baseZIndex,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/map/area-polygon-style.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/map/area-polygon-style.ts src/lib/map/area-polygon-style.test.ts
git commit -m "$(printf '[FE] feat: 지역 폴리곤 상태별 스타일 순수 함수 추가\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: 공통 폴리곤 레이어 렌더 함수 `drawAreaPolygonLayer`

kakao 폴리곤을 그리고 click/mouseover/mouseout 리스너와 선택 영역 bounds 확대를 붙인 뒤, 정리(cleanup) 함수를 반환한다. 라벨은 다루지 않는다.

**Files:**

- Create: `src/lib/map/draw-area-polygon-layer.ts`
- Test: `src/lib/map/draw-area-polygon-layer.test.ts`

**Interfaces:**

- Consumes: Task 1 (`resolveAreaPolygonState`, `resolveAreaPolygonStyle`, `AreaPolygonStyleTokens`), `@/lib/map/geometry` (`normalizeBoundary`, `createBounds`), `@/types/recommend` (`AreaBoundaryItem`), 전역 kakao 타입(`KakaoMapInstance`, `KakaoMapsNamespace`).
- Produces:
  - `type DrawAreaPolygonLayerParams = { map: KakaoMapInstance; maps: KakaoMapsNamespace; areas: readonly AreaBoundaryItem[]; selectedCode: string | null; hoveredCode: string | null; onSelect: (code: string) => void; onHoverChange: (code: string | null) => void; tokens: AreaPolygonStyleTokens; fitToSelected?: boolean }`
  - `drawAreaPolygonLayer(params: DrawAreaPolygonLayerParams): () => void` — 반환값은 cleanup.

- [ ] **Step 1: Write the failing test**

`maps` fake 더블로 폴리곤 개수, 리스너 등록/정리, hover/select 콜백, setBounds를 검증한다.

```ts
// src/lib/map/draw-area-polygon-layer.test.ts
import { describe, expect, it, vi } from 'vitest'

import { drawAreaPolygonLayer } from '@/lib/map/draw-area-polygon-layer'
import type { AreaBoundaryItem } from '@/types/recommend'

const tokens = {
  baseStroke: '#0ea5e9',
  activeStroke: '#2272eb',
  fill: '#0ea5e9',
}

const areas: AreaBoundaryItem[] = [
  {
    areaCode: '11680',
    areaName: '강남구',
    centerLng: 127.05,
    centerLat: 37.51,
    boundaryCoords: [
      [127.04, 37.5],
      [127.06, 37.5],
      [127.05, 37.52],
    ],
  },
]

const createFakeMaps = () => {
  const listeners: Array<{
    target: object
    type: string
    handler: () => void
  }> = []
  const polygons: Array<{ options: Record<string, unknown>; map: unknown }> = []
  const setBounds = vi.fn()
  const maps = {
    LatLng: class {
      constructor(
        public lat: number,
        public lng: number,
      ) {}
    },
    LatLngBounds: class {
      extend() {}
    },
    Polygon: class {
      map: unknown
      constructor(public options: Record<string, unknown>) {
        this.map = options.map
        polygons.push(this)
      }
      setMap(value: unknown) {
        this.map = value
      }
      setOptions() {}
      setZIndex() {}
    },
    event: {
      addListener: (target: object, type: string, handler: () => void) =>
        listeners.push({ target, type, handler }),
      removeListener: (target: object, type: string, handler: () => void) => {
        const index = listeners.findIndex(
          entry =>
            entry.target === target &&
            entry.type === type &&
            entry.handler === handler,
        )
        if (index >= 0) listeners.splice(index, 1)
      },
    },
  }
  const map = { setBounds, setCenter: vi.fn() }
  return { maps, map, listeners, polygons, setBounds }
}

describe('drawAreaPolygonLayer', () => {
  it('경계점 3개 이상인 area마다 폴리곤 1개를 그린다', () => {
    const { maps, map, polygons } = createFakeMaps()
    drawAreaPolygonLayer({
      map: map as never,
      maps: maps as never,
      areas,
      selectedCode: null,
      hoveredCode: null,
      onSelect: () => undefined,
      onHoverChange: () => undefined,
      tokens,
    })
    expect(polygons).toHaveLength(1)
  })

  it('click은 onSelect, mouseover/mouseout은 onHoverChange를 호출한다', () => {
    const { maps, map, listeners } = createFakeMaps()
    const onSelect = vi.fn()
    const onHoverChange = vi.fn()
    drawAreaPolygonLayer({
      map: map as never,
      maps: maps as never,
      areas,
      selectedCode: null,
      hoveredCode: null,
      onSelect,
      onHoverChange,
      tokens,
    })
    listeners.find(l => l.type === 'click')?.handler()
    listeners.find(l => l.type === 'mouseover')?.handler()
    listeners.find(l => l.type === 'mouseout')?.handler()
    expect(onSelect).toHaveBeenCalledWith('11680')
    expect(onHoverChange).toHaveBeenNthCalledWith(1, '11680')
    expect(onHoverChange).toHaveBeenNthCalledWith(2, null)
  })

  it('selectedCode가 있으면 setBounds로 확대한다', () => {
    const { maps, map, setBounds } = createFakeMaps()
    drawAreaPolygonLayer({
      map: map as never,
      maps: maps as never,
      areas,
      selectedCode: '11680',
      hoveredCode: null,
      onSelect: () => undefined,
      onHoverChange: () => undefined,
      tokens,
    })
    expect(setBounds).toHaveBeenCalledTimes(1)
  })

  it('cleanup은 리스너를 모두 제거하고 폴리곤을 지운다', () => {
    const { maps, map, listeners, polygons } = createFakeMaps()
    const cleanup = drawAreaPolygonLayer({
      map: map as never,
      maps: maps as never,
      areas,
      selectedCode: null,
      hoveredCode: null,
      onSelect: () => undefined,
      onHoverChange: () => undefined,
      tokens,
    })
    cleanup()
    expect(listeners).toHaveLength(0)
    expect(polygons[0].map).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/map/draw-area-polygon-layer.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/map/draw-area-polygon-layer.ts
import { createBounds, normalizeBoundary } from '@/lib/map/geometry'
import {
  resolveAreaPolygonState,
  resolveAreaPolygonStyle,
  type AreaPolygonStyleTokens,
} from '@/lib/map/area-polygon-style'
import type { AreaBoundaryItem } from '@/types/recommend'

export type DrawAreaPolygonLayerParams = {
  map: KakaoMapInstance
  maps: KakaoMapsNamespace
  areas: readonly AreaBoundaryItem[]
  selectedCode: string | null
  hoveredCode: string | null
  onSelect: (code: string) => void
  onHoverChange: (code: string | null) => void
  tokens: AreaPolygonStyleTokens
  fitToSelected?: boolean
}

export const drawAreaPolygonLayer = ({
  map,
  maps,
  areas,
  selectedCode,
  hoveredCode,
  onSelect,
  onHoverChange,
  tokens,
  fitToSelected = true,
}: DrawAreaPolygonLayerParams): (() => void) => {
  const polygons: KakaoMapPolygon[] = []
  const listeners: Array<{
    target: object
    type: string
    handler: () => void
  }> = []

  areas.forEach((area, index) => {
    const code = String(area.areaCode)
    const points = normalizeBoundary(area.boundaryCoords)
    if (points.length < 3) return

    const state = resolveAreaPolygonState(code, selectedCode, hoveredCode)
    const style = resolveAreaPolygonStyle(state, tokens, index + 10)

    const polygon = new maps.Polygon({
      map,
      path: points.map(point => new maps.LatLng(point.lat, point.lng)),
      strokeColor: style.strokeColor,
      strokeWeight: style.strokeWeight,
      strokeOpacity: 1,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
      clickable: true,
    })
    polygon.setZIndex(style.zIndex)
    polygons.push(polygon)

    const clickHandler = () => onSelect(code)
    const overHandler = () => onHoverChange(code)
    const outHandler = () => onHoverChange(null)
    maps.event.addListener(polygon, 'click', clickHandler)
    maps.event.addListener(polygon, 'mouseover', overHandler)
    maps.event.addListener(polygon, 'mouseout', outHandler)
    listeners.push(
      { target: polygon, type: 'click', handler: clickHandler },
      { target: polygon, type: 'mouseover', handler: overHandler },
      { target: polygon, type: 'mouseout', handler: outHandler },
    )
  })

  if (fitToSelected && selectedCode) {
    const selectedArea = areas.find(
      area => String(area.areaCode) === selectedCode,
    )
    const bounds = selectedArea
      ? createBounds(normalizeBoundary(selectedArea.boundaryCoords))
      : null
    if (bounds) {
      const kakaoBounds = new maps.LatLngBounds()
      kakaoBounds.extend(new maps.LatLng(bounds.latSW, bounds.lngSW))
      kakaoBounds.extend(new maps.LatLng(bounds.latNE, bounds.lngNE))
      map.setBounds(kakaoBounds)
    }
  }

  return () => {
    listeners.forEach(({ target, type, handler }) => {
      maps.event.removeListener(target, type, handler)
    })
    polygons.forEach(polygon => polygon.setMap(null))
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/map/draw-area-polygon-layer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/map/draw-area-polygon-layer.ts src/lib/map/draw-area-polygon-layer.test.ts
git commit -m "$(printf '[FE] feat: 공통 폴리곤 레이어 렌더 함수 drawAreaPolygonLayer 추가\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: analysis-map가 공통 함수를 사용하도록 교체 (+폴리곤 hover)

기존 `areas.forEach`로 폴리곤을 그리던 인라인 블록을 `drawAreaPolygonLayer` 호출로 교체한다. 라벨(태그) 생성과 preview 연동은 그대로 유지한다. `previewedCode`를 `hoveredCode`로 전달해 라벨·폴리곤 hover가 같은 강조 상태를 공유하게 한다.

**Files:**

- Modify: `src/components/analysis/analysis-map.tsx` (폴리곤 렌더 이펙트, 대략 219-330줄)
- Test: `src/components/analysis/analysis-map.test.ts` (기존 통과 유지)

**Interfaces:**

- Consumes: Task 2 (`drawAreaPolygonLayer`), Task 1 (`AreaPolygonStyleTokens`).
- Produces: 외부 인터페이스 변경 없음 (`AnalysisMapProps` 불변).

- [ ] **Step 1: 기존 테스트가 통과 상태인지 확인**

Run: `pnpm exec vitest run src/components/analysis/analysis-map.test.ts`
Expected: PASS (리팩터 전 기준선)

- [ ] **Step 2: 폴리곤 렌더 블록을 공통 함수로 교체**

`analysis-map.tsx`의 폴리곤 그리기 이펙트에서, `areas.forEach(...)` 내부의 **폴리곤 생성·리스너·`selectedArea` bounds 블록**을 아래로 교체한다. 라벨(CustomOverlay) 생성 루프는 유지한다. 색상 토큰은 스타일 토큰으로 전달한다.

폴리곤 렌더 이펙트 상단(토큰 읽는 부분)에서:

```ts
const polygonTokens = {
  baseStroke: getColorToken('--color-primary-700', '#0ea5e9'),
  activeStroke: getColorToken('--color-primary-600', '#2272eb'),
  fill: getColorToken('--color-primary-700', '#0ea5e9'),
}

const cleanupPolygons = drawAreaPolygonLayer({
  map,
  maps,
  areas,
  selectedCode,
  hoveredCode: previewedCode,
  onSelect: code => callbacksRef.current.onSelect(code),
  onHoverChange: code => callbacksRef.current.onPreviewChange(code),
  tokens: polygonTokens,
})
```

기존 `polygons`/`listeners` 배열로 폴리곤을 직접 만들던 코드와 `selectedArea` setBounds 블록은 삭제하고, `clearLayers`에서 `cleanupPolygons()`를 호출하도록 한다(라벨 overlay 정리는 유지).

import 추가:

```ts
import { drawAreaPolygonLayer } from '@/lib/map/draw-area-polygon-layer'
```

- [ ] **Step 3: 기존 테스트 재실행**

Run: `pnpm exec vitest run src/components/analysis/analysis-map.test.ts`
Expected: PASS (SSR 대체 영역 + semantic key 회귀 없음)

- [ ] **Step 4: 라이브 브라우저 확인**

`localhost:5173/analysis` 접속(반드시 `localhost`). 확인:

- 25개 자치구 폴리곤이 파란 stroke + 옅은 fill로 **뚜렷이** 보인다.
- 폴리곤 위에 마우스 올리면 fill이 **짙어진다**.
- 폴리곤 클릭 시 좌측 네비에 해당 자치구가 선택되고, 지도가 그 자치구로 확대되며 행정동 폴리곤이 나타난다(드릴다운).

- [ ] **Step 5: Commit**

```bash
git add src/components/analysis/analysis-map.tsx
git commit -m "$(printf '[FE] refactor: analysis-map 폴리곤을 공통 레이어로 교체 및 폴리곤 hover 강조 추가\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 4: recommend-map가 공통 함수를 사용하도록 교체 (+폴리곤 hover)

district/administration/commercial 단계의 폴리곤 렌더링을 `drawAreaPolygonLayer`로 교체한다. **results 단계(랭크 마커/점수 fill)는 손대지 않는다.** 폴리곤 hover용 로컬 `hoveredCode` 상태를 추가한다. 앞서 넣은 임시 가시성 스타일(프로토타입, stash 보관)은 이 교체로 자연히 대체된다.

**Files:**

- Modify: `src/components/recommend/recommend-map.tsx` (stage별 폴리곤 렌더 블록)
- Test: `src/components/recommend/recommend-map.test.ts` (기존 통과 유지)

**Interfaces:**

- Consumes: Task 2 (`drawAreaPolygonLayer`), Task 1 (`AreaPolygonStyleTokens`).
- Produces: 외부 인터페이스 변경 없음.

- [ ] **Step 1: 기존 테스트가 통과 상태인지 확인**

Run: `pnpm exec vitest run src/components/recommend/recommend-map.test.ts`
Expected: PASS (리팩터 전 기준선)

- [ ] **Step 2: 폴리곤 hover용 로컬 상태 추가**

`recommend-map.tsx` 컴포넌트 본문에 추가:

```ts
const [hoveredAreaCode, setHoveredAreaCode] = useState<string | null>(null)
```

- [ ] **Step 3: district/administration/commercial 단계 렌더를 공통 함수로 교체**

각 단계에서 비선택/선택 폴리곤을 직접 그리던 `drawPolygon(...)` 반복을 아래 형태로 교체한다(단계별 areas·selectedCode·onSelect만 바꿔 호출). `drawContextArea`(상위 컨텍스트 배경 폴리곤)와 results 단계는 그대로 둔다.

폴리곤 이펙트 상단 토큰:

```ts
const areaPolygonTokens = {
  baseStroke: readColorToken('--color-primary-700', '#0ea5e9'),
  activeStroke: readColorToken('--color-primary-600', '#2272eb'),
  fill: readColorToken('--color-primary-700', '#0ea5e9'),
}
```

district 단계 예:

```ts
if (layerInput.stage === 'district') {
  const cleanup = drawAreaPolygonLayer({
    map,
    maps,
    areas: layerInput.districtAreas,
    selectedCode: layerInput.selectedDistrictCode,
    hoveredCode: hoveredAreaCodeRef.current,
    onSelect: code => callbacksRef.current.onDistrictSelect(code),
    onHoverChange: setHoveredAreaCode,
    tokens: areaPolygonTokens,
  })
  polygonCleanups.push(cleanup)
}
```

administration 단계는 `administrationAreas` / `selectedAdministrationCode` / `onAdministrationSelect`, commercial 단계는 `commercialAreas` / `previewedCommercialCode`를 selected 대신 hovered 후보로 사용하지 말고 `selectedCommercialCode`를 selectedCode로, `hoveredAreaCode`를 hoveredCode로 전달한다. 각 단계 앞에는 기존 `drawContextArea(...)` 호출을 유지한다.

`hoveredAreaCode` 변화가 이펙트 재실행을 트리거하도록, 폴리곤 렌더 이펙트 의존성에 `hoveredAreaCode`를 추가한다(또는 기존 semantic key 계산에 포함). ref 대신 상태를 직접 의존성으로 쓰면 hover 시 재렌더-재드로우된다.

기존 `drawPolygon` 헬퍼가 district/administration/commercial에서만 쓰였다면 제거하고, results 단계에서 여전히 쓰이면 유지한다.

import 추가:

```ts
import { drawAreaPolygonLayer } from '@/lib/map/draw-area-polygon-layer'
```

- [ ] **Step 4: 기존 테스트 재실행**

Run: `pnpm exec vitest run src/components/recommend/recommend-map.test.ts`
Expected: PASS

- [ ] **Step 5: 라이브 브라우저 확인**

`localhost:5173/recommend` 접속. 확인:

- 폴리곤이 뚜렷이 보이고, hover 시 fill이 짙어진다.
- 클릭 시 선택 + 다음 단계 드릴다운 + 확대.
- results 단계 랭크 마커는 기존과 동일하게 표시된다(회귀 없음).

- [ ] **Step 6: Commit**

```bash
git add src/components/recommend/recommend-map.tsx
git commit -m "$(printf '[FE] refactor: recommend-map 폴리곤을 공통 레이어로 교체 및 폴리곤 hover 강조 추가\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 5: 전체 검증 및 스타일 미세조정

**Files:**

- Modify(선택): `src/lib/map/area-polygon-style.ts` (라이브에서 opacity/weight 튜닝 시)

- [ ] **Step 1: 전체 테스트**

Run: `pnpm test`
Expected: 전부 PASS

- [ ] **Step 2: qa:verify**

Run: `pnpm qa:verify`
Expected: format/lint/typecheck/build 전부 통과

- [ ] **Step 3: 라이브 최종 확인 및 필요 시 스타일 튜닝**

`localhost:5173/analysis`·`/recommend`에서 기본/hover/선택 3-상태 대비가 자연스러운지 확인. 어색하면 `area-polygon-style.ts`의 `fillOpacity`/`strokeWeight`만 조정하고 Task 1 테스트의 기대값을 함께 갱신한 뒤 재커밋.

- [ ] **Step 4: (튜닝 시) Commit**

```bash
git add src/lib/map/area-polygon-style.ts src/lib/map/area-polygon-style.test.ts
git commit -m "$(printf '[FE] style: 폴리곤 3-상태 대비 미세조정\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Self-Review

**Spec coverage:**

- 요구사항1(폴리곤 가시화) → Task 1 스타일 + Task 3/4 적용. ✅
- 요구사항2(폴리곤 hover 강조) → Task 2 mouseover/out + Task 3/4. ✅
- 요구사항3(클릭→선택+네비) → Task 2 onSelect + 기존 페이지 연동 유지(Task 3/4). ✅
- 요구사항4(드릴다운+확대) → Task 2 setBounds + 기존 단계 전환 유지. ✅
- 요구사항5(recommend 동일 로직) → Task 4. ✅
- D3(hover=preview 재사용) → Task 3에서 `previewedCode`→`hoveredCode`. ✅
- D4(프로토타입 흡수) → Task 4 Step 3. ✅
- results 단계 범위 밖 → Task 4에서 명시적으로 제외. ✅

**Placeholder scan:** 모든 코드 스텝에 실제 코드 포함. "적절히 처리" 류 없음. ✅

**Type consistency:** `AreaPolygonStyleTokens`, `resolveAreaPolygonState/Style`, `drawAreaPolygonLayer`, `DrawAreaPolygonLayerParams` 이름이 Task 1→2→3→4에서 일치. cleanup 함수 반환 규약 일관. ✅

**유의(구현자 주의):** recommend-map의 폴리곤 이펙트는 `createRecommendMapLayerSemanticKey` 기반 재실행 구조다. hover 재드로우를 위해 `hoveredAreaCode`를 이펙트 의존성/키에 반드시 포함할 것. hover가 너무 잦은 재드로우를 유발하면, 폴리곤 전체 재생성 대신 해당 폴리곤만 `setOptions`로 스타일 갱신하는 최적화를 후속 고려(현 areas 규모에선 불필요).
