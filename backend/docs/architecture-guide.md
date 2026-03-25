# Backend Architecture Guide

## 1. 기본 구조

- 백엔드는 MSA + Hexagonal Architecture를 기본 구조로 사용한다.
- 서비스는 `auth-service`, `commercial-service`, `district-service`, `community-service`, `batch-service`, `ai-service`로 분리한다.
- 공통 코어는 `common-core`, `persistence-core`, `redis-core`, `security-core`로 관리한다.

## 2. 권장 패키지 구조

```text
domainlayer/<context>
  |- adapter
  |  |- in/web
  |  |  |- controller
  |  |  |- dto/request
  |  |  |- dto/response
  |  |  |- dto/item
  |  |  \- presenter
  |  \- out/persistence
  |     |- entity
  |     |- repository
  |     \- *Adapter
  |- application
  |  |- command
  |  |- info
  |  |- mapper
  |  |- model
  |  |- port/in
  |  |- port/out
  |  \- service
  |     |- *WebFacade
  |     \- processor
  \- domain
     \- model
```

## 3. 계층 책임

### Controller

- `WebUseCase`만 호출한다.
- 비즈니스 로직을 두지 않는다.
- 응답 형식은 `ResponseEntity<Response<T>>`로 통일한다.

### WebUseCase

- 외부 API 유스케이스 시그니처를 정의한다.
- Controller와 메서드명을 1:1로 맞춘다.

### WebFacade

- 메인 오케스트레이션 레이어다.
- 여러 Processor를 조합해 API 유스케이스를 완성한다.
- 조회는 `@Transactional(readOnly = true)`, 변경은 `@Transactional`을 사용한다.

### Processor

- 서브 서비스 레이어다.
- `Info` 또는 도메인 모델을 반환한다.
- Port 호출, 도메인 조합, 내부 변환까지만 담당한다.
- Response DTO를 직접 조립하지 않는다.

### Presenter

- `Info -> Response`, `Info -> Item` 변환만 담당한다.
- 화면/API 응답 구조는 Presenter에서 완성한다.

### Port / Adapter

- `application/port/out`은 외부 의존 계약만 둔다.
- `adapter/out/*Adapter`는 JPA, Redis, 외부 API 상세를 캡슐화한다.
- `application` 레이어는 `adapter` 타입에 직접 의존하지 않는다.

## 4. Port 반환 모델 원칙

- 조회 전용 결과가 필요하면 `application/port/out/query/*QueryResult`를 도입한다.
- Adapter 내부에서 `projection/entity -> QueryResult`로 변환한다.
- Processor가 `QueryResult -> Info` 또는 `Domain -> Info`를 수행한다.
- `Info`를 Port 경계 타입으로 사용하지 않는다.

## 5. 매핑 원칙

- Entity <-> Domain 매핑은 MapStruct 기반 `application/mapper`에서 처리한다.
- 저장 흐름은 가능한 한 `domain -> entity -> repository.save -> entity -> domain`으로 통일한다.
- 최근 패턴 기준으로 `community-service`의 Post/Comment/Like/Report write 흐름을 참고한다.

## 6. 보안 기준

- `auth-service`는 인증/인가 전용 Security 구성을 사용한다.
- 나머지 서비스는 Resource Server 기준으로 JWT claim을 해석한다.
- 게이트웨이는 JWT 유효성 검증 및 라우팅에 집중하고, 서비스 내부 권한 해석은 각 서비스가 담당한다.
