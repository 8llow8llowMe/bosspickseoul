# BossPickSeoul Backend API Reference

> 서비스별 전체 엔드포인트 요약. 인증이 필요한 API는 `🔒` 표시, 토큰이 있으면 활용하고 없어도 되는 API는 `선택` 표시.

## 노출 경로

| 서비스 | 외부 경로 | 비고 |
|--------|----------|------|
| auth-service | nginx → auth-service 직접 | 게이트웨이를 경유하지 않음. 게이트웨이는 Swagger 문서 집계(`/auth-service/**`)만 프록시 |
| commercial-service | nginx → api-gateway → 서비스 | `/api/v1/commercials`, `/api/v1/districts`, `/api/v1/administrations`, `/api/v1/share-links`, `/api/v1/simulations`, `/api/v1/analysis-bookmarks`, `/api/v1/analysis-rankings`, `/api/v1/policies` |
| district-service | nginx → api-gateway → 서비스 | `/api/v1/map`, `/api/v1/regions` |
| community-service | nginx → api-gateway → 서비스 | `/api/v1/community` |
| ai-service | nginx → api-gateway → 서비스 | `/api/v1/ai-reports` |

## 공통 응답 규약

모든 응답은 `Response<T>` 래퍼를 사용합니다. 성공 시 `resultCode` / `resultMessage` 는 `null` 이므로, 클라이언트는 `success` 플래그로 분기합니다.

```json
{ "dataHeader": { "success": true, "resultCode": null, "resultMessage": null }, "dataBody": { } }
```

### 식별자는 전부 문자열입니다

**응답의 모든 아이디 필드(`postId`, `memberId`, `policyId`, `bookmarkId`, `reportId`, 커서 `lastId` 등)는 숫자가 아니라 문자열입니다.**

우리 아이디는 Snowflake 로 만들고 `(timestamp - epoch) << 22` 라 현재 약 `7.5e17` 입니다. JavaScript 의 `Number.MAX_SAFE_INTEGER`(`9007199254740991`, 약 `9.0e15`)를 두 자릿수 넘습니다. 숫자로 내리면 `JSON.parse` 시점에 뒷자리가 조용히 날아가고, **서로 다른 아이디 여러 개가 프론트에서 같은 값으로 보입니다.** 오류가 아니라 오염이라 상세 조회·좋아요·삭제가 엉뚱한 대상에 걸려도 원인을 찾기 어렵습니다.

- auto-increment 로 만들어 지금은 한계 안에 있는 아이디(시뮬레이션 이력, 프랜차이즈)도 **같이 문자열**입니다. 필드마다 타입이 다르면 프론트가 분기해야 하고, 나중에 생성 전략이 바뀌면 조용히 깨집니다. 규칙은 하나입니다.
- **요청은 반대로 아무 형식이나 됩니다.** 응답에서 받은 문자열을 그대로 path·query·body 에 실어 보내면 서버가 알아서 숫자로 변환합니다. `Number()` 로 되돌리지 마세요 — 그 순간 다시 절삭됩니다.
- 아이디가 아닌 수치(`likeCount`, `viewCount`, `totalPrice`, `totalElements` 등)는 계속 **숫자**입니다. 계산에 쓰이는 값이라 문자열로 바꾸지 않습니다.
- 없는 아이디는 `"0"` 이 아니라 `null` 입니다.

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
| `MEMBER` | `001~009` | `MEMBER_100` | `101~112` | `MEMBER_113` |
| `BOOKMARK` | `001~003` | (`MEMBER_100` 사용) | `101~106` | (`MEMBER_113` 사용) |
| `AUTH` | `001~018` | `AUTH_100` | `101~104`, `106~108` | `AUTH_105` |
| `COMMUNITY` | `001~012` | `COMMUNITY_100` | `101~116`, `118~119` | `COMMUNITY_117` |
| `COMMERCIAL` | `002~012` | `COMMERCIAL_100` | `101` | `COMMERCIAL_102` |
| `SHARE_LINK` | `001~006` | (`COMMERCIAL_100` 사용) | `101~102` | (`COMMERCIAL_102` 사용) |
| `ANALYSIS_BOOKMARK` | `001~006` | (`COMMERCIAL_100` 사용) | `101~105` | (`COMMERCIAL_102` 사용) |
| `SIMULATION` | `001~004` | (`COMMERCIAL_100` 사용) | `101~109` | (`COMMERCIAL_102` 사용) |
| `RANKING` | `001~002` | (`COMMERCIAL_100` 사용) | `101` | (`COMMERCIAL_102` 사용) |
| `POLICY` | `001~002` | (`COMMERCIAL_100` 사용) | `101` | (`COMMERCIAL_102` 사용) |
| `MAP` | `001~008` | `MAP_100` | `101~102` | `MAP_103` |
| `AI` | `001~012` (`007` 대기열 포화, `012` 일일 사용량 초과) | `AI_100` | (없음) | `AI_101` |
| `STORAGE` | `001~007` | 파일 업로드 (형식·용량·저장소 실패) | - | - |
| `JWT` | `001~006` | 게이트웨이 토큰 검증 (만료·서명 불일치·폐기 등) | - | - |
| `DISTRICT` `001~003` / `ADMINISTRATION` `001~003` / `REGION` `001~005` | 조회 실패 등 | (검증 코드 없음) | - | - |
| `COMMERCIAL_SUMMARY` `001~002` / `AREA_BOUNDARY` `001` | 요약·경계 데이터 | - | - | - |
| `SECURITY` | `001~008` | 인증·인가 필터 계층 (토큰 만료·폐기·검증 불가 등) | - | - |

