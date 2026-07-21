# home Feature — 작업 진행상황 & 남은 작업 핸드오프 (codex용)

> **작성일**: 2026-07-22
> **대상 실행자**: codex
> **브랜치**: `feature/fe/home` (develop `78a1b7b` 기반, auth #50 머지 반영됨)
> **관련 명세(정본)**: [home 공통명세](./home.md)

이 문서는 codex가 home Feature를 이어받아 진행할 수 있도록 **① 전체 프로젝트 진행상황 ② home 현재 상태 ③ 결정 필요 사항 ④ 남은 작업**을 정리한 핸드오프다. **home은 "큰 신규 구현"이 아니라 이미 렌더되는 정적 랜딩의 범위 결정 + 검증 + 문서 정합화** 작업이 핵심이다.

---

## 0. codex가 먼저 읽어야 할 것

> ⚠️ 이 저장소는 Codex용 `AGENTS.md`를 `docs/_archive/`로 통폐합했다. 작업 지도는 **`frontend/CLAUDE.md`** 에 있으니 이것부터 읽는다.

| 목적 | 파일 |
|---|---|
| 작업 지도(정본 위치·프로세스·기술선·금지) | `frontend/CLAUDE.md` |
| home 설계 정본 | `frontend/docs/features/home/home.md` |
| 디자인 시스템 정본 | `frontend/DESIGN.md` |
| 횡단 규칙 | `frontend/docs/engineering/` (routing/client-boundary/data-fetching/styling) |
| 데이터 페칭 = **BFF(S2S) 표준** | `frontend/docs/engineering/data-fetching-rules.md` |
| Feature 이관 상태·라우트 매핑 | `frontend/docs/features/_index.md` |
| 명세 템플릿(2계층) | `frontend/_DocumentTemplates/` |

**절대 규칙:** 백엔드 API 계약 변경 금지. API 문서(Swagger) 없이 임의 엔드포인트/스펙 작성 금지 → 작성자에게 문의. 임의 색상/토큰 추가 금지(DESIGN.md 준수). 커밋 컨벤션 `[FE] ...`.

---

## 1. 전체 프로젝트 진행상황

React/Vite(NowDoBoss) → Next.js App Router(BossPickSeoul) 마이그레이션. 문서·설계 체계를 Feature 기준 명세(정본) + superpowers 프로세스로 재편 완료.

**Feature별 상태 (`docs/features/_index.md` 기준):**

| Feature | 명세 | 구현 | 비고 |
|---|---|---|---|
| **auth** | ✅ | ✅ (정적검증) | BFF 세션 구현·develop 머지(#50). **런타임(실 백엔드) 미검증.** 소셜로그인·2단계가입·세션TTL·에러코드 미결(BE 선행) |
| **home** | ✅ 공통명세 | 🟡 정적 랜딩 존재(리디자인) | **이 핸드오프 대상** — §2~§4 참조 |
| status·recommend·analysis·simulation·community·chatting·profile·share | ❌ | ❌ 미착수 | 기존 화면 잔존하나 **구 백엔드 계약**에 묶여 있어 신규 백엔드와 미검증(일부는 확실히 깨짐, 예: profile `/member/get`) |

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
- 현재 CTA/링크: `/analysis`, `/recommend`, `/community/list`, `/register`.

### 2-2. 레거시(as-is)와의 갭 — home.md S0 참조
레거시 `MainContainer`는 5개 섹션(Intro/Status/Analysis/Recommend/More)을 스크롤 애니메이션(IntersectionObserver)과 함께 렌더했고, **유일한 동적 요소**는 Status 섹션의 **유동인구 Top-10 리스트(React Query `fetchTopList`) + 서울시 구 d3 지도**였다. 리디자인은 이 **동적 데이터 섹션(Top-10·지도)과 스크롤 애니메이션을 제거**하고 정적 랜딩으로 재구성했다.

### 2-3. 발견된 정합성 이슈(검증/수정 대상)
1. `home-page.tsx`에 `'use client'`가 없음 — styled-components 사용. 상호작용(state/effect)이 없어 서버 컴포넌트 + styled-components 레지스트리(`src/lib/styled-components-registry.tsx`)로 렌더되는 것으로 보이며 빌드는 통과하나, **하이드레이션 경고·스타일 FOUC 여부를 런타임에서 확인** 필요.
2. metadata `description`에 구 브랜드 **"NowDoBoss"** 잔존(`app/(shell)/page.tsx`) → BossPickSeoul로 정정 필요.
3. 레거시에 있던 **시뮬레이션·구별현황(status) CTA가 리디자인에 없음** — 의도된 축소인지 확인 필요.
4. CTA 대상 라우트 대부분이 아직 미이관(⬜) — home 자체 문제 아님(해당 Feature 이관 시 동작). 링크 경로 자체는 `_index.md` 매핑과 일치.

---

## 3. 결정 필요 (codex 진행 전 작성자 확인)

| # | 결정 | 옵션 | 권장 |
|---|---|---|---|
| D1 | **home을 정적 랜딩으로 확정**할 것인가, 레거시의 **Top-10 유동인구 동적 섹션을 재도입**할 것인가 | (a) 정적 확정 — 리디자인 그대로 수용, Top-10·지도 제외 / (b) Top-10 재도입 — 신규 백엔드 `district-service`(예: `/district/top/ten`, **Swagger로 정확한 경로·응답 확인 필요**)를 BFF로 연동한 client 섹션 추가 | **(a) 정적 확정.** "legacy 플로우 + 새 디자인 허용" 결정에 부합하고 가장 단순. Top-10은 status Feature에서 다루면 중복 방지. (b) 택 시 별도 세부명세 필요 |
| D2 | 시뮬레이션·status로 가는 CTA를 home에 추가할지 | 추가 / 현행 유지(analysis·recommend·community·register만) | 기획 판단 |

> D1이 (a)면 home은 아래 §4의 검증·문서 정합화만 하면 **사실상 완료**. (b)면 §4에 "Top-10 섹션 구현" 태스크가 추가된다.

---

## 4. home 남은 작업 (codex 태스크)

> 전제: D1 = (a) 정적 확정 기준. (b) 선택 시 T-DATA 태스크 추가.

- [ ] **T1. home.md 명세 정합화** — 현재 `home.md`는 레거시 5섹션을 as-is로 기록하고 리디자인을 "확인 필요"로 플래그해 둔 상태다. D1 결정을 반영해:
  - S0 "구현 제외 범위"에서 리디자인 수용 여부를 확정 문구로 갱신(Top-10·지도·스크롤 애니메이션 제외를 명시).
  - S1 처리 흐름·S3 필수기능 표를 **실제 정적 섹션**(Hero / Quick-actions / Workflow / Services / Metrics)로 갱신.
  - 변경 이력에 1.1 추가.
- [ ] **T2. 브랜드 정정** — `app/(shell)/page.tsx` metadata `description`의 "NowDoBoss" → "BossPickSeoul". 그 외 home-page.tsx 카피에 구 브랜드 잔존 있으면 함께 정정(DESIGN.md 카피 규칙 준수, 금지 문구 회피).
- [ ] **T3. 렌더/경계 검증** — `pnpm dev`로 `/` 진입해: (a) 콘솔 하이드레이션 경고 없음, (b) styled-components 스타일 정상(FOUC 없음) 확인. 필요 시 `home-page.tsx`에 `'use client'` 추가 여부 판단(상호작용 없으면 불필요할 수 있음 — 경고 유무로 판단). `docs/engineering/client-boundary.md` 준수.
- [ ] **T4. CTA/라우트 검증** — home의 모든 `href`가 `_index.md` 라우트 매핑과 일치하는지 확인. D2 결정 시 CTA 추가/조정. 미이관 대상 링크는 그대로 두되(추후 동작), 깨진 경로(존재하지 않을 경로)는 없어야 함.
- [ ] **T5. 반응형·접근성 QA** — 데스크톱/모바일 뷰포트 레이아웃 검증(DESIGN.md 반응형 기준), 이미지 `alt`/aria, 링크 포커스. 깨짐 발견 시 DESIGN.md 토큰 내에서 수정(임의 색상/스페이싱 금지).
- [ ] **T6. `_index.md` 상태 갱신** — home 행을 `✅ 이관·검증 완료`(런타임 검증 시) 또는 `🟩 명세 완료·구현(정적 검증)`으로 갱신, 비고에 D1 결정·제외 범위 기록.
- [ ] **(D1=b인 경우만) T-DATA. Top-10 동적 섹션 재도입** — ⚠️ 먼저 **Swagger로 `district-service`의 Top-10 엔드포인트 경로·요청·응답 shape 확인**(임의 작성 금지). 확인되면: home 세부명세 `top-districts.md`(D0~D8) 작성 → `apiClient.get('/district/...')`(BFF 경유, 자동 인증) 사용하는 **client 섹션 컴포넌트** 구현 → 로딩/빈/에러 상태 처리 → 응답 래퍼 `dataHeader.success` 판별.

**검증 명령(완료 보고 전):** `pnpm test && pnpm qa:verify`(format:check·lint·typecheck·build). 미실행을 통과로 보고 금지. 런타임 검증은 백엔드 기동 시에만 — 미가동이면 "런타임 미검증"으로 정직하게 보고.

---

## 5. 참고 — home이 사용할 수 있는 기존 자산
- BFF 데이터 호출: `import { apiClient } from '@/lib/api/client'` → `apiClient.get('/논리경로')` (프록시가 `/api/v1` 부가·인증 처리). 응답 판별: `import { isApiSuccess, getApiMessage } from '@/lib/api/response'`.
- 인증 상태 참조(필요 시): `import { useAuthStore } from '@/stores/auth-store'` (`isLoggedIn`, `memberInfo`). home은 공개 라우트라 미로그인 렌더가 기본.
- 레거시 참조(동작·IA만, API 아님): `NowDoBoss/FrontEnd/src/containers/main/*`, `src/pages/MainPage.tsx`.
