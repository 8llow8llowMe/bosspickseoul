# 구별 현황 지도 라벨 및 모바일 바텀시트 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서울 25개 자치구 경계·이름과 Top10 순위를 지도에 표시하고, 모바일 지도를 52px/66% 2단 바텀시트와 `/status` 전용 푸터 숨김 구조로 개선한다.

**Architecture:** 기존 `SEOUL_STATUS_FEATURES`를 지도 geometry의 단일 기준으로 유지하고, 기존 `districts`와 Top10 API 응답을 순수 표시 모델에서 결합한다. 모바일은 고정 높이 지도 스테이지 위에 바텀시트를 겹치며, 탭과 drag가 동일한 `StatusSheetSnap` 상태를 갱신한다. 백엔드 계약, 패키지, 락파일, 빌드·배포 설정은 변경하지 않는다.

**Tech Stack:** Next.js App Router, React 19, TypeScript, styled-components, TanStack Query, Vitest, React DOM server rendering

---

## 파일 구조

- `src/lib/status/status-map-model.ts`
  - 25개 feature, 기존 구 이름 데이터, Top10 응답을 `StatusMapLabel`로 결합한다.
  - 선택 feature 조회는 유지한다.
- `src/lib/status/status-map-model.test.ts`
  - 25개 라벨, Top10 순위 연결, 이름 누락 제외, 입력 불변성을 검증한다.
- `src/components/status/status-map.tsx`
  - 25개 경계 path, 구 이름 라벨, Top10 순위 버튼, 선택 path를 렌더링한다.
  - 모바일 지도 배경 버튼의 펼치기/최소화 이름을 상태에 맞게 제공한다.
- `src/components/status/status-map.test.ts`
  - 실제 25개 지도 데이터 기준 path·이름·Top10 순위·선택 강조 마크업을 검증한다.
- `src/lib/status/status-state.ts`
  - 52px/66% 높이 경계와 drag 판정을 제공한다.
  - 기존 단일 스냅 분기를 제거한다.
- `src/lib/status/status-state.test.ts`
  - 높이 경계, 양방향 drag, 상태 토글, 콘텐츠 포커스 전환을 검증한다.
- `src/components/status/status-mobile-sheet.tsx`
  - 두 스냅만 사용하고 collapsed 본문을 inert/hidden 처리한다.
- `src/components/status/status-page.tsx`
  - 모바일 초기 expanded 상태, 지도 탭 토글, 360~560px 지도 스테이지를 연결한다.
  - `/status` main에 모바일 푸터 숨김 data attribute를 설정한다.
- `src/components/layout/site-footer.tsx`
  - `/status` main 바로 뒤에 있는 경우에만 모바일에서 숨는다.
- `src/components/layout/site-footer.test.tsx`
  - styled-components가 생성한 모바일 전용 인접 선택자를 검증한다.

### Task 1: 25개 자치구 지도 표시 모델

**Files:**

- Modify: `src/lib/status/status-map-model.ts`
- Modify: `src/lib/status/status-map-model.test.ts`

- [ ] **Step 1: 기존 marker 테스트를 25개 label 모델의 실패 테스트로 교체**

`src/lib/status/status-map-model.test.ts`에서 `createStatusMapMarkers` 테스트를
다음 계약으로 교체하고 `findSelectedStatusMapFeature` 테스트는 유지한다.