- 필드별 코드의 단일 기준점은 각 도메인의 `application/exception/{Domain}ValidationMessage` 상수 클래스입니다.
- `BOOKMARK` 는 별도 advice 가 없어 auth-service 의 `MemberExceptionHandler` 가 처리하므로 폴백·타입 코드는 `MEMBER` 대역을 씁니다.
- commercial-service 는 advice 가 하나뿐입니다. 그래서 `SHARE_LINK`·`ANALYSIS_BOOKMARK`·`SIMULATION`·`RANKING`·`POLICY` 는 필드별 코드만 자기 대역을 쓰고, 폴백과 타입 불일치는 `COMMERCIAL_100` / `COMMERCIAL_102` 로 나옵니다.
- `STORAGE` 는 auth-service·community-service 의 advice 가, `JWT` 는 게이트웨이 필터가 그대로 클라이언트에 내려주는 코드입니다. 두 대역은 도메인 접두어 규칙 밖에 있어 검증 대역이 없습니다.
- `COMMUNITY` 만 번호가 이어지지 않습니다. `117` 이 타입 불일치 코드로 먼저 배포된 뒤 필드 코드 `118`(이미지 장수)·`119`(조회 개수)가 추가됐습니다. 되돌리면 이미 배포된 프론트가 깨지므로 번호만 어긋난 상태로 둡니다.
- 규약 상세는 [`coding-conventions.md` §8-2](coding-conventions.md) 참고.

---

## auth-service

### 인증 (`/api/v1/auth`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/login` | 이메일/비밀번호 로그인, Access 토큰 + Refresh 쿠키 발급 | - |
| POST | `/logout` | 현재 기기 세션만 로그아웃 (해당 refresh 무효화 + Access 토큰 jti 블랙리스트, 다른 기기 로그인 유지) | 🔒 |
| POST | `/token/reissue` | Access 토큰 재발급 (Refresh 쿠키 필요, 토큰 회전) | - |
| GET | `/{provider}/authorize` | 소셜 로그인 인가 URL 생성 (`kakao` / `naver`, CSRF `state` 포함·10분 유효) | - |
| GET | `/{provider}/login` | 소셜 로그인 콜백 (`code`, `state`) — 미가입 이메일이면 자동 가입 후 로그인 | - |
| POST | `/email/send-code` | 회원가입용 이메일 인증코드 발송 (60초 쿨다운 + IP 발송 상한, 가입 여부 노출 없이 항상 성공 응답) | - |
| POST | `/email/verify-code` | 인증코드 검증 — 성공 시 30분 동안 해당 이메일로 가입 가능 | - |
| POST | `/password/reset/send-code` | 비밀번호 재설정 코드 발송 (일반 계정 전용, 계정 존재 여부 노출 없이 항상 성공 응답) | - |
| POST | `/password/reset` | 코드 검증 후 비밀번호 재설정 — 성공 시 전 기기 세션 무효화 | - |
| GET | `/sessions` | 로그인 중인 기기 세션 목록 (deviceInfo·마지막 사용 시각·현재 기기 여부) | 🔒 |
| DELETE | `/sessions/{sessionId}` | 특정 기기 세션 해제 (멱등) | 🔒 |

