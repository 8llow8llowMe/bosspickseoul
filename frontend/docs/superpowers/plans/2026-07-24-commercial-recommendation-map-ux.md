# 상권 추천 지도 UX 마이그레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 자치구·행정동·업종을 선택해 해당 행정동 내부의 상권 Top 5를 지도 폴리곤과 적응형 패널에서 비교할 수 있게 한다.

**Architecture:** 추천 화면 전용 문자열 기반 API 타입과 reducer를 만들고, React Query는 확정된 조건 snapshot으로만 지역·추천·프로필을 조회한다. 네이티브 Kakao Maps JavaScript SDK를 얇은 loader로 감싸며, 조건 depth가 지도 레이어를 결정하고 지도 viewport는 추천 범위에 영향을 주지 않는다. 데스크톱은 고정 왼쪽 패널, 모바일은 추천 전용 expanded/peek 바텀시트를 사용한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, TanStack React Query 5, styled-components 6, Zustand(기존 인증 상태만 사용), Kakao Maps JavaScript SDK, Vitest

---

## 작업 전제

- 작업 위치는 `origin/develop` 기반 전용 worktree
  `/Users/seonghoho/Documents/projects/nowdoboss/.worktrees/bosspick-recommend`다.
- 백엔드, 패키지 버전, `pnpm-lock.yaml`, 빌드·배포 설정은 수정하지 않는다.
- API 정본은 `frontend/docs/api/openapi/*.json`과
  `frontend/docs/api/recommendation-migration.md`다.
- dev 지역·지도 API는 2026-07-24 기준 빈 배열을 반환하므로, 구현 중에는
  fixture 기반 자동 테스트와 빈 상태를 검증하고 실데이터 E2E는 적재 후
  별도로 확인한다.
- 아래 커밋 단계는 사용자가 명시적으로 커밋을 승인한 경우에만 실행한다.
  승인 전에는 해당 단계만 건너뛰고 변경을 worktree에 유지한다.

## 파일 구조

### 새 파일

- `frontend/src/types/recommend.ts`: 지역, geometry, 추천, 프로필 계약 타입
- `frontend/src/types/bookmark.ts`: 공통 북마크 계약 타입
- `frontend/src/types/kakao-map.d.ts`: 사용하는 Kakao Maps SDK 최소 전역 타입
- `frontend/src/lib/recommend/recommend-state.ts`: 조건 snapshot과 화면 상태 reducer
- `frontend/src/lib/recommend/recommend-state.test.ts`: 조건 초기화와 명시적 제출 상태 테스트
- `frontend/src/lib/recommend/recommend-map-model.ts`: 좌표 검증, bounds, geometry 결합, 점수 농도 계산
- `frontend/src/lib/recommend/recommend-map-model.test.ts`: 지도 순수 모델 테스트
- `frontend/src/lib/recommend/recommend-bookmarks.ts`: 공통 목록에서 상권 북마크 수집
- `frontend/src/lib/recommend/recommend-bookmarks.test.ts`: 커서 페이지 및 상권 필터 테스트
- `frontend/src/hooks/use-commercial-bookmarks.ts`: 로그인 사용자의 커서 북마크 전체 조회
- `frontend/src/lib/kakao-map.ts`: 네이티브 Kakao Maps SDK loader
- `frontend/src/lib/kakao-map.test.ts`: script URL과 key 검증 테스트
- `frontend/src/components/recommend/recommend-feedback.tsx`: 지도·패널 공통 로딩/오류/빈 상태
- `frontend/src/components/recommend/recommend-condition-form.tsx`: 자치구·행정동·업종 단계
- `frontend/src/components/recommend/recommend-result-list.tsx`: Top 5와 선택 결과 상세
- `frontend/src/components/recommend/recommend-panel.tsx`: 조건/결과 전환형 데스크톱 패널
- `frontend/src/components/recommend/recommend-panel.test.ts`: 정적 마크업 상태 테스트
- `frontend/src/components/recommend/recommend-map.tsx`: Kakao Map과 polygon/marker 생명주기
- `frontend/src/components/recommend/recommend-map.test.ts`: SSR fallback과 접근 가능한 지도 보조 UI 테스트
- `frontend/src/components/recommend/recommend-mobile-sheet.tsx`: 추천 전용 expanded/peek 바텀시트
- `frontend/src/components/recommend/recommend-mobile-sheet.test.ts`: snap 계산과 정적 마크업 테스트

### 수정 파일

- `frontend/src/lib/api/recommend.ts`: 레거시 `/recommendation/...`를 신규 지역·지도·추천·프로필 API로 교체
- `frontend/src/lib/api/user.ts`: 공통 북마크 목록·추가·삭제 API 추가
- `frontend/src/components/recommend/recommend-page.tsx`: 신규 쿼리와 지도/패널 orchestration으로 교체
- `frontend/src/components/profile/profile-recommend-bookmarks-page.tsx`: 공통 `COMMERCIAL` 북마크 목록으로 교체
- `frontend/app/(shell)/recommend/page.tsx`: 지도형 추천에 맞게 metadata 설명 수정
- `frontend/docs/api/recommendation-migration.md`: 실제 구현 파일과 검증 결과 반영

### 유지 파일

- `frontend/src/components/location/location-selector.tsx`: 다른 화면의 레거시 숫자 계약 때문에 수정하지 않는다.
- `frontend/src/stores/select-place-store.ts`: 다른 화면이 사용하므로 삭제하거나 추천 화면에 재사용하지 않는다.
- `frontend/src/types/map.ts`: 기존 소비자가 남아 있으므로 이번 작업에서 정리하지 않는다.
- `frontend/src/lib/kakao.ts`: Kakao 공유 SDK loader이므로 지도 loader와 합치지 않는다.

## Task 1: 신규 추천 API 계약과 반복 query 직렬화

**Files:**

- Create: `frontend/src/types/recommend.ts`
- Modify: `frontend/src/lib/api/recommend.ts`
- Create: `frontend/src/lib/api/recommend.test.ts`

- [ ] **Step 1: 반복 query key와 신규 endpoint를 요구하는 실패 테스트 작성**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import {
  buildRecommendationSearchParams,
  fetchAdministrations,
  fetchCommercialRecommendations,
} from './recommend'

describe('buildRecommendationSearchParams', () => {
  it('serializes commercial codes as repeated keys without brackets', () => {
    expect(
      buildRecommendationSearchParams({
        serviceCode: 'CS100010',
        commercialCodes: ['3110008', '3110012'],
        periodCode: '20233',
        topN: 5,
      }).toString(),
    ).toBe(
      'serviceCode=CS100010&commercialCodes=3110008&commercialCodes=3110012&periodCode=20233&topN=5',
    )
  })
})

describe('recommend API', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses the new district administration endpoint', async () => {
    const response = {
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: [],
    }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })

    await fetchAdministrations('11680')

    expect(get).toHaveBeenCalledWith('/regions/districts/11680/administrations')
  })

  it('sends the strict commercial code scope to by-service', async () => {
    const response = {
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: {
        serviceCode: 'CS100010',
        periodCode: '20233',
        preset: null,
        priorityMetric: null,
        topN: 5,
        summary: '',
        items: [],
      },
    }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })

    await fetchCommercialRecommendations({
      serviceCode: 'CS100010',
      commercialCodes: ['3110008', '3110012'],
      periodCode: '20233',
      topN: 5,
    })

    expect(get).toHaveBeenCalledWith(
      '/commercials/recommendations/by-service?serviceCode=CS100010&commercialCodes=3110008&commercialCodes=3110012&periodCode=20233&topN=5',
    )
  })
})
```

- [ ] **Step 2: 기존 API 구현에서 테스트가 실패하는지 확인**

Run from `frontend`:

```bash
pnpm exec vitest run src/lib/api/recommend.test.ts
```

Expected: 신규 export가 없어 테스트가 실패한다.

- [ ] **Step 3: Swagger와 동일한 문자열 기반 타입 작성**

`src/types/recommend.ts`에 다음 타입을 작성한다.

```ts
import type { ApiResponse } from '@/types/api'

export type CoordinateTuple = readonly [lng: number, lat: number]

export type GeoBounds = {
  lngSW: number
  latSW: number
  lngNE: number
  latNE: number
}

export type AreaBoundaryItem = {
  areaCode: string
  areaName: string
  centerLng: number
  centerLat: number
  boundaryCoords: CoordinateTuple[]
}

export type AdministrationArea = {
  administrationCode: string
  administrationName: string
  centerLat: number
  centerLng: number
}

export type CommercialArea = {
  commercialCode: string
  commercialName: string
  commercialClassificationCode: string
  commercialClassificationName: string
  centerLat: number
  centerLng: number
}

export type CodeNameDescriptionMetadata = {
  code: string
  name: string
  description: string
} | null

export type ScoreMetricMetadata = {
  code: string
  name: string
  description: string
  scoreDescription: string
} | null

export type MetricBreakdownItem = {
  metricType: ScoreMetricMetadata
  score: number | null
  grade: string | null
  summaryLabel: string | null
}

export type CandidateCommercial = {
  rank: number
  commercialCode: string
  commercialName: string
  compositeScore: number | null
  grade: string | null
  summaryLabel: string | null
  selectionReason: string | null
  opportunityLabel: string | null
  riskLabel: string | null
  metricBreakdown: MetricBreakdownItem[]
  reasonTags: string[]
}

