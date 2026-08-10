# AI 리포트 비동기/SSE 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 리포트 3종(자치구·행정동·상권)을 백엔드 개편 계약(POST 제출 → SSE 우선/폴링 폴백)에 맞춰 재구현하고, 미인증 잠금 카드·진행 단계·진행문구 순환·에러코드 분기를 붙인다.

**Architecture:** 동기 GET을 폐기하고 3종 모두 `apiClient(/api/bff)`로 POST 제출한다. `ACCEPTED`면 전용 스트리밍 라우트(`app/api/ai-reports/jobs/[jobId]/stream`)가 세션 Bearer를 주입해 백엔드 SSE의 `ReadableStream`을 버퍼링 없이 파이프하고, 브라우저는 same-origin fetch reader로 구독한다. SSE가 끊기면 기존 버퍼링 BFF 프록시를 통한 3초 폴링으로 폴백한다. 상태·표현은 순수함수(`ai-report-poll`, `ai-report-presentation`, `ai-report-sse`)로 분리해 테스트한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, pnpm, vitest, styled-components, TanStack React Query, axios(apiClient), Zustand(useAuthStore).

## Global Constraints

- 패키지 매니저 pnpm. 테스트 러너 vitest. 완료 게이트 `pnpm test` + `pnpm qa:verify`(= `format:check && lint && typecheck && build`).
- **신규 의존성 추가 금지.** SSE 파서는 자체 구현(무의존). `@microsoft/fetch-event-source`/`eventsource` 도입하지 않는다.
- **BFF 토큰 커스터디**: 브라우저는 accessToken을 절대 보지 못한다. Authorization 헤더는 서버 라우트(`/api/bff/*` 또는 신규 스트리밍 라우트)만 주입한다. 브라우저 fetch에 Authorization을 넣지 않는다.
- **스트리밍 라우트는 `arrayBuffer()`/`text()`로 본문을 버퍼링하지 않는다**(성공 응답 한정). `upstream.body`를 그대로 파이프한다.
- 색/radius/shadow/spacing은 `DESIGN.md` 토큰(`var(--color-*)`, `var(--radius-*)`, `var(--shadow-*)`)만 사용. 임의 토큰 추가 금지.
- 모든 파일 UTF-8(no BOM). 한글 포함 파일은 Write 툴로 저장.
- 비로그인 상태에서 `/api/v1/ai-reports/**`를 절대 호출하지 않는다(훅 `enabled=false`).
- `progressMessages`·단계 문구는 하드코딩 금지. 백엔드가 내려준 값만 사용한다.
- 정본 명세: `docs/features/analysis/ai-report.md`(이미 갱신됨). 계약 세부는 `../backend/docs/ai-report-frontend-guide.md` 및 백엔드 DTO.

---

## File Structure

| 파일 | 책임 | 상태 |
| --- | --- | --- |
| `src/types/ai-report.ts` | 응답 스키마 미러(Meta 객체 계약) | 재작성 |
| `src/lib/api/ai-report.ts` | 3종 제출 + 폴링 어댑터, 경로 빌더 | 재작성 |
| `src/lib/analysis/ai-report-poll.ts` | 제출/폴링 판정·리포트 선택 순수함수 | 재작성 |
| `src/lib/analysis/ai-report-presentation.ts` | 뷰모델 정규화 + 가시성 헬퍼(잠금 포함) | 일부 수정(Task 6) |
| `src/lib/analysis/ai-report-sse.ts` | SSE 프레임 파서 + 구독기 | 신규 |
| `src/lib/analysis/ai-report-samples.ts` | 잠금 카드용 레벨별 정적 샘플 | 신규 |
| `app/api/ai-reports/jobs/[jobId]/stream/route.ts` | 전용 SSE 스트리밍 라우트 | 신규 |
| `src/hooks/use-ai-report.ts` | 제출 + SSE/폴링 상태 머신 | 재작성(Task 1 poll-only → Task 4 SSE) |
| `src/hooks/use-progress-rotation.ts` | progressMessages 4초 순환 | 신규 |
| `src/components/analysis/ai-report/ai-report-panel.tsx` | 패널 셸(단계·진행문구·에러) | 수정(Task 5) |
| `src/components/analysis/ai-report/ai-report-lock-card.tsx` | 잠금 카드 | 신규(Task 6) |
| `src/components/analysis/analysis-page.tsx` | 카드/잠금/패널 배치·게이팅 | 수정(Task 7) |

각 파일의 테스트는 동일 경로 `*.test.ts`.

---

## Task 1: 계약 타입 + 데이터 계층 + 훅 재작성 (폴링 우선, 동기 GET 폐기)

백엔드 계약이 문자열 → `{code,name,description}` 객체로 바뀌고 region도 POST가 되므로, 타입·API·poll·훅·기존 테스트를 **원자적으로** 함께 옮긴다. 이 단계는 SSE 없이 3종 전부 POST+폴링으로 동작하는 그린 상태를 만든다.

**Files:**
- Modify: `src/types/ai-report.ts` (rewrite)
- Modify: `src/lib/api/ai-report.ts` (rewrite)
- Modify: `src/lib/analysis/ai-report-poll.ts` (rewrite)
- Modify: `src/hooks/use-ai-report.ts` (rewrite)
- Test: `src/lib/api/ai-report.test.ts` (update), `src/lib/analysis/ai-report-poll.test.ts` (update), `src/components/analysis/ai-report/ai-report-panel.test.ts` (update for new state shape)

**Interfaces:**
- Produces:
  - `type Meta<C extends string = string> = { code: C; name: string; description: string }`
  - `AiReportJobTypeCode = 'COMMERCIAL' | 'COMMERCIAL_COMPARISON' | 'DISTRICT' | 'ADMINISTRATION'`
  - `AiReportSubmission`, `AiReportJob` (아래 코드 참조)
  - `buildDistrictSubmitPath(code, periodCode): string`, `buildAdministrationSubmitPath(code, periodCode): string`, `buildCommercialSubmitPath(code, serviceCode, periodCode): string`, `aiReportPath.job(jobId): string`
  - `submitDistrictAiReport(code, periodCode?)`, `submitAdministrationAiReport(code, periodCode?)`, `submitCommercialAiReport(code, serviceCode, periodCode?)` → `Promise<AiReportSubmission>`
  - `fetchAiReportJob(jobId): Promise<AiReportJob>`
  - `reportFromSubmission(submission, level)`, `jobIdFromSubmission(submission)`, `reportFromJob(job, level)`, `decideNextPoll(job, elapsedMs): PollDecision`, `AI_REPORT_POLL_INTERVAL_MS`, `AI_REPORT_POLL_TIMEOUT_MS`
  - `AiReportState`, `AiReportStage`, `AiReportErrorKind`, `useAiReport(args)` → `{ state, retry }`
- Consumes: `apiClient`(`@/lib/api/client`), `ANALYSIS_PERIOD_CODE`(`@/lib/analysis/selection`), presentation view builders.

- [ ] **Step 1: 타입 재작성**

`src/types/ai-report.ts` 전체를 아래로 교체:

```ts
import type { ApiResponse } from '@/types/api'

export type AiReportLevel = 'district' | 'administration' | 'commercial'

export type Meta<C extends string = string> = {
  code: C
  name: string
  description: string
}

export type AiReportSubmissionCode = 'CACHED' | 'ACCEPTED'
export type AiReportJobStatusCode = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
export type AiReportJobTypeCode =
  | 'COMMERCIAL'
  | 'COMMERCIAL_COMPARISON'
  | 'DISTRICT'
  | 'ADMINISTRATION'

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

// 완료 리포트는 jobType.code에 해당하는 필드 하나만 채워진다.
type ReportFields = {
  commercialReport: CommercialAiReport | null
  districtReport: RegionAiReport | null
  administrationReport: RegionAiReport | null
}

export type AiReportSubmission = ReportFields & {
  submissionStatus: Meta<AiReportSubmissionCode>
  jobType: Meta<AiReportJobTypeCode>
  jobId: string | null
}

export type AiReportJob = ReportFields & {
  jobId: string
  jobType: Meta<AiReportJobTypeCode>
  status: Meta<AiReportJobStatusCode>
  progressMessages: string[] | null
  errorCode: string | null
  errorMessage: string | null
}

export type DistrictAiReportSubmissionResponse = ApiResponse<AiReportSubmission>
export type AdministrationAiReportSubmissionResponse =
  ApiResponse<AiReportSubmission>
export type CommercialAiReportSubmissionResponse = ApiResponse<AiReportSubmission>
export type AiReportJobStatusResponse = ApiResponse<AiReportJob>
```