```ts
import { describe, expect, it } from 'vitest'

import {
  createStatusMapLabels,
  findSelectedStatusMapFeature,
} from './status-map-model'

const features = [
  {
    districtCode: '11110',
    path: 'M0 0L10 0L10 10Z',
    center: { x: 120, y: 240 },
  },
  {
    districtCode: '11140',
    path: 'M10 10L20 10L20 20Z',
    center: { x: 320, y: 440 },
  },
] as const

const districtRecords = [
  { gooCode: 11110, gooName: '종로구', gooCenter: [0, 0] as [number, number] },
  { gooCode: 11140, gooName: '중구', gooCenter: [0, 0] as [number, number] },
]

describe('createStatusMapLabels', () => {
  it('creates one label per named feature and adds rank only to Top 10 items', () => {
    const labels = createStatusMapLabels(
      [
        {
          rank: 2,
          districtCode: '11140',
          districtName: '중구',
          value: 200,
          changeRate: -2,
        },
      ],
      features,
      districtRecords,
    )

    expect(labels).toEqual([
      {
        districtCode: '11110',
        districtName: '종로구',
        x: 120,
        y: 240,
        rank: null,
        isTopTen: false,
      },
      {
        districtCode: '11140',
        districtName: '중구',
        x: 320,
        y: 440,
        rank: 2,
        isTopTen: true,
      },
    ])
  })

  it('uses only the first ten ranked items', () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      rank: index + 1,
      districtCode: index === 10 ? '11110' : '99999',
      districtName: `자치구 ${index + 1}`,
      value: index,
      changeRate: 0,
    }))

    expect(
      createStatusMapLabels(items, features, districtRecords)[0],
    ).toMatchObject({
      districtCode: '11110',
      rank: null,
      isTopTen: false,
    })
  })

  it('drops a label when the district name mapping is missing', () => {
    expect(
      createStatusMapLabels([], features, districtRecords.slice(0, 1)),
    ).toEqual([
      {
        districtCode: '11110',
        districtName: '종로구',
        x: 120,
        y: 240,
        rank: null,
        isTopTen: false,
      },
    ])
  })

  it('does not mutate items, features, or district records', () => {
    const items = [
      {
        rank: 1,
        districtCode: '11110',
        districtName: '종로구',
        value: 100,
        changeRate: 5,
      },
    ]
    const originalItems = structuredClone(items)
    const originalFeatures = structuredClone(features)
    const originalDistrictRecords = structuredClone(districtRecords)

    createStatusMapLabels(items, features, districtRecords)

    expect(items).toEqual(originalItems)
    expect(features).toEqual(originalFeatures)
    expect(districtRecords).toEqual(originalDistrictRecords)
  })
})
```

- [ ] **Step 2: focused 테스트가 의도대로 실패하는지 확인**

Run:

```bash
pnpm vitest run src/lib/status/status-map-model.test.ts
```

Expected: `createStatusMapLabels` export가 없어 FAIL.

- [ ] **Step 3: 25개 feature 기준 label 표시 모델 구현**

`src/lib/status/status-map-model.ts`의 marker 타입과 함수를 다음 코드로 교체한다.

```ts
import type { DistrictRecord } from '@/data/districts'
import type { StatusRankedItem } from '@/types/status'

export type StatusMapFeature = {
  readonly districtCode: string
  readonly path: string
  readonly center: {
    readonly x: number
    readonly y: number
  }
}

export type StatusMapLabel = {
  readonly districtCode: string
  readonly districtName: string
  readonly x: number
  readonly y: number
  readonly rank: number | null
  readonly isTopTen: boolean
}

export function createStatusMapLabels(
  items: readonly StatusRankedItem[],
  features: readonly StatusMapFeature[],
  districtRecords: readonly DistrictRecord[],
): StatusMapLabel[] {
  const ranksByDistrictCode = new Map(
    items.slice(0, 10).map(item => [item.districtCode, item.rank]),
  )
  const namesByDistrictCode = new Map(
    districtRecords.map(record => [String(record.gooCode), record.gooName]),
  )

  return features.flatMap(feature => {
    const districtName = namesByDistrictCode.get(feature.districtCode)

    if (!districtName) {
      return []
    }

    const rank = ranksByDistrictCode.get(feature.districtCode) ?? null

    return [
      {
        districtCode: feature.districtCode,
        districtName,
        x: feature.center.x,
        y: feature.center.y,
        rank,
        isTopTen: rank !== null,
      },
    ]
  })
}

export function findSelectedStatusMapFeature(
  features: readonly StatusMapFeature[],
  districtCode: string | null,
): StatusMapFeature | null {
  return features.find(feature => feature.districtCode === districtCode) ?? null
}
```

- [ ] **Step 4: focused 테스트 통과 확인**

Run:

```bash
pnpm vitest run src/lib/status/status-map-model.test.ts
```

Expected: 지도 모델 테스트 전체 PASS.