export type CandidateCommercials = {
  serviceCode: string
  periodCode: string
  preset: CodeNameDescriptionMetadata
  priorityMetric: ScoreMetricMetadata
  topN: number
  summary: string
  items: CandidateCommercial[]
}

export type CommercialProfile = {
  commercialCode: string
  commercialName: string
  districtCode: string
  districtName: string
  administrationCode: string
  administrationName: string
  centerLng: number
  centerLat: number
  boundaryCoords: CoordinateTuple[]
  keyMetrics: {
    totalSalesAmount?: number | null
    totalFootTraffic?: number | null
    totalStoreCount?: number | null
    similarStoreCount?: number | null
    openingRate?: number | null
    closureRate?: number | null
    totalResidentPopulation?: number | null
    monthlyAverageIncomeAmount?: number | null
    totalFacilityCount?: number | null
  } | null
}

export type MapAreasBody = { areas: AreaBoundaryItem[] }
export type AdministrationAreasResponse = ApiResponse<AdministrationArea[]>
export type CommercialAreasResponse = ApiResponse<CommercialArea[]>
export type MapAreasResponse = ApiResponse<MapAreasBody>
export type CandidateCommercialsResponse = ApiResponse<CandidateCommercials>
export type CommercialProfileResponse = ApiResponse<CommercialProfile>

export type RecommendationRequest = {
  serviceCode: string
  commercialCodes: string[]
  periodCode: string
  topN: 5
}
```

- [ ] **Step 4: 레거시 추천 API를 신규 계약으로 교체**

`src/lib/api/recommend.ts`를 다음 공개 함수 구조로 교체한다.

```ts
import { apiClient } from '@/lib/api/client'
import type {
  AdministrationAreasResponse,
  CandidateCommercialsResponse,
  CommercialAreasResponse,
  CommercialProfileResponse,
  GeoBounds,
  MapAreasResponse,
  RecommendationRequest,
} from '@/types/recommend'

export const RECOMMENDATION_PERIOD_CODE = '20233'
export const RECOMMENDATION_TOP_N = 5 as const
export const SEOUL_MAP_BOUNDS: GeoBounds = {
  lngSW: 126.7,
  latSW: 37.4,
  lngNE: 127.3,
  latNE: 37.75,
}

const buildBoundsSearchParams = (bounds: GeoBounds) =>
  new URLSearchParams(
    Object.entries(bounds).map(([key, value]) => [key, String(value)]),
  )

export const buildRecommendationSearchParams = ({
  serviceCode,
  commercialCodes,
  periodCode,
  topN,
}: RecommendationRequest) => {
  const params = new URLSearchParams({ serviceCode })
  commercialCodes.forEach(code => params.append('commercialCodes', code))
  params.set('periodCode', periodCode)
  params.set('topN', String(topN))
  return params
}

export const fetchDistrictMapAreas = async (
  bounds: GeoBounds = SEOUL_MAP_BOUNDS,
) => {
  const response = await apiClient.get<MapAreasResponse>(
    `/map/districts?${buildBoundsSearchParams(bounds)}`,
  )
  return response.data
}

export const fetchAdministrations = async (districtCode: string) => {
  const response = await apiClient.get<AdministrationAreasResponse>(
    `/regions/districts/${districtCode}/administrations`,
  )
  return response.data
}

export const fetchAdministrationMapAreas = async (bounds: GeoBounds) => {
  const response = await apiClient.get<MapAreasResponse>(
    `/map/administrations?${buildBoundsSearchParams(bounds)}`,
  )
  return response.data
}

export const fetchCommercials = async (
  districtCode: string,
  administrationCode: string,
) => {
  const response = await apiClient.get<CommercialAreasResponse>(
    `/regions/districts/${districtCode}/administrations/${administrationCode}/commercials`,
  )
  return response.data
}

export const fetchCommercialRecommendations = async (
  request: RecommendationRequest,
) => {
  const response = await apiClient.get<CandidateCommercialsResponse>(
    `/commercials/recommendations/by-service?${buildRecommendationSearchParams(request)}`,
  )
  return response.data
}

export const fetchCommercialProfile = async (
  commercialCode: string,
  serviceCode: string,
  periodCode: string,
) => {
  const params = new URLSearchParams({ serviceCode, periodCode })
  const response = await apiClient.get<CommercialProfileResponse>(
    `/map/commercials/${commercialCode}/profile?${params}`,
  )
  return response.data
}
```

- [ ] **Step 5: API 테스트 통과 확인**

Run:

```bash
pnpm exec vitest run src/lib/api/recommend.test.ts
```

Expected: 직렬화와 endpoint 테스트가 모두 통과한다.

- [ ] **Step 6: 승인된 경우 첫 구현 단위 커밋**

```bash
git add src/types/recommend.ts src/lib/api/recommend.ts src/lib/api/recommend.test.ts
git commit -m "feat: add commercial recommendation API contracts"
```

## Task 2: 추천 상태 reducer와 지도 geometry 모델

**Files:**

- Create: `frontend/src/lib/recommend/recommend-state.ts`
- Create: `frontend/src/lib/recommend/recommend-state.test.ts`
- Create: `frontend/src/lib/recommend/recommend-map-model.ts`
- Create: `frontend/src/lib/recommend/recommend-map-model.test.ts`

- [ ] **Step 1: 조건 snapshot과 downstream 초기화 실패 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import {
  createInitialRecommendationState,
  formatRecommendationPeriod,
  recommendationReducer,
} from './recommend-state'

describe('recommendationReducer', () => {
  it('keeps the service while resetting district-dependent state', () => {
    const initial = {
      ...createInitialRecommendationState(),
      draft: {
        district: { code: '11680', name: '강남구' },
        administration: { code: '11680101', name: '역삼1동' },
        service: { code: 'CS100010', name: '커피-음료' },
      },
    }

    const next = recommendationReducer(initial, {
      type: 'districtSelected',
      district: { code: '11110', name: '종로구' },
    })

    expect(next.draft).toEqual({
      district: { code: '11110', name: '종로구' },
      administration: null,
      service: { code: 'CS100010', name: '커피-음료' },
    })
    expect(next.submitted).toBeNull()
    expect(next.selectedCommercialCode).toBeNull()
  })

  it('creates an immutable submitted snapshot only on submit', () => {
    const readyState = {
      ...createInitialRecommendationState(),
      draft: {
        district: { code: '11680', name: '강남구' },
        administration: { code: '11680101', name: '역삼1동' },
        service: { code: 'CS100010', name: '커피-음료' },
      },
    }

    const submitted = recommendationReducer(readyState, {
      type: 'submitted',
      commercialCodes: ['3110012', '3110008', '3110012'],
    })

    expect(submitted.submitted?.commercialCodes).toEqual(['3110008', '3110012'])
    expect(submitted.view).toBe('results')
    expect(submitted.sheetSnap).toBe('expanded')
  })

  it('selects a result without changing the submitted criteria', () => {
    const state = recommendationReducer(createInitialRecommendationState(), {
      type: 'resultSelected',
      commercialCode: '3110008',
    })

    expect(state.selectedCommercialCode).toBe('3110008')
    expect(state.sheetSnap).toBe('peek')
  })

  it('formats the backend period code without implying current data', () => {
    expect(formatRecommendationPeriod('20233')).toBe('2023년 3분기 기준')
    expect(formatRecommendationPeriod('unknown')).toBe('unknown 기준')
  })
})
```

- [ ] **Step 2: 좌표 검증·bounds·점수 농도 실패 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import {
  buildRecommendationMapItems,
  createBounds,
  filterAreasByCodes,
  getScoreFillOpacity,
  normalizeBoundary,
} from './recommend-map-model'

describe('recommend map model', () => {
  it('converts valid [lng, lat] tuples and rejects invalid coordinates', () => {
    expect(
      normalizeBoundary([
        [127.03, 37.5],
        [Number.NaN, 37.51],
        [127.04, 91],
      ]),
    ).toEqual([{ lng: 127.03, lat: 37.5 }])
  })

  it('calculates bounds from sanitized coordinates', () => {
    expect(
      createBounds([
        { lng: 127.01, lat: 37.49 },
        { lng: 127.05, lat: 37.52 },
      ]),
    ).toEqual({
      lngSW: 127.01,
      latSW: 37.49,
      lngNE: 127.05,
      latNE: 37.52,
    })
  })

  it('filters map areas with normalized string codes', () => {
    expect(
      filterAreasByCodes(
        [
          {
            areaCode: '11680101',
            areaName: '역삼1동',
            centerLng: 127.03,
            centerLat: 37.5,
            boundaryCoords: [],
          },
          {
            areaCode: '11110101',
            areaName: '청운효자동',
            centerLng: 126.97,
            centerLat: 37.58,
            boundaryCoords: [],
          },
        ],
        ['11680101'],
      ),
    ).toHaveLength(1)
  })

  it.each([
    [100, 1, 0.42],
    [0, 5, 0.11],
    [null, 2, 0.29],
  ])('maps score %s and rank %s to %s opacity', (score, rank, expected) => {
    expect(getScoreFillOpacity(score, rank)).toBe(expected)
  })

  it('falls back to the administration commercial center when a profile has no geometry', () => {
    expect(
      buildRecommendationMapItems(
        [
          {
            rank: 1,
            commercialCode: '3110008',
            commercialName: '강남역 상권',
            compositeScore: 84,
            grade: 'HIGH',
            summaryLabel: null,
            selectionReason: null,
            opportunityLabel: null,
            riskLabel: null,
            metricBreakdown: [],
            reasonTags: [],
          },
        ],
        [],
        [
          {
            commercialCode: '3110008',
            commercialName: '강남역 상권',
            commercialClassificationCode: 'A',
            commercialClassificationName: '골목상권',
            centerLng: 127.03,
            centerLat: 37.5,
          },
        ],
      ),
    ).toEqual([
      expect.objectContaining({
        commercialCode: '3110008',
        centerLng: 127.03,
        centerLat: 37.5,
        boundaryCoords: [],
      }),
    ])
  })
})
```

- [ ] **Step 3: 두 테스트 파일의 예상 실패 확인**

Run:

```bash
pnpm exec vitest run \
  src/lib/recommend/recommend-state.test.ts \
  src/lib/recommend/recommend-map-model.test.ts
