# BossPickSeoul FE 문서·설계 체계 재편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BossPickSeoul `frontend/`의 문서·설계 체계를 Feature 기준 명세(정본) + superpowers(프로세스) + 역할별 통폐합 문서로 재편한다.

**Architecture:** `docs/features/`(공통→세부 2계층 명세, 정본) · `docs/engineering/`(횡단 규칙, 유지) · `docs/runbook/`(실행·운영 통폐합) · `DESIGN.md`(디자인 정본) · `frontend/CLAUDE.md`(얕은 지도). 기존 실행/에이전트/디자인 분산 문서는 통폐합하고 원문은 `docs/_archive/`로 이동해 안전망을 둔다.

**Tech Stack:** Markdown 문서. 검증은 `find`/`grep`/링크 확인. 코드 변경 없음(문서 전용). 검증 명령 참조: `pnpm qa:verify`.

## Global Constraints

- 이 작업은 **문서·설계 체계 재편**이다. 기능 재구현·리디자인·코드 변경 없음.
- 원문 문서는 **삭제 대신 `docs/_archive/`로 이동**(안전망). `git mv` 사용.
- 명세 계층은 **2계층(공통 S0~S5 → 세부 D0~D8)**. 플랫폼명세(P) 미사용.
- 명세 정본은 **한국어 `_DocumentTemplates` 형식**. superpowers는 만드는 과정.
- 정본 위치는 단 하나: 설계=`docs/features/`, 디자인=`DESIGN.md`, 규칙=`docs/engineering/`, 운영=`docs/runbook/`.
- 마이그레이션이므로 명세 `S0`에 **legacy 동작을 as-is로** 기록해 동작 동일성을 강제한다.
- 백엔드 API 계약·`backend/`는 범위 밖. 임의 API 스펙 작성 금지.
- 대상 경로 기준 디렉터리: `BossPickSeoul/frontend/`.
- 설계서 정본: `docs/superpowers/specs/2026-07-15-fe-docs-restructure-design.md`.

---

### Task 1: 디렉터리 스캐폴딩

**Files:**

- Create: `docs/features/` (+ 10개 Feature 하위 폴더)
- Create: `docs/runbook/`
- Create: `docs/_archive/`

**Interfaces:**

- Produces: 이후 모든 태스크가 채워 넣을 빈 디렉터리 골격.

- [ ] **Step 1: Feature/runbook/archive 폴더 생성**

```bash
cd BossPickSeoul/frontend
mkdir -p docs/_archive docs/runbook
for f in home auth status recommend analysis simulation community chatting profile share; do
  mkdir -p "docs/features/$f"
done
# git가 빈 폴더를 추적하도록 임시 keep 파일
for f in home auth status recommend analysis simulation community chatting profile share; do
  touch "docs/features/$f/.gitkeep"
done
touch docs/_archive/.gitkeep docs/runbook/.gitkeep
```

- [ ] **Step 2: 구조 검증**

Run: `cd BossPickSeoul/frontend && find docs/features -type d | sort && ls docs/runbook docs/_archive`
Expected: `docs/features` + 10개 하위 폴더(home…share), `docs/runbook`·`docs/_archive` 존재.

- [ ] **Step 3: Commit**

```bash
git add docs/features docs/runbook docs/_archive
git commit -m "docs: scaffold feature-spec / runbook / archive directories"
```

---

### Task 2: `docs/features/_index.md` (구 migration-inventory 흡수)

**Files:**

- Create: `docs/features/_index.md`
- Read (source): `docs/migration-inventory.md`, 신규 `app/**`, 설계서 §5

**Interfaces:**

- Produces: Feature 목록 + 라우트 매핑 + 이관 상태 표. 이후 각 Feature 명세가 링크됨.

- [ ] **Step 1: `_index.md` 작성**

다음 구조로 작성한다:

