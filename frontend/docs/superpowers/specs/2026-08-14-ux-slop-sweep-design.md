# UX/AI-slop 정리 스윕 — 설계 명세

- 작성일: 2026-08-14
- 브랜치: `feature/fe/ux-slop-sweep` (base `develop`)
- 범위: 프론트엔드 전용. DESIGN.md 정본 준수, 백엔드 API 계약 변경 없음.
- 상태: **PR1 완료(`#152`)** · **PR2 완료(`#154`, 재검증 결과 대폭 축소 — §8)** · **PR3 완료(`#156` — §9)** · **PR4 완료(§10)** · PR-Home 미착수
- PR4 핸드오프(실행 완료, 기록은 §10): [2026-08-27-ux-slop-sweep-pr4-handoff.md](./2026-08-27-ux-slop-sweep-pr4-handoff.md)
- ✅ **PR3·PR4 가 미뤘던 `/analysis/result` 시각 검증은 2026-08-31 에 끝냈다 — 4건 전부 통과**(§12).
- 원 브랜치 `feature/fe/ux-slop-sweep`(base `2c6209c`)에는 이 문서만 있었고 구현은 없었다. PR1 은 `feature/fe/ux-slop-sweep-pr1` 에서 develop 기준으로 새로 잡아 진행했다.

> 다른 컴퓨터에서 이어받기 위한 자족 문서. 진단 근거·승인된 방향·PR 로드맵·PR1 상세 변경목록을 모두 포함한다.

---

## 0. 목표

1. 전체 UI/UX 사용성 점검 및 개선.
2. "AI가 만든 것 같은 느낌(AI티/슬롭)"을 걷어내고 의도적으로 사람이 디자인한 결과물로.

지향점: 명확한 시각적 위계, 여백의 의도, 콘텐츠 우선, 절제된 강조.

## 1. 제약 (반드시 준수)

- DESIGN.md 토큰만 사용. 임의 색상/radius/shadow/spacing 토큰 추가 금지. 틴트는 기존 토큰 + `color-mix`로 파생.
- 백엔드 API 계약·데이터 스펙 변경 금지.
- 광범위한 무관 리팩터 금지. 사용성/미감에 직접 기여하는 변경만.
- 접근성 유지(키보드 포커스 링 유지, 마우스 클릭 노이즈만 제거).
- 완료 보고 전 `pnpm qa:verify`(format:check && lint && typecheck && build) 통과.
- 기존 status-state/status-formatters 테스트 8건은 develop에서도 실패하는 stale 테스트(무관).

## 2. 승인된 방향 (2026-08-14, 사용자 확정)

- **홈 데스크탑 히어로**: 모바일처럼 과업 중심으로 정리. 가짜 맥 윈도우(신호등 점 CTA)·글래스모피즘·60px 그림자·드래그→dock 애니·220dvh 페이드 문구 제거. 모바일 히어로("자치구를 눌러 바로 분석" + 인터랙티브 지도)를 데스크탑에도 정렬. 명확한 CTA 1~2개.
- **PR 착수 순서**: ① 횡단 슬롭 일괄 → ② 시뮬레이션 돈 화면 → ③ 상권분석/결과/AI → ④ 접근성+상태규격. 홈 히어로 리디자인은 디자인 판단이 더 필요해 별도 슬라이스.
- **관리 방식**: 채팅에서 brainstorming→plan→승인→화면 묶음별 PR.

## 3. 진단 요약

베이스라인: develop `2c6209c`(= polish `c1548a2` 동일 내용).