```

Expected: 대상 모듈이 없어 실패한다.

- [ ] **Step 4: 추천 화면 reducer 구현**

`src/lib/recommend/recommend-state.ts`에 다음 상태와 action을 작성한다.

```ts
export type RecommendationOption = {
  readonly code: string
  readonly name: string
}
export type RecommendationView = 'criteria' | 'results'
export type RecommendationSheetSnap = 'expanded' | 'peek'

export type RecommendationCriteria = {
  district: RecommendationOption | null
  administration: RecommendationOption | null
  service: RecommendationOption | null
}

export type SubmittedRecommendation = {
  readonly district: RecommendationOption
  readonly administration: RecommendationOption
  readonly service: RecommendationOption
  readonly commercialCodes: readonly string[]
  readonly commercialCodesKey: string
  readonly requestKey: string
}

export type RecommendationState = {
  draft: RecommendationCriteria
  submitted: SubmittedRecommendation | null
  view: RecommendationView
  selectedCommercialCode: string | null
  sheetSnap: RecommendationSheetSnap
}

type RecommendationAction =
  | { type: 'districtSelected'; district: RecommendationOption }
  | { type: 'administrationSelected'; administration: RecommendationOption }
  | { type: 'serviceSelected'; service: RecommendationOption }
  | { type: 'submitted'; commercialCodes: string[] }
  | {
      type: 'resultsLoaded'
      requestKey: string
      commercialCode: string | null
    }
  | { type: 'resultSelected'; commercialCode: string }
  | { type: 'editRequested' }
  | { type: 'sheetSnapChanged'; snap: RecommendationSheetSnap }

export const createStableCommercialCodes = (codes: string[]) =>
  [...new Set(codes.map(String).filter(Boolean))].sort()

export const formatRecommendationPeriod = (periodCode: string) => {
  const match = /^(\d{4})([1-4])$/.exec(periodCode)
  return match ? `${match[1]}년 ${match[2]}분기 기준` : `${periodCode} 기준`
}

export const createInitialRecommendationState = (): RecommendationState => ({
  draft: { district: null, administration: null, service: null },
  submitted: null,
  view: 'criteria',
  selectedCommercialCode: null,
  sheetSnap: 'expanded',
})

export function recommendationReducer(
  state: RecommendationState,
  action: RecommendationAction,
): RecommendationState {
  switch (action.type) {
    case 'districtSelected':
      return {
        ...state,
        draft: {
          district: action.district,
          administration: null,
          service: state.draft.service,
        },
        submitted: null,
        view: 'criteria',
        selectedCommercialCode: null,
        sheetSnap: 'expanded',
      }
    case 'administrationSelected':
      return {
        ...state,
        draft: { ...state.draft, administration: action.administration },
        submitted: null,
        view: 'criteria',
        selectedCommercialCode: null,
        sheetSnap: 'expanded',
      }
    case 'serviceSelected':
      return {
        ...state,
        draft: { ...state.draft, service: action.service },
        submitted: null,
        view: 'criteria',
        selectedCommercialCode: null,
        sheetSnap: 'expanded',
      }
    case 'submitted': {
      const { district, administration, service } = state.draft
      if (!district || !administration || !service) return state
      const commercialCodes = createStableCommercialCodes(
        action.commercialCodes,
      )
      if (commercialCodes.length === 0) return state
      return {
        ...state,
        submitted: {
          district: { ...district },
          administration: { ...administration },
          service: { ...service },
          commercialCodes,
          commercialCodesKey: commercialCodes.join(','),
          requestKey: JSON.stringify([
            district.code,
            administration.code,
            service.code,
            commercialCodes.join(','),
          ]),
        },
        view: 'results',
        selectedCommercialCode: null,
        sheetSnap: 'expanded',
      }
    }
    case 'resultsLoaded':
      if (
        state.view !== 'results' ||
        !state.submitted ||
        action.requestKey !== state.submitted.requestKey ||
        (action.commercialCode !== null &&
          !state.submitted.commercialCodes.includes(action.commercialCode))
      ) {
        return state
      }
      return {
        ...state,
        selectedCommercialCode: action.commercialCode,
        sheetSnap: 'expanded',
      }
    case 'resultSelected':
      if (
        state.view !== 'results' ||
        !state.submitted ||
        !state.submitted.commercialCodes.includes(action.commercialCode)
      ) {
        return state
      }
      return {
        ...state,
        selectedCommercialCode: action.commercialCode,
        sheetSnap: 'peek',
      }
    case 'editRequested':
      return {
        ...state,
        submitted: null,
        view: 'criteria',
        selectedCommercialCode: null,
        sheetSnap: 'expanded',
      }
    case 'sheetSnapChanged':
      return { ...state, sheetSnap: action.snap }
  }
}
```

- [ ] **Step 5: 지도 순수 모델 구현**

`src/lib/recommend/recommend-map-model.ts`에 다음 함수를 작성한다.

```ts
import type {
  AreaBoundaryItem,
  CandidateCommercial,
  CommercialArea,
  CommercialProfile,
  CoordinateTuple,
  GeoBounds,
} from '@/types/recommend'

export type MapPoint = { lng: number; lat: number }

const isValidPoint = (lng: number, lat: number) =>
  Number.isFinite(lng) &&
  Number.isFinite(lat) &&
  lng >= -180 &&
  lng <= 180 &&
  lat >= -90 &&
  lat <= 90

export const normalizeBoundary = (
  coordinates: readonly CoordinateTuple[],
): MapPoint[] =>
  coordinates.flatMap(([lng, lat]) =>
    isValidPoint(lng, lat) ? [{ lng, lat }] : [],
  )

export const createBounds = (points: readonly MapPoint[]): GeoBounds | null => {
  if (points.length === 0) return null
  const lngs = points.map(point => point.lng)
  const lats = points.map(point => point.lat)
  return {
    lngSW: Math.min(...lngs),
    latSW: Math.min(...lats),
    lngNE: Math.max(...lngs),
    latNE: Math.max(...lats),
  }
}

export const createCenterFallbackBounds = (
  lng: number,
  lat: number,
): GeoBounds => ({
  lngSW: lng - 0.08,
  latSW: lat - 0.06,
  lngNE: lng + 0.08,
  latNE: lat + 0.06,
})

export const filterAreasByCodes = (
  areas: readonly AreaBoundaryItem[],
  codes: readonly string[],
) => {
  const allowedCodes = new Set(codes.map(String))
  return areas.filter(area => allowedCodes.has(String(area.areaCode)))
}

const rankOpacity = [0.42, 0.29, 0.23, 0.17, 0.11] as const

export const getScoreFillOpacity = (score: number | null, rank: number) => {
  if (!Number.isFinite(score)) {
    return rankOpacity[Math.min(Math.max(rank, 1), 5) - 1]
  }
  const normalized = Math.min(Math.max(score ?? 0, 0), 100) / 100
  return Number((0.11 + normalized * 0.31).toFixed(2))
}

export type RecommendationMapItem = {
  rank: number
  commercialCode: string
  commercialName: string
  compositeScore: number | null
  centerLng: number
  centerLat: number
  boundaryCoords: CoordinateTuple[]
}

export const buildRecommendationMapItems = (
  results: readonly CandidateCommercial[],
  profiles: readonly CommercialProfile[],
  commercials: readonly CommercialArea[],
): RecommendationMapItem[] => {
  const profilesByCode = new Map(
    profiles.map(profile => [profile.commercialCode, profile]),
  )
  const commercialsByCode = new Map(
    commercials.map(commercial => [commercial.commercialCode, commercial]),
  )

  return results.flatMap(result => {
    const profile = profilesByCode.get(result.commercialCode)
    const commercial = commercialsByCode.get(result.commercialCode)
    const boundaryCoords = (profile?.boundaryCoords ?? []).filter(
      ([lng, lat]) => isValidPoint(lng, lat),
    )
    const centerLng = profile?.centerLng ?? commercial?.centerLng
    const centerLat = profile?.centerLat ?? commercial?.centerLat

    if (
      centerLng === undefined ||
      centerLat === undefined ||
      !isValidPoint(centerLng, centerLat)
    ) {
      return []
    }

    return [
      {
        rank: result.rank,
        commercialCode: result.commercialCode,
        commercialName: result.commercialName,
        compositeScore: result.compositeScore,
        centerLng,
        centerLat,
        boundaryCoords,
      },
    ]
  })
}
```

- [ ] **Step 6: 상태·지도 모델 테스트 통과 확인**

Run:

```bash
pnpm exec vitest run \
  src/lib/recommend/recommend-state.test.ts \
  src/lib/recommend/recommend-map-model.test.ts