- [ ] **Step 5: 지도 모델 커밋**

```bash
git add src/lib/status/status-map-model.ts src/lib/status/status-map-model.test.ts
git commit -m "feat: 자치구 지도 라벨 표시 모델 추가"
```

### Task 2: 25개 경계·이름과 Top10 순위 지도 UI

**Files:**

- Modify: `src/components/status/status-map.tsx`
- Modify: `src/components/status/status-map.test.ts`

- [ ] **Step 1: 경계·라벨·순위·배경 동작의 실패 테스트 작성**

`src/components/status/status-map.test.ts`를 다음 계약으로 확장한다.

```ts
import type { ComponentProps } from 'react'

const items: StatusRankedItem[] = [
  {
    rank: 1,
    districtCode: '11680',
    districtName: '강남구',
    value: 100,
    changeRate: 10,
  },
  {
    rank: 2,
    districtCode: '11110',
    districtName: '종로구',
    value: 90,
    changeRate: 5,
  },
]

const renderMap = (overrides: Partial<ComponentProps<typeof StatusMap>> = {}) =>
  renderToStaticMarkup(
    createElement(StatusMap, {
      metric: 'sales',
      items,
      selectedDistrictCode: null,
      onSelect: vi.fn(),
      ...overrides,
    }),
  )

it('renders 25 district paths and 25 district-name labels', () => {
  const markup = renderMap()

  expect(markup.match(/data-status-district-path=/g)).toHaveLength(25)
  expect(markup.match(/data-status-district-label=/g)).toHaveLength(25)
  expect(markup).toContain('강남구')
  expect(markup).toContain('종로구')
  expect(markup).toContain('동작구')
})

it('renders ranks only for Top 10 labels and removes circular markers', () => {
  const markup = renderMap()

  expect(markup.match(/data-status-rank=/g)).toHaveLength(2)
  expect(markup).toContain('1위 강남구, 매출 기준')
  expect(markup).toContain('2위 종로구, 매출 기준')
  expect(markup).not.toContain('data-status-circle-marker')
})

it('renders the selected district polygon once', () => {
  const markup = renderMap({ selectedDistrictCode: '11680' })

  expect(markup.match(/data-selected-district-code="11680"/g)).toHaveLength(1)
  expect(markup).toContain('aria-pressed="true"')
})

it.each([
  ['expand', '지도를 눌러 구별 현황 바텀시트 펼치기'],
  ['collapse', '지도를 더 보기 위해 구별 현황 바텀시트 최소화'],
] as const)('labels the %s background action', (backgroundAction, label) => {
  expect(renderMap({ backgroundAction, onBackgroundClick: vi.fn() })).toContain(
    `aria-label="${label}"`,
  )
})
```

- [ ] **Step 2: focused 테스트 실패 확인**

Run:

```bash
pnpm vitest run src/components/status/status-map.test.ts
```

Expected: 25개 path/label data attribute와 `backgroundAction` prop이 없어 FAIL.

- [ ] **Step 3: 원형 marker를 25개 이름과 Top10 순위 라벨로 교체**

`src/components/status/status-map.tsx`에서 다음 변경을 적용한다.

```tsx
import styled, { css } from 'styled-components'
import { districts } from '@/data/districts'
import {
  createStatusMapLabels,
  findSelectedStatusMapFeature,
  type StatusMapLabel,
} from '@/lib/status/status-map-model'

type StatusMapProps = {
  metric: StatusMetric
  items: StatusRankedItem[]
  selectedDistrictCode: string | null
  onSelect: (districtCode: string) => void
  backgroundAction?: 'expand' | 'collapse'
  onBackgroundClick?: () => void
}

const DistrictPath = styled.path`
  fill: var(--color-surface-muted);
  stroke: var(--color-border-300);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
`

const labelPositionStyles = css<{ $x: number; $y: number }>`
  position: absolute;
  z-index: 2;
  top: ${props => (props.$y / 620) * 100}%;
  left: ${props => (props.$x / 800) * 100}%;
  display: grid;
  justify-items: center;
  gap: 1px;
  color: var(--color-text-800);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.15;
  white-space: nowrap;
  text-shadow:
    -1px -1px 0 var(--color-surface),
    1px -1px 0 var(--color-surface),
    -1px 1px 0 var(--color-surface),
    1px 1px 0 var(--color-surface);
  transform: translate(-50%, -50%);
