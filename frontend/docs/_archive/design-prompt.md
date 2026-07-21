# NowDoBoss V2 — Design Prompt (Claude Design / Figma AI 단일 입력 문서)

> **이 한 파일을 그대로 디자이너 AI에 입력**하면 NowDoBoss V2의 디자인 시스템 + 화면 시안 + 인터랙션 프로토타입을 일관되게 생성할 수 있도록 작성된 self-contained 사양서.
>
> 통합 출처: `frontend/DESIGN.md` (Toss-based 디자인 시스템) · `frontend/docs/design-redesign-tasks.md` (재작업 큐) · `frontend/docs/migration-inventory.md` (라우트 매핑) · `backend/docs/api-screens.md` · `backend/docs/feature-status.md`

---

## 0. 빠른 안내 (디자이너 AI에게)

- **너의 역할**: NowDoBoss V2 웹앱의 디자인 시스템 페이지 1개 + 핵심 화면 시안 약 25개 + 인터랙션 프로토타입 6개를 만든다.
- **톤**: Toss(toss.im) 기준 — 차분하고 자신감 있는 핀테크 톤. 단, NowDoBoss는 핀테크가 아니라 **소상공인 예비 창업자용 상권 분석 + AI 컨설팅** 서비스다. Toss의 "정돈됨"은 가져오되 "금융" 어휘는 빼라.
- **언어**: 한국어 단일. UI 카피는 모두 한국어. 폰트 fallback chain은 §2.3 참조.
- **모바일 우선**: 375px 베이스라인. 데스크탑(>768px)은 가운데 정렬 컬럼으로 모바일과 패리티.
- **금지**: 이모지, 컬러 그림자, 글래스모피즘, 그라디언트 장식, 핑크/오렌지를 primary로 사용, viewport 기반 폰트 스케일링, 네거티브 letter-spacing.

---

## 1. 제품 컨텍스트

### 1.1 한 줄 정의

서울시 상권·유동인구·매출·인구 데이터를 기반으로 **소상공인 예비 창업자**가 "어디서, 어떤 업종으로 시작할지"를 결정하도록 돕는 **데이터 + AI 컨설팅 웹 서비스**.

### 1.2 사용자

- **20~30대 청년 창업 예비자** — 트렌디한 상권 + 빠른 의사결정.
- **40~50대 재취업 창업 예비자** — 안정적 거주 상권 + 위험 회피.
- **자영업 운영자** — 내 상권 모니터링 + 비교.

### 1.3 차별점

1. 상권 6종 프리셋 추천: `BALANCED / AGGRESSIVE_OPPORTUNITY / STABLE_LOW_RISK / LOW_BUDGET_RESIDENT / YOUTH_STARTUP / RE_EMPLOYMENT_STARTUP`
2. 상권 vs 행정동 vs 자치구 **3계층 비교** + 상권 A/B 비교
3. **AI 리포트(LLM)** — 비동기 잡 모델(POST → jobId 폴링)로 자연어 인사이트 제공
4. 북마크·커뮤니티로 의사결정 기록·공유

### 1.4 무드

- 데이터를 다루지만 **처음 창업하는 사람이 압도되지 않도록** 친근하고 정돈됨.
- 참고 톤: Toss의 정돈된 정보 밀도 + 당근마켓의 친근함.
- **금지**: 과한 그라디언트, 게임 같은 색감, 화려한 일러스트.

---

## 2. 디자인 시스템

### 2.1 비주얼 분위기 (Toss 기반)

깨끗한 화이트 캔버스(`#ffffff`) 위에 진한 차콜 헤딩(`#191f28`)과 시그너처 블루(`#0ea5e9`)가 모든 인터랙티브 액센트로 작동. 차가운 기관 블루가 아닌 **밝고 낙관적인 cerulean**. OKLCH 색공간 기반으로 동일 스케일 단계에서 hue가 달라도 명도가 일정. 그림자는 단일 레이어 검정 opacity로 절제. 트러스트는 깊이가 아닌 **명료함**에서 온다.

### 2.2 컬러 토큰

#### Primary

| 역할          | 토큰         | Hex                                                |
| ------------- | ------------ | -------------------------------------------------- |
| Primary       | `blue500`    | `#0ea5e9` (Toss Blue — CTA, 링크, 활성 상태, 선택) |
| Primary Hover | `blue600`    | `#2272eb`                                          |
| Primary Soft  | `blue50`     | `#e8f3ff` (정보성 배경, 약한 블루 surface)         |
| Background    | `background` | `#ffffff`                                          |
| Heading       | `grey900`    | `#191f28` (warm near-black)                        |

#### Semantic

| 역할           | 토큰        | Hex       |
| -------------- | ----------- | --------- |
| Error / Danger | `red500`    | `#f04452` |
| Success        | `green500`  | `#03b26c` |
| Warning        | `orange500` | `#fe9800` |
| Caution        | `yellow500` | `#ffc342` |
| Info Accent    | `teal500`   | `#18a5a5` |
| Premium        | `purple500` | `#a234c7` |

#### Neutral Scale (warm undertones)

| 토큰      | Hex       | 용도                                   |
| --------- | --------- | -------------------------------------- |
| `grey50`  | `#f9fafb` | 가장 옅은 surface                      |
| `grey100` | `#f2f4f6` | 보조 배경, 카드 fill, disabled surface |
| `grey200` | `#e5e8eb` | 기본 테두리, 디바이더, 인풋 배경       |
| `grey300` | `#d1d6db` | 강조 테두리, active input outline      |
| `grey400` | `#b0b8c1` | 플레이스홀더, disabled 아이콘          |
| `grey500` | `#8b95a1` | 캡션, 부속 라벨                        |
| `grey600` | `#6b7684` | 본문, 설명, 메타데이터                 |
| `grey700` | `#4e5968` | 강조 본문, 서브 헤딩                   |
| `grey800` | `#333d4b` | 강한 라벨, 네비 텍스트                 |

#### Score Scale (NowDoBoss 고유)

- `--score-high`: 등급 HIGH (예: `green500`) — 종합 점수 70점 이상
- `--score-mid`: 등급 MEDIUM — 40~70점
- `--score-low`: 등급 LOW — 40점 미만
- 색상만 의존하지 말고 **명도 차 + 숫자 라벨**도 함께 표시(컬러 블라인드 대응).

#### Overlay

- `overlay scrim`: `rgba(2,9,19,0.5)` ~ `rgba(2,9,19,0.91)` (blue-tinted dark)

