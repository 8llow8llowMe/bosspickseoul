# 상권 분석 AI 리포트 컴패니언 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/analysis` 탐색 화면에서 선택 레벨(자치구/행정동/상권)의 AI 리포트를, 카드 배너 클릭 게이트 + 2뎁스 컴패니언 패널로 표시한다.

**Architecture:** 기존 분석 도메인의 **표현/데이터 분리** 패턴을 따른다. 레벨 결정·리포트 정규화·폴링 결정을 전부 `src/lib/analysis/*`의 순수함수로 두고 vitest로 테스트한다. React Query 훅(`use-ai-report.ts`)과 프레젠테이션 컴포넌트는 얇게 유지하고(상태를 prop으로 받음), 컴포넌트는 `renderToStaticMarkup`으로 마크업을 검증한다. (테스트 환경에 @testing-library/jsdom이 없어 훅 renderHook·상호작용 테스트는 불가 — 그래서 모든 결정 로직을 순수함수로 뽑는다.)

**Tech Stack:** Next.js App Router, TypeScript, styled-components, TanStack React Query, vitest(`renderToStaticMarkup`), 기존 BFF(`/api/bff` → 백엔드 `/api/v1`).

## Global Constraints

- 정본 명세: `docs/features/analysis/ai-report.md` (D0~D8). 모든 요구사항의 원천.
- API 계약: `docs/api/openapi/ai-report.json`. 임의 엔드포인트/필드 추가 금지.
- 스타일: `DESIGN.md` 토큰만 사용. 임의 색/radius/shadow/spacing 금지. 차트 라이브러리 금지.
- 커밋 컨벤션: `[FE] ...`. base 브랜치 `develop`, 작업 브랜치 `feature/fe/analysis-ai-report`(이미 생성됨).
- 검증: 완료 보고 전 `pnpm test`(vitest) 통과, 최종 `pnpm qa:verify`(format:check && lint && typecheck && build) 통과. lint는 `--max-warnings=0` — 불필요한 `??`/조건 등 경고도 실패.
- BFF 경로: `apiClient.get('/ai-reports/...')` → `/api/bff/ai-reports/...` → 백엔드 `/api/v1/ai-reports/...` (서버측 Bearer 주입). 인증은 세션 쿠키가 처리.
- 응답 envelope: 모든 응답은 `ApiResponse<T> = { dataHeader, dataBody }`. 어댑터가 `dataBody`를 언랩해 반환.
- 폴링 파라미터: 간격 2000ms, 타임아웃 90000ms (D4-3).
- 이 슬라이스 제외(D8): 상권 비교 리포트, 차트 연동(칩→강조), 리포트 저장/공유.

---

## File Structure

| 파일                                                    | 책임                                             | 테스트            |
| ------------------------------------------------------- | ------------------------------------------------ | ----------------- |
| `src/types/ai-report.ts`                                | OpenAPI 응답 스키마 미러(도메인 타입)            | (typecheck)       |
| `src/lib/api/ai-report.ts`                              | 엔드포인트 경로 빌더 + 4개 fetch 어댑터          | 경로 빌더         |
| `src/lib/analysis/ai-report-presentation.ts`            | 레벨 결정 + 리포트→뷰모델 정규화(순수)           | ✅                |
| `src/lib/analysis/ai-report-poll.ts`                    | 제출/작업 → 상태·폴링 결정(순수)                 | ✅                |
| `src/hooks/use-ai-report.ts`                            | React Query 조회/폴링 훅(얇은 글루)              | (typecheck)       |
| `src/components/analysis/ai-report/report-blocks.tsx`   | 상권 3블록 + 지역 블록 렌더(순수 프레젠테이션)   | ✅ 마크업         |
| `src/components/analysis/ai-report/ai-report-card.tsx`  | 카드 배너 CTA(프레젠테이션)                      | ✅ 마크업         |
| `src/components/analysis/ai-report/ai-report-panel.tsx` | 패널 셸: 상태 prop → 로딩/폴링/완료/빈/에러 렌더 | ✅ 마크업         |
| `src/components/analysis/analysis-page.tsx`             | Surface에 카드/패널 슬롯 추가 + 페이지 상태 배선 | ✅ Surface 마크업 |
| `src/components/analysis/analysis-mobile-sheet.tsx`     | 모바일 카드 CTA + 시트 연결                      | ✅ 마크업         |

각 순수함수 파일은 같은 이름 `.test.ts`를 옆에 둔다(기존 관례).

---

## Task 1: 도메인 타입 + API 어댑터

**Files:**

- Create: `src/types/ai-report.ts`
- Create: `src/lib/api/ai-report.ts`
- Test: `src/lib/api/ai-report.test.ts`

**Interfaces:**

- Produces (types): `AiReportLevel`, `CommercialAiReport`, `RegionAiReport`, `AiReportSubmission`, `AiReportJob`, `AiReportJobStatus`, `AiReportSubmissionStatus`.
- Produces (api): `aiReportPath` (경로 빌더 객체), `fetchDistrictAiReport`, `fetchAdministrationAiReport`, `submitCommercialAiReport`, `fetchAiReportJob`.

- [ ] **Step 1: 타입 파일 작성** — `src/types/ai-report.ts`

리스트/문자열 필드는 LLM 응답 특성상 누락 가능하므로 nullable로 둔다(표현 레이어에서 정규화).

```ts
import type { ApiResponse } from '@/types/api'

export type AiReportLevel = 'district' | 'administration' | 'commercial'
export type AiReportSubmissionStatus = 'CACHED' | 'ACCEPTED'
export type AiReportJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export type CommercialAiReport = {
  summary: string | null
  strengths: string[] | null
  risks: string[] | null
  recommendedBusinessCategories: string[] | null
  recommendedCustomerSegments: string[] | null
  recommendedOperatingHours: string[] | null
  avoidOperatingHours: string[] | null
  targetAgeGroups: string[] | null
  targetGenders: string[] | null
  operationTips: string[] | null
  businessInsight: string | null
  generatedAt: string | null
}

export type RegionAiReport = {
  summary: string | null
  marketStatus: string | null
  recommendedBusinessCategories: string[] | null
  cautionBusinessCategories: string[] | null
  businessInsight: string | null
  generatedAt: string | null
}

export type AiReportSubmission = {
  submissionStatus: AiReportSubmissionStatus
  jobType: string
  jobId: string | null
  commercialReport: CommercialAiReport | null
}

export type AiReportJob = {
  jobId: string
  jobType: string
  status: AiReportJobStatus
  commercialReport: CommercialAiReport | null
  errorCode: string | null
  errorMessage: string | null
}

export type DistrictAiReportResponse = ApiResponse<RegionAiReport>
export type AdministrationAiReportResponse = ApiResponse<RegionAiReport>
export type CommercialAiReportSubmissionResponse =
  ApiResponse<AiReportSubmission>
export type AiReportJobStatusResponse = ApiResponse<AiReportJob>
```

