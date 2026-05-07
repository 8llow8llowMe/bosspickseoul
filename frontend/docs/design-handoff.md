# NowDoBoss V2 — Design Handoff (보강 문서)

> 이 문서는 **Claude Design 의뢰용 보강 문서**다. 단일 진실 소스 아님.
> 디자이너는 아래 3개를 먼저 읽었다는 전제로, 여기서는 **그쪽에 빠진 부분만** 채운다.
>
> - 디자인 시스템(컬러·타이포·라디우스·모션·primitives): `frontend/DESIGN.md`
> - 재작업 큐(알려진 잔존 문제): `frontend/docs/design-redesign-tasks.md`
> - 라우트 ↔ 레거시 매핑: `frontend/docs/migration-inventory.md`
> - 백엔드 단일 진실: `backend/docs/api-screens.md`, `backend/docs/feature-status.md`

---

## 1. 라우트 × 데이터 매트릭스

V2 Next.js App Router 실제 라우트(30개) 기준. `(auth)` 그룹은 헤더/푸터 미적용, `(shell)` 그룹은 GNB 적용.

### 1.1 (auth) — 비로그인/회원 진입

| Route | 화면 목적 | 호출 API | 인증 |
|---|---|---|---|
| `/login` | 이메일·비번 + 소셜 로그인 | `POST /api/v1/auth/login` | public |
| `/register` | 회원가입 1단계 (이메일/비번) | `POST /api/v1/members/signup` (1단계) | public |
| `/register/general` | 회원가입 2단계 (닉네임·약관) | `POST /api/v1/members/signup` (2단계) | public |
| `/account-deleted` | 탈퇴 완료 안내 | 없음 (정적) | public |

### 1.2 (shell) — 메인 진입

| Route | 화면 목적 | 호출 API (호출 순서) | 인증 |
|---|---|---|---|
| `/` (home) | 자치구 grid + bar metric + 추천 진입 | 1) `GET /api/v1/districts/top-ten` 2) `GET /api/v1/map/districts` (lite) | public |
| `/status` | 시스템/배치 상태 페이지 | `statusApi`(legacy) — V2 BE 미정 | public |
| `/recommend` | 업종/프리셋 기반 추천 결과 | 1) `GET /api/v1/map/candidate-presets` 2) `GET /api/v1/commercials/candidates` 또는 `/recommendations/by-service` | public |
| `/analysis` | 분석 진입(자치구·업종 선택) | 1) `GET /districts` 2) `GET /map/administrations` 3) `GET /regions/code-lookup` | public |
| `/analysis/result` | 분석 결과 (요약·트렌드·AI) | 1) `GET /commercials/{code}/profile` 2) `GET /commercials/{code}/trend` 3) `GET /commercials/{code}/foot-traffic` 4) AI 탭 진입 시 §3 폴링 흐름 | public (AI 탭만 auth) |

### 1.3 (shell) — 시뮬레이션 / 공유

> ⚠️ 시뮬레이션·채팅은 V1 레거시 → V2 FE로 이관됐으나 **V2 BE에는 별도 서비스가 없음** (V2 BE: auth/commercial/district/community/ai 5종). 
> 따라서 FE는 `simulationApi`, `chattingApi`(legacy 엔드포인트) 또는 임시 fixture를 사용한다. 디자인은 화면만 정의하고 **백엔드 미정 영역**임을 시안에 주석 표시.

| Route | 화면 목적 | 호출 API | 인증 |
|---|---|---|---|
| `/simulation` | 창업 비용 시뮬레이션 폼 | `simulationApi`(legacy) | auth |
| `/simulation/report` | 시뮬레이션 결과 리포트 | `simulationApi`(legacy) + `kakaoShareApi` | auth |
| `/simulation/compare` | 시뮬레이션 결과 A/B 비교 | `simulationApi`(legacy) | auth |
| `/analysis/simulation` | 분석 → 시뮬 진입 (분석 컨텍스트 보존) | `simulationApi` | auth |
| `/analysis/simulation/report` | 분석 컨텍스트 시뮬 리포트 | `simulationApi` + `analysisApi` | auth |
| `/analysis/simulation/compare` | 분석 컨텍스트 시뮬 비교 | 위와 동일 | auth |
| `/share/[token]` | 공유 토큰으로 비로그인 사용자에게 리포트 노출 | `GET /share/{token}` (legacy) | **public(토큰 인증)** |

