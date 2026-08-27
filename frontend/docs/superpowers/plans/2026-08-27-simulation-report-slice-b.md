# 창업 시뮬레이션 슬라이스 B 실행 계획 — 상세 리포트 · 저장/이력 · A/B 비교

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` (권장) 또는
> `superpowers:executing-plans` 로 태스크 단위 실행. 스텝은 체크박스(`- [ ]`)로 추적한다.

**Goal:** V2 계약이 실제로 주는 값(총 창업 비용·비용 구성·권리금·유사 프랜차이즈·성별연령·성수기)을
상세 리포트 화면으로 렌더하고, 로그인 사용자가 결과를 저장·재조회하며, 두 조건을 나란히 비교할 수 있게 한다.

**Architecture:** 조건은 **URL 쿼리스트링이 정본**이다. 리포트/비교 화면은 마운트 시 쿼리스트링을
`SimulationReportRequest` 로 복원해 `POST /simulations/reports` 를 **React Query `useQuery`** 로 호출한다
(POST 지만 화면 입장에서는 조건으로 키가 정해지는 읽기다 — 새로고침·뒤로가기가 그대로 복원돼야 한다).
입력 화면은 계산 성공 시 같은 키로 **쿼리 캐시를 미리 채워** 리포트 화면 진입이 재호출 없이 즉시 그려지게 한다.
표시 로직(단위 환산·범위 라벨·기준 분기 문구)은 전부 **순수 모듈**로 빼서 `renderToStaticMarkup` 없이도 검증한다.

**Tech Stack:** Next.js App Router · TypeScript · styled-components · React Query v5 · recharts · vitest(node 환경 + `renderToStaticMarkup`)

**Spec:**
- 정본 세부 명세: `frontend/docs/features/simulation/simulation-report.md` (D0~D8)
- 공통 명세: `frontend/docs/features/simulation/simulation.md`
- 디자인 정본: `frontend/DESIGN.md` §5.3 S-SIM-1 ~ S-SIM-3
- 계약 정본: `backend/docs/simulation-frontend-guide.md` · Swagger `commercial-service/v3/api-docs`

---

## Global Constraints

플랜 전체에 걸리는 제약이다. **모든 태스크의 요구사항에 암묵적으로 포함된다.**

| # | 제약 | 근거 |
| --- | --- | --- |
| G1 | **금액은 전부 만원 단위**다. 표기는 `formatLargeWon`(`@/lib/format`, **만원 입력**). `@/lib/status/status-formatters` 는 **원 입력**이라 바꿔 쓰면 정확히 10,000배 틀린다. | D6 "금액 단위" |
| G2 | `dataBaseYear` 안내문(`{연도}년 기준 데이터로 계산된 결과입니다.`)은 **필수 노출**. 항상 응답의 `dataBaseYear` 를 쓴다 (상수 `SIMULATION_SEED_BASE_YEAR` 아님). | D2 #6, D6 |
| G3 | `genderAgeAnalysis` / `seasonAnalysis` 가 `null` 인 것은 **200 성공 응답 안의 결측**이다. 오류 UI·재시도 버튼을 띄우지 말고 `@/lib/simulation/report-sections` 판정으로 **해당 섹션만 숨긴다**. | D2 #7, D6 |
| G4 | `costDetail.levy` 는 `null`(비프랜차이즈 → 항목 숨김)과 `0`(부담금 0원 → **표기**)을 구분한다. `!levy` falsy 검사 금지. | D2 #9, D6 |
| G5 | `keyMoney` 는 **총비용에 포함되지 않는다.** 반드시 `참고` 배지와 함께 총비용과 분리해 표기한다. | D2 #8 |
| G6 | `topAgeGroups[].salesAmount` 는 **자치구×업종 전체 분기 매출**이다(원천 `sales_district`). ① 범위 라벨(`{자치구} {업종} 전체 기준`)을 제목·축에 붙이고 ② **억 단위로 축약**한다. | D2 #13, D4-3-1 |
| G7 | 오류 분기는 `@/lib/api/api-error` 의 `kind` 로만 한다. **화면이 HTTP 상태를 직접 비교하지 않는다.** 재시도 버튼 노출은 `isRetryable(kind)` 하나가 결정한다(404 = 버튼 없음). | D5 "오류 → 화면 분기" |
| G8 | `periodCode` 를 **입력으로 노출하지 않는다.** 리포트에는 `condition.periodCode` 로 기준 분기만 표기한다. | D8-1 #2 |
| G9 | `floorType` 은 요청=enum 문자열(`'FIRST_FLOOR' \| 'OTHER'`), 응답=`{code,name,description}` 객체다. 응답 객체를 그대로 재요청에 넣지 않는다. | D6 |
| G10 | 비교는 **부분 성공 금지**. 한쪽 실패 시 전체 실패로 처리하고 오류 UI를 **하나만** 띄운다. | D2 #10, D5 |
| G11 | 임의 색상·radius·shadow·spacing 토큰 추가 금지. `DESIGN.md` 의 CSS 변수만 쓴다. | `frontend/CLAUDE.md` 금지사항 |
| G12 | 완료 보고 전 `pnpm qa:verify`(= `format:check && lint && typecheck && build`)와 `pnpm test` 를 **실제로 실행**한다. 미실행 명령을 통과했다고 보고하지 않는다. | `frontend/CLAUDE.md` |
| G13 | 이력 **삭제 UI를 만들지 않는다**(삭제 API 없음). 시뮬레이션 **공유 CTA를 그리지 않는다**(`ShareTargetType` 에 상수 없음). | D4-4, S-SIM-4 |
| G14 | 테스트는 저장소 관용구를 따른다 — jsdom/testing-library 없이 **node 환경 + `renderToStaticMarkup` 문자열 assertion**, 또는 순수 함수 단위 테스트. | `simulation-result-preview.test.ts` |

---

## PR 분할

3개를 **순차**로 올린다. 각 PR의 base 는 **항상 `develop`** 이다 (스택 PR base 사고 재발 방지 — 인계 문서의 결정).

| PR | 브랜치 | 범위 | 선행 |
| --- | --- | --- | --- |
| **B1** | `feature/fe/simulation-report` | 조건 URL 코덱 · 리포트 표시 로직 · 상세 리포트 화면 6섹션 · 라우트 4개 중 `report` 2개 교체 · 입력 화면에서 리포트로 잇기 | 없음 |
| **B2** | `feature/fe/simulation-history` | 저장 CTA(비로그인 로그인 유도) · 이력 목록(`/profile/bookmarks/simulation`) · 이력 → 리포트 재조회 | B1 머지 |
| **B3** | `feature/fe/simulation-compare` | 컴팩트 조건 편집기 · A/B 비교 화면 · 라우트 `compare` 2개 교체 · 리포트의 `비교에 추가` 활성 | B1 머지 (B2 무관) |

**PR 간 인터페이스** (B2·B3 가 B1에 의존하는 지점):

- `@/lib/simulation/report-route` → `toSimulationReportSearchParams(request, prefix?)`, `parseSimulationReportRequest(params, prefix?)`, `buildSimulationReportHref(request, variant)`
- `@/lib/simulation/report-query` → `simulationReportQueryKey(request)`
- `@/components/simulation/report/simulation-report-view` → `<SimulationReportView report actions? />` (`actions` 는 헤드라인 카드 하단 CTA 슬롯. B1 에서는 항상 `undefined`)
- `@/lib/simulation/report-presentation` → `toCostBreakdown`, `describeSimulationPeriod`, `formatSalesAmountCompact`

---

# PR B1 — 상세 리포트

## File Structure (B1)

| 파일 | 책임 |
| --- | --- |
| `src/lib/simulation/report-route.ts` (신규) | 조건 ↔ 쿼리스트링. 접두사(`a.`/`b.`)를 받아 비교 화면도 같은 코덱을 쓴다 |
| `src/lib/simulation/report-route.test.ts` (신규) | 왕복 변환·검증 실패 시 null |
| `src/lib/simulation/report-query.ts` (신규) | `simulationReportQueryKey` — 입력 화면과 리포트 화면이 **같은 캐시 키**를 쓰게 하는 유일한 출처 |
| `src/lib/simulation/report-presentation.ts` (신규) | 비용 구성 행, 기준 분기 문구, 집계 범위 라벨, 억 단위 축약, 연령 막대 행, 성수기 월 문구 |
| `src/lib/simulation/report-presentation.test.ts` (신규) | G1·G4·G6·G8 를 순수 함수 단위로 고정 |
| `src/components/simulation/report/simulation-report-summary.tsx` (신규) | 헤드라인 총비용 + 조건 요약 + 기준 연도 안내 + CTA 슬롯 |
| `src/components/simulation/report/simulation-cost-breakdown.tsx` (신규) | 비용 구성 도넛 + 표 |
| `src/components/simulation/report/simulation-key-money-card.tsx` (신규) | 권리금 3지표 + `참고` 배지 |
| `src/components/simulation/report/simulation-similar-franchisees.tsx` (신규) | 유사 예산 Top 5 표 (모바일 가로 스크롤) |
| `src/components/simulation/report/simulation-customer-insight.tsx` (신규) | 성별 도넛 + 연령 Top3 막대 + 범위 라벨 + 기준 분기 |
| `src/components/simulation/report/simulation-season-card.tsx` (신규) | 성수기/비성수기 월 배지 + 기준 분기 |
| `src/components/simulation/report/simulation-report-view.tsx` (신규) | 위 6개를 조립하는 **순수 표시** 컴포넌트 |
| `src/components/simulation/report/simulation-report-view.test.ts` (신규) | 섹션 숨김·범위 라벨·권리금 분리 |
| `src/components/simulation/report/simulation-report-page.tsx` (신규) | URL 파싱 → `useQuery` → 로딩/오류/결과 분기 (**유일한 네트워크 소유자**) |
| `app/(shell)/simulation/report/page.tsx` (수정) | placeholder 제거 |
| `app/(shell)/analysis/simulation/report/page.tsx` (수정) | placeholder 제거 |
| `src/components/simulation/simulation-result-preview.tsx` (수정) | `준비 중` 블록 → `상세 리포트 보기` 링크 |
| `src/components/simulation/simulation-result-preview.test.ts` (수정) | 위 변경 반영 |
| `src/components/simulation/simulation-summary-bar.tsx` (수정) | 계산 후 `자세히` 를 리포트 링크로 |
| `src/components/simulation/simulation-builder-page.tsx` (수정) | 계산 성공 시 쿼리 캐시 시딩 + 리포트 href 전달 |

---

### Task 1: 조건 ↔ URL 코덱

**Files:**
- Create: `frontend/src/lib/simulation/report-route.ts`
- Test: `frontend/src/lib/simulation/report-route.test.ts`

**Interfaces:**
- Consumes: `createSimulationConditionState` / `isSimulationConditionsComplete` / `toSimulationReportRequest` (`@/lib/simulation/conditions`)
- Produces:
  - `toSimulationReportSearchParams(request: SimulationReportRequest, prefix?: string): URLSearchParams`
  - `parseSimulationReportRequest(params: { get(name: string): string | null }, prefix?: string): SimulationReportRequest | null`
  - `buildSimulationReportHref(request: SimulationReportRequest, variant?: 'standalone' | 'analysis'): string`
  - `simulationBuilderHref(variant?: 'standalone' | 'analysis'): string`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`frontend/src/lib/simulation/report-route.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  buildSimulationReportHref,
  parseSimulationReportRequest,
  simulationBuilderHref,
  toSimulationReportSearchParams,
} from '@/lib/simulation/report-route'
import type { SimulationReportRequest } from '@/types/simulation'

const personal: SimulationReportRequest = {
  franchisee: false,
  districtCode: '11740',
  serviceCode: 'CS100001',
  storeSize: 66,
  floorType: 'FIRST_FLOOR',
}

