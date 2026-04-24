# NowDoBoss Backend API Reference

> 서비스별 전체 엔드포인트 요약. 인증이 필요한 API는 `🔒` 표시.
> 공통 베이스: 각 서비스는 API Gateway(`district-service` 제외)를 통해 노출됨.

---

## auth-service

### 인증 (`/api/v1/auth`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/login` | 이메일/비밀번호 로그인, Access + Refresh 토큰 발급 | - |
| POST | `/logout` | 로그아웃, Refresh 토큰 무효화 | 🔒 |
| POST | `/token/reissue` | Access 토큰 재발급 (Refresh 토큰 필요) | - |

### 회원 (`/api/v1/members`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/signup` | 이메일 회원가입 | - |
| GET | `/me` | 내 정보 조회 | 🔒 |

### 북마크 (`/api/v1/members/me/bookmarks`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/` | 북마크 추가 (`targetType`, `targetCode`, `targetName`) | 🔒 |
| DELETE | `/{bookmarkId}` | 북마크 삭제 | 🔒 |
| GET | `/` | 북마크 목록 (커서 페이지네이션, `lastBookmarkId` 기준) | 🔒 |

---

## commercial-service

### 상권 기본 데이터 (`/api/v1/commercials`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/{code}/service-categories` | 상권 내 업종 카테고리 목록 | - |
| GET | `/{code}/foot-traffic` | 유동인구 분석 (시간대·성별·연령대) | - |
| GET | `/{code}/services/{serviceCode}/sales` | 업종별 매출 분석 | - |
| GET | `/{code}/facilities` | 주변 시설 현황 | - |
| GET | `/{code}/population` | 거주인구 분석 | - |
| GET | `/{code}/income` | 소득·지출 분석 | - |
| GET | `/{code}/services/{serviceCode}/stores` | 업종별 점포 분석 (개폐업률 등) | - |
| GET | `/{code}/benchmarks` | 상권 벤치마크 비교 | - |

### 상권 요약 (`/api/v1/commercials/{code}/summaries`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/sales` | 매출 요약 (자치구·행정동·상권 계층별) | - |
| GET | `/income` | 소득 요약 | - |

### 트렌드 (`/api/v1/commercials/{code}/trend`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/` | 분기별 트렌드 분석 (`metricType`: SALES / FOOT_TRAFFIC / STORE, 최대 8분기) | - |

### 프로필 (`/api/v1/commercials/{code}/profile`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/` | 상권 종합 프로필 (유동인구·매출·점포·소득 요약 + 종합 점수) | - |

### 비교 (`/api/v1/commercials/compare`, `/compare-preview`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/compare` | 두 상권 비교 분석 (좌/우 상권 코드, 업종, 기준 분기) | - |
| GET | `/compare-preview` | 비교 한줄 인사이트 미리보기 | - |

### 히트맵 & 후보 추천 (`/api/v1/commercials`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/heatmap` | 단일 지표 히트맵 점수 목록 (`metricType` 지정) | - |
| GET | `/heatmap-composite` | 복합 지표 히트맵 (프리셋 가중치 합산) | - |
| GET | `/candidates` | 상위 N개 후보 상권 추천 (프리셋·우선지표 기반) | - |
| GET | `/recommendations/by-service` | 업종 코드 기반 자동 프리셋 적용 추천 | - |

**프리셋 종류** (`CandidatePresetType`):
- `BALANCED` — 균형형
- `AGGRESSIVE_OPPORTUNITY` — 공격형
- `STABLE_LOW_RISK` — 안정형
- `LOW_BUDGET_RESIDENT` — 저예산 생활권형
- `YOUTH_STARTUP` — 청년창업형
- `RE_EMPLOYMENT_STARTUP` — 재취업창업형

### 자치구·행정동

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/v1/administrations/{code}` | 행정동 상세 | - |
| GET | `/api/v1/districts/top-ten` | 상위 10 자치구 | - |
| GET | `/api/v1/districts/{code}` | 자치구 상세 | - |
| GET | `/api/v1/districts/{code}/foot-traffic` | 자치구 유동인구 | - |
| GET | `/api/v1/districts/{code}/change-indicators` | 자치구 변화 지표 | - |
| GET | `/api/v1/districts/{code}/stores/top-services` | 자치구 상위 업종별 점포 수 | - |
| GET | `/api/v1/districts/{code}/sales/top-services` | 자치구 상위 업종별 매출 | - |
| GET | `/api/v1/districts/{code}/sales/top-administrations` | 자치구 행정동별 매출 상위 | - |
| GET | `/api/v1/districts` | 전체 자치구 목록 | - |

---

## district-service

### 지도 (`/api/v1/map`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/commercials` | 상권 폴리곤 좌표 목록 | - |
| GET | `/administrations` | 행정동 폴리곤 좌표 목록 | - |
| GET | `/districts` | 자치구 폴리곤 좌표 목록 | - |
| GET | `/commercials/heatmap` | 히트맵 지도용 색상 등급 데이터 | - |
| GET | `/candidate-presets` | 프리셋 메타데이터 목록 (코드·이름·설명) | - |
| GET | `/commercials/candidates` | 후보 상권 지도 마커 데이터 | - |
| GET | `/commercials/{code}/profile` | 상권 프로필 지도 오버레이용 | - |
| GET | `/commercials/compare-preview` | 비교 미리보기 지도 오버레이용 | - |