`

const DistrictNameLabel = styled.div<{ $x: number; $y: number }>`
  ${labelPositionStyles}
  pointer-events: none;
`

const RankedDistrictLabel = styled.button<{
  $selected: boolean
  $x: number
  $y: number
}>`
  ${labelPositionStyles}
  z-index: ${props => (props.$selected ? 4 : 3)};
  min-width: 42px;
  padding: 4px 6px;
  border: ${props => (props.$selected ? '2px' : '1px')} solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-300)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  cursor: pointer;
`

const RankText = styled.span`
  color: var(--color-primary-700);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
`

const getRankedLabel = (metric: StatusMetric, label: StatusMapLabel) =>
  `${label.rank}위 ${label.districtName}, ${METRIC_LABELS[metric]} 기준`
```

컴포넌트 내부 렌더링은 다음 구조로 바꾼다.

```tsx
const labels = createStatusMapLabels(items, SEOUL_STATUS_FEATURES, districts)
const backgroundLabel =
  backgroundAction === 'expand'
    ? '지도를 눌러 구별 현황 바텀시트 펼치기'
    : '지도를 더 보기 위해 구별 현황 바텀시트 최소화'

return (
  <Figure>
    <MapCanvas>
      {onBackgroundClick && backgroundAction ? (
        <MapBackgroundButton
          aria-label={backgroundLabel}
          type="button"
          onClick={onBackgroundClick}
        />
      ) : null}

      <SeoulSilhouette
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
        viewBox={SEOUL_STATUS_VIEW_BOX}
      >
        {SEOUL_STATUS_FEATURES.map(feature => (
          <DistrictPath
            key={feature.districtCode}
            d={feature.path}
            data-status-district-path={feature.districtCode}
          />
        ))}
        {selectedFeature ? (
          <SelectedDistrictPath
            d={selectedFeature.path}
            data-selected-district-code={selectedFeature.districtCode}
          />
        ) : null}
      </SeoulSilhouette>

      {labels.map(label => {
        if (!label.isTopTen || label.rank === null) {
          return (
            <DistrictNameLabel
              key={label.districtCode}
              $x={label.x}
              $y={label.y}
              data-status-district-label={label.districtCode}
            >
              {label.districtName}
            </DistrictNameLabel>
          )
        }

        const isSelected = label.districtCode === selectedDistrictCode

        return (
          <RankedDistrictLabel
            key={label.districtCode}
            $selected={isSelected}
            $x={label.x}
            $y={label.y}
            aria-label={getRankedLabel(metric, label)}
            aria-pressed={isSelected}
            data-status-district-label={label.districtCode}
            type="button"
            onClick={() => onSelect(label.districtCode)}
          >
            <span>{label.districtName}</span>
            <RankText data-status-rank={label.rank}>{label.rank}</RankText>
          </RankedDistrictLabel>
        )
      })}
    </MapCanvas>
    <Caption>
      구 이름 아래 숫자는 {METRIC_LABELS[metric]} 기준 Top10 순위입니다.
    </Caption>
  </Figure>
)
```

기존 `MarkerButton`, `getMarkerLabel`, `EmptyMessage`, `createStatusMapMarkers`
사용을 제거한다. `Caption`은 “구 이름 아래 숫자는 현재 지표의 Top10
순위입니다.”로 바꾼다.

- [ ] **Step 4: 지도 component/model 테스트 통과 확인**

Run:

```bash
pnpm vitest run src/components/status/status-map.test.ts src/lib/status/status-map-model.test.ts
```

Expected: 두 테스트 파일 전체 PASS.

- [ ] **Step 5: 지도 UI 커밋**

```bash
git add src/components/status/status-map.tsx src/components/status/status-map.test.ts
git commit -m "feat: 지도에 자치구 경계와 순위 라벨 표시"
```

### Task 3: 52px/66% 모바일 시트 상태와 제스처

