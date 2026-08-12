# AI 리포트 사이드바 인라인 + 크게보기 모달 (공유 본문) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전용 페이지 본문을 공유 컴포넌트 `AiReportBody(selection, variant)`로 추출해, **사이드바 패널에 전체 리포트(지표+차트+AI)를 세로로 인라인**하고 헤더의 **"크게보기" 버튼 → 모달**로 크게 볼 수 있게 한다. 리포트 본문 배경을 흰색으로 바꿔 콘텐츠 대비를 개선한다.

**Architecture:** `ai-report-page-view.tsx`의 데이터/AI/섹션 조립을 `ai-report-body.tsx`로 이동(자체 react-query 소유, 키 dedupe로 중복 제출 없음). 페이지·사이드바·모달 세 표면이 동일 본문을 `variant='full'|'compact'`로 재사용. 모달은 기존 접근성 완비 `AnalysisResultModalSurface`(ESC·포커스트랩·스크롤락)를 재사용. FE 전용, 백엔드 계약 변경 없음.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `@tanstack/react-query` v5, styled-components, vitest.

## Global Constraints

- **FE 전용**: 백엔드 API/계약 변경 금지. 기존 페처/훅/엔드포인트만.
- **디자인 토큰만**(`DESIGN.md` CSS 변수): 본문 배경 = `var(--color-surface)`(흰색), 카드/차트 카드 = `var(--color-surface-muted)`(대비). 임의 색/radius/shadow 추가 금지.
- **중복 금지(DRY)**: 데이터 쿼리·리졸버·섹션 조립은 `AiReportBody` 한 곳. 페이지/사이드바/모달은 래퍼만. 모달 메커니즘은 `AnalysisResultModalSurface` 재사용(새로 만들지 않음).
- **비로그인 정책**: 차트·지표 노출 + AI 인사이트만 잠금(기존 `resolveInsightMode`가 처리). 사이드바도 동일.
- **reduced-motion**: 기존 스켈레톤/전환 가드 유지(회귀 없음).
- **테스트**: vitest `environment: 'node'`, `**/*.test.ts`만(렌더 테스트 없음) → 순수 로직/상태 리졸버 + source-contract 테스트(선례 `app/(shell)/simulation/simulation-routes.test.ts`).
- **인코딩**: 새 파일 UTF-8(no BOM), Write 툴 사용.
- **커밋 전 필수**: `pnpm exec prettier --write` 후 `pnpm exec prettier --check` clean, `pnpm exec tsc --noEmit --incremental false` clean. 최종 Task는 `pnpm qa:verify` + `pnpm exec vitest run` 전체 green.
- **정본 명세**: `docs/features/analysis/ai-report-page.md` **D9** 섹션.
- **브랜치**: `feature/fe/ai-report-page`(PR #110에 이어짐). base `develop`.

---

## File Structure

**신규**
- `src/components/analysis/ai-report-body.tsx` — `AiReportBody({ selection, variant })`. 쿼리+AI+섹션 조립 + 흰 배경 컨테이너 + "전체 데이터 분석 보기" 푸터 링크.

**수정**
- `src/components/analysis/ai-report-page-view.tsx` — 본문 로직 제거 → `<AiReportBody variant="full" />` 위임, `Main` 배경 흰색.
- `src/components/analysis/ai-report/report-metric-cards.tsx` — `variant`/`compact`로 그리드 열 수 제어.
- `src/components/analysis/ai-report/report-chart-section.tsx` — `variant`/`compact`로 차트 `height`(+그리드) 제어.
- `src/components/analysis/analysis-result-modal.tsx` — `AnalysisResultModalSurface`에 optional `ariaLabel` prop(닫기 버튼 셀렉터도 라벨 기반 일반화).
- `src/components/analysis/ai-report/ai-report-panel.tsx` — 텍스트-only 본문 → `<AiReportBody variant="compact" />`, 헤더 "크게보기" 버튼 + 모달 상태, `selection` prop 수신, 기존 `ReportLink`(aiReportHref)·중복 푸터 제거.
- `src/components/analysis/analysis-page.tsx` — 패널에 `selection` 전달, `aiReportHref` 전달 제거.
- `docs/features/_index.md` — analysis 노트에 사이드바 인라인+모달 반영.

---

## Task 1: 차트/지표 섹션에 `variant` 레이아웃 prop

`AiReportBody`가 compact(사이드바)와 full(페이지·모달)에서 다른 밀도로 렌더하려면 두 섹션 컴포넌트가 레이아웃 variant를 받아야 한다. 추가 prop이며 기본값=현행(full) → 기존 사용처 무영향.

**Files:**
- Modify: `src/components/analysis/ai-report/report-metric-cards.tsx`
- Modify: `src/components/analysis/ai-report/report-chart-section.tsx`
- Test: 각 컴포넌트 `*.test.ts`(source-contract, 선례식) — 없으면 생성

**Interfaces:**
- Produces:
  - `ReportMetricCards({ cards, variant }: { cards: MetricCardModel[]; variant?: 'full' | 'compact' })` — `variant='compact'`면 그리드 1열, 아니면 기존 반응형(4열→축소). 기본 `'full'`.
  - `ReportChartSection({ sales, foot, salesLoading, footLoading, variant }: … & { variant?: 'full' | 'compact' })` — `variant='compact'`면 차트 `height`를 축소값(160)으로, 아니면 200. 기본 `'full'`.

- [ ] **Step 1: 실패 테스트 작성** — `report-metric-cards.test.ts`(source-contract):

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('ReportMetricCards variant', () => {
  it('variant prop과 compact 1열 분기를 노출한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./report-metric-cards.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain("variant?: 'full' | 'compact'")
    expect(src).toContain('$variant')
  })
})
```

`report-chart-section.test.ts`(source-contract):

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

it('ReportChartSection은 variant로 차트 height를 낮춘다', () => {
  const src = readFileSync(
    fileURLToPath(new URL('./report-chart-section.tsx', import.meta.url)),
    'utf8',
  )
  expect(src).toContain("variant?: 'full' | 'compact'")
  expect(src).toContain('160')
})
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/components/analysis/ai-report/report-metric-cards.test.ts src/components/analysis/ai-report/report-chart-section.test.ts`. Expected: FAIL.