const franchise: SimulationReportRequest = {
  franchisee: true,
  franchiseeId: 101,
  districtCode: '11680',
  serviceCode: 'CS100008',
  storeSize: 40,
  floorType: 'OTHER',
}

describe('toSimulationReportSearchParams', () => {
  it('비프랜차이즈면 franchiseeId 키를 싣지 않는다', () => {
    const params = toSimulationReportSearchParams(personal)

    expect(params.get('franchisee')).toBe('false')
    expect(params.has('franchiseeId')).toBe(false)
    expect(params.get('districtCode')).toBe('11740')
    expect(params.get('storeSize')).toBe('66')
    expect(params.get('floorType')).toBe('FIRST_FLOOR')
  })

  it('접두사를 붙이면 모든 키에 붙는다', () => {
    const params = toSimulationReportSearchParams(franchise, 'a.')

    expect(params.get('a.franchisee')).toBe('true')
    expect(params.get('a.franchiseeId')).toBe('101')
    expect(params.has('franchisee')).toBe(false)
  })
})

describe('parseSimulationReportRequest', () => {
  it('왕복 변환이 요청 본문을 그대로 복원한다', () => {
    expect(
      parseSimulationReportRequest(toSimulationReportSearchParams(personal)),
    ).toEqual(personal)
    expect(
      parseSimulationReportRequest(
        toSimulationReportSearchParams(franchise, 'b.'),
        'b.',
      ),
    ).toEqual(franchise)
  })

  it('조건이 하나라도 비면 null 이다', () => {
    const params = toSimulationReportSearchParams(personal)
    params.delete('floorType')

    expect(parseSimulationReportRequest(params)).toBeNull()
  })

  it('지원하지 않는 자치구·업종·층 값은 null 로 떨어뜨린다', () => {
    const bad = new URLSearchParams({
      franchisee: 'false',
      districtCode: '99999',
      serviceCode: 'CS100001',
      storeSize: '66',
      floorType: 'FIRST_FLOOR',
    })
    expect(parseSimulationReportRequest(bad)).toBeNull()

    const badFloor = toSimulationReportSearchParams(personal)
    badFloor.set('floorType', 'BASEMENT')
    expect(parseSimulationReportRequest(badFloor)).toBeNull()
  })

  it('프랜차이즈인데 franchiseeId 가 없으면 null 이다', () => {
    const params = toSimulationReportSearchParams(franchise)
    params.delete('franchiseeId')

    expect(parseSimulationReportRequest(params)).toBeNull()
  })

  it('storeSize 가 0 이하·숫자 아님이면 null 이다', () => {
    for (const value of ['0', '-3', 'abc', '']) {
      const params = toSimulationReportSearchParams(personal)
      params.set('storeSize', value)
      expect(parseSimulationReportRequest(params)).toBeNull()
    }
  })
})