**Files:**

- Modify: `src/lib/status/status-state.ts`
- Modify: `src/lib/status/status-state.test.ts`
- Modify: `src/components/status/status-mobile-sheet.tsx`

- [ ] **Step 1: 새 높이 경계와 콘텐츠 포커스 계약의 실패 테스트 작성**

`src/lib/status/status-state.test.ts`에서
`isStatusSheetSingleSnap`, `canCollapseStatusSheetFromMap`,
`STATUS_SHEET_COLLAPSED_RATIO`, `createCollapsedStatusSheetState` 관련 테스트를
제거하고 다음 테스트를 추가한다.

```ts
import {
  STATUS_SHEET_COLLAPSED_HEIGHT,
  getStatusSheetHeightBounds,
} from './status-state'

describe('getStatusSheetHeightBounds', () => {
  it.each([
    [560, 52, 369.6],
    [523.28, 52, 343.28],
    [360, 52, 180],
  ])(
    'returns 52px collapsed and safe expanded height for %spx',
    (viewportHeight, collapsedHeight, expandedHeight) => {
      expect(getStatusSheetHeightBounds(viewportHeight)).toEqual({
        collapsedHeight,
        expandedHeight,
      })
    },
  )

  it.each([Number.NaN, 0, -1])(
    'falls back to the collapsed height for invalid viewport %s',
    viewportHeight => {
      expect(getStatusSheetHeightBounds(viewportHeight)).toEqual({
        collapsedHeight: STATUS_SHEET_COLLAPSED_HEIGHT,
        expandedHeight: STATUS_SHEET_COLLAPSED_HEIGHT,
      })
    },
  )
})

describe('resolveSheetSnapFromDrag with the handle-only snap', () => {
  const collapsedHeight = 52
  const expandedHeight = 343.28
  const midpointDelta = (expandedHeight - collapsedHeight) / 2

  it.each([
    ['collapsed', -(midpointDelta - 1), 'collapsed'],
    ['collapsed', -midpointDelta, 'expanded'],
    ['expanded', midpointDelta, 'expanded'],
    ['expanded', midpointDelta + 1, 'collapsed'],
  ] as const)(
    'resolves %s with delta %s as %s',
    (startSnap, deltaY, expectedSnap) => {
      expect(
        resolveSheetSnapFromDrag(
          startSnap,
          deltaY,
          collapsedHeight,
          expandedHeight,
        ),
      ).toBe(expectedSnap)
    },
  )
})
```

`applyStatusSheetContentTransition` 테스트 호출에서 `isSingleSnap`을 제거하고,
Top10 복귀 시 handle focus를 기대한다.

```ts
applyStatusSheetContentTransition({
  body,
  backButton: null,
  handle: {
    focus: options =>
      events.push(`handle-focus:${String(options?.preventScroll)}`),
  },
  isShowingDetail: false,
})

expect(events).toEqual(['scroll:0', 'handle-focus:true'])
```

- [ ] **Step 2: status-state focused 테스트 실패 확인**

Run:

```bash
pnpm vitest run src/lib/status/status-state.test.ts
```

Expected: `getStatusSheetHeightBounds`와 새 constant가 없어 FAIL.

- [ ] **Step 3: 새 높이 경계와 콘텐츠 전환 helper 구현**

`src/lib/status/status-state.ts`의 단일 스냅 constant/function을 제거하고 다음
코드를 사용한다. 더 이상 소비되지 않는 `createCollapsedStatusSheetState`도
제거한다.

```ts
export const STATUS_SHEET_COLLAPSED_HEIGHT = 52
export const STATUS_SHEET_EXPANDED_RATIO = 0.66
export const STATUS_SHEET_MINIMUM_MAP_HEIGHT = 180

export type StatusSheetHeightBounds = {
  collapsedHeight: number
  expandedHeight: number
}

export const getStatusSheetHeightBounds = (
  statusViewportHeight: number,
): StatusSheetHeightBounds => {
  if (!Number.isFinite(statusViewportHeight) || statusViewportHeight <= 0) {
    return {
      collapsedHeight: STATUS_SHEET_COLLAPSED_HEIGHT,
      expandedHeight: STATUS_SHEET_COLLAPSED_HEIGHT,
    }
  }

  return {
    collapsedHeight: STATUS_SHEET_COLLAPSED_HEIGHT,
    expandedHeight: Math.max(
      STATUS_SHEET_COLLAPSED_HEIGHT,
      Math.min(
        statusViewportHeight * STATUS_SHEET_EXPANDED_RATIO,
        statusViewportHeight - STATUS_SHEET_MINIMUM_MAP_HEIGHT,
      ),
    ),
  }
}
```