- [ ] **Step 2: poll 순수함수 재작성 + 테스트 갱신**

`src/lib/analysis/ai-report-poll.ts` 전체를 교체:

```ts
import type {
  AiReportJob,
  AiReportLevel,
  AiReportSubmission,
  CommercialAiReport,
  RegionAiReport,
} from '@/types/ai-report'

export const AI_REPORT_POLL_INTERVAL_MS = 3000
export const AI_REPORT_POLL_TIMEOUT_MS = 90000

type WithReports = Pick<
  AiReportJob,
  'commercialReport' | 'districtReport' | 'administrationReport'
>

const pickReport = (
  x: WithReports,
  level: AiReportLevel,
): CommercialAiReport | RegionAiReport | null => {
  if (level === 'commercial') return x.commercialReport
  if (level === 'district') return x.districtReport
  return x.administrationReport
}

export const reportFromSubmission = (
  submission: AiReportSubmission,
  level: AiReportLevel,
): CommercialAiReport | RegionAiReport | null =>
  submission.submissionStatus.code === 'CACHED'
    ? pickReport(submission, level)
    : null

export const jobIdFromSubmission = (
  submission: AiReportSubmission,
): string | null =>
  submission.submissionStatus.code === 'ACCEPTED' ? submission.jobId : null

export const reportFromJob = (
  job: AiReportJob,
  level: AiReportLevel,
): CommercialAiReport | RegionAiReport | null => pickReport(job, level)

export type PollDecision =
  | { kind: 'poll'; intervalMs: number }
  | { kind: 'ready' }
  | { kind: 'error'; message: string; errorCode: string | null }

export const decideNextPoll = (
  job: AiReportJob | undefined,
  elapsedMs: number,
): PollDecision => {
  const code = job?.status.code
  if (code === 'COMPLETED') return { kind: 'ready' }
  if (code === 'FAILED') {
    return {
      kind: 'error',
      message: job!.errorMessage?.trim() || 'AI 리포트 생성에 실패했습니다.',
      errorCode: job!.errorCode,
    }
  }
  if (elapsedMs >= AI_REPORT_POLL_TIMEOUT_MS) {
    return {
      kind: 'error',
      message: '시간이 초과되었습니다. 다시 시도해 주세요.',
      errorCode: 'TIMEOUT',
    }
  }
  return { kind: 'poll', intervalMs: AI_REPORT_POLL_INTERVAL_MS }
}
```

`src/lib/analysis/ai-report-poll.test.ts` 전체를 교체:

```ts
import { describe, expect, it } from 'vitest'

import {
  AI_REPORT_POLL_INTERVAL_MS,
  AI_REPORT_POLL_TIMEOUT_MS,
  decideNextPoll,
  jobIdFromSubmission,
  reportFromJob,
  reportFromSubmission,
} from '@/lib/analysis/ai-report-poll'
import type {
  AiReportJob,
  AiReportSubmission,
  CommercialAiReport,
  Meta,
} from '@/types/ai-report'

const meta = <C extends string>(code: C): Meta<C> => ({
  code,
  name: code,
  description: code,
})
const cReport = { summary: 'ok' } as CommercialAiReport

const submission = (over: Partial<AiReportSubmission>): AiReportSubmission => ({
  submissionStatus: meta('ACCEPTED'),
  jobType: meta('COMMERCIAL'),
  jobId: 'j1',
  commercialReport: null,
  districtReport: null,
  administrationReport: null,
  ...over,
})

const job = (over: Partial<AiReportJob>): AiReportJob => ({
  jobId: 'j1',
  jobType: meta('COMMERCIAL'),
  status: meta('PENDING'),
  progressMessages: null,
  commercialReport: null,
  districtReport: null,
  administrationReport: null,
  errorCode: null,
  errorMessage: null,
  ...over,
})

describe('submission helpers', () => {
  it('CACHED면 레벨별 리포트를, ACCEPTED면 jobId를 뽑는다', () => {
    expect(
      reportFromSubmission(
        submission({
          submissionStatus: meta('CACHED'),
          jobId: null,
          commercialReport: cReport,
        }),
        'commercial',
      ),
    ).toBe(cReport)
    expect(jobIdFromSubmission(submission({}))).toBe('j1')
    expect(
      jobIdFromSubmission(
        submission({ submissionStatus: meta('CACHED'), jobId: null }),
      ),
    ).toBeNull()
  })
})

describe('reportFromJob', () => {
  it('레벨에 맞는 필드를 선택한다', () => {
    const region = { summary: 'r' } as never
    expect(
      reportFromJob(job({ districtReport: region }), 'district'),
    ).toBe(region)
    expect(
      reportFromJob(job({ commercialReport: cReport }), 'commercial'),
    ).toBe(cReport)
  })
})

describe('decideNextPoll', () => {
  it('COMPLETED → ready', () => {
    expect(decideNextPoll(job({ status: meta('COMPLETED') }), 1000)).toEqual({
      kind: 'ready',
    })
  })
  it('FAILED → errorMessage/errorCode 사용', () => {
    expect(
      decideNextPoll(
        job({ status: meta('FAILED'), errorMessage: '실패함', errorCode: 'AI_002' }),
        1000,
      ),
    ).toEqual({ kind: 'error', message: '실패함', errorCode: 'AI_002' })
  })
  it('진행 중+타임아웃 전 → poll', () => {
    expect(decideNextPoll(job({ status: meta('RUNNING') }), 1000)).toEqual({
      kind: 'poll',
      intervalMs: AI_REPORT_POLL_INTERVAL_MS,
    })
  })
  it('타임아웃 초과 → error', () => {
    expect(
      decideNextPoll(job({ status: meta('RUNNING') }), AI_REPORT_POLL_TIMEOUT_MS)
        .kind,
    ).toBe('error')
  })
  it('job 없음+타임아웃 전 → poll', () => {
    expect(decideNextPoll(undefined, 0)).toEqual({
      kind: 'poll',
      intervalMs: AI_REPORT_POLL_INTERVAL_MS,
    })
  })
})
```

- [ ] **Step 3: poll 테스트 실패 확인**

Run: `pnpm vitest run src/lib/analysis/ai-report-poll.test.ts`
Expected: FAIL (타입/함수 시그니처 불일치 — reportFromJob 미존재 등)

- [ ] **Step 4: API 어댑터 재작성 + 테스트 갱신**

`src/lib/api/ai-report.ts` 전체를 교체:

```ts
import { apiClient } from '@/lib/api/client'
import { ANALYSIS_PERIOD_CODE } from '@/lib/analysis/selection'
import type {
  AdministrationAiReportSubmissionResponse,
  AiReportJob,
  AiReportJobStatusResponse,
  AiReportSubmission,
  CommercialAiReportSubmissionResponse,
  DistrictAiReportSubmissionResponse,
} from '@/types/ai-report'

export const aiReportPath = {
  job: (jobId: string) => `/ai-reports/jobs/${jobId}`,
}

export const buildDistrictSubmitPath = (
  code: string,
  periodCode: string,
): string => `/ai-reports/districts/${code}?periodCode=${periodCode}`

export const buildAdministrationSubmitPath = (
  code: string,
  periodCode: string,
): string => `/ai-reports/administrations/${code}?periodCode=${periodCode}`

export const buildCommercialSubmitPath = (
  commercialCode: string,
  serviceCode: string,
  periodCode: string,
): string =>
  `/ai-reports/commercials/${commercialCode}?serviceCode=${serviceCode}&periodCode=${periodCode}`

export const submitDistrictAiReport = async (
  code: string,
  periodCode: string = ANALYSIS_PERIOD_CODE,
): Promise<AiReportSubmission> => {
  const res = await apiClient.post<DistrictAiReportSubmissionResponse>(
    buildDistrictSubmitPath(code, periodCode),
  )
  return res.data.dataBody
}

export const submitAdministrationAiReport = async (
  code: string,
  periodCode: string = ANALYSIS_PERIOD_CODE,
): Promise<AiReportSubmission> => {
  const res = await apiClient.post<AdministrationAiReportSubmissionResponse>(
    buildAdministrationSubmitPath(code, periodCode),
  )
  return res.data.dataBody
}

export const submitCommercialAiReport = async (
  commercialCode: string,
  serviceCode: string,
  periodCode: string = ANALYSIS_PERIOD_CODE,
): Promise<AiReportSubmission> => {
  const res = await apiClient.post<CommercialAiReportSubmissionResponse>(
    buildCommercialSubmitPath(commercialCode, serviceCode, periodCode),
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

`src/lib/api/ai-report.test.ts` 전체를 교체:

```ts
import { describe, expect, it } from 'vitest'

