# BossPickSeoul Backend API Reference

> 서비스별 전체 엔드포인트 요약. 인증이 필요한 API는 `🔒` 표시, 토큰이 있으면 활용하고 없어도 되는 API는 `선택` 표시.

## 노출 경로

| 서비스 | 외부 경로 | 비고 |
|--------|----------|------|
| auth-service | nginx → auth-service 직접 | 게이트웨이를 경유하지 않음. 게이트웨이는 Swagger 문서 집계(`/auth-service/**`)만 프록시 |
| commercial-service | nginx → api-gateway → 서비스 | `/api/v1/commercials`, `/api/v1/districts`, `/api/v1/administrations`, `/api/v1/share-links`, `/api/v1/simulations`, `/api/v1/analysis-bookmarks` |
| district-service | nginx → api-gateway → 서비스 | `/api/v1/map`, `/api/v1/regions` |
| community-service | nginx → api-gateway → 서비스 | `/api/v1/community` |
| ai-service | nginx → api-gateway → 서비스 | `/api/v1/ai-reports` |

## 공통 응답 규약

모든 응답은 `Response<T>` 래퍼를 사용합니다. 성공 시 `resultCode` / `resultMessage` 는 `null` 이므로, 클라이언트는 `success` 플래그로 분기합니다.

```json
{ "dataHeader": { "success": true, "resultCode": null, "resultMessage": null }, "dataBody": { } }
```

요청 검증 실패 시에는 `resultCode` 에 대표 필드 오류 코드가, `resultMessage.errors[]` 에 필드별 오류 목록이 담깁니다. 클라이언트는 `errors[].code` 로 분기하고 `errors[].field` 로 입력 위치를 표시하면 됩니다.

**한 필드에 오류가 여러 개 올 수 있습니다.** 예를 들어 비밀번호는 길이와 문자 구성을 따로 검사하므로 둘 다 어긋나면 2건이 옵니다. 서버는 오류를 버리지 않고 모두 담되 순서를 고정해서 내려줍니다.

- 순서: **필드 선언 순서** → 같은 필드 안에서는 **필수 → 길이 → 범위 → 형식**
- `resultCode` 와 대표 `message` 는 정렬된 첫 오류입니다. 같은 입력이면 항상 같은 코드가 나옵니다.
- 화면 처리: 입력 항목별로 해당 `field` 의 **첫 오류만** 표시하면 됩니다. 한 번에 모두 안내하려면 같은 `field` 의 오류를 모아서 나열해도 됩니다.

```json
{
  "dataHeader": {
    "success": false,
    "resultCode": "MEMBER_104",
    "resultMessage": {
      "message": "비밀번호는 8자 이상 20자 이하여야 합니다.",
      "errors": [
        { "code": "MEMBER_104", "field": "password", "message": "비밀번호는 8자 이상 20자 이하여야 합니다." },
        { "code": "MEMBER_105", "field": "password", "message": "비밀번호는 공백 없이 영문자, 숫자, 특수문자를 각각 1자 이상 포함해야 합니다." },
        { "code": "MEMBER_109", "field": "nickname", "message": "닉네임은 10자 이하만 가능합니다." }
      ]
    }
  },
  "dataBody": null
}
```

## 오류 처리 규약 — 재시도 가능 여부는 HTTP 상태로 구분한다

"데이터가 없어서 실패"와 "일시적 문제로 실패"를 사용자에게 다르게 안내하기 위한 전 서비스 공통 규약이다.
클라이언트는 에러코드 목록을 관리할 필요 없이 **HTTP 상태만으로** UI 를 분기한다.

| 구분 | 판별 | 의미 | 권장 UI |
|------|------|------|---------|
| 응답 없음 | 네트워크 오류/타임아웃 (상태 코드 자체가 없음) | 통신 실패 | "다시 시도" 버튼 |
| **5xx** (500/502/503/504) | 서버·인프라 일시 장애 (내부 통신 불가, 저장소 불가, 타임아웃 등) | **재시도하면 성공할 수 있음** | "잠시 후 다시 시도해 주세요" + "다시 시도" 버튼 |
| **404** | 요청한 데이터가 존재하지 않음 (예: 해당 분기 데이터 없음) | **재시도해도 결과가 같음** | `dataHeader.resultMessage` 를 그대로 표시 (예: "해당 분기의 매출 데이터가 없습니다. 다른 분기를 선택해 주세요.") — 재시도 버튼 금지 |
| 그 외 4xx (400/401/403/410 등) | 요청 자체의 문제 (검증 실패, 미인증, 만료 등) | 재시도해도 결과가 같음 | 입력 수정/로그인 유도 등 원인별 안내 |

