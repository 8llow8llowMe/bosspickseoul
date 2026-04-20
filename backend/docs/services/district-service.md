# District Service Guide

## 서비스 책임

- 자치구 / 행정동 / 상권 지역 계층 탐색
- 코드/코드명 조회
- 지도 영역 좌표 조회

## 주요 컨텍스트

- `region`
- `map`

## 인증 방식

- 대부분 조회 전용 API다.
- 필요한 경우 서비스 내부 JWT claim 기반 보호 정책을 적용한다.

## 대표 API 패턴

- `RegionWebController`
- `MapWebController`
- `RegionWebUseCase -> RegionWebFacade`
- `MapWebUseCase -> MapWebFacade`

## 현재 구현 주의점

- 지역 계층 API는 `/api/v1/regions` 기준으로 일관성을 유지한다.
- 지도 영역 조회는 `map` 컨텍스트로 분리한다.
- 상권/행정동/자치구 메타 책임이 `commercial-service`로 새지 않게 주의한다.

## 지도 후보 탐색 API (1단계)

- `GET /api/v1/map/candidate-presets` — 추천 프리셋 메타데이터 목록
- `GET /api/v1/map/commercials/candidates` — 뷰포트 + 프리셋 + 우선 지표로 후보 상권 Top N 랭킹
- `GET /api/v1/map/commercials/{code}/profile` — 후보 카드 프로필 (키 지표 집계)
- `GET /api/v1/map/commercials/compare-preview` — 2개 상권 경량 비교 (headline 지표 + recommendedSide)
- `GET /api/v1/map/commercials/heatmap` — `composite=true` 추가 시 프리셋 가중 합성 점수 반환 (`preset`, `priorityMetric` 필요). 기존 `metricType` 단일 지표 모드는 유지.
- 점수화는 `commercial-service`의 `CommercialCandidateQueryProcessor`가 수행한다. `district-service`는 경계 좌표를 조합해 응답을 구성한다.
- 프리셋 가중치와 compositeScore 산출 책임은 `commercial-service` 단독이다. `district-service.CandidatePresetType`은 표시용 enum만 유지한다.
- Profile 응답의 `centerLng/centerLat/boundaryCoords`는 이번 단계에선 null/빈 배열로 내려간다. 프론트엔드는 직전 candidates/heatmap 응답의 경계 정보를 재사용한다.