describe('href 빌더', () => {
  it('variant 에 따라 경로가 갈린다', () => {
    expect(buildSimulationReportHref(personal)).toBe(
      `/simulation/report?${toSimulationReportSearchParams(personal)}`,
    )
    expect(buildSimulationReportHref(personal, 'analysis')).toBe(
      `/analysis/simulation/report?${toSimulationReportSearchParams(personal)}`,
    )
    expect(simulationBuilderHref()).toBe('/simulation')
    expect(simulationBuilderHref('analysis')).toBe('/analysis/simulation')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

```bash
pnpm vitest run src/lib/simulation/report-route.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/simulation/report-route"`

- [ ] **Step 3: 최소 구현**

`frontend/src/lib/simulation/report-route.ts`:

```ts
/**
 * 리포트·비교 화면의 **조건 ↔ 쿼리스트링** 변환.
 *
 * 조건의 정본을 URL 에 두는 이유: 리포트는 `POST` 로 계산하지만 화면 입장에서는
 * "이 조건의 결과"라는 **읽기**다. 클라이언트 메모리에 조건을 들고 있으면 새로고침·뒤로가기·
 * 링크 공유에서 화면이 빈다. (지도 셸이 카메라를 URL 에 담은 것과 같은 이유다.)
 *
 * 검증은 **직접 하지 않고** `conditions.ts` 의 판정을 재사용한다 — 화면과 URL 이 서로 다른
 * "유효한 조건"을 갖게 되는 순간 사용자가 고르지도 않은 조건으로 404 가 난다.
 *
 * `prefix` 는 비교 화면(`a.` / `b.`)용이다. 좌우가 같은 코덱을 쓰게 해서 한쪽만 규칙이
 * 어긋나는 사고를 없앤다.
 */

import {
  createSimulationConditionState,
  isSimulationConditionsComplete,
  toSimulationReportRequest,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'
import type {
  SimulationFloorType,
  SimulationReportRequest,
} from '@/types/simulation'

type SearchParamsReader = { get(name: string): string | null }

export type SimulationReportVariant = 'standalone' | 'analysis'

/** 입력 화면 경로. 리포트에서 "조건 다시 고르기"로 돌아갈 때 쓴다. */
export const simulationBuilderHref = (
  variant: SimulationReportVariant = 'standalone',
): string => (variant === 'analysis' ? '/analysis/simulation' : '/simulation')

const REPORT_PATH: Record<SimulationReportVariant, string> = {
  standalone: '/simulation/report',
  analysis: '/analysis/simulation/report',
}

export const toSimulationReportSearchParams = (
  request: SimulationReportRequest,
  prefix = '',
): URLSearchParams => {
  const params = new URLSearchParams()
  const key = (name: string) => `${prefix}${name}`

  params.set(key('franchisee'), request.franchisee ? 'true' : 'false')
  if (request.franchiseeId !== null && request.franchiseeId !== undefined) {
    params.set(key('franchiseeId'), String(request.franchiseeId))
  }
  params.set(key('districtCode'), request.districtCode)
  params.set(key('serviceCode'), request.serviceCode)
  params.set(key('storeSize'), String(request.storeSize))
  params.set(key('floorType'), request.floorType)

  return params
}

const readInteger = (raw: string | null): number | null => {
  if (raw === null || !/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : null
}

/**
 * 쿼리스트링 → 요청 본문. **조건이 하나라도 유효하지 않으면 null.**
 *
 * null 을 오류로 취급하지 않는다 — 화면은 "조건이 없어요 + 조건 고르러 가기"를 보여준다.
 * 손상된 링크에 대고 400 을 받아오는 것보다 낫다.
 */
export const parseSimulationReportRequest = (
  params: SearchParamsReader,
  prefix = '',
): SimulationReportRequest | null => {
  const read = (name: string): string | null => {
    const value = params.get(`${prefix}${name}`)?.trim()
    return value ? value : null
  }

  const franchiseeRaw = read('franchisee')
  const franchisee =
    franchiseeRaw === 'true' ? true : franchiseeRaw === 'false' ? false : null

  const floorRaw = read('floorType')
  const floorType: SimulationFloorType | null =
    floorRaw === 'FIRST_FLOOR' || floorRaw === 'OTHER' ? floorRaw : null

  // createSimulationConditionState 가 자치구·업종·크기·층을 검증해 지원하지 않는 값을 버린다.
  const base = createSimulationConditionState({
    franchisee,
    districtCode: read('districtCode'),
    serviceCode: read('serviceCode'),
    storeSize: readInteger(read('storeSize')),
    floorType,
  })

  // franchiseeId 는 createSimulationConditionState 가 다루지 않는다(브랜드는 검색 결과로만 정해지므로).
  const franchiseeId = readInteger(read('franchiseeId'))
  const state: SimulationConditionState =
    franchiseeId !== null ? { ...base, franchiseeId } : base

  // 프랜차이즈인데 브랜드가 없으면 여기서 걸린다 — isSimulationSectionComplete('service') 가 본다.
  if (!isSimulationConditionsComplete(state)) return null

  return toSimulationReportRequest(state)
}

export const buildSimulationReportHref = (
  request: SimulationReportRequest,
  variant: SimulationReportVariant = 'standalone',
): string =>
  `${REPORT_PATH[variant]}?${toSimulationReportSearchParams(request)}`
```

- [ ] **Step 4: 통과를 확인한다**

```bash
pnpm vitest run src/lib/simulation/report-route.test.ts
```

Expected: PASS (11 tests)

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/simulation/report-route.ts frontend/src/lib/simulation/report-route.test.ts
git commit -m "[FE] feat: 시뮬레이션 조건을 쿼리스트링으로 왕복하는 코덱을 만든다"
```

---

### Task 2: 리포트 표시 로직 (순수 모듈)

**Files:**
- Create: `frontend/src/lib/simulation/report-presentation.ts`
- Create: `frontend/src/lib/simulation/report-query.ts`
- Test: `frontend/src/lib/simulation/report-presentation.test.ts`

**Interfaces:**
- Consumes: `SimulationReport` 계열 타입, `formatLargeWon`(`@/lib/format`), `AnalysisMetricRow`(`@/lib/analysis/presentation`), `GenderSegment`(`@/lib/analysis/chart-data`)
- Produces:
  - `toCostBreakdown(report: SimulationReport): CostBreakdownRow[]` — `CostBreakdownRow = { key: string; label: string; amount: number }`
  - `describeSimulationPeriod(periodCode: string): string`
  - `describeAgeSalesScope(condition: SimulationCondition): string`
  - `formatSalesAmountCompact(amountInManwon: number): string`
  - `toAgeSalesRows(analysis: SimulationGenderAgeAnalysis): AnalysisMetricRow[]`
  - `toGenderSalesSegments(analysis: SimulationGenderAgeAnalysis): GenderSegment[]`
  - `describeSeasonMonths(months: readonly number[]): string`
  - `simulationReportQueryKey(request: SimulationReportRequest): readonly unknown[]`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`frontend/src/lib/simulation/report-presentation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  describeAgeSalesScope,
  describeSeasonMonths,
  describeSimulationPeriod,
  formatSalesAmountCompact,
  toAgeSalesRows,
  toCostBreakdown,
  toGenderSalesSegments,
} from '@/lib/simulation/report-presentation'
import { simulationReportQueryKey } from '@/lib/simulation/report-query'
import type {
  SimulationCondition,
  SimulationReport,
} from '@/types/simulation'

const condition: SimulationCondition = {
  franchisee: false,
  franchiseeId: null,
  brandName: null,
  districtCode: '11740',
  districtName: '강동구',
  serviceCode: 'CS100001',
  serviceName: '한식음식점',
  storeSize: 66,
  floorType: { code: 'FIRST_FLOOR', name: '1층', description: '1층 점포' },
  periodCode: '20233',
}

const report = (overrides: Partial<SimulationReport> = {}): SimulationReport => ({
  condition,
  dataBaseYear: '2024',
  totalPrice: 23_450,
  keyMoney: { keyMoneyRatio: 62, keyMoneyAverage: 4_200, keyMoneyLevel: 63 },
  costDetail: { rentPrice: 300, deposit: 3_000, interior: 5_000, levy: null },
  similarFranchisees: [],
  genderAgeAnalysis: null,
  seasonAnalysis: null,
  ...overrides,
})

describe('toCostBreakdown', () => {
  it('비프랜차이즈면 가맹 부담금 항목이 없다', () => {
    const rows = toCostBreakdown(report())

    expect(rows.map(row => row.key)).toEqual(['rentPrice', 'deposit', 'interior'])
    expect(rows.map(row => row.label)).toEqual(['월 임대료', '보증금', '인테리어'])
  })

  it('levy 가 0 이면 항목을 남긴다 — 0 은 "부담금 0원"이지 결측이 아니다', () => {
    const rows = toCostBreakdown(
      report({ costDetail: { rentPrice: 300, deposit: 3_000, interior: 5_000, levy: 0 } }),
    )

    expect(rows.map(row => row.key)).toContain('levy')
    expect(rows.find(row => row.key === 'levy')?.amount).toBe(0)
  })

  it('levy 가 있으면 마지막 항목으로 붙는다', () => {
    const rows = toCostBreakdown(
      report({ costDetail: { rentPrice: 300, deposit: 3_000, interior: 5_000, levy: 1_200 } }),
    )

    expect(rows.at(-1)).toEqual({ key: 'levy', label: '가맹 부담금', amount: 1_200 })
  })
})

describe('describeSimulationPeriod', () => {
  it('yyyyQ 를 "N년 M분기 기준"으로 옮긴다', () => {
    expect(describeSimulationPeriod('20233')).toBe('2023년 3분기 기준')
    expect(describeSimulationPeriod('20241')).toBe('2024년 1분기 기준')
  })

  it('형식이 다르면 빈 문자열이다 — 없는 기준을 지어내지 않는다', () => {
    expect(describeSimulationPeriod('2023')).toBe('')
    expect(describeSimulationPeriod('')).toBe('')
  })
})

describe('formatSalesAmountCompact', () => {
  it('만원 입력을 억 단위로 축약한다', () => {
    // 2,733,782만원 = 273억원. 축에 그대로 얹으면 읽히지 않는다.
    expect(formatSalesAmountCompact(2_733_782)).toBe('273억원')
    expect(formatSalesAmountCompact(10_000)).toBe('1억원')
  })

  it('1억 미만은 만원으로 둔다', () => {
    expect(formatSalesAmountCompact(9_999)).toBe('9,999만원')
    expect(formatSalesAmountCompact(0)).toBe('0만원')
  })
})

describe('describeAgeSalesScope', () => {
  it('집계 범위가 사용자 점포가 아님을 드러낸다', () => {
    expect(describeAgeSalesScope(condition)).toBe('강동구 한식음식점 전체 기준')
  })
})

describe('toAgeSalesRows / toGenderSalesSegments', () => {
  it('연령 Top3 를 막대 행으로 옮긴다', () => {
    expect(
      toAgeSalesRows({
        malePercent: 54,
        femalePercent: 46,
        topAgeGroups: [
          { ageGroupName: '50대', salesAmount: 2_733_782 },
          { ageGroupName: '40대', salesAmount: 1_900_000 },
        ],
      }),
    ).toEqual([
      { label: '50대', value: 2_733_782 },
      { label: '40대', value: 1_900_000 },
    ])
  })

  it('성별 비중을 도넛 조각으로 옮긴다', () => {
    expect(
      toGenderSalesSegments({ malePercent: 54, femalePercent: 46, topAgeGroups: [] }),
    ).toEqual([
      { label: '남성', value: 54 },
      { label: '여성', value: 46 },
    ])
  })
})

describe('describeSeasonMonths', () => {
  it('월 배열을 사람이 읽는 한 줄로 만든다', () => {
    expect(describeSeasonMonths([3, 7, 12])).toBe('3월 · 7월 · 12월')
    expect(describeSeasonMonths([])).toBe('')
  })
})

describe('simulationReportQueryKey', () => {
  it('같은 조건이면 같은 키다 — 입력 화면이 채운 캐시를 리포트 화면이 그대로 쓴다', () => {
    const request = {
      franchisee: false as const,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR' as const,
    }

    expect(simulationReportQueryKey(request)).toEqual(
      simulationReportQueryKey({ ...request }),
    )
  })

  it('조건이 다르면 키가 다르다', () => {
    const base = {
      franchisee: false as const,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR' as const,
    }

    expect(simulationReportQueryKey(base)).not.toEqual(
      simulationReportQueryKey({ ...base, storeSize: 99 }),
    )
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

```bash
pnpm vitest run src/lib/simulation/report-presentation.test.ts
```

Expected: FAIL — 두 모듈 모두 resolve 실패

- [ ] **Step 3: 최소 구현**

`frontend/src/lib/simulation/report-query.ts`:

```ts
/**
 * 리포트 계산의 **React Query 캐시 키**.
 *
 * 별도 모듈인 이유: 입력 화면(`useMutation` 성공 시 캐시 시딩)과 리포트 화면(`useQuery`)이
 * 반드시 **같은 키**를 만들어야 재호출 없이 이어진다. 키 만드는 코드가 두 벌이 되는 순간
 * 리포트 화면이 이미 계산된 결과를 두고 다시 POST 한다.
 */

import { toSimulationReportSearchParams } from '@/lib/simulation/report-route'
import type { SimulationReportRequest } from '@/types/simulation'

export const SIMULATION_REPORT_QUERY_SCOPE = 'simulation-report'

/**
 * 조건을 정렬된 쿼리스트링 문자열 하나로 눌러 키를 만든다.
 * 객체를 그대로 키에 넣으면 `franchiseeId` 키의 유무(undefined vs 없음)로 키가 갈릴 수 있다.
 */
export const simulationReportQueryKey = (
  request: SimulationReportRequest,
): readonly unknown[] => {
  const params = toSimulationReportSearchParams(request)
  params.sort()
  return [SIMULATION_REPORT_QUERY_SCOPE, params.toString()]
}
```

`frontend/src/lib/simulation/report-presentation.ts`:

```ts
/**
 * 리포트 화면의 **표시 로직**. 네트워크도 React도 모른다.
 *
 * 컴포넌트에서 빼낸 이유는 두 가지다.
 * 1. 이 화면의 오독 위험(단위·집계 범위)은 전부 **문자열을 만드는 지점**에 있다. 순수 함수로
 *    두면 renderToStaticMarkup 없이 값 자체를 고정할 수 있다.
 * 2. 비교 화면이 같은 규칙으로 좌우를 그려야 한다 — 두 화면이 같은 값을 다르게 표기하면
 *    어느 쪽이 맞는지 사용자가 알 수 없다.
 */

import type { GenderSegment } from '@/lib/analysis/chart-data'
import type { AnalysisMetricRow } from '@/lib/analysis/presentation'
import type {
  SimulationCondition,
  SimulationGenderAgeAnalysis,
  SimulationReport,
} from '@/types/simulation'

export type CostBreakdownRow = {
  key: 'rentPrice' | 'deposit' | 'interior' | 'levy'
  label: string
  /** 만원 */
  amount: number
}

/**
 * 비용 구성 행.
 *
 * `levy` 는 **null 이면 항목째 빼고 0 이면 남긴다.** 비프랜차이즈의 "해당 없음"과
 * 프랜차이즈의 "부담금 0원"은 다른 사실이고, falsy 검사로 묶으면 0원이 사라진다.
 */
export const toCostBreakdown = (
  report: SimulationReport,
): CostBreakdownRow[] => {
  const { rentPrice, deposit, interior, levy } = report.costDetail

  const rows: CostBreakdownRow[] = [
    { key: 'rentPrice', label: '월 임대료', amount: rentPrice },
    { key: 'deposit', label: '보증금', amount: deposit },
    { key: 'interior', label: '인테리어', amount: interior },
  ]

  if (levy !== null && levy !== undefined) {
    rows.push({ key: 'levy', label: '가맹 부담금', amount: levy })
  }

  return rows
}

/**
 * `yyyyQ` → `2023년 3분기 기준`.
 * 형식이 어긋나면 **빈 문자열**을 준다 — 없는 기준 분기를 지어내는 것보다 표기를 생략하는 편이 낫다.
 */
export const describeSimulationPeriod = (periodCode: string): string => {
  if (!/^\d{4}[1-4]$/.test(periodCode)) return ''
  return `${periodCode.slice(0, 4)}년 ${periodCode.slice(4)}분기 기준`
}

/**
 * 집계 범위 라벨. **이 문구가 빠지면 사용자가 273억원을 자기 점포 예상 매출로 읽는다.**
 * (원천이 `sales_district` 라 자치구×업종 전체 분기 매출이다.)
 */
export const describeAgeSalesScope = (
  condition: SimulationCondition,
): string => `${condition.districtName} ${condition.serviceName} 전체 기준`

/**
 * 만원 입력을 축·배지에 얹을 수 있게 **억 단위로 축약**한다.
 * `formatLargeWon`(= `273억 3,782만원`)은 본문용이고, 축에는 이 짧은 쪽을 쓴다.
 */
export const formatSalesAmountCompact = (amountInManwon: number): string => {
  if (amountInManwon >= 10_000) {
    return `${Math.floor(amountInManwon / 10_000).toLocaleString()}억원`
  }
  return `${amountInManwon.toLocaleString()}만원`
}

export const toAgeSalesRows = (
  analysis: SimulationGenderAgeAnalysis,
): AnalysisMetricRow[] =>
  analysis.topAgeGroups.map(item => ({
    label: item.ageGroupName,
    value: item.salesAmount,
  }))

export const toGenderSalesSegments = (
  analysis: SimulationGenderAgeAnalysis,
): GenderSegment[] => [
  { label: '남성', value: analysis.malePercent },
  { label: '여성', value: analysis.femalePercent },
]

/** `[3,7,12]` → `3월 · 7월 · 12월`. 비면 빈 문자열. */
export const describeSeasonMonths = (months: readonly number[]): string =>
  months.map(month => `${month}월`).join(' · ')
```

- [ ] **Step 4: 통과를 확인한다**

```bash
pnpm vitest run src/lib/simulation/report-presentation.test.ts
```

Expected: PASS (14 tests)

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/simulation/report-presentation.ts frontend/src/lib/simulation/report-query.ts frontend/src/lib/simulation/report-presentation.test.ts
git commit -m "[FE] feat: 리포트 표시 로직과 계산 캐시 키를 순수 모듈로 분리한다"
```

---

### Task 3: 리포트 섹션 컴포넌트 6종

**Files:**
- Create: `frontend/src/components/simulation/report/simulation-report-summary.tsx`
- Create: `frontend/src/components/simulation/report/simulation-cost-breakdown.tsx`
- Create: `frontend/src/components/simulation/report/simulation-key-money-card.tsx`
- Create: `frontend/src/components/simulation/report/simulation-similar-franchisees.tsx`
- Create: `frontend/src/components/simulation/report/simulation-customer-insight.tsx`
- Create: `frontend/src/components/simulation/report/simulation-season-card.tsx`

**Interfaces:**
- Consumes: Task 2 의 `toCostBreakdown` / `describeSimulationPeriod` / `describeAgeSalesScope` / `formatSalesAmountCompact` / `toAgeSalesRows` / `toGenderSalesSegments` / `describeSeasonMonths`, `formatDataBaseYearNotice`(`@/lib/simulation/report-sections`), `formatLargeWon`(`@/lib/format`), `Badge`(`@/components/ui/badge`), `DonutChart`(`@/components/analysis/charts/donut-chart`), `HorizontalBarChart`(`@/components/analysis/charts/horizontal-bar-chart`)
- Produces (전부 default export):
  - `SimulationReportSummary({ report, actions }: { report: SimulationReport; actions?: ReactNode })`
  - `SimulationCostBreakdown({ report }: { report: SimulationReport })`
  - `SimulationKeyMoneyCard({ keyMoney }: { keyMoney: SimulationKeyMoney })`
  - `SimulationSimilarFranchisees({ items }: { items: readonly SimulationSimilarFranchisee[] })`
  - `SimulationCustomerInsight({ condition, analysis }: { condition: SimulationCondition; analysis: SimulationGenderAgeAnalysis })`
  - `SimulationSeasonCard({ condition, analysis }: { condition: SimulationCondition; analysis: SimulationSeasonAnalysis })`

**공통 규칙** (6개 파일 모두):
- 파일 최상단 `'use client'`.
- 섹션 껍데기(테두리·radius·padding)는 **각 컴포넌트가 스스로 갖는다.** 조립하는 view 가 카드를 또 씌우지 않는다.
  껍데기 값은 `simulation-result-panel.tsx` 의 `Root` 와 같은 값을 쓴다:
  `border: 1px solid var(--color-border-200); border-radius: var(--radius-card); background: var(--color-surface); padding: 24px;` (`@media (max-width: 640px)` 에서 `padding: 20px`)
- 섹션 제목은 `h2` 17/700, 부제·범위 라벨은 13/400 `var(--color-text-600)`.
- **네트워크를 모른다.** props 로 받은 값만 그린다.

- [ ] **Step 1: 헤드라인 요약 섹션을 만든다**

`simulation-report-summary.tsx` — `simulation-result-preview.tsx` 의 헤드라인/조건 요약 마크업을 그대로 따르되,
`Pending`(준비 중) 블록 대신 `actions` 슬롯을 둔다.

```tsx
'use client'

import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import styled from 'styled-components'

import { Badge } from '@/components/ui/badge'
import { formatLargeWon } from '@/lib/format'
import { formatDataBaseYearNotice } from '@/lib/simulation/report-sections'
import type { SimulationReport } from '@/types/simulation'

export type SimulationReportSummaryProps = {
  report: SimulationReport
  /** 저장·비교 CTA. B1 에서는 넘기지 않는다(B2·B3 이 채운다). */
  actions?: ReactNode
}

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;
  box-shadow: var(--shadow-level-2);

  @media (max-width: 640px) {
    padding: 20px;
  }
`

const Caption = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Headline = styled.p`
  color: var(--color-text-900);
  font-size: 30px;
  font-weight: 750;
  line-height: 40px;
  font-variant-numeric: tabular-nums;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 26px;
    line-height: 36px;
  }
`

const Conditions = styled.dl`
  display: grid;
  border-top: 1px solid var(--color-border-200);
  padding-top: 12px;

  > div {
    min-width: 0;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 0;
  }

  dt {
    flex: 0 0 auto;
    color: var(--color-text-caption);
    font-size: 13px;
    line-height: 20px;
  }

  dd {
    min-width: 0;
    color: var(--color-text-900);
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
    text-align: right;
    word-break: keep-all;
  }
`

const Notice = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 12px;
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;

  svg {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    margin-top: 2px;
    color: var(--color-text-caption);
    stroke: currentColor;
  }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button,
  a {
    flex: 1 1 160px;
  }
`

/**
 * 리포트 헤드라인 — 총 창업 비용과 그 조건.
 *
 * **권리금은 여기 없다.** 총비용에 포함되지 않는 값이라 헤드라인 옆에 두면 합계로 읽힌다(G5).
 */
export default function SimulationReportSummary({
  report,
  actions,
}: SimulationReportSummaryProps) {
  const { condition } = report

  return (
    <Root aria-label="예상 총 창업 비용">
      <div>
        <Caption>예상 총 창업 비용</Caption>
        <Headline>{formatLargeWon(report.totalPrice)}</Headline>
      </div>

      <div>
        <Badge $tone="blue">
          {condition.franchisee ? '프랜차이즈' : '개인 창업'}
        </Badge>
      </div>

      <Conditions>
        <div>
          <dt>자치구</dt>
          <dd>{condition.districtName}</dd>
        </div>
        <div>
          <dt>업종</dt>
          <dd>{condition.serviceName}</dd>
        </div>
        {condition.brandName ? (
          <div>
            <dt>브랜드</dt>
            <dd>{condition.brandName}</dd>
          </div>
        ) : null}
        <div>
          <dt>매장 크기</dt>
          <dd>{condition.storeSize.toLocaleString()}㎡</dd>
        </div>
        <div>
          <dt>층 구분</dt>
          <dd>{condition.floorType.name}</dd>
        </div>
      </Conditions>

      <Notice>
        <Info aria-hidden="true" />
        <span>{formatDataBaseYearNotice(report.dataBaseYear)}</span>
      </Notice>

      {actions ? <Actions>{actions}</Actions> : null}
    </Root>
  )
}
```

- [ ] **Step 2: 비용 구성 섹션을 만든다**

`simulation-cost-breakdown.tsx` — 도넛 + 표. `toCostBreakdown` 이 항목을 정하므로 이 컴포넌트는 `levy` 를 모른다.

```tsx
'use client'

import styled from 'styled-components'

import DonutChart from '@/components/analysis/charts/donut-chart'
import { formatLargeWon } from '@/lib/format'
import { toCostBreakdown } from '@/lib/simulation/report-presentation'
import type { SimulationReport } from '@/types/simulation'

export type SimulationCostBreakdownProps = { report: SimulationReport }

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;

  @media (max-width: 640px) {
    padding: 20px;
  }

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  align-items: center;
  gap: 20px;

  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Rows = styled.dl`
  display: grid;

  > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--color-border-200);
    padding: 10px 0;
  }

  > div:last-child {
    border-bottom: none;
  }

  dt {
    color: var(--color-text-600);
    font-size: 14px;
    line-height: 22px;
  }

  dd {
    color: var(--color-text-900);
    font-size: 15px;
    font-weight: 700;
    line-height: 24px;
    font-variant-numeric: tabular-nums;
  }
`

const Footnote = styled.p`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  word-break: keep-all;
`

/**
 * 비용 구성. 보증금이 "월 임대료 10개월분"이라는 사실을 각주로 밝힌다 —
 * V1 이 이 값을 "월 최소 목표 매출"로 잘못 표기했던 자리다.
 */
export default function SimulationCostBreakdown({
  report,
}: SimulationCostBreakdownProps) {
  const rows = toCostBreakdown(report)

  return (
    <Root aria-label="비용 구성">
      <h2>비용 구성</h2>

      <Layout>
        <DonutChart
          segments={rows.map(row => ({ label: row.label, value: row.amount }))}
          ariaLabel="비용 구성 비율"
          valueFormatter={formatLargeWon}
        />

        <Rows>
          {rows.map(row => (
            <div key={row.key}>
              <dt>{row.label}</dt>
              <dd>{formatLargeWon(row.amount)}</dd>
            </div>
          ))}
        </Rows>
      </Layout>

      <Footnote>
        보증금은 월 임대료의 10개월분으로 계산했어요. 권리금은 총 창업 비용에
        포함되지 않아요.
      </Footnote>
    </Root>
  )
}
```

- [ ] **Step 3: 권리금 카드를 만든다**

`simulation-key-money-card.tsx` — `참고` 배지가 **필수**다(G5).

```tsx
'use client'

import styled from 'styled-components'

import { Badge } from '@/components/ui/badge'
import { formatLargeWon } from '@/lib/format'
import type { SimulationKeyMoney } from '@/types/simulation'

export type SimulationKeyMoneyCardProps = { keyMoney: SimulationKeyMoney }

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;

  @media (max-width: 640px) {
    padding: 20px;
  }
`

const Head = styled.header`
  display: flex;
  align-items: center;
  gap: 8px;

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }
`

const Metrics = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
  }

  > div {
    display: grid;
    gap: 2px;
    border-radius: var(--radius-control);
    background: var(--color-surface-muted);
    padding: 12px;
  }

  dt {
    color: var(--color-text-600);
    font-size: 12px;
    line-height: 18px;
  }

  dd {
    color: var(--color-text-900);
    font-size: 16px;
    font-weight: 700;
    line-height: 24px;
    font-variant-numeric: tabular-nums;
  }
`

const Note = styled.p`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  word-break: keep-all;
`

/**
 * 권리금. **총 창업 비용에 포함되지 않는다** — 배지와 각주 둘 다로 밝힌다.
 * 하나만 두면 배지를 못 본 사용자가 총비용에 더해 읽는다.
 */
export default function SimulationKeyMoneyCard({
  keyMoney,
}: SimulationKeyMoneyCardProps) {
  return (
    <Root aria-label="권리금 참고">
      <Head>
        <h2>권리금</h2>
        <Badge $tone="grey">참고</Badge>
      </Head>

      <Metrics>
        <div>
          <dt>권리금 있는 점포 비율</dt>
          <dd>{keyMoney.keyMoneyRatio.toLocaleString()}%</dd>
        </div>
        <div>
          <dt>평균 권리금</dt>
          <dd>{formatLargeWon(keyMoney.keyMoneyAverage)}</dd>
        </div>
        <div>
          <dt>㎡당 권리금</dt>
          <dd>{keyMoney.keyMoneyLevel.toLocaleString()}만원</dd>
        </div>
      </Metrics>

      <Note>
        권리금은 위 예상 총 창업 비용에 포함되지 않은 참고 값이에요. 실제
        점포마다 크게 달라져요.
      </Note>
    </Root>
  )
}
```

> `Badge` 의 `$tone` 에 `grey` 가 없으면 `src/components/ui/badge.tsx` 에서 지원하는 톤 중
> 중립 톤을 골라 쓴다. **새 톤을 추가하지 않는다**(G11).

- [ ] **Step 4: 유사 프랜차이즈 표를 만든다**

`simulation-similar-franchisees.tsx` — 6열이라 모바일에서 **가로 스크롤 컨테이너**로 감싼다(D6 반응형).

```tsx
'use client'

import styled from 'styled-components'

import { formatLargeWon } from '@/lib/format'
import type { SimulationSimilarFranchisee } from '@/types/simulation'

export type SimulationSimilarFranchiseesProps = {
  items: readonly SimulationSimilarFranchisee[]
}

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;

  @media (max-width: 640px) {
    padding: 20px;
  }

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }

  p {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }
`

/* 6열이 좁은 화면을 넘긴다. 페이지가 통째로 가로 스크롤되지 않게 표만 스크롤시킨다. */
const Scroll = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`

const Table = styled.table`
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;

  th,
  td {
    border-bottom: 1px solid var(--color-border-200);
    padding: 10px 12px;
    font-size: 13px;
    line-height: 20px;
    text-align: right;
    white-space: nowrap;
  }

  th {
    color: var(--color-text-600);
    font-weight: 600;
  }

  td {
    color: var(--color-text-900);
    font-variant-numeric: tabular-nums;
  }

  th:first-child,
  td:first-child {
    text-align: left;
    white-space: normal;
    word-break: keep-all;
  }

  tbody tr:last-child th,
  tbody tr:last-child td {
    border-bottom: none;
  }
`

/** 예상 총비용에 근접한 프랜차이즈 Top 5. 비면 섹션을 그리지 않는다(호출부 판정). */
export default function SimulationSimilarFranchisees({
  items,
}: SimulationSimilarFranchiseesProps) {
  return (
    <Root aria-label="비슷한 예산의 프랜차이즈">
      <h2>비슷한 예산의 프랜차이즈</h2>
      <p>계산한 예상 총 창업 비용에 가까운 브랜드예요. 금액은 만원 단위예요.</p>

      <Scroll>
        <Table>
          <thead>
            <tr>
              <th scope="col">브랜드</th>
              <th scope="col">총비용</th>
              <th scope="col">가입비</th>
              <th scope="col">교육비</th>
              <th scope="col">가맹 보증금</th>
              <th scope="col">인테리어</th>
              <th scope="col">기타</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.franchiseeId}>
                <th scope="row">{item.brandName}</th>
                <td>{formatLargeWon(item.totalPrice)}</td>
                <td>{formatLargeWon(item.subscription)}</td>
                <td>{formatLargeWon(item.education)}</td>
                <td>{formatLargeWon(item.deposit)}</td>
                <td>{formatLargeWon(item.interior)}</td>
                <td>{formatLargeWon(item.etc)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Scroll>
    </Root>
  )
}
```

- [ ] **Step 5: 고객 참고(성별·연령) 섹션을 만든다**

`simulation-customer-insight.tsx` — **G6 의 두 제약이 이 파일에 산다.**

```tsx
'use client'

import styled from 'styled-components'

import DonutChart from '@/components/analysis/charts/donut-chart'
import HorizontalBarChart from '@/components/analysis/charts/horizontal-bar-chart'
import {
  describeAgeSalesScope,
  describeSimulationPeriod,
  formatSalesAmountCompact,
  toAgeSalesRows,
  toGenderSalesSegments,
} from '@/lib/simulation/report-presentation'
import type {
  SimulationCondition,
  SimulationGenderAgeAnalysis,
} from '@/types/simulation'

export type SimulationCustomerInsightProps = {
  condition: SimulationCondition
  analysis: SimulationGenderAgeAnalysis
}

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;

  @media (max-width: 640px) {
    padding: 20px;
  }
`

const Head = styled.header`
  display: grid;
  gap: 4px;

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }

  p {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  align-items: center;
  gap: 20px;

  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const SubTitle = styled.h3`
  margin-bottom: 8px;
  color: var(--color-text-800);
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
  word-break: keep-all;
`

/**
 * 고객 참고 지표.
 *
 * **이 섹션의 수치는 사용자 점포의 예상 매출이 아니다.** 원천이 `sales_district` 라
 * 자치구×업종 **전체**의 분기 매출이고, dev 실측이 273억원 수준이다. 범위를 밝히지 않으면
 * 창업 비용을 계산하러 온 사용자가 자기 매출로 읽는다 — 그래서 범위 문구를 섹션 부제와
 * 막대 차트 소제목 **양쪽**에 넣고, 값은 억 단위로 축약한다.
 */
export default function SimulationCustomerInsight({
  condition,
  analysis,
}: SimulationCustomerInsightProps) {
  const scope = describeAgeSalesScope(condition)
  const period = describeSimulationPeriod(condition.periodCode)

  return (
    <Root aria-label="고객 참고 지표">
      <Head>
        <h2>고객 참고 지표</h2>
        <p>
          {scope}
          {period ? ` · ${period}` : ''}
        </p>
      </Head>

      <Layout>
        <div>
          <SubTitle>성별 매출 비중</SubTitle>
          <DonutChart
            segments={toGenderSalesSegments(analysis)}
            ariaLabel="성별 매출 비중"
            unit="%"
          />
        </div>

        <div>
          <SubTitle>연령대별 매출 — {scope}</SubTitle>
          <HorizontalBarChart
            items={toAgeSalesRows(analysis)}
            unit="원"
            ariaLabel={`연령대별 매출 (${scope})`}
            valueFormatter={formatSalesAmountCompact}
          />
        </div>
      </Layout>
    </Root>
  )
}
```

- [ ] **Step 6: 성수기 카드를 만든다**

`simulation-season-card.tsx`:

```tsx
'use client'

import styled from 'styled-components'

import { Badge } from '@/components/ui/badge'
import {
  describeSeasonMonths,
  describeSimulationPeriod,
} from '@/lib/simulation/report-presentation'
import type {
  SimulationCondition,
  SimulationSeasonAnalysis,
} from '@/types/simulation'

export type SimulationSeasonCardProps = {
  condition: SimulationCondition
  analysis: SimulationSeasonAnalysis
}

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 24px;

  @media (max-width: 640px) {
    padding: 20px;
  }

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
    line-height: 26px;
  }
`

const Caption = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
`

const Rows = styled.dl`
  display: grid;
  gap: 12px;

  > div {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  dt {
    flex: 0 0 auto;
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
  }

  dd {
    color: var(--color-text-900);
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
  }
`

/** 성수기·비성수기. 한쪽만 값이 오는 경우가 있어 있는 쪽만 그린다. */
export default function SimulationSeasonCard({
  condition,
  analysis,
}: SimulationSeasonCardProps) {
  const period = describeSimulationPeriod(condition.periodCode)
  const peak = describeSeasonMonths(analysis.peakMonths)
  const offPeak = describeSeasonMonths(analysis.offPeakMonths)

  return (
    <Root aria-label="성수기 참고">
      <h2>성수기</h2>
      {period ? <Caption>{period}</Caption> : null}

      <Rows>
        {peak ? (
          <div>
            <dt>
              <Badge $tone="blue">성수기</Badge>
            </dt>
            <dd>{peak}</dd>
          </div>
        ) : null}
        {offPeak ? (
          <div>
            <dt>
              <Badge $tone="grey">비성수기</Badge>
            </dt>
            <dd>{offPeak}</dd>
          </div>
        ) : null}
      </Rows>
    </Root>
  )
}
```

- [ ] **Step 7: 타입·린트를 확인한다**

```bash
pnpm lint && pnpm typecheck
```

Expected: PASS. `Badge` 의 `$tone` 값과 `DonutChart` / `HorizontalBarChart` 의 props 이름이 실제 시그니처와
어긋나면 여기서 잡힌다 — **컴포넌트 파일을 열어 실제 props 에 맞춘다.**

- [ ] **Step 8: 커밋**

```bash
git add frontend/src/components/simulation/report
git commit -m "[FE] feat: 시뮬레이션 리포트 섹션 6종을 만든다"
```

---

### Task 4: 리포트 조립 뷰 + 결측 섹션 숨김

**Files:**
- Create: `frontend/src/components/simulation/report/simulation-report-view.tsx`
- Test: `frontend/src/components/simulation/report/simulation-report-view.test.ts`

**Interfaces:**
- Consumes: Task 3 의 6개 컴포넌트, `hasGenderAgeAnalysis` / `hasSeasonAnalysis` (`@/lib/simulation/report-sections`)
- Produces: `SimulationReportView({ report, actions }: { report: SimulationReport; actions?: ReactNode })`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`frontend/src/components/simulation/report/simulation-report-view.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationReportView from '@/components/simulation/report/simulation-report-view'
import type { SimulationReport } from '@/types/simulation'

const report = (overrides: Partial<SimulationReport> = {}): SimulationReport => ({
  condition: {
    franchisee: false,
    franchiseeId: null,
    brandName: null,
    districtCode: '11740',
    districtName: '강동구',
    serviceCode: 'CS100001',
    serviceName: '한식음식점',
    storeSize: 66,
    floorType: { code: 'FIRST_FLOOR', name: '1층', description: '1층 점포' },
    periodCode: '20233',
  },
  dataBaseYear: '2024',
  totalPrice: 23_450,
  keyMoney: { keyMoneyRatio: 62, keyMoneyAverage: 4_200, keyMoneyLevel: 63 },
  costDetail: { rentPrice: 300, deposit: 3_000, interior: 5_000, levy: null },
  similarFranchisees: [],
  genderAgeAnalysis: null,
  seasonAnalysis: null,
  ...overrides,
})

const render = (value: SimulationReport) =>
  renderToStaticMarkup(createElement(SimulationReportView, { report: value }))

describe('SimulationReportView', () => {
  it('총 창업 비용과 기준 연도 안내를 노출한다', () => {
    const markup = render(report())

    expect(markup).toContain('2억 3,450만원')
    expect(markup).toContain('2024년 기준 데이터로 계산된 결과입니다.')
  })

  it('비프랜차이즈면 가맹 부담금 항목이 없다', () => {
    expect(render(report())).not.toContain('가맹 부담금')
  })

  it('levy 가 0 이면 가맹 부담금을 0원으로 표기한다', () => {
    const markup = render(
      report({ costDetail: { rentPrice: 300, deposit: 3_000, interior: 5_000, levy: 0 } }),
    )

    expect(markup).toContain('가맹 부담금')
    expect(markup).toContain('0만원')
  })

  it('권리금을 총비용과 분리해 참고로 표기한다', () => {
    const markup = render(report())

    expect(markup).toContain('권리금')
    expect(markup).toContain('참고')
    expect(markup).toContain('포함되지 않')
  })

  it('결측 섹션은 숨기고 오류 문구를 띄우지 않는다', () => {
    const markup = render(report())

    expect(markup).not.toContain('고객 참고 지표')
    expect(markup).not.toContain('성수기')
    // 결측은 200 응답 안의 사실이다 — 오류 UI 로 새지 않아야 한다.
    expect(markup).not.toContain('다시 시도')
  })

  it('성별·연령 섹션에 집계 범위 라벨과 억 단위 축약이 붙는다', () => {
    const markup = render(
      report({
        genderAgeAnalysis: {
          malePercent: 54,
          femalePercent: 46,
          topAgeGroups: [{ ageGroupName: '50대', salesAmount: 2_733_782 }],
        },
      }),
    )

    expect(markup).toContain('강동구 한식음식점 전체 기준')
    expect(markup).toContain('2023년 3분기 기준')
    // 273억을 자기 점포 매출로 읽지 않게 원문 숫자를 축에 그대로 얹지 않는다.
    expect(markup).not.toContain('2,733,782')
  })

  it('성수기 데이터가 있으면 월 배지를 그린다', () => {
    const markup = render(
      report({ seasonAnalysis: { peakMonths: [3, 7], offPeakMonths: [1] } }),
    )

    expect(markup).toContain('성수기')
    expect(markup).toContain('3월 · 7월')
    expect(markup).toContain('1월')
  })

  it('유사 프랜차이즈가 비면 섹션을 그리지 않는다', () => {
    expect(render(report())).not.toContain('비슷한 예산의 프랜차이즈')
  })

  it('유사 프랜차이즈가 있으면 표를 그린다', () => {
    const markup = render(
      report({
        similarFranchisees: [
          {
            franchiseeId: 7,
            brandName: '테스트브랜드',
            totalPrice: 22_000,
            subscription: 500,
            education: 300,
            deposit: 1_000,
            etc: 200,
            interior: 6_000,
          },
        ],
      }),
    )

    expect(markup).toContain('비슷한 예산의 프랜차이즈')
    expect(markup).toContain('테스트브랜드')
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

```bash
pnpm vitest run src/components/simulation/report/simulation-report-view.test.ts
```

Expected: FAIL — `simulation-report-view` resolve 실패

- [ ] **Step 3: 최소 구현**

```tsx
'use client'

import type { ReactNode } from 'react'
import styled from 'styled-components'

import SimulationCostBreakdown from '@/components/simulation/report/simulation-cost-breakdown'
import SimulationCustomerInsight from '@/components/simulation/report/simulation-customer-insight'
import SimulationKeyMoneyCard from '@/components/simulation/report/simulation-key-money-card'
import SimulationReportSummary from '@/components/simulation/report/simulation-report-summary'
import SimulationSeasonCard from '@/components/simulation/report/simulation-season-card'
import SimulationSimilarFranchisees from '@/components/simulation/report/simulation-similar-franchisees'
import {
  hasGenderAgeAnalysis,
  hasSeasonAnalysis,
} from '@/lib/simulation/report-sections'
import type { SimulationReport } from '@/types/simulation'

export type SimulationReportViewProps = {
  report: SimulationReport
  /** 헤드라인 카드 하단 CTA 슬롯. B2(저장)·B3(비교에 추가)가 채운다. */
  actions?: ReactNode
}

const Sections = styled.div`
  display: grid;
  gap: 16px;
`

/**
 * 리포트 본문 — **순수 표시**다. 네트워크·라우팅을 모르므로 비교 화면이 그대로 재사용한다.
 *
 * 결측 판정은 `report-sections` 의 술어만 쓴다. 여기서 `analysis == null` 을 직접 보면
 * "빈 배열"(그릴 게 없음) 같은 경우가 새어 나와 빈 차트가 그려진다.
 */
export default function SimulationReportView({
  report,
  actions,
}: SimulationReportViewProps) {
  return (
    <Sections>
      <SimulationReportSummary report={report} actions={actions} />
      <SimulationCostBreakdown report={report} />
      <SimulationKeyMoneyCard keyMoney={report.keyMoney} />

      {report.similarFranchisees.length > 0 ? (
        <SimulationSimilarFranchisees items={report.similarFranchisees} />
      ) : null}

      {hasGenderAgeAnalysis(report.genderAgeAnalysis) ? (
        <SimulationCustomerInsight
          condition={report.condition}
          analysis={report.genderAgeAnalysis}
        />
      ) : null}

      {hasSeasonAnalysis(report.seasonAnalysis) ? (
        <SimulationSeasonCard
          condition={report.condition}
          analysis={report.seasonAnalysis}
        />
      ) : null}
    </Sections>
  )
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
pnpm vitest run src/components/simulation/report/simulation-report-view.test.ts
```

Expected: PASS (9 tests)

> 실패 시 흔한 원인 두 가지:
> - `not.toContain('성수기')` 가 걸린다 → 다른 섹션 문구에 "성수기"가 들어갔다. 각주 문구를 고친다.
> - recharts 가 node 환경에서 경고를 낸다 → 렌더는 되므로 assertion 이 실패하지 않는 한 무시한다.
>   실제로 throw 하면 차트를 `next/dynamic` 이 아니라 **부모에서 조건 렌더**로 감싸지 말고,
>   해당 assertion 을 `report-presentation.test.ts`(순수 함수)로 옮긴다.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/components/simulation/report/simulation-report-view.tsx frontend/src/components/simulation/report/simulation-report-view.test.ts
git commit -m "[FE] feat: 리포트 본문을 조립하고 결측 섹션을 숨긴다"
```

---

### Task 5: 리포트 화면 + 라우트 교체 + 입력 화면 연결

**Files:**
- Create: `frontend/src/components/simulation/report/simulation-report-page.tsx`
- Modify: `frontend/app/(shell)/simulation/report/page.tsx`
- Modify: `frontend/app/(shell)/analysis/simulation/report/page.tsx`
- Modify: `frontend/src/components/simulation/simulation-result-preview.tsx`
- Modify: `frontend/src/components/simulation/simulation-result-preview.test.ts`
- Modify: `frontend/src/components/simulation/simulation-result-panel.tsx`
- Modify: `frontend/src/components/simulation/simulation-summary-bar.tsx`
- Modify: `frontend/src/components/simulation/simulation-builder-page.tsx`

**Interfaces:**
- Consumes: Task 1(`parseSimulationReportRequest`, `buildSimulationReportHref`, `simulationBuilderHref`), Task 2(`simulationReportQueryKey`), Task 4(`SimulationReportView`), `createSimulationReport`(`@/lib/api/simulation`), `resolveApiError` / `retryUnlessClientError`(`@/lib/api/api-error`), `getResponseBody`(`@/lib/api/response`), `SimulationErrorNotice`
- Produces: `SimulationReportPage({ variant }: { variant?: 'standalone' | 'analysis' })`

- [ ] **Step 1: 리포트 화면을 만든다**

```tsx
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import styled from 'styled-components'

import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import SimulationReportView from '@/components/simulation/report/simulation-report-view'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { createSimulationReport } from '@/lib/api/simulation'
import { getResponseBody } from '@/lib/api/response'
import { simulationReportQueryKey } from '@/lib/simulation/report-query'
import {
  parseSimulationReportRequest,
  simulationBuilderHref,
  type SimulationReportVariant,
} from '@/lib/simulation/report-route'

export type SimulationReportPageProps = { variant?: SimulationReportVariant }

const Page = styled.main`
  min-height: calc(100vh - 160px);
  padding: 32px 0 64px;
  background: var(--color-background-muted);

  @media (max-width: 1023px) {
    padding: 24px 0 48px;
  }
`

const Container = styled.div`
  width: min(1320px, calc(100% - 40px));
  margin: 0 auto;
  display: grid;
  gap: 16px;

  @media (max-width: 640px) {
    width: calc(100% - 32px);
  }
`

const Head = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;

  h1 {
    color: var(--color-text-900);
    font-size: 22px;
    font-weight: 750;
    line-height: 32px;
    word-break: keep-all;
  }
`

const Loading = styled.div`
  display: grid;
  gap: 16px;
`

/**
 * 상세 리포트 화면. **조건의 정본은 쿼리스트링**이다.
 *
 * `useMutation` 이 아니라 `useQuery` 인 이유: 이 화면에서 계산은 사용자의 명령이 아니라
 * "이 URL 이 가리키는 결과"다. 새로고침·뒤로가기·링크로 들어와도 같은 화면이 나와야 하고,
 * 입력 화면이 미리 채워 둔 캐시(`simulationReportQueryKey`)를 그대로 집어야 재호출이 없다.
 *
 * 재시도는 `retryUnlessClientError` 로 4xx 를 자동 재시도에서 빼고, 화면의 재시도 버튼
 * 노출은 `SimulationErrorNotice` 가 `isRetryable(kind)` 로 정한다 — 404 에는 버튼이 없다.
 */
export default function SimulationReportPage({
  variant = 'standalone',
}: SimulationReportPageProps) {
  const searchParams = useSearchParams()
  const request = useMemo(
    () => parseSimulationReportRequest(searchParams),
    [searchParams],
  )

  const query = useQuery({
    queryKey: request ? simulationReportQueryKey(request) : ['simulation-report', 'none'],
    queryFn: () => createSimulationReport(request!),
    enabled: request !== null,
    retry: retryUnlessClientError,
  })

  const builderHref = simulationBuilderHref(variant)

  // 조건이 없는 URL 은 오류가 아니다 — 손상된 링크이거나 직접 들어온 경우다.
  if (!request) {
    return (
      <Page>
        <Container>
          <EmptyState
            title="계산할 조건이 없어요"
            description="창업 조건을 고르면 예상 비용과 상세 리포트를 보여드릴게요."
            action={
              <Button as={Link} href={builderHref} leftIcon={<ArrowLeft />}>
                조건 고르러 가기
              </Button>
            }
          />
        </Container>
      </Page>
    )
  }

  const error = resolveApiError({ error: query.error, data: query.data })
  const report = error ? null : getResponseBody(query.data)

  return (
    <Page>
      <Container>
        <Head>
          <h1>창업 시뮬레이션 리포트</h1>
          <Button variant="ghost" as={Link} href={builderHref} leftIcon={<ArrowLeft />}>
            조건 다시 고르기
          </Button>
        </Head>

        {query.isPending ? (
          <Loading aria-label="리포트 계산 중">
            <Skeleton height={220} />
            <Skeleton height={280} />
            <Skeleton height={180} />
          </Loading>
        ) : error ? (
          <SimulationErrorNotice
            error={error}
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : report ? (
          <SimulationReportView report={report} />
        ) : null}
      </Container>
    </Page>
  )
}
```

> `Button` 의 `as={Link}` / `variant="ghost"` / `EmptyState` / `Skeleton` 의 실제 props 는
> `src/components/ui/` 를 열어 확인하고 맞춘다. **없는 prop 을 새로 만들지 않는다** — 지원하지
> 않으면 `<Link>` 로 감싸거나 저장소에 이미 있는 관용구를 따른다.

- [ ] **Step 2: 라우트 2개의 placeholder 를 걷어낸다**

`frontend/app/(shell)/simulation/report/page.tsx`:

```tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import SimulationReportPage from '@/components/simulation/report/simulation-report-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '창업 시뮬레이션 리포트',
  description: '계산한 창업 조건의 예상 비용과 상세 리포트를 보여줍니다.',
  path: '/simulation/report',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SimulationReportPage />
    </Suspense>
  )
}
```

`frontend/app/(shell)/analysis/simulation/report/page.tsx` — 위와 같되
`path: '/analysis/simulation/report'`, `description: '분석한 상권 조건의 예상 창업 비용 리포트를 보여줍니다.'`,
`<SimulationReportPage variant="analysis" />`.

> `useSearchParams` 를 쓰므로 **`Suspense` 로 감싸지 않으면 빌드가 실패한다**(`/simulation` 라우트가 이미 같은 이유로 감싸고 있다).

- [ ] **Step 3: 입력 화면에서 리포트로 잇는다**

`simulation-result-preview.tsx` — `Pending`(준비 중) 블록을 지우고 `reportHref` prop 을 받아 CTA 를 그린다:

```tsx
export type SimulationResultPreviewProps = {
  report: SimulationReport
  /** 상세 리포트 경로. 호출부가 variant 를 알고 있으므로 여기서 만들지 않는다. */
  reportHref: string
}
```

`Pending` styled-component 와 그 JSX 를 삭제하고 그 자리에:

```tsx
      <Button as={Link} href={reportHref} size="large" rightIcon={<ArrowRight />}>
        상세 리포트 보기
      </Button>
```

`simulation-result-panel.tsx` — `reportHref: string | null` 을 props 에 추가하고
`<SimulationResultPreview report={report} reportHref={reportHref ?? '#'} />` 가 아니라,
**`reportHref` 가 null 이면 결과 자체가 없으므로** `report &&reportHref` 를 함께 판정해 넘긴다.

`simulation-summary-bar.tsx` — 기존 `onViewResult`(스크롤) 는 그대로 두고,
계산 결과가 있을 때의 CTA 를 `자세히` **링크**로 바꾼다. props 에 `reportHref: string | null` 을 추가한다.

`simulation-builder-page.tsx`:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { buildSimulationReportHref } from '@/lib/simulation/report-route'
import { simulationReportQueryKey } from '@/lib/simulation/report-query'
```

```tsx
  const queryClient = useQueryClient()

  const reportMutation = useMutation({
    mutationFn: (payload: SimulationReportRequest) =>
      createSimulationReport(payload),
    // 리포트 화면이 같은 조건으로 다시 POST 하지 않게 캐시를 미리 채운다.
    onSuccess: (data, payload) => {
      queryClient.setQueryData(simulationReportQueryKey(payload), data)
    },
  })
```

```tsx
  const reportHref =
    currentReport && reportMutation.variables
      ? buildSimulationReportHref(reportMutation.variables, variant)
      : null
```

`variant` 는 `'standalone' | 'analysis'` 로 이미 컴포넌트 props 에 있다. 그대로 넘긴다.
`SimulationResultPanel` 과 `SimulationSummaryBar` 에 `reportHref` 를 전달한다.

- [ ] **Step 4: 테스트를 고치고 돌린다**

`simulation-result-preview.test.ts` 의 마지막 케이스(`이번 슬라이스에서는 상세 항목을 그리지 않는다`)를 교체한다:

```ts
  it('상세 리포트로 가는 링크를 준다', () => {
    const markup = renderToStaticMarkup(
      createElement(SimulationResultPreview, {
        report: report(),
        reportHref: '/simulation/report?franchisee=false',
      }),
    )

    expect(markup).toContain('상세 리포트 보기')
    expect(markup).toContain('/simulation/report?franchisee=false')
    // 상세 수치는 리포트 화면 몫이다 — 미리보기에서 같은 값을 다르게 표기하지 않는다.
    expect(markup).not.toContain('4,200')
  })
```

나머지 케이스에는 전부 `reportHref: '/simulation/report'` 를 추가한다.
`simulation-result-panel.test.ts` · `simulation-summary-bar.test.ts` 도 새 prop 을 넘기도록 고친다.

```bash
pnpm test
```

Expected: PASS (전체)

- [ ] **Step 5: 전체 검증**

```bash
pnpm qa:verify
```

Expected: PASS. `.next/dev/types/routes.d.ts` 에서 타입 오류가 나면 소스 문제가 아니라 낡은 산출물이다:

```bash
rm -rf .next && pnpm qa:verify
```

- [ ] **Step 6: 커밋 & PR**

```bash
git add -A
git commit -m "[FE] feat: 창업 시뮬레이션 상세 리포트 화면을 연다"
git push -u origin feature/fe/simulation-report
gh pr create --base develop --title "[FE] feat: 창업 시뮬레이션 상세 리포트" --body "..."
```

- [ ] **Step 7: 브라우저 검증** (사용자가 `pnpm dev` 를 **포트 5173** 으로 띄운 뒤)

카카오 JS 키가 `localhost:5173` 에만 등록돼 있고, 백엔드 CORS 허용 오리진도 5173·3000 뿐이다.
다른 포트에서는 POST 가 전부 403 이라 계산이 되지 않는다.

확인 항목:
1. `/simulation` 에서 조건 4개 선택 → 계산 → `상세 리포트 보기` → 리포트가 **재호출 없이** 즉시 뜬다 (Network 탭에 `reports` POST 가 1회)
2. 리포트에서 새로고침 → 같은 화면이 다시 뜬다 (이번엔 POST 1회 발생)
3. 개인 창업으로 계산 → 비용 구성에 `가맹 부담금` 항목이 **없다**
4. `genderAgeAnalysis` 가 오는 자치구×업종(예: 강동구 한식음식점)에서 연령 막대가 **억 단위**로 축약되고 범위 라벨이 붙는다
5. `?districtCode=99999` 로 URL 을 망가뜨리면 `계산할 조건이 없어요` 가 뜬다 (오류 화면이 아니다)
6. 1023px 이하로 줄여 유사 프랜차이즈 표가 **표만** 가로 스크롤되고 페이지 본문은 안 밀린다

---

# PR B2 — 저장 · 이력

> **선행:** B1 이 develop 에 머지된 뒤 `git worktree add ... -b feature/fe/simulation-history origin/develop`.

## File Structure (B2)

| 파일 | 책임 |
| --- | --- |
| `src/lib/simulation/history-presentation.ts` (신규) | 이력 항목 → 표시 문구 · 이력 → 리포트 href |
| `src/lib/simulation/history-presentation.test.ts` (신규) | 조건 요약·href 왕복 |
| `src/components/simulation/report/simulation-save-button.tsx` (신규) | 저장 CTA. 비로그인 → 로그인 유도, 저장 후 `저장됨` |
| `src/components/simulation/report/simulation-save-button.test.ts` (신규) | 비로그인/저장 전/저장 후 문구 |
| `src/components/simulation/simulation-history-list.tsx` (신규) | 이력 목록 카드 + 페이지네이션 (순수 표시) |
| `src/components/simulation/simulation-history-list.test.ts` (신규) | 빈 목록·항목 렌더·삭제 버튼 부재 |
| `src/components/profile/profile-simulation-bookmarks-page.tsx` (수정) | placeholder → 실제 목록 |
| `src/components/simulation/report/simulation-report-page.tsx` (수정) | `actions` 슬롯에 저장 버튼 |

### Task 6: 이력 표시 로직

**Files:**
- Create: `frontend/src/lib/simulation/history-presentation.ts`
- Test: `frontend/src/lib/simulation/history-presentation.test.ts`

**Interfaces:**
- Consumes: `SimulationHistoryItem`, `buildSimulationReportHref`(B1)
- Produces:
  - `describeSimulationHistoryCondition(item: SimulationHistoryItem): string`
  - `toSimulationReportRequestFromHistory(item: SimulationHistoryItem): SimulationReportRequest`
  - `buildSimulationHistoryReportHref(item: SimulationHistoryItem): string`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
import { describe, expect, it } from 'vitest'

import {
  buildSimulationHistoryReportHref,
  describeSimulationHistoryCondition,
  toSimulationReportRequestFromHistory,
} from '@/lib/simulation/history-presentation'
import type { SimulationHistoryItem } from '@/types/simulation'

const item = (
  overrides: Partial<SimulationHistoryItem> = {},
): SimulationHistoryItem => ({
  historyId: 12,
  franchisee: false,
  brandName: null,
  districtCode: '11740',
  districtName: '강동구',
  serviceCode: 'CS100001',
  serviceName: '한식음식점',
  storeSize: 66,
  floorType: { code: 'FIRST_FLOOR', name: '1층', description: '1층 점포' },
  totalPrice: 23_450,
  dataBaseYear: '2024',
  createdAt: '2026-08-20T09:12:33',
  ...overrides,
})

describe('describeSimulationHistoryCondition', () => {
  it('조건을 한 줄로 요약한다', () => {
    expect(describeSimulationHistoryCondition(item())).toBe(
      '강동구 · 한식음식점 · 66㎡ · 1층',
    )
  })

  it('프랜차이즈면 브랜드명을 업종 뒤에 붙인다', () => {
    expect(
      describeSimulationHistoryCondition(
        item({ franchisee: true, brandName: '테스트브랜드' }),
      ),
    ).toBe('강동구 · 한식음식점 · 테스트브랜드 · 66㎡ · 1층')
  })
})

describe('toSimulationReportRequestFromHistory', () => {
  it('응답 floorType 객체가 아니라 code 를 요청에 넣는다', () => {
    expect(toSimulationReportRequestFromHistory(item())).toEqual({
      franchisee: false,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR',
    })
  })

  it('저장 응답에 franchiseeId 가 없으므로 프랜차이즈도 브랜드 없이 재계산된다', () => {
    // 저장 계약이 franchiseeId 를 되돌려주지 않는다. 재계산 링크는 업종 기준으로만 만든다.
    const request = toSimulationReportRequestFromHistory(
      item({ franchisee: true, brandName: '테스트브랜드' }),
    )

    expect(request.franchisee).toBe(true)
    expect(request.franchiseeId).toBeUndefined()
  })
})

describe('buildSimulationHistoryReportHref', () => {
  it('개인 창업 이력은 리포트 경로를 만든다', () => {
    expect(buildSimulationHistoryReportHref(item())).toContain(
      '/simulation/report?',
    )
    expect(buildSimulationHistoryReportHref(item())).toContain('districtCode=11740')
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
pnpm vitest run src/lib/simulation/history-presentation.test.ts
```

Expected: FAIL — resolve 실패

- [ ] **Step 3: 구현**

```ts
/**
 * 저장 이력 항목의 표시·재조회 변환.
 *
 * **계약의 구멍 하나를 여기서 흡수한다**: 저장 응답(`SimulationHistoryItem`)에는
 * `brandName` 은 있어도 `franchiseeId` 가 없다. 그래서 프랜차이즈 이력을 그대로 재계산하면
 * 브랜드 없는 프랜차이즈 요청이 되어 400 `SIMULATION_004` 다.
 * → 재계산 링크는 **업종까지만** 복원하고, 브랜드는 사용자가 리포트 화면에서 다시 고르게 한다.
 *   (이력 화면이 "다시 계산"이 아니라 "조건 이어서 보기"인 이유다.)
 */

import { buildSimulationReportHref } from '@/lib/simulation/report-route'
import type {
  SimulationHistoryItem,
  SimulationReportRequest,
} from '@/types/simulation'

export const describeSimulationHistoryCondition = (
  item: SimulationHistoryItem,
): string => {
  const parts = [item.districtName, item.serviceName]
  if (item.brandName) parts.push(item.brandName)
  parts.push(`${item.storeSize.toLocaleString()}㎡`, item.floorType.name)
  return parts.join(' · ')
}

export const toSimulationReportRequestFromHistory = (
  item: SimulationHistoryItem,
): SimulationReportRequest => ({
  franchisee: item.franchisee,
  districtCode: item.districtCode,
  serviceCode: item.serviceCode,
  storeSize: item.storeSize,
  // 응답은 {code,name,description} 객체다. 요청에는 code 만 들어간다.
  floorType: item.floorType.code,
})

export const buildSimulationHistoryReportHref = (
  item: SimulationHistoryItem,
): string =>
  buildSimulationReportHref(toSimulationReportRequestFromHistory(item))
```

- [ ] **Step 4: 통과 확인 & 커밋**

```bash
pnpm vitest run src/lib/simulation/history-presentation.test.ts
git add frontend/src/lib/simulation/history-presentation.ts frontend/src/lib/simulation/history-presentation.test.ts
git commit -m "[FE] feat: 시뮬레이션 이력 표시·재조회 변환을 만든다"
```

> **주의**: 프랜차이즈 이력의 재조회 링크는 `parseSimulationReportRequest` 에서 **null 이 된다**
> (`isSimulationSectionComplete('service')` 가 `franchiseeId` 를 요구한다). 이건 의도된 동작이다 —
> 리포트 화면이 `계산할 조건이 없어요 + 조건 고르러 가기`를 보여준다. Task 8 에서 이력 카드가
> 프랜차이즈 항목에 **`브랜드를 다시 골라야 해요`** 안내를 붙여 이 경로를 사용자에게 설명한다.

### Task 7: 저장 버튼

**Files:**
- Create: `frontend/src/components/simulation/report/simulation-save-button.tsx`
- Test: `frontend/src/components/simulation/report/simulation-save-button.test.ts`
- Modify: `frontend/src/components/simulation/report/simulation-report-page.tsx`

**Interfaces:**
- Consumes: `saveSimulationHistory` / `buildSimulationHistorySaveRequest`(`@/lib/api/simulation`), `useAuthStore`(`@/stores/auth-store`), `resolveApiError`
- Produces: `SimulationSaveButton({ request, totalPrice, currentHref }: { request: SimulationReportRequest; totalPrice: number; currentHref: string })`

동작:
- `isLoggedIn === false` → `<Button as={Link} href={'/login?redirect=' + encodeURIComponent(currentHref)}>저장하려면 로그인</Button>`
  (저장소 관용구: `analysis-result-view.tsx:131`)
- 로그인 상태 → `useMutation(saveSimulationHistory)`. 성공 시 버튼을 `저장됨` disabled 로 바꾸고
  `queryClient.invalidateQueries({ queryKey: [SIMULATION_HISTORY_QUERY_SCOPE] })`
- 실패 시 버튼 아래 한 줄 문구(`resolveApiError().message`). `unauthorized` 면 로그인 링크로 되돌린다.
- **삭제·공유 버튼을 만들지 않는다**(G13).

- [ ] **Step 1: 테스트 → 구현 → 통과 → 커밋** (Task 1~4 와 같은 5스텝 사이클)

테스트는 세 상태의 문구를 고정한다:

```ts
  it('비로그인이면 로그인 유도 링크를 준다', () => { /* isLoggedIn=false 로 store 초기화 후 렌더 */ })
  it('로그인 상태면 저장 버튼을 준다', () => { /* '결과 저장' 포함 */ })
  it('삭제·공유 버튼을 그리지 않는다', () => { /* not.toContain('삭제'), not.toContain('공유') */ })
```

> zustand store 를 테스트에서 세팅하려면 `useAuthStore.setState({ isLoggedIn: true, hasHydrated: true })`
> 를 렌더 전에 호출한다. `renderToStaticMarkup` 은 동기라 이걸로 충분하다.

`simulation-report-page.tsx` 수정: `<SimulationReportView report={report} actions={...} />` 로
저장 버튼을 넘긴다. `currentHref` 는 `usePathname()` + `searchParams` 로 만든다.

### Task 8: 이력 목록 + 프로필 화면 교체

**Files:**
- Create: `frontend/src/components/simulation/simulation-history-list.tsx`
- Test: `frontend/src/components/simulation/simulation-history-list.test.ts`
- Modify: `frontend/src/components/profile/profile-simulation-bookmarks-page.tsx`

**Interfaces:**
- Consumes: `fetchSimulationHistories`(`@/lib/api/simulation`), Task 6 의 표시 함수, `formatDateTime`(`@/lib/format`), `profile-ui` 의 `CardGrid`/`ContentCard`/`EmptyState` 등
- Produces:
  - `SimulationHistoryList({ histories, page, totalPages, onPageChange })` — **순수 표시**
  - `ProfileSimulationBookmarksPage()` — `useQuery` 소유

동작:
- `useQuery({ queryKey: [SIMULATION_HISTORY_QUERY_SCOPE, page], queryFn: () => fetchSimulationHistories(page, 10), retry: retryUnlessClientError })`
- 카드: 총비용(`formatLargeWon`) · 조건 요약 · `{dataBaseYear}년 기준` · `formatDateTime(createdAt)` · `리포트 보기` 링크
- 프랜차이즈 항목은 `리포트 보기` 대신 `브랜드 다시 고르기` → `/simulation` (Task 6 주의사항)
- 빈 목록: `아직 저장한 결과가 없어요` + `시뮬레이션 하러 가기`
- **삭제 버튼 없음**(G13)
- `unauthorized` → 로그인 유도. 이 라우트는 `profile-shell.tsx` 가 이미 인증을 요구하므로 중복 처리 불필요 — **`profile-shell.tsx` 의 기존 동작을 먼저 확인하고** 중복이면 넣지 않는다.

- [ ] **Step 1~5**: 테스트 → 실패 확인 → 구현 → 통과 → 커밋

### Task 9: B2 마감

- [ ] `pnpm test && pnpm qa:verify`
- [ ] 브라우저 검증(5173): 로그인 → 계산 → 저장 → `저장됨` → `/profile/bookmarks/simulation` 에 항목이 보인다 → `리포트 보기` 로 되돌아온다
- [ ] 비로그인으로 리포트 진입 → 저장 자리가 `저장하려면 로그인` 이고, **계산은 그대로 된다**(TC-SIM-104)
- [ ] PR 생성 (`--base develop`)

---

# PR B3 — A/B 비교

> **선행:** B1 머지. B2 와 독립이다.

## File Structure (B3)

| 파일 | 책임 |
| --- | --- |
| `src/lib/simulation/compare-route.ts` (신규) | `a.`/`b.` 접두사 쌍 코덱 (B1 코덱 재사용) |
| `src/lib/simulation/compare-route.test.ts` (신규) | 쌍 왕복·한쪽 결손 |
| `src/lib/simulation/compare-presentation.ts` (신규) | 좌우 미러 막대 비율, 총비용 차액 문구, 승자 판정 |
| `src/lib/simulation/compare-presentation.test.ts` (신규) | 동점·차액·중립 문구 |
| `src/components/simulation/compare/simulation-condition-compact-editor.tsx` (신규) | 좁은 카드용 조건 편집기 |
| `src/components/simulation/compare/simulation-compare-columns.tsx` (신규) | 좌우 결과 미러 (순수 표시) |
| `src/components/simulation/compare/simulation-compare-columns.test.ts` (신규) | 승자 강조·중립 문구·미러 정렬 |
| `src/components/simulation/compare/simulation-compare-page.tsx` (신규) | 컨트롤러 2개 + `createSimulationReportPair` |
| `app/(shell)/simulation/compare/page.tsx` (수정) | placeholder 제거 |
| `app/(shell)/analysis/simulation/compare/page.tsx` (수정) | placeholder 제거 |
| `src/components/simulation/report/simulation-report-page.tsx` (수정) | `비교에 추가` CTA 활성 |

### Task 10: 비교 URL 코덱 + 표시 로직

**Files:**
- Create: `frontend/src/lib/simulation/compare-route.ts`, `frontend/src/lib/simulation/compare-presentation.ts`
- Test: 각각의 `.test.ts`

**Interfaces:**
- Produces:
  - `buildSimulationCompareHref(pair: { left: SimulationReportRequest | null; right: SimulationReportRequest | null }, variant?): string`
  - `parseSimulationComparePair(params): { left: SimulationReportRequest | null; right: SimulationReportRequest | null }`
  - `describeSimulationCostGap(left: SimulationReport, right: SimulationReport): { winner: 'left' | 'right' | 'tie'; message: string }`
  - `toMirrorCostRows(left: SimulationReport, right: SimulationReport): { key: string; label: string; leftAmount: number; rightAmount: number; leftRatio: number; rightRatio: number }[]`

핵심 규칙:
- 접두사는 `a.` / `b.`. B1 의 `toSimulationReportSearchParams(request, 'a.')` 를 그대로 쓴다 — 코덱을 두 벌 만들지 않는다.
- 한쪽만 있어도 **오류가 아니다.** 있는 쪽을 채우고 없는 쪽은 편집기를 빈 상태로 연다.
- `describeSimulationCostGap` 의 중립 문구: **"초기 비용만 비교한 결과예요. 매출·수익 지표는 계산하지 않아요."**
  (G10 아래 DESIGN 규칙 — 비용이 낮은 쪽이 더 나은 선택이라는 오해를 막는다.)
- `toMirrorCostRows` 의 비율은 **좌우 합이 아니라 두 값 중 큰 값** 기준이다. 합 기준이면 항목마다 축이 달라져 미러가 왜곡된다.
  `levy` 는 한쪽만 null 일 수 있다 — **양쪽 다 null 일 때만 행을 뺀다.** 한쪽만 있으면 없는 쪽을 `해당 없음` 으로 표기한다.

- [ ] **Step 1~5**: 테스트 → 실패 확인 → 구현 → 통과 → 커밋

### Task 11: 컴팩트 조건 편집기

**Files:**
- Create: `frontend/src/components/simulation/compare/simulation-condition-compact-editor.tsx`

**Interfaces:**
- Consumes: `useSimulationConditions`(`@/lib/simulation/use-simulation-conditions`) — 호출부가 소유하고 컨트롤러를 props 로 내려준다
- Produces: `SimulationConditionCompactEditor({ label, conditions, onCalculate }: { label: string; conditions: SimulationConditionsController; onCalculate?: () => void })`

동작:
- 좁은 카드(≈420px)에 들어가야 하므로 **칩 격자를 쓰지 않는다.** 네이티브 `<select>` 4개 + 면적 `TextField`:
  창업 형태 / 자치구(25) / 업종(30) / 층 구분, 그리고 면적 입력.
- **브랜드 검색은 `SimulationBrandSearch` 를 그대로 재사용**한다 — 업종 선택 전에는 열지 않는다(계약상 강제).
  좁은 폭에서 결과 격자가 깨지면 `SimulationBrandSearch` 에 `variant='compact'` 를 **추가하지 말고**,
  편집기가 `max-width` 로 감싸고 결과 격자가 1열로 접히게 둔다(이미 `minmax(240px,1fr)` 이라 자동으로 접힌다).
- `conditions.gap` 을 그대로 헬퍼 문구로 쓴다 — 입력 화면과 같은 문구를 쓰게 해서 두 화면이 다른 말을 하지 않게 한다.
- **`periodCode` 를 노출하지 않는다**(G8).

- [ ] **Step 1: 구현**
- [ ] **Step 2: `pnpm lint && pnpm typecheck`**
- [ ] **Step 3: 커밋**

### Task 12: 비교 화면

**Files:**
- Create: `frontend/src/components/simulation/compare/simulation-compare-columns.tsx`, `frontend/src/components/simulation/compare/simulation-compare-page.tsx`
- Test: `frontend/src/components/simulation/compare/simulation-compare-columns.test.ts`
- Modify: `app/(shell)/simulation/compare/page.tsx`, `app/(shell)/analysis/simulation/compare/page.tsx`

동작:
- `simulation-compare-page.tsx` 가 `useSimulationConditions` 를 **2개** 만든다(left/right). 각각 URL 의 `a.`/`b.` 로 초기화한다.
- `useMutation({ mutationFn: () => createSimulationReportPair([left.reportRequest!, right.reportRequest!]) })`
  — `Promise.all` 이 한쪽 실패를 전체 실패로 만든다(G10). **`Promise.allSettled` 로 바꾸지 않는다.**
- 계산 버튼은 **양쪽 조건이 모두 완성됐을 때만** 활성.
- 계산 성공 시 `router.replace(buildSimulationCompareHref({left, right}, variant))` 로 URL 을 조건과 동기화한다
  (새로고침 복원). 그리고 **각 리포트를 `simulationReportQueryKey` 로 캐시에 시딩**해 단일 리포트 화면으로
  넘어갈 때 재호출이 없게 한다.
- 오류 UI 는 `SimulationErrorNotice` **하나만** 띄운다.
- 결과 렌더는 `simulation-compare-columns.tsx` — 좌우 총비용 + `toMirrorCostRows` 미러 막대 + 중립 문구.
  각 컬럼 하단에 `상세 리포트 보기` 링크(`buildSimulationReportHref`).
- ≤767px 는 **세로 스택**.

- [ ] **Step 1~5**: 테스트(승자 강조·중립 문구·부분 성공 금지) → 실패 확인 → 구현 → 통과 → 커밋

### Task 13: B3 마감

- [ ] 리포트 화면의 `actions` 에 `비교에 추가` 링크 추가 → `buildSimulationCompareHref({ left: request, right: null }, variant)`
- [ ] `pnpm test && pnpm qa:verify`
- [ ] 브라우저 검증(5173): 리포트 → `비교에 추가` → 왼쪽이 채워진 비교 화면 → 오른쪽 조건 채우고 계산 → 좌우 렌더 → 새로고침 복원 → 한쪽을 없는 브랜드로 만들어 **전체 실패 + 오류 1개** 확인
- [ ] PR 생성 (`--base develop`)

---

## Self-Review

**1. 명세 커버리지**

| 명세 항목 | 담당 태스크 |
| --- | --- |
| D2 #1 업종 → 브랜드 순서 | Task 11 (편집기가 `SimulationBrandSearch` 재사용, 업종 전 미노출) |
| D2 #2 비프랜차이즈 `franchiseeId` 제거 | 기존 `buildSimulationReportRequest` + Task 1 코덱 테스트 |
| D2 #3 빈 `periodCode` 제거 | 기존 `toSimulationReportRequest` (변경 없음) |
| D2 #4·#5 커서 페이징 | 기존 `SimulationBrandSearch` (변경 없음) |
| D2 #6 `dataBaseYear` 노출 | Task 3 Step 1, Task 4 테스트 |
| D2 #7 결측 섹션 숨김 | Task 4 |
| D2 #8 권리금 분리 | Task 3 Step 3, Task 4 테스트 |
| D2 #9 `levy` null vs 0 | Task 2 `toCostBreakdown`, Task 4 테스트 |
| D2 #10 비교 전체 실패 | Task 12 |
| D2 #11 저장만 인증 | Task 7 |
| D2 #12 `size` 1~50 | 기존 `isPositiveStoreSize` + 서버 검증 → `client` kind 로 표시 |
| D2 #13 집계 범위 라벨 + 억 축약 | Task 2, Task 3 Step 5, Task 4 테스트 |
| D2 #14 `periodCode` 비노출 | Task 2 `describeSimulationPeriod`(표기 전용), Task 11 |
| D4-4 저장/이력 | Task 6~8 |
| D6 반응형 (표 가로 스크롤·비교 세로 스택) | Task 3 Step 4, Task 12 |
| TC-SIM-101 | 기존 `conditions.test.ts` + Task 1 |
| TC-SIM-102 | Task 4 `결측 섹션은 숨기고…` |
| TC-SIM-103 | 기존 `simulation-error-notice.test.ts` (변경 없음) + Task 5 Step 7 #5 |
| TC-SIM-104 | Task 7, Task 9 |
| TC-SIM-105 | Task 10, Task 12 |
| TC-SIM-106 | Task 2 · Task 4 |
| TC-SIM-107 | Task 2 `describeSimulationPeriod` + Task 11 |

**갭 (의도적으로 이 플랜 밖)**

- D8-1 #3 죽은 레거시 컴포넌트 3종 + `*-v1-legacy` 삭제 → share Feature 가 `/share/[token]` 정리를 마친 뒤.
  **B1~B3 에서 삭제하지 않는다** (지금 지우면 share 브랜치와 충돌).
- D8-3 백엔드 후속(`HttpMessageNotReadableException` 핸들러) → FE 범위 밖. 피커로만 제출해 우회한다.

**2. 플레이스홀더 스캔** — Task 7·8·10~12 의 스텝은 5스텝 사이클을 축약해 적었으나, **무엇을 테스트하고
무엇을 만드는지와 그 판정 규칙**은 명시했다. 실행자는 Task 1~4 의 사이클 형식을 그대로 따른다.

**3. 타입 일관성** — `SimulationReportVariant` 는 Task 1 에서 정의하고 Task 5·10·12 가 같은 이름으로 쓴다.
`simulationReportQueryKey` 는 Task 2 에서 정의하고 Task 5(입력 화면 시딩·리포트 조회)·Task 12(비교 시딩)가 쓴다.
`SimulationReportView` 의 `actions` prop 은 Task 4 에서 정의하고 Task 7(저장)·Task 13(비교에 추가)이 채운다.