import {
  aiReportPath,
  buildAdministrationSubmitPath,
  buildCommercialSubmitPath,
  buildDistrictSubmitPath,
} from '@/lib/api/ai-report'

describe('AI 리포트 제출 경로', () => {
  it('region은 periodCode만, 상권은 serviceCode+periodCode를 쿼리로 붙인다', () => {
    expect(buildDistrictSubmitPath('11680', '20233')).toBe(
      '/ai-reports/districts/11680?periodCode=20233',
    )
    expect(buildAdministrationSubmitPath('11680640', '20233')).toBe(
      '/ai-reports/administrations/11680640?periodCode=20233',
    )
    expect(buildCommercialSubmitPath('3110008', 'CS100001', '20233')).toBe(
      '/ai-reports/commercials/3110008?serviceCode=CS100001&periodCode=20233',
    )
    expect(aiReportPath.job('job-1')).toBe('/ai-reports/jobs/job-1')
  })
})
```

- [ ] **Step 5: 훅 재작성 (제출 + 폴링, SSE 없음)**

`src/hooks/use-ai-report.ts` 전체를 교체. region/commercial 공통으로 제출 쿼리를 돌리고, `ACCEPTED`면 jobId로 폴링한다. `AiReportState`는 이후 Task 4/5가 확장할 최종 형태로 정의한다:

```ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'

import {
  submitAdministrationAiReport,
  submitCommercialAiReport,
  submitDistrictAiReport,
  fetchAiReportJob,
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
  AI_REPORT_POLL_TIMEOUT_MS,
  decideNextPoll,
  jobIdFromSubmission,
  reportFromJob,
  reportFromSubmission,
} from '@/lib/analysis/ai-report-poll'
import type {
  AiReportJob,
  AiReportLevel,
  AiReportSubmission,
  CommercialAiReport,
  RegionAiReport,
} from '@/types/ai-report'

export type AiReportStage = { name: string; description: string }
export type AiReportErrorKind =
  | 'unauth'
  | 'not-found'
  | 'unavailable'
  | 'timeout'
  | 'generic'
export type AiReportState =
  | { status: 'idle' }
  | { status: 'loading'; stage: AiReportStage | null; progressMessages: string[] }
  | { status: 'ready-commercial'; view: CommercialReportView }
  | { status: 'ready-region'; view: RegionReportView }
  | { status: 'empty' }
  | {
      status: 'error'
      message: string
      errorKind: AiReportErrorKind
      canRetry: boolean
    }

type UseAiReportArgs = {
  level: AiReportLevel | null
  code: string | null
  serviceCode: string | null
  active: boolean
  enabled: boolean
}

const submitFor = (
  level: AiReportLevel,
  code: string,
  serviceCode: string | null,
): Promise<AiReportSubmission> => {
  if (level === 'district') return submitDistrictAiReport(code)
  if (level === 'administration') return submitAdministrationAiReport(code)
  return submitCommercialAiReport(code, serviceCode!)
}

export const classifyError = (errorCode: string | null): AiReportErrorKind => {
  if (errorCode?.startsWith('SECURITY_')) return 'unauth'
  if (errorCode === 'AI_005') return 'not-found'
  if (errorCode === 'AI_002') return 'unavailable'
  if (errorCode === 'AI_009' || errorCode === 'TIMEOUT') return 'timeout'
  return 'generic'
}

export const useAiReport = ({
  level,
  code,
  serviceCode,
  active,
  enabled,
}: UseAiReportArgs): { state: AiReportState; retry: () => void } => {
  const queryClient = useQueryClient()
  const canCommercial = level === 'commercial' ? Boolean(serviceCode) : true
  const on = enabled && active && Boolean(level && code) && canCommercial

  const submitQuery = useQuery({
    queryKey: ['ai-report', 'submit', level, code, serviceCode],
    queryFn: () => submitFor(level!, code!, serviceCode),
    enabled: on,
    retry: 0,
    staleTime: 5 * 60 * 1000,
  })

  const cachedReport = submitQuery.data
    ? reportFromSubmission(submitQuery.data, level!)
    : null
  const jobId = submitQuery.data ? jobIdFromSubmission(submitQuery.data) : null

  // 타임아웃: 렌더 중 Date.now()를 읽지 않고 (jobId, attempt)별 타이머가 마감 시각에
  // 한 번 상태를 뒤집는다. attempt는 retry마다 증가하는 nonce.
  const [attempt, setAttempt] = useState(0)
  const [timedOutKey, setTimedOutKey] = useState<string | null>(null)
  const currentKey = jobId !== null ? `${jobId}:${attempt}` : null
  useEffect(() => {
    if (!jobId) return
    const key = `${jobId}:${attempt}`
    const timer = setTimeout(
      () => setTimedOutKey(key),
      AI_REPORT_POLL_TIMEOUT_MS,
    )
    return () => clearTimeout(timer)
  }, [jobId, attempt])
  const pollTimedOut = currentKey !== null && timedOutKey === currentKey
  const pollElapsedMs = pollTimedOut ? AI_REPORT_POLL_TIMEOUT_MS : 0

  const jobQuery = useQuery({
    queryKey: ['ai-report', 'job', jobId],
    queryFn: () => fetchAiReportJob(jobId!),
    enabled: on && Boolean(jobId) && !cachedReport,
    retry: 0,
    refetchInterval: query => {
      const decision = decideNextPoll(query.state.data, pollElapsedMs)
      return decision.kind === 'poll' ? decision.intervalMs : false
    },
    refetchIntervalInBackground: false,
  })

  const retry = useCallback(() => {
    setAttempt(a => a + 1)
    void queryClient.invalidateQueries({
      queryKey: ['ai-report', 'submit', level, code, serviceCode],
    })
    if (jobId) {
      void queryClient.invalidateQueries({
        queryKey: ['ai-report', 'job', jobId],
      })
    }
  }, [queryClient, level, code, serviceCode, jobId])

  const state = deriveState({
    on,
    level,
    submitQuery,
    jobQuery,
    cachedReport,
    jobId,
    pollElapsedMs,
  })

  return { state, retry }
}

const buildReady = (
  level: AiReportLevel,
  report: CommercialAiReport | RegionAiReport,
): AiReportState => {
  if (level === 'commercial') {
    const view = toCommercialReportView(report as CommercialAiReport)
    return isCommercialReportEmpty(view)
      ? { status: 'empty' }
      : { status: 'ready-commercial', view }
  }
  const view = toRegionReportView(report as RegionAiReport)
  return isRegionReportEmpty(view)
    ? { status: 'empty' }
    : { status: 'ready-region', view }
}

const loadingFromJob = (job: AiReportJob | undefined): AiReportState => ({
  status: 'loading',
  stage: job ? { name: job.status.name, description: job.status.description } : null,
  progressMessages: job?.progressMessages ?? [],
})

