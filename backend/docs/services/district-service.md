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