### 2.3 타이포그래피

#### 폰트 스택

- **Primary**: `"Toss Product Sans", "Tossface", "SF Pro KR", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", Roboto, "Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif`
- **실제 구현 폰트**: Toss Product Sans 자산 미확보 → **Pretendard** 사용. 시안에서는 Pretendard로 그려도 무방.
- **Mono**: `"SF Mono", SFMono-Regular, Menlo, Consolas, monospace`

#### 위계

| Role           | Size | Weight | Line Height | Notes                    |
| -------------- | ---- | ------ | ----------- | ------------------------ |
| Display Hero   | 30   | 700    | 40 / 1.33   | 스플래시·히어로          |
| Display Large  | 26   | 700    | 36 / 1.38   | 섹션 헤더, 핵심 지표     |
| Heading Large  | 22   | 700    | 30 / 1.36   | 모달 헤더, 기능 타이틀   |
| Heading        | 20   | 600    | 28 / 1.40   | 카드 헤딩, 서브섹션      |
| Subtitle       | 16   | 600    | 24 / 1.50   | 네비 타이틀, 리스트 헤더 |
| Body Large     | 16   | 400    | 24 / 1.50   | 설명                     |
| Body           | 14   | 400    | 22 / 1.57   | 표준 본문                |
| Body Small     | 13   | 400    | 20 / 1.54   | 보조 정보                |
| Caption        | 12   | 400    | 18 / 1.50   | 타임스탬프, fine print   |
| Number Display | 30+  | 700    | tight       | 매출·금액 — tabular-nums |

#### 원칙

- 8개 weight 중 **3개만** 사용: 400(본문) / 600(강조) / 700(헤딩·숫자).
- **숫자는 타이포그래피**: 매출·금액·점수는 700 weight + tabular-nums + 우측 정렬(리스트).
- 한글-라틴 광학 균형. 둘 다 같은 라인에서 자연스럽게.

### 2.4 스페이싱

- 베이스 단위: **8px**
- 사용 가능 값: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64`
- 모바일 좌우 패딩: `20px` (일반 16보다 약간 넓게)
- 데이터 그리드 내부: `4~8px` (밀집)
- 화면 간 그룹: `24px+`

**숨 쉴 공간 원칙**: 핵심 지표(매출·점수)는 주변 텍스트 대비 **1.5배 이상의 여백**. 압축은 cheap해 보이고, NowDoBoss는 의사결정 신뢰가 핵심.

### 2.5 라디우스 (5단만 허용)

| 단계        | 값     | 용도                         |
| ----------- | ------ | ---------------------------- |
| Compact     | 4px    | 작은 배지, 인라인            |
| Standard    | 8px    | 인풋, 작은 버튼, 컴팩트 카드 |
| Comfortable | 12px   | 표준 카드, 다이얼로그        |
| Large       | 16px   | 피처 카드, bottom sheet 상단 |
| Pill        | 9999px | 토글, chip, avatar           |

**금지**: 17~99px 사이의 임의 라디우스. 기존 V1 잔존 `>20px` 카드 라디우스 제거 대상.

### 2.6 그림자 / Elevation

| Level        | 값                            | 용도                     |
| ------------ | ----------------------------- | ------------------------ |
| 0 (Flat)     | 없음                          | 페이지 배경, 인라인      |
| 1 (Subtle)   | `0 1px 3px rgba(0,0,0,0.06)`  | 미세한 들림, 리스트 분리 |
| 2 (Standard) | `0 2px 8px rgba(0,0,0,0.08)`  | 카드, 콘텐츠 패널        |
| 3 (Elevated) | `0 4px 12px rgba(0,0,0,0.12)` | 드롭다운, 팝오버, FAB    |
| 4 (Modal)    | `0 8px 24px rgba(0,0,0,0.16)` | bottom sheet, 다이얼로그 |

**원칙**: 모두 단일 레이어, 순수 검정 opacity. **컬러 그림자 금지**. 멀티 레이어 elevation 스택 금지.

### 2.7 모션 & 이징

#### Duration

| 토큰              | 값    | 용도                                  |
| ----------------- | ----- | ------------------------------------- |
| `motion-instant`  | 0ms   | 토글 즉시 전환                        |
| `motion-fast`     | 150ms | hover, focus, 작은 reveal, 버튼 press |
| `motion-standard` | 250ms | sheet 열기, 카드 펼침, 탭 전환        |
| `motion-slow`     | 400ms | 강조 트랜지션, 성공 체크마크          |
| `motion-page`     | 350ms | 풀스크린 라우트 전환                  |

#### Easing

| 토큰            | Curve                               | 용도                        |
| --------------- | ----------------------------------- | --------------------------- |
| `ease-enter`    | `cubic-bezier(0.0, 0.0, 0.2, 1)`    | 등장 — sheet, toast         |
| `ease-exit`     | `cubic-bezier(0.4, 0.0, 1, 1)`      | 퇴장 — dismiss              |
| `ease-standard` | `cubic-bezier(0.4, 0.0, 0.2, 1)`    | 양방향 — 카드 collapse      |
| `ease-spring`   | `cubic-bezier(0.34, 1.56, 0.64, 1)` | **예약** — 사용처 거의 없음 |

**축소 모션**: `prefers-reduced-motion: reduce` 시 모든 motion 토큰 → `motion-instant`. 슬라이드 → 크로스페이드.

### 2.8 아이콘

- **단일 라이브러리**: `lucide-react`. 다른 아이콘 라이브러리와 섞지 말 것.
- 색상: 항상 `currentColor` (하드코딩 금지).
- Stroke: 1.5~2px 일관.
- 사이즈: 인라인 16px / 버튼 18px / 단독 24px / 피처 32~48px.
- **이모지 사용 절대 금지**.

### 2.9 보이스 & 톤

#### 원칙

- 친근하지만 정돈됨 (Toss 톤). 차분, 자신감, 군더더기 없음.
- 한국어가 1차 언어. 문장은 마침표로 끝, **버튼 라벨은 마침표 없음**.
- **금지 문구**:
  - `불편을 드려 죄송합니다`
  - `Oops`, `죄송하지만`
  - `문제가 발생했습니다`
  - `데이터가 없습니다` (대신 "왜 비었는지" + 1개 행동)
  - 금액 어림수 (`약 120만원` 금지 — 정확한 숫자만)

#### 컨텍스트별 톤

| 컨텍스트            | 톤                                      | 예시                                           |
| ------------------- | --------------------------------------- | ---------------------------------------------- |
| CTA                 | 명령형 동사 + 짧은 한국어               | `로그인`, `저장하기`, `분석하기`               |
| 성공 토스트         | 과거형 한 문장 + 이모지 없음            | `관심 항목에 저장했어요`                       |
| 에러 메시지         | 구체적 + 비난 없음 + 행동 가능          | `이메일 형식이 맞는지 확인해주세요`            |
| 온보딩              | 2인칭, 화면당 한 아이디어               | (불릿 리스트 금지)                             |
| 빈 상태 (첫 사용)   | 왜 비었는지 한 문장 + 1개 secondary CTA | `아직 저장한 항목이 없어요` + `지금 추천 받기` |
| 빈 상태 (필터 결과) | 한 줄 grey 캡션, 버튼 없음              | `조건에 맞는 결과가 없어요`                    |

### 2.10 컴포넌트 라이브러리 (이 8종 + 보조)

#### 8종 Primitive

1. **Button** — variant: `primary` / `secondary` / `dark` / `danger` / `ghost`. size: `tiny` / `medium` / `large` / `big`. display: `inline` / `block` / `full`.
2. **TextField** — bg `grey100`, border `grey200`, focus `blue500` 2px, error `red500` 2px. height 44 또는 48.
3. **Card** — white, 12px radius, optional `1px grey200` 또는 무테, Level 2 shadow.
4. **Badge** — pill, score 등급 표시(HIGH/MEDIUM/LOW), 트렌드(↑↓→), 프리셋명.
5. **Tabs** — active: blue text 또는 blue underline. inactive: grey text. 가로 스크롤 모바일.
6. **Dialog** — centered modal + bottom-sheet 양쪽 base. 16px top radius (sheet).
7. **EmptyState** — 일러스트(라인) + 한 줄 + **CTA 1개**.
8. **Skeleton** — `grey100` block, 1.2s shimmer (8% white). 금액·지표는 **`--`** fallback (skeleton 금지 — 가짜 값처럼 보임).

#### 보조 컴포넌트

- Toast (`grey900` bg, white 14/400 텍스트, 3s auto-dismiss, 하단 20px 인셋)
- Tooltip (`grey900` bg, white 텍스트, arrow)
- Bottom Sheet (16px top radius, scrim `rgba(2,9,19,0.5)`)
- Toggle / Checkbox / Radio (active blue500)
- Combobox (검색 자동완성 — 글로벌 검색용)
- SegmentedControl (프리셋 6종, 정렬 토글)
- Chip (필터, 카테고리, reasonTags)
- DataTable (자치구 TOP10, 신고 대시보드)
- Chart 래퍼: Bar (수직/수평) / Line / Stacked Bar / Donut
- Avatar (32~48px, fallback: 단일 grey)
- BreadCrumb / Pagination (커서 기반 "더 보기")

#### Do / Don't

**Do**

- Blue는 인터랙션·선택·active state에만.
- 숫자는 700 weight + tabular-nums.
- Positive: green / Negative: red / Pending: orange.
- weak 정보 배경: `blue50`.

**Don't**

- Brand Blue(`#0064FF`)와 UI Blue(`#0ea5e9`) 혼동 금지 — Brand는 로고/마케팅 전용.
- 무거운 그림자, 컬러 그림자 금지.
- Body 텍스트에 700 weight 금지.
- 16px 초과 라디우스(pill 제외) 금지.
- 따뜻한 액센트(orange/pink)를 primary CTA로 사용 금지.