- 모든 `*ErrorCode` 는 이 규약에 맞게 HttpStatus 를 매핑한다: **일시적 장애만 5xx, 데이터 부재는 반드시 404.**
  새 에러코드 추가 시 "재시도하면 결과가 달라질 수 있는가?"를 기준으로 상태 코드를 정한다.
- 분기 종속 데이터의 404 `resultMessage` 는 "해당 분기의 X 데이터가 없습니다. 다른 분기를 선택해 주세요." 형식을 따른다.

## 에러코드 대역

코드는 `{DOMAIN}_{번호}` 형식이고, `001~` 은 비즈니스 오류, `1xx` 는 요청 검증 오류입니다.

| 도메인 접두어 | 비즈니스 | 검증 폴백 | 필드별 검증 | 파라미터 타입 불일치 |
|--------------|---------|----------|------------|-------------------|
| `MEMBER` | `001~007` | `MEMBER_100` | `101~112` | `MEMBER_113` |
| `BOOKMARK` | `001~003` | (`MEMBER_100` 사용) | `101~106` | (`MEMBER_113` 사용) |
| `AUTH` | `001~014` | `AUTH_100` | `101~104` | `AUTH_105` |
| `COMMUNITY` | `001~012` | `COMMUNITY_100` | `101~116` | `COMMUNITY_117` |
| `COMMERCIAL` | `002~012` | `COMMERCIAL_100` | `101` | `COMMERCIAL_102` |
| `SHARE_LINK` | `001~006` | (`COMMERCIAL_100` 사용) | `101~102` | (`COMMERCIAL_102` 사용) |
| `MAP` | `001~008` | `MAP_100` | `101~102` | `MAP_103` |
| `AI` | `001~011` (`007` 대기열 포화) | `AI_100` | (없음) | `AI_101` |
| `DISTRICT` `001~003` / `ADMINISTRATION` `001~003` / `REGION` `001~005` | 조회 실패 등 | (검증 코드 없음) | - | - |
| `COMMERCIAL_SUMMARY` `001~002` / `AREA_BOUNDARY` `001` | 요약·경계 데이터 | - | - | - |
| `SECURITY` | `001~008` | 인증·인가 필터 계층 (토큰 만료·폐기·검증 불가 등) | - | - |

- 필드별 코드의 단일 기준점은 각 도메인의 `application/exception/{Domain}ValidationMessage` 상수 클래스입니다.
- `BOOKMARK` 는 별도 advice 가 없어 auth-service 의 `MemberExceptionHandler` 가 처리하므로 폴백·타입 코드는 `MEMBER` 대역을 씁니다.
- 규약 상세는 [`coding-conventions.md` §8-2](coding-conventions.md) 참고.

---

## auth-service

### 인증 (`/api/v1/auth`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/login` | 이메일/비밀번호 로그인, Access 토큰 + Refresh 쿠키 발급 | - |
| POST | `/logout` | 로그아웃, Refresh 토큰 무효화 + Access 토큰 jti 블랙리스트 등록 | 🔒 |
| POST | `/token/reissue` | Access 토큰 재발급 (Refresh 쿠키 필요, 토큰 회전) | - |
| GET | `/{provider}/authorize` | 소셜 로그인 인가 URL 생성 (`kakao` / `naver`, CSRF `state` 포함·10분 유효) | - |
| GET | `/{provider}/login` | 소셜 로그인 콜백 (`code`, `state`) — 미가입 이메일이면 자동 가입 후 로그인 | - |
| POST | `/email/send-code` | 회원가입용 이메일 인증코드 발송 (60초 쿨다운, 가입 여부 노출 없이 항상 성공 응답) | - |
| POST | `/email/verify-code` | 인증코드 검증 — 성공 시 30분 동안 해당 이메일로 가입 가능 | - |

**Refresh 토큰**은 응답 바디가 아니라 `HttpOnly` + `SameSite=Strict` 쿠키(`refreshToken`)로 전달됩니다. 로그아웃·비밀번호 변경·탈퇴 시 쿠키가 만료 처리됩니다.

### 회원 (`/api/v1/members`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/signup` | 이메일 회원가입 (이메일 인증 완료 상태여야 함) | - |
| GET | `/me` | 내 정보 조회 | 🔒 |
| PATCH | `/me` | 닉네임·프로필 이미지 수정 (`profileImageUrl` 생략 시 이미지 제거) | 🔒 |
| POST | `/me/password` | 비밀번호 변경 — 전 기기 토큰 재발급 차단, 재로그인 필요 | 🔒 |
| POST | `/me/withdraw` | 회원 탈퇴 — 개인정보 마스킹, 전 기기 재발급 차단, 동일 이메일 재가입 불가 | 🔒 |