**Refresh 토큰**은 응답 바디가 아니라 `HttpOnly` + `SameSite=Strict` 쿠키(`refreshToken`)로 전달됩니다. 로그아웃·비밀번호 변경·탈퇴 시 쿠키가 만료 처리됩니다.

### 회원 (`/api/v1/members`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/signup` | 이메일 회원가입 (이메일 인증 완료 상태여야 함) | - |
| GET | `/me` | 내 정보 조회 | 🔒 |
| PATCH | `/me` | 닉네임 수정 (`nickname` 만 받는다 — 프로필 이미지는 아래 전용 API 로 관리) | 🔒 |
| POST | `/me/profile-image` | 프로필 이미지 업로드 (`multipart/form-data`) | 🔒 |
| DELETE | `/me/profile-image` | 프로필 이미지 삭제 | 🔒 |
| POST | `/me/password` | 비밀번호 변경 — 전 기기 토큰 재발급 차단, 재로그인 필요 | 🔒 |
| POST | `/me/password/setup` | 비밀번호 최초 설정 (소셜 전용 계정에 이메일 로그인 수단 추가) | 🔒 |
| DELETE | `/me/password` | 소셜 전용 계정 전환 — 비밀번호 제거 (소셜 연결 계정만, 전 기기 로그아웃) | 🔒 |
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
| POST | `/` | 분석 화면 상태 보관 (`shareType` + `payload` + 선택 `bookmarkName`) — 동일 상태 재저장 시 `409` (dataBody 에 `existingBookmarkId`) | 🔒 |
| GET | `/?shareType=&page=&size=` | 내 보관함 최신순 목록 (size 1~50, `shareType` 선택 필터) | 🔒 |
| PATCH | `/{bookmarkId}` | 보관함 이름 수정 (`bookmarkName` null/공백이면 이름 제거) | 🔒 |
| DELETE | `/{bookmarkId}` | 보관 항목 삭제 (타인 항목은 `404`) | 🔒 |

- `shareType`/`payload` 계약은 공유 링크와 동일하며, 공유 링크와 달리 **만료가 없고 본인만 조회**합니다.
- 응답의 `bookmarkId` 는 JS 정밀도 손상을 막기 위해 **문자열**입니다.
- 회원당 저장 상한(기본 100개)을 넘으면 `400 ANALYSIS_BOOKMARK_006` 으로 응답합니다.
- 프론트 연동 상세는 [`share-link-frontend-guide.md`](share-link-frontend-guide.md)의 "분석 보관함" 섹션 참고.

### 시뮬레이션 (`/api/v1/simulations`)

창업 비용·수익 시뮬레이션입니다. 조회는 비인증이고, 이력 저장/조회만 로그인이 필요합니다.

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/store-sizes` | 업종별 매장 크기 기준 (소/중/대, ㎡·평) | - |
| GET | `/franchisees` | 프랜차이즈 브랜드 검색 (`keyword`, `serviceCode`, 커서) | - |
| POST | `/reports` | 시뮬레이션 리포트 생성 (저장하지 않음) | - |
| POST | `/histories` | 시뮬레이션 결과를 내 이력에 저장 | 🔒 |
| GET | `/histories` | 내 시뮬레이션 이력 목록 | 🔒 |

리포트 생성(`POST /reports`)과 저장(`POST /histories`)이 분리되어 있습니다. 로그인하지 않아도 결과를 볼 수 있고, 저장하려는 시점에만 인증이 필요합니다.

### 인기 순위 (`/api/v1/analysis-rankings`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/` | 최근 분석 조회 기준 인기 지역 순위 (`areaType` 필수, `size` 1~50 기본 10) | - |