---

## 3. 정보구조 (IA)

### 3.1 사이트맵 — V2 실제 30개 라우트

라우트 그룹 2개:

- **`(auth)`** — 헤더/푸터 없음. 비로그인 진입.
- **`(shell)`** — GNB 적용. 메인 셸.

```
(auth)
  /login
  /register
  /register/general
  /account-deleted

(shell)
  /                          홈 (자치구 grid + 추천 진입)
  /status                    시스템/배치 상태
  /recommend                 업종/프리셋 기반 추천
  /analysis                  분석 진입(자치구·업종 선택)
  /analysis/result           분석 결과 (탭 6종 + AI)
  /analysis/simulation       분석 컨텍스트 시뮬 진입
  /analysis/simulation/report
  /analysis/simulation/compare
  /simulation                창업 비용 시뮬 폼
  /simulation/report
  /simulation/compare
  /community/list            커뮤니티 피드 + 검색
  /community/[communityId]   게시글 상세 + 댓글
  /community/register        글쓰기/수정 (?id= / ?from=compare)
  /chatting/list             채팅방 리스트
  /chatting/[roomId]         채팅방 상세
  /share/[token]             공유 토큰 리포트 (비로그인 가능)
  /member/loading/[provider] 소셜 OAuth 콜백
  /profile/settings          마이페이지
  /profile/settings/edit
  /profile/settings/change-password
  /profile/settings/withdraw
  /profile/bookmarks         북마크 진입
  /profile/bookmarks/analysis
  /profile/bookmarks/recommend
  /profile/bookmarks/simulation
```

### 3.2 글로벌 네비게이션

#### 데스크탑 (>768px)

- 좌: 로고
- 중: `홈` `추천` `분석` `커뮤니티` `채팅`
- 우: 검색(자동완성 combobox) → 프로필 메뉴(아바타+이름) / 비로그인 시 `로그인` 버튼

#### 모바일 (<480px)

- 상단 헤더: 로고 + 검색 아이콘 + 햄버거(슬라이드 메뉴)
- **BottomNav 미도입** (V2 1차 결정). 향후 검토.
- Sticky bottom CTA bar는 화면별로 사용 가능.

#### Footer (모든 화면 동일)

- 서비스 설명 + 약관/개인정보처리방침 + 깃허브 링크 (white surface, 가벼움)

### 3.3 인증 가드 매트릭스

| 분류                       | 라우트                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **public**                 | `/`, `/status`, `/recommend`, `/analysis`, `/analysis/result`, `/community/list`, `/community/[id]`(읽기), `/share/[token]`, `/(auth)/*` |
| **auth-required**          | `/community/register`, `/profile/**`, `/simulation/**`, `/analysis/simulation/**`, `/chatting/**`, AI 분석 탭 진입                       |
| **role-required(MANAGER)** | (V2 1차 미포함)                                                                                                                          |

#### 401/만료 동작

