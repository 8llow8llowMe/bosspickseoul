# Frontend API Usage Guide

## Purpose

이 문서는 프론트엔드 개발자가 BossPickSeoul API를 화면에 붙일 때 참고하는 실전 가이드다.

- `api-reference.md`: 전체 엔드포인트 목록과 인증 여부를 확인한다.
- `api-screens.md`: 화면별 호출 순서와 기존 설계 맥락을 확인한다.
- `map-api-frontend-guide.md`: 지도 viewport, polygon, 히트맵, 후보 상권 지도 UX를 자세히 확인한다.
- 이 문서: 프론트 화면 기준으로 어떤 API를 어디에 쓰는지 빠르게 판단한다.

## API Entry Rules

| Area | Frontend Default |
| --- | --- |
| 인증, 회원 | `auth-service` 직접 호출 |
| 지도, 지역 코드, 지도용 상권 추천 | `district-service`의 `/api/v1/map/**`, `/api/v1/regions/**` |
| 상권 상세 분석 차트 | `commercial-service`의 `/api/v1/commercials/**` |
| 자치구, 행정동 상세 분석 | `commercial-service`의 `/api/v1/districts/**`, `/api/v1/administrations/**` |
| 커뮤니티 | `community-service`의 `/api/v1/community/**` |
| AI 리포트 | `ai-service`의 `/api/v1/ai-reports/**` |
| 분석 결과 공유 | `commercial-service`의 `/api/v1/share-links/**` |

지도 위에서 쓰는 히트맵, 후보 상권, 상권 프로필, 비교 미리보기는 `commercial-service`를 직접 호출하지 말고 `/api/v1/map/**`을 우선 사용한다. `district-service`가 상권 분석 결과에 경계 좌표를 조합해서 내려준다.

## Auth And Member

### Login Page

| API | When To Use |
| --- | --- |
| `POST /api/v1/auth/login` | 이메일, 비밀번호 로그인 버튼 클릭 |
| `GET /api/v1/auth/{provider}/authorize` | 카카오/네이버 로그인 시작 버튼 클릭 |
| `GET /api/v1/auth/{provider}/login` | OAuth callback 페이지에서 `code`, `state` 처리 |
| `POST /api/v1/auth/token/reissue` | access token 만료 후 인터셉터에서 자동 재발급 |
| `POST /api/v1/auth/logout` | 헤더 또는 마이페이지 로그아웃 버튼 |

프론트 처리 포인트:

- refresh token은 `HttpOnly` cookie로 내려오므로 JS에서 저장하지 않는다.
- API 클라이언트는 refresh cookie 전송을 위해 credentials 옵션을 켠다.
- 401이 오면 `token/reissue`를 한 번 시도하고, 실패하면 로그인 화면으로 보낸다.
- 소셜 로그인 `state`는 프론트에서 임의 생성하지 않는다. 백엔드가 발급한 authorize URL로 이동한다.

### Signup Page

| API | When To Use |
| --- | --- |
| `POST /api/v1/auth/email/send-code` | 이메일 인증 코드 요청 |
| `POST /api/v1/auth/email/verify-code` | 인증 코드 확인 |
| `POST /api/v1/members/signup` | 회원가입 최종 제출 |

권장 흐름:

```text
1. 이메일 입력
2. /auth/email/send-code
3. 인증 코드 입력
4. /auth/email/verify-code
5. 회원 정보 입력
6. /members/signup
7. 로그인 화면 또는 자동 로그인 흐름으로 이동
```

### My Page

| API | When To Use |
| --- | --- |
| `GET /api/v1/members/me` | 마이페이지 진입, 헤더 프로필 초기화 |
| `PATCH /api/v1/members/me` | 닉네임, 프로필 이미지 변경 |
| `POST /api/v1/members/me/password` | 비밀번호 변경 |
| `POST /api/v1/members/me/withdraw` | 회원 탈퇴 |
| `GET /api/v1/members/me/bookmarks` | 관심 지역/상권 목록 |
| `POST /api/v1/members/me/bookmarks` | 상세 화면 북마크 추가 |
| `DELETE /api/v1/members/me/bookmarks/{bookmarkId}` | 북마크 목록에서 제거 |

주의:

- `PATCH /members/me`에서 `profileImageUrl`을 생략하면 프로필 이미지 제거로 처리된다. 유지하려면 기존 값을 다시 보내야 한다.
- 비밀번호 변경과 탈퇴 성공 후에는 refresh cookie가 만료되므로 프론트 인증 상태를 비우고 로그인 화면으로 보낸다.

