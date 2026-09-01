# 후보 상권 비교 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/recommend` 에서 고른 상권 2~4개를 한 표에서 견주는 `/recommend/compare` 화면을 만든다.

**Architecture:** URL 이 정본인 전용 라우트. 순수 모듈 3개(URL 코덱 · 쿼리 키 · 표 모델)를 먼저 세우고, 그 위에 표시 전용 컴포넌트와 데이터 조립 컴포넌트를 얹는다. 추천 점수는 URL 에 싣지 않고 `/recommend` 와 **똑같은 요청·똑같은 쿼리 키**로 다시 얻어 두 화면이 같은 숫자를 말하게 한다.

**Tech Stack:** Next.js App Router (client components), TanStack Query v5 (`useQuery`/`useQueries`), styled-components, Vitest (node 환경 + `renderToStaticMarkup` 문자열 단언)

**Spec:** [`docs/superpowers/specs/2026-09-01-commercial-compare-design.md`](../specs/2026-09-01-commercial-compare-design.md)

## Global Constraints

- `DESIGN.md` 토큰만 사용한다. 새 색·radius·shadow·spacing 토큰을 만들지 않는다.
- 백엔드 API 계약을 바꾸지 않는다. `fetchCommercials` · `fetchCommercialRecommendations` · `fetchCommercialProfile` 세 개만 쓴다.
- 테스트는 node 환경 + `renderToStaticMarkup` 문자열 단언. **jsdom·testing-library 를 새로 들이지 않는다.**
- 「없음」을 단언하는 테스트는 **구현을 일부러 되돌려 빨간불을 확인한 뒤** 커밋한다.
- 비활성 CTA 는 **무엇이 빠졌는지 반드시 말한다** + `aria-describedby` 로 묶는다 (PR #178 규약).
- 상권 개수 하한 `2`, 상한 `4`.
- 기간은 `RECOMMENDATION_PERIOD_CODE` (`'20233'`), `topN` 은 `RECOMMENDATION_TOP_N` (`5`).
- 커밋 메시지는 한국어 본문. 마지막 줄에 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- 각 태스크 끝에서 `npx vitest run <해당 테스트>` 통과를 확인한다. 마지막 태스크 뒤에 `pnpm qa:verify` 를 돌리고, 그 뒤 `git checkout -- next-env.d.ts` 로 빌드가 더럽힌 파일을 되돌린다.

---

### Task 1: URL 코덱 (`compare-url.ts`)

**Files:**

- Create: `src/lib/recommend/compare-url.ts`
- Test: `src/lib/recommend/compare-url.test.ts`

**Interfaces:**

- Consumes: `ReadableSearchParams`, `RECOMMEND_URL_PARAMS` (둘 다 `src/lib/recommend/recommend-url.ts` 에서 이미 export 중)
- Produces:
  - `COMPARE_MIN_COMMERCIALS: 2`, `COMPARE_MAX_COMMERCIALS: 4`
  - `COMPARE_COMMERCIALS_PARAM: 'commercialCodes'`
  - `type CompareUrlState = { districtCode: string | null; administrationCode: string | null; serviceCode: string | null; commercialCodes: string[]; truncated: boolean }`
  - `EMPTY_COMPARE_URL_STATE: CompareUrlState`
  - `parseCompareUrlState(params: ReadableSearchParams): CompareUrlState`
  - `createCompareHref(input: { districtCode: string; administrationCode: string; serviceCode: string; commercialCodes: readonly string[] }): string`
  - `isCompleteCompareState(state: CompareUrlState): boolean`

- [ ] **Step 1: Write the failing test**

`src/lib/recommend/compare-url.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  createCompareHref,
  EMPTY_COMPARE_URL_STATE,
  isCompleteCompareState,
  parseCompareUrlState,
} from './compare-url'

const parse = (query: string) =>
  parseCompareUrlState(new URLSearchParams(query))

const BASE =
  'districtCode=11680&administrationCode=11680640&serviceCode=CS100010'

describe('compare-url', () => {
  it('조건과 상권 코드를 읽는다', () => {
    const state = parse(`${BASE}&commercialCodes=3120197,3120192,3110958`)

    expect(state).toEqual({
      districtCode: '11680',
      administrationCode: '11680640',
      serviceCode: 'CS100010',
      commercialCodes: ['3120197', '3120192', '3110958'],
      truncated: false,
    })
    expect(isCompleteCompareState(state)).toBe(true)
  })

  it('생성과 파싱이 왕복한다', () => {
    const href = createCompareHref({
      districtCode: '11680',
      administrationCode: '11680640',
      serviceCode: 'CS100010',
      commercialCodes: ['3120197', '3120192'],
    })

    expect(href).toBe(
      '/recommend/compare?districtCode=11680&administrationCode=11680640&serviceCode=CS100010&commercialCodes=3120197%2C3120192',
    )
    expect(parse(href.split('?')[1] ?? '')).toEqual({
      districtCode: '11680',
      administrationCode: '11680640',
      serviceCode: 'CS100010',
      commercialCodes: ['3120197', '3120192'],
      truncated: false,
    })
  })

  it('4개를 넘기면 앞 4개만 남기고 잘랐다고 알린다', () => {
    const state = parse(`${BASE}&commercialCodes=1,2,3,4,5,6`)

    expect(state.commercialCodes).toEqual(['1', '2', '3', '4'])
    expect(state.truncated).toBe(true)
  })

  it('중복은 첫 등장만 남기되 URL 순서를 지킨다', () => {
    // 정렬하지 않는다. 열 순서는 사용자가 고른 순서여야 한다.
    const state = parse(`${BASE}&commercialCodes=9,3,9,1`)

    expect(state.commercialCodes).toEqual(['9', '3', '1'])
  })

  it('2개 미만이면 완성된 상태가 아니다', () => {
    expect(
      isCompleteCompareState(parse(`${BASE}&commercialCodes=3120197`)),
    ).toBe(false)
    expect(isCompleteCompareState(parse(BASE))).toBe(false)
  })

  it('조건이 하나라도 없으면 완성된 상태가 아니다', () => {
    const noService = parse(
      'districtCode=11680&administrationCode=11680640&commercialCodes=1,2',
    )

    expect(noService.serviceCode).toBeNull()
    expect(isCompleteCompareState(noService)).toBe(false)
  })

  it('빈 쿼리는 빈 상태다', () => {
    expect(parse('')).toEqual(EMPTY_COMPARE_URL_STATE)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/recommend/compare-url.test.ts`
Expected: FAIL — `Failed to resolve import "./compare-url"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/recommend/compare-url.ts`:

```ts
import {
  RECOMMEND_URL_PARAMS,
  type ReadableSearchParams,
} from './recommend-url'

/**
 * `/recommend/compare` 의 URL 상태.
 *
 * **점수를 싣지 않는다.** `recommend-url.ts` 가 이름을 싣지 않는 것과 같은 이유다 —
 * 링크가 낡은 값을 들고 되살아난다. 점수는 화면이 매번 다시 얻는다.
 *
 * 조건(자치구·행정동·업종)은 전 열 공통이라 `a.`/`b.` 접두사가 필요 없다.
 * 접두사는 좌우가 서로 다른 조건을 갖는 `simulation/compare` 의 문제를 푸는 장치다.
 */

export const COMPARE_MIN_COMMERCIALS = 2
export const COMPARE_MAX_COMMERCIALS = 4

export const COMPARE_COMMERCIALS_PARAM = 'commercialCodes'

const COMPARE_PATH = '/recommend/compare'

export type CompareUrlState = {
  districtCode: string | null
  administrationCode: string | null
  serviceCode: string | null
  commercialCodes: string[]
  /**
   * 상한을 넘겨 잘라냈는가. **화면이 이 사실을 말해야 하므로** 파서가 알려 준다 —
   * 조용히 자르면 사용자는 자기가 고른 것이 다 보이는 줄 안다.
   */
  truncated: boolean
}

export const EMPTY_COMPARE_URL_STATE: CompareUrlState = {
  districtCode: null,
  administrationCode: null,
  serviceCode: null,
  commercialCodes: [],
  truncated: false,
}

const readCode = (
  params: ReadableSearchParams,
  name: string,
): string | null => {
  const value = params.get(name)?.trim()

  return value ? value : null
}

/**
 * 중복은 첫 등장만 남기고 **순서는 URL 순서를 지킨다.**
 * `createStableCommercialCodes` 는 정렬하므로 여기서 쓰지 않는다 — 그것은 요청
 * 캐시 키를 만드는 물건이고, 열 순서는 사용자가 고른 순서여야 한다.
 */
const readCommercialCodes = (
  params: ReadableSearchParams,
): { codes: string[]; truncated: boolean } => {
  const raw = params.get(COMPARE_COMMERCIALS_PARAM)
  if (!raw) return { codes: [], truncated: false }

  const unique: string[] = []
  raw
    .split(',')
    .map(code => code.trim())
    .filter(Boolean)
    .forEach(code => {
      if (!unique.includes(code)) unique.push(code)
    })

  return {
    codes: unique.slice(0, COMPARE_MAX_COMMERCIALS),
    truncated: unique.length > COMPARE_MAX_COMMERCIALS,
  }
}

export const parseCompareUrlState = (
  params: ReadableSearchParams,
): CompareUrlState => {
  const { codes, truncated } = readCommercialCodes(params)

  return {
    districtCode: readCode(params, RECOMMEND_URL_PARAMS.district),
    administrationCode: readCode(params, RECOMMEND_URL_PARAMS.administration),
    serviceCode: readCode(params, RECOMMEND_URL_PARAMS.service),
    commercialCodes: codes,
    truncated,
  }
}

/** 표를 그릴 수 있는 상태인가. 조건 셋이 다 있고 상권이 하한 이상. */
export const isCompleteCompareState = (state: CompareUrlState): boolean =>
  Boolean(
    state.districtCode &&
    state.administrationCode &&
    state.serviceCode &&
    state.commercialCodes.length >= COMPARE_MIN_COMMERCIALS,
  )

export const createCompareHref = ({
  districtCode,
  administrationCode,
  serviceCode,
  commercialCodes,
}: {
  districtCode: string
  administrationCode: string
  serviceCode: string
  commercialCodes: readonly string[]
}): string => {
  const params = new URLSearchParams()
  params.set(RECOMMEND_URL_PARAMS.district, districtCode)
  params.set(RECOMMEND_URL_PARAMS.administration, administrationCode)
  params.set(RECOMMEND_URL_PARAMS.service, serviceCode)
  params.set(
    COMPARE_COMMERCIALS_PARAM,
    commercialCodes.slice(0, COMPARE_MAX_COMMERCIALS).join(','),
  )

  return `${COMPARE_PATH}?${params}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/recommend/compare-url.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/recommend/compare-url.ts src/lib/recommend/compare-url.test.ts
git commit -m "$(cat <<'EOF'
[FE] feat: 상권 비교 URL 코덱

/recommend/compare 의 URL 상태를 읽고 쓴다. 조건이 전 열 공통이라 simulation/compare
의 a./b. 접두사는 쓰지 않는다.

- 상권 2~4개. 4개 초과는 앞 4개만 남기고 truncated 로 알린다 — 화면이 잘랐다는
  사실을 말해야 하므로 조용히 버리지 않는다
- 중복은 첫 등장만 남기되 정렬하지 않는다. 열 순서는 사용자가 고른 순서다
- 점수는 싣지 않는다. 링크가 낡은 점수를 들고 되살아나지 않게 한다

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 쿼리 키 헬퍼 (`recommend-query-keys.ts`)

`/recommend` 와 비교 화면이 **글자 하나까지 같은 키**를 써야 캐시가 공유된다. 지금 키는 `recommend-page.tsx` 안에 인라인으로 흩어져 있어 새 화면이 베끼면 어긋나기 쉽다. 한 곳에서 만들게 뽑고, 기존 화면도 그것을 쓰게 바꾼다.

**Files:**

- Create: `src/lib/recommend/recommend-query-keys.ts`
- Test: `src/lib/recommend/recommend-query-keys.test.ts`
- Modify: `src/components/recommend/recommend-page.tsx` (인라인 키 3곳 → 헬퍼 호출)

**Interfaces:**

- Consumes: `createStableCommercialCodes` (`./recommend-state`)
- Produces:
  - `recommendCommercialsKey(districtCode?: string | null, administrationCode?: string | null): readonly unknown[]`
  - `recommendResultsKey(input: { districtCode?: string | null; administrationCode?: string | null; serviceCode?: string | null; periodCode: string; commercialCodesKey?: string | null }): readonly unknown[]`
  - `recommendProfileKey(commercialCode: string, serviceCode?: string | null, periodCode?: string): readonly unknown[]`
  - `createCommercialCodesKey(codes: readonly (string | number)[]): string`

- [ ] **Step 1: Write the failing test**

`src/lib/recommend/recommend-query-keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  createCommercialCodesKey,
  recommendCommercialsKey,
  recommendProfileKey,
  recommendResultsKey,
} from './recommend-query-keys'

describe('recommend query keys', () => {
  it('상권 목록 키는 recommend-page 의 모양과 같다', () => {
    expect(recommendCommercialsKey('11680', '11680640')).toEqual([
      'recommend',
      'regions',
      'commercials',
      '11680',
      '11680640',
    ])
  })

  it('추천 결과 키는 recommend-page 의 모양과 같다', () => {
    expect(
      recommendResultsKey({
        districtCode: '11680',
        administrationCode: '11680640',
        serviceCode: 'CS100010',
        periodCode: '20233',
        commercialCodesKey: '1,2,3',
      }),
    ).toEqual([
      'recommend',
      'results',
      '11680',
      '11680640',
      'CS100010',
      '20233',
      '1,2,3',
    ])
  })

  it('프로필 키는 recommend-page 의 모양과 같다', () => {
    expect(recommendProfileKey('3120197', 'CS100010', '20233')).toEqual([
      'recommend',
      'profile',
      '3120197',
      'CS100010',
      '20233',
    ])
  })

  it('코드 키는 정렬·중복제거 후 이어붙인다', () => {
    // recommend-state 의 commercialCodesKey 와 같은 규칙이어야 캐시가 맞는다.
    expect(createCommercialCodesKey(['3', 1, '2', '3'])).toBe('1,2,3')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/recommend/recommend-query-keys.test.ts`
Expected: FAIL — `Failed to resolve import "./recommend-query-keys"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/recommend/recommend-query-keys.ts`:

```ts
import { createStableCommercialCodes } from './recommend-state'

/**
 * `/recommend` 와 `/recommend/compare` 가 **공유하는** React Query 키.
 *
 * 두 화면이 같은 데이터를 받으려면 키가 글자 하나까지 같아야 한다. 키를 각자
 * 인라인으로 적으면 어긋나도 아무도 모르고, 증상은 "같은 화면인데 숫자가 다르다"로
 * 나타난다. 그래서 여기서만 만든다.
 */

export const recommendCommercialsKey = (
  districtCode?: string | null,
  administrationCode?: string | null,
) =>
  [
    'recommend',
    'regions',
    'commercials',
    districtCode,
    administrationCode,
  ] as const

export const recommendResultsKey = ({
  districtCode,
  administrationCode,
  serviceCode,
  periodCode,
  commercialCodesKey,
}: {
  districtCode?: string | null
  administrationCode?: string | null
  serviceCode?: string | null
  periodCode: string
  commercialCodesKey?: string | null
}) =>
  [
    'recommend',
    'results',
    districtCode,
    administrationCode,
    serviceCode,
    periodCode,
    commercialCodesKey,
  ] as const

export const recommendProfileKey = (
  commercialCode: string,
  serviceCode?: string | null,
  periodCode?: string,
) => ['recommend', 'profile', commercialCode, serviceCode, periodCode] as const

/**
 * 추천 요청의 캐시 키 문자열. `recommend-state` 의 `commercialCodesKey` 와 **같은 규칙**이다
 * (`createStableCommercialCodes(...).join(',')`). 한쪽만 바뀌면 캐시가 갈라진다.
 */
export const createCommercialCodesKey = (
  codes: readonly (string | number)[],
): string => createStableCommercialCodes(codes).join(',')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/recommend/recommend-query-keys.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 기존 화면을 헬퍼로 바꾼다**

`src/components/recommend/recommend-page.tsx` 에서 인라인 키 3곳을 교체한다. **배열 내용은 그대로 두고 표현만 바꾼다** — 값이 달라지면 캐시가 갈라진다.

import 에 추가:

```ts
import {
  recommendCommercialsKey,
  recommendProfileKey,
  recommendResultsKey,
} from '@/lib/recommend/recommend-query-keys'
```

`~916행` 상권 목록 쿼리:

```ts
    queryKey: recommendCommercialsKey(
      state.draft.district?.code,
      state.draft.administration?.code,
    ),
```

`~961행` 추천 결과 쿼리:

```ts
    queryKey: recommendResultsKey({
      districtCode: state.submitted?.district.code,
      administrationCode: state.submitted?.administration.code,
      serviceCode: state.submitted?.service.code,
      periodCode: RECOMMENDATION_PERIOD_CODE,
      commercialCodesKey: state.submitted?.commercialCodesKey,
    }),
```

`~1010행` 프로필 쿼리(`useQueries` 안):

```ts
      queryKey: recommendProfileKey(
        result.commercialCode,
        state.submitted?.service.code,
        RECOMMENDATION_PERIOD_CODE,
      ),
```

- [ ] **Step 6: 기존 테스트가 그대로 통과하는지 확인**

Run: `npx vitest run src/components/recommend src/lib/recommend`
Expected: PASS — 키 표현만 바꿨으므로 기존 단언이 하나도 깨지지 않아야 한다. 깨지면 값이 달라진 것이니 되돌려 맞춘다.

- [ ] **Step 7: Commit**

```bash
git add src/lib/recommend/recommend-query-keys.ts src/lib/recommend/recommend-query-keys.test.ts src/components/recommend/recommend-page.tsx
git commit -m "$(cat <<'EOF'
[FE] refactor: 추천 쿼리 키를 한 곳에서 만든다

비교 화면이 /recommend 와 캐시를 공유하려면 키가 글자 하나까지 같아야 한다.
지금은 recommend-page.tsx 안에 인라인으로 흩어져 있어 새 화면이 베끼면 어긋나기
쉽고, 어긋나도 아무도 모른 채 "같은 상권인데 숫자가 다르다"로만 나타난다.

키 값은 바꾸지 않았다. 표현만 헬퍼로 옮겼다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 표 모델 (`compare-presentation.ts`)

**Files:**

- Create: `src/lib/recommend/compare-presentation.ts`
- Test: `src/lib/recommend/compare-presentation.test.ts`

**Interfaces:**

- Consumes: `CandidateCommercial`, `CommercialProfile` (`@/types/recommend`), `resolveMetricPolarity`, `resolveScoreQuality`, `COMPOSITE_SCORE_POLARITY`, `type ScoreQuality` (`./metric-polarity`), `formatAnalysisValue` (`@/lib/analysis/presentation`)
- Produces:
  - `COMPARE_NEUTRAL_NOTICE: string`
  - `COMPARE_EMPTY_CELL: '—'`
  - `type CompareColumnInput = { commercialCode: string; candidate: CandidateCommercial | null; profile: CommercialProfile | null }`
  - `type CompareScoreCell = { commercialCode: string; score: number | null; quality: ScoreQuality }`
  - `type CompareScoreRow = { key: string; label: string; cells: CompareScoreCell[] }`
  - `type CompareMetricCell = { commercialCode: string; value: number | null; formatted: string; isHighest: boolean }`
  - `type CompareMetricRow = { key: string; label: string; cells: CompareMetricCell[] }`
  - `toCompareScoreRows(columns: readonly CompareColumnInput[]): CompareScoreRow[]`
  - `toCompareMetricRows(columns: readonly CompareColumnInput[]): CompareMetricRow[]`

- [ ] **Step 1: Write the failing test**

`src/lib/recommend/compare-presentation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  toCompareMetricRows,
  toCompareScoreRows,
  type CompareColumnInput,
} from './compare-presentation'
import type { CandidateCommercial, CommercialProfile } from '@/types/recommend'

const candidate = (
  code: string,
  compositeScore: number | null,
  scores: Partial<Record<string, number | null>> = {},
): CandidateCommercial => ({
  rank: 1,
  commercialCode: code,
  commercialName: `상권 ${code}`,
  compositeScore,
  grade: null,
  summaryLabel: null,
  selectionReason: null,
  opportunityLabel: null,
  riskLabel: null,
  reasonTags: [],
  metricBreakdown: Object.entries(scores).map(([metricCode, score]) => ({
    metricType: {
      code: metricCode,
      name: metricCode,
      description: '',
      scoreDescription: '',
    },
    score: score ?? null,
    grade: null,
    summaryLabel: null,
  })),
})

const profile = (
  code: string,
  keyMetrics: CommercialProfile['keyMetrics'],
): CommercialProfile => ({
  commercialCode: code,
  commercialName: `상권 ${code}`,
  districtCode: '11680',
  districtName: '강남구',
  administrationCode: '11680640',
  administrationName: '역삼1동',
  centerLng: 127,
  centerLat: 37.5,
  boundaryCoords: [],
  keyMetrics,
})

const column = (
  code: string,
  c: CandidateCommercial | null,
  p: CommercialProfile | null,
): CompareColumnInput => ({ commercialCode: code, candidate: c, profile: p })

describe('toCompareScoreRows', () => {
  it('종합 점수와 지표 4종을 행으로 세운다', () => {
    const rows = toCompareScoreRows([
      column('A', candidate('A', 84, { OPPORTUNITY_SCORE: 90 }), null),
    ])

    expect(rows.map(row => row.key)).toEqual([
      'composite',
      'OPPORTUNITY_SCORE',
      'RISK_SCORE',
      'CONGESTION_SCORE',
      'RESIDENT_POPULATION_SCORE',
    ])
    expect(rows[0].cells[0]).toEqual({
      commercialCode: 'A',
      score: 84,
      quality: 'good',
    })
  })

  it('위험도가 높으면 나쁨으로 판정한다', () => {
    // lower-is-better 를 뒤집지 않으면 "위험도 100"이 초록으로 칠해진다.
    const rows = toCompareScoreRows([
      column('A', candidate('A', null, { RISK_SCORE: 95 }), null),
    ])
    const risk = rows.find(row => row.key === 'RISK_SCORE')

    expect(risk?.cells[0].quality).toBe('poor')
  })

  it('점수가 없으면 중립이다', () => {
    const rows = toCompareScoreRows([column('A', null, null)])

    expect(rows[0].cells[0]).toEqual({
      commercialCode: 'A',
      score: null,
      quality: 'neutral',
    })
  })
})

describe('toCompareMetricRows', () => {
  const metrics = (
    over: Partial<NonNullable<CommercialProfile['keyMetrics']>>,
  ) =>
    ({
      totalSalesAmount: null,
      totalFootTraffic: null,
      totalStoreCount: null,
      similarStoreCount: null,
      openingRate: null,
      closureRate: null,
      totalResidentPopulation: null,
      monthlyAverageIncomeAmount: null,
      totalFacilityCount: null,
      ...over,
    }) as NonNullable<CommercialProfile['keyMetrics']>

  it('원지표 9행을 세운다', () => {
    const rows = toCompareMetricRows([column('A', null, null)])

    expect(rows).toHaveLength(9)
    expect(rows.map(row => row.key)).toEqual([
      'totalSalesAmount',
      'totalFootTraffic',
      'totalStoreCount',
      'similarStoreCount',
      'openingRate',
      'closureRate',
      'totalResidentPopulation',
      'monthlyAverageIncomeAmount',
      'totalFacilityCount',
    ])
  })

  it('최댓값에만 배지를 붙인다', () => {
    const rows = toCompareMetricRows([
      column('A', null, profile('A', metrics({ totalStoreCount: 10 }))),
      column('B', null, profile('B', metrics({ totalStoreCount: 30 }))),
      column('C', null, profile('C', metrics({ totalStoreCount: 20 }))),
    ])
    const row = rows.find(r => r.key === 'totalStoreCount')!

    expect(row.cells.map(cell => cell.isHighest)).toEqual([false, true, false])
  })

  it('값이 모두 같으면 배지를 붙이지 않는다', () => {
    const rows = toCompareMetricRows([
      column('A', null, profile('A', metrics({ totalStoreCount: 10 }))),
      column('B', null, profile('B', metrics({ totalStoreCount: 10 }))),
    ])
    const row = rows.find(r => r.key === 'totalStoreCount')!

    expect(row.cells.every(cell => !cell.isHighest)).toBe(true)
  })

  it('값이 하나뿐이면 배지를 붙이지 않는다', () => {
    const rows = toCompareMetricRows([
      column('A', null, profile('A', metrics({ totalStoreCount: 10 }))),
      column('B', null, null),
    ])
    const row = rows.find(r => r.key === 'totalStoreCount')!

    expect(row.cells.every(cell => !cell.isHighest)).toBe(true)
  })

  it('최댓값이 동점이면 동점 셀 모두에 붙인다', () => {
    const rows = toCompareMetricRows([
      column('A', null, profile('A', metrics({ totalStoreCount: 30 }))),
      column('B', null, profile('B', metrics({ totalStoreCount: 30 }))),
      column('C', null, profile('C', metrics({ totalStoreCount: 10 }))),
    ])
    const row = rows.find(r => r.key === 'totalStoreCount')!

    expect(row.cells.map(cell => cell.isHighest)).toEqual([true, true, false])
  })

  it('값이 없으면 대시로 적고 최댓값 계산에서 뺀다', () => {
    const rows = toCompareMetricRows([column('A', null, null)])
    const row = rows.find(r => r.key === 'totalStoreCount')!

    expect(row.cells[0].formatted).toBe('—')
    expect(row.cells[0].isHighest).toBe(false)
  })

  it('매출은 억/만원으로 적는다', () => {
    const rows = toCompareMetricRows([
      column(
        'A',
        null,
        profile('A', metrics({ totalSalesAmount: 84_520_000 })),
      ),
    ])
    const row = rows.find(r => r.key === 'totalSalesAmount')!

    expect(row.cells[0].formatted).toBe('8452만원')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/recommend/compare-presentation.test.ts`
Expected: FAIL — `Failed to resolve import "./compare-presentation"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/recommend/compare-presentation.ts`:

```ts
import { formatAnalysisValue } from '@/lib/analysis/presentation'
import type { CandidateCommercial, CommercialProfile } from '@/types/recommend'

import {
  COMPOSITE_SCORE_POLARITY,
  resolveMetricPolarity,
  resolveScoreQuality,
  type ScoreQuality,
} from './metric-polarity'

/**
 * 비교 표의 **표시 로직**. 네트워크도 React 도 모른다.
 *
 * 점수는 방향이 정의돼 있어 색으로 판단하고, 원지표는 방향이 정의돼 있지 않아
 * 사실만 말한다. 이 구분이 이 모듈의 존재 이유다 — §5.2 참고.
 */

/**
 * 화면에서 **빼지 않는다.** 점수 옆에 색이 붙는 순간 사용자는 그것을 "더 나은
 * 선택"으로 읽는다. 이 표에는 그 판단의 근거가 없다.
 */
export const COMPARE_NEUTRAL_NOTICE =
  '점수는 추천 기준으로 매긴 것이고, 아래 지표는 값 그대로예요. 어느 상권이 더 나은지는 업종과 계획에 따라 달라져요.'

/** 값이 없는 칸. 표에서는 '데이터 없음'보다 짧아야 열이 안 밀린다. */
export const COMPARE_EMPTY_CELL = '—'

export type CompareColumnInput = {
  commercialCode: string
  candidate: CandidateCommercial | null
  profile: CommercialProfile | null
}

export type CompareScoreCell = {
  commercialCode: string
  score: number | null
  quality: ScoreQuality
}

export type CompareScoreRow = {
  key: string
  label: string
  cells: CompareScoreCell[]
}

export type CompareMetricCell = {
  commercialCode: string
  value: number | null
  formatted: string
  isHighest: boolean
}

export type CompareMetricRow = {
  key: string
  label: string
  cells: CompareMetricCell[]
}

/** 종합 점수는 `metricType` 이 없어 breakdown 이 아니라 따로 읽는다. */
const COMPOSITE_ROW = { key: 'composite', label: '종합 점수' } as const

const SCORE_ROWS: readonly { key: string; label: string }[] = [
  { key: 'OPPORTUNITY_SCORE', label: '기회도' },
  { key: 'RISK_SCORE', label: '위험도' },
  { key: 'CONGESTION_SCORE', label: '혼잡도' },
  { key: 'RESIDENT_POPULATION_SCORE', label: '거주 수요' },
]

type MetricKey = keyof NonNullable<CommercialProfile['keyMetrics']>

const METRIC_ROWS: readonly { key: MetricKey; label: string; unit: string }[] =
  [
    { key: 'totalSalesAmount', label: '월 매출', unit: '원' },
    { key: 'totalFootTraffic', label: '유동인구', unit: '명' },
    { key: 'totalStoreCount', label: '점포 수', unit: '개' },
    { key: 'similarStoreCount', label: '동일 업종 점포 수', unit: '개' },
    { key: 'openingRate', label: '개업률', unit: '%' },
    { key: 'closureRate', label: '폐업률', unit: '%' },
    { key: 'totalResidentPopulation', label: '상주인구', unit: '명' },
    { key: 'monthlyAverageIncomeAmount', label: '월 평균 소득', unit: '원' },
    { key: 'totalFacilityCount', label: '집객시설', unit: '개' },
  ]

const readScore = (
  candidate: CandidateCommercial | null,
  metricCode: string,
): number | null => {
  const item = candidate?.metricBreakdown?.find(
    entry => entry.metricType?.code === metricCode,
  )

  return typeof item?.score === 'number' ? item.score : null
}

const isFinite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const toCompareScoreRows = (
  columns: readonly CompareColumnInput[],
): CompareScoreRow[] => [
  {
    ...COMPOSITE_ROW,
    cells: columns.map(({ commercialCode, candidate }) => {
      const score = isFinite(candidate?.compositeScore)
        ? candidate!.compositeScore
        : null

      return {
        commercialCode,
        score,
        quality: resolveScoreQuality(score, COMPOSITE_SCORE_POLARITY),
      }
    }),
  },
  ...SCORE_ROWS.map(row => ({
    ...row,
    cells: columns.map(({ commercialCode, candidate }) => {
      const score = readScore(candidate, row.key)

      return {
        commercialCode,
        score,
        // 방향은 여기서 정하지 않는다. METRIC_POLARITY 가 정본이고,
        // 모르는 코드면 neutral 이라 색으로 판단하지 않는다.
        quality: resolveScoreQuality(score, resolveMetricPolarity(row.key)),
      }
    }),
  })),
]

export const toCompareMetricRows = (
  columns: readonly CompareColumnInput[],
): CompareMetricRow[] =>
  METRIC_ROWS.map(row => {
    const values = columns.map(({ profile }) => {
      const raw = profile?.keyMetrics?.[row.key]

      return isFinite(raw) ? raw : null
    })

    const present = values.filter(isFinite)
    const max = present.length > 0 ? Math.max(...present) : null
    /**
     * 「가장 높음」은 **견줄 것이 있을 때만** 참이다. 값이 하나뿐이거나 전부 같으면
     * 배지를 붙이지 않는다 — 그때 「가장 높음」은 아무 정보도 주지 않으면서
     * 그 열이 우세하다는 인상만 준다.
     */
    const comparable =
      present.length >= 2 && present.some(value => value !== max)

    return {
      key: row.key,
      label: row.label,
      cells: columns.map((column, index) => {
        const value = values[index]

        return {
          commercialCode: column.commercialCode,
          value,
          formatted:
            value === null
              ? COMPARE_EMPTY_CELL
              : formatAnalysisValue(value, row.unit),
          isHighest: comparable && value === max,
        }
      }),
    }
  })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/recommend/compare-presentation.test.ts`
Expected: PASS (10 tests)

If `'8452만원'` 단언이 실패하면 `formatKoreanMoney` 의 실제 출력을 확인해 **단언을 실제 출력에 맞춘다**(포매터를 고치지 않는다 — 다른 화면이 쓰고 있다).

- [ ] **Step 5: Commit**

```bash
git add src/lib/recommend/compare-presentation.ts src/lib/recommend/compare-presentation.test.ts
git commit -m "$(cat <<'EOF'
[FE] feat: 상권 비교 표 모델

점수 5행(색 있음)과 원지표 9행(색 없음)을 나눠 세운다.

점수는 기존 metric-polarity 를 그대로 쓴다 — 위험도·혼잡도의 lower-is-better
뒤집기가 이미 들어 있어 "위험도 100"이 초록이 되는 일을 막는다.

원지표에는 좋다/나쁘다를 붙이지 않는다. METRIC_POLARITY 에 이 9개의 방향이 없고,
실제로 모호하다(점포 수가 많으면 활발한 것인가 경쟁이 심한 것인가). 대신 최댓값에
사실 배지만 붙이되, 견줄 것이 있을 때만 붙인다 — 값이 하나뿐이거나 전부 같으면
「가장 높음」은 정보 없이 우세하다는 인상만 준다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 비교 표 컴포넌트 (`recommend-compare-table.tsx`)

표시 전용. 네트워크를 모른다.

**Files:**

- Create: `src/components/recommend/compare/recommend-compare-table.tsx`
- Test: `src/components/recommend/compare/recommend-compare-table.test.ts`

**Interfaces:**

- Consumes: Task 3 의 `toCompareScoreRows` · `toCompareMetricRows` · `COMPARE_NEUTRAL_NOTICE` · `CompareColumnInput`; `getScoreQualityColor` · `getScoreQualityLabel` (`@/lib/recommend/metric-polarity`); `createAnalysisResultHref` · `ANALYSIS_PERIOD_CODE` (`@/lib/analysis/selection`)
- Produces:
  - `type RecommendCompareTableProps = { columns: readonly CompareColumnInput[]; districtCode: string; administrationCode: string; serviceCode: string; failedProfileCodes?: readonly string[] }`
  - default export `RecommendCompareTable`

- [ ] **Step 1: Write the failing test**

`src/components/recommend/compare/recommend-compare-table.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RecommendCompareTable from '@/components/recommend/compare/recommend-compare-table'
import type { CompareColumnInput } from '@/lib/recommend/compare-presentation'
import type { CandidateCommercial, CommercialProfile } from '@/types/recommend'

const candidate = (code: string, name: string): CandidateCommercial => ({
  rank: 2,
  commercialCode: code,
  commercialName: name,
  compositeScore: 84,
  grade: null,
  summaryLabel: null,
  selectionReason: null,
  opportunityLabel: null,
  riskLabel: null,
  reasonTags: [],
  metricBreakdown: [
    {
      metricType: {
        code: 'RISK_SCORE',
        name: '위험도',
        description: '',
        scoreDescription: '',
      },
      score: 95,
      grade: null,
      summaryLabel: null,
    },
  ],
})

const profile = (code: string, name: string): CommercialProfile => ({
  commercialCode: code,
  commercialName: name,
  districtCode: '11680',
  districtName: '강남구',
  administrationCode: '11680640',
  administrationName: '역삼1동',
  centerLng: 127,
  centerLat: 37.5,
  boundaryCoords: [],
  keyMetrics: {
    totalSalesAmount: 84_520_000,
    totalFootTraffic: 1000,
    totalStoreCount: 30,
    similarStoreCount: 5,
    openingRate: 2.1,
    closureRate: 1.2,
    totalResidentPopulation: 500,
    monthlyAverageIncomeAmount: 3_000_000,
    totalFacilityCount: 12,
  },
})

const columns: CompareColumnInput[] = [
  {
    commercialCode: '3120197',
    candidate: candidate('3120197', '역삼역'),
    profile: profile('3120197', '역삼역'),
  },
  {
    commercialCode: '3110958',
    candidate: candidate('3110958', '역삼역 4번'),
    profile: profile('3110958', '역삼역 4번'),
  },
]

const render = (
  props: Partial<Parameters<typeof RecommendCompareTable>[0]> = {},
) =>
  renderToStaticMarkup(
    createElement(RecommendCompareTable, {
      columns,
      districtCode: '11680',
      administrationCode: '11680640',
      serviceCode: 'CS100010',
      ...props,
    }),
  )

describe('RecommendCompareTable', () => {
  it('상권 이름과 순위를 열 머리에 적는다', () => {
    const markup = render()

    expect(markup).toContain('역삼역')
    expect(markup).toContain('역삼역 4번')
    expect(markup).toContain('2위')
  })

  it('중립 문구를 항상 그린다', () => {
    expect(render()).toContain('어느 상권이 더 나은지는 업종과 계획에 따라')
  })

  it('열마다 상권 분석 결과로 가는 링크를 만든다', () => {
    const markup = render()
    const links = markup.match(/<a[^>]*data-analysis-link="true"[^>]*>/g) ?? []

    expect(links).toHaveLength(2)
    expect(links[0]).toContain('href="/analysis/result?')
    expect(links[0]).toContain('commercialCode=3120197')
    expect(links[0]).toContain('serviceCode=CS100010')
    expect(links[1]).toContain('commercialCode=3110958')
  })

  it('원지표 행에는 품질 색을 쓰지 않는다', () => {
    // 방향이 정의되지 않은 지표를 색으로 판단하면 화면이 조용히 반대로 말한다.
    const markup = render()
    const metricSection = markup.split('data-compare-metrics="true"')[1] ?? ''

    expect(metricSection).not.toContain('--score-high')
    expect(metricSection).not.toContain('--score-low')
    expect(metricSection).not.toContain('--score-mid')
  })

  it('점수 행에는 품질 색을 쓴다', () => {
    const markup = render()
    const scoreSection = markup.split('data-compare-scores="true"')[1] ?? ''

    expect(scoreSection).toContain('--score-')
  })

  it('프로필을 못 불러온 열은 그 사실만 말하고 나머지 열은 남긴다', () => {
    const markup = render({
      columns: [
        columns[0],
        {
          commercialCode: '3110958',
          candidate: candidate('3110958', '역삼역 4번'),
          profile: null,
        },
      ],
      failedProfileCodes: ['3110958'],
    })

    expect(markup).toContain('지표를 불러오지 못했어요')
    expect(markup).toContain('역삼역')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/recommend/compare/recommend-compare-table.test.ts`
Expected: FAIL — `Failed to resolve import "@/components/recommend/compare/recommend-compare-table"`

- [ ] **Step 3: Write minimal implementation**

`src/components/recommend/compare/recommend-compare-table.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import styled from 'styled-components'

import {
  ANALYSIS_PERIOD_CODE,
  createAnalysisResultHref,
} from '@/lib/analysis/selection'
import {
  COMPARE_NEUTRAL_NOTICE,
  toCompareMetricRows,
  toCompareScoreRows,
  type CompareColumnInput,
} from '@/lib/recommend/compare-presentation'
import {
  getScoreQualityColor,
  getScoreQualityLabel,
} from '@/lib/recommend/metric-polarity'

export type RecommendCompareTableProps = {
  columns: readonly CompareColumnInput[]
  districtCode: string
  administrationCode: string
  serviceCode: string
  /** 프로필을 못 받은 열. 그 열의 원지표 자리에만 사실을 적는다. */
  failedProfileCodes?: readonly string[]
}

const Root = styled.section`
  display: grid;
  gap: 16px;
`

/* 표가 넘칠 때 **페이지 본문이 아니라 이 컨테이너만** 가로로 구른다. */
const Scroller = styled.div`
  overflow-x: auto;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`

/* 지표 이름이 사라지면 숫자만 남아 표가 의미를 잃는다. 첫 열을 붙잡아 둔다. */
const stickyFirstColumn = `
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--color-surface);
`

const RowHead = styled.th`
  ${stickyFirstColumn}
  min-width: 132px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border-200);
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
`

const CornerHead = styled.th`
  ${stickyFirstColumn}
  z-index: 2;
  padding: 14px;
  border-bottom: 1px solid var(--color-border-300);
`

const ColumnHead = styled.th`
  min-width: 152px;
  padding: 14px;
  border-bottom: 1px solid var(--color-border-300);
  text-align: left;
  vertical-align: top;
`

const Rank = styled.span`
  display: block;
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 700;
`

const Name = styled.span`
  display: block;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
  word-break: keep-all;
`

const Cell = styled.td`
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border-200);
  color: var(--color-text-900);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const ScoreValue = styled.span<{ $color: string }>`
  color: ${props => props.$color};
  font-weight: 700;
`

/* 공유 컴포넌트가 아니다 — `recommend-result-list.tsx` 도 같은 것을 지역으로 두고 있다.
   등급 문구는 눈으로는 색이 말하고, 보조기기에는 글자로 말해야 한다. */
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`

const HighestBadge = styled.span`
  margin-left: 6px;
  padding: 2px 6px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  color: var(--color-text-600);
  font-size: 11px;
  font-weight: 700;
`

const GroupCaption = styled.caption`
  padding: 14px 14px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: left;
`

const Notice = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
`

const Links = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const AnalysisLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-900);
  font-size: 13px;
  font-weight: 700;

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-primary-700);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

const EMPTY_SCORE = '—'

export default function RecommendCompareTable({
  columns,
  districtCode,
  administrationCode,
  serviceCode,
  failedProfileCodes = [],
}: RecommendCompareTableProps) {
  const scoreRows = toCompareScoreRows(columns)
  const metricRows = toCompareMetricRows(columns)
  const failed = new Set(failedProfileCodes)

  const renderHead = (caption: string) => (
    <>
      <GroupCaption>{caption}</GroupCaption>
      <thead>
        <tr>
          <CornerHead scope="col">지표</CornerHead>
          {columns.map(column => (
            <ColumnHead key={column.commercialCode} scope="col">
              {typeof column.candidate?.rank === 'number' ? (
                <Rank>{column.candidate.rank}위</Rank>
              ) : null}
              <Name>
                {column.candidate?.commercialName ??
                  column.profile?.commercialName ??
                  `상권 ${column.commercialCode}`}
              </Name>
            </ColumnHead>
          ))}
        </tr>
      </thead>
    </>
  )

  return (
    <Root>
      <Scroller>
        <Table data-compare-scores="true">
          {renderHead(
            '추천이 매긴 점수예요. 100점에 가까울수록 그 지표가 강해요.',
          )}
          <tbody>
            {scoreRows.map(row => (
              <tr key={row.key}>
                <RowHead scope="row">{row.label}</RowHead>
                {row.cells.map(cell => (
                  <Cell key={`${row.key}-${cell.commercialCode}`}>
                    {cell.score === null ? (
                      EMPTY_SCORE
                    ) : (
                      <ScoreValue $color={getScoreQualityColor(cell.quality)}>
                        {cell.score}
                        {getScoreQualityLabel(cell.quality) ? (
                          <VisuallyHidden>
                            {` ${getScoreQualityLabel(cell.quality)}`}
                          </VisuallyHidden>
                        ) : null}
                      </ScoreValue>
                    )}
                  </Cell>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </Scroller>

      <Scroller>
        <Table data-compare-metrics="true">
          {renderHead(
            '값 그대로예요. 어느 쪽이 좋은지는 계획에 따라 달라져요.',
          )}
          <tbody>
            {metricRows.map(row => (
              <tr key={row.key}>
                <RowHead scope="row">{row.label}</RowHead>
                {row.cells.map(cell => (
                  <Cell key={`${row.key}-${cell.commercialCode}`}>
                    {failed.has(cell.commercialCode)
                      ? '지표를 불러오지 못했어요'
                      : cell.formatted}
                    {cell.isHighest && !failed.has(cell.commercialCode) ? (
                      <HighestBadge>가장 높음</HighestBadge>
                    ) : null}
                  </Cell>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </Scroller>

      <Notice>{COMPARE_NEUTRAL_NOTICE}</Notice>

      <Links>
        {columns.map(column => (
          <AnalysisLink
            key={column.commercialCode}
            data-analysis-link="true"
            href={createAnalysisResultHref(
              {
                districtCode,
                administrationCode,
                commercialCode: column.commercialCode,
                serviceCode,
                periodCode: ANALYSIS_PERIOD_CODE,
              },
              'summary',
            )}
          >
            {column.candidate?.commercialName ?? column.commercialCode} 분석
            보기
            <ArrowUpRight aria-hidden="true" />
          </AnalysisLink>
        ))}
      </Links>
    </Root>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/recommend/compare/recommend-compare-table.test.ts`
Expected: PASS (6 tests)

`VisuallyHidden` 은 공유 컴포넌트가 아니라 위 코드에서 정의한 지역 styled component 다 — `recommend-result-list.tsx:443` 도 같은 것을 지역으로 두고 있어 그 패턴을 따른다.

- [ ] **Step 5: 부재 단언이 진짜로 잡는지 되돌려 확인한다**

`recommend-compare-table.tsx` 에서 원지표 `Cell` 을 일부러 색칠하게 바꾼다:

```tsx
                  <Cell key={`${row.key}-${cell.commercialCode}`} style={{ color: 'var(--score-high)' }}>
```

Run: `npx vitest run src/components/recommend/compare/recommend-compare-table.test.ts`
Expected: FAIL — `원지표 행에는 품질 색을 쓰지 않는다`

그다음 **되돌린다**(`style` 제거). 다시 Run → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/recommend/compare/
git commit -m "$(cat <<'EOF'
[FE] feat: 상권 비교 표 컴포넌트

행=지표, 열=상권. 점수 표와 원지표 표를 나눠 그린다.

- 첫 열(지표 이름)을 sticky 로 붙잡는다. 가로로 구를 때 이름이 사라지면
  숫자만 남아 표가 의미를 잃는다
- 표가 넘칠 때 페이지 본문이 아니라 컨테이너만 구른다
- 원지표에는 색을 쓰지 않는다. 부재 단언을 되돌려 빨간불을 확인하고 커밋했다
- 프로필을 못 받은 열은 그 자리에만 사실을 적고 나머지 열은 남긴다

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 데이터 조립과 라우트

**Files:**

- Create: `src/components/recommend/compare/recommend-compare-page.tsx`
- Create: `app/(shell)/recommend/compare/page.tsx`
- Test: `src/components/recommend/compare/recommend-compare-data.test.ts`
- Create: `src/lib/recommend/compare-data.ts` (순수 조립 함수 — 컴포넌트에서 떼어 내 테스트 가능하게)

**Interfaces:**

- Consumes: Task 1 `parseCompareUrlState`·`isCompleteCompareState`; Task 2 키 헬퍼; Task 3 타입; Task 4 컴포넌트
- Produces:
  - `buildCompareRecommendationRequest(input: { serviceCode: string; allCommercialCodes: readonly string[] }): RecommendationRequest`
  - `selectCompareColumns(input: { requestedCodes: readonly string[]; candidates: readonly CandidateCommercial[]; profileByCode: Readonly<Record<string, CommercialProfile | null>> }): { columns: CompareColumnInput[]; missingCodes: string[] }`

- [ ] **Step 1: Write the failing test**

`src/components/recommend/compare/recommend-compare-data.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  buildCompareRecommendationRequest,
  selectCompareColumns,
} from '@/lib/recommend/compare-data'
import type { CandidateCommercial } from '@/types/recommend'

const candidate = (code: string, rank: number): CandidateCommercial => ({
  rank,
  commercialCode: code,
  commercialName: `상권 ${code}`,
  compositeScore: 50,
  grade: null,
  summaryLabel: null,
  selectionReason: null,
  opportunityLabel: null,
  riskLabel: null,
  reasonTags: [],
  metricBreakdown: [],
})

describe('buildCompareRecommendationRequest', () => {
  it('선택된 코드가 아니라 행정동 전체 코드로 요청한다', () => {
    // 🔴 여기가 이 화면에서 가장 깨지기 쉬운 곳이다.
    // 선택된 3개만 넘기면 topN 이 최소 5로 clamp 되고 점수가 그 3개 안에서
    // 다시 계산돼, /recommend 와 같은 상권에 다른 숫자를 말하게 된다.
    const request = buildCompareRecommendationRequest({
      serviceCode: 'CS100010',
      allCommercialCodes: ['5', '1', '3', '2', '4', '6', '7'],
    })

    expect(request.commercialCodes).toEqual(['1', '2', '3', '4', '5', '6', '7'])
    expect(request.serviceCode).toBe('CS100010')
    expect(request.periodCode).toBe('20233')
    expect(request.topN).toBe(5)
  })
})

describe('selectCompareColumns', () => {
  const candidates = [candidate('A', 1), candidate('B', 2), candidate('C', 3)]

  it('URL 순서대로 열을 세운다', () => {
    const { columns } = selectCompareColumns({
      requestedCodes: ['C', 'A'],
      candidates,
      profileByCode: {},
    })

    expect(columns.map(column => column.commercialCode)).toEqual(['C', 'A'])
    expect(columns[0].candidate?.rank).toBe(3)
  })

  it('추천 결과에 없는 코드는 빼고 사실을 알린다', () => {
    const { columns, missingCodes } = selectCompareColumns({
      requestedCodes: ['A', 'Z', 'B'],
      candidates,
      profileByCode: {},
    })

    expect(columns.map(column => column.commercialCode)).toEqual(['A', 'B'])
    expect(missingCodes).toEqual(['Z'])
  })

  it('프로필을 코드로 이어 붙인다', () => {
    const { columns } = selectCompareColumns({
      requestedCodes: ['A'],
      candidates,
      profileByCode: {
        A: {
          commercialCode: 'A',
          commercialName: '상권 A',
          districtCode: '11680',
          districtName: '강남구',
          administrationCode: '11680640',
          administrationName: '역삼1동',
          centerLng: 127,
          centerLat: 37.5,
          boundaryCoords: [],
          keyMetrics: null,
        },
      },
    })

    expect(columns[0].profile?.administrationName).toBe('역삼1동')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/recommend/compare/recommend-compare-data.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/recommend/compare-data"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/recommend/compare-data.ts`:

```ts
import {
  RECOMMENDATION_PERIOD_CODE,
  RECOMMENDATION_TOP_N,
} from '@/lib/api/recommend'
import type {
  CandidateCommercial,
  CommercialProfile,
  RecommendationRequest,
} from '@/types/recommend'

import type { CompareColumnInput } from './compare-presentation'
import { createStableCommercialCodes } from './recommend-state'

/**
 * 비교 화면의 추천 요청.
 *
 * 🔴 **선택된 코드만 넘기면 안 된다.** `clampRecommendationTopN` 이 `topN` 을 최소
 * 5로 올리고, 점수·순위가 그 부분집합 안에서 다시 계산된다. `/recommend` 는 행정동
 * 전체를 놓고 매긴 값을 보여 줬으므로 두 화면이 같은 상권에 다른 숫자를 말하게 된다.
 *
 * 그래서 **행정동 전체 코드**를 그대로 넘기고, 고른 상권은 응답에서 골라낸다.
 */
export const buildCompareRecommendationRequest = ({
  serviceCode,
  allCommercialCodes,
}: {
  serviceCode: string
  allCommercialCodes: readonly string[]
}): RecommendationRequest => ({
  serviceCode,
  commercialCodes: createStableCommercialCodes(allCommercialCodes),
  periodCode: RECOMMENDATION_PERIOD_CODE,
  topN: RECOMMENDATION_TOP_N,
})

/**
 * 추천 응답 + 프로필을 열로 세운다.
 *
 * 순서는 **URL 순서**다(사용자가 고른 순서). 추천 Top N 에 없는 코드는 빼고
 * `missingCodes` 로 돌려준다 — 낡은 링크에서 조용히 사라지면 안 된다.
 */
export const selectCompareColumns = ({
  requestedCodes,
  candidates,
  profileByCode,
}: {
  requestedCodes: readonly string[]
  candidates: readonly CandidateCommercial[]
  profileByCode: Readonly<Record<string, CommercialProfile | null>>
}): { columns: CompareColumnInput[]; missingCodes: string[] } => {
  const byCode = new Map(
    candidates.map(item => [String(item.commercialCode), item]),
  )
  const columns: CompareColumnInput[] = []
  const missingCodes: string[] = []

  requestedCodes.forEach(code => {
    const candidate = byCode.get(code)
    if (!candidate) {
      missingCodes.push(code)
      return
    }
    columns.push({
      commercialCode: code,
      candidate,
      profile: profileByCode[code] ?? null,
    })
  })

  return { columns, missingCodes }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/recommend/compare/recommend-compare-data.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 화면 컴포넌트를 쓴다**

`src/components/recommend/compare/recommend-compare-page.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import EmptyState from '@/components/ui/empty-state'
import {
  fetchCommercialProfile,
  fetchCommercialRecommendations,
  fetchCommercials,
  RECOMMENDATION_PERIOD_CODE,
} from '@/lib/api/recommend'
import { isApiSuccess } from '@/lib/api/response'
import {
  COMPARE_MIN_COMMERCIALS,
  isCompleteCompareState,
  parseCompareUrlState,
} from '@/lib/recommend/compare-url'
import {
  buildCompareRecommendationRequest,
  selectCompareColumns,
} from '@/lib/recommend/compare-data'
import {
  createCommercialCodesKey,
  recommendCommercialsKey,
  recommendProfileKey,
  recommendResultsKey,
} from '@/lib/recommend/recommend-query-keys'
import { formatRecommendationPeriod } from '@/lib/recommend/recommend-state'
import type { CommercialProfile } from '@/types/recommend'

import RecommendCompareTable from './recommend-compare-table'

const Page = styled.main`
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  display: grid;
  gap: 20px;
`

const Header = styled.header`
  display: grid;
  gap: 6px;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 24px;
  font-weight: 700;
  line-height: 34px;
  word-break: keep-all;
`

const Subtitle = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
`

const BackLink = styled(Link)`
  justify-self: start;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
`

const Notice = styled.p`
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
`

export default function RecommendComparePage() {
  const searchParams = useSearchParams()
  const state = useMemo(
    () => parseCompareUrlState(searchParams),
    [searchParams],
  )
  const isComplete = isCompleteCompareState(state)

  const backHref = `/recommend?districtCode=${state.districtCode ?? ''}&administrationCode=${state.administrationCode ?? ''}&serviceCode=${state.serviceCode ?? ''}&view=results`

  // 1) 행정동 전체 상권 — 추천 입력을 재현하기 위해서다.
  const commercialsQuery = useQuery({
    queryKey: recommendCommercialsKey(
      state.districtCode,
      state.administrationCode,
    ),
    queryFn: () =>
      fetchCommercials(state.districtCode!, state.administrationCode!),
    enabled: isComplete,
  })
  const allCodes = useMemo(() => {
    const body = commercialsQuery.data
    return body && isApiSuccess(body)
      ? (body.dataBody ?? []).map(item => String(item.commercialCode))
      : []
  }, [commercialsQuery.data])

  // 2) 추천 — /recommend 와 같은 요청, 같은 키.
  const recommendationQuery = useQuery({
    queryKey: recommendResultsKey({
      districtCode: state.districtCode,
      administrationCode: state.administrationCode,
      serviceCode: state.serviceCode,
      periodCode: RECOMMENDATION_PERIOD_CODE,
      commercialCodesKey: createCommercialCodesKey(allCodes),
    }),
    queryFn: () =>
      fetchCommercialRecommendations(
        buildCompareRecommendationRequest({
          serviceCode: state.serviceCode!,
          allCommercialCodes: allCodes,
        }),
      ),
    enabled: isComplete && allCodes.length > 0,
  })
  const candidates = useMemo(() => {
    const body = recommendationQuery.data
    return body && isApiSuccess(body) ? (body.dataBody?.items ?? []) : []
  }, [recommendationQuery.data])

  // 3) 열마다 프로필.
  const profileQueries = useQueries({
    queries: state.commercialCodes.map(code => ({
      queryKey: recommendProfileKey(
        code,
        state.serviceCode,
        RECOMMENDATION_PERIOD_CODE,
      ),
      queryFn: () =>
        fetchCommercialProfile(
          code,
          state.serviceCode!,
          RECOMMENDATION_PERIOD_CODE,
        ),
      enabled: isComplete,
    })),
  })

  const profileByCode = useMemo(() => {
    const map: Record<string, CommercialProfile | null> = {}
    state.commercialCodes.forEach((code, index) => {
      const body = profileQueries[index]?.data
      map[code] = body && isApiSuccess(body) ? (body.dataBody ?? null) : null
    })
    return map
  }, [profileQueries, state.commercialCodes])

  const failedProfileCodes = state.commercialCodes.filter(
    (code, index) =>
      profileQueries[index]?.isError || profileByCode[code] === null,
  )

  if (!isComplete) {
    return (
      <Page>
        <EmptyState
          title="비교할 상권이 부족해요"
          description={`상권 추천 결과에서 상권을 ${COMPARE_MIN_COMMERCIALS}개 이상 골라 주세요.`}
          action={<BackLink href={backHref}>추천으로 돌아가기</BackLink>}
        />
      </Page>
    )
  }

  const { columns, missingCodes } = selectCompareColumns({
    requestedCodes: state.commercialCodes,
    candidates,
    profileByCode,
  })

  return (
    <Page>
      <Header>
        <Title>상권 비교</Title>
        <Subtitle>
          {`${formatRecommendationPeriod(RECOMMENDATION_PERIOD_CODE)} 기준`}
        </Subtitle>
        <BackLink href={backHref}>추천으로 돌아가기</BackLink>
      </Header>

      {state.truncated ? (
        <Notice>한 번에 4개까지 비교할 수 있어요. 앞 4개만 보여 드려요.</Notice>
      ) : null}

      {missingCodes.length > 0 ? (
        <Notice>
          추천 결과에 없는 상권 {missingCodes.length}개는 표에서 뺐어요. 추천을
          다시 받아 주세요.
        </Notice>
      ) : null}

      {columns.length < COMPARE_MIN_COMMERCIALS ? (
        <EmptyState
          title="비교할 상권이 부족해요"
          description="추천 결과에서 상권을 다시 골라 주세요."
          action={<BackLink href={backHref}>추천으로 돌아가기</BackLink>}
        />
      ) : (
        <RecommendCompareTable
          administrationCode={state.administrationCode!}
          columns={columns}
          districtCode={state.districtCode!}
          failedProfileCodes={failedProfileCodes}
          serviceCode={state.serviceCode!}
        />
      )}
    </Page>
  )
}
```

> 응답 접근자(`dataBody`)의 실제 모양은 `recommend-page.tsx` 의 `normalizeRecommendationResults` 사용부를 읽어 맞춘다.
>
> 제목을 `{업종명} 상권 비교` 로 하고 싶으면 추천 응답이 아니라 `state.serviceCode` 로 이름을 얻는다 — `recommend-url.ts` 의 `findService` 가 쓰는 `findSimulationCategoryByCode(code)?.item.name` 와 같은 방법이다. 추천 응답을 기다리지 않아도 되므로 로딩 중에도 제목이 제대로 나온다.

`app/(shell)/recommend/compare/page.tsx`:

```tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'

import RecommendComparePage from '@/components/recommend/compare/recommend-compare-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '상권 비교',
  description: '추천받은 상권들의 점수와 지표를 나란히 비교합니다.',
  path: '/recommend/compare',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RecommendComparePage />
    </Suspense>
  )
}
```

- [ ] **Step 6: 타입·린트 확인**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint src/components/recommend/compare src/lib/recommend "app/(shell)/recommend/compare" --max-warnings=0`
Expected: 출력 없음

- [ ] **Step 7: Commit**

```bash
git add src/lib/recommend/compare-data.ts src/components/recommend/compare/ "app/(shell)/recommend/compare"
git commit -m "$(cat <<'EOF'
[FE] feat: /recommend/compare 라우트와 데이터 조립

행정동 전체 상권 → 추천 → 열별 프로필 순으로 조립한다. 쿼리 키가 /recommend 와
같아 추천에서 넘어오면 네트워크 호출이 0회다.

🔴 추천 요청에 선택된 코드가 아니라 행정동 전체 코드를 넘긴다. 선택된 3개만
넘기면 topN 이 최소 5로 clamp 되고 점수가 그 안에서 다시 계산돼 두 화면이
같은 상권에 다른 숫자를 말한다. 테스트로 못 박았다.

부분 실패에서 화면을 통째로 버리지 않는다 — 프로필 하나가 실패해도 그 열의
지표 자리에만 사실을 적고 나머지 열은 남는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `/recommend` 결과에서 고르기

**Files:**

- Modify: `src/components/recommend/recommend-result-list.tsx` (체크박스)
- Modify: `src/components/recommend/recommend-panel.tsx` (선택 상태 + 고정 바)
- Test: `src/components/recommend/recommend-panel.test.ts` (기존 파일에 추가)

**Interfaces:**

- Consumes: Task 1 `createCompareHref`·`COMPARE_MIN_COMMERCIALS`·`COMPARE_MAX_COMMERCIALS`
- Produces: `RecommendResultListProps` 에 `compareSelection?: readonly string[]`, `onCompareToggle?: (commercialCode: string) => void` 추가

- [ ] **Step 1: Write the failing test**

`src/components/recommend/recommend-panel.test.ts` 끝에 추가:

```ts
it('비교 선택이 1개면 CTA 가 잠기고 무엇이 필요한지 말한다', () => {
  const markup = renderPanel({
    ...baseProps,
    results: [result],
    view: 'results',
    compareSelection: ['3110008'],
  })

  const cta =
    markup.match(
      /<a[^>]*data-testid="recommend-compare-cta"[^>]*>|<button[^>]*data-testid="recommend-compare-cta"[^>]*>/,
    )?.[0] ?? ''

  expect(markup).toContain('비교할 상권을 2개 이상 골라 주세요')
  expect(cta).toContain('aria-describedby="recommend-compare-gap"')
  expect(markup).toContain('id="recommend-compare-gap"')
})

it('비교 선택이 2개면 비교 화면 링크를 만든다', () => {
  const markup = renderPanel({
    ...baseProps,
    results: [result],
    view: 'results',
    compareSelection: ['3110008', '3110958'],
  })

  const cta =
    markup.match(/<a[^>]*data-testid="recommend-compare-cta"[^>]*>/)?.[0] ?? ''

  expect(cta).toContain('href="/recommend/compare?')
  expect(cta).toContain('districtCode=11680')
  expect(cta).toContain('administrationCode=11680101')
  expect(cta).toContain('serviceCode=CS100010')
  expect(cta).toContain('commercialCodes=3110008%2C3110958')
  expect(markup).toContain('비교하기 (2/4)')
})

it('4개를 채우면 더 고를 수 없다고 말한다', () => {
  const markup = renderPanel({
    ...baseProps,
    results: [result],
    view: 'results',
    compareSelection: ['1', '2', '3', '4'],
  })

  expect(markup).toContain('한 번에 4개까지 비교할 수 있어요')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/recommend/recommend-panel.test.ts`
Expected: FAIL — `비교할 상권을 2개 이상 골라 주세요` 를 찾지 못한다

- [ ] **Step 3: Write minimal implementation**

`recommend-result-list.tsx` — props 에 추가:

```ts
  /** 비교 담기 선택. 카드 본문 클릭(지도 포커스)과 **다른 행동**이다. */
  compareSelection?: readonly string[]
  onCompareToggle?: (commercialCode: string) => void
  /** 상한을 채웠는가. 채웠으면 안 고른 카드의 체크박스를 잠근다. */
  isCompareFull?: boolean
```

`SecondaryActions` 안, 북마크 **앞**에 체크박스를 넣는다:

```tsx
{
  onCompareToggle ? (
    <CompareCheckbox>
      <input
        checked={compareSelection.includes(item.commercialCode)}
        disabled={
          isCompareFull && !compareSelection.includes(item.commercialCode)
        }
        type="checkbox"
        onChange={() => onCompareToggle(item.commercialCode)}
      />
      <span>비교</span>
    </CompareCheckbox>
  ) : null
}
```

스타일:

```tsx
const CompareCheckbox = styled.label`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:has(input:disabled) {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`
```

`recommend-panel.tsx` — props 에 `compareSelection?: readonly string[]`, `onCompareToggle?` 를 받아 `RecommendResultList` 로 넘기고, 결과 목록 뒤에 고정 바를 그린다:

```tsx
const CompareBar = styled.div`
  position: sticky;
  bottom: 0;
  display: grid;
  gap: 8px;
  padding: 12px 0 max(12px, env(safe-area-inset-bottom));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border-200);
`

const CompareGap = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
`

const CompareCta = styled(Link)`
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
`

const CompareCtaDisabled = styled.span`
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  opacity: var(--button-disabled-opacity-color);
  cursor: not-allowed;
`
```

`submitted` 가 있는 결과 뷰의 `RecommendResultList` 바로 아래:

```tsx
{
  onCompareToggle ? (
    <CompareBar>
      {compareGap ? (
        <CompareGap id={COMPARE_GAP_ID}>{compareGap}</CompareGap>
      ) : null}
      {compareHref ? (
        <CompareCta data-testid="recommend-compare-cta" href={compareHref}>
          {`비교하기 (${compareSelection.length}/${COMPARE_MAX_COMMERCIALS})`}
        </CompareCta>
      ) : (
        <CompareCtaDisabled
          aria-describedby={compareGap ? COMPARE_GAP_ID : undefined}
          aria-disabled="true"
          data-testid="recommend-compare-cta"
          role="link"
        >
          {`비교하기 (${compareSelection.length}/${COMPARE_MAX_COMMERCIALS})`}
        </CompareCtaDisabled>
      )}
    </CompareBar>
  ) : null
}
```

계산부(컴포넌트 본문, `submitted` 확정 뒤):

```tsx
const COMPARE_GAP_ID = 'recommend-compare-gap'
const isCompareFull = compareSelection.length >= COMPARE_MAX_COMMERCIALS
const compareGap =
  compareSelection.length < COMPARE_MIN_COMMERCIALS
    ? `비교할 상권을 ${COMPARE_MIN_COMMERCIALS}개 이상 골라 주세요`
    : isCompareFull
      ? `한 번에 ${COMPARE_MAX_COMMERCIALS}개까지 비교할 수 있어요`
      : null
const compareHref =
  compareSelection.length >= COMPARE_MIN_COMMERCIALS
    ? createCompareHref({
        districtCode: submitted.district.code,
        administrationCode: submitted.administration.code,
        serviceCode: submitted.service.code,
        commercialCodes: compareSelection,
      })
    : null
```

`COMPARE_GAP_ID` 는 컴포넌트 밖 모듈 상수로 뺀다(렌더마다 새로 만들 이유가 없다).

선택 상태 자체는 `recommend-page.tsx` 에서 `useState<string[]>` 로 들고 토글 핸들러를 만들어 패널에 넘긴다. **URL 에 넣지 않는다.**

```tsx
const [compareSelection, setCompareSelection] = useState<string[]>([])
const handleCompareToggle = useCallback((commercialCode: string) => {
  setCompareSelection(current =>
    current.includes(commercialCode)
      ? current.filter(code => code !== commercialCode)
      : current.length >= COMPARE_MAX_COMMERCIALS
        ? current
        : [...current, commercialCode],
  )
}, [])
```

조건을 바꿔 추천을 다시 받으면 선택을 비운다 — 다른 행정동의 상권이 섞이면 비교가 성립하지 않는다:

```tsx
useEffect(() => {
  setCompareSelection([])
}, [state.submitted?.requestKey])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/recommend/recommend-panel.test.ts`
Expected: PASS (기존 41개 + 신규 3개 = 44개)

- [ ] **Step 5: Commit**

```bash
git add src/components/recommend/recommend-result-list.tsx src/components/recommend/recommend-panel.tsx src/components/recommend/recommend-page.tsx src/components/recommend/recommend-panel.test.ts
git commit -m "$(cat <<'EOF'
[FE] feat: 추천 결과에서 비교할 상권 고르기

카드에 「비교」 체크박스, 결과 목록 아래 고정 바 「비교하기 (n/4)」.

카드 본문 클릭(지도 포커스)과 다른 행동이라 별도 컨트롤로 뒀다. 상한을 채우면
안 고른 카드의 체크박스를 잠근다.

CTA 가 잠겨 있을 때 무엇이 빠졌는지 반드시 말하고 aria-describedby 로 묶는다
(#178 에서 세운 규약). 조건을 바꿔 추천을 다시 받으면 선택을 비운다 — 다른
행정동의 상권이 섞이면 비교가 성립하지 않는다.

선택 상태는 URL 에 넣지 않는다. 공유 링크가 받는 사람의 체크 상태까지 옮길
이유가 없다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 「비교」 탭 이름 정리

새 화면이 생기면 제품에 「비교」가 둘이 된다. 기존 것은 자치구·행정동 평균 대비라 이름이 내용과 맞지 않는다(감사 J1-4).

**Files:**

- Modify: `src/lib/analysis/presentation.ts:15` (탭 라벨)
- Modify: `src/components/analysis/analysis-result-view.tsx:1946` (섹션 제목)
- Test: `src/lib/analysis/presentation.test.ts` (기존 파일)

**Interfaces:** 없음. 사람이 읽는 라벨만 바꾼다.

- [ ] **Step 1: Write the failing test**

`src/lib/analysis/presentation.test.ts` 에 추가:

```ts
it('benchmark 탭 라벨이 내용과 맞는다', () => {
  // 「비교」는 상권끼리 비교한다는 기대를 만든다. 이 탭은 지역 평균 대비다.
  const benchmark = ANALYSIS_TABS.find(tab => tab.value === 'benchmark')

  expect(benchmark?.label).toBe('지역 평균 대비')
})

it('탭 쿼리 값은 바꾸지 않는다', () => {
  // 값을 바꾸면 공유된 ?tab=benchmark 링크가 깨진다.
  expect(ANALYSIS_TABS.map(tab => tab.value)).toContain('benchmark')
})
```

`ANALYSIS_TABS` 는 `src/lib/analysis/presentation.ts:8` 에서 export 중이다. 테스트 파일 맨 위 import 에 추가한다.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/analysis/presentation.test.ts`
Expected: FAIL — `expected '비교' to be '지역 평균 대비'`

- [ ] **Step 3: Write minimal implementation**

`src/lib/analysis/presentation.ts:15`:

```ts
  { value: 'benchmark', label: '지역 평균 대비' },
```

`src/components/analysis/analysis-result-view.tsx:1946`:

```tsx
{
  renderGroupHeading('지역 평균 대비')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/analysis src/components/analysis`
Expected: PASS. `'비교'` 를 단언하던 기존 테스트가 있으면 함께 고친다 — 이름을 바꾸는 것이 이 태스크의 목적이므로 단언을 새 이름으로 옮기는 것이 옳다.

- [ ] **Step 5: 두 곳 모두 바뀌었는지 확인**

Run: `git grep -n "'비교'" -- src | grep -v test`
Expected: 출력 없음 (라벨이 두 곳에 있었다 — 한쪽만 고치면 탭과 본문 제목이 다른 말을 한다)

- [ ] **Step 6: Commit**

```bash
git add src/lib/analysis/presentation.ts src/components/analysis/analysis-result-view.tsx src/lib/analysis/presentation.test.ts
git commit -m "$(cat <<'EOF'
[FE] fix: 「비교」 탭을 「지역 평균 대비」로 고친다

이 탭은 상권끼리 비교하지 않는다. 자치구·행정동 평균과 비교한다. 이름이 상권
비교를 약속하고 배신한다(과업 흐름 감사 J1-4). /recommend/compare 가 생기면
제품에 「비교」가 둘이 되어 더 헷갈린다.

tab=benchmark 쿼리 값은 바꾸지 않는다 — 공유된 링크가 깨진다. 라벨은 탭 정의와
섹션 제목 두 곳에 있어 둘 다 고쳤다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 전체 검증과 브라우저 실측

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 전체 테스트**

Run: `npx vitest run`
Expected: PASS — 기존 1359개 + 신규 약 27개

- [ ] **Step 2: qa:verify**

Run: `pnpm qa:verify`
Expected: format:check · lint · typecheck · build 모두 통과

- [ ] **Step 3: 빌드가 더럽힌 파일 되돌리기**

```bash
git checkout -- next-env.d.ts
git status --short
```

Expected: 의도한 변경만 남는다

- [ ] **Step 4: dev 서버 준비**

`.next` 를 지우려면 **서버를 먼저 멈춘다**(켜 둔 채 지우면 Turbopack 캐시 DB 가 깨진다).

```bash
# preview_stop → rm -rf .next → preview_start
```

브라우저 pane 이 숨겨져 있으면 `resize_window({width:1440,height:900})` 를 **먼저** 부른다(안 그러면 뷰포트가 0×0 이라 계측이 전부 거짓이다). 콜드 로드는 Suspense reveal 이 멈추므로 **홈만 URL 로 열고 그다음은 클릭으로 이동한다.**

- [ ] **Step 5: 실측 확인 목록**

| 확인                           | 기대                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `/recommend` 결과에서 2개 체크 | 고정 바가 「비교하기 (2/4)」로 활성                                                             |
| 1개만 체크                     | CTA 잠김 + 「비교할 상권을 2개 이상 골라 주세요」                                               |
| 5번째 체크 시도                | 막히고 「한 번에 4개까지 비교할 수 있어요」                                                     |
| 「비교하기」 클릭              | `/recommend/compare?...` 로 이동, 표가 그려짐                                                   |
| **점수 일치**                  | 비교 표의 종합 점수가 `/recommend` 카드의 점수와 **같다** — 다르면 Task 5 의 요청이 틀린 것이다 |
| 네트워크                       | 추천에서 넘어올 때 `preview_logs` 에 새 BFF 호출이 **없다**(캐시 적중)                          |
| 열 링크                        | 「분석 보기」가 해당 상권의 `/analysis/result` 를 연다                                          |
| 원지표 색                      | `getComputedStyle` 로 원지표 셀 색이 `--score-*` 가 아님을 확인                                 |
| `/analysis/result`             | 탭과 섹션 제목이 「지역 평균 대비」                                                             |

- [ ] **Step 6: 발견한 문제를 고치고 재검증**

문제가 있으면 해당 태스크로 돌아가 고치고, 테스트를 먼저 추가한 뒤 구현을 고친다.

---

## Self-Review

**Spec coverage**

| 명세 절                                                     | 태스크                                                                                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §3 URL 계약 (접두사 없음, 점수 미탑재, 2~4 범위, 순서 보존) | Task 1                                                                                                                                                        |
| §4 점수 재현 + 캐시 공유                                    | Task 2 (키), Task 5 (요청)                                                                                                                                    |
| §5.2 점수 5행 / 원지표 9행, 최댓값 배지                     | Task 3, Task 4                                                                                                                                                |
| §5.3 중립 문구, 1위 미선언                                  | Task 3 (문구), Task 4 (렌더)                                                                                                                                  |
| §5.4 열 하단 분석 링크                                      | Task 4                                                                                                                                                        |
| §5.5 가로 스크롤 + sticky 첫 열                             | Task 4                                                                                                                                                        |
| §6.1 체크박스 + 고정 바 + 빈 비활성 CTA 금지                | Task 6                                                                                                                                                        |
| §6.2 「비교」 라벨 정리 (두 곳)                             | Task 7                                                                                                                                                        |
| §7 오류·빈 상태                                             | Task 5 (조건 누락·2개 미만·잘림·누락 코드), Task 4 (프로필 부분 실패)                                                                                         |
| §8 파일 구성                                                | 전 태스크. 명세의 `compare-presentation.ts` 에 더해 `compare-data.ts`·`recommend-query-keys.ts` 를 나눴다 — 조립 로직을 컴포넌트에서 떼어 테스트하기 위해서다 |
| §9 테스트                                                   | Task 1·3·4·5·6·7                                                                                                                                              |

빠진 것 없음. 명세 §7 의 「추천 API 실패 → 점수 블록만 오류」는 Task 5 의 화면이 `recommendationQuery.isError` 를 다루도록 Step 5 구현에서 처리한다 — 구현자가 놓치지 않도록 Task 8 실측 목록에 넣지 않고 여기에 적어 둔다: **점수 표에 오류가 나도 원지표 표는 그린다.**

**Placeholder scan:** "TBD"·"TODO"·"적절히 처리" 없음. 모든 코드 단계에 실제 코드가 있다. 「나중에 제거하라」는 임시 코드도 없다.

**Type consistency:** `CompareColumnInput` 은 Task 3 에서 정의하고 Task 4·5 가 같은 이름으로 쓴다. `CompareUrlState.truncated` 는 Task 1 정의 → Task 5 사용. 키 헬퍼 3종은 Task 2 정의 → Task 5 사용. `failedProfileCodes` 는 Task 4 props → Task 5 전달. 이름 불일치 없음.