- 만료 access token: 인터셉터가 `POST /auth/token/reissue` 자동 호출 → 원 요청 재시도. **사용자 화면 변화 없음**.
- refresh 만료: 토큰 정리 → `/login?redirect={현재 경로}` + 토스트 "다시 로그인이 필요해요".
- public 화면에서 auth 액션(좋아요/북마크/글쓰기) 클릭: **페이지 이동 없이 인라인 모달** ("로그인이 필요해요" + `로그인` `회원가입`).

### 3.4 반응형 브레이크포인트

| Name    | 폭        | 변화                                                    |
| ------- | --------- | ------------------------------------------------------- |
| Mobile  | <480px    | 풀 디자인 충실도, 375 베이스라인, 좌우 20px 패딩        |
| Tablet  | 480~768px | 카드 확장, 옵션 사이드 마진                             |
| Desktop | >768px    | 가운데 정렬 컬럼, max-width 약 480~1280px (화면별 결정) |

#### Touch target

- 버튼 사이즈: xlarge(56) / large(48) / medium(40) / small(36)
- 리스트 row: 최소 52px
- 모바일 헤더 액션: 최소 40px, 주요 액션 48px+

---

## 4. 공통 패턴

### 4.1 상태 표현 (모든 화면 공통)

| 상태                        | 처리                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Empty (첫 사용)**         | grey700 본문 한 단락(왜 비었는지) + `secondary` 버튼 1개 (blue50 bg, blue500 text). **일러스트 없음**.    |
| **Empty (필터 결과 없음)**  | grey500 캡션 한 줄. 버튼 없음 — 사용자가 필터 직접 리셋.                                                  |
| **Loading (첫 페인트)**     | Skeleton block (`grey100`, 컴포넌트 라디우스에 맞춤, 1.2s shimmer). **금액·지표는 `--`** (skeleton 금지). |
| **Loading (refresh)**       | 상단 풀다운 spinner blue500. **블로킹 오버레이 금지**. 이전 값 유지.                                      |
| **Error (인라인 필드)**     | 인풋 2px red500 border + 그 아래 red500 13px 한 문장 (행동 가능한 카피).                                  |
| **Error (toast)**           | grey900 bg, white 14/400, 3s 자동 dismiss, 하단 20px 인셋. 한 문장. **아이콘 없음**.                      |
| **Error (스크린 블로킹)**   | 서버 outage 전용. white 화면, grey900 16/600 한 줄, blue500 retry 버튼. **일러스트 없음**.                |
| **Success (인라인 플래시)** | 업데이트된 요소 뒤로 blue50 배경 깜빡(300ms fade). 토글 등 routine 액션.                                  |
| **Disabled**                | 버튼 opacity 다운. 인풋 border는 `grey200` 유지(geometry stable).                                         |
| **Loading inside button**   | 텍스트 → 3-dot white 애니메이션 교체. **버튼 폭 변경 없음**. 더블 submit 방지.                            |

### 4.2 토스트 / 다이얼로그

#### Toast 위치

화면 하단 중앙, 20px 인셋, `motion-fast / ease-enter`로 등장, 3s 후 `motion-fast / ease-exit`.

#### Confirm Dialog

- 헤더 (Heading Large, grey900)
- 본문 (Body, grey600)
- CTA: secondary("취소") + primary 또는 danger ("삭제" 등) — **항상 2개**

### 4.3 AI 비동기 폴링 — 7 UI 상태 (가장 중요)

> 백엔드: `POST /api/v1/ai-reports/commercials/{code}` → 200(CACHED) 즉시 / 202(ACCEPTED) jobId → `GET /api/v1/ai-reports/jobs/{jobId}` 폴링.
> **디자이너는 아래 7상태를 각각 별도 시안으로** 그릴 것.

```
idle → submitting → ┬── cached (200)        → completed
                    └── accepted (202)      → queued → running → ┬── completed
                                                                  └── failed
                                                                  └── timeout
```

| 상태           | 트리거                        | 화면 표현                                                      | 카피                                                          |
| -------------- | ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| **idle**       | AI 탭 첫 진입 전              | 비활성 카드 + primary 버튼                                     | `AI에게 이 상권을 분석시켜 보세요` / 버튼: `AI 분석 시작하기` |
| **submitting** | POST 요청 중 (~500ms)         | 버튼 spinner                                                   | `분석 요청 중…`                                               |
| **cached**     | 응답 200                      | 결과 카드 220ms fade-in + 캡션 배지                            | `5분 전 생성된 분석` (상대 시간)                              |
| **queued**     | 202 → status `PENDING`        | step-bar 4단(`수집 → 분석 → 작성 → 완료`) 1단 활성 + dot pulse | `분석 준비 중이에요`                                          |
| **running**    | status `RUNNING`              | step-bar 2~3단 활성 + 타이핑 dot                               | `AI가 분석 중이에요. 보통 10~30초 걸려요.`                    |
| **completed**  | status `COMPLETED`            | 결과 카드 5블록 fade-in + "방금 생성됨" 캡션                   | (결과 본문)                                                   |
| **failed**     | status `FAILED` 또는 4xx      | red 알림 카드 + retry 버튼                                     | (ErrorCode 매핑 표 참조)                                      |
| **timeout**    | 60초 폴링해도 PENDING/RUNNING | grey 알림 카드 + retry 버튼                                    | `분석에 시간이 오래 걸려요. 잠시 후 다시 시도해주세요.`       |

#### 결과 카드 5블록 구조

1. **한 줄 요약** (`summary`) — Heading Large 22px, 강조
2. **강점** — green 액센트 + 체크 아이콘
3. **약점·위험** — orange 액센트 + 경고 아이콘
4. **추천 업종 / 시간대** — chip 리스트
5. **다음 행동 제안** — bullet 리스트 + `북마크` `비교에 추가` CTA

#### ErrorCode 카피 매핑

| 코드                | 사용자 카피                                                 |
| ------------------- | ----------------------------------------------------------- |
| `AI_001`            | 분석 데이터를 불러오지 못했어요.                            |
| `AI_002` / `AI_003` | AI 분석이 일시적으로 중단됐어요. 잠시 후 다시 시도해주세요. |
| `AI_005`            | (사용자 노출 X — 자동 재제출)                               |
| `AI_009`            | 분석에 시간이 오래 걸려 중단됐어요. 다시 시도해주세요.      |

#### 비교/자치구/행정동 AI 리포트

비동기 미적용(레거시 동기 GET). **submitting → completed** 2단만 사용. 응답 3~30초 → skeleton + `AI가 분석 중이에요` 카피 필수.