## Map Main

자세한 지도 구현은 `map-api-frontend-guide.md`를 기준으로 한다.

| UI | API | Usage |
| --- | --- | --- |
| 자치구 polygon | `GET /api/v1/map/districts` | 낮은 줌 레벨 지도 경계 |
| 행정동 polygon | `GET /api/v1/map/administrations` | 중간 줌 레벨 지도 경계 |
| 상권 polygon | `GET /api/v1/map/commercials` | 높은 줌 레벨 상권 선택 |
| 히트맵 | `GET /api/v1/map/commercials/heatmap` | 상권별 점수와 색상 등급 |
| 추천 프리셋 | `GET /api/v1/map/candidate-presets` | 프리셋 드롭다운, 온보딩 선택지 |
| 후보 상권 | `GET /api/v1/map/commercials/candidates` | 추천 상권 랭킹 패널, 지도 강조 |
| 지도 상권 프로필 | `GET /api/v1/map/commercials/{commercialCode}/profile` | polygon 클릭 후 간단 상세 패널 |
| 비교 미리보기 | `GET /api/v1/map/commercials/compare-preview` | 지도에서 두 상권 선택 후 말풍선 |

권장 흐름:

```text
1. 지도 진입 시 candidate-presets 로드
2. 현재 zoom에 맞는 영역 API 호출
3. 업종 선택 후 heatmap 호출
4. polygon 클릭 시 map profile 호출
5. 추천 모드 선택 시 candidates 호출
6. 상권 2개 선택 시 compare-preview 호출
```

프론트 처리 포인트:

- 지도 이동 이벤트에는 debounce를 적용한다.
- 낮은 줌에서 `/map/commercials`를 바로 호출하지 않는다.
- `boundaryCoords`는 `[lng, lat]` 순서다.
- Swagger UI는 큰 polygon 응답을 렌더링하지 못할 수 있으므로 실제 확인은 브라우저, Postman, curl을 우선한다.

## Region Search And Selectors

| UI | API | Usage |
| --- | --- | --- |
| 자치구 선택 후 행정동 드롭다운 | `GET /api/v1/regions/districts/{districtCode}/administrations` | 행정동 목록 조회 |
| 행정동 선택 후 상권 목록 | `GET /api/v1/regions/districts/{districtCode}/administrations/{administrationCode}/commercials` | 상권 목록 조회 |
| 검색 자동완성 | `GET /api/v1/regions/code-lookup` | 이름으로 자치구/행정동/상권 코드 검색 |
| 행정동 breadcrumb | `GET /api/v1/regions/administrations/{administrationCode}` | 행정동의 자치구 정보 |
| 상권 breadcrumb | `GET /api/v1/regions/commercials/{commercialCode}/administration` | 상권의 행정동/자치구 정보 |

권장 사용:

- 검색창에서 사용자가 지역명을 입력하면 `code-lookup`으로 후보를 보여준다.
- 상권 상세 페이지에서 breadcrumb가 필요하면 `commercials/{code}/administration`을 호출한다.
- 지역 셀렉터는 자치구 목록이 필요할 때 commercial-service의 `GET /api/v1/districts`와 조합해도 된다.

## Commercial Detail

상권 상세 페이지는 지도용 프로필 API와 분석 상세 API를 나눠 쓰는 것이 좋다.

| Section | API | Usage |
| --- | --- | --- |
| 상단 요약 카드 | `GET /api/v1/map/commercials/{commercialCode}/profile` | 이름, 자치구, 행정동, 주요 지표 요약 |
| 업종 선택 | `GET /api/v1/commercials/{commercialCode}/service-categories` | 해당 상권에서 제공 가능한 업종 목록 |
| 유동인구 차트 | `GET /api/v1/commercials/{commercialCode}/foot-traffic` | 시간대, 요일, 성별, 연령대 차트 |
| 매출 차트 | `GET /api/v1/commercials/{commercialCode}/services/{serviceCode}/sales` | 업종 기준 매출 분석 |
| 점포 차트 | `GET /api/v1/commercials/{commercialCode}/services/{serviceCode}/stores` | 개업률, 폐업률, 유사 점포 |
| 주변 시설 | `GET /api/v1/commercials/{commercialCode}/facilities` | 교통, 집객 시설, 생활 시설 |
| 거주인구 | `GET /api/v1/commercials/{commercialCode}/population` | 연령/성별 거주인구 |
| 소득/지출 | `GET /api/v1/commercials/{commercialCode}/income` | 소득 구간, 지출 카테고리 |
| 추세 그래프 | `GET /api/v1/commercials/{commercialCode}/trend` | 매출/유동인구/점포 분기별 추이 |
| 벤치마크 | `GET /api/v1/commercials/{commercialCode}/benchmarks` | 자치구/행정동 평균과 비교 |
| 매출 요약 | `GET /api/v1/commercials/{commercialCode}/summaries/sales` | 상권/행정동/자치구 계층 비교 |
| 소득 요약 | `GET /api/v1/commercials/{commercialCode}/summaries/income` | 지출/소득 계층 비교 |

