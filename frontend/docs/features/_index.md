# Feature 명세 인덱스

> 이 디렉터리는 BossPickSeoul FE의 **설계 정본**이다. 각 Feature = 공통명세 1 + 세부명세 N.
> 형식: `../../_DocumentTemplates` (공통 S0~S5 / 세부 D0~D8, 2계층).

## Feature 목록 & 이관 상태

| Feature    | 공통명세                                 | 대표 라우트                                      | 이관 상태                                           | 비고                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------------- | ------------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| home       | [home](./home/home.md)                   | `(shell)/`                                       | ✅ 이관·검증 완료                                   | 인터랙티브 랜딩 리디자인(상권 분석 미니데모·스크롤 등장) 구현 완료. 히어로는 "떠 있는 분석 창 + 살아있는 지도"(방향 C) 인터랙티브 wow로 갱신 완료 — [plan](../superpowers/plans/2026-08-10-home-hero-interactive-wow.md) · [spec](../superpowers/specs/2026-08-10-home-hero-interactive-design.md). Top 10·지도는 status 소유. 히어로 하위 섹션 스크롤리텔링 재설계(앵커·스티키 데모·벤토) 구현 — spec: below-hero-scrollytelling.md, plan: 2026-08-11-home-below-hero-scrollytelling.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| auth       | [auth](./auth/auth.md)                   | `(auth)/login,register,…`                        | 🟩 명세 완료·구현(이메일 인증 가입·소셜로그인 포함) | BFF 세션. 이메일 인증 3단계 가입·소셜로그인(카카오) FE 구현·단위테스트 완료. 소셜 e2e는 dev 카카오 OAuth 설정(client_id/redirect_uri) 대기(BE 선행)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| status     | [status](./status/status.md)             | `(shell)/status`                                 | ⬜                                                  |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| recommend  | [recommend](./recommend/recommend.md)    | `(shell)/recommend`                              | ⬜                                                  |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| analysis   | [analysis](./analysis/analysis.md)       | `(shell)/analysis,result,simulation…`            | 🟩 명세 완료·구현(지도 셸 + URL 카메라 반영)        | 지도 탐색 + 지도 셸 위 결과 레이어(구 라우트 모달/독립 페이지). AI 리포트는 3종(자치구/행정동/상권) POST 제출→SSE 구독(폴백 3초 폴링) + 미인증 잠금 카드로 구현 완료. 세부: [ai-report](./analysis/ai-report.md). 전용 AI 리포트 페이지(`/analysis/report`, 상권 v1, 2단 속도) 구현 완료 — 빠른 층(지표 4카드·차트 3종) 즉시 렌더 + 느린 층(AI 인사이트) 도착 시 채움. AI 리포트: 사이드바 인라인 전체 리포트 + 크게보기 모달(공유 본문 `AiReportBody`). **지도 셸 + URL 카메라 명세 작성(구현 대기)** — `/analysis/result` 하드 로드 시 지도가 사라지는 문제를 라우트 구조로 해결한다: 지도를 `(map-shell)` 라우트 그룹 레이아웃으로 올리고 `@modal` 인터셉팅 라우트를 제거해 결과 표면을 한 벌로 합친다. 지도 카메라는 `c=lat,lng,level`(소수 5자리)로 URL에 보존하며 공유·보관함 payload 에는 **넣지 않는다**(백엔드 payload 해시 기반 중복 판정이 깨지므로). 세부: [map-shell](./analysis/map-shell.md). 이 문서가 result.md 의 `@modal`/독립 페이지 서술을 대체한다.                                                                                                                                                                                                                                  |
| simulation | [simulation](./simulation/simulation.md) | `(shell)/simulation,compare,report`              | 🟩 명세 완료·구현(입력·리포트·저장/이력·A/B 비교)   | 백엔드 `/api/v1/simulations/**` 신설(2026-08) 반영. 타입·API 클라이언트·지원 업종 30종 상수를 V2로 전면 교체하고 V1 잔재는 `*-v1-legacy` 모듈로 격리(삭제 예정 — share Feature 의 `/share/[token]` 정리 이후). 세부: [simulation-report](./simulation/simulation-report.md). 리포트는 폴링·SSE 없는 **단일 POST 동기 계산**, 금액 단위 **만원**·면적 **㎡**. `genderAgeAnalysis`/`seasonAnalysis` null은 오류가 아니라 섹션 숨김. 성별·연령 매출은 **자치구×업종 전체** 집계라 범위 라벨 필수(점포 예상 매출로 오독 위험). `periodCode`는 UI 비노출. 시뮬레이션 공유·이력 삭제는 백엔드 미지원으로 범위 제외. **6개 라우트 전부 실화면** — 준비 중 안내(`SimulationUnavailablePage`)는 제거됐다. A/B 비교는 서버 비교 API 가 없어 `POST /simulations/reports` **2회 병렬 호출**(`Promise.all`)이고 한쪽만 성공한 화면은 비교가 아니므로 **부분 성공을 허용하지 않는다**(결과 0개 + 오류 1개). 비교 URL(`a.`/`b.` 접두사 쌍 코덱)은 **결과의 정본**이다 — 리포트 화면과 같이 `useQuery` + `enabled` 라 새로고침·링크 공유에서 결과까지 복원된다. 편집의 정본은 편집기 상태이고 URL 은 `비교하기` 를 누를 때만 갱신한다. 초기 비용만 비교하므로 중립 문구는 강조와 **항상 같은 컴포넌트에서 함께** 렌더한다. |
| community  | [community](./community/community.md)    | `(shell)/community/{list,register,[id]}`         | ⬜                                                  |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| chatting   | [chatting](./chatting/chatting.md)       | `(shell)/chatting/{list,[roomId]}`               | 🟩 안전 대기 구현                                   | REST·STOMP·FCM·Gateway 선행                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| profile    | [profile](./profile/profile.md)          | `(shell)/profile/{settings,bookmarks,…}`         | 🟡 V2 계약 정합화 진행                              | 계정 쓰기·시뮬레이션 저장은 BE 선행                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| share      | [share](./share/share.md)                | `(shell)/s/[shareCode]`, `(shell)/share/[token]` | 🟩 명세 완료·구현(V2 공유 링크 + 분석 화면 보관함)  | V2 `POST/GET /share-links` + `/s/{shareCode}` 진입 라우트(410 만료·404 미존재 문구 분기) 구현. 공유 링크와 payload 계약이 같은 **분석 화면 보관함**(`/analysis-bookmarks`) 저장·목록·이름수정·삭제 구현 — `bookmarkId` 는 Snowflake 문자열이라 숫자 변환 금지(테스트로 고정). 결과 화면에 "화면 보관" 버튼, `/profile/bookmarks/analysis` 는 [지역 북마크 / 화면 보관함] 2탭. `DISTRICT_ANALYSIS`(`/status` 가 Top10 밖 자치구를 조용히 버림)·`COMMERCIAL_COMPARISON`(`/recommend` 가 URL 상태 없음)은 거짓 복원을 피하려 미지원으로 안내. `(shell)/share/[token]` 은 레거시 시뮬레이션 공유(V1) 전용으로 유지.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## 상태 범례