```markdown
# Feature 명세 인덱스

> 이 디렉터리는 BossPickSeoul FE의 **설계 정본**이다. 각 Feature = 공통명세 1 + 세부명세 N.
> 형식: `../../_DocumentTemplates` (공통 S0~S5 / 세부 D0~D8, 2계층).

## Feature 목록 & 이관 상태

| Feature    | 공통명세                                 | 대표 라우트                                           | 이관 상태 | 비고                   |
| ---------- | ---------------------------------------- | ----------------------------------------------------- | --------- | ---------------------- |
| home       | [home](./home/home.md)                   | `(shell)/`                                            | ⬜ 미착수 |                        |
| auth       | [auth](./auth/auth.md)                   | `(auth)/login,register,…` `member/loading/[provider]` | ⬜        |                        |
| status     | [status](./status/status.md)             | `(shell)/status`                                      | ⬜        |                        |
| recommend  | [recommend](./recommend/recommend.md)    | `(shell)/recommend`                                   | ⬜        |                        |
| analysis   | [analysis](./analysis/analysis.md)       | `(shell)/analysis,result,simulation…`                 | ⬜        |                        |
| simulation | [simulation](./simulation/simulation.md) | `(shell)/simulation,compare,report`                   | ⬜        |                        |
| community  | [community](./community/community.md)    | `(shell)/community/{list,register,[id]}`              | ⬜        |                        |
| chatting   | [chatting](./chatting/chatting.md)       | `(shell)/chatting/{list,[roomId]}`                    | ⬜        | 최종 단계(인증·FCM·WS) |
| profile    | [profile](./profile/profile.md)          | `(shell)/profile/{settings,bookmarks,…}`              | ⬜        |                        |
| share      | [share](./share/share.md)                | `(shell)/share/[token]`                               | ⬜        |                        |

## 상태 범례

⬜ 미착수 · 🟡 명세 작성중 · 🟩 명세 완료 · ✅ 이관·검증 완료

## 이관 순서

공통 인프라 → home/auth → status/recommend → analysis/simulation → community → profile → chatting.

## 이관 기록 방식

각 Feature 이관 시: legacy source 파일, target 파일, 상태, known gaps, 검증 결과, 남은 작업을 해당 Feature 공통명세 S0/변경이력에 남기고 이 표의 상태를 갱신한다.
```

> 링크 대상 파일은 아직 없을 수 있다(파일럿 이후 생성). 상대경로만 정확히 둔다.

- [ ] **Step 2: 검증**

Run: `cd BossPickSeoul/frontend && grep -c '| .* |' docs/features/_index.md && grep -o '(./[a-z]*/[a-z]*.md)' docs/features/_index.md | sort -u`
Expected: 10개 Feature 행 + 10개 공통명세 상대링크.

- [ ] **Step 3: Commit**

```bash
git add docs/features/_index.md
git commit -m "docs: add feature index absorbing migration-inventory"
```

---

### Task 3: `docs/runbook/` 통폐합 (실행·운영 문서)

**Files:**

- Create: `docs/runbook/migration.md` (← `migration-playbook.md` + `phase-checklist.md`)
- Create: `docs/runbook/qa.md` (← `qa-runbook.md` + `done-checklist.md`)
- Create: `docs/runbook/cutover.md` (← `cutover-runbook.md` + `seo-performance-audit.md`)
- Create: `docs/runbook/seo.md` (← `seo-guide.md`)
- Move: 위 6개 원문 → `docs/_archive/`

**Interfaces:**

- Consumes: 기존 6개 실행 문서의 내용.
- Produces: 4개 통합 런북. 명세/CLAUDE.md가 참조.

- [ ] **Step 1: 4개 통합 문서 작성**

각 통합 문서는 다음 규칙으로 작성한다 — 원문 내용을 **손실 없이 병합**하되 중복 문단은 1회로 합치고, 각 문서 상단에 목적 한 줄 + 원출처(`_archive/…`) 표기.