`applyStatusSheetContentTransition`에서 `isSingleSnap` 인자를 제거한다.

```ts
export const applyStatusSheetContentTransition = ({
  body,
  backButton,
  handle,
  isShowingDetail,
}: {
  body: StatusSheetBodyTarget | null
  backButton: StatusSheetFocusTarget | null
  handle: StatusSheetFocusTarget | null
  isShowingDetail: boolean
}): void => {
  if (body) {
    body.scrollTop = 0
  }

  const focusTarget = isShowingDetail ? backButton : handle
  focusTarget?.focus({ preventScroll: true })
}
```

- [ ] **Step 4: StatusMobileSheet를 항상 두 스냅으로 단순화**

`src/components/status/status-mobile-sheet.tsx`에서 `isSingleSnap` prop과 모든
분기를 제거한다. styled-components와 drag bounds는 다음 계약을 사용한다.

```tsx
const Sheet = styled.section<{
  $dragDeltaY: number
  $isDragging: boolean
  $snap: StatusSheetSnap
}>`
  --status-sheet-collapsed-height: ${STATUS_SHEET_COLLAPSED_HEIGHT}px;
  --status-sheet-expanded-height: min(
    ${STATUS_SHEET_EXPANDED_RATIO * 100}%,
    calc(100% - ${STATUS_SHEET_MINIMUM_MAP_HEIGHT}px)
  );

  position: absolute;
  z-index: 10;
  right: 0;
  bottom: 0;
  left: 0;
  height: clamp(
    var(--status-sheet-collapsed-height),
    calc(
      ${props =>
          props.$snap === 'expanded'
            ? 'var(--status-sheet-expanded-height)'
            : 'var(--status-sheet-collapsed-height)'} -
        ${props => props.$dragDeltaY}px
    ),
    var(--status-sheet-expanded-height)
  );
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--color-border-200);
  border-bottom: 0;
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  background: var(--color-surface);
  box-shadow: var(--shadow-level-3);
  transition: ${props =>
    props.$isDragging
      ? 'none'
      : 'height var(--motion-standard) var(--ease-standard)'};

  @media (min-width: 1024px) {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const SheetBody = styled.div<{ $hidden: boolean }>`
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 16px calc(20px + env(safe-area-inset-bottom));
  visibility: ${props => (props.$hidden ? 'hidden' : 'visible')};
  pointer-events: ${props => (props.$hidden ? 'none' : 'auto')};
  -webkit-overflow-scrolling: touch;
`
```

pointer down에서 `getStatusSheetHeightBounds(statusViewportHeight)`를
`dragBoundsRef.current`에 저장한다. handle의 `aria-expanded`와 label은 항상
snap을 기준으로 제공한다. 본문은 다음 속성을 사용한다.

```tsx
<SheetBody
  ref={sheetBodyRef}
  $hidden={snap === 'collapsed'}
  id={bodyId}
  aria-hidden={snap === 'collapsed'}
  inert={snap === 'collapsed' ? true : undefined}
  aria-label={selectedItem ? '선택 지역 상세' : '구별 상권 상위 10개 목록'}
  role="region"
>
```

- [ ] **Step 5: state 테스트와 typecheck 통과 확인**

Run:

```bash
pnpm vitest run src/lib/status/status-state.test.ts
pnpm typecheck
```

Expected: status-state 테스트 PASS, TypeScript 오류 0개.

- [ ] **Step 6: 모바일 시트 상태 커밋**

```bash
git add src/lib/status/status-state.ts src/lib/status/status-state.test.ts src/components/status/status-mobile-sheet.tsx
git commit -m "feat: 모바일 바텀시트를 핸들 중심 이단 스냅으로 변경"
```

### Task 4: 모바일 지도 통합과 `/status` 푸터 숨김

**Files:**

- Modify: `src/components/status/status-page.tsx`
- Modify: `src/components/layout/site-footer.tsx`
- Create: `src/components/layout/site-footer.test.tsx`

- [ ] **Step 1: 모바일 전용 푸터 선택자의 실패 테스트 작성**

`src/components/layout/site-footer.test.tsx`를 생성한다.

```tsx
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ServerStyleSheet } from 'styled-components'

