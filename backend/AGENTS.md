# NowDoBoss Backend MSA + Hexagonal 개발 규칙

## 1) 문서 운영 정책

- 이 문서를 백엔드 아키텍처 규칙의 단일 기준 문서(SSOT)로 사용한다.
- 규칙 추가 시 문서를 분리하지 말고, 이 문서에 섹션으로 확장한다.
- 범위: `backend/service/*` 전체 마이크로서비스.

## 2) 현재 구조 기준선

- `auth-service`: `auth`, `member` 컨텍스트
- `commercial-service`: `commercial`, `district`, `category`, `administration` 컨텍스트
- `district-service`: `region` 컨텍스트
- 공통 패턴:
  - `domainlayer/<context>/adapter/{in,out}`
  - `domainlayer/<context>/application/{port,service,info,mapper,command}`
  - `domainlayer/<context>/domain/model`

## 3) 레이어 책임 규칙

### 3.1 Controller (`adapter/in/web/controller`)

- Controller는 `WebUseCase`만 호출한다.
- Controller 메서드명과 `WebUseCase` 메서드명은 동일하게 유지한다.
- Controller에는 비즈니스 로직을 두지 않는다.
- 응답 형식은 `ResponseEntity<Response<T>>`로 통일한다.
- 인증이 필요한 API는 `@PreAuthorize`를 명시한다.

### 3.2 WebUseCase (`application/port/in`)

- Controller가 의존하는 인바운드 포트다.
- API 유스케이스 시그니처를 정의한다.
- 메서드 네이밍은 Controller와 1:1로 맞춘다.

### 3.3 Facade (`application/service`)

- Facade는 메인 오케스트레이션 서비스이며 `WebUseCase` 구현체다.
- Facade는 여러 Processor를 조합해 유스케이스를 완성한다.
- 조회는 `@Transactional(readOnly = true)`, 변경은 `@Transactional`을 사용한다.

### 3.4 Processor (`application/service/processor`)

- Processor는 서브 서비스 레이어다.
- Processor는 **Info DTO**를 반환한다 (`void`는 명시적 커맨드 처리 시 허용).
- Processor는 out-port 호출, 도메인 조합, Info 생성까지만 담당한다.
- Processor에서 Response DTO를 조립/반환하지 않는다.

### 3.5 Presenter (`adapter/in/web/presenter`)

- **Info DTO -> Response DTO** 매핑은 Presenter에서만 수행한다.
- 중첩 응답은 `item` DTO로 분리하고 Presenter에서 조립한다.
- Controller, Facade, Processor에서 Response 필드 매핑을 하지 않는다.

## 4) DTO / Command / Info 규칙

### 4.1 DTO 계층 분리

- `request/response/item` DTO는 `adapter/in/web/dto` 하위에만 둔다.
- `info` DTO는 `application/info` 하위에만 둔다.
- `info` DTO는 애플리케이션 내부 전용이며 외부 API 스펙으로 노출하지 않는다.

### 4.2 Command 규칙

- 입력 변환은 `application/command/*Command`로 분리한다.
- `Command.from(Request)` 정적 팩토리를 사용한다.

### 4.3 Map 사용 제한 규칙

- `Map<String, Object>` 또는 문자열 키 기반 응답 조립을 기본 패턴으로 사용하지 않는다.
- 키-값 구조가 필요해 보여도 우선 목적별 DTO(`*Info`, `*Item`, `*Response`)를 정의한다.
- 동적 구조가 불가피한 경우에만 Map을 예외적으로 사용하고, 이유를 주석으로 남긴다.

### 4.4 네이밍 규칙

- API 입력: `*Request`
- API 출력: `*Response`
- 출력 하위 모델: `*Item`
- 내부 조회/가공 결과: `*Info`
- 내부 입력 모델: `*Command`
- 인바운드 유스케이스 포트: `*WebUseCase`
- 메인 오케스트레이션 서비스: `*Facade`
- 서브 서비스: `*Processor`

## 5) Entity <-> Domain 매핑 규칙 (MapStruct)

- Entity <-> Domain 매핑은 `application/mapper`의 MapStruct 인터페이스에서만 수행한다.
- 모든 Mapper는 `@Mapper(componentModel = "spring")`를 사용한다.
- 권장 메서드명:
  - `toDomainFromEntity(...)`
  - `toEntityFromDomain(...)`
  - `toDomainListFromEntityList(...)`
