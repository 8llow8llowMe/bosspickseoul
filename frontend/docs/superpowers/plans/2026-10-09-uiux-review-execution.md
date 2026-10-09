# UI/UX 진단 후속 이슈 실행 계획 (#554~#606)

> **작성일**: 2026-10-09
> **근거**: UI/UX·사용성 진단서 `docs/reports/2026-10-09-uiux-usability-review.html`(63건, 모바일 375 · 데스크톱 1440 실측) — 공유본 https://claude.ai/artifact/6nMTaRMdi5YGhDL6t1pQL7
> **대상**: FE 이슈 49건(#554~#591, #596~#606 중 FE) · BE 계약 요청 4건(#592~#595, 이 계획에서 구현하지 않음)
> **역할·모델 정본**: [`docs/claude-agents.md`](../../../../docs/claude-agents.md) · Codex 는 [`docs/codex-agents.md`](../../../../docs/codex-agents.md). 이 문서는 그 규칙을 이번 이슈 묶음에 **적용한 결과**만 적는다.

---

## 0. 이 계획을 읽는 법

- 이슈 49건을 **배치 21개(B1~B21)** 로 묶었다. 배치 하나 = **쓰기 하위 에이전트 한 번 + PR 하나**다. 커밋은 이슈마다 나눈다(`[FE] fix: … (#556)`).
- 배치는 **고치는 파일이 겹치지 않도록** 나눴다. 같은 파일을 고치는 배치는 순서를 지킨다(§3).
- 각 배치에 **역할과 모델**을 적었다. 호출할 때 `model` 을 덮어쓰지 않는다 — `subagent_type` 이 `.claude/agents/*.md` 의 모델을 붙인다.
- **결정이 필요한 배치**(§4)는 메인이 사용자에게 먼저 묻고 시작한다. 하위 에이전트에게 결정을 넘기지 않는다.
- 이슈 본문의 `파일:줄` 은 2026-10-09 기준이다. 착수할 때 줄 번호가 밀렸을 수 있으니 `explorer` 로 한 번 확인한다.

## 1. 역할·모델 배정 원칙 (이번 묶음 기준)

| 작업 성격                                                | 역할               | 모델      | 예                                                                           |
| -------------------------------------------------------- | ------------------ | --------- | ---------------------------------------------------------------------------- |
| 착수 전 위치 확인, 줄 번호 재확인, 영향 범위             | `explorer`         | Sonnet    | 모든 배치의 0단계(필요할 때만)                                               |
| 토큰 교체·크기·문구·단순 컴포넌트 추가·작은 테스트       | `crud-implementer` | Sonnet    | B1 대비, B2 터치·글꼴, B3 문구, B4 404, B9 구별현황, B11 별칭, B20의 차트 표 |
| 상태·흐름·라우팅·데이터 표시 로직 변경                   | `implementer`      | Opus      | B5~~B8, B10, B13~~B17, B19                                                   |
| 여러 화면에 걸친 동작 보존 정리                          | `refactorer`       | Opus      | B18 버튼·토스트 공용화                                                       |
| 완료된 diff 검토(정확성·회귀·접근성·DESIGN.md 위반)      | `reviewer`         | Opus      | 모든 배치의 마지막 단계                                                      |
| 설계·제품 결정(색 규칙, 저장 시트 형태, 추천 범위 UI 등) | **메인 세션**      | 세션 모델 | §4 결정 목록. 세션이 Opus 이하이고 구조 설계가 크면 `architect`(Fable)       |

- **세션 모델이 Fable 이면** 계획·결정·통합은 메인이 하고, 위 표의 하위 에이전트만 부른다(`architect` 를 따로 부르지 않는다).
- **테스트는 구현자가 같이 쓴다.** 동작을 바꾼 배치는 vitest 단위 테스트를 추가·갱신하고, 흐름을 바꾼 배치(B6·B10·B13·B15)는 Playwright e2e 를 추가할지 메인이 정한다.
- **검증은 메인이 다시 돈다.** 하위 에이전트가 통과를 보고해도 메인이 `pnpm qa:verify` 와 대상 vitest 를 한 번 더 실행한다(§5).
- **BE 코드는 고치지 않는다.** #592~#595 는 BE 담당 세션이 `be-executor` → `be-*-reviewer` 로 처리한다. FE 배치는 BE 반영 전 임시안까지만 한다.

## 2. 배치 목록

표기: **역할(모델)** · 이슈 · 주요 파일(`frontend/` 기준) · 테스트

### 1단계 — 토큰·크기·문구 (위험 낮음, Sonnet 중심)

| 배치                    | 이슈                          | 구현                                                                                     | 검토             | 주요 파일                                                                                                                                                                                                                                                                                                                                               | 테스트·확인                                                                                                |
| ----------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **B1 대비 토큰**        | #556, #585                    | `crud-implementer`(Sonnet)                                                               | `reviewer`(Opus) | `home/hero-window.tsx`, `layout/site-header.tsx`, `auth/auth-shell.tsx`, `auth/register-form.tsx`, `home/feature-bento.tsx`, `analysis/analysis-summary-cards.tsx`, `analysis/analysis-result-view.tsx`(색만), `recommend/recommend-condition-bar.tsx`, `styles/global-styles.test.ts`, `DESIGN.md`                                                     | 글자에 `--color-primary-700` 을 쓰면 막는 소스 스캔 가드 추가. 대비는 토큰 hex 로 계산해 PR 에 표로 남긴다 |
| **B2 모바일 터치·글꼴** | #557, #558                    | `crud-implementer`(Sonnet)                                                               | `reviewer`(Opus) | `analysis/analysis-result-view.tsx`(탭), `analysis/analysis-period-select.tsx`, `analysis/analysis-mobile-sheet.tsx`, `recommend/recommend-condition-picker.tsx`, `ui/toast.tsx`(크기만), `auth/login-form.tsx`, `auth/register-form.tsx`, `ui/text-field.tsx`, `simulation/compare/simulation-condition-compact-editor.tsx`, `styles/global-styles.ts` | Playwright 375px 에서 44px 미만 대상 수를 세어 0 확인. `maximum-scale` 금지                                |
| **B3 문구**             | #559, #597 의 임시 문구 1항목 | `crud-implementer`(Sonnet)                                                               | `reviewer`(Opus) | `auth/login-form.tsx`, `home/feature-bento.tsx`, `profile/*bookmarks*`, `analysis/analysis-selection-panel.tsx`(안내 문구), `recommend/recommend-panel.tsx`, 「어디가 좋을지 모르겠다면」 링크 2곳, 영어 aria-label                                                                                                                                     | 문자열 테스트 갱신. 카피 규칙: 주어·목적어 생략 금지                                                       |
| **B4 오류 화면**        | #555                          | `crud-implementer`(Sonnet) — Next 16 문서(`node_modules/next/dist/docs/`) 먼저 읽기 지시 | `reviewer`(Opus) | `app/not-found.tsx`, `app/(shell)/error.tsx`, `app/global-error.tsx`                                                                                                                                                                                                                                                                                    | dev 서버에서 `/nope-xyz` 가 404 상태 + 한국어 화면인지 curl·스크린샷                                       |

### 2단계 — 신뢰 숫자와 상권분석 (Opus)

| 배치                  | 이슈                   | 구현                                                                            | 검토             | 주요 파일                                                                                                                                                                                                                          | 테스트·확인                                                                                                                                       |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B5 신뢰 숫자**      | #561, #554, #589       | `implementer`(Opus)                                                             | `reviewer`(Opus) | `analysis/analysis-result-view.tsx`(요약), `analysis/analysis-summary-cards.tsx`, `simulation/simulation-result-preview.tsx`, `simulation/report/*`(문장 상수 공유)                                                                | 점포당 값 계산·0점포·결측 단위 테스트. 375·1440 스크린샷                                                                                          |
| **B6 분석 선택 흐름** | #562, #587, #591, #586 | `implementer`(Opus)                                                             | `reviewer`(Opus) | `analysis/analysis-map-shell.tsx`, `lib/analysis/selection.ts`, `analysis/analysis-mobile-sheet.tsx`, `analysis/analysis-selection-panel.tsx`, `analysis/ai-report/ai-report-lock-card.tsx`, `docs/features/analysis/map-shell.md` | push/replace 규칙 단위 테스트, 뒤로가기 e2e 검토. 지도 화면은 pane 이 숨겨지면 안 뜨므로 헤드리스 Playwright 로 확인(메모리 「FE dev 서버 함정」) |
| **B7 결과 행동·용어** | #563, #564             | `implementer`(Opus)                                                             | `reviewer`(Opus) | `analysis/analysis-result-view.tsx`(액션), `lib/analysis/presentation.ts`, 저장 시트 신규                                                                                                                                          | **§4 결정 D-2 먼저.** 저장 시트 포커스 가두기·ESC 테스트                                                                                          |
| **B8 분석 이름 검색** | #596                   | `explorer`(Sonnet)로 카카오 services 라이브러리 로딩 확인 → `implementer`(Opus) | `reviewer`(Opus) | `analysis/analysis-selection-panel.tsx`, `lib/map/geometry.ts`, `lib/kakao-map.ts`                                                                                                                                                 | 콤보박스 키보드 테스트, 좌표→상권 매핑 단위 테스트. BE #592 반영 시 교체 지점 주석                                                                |

### 3단계 — 추천·시뮬레이션·화면 연결 (Opus)

| 배치                    | 이슈                   | 구현                                                | 검토             | 주요 파일                                                                                                                                                                                       | 테스트·확인                                                                     |
| ----------------------- | ---------------------- | --------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **B9 구별현황**         | #560, #565             | `crud-implementer`(Sonnet)                          | `reviewer`(Opus) | `status/status-top-ten.tsx`, `status/*`, `docs/features/status/status.md`, `DESIGN.md`                                                                                                          | **§4 결정 D-1 먼저.** 25개 펼침 상태 테스트                                     |
| **B10 추천 조건·결과**  | #569, #570             | `implementer`(Opus)                                 | `reviewer`(Opus) | `lib/recommend/recommend-state.ts`, `recommend/recommend-page.tsx`, `recommend/recommend-panel.tsx`, `recommend/recommend-result-list.tsx`, `ui/score-gauge.tsx`                                | 상태 머신 테스트(조건 수정 시 결과 유지), 375×667·390×844 첫 화면 카드 수 실측  |
| **B11 업종 별칭 검색**  | #571                   | `crud-implementer`(Sonnet)                          | `reviewer`(Opus) | `lib/option-filter.ts`, `simulation/simulation-service-picker.tsx`, 분석 업종 검색                                                                                                              | 별칭 매칭 테이블 테스트                                                         |
| **B12 추천 범위**       | #597(임시 문구 제외)   | `implementer`(Opus)                                 | `reviewer`(Opus) | `recommend/*`, `lib/recommend/*`, `docs/features/recommend/*`                                                                                                                                   | **BE #593 머지 후 착수.** §4 결정 D-4                                           |
| **B13 시뮬레이션 흐름** | #567, #568, #604, #605 | `implementer`(Opus)                                 | `reviewer`(Opus) | `simulation/simulation-builder-page.tsx`, `simulation/simulation-compare-page.tsx`, `simulation/simulation-bottom-bar.tsx`, `lib/simulation/*`, `docs/features/simulation/simulation-report.md` | URL 복원·자동 계산 중복 요청 방지 테스트. §4 결정 D-3                           |
| **B14 화면 연결·공유**  | #566, #573, #572, #598 | `implementer`(Opus) — Next 16 metadata·OG 문서 먼저 | `reviewer`(Opus) | `recommend/recommend-result-list.tsx`, `recommend/compare/*`, `simulation/report/*`, `app/(shell)/s/[shareCode]/*`, `share/share-entry-page.tsx`                                                | 서버 redirect·metadata 단위 테스트, 카카오톡 미리보기는 dev 배포 후 실기기 확인 |

### 4단계 — 계정·참여 (Opus, 서로 파일이 겹치지 않아 병렬 가능)

| 배치                      | 이슈                   | 구현                                                            | 검토                                                        | 주요 파일                                                                                                                                                                             | 테스트·확인                                                               |
| ------------------------- | ---------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **B15 인증**              | #576, #577, #578, #579 | `implementer`(Opus)                                             | `reviewer`(Opus) — redirect·세션 분기가 있어 보안 관점 함께 | `auth/*`, `stores/auth-store.ts`, `app/(auth)/*`, `layout/site-header.tsx`(스켈레톤), `DESIGN.md`(카카오 예외)                                                                        | `safeReturnPath` 회귀 테스트, 가입→로그인 e2e. §4 결정 D-5                |
| **B16 프로필·북마크**     | #574, #575, #606, #583 | `implementer`(Opus)                                             | `reviewer`(Opus)                                            | `profile/*`, `app/(shell)/profile/*`, `ui/text-field.tsx`(password 모드)                                                                                                              | 되돌리기 토스트·딥링크 테스트. §4 결정 D-6                                |
| **B17 커뮤니티 상호작용** | #580, #581, #590       | `implementer`(Opus)                                             | `reviewer`(Opus)                                            | `community/community-detail-page.tsx`, `community/community-comment-thread.tsx`, `community/community-detail-*`, `community/community-list-rail.tsx`, `community/community-sheet.tsx` | 낙관적 갱신·롤백 테스트, 기존 커뮤니티 e2e(`pnpm test:e2e`) 통과          |
| **B18 공용 UI 정리**      | #582, #584             | `explorer`(Sonnet)로 로컬 버튼 68개 목록화 → `refactorer`(Opus) | `reviewer`(Opus)                                            | `ui/button.tsx`, `ui/toast.tsx`, `community/*`, `chatting/*`, `profile/*`                                                                                                             | **B16·B17 머지 후.** 버튼 높이 4종 가드 테스트, 토스트 live region 테스트 |

### 5단계 — 홈·접근성·보류

| 배치                     | 이슈             | 구현                                                                      | 검토             | 주요 파일                                                                                                                      | 테스트·확인                                                                                 |
| ------------------------ | ---------------- | ------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **B19 홈**               | #588, #600, #601 | `implementer`(Opus)                                                       | `reviewer`(Opus) | `home/seoul-districts-map.tsx`, `home/popular-districts.tsx`, `recommend/recommend-live-popular.tsx`, `layout/site-header.tsx` | 5분위 재사용 테스트. 홈은 스크롤 리빌 때문에 스크린샷이 비므로 계산값으로 확인. §4 결정 D-7 |
| **B20 지도·차트 접근성** | #602, #603       | #603 `crud-implementer`(Sonnet), #602 `implementer`(Opus) — 커밋은 나눈다 | `reviewer`(Opus) | `charts/*`, `lib/map/draw-area-label-layer.ts`                                                                                 | 숨긴 표 렌더 테스트. 지도 라벨은 헤드리스 스크린샷 비교                                     |
| **B21 채팅 출시 게이트** | #599             | 보류                                                                      | —                | `chatting/*`                                                                                                                   | 채팅 공개 일정이 정해지면 착수                                                              |

### FE 범위 밖 (BE 세션)

| 이슈 | 내용                     | FE 짝     |
| ---- | ------------------------ | --------- |
| #592 | 상권·역·동 이름 검색 API | #596(B8)  |
| #593 | 자치구·서울 범위 추천    | #597(B12) |
| #594 | 댓글 `liked`             | #580(B17) |
| #595 | 가입 직후 로그인         | #576(B15) |

BE 는 `backend/CLAUDE.md` 와 `backend-multi-agent` 흐름(`be-executor` Opus → `be-hexagonal-reviewer`·`be-db-reviewer`·보안 변경이면 `be-security-reviewer`)을 따른다.

## 3. 순서와 병렬화

```
1단계  B1 ─▶ B2 ─▶ B3            (같은 파일: register-form, site-header, feature-bento, analysis-result-view)
       B4 · B11                   (파일 독립 — B1 과 다른 worktree 에서 병렬 가능)
2단계  B5 ─▶ B6 ─▶ B7 ─▶ B8       (analysis-result-view · selection-panel 공유)
3단계  B9 (독립)   B10 ─▶ B14 ◀─ B13      B12 는 BE #593 이후
4단계  B15 · B16 · B17 병렬 ─▶ B18
5단계  B19 (B1·B3 이후) · B20 (독립) · B21 보류
```

- **쓰기 배치를 같은 worktree 에서 동시에 돌리지 않는다.** 병렬로 돌릴 때는 `Agent` 의 `isolation: "worktree"` 로 배치마다 작업 사본을 나누고, 위 그래프에서 파일이 겹치지 않는 배치만 고른다. 동시 쓰기 배치는 2개까지로 한다.
- 읽기 역할(`explorer`·`reviewer`)은 한 메시지 안에서 2~3개까지 병렬로 부른다.
- 같은 단계 안의 화살표는 **앞 배치 PR 이 develop 에 머지된 뒤** 다음 배치를 develop 에서 새로 딴다. 스택 PR 이 필요하면 base 는 develop 으로 두고 rebase 한다(`frontend/CLAUDE.md` PR 규약).

## 4. 착수 전 사용자 결정 목록

| 결정                             | 관련 배치·이슈  | 선택지                                                                       |
| -------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| D-1 증감 색 규칙                 | B9 · #560       | 구별현황도 증감 무채색(분석과 통일) / 분석도 빨강·초록 허용                  |
| D-2 저장 통합 형태               | B7 · #563       | 「저장」 하나 + 시트에서 분석 화면·관심 상권 선택 / 라벨만 바꿔 두 버튼 유지 |
| D-3 비교 B 시작값                | B13 · #567      | A 복사(명세 변경) / 빈 편집기 유지                                           |
| D-4 추천 범위 UI                 | B12 · #597      | 업종 먼저 + 범위 칩 3개 / 기존 순서 유지 + 「행정동 모름」 옵션              |
| D-5 카카오 브랜드 색 예외        | B15 · #577      | DESIGN.md 에 외부 브랜드 예외 절 추가 여부                                   |
| D-6 탈퇴 위치                    | B16 · #575      | 회원 정보 맨 아래 링크 / 탭 유지 + danger 버튼만                             |
| D-7 홈 지도 기본 지표·하단 탭 바 | B19 · #588 #601 | 유동인구 기본 / 실험 플래그로 하단 탭 시도 여부                              |

## 5. 배치마다 같은 진행 절차

1. **(필요할 때) `explorer`(Sonnet)** — 이슈 본문의 `파일:줄` 이 아직 맞는지, 영향 파일 목록 확인.
2. **명세 먼저** — 동작이 바뀌면 구현자가 `docs/features/<feature>/*.md` 를 같이 고친다(`frontend/CLAUDE.md` 작업 프로세스).
3. **구현자(위 표의 역할)** — 이슈 체크리스트를 구현하고 vitest 를 추가·갱신. 하위 에이전트는 다시 하위 에이전트를 부르지 않는다.
4. **메인 검증** — `pnpm qa:verify` + `pnpm vitest run <바뀐 테스트>`. 화면 변화가 있으면 dev 서버(5173)에서 375·1440 확인. pane 이 숨겨지면 헤드리스 Playwright(`@playwright/test` 의 chromium)로 캡처한다.
5. **`reviewer`(Opus)** — diff 를 정확성·회귀·접근성·DESIGN.md 토큰 위반 관점으로 검토. 근거 없는 지적은 메인이 확인 후 반영.
6. **커밋·PR** — 이슈마다 커밋 `[FE] <type>: <제목> (#번호)`, 배치마다 PR 하나. `--assignee seonghoho --label frontend-web`, base `develop`, 본문에 `Closes #…`.
7. **진단서 지표 확인** — PR 본문에 진단서의 「현재 → 개선 후」 수치를 실측으로 다시 적는다(예: 대비 2.47 → 5.26, 44px 미만 0).

### 하위 에이전트 호출 프롬프트 틀

```
[배치 Bn] 이슈 #___, #___ 를 구현한다. 작업 디렉터리: <worktree>/frontend
- 먼저 읽을 것: frontend/CLAUDE.md, DESIGN.md 의 관련 절, 각 이슈 본문(gh issue view <번호>)
- 고칠 파일 범위: <§2 주요 파일>. 범위 밖 리팩터 금지, 새 토큰 추가 금지
- 결정 사항: <§4 에서 사용자가 고른 값>
- 테스트: <§2 테스트·확인>. 실행한 명령과 결과를 그대로 보고
- 하지 말 것: 커밋·푸시·PR, 다른 하위 에이전트 호출, BE 코드 수정
- 보고: 바뀐 파일 목록, 이슈 체크리스트별 완료 여부, 남은 위험
```

## 6. 진행 현황

| 배치   | 상태 | PR  |
| ------ | ---- | --- |
| B1~B21 | 대기 | —   |

배치를 끝낼 때마다 이 표를 갱신하고, 세션을 넘길 때는 `/context-handoff` 로 `docs/handoffs/` 에 인계를 남긴다.