### 1.4 (shell) — 커뮤니티

| Route | 화면 목적 | 호출 API | 인증 |
|---|---|---|---|
| `/community/list` | 피드 (전체/카테고리/상권별) + 검색 | 1) `GET /api/v1/community/posts` 2) (검색 시) `GET /community/posts/search` | public |
| `/community/[communityId]` | 게시글 상세 + 댓글 + 좋아요 + 신고 | 1) `GET /community/posts/{id}` (조회수+1) 2) `GET /community/posts/{id}/comments` 3) `POST /community/posts/{id}/likes` (토글) 4) `POST /community/posts/{id}/comments` 5) `POST /community/reports` | public(읽기) / auth(쓰기·좋아요·신고) |
| `/community/register` | 글 작성/수정 (쿼리 `?id=`로 수정 분기, `?from=compare`로 비교 초안 임포트) | 1) (`from=compare` 시) `POST /community/posts/drafts/commercial-comparisons` 2) `POST /community/posts` 또는 `PATCH /community/posts/{id}` | auth |

### 1.5 (shell) — 채팅

> ⚠️ 채팅도 V2 BE 미정. Firebase Messaging + STOMP WebSocket 의존.

| Route | 화면 목적 | 호출 API / 실시간 | 인증 |
|---|---|---|---|
| `/chatting/list` | 채팅방 리스트 + 검색 + 생성 모달 | `chattingApi`(legacy) + FCM 토큰 등록 | auth |
| `/chatting/[roomId]` | 채팅방 상세 (실시간 메시지) | STOMP `chat-stomp.ts` + `chattingApi` | auth |

### 1.6 (shell) — 프로필

| Route | 화면 목적 | 호출 API | 인증 |
|---|---|---|---|
| `/profile/settings` | 마이페이지 (탭 nav 진입점) | `GET /api/v1/members/me` | auth |
| `/profile/settings/edit` | 프로필 편집 (닉네임·아바타) | `PATCH /members/me` (legacy 컨벤션) | auth |
| `/profile/settings/change-password` | 비밀번호 변경 | `POST /members/me/password` | auth |
| `/profile/settings/withdraw` | 회원 탈퇴 | `DELETE /members/me` | auth |
| `/profile/bookmarks` | 북마크 진입 (탭으로 3종 분기) | `GET /members/me/bookmarks` | auth |
| `/profile/bookmarks/analysis` | 분석 북마크 (상권/행정동/자치구) | `GET /members/me/bookmarks?targetType=COMMERCIAL` 등 | auth |
| `/profile/bookmarks/recommend` | 추천 결과 북마크 | `GET /members/me/bookmarks` (recommend 카테고리) | auth |
| `/profile/bookmarks/simulation` | 시뮬레이션 북마크 | legacy `simulationApi` | auth |
| `/member/loading/[provider]` | 소셜 OAuth 콜백 (kakao/google) | OAuth 토큰 교환 → `GET /members/me` | callback |

---

## 2. 인증 가드 매트릭스

### 2.1 라우트 분류

- **public**: `/`, `/status`, `/recommend`, `/analysis`, `/analysis/result`, `/community/list`, `/community/[id]`(읽기), `/share/[token]`, 모든 `/(auth)/*`
- **auth-required**: `/community/register`, `/profile/**`, `/simulation/**`, `/analysis/simulation/**`, `/chatting/**`, AI 분석 탭 진입
- **role-required(MANAGER)**: V2 1차에는 **신고 대시보드 라우트 없음** → 운영자 처리 화면은 v2.5 스코프

### 2.2 401/만료 시 동작

| 시나리오 | 화면 동작 |
|---|---|
| 만료된 Access Token으로 호출 | 인터셉터가 `POST /auth/token/reissue` 자동 호출 → 원 요청 재시도. 사용자 화면 변화 없음. |
| Refresh Token 만료 | 인터셉터가 토큰 정리 후 `/login?redirect={현재 경로}`로 리다이렉트. 토스트 "다시 로그인이 필요해요". |
| auth-required 페이지에 비로그인 진입 | 라우트 가드 → `/login?redirect=` |
| public 페이지에서 auth 액션(좋아요·북마크·글쓰기) 클릭 | **페이지 이동 없이 인라인 모달**: "로그인이 필요해요" + `로그인` `회원가입` CTA |
| MANAGER 권한 부족 | 403 화면 (S22 패턴) |