비밀번호 변경·탈퇴는 Refresh 토큰을 삭제해 재발급을 차단합니다. 다른 기기에 남은 **기존 Access 토큰은 만료 시까지 유효할 수 있으며**, 회원 API 는 회원 상태 검사로 추가 차단됩니다.

### 북마크 (`/api/v1/members/me/bookmarks`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/` | 북마크 추가 (`targetType`, `targetCode`, `targetName`) | 🔒 |
| DELETE | `/{bookmarkId}` | 북마크 삭제 (본인 북마크만) | 🔒 |
| GET | `/` | 북마크 목록 (커서 페이지네이션, `lastBookmarkId` 기준) | 🔒 |

---

## commercial-service

### 상권 기본 데이터 (`/api/v1/commercials`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/{commercialCode}/service-categories` | 상권 내 업종 카테고리 목록 | - |
| GET | `/{commercialCode}/foot-traffic` | 유동인구 분석 (시간대·성별·연령대) | - |
| GET | `/{commercialCode}/services/{serviceCode}/sales` | 업종별 매출 분석 | - |
| GET | `/{commercialCode}/facilities` | 주변 시설 현황 | - |
| GET | `/{commercialCode}/population` | 거주인구 분석 | - |
| GET | `/{commercialCode}/income` | 소득·지출 분석 | - |
| GET | `/{commercialCode}/services/{serviceCode}/stores` | 업종별 점포 분석 (개폐업률 등) | - |
| GET | `/{commercialCode}/benchmarks` | 상권 벤치마크 비교 | - |

### 상권 요약 (`/api/v1/commercials/{commercialCode}/summaries`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/sales` | 매출 요약 (자치구·행정동·상권 계층별) | - |
| GET | `/income` | 소득 요약 | - |

### 트렌드 (`/api/v1/commercials/{commercialCode}/trend`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/` | 분기별 트렌드 분석 (`metricType`: SALES / FOOT_TRAFFIC / STORE, 최대 8분기) | - |

### 프로필 (`/api/v1/commercials/{commercialCode}/profile`)

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

> `/heatmap`, `/heatmap-composite`, `/candidates`, `/{commercialCode}/profile`, `/compare-preview` 는 `@Hidden` 이라 Swagger UI 에 노출되지 않습니다. district-service 가 지도용으로 감싸 제공하는 내부 지향 API 이므로, 화면에서는 district-service 의 `/api/v1/map/**` 을 쓰는 것이 기본입니다.

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
| GET | `/api/v1/administrations/{administrationCode}` | 행정동 상세 | - |
| GET | `/api/v1/districts/top-ten` | 상위 10 자치구 | - |
| GET | `/api/v1/districts/{districtCode}` | 자치구 상세 | - |
| GET | `/api/v1/districts/{districtCode}/foot-traffic` | 자치구 유동인구 | - |
| GET | `/api/v1/districts/{districtCode}/change-indicators` | 자치구 변화 지표 | - |
| GET | `/api/v1/districts/{districtCode}/stores/top-services` | 자치구 상위 업종별 점포 수 | - |
| GET | `/api/v1/districts/{districtCode}/sales/top-services` | 자치구 상위 업종별 매출 | - |
| GET | `/api/v1/districts/{districtCode}/sales/top-administrations` | 자치구 행정동별 매출 상위 | - |
| GET | `/api/v1/districts` | 전체 자치구 목록 | - |

### 공유 링크 (`/api/v1/share-links`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/` | 분석 화면 공유 링크 생성 (`shareType` + `payload`) — 동일 상태 재공유 시 기존 코드 재사용 + 만료 연장 | 선택 |
| GET | `/{shareCode}` | 공유 코드 해석 (`shareType` + `payload` 반환) | - |

- `POST` 는 **선택적 인증** — Bearer 토큰이 있으면 최초 공유자가 기록되고, 없어도 생성됩니다.
- `shareType` (`ShareTargetType`) 5종: `COMMERCIAL_ANALYSIS` / `DISTRICT_ANALYSIS` / `ADMINISTRATION_ANALYSIS` / `COMMERCIAL_COMPARISON` / `AI_REPORT`
- `payload` 는 백엔드가 해석하지 않는 JSON 객체(정규화 후 2000자 이하)로, 화면 복원은 프론트 책임입니다.
- `shareCode` 는 base62 8자, TTL 90일. 만료 시 `410`, 미존재 시 `404`.
- 프론트 연동 상세는 [`share-link-frontend-guide.md`](share-link-frontend-guide.md) 참고.