- [ ] **Step 3: 구현**
  - `report-metric-cards.tsx`: props에 `variant?: 'full' | 'compact'` 추가(기본 `'full'`). 그리드 styled에 `$variant` transient prop 전달, `variant==='compact'`면 `grid-template-columns: 1fr`(1열), 아니면 기존 반응형 유지. `formatGrowth`/카드 로직 불변.
  - `report-chart-section.tsx`: props에 `variant?: 'full' | 'compact'` 추가. 상단 상수 `const CHART_HEIGHT = variant === 'compact' ? 160 : 200`로 바꿔 각 차트에 `height={CHART_HEIGHT}` 전달. 빈검사/slot 로직 불변.
  - prettier가 재포맷할 문자열(`variant?: 'full' | 'compact'`, `160`)이 테스트 assert와 일치하는지 확인.

- [ ] **Step 4: 통과 확인** — Run: 위 vitest 경로 (PASS) + `pnpm exec tsc --noEmit --incremental false`(clean). 기존 차트/카드 사용처(전용 페이지)는 기본 `full`로 무변.

- [ ] **Step 5: 커밋**

```bash
git add src/components/analysis/ai-report/report-metric-cards.tsx src/components/analysis/ai-report/report-chart-section.tsx src/components/analysis/ai-report/report-metric-cards.test.ts src/components/analysis/ai-report/report-chart-section.test.ts
git commit -m "feat(analysis): 리포트 지표/차트 섹션에 variant(compact) 레이아웃 prop"
```

---

## Task 2: `AiReportBody` 추출 + 전용 페이지 위임 + 흰 배경

`ai-report-page-view.tsx`의 데이터/AI/섹션 조립을 재사용 본문으로 옮기고, 페이지는 얇은 래퍼로 만든다. 본문 배경을 흰색으로.

**Files:**
- Create: `src/components/analysis/ai-report-body.tsx`
- Modify: `src/components/analysis/ai-report-page-view.tsx`
- Test: `app/(shell)/analysis/report/report-route.test.ts` 확장(본문 위임 확인) 또는 `ai-report-body`의 source-contract 테스트

**Interfaces:**
- Produces: `AiReportBody({ selection, variant }: { selection: AnalysisSelection; variant?: 'full' | 'compact' })` — 내부에서 4개 fast 쿼리 + `useAiReport` 소유, `ReportMetricCards`/`ReportChartSection`/`ReportInsightSection`에 `variant` 전달, 헤더(상권명+업종코드)·"전체 데이터 분석 보기" 푸터 링크 포함. 루트 컨테이너 배경 `var(--color-surface)`.
- Consumes: 기존 `ai-report-page-view.tsx`가 쓰던 import 전부(쿼리 페처, 리졸버, 훅, selection 헬퍼).