권장 흐름:

```text
1. map profile로 상단 패널을 빠르게 렌더링
2. service-categories로 업종 탭 구성
3. 기본 serviceCode 선택 후 sales, stores, trend 병렬 호출
4. foot-traffic, facilities, population, income은 아래 섹션 lazy load
5. AI 리포트는 사용자가 버튼을 누를 때만 호출
```

## Commercial Compare

| UI | API | Usage |
| --- | --- | --- |
| 지도 말풍선 비교 | `GET /api/v1/map/commercials/compare-preview` | 두 상권 선택 직후 가벼운 미리보기 |
| 비교 상세 페이지 | `GET /api/v1/commercials/compare` | 매출, 유동인구, 점포, 인구 등 상세 비교 |
| 비교 공유 글 초안 | `POST /api/v1/community/posts/drafts/commercial-comparisons` | 비교 결과 기반 커뮤니티 글 초안 |
| 비교 AI 인사이트 | `POST /api/v1/ai-reports/commercials/comparisons` | 비동기 제출 → 202 시 jobId로 SSE/폴링 조회 |

권장 흐름:

```text
1. 지도에서 상권 2개 선택
2. compare-preview로 즉시 말풍선 표시
3. 사용자가 비교 상세로 이동하면 /commercials/compare 호출
4. 공유하기 클릭 시 drafts/commercial-comparisons 호출
5. AI 비교 인사이트는 별도 섹션에서 lazy load
   — POST 제출 후 200이면 즉시 렌더, 202이면 jobId로 SSE 구독(실패 시 폴링 폴백)
```

## District And Administration Detail

| Page | API | Usage |
| --- | --- | --- |
| 자치구 목록 | `GET /api/v1/districts` | 필터, 드롭다운, 지역 선택 |
| 자치구 TOP 10 | `GET /api/v1/districts/top-ten` | 메인 대시보드 랭킹 |
| 자치구 상세 | `GET /api/v1/districts/{districtCode}` | 자치구 요약 카드 |
| 자치구 유동인구 | `GET /api/v1/districts/{districtCode}/foot-traffic` | 자치구 단위 인구 차트 |
| 자치구 변화 지표 | `GET /api/v1/districts/{districtCode}/change-indicators` | 개폐업 변화 흐름 |
| 자치구 점포 TOP 업종 | `GET /api/v1/districts/{districtCode}/stores/top-services` | 점포 수 기준 업종 랭킹 |
| 자치구 매출 TOP 업종 | `GET /api/v1/districts/{districtCode}/sales/top-services` | 매출 기준 업종 랭킹 |
| 자치구 행정동 매출 순위 | `GET /api/v1/districts/{districtCode}/sales/top-administrations` | 행정동별 매출 비교 |
| 행정동 상세 | `GET /api/v1/administrations/{administrationCode}` | 행정동 요약 페이지 |

권장 사용:

- 대시보드 홈에는 `top-ten`과 `districts`를 사용한다.
- 자치구 상세 페이지에서는 요약 API를 먼저 렌더링하고, 차트 API는 섹션별 lazy load한다.
- 행정동 상세는 지도나 지역 검색에서 진입할 때 사용한다.

## Community