```

Expected: 모든 reducer와 geometry 테스트가 통과한다.

- [ ] **Step 7: 승인된 경우 두 번째 구현 단위 커밋**

```bash
git add src/lib/recommend/recommend-state.ts \
  src/lib/recommend/recommend-state.test.ts \
  src/lib/recommend/recommend-map-model.ts \
  src/lib/recommend/recommend-map-model.test.ts
git commit -m "feat: add recommendation state and map models"
```

## Task 3: 적응형 조건·결과 패널

**Files:**

- Create: `frontend/src/components/recommend/recommend-feedback.tsx`
- Create: `frontend/src/components/recommend/recommend-condition-form.tsx`
- Create: `frontend/src/components/recommend/recommend-result-list.tsx`
- Create: `frontend/src/components/recommend/recommend-panel.tsx`
- Create: `frontend/src/components/recommend/recommend-panel.test.ts`

- [ ] **Step 1: 조건과 결과 모드의 정적 마크업 실패 테스트 작성**

`recommend-panel.test.ts`는 node 환경에서 `createElement`와
`renderToStaticMarkup`을 사용한다.

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import RecommendPanel from './recommend-panel'

const baseProps = {
  draft: {
    district: { code: '11680', name: '강남구' },
    administration: { code: '11680101', name: '역삼1동' },
    service: { code: 'CS100010', name: '커피-음료' },
  },
  administrations: [],
  candidatesCount: 5,
  periodLabel: '2023년 3분기 기준',
  results: [],
  selectedCommercialCode: null,
  isAdministrationsLoading: false,
  isCandidatesLoading: false,
  isRecommendationLoading: false,
  feedback: null,
  onDistrictChange: vi.fn(),
  onAdministrationChange: vi.fn(),
  onServiceChange: vi.fn(),
  onSubmit: vi.fn(),
  onEdit: vi.fn(),
  onResultSelect: vi.fn(),
  onRetry: vi.fn(),
}

describe('RecommendPanel', () => {
  it('renders the three criteria fields and enabled submit action', () => {
    const markup = renderToStaticMarkup(
      createElement(RecommendPanel, {
        ...baseProps,
        view: 'criteria',
      }),
    )

    expect(markup).toContain('자치구')
    expect(markup).toContain('행정동')
    expect(markup).toContain('업종')
    expect(markup).toContain('상권 추천받기')
    expect(markup).not.toContain('disabled=""')
  })

  it('renders ranked result buttons and edit action', () => {
    const markup = renderToStaticMarkup(
      createElement(RecommendPanel, {
        ...baseProps,
        view: 'results',
        selectedCommercialCode: '3110008',
        results: [
          {
            rank: 1,
            commercialCode: '3110008',
            commercialName: '강남역 상권',
            compositeScore: 84.2,
            grade: 'HIGH',
            summaryLabel: '공격형 추천',
            selectionReason: '매출 성장과 유동인구가 우세해요',
            opportunityLabel: '기회도 높음',
            riskLabel: '위험도 낮음',
            metricBreakdown: [],
            reasonTags: ['유동인구 우세'],
          },
        ],
      }),
    )

    expect(markup).toContain('추천 Top 5')
    expect(markup).toContain('강남역 상권')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('조건 수정')
    expect(markup).toContain('2023년 3분기 기준')
  })
})
```

- [ ] **Step 2: 컴포넌트 부재로 테스트가 실패하는지 확인**

Run:

```bash
pnpm exec vitest run src/components/recommend/recommend-panel.test.ts
```

Expected: `recommend-panel` 모듈을 찾지 못해 실패한다.

- [ ] **Step 3: 공통 feedback과 조건 form 구현**

`RecommendFeedback`은 `tone: 'info' | 'error'`, `title`, `description`,
선택적 `actionLabel`, `onAction`만 받는다. 오류 action은 실제 `<button>`으로
렌더링하고 `role="alert"`, 일반 상태는 `role="status"`를 사용한다.

`RecommendConditionForm`의 공개 props는 다음으로 고정한다.

```ts
type RecommendConditionFormProps = {
  draft: RecommendationCriteria
  administrations: AdministrationArea[]
  candidatesCount: number
  isAdministrationsLoading: boolean
  isCandidatesLoading: boolean
  onDistrictChange: (district: RecommendationOption) => void
  onAdministrationChange: (administration: RecommendationOption) => void
  onServiceChange: (service: RecommendationOption) => void
  onSubmit: () => void
}
```

자치구 option은 `districts`를 다음처럼 문자열로 변환한다.

```ts
const districtOptions = districts.map(district => ({
  code: String(district.gooCode),
  name: district.gooName,
}))
```

업종 option은 category `<optgroup>`과 기존 catalog를 사용한다.

```tsx
{
  Object.entries(simulationCatalog).map(([category, services]) => (
    <optgroup key={category} label={category}>
      {services.map(service => (
        <option key={service.code} value={service.code}>
          {service.name}
        </option>
      ))}
    </optgroup>
  ))
}
```

submit disabled 조건은 다음 하나로 계산한다.

```ts
const isSubmitDisabled =
  !draft.district ||
  !draft.administration ||
  !draft.service ||
  isAdministrationsLoading ||
  isCandidatesLoading ||
  candidatesCount === 0
```

- [ ] **Step 4: 결과 목록과 전환 패널 구현**

`RecommendResultList`는 `results`, `selectedCommercialCode`,
`isLoading`, `feedback`, `onSelect`, `onRetry`를 받고 다음 규칙을 적용한다.

```tsx
<ResultCard
  type="button"
  aria-pressed={item.commercialCode === selectedCommercialCode}
  data-selected={item.commercialCode === selectedCommercialCode}
  onClick={() => onSelect(item.commercialCode)}
>
  <Rank>{item.rank}</Rank>
  <ResultCopy>
    <ResultName>{item.commercialName}</ResultName>
    {item.selectionReason ? (
      <ResultReason>{item.selectionReason}</ResultReason>
    ) : null}
  </ResultCopy>
  <Score>
    {Number.isFinite(item.compositeScore)
      ? Math.round(item.compositeScore ?? 0)
      : '집계 중'}
  </Score>
  {item.commercialCode === selectedCommercialCode ? (
    <ExpandedDetails>
      {[item.opportunityLabel, item.riskLabel, ...item.reasonTags]
        .filter(Boolean)
        .slice(0, 3)
        .map(label => (
          <ReasonBadge key={label}>{label}</ReasonBadge>
        ))}
      {item.metricBreakdown.map(metric => (
        <MetricRow key={metric.metricType?.code ?? metric.summaryLabel}>
          <span>{metric.summaryLabel ?? metric.metricType?.name}</span>
          <strong>
            {Number.isFinite(metric.score)
              ? Math.round(metric.score ?? 0)
              : '집계 중'}
          </strong>
        </MetricRow>
      ))}
    </ExpandedDetails>
  ) : null}
</ResultCard>
```

`RecommendPanel`은 고정 크기 surface 안에서 `view`에 따라
`RecommendConditionForm` 또는 `RecommendResultList`를 렌더링한다. 결과
헤더에는 확정된 조건 요약, `formatRecommendationPeriod`로 만든 기준 분기,
`조건 수정` 버튼을 둔다. 전환은
`var(--motion-standard)`와 `var(--ease-standard)`를 사용하고
`prefers-reduced-motion`에서 제거한다.

- [ ] **Step 5: 패널 테스트 통과 확인**

Run:

```bash
pnpm exec vitest run src/components/recommend/recommend-panel.test.ts
```

Expected: 조건과 결과 마크업 테스트가 모두 통과한다.

- [ ] **Step 6: 승인된 경우 세 번째 구현 단위 커밋**

```bash
git add src/components/recommend/recommend-feedback.tsx \
  src/components/recommend/recommend-condition-form.tsx \
  src/components/recommend/recommend-result-list.tsx \
  src/components/recommend/recommend-panel.tsx \
  src/components/recommend/recommend-panel.test.ts
git commit -m "feat: add adaptive recommendation panel"
```

## Task 4: 네이티브 Kakao Map loader와 추천 지도

**Files:**

- Create: `frontend/src/types/kakao-map.d.ts`
- Create: `frontend/src/lib/kakao-map.ts`
- Create: `frontend/src/lib/kakao-map.test.ts`
- Create: `frontend/src/components/recommend/recommend-map.tsx`
- Create: `frontend/src/components/recommend/recommend-map.test.ts`

- [ ] **Step 1: SDK URL과 key 검증 실패 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import { createKakaoMapScriptUrl } from './kakao-map'