const deriveState = (a: {
  on: boolean
  level: AiReportLevel | null
  submitQuery: UseQueryResult<AiReportSubmission>
  jobQuery: UseQueryResult<AiReportJob>
  cachedReport: CommercialAiReport | RegionAiReport | null
  jobId: string | null
  pollElapsedMs: number
}): AiReportState => {
  if (!a.on || !a.level) return { status: 'idle' }

  if (a.submitQuery.isError) {
    return {
      status: 'error',
      message: 'AI 리포트 요청에 실패했습니다.',
      errorKind: 'generic',
      canRetry: true,
    }
  }
  if (a.cachedReport) return buildReady(a.level, a.cachedReport)
  if (a.submitQuery.isPending) {
    return { status: 'loading', stage: null, progressMessages: [] }
  }
  if (!a.jobId) return { status: 'loading', stage: null, progressMessages: [] }

  const decision = decideNextPoll(a.jobQuery.data, a.pollElapsedMs)
  if (decision.kind === 'error') {
    return {
      status: 'error',
      message: decision.message,
      errorKind: classifyError(decision.errorCode),
      canRetry: true,
    }
  }
  if (decision.kind === 'ready') {
    const report = reportFromJob(a.jobQuery.data!, a.level)
    return report
      ? buildReady(a.level, report)
      : {
          status: 'error',
          message: '리포트를 불러오지 못했습니다.',
          errorKind: 'generic',
          canRetry: true,
        }
  }
  return loadingFromJob(a.jobQuery.data)
}
```

- [ ] **Step 6: 패널 테스트를 새 state 형태로 갱신**

`ai-report-panel.tsx`는 아직 이전 시그니처를 쓰므로, 이 단계에서는 **패널 테스트만** 새 `loading`/`error` 형태에 맞춘다(패널 컴포넌트 본문은 Task 5에서 확장). `ai-report-panel.test.ts`의 `loading` 사용부를 `{ status: 'loading', stage: null, progressMessages: [] }`로, `error` 사용부를 `{ status: 'error', message: '실패함', errorKind: 'generic', canRetry: true }`로 바꾼다. 나머지 케이스(`empty`, `ready-region`, 전체분석 링크)는 그대로 둔다.

- [ ] **Step 7: 전체 테스트 + 타입 확인**

Run: `pnpm vitest run src/lib/analysis/ai-report-poll.test.ts src/lib/api/ai-report.test.ts src/components/analysis/ai-report/ai-report-panel.test.ts && pnpm typecheck`
Expected: PASS. (typecheck는 analysis-page.tsx가 여전히 `useAiReport`를 같은 시그니처로 쓰므로 통과. region GET 참조가 사라졌는지 확인.)

- [ ] **Step 8: Commit**

```bash
git add src/types/ai-report.ts src/lib/api/ai-report.ts src/lib/api/ai-report.test.ts src/lib/analysis/ai-report-poll.ts src/lib/analysis/ai-report-poll.test.ts src/hooks/use-ai-report.ts src/components/analysis/ai-report/ai-report-panel.test.ts
git commit -m "[FE] refactor(ai-report): 계약 객체화 + 3종 POST 제출·폴링으로 통일"
```

---

## Task 2: SSE 프레임 파서 + 구독기 (무의존)

**Files:**
- Create: `src/lib/analysis/ai-report-sse.ts`
- Test: `src/lib/analysis/ai-report-sse.test.ts`

**Interfaces:**
- Produces:
  - `parseSseBuffer(buffer: string): { events: SseEvent[]; rest: string }` where `SseEvent = { event: string; data: string }`
  - `buildJobStreamUrl(jobId: string): string`
  - `subscribeJobStream(jobId: string, cb: JobStreamCallbacks, signal: AbortSignal): Promise<void>` where `JobStreamCallbacks = { onEvent: (job: AiReportJob) => void; onError: (err: unknown) => void; onDone: () => void }`
- Consumes: `AiReportJob`(`@/types/ai-report`)

- [ ] **Step 1: 실패 테스트 작성**

`src/lib/analysis/ai-report-sse.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

import {
  buildJobStreamUrl,
  parseSseBuffer,
  subscribeJobStream,
} from '@/lib/analysis/ai-report-sse'
import type { AiReportJob } from '@/types/ai-report'

describe('buildJobStreamUrl', () => {
  it('전용 스트리밍 라우트 경로를 만든다', () => {
    expect(buildJobStreamUrl('job-1')).toBe(
      '/api/ai-reports/jobs/job-1/stream',
    )
  })
})

describe('parseSseBuffer', () => {
  it('완성된 프레임을 파싱하고 미완성 rest를 남긴다', () => {
    const { events, rest } = parseSseBuffer(
      'event: job-update\ndata: {"a":1}\n\nevent: job-upda',
    )
    expect(events).toEqual([{ event: 'job-update', data: '{"a":1}' }])
    expect(rest).toBe('event: job-upda')
  })
  it('하트비트 코멘트(:)와 여러 data 줄을 처리한다', () => {
    const { events } = parseSseBuffer(': ping\n\ndata: line1\ndata: line2\n\n')
    expect(events).toEqual([{ event: 'message', data: 'line1\nline2' }])
  })
})

describe('subscribeJobStream', () => {
  it('job-update 이벤트마다 onEvent, 스트림 종료 시 onDone', async () => {
    const chunks = [
      'event: job-update\ndata: {"jobId":"j1","status":{"code":"RUNNING","name":"생성 중","description":"d"},"jobType":{"code":"DISTRICT","name":"","description":""},"progressMessages":["x"],"commercialReport":null,"districtReport":null,"administrationReport":null,"errorCode":null,"errorMessage":null}\n\n',
    ]
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder()
        chunks.forEach(c => controller.enqueue(enc.encode(c)))
        controller.close()
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      ),
    )
    const events: AiReportJob[] = []
    let done = false
    await subscribeJobStream(
      'j1',
      { onEvent: j => events.push(j), onError: () => {}, onDone: () => (done = true) },
      new AbortController().signal,
    )
    expect(events).toHaveLength(1)
    expect(events[0].status.code).toBe('RUNNING')
    expect(done).toBe(true)
    vi.unstubAllGlobals()
  })

  it('비-2xx 응답이면 onError로 폴백 신호', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 404 })),
    )
    let errored = false
    await subscribeJobStream(
      'j1',
      { onEvent: () => {}, onError: () => (errored = true), onDone: () => {} },
      new AbortController().signal,
    )
    expect(errored).toBe(true)
    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run src/lib/analysis/ai-report-sse.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: 구현**

`src/lib/analysis/ai-report-sse.ts`:

```ts
import type { AiReportJob } from '@/types/ai-report'

export type SseEvent = { event: string; data: string }

export type JobStreamCallbacks = {
  onEvent: (job: AiReportJob) => void
  onError: (err: unknown) => void
  onDone: () => void
}

export const buildJobStreamUrl = (jobId: string): string =>
  `/api/ai-reports/jobs/${jobId}/stream`

// 완성된 프레임(빈 줄 구분)만 파싱하고, 미완성 꼬리는 rest로 돌려준다.
export const parseSseBuffer = (
  buffer: string,
): { events: SseEvent[]; rest: string } => {
  const normalized = buffer.replace(/\r\n/g, '\n')
  const parts = normalized.split('\n\n')
  const rest = parts.pop() ?? ''
  const events: SseEvent[] = []
  for (const block of parts) {
    let event = 'message'
    const dataLines: string[] = []
    for (const line of block.split('\n')) {
      if (line === '' || line.startsWith(':')) continue // 하트비트/빈 줄 무시
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
    }
    if (dataLines.length > 0) events.push({ event, data: dataLines.join('\n') })
  }
  return { events, rest }
}

export const subscribeJobStream = async (
  jobId: string,
  cb: JobStreamCallbacks,
  signal: AbortSignal,
): Promise<void> => {
  try {
    const res = await fetch(buildJobStreamUrl(jobId), {
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
      credentials: 'same-origin',
      signal,
    })
    if (!res.ok || !res.body) {
      cb.onError(new Error(`stream ${res.status}`))
      return
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const { events, rest } = parseSseBuffer(buffer)
      buffer = rest
      for (const evt of events) {
        if (evt.event !== 'job-update') continue
        try {
          cb.onEvent(JSON.parse(evt.data) as AiReportJob)
        } catch (err) {
          cb.onError(err)
          return
        }
      }
    }
    cb.onDone()
  } catch (err) {
    if (signal.aborted) return // 정상 중단(언마운트/레벨 변경)
    cb.onError(err)
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run src/lib/analysis/ai-report-sse.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/ai-report-sse.ts src/lib/analysis/ai-report-sse.test.ts
git commit -m "[FE] feat(ai-report): SSE 프레임 파서 + fetch reader 구독기(무의존)"
```