- [ ] **Step 2: 경로 빌더 실패 테스트 작성** — `src/lib/api/ai-report.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import { aiReportPath } from '@/lib/api/ai-report'

describe('aiReportPath', () => {
  it('레벨별 엔드포인트 경로를 만든다', () => {
    expect(aiReportPath.district('11680')).toBe('/ai-reports/districts/11680')
    expect(aiReportPath.administration('11680640')).toBe(
      '/ai-reports/administrations/11680640',
    )
    expect(aiReportPath.commercialSubmit('3110008')).toBe(
      '/ai-reports/commercials/3110008',
    )
    expect(aiReportPath.job('job-1')).toBe('/ai-reports/jobs/job-1')
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `pnpm exec vitest run src/lib/api/ai-report.test.ts`
Expected: FAIL — `aiReportPath` not exported / module not found.

- [ ] **Step 4: API 어댑터 구현** — `src/lib/api/ai-report.ts`

```ts
import { apiClient } from '@/lib/api/client'
import type {
  AdministrationAiReportResponse,
  AiReportJob,
  AiReportJobStatusResponse,
  AiReportSubmission,
  CommercialAiReportSubmissionResponse,
  DistrictAiReportResponse,
  RegionAiReport,
} from '@/types/ai-report'

export const aiReportPath = {
  district: (code: string) => `/ai-reports/districts/${code}`,
  administration: (code: string) => `/ai-reports/administrations/${code}`,
  commercialSubmit: (code: string) => `/ai-reports/commercials/${code}`,
  job: (jobId: string) => `/ai-reports/jobs/${jobId}`,
}

export const fetchDistrictAiReport = async (
  districtCode: string,
): Promise<RegionAiReport> => {
  const res = await apiClient.get<DistrictAiReportResponse>(
    aiReportPath.district(districtCode),
  )
  return res.data.dataBody
}

export const fetchAdministrationAiReport = async (
  administrationCode: string,
): Promise<RegionAiReport> => {
  const res = await apiClient.get<AdministrationAiReportResponse>(
    aiReportPath.administration(administrationCode),
  )
  return res.data.dataBody
}

export const submitCommercialAiReport = async (
  commercialCode: string,
): Promise<AiReportSubmission> => {
  const res = await apiClient.post<CommercialAiReportSubmissionResponse>(
    aiReportPath.commercialSubmit(commercialCode),
  )
  return res.data.dataBody
}