### 2.3 인증 모달 카피

- 헤더: "로그인이 필요해요"
- 본문: "이 기능을 사용하려면 로그인해주세요."
- CTA: `로그인` (primary) / `회원가입` (secondary) / 닫기 X

---

## 3. AI 리포트 비동기 폴링 — UI 상태 정의

> **백엔드는 비동기 잡 모델**: `POST /ai-reports/commercials/{code}` → 200(CACHED) 즉시 결과 / 202(ACCEPTED) jobId 발급 → `GET /ai-reports/jobs/{jobId}` 폴링.
> 디자이너는 아래 7개 UI 상태를 **각각 별도 시안**으로 그려야 한다.

### 3.1 상태 머신

```
idle → submitting → ┬── cached (200)        → completed
                    └── accepted (202)      → queued → running → ┬── completed
                                                                  └── failed
                                                                  └── timeout
```

### 3.2 상태별 화면 표현

| 상태 | 트리거 | 화면 표현 | 주요 카피 |
|---|---|---|---|
| **idle** | AI 탭 첫 진입 전 | 비활성 카드 + "AI 분석 시작하기" 버튼 | "AI에게 이 상권을 분석시켜 보세요" |
| **submitting** | POST 요청 중 (보통 <500ms) | 버튼 spinner | "분석 요청 중…" |
| **cached** | 응답 200 | 결과 카드 fade-in (220ms) + 캡션 배지 | "5분 전 생성된 분석" (timestamp 상대 표기) |
| **queued** | 202 응답, 폴링 status `PENDING` | step-bar 4단(수집·분석·작성·완료) 1단 활성 + dot pulse | "분석 준비 중이에요" |
| **running** | 폴링 status `RUNNING` | step-bar 2~3단 활성 + 타이핑 dot | "AI가 분석 중이에요. 보통 10~30초 걸려요." |
| **completed** | 폴링 status `COMPLETED` | 결과 카드 5블록 fade-in + "방금 생성됨" 캡션 | (결과 본문) |
| **failed** | 폴링 status `FAILED` 또는 4xx | 빨간 alert 카드 + 재시도 버튼 | §3.4 ErrorCode 매핑 |
| **timeout** | 60초 폴링해도 PENDING/RUNNING | 회색 alert 카드 + 재시도 버튼 | "분석에 시간이 오래 걸려요. 잠시 후 다시 시도해주세요." |

### 3.3 결과 카드 5블록 구조

`commercialReport` 응답을 5개 섹션으로 분해:
1. **한 줄 요약** (`summary`) — Heading 22px, 강조
2. **강점** (opportunity) — green 액센트 + 체크 아이콘
3. **약점·위험** (risk) — orange 액센트 + 경고 아이콘
4. **추천 업종 / 시간대** — chip 리스트
5. **다음 행동 제안** — bullet 리스트 + "북마크" / "비교에 추가" CTA

### 3.4 ErrorCode → 카피 매핑

| code | 사용자 카피 |
|---|---|
| `AI_001` | "분석 데이터를 불러오지 못했어요." |
| `AI_002` / `AI_003` | "AI 분석이 일시적으로 중단됐어요. 잠시 후 다시 시도해주세요." |
| `AI_005` | (사용자 노출 X — 자동 재제출) |
| `AI_009` | "분석에 시간이 오래 걸려 중단됐어요. 다시 시도해주세요." |

### 3.5 폴링 정책 (FE 구현 가이드 — 디자인엔 시각 표현만)

- 폴링 간격: 1.5초
- 타임아웃: 60초
- 본인 작업이 아닌 jobId 조회 시 404 → idle로 복귀(재제출)

### 3.6 비교/자치구/행정동 AI 리포트

비동기 미적용(레거시 동기 GET): `/ai-reports/commercials/comparisons`, `/ai-reports/districts/{code}`, `/ai-reports/administrations/{code}`. 화면에선 **submitting → completed** 2단 상태만 사용. 응답 시간 3~30초이므로 skeleton + "AI가 분석 중이에요" 카피 필수.

---

## 4. 화면 상태 매트릭스

