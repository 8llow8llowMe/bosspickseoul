# home Feature — 작업 완료 핸드오프

> **작성일**: 2026-07-22
> **완료일**: 2026-07-28
> **대상 실행자**: codex
> **브랜치**: `feature/fe/home` (develop `78a1b7b` 기반, auth #50 머지 반영됨)
> **관련 명세(정본)**: [home 공통명세](./home.md)

이 문서는 home Feature의 **① 결정 결과 ② 최종 구현 상태 ③ 검증 결과**를 정리한 완료 핸드오프다. home은 큰 신규 구현 없이 기존 정적 랜딩의 범위와 링크를 확정하고 문서·브라우저 검증을 완료했다.

---

## 0. codex가 먼저 읽어야 할 것

> ⚠️ 이 저장소는 Codex용 `AGENTS.md`를 `docs/_archive/`로 통폐합했다. 작업 지도는 **`frontend/CLAUDE.md`** 에 있으니 이것부터 읽는다.

| 목적                                      | 파일                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| 작업 지도(정본 위치·프로세스·기술선·금지) | `frontend/CLAUDE.md`                                                         |
| home 설계 정본                            | `frontend/docs/features/home/home.md`                                        |
| 디자인 시스템 정본                        | `frontend/DESIGN.md`                                                         |
| 횡단 규칙                                 | `frontend/docs/engineering/` (routing/client-boundary/data-fetching/styling) |
| 데이터 페칭 = **BFF(S2S) 표준**           | `frontend/docs/engineering/data-fetching-rules.md`                           |
| Feature 이관 상태·라우트 매핑             | `frontend/docs/features/_index.md`                                           |
| 명세 템플릿(2계층)                        | `frontend/_DocumentTemplates/`                                               |

**절대 규칙:** 백엔드 API 계약 변경 금지. API 문서(Swagger) 없이 임의 엔드포인트/스펙 작성 금지 → 작성자에게 문의. 임의 색상/토큰 추가 금지(DESIGN.md 준수). 커밋 컨벤션 `[FE] ...`.

---

## 1. 전체 프로젝트 진행상황

React/Vite(NowDoBoss) → Next.js App Router(BossPickSeoul) 마이그레이션. 문서·설계 체계를 Feature 기준 명세(정본) + superpowers 프로세스로 재편 완료.

**Feature별 상태 (`docs/features/_index.md` 기준):**

| Feature                                                               | 명세        | 구현                   | 비고                                                                                                                  |
| --------------------------------------------------------------------- | ----------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **auth**                                                              | ✅          | ✅ (정적검증)          | BFF 세션 구현·develop 머지(#50). **런타임(실 백엔드) 미검증.** 소셜로그인·2단계가입·세션TTL·에러코드 미결(BE 선행)    |
| **home**                                                              | ✅ 공통명세 | ✅ 정적 랜딩 검증 완료 | Top 10·지도는 status 소유. status·simulation CTA 포함                                                                 |
| status·recommend·analysis·simulation·community·chatting·profile·share | ❌          | ❌ 미착수              | 기존 화면 잔존하나 **구 백엔드 계약**에 묶여 있어 신규 백엔드와 미검증(일부는 확실히 깨짐, 예: profile `/member/get`) |

**핵심 인프라(auth에서 확립, home도 그 위에서 동작):**

- 모든 브라우저→백엔드 호출은 **BFF 프록시 `/api/bff/[...path]`** 경유. 프록시가 `/api/v1` 프리픽스 자동 부가 + 세션 토큰 Bearer 주입 + 401 재발급.
- 토큰은 브라우저에 없음(암호화 HttpOnly 세션 쿠키). `apiClient`(baseURL `/api/bff`)로 호출하면 인증이 자동 처리됨.
- 미들웨어가 보호 라우트 가드. **단, `/`(home)은 공개 라우트로 가드 대상이 아님**(`middleware.ts`의 PROTECTED에 미포함) — 미로그인도 접근 가능해야 함.

**이관 순서:** 공통 인프라 → home/auth → status/recommend → analysis/simulation → community → profile → chatting. (auth 완료, 다음이 home)

---

## 2. home 현재 상태

### 2-1. 구현 현황

- 진입점 `app/(shell)/page.tsx` → `src/components/home/home-page.tsx` 렌더. metadata(`createPageMetadata`, `index:true`) 설정됨. **빌드 통과(정적 검증됨).**
- `home-page.tsx`는 **완전 정적 랜딩 페이지**(리디자인): Hero(카피+CTA) / Quick-action 카드 / Workflow 4단계 / Services 카드 / Metrics. **데이터 페칭·상태·이펙트 없음**(순수 프리젠테이션 + `next/link`).
- 현재 CTA/링크: `/status`, `/analysis`, `/recommend`, `/simulation`, `/community/list`, `/chatting/list`, `/register`.

### 2-2. 레거시(as-is)와의 갭 — home.md S0 참조

레거시 `MainContainer`는 5개 섹션(Intro/Status/Analysis/Recommend/More)을 스크롤 애니메이션(IntersectionObserver)과 함께 렌더했고, **유일한 동적 요소**는 Status 섹션의 **유동인구 Top-10 리스트(React Query `fetchTopList`) + 서울시 구 d3 지도**였다. 리디자인은 이 **동적 데이터 섹션(Top-10·지도)과 스크롤 애니메이션을 제거**하고 정적 랜딩으로 재구성했다.

### 2-3. 정합성 이슈 처리 결과

1. `home-page.tsx`는 상태·effect가 없는 서버 컴포넌트로 유지했다. 데스크톱·모바일 브라우저에서 hydration 오류와 스타일 누락이 없음을 확인했다.
2. metadata, 홈 카피, 공통 헤더·푸터, `siteConfig`의 사용자 노출 브랜드를 **BossPickSeoul**로 통일했다.
3. Quick actions에 **시뮬레이션·구별현황(status) CTA**를 추가했다.
4. 모든 CTA 경로가 `_index.md` 라우트 매핑과 일치한다. 보호 라우트 `/status`는 미로그인 시 `/login?redirect=%2Fstatus`로 이동한다.

---

## 3. 완료된 결정

| #   | 결정                                                                                             | 결과                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| D1  | **home을 정적 랜딩으로 확정**할 것인가, 레거시의 **Top-10 유동인구 동적 섹션을 재도입**할 것인가 | **정적 랜딩 확정.** Top 10·지도·IntersectionObserver는 홈에 재도입하지 않고 `/status`에서 관리한다.                  |
| D2  | 시뮬레이션·status로 가는 CTA를 home에 추가할지                                                   | **추가.** Quick actions에서 `/status`, `/analysis`, `/recommend`, `/simulation`을 동일한 수준의 진입점으로 제공한다. |

---

## 4. home 완료 체크리스트

> 전제: D1 = (a) 정적 확정 기준. (b) 선택 시 T-DATA 태스크 추가.

- [x] **T1. home.md 명세 정합화** — D1 결정을 반영해:
  - S0 "구현 제외 범위"에서 리디자인 수용 여부를 확정 문구로 갱신(Top-10·지도·스크롤 애니메이션 제외를 명시).
  - S1 처리 흐름·S3 필수기능 표를 **실제 정적 섹션**(Hero / Quick-actions / Workflow / Services / Metrics)로 갱신.
  - 변경 이력에 1.1 추가.
- [x] **T2. 브랜드 정정** — `app/(shell)/page.tsx` metadata `description`의 "NowDoBoss" → "BossPickSeoul". 그 외 home-page.tsx 카피에 구 브랜드 잔존 있으면 함께 정정(DESIGN.md 카피 규칙 준수, 금지 문구 회피).
- [x] **T3. 렌더/경계 검증** — `pnpm dev`로 `/` 진입해: (a) 콘솔 하이드레이션 경고 없음, (b) styled-components 스타일 정상(FOUC 없음) 확인. 필요 시 `home-page.tsx`에 `'use client'` 추가 여부 판단(상호작용 없으면 불필요할 수 있음 — 경고 유무로 판단). `docs/engineering/client-boundary.md` 준수.
- [x] **T4. CTA/라우트 검증** — home의 모든 `href`가 `_index.md` 라우트 매핑과 일치하는지 확인. D2 결정 시 CTA 추가/조정. 미이관 대상 링크는 그대로 두되(추후 동작), 깨진 경로(존재하지 않을 경로)는 없어야 함.
- [x] **T5. 반응형·접근성 QA** — 데스크톱/모바일 뷰포트 레이아웃 검증(DESIGN.md 반응형 기준), 이미지 `alt`/aria, 링크 포커스. 깨짐 발견 시 DESIGN.md 토큰 내에서 수정(임의 색상/스페이싱 금지).
- [x] **T6. `_index.md` 상태 갱신** — home 행을 `✅ 이관·검증 완료`(런타임 검증 시) 또는 `🟩 명세 완료·구현(정적 검증)`으로 갱신, 비고에 D1 결정·제외 범위 기록.
- **T-DATA 제외:** D1을 정적 랜딩으로 확정했으므로 Top 10 동적 섹션은 홈 범위에 포함하지 않는다.

**검증 명령(완료 보고 전):** `pnpm test && pnpm qa:verify`(format:check·lint·typecheck·build). 미실행을 통과로 보고 금지. 런타임 검증은 백엔드 기동 시에만 — 미가동이면 "런타임 미검증"으로 정직하게 보고.

---

## 5. 검증 결과

- `pnpm format:check`: 통과
- `pnpm lint`: 통과
- `pnpm typecheck`: 통과
- `pnpm test`: 11 files / 32 tests 통과
- `pnpm build`: 통과. Next.js의 기존 middleware deprecation warning만 출력
- 브라우저 데스크톱(1440×900): 섹션·CTA·styled-components 렌더 정상, 가로 오버플로·콘솔 오류 없음
- 브라우저 모바일(375×812): 단일 열 카드, 모바일 메뉴 로그인·회원가입, 키보드 포커스 대상, 가로 오버플로·콘솔 오류 없음
- `/status` CTA: 미로그인 인증 가드에 따라 `/login?redirect=%2Fstatus`로 이동

---

## 6. 참고 — home이 사용할 수 있는 기존 자산

- BFF 데이터 호출: `import { apiClient } from '@/lib/api/client'` → `apiClient.get('/논리경로')` (프록시가 `/api/v1` 부가·인증 처리). 응답 판별: `import { isApiSuccess, getApiMessage } from '@/lib/api/response'`.
- 인증 상태 참조(필요 시): `import { useAuthStore } from '@/stores/auth-store'` (`isLoggedIn`, `memberInfo`). home은 공개 라우트라 미로그인 렌더가 기본.
- 레거시 참조(동작·IA만, API 아님): `NowDoBoss/FrontEnd/src/containers/main/*`, `src/pages/MainPage.tsx`.