- Repository Adapter는 JPA Entity를 외부로 노출하지 않고, Mapper를 통해 Domain으로 변환 후 Port로 반환한다.

## 6) Port / Adapter 규칙

- `application/port/out`에는 외부 의존 계약만 정의한다.
- `adapter/out/*Adapter`는 out-port 구현체이며 JPA/Redis/외부 API 상세를 캡슐화한다.
- 도메인 로직은 Adapter가 아니라 Processor/Domain에 둔다.
- `application` 레이어(`port`, `service`, `info`)는 `adapter` 패키지 타입에 의존하지 않는다.
- 조회 전용 반환이 필요하면 `application/port/out/query/*QueryResult`를 정의하고, Adapter 내부에서 projection/entity -> query result로 변환한다.
- `Info` 변환은 Processor에서 수행하며 `Info.from(queryResult)` 또는 `Info.from(domain)` 형태만 허용한다.

## 7) Swagger (OpenAPI) 규칙

- Controller 클래스에 `@Tag(name, description)`를 선언한다.
- 엔드포인트마다 `@Operation(summary, description)`를 선언한다.
- Path/Query 파라미터는 `@Parameter(description, example, required)`를 선언한다.
- Request/Response/Item DTO 필드는 `@Schema(description, example)`를 선언한다.
- `record` 기반 Response/Item DTO에서 `@Schema` 필드 블록 사이에는 빈 줄 1줄을 유지한다. (가독성 목적)
- `public record XxxResponse(` 다음 줄에서 바로 첫 필드를 두지 말고, 빈 줄 후 `@Schema` 필드를 선언한다.
- 인증 API는 `@Operation(security = @SecurityRequirement(name = "bearerAuth"))`를 추가한다.
- **Swagger 설명 문구는 한국어를 기본으로 작성한다.**

## 8) 주석 규칙 (Facade/Processor)

- Facade/Processor 주요 메서드에는 단계형 주석을 남긴다.
- 주석 형식:
  - `// 1. ...`
  - `// 2. ...`
- 문장형 설명(`~다`)보다 **흐름 파악용 키워드형**을 사용한다.
- 문장형 서술(`~한다`, `~한다.`)은 사용하지 않는다.
  - 예: `// 1. 분기 코드 확정`, `// 2. Top5 데이터 조회`, `// 3. Info 조립`
- 단순 대입/반환에는 주석을 남기지 않는다.

## 9) 신규 컨텍스트 패키지 템플릿

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
  |     \- <Context>RepositoryAdapter.java
  |- application
  |  |- command
  |  |- info
  |  |- mapper
  |  |- port/in
  |  |- port/out
  |  \- service
  |     |- <Context>Facade.java
  |     \- processor
  \- domain/model
```

## 10) PR 체크리스트

- [ ] Controller 메서드명 == WebUseCase 메서드명
- [ ] Controller는 WebUseCase 외 하위 레이어 직접 호출 없음
- [ ] Facade가 유스케이스 오케스트레이션 담당
- [ ] Processor는 Info 중심 반환, Response DTO 반환 없음
- [ ] Info -> Response 매핑은 Presenter 전용
- [ ] Entity <-> Domain 매핑은 MapStruct Mapper 전용
- [ ] Map 대신 목적별 DTO 우선 사용
- [ ] Swagger 설명은 한국어로 작성
- [ ] Swagger 어노테이션(`@Tag/@Operation/@Parameter/@Schema`) 누락 없음
- [ ] 조회/변경 트랜잭션 설정 일관성 유지

## 11) 마이그레이션 정렬 원칙

- 기존 코드에는 Controller와 WebUseCase 메서드명이 완전히 1:1이 아닌 구간이 일부 있다.
- 신규 API부터 본 규칙을 강제하고, 기존 API는 수정 시점에 점진적으로 정렬한다.

## 12) Facade Naming Rule

- `*WebUseCase` 를 구현하는 클래스명은 반드시 `*WebFacade` 형태로 작성
- 예시: `AuthWebUseCase -> AuthWebFacade`, `RegionWebUseCase -> RegionWebFacade`
- 배치/내부 전용 유스케이스(`*WebUseCase`가 아님)는 `*Facade` 또는 목적 기반 이름 사용 가능