### 4.4 인증 모달 (auth-required 액션 트리거 시)

- 헤더: `로그인이 필요해요` (Heading Large)
- 본문: `이 기능을 사용하려면 로그인해주세요.` (Body, grey600)
- CTA: `로그인` (primary) / `회원가입` (secondary) / X 닫기

---

## 5. 화면별 사양

> 각 화면 = 목적 / 레이아웃 / 핵심 컴포넌트·데이터 / 상태(empty·loading·error·success) / 마이크로 카피

### 5.1 (auth) 그룹

#### S-AUTH-1. `/login`

- **목적**: 이메일/비번 + 소셜 로그인
- **레이아웃**: 중앙 정렬 카드(420px). 로고 → 폼 → 소셜 버튼 → 푸터 링크.
- **컴포넌트**: TextField(email), TextField(password, show toggle), Checkbox(자동 로그인), Button(`로그인`, primary, full), Divider("또는"), SocialButton × 2(Kakao 노란색 가이드 / Google).
- **상태**: 인라인 검증, 401 → 인풋 하단 `이메일 또는 비밀번호가 올바르지 않아요`.
- **호출**: `POST /api/v1/auth/login`.

#### S-AUTH-2. `/register`

- **목적**: 회원가입 1단계 (이메일 + 인증코드 + 비밀번호)
- **레이아웃**: 단계 표시(1/2) + 폼.
- **컴포넌트**: TextField(email), Button(`인증코드 받기`, secondary), TextField(인증코드), TextField(password + 강도 미터), TextField(password 확인).
- **인라인 에러**: `이메일 형식이 맞는지 확인해주세요`, `이미 가입된 이메일이에요`, `8자 이상, 영문·숫자를 섞어주세요`, `비밀번호가 같지 않아요`.

#### S-AUTH-3. `/register/general`

- **목적**: 회원가입 2단계 (닉네임 + 약관 동의)
- **컴포넌트**: TextField(닉네임 + 중복 체크), Checkbox 4개(필수 2 + 선택 2), Button(`가입 완료`, primary, disabled until 필수 동의).

#### S-AUTH-4. `/account-deleted`

- **목적**: 탈퇴 완료 안내(정적)
- **레이아웃**: 중앙 텍스트 + `홈으로` 버튼.
- **카피**: `탈퇴가 완료됐어요`, `이용해주셔서 감사했어요`.

#### S-AUTH-5. `/member/loading/[provider]`

- **목적**: OAuth 콜백 처리 + 신규 가입자 닉네임 단계
- **레이아웃**: 중앙 spinner + `잠시만 기다려주세요`. 신규면 닉네임 입력 시트.

### 5.2 (shell) Home & Discovery

#### S-HOME. `/` (홈)

- **목적**: 자치구 grid + 추천 진입 + 빠른 액션
- **레이아웃**:
  - Hero: H1 (Display Large 26px) `오늘은 어디서 시작해볼까요?` + 한 줄 설명 + primary CTA `추천 받기` (1개만).
  - 섹션 1: **자치구 TOP10** (가로 스크롤 카드). 각 카드: 자치구명, 종합 점수(700/tabular-nums), 상승/하락 배지(↑↓→), `자세히 보기` 보조 액션.
  - 섹션 2: 빠른 분석 진입 (3~4개 row): `업종으로 추천 받기` `상권 분석` `시뮬레이션` `커뮤니티`.
  - 섹션 3: 최근 본 상권 (로그인 사용자만, 없으면 숨김).
- **호출**: `GET /api/v1/districts/top-ten`, `GET /api/v1/map/districts` (lite).
- **상태**: loading → 자치구 카드 6칸 skeleton. error → 토스트.
- **금지**: 마케팅 hero 그라디언트, decorative glow, glass panel.

#### S-DISC-1. `/recommend`

- **목적**: 업종/프리셋 기반 추천 결과
- **레이아웃**:
  - 상단 폼 카드: 자치구 Combobox + 업종 Combobox + 프리셋 SegmentedControl(6종) + Button `추천 받기`.
  - 결과: rank 카드 그리드(데스크탑) 또는 리스트(모바일). 각 카드: rank 배지, 상권명, compositeScore + grade 배지, reasonTags chip 3개, 미니 KPI 4(매출·유동·점포·거주), `상세 보기` CTA, ★북마크.
- **호출**: 1) `GET /api/v1/map/candidate-presets` 2) `GET /api/v1/commercials/candidates` 또는 `/recommendations/by-service`.
- **상태**: loading → 카드 6칸 skeleton. empty → `조건에 맞는 상권이 없어요. 프리셋을 바꿔보세요.` + 프리셋 chip.

#### S-DISC-2. `/analysis`

- **목적**: 분석 진입 — 자치구·행정동·업종·분기 선택
- **레이아웃**: 단계별 폼 카드. 각 단계 완료 시 다음 단계 펼침. 마지막에 `분석 시작` primary CTA.
- **컴포넌트**: 자치구 Combobox → 행정동 Combobox → 업종 Combobox → 분기 Select(기본 `2023년 3분기`).
- **호출**: `GET /districts`, `GET /map/administrations`, `GET /regions/code-lookup`(자동완성).

#### S-DISC-3. `/analysis/result`

- **목적**: 분석 결과 — 한 상권의 모든 데이터
- **레이아웃**:
  - 헤더: 상권명 + 위치 + ★북마크 + `비교에 추가` + `공유`.
  - 메타 배지 row: `2023년 3분기 기준`, `활성화 상권`, `30대 주요 상권`, `저녁 장사가 강한`(있을 때).
  - **Tabs (sticky)**: `요약 / 유동인구 / 매출 / 점포 / 시설 / 거주 / 소득 / 트렌드 / 벤치마크 / AI 분석`.
  - 본문: 탭별 차트 + 인사이트 카드.
  - 우측 사이드(데스크탑) 또는 하단(모바일): **3계층 비교** — "우리 상권 vs 행정동 vs 자치구" 미러 막대.
