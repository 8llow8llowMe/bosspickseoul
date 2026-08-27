# UX/AI-slop 정리 스윕 — 설계 명세

- 작성일: 2026-08-14
- 브랜치: `feature/fe/ux-slop-sweep` (base `develop`)
- 범위: 프론트엔드 전용. DESIGN.md 정본 준수, 백엔드 API 계약 변경 없음.
- 상태: **PR1 구현 완료(2026-08-27, base `d39002f`)** · PR2~4·PR-Home 미착수
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