> 라우트별 5상태(idle / loading / empty / error / success). DESIGN.md §14의 "이유 + 액션 1개" 빈 상태 원칙을 화면 단위로 풀어둠.

### 4.1 핵심 라우트 5상태

| Route | loading | empty | error | success 변형 |
|---|---|---|---|---|
| `/` (home) | grid 6칸 skeleton | (해당 없음 — 항상 데이터) | toast "데이터를 불러오지 못했어요" + 새로고침 | 자치구 카드 + 추천 카드 |
| `/recommend` | result 카드 6칸 skeleton | "조건에 맞는 상권이 없어요. 프리셋을 바꿔보세요." + 프리셋 chip | inline alert | rank 카드 리스트 |
| `/analysis/result` | 탭별 차트 skeleton | (해당 없음) | 탭 내 alert ("이 지표는 데이터가 없어요") | 탭별 차트 + AI 카드 |
| `/community/list` | 카드 5개 skeleton | "아직 글이 없어요. 첫 글을 남겨보세요." + `글쓰기` CTA | inline alert + 새로고침 | 카드 리스트 + 무한 스크롤 |
| `/community/[id]` | 본문 skeleton | (해당 없음) | "삭제됐거나 접근할 수 없는 글이에요." + 목록으로 | 본문 + 댓글 트리 |
| `/community/register` | (없음) | (없음) | 폼 인라인 에러 | 작성 완료 → `/community/[id]`로 redirect |
| `/profile/settings` | 카드 skeleton | (해당 없음) | "프로필을 불러오지 못했어요" | 프로필 카드 + 메뉴 리스트 |
| `/profile/bookmarks/*` | 카드 skeleton | "★를 눌러 관심 항목을 저장해 보세요" + 추천으로 가는 CTA | inline alert | 카드 리스트 + 더보기 |
| `/simulation` | (폼은 즉시) | (없음) | 인라인 에러 | 폼 제출 후 `/simulation/report` |
| `/simulation/report` | spinner 2~5초 | (없음) | "리포트를 생성하지 못했어요. 입력값을 확인해주세요" | 리포트 본문 + 공유 버튼 |
| `/share/[token]` | 본문 skeleton | "이 링크는 만료됐거나 잘못됐어요" | 위와 동일 | 리포트 본문 (비로그인 가능) |
| `/chatting/list` | 룸 카드 skeleton | "참여 중인 채팅방이 없어요" + `채팅방 만들기` | 인라인 alert | 룸 리스트 |
| `/chatting/[roomId]` | 메시지 영역 skeleton + 연결 중 표시 | "첫 메시지를 보내보세요" | "연결이 끊겼어요. 다시 시도 중…" | 메시지 + 입력창 |

### 4.2 빈 상태 카피 원칙 (DESIGN.md §10/§14 인용 + 라우트별 채움)

- **이유 한 줄 + 행동 한 줄** 구조 고정.
- 일러스트는 라인 스타일, 절대 컬러풀하지 않게.
- CTA는 **항상 1개**. 2개 이상 두지 않는다.

---

## 5. UX 카피 사전

> DESIGN.md §10의 voice 원칙(친근하지만 정돈됨, 금지어 없음)에 맞춰 **라우트/이벤트별 실제 문구**를 모음. Claude Design 시안에 그대로 사용.

### 5.1 토스트

| 이벤트 | 카피 | 톤 |
|---|---|---|
| 북마크 저장 성공 | "관심 항목에 저장했어요" | success |
| 북마크 중복(409) | "이미 저장된 항목이에요" | info |
| 북마크 삭제 | "삭제했어요" | success |
| 게시글 작성 성공 | "글이 등록됐어요" | success |
| 게시글 수정 성공 | "수정했어요" | success |
| 게시글 삭제 성공 | "글을 삭제했어요" | success |
| 좋아요 추가/취소 | (토스트 없음 — 카운트만 즉시 갱신) | — |
| 댓글 작성 성공 | (토스트 없음 — 트리에 즉시 반영) | — |
| 신고 접수 | "신고가 접수됐어요. 운영자가 확인할게요." | info |
| 로그인 성공 | (토스트 없음 — 직전 화면 복귀) | — |
| 로그아웃 | "로그아웃했어요" | info |
| 토큰 만료 | "다시 로그인이 필요해요" | warning |
| 비번 변경 성공 | "비밀번호를 변경했어요" | success |
| 네트워크 오류 일반 | "잠시 연결이 불안정해요. 다시 시도해주세요." | error |