describe('createKakaoMapScriptUrl', () => {
  it('creates the autoload-disabled SDK URL', () => {
    expect(createKakaoMapScriptUrl('javascript-key')).toBe(
      'https://dapi.kakao.com/v2/maps/sdk.js?appkey=javascript-key&autoload=false',
    )
  })

  it('rejects an empty key before touching the DOM', () => {
    expect(() => createKakaoMapScriptUrl('')).toThrow(
      'Kakao Map API key가 설정되지 않았습니다.',
    )
  })
})
```

- [ ] **Step 2: 지도 컨테이너와 fallback 정적 마크업 실패 테스트 작성**

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import RecommendMap from './recommend-map'

describe('RecommendMap', () => {
  it('renders a labelled map region and fixed-scope status', () => {
    const markup = renderToStaticMarkup(
      createElement(RecommendMap, {
        stage: 'district',
        districtAreas: [],
        administrationAreas: [],
        resultAreas: [],
        selectedDistrictCode: null,
        selectedAdministrationCode: null,
        selectedCommercialCode: null,
        onDistrictSelect: vi.fn(),
        onAdministrationSelect: vi.fn(),
        onCommercialSelect: vi.fn(),
      }),
    )

    expect(markup).toContain('aria-label="상권 추천 지도"')
    expect(markup).toContain('data-recommend-map-container="true"')
    expect(markup).toContain('추천 범위 고정')
  })
})
```

- [ ] **Step 3: 두 테스트의 예상 실패 확인**

Run:

```bash
pnpm exec vitest run \
  src/lib/kakao-map.test.ts \
  src/components/recommend/recommend-map.test.ts
```

Expected: loader와 지도 컴포넌트가 없어 실패한다.

- [ ] **Step 4: 사용하는 Kakao Maps 최소 타입과 loader 구현**

`src/types/kakao-map.d.ts`에는 실제 사용하는 생성자와 메서드만 선언한다.

```ts
type KakaoLatLng = {
  getLat(): number
  getLng(): number
}

type KakaoMapInstance = {
  setCenter(center: KakaoLatLng): void
  setBounds(bounds: KakaoLatLngBounds): void
  relayout(): void
}

type KakaoLatLngBounds = {
  extend(point: KakaoLatLng): void
}

declare global {
  interface Window {
    kakao?: {
      maps: {
        load(callback: () => void): void
        Map: new (
          container: HTMLElement,
          options: { center: KakaoLatLng; level: number },
        ) => KakaoMapInstance
        LatLng: new (lat: number, lng: number) => KakaoLatLng
        LatLngBounds: new () => KakaoLatLngBounds
        Polygon: new (options: Record<string, unknown>) => {
          setMap(map: KakaoMapInstance | null): void
        }
        CustomOverlay: new (options: Record<string, unknown>) => {
          setMap(map: KakaoMapInstance | null): void
        }
        event: {
          addListener(
            target: object,
            eventName: string,
            handler: () => void,
          ): void
        }
      }
    }
  }
}

export {}
```

`src/lib/kakao-map.ts`는 같은 Promise를 재사용한다.

```ts
const KAKAO_MAP_SCRIPT_ID = 'kakao-map-sdk'
let kakaoMapPromise: Promise<NonNullable<Window['kakao']>['maps']> | null = null

export const createKakaoMapScriptUrl = (apiKey: string) => {
  const normalizedKey = apiKey.trim()
  if (!normalizedKey) {
    throw new Error('Kakao Map API key가 설정되지 않았습니다.')
  }
  return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(normalizedKey)}&autoload=false`
}

export const loadKakaoMapSdk = (apiKey: string) => {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('Kakao Map은 브라우저 환경에서만 불러올 수 있습니다.'),
    )
  }
  if (kakaoMapPromise) return kakaoMapPromise

  kakaoMapPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (!window.kakao?.maps) {
        reject(new Error('Kakao Map SDK 초기화에 실패했습니다.'))
        return
      }
      window.kakao.maps.load(() => resolve(window.kakao!.maps))
    }
    const existing = document.getElementById(
      KAKAO_MAP_SCRIPT_ID,
    ) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', finish, { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('Kakao Map SDK를 불러오지 못했습니다.')),
        { once: true },
      )
      if (window.kakao?.maps) finish()
      return
    }

    const script = document.createElement('script')
    script.id = KAKAO_MAP_SCRIPT_ID
    script.src = createKakaoMapScriptUrl(apiKey)
    script.async = true
    script.addEventListener('load', finish, { once: true })
    script.addEventListener(
      'error',
      () => {
        script.remove()
        reject(new Error('Kakao Map SDK를 불러오지 못했습니다.'))
      },
      { once: true },
    )
    document.head.appendChild(script)
  }).catch(error => {
    kakaoMapPromise = null
    throw error
  })

  return kakaoMapPromise
}
```

- [ ] **Step 5: 지도 컴포넌트의 명시적 stage 레이어 구현**

`RecommendMap` props는 다음으로 고정한다.

```ts
type RecommendMapProps = {
  stage: 'district' | 'administration' | 'results'
  districtAreas: AreaBoundaryItem[]
  administrationAreas: AreaBoundaryItem[]
  resultAreas: Array<{
    rank: number
    commercialCode: string
    commercialName: string
    compositeScore: number | null
    centerLng: number
    centerLat: number
    boundaryCoords: CoordinateTuple[]
  }>
  selectedDistrictCode: string | null
  selectedAdministrationCode: string | null
  selectedCommercialCode: string | null
  onDistrictSelect: (code: string) => void
  onAdministrationSelect: (code: string) => void
  onCommercialSelect: (code: string) => void
}
```

컴포넌트는 `env.kakaoMapApiKey`로 SDK를 한 번 로드하고 map instance를 ref에
보관한다. 매 render effect에서 이전 polygon과 CustomOverlay를
`setMap(null)`로 제거한 뒤 현재 stage만 렌더링한다.

```ts
const sourceAreas =
  stage === 'district'
    ? districtAreas
    : stage === 'administration'
      ? administrationAreas
      : []

for (const area of sourceAreas) {
  const path = normalizeBoundary(area.boundaryCoords).map(
    point => new maps.LatLng(point.lat, point.lng),
  )
  if (path.length < 3) continue

  const isSelected =
    (stage === 'district' && area.areaCode === selectedDistrictCode) ||
    (stage === 'administration' && area.areaCode === selectedAdministrationCode)

  const polygon = new maps.Polygon({
    path,
    strokeWeight: isSelected ? 3 : 1,
    strokeColor: isSelected ? '#2563eb' : '#94a3b8',
    strokeOpacity: 1,
    fillColor: isSelected ? '#2563eb' : '#e2e8f0',
    fillOpacity: isSelected ? 0.12 : 0.08,
  })
  polygon.setMap(map)
  maps.event.addListener(polygon, 'click', () => {
    if (stage === 'district') onDistrictSelect(area.areaCode)
    if (stage === 'administration') {
      onAdministrationSelect(area.areaCode)
    }
  })
  overlays.push(polygon)
}
```

결과 stage는 선택 행정동 경계를 먼저 그린 뒤 Top 5를 rank 역순으로 그리고
선택 항목을 마지막에 다시 그린다. 각 중심점에는 DOM button을 넣은
CustomOverlay를 만든다.

```ts
const markerButton = document.createElement('button')
markerButton.type = 'button'
markerButton.className = 'recommend-rank-marker'
markerButton.textContent = String(item.rank)
markerButton.setAttribute(
  'aria-label',
  `${item.rank}위 ${item.commercialName} ${Number.isFinite(item.compositeScore) ? `${Math.round(item.compositeScore ?? 0)}점` : '점수 집계 중'}`,
)
markerButton.setAttribute(
  'aria-pressed',
  String(item.commercialCode === selectedCommercialCode),
)
markerButton.addEventListener('click', () =>
  onCommercialSelect(item.commercialCode),
)
```

map container 옆에는 `추천 범위 고정` 상태와 `선택 범위로 이동` 버튼을
DOM으로 렌더링한다. 버튼은 선택 상권 geometry, 선택 행정동 geometry,
선택 자치구 geometry 순서로 bounds를 계산해 `map.setBounds`를 호출한다.
ResizeObserver에서 `map.relayout()` 후 같은 target bounds를 다시 적용한다.
SDK 오류는 `RecommendFeedback`으로 표시하고 재시도 시 loader를 다시
호출한다.

- [ ] **Step 6: loader·지도 정적 테스트 통과 확인**

Run:

```bash
pnpm exec vitest run \
  src/lib/kakao-map.test.ts \
  src/components/recommend/recommend-map.test.ts \
  src/lib/recommend/recommend-map-model.test.ts
```

Expected: URL, 지도 landmark, geometry 테스트가 모두 통과한다.

- [ ] **Step 7: 승인된 경우 네 번째 구현 단위 커밋**

```bash
git add src/types/kakao-map.d.ts src/lib/kakao-map.ts \
  src/lib/kakao-map.test.ts \
  src/components/recommend/recommend-map.tsx \
  src/components/recommend/recommend-map.test.ts