⬜ 미착수 · 🟡 명세 작성중 · 🟩 명세 완료 · ✅ 이관·검증 완료

## 이관 순서

공통 인프라 → home/auth → status/recommend → analysis/simulation → community → profile → chatting.

## 이관 기록 방식

각 Feature 이관 시: legacy source 파일, target 파일, 상태, known gaps, 검증 결과, 남은 작업을 해당 Feature 공통명세 S0/변경이력에 남기고 이 표의 상태를 갱신한다.

---

## 부록: `migration-inventory.md` 흡수 내용

> 아래는 기존 `docs/migration-inventory.md`(레거시 CRA → Next.js 코드 이관 기록)의 내용을 그대로 보존한 것이다. 코드 이관 자체는 Phase 1~8 기준으로 이미 완료되었으며, 위 "Feature 목록 & 이관 상태" 표의 상태는 이 문서 체계(Feature 명세 작성) 기준 상태를 의미한다 — 코드 이관 완료 여부와는 별개다. `migration-inventory.md` 원본 파일은 `docs/_archive/migration-inventory.md`로 아카이브되었다.

### 레거시 프론트 요약

- 소스 위치: `../../NowDoBoss/FrontEnd`
- 페이지 수: `31`
- 컴포넌트 수: `153`
- 컨테이너 수: `66`
- 주요 API 모듈:
  - `analysisApi.tsx`
  - `chattingApi.tsx`
  - `communityApi.tsx`
  - `fcmApi.tsx`
  - `kakaoShareApi.tsx`
  - `mapApi.tsx`
  - `profileApi.tsx`
  - `recommendApi.tsx`
  - `simulationApi.tsx`
  - `statusApi.tsx`
  - `userApi.tsx`