- [ ] **Step 1: 실패 테스트 작성** — `src/components/analysis/ai-report-body.test.ts`(source-contract):

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('AiReportBody', () => {
  it('본문은 selection+variant를 받고 흰 배경과 세 섹션을 렌더한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./ai-report-body.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain("variant?: 'full' | 'compact'")
    expect(src).toContain('var(--color-surface)')
    expect(src).toContain('ReportMetricCards')
    expect(src).toContain('ReportChartSection')
    expect(src).toContain('ReportInsightSection')
    expect(src).toContain('useAiReport')
  })
  it('전용 페이지 뷰는 본문을 AiReportBody에 위임한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./ai-report-page-view.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain('AiReportBody')
    expect(src).not.toContain('useAiReport') // 로직이 본문으로 이동
  })
})
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/components/analysis/ai-report-body.test.ts`. Expected: FAIL.

- [ ] **Step 3: 구현**
  - `ai-report-body.tsx`(`'use client'`): 현재 `ai-report-page-view.tsx`의 L118-228 로직(auth, 4쿼리, growth, cards, useAiReport, insightMode, loginHref)과 렌더(Header/ReportMetricCards/ReportChartSection/InsightSection/Footer 링크)를 **그대로 이동**. props에 `variant?: 'full' | 'compact'`(기본 `'full'`) 추가해 두 섹션 컴포넌트에 전달. 루트 컨테이너 styled `background: var(--color-surface)` + `variant`에 따른 패딩/gap. `resultHref` 푸터 링크 포함.
  - `ai-report-page-view.tsx`: 로직/섹션 제거 → `Main`(배경 `var(--color-surface)`) + `Content` 래퍼 안에 `<AiReportBody selection={selection} variant="full" />`만. (Header/Footer가 본문으로 이동했으므로 page는 Main+Content 셸만.)
  - `Main`의 `background: var(--color-surface-muted)` → `var(--color-surface)`.
  - 이동 시 로그인 리다이렉트/쿼리 키/주석 등 동작 보존.

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/components/analysis/ai-report-body.test.ts "app/(shell)/analysis/report/report-route.test.ts"` (PASS) + `pnpm exec tsc --noEmit --incremental false`(clean). 전용 페이지가 동일하게 렌더되는지(회귀 없음) 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/components/analysis/ai-report-body.tsx src/components/analysis/ai-report-page-view.tsx src/components/analysis/ai-report-body.test.ts
git commit -m "refactor(analysis): AiReportBody 공유 본문 추출 + 페이지 위임 + 흰 배경"
```

---

## Task 3: 모달 서피스 재사용 준비(`ariaLabel` 파라미터화)

크게보기 모달은 기존 `AnalysisResultModalSurface`(ESC·포커스트랩·스크롤락·오버레이닫기·모바일 풀스크린)를 재사용한다. 라벨만 일반화한다.

**Files:**
- Modify: `src/components/analysis/analysis-result-modal.tsx`
- Test: `src/components/analysis/analysis-result-modal.test.ts`(기존)에 추가

**Interfaces:**
- Produces: `AnalysisResultModalSurface({ onClose, children, ariaLabel }: { onClose: () => void; children: ReactNode; ariaLabel?: string })` — `ariaLabel` 기본 `'상권 분석 결과'`. `role="dialog"` `aria-label={ariaLabel}`, 초기 포커스 대상 닫기 버튼 셀렉터를 `[aria-label="${ariaLabel} 닫기"]`로 일반화(기존 결과 모달 라벨 유지 → 무변).

- [ ] **Step 1: 실패 테스트 작성** — `analysis-result-modal.test.ts`에 append(source-contract):

```ts
it('모달 서피스는 optional ariaLabel을 받는다', () => {
  const src = readFileSync(
    fileURLToPath(new URL('./analysis-result-modal.tsx', import.meta.url)),
    'utf8',
  )
  expect(src).toContain('ariaLabel')
  expect(src).toContain("ariaLabel = '상권 분석 결과'")
})
```

(파일에 `readFileSync`/`fileURLToPath` import 없으면 추가.)

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/components/analysis/analysis-result-modal.test.ts`. Expected: FAIL.