- `migration.md`: `## 1. 단계별 이관 절차`(playbook 본문) + `## 2. Phase 체크리스트`(phase-checklist 본문). Phase 순서·기술 선택 유지.
- `qa.md`: `## 1. 자동 검증`(`pnpm qa:verify`) + `## 2. 수동 smoke test`(qa-runbook) + `## 3. 완료 체크리스트`(done-checklist).
- `cutover.md`: `## 1. 환경변수·전환 순서·롤백`(cutover-runbook) + `## 2. SEO/번들 점검`(seo-performance-audit).
- `seo.md`: seo-guide 본문(공개/비공개 페이지 정책, metadata, canonical, OG, noindex).

- [ ] **Step 2: 원문 아카이브 이동**

```bash
cd BossPickSeoul/frontend
git mv docs/migration-playbook.md docs/_archive/
git mv docs/phase-checklist.md docs/_archive/
git mv docs/qa-runbook.md docs/_archive/
git mv docs/done-checklist.md docs/_archive/
git mv docs/cutover-runbook.md docs/_archive/
git mv docs/seo-performance-audit.md docs/_archive/
git mv docs/seo-guide.md docs/_archive/
```

- [ ] **Step 3: 검증 — 통합본 존재 & 원문 이동 확인**

Run: `cd BossPickSeoul/frontend && ls docs/runbook/*.md && ls docs/_archive/*.md`
Expected: `runbook/`에 4개(migration,qa,cutover,seo), `_archive/`에 이동된 원문 7개.

- [ ] **Step 4: 내용 손실 점검**

Run: `cd BossPickSeoul/frontend && wc -l docs/runbook/*.md docs/_archive/{migration-playbook,phase-checklist,qa-runbook,done-checklist,cutover-runbook,seo-performance-audit,seo-guide}.md`
Expected: 통합본 라인 합이 원문 대비 과도하게 작지 않음(핵심 내용 보존 확인). 육안 확인.

- [ ] **Step 5: Commit**

```bash
git add docs/runbook docs/_archive
git commit -m "docs: consolidate execution docs into runbook/, archive originals"
```

---

### Task 4: `DESIGN.md` 디자인 정본 통합

**Files:**

- Modify: `DESIGN.md` (← 흡수: `docs/design-guide.md`, `docs/design-prompt.md`, `docs/design-redesign-tasks.md`)
- Move: 위 3개 design-\* 원문 → `docs/_archive/`

**Interfaces:**

- Produces: 디자인 시스템 단일 정본. 각 Feature 세부명세 `D1-1`가 참조.

- [ ] **Step 1: DESIGN.md에 분산 문서 흡수**

`DESIGN.md`(현행 33KB) 하단에 다음 섹션을 병합하되, 이미 있는 내용과 중복은 제거한다:

- `design-guide.md`의 색상·타이포·레이아웃·공통 컴포넌트 규칙 → `## 컴포넌트 규칙`/`## 토큰`에 편입
- `design-prompt.md` → `## 디자인 생성 프롬프트/레퍼런스`(참고 자료로 부록화)
- `design-redesign-tasks.md`의 미완 항목 → `## 후속 디자인 과제`(체크리스트로 편입)
  DESIGN.md 상단에 "이 문서가 디자인 정본이며 흩어진 design-\* 문서를 통합했다" 명시.

- [ ] **Step 2: 원문 아카이브 이동**

```bash
cd BossPickSeoul/frontend
git mv docs/design-guide.md docs/_archive/
git mv docs/design-prompt.md docs/_archive/
git mv docs/design-redesign-tasks.md docs/_archive/
```

- [ ] **Step 3: 검증**