### 5.2 폼 인라인 에러

- 이메일 형식: "이메일 형식이 맞는지 확인해주세요"
- 비번 미일치: "비밀번호가 같지 않아요"
- 비번 강도: "8자 이상, 영문·숫자를 섞어주세요"
- 닉네임 중복: "이미 사용 중인 닉네임이에요"
- 필수 미입력: "필수 항목이에요"

### 5.3 confirm 모달

- 게시글 삭제: 제목 "글을 삭제할까요?" / 본문 "삭제하면 되돌릴 수 없어요" / CTA `삭제` (danger) `취소`
- 댓글 삭제: 제목 "댓글을 삭제할까요?" / 본문 "삭제하면 되돌릴 수 없어요"
- 신고: 제목 "이 글을 신고할까요?" / 본문 "운영자가 검토 후 처리할게요"
- 로그아웃: 제목 "로그아웃할까요?" / CTA `로그아웃` `취소`
- 회원 탈퇴: 제목 "정말 탈퇴할까요?" / 본문 "데이터는 즉시 삭제되며 복구할 수 없어요" / CTA `탈퇴` (danger) `취소`

### 5.4 데이터 표기 컨벤션

- 매출/금액: "₩48억", "₩4,820,000,000" (긴 폼은 호버 tooltip)
- 인원: "1,240,000명" → "124만명"(요약), "1,240,000명"(상세)
- 분기: `periodCode` "20233" → "**2023년 3분기**"
- 등급: `HIGH/MEDIUM/LOW` → "**높음/보통/낮음**"
- 트렌드: `INCREASE/DECREASE/STAGNANT` → "↑ 상승" / "↓ 하락" / "→ 정체"
- 시간대: `peakSalesTimeSlot` "17시~21시" → "**저녁 장사가 강한 상권**"(배지)
- 연령대: `dominantSalesAgeGroup` "30대" → "**30대 주요 상권**"(배지)
- 활성/위축: `openingRate > closureRate` → "**활성화 상권**" / 반대 → "**축소 상권**"

---

## 6. Critical User Journeys

### J1. 처음 방문자 — 추천 받고 북마크
1. `/` → 자치구 grid 또는 "추천 받기" CTA → `/recommend`
2. 프리셋 선택(`청년창업형`) → 결과 카드 리스트
3. 1순위 카드 클릭 → `/analysis/result?code=...`
4. ★북마크 → 인증 모달 → `/login?redirect=/analysis/result?code=...`
5. 로그인 후 북마크 자동 저장 → 토스트
6. AI 탭 클릭 → §3 폴링 → completed

### J2. 분석 → 시뮬레이션 → 공유
1. `/analysis` 자치구·업종 선택 → `/analysis/result`
2. "시뮬레이션" 탭/CTA → `/analysis/simulation` (분석 컨텍스트 보존)
3. 입력 완료 → `/analysis/simulation/report`
4. "카카오톡 공유" → kakao share or `/share/[token]` 생성

### J3. 커뮤니티 글쓰기 (비교 초안 임포트)
1. `/analysis/result` AI 결과 → "커뮤니티에 공유" 클릭
2. `/community/register?from=compare&left=...&right=...` 진입
3. 백엔드가 초안(`POST /community/posts/drafts/commercial-comparisons`) 반환 → 제목/본문 자동 채움
4. 사용자 수정 → `POST /community/posts` → `/community/[id]` redirect

### J4. 신고 → 운영자 처리
1. `/community/[id]` 더보기 → 신고 모달 → `POST /community/reports`
2. **V2 1차에는 운영자 화면 없음** (BE 엔드포인트 `GET /moderation/reports`는 존재하지만 FE 미구현 → v2.5)

### J5. 채팅 (V2 BE 미정 — UI만 디자인)
1. `/chatting/list` → 방 검색 또는 생성 모달 → `/chatting/[roomId]`
2. STOMP 연결 → 실시간 메시지 송수신
3. FCM 푸시: 백그라운드 알림

---

## 7. 외부 SDK 의존 화면 (디자인 시 주의)