### 핵심 리스크

#### SSR/클라이언트 경계 리스크

- `window`, `document`, `navigator` 직접 접근
- `localStorage`, `sessionStorage`, `document.cookie` 직접 접근
- `window.innerWidth`를 초기 state에서 바로 읽는 패턴
- DOM 이벤트를 직접 구독하는 스크롤/리사이즈 로직 다수 존재

#### 외부 SDK 리스크

- Kakao Map SDK
- Firebase Messaging
- 서비스 워커 등록
- websocket / STOMP

#### 구조 리스크

- 라우팅이 `App.tsx` 한 곳에 집중됨
- 레이아웃 조건이 라우터 위치 기반으로 제어됨
- 스타일 값 하드코딩이 많아 토큰화가 필요함

### 레거시 라우트 매핑 (코드 이관, 완료)

| Legacy Route                        | Next Route                                              | 우선순위 | 난이도    | 상태 |
| ----------------------------------- | ------------------------------------------------------- | -------- | --------- | ---- |
| `/`                                 | `app/(shell)/page.tsx`                                  | 높음     | 중간      | 완료 |
| `/register`                         | `app/(auth)/register/page.tsx`                          | 높음     | 낮음      | 완료 |
| `/register/general`                 | `app/(auth)/register/general/page.tsx`                  | 높음     | 중간      | 완료 |
| `/login`                            | `app/(auth)/login/page.tsx`                             | 높음     | 중간      | 완료 |
| `/member/loading/:provider`         | `app/(shell)/member/loading/[provider]/page.tsx`        | 높음     | 중간      | 완료 |
| `/profile/bookmarks`                | `app/(shell)/profile/bookmarks/page.tsx`                | 높음     | 중간      | 완료 |
| `/profile/bookmarks/analysis`       | `app/(shell)/profile/bookmarks/analysis/page.tsx`       | 중간     | 중간      | 완료 |
| `/profile/bookmarks/recommend`      | `app/(shell)/profile/bookmarks/recommend/page.tsx`      | 중간     | 중간      | 완료 |
| `/profile/bookmarks/simulation`     | `app/(shell)/profile/bookmarks/simulation/page.tsx`     | 중간     | 중간      | 완료 |
| `/profile/settings/edit`            | `app/(shell)/profile/settings/edit/page.tsx`            | 높음     | 중간      | 완료 |
| `/profile/settings/change-password` | `app/(shell)/profile/settings/change-password/page.tsx` | 높음     | 중간      | 완료 |
| `/profile/settings/withdraw`        | `app/(shell)/profile/settings/withdraw/page.tsx`        | 높음     | 중간      | 완료 |
| `/account-deleted`                  | `app/(auth)/account-deleted/page.tsx`                   | 중간     | 낮음      | 완료 |
| `/status`                           | `app/(shell)/status/page.tsx`                           | 중간     | 중간      | 완료 |
| `/analysis`                         | `app/(shell)/analysis/page.tsx`                         | 높음     | 중간      | 완료 |
| `/analysis/result`                  | `app/(shell)/analysis/result/page.tsx`                  | 높음     | 높음      | 완료 |
| `/analysis/simulation`              | `app/(shell)/analysis/simulation/page.tsx`              | 중간     | 높음      | 완료 |
| `/analysis/simulation/report`       | `app/(shell)/analysis/simulation/report/page.tsx`       | 중간     | 높음      | 완료 |
| `/analysis/simulation/compare`      | `app/(shell)/analysis/simulation/compare/page.tsx`      | 중간     | 높음      | 완료 |
| `/recommend`                        | `app/(shell)/recommend/page.tsx`                        | 중간     | 중간      | 완료 |
| `/simulation`                       | `app/(shell)/simulation/page.tsx`                       | 중간     | 높음      | 완료 |
| `/simulation/report`                | `app/(shell)/simulation/report/page.tsx`                | 중간     | 높음      | 완료 |
| `/simulation/compare`               | `app/(shell)/simulation/compare/page.tsx`               | 중간     | 높음      | 완료 |
| `/community/list`                   | `app/(shell)/community/list/page.tsx`                   | 중간     | 중간      | 완료 |
| `/community/register`               | `app/(shell)/community/register/page.tsx`               | 중간     | 중간      | 완료 |
| `/community/:communityId`           | `app/(shell)/community/[communityId]/page.tsx`          | 중간     | 높음      | 완료 |
| `/chatting/list`                    | `app/(shell)/chatting/list/page.tsx`                    | 낮음     | 높음      | 완료 |
| `/chatting/:roomId`                 | `app/(shell)/chatting/[roomId]/page.tsx`                | 낮음     | 매우 높음 | 완료 |
| `/share/:token`                     | `app/(shell)/share/[token]/page.tsx`                    | 중간     | 중간      | 완료 |