좋은 점(유지): 이모지 0, 목적 없는 그라디언트 1건뿐, 차트 절제(강조 1색+탭수치), 헤더/푸터/미니데모 접근성 양호. /status·인증 화면은 최근 폴리시(#117)로 이미 상당히 좋음. 최악의 슬롭은 거의 없고 문제는 **조용하고 구조적**.

### 3.1 횡단 테마 (우선순위 순)

| #   | 테마                                                                                                 | 대표 근거                                                                                                                                                                                                                                                                                          |  심각도  |
| --- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: |
| 1   | **액센트 바가 시스템 전반에 존재**                                                                   | 좌측바 `status-detail.tsx:201`, `analysis/ai-report/report-insight-section.tsx:76`, `simulation-unavailable-page.tsx:142`, `chatting-unavailable-page.tsx:101`, `community-list-view.tsx:352` · 활성 nav ::before 좌측바 `analysis-result-nav.tsx:57` · 블루 상단바 `analysis-result-view.tsx:460` |   High   |
| 2   | **블루를 장식으로 사용** (Principle 4 "blue=상호작용 전용" 위반; 토큰상 primary-600/700이 전부 blue) | 정적 값 텍스트 블루 `analysis-metric-list.tsx:56`, 블루 아이브로우(analysis/status), 비클릭 파랑 pill `simulation-report-view.tsx:56`·`simulation-form-page.tsx:90`, 히어로 hover 파랑 틴트                                                                                                        |   High   |
| 3   | **영문 대문자 eyebrow 킥커가 모든 섹션 상단** (템플릿·미번역·off-voice·off-typescale)                | `Account`/`Join` `login-form.tsx:106`·`register-form.tsx:254`, `Simulation`/`Simulation Report`/`Simulation Compare`(simulation-\*), 블루 아이브로우 `analysis-selection-panel.tsx:58`                                                                                                             | Med-High |
| 4   | **AI 모티프가 Sparkles ✨** (DESIGN 명시 금지)                                                       | `feature-bento.tsx:309,369`, `ai-report-card.tsx:42`, `report-insight-section.tsx:224`                                                                                                                                                                                                             | Med-High |
| 5   | **비표준 폰트 웨이트 650/750/780/800** (~15곳; DESIGN은 400/600/700만)                               | `analysis-result-view.tsx:473`(800), `analysis-metric-list.tsx:60`(800), status-top-ten/status-map(800), recommend-result-list(800) 등                                                                                                                                                             |   Med    |
| 6   | **과라운딩 24px + 금지된 vw 폰트스케일·네거티브 letter-spacing**                                     | 히어로카드 24px, 모달 `analysis-result-modal.tsx:46` · `status-page.tsx:75`(clamp vw)·`:78`(-0.02em), `analysis-result-view.tsx:207`(vw), `recommend-panel.tsx:119`(-0.02em), `anchor-statement.tsx:65`(-0.01em)                                                                                   |   Med    |

### 3.2 화면별 진단

**홈 (/)** — 데스크탑 히어로에 "테아터" 집중. 모바일은 이미 깔끔(창 없이 지도 기반).

- 데스크탑: 가짜 맥 윈도우(신호등 점, 하드코딩 `#ff5f57`/`#febc2e`/`#28c840`), 글래스모피즘+60px 그림자(토큰 최대의 ~2.5배, `hero-glass.ts:6`/`hero-window.tsx:44`), 드래그→dock 상태머신 ~180줄(`hero-section.tsx:270-449`).
- 신호등 점이 실제 CTA: 12px·hover에만 아이콘·모바일 숨김·초록점이 조용히 `/analysis`로 → 발견성/터치타깃 결함(`hero-window.tsx:130-141,302-308`).
- 220dvh 스크롤 고정 + 거대 페이드인 문구(`anchor-statement.tsx`), 같은 "감 대신 데이터+AI" 논지 3~4개 섹션 반복.
- 벤토: 아이콘+제목+설명 카드 + pill 과다 + 메타-UI 카피("분석 창 열기/닫기").
- (양호) `site-header.tsx`/`site-footer.tsx` 토큰 클린, aria/키보드 처리 양호. `analysis-mini-demo.tsx` roving radiogroup·탭수치·시맨틱 컬러 양호.

**상권분석 (/analysis, /result, AI리포트)** — 데이터 컴포넌트·차트 자체는 양호. 잔여: 블루 상단/좌측 액센트 바, 블루 정적값(`analysis-metric-list.tsx:56`), ✨, 지표를 `--` 대신 스켈레톤(`report-metric-cards.tsx:90`), 데이터 위 내용 없는 지시형 히어로(`analysis-result-view.tsx:1102`), AI 잠금카드 blur 가짜본문(`ai-report-lock-card.tsx:26,40`), 14px backdrop-blur 헤더(`analysis-result-view.tsx:168`), 모달 scrim off-token+blur(`analysis-result-modal.tsx:29,31`).

**구별현황 (/status)** — 전반 우수. 잔여: vw 폰트스케일·네거티브 트래킹·800웨이트(hero `status-page.tsx:75-78`), 변화지표 좌측 컬러바(`status-detail.tsx:201`), 탭 34px(<36px 터치 최소, `status-metric-tabs.tsx:32`), BackButton 28px.

**시뮬레이션 (돈 화면)** — 위반 밀집:

- 억/만원 축약 표기 `lib/format.ts:15`(정본 금지, `1,240,000원`만) + 탭수치 없음(`simulation-report-view.tsx:147/217/254`).
- 파랑 primary 버튼 2개(저장+공유) `simulation-report-view.tsx:322-345` — Principle 3 위반.
- 마이그레이션/API 내부사정이 사용자 카피로 노출("레거시…Next 구조로" `simulation-form-page.tsx:373`, "V2 API 계약 대기 중" `profile-edit-page.tsx:91`).
- 레거시 V1 색·하드코딩 색(`simulation-form-page.tsx:225,273`, `simulation-report-view.tsx:88,109`), 지표 스켈레톤, 대시보더 빈상태, unlabeled 폼 입력(`simulation-form-page.tsx:391,489`).

**추천 (/recommend)** — 폼-위-지도 레이아웃 깔끔. 잔여: 주 CTA "상권 추천받기" 파랑 배경+charcoal 텍스트 대비 결함(`recommend-condition-form.tsx:90`, 정본은 흰 텍스트), 800웨이트.

**인증 (로그인/회원가입)** — 거의 양호. 영문 아이브로우, 인라인 에러가 상단 틴트 배너로만(정본은 입력 2px 빨강 테두리+하단 문구, `login-form.tsx:116`·`register-form.tsx:278`).

**프로필** — 인증 리다이렉트로 시각 확인 불가(코드 감사). "…없습니다" 빈상태(정본 "…없어요", `profile-analysis-bookmarks-page.tsx:96`), 대시보더 빈상태, 텍스트배너 로딩.

**횡단 접근성** — grey500(#8b95a1) 캡션이 의미있는 라벨에 12px로 쓰여 AA 대비 미달(다수 카드), 시뮬 폼 라벨 누락.

> 참고: 좌하단 "N" 원형 버튼은 Next.js 16 dev 오버레이(프로덕션 미노출) — 무시.

## 4. PR 로드맵

| PR      | 제목                  | 범위                                                                                                              | 성격                             |
| ------- | --------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **PR1** | 횡단 슬롭 일괄        | 테마 1~6 전 화면 공통(§5 상세)                                                                                    | 규격 정리, 저위험                |
| PR2     | 시뮬레이션 돈 화면    | 억/만원→정확한 원+탭수치, 이중 파랑 primary 해소, 내부 카피 제거, 레거시색/스켈레톤/빈상태                        | 화면 묶음                        |
| PR3     | 상권분석/결과/AI      | 블루 액센트·정적값·✨·지시형 히어로·지표 `--`·모달 라운딩/scrim·글래스헤더                                        | 화면 묶음                        |
| PR4     | 접근성+상태규격       | grey500 라벨 대비, 폼 라벨, 터치타깃, 인라인 에러 빨강테두리, 로딩 스켈레톤/`--`, 대시 빈상태, recommend CTA 대비 | 화면 묶음                        |
| PR-Home | 홈 히어로 모바일 정렬 | 데스크탑 히어로 리디자인(창/글래스/신호등CTA/220dvh/드래그dock 제거 → 지도 기반 과업 히어로)                      | 디자인 슬라이스(별도 brainstorm) |

> PR1과 PR2~4는 일부 파일이 겹칠 수 있음(예: ✨는 홈·analysis 양쪽). PR1은 "테마성 일괄"로 먼저 훑고, PR3은 analysis 고유 항목(지시형 히어로·모달·잠금카드 등)만 다룬다. 겹침 최소화 원칙: PR1에서 처리한 항목은 후속 PR에서 재처리하지 않음.

## 5. PR1 상세 설계 — 「횡단 슬롭 일괄」

전 화면 공통 슬롭을 규격으로 정리. 전부 스타일/토큰 준수라 동작 리스크 낮음. **새 토큰 0, 기존 토큰 + `color-mix` 파생만.**

### ① 액센트 바 제거 → 은은한 배경 틴트

- 좌측 컬러바 제거: `status-detail.tsx:201`(변화지표), `analysis/ai-report/report-insight-section.tsx:76`(AI요약), `simulation-unavailable-page.tsx:142`, `chatting-unavailable-page.tsx:101`, `community-list-view.tsx:352`
- 블루 상단바 제거: `analysis-result-view.tsx:460`(MetricCard `border-top:2px`)
- 활성 nav ::before 좌측바 제거: `analysis-result-nav.tsx:52-62` — 이미 있는 `primary-100` 활성 배경으로 충분
- 방식: 바 삭제. 강조가 필요한 경우만 `color-mix(in srgb, <tone> 8%, white)` 배경 틴트. status-detail은 같은 파일의 `StatusCallout`(이미 틴트 방식, ~296-307)을 표준으로 통일.

### ② 블루=상호작용 전용

- 정적 값 텍스트 블루 → `grey900`: `analysis-metric-list.tsx:56`
- 블루 아이브로우 → 캡션 그레이(`--color-text-caption` 또는 grey600): analysis/status
- 비클릭 파랑 pill(Step/Meta) → `grey100` bg / `grey700` text: `simulation-report-view.tsx:56`, `simulation-form-page.tsx:90`

### ③ ✨ Sparkles 제거

- 중립 Lucide 아이콘(리포트=`FileText`/`BarChart3` 등) 또는 무아이콘: `feature-bento.tsx:309,369`, `ai-report-card.tsx:42`, `report-insight-section.tsx:224`

### ④ 영문 아이브로우 정리

- `Account`/`Join`/`Simulation`/`Simulation Report`/`Simulation Compare` → 한국어화 또는 제거
- Eyebrow 컴포넌트의 `text-transform:uppercase` + `letter-spacing:0.08em` 제거(off-typescale)
- 대상: `auth-shell.tsx`(via login/register), `simulation-form-page.tsx:37`, `simulation-report-view.tsx:29`, `simulation-compare-page.tsx:36`

### ⑤ 비표준 폰트 웨이트 → 400/600/700

- 650/750/780/800 → 가장 가까운 허용치(대개 700): `analysis-result-view.tsx:209,335,421,473`, `analysis-selection-panel.tsx:67,224`, `analysis-result-section.tsx:41`, `report-metric-cards.tsx:62`, `analysis-metric-list.tsx:60`, `status-top-ten.tsx:121`, `status-map.tsx:229`, `recommend-result-list.tsx:83,116`
- (본문 라벨 700 → 600 정리는 여력 시)

### ⑥ 과라운딩 24px → 16px

- `analysis-result-modal.tsx:46`(Surface `border-radius:24px`)
- (히어로 카드 24px는 PR-Home)

### ⑦ 금지된 vw 폰트스케일·네거티브 letter-spacing 제거

- `status-page.tsx:75`(clamp vw → 고정 px)·`:78`(-0.02em → normal)
- `analysis-result-view.tsx:207`(clamp vw → 고정)
- `recommend-panel.tsx:119`(-0.02em → normal)
- (`anchor-statement.tsx:65` -0.01em는 PR-Home에서 함께)

### 검증

- 변경군마다 5173에서 스크린샷/computed 확인. createGlobalStyle 변경은 하드 리프레시.
- 완료 전 `pnpm qa:verify` 통과.
- 범위 밖(홈 히어로, 시뮬 금액, 상태규격, 접근성 대비)은 PR2~4/PR-Home.

## 6. 핸드오프 노트

- 워크트리: `.worktrees/bosspick-uxslop` (branch `feature/fe/ux-slop-sweep`, base `develop`).
- dev 서버: 작업 워크트리 `frontend/`에서 `pnpm dev -p 5173`. `.env.local`은 gitignore이므로 develop 워크트리(`.worktrees/bosspick-develop/frontend/.env.local`)에서 복사해야 데이터가 뜬다.
- Kakao 지도는 localhost 도메인 제한으로 타일 미로드(폴리곤은 부분 렌더) — 지도 자체 동작은 실기기 확인 대상.
- 원격: `github.com/8llow8llowMe/bosspickseoul`. PR base는 `develop`.
- 이어서 할 일: PR1 §5 순서대로 구현 → 5173 검증 → `pnpm qa:verify` → PR(base develop). 이후 PR2~4, PR-Home(별도 brainstorm).

---

## 7. PR1 실행 결과 (2026-08-27)

착수 전에 §5 의 대상을 develop(`d39002f`) 기준으로 전수 재검증했다. 진단 시점(`2c6209c`)과
develop 사이에 지도 셸·시뮬레이션 슬라이스 B1~B3·오류 UI 규약·#149 정리가 들어가면서
**일부 대상은 사라졌고, 진단에 없던 같은 위반이 새로 생겼다.**

### 사라진 대상 (파일 자체가 없음)

| §5 항목 | 사라진 대상                                                                                                | 사유                                    |
| ------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| ①       | `simulation-unavailable-page.tsx:142`                                                                      | #149 에서 죽은 코드로 삭제              |
| ②       | `simulation-report-view.tsx:56`, `simulation-form-page.tsx:90` 비클릭 파랑 pill                            | V1 컴포넌트가 슬라이스 B 에서 교체·삭제 |
| ④       | `simulation-form-page.tsx:37`, `simulation-report-view.tsx:29`, `simulation-compare-page.tsx:36` 영문 킥커 | 같은 사유. V2 화면은 처음부터 한국어다  |

### 진단에 없었지만 같은 위반이라 함께 처리한 것

- `analysis-mobile-sheet.tsx` AI 칩의 `Sparkles`(③) — 진단 이후 추가된 화면
- 슬라이스 B 산출물 다수의 `font-weight: 750`(⑤) — 새 코드에 같은 슬롭이 전파돼 있었다
- `community-*` 3화면의 vw 폰트 스케일·네거티브 트래킹(⑦), `community-list-view` 의 uppercase 아이브로우(④)
- `seoul-districts-map.tsx` 의 `font-weight: 500`(⑤) — 진단의 650/750/780/800 목록에는 없던 값

### 범위 밖으로 남긴 것

| 대상                                                               | 사유                                                                                                                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero-window.tsx:36,53` 24px·20px 라운딩                           | §5 ⑥ 이 명시한 대로 **PR-Home**. 히어로 리디자인과 함께 사라질 가능성이 크다                                                                                                  |
| `toast.tsx:92`, `simulation-error-notice.tsx:35` 좌측 3px 바       | 진단 이후 생긴 코드이고, **경고 표면의 severity 전달자**다. 장식 바가 아니라 관례적 affordance 라 이번 스윕의 "장식 제거" 기준에 해당하지 않는다                              |
| `route-placeholder-page.tsx` 의 `Phase 2 Route Skeleton` 영문 카피 | 이 컴포넌트는 **어느 라우트도 마운트하지 않는다**(`route-skeletons.ts` 가 타입만 import 해 `sitemap.ts` 에 쓴다). uppercase 만 걷어내고 카피는 두었다 — 죽은 코드 삭제는 별건 |
| `anchor-statement.tsx` 네거티브 트래킹                             | §5 는 PR-Home 으로 미뤘지만 **한 줄이라 함께 처리했다.** 하나만 남기면 `rg "letter-spacing: -"` 체크가 계속 빨간불이라 스윕의 뜻이 사라진다                                   |

### ② 의 판정 하나를 뒤집었다

`status-detail.tsx` 의 변화지표 좌측 바는 §5 ① 이 "제거" 대상으로 지목했지만, 이 바는
**장식이 아니라 tone(danger/success/warning/neutral) 전달자**다. 그냥 지우면 정보가 준다.
그래서 같은 파일 `StatusCallout` 의 틴트 규격
(`color-mix(in srgb, <tone> N%, var(--color-surface))`)으로 옮겨 **바는 없애되 tone 은 지켰다.**
§5 ① 이 "status-detail은 StatusCallout을 표준으로 통일" 이라 적은 것과 같은 뜻이다.

### 검증

- `pnpm exec vitest run` 1200개 통과 / `pnpm qa:verify` 통과
- DESIGN.md §1344~1346 체크리스트 grep — 네거티브 트래킹 0, vw 폰트 스케일 0, 비표준 웨이트 0.
  radius >16px 는 `hero-window.tsx` 2곳만 남았다(PR-Home 범위)
- dev 5173 computed style 확인 — `/status` 히어로(28px/700/normal, 375px 에서 20px),
  `/login` 아이브로우(`로그인`, uppercase none), `/community/list` 타이틀(1280px 34px, 트래킹 normal),
  `/analysis` 아이브로우(`rgb(139,149,161)` — 파랑에서 그레이로), 홈 lucide 아이콘 목록에 sparkle 없음

---

## 8. PR2 실행 결과 (2026-08-27) — 「대상이 증발했다」

PR1 과 같이 착수 전에 §3.2 「시뮬레이션 (돈 화면)」 진단을 develop(`343695e`) 기준으로
전수 재검증했다. 진단 시점(`2c6209c`)과 develop 사이에 **슬라이스 B(#144·#147·#149·#150)가
시뮬레이션 V1 을 통째로 교체**했고, 그 과정에서 PR2 대상 대부분이 이미 해소됐다.

### 이미 해소된 대상

| 진단 대상                           | 현재                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------- |
| 탭수치 없음                         | `font-variant-numeric: tabular-nums` 10곳 적용                             |
| 이중 파랑 primary(저장+공유)        | 저장(primary) + `비교에 추가`(secondary) — primary 1개                     |
| 레거시 V1 색·하드코딩 색            | `src/components/simulation/**` hex 리터럴 0건                              |
| unlabeled 폼 입력                   | 면적·브랜드 입력 모두 `aria-label`                                         |
| 내부사정 카피("레거시…Next 구조로") | V1 파일과 함께 삭제. `profile-*` 의 "V2 API 계약 대기 중" 4곳만 잔존 → PR4 |
| 대시보더 빈상태                     | `profile-ui.tsx:113` 1곳만 → PR4                                           |

### ①「억/만원 → 정확한 원」 판정을 뒤집었다

진단은 DESIGN.md §6.4(`매출/금액 = 1,240,000원`)만 보고 `formatLargeWon` 을 정본 위반으로
지목했다. **오진이다.** 같은 문서 S-SIM-2 가 명시한다 — 「금액 단위는 전부 만원이다.
표기는 `N억 M만원`(`formatLargeWon`). **원 단위 포매터를 쓰면 1만 배 틀린다.**」

백엔드가 만원 단위로 주므로 만원 자리가 이 화면의 최대 정밀도이고, `formatLargeWon` 은
반올림하지 않는다(`2,733,782` → `273억 3,782만원`). 축약이 아니라 자릿수 구분이다.

문서가 자기모순이라 다음 사람이 같은 오진을 반복한다. **§6.4 에 시뮬레이션 예외를 달고,
S-SIM-2 에 그 이유를 적었다.**

### 대신 진단에 없던 실물 결함을 고쳤다

`src/lib/format.ts` 의 `formatLargeWon` 은 테스트가 0건이었고 두 자리에서 틀렸다.

| 입력         | 이전               | 이후                | 근거                                                      |
| ------------ | ------------------ | ------------------- | --------------------------------------------------------- |
| `10_000`     | `1억 0만원`        | `1억`               | 만원 자리가 0 이면 붙이지 않는다. 사람이 쓰지 않는 표기다 |
| `0`          | `0만원`            | `0원`               | S-SIM-2 가 가맹 부담금 `0` 을 "0원"으로 못박았다          |
| `12_345_678` | `1234억 5,678만원` | `1,234억 5,678만원` | 만원 자리만 자릿수 구분하고 억 자리는 안 하던 비대칭      |

이 포매터는 총비용·비용구성 도넛·비교 차액·유사 프랜차이즈 6열까지 **11개 파일**이 쓴다.

`levy: 0` 검증 테스트도 함께 고쳤다 — 이름은 「0원으로 표기한다」인데 단언은
`toContain('0만원')` 이었고, `0만원` 은 `3,000만원` 의 부분문자열이라 그 자리를 검증하지
못하고 있었다.

### 검증

- `pnpm exec vitest run` — 142 files / **1206 tests 통과**(`src/lib/format.test.ts` 6건 신규)
- `pnpm qa:verify` 통과

---

## 9. PR3 실행 결과 (2026-08-27) — 「상권분석/결과/AI」

착수 전 §3.2 「상권분석」 진단을 develop(`343695e` + PR2) 기준으로 전수 재검증했다.
PR1 이 이미 걷어낸 항목(블루 상단바·블루 정적값·✨·모달 24px 라운딩)을 빼면 PR3 고유
대상은 5건이 남았고, **전부 살아 있었다.** 여기에 같은 위반 3건을 함께 처리했다.

### 처리한 대상

| 대상                                                            | 처리                                                                                  | 근거                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `report-metric-cards.tsx` 지표 스켈레톤                         | `--`(`METRIC_PENDING_DISPLAY`) + 캡션 그레이. 로컬 `Skeleton`·`keyframes` 통째로 삭제 | DESIGN.md 353·360·604·763 — 「금액·지표는 skeleton 금지」 |
| `analysis-result-modal.tsx` scrim `rgba(15,23,18,0.58)`         | `var(--color-overlay)`                                                                | 토큰이 이미 `rgba(2,9,19,0.5)` 로 존재했다                |
| `analysis-result-modal.tsx` · `analysis-result-view.tsx` 글래스 | `backdrop-filter` 제거. sticky 헤더 배경은 `var(--color-surface)` 로 불투명하게       | DESIGN.md 633 금지 / 882 예외는 홈 히어로 한정            |
| `analysis-result-nav.tsx` 활성 좌측 3px 블루 바                 | `::before` 와 그것만을 위한 `position: relative` 제거                                 | 활성은 배경·글자색·weight 로 이미 3중 전달                |
| `analysis-result-view.tsx` 지시형 히어로                        | `{상권}의 창업 데이터를 확인해 보세요` → 아이브로우 `선택 업종` + `h2 {업종명}`       | 제목이 정보여야 한다(아래 설명)                           |

### 진단에 없었지만 같은 위반이라 함께 처리한 것

- `chat-room-create-modal.tsx` 의 세 번째 하드코딩 scrim(`rgba(17,25,40,0.48)`) → `var(--color-overlay)`.
  같은 역할에 값이 셋이면 정본이 없는 것과 같다. 이제 모달 scrim 은 네 곳 전부 토큰 하나다.
- `report-chart-section.tsx` 의 로컬 `Skeleton` → 공용 `@/components/ui/skeleton`.
  로컬본은 배경이 `--color-border-300`(`#d1d6db`) 이라 DESIGN.md 가 정한 `grey100`(`#f2f4f6`)
  보다 훨씬 무거웠다. 높이도 차트와 같은 `CHART_HEIGHT` 상수에서 뽑아 어긋날 수 없게 했다.
  (로컬본이 갖고 있던 `prefers-reduced-motion` 가드는 `global-styles.ts:196` 의 전역 리셋이
  이미 덮는다 — 잃는 것이 없다.)
- `analysis-result-view.tsx` 의 `Feedback` 죽은 블루 분기 제거. 동작 피드백이 토스트로
  옮겨간 뒤(#146) 호출부가 `$error` 로만 남아 비-error 인 `primary-700` 갈래는 도달 불가였다.

### 지시형 히어로를 왜 저렇게 바꿨나

바로 위 sticky 헤더의 `h1` 이 이미 상권명 + `자치구 · 행정동 · 기간 기준` 을 말하고,
데이터는 이 블록 **아래에** 전부 펼쳐져 있다. 그 사이에서 「{상권}의 창업 데이터를
확인해 보세요」는 상권명을 한 번 더 반복하고 아무것도 더하지 않는다. 헤더가 말하지
않는 유일한 조건인 **업종**을 제목 자리로 올려, 이 액션 행(공유·보관·저장·시뮬레이션)이
무엇에 대한 것인지 제목이 실제로 답하게 했다.

### 범위 밖으로 남긴 것

| 대상                                                                | 사유                                                                                                                                                                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-report-lock-card.tsx` 의 blur 샘플 본문                         | **명세가 명시적으로 요구한다** — `docs/features/analysis/ai-report.md:71` 「잠금 카드(blur 샘플 + 가치 카피 + 로그인 CTA)」. `aria-hidden` 이고 `blur(6px)`·`opacity .6` 라 판독 불가. **유지 결정**(2026-08-27) |
| `analysis-map.tsx:95` · `analysis-map-shell.tsx:210` 흰 표면        | `rgba(255,255,255,0.94)` off-token. 지도 오버레이라 실기기 확인이 필요해 이번 범위에서 뺐다                                                                                                                      |
| `profile-*` 의 "V2 API 계약 대기 중" 4곳, `profile-ui.tsx` 대시보더 | PR4(접근성+상태규격) 범위                                                                                                                                                                                        |

### 회귀 점검

PR1 체크리스트 grep 전부 0 — 비표준 웨이트, vw 폰트 스케일, 네거티브 트래킹, `Sparkles`,
uppercase 아이브로우. `border-radius > 16px` 는 `hero-window.tsx` 2곳(PR-Home)만 남았다.
`backdrop-filter` 는 이제 승인 예외인 `hero-window.tsx`·`hero-section.tsx` 에만 있다 —
DESIGN.md 1286 행의 체크리스트 서술이 다시 사실이 됐다(PR3 전에는 사실이 아니었다).

### 검증

- `pnpm exec vitest run` 142 files / 1206 통과. `resolveMetricCards` 로딩 테스트는 이름이
  「display 빈 문자열」인데 `display` 를 단언하지 않아 규칙을 지키지 못했다 — `--` 를 단언하도록 고쳤다.
- `pnpm qa:verify` 통과.
- dev 5173 실 데이터 — `/analysis/report` 로딩 중 지표 4칸이 `--`(`rgb(139,149,161)`,
  `aria-busy="true"`), 차트 스켈레톤 3개가 `rgb(242,244,246)`(= grey100 정본) · 200px · 1.2s.
- **결과 레이어(`/analysis/result`)의 시각 확인은 이때 하지 못했다.** Browser pane 이 표시
  상태가 아니면 탭이 `document.hidden` 이라 하이드레이션이 미뤄지고 지도 셸이 SSR 마크업만
  남긴다(`document.body.innerText` 43자). PR3 전 커밋에서도 동일하게 재현되므로 이 변경과
  무관한 환경 제약이었다. scrim·sticky 헤더·nav 바·히어로 카피는 **소스와 빌드로만 확인**했다.
  → **2026-08-31 에 실측으로 끝냈다. 4건 전부 통과(§12).**

---

## 10. PR4 실행 결과 (2026-08-28) — 「접근성 + 상태 규격」

착수 전 핸드오프 §3 의 8군을 `origin/develop`(`6a6e258d`) 기준으로 전수 재검증했다.
**8군 중 1군은 이미 해소됐고, 1군은 판정을 뒤집었으며, 2건은 오진이었다.**
대신 진단에 없던 위반 3종을 찾아 함께 처리했다.

| 대상                 | 판정                                                              |
| -------------------- | ----------------------------------------------------------------- |
| ① recommend CTA 대비 | **판정 뒤집음** — 진단의 방향이 접근성을 악화시킨다(아래)         |
| ② 터치 타깃 <36px    | 6건 중 **4건 실제 / 2건 오진**                                    |
| ③ 인라인 폼 에러     | 실제. + `TextField` 가 에러에도 1px 이던 것(정본 2px)을 함께 고침 |
| ④ 시뮬 폼 라벨       | **이미 해소** — 입력·`<select>` 전부 `aria-label` 보유            |
| ⑤ 대시 보더 빈 상태  | 3곳 실재. 일러스트 정본 충돌은 2:1 로 해소                        |
| ⑥ profile 내부사정   | 실제 — 소스 2곳 / 화면 4개                                        |
| ⑦ grey500 캡션 대비  | **정본 자기모순.** 토큰 재지정으로 80여 곳 일괄 해소              |
| ⑧ 스켈레톤 잔여      | **1건만 실제** — 나머지는 블록이라 정본이 허용                    |

### ① 「흰 텍스트」 판정을 뒤집었다 — 정본이 자기모순이다

진단은 `recommend-condition-form.tsx` 의 주 CTA 가 blue500 배경에 charcoal 텍스트인 것을
DESIGN.md §Primary (Fill)「Text `#ffffff`」위반으로 지목했다. **실제 대비비를 재보면 방향이 거꾸로다.**

| 조합                           | 대비비     | AA(4.5:1)  |
| ------------------------------ | ---------- | ---------- |
| `#0ea5e9` + `#191f28` (현재)   | **5.98:1** | 통과       |
| `#0ea5e9` + `#ffffff` (정본)   | **2.77:1** | 미달       |
| `#2272eb`(blue600) + `#ffffff` | 4.49:1     | 미달(0.01) |

즉 §Primary (Fill) 과 §Accessibility「텍스트 대비는 WCAG AA 이상」이 서로를 부정한다.

**그럼에도 흰 텍스트로 통일했다**(승인: 2026-08-28). 근거는 대비가 아니라 **문제의 소재**다.
저장소의 primary 버튼 15곳 중 14곳이 이미 흰 텍스트이고, 미달은 이 버튼 하나가 아니라
**fill 색 `#0ea5e9` 자체**에서 나온다. 한 화면만 charcoal 로 남기면 격차는 그대로인 채
규격만 갈라져 문제가 은폐된다. 해결은 fill 색을 어둡게 하는 디자인 시스템 차원의 결정이고,
PR4(접근성+상태규격)의 범위를 넘는다. 그래서 DESIGN.md §Primary (Fill) 에 **「알려진 격차」
주석**을 박아 두고 별도 슬라이스로 넘겼다.

이 변경은 `recommend-panel.test.ts` 가 `color:var(--color-text-900)` 을 못박고 있던 것을
뒤집는다. 테스트 이름도 `uses high-contrast existing tokens` → `uses the canonical
primary/error tokens` 로 바꿨다 — 더는 고대비를 주장하지 않기 때문이다.

### ⑦ grey500 캡션 — 개별 교체가 아니라 토큰을 재지정했다

`--color-text-caption` = grey500(`#8b95a1`)은 흰 배경 **3.04:1** 로 12px 캡션에 쓰면 AA 미달이다
(large text 예외에 들지 않는다). 그런데 DESIGN.md 는 grey500 을 「Caption text, secondary
labels」에 **명시적으로 배정**한다 — 여기서도 정본이 자기모순이다.

사용처가 40파일 80여 곳이라 「의미 있는 라벨만 골라 교체」는 판정이 주관적이고 diff 가 크다.
대신 **토큰 한 줄을 grey600(`#6b7684`, 4.62:1)으로 재지정**했다(승인: 2026-08-28).
기존 팔레트 토큰이라 「임의 토큰 추가 금지」에 걸리지 않고, 80여 곳이 한 번에 AA 를 넘는다.
DESIGN.md 의 캡션 색 정의 3곳(팔레트·Voice 예시·Empty(filter cleared))도 함께 정정했다.
grey500 은 팔레트에 남는다 — 비활성 텍스트·장식 구분선용이다.

### ② 오진 2건 — 클릭할 수 없는 것은 터치 타깃이 아니다

핸드오프가 「24px 짜리들은 배지·순위 표식일 수 있으니 클릭 가능한 것만 고른다」고 경고한
그대로였다.

- `status-top-ten.tsx` `RankBadge`(24×24) — `styled.span`. 행 전체가 버튼이고 이건 그 안의 표식이다.
- `status-top-ten.tsx` `ValueBarTrack`(min-width 24px) — `styled.span`. 막대그래프의 트랙이다.

실제 위반 4건은 이렇게 갈랐다.

| 위치                             | 조치                                        |
| -------------------------------- | ------------------------------------------- |
| `status-metric-tabs.tsx` 34px    | 36px 로 올림(여유 있음)                     |
| `status-map.tsx` 34px            | 36px 로 올림                                |
| `status-map.tsx` 모바일 32×28    | **크기 유지 + `::after` 로 히트 영역 36px** |
| `status-detail.tsx` compact 28px | **크기 유지 + `::after` 로 히트 영역 40px** |

뒤 둘은 크기를 키우면 안 된다. 지도 배지는 「좁은 캔버스에서 겹침을 완화」하려고 일부러
줄인 것이고(소스 주석), 컴팩트 백버튼은 바텀시트 헤더의 여백 규격이다. `::after` 는 레이아웃을
차지하지 않아 이웃을 밀어내지 않으면서 히트 영역만 넓힌다.

### 진단에 없었지만 같은 위반이라 함께 처리한 것

1. **`TextField` 의 에러 테두리가 1px 이었다.** 정본 §Error (inline field) 는 **2px** 다.
   폼을 `errorText` 에 연결하기만 하면 되는 줄 알았는데, 연결해도 정본대로 안 보이는 상태였다.
2. **`status-detail` 의 빈 상태가 `데이터 없음` 두 글자였다.** 정본 §Voice 「Explain the _why_
   in one line」·「Never `데이터가 없습니다`」 위반. 섹션·패널 전체의 빈 상태라 사유가 필요하다.
   같은 파일이 오류 분기에서는 이미 `상세 현황 데이터가 없어요` 를 쓰고 있었다.
3. **FE 자작 빈 상태 문구 8곳이 `합니다` 종결이었다.** DESIGN.md §10 Voice & Tone 은 `합니다`
   종결을 **법적 고지 전용 단일 예외**로 못박는다. `recommend-page.tsx` 는 한 카드 안에서
   제목 `추천 결과가 없어요` + 본문 `…없습니다.` 로 갈려 있었다.

### 범위 밖으로 남긴 것

| 대상                                       | 왜                                                                                                                                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| primary fill `#0ea5e9` 자체의 AA 미달      | 전 화면 파랑이 바뀐다. 디자인 시스템 결정이라 별도 슬라이스. DESIGN.md 에 「알려진 격차」로 명시                                                                                                                |
| `chatting-unavailable-page.tsx`            | ⑥ 과 같은 내부사정 노출이지만 **페이지 전체**가 REST/STOMP/FCM 계약 카드로 구성돼 있다. 무엇을 대신 보여줄지가 콘텐츠 설계 결정이고 테스트도 `V2 API` 를 고정한다. 접근성 PR 안에서 조용히 재설계할 일이 아니다 |
| 백엔드 `resultMessage` 의 `합니다` 종결    | 404 오류 규약이 **서버 문구를 그대로 출력**하라고 정한다. FE 가 고칠 수 없다 → BE 후속 요청                                                                                                                     |
| 값 자리 `데이터 없음` 표기                 | `formatChartValue`·`formatAnalysisValue`·`formatStatusValue` 등에 걸친 **시스템 전역 규약**이고 테스트 20여 개가 고정한다. 빈 상태 **메시지**와 달리 값을 대체하는 라벨이라 성격이 다르다                       |
| `hero-window.tsx` 24px·20px 라운딩, 글래스 | PR-Home                                                                                                                                                                                                         |

### 회귀 점검

PR1~3 체크리스트 grep 전부 0 유지 — 비표준 웨이트, vw 폰트 스케일, 네거티브 트래킹,
`Sparkles`, uppercase. `backdrop-filter` 는 승인 예외 2파일, `border-radius > 16px` 는
`hero-window.tsx` 2곳(PR-Home)만. **`dashed` 는 PR4 가 새로 0 으로 만들었다.**

### 검증

- `pnpm exec vitest run` **146 files / 1221 통과**(착수 시 142/1206). 테스트 파일 4개 추가 —
  `auth-shell`(인라인 에러 규격 5), `text-field`(2px 3), `status-touch-target`(3),
  `global-styles`(캡션 토큰 대비 2). 스타일 단언은 `ServerStyleSheet` 로 **실제 방출 CSS** 를 본다.
- `pnpm qa:verify` **exit 0**.
- **브라우저 시각 검증을 이때는 하지 못했다.** dev 서버 런처가 접근 불가한 cwd 로 프로세스를
  띄워 `getcwd: Operation not permitted` → pnpm `EPERM: uv_cwd` 로 죽었다. **기존 `develop-5173`
  설정에서도 동일하게 재현**되므로 이 변경과 무관한 환경 제약이었다(원인은 macOS TCC 의
  Documents 폴더 권한 — 저장소가 `~/Documents` 아래에 있다. 우회는 Documents **밖**에 워크트리를
  만들어 거기서 띄우는 것이다). 따라서 §5 가 PR3 에서 넘긴 `/analysis/result` 시각 확인
  (scrim·sticky 헤더·nav 활성·히어로 제목) 4건도 이 시점에는 미완이었다.
  → **2026-08-31 에 실측으로 끝냈다. 4건 전부 통과(§12).**

---

## 11. 잔여 3건 정리 (2026-08-31) — 「스윕의 꼬리」

PR1~4 로 스윕의 본체는 끝났다. 남아 있던 것은 **각 PR 이 범위 밖으로 밀어 둔 자잘한 3건**
뿐이라 번호 붙은 PR 로 세지 않고 한 번에 묶어 걷어냈다. base `ad888c70`.

착수 전에 `origin/develop` 기준으로 다시 재 봤고, 이번에도 **인계 문서가 낡아 있었다.**
인계 이슈 #153 은 PR2 를 「다음 작업」으로 가리키고 있었지만 PR2 는 `#154`(`476e778`)로,
PR3 은 `#156`(`6053ff5`)으로, PR4 는 §10 으로 이미 끝나 있었다. 이슈는 근거를 붙여 닫았다.

| 대상                            | 판정                                                 |
| ------------------------------- | ---------------------------------------------------- |
| `chatting-unavailable-page.tsx` | 실제 — §10 이 「콘텐츠 설계 결정」이라며 미룬 자리다 |
| `route-placeholder-page.tsx`    | 실제 — 죽은 코드 189줄                               |
| `recommend-map.tsx` 미정의 토큰 | 실제 — `--color-primary-200` 1곳                     |
| `*-v1-legacy` 죽은 모듈 3종     | **이미 해소** — 저장소에 0건                         |
| `profile-unavailable-state.tsx` | **이미 해소** — PR4 ⑥ 이 처리했다                    |
| `--color-primary-500` 미정의    | **이미 해소** — `#163`. 지금 남은 언급은 주석뿐      |

### ① 채팅 준비 화면 — §10 이 미룬 이유가 이제 유효하지 않다

§10 은 이 화면을 「무엇을 대신 보여줄지가 콘텐츠 설계 결정」이라 접근성 PR 안에서 다루지
않겠다고 했다. 맞는 판단이었지만, PR4 가 프로필 3화면을 정리하면서 **그 「무엇」의 답이 이미
정해졌다** — `profile-unavailable-state.tsx` 의 「아직 준비 중이에요. 준비되면 이 화면에서
바로 이용할 수 있습니다」가 선례다. 콘텐츠 설계가 아니라 선례 적용이 됐다.

계약 카드 3장(REST·STOMP·FCM)과 백엔드 Notice 를 지우고 상태 칩을 「준비 중」으로 줄였다.
§10 이 걸림돌로 꼽은 「테스트가 `V2 API` 를 고정한다」는 것도 함께 뒤집었다 — 그 테스트는
백로그 노출을 **지키고 있었다.** 지금은 `V2 API`·`REST`·`STOMP`·`FCM`·`백엔드`·`계약` 이
마크업에 **없음**을 단언한다.

### ② 포커스 링 — 정본 두 곳이 같은 값을 말한다

`--color-primary-200` 은 정의된 적이 없어 늘 폴백 `#90c2ff` 가 그려졌다. DESIGN.md
「focus `2px #0ea5e9`」와 `global-styles.ts` 전역 규칙이 일치하고, 저장소의 다른 포커스 링
여덟 자리도 전부 그 규격이다. 판정 뒤집을 것 없이 관행으로 되돌렸다.

**이제 `var()` 로 참조되는 미정의 색 토큰은 저장소에 0건이다.**

### ③ 리뷰가 잡은 것 — 화면만 보고 라우트를 안 봤다

`chatting-unavailable-page.tsx` 에서 「V2 API」·「계약」을 걷어냈지만, **같은 두 라우트의
`metadata.description` 이 그 문구를 그대로 들고 있었다.** `index: false` 가 검색 노출은
막지만 공유 프리뷰는 막지 않아, 링크를 붙이면 OG 카드 본문으로 그대로 떴다.

새로 넣은 「백로그를 노출하지 않는다」 단언도 **컴포넌트 마크업만** 보고 있어서 이 자리를
덮지 못했다. 초록인데 문구는 살아 있었다. 단언 범위를 라우트 소스까지 넓혔다.

**카피 진단은 컴포넌트에서 끝나지 않는다** — 같은 문구가 `metadata`·`aria-label`·테스트
픽스처에 복제돼 있을 수 있다. 이번 스윕에서 다섯 번째로 「진단한 자리 옆에 같은 위반이 있다」
가 반복됐다.

이어서 `route-skeletons.ts` 의 죽은 필드 `title`·`description` 도 걷어냈다. sitemap 은
`path`·`visibility` 만 읽는데, 27개 엔트리가 「이후 인증 폼과 FCM 분기 로직을 이관합니다」
같은 낡은 내부 카피를 나르고 있었다. 다음 사람이 이걸 메타데이터 정본으로 오해하면 방금 고친
누출이 그대로 재발한다.

### 검증

- `pnpm exec vitest run` **154 files / 1350 통과**.
- `pnpm qa:verify` **exit 0**. `next-env.d.ts` 오염은 되돌렸다.
- `/recommend` 실측 — 발행 CSS 가 `outline: 2px solid var(--color-primary-700, #0ea5e9)`,
  `--color-primary-700` → `#0ea5e9`. `/sitemap.xml` 정상(타입 이동 무영향).
- `/sitemap.xml` 이 필드 제거 전후로 같은 4건(`/`·`/status`·`/recommend`·`/community/list`)임을 실측.
- 새 metadata 단언은 **일부러 문구를 되돌려 빨간불이 뜨는 것까지** 확인했다(빈 단언 방지).
- **채팅 화면은 눈으로 못 봤다.** `/chatting/*` 이 로그인 뒤에 있고 자격증명을 넣을 수 없다.
  카피는 `renderToStaticMarkup` 단언과 라우트 소스 단언으로만 확인했다.

### 남은 것

스윕에서 남는 것은 **PR-Home** 하나다. 이슈 #153 이 함께 들고 있던 별건 중
**미사용 dev 엔드포인트 4종**(분석 인기 순위·지원 정책·프로필 이미지·게시글 이미지)과
**BE 요청 2건**(enum 400 봉투, `ShareTargetType` 시뮬레이션 상수)은 성격이 달라 넘긴다.

---

## 12. `/analysis/result` 시각 검증 (2026-08-31) — PR3·PR4 가 두 번 미룬 4건

§9·§10 이 환경 제약으로 미룬 결과 레이어 시각 확인을 `develop` `0661f7e6` 에서 끝냈다.
**4건 전부 통과.** 스크린샷이 아니라 `getComputedStyle` 계산값으로 쟀다 — 이 화면은 지도
타일과 애니메이션 때문에 스크린샷이 판정 근거가 되기 어렵다.

| 확인 항목     | 정본                                              | 실측                                                                                                                                  | 판정                     |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 모달 scrim    | `--color-overlay` = `rgba(2,9,19,0.5)`, blur 없음 | `rgba(2, 9, 19, 0.5)` / `backdrop-filter: none`                                                                                       | ✅ 토큰 일치             |
| sticky 헤더   | 불투명 흰색, 아래 내용이 비치지 않음              | `rgb(255,255,255)` / `opacity: 1` / `backdrop-filter: none` / `z-index: 10`                                                           | ✅                       |
| 좌측 nav 활성 | 좌측 바 없이도 구분                               | `background: rgb(232,243,255)`(blue50) + `color: rgb(14,165,233)`(blue500) + `font-weight: 700`(비활성 600), `border-left-width: 0px` | ✅ 3중 구분              |
| 히어로 제목   | 「선택 업종」 아이브로우 + 업종명                 | `<h1>역삼역 4번</h1>` + 아이브로우 `선택 업종` + `<h2>한식음식점</h2>`                                                                | ✅ 지시형 문구 잔재 없음 |

### 재현 경로 — 코드를 URL 에 직접 박으면 안 된다

테스트 픽스처의 코드(`commercialCode=3110008`)를 URL 에 넣으면 **화면이 그 코드를 버리고**
`/analysis` 로 되돌아간다. #170-3 이 넣은 동작이 정상 작동하는 것이다 — 목록에 없는 코드는
버린다. dev 데이터의 실제 코드를 UI 로 골라야 한다.

통과한 경로: `/analysis` → 강남구 → 역삼1동 → `역삼역 4번`(`commercialCode=3110958`) →
`한식음식점`(`CS100001`) → `분석 결과 보기` → `[role="dialog"]` 등장.

### 함께 확인된 접근성 격차 (이 PR 밖)

활성 nav 의 `#0ea5e9` on `#e8f3ff` 는 **2.47:1** 로 AA 에 한참 못 미친다. 활성 표시 자체는
배경·글자색·weight 3중이라 의미 전달은 되지만 글자 판독성이 나쁘다. 원인은 §10 ① 의 primary
fill 과 **같다** — `#0ea5e9` 가 전경으로 쓰기엔 밝다. 「fill 색을 어둡게 하는 디자인 시스템
결정」에 이 자리도 함께 묶어야 한다.