git commit -m "feat: add Kakao recommendation map"
```

## Task 5: 모바일 추천 바텀시트

**Files:**

- Create: `frontend/src/components/recommend/recommend-mobile-sheet.tsx`
- Create: `frontend/src/components/recommend/recommend-mobile-sheet.test.ts`

- [ ] **Step 1: expanded/peek 높이와 선택 유지 실패 테스트 작성**

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import RecommendMobileSheet, {
  getRecommendationSheetBounds,
  resolveRecommendationSheetSnap,
} from './recommend-mobile-sheet'

describe('recommend mobile sheet state', () => {
  it('keeps at least 180px of the map visible', () => {
    expect(getRecommendationSheetBounds(560)).toEqual({
      peekHeight: 88,
      expandedHeight: 380,
    })
  })

  it('resolves an upward drag from peek to expanded', () => {
    expect(
      resolveRecommendationSheetSnap('peek', -200, {
        peekHeight: 88,
        expandedHeight: 380,
      }),
    ).toBe('expanded')
  })
})

describe('RecommendMobileSheet', () => {
  it('keeps the selected result summary visible in peek state', () => {
    const markup = renderToStaticMarkup(
      createElement(RecommendMobileSheet, {
        snap: 'peek',
        view: 'results',
        selectedResult: {
          rank: 1,
          commercialCode: '3110008',
          commercialName: '강남역 상권',
          compositeScore: 84.2,
          grade: 'HIGH',
          summaryLabel: null,
          selectionReason: null,
          opportunityLabel: null,
          riskLabel: null,
          metricBreakdown: [],
          reasonTags: [],
        },
        onSnapChange: vi.fn(),
        children: createElement('div', null, 'Top 5 목록'),
      }),
    )

    expect(markup).toContain('강남역 상권')
    expect(markup).toContain('84점')
    expect(markup).toContain('data-sheet-snap="peek"')
  })
})
```

- [ ] **Step 2: 컴포넌트 부재로 테스트가 실패하는지 확인**

Run:

```bash
pnpm exec vitest run src/components/recommend/recommend-mobile-sheet.test.ts
```

Expected: 대상 모듈이 없어 실패한다.

- [ ] **Step 3: 높이 계산과 drag snap 구현**

```ts
export const RECOMMENDATION_SHEET_PEEK_HEIGHT = 88
export const RECOMMENDATION_SHEET_MINIMUM_MAP_HEIGHT = 180
export const RECOMMENDATION_SHEET_EXPANDED_RATIO = 0.72

export const getRecommendationSheetBounds = (viewportHeight: number) => {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    return {
      peekHeight: RECOMMENDATION_SHEET_PEEK_HEIGHT,
      expandedHeight: RECOMMENDATION_SHEET_PEEK_HEIGHT,
    }
  }
  return {
    peekHeight: RECOMMENDATION_SHEET_PEEK_HEIGHT,
    expandedHeight: Math.max(
      RECOMMENDATION_SHEET_PEEK_HEIGHT,
      Math.min(
        viewportHeight * RECOMMENDATION_SHEET_EXPANDED_RATIO,
        viewportHeight - RECOMMENDATION_SHEET_MINIMUM_MAP_HEIGHT,
      ),
    ),
  }
}

export const resolveRecommendationSheetSnap = (
  startSnap: RecommendationSheetSnap,
  deltaY: number,
  bounds: { peekHeight: number; expandedHeight: number },
): RecommendationSheetSnap => {
  const distance = bounds.expandedHeight - bounds.peekHeight
  if (!Number.isFinite(deltaY) || distance <= 0) return startSnap
  const threshold = distance / 2
  if (startSnap === 'peek') return deltaY <= -threshold ? 'expanded' : 'peek'
  return deltaY > threshold ? 'peek' : 'expanded'
}
```

- [ ] **Step 4: 추천 전용 시트 UI 구현**

`StatusMobileSheet`의 pointer capture와 drag tolerance 흐름을 따르되 content
전환은 하지 않는다. `snap === 'peek'`이면 선택 결과 요약만 렌더링하고,
`expanded`이면 전달된 panel children을 스크롤 영역에 렌더링한다.

```tsx
<Sheet
  ref={sheetRef}
  data-sheet-snap={snap}
  $snap={snap}
  $dragDeltaY={dragVisualState?.deltaY ?? 0}
  $isDragging={dragVisualState !== null}
>
  <HandleButton
    ref={handleRef}
    type="button"
    aria-expanded={snap === 'expanded'}
    aria-controls={bodyId}
    onClick={() => onSnapChange(snap === 'expanded' ? 'peek' : 'expanded')}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    onPointerCancel={handlePointerCancel}
  >
    <HandleIndicator />
    {snap === 'peek' && selectedResult ? (
      <PeekSummary>
        <Rank>{selectedResult.rank}</Rank>
        <strong>{selectedResult.commercialName}</strong>
        <span>
          {Number.isFinite(selectedResult.compositeScore)
            ? `${Math.round(selectedResult.compositeScore ?? 0)}점`
            : '집계 중'}
        </span>
      </PeekSummary>
    ) : null}
  </HandleButton>
  <SheetBody id={bodyId} $isExpanded={snap === 'expanded'}>
    {children}
  </SheetBody>
</Sheet>
```

시트 높이는 CSS에서 88px과
`min(72%, calc(100% - 180px))` 사이로 clamp한다. safe-area padding,
`overscroll-behavior: contain`, reduced-motion 처리도 `/status`와
동일하게 적용한다.

- [ ] **Step 5: 모바일 시트 테스트 통과 확인**

Run:

```bash
pnpm exec vitest run src/components/recommend/recommend-mobile-sheet.test.ts
```

Expected: 높이, drag snap, peek 마크업 테스트가 통과한다.

- [ ] **Step 6: 승인된 경우 다섯 번째 구현 단위 커밋**

```bash
git add src/components/recommend/recommend-mobile-sheet.tsx \
  src/components/recommend/recommend-mobile-sheet.test.ts
git commit -m "feat: add recommendation mobile bottom sheet"
```

## Task 6: 추천 페이지 query orchestration과 반응형 통합

**Files:**

- Modify: `frontend/src/components/recommend/recommend-page.tsx`
- Modify: `frontend/app/(shell)/recommend/page.tsx`

- [ ] **Step 1: 기존 레거시 import와 로그인 gate 제거**

`recommend-page.tsx`에서 다음 의존성을 제거한다.

```ts
import LocationSelector from '@/components/location/location-selector'
import {
  recommendCommercial,
  recommendDelete,
  recommendSave,
  recommendSaveList,
} from '@/lib/api/recommend'
import { useSelectPlaceStore } from '@/stores/select-place-store'
```

추천 결과 query의 `enabled`에서 `hasHydrated && isLoggedIn` 조건도 제거한다.
인증 store는 북마크 UI 연결 전까지 추천 조회에 관여하지 않는다.

- [ ] **Step 2: reducer와 지역·지도 query 연결**

페이지 상단 상태는 다음으로 시작한다.

```ts
const [state, dispatch] = useReducer(
  recommendationReducer,
  undefined,
  createInitialRecommendationState,
)

const districtMapQuery = useQuery({
  queryKey: ['recommend', 'map', 'districts', SEOUL_MAP_BOUNDS],
  queryFn: () => fetchDistrictMapAreas(),
})

const administrationsQuery = useQuery({
  queryKey: [
    'recommend',
    'regions',
    'administrations',
    state.draft.district?.code,
  ],
  queryFn: () => fetchAdministrations(state.draft.district!.code),
  enabled: state.draft.district !== null,
})
```

선택 자치구 geometry가 있으면 실제 polygon bounds를, 없으면 정적 district
center로 fallback bounds를 만든다.

```ts
const selectedDistrictRecord = districts.find(
  district => String(district.gooCode) === state.draft.district?.code,
)
const selectedDistrictArea = districtAreas.find(
  area => area.areaCode === state.draft.district?.code,
)
const administrationBounds =
  createBounds(normalizeBoundary(selectedDistrictArea?.boundaryCoords ?? [])) ??
  (selectedDistrictRecord
    ? createCenterFallbackBounds(
        selectedDistrictRecord.gooCenter[0],
        selectedDistrictRecord.gooCenter[1],
      )
    : null)

const administrationMapQuery = useQuery({
  queryKey: [
    'recommend',
    'map',
    'administrations',
    state.draft.district?.code,
    administrationBounds,
  ],
  queryFn: () => fetchAdministrationMapAreas(administrationBounds!),
  enabled:
    state.draft.district !== null &&
    administrationBounds !== null &&
    administrationCodes.length > 0,
})
```

행정동 map areas는 `filterAreasByCodes`로 지역 API 코드와 교집합을 만든다.

- [ ] **Step 3: 후보와 명시적 추천 snapshot query 연결**

```ts
const commercialsQuery = useQuery({
  queryKey: [
    'recommend',
    'regions',
    'commercials',
    state.draft.district?.code,
    state.draft.administration?.code,
  ],
  queryFn: () =>
    fetchCommercials(
      state.draft.district!.code,
      state.draft.administration!.code,
    ),
  enabled: state.draft.district !== null && state.draft.administration !== null,
})

const recommendationQuery = useQuery({
  queryKey: [
    'recommend',
    'results',
    state.submitted?.district.code,
    state.submitted?.administration.code,
    state.submitted?.service.code,
    RECOMMENDATION_PERIOD_CODE,
    state.submitted?.commercialCodesKey,
  ],
  queryFn: () =>
    fetchCommercialRecommendations({
      serviceCode: state.submitted!.service.code,
      commercialCodes: state.submitted!.commercialCodes,
      periodCode: RECOMMENDATION_PERIOD_CODE,
      topN: RECOMMENDATION_TOP_N,
    }),
  enabled: state.submitted !== null,
})
```

submit handler는 현재 후보 코드만 reducer에 전달한다.

```ts
const handleSubmit = () => {
  const codes = commercials.map(item => item.commercialCode)
  dispatch({ type: 'submitted', commercialCodes: codes })
}
```

추천 성공 시 API rank 오름차순·코드 중복 제거한 최대 5개를 만든다.

