# Simulation V2 API Waiting State Implementation Plan

> **For Codex:** Execute this plan in `feature/fe/simulation` with the `executing-plans` workflow. Do not modify backend, package versions, lockfiles, build, CI, or deployment configuration.

**Goal:** 현재 V2에서 성공할 수 없는 simulation API 호출을 6개 라우트에서 차단하고, 기능별 안전 대기 안내와 대체 이동 경로를 제공한다.

**Architecture:** 입력·리포트·비교 화면을 구분하는 정적 서버 컴포넌트 하나를 만들고 6개 App Router page가 해당 컴포넌트만 렌더하도록 교체한다. 인증 보호는 기존 middleware가 담당한다. 레거시 form/report/compare 컴포넌트와 API 모듈은 향후 Swagger 계약 재개를 위해 삭제하지 않는다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, styled-components, Vitest, pnpm.

---

## Task 1: 준비 상태 UI 계약을 테스트로 고정

**Files:**

- Create: `src/components/simulation/simulation-unavailable-page.test.ts`
- Create: `app/(shell)/simulation/simulation-routes.test.ts`

**Step 1: 화면 종류별 서버 렌더 테스트 작성**

`SimulationUnavailablePage`를 아직 만들지 않은 상태에서 다음 테스트를 작성한다.

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import SimulationUnavailablePage from '@/components/simulation/simulation-unavailable-page'

describe('SimulationUnavailablePage', () => {
  it.each([
    ['form', '창업 시뮬레이션을 준비하고 있습니다.'],
    ['report', '시뮬레이션 리포트를 준비하고 있습니다.'],
    ['compare', '시뮬레이션 비교를 준비하고 있습니다.'],
  ] as const)('renders the %s waiting state', (kind, title) => {
    const html = renderToStaticMarkup(
      createElement(SimulationUnavailablePage, { kind }),
    )

    expect(html).toContain(title)
    expect(html).toContain('V2 API 계약')
    expect(html).toContain('href="/analysis"')
    expect(html).toContain('href="/"')
    expect(html).not.toContain('NowDoBoss')
  })
})
```

**Step 2: RED 확인**

Run: `pnpm exec vitest run src/components/simulation/simulation-unavailable-page.test.ts`

Expected: FAIL because `simulation-unavailable-page` does not exist.

**Step 3: 6개 route source 계약 테스트 작성**

`app/(shell)/simulation/simulation-routes.test.ts`에서 `readFileSync`와 `import.meta.url`을 사용해 아래 6개 page source를 읽는다.

- `./page.tsx`
- `./report/page.tsx`
- `./compare/page.tsx`
- `../analysis/simulation/page.tsx`
- `../analysis/simulation/report/page.tsx`
- `../analysis/simulation/compare/page.tsx`

각 source가 다음 계약을 만족하는지 검증한다.

```ts
expect(source).toContain('SimulationUnavailablePage')
expect(source).not.toContain('SimulationFormPage')
expect(source).not.toContain('SimulationReportPage')
expect(source).not.toContain('SimulationComparePage')
expect(source).not.toContain('RequireAuth')
expect(source).toContain('V2 API 계약 준비 상태')
```

**Step 4: route 계약 RED 확인**

Run: `pnpm exec vitest run 'app/(shell)/simulation/simulation-routes.test.ts'`

Expected: FAIL because route pages still mount the legacy API components.

**Step 5: 테스트 커밋**

```bash
git add src/components/simulation/simulation-unavailable-page.test.ts app/'(shell)'/simulation/simulation-routes.test.ts
git commit -m "test(simulation): define V2 API waiting state"
```

## Task 2: 공통 준비 상태 서버 컴포넌트 구현

**Files:**

- Create: `src/components/simulation/simulation-unavailable-page.tsx`
- Test: `src/components/simulation/simulation-unavailable-page.test.ts`

**Step 1: 최소 구현**

다음 공개 계약을 사용한다.

```ts
export type SimulationUnavailableKind = 'form' | 'report' | 'compare'