### 분석 보관함 (`/api/v1/analysis-bookmarks`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/` | 분석 화면 상태 보관 (`shareType` + `payload` + 선택 `bookmarkName`) — 동일 상태 재저장 시 `409` | 🔒 |
| GET | `/?page=&size=` | 내 보관함 최신순 목록 (size 1~50) | 🔒 |
| DELETE | `/{bookmarkId}` | 보관 항목 삭제 (타인 항목은 `404`) | 🔒 |

- `shareType`/`payload` 계약은 공유 링크와 동일하며, 공유 링크와 달리 **만료가 없고 본인만 조회**합니다.
- 프론트 연동 상세는 [`share-link-frontend-guide.md`](share-link-frontend-guide.md)의 "분석 보관함" 섹션 참고.

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
| GET | `/commercials/{commercialCode}/profile` | 상권 프로필 지도 오버레이용 | - |
| GET | `/commercials/compare-preview` | 비교 미리보기 지도 오버레이용 | - |

### 지역 코드 조회 (`/api/v1/regions`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/districts/{districtCode}/administrations` | 자치구 내 행정동 목록 | - |
| GET | `/districts/{districtCode}/administrations/{administrationCode}/commercials` | 행정동 내 상권 목록 | - |
| GET | `/code-lookup` | 이름으로 지역 코드 역조회 | - |
| GET | `/administrations/{administrationCode}` | 행정동 소속 자치구 조회 | - |
| GET | `/commercials/{commercialCode}/administration` | 상권 소속 행정동 조회 | - |

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
| POST | `/commercials/{commercialCode}` | 상권 AI 리포트 **작업 제출(비동기)** — 캐시 hit `200` + 결과, miss `202` + `jobId` | 🔒 |
| POST | `/commercials/comparisons` | 상권 비교 AI 인사이트 **작업 제출(비동기)** | 🔒 |
| POST | `/districts/{districtCode}` | 자치구 AI 리포트 **작업 제출(비동기)** | 🔒 |
| POST | `/administrations/{administrationCode}` | 행정동 AI 리포트 **작업 제출(비동기)** | 🔒 |
| GET | `/jobs/{jobId}` | 작업 상태·결과 조회 (폴링, 본인이 제출한 작업만) | 🔒 |
| GET | `/jobs/{jobId}/stream` | 작업 상태 SSE 스트림 (`text/event-stream`, 25초 하트비트, 본인 작업만) | 🔒 |

**주의사항**:
- 모든 엔드포인트가 인증 필요 — 외부 LLM 비용이 발생하므로 비로그인 호출을 막습니다.
- 동기 GET 조회 엔드포인트 4종은 **삭제**되었습니다. 리포트 4종 모두 제출(`POST`) → SSE(`GET /jobs/{jobId}/stream`) 또는 폴링(`GET /jobs/{jobId}`) 방식을 사용하세요.
- 내부 Feign 호출을 `CompletableFuture` 병렬 실행으로 처리하고, `commercial-service`·`district-service` 에서 수집한 데이터로 프롬프트를 구성합니다.
- 브라우저 기본 `EventSource` 는 `Authorization` 헤더를 지원하지 않으므로 **fetch 기반 SSE 클라이언트**를 사용하고, 스트림이 끊기면 폴링으로 폴백합니다.
- 작업 상태 응답의 `submissionStatus` / `jobType` / `status` 는 `{code, name, description}` metadata 객체로 내려갑니다.
- `status` 가 `PENDING` / `RUNNING` 일 때만 `progressMessages: List<String>` (리포트 종류별 진행 문구 로테이션 목록)이 함께 내려갑니다.

---

## 전체 엔드포인트 수

| 서비스 | 엔드포인트 수 | 구성 |
|--------|-------------|------|
| auth-service | 15 | 인증 7 + 회원 5 + 북마크 3 |
| commercial-service | 29 | 상권 18 + 자치구 8 + 행정동 1 + 공유링크 2 |
| district-service | 13 | 지도 8 + 지역코드 5 |
| community-service | 16 | 게시글 9 + 댓글 4 + 신고 1 + 모더레이션 2 |
| ai-service | 6 | 리포트 제출 4 + 작업 조회 2 (폴링 + SSE) |
| **합계** | **79** | |