```ts
const results = useMemo(() => {
  if (!recommendationQuery.data || !isApiSuccess(recommendationQuery.data)) {
    return []
  }

  const seen = new Set<string>()
  return [...recommendationQuery.data.dataBody.items]
    .sort((left, right) => left.rank - right.rank)
    .filter(item => {
      if (seen.has(item.commercialCode)) return false
      seen.add(item.commercialCode)
      return true
    })
    .slice(0, RECOMMENDATION_TOP_N)
}, [recommendationQuery.data])
```

같은 응답에서 사용자 선택을 반복 초기화하지 않도록
`recommendationQuery.dataUpdatedAt`을 ref로 기억한다.

```ts
const handledResultAtRef = useRef(0)

useEffect(() => {
  if (
    !recommendationQuery.isSuccess ||
    handledResultAtRef.current === recommendationQuery.dataUpdatedAt
  ) {
    return
  }
  handledResultAtRef.current = recommendationQuery.dataUpdatedAt
  dispatch({
    type: 'resultsLoaded',
    requestKey: state.submitted!.requestKey,
    commercialCode: results[0]?.commercialCode ?? null,
  })
}, [recommendationQuery.dataUpdatedAt, recommendationQuery.isSuccess, results])
```

- [ ] **Step 4: Top 5 프로필을 부분 실패 허용 방식으로 조회**

```ts
const profileQueries = useQueries({
  queries: results.map(result => ({
    queryKey: [
      'recommend',
      'profile',
      result.commercialCode,
      state.submitted?.service.code,
      RECOMMENDATION_PERIOD_CODE,
    ],
    queryFn: () =>
      fetchCommercialProfile(
        result.commercialCode,
        state.submitted!.service.code,
        RECOMMENDATION_PERIOD_CODE,
      ),
    enabled: state.submitted !== null,
  })),
})
```

각 profile query의 성공 data만 수집하고 Task 2의 순수 함수로 geometry를
결합한다.

```ts
const profiles = profileQueries.flatMap(query =>
  query.data && isApiSuccess(query.data) ? [query.data.dataBody] : [],
)

const resultAreas = buildRecommendationMapItems(results, profiles, commercials)
```

boundary가 없으면 `buildRecommendationMapItems`가 `commercials`의 중심으로
순위 마커 fallback을 만든다. 둘 다 없으면 해당 지도 항목만 제외한다. 프로필
오류는 페이지 추천 오류 메시지에 합치지 않는다.

- [ ] **Step 5: 데스크톱 패널·지도와 모바일 바텀시트 조립**

페이지 구조는 다음 DOM 순서를 사용한다.

```tsx
<Page>
  <Stage>
    <RecommendMap
      stage={
        state.view === 'results'
          ? 'results'
          : state.draft.district
            ? 'administration'
            : 'district'
      }
      districtAreas={districtAreas}
      administrationAreas={administrationAreas}
      resultAreas={resultAreas}
      selectedDistrictCode={state.draft.district?.code ?? null}
      selectedAdministrationCode={state.draft.administration?.code ?? null}
      selectedCommercialCode={state.selectedCommercialCode}
      onDistrictSelect={handleMapDistrictSelect}
      onAdministrationSelect={handleMapAdministrationSelect}
      onCommercialSelect={handleResultSelect}
    />
    <DesktopPanelSlot>
      <RecommendPanel {...panelProps} />
    </DesktopPanelSlot>
    <RecommendMobileSheet
      view={state.view}
      snap={state.sheetSnap}
      selectedResult={selectedResult}
      onSnapChange={snap => dispatch({ type: 'sheetSnapChanged', snap })}
    >
      <RecommendPanel {...panelProps} variant="sheet" />
    </RecommendMobileSheet>
  </Stage>
</Page>
```

`Stage`는 사이트 헤더 아래에서 `min-height: calc(100dvh - 72px)`를 사용한다.
데스크톱 패널은 absolute 16~24px inset과 370~400px 너비, 모바일 Stage는
footer 위에서 최소 560px 또는 가용 viewport 높이를 확보한다.

모바일 결과 카드/마커 선택은 reducer의 `resultSelected`로 peek를 만든다.
지도 배경 클릭은 `state.view === 'results'`일 때만
`sheetSnapChanged('peek')`를 dispatch한다. 조건 모드에서는 무시한다.

결과 heading은 `tabIndex={-1}`과 ref를 갖고, 새 추천 응답이 성공했을 때
`focus({ preventScroll: true })`를 한 번 호출한다. 성공 안내에는
`aria-live="polite"`, API 오류에는 `role="alert"`를 사용한다.

- [ ] **Step 6: 오류·빈 상태를 query별로 연결**

각 API는 transport error와 `dataHeader.success === false`를 같은 단계의
feedback으로 정규화한다.

```ts
const administrationsError = administrationsQuery.isError
  ? '행정동 정보를 불러오지 못했습니다.'
  : administrationsQuery.data && !isApiSuccess(administrationsQuery.data)
    ? getApiMessage(
        administrationsQuery.data,
        '행정동 정보를 불러오지 못했습니다.',
      )
    : null
```

빈 상태 문구는 설계서와 동일하게 사용한다.

- 행정동 `[]`: `현재 자치구의 행정동 데이터가 준비되지 않았습니다.`
- 상권 후보 `[]`: `현재 행정동의 추천 대상 상권이 없습니다.`
- 추천 `items: []`: `현재 조건으로 추천 가능한 상권이 없습니다.`
- null 점수: `집계 중`

재시도 버튼은 해당 query의 `refetch`만 호출한다.

- [ ] **Step 7: metadata를 지도형 추천 설명으로 갱신**

```ts
export const metadata: Metadata = createPageMetadata({
  title: '상권 추천',
  description:
    '자치구·행정동·업종을 선택하고 행정동 안의 추천 상권 Top 5를 지도에서 비교합니다.',
  path: '/recommend',
  index: false,
})
```

- [ ] **Step 8: 추천 관련 단위 테스트와 typecheck 실행**

Run:

```bash
pnpm exec vitest run src/lib/recommend src/lib/api/recommend.test.ts \
  src/components/recommend
pnpm typecheck
```

Expected: 추천 테스트가 모두 통과하고 TypeScript 오류가 없다.

- [ ] **Step 9: 승인된 경우 여섯 번째 구현 단위 커밋**

```bash
git add src/components/recommend/recommend-page.tsx \
  app/'(shell)'/recommend/page.tsx
git commit -m "feat: integrate fixed-area recommendation flow"
```

## Task 7: 공통 상권 북마크와 보관함 마이그레이션

**Files:**

- Create: `frontend/src/types/bookmark.ts`
- Modify: `frontend/src/lib/api/user.ts`
- Create: `frontend/src/lib/recommend/recommend-bookmarks.ts`
- Create: `frontend/src/lib/recommend/recommend-bookmarks.test.ts`
- Create: `frontend/src/hooks/use-commercial-bookmarks.ts`
- Modify: `frontend/src/components/recommend/recommend-result-list.tsx`
- Modify: `frontend/src/components/recommend/recommend-page.tsx`
- Modify: `frontend/src/components/profile/profile-recommend-bookmarks-page.tsx`

- [ ] **Step 1: 상권 필터와 bookmarkId 삭제 모델 실패 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import { collectCommercialBookmarks } from './recommend-bookmarks'

describe('collectCommercialBookmarks', () => {
  it('keeps only COMMERCIAL bookmarks and preserves bookmarkId', () => {
    expect(
      collectCommercialBookmarks([
        {
          contents: [
            {
              bookmarkId: 10,
              targetType: 'COMMERCIAL',
              targetCode: '3110008',
              targetName: '강남역 상권',
              createdAt: '2026-07-24T10:00:00Z',
            },
            {
              bookmarkId: 11,
              targetType: 'DISTRICT',
              targetCode: '11680',
              targetName: '강남구',
              createdAt: '2026-07-24T11:00:00Z',
            },
          ],
          hasNext: false,
        },
      ]),
    ).toEqual([
      {
        bookmarkId: 10,
        targetType: 'COMMERCIAL',
        targetCode: '3110008',
        targetName: '강남역 상권',
        createdAt: '2026-07-24T10:00:00Z',
      },
    ])
  })
})
```

- [ ] **Step 2: 모듈 부재로 테스트가 실패하는지 확인**

Run:

```bash
pnpm exec vitest run src/lib/recommend/recommend-bookmarks.test.ts
```

Expected: 대상 모듈이 없어 실패한다.

- [ ] **Step 3: 공통 북마크 타입·API·수집 함수 구현**

`src/types/bookmark.ts`:

```ts
import type { ApiResponse } from '@/types/api'

export type BookmarkTargetType = 'COMMERCIAL' | 'ADMINISTRATION' | 'DISTRICT'

export type MemberBookmark = {
  bookmarkId: number
  targetType: BookmarkTargetType
  targetCode: string
  targetName: string
  createdAt: string
}

export type BookmarkSlice = {
  contents: MemberBookmark[]
  hasNext: boolean
}

export type MemberBookmarksResponse = ApiResponse<{
  bookmarks: BookmarkSlice
}>

export type MemberBookmarkCreateResponse = ApiResponse<MemberBookmark>
```

`src/lib/api/user.ts`에 다음 함수를 추가한다.

```ts
export const fetchMemberBookmarks = async (
  lastBookmarkId?: number,
  size = 50,
) => {
  const params = new URLSearchParams({ size: String(size) })
  if (lastBookmarkId !== undefined) {
    params.set('lastBookmarkId', String(lastBookmarkId))
  }
  const response = await apiClient.get<MemberBookmarksResponse>(
    `/members/me/bookmarks?${params}`,
  )
  return response.data
}