- **탭별 데이터**:
  - 요약: KPI 그리드 6칸 (매출·유동·점포·유사업종·거주·소득) + 미니 도넛(개·폐업률).
  - 유동인구: 시간대 6단 막대 + 요일 막대 + 연령 막대 + 성별 도넛.
  - 매출: 같은 구조 + 매출 vs 유사업종.
  - 점포: 개·폐업률, 평균 운영기간, 신생률.
  - 시설: 학교/관공서/지하철/버스 카운트(아이콘 + 숫자).
  - 거주: 인구 피라미드.
  - 소득: 평균 소득·지출 + 분포.
  - 트렌드: 분기별 라인 + `trendDirection` 배지(↑↓→) + changeRate 라벨.
  - 벤치마크: 동일 자치구 평균과 z-score 막대.
  - **AI**: §4.3 7상태 폴링.
- **호출**: 탭은 lazy load. AI 탭은 auth 필수 — 비로그인 시 잠금 카드 + `로그인하고 분석 보기` CTA.

### 5.3 (shell) Simulation & Share

> ⚠️ 시뮬레이션은 V1 → V2 FE 이관됨. **V2 BE 미정** — 시안에 "BE 미정" 주석 표시 권장.

#### S-SIM-1. `/simulation` 및 `/analysis/simulation`

- **목적**: 창업 비용 시뮬레이션 폼 (보증금·월세·인건비·재료비·예상 매출 등)
- **레이아웃**: 단계별 폼(3단 정도). 각 단계 진행 indicator 상단.
- **컴포넌트**: TextField(숫자, tabular-nums), 단위 라벨(`만원`, `명`, `시간` 등), 슬라이더(예상 매출 변동), Button(`다음`, primary).
- **분석 컨텍스트** (`/analysis/simulation`): 상단에 분석한 상권 카드 sticky 표시.

#### S-SIM-2. `/simulation/report` 및 `/analysis/simulation/report`

- **목적**: 시뮬 결과 리포트
- **레이아웃**:
  - 핵심 지표 row: 예상 월 순익(Display Large 30 + 컬러: positive/negative), 손익분기점, 회수 기간.
  - 차트: 월별 누적 손익 라인, 비용 구성 도넛.
  - 민감도 분석: 매출 ±10% 시나리오 비교.
  - CTA: `카카오톡 공유` (카카오 노란색 가이드) + `시뮬레이션 비교에 추가`.

#### S-SIM-3. `/simulation/compare` 및 `/analysis/simulation/compare`

- **목적**: 시뮬레이션 결과 A/B 비교
- **레이아웃**: 좌우 카드(미러) + 지표별 미러 막대 + 승자 측 강조.

#### S-SIM-4. `/share/[token]`

- **목적**: 공유 토큰으로 비로그인 사용자에게 리포트 노출
- **레이아웃**: 시뮬 리포트 본문 + 상단 작은 알림(`이 리포트는 공유 링크로 열어본 거예요`) + 하단 `나도 시작하기` CTA(가입 유도, secondary).
- **상태**: loading skeleton, 만료 → `이 링크는 만료됐거나 잘못됐어요` + `홈으로` 버튼.

### 5.4 (shell) Community

#### S-COM-1. `/community/list`

- **목적**: 피드(전체/카테고리/상권별) + 검색
- **레이아웃**:
  - 상단 sticky 헤더: 검색 인풋(돋보기 아이콘) + 필터 chip row(`전체` `자치구별` `행정동별` `상권별`) + 정렬 토글(`최신` `인기`).
  - 본문: 카드 리스트(카드: 작성자 아바타 + 닉네임 + 시간, 제목 16/600, 본문 2줄 14/400 grey600, 좋아요·댓글·조회수 카운트 13/400 grey500, 대상 chip).
  - FAB(우하단): `글쓰기` (auth-required → 미로그인 시 인증 모달).
- **무한 스크롤**: `lastPostId` 커서.
- **호출**: `GET /api/v1/community/posts`, 검색 시 `GET /community/posts/search`.
- **상태**: loading → 카드 5칸 skeleton. empty(검색결과없음) → `조건에 맞는 글이 없어요`. empty(첫방문) → `아직 글이 없어요. 첫 글을 남겨보세요.` + 글쓰기 CTA.

#### S-COM-2. `/community/[communityId]`

- **목적**: 게시글 상세 + 댓글 + 좋아요 + 신고
- **레이아웃**:
  - 본문: 작성자 정보 + 제목(Heading Large 22) + 본문 + 첨부 chip(상권/자치구).
  - 액션 바: 좋아요(♥ + 카운트) / 공유 / 더보기(메뉴: 신고 / 작성자만 수정·삭제).
  - 댓글 섹션: depth 1 트리. 부모 댓글 클릭 → 대댓글 입력 inline 펼침. 댓글: 닉네임, 시간, 본문, 좋아요(❤ + 카운트), 더보기.
- **호출**: `GET /community/posts/{id}` (조회수+1), `GET /community/posts/{id}/comments`, `POST .../likes`, `POST .../comments`, `POST /community/reports`.
- **신고 모달**: Confirm + 사유 TextField + 제출.

#### S-COM-3. `/community/register` (작성·수정 겸용)

- **목적**: 글쓰기 또는 수정 (`?id=` 시 수정, `?from=compare&left=&right=` 시 비교 초안 자동 채움)
- **레이아웃**: 대상 선택 dropdown(전체/자치구/행정동/상권) + 제목 TextField + 본문 textarea(plain + 줄바꿈) + Button(`저장`, primary).
- **비교 초안**: 진입 시 `POST /community/posts/drafts/commercial-comparisons` 호출 → 제목·본문 자동 입력 → 사용자 수정 → `POST /community/posts`.

### 5.5 (shell) Chatting

> ⚠️ 채팅도 V2 BE 미정. STOMP WebSocket + Firebase FCM 의존.

#### S-CHT-1. `/chatting/list`

- **레이아웃**:
  - 좌측(데스크탑) 또는 단일(모바일): 채팅방 리스트 + 검색 + `+` 만들기 FAB.
  - 룸 카드: 아바타, 룸 이름, 최근 메시지 1줄, 미읽음 배지, 시간.
- **상태**: empty → `참여 중인 채팅방이 없어요` + `채팅방 만들기` CTA.

#### S-CHT-2. `/chatting/[roomId]`

- **레이아웃**:
  - 헤더: 룸 이름 + 인원 + `←` 뒤로.
  - 메시지 영역: 시간순. **내 메시지만 blue interactive surface(`blue50` 또는 `blue500` 본문은 white) 허용**, 상대 메시지는 white 또는 grey100 surface.
  - 입력바: 48px height, 좌측 `+`(첨부), 중앙 TextField, 우측 send 아이콘 버튼(blue500).
- **연결 상태 표시**: 상단 sticky 알림 — `연결 중…` (yellow) / `연결이 끊겼어요. 다시 시도 중…` (red).