| 화면 | SDK | 디자인 영향 |
|---|---|---|
| `/` (home) | (없음 — Kakao Map SDK 미이식) | V1과 달리 풀스크린 지도 없음. 자치구 grid + bar metric으로 대체. |
| `/recommend`, `/analysis/result` | (없음) | 데이터만 |
| `/simulation/report`, `/share/[token]` | Kakao SDK (공유) | "카카오톡 공유" 버튼 — 카카오 공식 노란색 가이드 사용 |
| `/chatting/**` | STOMP WebSocket + Firebase FCM | "연결 중 / 연결 끊김" 상태 표시 자리 필요. 알림 권한 요청 다이얼로그(브라우저 native — 디자인 외) |

> **Kakao Map SDK는 V2에 미이식**. 풀스크린 지도 화면(`/map` 류)은 v2.5 스코프이므로 1차 디자인 의뢰에서 **제외**.

---

## 8. Out of Scope (V2 1차 제외)

디자이너가 의뢰서를 그릴 때 **그리지 말아야 할** 화면:

- 풀스크린 지도(`/map`) + Kakao Map 폴리곤 히트맵 — v2.5
- 상권/자치구/행정동 단독 상세 라우트(`/commercials/:code`, `/districts/:code`, `/administrations/:code`) — `/analysis/result` 안에서 통합 처리
- 두 상권 비교 단독 화면(`/compare`) — v2.5
- 운영자 신고 대시보드(`/admin/reports`) — v2.5
- 다크모드 — 토큰 구조만 분리, 시안 미요청
- 다국어 — 한국어 전용
- 알림 센터 — 보류

이 영역들은 BE에는 엔드포인트가 있으나 V2 FE 라우트가 없다(혹은 v2.5에 추가 예정).

---

## 9. 디자인 의뢰 시 산출물 체크리스트

> Claude Design에 의뢰할 때 **이 목록 그대로 붙여넣기**.

### 9.1 디자인 시스템 (이미 정의 — 인용만)
- 컬러/타이포/스페이싱/라디우스/모션: `frontend/DESIGN.md` §2~§6, §15
- Primitive 컴포넌트(`Button/TextField/Card/Badge/Tabs/Dialog/EmptyState/Skeleton`): `frontend/DESIGN.md` §4 + `frontend/docs/design-redesign-tasks.md` §8

### 9.2 화면 시안 (Hi-Fi)
1. `/` (home) — 데스크탑 + 모바일
2. `/recommend` — 입력 폼 + 결과 카드 리스트
3. `/analysis` — 자치구·업종 선택 폼
4. `/analysis/result` — 탭 6종 + AI 탭 7상태(§3.2)
5. `/community/list` — 피드 + 검색 + 필터 (loading/empty/success)
6. `/community/[id]` — 본문 + 댓글 트리(depth 1) + 신고 모달
7. `/community/register` — 글쓰기 + 비교 초안 임포트 케이스
8. `/login`, `/register`, `/register/general` — (auth) 그룹
9. `/profile/settings` + 하위 3종(edit/password/withdraw)
10. `/profile/bookmarks` + 탭 3종(analysis/recommend/simulation)
11. `/simulation` + `/simulation/report` + `/simulation/compare`
12. `/share/[token]` — 비로그인 전용 리포트 뷰
13. `/chatting/list` + `/chatting/[roomId]` (실시간 상태 포함)
14. `/status`, `/account-deleted`, `/member/loading/[provider]`
15. 시스템 화면: 404 / 403 / 5xx, 인증 모달, confirm 모달, 토스트 모음

### 9.3 인터랙션 프로토타입 (모션)
- AI 탭: idle → submitting → queued → running → completed 전환
- 비교 초안 임포트: `/analysis/result` "공유" → `/community/register` 자동 채움
- 좋아요 토글 (애니메이션 + 카운트 증감)
- 무한 스크롤 (커뮤니티 피드 / 북마크)
- 채팅 메시지 도착 (slide-in)
- 토스트 등장/소멸 (220ms ease-out)

### 9.4 비고
- **Toss Product Sans**: 자산 미확보 시 Pretendard fallback (이미 DESIGN.md §3에 fallback chain 정의됨).
- **모바일 BottomNav**: design-redesign-tasks.md에 도입 후보로만 명시 — V2 1차는 **상단 헤더 only**로 결정.
- **다크모드**: 토큰 구조만 분리, 시안 미요청.