export const addMemberBookmark = async (payload: {
  targetType: BookmarkTargetType
  targetCode: string
  targetName: string
}) => {
  const response = await apiClient.post<MemberBookmarkCreateResponse>(
    '/members/me/bookmarks',
    payload,
  )
  return response.data
}

export const removeMemberBookmark = async (bookmarkId: number) => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/members/me/bookmarks/${bookmarkId}`,
  )
  return response.data
}
```

`collectCommercialBookmarks`는 다음처럼 page의 `contents`를 평탄화한다.

```ts
import type { BookmarkSlice, MemberBookmark } from '@/types/bookmark'

export const collectCommercialBookmarks = (
  slices: readonly BookmarkSlice[],
): MemberBookmark[] =>
  slices
    .flatMap(slice => slice.contents)
    .filter(bookmark => bookmark.targetType === 'COMMERCIAL')
```

- [ ] **Step 4: 추천 결과 북마크 상태와 mutation 연결**

`useCommercialBookmarks`가 로그인 사용자의 cursor page를 가져온다.

```ts
export const useCommercialBookmarks = (enabled: boolean) => {
  const query = useInfiniteQuery({
    queryKey: ['member', 'bookmarks'],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => fetchMemberBookmarks(pageParam),
    getNextPageParam: lastPage => {
      if (!isApiSuccess(lastPage) || !lastPage.dataBody.bookmarks.hasNext) {
        return undefined
      }
      return lastPage.dataBody.bookmarks.contents.at(-1)?.bookmarkId
    },
    enabled,
  })

  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage()
    }
  }, [query.fetchNextPage, query.hasNextPage, query.isFetchingNextPage])

  const slices =
    query.data?.pages.flatMap(page =>
      isApiSuccess(page) ? [page.dataBody.bookmarks] : [],
    ) ?? []

  return {
    ...query,
    commercialBookmarks: collectCommercialBookmarks(slices),
  }
}
```

페이지는 `useCommercialBookmarks(hasHydrated && isLoggedIn)`을 호출한다.
hook은 `hasNextPage`가 있으면 다음 page를 순차 조회해 전체 상권 북마크 set을
만든다.
추가 mutation은 `{ targetType: 'COMMERCIAL', targetCode,
targetName }`, 삭제 mutation은 매칭 항목의 `bookmarkId`를 보낸다. 성공 후
`['member', 'bookmarks']`를 invalidate한다.

비로그인 북마크 클릭은 다음 경로로 이동한다.

```ts
router.push('/login?redirect=%2Frecommend')
```

`RecommendResultList`에는 `isBookmarked`, `isBookmarkPending`,
`onBookmarkToggle`을 추가하고 선택 카드 안에 44×44px 보조 버튼을
렌더링한다.

- [ ] **Step 5: 보관함 추천 페이지를 공통 목록으로 교체**

`ProfileRecommendBookmarksPage`도 `useCommercialBookmarks(true)`를 사용해
`COMMERCIAL`만 표시한다. 새 계약에 없는 자치구·행정동명은 렌더링하지 않는다.

```tsx
<ContentCard key={item.bookmarkId}>
  <CardEyebrow>상권추천 북마크</CardEyebrow>
  <CardTitle>{item.targetName}</CardTitle>
  <CardText>상권 코드 {item.targetCode}</CardText>
  <MetaList>
    <MetaItem>{formatDateTime(item.createdAt)}</MetaItem>
  </MetaList>
</ContentCard>
```

빈 상태와 실패 문구는 기존 profile UI를 유지한다.

- [ ] **Step 6: 북마크 테스트와 추천 패널 회귀 테스트 실행**

Run:

```bash
pnpm exec vitest run \
  src/lib/recommend/recommend-bookmarks.test.ts \
  src/components/recommend/recommend-panel.test.ts
pnpm typecheck
```

Expected: 북마크 필터, 패널 회귀, TypeScript 검사가 통과한다.

- [ ] **Step 7: 승인된 경우 일곱 번째 구현 단위 커밋**

```bash
git add src/types/bookmark.ts src/lib/api/user.ts \
  src/lib/recommend/recommend-bookmarks.ts \
  src/lib/recommend/recommend-bookmarks.test.ts \
  src/hooks/use-commercial-bookmarks.ts \
  src/components/recommend/recommend-result-list.tsx \
  src/components/recommend/recommend-page.tsx \
  src/components/profile/profile-recommend-bookmarks-page.tsx
git commit -m "feat: migrate commercial recommendation bookmarks"
```

## Task 8: 전체 검증과 문서 갱신

**Files:**

- Modify: `frontend/docs/api/recommendation-migration.md`

- [ ] **Step 1: 관련 테스트를 독립 실행**

Run:

```bash
pnpm exec vitest run \
  src/lib/api/recommend.test.ts \
  src/lib/kakao-map.test.ts \
  src/lib/recommend \
  src/components/recommend
```

Expected: 추천 API, reducer, geometry, panel, map, mobile sheet,
bookmark 테스트가 모두 통과한다.

- [ ] **Step 2: 전체 프로젝트 검증 실행**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected:

- Prettier 검사 성공
- ESLint warning 0개
- TypeScript 오류 0개
- 전체 Vitest와 지도 생성 Node 테스트 성공
- Next production build 성공

- [ ] **Step 3: 로컬 브라우저에서 데스크톱 상태 검증**

Run:

```bash
pnpm dev
```

다음 항목을 실제 브라우저에서 확인하고 결과를 작업 기록에 남긴다.

1. `/recommend`가 로그인 없이 열린다.
2. 패널이 370~400px 범위이고 지도 조작 UI와 겹치지 않는다.
3. 자치구 변경 시 행정동과 결과가 초기화되고 업종은 유지된다.
4. 지도 이동·줌이 추천 query를 다시 실행하지 않는다.
5. 조건 → 결과 전환 중 map center와 크기가 튀지 않는다.
6. 결과 카드와 지도 순위 마커가 같은 상권을 선택한다.
7. `선택 범위로 이동`이 행정동 또는 선택 상권으로 돌아간다.
8. SDK key를 임시로 비운 환경에서 패널은 계속 작동하고 지도 오류가 보인다.
9. dev 빈 배열 응답에서 승인된 지역/추천 빈 상태 문구가 보인다.

- [ ] **Step 4: 모바일과 접근성 검증**

375px, 768px, 1024px 경계에서 다음을 확인한다.

1. 조건 입력 시 시트가 expanded이고 지도 배경 클릭으로 내려가지 않는다.
2. 추천 성공 직후 결과 목록이 expanded다.
3. 카드/마커 선택 후 peek에 순위·상권명·점수가 남는다.
4. 핸들 click/drag로 expanded와 peek가 전환된다.
5. peek 상태에서 선택 polygon과 rank marker가 충분히 보인다.
6. safe-area, 소프트 키보드, 200% 확대에서 action이 가려지지 않는다.
7. Tab으로 세 조건, 추천 버튼, 결과 카드, 북마크, 지도 순위 마커를 이동한다.
8. reduced-motion에서 패널과 시트 전환 animation이 제거된다.
9. 브라우저 console error가 없다.

- [ ] **Step 5: API 마이그레이션 문서에 실제 결과 기록**

`docs/api/recommendation-migration.md`의 `프런트 구현 범위`를 완료 항목으로
갱신하고 다음 검증 표를 추가한다.

```md
## 프런트 구현 검증

| 항목               | 결과      | 비고                           |
| ------------------ | --------- | ------------------------------ |
| 추천 API 직렬화    | 통과/실패 | 반복 `commercialCodes` 확인    |
| 데스크톱 지도·패널 | 통과/실패 | 로컬 브라우저                  |
| 모바일 바텀시트    | 통과/실패 | 375px, 768px                   |
| 비로그인 추천      | 통과/실패 | 인증 gate 없음                 |
| 상권 북마크        | 통과/실패 | 로그인 환경                    |
| 실데이터 Top 5 E2E | 확인 필요 | dev 지역·지도 데이터 적재 대기 |
```

실행하지 못한 검사는 `확인 필요`로 기록하고 통과로 추정하지 않는다.

- [ ] **Step 6: 변경 범위와 금지 파일 확인**

Run:

```bash
git status --short
git diff --check
git diff -- package.json pnpm-lock.yaml next.config.ts
```

Expected:

- whitespace 오류 없음
- `package.json`, `pnpm-lock.yaml`, Next build config 변경 없음
- 백엔드 파일 변경 없음

- [ ] **Step 7: 승인된 경우 최종 문서 커밋**

```bash
git add docs/api/recommendation-migration.md
git commit -m "docs: record recommendation migration verification"
```

## 구현 완료 후 사용자 전달 내용

- 변경한 추천 화면과 북마크 동작 요약
- 자동 검사별 실제 통과·실패 결과
- 데스크톱·모바일 수동 검증 결과
- dev 지역·지도 빈 데이터로 아직 검증하지 못한 항목
- 백엔드와 lockfile을 변경하지 않았다는 확인
- 커밋하지 않았다면 권장 Conventional Commit 메시지:
  `feat: migrate fixed-area commercial recommendations`