export const fetchAiReportJob = async (jobId: string): Promise<AiReportJob> => {
  const res = await apiClient.get<AiReportJobStatusResponse>(
    aiReportPath.job(jobId),
  )
  return res.data.dataBody
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm exec vitest run src/lib/api/ai-report.test.ts`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/types/ai-report.ts frontend/src/lib/api/ai-report.ts frontend/src/lib/api/ai-report.test.ts
git commit -m "[FE] feat: AI 리포트 도메인 타입·API 어댑터 추가"
```

---

## Task 2: 레벨 결정 + 리포트 뷰모델 정규화 (순수)

**Files:**

- Create: `src/lib/analysis/ai-report-presentation.ts`
- Test: `src/lib/analysis/ai-report-presentation.test.ts`

**Interfaces:**

- Consumes: `AnalysisSelection` (`@/lib/analysis/selection`), `CommercialAiReport`, `RegionAiReport`, `AiReportLevel` (`@/types/ai-report`).
- Produces: `resolveAiReportLevel(selection)`, `resolveAiReportTargetCode(selection, level)`, `toCommercialReportView(report)`, `toRegionReportView(report)`, types `CommercialReportView`, `RegionReportView`, `ReportBlockList`, `isCommercialReportEmpty(view)`, `isRegionReportEmpty(view)`.

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/analysis/ai-report-presentation.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import {
  isCommercialReportEmpty,
  resolveAiReportLevel,
  resolveAiReportTargetCode,
  toCommercialReportView,
  toRegionReportView,
} from '@/lib/analysis/ai-report-presentation'
import { createEmptyAnalysisSelection } from '@/lib/analysis/selection'

const base = createEmptyAnalysisSelection()

describe('resolveAiReportLevel', () => {
  it('가장 깊게 선택된 레벨을 고른다(분야는 무관)', () => {
    expect(resolveAiReportLevel(base)).toBeNull()
    expect(resolveAiReportLevel({ ...base, districtCode: '11680' })).toBe(
      'district',
    )
    expect(
      resolveAiReportLevel({
        ...base,
        districtCode: '11680',
        administrationCode: '11680640',
      }),
    ).toBe('administration')
    expect(
      resolveAiReportLevel({
        ...base,
        districtCode: '11680',
        administrationCode: '11680640',
        commercialCode: '3110008',
        serviceCode: 'CS100001',
      }),
    ).toBe('commercial')
  })
})

describe('resolveAiReportTargetCode', () => {
  it('레벨에 해당하는 코드를 돌려준다', () => {
    const sel = {
      ...base,
      districtCode: '11680',
      administrationCode: '11680640',
    }
    expect(resolveAiReportTargetCode(sel, 'district')).toBe('11680')
    expect(resolveAiReportTargetCode(sel, 'administration')).toBe('11680640')
    expect(resolveAiReportTargetCode(sel, 'commercial')).toBeNull()
  })
})

describe('toCommercialReportView', () => {
  it('3블록으로 매핑하고 빈/null 리스트는 제거·공백은 정리한다', () => {
    const view = toCommercialReportView({
      summary: ' 요약 ',
      strengths: ['유동 많음', '  ', null as unknown as string],
      risks: null,
      recommendedBusinessCategories: ['카페'],
      recommendedCustomerSegments: [],
      recommendedOperatingHours: ['점심'],
      avoidOperatingHours: null,
      targetAgeGroups: ['20대'],
      targetGenders: null,
      operationTips: null,
      businessInsight: '창업 코멘트',
      generatedAt: '2026-08-07T00:00:00Z',
    })
    expect(view.headline).toEqual({ summary: '요약', insight: '창업 코멘트' })
    expect(view.strengths).toEqual(['유동 많음'])
    expect(view.risks).toEqual([])
    expect(view.actions).toEqual([
      { title: '추천 업종군', items: ['카페'] },
      { title: '추천 운영 시간', items: ['점심'] },
      { title: '타깃 연령', items: ['20대'] },
    ])
  })
})

describe('toRegionReportView / empty guards', () => {
  it('지역 리포트를 정규화한다', () => {
    const view = toRegionReportView({
      summary: '시장 요약',
      marketStatus: '성장',
      recommendedBusinessCategories: ['카페'],
      cautionBusinessCategories: null,
      businessInsight: '코멘트',
      generatedAt: '2026-08-07',
    })
    expect(view.headline).toEqual({
      summary: '시장 요약',
      marketStatus: '성장',
    })
    expect(view.recommended).toEqual(['카페'])
    expect(view.caution).toEqual([])
  })

  it('완전히 빈 상권 뷰는 empty로 판정한다', () => {
    const empty = toCommercialReportView({
      summary: null,
      strengths: null,
      risks: null,
      recommendedBusinessCategories: null,
      recommendedCustomerSegments: null,
      recommendedOperatingHours: null,
      avoidOperatingHours: null,
      targetAgeGroups: null,
      targetGenders: null,
      operationTips: null,
      businessInsight: null,
      generatedAt: null,
    })
    expect(isCommercialReportEmpty(empty)).toBe(true)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/lib/analysis/ai-report-presentation.test.ts`
Expected: FAIL — module/exports not found.

- [ ] **Step 3: 구현** — `src/lib/analysis/ai-report-presentation.ts`

```ts
import type { AnalysisSelection } from '@/lib/analysis/selection'
import type {
  AiReportLevel,
  CommercialAiReport,
  RegionAiReport,
} from '@/types/ai-report'

const text = (value: string | null | undefined): string => value?.trim() ?? ''

const toList = (
  value: readonly (string | null)[] | null | undefined,
): string[] =>
  (value ?? [])
    .map(item => item?.trim() ?? '')
    .filter((item): item is string => item.length > 0)

export const resolveAiReportLevel = (
  selection: AnalysisSelection,
): AiReportLevel | null => {
  if (selection.commercialCode) return 'commercial'
  if (selection.administrationCode) return 'administration'
  if (selection.districtCode) return 'district'
  return null
}

export const resolveAiReportTargetCode = (
  selection: AnalysisSelection,
  level: AiReportLevel,
): string | null => {
  if (level === 'commercial') return selection.commercialCode
  if (level === 'administration') return selection.administrationCode
  return selection.districtCode
}

export type ReportBlockList = { title: string; items: string[] }

export type CommercialReportView = {
  headline: { summary: string; insight: string }
  strengths: string[]
  risks: string[]
  actions: ReportBlockList[]
  generatedAt: string
}

export const toCommercialReportView = (
  report: CommercialAiReport,
): CommercialReportView => ({
  headline: {
    summary: text(report.summary),
    insight: text(report.businessInsight),
  },
  strengths: toList(report.strengths),
  risks: toList(report.risks),
  actions: [
    {
      title: '추천 업종군',
      items: toList(report.recommendedBusinessCategories),
    },
    { title: '추천 고객층', items: toList(report.recommendedCustomerSegments) },
    {
      title: '추천 운영 시간',
      items: toList(report.recommendedOperatingHours),
    },
    { title: '피해야 할 시간', items: toList(report.avoidOperatingHours) },
    { title: '타깃 연령', items: toList(report.targetAgeGroups) },
    { title: '타깃 성별', items: toList(report.targetGenders) },
    { title: '운영 팁', items: toList(report.operationTips) },
  ].filter(block => block.items.length > 0),
  generatedAt: text(report.generatedAt),
})

export const isCommercialReportEmpty = (view: CommercialReportView): boolean =>
  !view.headline.summary &&
  !view.headline.insight &&
  view.strengths.length === 0 &&
  view.risks.length === 0 &&
  view.actions.length === 0

export type RegionReportView = {
  headline: { summary: string; marketStatus: string }
  recommended: string[]
  caution: string[]
  insight: string
  generatedAt: string
}

export const toRegionReportView = (
  report: RegionAiReport,
): RegionReportView => ({
  headline: {
    summary: text(report.summary),
    marketStatus: text(report.marketStatus),
  },
  recommended: toList(report.recommendedBusinessCategories),
  caution: toList(report.cautionBusinessCategories),
  insight: text(report.businessInsight),
  generatedAt: text(report.generatedAt),
})

export const isRegionReportEmpty = (view: RegionReportView): boolean =>
  !view.headline.summary &&
  !view.headline.marketStatus &&
  view.recommended.length === 0 &&
  view.caution.length === 0 &&
  !view.insight
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm exec vitest run src/lib/analysis/ai-report-presentation.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/analysis/ai-report-presentation.ts frontend/src/lib/analysis/ai-report-presentation.test.ts
git commit -m "[FE] feat: AI 리포트 레벨 결정·뷰모델 정규화 순수함수"
```

---

## Task 3: 제출/폴링 결정 (순수)

**Files:**

- Create: `src/lib/analysis/ai-report-poll.ts`
- Test: `src/lib/analysis/ai-report-poll.test.ts`

**Interfaces:**

- Consumes: `AiReportSubmission`, `AiReportJob`, `AiReportJobStatus`, `CommercialAiReport` (`@/types/ai-report`).
- Produces: `AI_REPORT_POLL_INTERVAL_MS`, `AI_REPORT_POLL_TIMEOUT_MS`, `isPollableJobStatus(status)`, `reportFromSubmission(sub)`, `jobIdFromSubmission(sub)`, `PollDecision` type, `decideNextPoll(job, elapsedMs)`.

- [ ] **Step 1: 실패 테스트 작성** — `src/lib/analysis/ai-report-poll.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import {
  AI_REPORT_POLL_INTERVAL_MS,
  AI_REPORT_POLL_TIMEOUT_MS,
  decideNextPoll,
  isPollableJobStatus,
  jobIdFromSubmission,
  reportFromSubmission,
} from '@/lib/analysis/ai-report-poll'
import type { AiReportJob, CommercialAiReport } from '@/types/ai-report'

const report = { summary: 'ok' } as CommercialAiReport
const job = (over: Partial<AiReportJob>): AiReportJob => ({
  jobId: 'j1',
  jobType: 'COMMERCIAL',
  status: 'PENDING',
  commercialReport: null,
  errorCode: null,
  errorMessage: null,
  ...over,
})

describe('submission helpers', () => {
  it('CACHED면 리포트를, ACCEPTED면 jobId를 뽑는다', () => {
    expect(
      reportFromSubmission({
        submissionStatus: 'CACHED',
        jobType: 'COMMERCIAL',
        jobId: null,
        commercialReport: report,
      }),
    ).toBe(report)
    expect(
      reportFromSubmission({
        submissionStatus: 'ACCEPTED',
        jobType: 'COMMERCIAL',
        jobId: 'j1',
        commercialReport: null,
      }),
    ).toBeNull()
    expect(
      jobIdFromSubmission({
        submissionStatus: 'ACCEPTED',
        jobType: 'COMMERCIAL',
        jobId: 'j1',
        commercialReport: null,
      }),
    ).toBe('j1')
    expect(
      jobIdFromSubmission({
        submissionStatus: 'CACHED',
        jobType: 'COMMERCIAL',
        jobId: null,
        commercialReport: report,
      }),
    ).toBeNull()
  })
})

describe('isPollableJobStatus', () => {
  it('PENDING/RUNNING만 폴링 대상', () => {
    expect(isPollableJobStatus('PENDING')).toBe(true)
    expect(isPollableJobStatus('RUNNING')).toBe(true)
    expect(isPollableJobStatus('COMPLETED')).toBe(false)
    expect(isPollableJobStatus('FAILED')).toBe(false)
  })
})

describe('decideNextPoll', () => {
  it('COMPLETED+리포트 → ready', () => {
    expect(
      decideNextPoll(
        job({ status: 'COMPLETED', commercialReport: report }),
        1000,
      ),
    ).toEqual({ kind: 'ready', report })
  })
  it('COMPLETED인데 리포트 없음 → error', () => {
    expect(decideNextPoll(job({ status: 'COMPLETED' }), 1000).kind).toBe(
      'error',
    )
  })
  it('FAILED → errorMessage 사용', () => {
    expect(
      decideNextPoll(job({ status: 'FAILED', errorMessage: '실패함' }), 1000),
    ).toEqual({ kind: 'error', message: '실패함' })
  })
  it('진행 중이고 타임아웃 전 → poll(간격)', () => {
    expect(decideNextPoll(job({ status: 'RUNNING' }), 1000)).toEqual({
      kind: 'poll',
      intervalMs: AI_REPORT_POLL_INTERVAL_MS,
    })
  })
  it('타임아웃 초과 → error', () => {
    expect(
      decideNextPoll(job({ status: 'RUNNING' }), AI_REPORT_POLL_TIMEOUT_MS)
        .kind,
    ).toBe('error')
  })
  it('job 아직 없음(undefined)+타임아웃 전 → poll', () => {
    expect(decideNextPoll(undefined, 0)).toEqual({
      kind: 'poll',
      intervalMs: AI_REPORT_POLL_INTERVAL_MS,
    })
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/lib/analysis/ai-report-poll.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현** — `src/lib/analysis/ai-report-poll.ts`

```ts
import type {
  AiReportJob,
  AiReportJobStatus,
  AiReportSubmission,
  CommercialAiReport,
} from '@/types/ai-report'

export const AI_REPORT_POLL_INTERVAL_MS = 2000
export const AI_REPORT_POLL_TIMEOUT_MS = 90000

export const isPollableJobStatus = (status: AiReportJobStatus): boolean =>
  status === 'PENDING' || status === 'RUNNING'

export const reportFromSubmission = (
  submission: AiReportSubmission,
): CommercialAiReport | null =>
  submission.submissionStatus === 'CACHED' ? submission.commercialReport : null

export const jobIdFromSubmission = (
  submission: AiReportSubmission,
): string | null =>
  submission.submissionStatus === 'ACCEPTED' ? submission.jobId : null

export type PollDecision =
  | { kind: 'poll'; intervalMs: number }
  | { kind: 'ready'; report: CommercialAiReport }
  | { kind: 'error'; message: string }

export const decideNextPoll = (
  job: AiReportJob | undefined,
  elapsedMs: number,
): PollDecision => {
  if (job?.status === 'COMPLETED') {
    return job.commercialReport
      ? { kind: 'ready', report: job.commercialReport }
      : { kind: 'error', message: '리포트를 불러오지 못했습니다.' }
  }
  if (job?.status === 'FAILED') {
    return {
      kind: 'error',
      message: job.errorMessage?.trim() || 'AI 리포트 생성에 실패했습니다.',
    }
  }
  if (elapsedMs >= AI_REPORT_POLL_TIMEOUT_MS) {
    return {
      kind: 'error',
      message: '시간이 초과되었습니다. 다시 시도해 주세요.',
    }
  }
  return { kind: 'poll', intervalMs: AI_REPORT_POLL_INTERVAL_MS }
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm exec vitest run src/lib/analysis/ai-report-poll.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/analysis/ai-report-poll.ts frontend/src/lib/analysis/ai-report-poll.test.ts
git commit -m "[FE] feat: AI 리포트 제출·폴링 결정 순수함수"
```

---

## Task 4: useAiReport 훅 (얇은 글루)

**Files:**

- Create: `src/hooks/use-ai-report.ts`

**Interfaces:**

- Consumes: Task 1 어댑터, Task 2 정규화, Task 3 폴링 결정.
- Produces: `AiReportState` (discriminated union), `useAiReport({ level, code, active, enabled })` → `{ state, retry }`.
- `active`: 카드가 클릭되어 조회가 켜졌는지. `enabled`: 하이드레이트+로그인.

> 테스트 없음(환경상 훅 테스트 불가). 결정 로직은 Task 2·3에서 검증됨. 검증은 typecheck/build + 이후 통합.

- [ ] **Step 1: 구현** — `src/hooks/use-ai-report.ts`

```ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchAdministrationAiReport,
  fetchAiReportJob,
  fetchDistrictAiReport,
  submitCommercialAiReport,
} from '@/lib/api/ai-report'
import {
  toCommercialReportView,
  toRegionReportView,
  isCommercialReportEmpty,
  isRegionReportEmpty,
  type CommercialReportView,
  type RegionReportView,
} from '@/lib/analysis/ai-report-presentation'
import {
  AI_REPORT_POLL_INTERVAL_MS,
  decideNextPoll,
  jobIdFromSubmission,
  reportFromSubmission,
} from '@/lib/analysis/ai-report-poll'
import type { AiReportLevel } from '@/types/ai-report'

export type AiReportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready-commercial'; view: CommercialReportView }
  | { status: 'ready-region'; view: RegionReportView }
  | { status: 'empty' }
  | { status: 'error'; message: string }

type UseAiReportArgs = {
  level: AiReportLevel | null
  code: string | null
  active: boolean
  enabled: boolean
}

export const useAiReport = ({
  level,
  code,
  active,
  enabled,
}: UseAiReportArgs): { state: AiReportState; retry: () => void } => {
  const queryClient = useQueryClient()
  const on = enabled && active && Boolean(level && code)
  const isRegion = level === 'district' || level === 'administration'
  const isCommercial = level === 'commercial'

  // 지역(자치구/행정동): 동기 GET
  const regionQuery = useQuery({
    queryKey: ['ai-report', 'region', level, code],
    queryFn: () =>
      level === 'district'
        ? fetchDistrictAiReport(code!)
        : fetchAdministrationAiReport(code!),
    enabled: on && isRegion,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })

  // 상권: POST 제출
  const submitQuery = useQuery({
    queryKey: ['ai-report', 'commercial-submit', code],
    queryFn: () => submitCommercialAiReport(code!),
    enabled: on && isCommercial,
    retry: 0,
    staleTime: 5 * 60 * 1000,
  })

  const cachedReport = submitQuery.data
    ? reportFromSubmission(submitQuery.data)
    : null
  const jobId = submitQuery.data ? jobIdFromSubmission(submitQuery.data) : null

  // 폴링 시작 시각(경과 계산용)
  const startedAtRef = useRef<number | null>(null)
  useEffect(() => {
    startedAtRef.current = jobId ? Date.now() : null
  }, [jobId])

  const jobQuery = useQuery({
    queryKey: ['ai-report', 'job', jobId],
    queryFn: () => fetchAiReportJob(jobId!),
    enabled: on && isCommercial && Boolean(jobId) && !cachedReport,
    retry: 0,
    refetchInterval: query => {
      const elapsed = startedAtRef.current
        ? Date.now() - startedAtRef.current
        : 0
      const decision = decideNextPoll(query.state.data, elapsed)
      return decision.kind === 'poll' ? decision.intervalMs : false
    },
    refetchIntervalInBackground: false,
  })

  const retry = useCallback(() => {
    startedAtRef.current = null
    if (isRegion) {
      void queryClient.invalidateQueries({
        queryKey: ['ai-report', 'region', level, code],
      })
    } else if (isCommercial) {
      void queryClient.invalidateQueries({
        queryKey: ['ai-report', 'commercial-submit', code],
      })
      if (jobId) {
        void queryClient.invalidateQueries({
          queryKey: ['ai-report', 'job', jobId],
        })
      }
    }
  }, [queryClient, level, code, isRegion, isCommercial, jobId])

  const state = deriveState({
    on,
    isRegion,
    isCommercial,
    regionQuery,
    submitQuery,
    jobQuery,
    cachedReport,
    jobId,
    startedAt: startedAtRef.current,
  })

  return { state, retry }
}
```

- [ ] **Step 2: 상태 파생 헬퍼 추가**(같은 파일 하단) — RQ 출력 → `AiReportState`. 결정은 Task 2·3 순수함수에 위임.

```ts
import type { UseQueryResult } from '@tanstack/react-query'
import type {
  AiReportJob,
  AiReportSubmission,
  RegionAiReport,
} from '@/types/ai-report'

const deriveState = (a: {
  on: boolean
  isRegion: boolean
  isCommercial: boolean
  regionQuery: UseQueryResult<RegionAiReport>
  submitQuery: UseQueryResult<AiReportSubmission>
  jobQuery: UseQueryResult<AiReportJob>
  cachedReport: Parameters<typeof toCommercialReportView>[0] | null
  jobId: string | null
  startedAt: number | null
}): AiReportState => {
  if (!a.on) return { status: 'idle' }

  if (a.isRegion) {
    if (a.regionQuery.isError)
      return { status: 'error', message: '리포트를 불러오지 못했습니다.' }
    if (!a.regionQuery.data) return { status: 'loading' }
    const view = toRegionReportView(a.regionQuery.data)
    return isRegionReportEmpty(view)
      ? { status: 'empty' }
      : { status: 'ready-region', view }
  }

  if (a.isCommercial) {
    if (a.submitQuery.isError)
      return { status: 'error', message: 'AI 리포트 요청에 실패했습니다.' }
    if (a.cachedReport) {
      const view = toCommercialReportView(a.cachedReport)
      return isCommercialReportEmpty(view)
        ? { status: 'empty' }
        : { status: 'ready-commercial', view }
    }
    if (!a.jobId) return { status: 'loading' }
    const elapsed = a.startedAt ? Date.now() - a.startedAt : 0
    const decision = decideNextPoll(a.jobQuery.data, elapsed)
    if (decision.kind === 'error')
      return { status: 'error', message: decision.message }
    if (decision.kind === 'ready') {
      const view = toCommercialReportView(decision.report)
      return isCommercialReportEmpty(view)
        ? { status: 'empty' }
        : { status: 'ready-commercial', view }
    }
    return { status: 'loading' }
  }

  return { status: 'idle' }
}
```

> 주의: `deriveState`와 `AiReportState`가 파일 상단 `useAiReport`에서 참조되므로, import(`UseQueryResult` 등)는 파일 상단에 모으고 `decideNextPoll` import에 `AI_REPORT_POLL_INTERVAL_MS` 미사용이면 제거(lint max-warnings=0).

- [ ] **Step 3: 타입체크**

Run: `pnpm exec tsc --noEmit --incremental false`
Expected: 에러 없음 (미사용 import 있으면 제거)

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/hooks/use-ai-report.ts
git commit -m "[FE] feat: useAiReport 조회·폴링 훅"
```

---

## Task 5: 리포트 블록 컴포넌트 (프레젠테이션)

**Files:**

- Create: `src/components/analysis/ai-report/report-blocks.tsx`
- Test: `src/components/analysis/ai-report/report-blocks.test.ts`

**Interfaces:**

- Consumes: `CommercialReportView`, `RegionReportView`, `ReportBlockList` (`@/lib/analysis/ai-report-presentation`).
- Produces: `CommercialReportBlocks({ view })`, `RegionReportBlocks({ view })` (default exports 아님, named).

- [ ] **Step 1: 실패 테스트** — `src/components/analysis/ai-report/report-blocks.test.ts`

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  CommercialReportBlocks,
  RegionReportBlocks,
} from '@/components/analysis/ai-report/report-blocks'

describe('CommercialReportBlocks', () => {
  it('헤드라인·강점·주의·추천실행 항목을 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(CommercialReportBlocks, {
        view: {
          headline: { summary: '한 줄 요약', insight: '창업 코멘트' },
          strengths: ['유동 많음'],
          risks: ['임대료 높음'],
          actions: [{ title: '추천 업종군', items: ['카페'] }],
          generatedAt: '2026-08-07',
        },
      }),
    )
    expect(markup).toContain('한 줄 요약')
    expect(markup).toContain('창업 코멘트')
    expect(markup).toContain('유동 많음')
    expect(markup).toContain('임대료 높음')
    expect(markup).toContain('추천 업종군')
    expect(markup).toContain('카페')
  })
})

describe('RegionReportBlocks', () => {
  it('요약·시장상태·추천/주의 업종군을 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(RegionReportBlocks, {
        view: {
          headline: { summary: '시장 요약', marketStatus: '성장' },
          recommended: ['카페'],
          caution: ['편의점'],
          insight: '코멘트',
          generatedAt: '2026-08-07',
        },
      }),
    )
    expect(markup).toContain('시장 요약')
    expect(markup).toContain('성장')
    expect(markup).toContain('카페')
    expect(markup).toContain('편의점')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/components/analysis/ai-report/report-blocks.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현** — `src/components/analysis/ai-report/report-blocks.tsx`

styled-components + DESIGN.md 토큰만 사용. 빈 리스트 섹션은 렌더하지 않는다.

```tsx
import styled from 'styled-components'

import type {
  CommercialReportView,
  RegionReportView,
  ReportBlockList,
} from '@/lib/analysis/ai-report-presentation'

const Block = styled.section`
  display: grid;
  gap: 8px;
  padding: 16px 0;
  border-top: 1px solid var(--color-border-200);

  &:first-child {
    border-top: none;
  }
`

const BlockTitle = styled.h4`
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-700);
`

const Summary = styled.p`
  font-size: 15px;
  line-height: 22px;
  color: var(--color-text-900);
`

const Insight = styled.p`
  font-size: 13px;
  line-height: 20px;
  color: var(--color-text-600);
`

const Chips = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Chip = styled.li`
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-700);
  font-size: 12px;
`

const Bullets = styled.ul`
  display: grid;
  gap: 6px;
  padding-left: 16px;
  list-style: disc;
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
`

function ChipList({ block }: { block: ReportBlockList }) {
  return (
    <Block>
      <BlockTitle>{block.title}</BlockTitle>
      <Chips>
        {block.items.map(item => (
          <Chip key={item}>{item}</Chip>
        ))}
      </Chips>
    </Block>
  )
}

function BulletBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <Block>
      <BlockTitle>{title}</BlockTitle>
      <Bullets>
        {items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </Bullets>
    </Block>
  )
}

export function CommercialReportBlocks({
  view,
}: {
  view: CommercialReportView
}) {
  return (
    <div>
      <Block>
        {view.headline.summary ? (
          <Summary>{view.headline.summary}</Summary>
        ) : null}
        {view.headline.insight ? (
          <Insight>{view.headline.insight}</Insight>
        ) : null}
      </Block>
      <BulletBlock title="강점" items={view.strengths} />
      <BulletBlock title="주의" items={view.risks} />
      {view.actions.map(block => (
        <ChipList key={block.title} block={block} />
      ))}
    </div>
  )
}

export function RegionReportBlocks({ view }: { view: RegionReportView }) {
  return (
    <div>
      <Block>
        {view.headline.summary ? (
          <Summary>{view.headline.summary}</Summary>
        ) : null}
        {view.headline.marketStatus ? (
          <Insight>{view.headline.marketStatus}</Insight>
        ) : null}
      </Block>
      {view.recommended.length > 0 ? (
        <ChipList block={{ title: '추천 업종군', items: view.recommended }} />
      ) : null}
      {view.caution.length > 0 ? (
        <ChipList block={{ title: '주의 업종군', items: view.caution }} />
      ) : null}
      <BulletBlock title="코멘트" items={view.insight ? [view.insight] : []} />
    </div>
  )
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm exec vitest run src/components/analysis/ai-report/report-blocks.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/components/analysis/ai-report/report-blocks.tsx frontend/src/components/analysis/ai-report/report-blocks.test.ts
git commit -m "[FE] feat: AI 리포트 블록 렌더 컴포넌트"
```

---

## Task 6: 카드 배너 컴포넌트

**Files:**

- Create: `src/components/analysis/ai-report/ai-report-card.tsx`
- Test: `src/components/analysis/ai-report/ai-report-card.test.ts`

**Interfaces:**

- Produces: `AiReportCard({ targetName, onOpen })` (default export). `targetName`은 레벨명(예: "삼평동").

- [ ] **Step 1: 실패 테스트** — `src/components/analysis/ai-report/ai-report-card.test.ts`

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AiReportCard from '@/components/analysis/ai-report/ai-report-card'

describe('AiReportCard', () => {
  it('대상 이름과 분석하기 문구를 담은 버튼을 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AiReportCard, { targetName: '삼평동', onOpen: () => {} }),
    )
    expect(markup).toContain('삼평동')
    expect(markup).toContain('AI 리포트 분석하기')
    expect(markup).toContain('<button')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm exec vitest run src/components/analysis/ai-report/ai-report-card.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현** — `src/components/analysis/ai-report/ai-report-card.tsx`

```tsx
import { Sparkles } from 'lucide-react'
import styled from 'styled-components'

const CardButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);
  color: var(--color-text-900);
  cursor: pointer;
  text-align: left;
`

const Label = styled.span`
  display: grid;
  gap: 2px;
`

const Target = styled.span`
  font-size: 12px;
  color: var(--color-text-600);
`

const Cta = styled.span`
  font-size: 14px;
  font-weight: 700;
`

export default function AiReportCard({
  targetName,
  onOpen,
}: {
  targetName: string
  onOpen: () => void
}) {
  return (
    <CardButton type="button" onClick={onOpen}>
      <Sparkles size={18} aria-hidden />
      <Label>
        <Target>{targetName}</Target>
        <Cta>AI 리포트 분석하기</Cta>
      </Label>
    </CardButton>
  )
}
```

- [ ] **Step 4: 통과 확인** — `pnpm exec vitest run src/components/analysis/ai-report/ai-report-card.test.ts` → PASS

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/components/analysis/ai-report/ai-report-card.tsx frontend/src/components/analysis/ai-report/ai-report-card.test.ts
git commit -m "[FE] feat: AI 리포트 카드 배너 컴포넌트"
```

---

## Task 7: 패널 셸 컴포넌트 (상태 → 마크업)

**Files:**

- Create: `src/components/analysis/ai-report/ai-report-panel.tsx`
- Test: `src/components/analysis/ai-report/ai-report-panel.test.ts`

**Interfaces:**

- Consumes: `AiReportState` (`@/hooks/use-ai-report`), `CommercialReportBlocks`/`RegionReportBlocks` (Task 5).
- Produces: `AiReportPanel({ targetName, state, onClose, onRetry, onViewFullAnalysis })` (default export). `onViewFullAnalysis?`: 분야 선택 완료 시에만 전달(없으면 링크 미표시).

- [ ] **Step 1: 실패 테스트** — `src/components/analysis/ai-report/ai-report-panel.test.ts`

각 상태의 마크업을 검증한다.

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AiReportPanel from '@/components/analysis/ai-report/ai-report-panel'
import type { AiReportState } from '@/hooks/use-ai-report'

const render = (state: AiReportState, extra = {}) =>
  renderToStaticMarkup(
    createElement(AiReportPanel, {
      targetName: '삼평동',
      state,
      onClose: () => {},
      onRetry: () => {},
      ...extra,
    }),
  )

describe('AiReportPanel', () => {
  it('loading 상태는 생성 중 문구를 노출한다', () => {
    expect(render({ status: 'loading' })).toContain('리포트를 생성')
  })

  it('error 상태는 메시지와 다시 시도 버튼을 노출한다', () => {
    const markup = render({ status: 'error', message: '실패함' })
    expect(markup).toContain('실패함')
    expect(markup).toContain('다시 시도')
  })

  it('empty 상태는 안내 문구를 노출한다', () => {
    expect(render({ status: 'empty' })).toContain('표시할 내용')
  })

  it('ready-region 상태는 지역 블록을 렌더한다', () => {
    const markup = render({
      status: 'ready-region',
      view: {
        headline: { summary: '시장 요약', marketStatus: '성장' },
        recommended: ['카페'],
        caution: [],
        insight: '코멘트',
        generatedAt: '',
      },
    })
    expect(markup).toContain('시장 요약')
    expect(markup).toContain('카페')
  })

  it('전체 분석 링크는 onViewFullAnalysis가 있을 때만 노출한다', () => {
    expect(render({ status: 'loading' })).not.toContain('전체 분석 보기')
    expect(
      render({ status: 'loading' }, { onViewFullAnalysis: () => {} }),
    ).toContain('전체 분석 보기')
  })
})
```

- [ ] **Step 2: 실패 확인** — `pnpm exec vitest run src/components/analysis/ai-report/ai-report-panel.test.ts` → FAIL

- [ ] **Step 3: 구현** — `src/components/analysis/ai-report/ai-report-panel.tsx`

```tsx
import { X } from 'lucide-react'
import styled from 'styled-components'

import {
  CommercialReportBlocks,
  RegionReportBlocks,
} from '@/components/analysis/ai-report/report-blocks'
import { Button } from '@/components/ui/button'
import type { AiReportState } from '@/hooks/use-ai-report'

const Shell = styled.aside`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface);
`

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-200);
`

const Title = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-900);
`

const CloseButton = styled.button`
  display: inline-flex;
  padding: 6px;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-600);
  cursor: pointer;
`

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 20px 20px;
`

const StatusText = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 21px;
  text-align: center;
`

const Footer = styled.footer`
  padding: 12px 20px;
  border-top: 1px solid var(--color-border-200);
`

function Content({
  state,
  onRetry,
}: {
  state: AiReportState
  onRetry: () => void
}) {
  switch (state.status) {
    case 'loading':
      return <StatusText>리포트를 생성하고 있어요…</StatusText>
    case 'empty':
      return <StatusText>표시할 내용이 없어요.</StatusText>
    case 'error':
      return (
        <div>
          <StatusText>{state.message}</StatusText>
          <Button type="button" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      )
    case 'ready-commercial':
      return <CommercialReportBlocks view={state.view} />
    case 'ready-region':
      return <RegionReportBlocks view={state.view} />
    default:
      return null
  }
}

export default function AiReportPanel({
  targetName,
  state,
  onClose,
  onRetry,
  onViewFullAnalysis,
}: {
  targetName: string
  state: AiReportState
  onClose: () => void
  onRetry: () => void
  onViewFullAnalysis?: () => void
}) {
  return (
    <Shell aria-label={`${targetName} AI 리포트`}>
      <Header>
        <Title>{targetName} AI 리포트</Title>
        <CloseButton type="button" aria-label="닫기" onClick={onClose}>
          <X size={18} aria-hidden />
        </CloseButton>
      </Header>
      <Body>
        <Content state={state} onRetry={onRetry} />
      </Body>
      {onViewFullAnalysis ? (
        <Footer>
          <Button type="button" onClick={onViewFullAnalysis}>
            전체 분석 보기
          </Button>
        </Footer>
      ) : null}
    </Shell>
  )
}
```

> `@/components/ui/button`의 실제 export 형태(`Button` named)는 Task 시작 시 `src/components/ui/button.tsx`에서 확인하고 맞춘다. 다르면 import를 조정.

- [ ] **Step 4: 통과 확인** — `pnpm exec vitest run src/components/analysis/ai-report/ai-report-panel.test.ts` → PASS

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/components/analysis/ai-report/ai-report-panel.tsx frontend/src/components/analysis/ai-report/ai-report-panel.test.ts
git commit -m "[FE] feat: AI 리포트 패널 셸(상태 분기 렌더)"
```

---

## Task 8: 데스크톱 통합 (Surface 슬롯 + 페이지 배선)

**Files:**

- Modify: `src/components/analysis/analysis-page.tsx` (Surface에 슬롯 추가, `AnalysisPage`에 상태 배선)
- Modify: `src/components/analysis/analysis-page.test.ts` (Surface 슬롯 마크업 검증)

**Interfaces:**

- Consumes: `useAiReport` (Task 4), `AiReportCard` (Task 6), `AiReportPanel` (Task 7), `resolveAiReportLevel`/`resolveAiReportTargetCode` (Task 2), `useAuthStore` (`@/stores/auth-store`), `isCompleteAnalysisSelection`/`createAnalysisResultHref` (`@/lib/analysis/selection`).
- `AnalysisExplorerSurface`에 optional props 추가: `aiReportCard?: ReactNode`, `aiReportPanel?: ReactNode`.

- [ ] **Step 1: Surface 슬롯 실패 테스트 추가** — `analysis-page.test.ts`에 케이스 추가

```ts
it('aiReportCard/aiReportPanel 슬롯을 MapArea 위에 렌더한다', () => {
  const markup = renderToStaticMarkup(
    createElement(AnalysisExplorerSurface, {
      map: createElement('div', null, 'MAP'),
      desktopPanel: createElement('div', null, 'PANEL'),
      mobilePanel: createElement('div', null, 'MOBILE'),
      aiReportCard: createElement('div', null, 'AI_CARD'),
      aiReportPanel: createElement('div', null, 'AI_PANEL'),
    }),
  )
  expect(markup).toContain('AI_CARD')
  expect(markup).toContain('AI_PANEL')
})
```

- [ ] **Step 2: 실패 확인** — `pnpm exec vitest run src/components/analysis/analysis-page.test.ts` → FAIL

- [ ] **Step 3: Surface에 슬롯 추가** — `analysis-page.tsx`

styled 추가(카드: 맵 영역 좌상단 앵커 / 패널: 맵 영역 좌측 앵커 슬라이드, 지도는 그 아래 유지):

```tsx
const AiReportCardSlot = styled.div`
  position: absolute;
  z-index: 7;
  top: 16px;
  left: 16px;
  max-width: min(320px, calc(100% - 32px));

  @media (max-width: 840px) {
    display: none;
  }
`

const AiReportPanelSlot = styled.div`
  position: absolute;
  z-index: 9;
  top: 0;
  left: 0;
  height: 100%;
  width: min(380px, 92%);
  border-right: 1px solid var(--color-border-200);
  box-shadow: var(--shadow-level-3);

  @media (max-width: 840px) {
    display: none;
  }
`
```

`AnalysisExplorerSurface` 시그니처·본문 수정:

```tsx
export function AnalysisExplorerSurface({
  map,
  desktopPanel,
  mobilePanel,
  mapNotice,
  aiReportCard,
  aiReportPanel,
}: {
  map: ReactNode
  desktopPanel: ReactNode
  mobilePanel: ReactNode
  mapNotice?: ReactNode
  aiReportCard?: ReactNode
  aiReportPanel?: ReactNode
}) {
  return (
    <Page data-hide-footer="true">
      <Layout>
        <DesktopPanel>{desktopPanel}</DesktopPanel>
        <MapArea>
          {map}
          {mapNotice ? <MapNotice>{mapNotice}</MapNotice> : null}
          {aiReportCard ? (
            <AiReportCardSlot>{aiReportCard}</AiReportCardSlot>
          ) : null}
          {aiReportPanel ? (
            <AiReportPanelSlot>{aiReportPanel}</AiReportPanelSlot>
          ) : null}
          <MobilePanel>{mobilePanel}</MobilePanel>
        </MapArea>
      </Layout>
    </Page>
  )
}
```

- [ ] **Step 4: Surface 테스트 통과 확인** — `pnpm exec vitest run src/components/analysis/analysis-page.test.ts` → PASS

- [ ] **Step 5: `AnalysisPage`에 AI 리포트 상태 배선**

`AnalysisPage` 함수 안에 추가(기존 `selection`, `router` 재사용):

```tsx
// 상단 import 추가
import AiReportCard from '@/components/analysis/ai-report/ai-report-card'
import AiReportPanel from '@/components/analysis/ai-report/ai-report-panel'
import { useAiReport } from '@/hooks/use-ai-report'
import {
  resolveAiReportLevel,
  resolveAiReportTargetCode,
} from '@/lib/analysis/ai-report-presentation'
import { useAuthStore } from '@/stores/auth-store'
import {
  createAnalysisResultHref,
  isCompleteAnalysisSelection,
} from '@/lib/analysis/selection'
```

```tsx
const hasHydrated = useAuthStore(state => state.hasHydrated)
const isLoggedIn = useAuthStore(state => state.isLoggedIn)
const aiEnabled = hasHydrated && isLoggedIn

const aiLevel = resolveAiReportLevel(selection)
const aiCode = aiLevel ? resolveAiReportTargetCode(selection, aiLevel) : null
const aiLevelKey = aiLevel && aiCode ? `${aiLevel}:${aiCode}` : null

const [aiActiveKey, setAiActiveKey] = useState<string | null>(null)
const [aiPanelOpen, setAiPanelOpen] = useState(false)

// 선택 레벨/코드가 바뀌면 리셋(자동 조회 금지)
useEffect(() => {
  setAiActiveKey(null)
  setAiPanelOpen(false)
}, [aiLevelKey])

const aiActive = Boolean(aiLevelKey) && aiActiveKey === aiLevelKey
const { state: aiState, retry: aiRetry } = useAiReport({
  level: aiLevel,
  code: aiCode,
  active: aiActive,
  enabled: aiEnabled,
})

// 레벨명: 선택 패널이 아는 이름을 재사용(없으면 코드 fallback)
const aiTargetName = selectedNames?.[aiLevel as AnalysisStep] ?? aiCode ?? ''

const openFullAnalysis = isCompleteAnalysisSelection(selection)
  ? () => router.push(createAnalysisResultHref(selection))
  : undefined

const showAiCard = aiEnabled && Boolean(aiLevelKey) && !aiPanelOpen
const showAiPanel = aiEnabled && Boolean(aiLevelKey) && aiPanelOpen
```

> `selectedNames`는 기존 `AnalysisPage`가 선택 패널에 넘기는 이름 맵을 재사용한다. 존재하는 변수명이 다르면(예: `selectionNames`) 실제 코드에서 확인해 맞춘다. 없으면 이 슬라이스에선 `aiCode` fallback만 사용.

`AnalysisExplorerSurface` 호출부에 슬롯 전달:

```tsx
aiReportCard={
  showAiCard && aiLevelKey ? (
    <AiReportCard
      targetName={aiTargetName}
      onOpen={() => {
        setAiActiveKey(aiLevelKey)
        setAiPanelOpen(true)
      }}
    />
  ) : null
}
aiReportPanel={
  showAiPanel ? (
    <AiReportPanel
      targetName={aiTargetName}
      state={aiState}
      onClose={() => setAiPanelOpen(false)}
      onRetry={aiRetry}
      onViewFullAnalysis={openFullAnalysis}
    />
  ) : null
}
```

- [ ] **Step 6: 타입체크 + 전체 테스트**

Run: `pnpm exec tsc --noEmit --incremental false && pnpm test`
Expected: 통과 (미사용 import·변수 정리)

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/components/analysis/analysis-page.tsx frontend/src/components/analysis/analysis-page.test.ts
git commit -m "[FE] feat: 데스크톱 AI 리포트 카드·패널 통합"
```

---

## Task 9: 모바일 통합 (시트)

**Files:**

- Modify: `src/components/analysis/analysis-mobile-sheet.tsx`
- Modify: `src/components/analysis/analysis-mobile-sheet.test.ts`

**Interfaces:**

- Consumes: `AiReportCard`, `AiReportPanel`, `useAiReport` 결과(상위에서 prop으로 전달). 모바일은 2뎁스 스택 대신 기존 시트 위에 카드 CTA를 얹고, 열면 시트/풀스크린으로 패널을 표시한다.
- 상위(`AnalysisPage` 모바일 경로)에서 `aiReportCard`/`aiReportPanel` 노드를 `mobilePanel` 구성에 함께 전달하거나, 시트 컴포넌트가 관련 props를 받도록 확장.

- [ ] **Step 1: 시트 구조 확인**

Run: `sed -n '1,80p' src/components/analysis/analysis-mobile-sheet.tsx` 로 현재 시트 props·레이아웃을 파악한다. (스냅 포인트/헤더 구성에 카드 CTA를 삽입할 위치 결정)

- [ ] **Step 2: 실패 테스트 추가** — `analysis-mobile-sheet.test.ts`

카드 CTA prop을 받으면 시트에 렌더하는지 마크업으로 검증(실제 prop명은 Step 1에서 확정). 예:

```ts
it('aiReportSlot을 시트 안에 렌더한다', () => {
  const markup = renderToStaticMarkup(
    createElement(AnalysisMobileSheet, {
      /* 기존 필수 props … */
      aiReportSlot: createElement('div', null, 'AI_MOBILE'),
    } as never),
  )
  expect(markup).toContain('AI_MOBILE')
})
```

- [ ] **Step 3: 실패 확인** — `pnpm exec vitest run src/components/analysis/analysis-mobile-sheet.test.ts` → FAIL

- [ ] **Step 4: 시트에 `aiReportSlot?: ReactNode` prop 추가·렌더**, `AnalysisPage` 모바일 경로에서 카드/패널 노드를 전달. 데스크톱과 동일 상태(`aiState`·open·reset)를 공유한다.

- [ ] **Step 5: 통과 확인 + 타입체크** — `pnpm exec vitest run src/components/analysis/analysis-mobile-sheet.test.ts && pnpm exec tsc --noEmit --incremental false` → PASS

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/components/analysis/analysis-mobile-sheet.tsx frontend/src/components/analysis/analysis-mobile-sheet.test.ts
git commit -m "[FE] feat: 모바일 AI 리포트 시트 통합"
```

---

## Task 10: 최종 검증 + 명세 상태 갱신

**Files:**

- Modify: `docs/features/_index.md` (analysis 행 또는 신규 기능 상태), `docs/features/analysis/ai-report.md` (상태 → 구현 완료)

- [ ] **Step 1: 전체 QA 검증**

Run: `pnpm qa:verify`
Expected: format:check, lint(max-warnings=0), typecheck, build 모두 PASS. 실패 시 원인 파일 수정 후 재실행. (미실행 통과 보고 금지)

- [ ] **Step 2: 개발 서버로 수동 흐름 확인(선택)**

`PORT=5173 pnpm -C BossPickSeoul/frontend dev` 후 로그인 상태로 `/analysis`에서 자치구 선택 → 카드 등장 → 클릭 → 패널/리포트, 상권까지 선택 → 폴링, 레벨 변경 시 리셋 확인.

- [ ] **Step 3: 명세 상태 갱신** — `ai-report.md` 헤더 상태를 "구현 완료(첫 슬라이스)"로, `_index.md`에 반영.

- [ ] **Step 4: 커밋**

```bash
git add frontend/docs/features/analysis/ai-report.md frontend/docs/features/_index.md
git commit -m "[FE] docs: AI 리포트 컴패니언 첫 슬라이스 구현 완료 반영"
```

---

## Self-Review

**Spec coverage (D2 요구사항 → Task):**

- D2-1 카드 배너(레벨명) → Task 6, 8
- D2-2 클릭 게이트(선택만으론 조회X) → Task 8 (`aiActive`/`aiActiveKey`)
- D2-3 가장 깊은 레벨 → Task 2 `resolveAiReportLevel`
- D2-4 선택 변경 리셋 → Task 8 `useEffect([aiLevelKey])`
- D2-5 자치구·행정동 동기 GET → Task 1, 4 (`regionQuery`)
- D2-6 상권 POST+폴링(CACHED 즉시) → Task 3, 4 (`submitQuery`/`jobQuery`/`decideNextPoll`)
- D2-7 상태 분기(로딩/실패/타임아웃/빈)+재시도 → Task 3, 4, 7
- D2-8 데스크톱 2뎁스 / 모바일 시트 → Task 8, 9
- D2-9 대시보드 모달 유지 + "전체 분석 보기" → Task 7, 8 (`onViewFullAnalysis`)
- D2-10 비로그인·무효 코드 미노출 → Task 8 (`aiEnabled`/`aiLevelKey`)
- D7 테스트케이스 → 순수함수(Task 2,3)·컴포넌트 마크업(Task 5,6,7)·Surface(Task 8)로 커버. (환경 제약상 훅/상호작용 e2e는 수동 확인 Task 10-2.)

**Placeholder scan:** Task 9는 시트 실제 구조 확인 후 prop명 확정이 필요한 부분을 명시적으로 남김(플레이스홀더가 아니라 "현물 확인 후 맞춤" 지시). 나머지 코드 스텝은 실제 코드 포함.

**Type consistency:** `AiReportState`(Task 4)를 Task 7·8이 동일하게 소비. `CommercialReportView`/`RegionReportView`(Task 2)를 Task 4·5·7이 동일 필드로 사용. `aiReportPath`/어댑터 시그니처(Task 1)를 Task 4가 그대로 호출. 카드 prop `{targetName,onOpen}`·패널 prop `{targetName,state,onClose,onRetry,onViewFullAnalysis}`가 Task 6·7 정의와 Task 8 사용처 일치.

**알려진 확인 지점(구현 시 현물 대조):**

- `@/components/ui/button`의 export 형태(Button named vs default) — Task 7.
- `AnalysisPage`의 선택 이름 맵 변수명(`selectedNames` 가정) — Task 8.
- `analysis-mobile-sheet.tsx`의 props·스냅 구조 — Task 9.
- `@/stores/auth-store`의 `hasHydrated`/`isLoggedIn` 셀렉터명(result-view에서 동일 사용 확인됨).