`size` 가 범위를 벗어나면 `RANKING_101` 로 거절합니다.

분석 조회 이벤트를 Kafka 로 발행하고 consumer 가 Redis Sorted Set 에 집계한 결과를 읽습니다. 조회 API 는 Redis 만 사용하므로 `RANKING_ENABLED` 와 무관하게 항상 동작하며, 파이프라인이 꺼져 있으면 빈 순위가 나옵니다. 자세한 구성은 [`deploy-guide.md`](deploy-guide.md) 의 "인기 순위(Kafka) 활성화 시 필요한 key" 참고.

### 지원 정책 (`/api/v1/policies`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/` | 자치구·업종 조건으로 신청 가능한 지원 정책 추천 (`districtCode`, `serviceCode`, `size` 기본 5) | - |

**범위 포함 매칭입니다.** 자치구를 지정해도 지역 제한이 없는 전국 정책이 함께 나옵니다. 업종도 같습니다. 사용자는 "내가 받을 수 있는 것"을 보려는 것이지 "내 자치구에만 있는 것"을 보려는 게 아니기 때문입니다.

`serviceCode` 는 앞 3자리를 업종 대분류로 사용합니다 (`CS100001` → `CS1`). 정책은 세부 업종까지 나누지 않고 대분류 단위로 대상을 지정합니다.

정렬은 **자치구 전용 → 마감 임박순 → 상시 모집** 순입니다. 신청 기간이 지난 정책은 제외됩니다.

같은 결과가 `GET /api/v1/commercials/{commercialCode}/profile` 응답의 `policyRecommendations` 에도 상위 5건 포함됩니다. 상권 프로필을 볼 때 별도 호출 없이 정책을 함께 보여주기 위함입니다.

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
| GET | `/districts/{districtCode}` | 자치구 단건 조회 | - |
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
| GET | `/` | 피드 목록 (정렬·`targetType`·`targetCode` 필터, 무한스크롤, `size` 1~50) | - |
| GET | `/search` | 키워드 검색 (`size` 1~50) | - |
| GET | `/{postId}` | 게시글 상세 (조회수 +1 자동) | - |
| POST | `/` | 게시글 작성 | 🔒 |
| PATCH | `/{postId}` | 게시글 수정 (작성자 본인만) | 🔒 |
| DELETE | `/{postId}` | 게시글 삭제 (소프트 삭제) | 🔒 |
| POST | `/{postId}/likes` | 좋아요 토글 | 🔒 |
| GET | `/liked` | 내가 좋아요한 게시글 목록 (`size` 1~50) | 🔒 |
| POST | `/images` | 게시글 이미지 업로드 (`multipart/form-data`) | 🔒 |
| POST | `/drafts/commercial-comparisons` | 상권 비교 결과 커뮤니티 게시글 초안 생성 | - |

목록 3종(`/`, `/search`, `/liked`)의 `size` 는 1~50 입니다. 범위를 벗어나면 `COMMUNITY_119` 로 거절합니다. 커서는 `lastPostId` 이고, 인기순 정렬일 때만 `lastLikeCount` 를 함께 넘깁니다.

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
| auth-service | 17 | 인증 7 + 회원 7 + 북마크 3 |
| commercial-service | 40 | 상권 18 + 자치구 8 + 행정동 1 + 공유링크 2 + 보관함 4 + 시뮬레이션 5 + 인기순위 1 + 정책 1 |
| district-service | 14 | 지도 8 + 지역코드 6 |
| community-service | 17 | 게시글 10 + 댓글 4 + 신고 1 + 모더레이션 2 |
| ai-service | 6 | 리포트 제출 4 + 작업 조회 2 (폴링 + SSE) |
| **합계** | **94** | |