### 5.6 (shell) Profile

#### S-PRO-1. `/profile/settings`

- **목적**: 마이페이지 진입점
- **레이아웃**: 프로필 카드(아바타, 닉네임, 이메일, 가입일) + 빠른 통계(북마크 N개, 좋아요 N개, 작성 글 N개) + 메뉴 리스트(편집·비밀번호·탈퇴).
- **호출**: `GET /api/v1/members/me`.

#### S-PRO-2~4. `/profile/settings/{edit, change-password, withdraw}`

- 공통: 폼 카드 + Button(`저장`, primary) + Button(`취소`, ghost).
- **edit**: 닉네임, 아바타 업로드(파일 picker), 자기소개 textarea.
- **change-password**: 현재 → 새 → 확인 + 강도 미터.
- **withdraw**: 안내 문단 + 동의 Checkbox + 사유 Select(선택) + Button(`탈퇴`, danger). 클릭 시 confirm 다이얼로그.

#### S-PRO-5. `/profile/bookmarks` (탭 진입점)

- 상단 Tabs: `분석 / 추천 / 시뮬레이션`. 각 탭은 `/profile/bookmarks/{analysis,recommend,simulation}`.

#### S-PRO-6~8. `/profile/bookmarks/{analysis, recommend, simulation}`

- **레이아웃**: 필터 chip(전체/상권/행정동/자치구) + 카드 그리드(또는 리스트). 카드: 대상 정보 + 저장 시간 + ✕ 삭제 + 클릭 시 해당 상세로 이동.
- **호출**: `GET /api/v1/members/me/bookmarks` (커서 페이지네이션).
- **empty**: `★를 눌러 관심 항목을 저장해 보세요` + `지금 추천 받기` CTA.

### 5.7 (shell) System

#### S-SYS-1. `/status`

- **목적**: 시스템/배치 상태 페이지(공개)
- **레이아웃**: 서비스별 상태 row (서비스명 + 상태 dot + 최근 업데이트 시간). 상태: `정상`(green dot) / `점검 중`(yellow) / `장애`(red).

#### S-SYS-2. 에러 화면 (404 / 403 / 5xx)

- 중앙: H1 (Heading Large), 한 줄 설명, primary 버튼(`홈으로`).
- 5xx: + `잠시 후 다시 시도해주세요. 문제가 계속되면 문의` + 메일 링크.
- **일러스트 없음**.

---

## 6. UX 카피 사전

### 6.1 토스트

| 이벤트             | 카피                                         | 톤      |
| ------------------ | -------------------------------------------- | ------- |
| 북마크 저장        | `관심 항목에 저장했어요`                     | success |
| 북마크 중복(409)   | `이미 저장된 항목이에요`                     | info    |
| 북마크 삭제        | `삭제했어요`                                 | success |
| 게시글 작성        | `글이 등록됐어요`                            | success |
| 게시글 수정        | `수정했어요`                                 | success |
| 게시글 삭제        | `글을 삭제했어요`                            | success |
| 신고 접수          | `신고가 접수됐어요. 운영자가 확인할게요.`    | info    |
| 로그아웃           | `로그아웃했어요`                             | info    |
| 토큰 만료          | `다시 로그인이 필요해요`                     | warning |
| 비번 변경          | `비밀번호를 변경했어요`                      | success |
| 네트워크 오류 일반 | `잠시 연결이 불안정해요. 다시 시도해주세요.` | error   |

좋아요·댓글·검색은 토스트 없음 (UI에 즉시 반영).

### 6.2 폼 인라인 에러

| 케이스      | 카피                                     |
| ----------- | ---------------------------------------- |
| 이메일 형식 | `이메일 형식이 맞는지 확인해주세요`      |
| 이메일 중복 | `이미 가입된 이메일이에요`               |
| 비번 미일치 | `비밀번호가 같지 않아요`                 |
| 비번 강도   | `8자 이상, 영문·숫자를 섞어주세요`       |
| 닉네임 중복 | `이미 사용 중인 닉네임이에요`            |
| 필수 미입력 | `필수 항목이에요`                        |
| 로그인 실패 | `이메일 또는 비밀번호가 올바르지 않아요` |

### 6.3 Confirm 다이얼로그

| 액션        | 헤더                  | 본문                                      | CTA                          |
| ----------- | --------------------- | ----------------------------------------- | ---------------------------- |
| 게시글 삭제 | `글을 삭제할까요?`    | `삭제하면 되돌릴 수 없어요`               | `삭제`(danger) / `취소`      |
| 댓글 삭제   | `댓글을 삭제할까요?`  | `삭제하면 되돌릴 수 없어요`               | `삭제`(danger) / `취소`      |
| 신고        | `이 글을 신고할까요?` | `운영자가 검토 후 처리할게요`             | `신고하기`(primary) / `취소` |
| 로그아웃    | `로그아웃할까요?`     | (없음)                                    | `로그아웃` / `취소`          |
| 회원 탈퇴   | `정말 탈퇴할까요?`    | `데이터는 즉시 삭제되며 복구할 수 없어요` | `탈퇴`(danger) / `취소`      |

### 6.4 데이터 표기 컨벤션 (필수)

| 종류                | 표기                                                             |
| ------------------- | ---------------------------------------------------------------- |
| 매출/금액           | `1,240,000원` (정확) — 요약 컨텍스트만 `124만원` 허용            |
| 인원                | 상세: `1,240,000명` / 요약: `124만명`                            |
| 분기 (`periodCode`) | `20233` → `2023년 3분기`                                         |
| 등급                | `HIGH/MEDIUM/LOW` → `높음/보통/낮음`                             |
| 트렌드              | `INCREASE/DECREASE/STAGNANT` → `↑ 상승` / `↓ 하락` / `→ 정체`    |
| 시간대              | `peakSalesTimeSlot` `17시~21시` → `저녁 장사가 강한 상권` (배지) |
| 연령대              | `dominantSalesAgeGroup` `30대` → `30대 주요 상권` (배지)         |
| 활성/위축           | `openingRate > closureRate` → `활성화 상권` / 반대 → `축소 상권` |
| 상대 시간           | `5분 전`, `방금 전`, `어제`, `2일 전`, `2026.04.20` (1주 초과)   |

**숫자는 모두 tabular-nums + 700 weight (지표·금액·점수)**. 통화 단위(`원`)는 400 weight로 작게.

---

