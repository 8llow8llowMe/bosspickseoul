# BossPickSeoul dev API endpoint snapshot

> 이 파일은 `node frontend/scripts/sync-openapi.mjs`로 생성합니다.
> 인증 여부는 각 operation의 OpenAPI `security` 선언만 기준으로 표시합니다.

## 지역/지도

- OpenAPI: `3.1.0`
- 버전: `v1`
- 원문: https://api-dev.bosspickseoul.com/district-service/v3/api-docs

| Method | Path                                                                                        | 요약                         | 인증   |
| ------ | ------------------------------------------------------------------------------------------- | ---------------------------- | ------ |
| GET    | `/api/v1/regions/districts/{districtCode}/administrations`                                  | 자치구 소속 행정동 목록 조회 | 불필요 |
| GET    | `/api/v1/regions/districts/{districtCode}/administrations/{administrationCode}/commercials` | 행정동 소속 상권 목록 조회   | 불필요 |
| GET    | `/api/v1/regions/commercials/{commercialCode}/administration`                               | 상권 소속 지역 조회          | 불필요 |
| GET    | `/api/v1/regions/code-lookup`                                                               | 지역 명칭 기준 코드 조회     | 불필요 |
| GET    | `/api/v1/regions/administrations/{administrationCode}`                                      | 행정동 상위 지역 조회        | 불필요 |
| GET    | `/api/v1/map/districts`                                                                     | 자치구 영역 좌표 조회        | 불필요 |
| GET    | `/api/v1/map/commercials`                                                                   | 상권 영역 좌표 조회          | 불필요 |
| GET    | `/api/v1/map/commercials/{commercialCode}/profile`                                          | 상권 프로필 조회             | 불필요 |
| GET    | `/api/v1/map/commercials/heatmap`                                                           | 상권 히트맵 조회             | 불필요 |
| GET    | `/api/v1/map/commercials/compare-preview`                                                   | 상권 비교 프리뷰 조회        | 불필요 |
| GET    | `/api/v1/map/commercials/candidates`                                                        | 후보 상권 랭킹 조회          | 불필요 |
| GET    | `/api/v1/map/candidate-presets`                                                             | 후보 탐색 프리셋 조회        | 불필요 |
| GET    | `/api/v1/map/administrations`                                                               | 행정동 영역 좌표 조회        | 불필요 |

## 인증/회원

- OpenAPI: `3.1.0`
- 버전: `v1`
- 원문: https://api-dev.bosspickseoul.com/auth-service/v3/api-docs

| Method | Path                                        | 요약              | 인증   |
| ------ | ------------------------------------------- | ----------------- | ------ |
| POST   | `/api/v1/members/signup`                    | 일반 회원가입     | 불필요 |
| GET    | `/api/v1/members/me/bookmarks`              | 북마크 목록 조회  | 필요   |
| POST   | `/api/v1/members/me/bookmarks`              | 북마크 추가       | 필요   |
| POST   | `/api/v1/auth/token/reissue`                | 토큰 재발급       | 불필요 |
| POST   | `/api/v1/auth/logout`                       | 로그아웃          | 필요   |
| POST   | `/api/v1/auth/login`                        | 일반 로그인       | 불필요 |
| GET    | `/api/v1/members/me`                        | 내 회원 정보 조회 | 필요   |
| DELETE | `/api/v1/members/me/bookmarks/{bookmarkId}` | 북마크 삭제       | 필요   |

## 상권 분석

- OpenAPI: `3.1.0`
- 버전: `v1`
- 원문: https://api-dev.bosspickseoul.com/commercial-service/v3/api-docs