### 지역 코드 조회 (`/api/v1/regions`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/districts/{districtCode}/administrations` | 자치구 내 행정동 목록 | - |
| GET | `/districts/{districtCode}/administrations/{adminCode}/commercials` | 행정동 내 상권 목록 | - |
| GET | `/code-lookup` | 이름으로 지역 코드 역조회 | - |
| GET | `/administrations/{adminCode}` | 행정동 소속 자치구 조회 | - |
| GET | `/commercials/{code}/administration` | 상권 소속 행정동 조회 | - |

---

## community-service

### 게시글 (`/api/v1/community/posts`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/` | 피드 목록 (정렬·`targetType`·`targetCode` 필터, 무한스크롤) | - |
| GET | `/search` | 키워드 검색 | - |
| GET | `/{postId}` | 게시글 상세 (조회수 +1 자동) | - |
| POST | `/` | 게시글 작성 | 🔒 |
| PATCH | `/{postId}` | 게시글 수정 (작성자 본인만) | 🔒 |
| DELETE | `/{postId}` | 게시글 삭제 (소프트 삭제) | 🔒 |
| POST | `/{postId}/likes` | 좋아요 토글 | 🔒 |
| GET | `/liked` | 내가 좋아요한 게시글 목록 | 🔒 |
| POST | `/drafts/commercial-comparisons` | 상권 비교 결과 커뮤니티 게시글 초안 생성 | - |

### 댓글 (`/api/v1/community/posts/{postId}/comments`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/` | 댓글 목록 (대댓글 계층 포함, depth 1 고정) | - |
| POST | `/` | 댓글 또는 대댓글 작성 (`parentCommentId` 옵션) | 🔒 |
| DELETE | `/{commentId}` | 댓글 삭제 (소프트 삭제, 작성자 본인만) | 🔒 |
| POST | `/{commentId}/likes` | 댓글 좋아요 토글 | 🔒 |

### 신고 (`/api/v1/community/reports`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/` | 게시글 또는 댓글 신고 (`targetKind`: POST / COMMENT) | 🔒 |

### 모더레이션 (`/api/v1/moderation`) — MANAGER 전용

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/reports` | 미처리(PENDING) 신고 목록 + 대상 컨텐츠 미리보기 | 🔒 MANAGER |
| PATCH | `/reports/{reportId}` | 신고 처리 (`APPROVE_AND_HIDE` / `DISMISS`) | 🔒 MANAGER |

**모더레이션 흐름**:
1. 사용자가 게시글·댓글 신고 → `PENDING` 상태로 저장
2. 매니저가 목록 조회 (`targetTitle`, `targetPreview`, `targetAuthorId` 포함)
3. `APPROVE_AND_HIDE` → 대상 게시글/댓글 `DELETED` 처리 (댓글이면 부모 게시글 댓글 수도 감소)
4. `DISMISS` → 신고만 `DISMISSED`, 컨텐츠 유지

---

## ai-service

### AI 리포트 (`/api/v1/ai-reports`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/commercials/{commercialCode}` | 상권 AI 분석 리포트 (종합 평가 + 추천 이유) | - |
| GET | `/commercials/comparisons` | 두 상권 비교 AI 리포트 (승자 판정 + 근거) | - |
| GET | `/districts/{districtCode}` | 자치구 AI 리포트 | - |
| GET | `/administrations/{administrationCode}` | 행정동 AI 리포트 | - |

**주의사항**:
- 내부 Feign 호출 8개를 `CompletableFuture` 병렬 실행으로 처리
- 외부 Claude API 호출 포함 — 응답 시간 수 초 소요
- `commercial-service`·`district-service` Feign 클라이언트를 통해 데이터 수집 후 프롬프트 구성

---

## 전체 엔드포인트 수

| 서비스 | 엔드포인트 수 |
|--------|-------------|
| auth-service | 8 |
| commercial-service | 26 |
| district-service | 13 |
| community-service | 14 |
| ai-service | 4 |
| **합계** | **65** |