### 선행 공통 모듈 (Phase별)

Phase 1 기준으로 아래 공통 인프라가 준비되었다.

- `src/providers/query-provider.tsx`
- `src/providers/app-providers.tsx`
- `src/lib/api/client.ts`
- `src/lib/auth/cookies.ts`
- `src/lib/auth/storage.ts`
- `src/lib/env.ts`
- `src/styles/global-styles.ts`
- `src/components/layout/site-header.tsx`
- `src/components/layout/site-footer.tsx`
- `app/robots.ts`
- `app/sitemap.ts`

Phase 3 기준으로 아래 모듈이 추가되었다.

- `src/stores/auth-store.ts`
- `src/lib/api/user.ts`
- `src/lib/api/profile.ts`
- `src/lib/api/analysis.ts`
- `src/lib/api/simulation.ts`
- `src/components/home/home-page.tsx`
- `src/components/auth/*`
- `src/components/profile/*`

Phase 4 기준으로 아래 모듈이 추가되었다.

- `src/lib/api/map.ts`
- `src/lib/api/recommend.ts`
- `src/lib/api/status.ts`
- `src/stores/select-place-store.ts`
- `src/data/districts.ts`
- `src/types/map.ts`
- `src/types/status.ts`
- `src/components/location/location-selector.tsx`
- `src/components/status/status-page.tsx`
- `src/components/recommend/recommend-page.tsx`

Phase 5 기준으로 아래 모듈이 추가되었다.

- `src/data/simulation-catalog.ts`
- `src/lib/api/share.ts`
- `src/lib/kakao.ts`
- `src/components/analysis/analysis-page.tsx`
- `src/components/analysis/analysis-result-page.tsx`
- `src/components/simulation/simulation-form-page.tsx`
- `src/components/simulation/simulation-report-page.tsx`
- `src/components/simulation/simulation-report-view.tsx`
- `src/components/simulation/shared-simulation-report-page.tsx`
- `src/components/simulation/simulation-compare-page.tsx`

시뮬레이션 V2 계약 정렬(2026-08-26)로 아래 모듈이 추가/교체되었다.

- `src/types/simulation.ts` (V2 전면 교체)
- `src/lib/api/simulation.ts` (V2 `/simulations/**` 전면 교체)
- `src/data/simulation-service-types.ts` (지원 업종 30종·층 구분 상수)
- `src/lib/simulation/report-sections.ts` (결측 섹션 표시 판정)
- `src/types/simulation-v1-legacy.ts` · `src/lib/api/simulation-v1-legacy.ts` (V1 잔재 격리 — 삭제 예정)