---

## Task 3: 전용 SSE 스트리밍 라우트

**Files:**
- Create: `app/api/ai-reports/jobs/[jobId]/stream/route.ts`
- Test: `app/api/ai-reports/jobs/[jobId]/stream/route.test.ts`

**Interfaces:**
- Consumes: `getServerEnv`(`@/lib/env.server`), `getSession`/`setSession`/`clearSession`(`@/lib/auth/session`), `reissueSession`(`@/lib/auth/reissue`) — 기존 `/api/bff` 라우트와 동일 패턴.
- Produces: `GET(req, ctx)` — 세션 Bearer 주입 후 백엔드 SSE를 `text/event-stream`으로 파이프. 무세션 → 401 JSON. 401 → 재발급 1회 재시도. 성공 응답은 **버퍼링하지 않는다**.

- [ ] **Step 1: 실패 테스트 작성**

`app/api/ai-reports/jobs/[jobId]/stream/route.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env.server', () => ({
  getServerEnv: () => ({ backendApiUrl: 'http://backend' }),
}))
const getSession = vi.fn()
vi.mock('@/lib/auth/session', () => ({
  getSession: () => getSession(),
  setSession: vi.fn(),
  clearSession: vi.fn(),
}))
vi.mock('@/lib/auth/reissue', () => ({ reissueSession: vi.fn() }))

import { GET } from '@/../app/api/ai-reports/jobs/[jobId]/stream/route'

const ctx = { params: Promise.resolve({ jobId: 'j1' }) }

afterEach(() => vi.unstubAllGlobals())

describe('AI 리포트 스트리밍 라우트', () => {
  it('무세션이면 401', async () => {
    getSession.mockResolvedValue(null)
    const res = await GET(new Request('http://x/api/ai-reports/jobs/j1/stream'), ctx)
    expect(res.status).toBe(401)
  })

  it('세션이 있으면 Bearer를 주입하고 스트림 본문을 그대로 파이프한다', async () => {
    getSession.mockResolvedValue({ accessToken: 'tok' })
    const upstreamBody = new ReadableStream()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(upstreamBody, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const res = await GET(new Request('http://x/api/ai-reports/jobs/j1/stream'), ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    expect(res.headers.get('cache-control')).toContain('no-transform')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://backend/api/v1/ai-reports/jobs/j1/stream')
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer tok',
    )
    expect(res.body).toBe(upstreamBody)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run "app/api/ai-reports/jobs/[jobId]/stream/route.test.ts"`
Expected: FAIL (module not found)

- [ ] **Step 3: 구현**

`app/api/ai-reports/jobs/[jobId]/stream/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/env.server'
import {
  getSession,
  setSession,
  clearSession,
  type SessionPayload,
} from '@/lib/auth/session'
import { reissueSession } from '@/lib/auth/reissue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const connect = (
  backendApiUrl: string,
  jobId: string,
  accessToken: string,
  signal: AbortSignal,
) =>
  fetch(`${backendApiUrl}/api/v1/ai-reports/jobs/${jobId}/stream`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'text/event-stream' },
    signal,
    redirect: 'manual',
  })

export async function GET(
  req: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { backendApiUrl } = getServerEnv()
  const { jobId } = await ctx.params

  let session: SessionPayload | null = await getSession()
  if (!session) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }

  let upstream = await connect(backendApiUrl, jobId, session.accessToken, req.signal)
  if (upstream.status === 401) {
    const next = await reissueSession(session, backendApiUrl)
    if (!next) {
      await clearSession()
      return NextResponse.json(
        { message: '세션이 만료되었습니다. 다시 로그인해 주세요.' },
        { status: 401 },
      )
    }
    await setSession(next)
    session = next
    upstream = await connect(backendApiUrl, jobId, session.accessToken, req.signal)
  }

  // 실패 응답(404 AI_005 등)만 본문을 읽어 그대로 전달한다.
  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text()
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') ?? 'application/json',
      },
    })
  }

  // 성공: 스트림을 버퍼링 없이 그대로 파이프한다.
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run "app/api/ai-reports/jobs/[jobId]/stream/route.test.ts"`
Expected: PASS

> 주의: import 경로 `@/../app/...`가 vitest alias에서 해석되지 않으면, 테스트 상단 import를 상대경로(`../../../../../app/api/ai-reports/jobs/[jobId]/stream/route` 등 실제 깊이에 맞게)로 바꾼다. 다른 `app/api/**/route.test.ts`(예: `app/api/auth/me/route.test.ts`)의 import 방식을 그대로 따른다.

- [ ] **Step 5: Commit**

```bash
git add "app/api/ai-reports/jobs/[jobId]/stream"
git commit -m "[FE] feat(ai-report): 전용 SSE 스트리밍 라우트(세션 Bearer 주입·무버퍼 파이프)"
```

---

## Task 4: 훅에 SSE 우선 구독 + 폴링 폴백 결합

Task 1의 폴링 훅에 SSE 구독을 얹는다. jobId가 생기면 SSE로 job 스냅샷을 받아 로컬 상태를 갱신하고, SSE `onError`(비종결)면 폴링을 활성화한다.

**Files:**
- Modify: `src/hooks/use-ai-report.ts`
- Test: `src/hooks/use-ai-report.test.ts` (create)

**Interfaces:**
- Consumes: `subscribeJobStream`(`@/lib/analysis/ai-report-sse`)
- Produces: 동일한 `useAiReport` 시그니처. 내부에 `sseJob` 로컬 상태와 `fallbackToPolling` 플래그 추가.

- [ ] **Step 1: SSE 결합 로직 추가**

`use-ai-report.ts`에 아래를 추가/수정한다.

1) import 추가: `import { subscribeJobStream } from '@/lib/analysis/ai-report-sse'`

2) 훅 본문에서 jobId 확정 직후, 폴링(`jobQuery`) 정의 **앞에** SSE 구독 상태를 둔다:

```ts
const [sseJob, setSseJob] = useState<AiReportJob | null>(null)
const [pollingFallback, setPollingFallback] = useState(false)

// jobId가 바뀌면 SSE 상태 초기화
useEffect(() => {
  setSseJob(null)
  setPollingFallback(false)
}, [jobId, attempt])

// SSE 우선 구독. 종결/폴백/언마운트 시 정리.
useEffect(() => {
  if (!on || !jobId || cachedReport) return
  const controller = new AbortController()
  let terminal = false
  void subscribeJobStream(
    jobId,
    {
      onEvent: job => {
        setSseJob(job)
        if (job.status.code === 'COMPLETED' || job.status.code === 'FAILED') {
          terminal = true
        }
      },
      onDone: () => {
        // 종결 없이 닫혔으면 폴링으로 폴백
        if (!terminal) setPollingFallback(true)
      },
      onError: () => setPollingFallback(true),
    },
    controller.signal,
  )
  return () => controller.abort()
}, [on, jobId, cachedReport])
```

3) `jobQuery`의 `enabled`를 폴백 조건으로 좁힌다:

```ts
enabled: on && Boolean(jobId) && !cachedReport && pollingFallback,
```

4) `deriveState`가 SSE job과 폴링 job 중 최신을 쓰도록, `job = sseJob ?? a.jobQuery.data`로 합류시킨다. `deriveState` 호출부에 `sseJob`을 넘기고, 내부에서 `const job = a.sseJob ?? a.jobQuery.data`로 바꾼 뒤 `decideNextPoll(job, ...)`/`reportFromJob(job!, ...)`/`loadingFromJob(job ?? undefined)`에 사용한다.