## 7. 사용자 여정 (5개 critical paths)

### J1. 처음 방문자 → 추천 → 북마크

1. `/` → 자치구 grid 또는 `추천 받기` CTA → `/recommend`
2. 프리셋(`청년창업형`) 선택 → 결과 카드 리스트
3. 1순위 카드 클릭 → `/analysis/result?code=...`
4. ★북마크 → 인증 모달 → `/login?redirect=...` → 로그인 → 자동 저장 → 토스트
5. AI 탭 → §4.3 폴링 → completed → 결과 5블록

### J2. 분석 → 시뮬레이션 → 카카오 공유

1. `/analysis` 자치구·업종 선택 → `/analysis/result`
2. `시뮬레이션` 탭/CTA → `/analysis/simulation` (분석 컨텍스트 보존)
3. 입력 → `/analysis/simulation/report`
4. `카카오톡 공유` → `/share/[token]` 생성

### J3. 비교 분석 → 커뮤니티 글쓰기

1. `/analysis/result` AI 결과 → `커뮤니티에 공유` 버튼
2. `/community/register?from=compare&left=...&right=...` 진입
3. 백엔드 초안 자동 채움 → 사용자 수정 → `POST /community/posts` → `/community/[id]`

### J4. 신고

1. `/community/[id]` 더보기 → 신고 모달 → 사유 → 제출 → 토스트
2. (운영자 처리 화면은 V2 1차 미포함)

### J5. 채팅 (BE 미정 — UI만)

1. `/chatting/list` → 검색 또는 `+` 생성 → `/chatting/[roomId]`
2. STOMP 연결 → 메시지 송수신 (slide-in 애니메이션)
3. FCM 푸시: 백그라운드 알림(브라우저 native).

---

## 8. Out of Scope (V2 1차 제외 — 그리지 말 것)

- **풀스크린 지도 + Kakao Map 폴리곤 히트맵** (`/map` 류) — Kakao Map SDK 미이식. 자치구 grid + bar metric으로 1차 대체.
- **상권/자치구/행정동 단독 상세 라우트** (`/commercials/:code`, `/districts/:code`, `/administrations/:code`) — `/analysis/result` 안에서 통합 처리.
- **두 상권 비교 단독 화면** (`/compare?left=&right=`).
- **운영자 신고 대시보드** (`/admin/reports`).
- **다크 모드** (토큰 구조만 분리).
- **다국어** (한국어 단일).
- **알림 센터**.
- **모바일 BottomNav** (1차는 상단 헤더 only).
- **Toss Product Sans** 자산 (Pretendard로 대체).

---

## 9. 디자이너 산출물 체크리스트

### 9.1 디자인 시스템 페이지 (1순위)

- [ ] 컬러 팔레트 페이지 (Primary / Semantic / Neutral / Score / Overlay)
- [ ] 타이포 스케일 페이지 (10단)
- [ ] 스페이싱·라디우스·그림자 페이지
- [ ] 모션 토큰 페이지 (5 duration × 4 easing)
- [ ] 8종 Primitive 컴포넌트 변형 모음 (Button 5×4 size, TextField, Card, Badge, Tabs, Dialog, EmptyState, Skeleton)
- [ ] 보조 컴포넌트 (Toast, Tooltip, Bottom Sheet, Toggle, Combobox, SegmentedControl, Chip, DataTable, Chart wrapper, Avatar)
- [ ] 아이콘 가이드 (lucide-react 예시 24x24)

### 9.2 화면 시안 (Hi-Fi) — 약 25개

**(auth)**

- [ ] `/login`, `/register`, `/register/general`, `/account-deleted`, `/member/loading/[provider]`

**(shell) Home & Discovery**

- [ ] `/` (홈) — 데스크탑 + 모바일
- [ ] `/recommend` — 입력 + 결과
- [ ] `/analysis` — 단계별 폼
- [ ] `/analysis/result` — 요약 탭 + 트렌드 탭 + AI 탭(§4.3 7상태 모두)

**(shell) Simulation**

- [ ] `/simulation`, `/simulation/report`, `/simulation/compare`
- [ ] `/share/[token]` — 비로그인 전용 뷰

**(shell) Community**

- [ ] `/community/list` — loading/empty/success
- [ ] `/community/[id]` — 본문 + 댓글 트리 + 신고 모달
- [ ] `/community/register` — 일반 + 비교 초안 임포트 케이스

**(shell) Chatting**

- [ ] `/chatting/list`, `/chatting/[roomId]` — 연결 상태 표시 포함

**(shell) Profile**

- [ ] `/profile/settings` + 4개 하위(edit/password/withdraw/bookmarks)
- [ ] `/profile/bookmarks` 탭 3종

**System**

- [ ] `/status`, 404/403/5xx, 인증 모달, confirm 모달, 토스트 모음

### 9.3 인터랙션 프로토타입 (모션)

- [ ] AI 탭: idle → submitting → queued → running → completed
- [ ] 비교 초안 임포트: `/analysis/result` 공유 → `/community/register` 자동 채움
- [ ] 좋아요 토글 (애니메이션 + 카운트)
- [ ] 무한 스크롤 (커뮤니티 피드 / 북마크)
- [ ] 채팅 메시지 도착 (slide-in)
- [ ] 토스트 등장/소멸 (220ms ease-enter / ease-exit)

---

## 10. AI 디자이너에게 주는 마지막 노트

1. **단일 컬러 톤**: Toss Blue(`#0ea5e9`) 외 다른 액센트 색은 semantic 용도(green/red/orange)로만. 장식용 블루 사용 금지.
2. **숨 쉴 공간**: 핵심 지표 카드는 항상 주변보다 1.5배 여백. 압축은 cheap해 보임.
3. **One action per screen**: 화면당 primary CTA 1개만. 두 개면 두 화면으로 분리.
4. **이모지·일러스트·그라디언트 금지**. 빈 상태도 일러스트 없이 텍스트 + 1개 행동.
5. **숫자는 타이포그래피**: 700 weight, tabular-nums, 우측 정렬(리스트).
6. **모바일 우선**: 375px 베이스라인. 데스크탑은 가운데 정렬 컬럼 패리티.
7. **`prefers-reduced-motion`**: 모든 motion 토큰 `motion-instant`로 collapse. 슬라이드 → 크로스페이드.
8. **Korean only**. 영문 UI 카피 만들지 말 것.
9. **불확실하면 절제**. NowDoBoss는 의사결정 신뢰가 핵심 가치.