Phase 6 기준으로 아래 모듈이 추가되었다.

- `src/data/community-categories.ts`
- `src/types/community.ts`
- `src/lib/api/community.ts`
- `src/lib/community.ts`
- `src/components/community/community-list-page.tsx`
- `src/components/community/community-detail-page.tsx`
- `src/components/community/community-register-page.tsx`

Phase 7 기준으로 아래 모듈이 추가되었다.

- `src/types/chatting.ts`
- `src/lib/api/chatting.ts`
- `src/lib/api/firebase.ts`
- `src/lib/chatting.ts`
- `src/lib/firebase-messaging.ts`
- `src/lib/realtime/chat-stomp.ts`
- `src/components/chatting/chatting-shell.tsx`
- `src/components/chatting/chatting-sidebar.tsx`
- `src/components/chatting/chat-room-search.tsx`
- `src/components/chatting/chat-room-create-modal.tsx`
- `src/components/chatting/chatting-list-page.tsx`
- `src/components/chatting/chatting-detail-page.tsx`

Phase 8 기준으로 아래 운영 문서와 설정이 추가되었다.

- `.env.local.example`
- `docs/qa-runbook.md`
- `docs/cutover-runbook.md`
- `docs/seo-performance-audit.md`
- `package.json#qa:verify`

### 브라우저 전용 패턴 정리 대상

우선 정리 대상 패턴은 아래와 같다.

- `useState(window.innerWidth ...)`
- 컴포넌트 바디 최상단 `localStorage.getItem(...)`
- 컴포넌트 바디 최상단 `navigator.userAgent`
- store 초기화 시 `document.cookie` 접근
- module scope의 websocket/Firebase 초기화

### 환경변수 매핑

| Legacy                                    | Target                                     |
| ----------------------------------------- | ------------------------------------------ |
| `VITE_REACT_API_URL`                      | `NEXT_PUBLIC_API_URL`                      |
| `VITE_REACT_APP_KAKAOMAP_API_KEY`         | `NEXT_PUBLIC_KAKAOMAP_API_KEY`             |
| `legacy hardcoded Kakao JS key`           | `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`         |
| `VITE_REACT_WS_URL`                       | `NEXT_PUBLIC_WS_URL`                       |
| `VITE_REACT_FIREBASE_API_KEY`             | `NEXT_PUBLIC_FIREBASE_API_KEY`             |
| `VITE_REACT_FIREBASE_MESSAGING_SENDER_ID` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `VITE_REACT_FIREBASE_APP_ID`              | `NEXT_PUBLIC_FIREBASE_APP_ID`              |
| `VITE_REACT_FIREBASE_MEASUREMENT_ID`      | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`      |
| `legacy browser push key`                 | `NEXT_PUBLIC_FIREBASE_VAPID_KEY`           |

### 상태 업데이트 규칙 (레거시 라우트 매핑 기준)

- 기능을 이관하면 해당 라우트의 상태를 `미착수 -> 진행중 -> 완료`로 갱신한다.
- Phase 2에서 route skeleton만 생성된 경우 상태는 `진행중`으로 유지한다.
- 공통 인프라가 추가되면 `선행 공통 모듈` 목록도 실제 경로 기준으로 갱신한다.
- route 또는 feature 완료 시 아래 항목을 남긴다.
  - route path
  - legacy source file
  - target file
  - migration status
  - known gaps
  - validation result
  - remaining tasks
- 세부 판단이 필요한 경우 관련 문서를 함께 확인한다.
  - 라우팅: `docs/engineering/routing-rules.md`
  - 클라이언트 경계: `docs/engineering/client-boundary.md`
  - API/세션/데이터: `docs/engineering/data-fetching-rules.md`
  - 스타일: [`DESIGN.md`](../../DESIGN.md) (원문은 `_archive/`에 보관), `docs/engineering/styling-rules.md`
