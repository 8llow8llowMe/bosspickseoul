# 히어로 좌우 분할 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** ≥900px 에서 히어로 카드와 지도를 좌우 두 칸으로 나눠 카드가 지도를 가리지 않게 하고, 창 장식은 숨긴다(되돌리기 쉽게).

**Architecture:** 분할 기준 `HERO_STACKED_MEDIA` 를 `layout-constants.ts` 에 두고 `hero-section.tsx`(그리드·흐름 배치)와 `seoul-districts-map.tsx`(지도 높이·캡션)가 공유한다. `HeroWindow` 의 `chrome` prop 이 제목줄을 끄고, `HERO_WINDOW_CHROME` 상수가 드래그·장식을 한 번에 켜고 끈다.

**Tech Stack:** Next.js App Router · styled-components · vitest(node) · Playwright

**Spec:** `frontend/docs/features/home/hero-split-layout.md`

## Global Constraints

- 새 토큰·색·radius 금지. 동작 기준(640px)은 바꾸지 않는다 — 배치 기준만 899px.
- 창 장식 코드(`use-window-drag.ts`·`window-display.ts`·독·신호등)는 지우지 않는다.
- 커밋 `[FE] <type>: …` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. 641~899px 에서 카드·지도가 겹치지 않고 위아래로 쌓인다(오버레이 잔재 없음).
2. 장식을 숨긴 뒤 접기·닫기 상태로 들어갈 길이 없다(키보드 포함) — 독 버튼이 나오지 않는다.
3. ≥900px 에서 지도 칸 높이가 0 이 되지 않는다(그리드 행 높이 · `min-height: 0`).
4. 모바일(≤640) 첫 화면 수치가 그대로다.
5. 자동 시연이 분할 배치에서 지도 칸 안에 뜬다.

---

### Task 1: 창 장식 숨김

**Files:** Modify `src/components/home/hero-window.tsx`, `src/components/home/hero-section.tsx`, `src/components/home/home-page.test.ts`

- [ ] **Step 1: 실패하는 테스트** — `home-page.test.ts` 에 「창 장식(제목줄·조작 그룹)을 렌더하지 않는다」: `text` 에 `서울 상권 데이터 분석` 없음, `html` 에 `aria-label="분석 창 조작"` 없음. Run `pnpm vitest run src/components/home/home-page.test.ts` → FAIL.
- [ ] **Step 2: 구현** — `HeroWindowProps.chrome: boolean`. `chrome` 이 false 면 `<TitleBar>` 를 렌더하지 않고 `WindowBodyInner` 에 `$chromeless` 로 위 패딩 40px(≤640 24px). `layout-constants.ts` 에 `export const HERO_WINDOW_CHROME = false` (주석: 시험 적용, D4-2). `HeroSection` 은 `chrome={HERO_WINDOW_CHROME}`, `useWindowDrag({ enabled: HERO_WINDOW_CHROME && dragEnabled, … })`.
- [ ] **Step 3:** Run vitest home → PASS, `tsc --noEmit` → 통과.

### Task 2: 좌우 분할 · 641~899 위아래

**Files:** Modify `src/components/home/layout-constants.ts`, `hero-section.tsx`, `seoul-districts-map.tsx`

- [ ] **Step 1:** `layout-constants.ts` 에 `export const HERO_STACKED_MEDIA = '(max-width: 899px)'`.
- [ ] **Step 2:** `hero-section.tsx` — `Hero`·`Inner`·`HeroStage`·`MapScreen`·`MapLayer`·`CardLayer` 의 **배치** 미디어쿼리를 `@media ${HERO_STACKED_MEDIA}` 로 바꾼다(`Hero` 의 `padding-bottom: 24px` 같은 표현은 640 유지). `HeroStage` 기본을 `display: grid; grid-template-columns: minmax(360px, 460px) minmax(0, 1fr); column-gap: 48px; align-items: center;`, 스택 폭에서 `display: flex; flex-direction: column`. `CardLayer` 기본을 흐름 배치(`position: static`, `display: flex`, `justify-content: center`)로, `MapLayer` 기본 `height: 100%; min-height: 0`.
- [ ] **Step 3:** `seoul-districts-map.tsx` — `MapSvg` aspect-ratio 와 `MapCaption` static 규칙을 `HERO_STACKED_MEDIA` 로. `DesktopOnly`/`MobileOnly` 문구 분기는 640 유지.
- [ ] **Step 4:** `HeroSection` 에서 `demoAvoidRight` 를 넘기지 않는다(주석: 오버레이로 되돌리면 다시 넘긴다).
- [ ] **Step 5:** vitest home · tsc · eslint 통과. Commit.

### Task 3: 검증 · 문서

- [ ] e2e 데스크톱 호버 대상을 **강남구**로 되돌린다. `qa:verify` → dev(5173) → `test:e2e e2e/home` → `UPDATE_HOME_BASELINE=1` 로 기준선 갱신.
- [ ] 실측(browse): 1440×900·1024×768 카드 영역 안 자치구 중심점 0 · 800×700 위아래 · 375×812 수치 유지 · 시연 툴팁 위치.
- [ ] 명세 상태·실측 반영, `_index.md` home 행 한 문장. Commit → push → PR(base `develop`, #505 위에 쌓였음을 본문에 명시).