| UI | API | Usage |
| --- | --- | --- |
| 커뮤니티 피드 | `GET /api/v1/community/posts` | 전체 글 또는 특정 지역/상권 글 목록 |
| 검색 결과 | `GET /api/v1/community/posts/search` | 키워드 검색 |
| 내가 좋아요한 글 | `GET /api/v1/community/posts/liked` | 마이페이지 |
| 게시글 상세 | `GET /api/v1/community/posts/{postId}` | 상세 진입, 조회수 증가 |
| 글 작성 | `POST /api/v1/community/posts` | 커뮤니티 글 작성 |
| 글 수정 | `PATCH /api/v1/community/posts/{postId}` | 작성자 수정 |
| 글 삭제 | `DELETE /api/v1/community/posts/{postId}` | 작성자 삭제 |
| 글 좋아요 | `POST /api/v1/community/posts/{postId}/likes` | 좋아요 토글 |
| 댓글 목록 | `GET /api/v1/community/posts/{postId}/comments` | 댓글/대댓글 표시 |
| 댓글 작성 | `POST /api/v1/community/posts/{postId}/comments` | 댓글 또는 대댓글 |
| 댓글 삭제 | `DELETE /api/v1/community/posts/{postId}/comments/{commentId}` | 작성자 삭제 |
| 댓글 좋아요 | `POST /api/v1/community/posts/{postId}/comments/{commentId}/likes` | 댓글 좋아요 토글 |
| 신고 | `POST /api/v1/community/reports` | 게시글/댓글 신고 |

피드 필터 예시:

```http
GET /api/v1/community/posts?targetType=COMMERCIAL&targetCode=3110008&sortType=LATEST&orderType=DESC&lastPostId=0&size=10
```

권장 사용:

- 상권 상세 페이지 하단에는 `targetType=COMMERCIAL&targetCode={commercialCode}`로 해당 상권 글만 보여준다.
- 전체 커뮤니티 탭에서는 target filter 없이 호출한다.
- 무한 스크롤은 응답의 마지막 post id를 다음 `lastPostId`로 사용한다.

## Moderation

| UI | API | Usage |
| --- | --- | --- |
| 관리자 신고 목록 | `GET /api/v1/moderation/reports` | PENDING 신고 목록 |
| 신고 처리 | `PATCH /api/v1/moderation/reports/{reportId}` | 숨김 승인 또는 기각 |

관리자 전용 화면에서만 노출한다. 일반 사용자 번들에서는 라우트 자체를 숨기는 것이 좋다.

## AI Reports

모든 AI 리포트 API는 인증이 필요하다. 동기 GET 조회 엔드포인트는 **제거**되었으므로 반드시 POST 제출 → SSE/폴링 흐름을 사용한다. 상세 구현은 `ai-report-frontend-guide.md`를 참고한다.

| UI | API | Usage |
| --- | --- | --- |
| 상권 AI 분석 버튼 | `POST /api/v1/ai-reports/commercials/{commercialCode}` | 비동기 작업 제출, 캐시 hit 시 즉시 결과 |
| 비교 AI 인사이트 | `POST /api/v1/ai-reports/commercials/comparisons` | 두 상권 비교 AI 요약 비동기 제출 |
| 자치구 AI 리포트 | `POST /api/v1/ai-reports/districts/{districtCode}` | 자치구 상세 AI 섹션 비동기 제출 |
| 행정동 AI 리포트 | `POST /api/v1/ai-reports/administrations/{administrationCode}` | 행정동 상세 AI 섹션 비동기 제출 |
| AI 작업 SSE 스트림 | `GET /api/v1/ai-reports/jobs/{jobId}/stream` | 작업 상태 실시간 수신 (**권장**, `job-update` 이벤트) |
| AI 작업 폴링 | `GET /api/v1/ai-reports/jobs/{jobId}` | SSE 실패 시 폴백, 상태 + 완료 시 리포트 |

AI 권장 흐름 (**SSE 우선, 실패 시 폴링 폴백**):

```text
1. 사용자가 "AI 분석 보기" 클릭
2. POST /ai-reports/... 제출
3. 200이면 리포트 즉시 표시
4. 202이면 jobId 저장 후 /ai-reports/jobs/{jobId}/stream SSE 구독
   (브라우저 기본 EventSource는 Authorization 헤더 미지원 → fetch 기반 SSE 클라이언트 사용)
5. SSE 연결 실패나 중단 시 /ai-reports/jobs/{jobId} 폴링으로 폴백
6. COMPLETED면 결과 표시
7. FAILED면 fallback 메시지 표시
8. 60초 이상 계속 RUNNING이면 사용자에게 재시도 안내
```

- 작업 상태 응답의 `status`/`jobType`은 `{code, name, description}` 객체이므로 `status.code`로 분기한다.
- PENDING/RUNNING 동안에는 `progressMessages` 배열로 진행 문구를 로테이션 표시한다.

