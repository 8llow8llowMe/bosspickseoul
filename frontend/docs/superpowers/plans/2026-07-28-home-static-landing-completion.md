# Home Static Landing Completion Plan

> **For Codex:** Execute this plan in `feature/fe/home` with the `executing-plans` workflow. Preserve unrelated local changes and stage only files listed in each task.

**Goal:** 정적 홈 랜딩의 범위와 브랜드, CTA, 반응형 동작을 확정하고 자동·브라우저 검증을 거쳐 별도 PR로 제출한다.

**Architecture:** `/`는 `app/(shell)/page.tsx`에서 서버 컴포넌트 `HomePage`를 렌더한다. 홈 전용 데이터 요청, 상태, effect, client boundary를 추가하지 않고 `next/link`로 이미 존재하는 Feature 라우트만 연결한다. 레거시 Top 10·지도는 `/status` 소유로 유지한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, styled-components, Vitest, pnpm.

---

## Task 1: 정적 홈 계약을 회귀 테스트로 고정

**Files:**

- Create: `src/components/home/home-page.test.ts`
- Test: `src/components/home/home-page.test.ts`

**Step 1: 서버 렌더 계약 테스트 작성**

`react-dom/server`의 `renderToStaticMarkup`과 `createElement`를 사용해 `HomePage`를 렌더하고 아래를 검증한다.

```ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import HomePage from '@/components/home/home-page'

describe('HomePage', () => {
  it('renders the approved static landing sections and routes', () => {
    const html = renderToStaticMarkup(createElement(HomePage))

    expect(html).toContain('서울 상권 판단을 한 흐름으로')
    expect(html).toContain('진행 과정')
    expect(html).toContain('연결 서비스')

    for (const href of [
      '/status',
      '/analysis',
      '/recommend',
      '/simulation',
      '/community/list',
      '/chatting/list',
      '/register',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('uses the current brand and does not restore legacy preview images', () => {
    const html = renderToStaticMarkup(createElement(HomePage))

    expect(html).toContain('BossPickSeoul')
    expect(html).not.toContain('NowDoBoss')
    expect(html).not.toContain('<img')
  })
})
```

기존 로컬 WIP가 일부 요구사항을 이미 구현했으므로 사용자 변경을 삭제해 인위적으로 RED를 만들지 않는다. 이 테스트는 남은 수정 전에 현재 승인된 계약을 고정하는 characterization test로 사용한다.

**Step 2: 단일 테스트 실행**

Run: `pnpm test -- src/components/home/home-page.test.ts`

Expected: 2 tests pass. 실패하면 구현 계약과 실제 렌더 차이를 먼저 확인하고 Task 2에서 최소 수정한다.

**Step 3: 테스트 커밋**

```bash
git add src/components/home/home-page.test.ts
git commit -m "test(home): cover static landing contract"
```

## Task 2: 홈 UI·브랜드·모바일 헤더 정합성 완료

**Files:**

- Modify: `app/(shell)/page.tsx`
- Modify: `src/components/home/home-page.tsx`
- Modify: `src/components/layout/site-header.tsx`
- Modify: `src/components/layout/site-footer.tsx`
- Modify: `src/lib/site.ts`
- Test: `src/components/home/home-page.test.ts`

**Step 1: 승인된 정적 랜딩 구조 유지**

- Hero / Quick actions / Workflow / Services / Metrics를 유지한다.
- Quick actions에 `/status`, `/analysis`, `/recommend`, `/simulation`을 노출한다.
- Services에 `/recommend`, `/community/list`, `/chatting/list`를 노출한다.
- 마지막 CTA에 `/register`, `/community/list`를 유지한다.
- 장식용 미리보기 이미지는 재도입하지 않는다.
- `PreviewPanel`의 중복 `border` 선언을 한 줄로 정리한다.

**Step 2: 브랜드 표기 통일**

- `app/(shell)/page.tsx` metadata description을 `BossPickSeoul`로 교체한다.
- `HomePage` workflow 카피를 `BossPickSeoul`로 교체한다.
- `SiteHeader`, `SiteFooter`, `siteConfig`의 사용자 노출 브랜드와 설명을 `BossPickSeoul`로 교체한다.
- 변경 대상 파일에서 `NowDoBoss` 잔존 여부를 검색한다.

Run:

```bash
rg -n "NowDoBoss" app/'(shell)'/page.tsx src/components/home/home-page.tsx src/components/layout/site-header.tsx src/components/layout/site-footer.tsx src/lib/site.ts
```

Expected: no matches.

**Step 3: 375px 모바일 헤더 오버플로 방지**

- 비로그인 데스크톱 로그인·회원가입 링크는 640px 이하에서 숨긴다.
- 모바일 메뉴 내부 로그인·회원가입 링크는 유지해 기능 접근성을 보존한다.
- 새 색상·spacing 토큰은 추가하지 않는다.

**Step 4: 대상 테스트와 정적 검사**

Run:

```bash
pnpm test -- src/components/home/home-page.test.ts
pnpm exec prettier --check app/'(shell)'/page.tsx src/components/home/home-page.tsx src/components/layout/site-header.tsx src/components/layout/site-footer.tsx src/lib/site.ts src/components/home/home-page.test.ts
git diff --check -- app/'(shell)'/page.tsx src/components/home/home-page.tsx src/components/layout/site-header.tsx src/components/layout/site-footer.tsx src/lib/site.ts src/components/home/home-page.test.ts
```

Expected: all pass.

**Step 5: 구현 커밋**

```bash
git add app/'(shell)'/page.tsx src/components/home/home-page.tsx src/components/layout/site-header.tsx src/components/layout/site-footer.tsx src/lib/site.ts
git commit -m "feat(home): finalize static landing experience"
```

## Task 3: Feature 상태 문서 완료

**Files:**

- Modify: `docs/features/_index.md`
- Modify: `docs/features/home/HANDOFF.md`

**Step 1: 인덱스 상태 갱신**

`home` 행을 `✅ 이관·검증 완료`로 바꾸고 비고에 `정적 랜딩 확정, Top 10·지도는 status 소유`를 기록한다.

**Step 2: 핸드오프 완료 상태 기록**

- D1을 `정적 랜딩 확정`, D2를 `status·simulation CTA 추가`로 표시한다.
- T1~T6 체크박스를 완료로 갱신한다.
- 검증 결과 섹션에 실제 실행한 명령과 결과만 기록한다.

**Step 3: 문서 검사**

Run:

```bash
pnpm exec prettier --check docs/features/_index.md docs/features/home/HANDOFF.md
git diff --check -- docs/features/_index.md docs/features/home/HANDOFF.md
```

Expected: all pass.

**Step 4: 문서 커밋**

```bash
git add docs/features/_index.md docs/features/home/HANDOFF.md
git commit -m "docs(home): mark static landing complete"
```

## Task 4: 전체 자동 검증

**Files:**

- Verify only

**Step 1: 포맷·린트·타입·테스트·빌드 실행**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected:

- Prettier check passes.
- ESLint exits with zero warnings.
- TypeScript check passes.
- All Vitest suites pass.
- Next.js production build passes. 기존 middleware deprecation warning은 실패로 보지 않되 결과에 기록한다.

**Step 2: 작업 범위 확인**

Run:

```bash
git status --short
git diff --check
git log --oneline origin/develop..HEAD
```

Expected: 홈 관련 커밋과 사용자가 보유하던 비관련 `.gitignore`, `docs/superpowers/` 변경만 구분되어 보인다.

## Task 5: 브라우저 검증

**Files:**

- Verify only

**Step 1: 개발 서버 실행**

Run: `pnpm dev`

Expected: localhost URL에서 `/`가 응답한다.

**Step 2: 데스크톱 검증**

1440×900 뷰포트에서 다음을 확인한다.

- Hero / Quick actions / Workflow / Services / Metrics가 순서대로 보인다.
- 링크 텍스트와 대상 경로가 명세와 일치한다.
- 콘솔에 hydration 오류와 framework overlay가 없다.
- 초기 렌더 후 styled-components 스타일이 유지된다.

**Step 3: 모바일 검증**

375×812 뷰포트에서 다음을 확인한다.

- 가로 스크롤이나 잘린 카드가 없다.
- 헤더 브랜드와 메뉴 버튼이 한 줄에 유지된다.
- 로그인·회원가입은 모바일 메뉴 안에서 접근 가능하다.
- 모든 카드와 CTA에 키보드 포커스가 도달한다.

**Step 4: 검증 결과 문서 반영**

Task 3 문서 커밋 전에 수행한 경우 실제 결과를 `HANDOFF.md`에 기록한다. 이미 Task 3 커밋 후라면 결과만 추가하는 보완 문서 커밋을 만든다.

## Task 6: 브랜치 게시와 Draft PR 생성

**Files:**

- Verify Git metadata only

**Step 1: 최신 develop과 차이·충돌 확인**

```bash
git fetch origin
git diff --check origin/develop...HEAD
git diff --stat origin/develop...HEAD
git status --short
```

비관련 로컬 변경은 커밋하거나 stash하지 않는다. 최신 `develop`과 충돌이 없다면 현재 브랜치를 그대로 게시한다.

**Step 2: 브랜치 푸시**

Run: `git push -u origin feature/fe/home`

Expected: remote branch updated.

**Step 3: Draft PR 생성**

- Base: `develop`
- Head: `feature/fe/home`
- Title: `[FE] feat: 홈 정적 랜딩 확정`
- Body: 요약, 배경, 주요 변경 사항, 실제 테스트 및 검증, UI 변경 여부, 영향 범위 및 리스크, 체크리스트를 한국어로 작성한다.
- 백엔드 변경 없음과 Top 10·지도를 `/status`에 유지한 결정을 명시한다.

**Step 4: PR 상태 확인**

Draft 여부, base/head, 커밋 목록, CI 상태를 확인하고 URL을 완료 보고에 포함한다.