Run: `cd BossPickSeoul/frontend && grep -iE '토큰|컴포넌트|후속|프롬프트' DESIGN.md | head && ls docs/_archive/design-*.md`
Expected: DESIGN.md에 흡수 섹션 존재, design-\* 3개 아카이브됨.

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md docs/_archive
git commit -m "docs: unify design system into DESIGN.md, archive scattered design docs"
```

---

### Task 5: `_DocumentTemplates` 2계층화 (플랫폼명세 제거)

**Files:**

- Modify: `_DocumentTemplates/_template-공통명세.md`
- Modify: `_DocumentTemplates/_template-세부명세.md`
- Modify: `_DocumentTemplates/_template-테스트-케이스.md` (플랫폼 TC 항목)
- Move: `_DocumentTemplates/_template-플랫폼명세.md` → `docs/_archive/`
- Modify: `_DocumentTemplates/.order`

**Interfaces:**

- Produces: 웹 FE용 2계층 명세 템플릿. 모든 Feature 명세의 기준 형식.

- [ ] **Step 1: 세부명세 템플릿에서 플랫폼 위임 문구 정리**

`_template-세부명세.md`:

- 상단 안내에서 "플랫폼별로 달라지는 동작은 각 플랫폼 명세에서 정의… 플랫폼 명세 템플릿 참조" 문구 제거.
- `D3` 안내에 "웹 구현 설계(SSR/CSR 경계, `dynamic(...,{ssr:false})`, Next App Router 라우팅, Zustand/React Query 경계)를 여기 기술하고 `docs/engineering/*`를 참조한다" 추가.
- `D1-1` 안내의 "구체 컨트롤명·이벤트… 플랫폼 명세(P2)에 위임"을 "라우트 경로 + Figma 링크로 UI↔기능 연결만 정의"로 교정.
- `D6` 안내에 "반응형(데스크톱/모바일 웹) 차이가 큰 경우 여기 기술" 추가.

- [ ] **Step 2: 공통명세 템플릿 정리**

`_template-공통명세.md`:

- 헤더 `대상 플랫폼: Windows / Android / iOS` → `대상: 웹 (Next.js App Router)`.
- `S4` 안내의 "플랫폼별로 달라지는 동작은 플랫폼 명세에서 정의" 문구 제거.
- `S0` 표에 "as-is(legacy 동작) / to-be" 강조 주석 추가(마이그레이션 컨텍스트).

- [ ] **Step 3: 테스트케이스 템플릿에서 플랫폼 TC 제거**

`_template-테스트-케이스.md`: 플랫폼 전용 TC(`TC-{플랫폼약어}-NNN`) 관련 표/문구 제거. 공통 `TC-NNN`·세부 `TC-{접두사}-NNN`만 유지.

- [ ] **Step 4: 플랫폼명세 템플릿 아카이브 + .order 갱신**

```bash
cd BossPickSeoul/frontend
git mv _DocumentTemplates/_template-플랫폼명세.md docs/_archive/
```

`.order` 파일에 플랫폼명세 항목이 있으면 제거하고 (테스트케이스/공통/세부만 남김).

- [ ] **Step 5: 검증 — 플랫폼 참조 잔존 없음**

Run: `cd BossPickSeoul/frontend && grep -rn "플랫폼 명세\|플랫폼명세\|Windows / Android / iOS\|TC-{플랫폼" _DocumentTemplates/ || echo "OK: no platform refs"`
Expected: `OK: no platform refs` (또는 의도적으로 남긴 설명만).

- [ ] **Step 6: Commit**

```bash
git add _DocumentTemplates docs/_archive
git commit -m "docs: convert spec templates to 2-tier (drop platform layer)"
```

---

### Task 6: `frontend/CLAUDE.md` 작성 + AGENTS/agents 통폐합

**Files:**

- Create: `CLAUDE.md`
- Move: `AGENTS.md` → `docs/_archive/`
- Move: `docs/agents/*.md` (orchestrator, fe, design, review) → `docs/_archive/agents/`

**Interfaces:**

- Consumes: `AGENTS.md`(기술 기준선·금지·검증 명령), agents/\* (역할 정의).
- Produces: 얕은 작업 지도. 상세는 docs 링크 위임.

- [ ] **Step 1: `frontend/CLAUDE.md` 작성**

다음 내용으로 작성한다(설계서 §7):

```markdown
# BossPickSeoul Frontend — 작업 지도 (Claude Code)

BossPickSeoul은 NowDoBoss(사장님 상권분석) 리브랜딩 서비스다. 이 저장소의 `frontend/`는
React/Vite → Next.js App Router 마이그레이션 작업 영역이며, **작업 범위는 FE 전용**이다.

## 정본 위치 (여기부터 읽는다)

- **설계(무엇을 만드는가)**: `docs/features/` — Feature 기준 명세(공통 S0~S5 → 세부 D0~D8). 인덱스: `docs/features/_index.md`
- **디자인**: `DESIGN.md` (단일 정본)
- **횡단 기술 규칙**: `docs/engineering/` (routing / client-boundary / data-fetching / styling / code-style)
- **실행·운영**: `docs/runbook/` (migration / qa / cutover / seo)
- **명세 템플릿**: `_DocumentTemplates/` (2계층, 플랫폼명세 미사용)

## 작업 프로세스 (superpowers)

새 기능/화면은 **명세 먼저**다.

1. **brainstorming** → `docs/features/<feature>/*.md`에 한국어 명세 작성/갱신 (정본)
2. **writing-plans** → `docs/superpowers/plans/`에 실행 계획
3. **executing-plans / subagent-driven-development** → 구현 + `docs/features/_index.md` 상태 갱신
4. **code-review / systematic-debugging** → 검증·디버깅
   > 정본은 항상 한국어 Feature 명세 1곳. superpowers는 그걸 만들고 실행하는 과정이다.

## 기술 기준선

- Next.js App Router + TypeScript / pnpm / styled-components / Zustand / React Query
- Font: Pretendard (`next/font/local`) / 클라이언트 노출 env는 `NEXT_PUBLIC_*`
- 브라우저 API·chart·Kakao Map·Firebase Messaging·WebSocket → client component 또는 `dynamic(...,{ssr:false})`

## 금지사항

- API 문서 없이 임의 엔드포인트/스펙 작성 금지 → 작성자에게 문의
- 백엔드 API 계약 변경 금지
- 임의 색상·radius·shadow·spacing 토큰 추가 금지 → `DESIGN.md` 준수
- 광범위한 무관 리팩터 금지 / mock 세션을 최종본처럼 남기지 않기

## 검증 명령

완료 보고 전 실행: `pnpm qa:verify` (= `format:check && lint && typecheck && build`).
미실행 명령을 통과했다고 보고하지 않는다.
```

- [ ] **Step 2: AGENTS.md / agents 가이드 아카이브**

```bash
cd BossPickSeoul/frontend
mkdir -p docs/_archive/agents
git mv AGENTS.md docs/_archive/
git mv docs/agents/orchestrator-guide.md docs/_archive/agents/
git mv docs/agents/design-agent-guide.md docs/_archive/agents/
git mv docs/agents/review-agent-guide.md docs/_archive/agents/
git mv docs/agents/fe-agent-guide.md docs/_archive/agents/
rmdir docs/agents 2>/dev/null || true
```

- [ ] **Step 3: 검증**

Run: `cd BossPickSeoul/frontend && test -f CLAUDE.md && grep -q 'docs/features/' CLAUDE.md && grep -q 'superpowers' CLAUDE.md && echo "CLAUDE ok"; ls docs/_archive/agents/; test ! -f AGENTS.md && echo "AGENTS archived"`
Expected: `CLAUDE ok`, agents 4개 아카이브, `AGENTS archived`.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/_archive
git commit -m "docs: add shallow frontend/CLAUDE.md, consolidate agent guides into superpowers"
```

---

### Task 7: `docs/README.md` 인덱스 재작성

**Files:**

- Modify: `docs/README.md`

**Interfaces:**

- Consumes: 새 디렉터리 구조(Task 1~6 결과).
- Produces: docs 전체 진입 인덱스.

- [ ] **Step 1: README 재작성**

기존 마이그레이션 중심 인덱스를 다음 구조로 교체:

```markdown
# Frontend Docs

BossPickSeoul FE 문서 인덱스. 작업 지도는 `../CLAUDE.md`.

## 정본

- `features/` — Feature 기준 명세(정본). 시작점: `features/_index.md`
- `../DESIGN.md` — 디자인 시스템 정본
- `engineering/` — 횡단 기술 규칙 (명세가 참조)

## 보조

- `runbook/` — 실행·운영: migration / qa / cutover / seo
- `superpowers/` — specs(설계서) / plans(실행 계획)
- `_archive/` — 통폐합 전 원문 보관 (참조 전용, 정본 아님)

## 프로세스

설계·구현은 superpowers를 따른다(brainstorming → writing-plans → executing → review).
자세한 규칙은 `../CLAUDE.md` 참조.

## 명세 형식

`../_DocumentTemplates` (공통 S0~S5 → 세부 D0~D8, 2계층. 플랫폼명세 미사용).
```

- [ ] **Step 2: 검증 — 링크 대상 실재 확인**

Run: `cd BossPickSeoul/frontend/docs && for p in features/_index.md ../DESIGN.md engineering runbook superpowers _archive; do test -e "$p" && echo "ok $p" || echo "MISSING $p"; done`
Expected: 모두 `ok`.

- [ ] **Step 3: Commit**

```bash
git add docs/README.md
git commit -m "docs: rewrite README as new structure index"
```

---

### Task 8: 파일럿 명세 — `home` Feature

**Files:**

- Create: `docs/features/home/home.md` (공통명세)
- Read (source): legacy `../../NowDoBoss/FrontEnd/src/{pages/MainPage.tsx,components/main,containers/main}`, 신규 `app/(shell)/page.tsx`, `_DocumentTemplates/_template-공통명세.md`
- Delete: `docs/features/home/.gitkeep`

**Interfaces:**

- Consumes: 공통명세 템플릿(2계층화된 것, Task 5).
- Produces: 명세 형식·경로 규칙의 레퍼런스 구현. 나머지 Feature가 이를 본뜬다.

- [ ] **Step 1: legacy home 동작 조사**

Run: `cd /Users/seonghoho/Documents/projects/nowdoboss && ls NowDoBoss/FrontEnd/src/components/main NowDoBoss/FrontEnd/src/containers/main && sed -n '1,80p' NowDoBoss/FrontEnd/src/pages/MainPage.tsx`
목적: home의 섹션 구성·진입 동작을 파악해 `S0` as-is에 기록.

- [ ] **Step 2: `home.md` 공통명세 작성**

`_template-공통명세.md` 형식으로 작성한다. 필수 채움:

- `S0`: 요청 배경 = 리브랜딩+Next 이관 / as-is = legacy MainPage 동작(Step 1 조사 결과 요약) / to-be = 동작 보존한 App Router 이관 / 제외 범위 = 리디자인.
- `S1`: home의 목적 1~3문장 + 처리 흐름 한 줄.
- `S2`: 공통 요구사항(예: 랜딩 섹션 렌더, 주요 CTA 라우팅, 반응형).
- `S3`: 필수 기능 목록(섹션별). 세부명세가 필요하면 `[세부 명세](./<sub>.md)`로 링크(현재는 없으면 "미작성"으로 표기).
- `S5`: 공통 TC 1개 이상(`TC-001`: 홈 진입 시 주요 섹션·CTA 렌더).
- 마이그레이션 링크: legacy source 파일 경로, target `app/(shell)/page.tsx` 명시.

```bash
cd BossPickSeoul/frontend && rm docs/features/home/.gitkeep
```

- [ ] **Step 3: 검증 — 템플릿 섹션 충족**

Run: `cd BossPickSeoul/frontend && grep -E '^## S[0-5]' docs/features/home/home.md`
Expected: `S0`~`S5` 섹션 헤더 존재(최소 S0,S1,S2,S3,S5).

- [ ] **Step 4: \_index 상태 갱신**

`docs/features/_index.md`의 home 행 상태를 `🟩 명세 완료`로 갱신.

- [ ] **Step 5: Commit**

```bash
git add docs/features/home docs/features/_index.md
git commit -m "docs(spec): add home feature common spec (pilot)"
```

---

### Task 9: 최종 정합성 검증 & 파일럿 회고

**Files:**

- Modify: 설계서 §11 미결 사항(파일럿 결과 반영), `docs/features/_index.md`(필요 시)

**Interfaces:**

- Consumes: Task 1~8 전체 결과.
- Produces: 성공 기준 충족 확인 + 세부명세 분할 기준 결정 기록.

- [ ] **Step 1: 성공 기준 체크 (설계서 §10)**

Run:

```bash
cd BossPickSeoul/frontend
test -f CLAUDE.md && echo "1 CLAUDE ok"
test -f docs/features/_index.md && ls docs/features && echo "2 features ok"
grep -rL "플랫폼 명세" _DocumentTemplates/*.md >/dev/null && echo "3 templates 2-tier"
ls docs/runbook && test -f DESIGN.md && echo "4 consolidation ok"
test -f docs/README.md && echo "5 readme ok"
grep -q superpowers CLAUDE.md && echo "6 process rule ok"
```

Expected: 6개 항목 모두 출력.

- [ ] **Step 2: 아카이브 안전망 확인 — 정본에서 archive 역참조 없음**

Run: `cd BossPickSeoul/frontend && grep -rn "_archive/" docs/features docs/runbook docs/engineering CLAUDE.md DESIGN.md docs/README.md || echo "OK: no dangling archive refs"`
Expected: `OK: no dangling archive refs` (아카이브는 참조 전용, 정본이 의존하지 않음).

- [ ] **Step 3: 링크 무결성 스팟체크**

Run: `cd BossPickSeoul/frontend && grep -rn '](\./' docs/features/_index.md docs/README.md`
Expected: 상대링크 경로가 실제 파일/폴더와 일치(육안 확인).

- [ ] **Step 4: 파일럿 회고 반영**

설계서 §11 미결 사항 갱신: home 명세 작성 경험을 근거로 (1) 플랫폼명세 처리 결과, (2) 세부명세 분할 단위(라우트별/하위기능별) 결정, (3) plans 경로 확정을 기록. 필요 시 CLAUDE.md/템플릿 미세 조정.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: finalize restructure, record pilot decisions"
```

---

## Self-Review

**Spec coverage:**

- §2 정본 지도 → Task 6(CLAUDE 위치맵), Task 7(README)
- §3 디렉터리 구조 → Task 1
- §4 2계층 명세 규격 → Task 5(템플릿), Task 8(적용)
- §5 Feature 경계·라우트 매핑 → Task 2(\_index)
- §6 superpowers 공존 규칙 → Task 6(CLAUDE 프로세스 절)
- §7 CLAUDE.md 구성 → Task 6
- §8 기존 docs 매핑 → Task 3(runbook), Task 4(DESIGN), Task 6(agents/AGENTS)
- §9 이관 순서·파일럿 → Task 8(home)
- §10 성공 기준 → Task 9
- §11 미결 → Task 9 Step 4
  → 갭 없음.

**Placeholder scan:** 문서 태스크 특성상 "본문 병합"을 지시하되, 각 태스크에 병합 대상·섹션 구조·필수 내용·검증 명령을 명시함. CLAUDE.md/README/\_index는 근사 완성본 제공. "TBD/TODO/나중에" 없음.

**Type consistency:** 파일 경로·디렉터리명이 태스크 간 일관(`docs/features/`, `docs/runbook/{migration,qa,cutover,seo}.md`, `docs/_archive/`, `CLAUDE.md`). 검증 명령의 대상 경로가 생성 경로와 일치.