| Method | Path                                                                 | 요약                          | 인증   |
| ------ | -------------------------------------------------------------------- | ----------------------------- | ------ |
| GET    | `/api/v1/districts`                                                  | 전체 자치구 목록 조회         | 불필요 |
| GET    | `/api/v1/districts/{districtCode}`                                   | 자치구 통합 상세 조회         | 불필요 |
| GET    | `/api/v1/districts/{districtCode}/stores/top-services`               | 자치구 점포 상세 조회         | 불필요 |
| GET    | `/api/v1/districts/{districtCode}/sales/top-services`                | 자치구 매출 Top 5 조회        | 불필요 |
| GET    | `/api/v1/districts/{districtCode}/sales/top-administrations`         | 자치구 행정동 매출 Top 5 조회 | 불필요 |
| GET    | `/api/v1/districts/{districtCode}/foot-traffic`                      | 자치구 유동인구 상세 조회     | 불필요 |
| GET    | `/api/v1/districts/{districtCode}/change-indicators`                 | 자치구 변화지표 상세 조회     | 불필요 |
| GET    | `/api/v1/districts/top-ten`                                          | 자치구 Top 10 요약 조회       | 불필요 |
| GET    | `/api/v1/commercials/{commercialCode}/trend`                         | 상권 트렌드 분석 조회         | 불필요 |
| GET    | `/api/v1/commercials/{commercialCode}/summaries/sales`               | 상권 매출 요약 비교 조회      | 불필요 |
| GET    | `/api/v1/commercials/{commercialCode}/summaries/income`              | 상권 지출 요약 비교 조회      | 불필요 |
| GET    | `/api/v1/commercials/{commercialCode}/services/{serviceCode}/stores` | 상권 점포 분석 조회           | 불필요 |
| GET    | `/api/v1/commercials/{commercialCode}/services/{serviceCode}/sales`  | 상권 매출 분석 조회           | 불필요 |
| GET    | `/api/v1/commercials/{commercialCode}/service-categories`            | 상권 업종 목록 조회           | 불필요 |
| GET    | `/api/v1/commercials/{commercialCode}/population`                    | 상권 거주인구 조회            | 불필요 |
| GET    | `/api/v1/commercials/{commercialCode}/income`                        | 상권 소득·지출 조회           | 불필요 |
| GET    | `/api/v1/commercials/{commercialCode}/foot-traffic`                  | 상권 유동인구 조회            | 불필요 |
| GET    | `/api/v1/commercials/{commercialCode}/facilities`                    | 상권 시설 조회                | 불필요 |
| GET    | `/api/v1/commercials/{commercialCode}/benchmarks`                    | 상권 벤치마크 조회            | 불필요 |
| GET    | `/api/v1/commercials/recommendations/by-service`                     | 업종별 상권 추천              | 불필요 |
| GET    | `/api/v1/commercials/compare`                                        | 상권 A/B 비교 조회            | 불필요 |
| GET    | `/api/v1/administrations/{administrationCode}`                       | 행정동 통합 상세 조회         | 불필요 |

## AI 리포트

- OpenAPI: `3.1.0`
- 버전: `v1`
- 원문: https://api-dev.bosspickseoul.com/ai-service/v3/api-docs

| Method | Path                                                      | 요약                                   | 인증 |
| ------ | --------------------------------------------------------- | -------------------------------------- | ---- |
| GET    | `/api/v1/ai-reports/commercials/{commercialCode}`         | 상권 AI 리포트 조회 (동기, deprecated) | 필요 |
| POST   | `/api/v1/ai-reports/commercials/{commercialCode}`         | 상권 AI 리포트 제출 (비동기)           | 필요 |
| GET    | `/api/v1/ai-reports/jobs/{jobId}`                         | AI 리포트 작업 상태 조회               | 필요 |
| GET    | `/api/v1/ai-reports/districts/{districtCode}`             | 자치구 AI 리포트 조회                  | 필요 |
| GET    | `/api/v1/ai-reports/commercials/comparisons`              | 상권 비교 AI 인사이트 조회             | 필요 |
| GET    | `/api/v1/ai-reports/administrations/{administrationCode}` | 행정동 AI 리포트 조회                  | 필요 |

## 커뮤니티

- OpenAPI: `3.1.0`
- 버전: `v1`
- 원문: https://api-dev.bosspickseoul.com/community-service/v3/api-docs

| Method | Path                                                          | 요약                       | 인증   |
| ------ | ------------------------------------------------------------- | -------------------------- | ------ |
| POST   | `/api/v1/community/reports`                                   | 신고 등록                  | 필요   |
| GET    | `/api/v1/community/posts`                                     | 게시글 목록 조회           | 불필요 |
| POST   | `/api/v1/community/posts`                                     | 게시글 작성                | 필요   |
| POST   | `/api/v1/community/posts/{postId}/likes`                      | 게시글 좋아요 토글         | 필요   |
| GET    | `/api/v1/community/posts/{postId}/comments`                   | 댓글 목록 조회             | 불필요 |
| POST   | `/api/v1/community/posts/{postId}/comments`                   | 댓글 작성                  | 필요   |
| POST   | `/api/v1/community/posts/{postId}/comments/{commentId}/likes` | 댓글 좋아요 토글           | 필요   |
| POST   | `/api/v1/community/posts/drafts/commercial-comparisons`       | 상권 비교 게시글 초안 생성 | 불필요 |
| PATCH  | `/api/v1/moderation/reports/{reportId}`                       | 신고 처리                  | 필요   |
| GET    | `/api/v1/community/posts/{postId}`                            | 게시글 상세 조회           | 불필요 |
| DELETE | `/api/v1/community/posts/{postId}`                            | 게시글 삭제                | 필요   |
| PATCH  | `/api/v1/community/posts/{postId}`                            | 게시글 수정                | 필요   |
| GET    | `/api/v1/moderation/reports`                                  | 미처리 신고 목록 조회      | 필요   |
| GET    | `/api/v1/community/posts/search`                              | 게시글 검색                | 불필요 |
| GET    | `/api/v1/community/posts/liked`                               | 좋아요한 게시글 목록 조회  | 필요   |
| DELETE | `/api/v1/community/posts/{postId}/comments/{commentId}`       | 댓글 삭제                  | 필요   |