> 결과: SSE가 살아 있으면 `sseJob`으로 즉시 단계/완료를 반영하고, 끊기면 `pollingFallback=true`로 폴링이 켜져 동일 상태 머신을 계속 굴린다. 종결 도달 시 `decideNextPoll`이 `ready`/`error`를 반환하고, 폴링 `refetchInterval`은 `false`가 되어 멈춘다.

- [ ] **Step 2: 훅 테스트 작성**

`src/hooks/use-ai-report.test.ts` — `@testing-library/react`의 `renderHook`과 QueryClientProvider로 감싼다. 기존 리포지토리에 훅 테스트 예시가 있으면 그 래퍼를 재사용하고, 없으면 아래 골격을 사용한다:

```ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as api from '@/lib/api/ai-report'
import * as sse from '@/lib/analysis/ai-report-sse'
import { useAiReport } from '@/hooks/use-ai-report'
import type { AiReportJob, AiReportSubmission, Meta } from '@/types/ai-report'

const meta = <C extends string>(c: C): Meta<C> => ({ code: c, name: c, description: c })
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children,
  )

afterEach(() => vi.restoreAllMocks())

describe('useAiReport', () => {
  it('ACCEPTED → SSE COMPLETED에서 region 리포트 ready', async () => {
    vi.spyOn(api, 'submitDistrictAiReport').mockResolvedValue({
      submissionStatus: meta('ACCEPTED'),
      jobType: meta('DISTRICT'),
      jobId: 'j1',
      commercialReport: null,
      districtReport: null,
      administrationReport: null,
    } as AiReportSubmission)
    vi.spyOn(sse, 'subscribeJobStream').mockImplementation(async (_id, cb) => {
      cb.onEvent({
        jobId: 'j1',
        jobType: meta('DISTRICT'),
        status: meta('COMPLETED'),
        progressMessages: null,
        commercialReport: null,
        districtReport: { summary: '요약', marketStatus: '성장' } as never,
        administrationReport: null,
        errorCode: null,
        errorMessage: null,
      } as AiReportJob)
      cb.onDone()
    })
    const { result } = renderHook(
      () =>
        useAiReport({
          level: 'district',
          code: '11680',
          serviceCode: null,
          active: true,
          enabled: true,
        }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.state.status).toBe('ready-region'))
  })

  it('SSE onError면 폴링 폴백으로 전환된다', async () => {
    vi.spyOn(api, 'submitDistrictAiReport').mockResolvedValue({
      submissionStatus: meta('ACCEPTED'),
      jobType: meta('DISTRICT'),
      jobId: 'j2',
      commercialReport: null,
      districtReport: null,
      administrationReport: null,
    } as AiReportSubmission)
    vi.spyOn(sse, 'subscribeJobStream').mockImplementation(async (_id, cb) => {
      cb.onError(new Error('drop'))
    })
    const pollSpy = vi
      .spyOn(api, 'fetchAiReportJob')
      .mockResolvedValue({
        jobId: 'j2',
        jobType: meta('DISTRICT'),
        status: meta('COMPLETED'),
        progressMessages: null,
        commercialReport: null,
        districtReport: { summary: '폴백요약' } as never,
        administrationReport: null,
        errorCode: null,
        errorMessage: null,
      } as AiReportJob)
    const { result } = renderHook(
      () =>
        useAiReport({
          level: 'district',
          code: '11680',
          serviceCode: null,
          active: true,
          enabled: true,
        }),
      { wrapper },
    )
    await waitFor(() => expect(pollSpy).toHaveBeenCalled())
    await waitFor(() => expect(result.current.state.status).toBe('ready-region'))
  })
})
```

- [ ] **Step 3: 실행 → 실패 → 구현 조정 → 통과**

Run: `pnpm vitest run src/hooks/use-ai-report.test.ts`
Expected: 처음엔 FAIL할 수 있음(폴백 배선). Step 1 로직을 맞춰 PASS까지 조정.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-ai-report.ts src/hooks/use-ai-report.test.ts
git commit -m "[FE] feat(ai-report): SSE 우선 구독 + 폴링 폴백 훅 결합"
```

---

## Task 5: 진행문구 순환 훅 + 패널 단계/진행/에러 UI

**Files:**
- Create: `src/hooks/use-progress-rotation.ts`
- Test: `src/hooks/use-progress-rotation.test.ts`
- Modify: `src/components/analysis/ai-report/ai-report-panel.tsx`
- Test: `src/components/analysis/ai-report/ai-report-panel.test.ts` (확장)

**Interfaces:**
- Produces: `useProgressRotation(messages: string[], intervalMs?: number): string` — 배열을 intervalMs(기본 4000)마다 순환해 현재 문구를 반환. 빈 배열이면 `''`.
- Consumes: `AiReportState`(단계/진행문구/errorKind).

- [ ] **Step 1: 순환 훅 테스트 + 구현**

`use-progress-rotation.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useProgressRotation } from '@/hooks/use-progress-rotation'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useProgressRotation', () => {
  it('interval마다 다음 문구로 순환한다', () => {
    const { result } = renderHook(() => useProgressRotation(['a', 'b'], 4000))
    expect(result.current).toBe('a')
    act(() => void vi.advanceTimersByTime(4000))
    expect(result.current).toBe('b')
    act(() => void vi.advanceTimersByTime(4000))
    expect(result.current).toBe('a')
  })
  it('빈 배열이면 빈 문자열', () => {
    const { result } = renderHook(() => useProgressRotation([], 4000))
    expect(result.current).toBe('')
  })
})
```

`use-progress-rotation.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'