- [ ] **Step 3: 구현** — `AnalysisResultModalSurfaceProps`에 `ariaLabel?: string` 추가. 구조분해 `ariaLabel = '상권 분석 결과'`. `aria-label={ariaLabel}`, 닫기 버튼 셀렉터를 템플릿 리터럴 `` `[aria-label="${ariaLabel} 닫기"]` ``로. 기본 `AnalysisResultModal`은 무변(기본값이 현행과 동일).

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/components/analysis/analysis-result-modal.test.ts` (PASS) + `pnpm exec tsc --noEmit --incremental false`.

- [ ] **Step 5: 커밋**

```bash
git add src/components/analysis/analysis-result-modal.tsx src/components/analysis/analysis-result-modal.test.ts
git commit -m "refactor(analysis): AnalysisResultModalSurface ariaLabel 파라미터화(재사용 준비)"
```

---

## Task 4: 사이드바 패널 — compact 인라인 본문 + 크게보기 모달

패널 본문을 `AiReportBody variant="compact"`로 교체하고, 헤더 "크게보기" 버튼으로 `variant="full"` 본문을 모달에 띄운다.

**Files:**
- Modify: `src/components/analysis/ai-report/ai-report-panel.tsx`
- Test: `src/components/analysis/ai-report/ai-report-panel.test.ts`(기존)

**Interfaces:**
- Produces: `AiReportPanel({ targetName, selection, onClose, ariaLabel? })` — props 변경: `state`/`onRetry`/`onViewFullAnalysis`/`aiReportHref` 제거(본문이 AI·재시도·결과링크 소유), **`selection: AnalysisSelection` 추가**. 내부 `useState`로 모달 open 상태. 헤더에 "크게보기" 버튼(확대 아이콘, 예 `lucide-react`의 `Maximize2`). 본문 `<AiReportBody selection={selection} variant="compact" />`. 모달 open 시 `<AnalysisResultModalSurface onClose ariaLabel={`${targetName} AI 리포트`}><AiReportBody selection variant="full" /></AnalysisResultModalSurface>`.
- Consumes: `AiReportBody`(Task 2), `AnalysisResultModalSurface`(Task 3), `AnalysisSelection`.

- [ ] **Step 1: 실패 테스트 작성** — `ai-report-panel.test.ts` 갱신(source-contract). 기존 "AI 리포트 보기"/`createAiReportHref` assert가 있으면 제거/교체하고:

```ts
it('패널은 크게보기 버튼과 AiReportBody(compact) + 모달을 렌더한다', () => {
  const src = readFileSync(
    fileURLToPath(new URL('./ai-report-panel.tsx', import.meta.url)),
    'utf8',
  )
  expect(src).toContain('크게보기')
  expect(src).toContain('AiReportBody')
  expect(src).toContain("variant=\"compact\"")
  expect(src).toContain('AnalysisResultModalSurface')
  expect(src).not.toContain('createAiReportHref') // CTA 대체됨
})
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/components/analysis/ai-report/ai-report-panel.test.ts`. Expected: FAIL.

- [ ] **Step 3: 구현**
  - `ai-report-panel.tsx`: props를 위 인터페이스로 변경. `const [expanded, setExpanded] = useState(false)`. 헤더에 "크게보기" 버튼(`aria-label="크게보기"`, `Maximize2` 아이콘) → `setExpanded(true)`. `Body`에 `<AiReportBody selection={selection} variant="compact" />`. 기존 `Content` switch/`CommercialReportBlocks`/`LoadingBody`/`ReportLink`/`Footer(onViewFullAnalysis)` 제거(본문이 상태·결과링크 소유). `{expanded && <AnalysisResultModalSurface onClose={() => setExpanded(false)} ariaLabel={`${targetName} AI 리포트`}><AiReportBody selection={selection} variant="full" /></AnalysisResultModalSurface>}`.
  - 사용하지 않게 된 import(`CommercialReportBlocks`, `useProgressRotation` 등) 제거.

- [ ] **Step 4: 통과 확인** — Run: `pnpm exec vitest run src/components/analysis/ai-report/ai-report-panel.test.ts` (PASS) + `pnpm exec tsc --noEmit --incremental false`. (analysis-page 배선은 Task 5에서 맞춘다 — 이 시점 tsc는 panel 단독 타입만.)

- [ ] **Step 5: 커밋**

```bash
git add src/components/analysis/ai-report/ai-report-panel.tsx src/components/analysis/ai-report/ai-report-panel.test.ts
git commit -m "feat(analysis): 사이드바 패널 인라인 리포트(compact) + 크게보기 모달"
```

---

## Task 5: analysis-page 배선 + 인덱스 + 최종 검증

패널 prop 변경에 맞춰 상위 배선을 갱신하고 전체를 green으로 만든다.

**Files:**
- Modify: `src/components/analysis/analysis-page.tsx`
- Modify: `src/components/analysis/analysis-page.test.ts`(있으면; 기존 `createAiReportHref` assert 조정)
- Modify: `docs/features/_index.md`

**Interfaces:**
- Consumes: `AiReportPanel`(Task 4 새 props). analysis-page는 이미 `selection`을 가짐.

- [ ] **Step 1: 실패 테스트 작성** — `analysis-page.test.ts`(source-contract) 갱신: 패널에 `selection` 전달 확인, 구 `aiReportHref` 제거 확인:

```ts
it('analysis-page는 패널에 selection을 넘긴다', () => {
  const src = readFileSync(
    fileURLToPath(new URL('./analysis-page.tsx', import.meta.url)),
    'utf8',
  )
  expect(src).toContain('selection={selection}')
})
```

(기존에 `createAiReportHref`를 assert하던 테스트가 있으면, 패널 진입이 모달로 바뀌었으므로 해당 assert 제거.)

- [ ] **Step 2: 실패 확인** — Run: `pnpm exec vitest run src/components/analysis/analysis-page.test.ts`. Expected: FAIL(또는 기존 assert와 상충).

- [ ] **Step 3: 구현**
  - `analysis-page.tsx`: `<AiReportPanel …>`에 `selection={selection}` 전달, `aiReportHref`/`onViewFullAnalysis`(패널용) 전달 제거, `state`/`onRetry`를 패널에 넘기던 부분 제거(패널이 본문에서 소유). `AiReportPanelSlot` 렌더 로직은 유지. `createAiReportHref` import가 다른 곳에서 안 쓰이면 제거(사이드바 카드-프리뷰의 `useAiReport`는 analysis-page가 계속 쓸 수 있음 — 그 부분은 유지, 패널로의 state 전달만 제거). 데스크톱·모바일 시트 양쪽 렌더 사이트 모두 반영.
  - `docs/features/_index.md`: analysis 노트에 "AI 리포트: 사이드바 인라인 전체 리포트 + 크게보기 모달(공유 본문 `AiReportBody`)" 한 줄 추가.

- [ ] **Step 4: 통과 확인 + 최종 게이트**
  - Run: `pnpm exec vitest run src/components/analysis/analysis-page.test.ts` (PASS).
  - `pnpm exec prettier --write` 변경 파일 전체 → `pnpm exec prettier --check` clean.
  - `pnpm exec vitest run` **전체 green**.
  - `pnpm qa:verify`(format:check && lint && typecheck && **next build**) **green**. 클라이언트/서버 경계·미사용 import 오류 없으면 성공. 결과 tail 보고.

- [ ] **Step 5: 커밋**

```bash
git add src/components/analysis/analysis-page.tsx src/components/analysis/analysis-page.test.ts docs/features/_index.md
git commit -m "feat(analysis): 사이드바 패널 배선(selection) + 인덱스 반영"
```

---

## Self-Review (작성자 체크)

**1. 스펙 커버리지 (D9 → Task)**
- D9-3 공유 본문 `AiReportBody` → Task 2. D9-4 variant → Task 1(+2). D9-5 패널 크게보기 대체·compact 본문·selection → Task 4/5. D9-6 모달 재사용 → Task 3/4. D9-7 비로그인 통일(본문이 처리)·흰 배경 → Task 2(+본문). D9-8 반응형/캐시 dedupe → Task 1/2 설계. D9-9 테스트 → 각 Task. D9-10/11 재사용·결정 → 전반 반영.

**2. 플레이스홀더 스캔** — 각 Task 실제 코드/테스트 포함. UI styled 세부는 "기존 톤/토큰 준수"로 위임(렌더 테스트 불가 환경). TODO 없음.

**3. 타입 일관성** — `variant?: 'full' | 'compact'`가 ReportMetricCards/ReportChartSection/AiReportBody에서 동일 유니온. `AiReportPanel`이 `selection: AnalysisSelection` + `ariaLabel?` 사용, `AnalysisResultModalSurface`가 `ariaLabel?: string` 제공 — 일치. 패널에서 제거한 `state`/`onRetry`/`aiReportHref`를 analysis-page(Task 5)에서 동일하게 제거해 정합.

## 실행 격리 / 참고
- 브랜치 `feature/fe/ai-report-page`(PR #110 연장), base `develop`.
- 부분 검증 `pnpm exec vitest run <경로>`, 최종 `pnpm qa:verify` + 전체 vitest.
- 회귀 핵심: 전용 페이지(`/analysis/report`)가 리팩터 후에도 동일 렌더(Task 2), 결과 모달(`AnalysisResultModal`)이 `ariaLabel` 기본값으로 무변(Task 3).