AI API는 비용과 시간이 드는 작업이므로 초기 페이지 렌더링에 포함하지 말고 사용자가 요청하거나 섹션이 화면에 들어올 때 lazy load한다.

## Share Link

분석 화면 공유는 `commercial-service`의 `/api/v1/share-links/**`를 사용한다. 상세 구현은 `share-link-frontend-guide.md`를 참고한다.

| UI | API | Usage |
| --- | --- | --- |
| 공유하기 버튼 | `POST /api/v1/share-links` | `shareType` + `payload`로 단축 코드 생성 |
| `/s/{shareCode}` 진입 | `GET /api/v1/share-links/{shareCode}` | 코드를 `shareType` + `payload`로 해석 |

권장 흐름:

```text
1. 공유 버튼 클릭 시 POST /share-links {shareType, payload}
2. 응답 {shareCode, shareType, expiresAt}에서 shareCode로 공유 URL 조립: /s/{shareCode}
3. 수신자가 /s/{shareCode} 진입 시 GET /share-links/{shareCode}
4. shareType.code로 URL 템플릿 선택 + payload 병합 → router.replace로 원 화면 복원
```

프론트 처리 포인트:

- 생성/해석 모두 **비로그인 가능** — 공유 버튼에 로그인 게이팅을 두지 않는다. 토큰을 실어 보내면 최초 공유자가 기록되므로 로그인 상태면 첨부를 권장한다.
- `payload`는 화면 재현에 필요한 최소 상태만 담는다 (백엔드는 해석하지 않고 그대로 반환).
- 같은 상태 재공유 시 기존 코드가 재사용되고 만료(90일)만 연장된다.
- 만료 `410`, 미존재 `404` → 안내 후 홈으로 폴백한다.

## Recommended Screen Composition

### Home Dashboard

```text
1. GET /api/v1/districts/top-ten
2. GET /api/v1/districts
3. GET /api/v1/map/districts
```

### Map Analysis

```text
1. GET /api/v1/map/candidate-presets
2. GET /api/v1/map/{districts|administrations|commercials}
3. GET /api/v1/map/commercials/heatmap
4. GET /api/v1/map/commercials/candidates
```

### Commercial Detail

```text
1. GET /api/v1/map/commercials/{commercialCode}/profile
2. GET /api/v1/commercials/{commercialCode}/service-categories
3. GET /api/v1/commercials/{commercialCode}/services/{serviceCode}/sales
4. GET /api/v1/commercials/{commercialCode}/services/{serviceCode}/stores
5. GET /api/v1/commercials/{commercialCode}/foot-traffic
6. POST /api/v1/ai-reports/commercials/{commercialCode} only when requested
```

### Community Detail

```text
1. GET /api/v1/community/posts/{postId}
2. GET /api/v1/community/posts/{postId}/comments
3. POST /api/v1/community/posts/{postId}/likes when user toggles like
```

### My Page

```text
1. GET /api/v1/members/me
2. GET /api/v1/members/me/bookmarks
3. GET /api/v1/community/posts/liked
```

## Performance And UX Notes

- 큰 지도 응답은 bounds와 zoom 기준으로 캐싱한다.
- 상세 페이지 차트 API는 화면 첫 진입에 모두 몰아치지 말고 섹션별 lazy load한다.
- AI API는 명시적 사용자 액션 또는 lazy section에서만 호출한다.
- 인증 API는 refresh cookie 기반이므로 API 클라이언트에서 credentials 옵션을 유지한다.
- 에러 응답은 `dataHeader.resultCode`를 기준으로 분기하고, validation error는 `resultMessage.errors[]`를 필드별로 매핑한다.
- **"다시 시도" UI는 HTTP 상태로 구분한다** (상세: `api-reference.md` "오류 처리 규약"):
  - 네트워크 무응답 / **5xx** → "잠시 후 다시 시도해 주세요" + 다시 시도 버튼 (일시 장애, 재시도 유효)
  - **404** → 재시도 버튼을 띄우지 말고 `dataHeader.resultMessage`를 그대로 표시
    (예: "해당 분기의 매출 데이터가 없습니다. 다른 분기를 선택해 주세요." — 분기 셀렉터로 유도)
  - 그 외 4xx → 입력 수정/로그인 유도 등 원인별 안내
- 지도용 상권 API는 `/api/v1/map/**`을 우선 사용하고, 순수 분석 차트만 `/api/v1/commercials/**`를 직접 사용한다.