import SiteFooter from './site-footer'

describe('SiteFooter', () => {
  it('hides only after a status main that requests mobile footer removal', () => {
    const sheet = new ServerStyleSheet()

    try {
      renderToStaticMarkup(sheet.collectStyles(createElement(SiteFooter)))
      const css = sheet.getStyleTags()

      expect(css).toMatch(
        /main\[data-hide-mobile-footer=['"]true['"]\]\+[^}]+display:none/,
      )
      expect(css).toContain('@media (max-width:1023px)')
    } finally {
      sheet.seal()
    }
  })
})
```

- [ ] **Step 2: footer focused 테스트 실패 확인**

Run:

```bash
pnpm vitest run src/components/layout/site-footer.test.tsx
```

Expected: 모바일 인접 선택자가 없어 FAIL.

- [ ] **Step 3: `/status` 바로 뒤의 footer만 모바일에서 숨기기**

`src/components/layout/site-footer.tsx`의 `Footer`에 다음 media rule을 추가한다.

```ts
const Footer = styled.footer`
  border-top: 1px solid var(--color-border-200);
  background: var(--color-background);

  @media (max-width: 1023px) {
    main[data-hide-mobile-footer='true'] + & {
      display: none;
    }
  }
`
```

- [ ] **Step 4: StatusPage의 초기·탭·지도 토글 상태 변경**

`src/components/status/status-page.tsx`에서 다음을 적용한다.

기존 `canCollapseStatusSheetFromMap`, `createCollapsedStatusSheetState`,
`isStatusSheetSingleSnap` import를 제거하고 `getNextSheetSnap`을 import한다.

```tsx
const [sheetState, setSheetState] = useState<StatusSheetState>({
  districtCode: null,
  snap: 'expanded',
})
```

`mobileStageRef`, `siteHeaderHeight`, `mobileStageHeight`, 두 ResizeObserver
effect, `isStatusSheetSingleSnap` 계산을 제거한다. 지표 변경과 Top10 복귀는
expanded를 유지한다.

```tsx
const handleMetricChange = (nextMetric: typeof metric) => {
  if (nextMetric === metric) {
    return
  }

  setSheetState({ districtCode: null, snap: 'expanded' })
  pushStatusQuery(nextMetric, null)
}

const handleClearDistrict = () => {
  setSheetState({ districtCode: null, snap: 'expanded' })
  pushStatusQuery(metric, null)
}

const handleMapBackgroundClick = () => {
  setSheetState({
    districtCode: selectedDistrictCode,
    snap: getNextSheetSnap(
      sheetSnap,
      sheetSnap === 'collapsed' ? 'expand' : 'collapse',
    ),
  })
}
```

`Page`에는 footer scope를 나타내고, 모바일 map에는 양방향 action을 전달한다.

```tsx
<Page data-hide-mobile-footer="true">
```

```tsx
<StatusMap
  items={currentItems}
  metric={metric}
  selectedDistrictCode={selectedDistrictCode}
  backgroundAction={sheetSnap === 'collapsed' ? 'expand' : 'collapse'}
  onBackgroundClick={handleMapBackgroundClick}
  onSelect={handleDistrictSelect}
/>
```

`StatusMobileSheet`에서는 제거한 `isSingleSnap` prop을 전달하지 않는다.

- [ ] **Step 5: 모바일 지도 스테이지를 360~560px overlay로 변경**

`MobileStage`와 `MobileMapLayer`를 다음 코드로 바꾼다.

```tsx
const MobileStage = styled.section`
  display: none;

  @media (max-width: 1023px) {
    position: relative;
    width: calc(100% + 32px);
    height: clamp(360px, 62dvh, 560px);
    display: block;
    overflow: hidden;
    margin-left: -16px;
    border-top: 1px solid var(--color-border-200);
    background: var(--color-surface-muted);
  }
`

const MobileMapLayer = styled.div`
  position: absolute;
  inset: 0;
  min-height: 0;
  padding: 12px;

  > figure {
    height: 100%;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  > figure > div {
    height: 100%;
    aspect-ratio: auto;
  }
`
```

- [ ] **Step 6: focused 테스트와 관련 회귀 테스트 통과 확인**

Run:

```bash
pnpm vitest run \
  src/components/layout/site-footer.test.tsx \
  src/components/status/status-map.test.ts \
  src/lib/status/status-map-model.test.ts \
  src/lib/status/status-state.test.ts
```

Expected: 네 테스트 파일 전체 PASS.

- [ ] **Step 7: 모바일 통합 커밋**

```bash
git add src/components/status/status-page.tsx src/components/layout/site-footer.tsx src/components/layout/site-footer.test.tsx
git commit -m "feat: 모바일 지도와 바텀시트 오버레이 개선"
```

### Task 5: 전체 회귀 및 브라우저 검증

**Files:**

- Modify only if verification finds an in-scope defect.

- [ ] **Step 1: 전체 자동 테스트 실행**

Run:

```bash
pnpm test
```

Expected: Vitest와 지도 생성기 Node 테스트 전체 PASS.

- [ ] **Step 2: 정적 검사 실행**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
git diff --check
```

Expected: 모든 명령 exit code 0. 기존 middleware deprecation 경고는 결과에
기록하되 이 작업에서 수정하지 않는다.

- [ ] **Step 3: 데스크톱 1280x900 브라우저 검증**

`http://localhost:3001/status?metric=sales`에서 확인한다.

- 25개 path 경계가 구분된다.
- 25개 구 이름이 표시된다.
- Top10에만 순위 숫자가 표시된다.
- Top10 라벨 선택 시 URL에 `district`가 추가된다.
- 선택 path는 primary 3px 경계와 50% 채움을 갖는다.
- Top10 280px, 상세 280px, 지도 배치가 유지된다.
- 데스크톱 푸터가 표시된다.

- [ ] **Step 4: 모바일 390x844 브라우저 검증**

같은 URL을 390x844 viewport에서 확인한다.

- 지도 스테이지 높이는 약 523px이고 서울 전체 윤곽이 보인다.
- 최초 Top10 시트는 약 66%로 expanded 상태다.
- handle tap과 아래 drag 후 시트 높이는 52px다.
- collapsed 본문은 보이거나 포커스되지 않는다.
- collapsed 상태의 지도 배경 탭은 expanded로 전환한다.
- expanded 상태의 지도 배경 탭은 collapsed로 전환한다.
- 선택된 구와 URL은 지도 배경 토글 후 유지된다.
- 다른 Top10 구 라벨 선택 시 상세·URL·폴리곤이 바뀌고 expanded가 된다.
- 푸터가 표시되지 않고 가로 스크롤이 없다.

- [ ] **Step 5: 태블릿 768x1024 브라우저 검증**

- 지도 스테이지 높이는 최대 560px다.
- 52px/66% 스냅과 label 선택이 모바일과 동일하게 동작한다.
- 푸터가 표시되지 않는다.

- [ ] **Step 6: 브라우저 콘솔과 작업 트리 확인**

Run:

```bash
git status --short
git diff --check
git log --oneline -6
```

Expected: console error 0, 미커밋 파일 없음, 모든 신규 커밋 메시지의 설명이
한글이고 백엔드·패키지·락파일·설정 변경이 없음.

- [ ] **Step 7: 검증 중 포맷 수정이 있을 때만 별도 커밋**

Prettier가 실제로 소스 파일을 변경한 경우에만 실행한다.

```bash
git add src
git commit -m "style: 지도와 모바일 시트 포맷 정리"
```

변경이 없으면 커밋하지 않는다.
