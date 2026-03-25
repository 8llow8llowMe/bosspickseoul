# Commercial Service Guide

## 서비스 책임

- 상권 상세 분석 조회
- 자치구 단위 분석 조회
- 상권/지역 요약 분석 API 제공

## 주요 컨텍스트

- `commercial`
- `district`

## 인증 방식

- 조회 API가 중심이며, 인증 필요 API만 명시적으로 보호한다.
- JWT claim 해석은 서비스 내부 Security 기준을 따른다.

## 대표 API 패턴

- `CommercialWebController`
- `DistrictWebController`
- `CommercialWebUseCase -> CommercialWebFacade`
- `DistrictWebUseCase -> DistrictWebFacade`

## 현재 구현 주의점

- `Info -> Presenter -> Response` 흐름을 유지한다.
- 지역 계층 API와 겹치는 책임은 `district-service`와 분리한다.
- REST 경로는 `commercials`, `regions` 기준 일관성을 우선한다.