type SimulationUnavailablePageProps = {
  kind: SimulationUnavailableKind
}
```

화면별 문구는 정적 record로 관리한다.

| kind      | 제목                                   | 설명                                                                         |
| --------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| `form`    | 창업 시뮬레이션을 준비하고 있습니다.   | 지역과 업종 조건을 계산할 V2 API 계약이 준비되면 입력 기능을 다시 제공한다.  |
| `report`  | 시뮬레이션 리포트를 준비하고 있습니다. | 예상 비용 결과를 계산할 V2 API 계약이 없어 현재 리포트를 생성하지 않는다.    |
| `compare` | 시뮬레이션 비교를 준비하고 있습니다.   | 저장 목록과 재계산 V2 API 계약이 준비되면 두 결과 비교 기능을 다시 제공한다. |

공통 UI는 다음을 포함한다.

- eyebrow `Simulation`
- 화면별 `h1`
- “V2 API 계약과 Gateway 연결을 준비 중” 안내
- 제공 예정 항목 3개: 조건 입력·계산, 저장·비교, 공유
- primary link `/analysis`
- secondary link `/`
- 장식 아이콘은 `aria-hidden="true"`
- DESIGN.md의 기존 CSS variable만 사용
- 375px에서 단일 열, 가로 오버플로 없음

**Step 2: 단일 테스트 GREEN 확인**

Run: `pnpm exec vitest run src/components/simulation/simulation-unavailable-page.test.ts`

Expected: 3 parameterized cases pass.

**Step 3: 정적 검사**

Run:

```bash
pnpm exec prettier --check src/components/simulation/simulation-unavailable-page.tsx src/components/simulation/simulation-unavailable-page.test.ts
git diff --check -- src/components/simulation/simulation-unavailable-page.tsx src/components/simulation/simulation-unavailable-page.test.ts
```

Expected: all pass.

**Step 4: 컴포넌트 커밋**

```bash
git add src/components/simulation/simulation-unavailable-page.tsx
git commit -m "feat(simulation): add V2 API waiting state"
```

## Task 3: 6개 route adapter 교체

**Files:**

- Modify: `app/(shell)/simulation/page.tsx`
- Modify: `app/(shell)/simulation/report/page.tsx`
- Modify: `app/(shell)/simulation/compare/page.tsx`
- Modify: `app/(shell)/analysis/simulation/page.tsx`
- Modify: `app/(shell)/analysis/simulation/report/page.tsx`
- Modify: `app/(shell)/analysis/simulation/compare/page.tsx`
- Test: `app/(shell)/simulation/simulation-routes.test.ts`

**Step 1: route import와 render 교체**

- 모든 page에서 `Suspense`, `RequireAuth`, `SimulationFormPage`, `SimulationReportPage`, `SimulationComparePage` import를 제거한다.
- `SimulationUnavailablePage`만 import한다.
- form route는 `<SimulationUnavailablePage kind="form" />`
- report route는 `<SimulationUnavailablePage kind="report" />`
- compare route는 `<SimulationUnavailablePage kind="compare" />`

middleware가 `/simulation/:path*`, `/analysis/simulation/:path*`를 이미 보호하므로 page 내부 인증 wrapper를 중복으로 추가하지 않는다.

**Step 2: metadata 정합화**

각 description에 `V2 API 계약 준비 상태`를 포함한다.

- form: `창업 시뮬레이션의 V2 API 계약 준비 상태를 안내합니다.`
- report: `창업 시뮬레이션 리포트의 V2 API 계약 준비 상태를 안내합니다.`
- compare: `창업 시뮬레이션 비교의 V2 API 계약 준비 상태를 안내합니다.`

각 route의 기존 path와 `index: false`는 유지한다.

**Step 3: route 계약 GREEN 확인**

Run: `pnpm exec vitest run 'app/(shell)/simulation/simulation-routes.test.ts'`

Expected: 6 route cases pass.

**Step 4: 관련 테스트 실행**

Run:

```bash
pnpm exec vitest run src/components/simulation/simulation-unavailable-page.test.ts 'app/(shell)/simulation/simulation-routes.test.ts' middleware.test.ts
pnpm exec prettier --check app/'(shell)'/simulation app/'(shell)'/analysis/simulation
git diff --check -- app/'(shell)'/simulation app/'(shell)'/analysis/simulation
```

Expected: all pass.

**Step 5: route 커밋**

```bash
git add app/'(shell)'/simulation app/'(shell)'/analysis/simulation
git commit -m "fix(simulation): stop calls to unavailable V2 APIs"
```

## Task 4: Feature 상태 문서 갱신

**Files:**

- Modify: `docs/features/_index.md`
- Modify: `docs/features/simulation/simulation.md`

**Step 1: 인덱스 상태 갱신**

simulation 행을 다음처럼 갱신한다.

- 이관 상태: `🟩 안전 대기 구현`
- 비고: `V2 Swagger·Gateway 계약 후 실제 기능 재개`

`✅ 이관·검증 완료`로 표시하지 않는다.

**Step 2: 테스트 결과 기록**

`simulation.md` TC 요약표에 실제 자동·브라우저 검증 결과만 기록한다. 인증된 안내 화면을 브라우저에서 열지 못한 경우 static render와 build 결과를 대체 근거로 명시한다.

**Step 3: 문서 검사와 커밋**

Run:

```bash
pnpm exec prettier --check docs/features/_index.md docs/features/simulation/simulation.md
git diff --check -- docs/features/_index.md docs/features/simulation/simulation.md
```

Expected: all pass.

```bash
git add docs/features/_index.md docs/features/simulation/simulation.md
git commit -m "docs(simulation): record V2 API dependency"
```

## Task 5: 전체 자동 검증

**Files:**

- Verify only

**Step 1: 전체 검증 실행**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected:

- Prettier passes.
- ESLint passes with zero warnings.
- TypeScript passes.
- Vitest and Node tests pass.
- Next production build passes.
- 기존 middleware deprecation warning은 결과에 기록하되 실패로 처리하지 않는다.

**Step 2: 범위 확인**

Run:

```bash
git status --short
git diff --check
git diff --stat origin/develop...HEAD
git log --oneline origin/develop..HEAD
```

Expected: simulation 명세·계획·테스트·공통 컴포넌트·6개 route·index만 포함한다.

## Task 6: 브라우저 검증

**Files:**

- Verify only

**Step 1: 개발 서버 실행**

Run: `pnpm dev --hostname 192.168.99.25`

**Step 2: 비로그인 보호 경계 검증**

desktop 1440×900과 mobile 375×812에서 아래를 확인한다.

- `/simulation?serviceCode=CS100001` → `/login?redirect=%2Fsimulation%3FserviceCode%3DCS100001`
- `/analysis/simulation?gugun=강남구` → 원래 pathname과 query를 포함한 login redirect
- login 화면에 가로 오버플로와 콘솔 오류 없음

**Step 3: 안내 UI 검증 범위 기록**

로그인 세션을 사용할 수 있으면 form/report/compare 안내 화면의 제목·CTA·반응형을 확인한다. 로그인 세션이 없으면 아래 근거로 제한을 명시한다.

- static render component test
- 6개 route source contract test
- Next production build

## Task 7: 브랜치 게시와 Draft PR 생성

**Files:**

- Verify Git metadata only

**Step 1: 최신 develop 재확인**

```bash
git fetch origin
git rev-list --left-right --count origin/develop...HEAD
git diff --check origin/develop...HEAD
```

develop이 진행된 경우 rebase 후 전체 자동 검증을 다시 수행한다.

**Step 2: push**

Run: `git push -u origin feature/fe/simulation`

**Step 3: Draft PR 생성**

- Base: `develop`
- Head: `feature/fe/simulation`
- Title: `[FE] fix: simulation V2 API 대기 상태 처리`
- Body에 백엔드 변경 없음, 실제 simulation 미완료, 6개 route의 실패 요청 차단, V2 Swagger/Gateway 재개 조건, 실제 검증 결과를 명시한다.

**Step 4: PR 확인**

Draft, base/head, mergeability, CI 상태와 URL을 확인한다.