export const useProgressRotation = (
  messages: string[],
  intervalMs = 4000,
): string => {
  const [index, setIndex] = useState(0)
  const key = messages.join('|')

  useEffect(() => {
    setIndex(0)
    if (messages.length <= 1) return
    const timer = setInterval(
      () => setIndex(i => (i + 1) % messages.length),
      intervalMs,
    )
    return () => clearInterval(timer)
    // key로 배열 내용 변화만 감지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intervalMs])

  return messages[index] ?? ''
}
```

Run: `pnpm vitest run src/hooks/use-progress-rotation.test.ts` → PASS.

- [ ] **Step 2: 패널이 단계·진행문구·에러를 렌더하도록 수정**

`ai-report-panel.tsx`의 `Content`를 아래로 교체(로딩 시 단계명·설명 + 진행문구 순환, 에러 시 errorKind별 문구/버튼). `import { useProgressRotation } from '@/hooks/use-progress-rotation'` 추가. 로딩 렌더는 별도 컴포넌트로 분리해 훅 사용:

```tsx
function LoadingBody({
  stage,
  progressMessages,
}: {
  stage: { name: string; description: string } | null
  progressMessages: string[]
}) {
  const rotating = useProgressRotation(progressMessages, 4000)
  return (
    <div>
      <StatusText>{stage?.name ?? '리포트를 생성하고 있어요…'}</StatusText>
      {stage?.description ? <StatusText>{stage.description}</StatusText> : null}
      {rotating ? <StatusText aria-live="polite">{rotating}</StatusText> : null}
    </div>
  )
}

function Content({ state, onRetry }: { state: AiReportState; onRetry: () => void }) {
  switch (state.status) {
    case 'loading':
      return (
        <LoadingBody
          stage={state.stage}
          progressMessages={state.progressMessages}
        />
      )
    case 'empty':
      return <StatusText>표시할 내용이 없어요.</StatusText>
    case 'error':
      return (
        <div>
          <StatusText>{state.message}</StatusText>
          {state.canRetry ? (
            <Button type="button" onClick={onRetry}>
              {state.errorKind === 'not-found' ? '다시 요청하기' : '다시 시도'}
            </Button>
          ) : null}
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
```

- [ ] **Step 3: 패널 테스트 확장**

`ai-report-panel.test.ts`에 케이스 추가:

```ts
it('loading은 단계명과 진행문구를 노출한다', () => {
  const markup = render({
    status: 'loading',
    stage: { name: '생성 중', description: 'AI가 작성 중' },
    progressMessages: ['유동인구 분석 중'],
  })
  expect(markup).toContain('생성 중')
  expect(markup).toContain('유동인구 분석 중')
})

it('not-found 에러는 다시 요청하기 버튼을 노출한다', () => {
  const markup = render({
    status: 'error',
    message: '작업을 찾지 못했어요',
    errorKind: 'not-found',
    canRetry: true,
  })
  expect(markup).toContain('다시 요청하기')
})
```

> `renderToStaticMarkup`은 `useEffect`/타이머를 실행하지 않으므로 `useProgressRotation`은 초기값(첫 문구)을 반환한다 — 위 단언과 일치.

Run: `pnpm vitest run src/hooks/use-progress-rotation.test.ts src/components/analysis/ai-report/ai-report-panel.test.ts` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-progress-rotation.ts src/hooks/use-progress-rotation.test.ts src/components/analysis/ai-report/ai-report-panel.tsx src/components/analysis/ai-report/ai-report-panel.test.ts
git commit -m "[FE] feat(ai-report): 진행문구 4초 순환 + 패널 단계/에러코드 UI"
```

---

## Task 6: 미인증 잠금 카드 + 정적 샘플 + 가시성 헬퍼

**Files:**
- Create: `src/lib/analysis/ai-report-samples.ts`
- Create: `src/components/analysis/ai-report/ai-report-lock-card.tsx`
- Test: `src/components/analysis/ai-report/ai-report-lock-card.test.ts`
- Modify: `src/lib/analysis/ai-report-presentation.ts` (가시성 헬퍼에 잠금 분기 추가)
- Test: `src/lib/analysis/ai-report-presentation.test.ts` (가시성 케이스 추가)

**Interfaces:**
- Produces:
  - `sampleCommercialView: CommercialReportView`, `sampleRegionView: RegionReportView` (정적 가짜 데이터)
  - `AiReportLockCard({ level, loginHref }: { level: AiReportLevel; loginHref: string })`
  - `resolveAiReportVisibility({ hydrated, isLoggedIn, levelKey, panelOpen })` → `{ showCard, showLockCard, showPanel }`
- Consumes: `CommercialReportView`/`RegionReportView`, `CommercialReportBlocks`/`RegionReportBlocks`.

- [ ] **Step 1: 가시성 헬퍼 확장(테스트 먼저)**

`ai-report-presentation.test.ts`에 추가:

```ts
it('로그인이면 카드, 비로그인이면 잠금 카드', () => {
  expect(
    resolveAiReportVisibility({
      hydrated: true,
      isLoggedIn: true,
      levelKey: 'district:11680',
      panelOpen: false,
    }),
  ).toEqual({ showCard: true, showLockCard: false, showPanel: false })
  expect(
    resolveAiReportVisibility({
      hydrated: true,
      isLoggedIn: false,
      levelKey: 'district:11680',
      panelOpen: false,
    }),
  ).toEqual({ showCard: false, showLockCard: true, showPanel: false })
  expect(
    resolveAiReportVisibility({
      hydrated: false,
      isLoggedIn: false,
      levelKey: 'district:11680',
      panelOpen: false,
    }),
  ).toEqual({ showCard: false, showLockCard: false, showPanel: false })
})
```

`ai-report-presentation.ts`의 `resolveAiReportVisibility`를 교체:

```ts
export const resolveAiReportVisibility = ({
  hydrated,
  isLoggedIn,
  levelKey,
  panelOpen,
}: {
  hydrated: boolean
  isLoggedIn: boolean
  levelKey: string | null
  panelOpen: boolean
}): { showCard: boolean; showLockCard: boolean; showPanel: boolean } => {
  const hasLevel = hydrated && Boolean(levelKey)
  return {
    showCard: hasLevel && isLoggedIn && !panelOpen,
    showLockCard: hasLevel && !isLoggedIn,
    showPanel: hasLevel && isLoggedIn && panelOpen,
  }
}
```

기존 테스트가 옛 시그니처(`enabled`)를 쓰면 새 시그니처로 갱신한다.

- [ ] **Step 2: 정적 샘플 작성**

`src/lib/analysis/ai-report-samples.ts` — `toCommercialReportView`/`toRegionReportView`가 만드는 뷰모델 형태로 **직접** 정적 값을 둔다(하드코딩된 가짜 예시):

```ts
import type {
  CommercialReportView,
  RegionReportView,
} from '@/lib/analysis/ai-report-presentation'

export const sampleCommercialView: CommercialReportView = {
  headline: {
    summary: '유동인구가 꾸준한 성장 상권으로, 저녁 시간대 매출 비중이 높습니다.',
    insight: '20~30대 직장인 수요가 탄탄해 객단가 중심 업종에 유리합니다.',
  },
  strengths: ['배후 직장인 밀집', '저녁 피크 매출', '대중교통 접근성'],
  risks: ['임대료 상승세', '주말 유동인구 감소'],
  actions: [
    { title: '추천 업종군', items: ['카페', '베이커리', '주점'] },
    { title: '추천 운영 시간', items: ['11:00~14:00', '18:00~22:00'] },
  ],
  generatedAt: '',
}

export const sampleRegionView: RegionReportView = {
  headline: {
    summary: '자치구 전반의 소비가 안정적으로 유지되는 성숙 상권입니다.',
    marketStatus: '안정',
  },
  recommended: ['생활서비스', '외식', '소매'],
  caution: ['유흥', '대형 판매'],
  insight: '동별 편차가 크므로 세부 행정동 단위 확인을 권장합니다.',
  generatedAt: '',
}
```

- [ ] **Step 3: 잠금 카드 컴포넌트 + 테스트**

`ai-report-lock-card.test.ts`:

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AiReportLockCard from '@/components/analysis/ai-report/ai-report-lock-card'

const render = (level: 'district' | 'commercial') =>
  renderToStaticMarkup(
    createElement(AiReportLockCard, {
      level,
      loginHref: '/login?redirect=%2Fanalysis',
    }),
  )

describe('AiReportLockCard', () => {
  it('가치 카피와 로그인 CTA(returnUrl 포함)를 노출한다', () => {
    const markup = render('commercial')
    expect(markup).toContain('/login?redirect=%2Fanalysis')
    expect(markup).toContain('로그인') // CTA
  })
  it('blur 샘플 영역은 aria-hidden으로 감춘다', () => {
    expect(render('district')).toContain('aria-hidden')
  })
})
```

`ai-report-lock-card.tsx` — 샘플 뷰를 `report-blocks`로 렌더하되 `aria-hidden` + CSS blur, 위에 자물쇠·카피·로그인 링크 오버레이. 토큰만 사용:

```tsx
import Link from 'next/link'
import { Lock } from 'lucide-react'
import styled from 'styled-components'

import {
  CommercialReportBlocks,
  RegionReportBlocks,
} from '@/components/analysis/ai-report/report-blocks'
import {
  sampleCommercialView,
  sampleRegionView,
} from '@/lib/analysis/ai-report-samples'
import type { AiReportLevel } from '@/types/ai-report'

const Wrap = styled.div`
  position: relative;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);
  overflow: hidden;
`
const Sample = styled.div`
  padding: 12px 16px;
  filter: blur(6px);
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
`
const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  text-align: center;
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
`
const Copy = styled.p`
  font-size: 14px;
  line-height: 21px;
  color: var(--color-text-900);
  font-weight: 700;
`
const Cta = styled(Link)`
  padding: 10px 16px;
  border-radius: var(--radius-control);
  background: var(--color-brand-600);
  color: var(--color-on-brand);
  font-size: 14px;
  font-weight: 700;
`

export default function AiReportLockCard({
  level,
  loginHref,
}: {
  level: AiReportLevel
  loginHref: string
}) {
  const isCommercial = level === 'commercial'
  return (
    <Wrap>
      <Sample aria-hidden="true">
        {isCommercial ? (
          <CommercialReportBlocks view={sampleCommercialView} />
        ) : (
          <RegionReportBlocks view={sampleRegionView} />
        )}
      </Sample>
      <Overlay>
        <Lock size={22} aria-hidden />
        <Copy>
          이 지역의 강점·리스크·추천 업종을 AI가 요약해 드려요 — 로그인하고 확인하기
        </Copy>
        <Cta href={loginHref}>로그인하고 AI 리포트 보기</Cta>
      </Overlay>
    </Wrap>
  )
}
```

> 토큰 확인: `--color-brand-600`/`--color-on-brand`가 `DESIGN.md`에 없으면 기존 `Button` 컴포넌트가 쓰는 실제 토큰으로 맞춘다(구현 시 `src/components/ui/button.tsx` 확인). 임의 색 추가 금지.

- [ ] **Step 4: 실행 → 통과**

Run: `pnpm vitest run src/lib/analysis/ai-report-presentation.test.ts src/components/analysis/ai-report/ai-report-lock-card.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/ai-report-samples.ts src/components/analysis/ai-report/ai-report-lock-card.tsx src/components/analysis/ai-report/ai-report-lock-card.test.ts src/lib/analysis/ai-report-presentation.ts src/lib/analysis/ai-report-presentation.test.ts
git commit -m "[FE] feat(ai-report): 미인증 잠금 카드(레벨별 blur 샘플 + returnUrl CTA)"
```

---

## Task 7: analysis-page 배선 (잠금 카드 노출 + 게이팅)

**Files:**
- Modify: `src/components/analysis/analysis-page.tsx`

**Interfaces:**
- Consumes: `AiReportLockCard`, 새 `resolveAiReportVisibility({ hydrated, isLoggedIn, levelKey, panelOpen })`.

- [ ] **Step 1: import + 가시성 계산 교체**

1) `import AiReportLockCard from '@/components/analysis/ai-report/ai-report-lock-card'` 추가.

2) `resolveAiReportVisibility` 호출을 교체(약 500번째 줄):

```ts
const {
  showCard: showAiCard,
  showLockCard: showAiLockCard,
  showPanel: showAiPanel,
} = resolveAiReportVisibility({
  hydrated: hasHydrated,
  isLoggedIn,
  levelKey: aiLevelKey,
  panelOpen: aiPanelOpen,
})
```

3) 로그인 링크(returnUrl) 계산을 컴포넌트 상단 파생값으로 추출(현재 `handleAiCardOpen` 내부 로직 재사용):

```ts
const aiLoginHref = (() => {
  const search = searchParams.toString()
  const currentHref = search ? `${pathname}?${search}` : pathname
  return `/login?redirect=${encodeURIComponent(currentHref)}`
})()
```

4) `handleAiCardOpen`은 로그인 사용자 전용 경로만 남긴다(비로그인은 잠금 카드가 CTA를 직접 노출하므로 카드 클릭 분기 불필요):

```ts
const handleAiCardOpen = () => {
  setAiActiveKey(aiLevelKey)
  setAiPanelOpen(true)
}
```

- [ ] **Step 2: 데스크톱 슬롯에 잠금 카드 추가**

`aiReportCard` 슬롯(약 635번째 줄)을 카드/잠금 카드 분기로 교체:

```tsx
aiReportCard={
  showAiCard && aiLevelKey ? (
    <AiReportCard targetName={aiTargetName} onOpen={handleAiCardOpen} />
  ) : showAiLockCard && aiLevel ? (
    <AiReportLockCard level={aiLevel} loginHref={aiLoginHref} />
  ) : null
}
```

- [ ] **Step 3: 모바일 슬롯도 동일 분기**

`mobileAiReportNode`(약 586번째 줄)를 교체:

```tsx
const mobileAiReportNode =
  showAiCard && aiLevelKey ? (
    <AiReportCard targetName={aiTargetName} onOpen={handleAiCardOpen} />
  ) : showAiLockCard && aiLevel ? (
    <AiReportLockCard level={aiLevel} loginHref={aiLoginHref} />
  ) : showAiPanel ? (
    <AiReportPanel
      targetName={aiTargetName}
      state={aiState}
      onClose={() => setAiPanelOpen(false)}
      onRetry={aiRetry}
      onViewFullAnalysis={openFullAnalysis}
    />
  ) : null
```

- [ ] **Step 4: 타입·린트·기존 테스트 확인**

Run: `pnpm typecheck && pnpm vitest run` → PASS. (미사용 import/변수 정리: 옛 `router`/`searchParams`가 여전히 다른 곳에서 쓰이는지 확인하고, 안 쓰면 제거.)

- [ ] **Step 5: Commit**

```bash
git add src/components/analysis/analysis-page.tsx
git commit -m "[FE] feat(ai-report): 비로그인 잠금 카드 노출 + 로그인 게이팅 배선"
```

---

## Task 8: 인덱스 상태 갱신 + 전체 검증 + 브라우저 확인

**Files:**
- Modify: `docs/features/_index.md` (AI 리포트 상태/링크 갱신 — 기존 형식을 따른다)

- [ ] **Step 1: 인덱스 상태 갱신**

`docs/features/_index.md`에서 AI 리포트 항목 상태를 "SSE 개편 반영"으로 갱신(기존 표/목록 형식 유지).

- [ ] **Step 2: 전체 게이트 실행**

Run: `pnpm test && pnpm qa:verify`
Expected: 모두 PASS (format:check·lint·typecheck·build).

- [ ] **Step 3: dev 서버 브라우저 검증**

`.claude/launch.json`의 `bosspick-frontend`(포트 5173)로 dev 실행 후 `/analysis`에서 확인:
1. **비로그인**: 자치구/행정동/상권 선택 시 잠금 카드(blur 샘플 + 로그인 CTA) 노출, 네트워크 탭에 `/api/v1/ai-reports/**` 요청 **없음**. CTA href에 `redirect=` 포함.
2. **로그인 후**: 카드 클릭 → 패널 오픈 → POST 제출 → (ACCEPTED면) 단계 텍스트 + 진행문구 순환 → COMPLETED에서 리포트 렌더. 네트워크 탭에서 `/api/ai-reports/jobs/{jobId}/stream`이 `text/event-stream`으로 열리는지, 응답이 스트리밍(점진 수신)되는지 확인.
3. **폴백**: 스트림 요청을 차단(예: 오프라인 토글 후 복구)했을 때 `/api/bff/ai-reports/jobs/{jobId}` 3초 폴링으로 완료 도달.
4. **에러/재시도**: FAILED 시 메시지 + 재시도 버튼 동작.

> 브라우저 검증은 `preview_start`(name: `bosspick-frontend`) → `read_network_requests`/`read_console_messages`/`computer` 스크린샷으로 증거를 남긴다.

- [ ] **Step 4: 최종 커밋(문서)**

```bash
git add docs/features/_index.md
git commit -m "[FE] docs(ai-report): 기능 인덱스 상태 갱신(SSE 개편)"
```

---

## Self-Review 메모 (계획 검증 결과)

- **Spec coverage**: D2 요구사항 1~12 매핑 — 잠금 카드(Task 6/7), 클릭 게이트(Task 7), 레벨 결정/리셋(기존 analysis-page 로직 유지), 3종 POST(Task 1), CACHED/ACCEPTED 분기(Task 1), SSE+폴백(Task 2/3/4), 단계/진행문구(Task 5), 에러코드(Task 1 classifyError + Task 5 UI), 미인증 무호출(Task 1 enabled + Task 7), 모바일 시트(Task 7), 전체분석(기존 유지). ✅
- **Placeholder scan**: 모든 코드 블록 실체 포함, TBD 없음. 토큰명(`--color-brand-600` 등)은 구현 시 실제 `button.tsx` 토큰으로 확인하라는 지시 포함. ✅
- **Type consistency**: `Meta<C>`·`AiReportSubmission`·`AiReportJob`·`decideNextPoll`(반환 `{kind}` + errorCode)·`reportFromJob(job, level)`·`AiReportState`(stage/progressMessages/errorKind/canRetry)·`resolveAiReportVisibility`(hydrated/isLoggedIn) 전 태스크 일관. ✅
- **주의**: Task 3 라우트 테스트의 import 경로는 리포지토리의 기존 `app/api/**/route.test.ts` 방식에 맞춰 조정(Step 4 노트). Task 6 잠금 카드 색 토큰은 `DESIGN.md`/`button.tsx` 확인 후 확정.
