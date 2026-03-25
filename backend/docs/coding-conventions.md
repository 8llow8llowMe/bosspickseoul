# Backend Coding Conventions

## 1. 메서드 / 생성자 / record 파라미터

- 160자 하드랩 안에 들어오면 한 줄 유지가 기본이다.
- 160자를 넘기거나 가독성이 명확히 떨어질 때만 줄바꿈한다.
- 줄바꿈 시 파라미터를 의미 단위로 정렬하고 들여쓰기를 통일한다.

## 2. primitive / wrapper 기준

- `long`, `int`, `boolean` 등은 기본적으로 primitive를 사용한다.
- 아래 경우에만 wrapper를 사용한다.
  - `null` 자체가 의미를 가지는 경우
  - 선택적 필터/커서처럼 미전달 상태를 표현해야 하는 경우
  - 외부 입력에서 미전달과 기본값을 구분해야 하는 경우
- 예시
  - `memberId`, `postId`, `commentId`, `size` -> primitive
  - 선택적 커서 값 -> wrapper 허용

## 3. Port / Adapter 파라미터 기준

- 단순 저장/수정/삭제/단건 조회는 개별 파라미터를 유지한다.
- 조회 조건이 많아지거나 `filter + sort + cursor + size` 조합이면 `*Criteria`, `*Query`로 묶는다.
- Controller는 API 가독성을 위해 단순 파라미터를 유지하고, 내부 경계에서 Criteria로 변환한다.

## 4. 네이밍 규칙

- API 입력: `*Request`
- API 출력: `*Response`
- 응답 하위 모델: `*Item`
- 내부 가공 결과: `*Info`
- 내부 입력 모델: `*Command`
- 인바운드 유스케이스 포트: `*WebUseCase`
- 메인 오케스트레이션 서비스: `*WebFacade`
- 서브 서비스: `*Processor`

## 5. MapStruct 규칙

- 모든 Mapper는 `@Mapper(componentModel = "spring")`를 사용한다.
- 권장 메서드명
  - `toDomainFromEntity(...)`
  - `toEntityFromDomain(...)`
  - `toDomainListFromEntityList(...)`
- JPA Entity를 외부로 직접 노출하지 않는다.

## 6. Swagger 규칙

- Controller 클래스에는 `@Tag`
- 엔드포인트에는 `@Operation`
- Path/Query 파라미터에는 `@Parameter`
- Request/Response/Item 필드에는 `@Schema`
- Swagger 설명 문구는 한국어를 기본으로 작성한다.
- 인증 API는 `@SecurityRequirement(name = "bearerAuth")`를 누락하지 않는다.

## 7. 로그 / 주석 규칙

- 로그와 Swagger 설명은 한국어를 우선 사용한다.
- Facade/Processor 주요 메서드에는 단계형 주석을 사용한다.
  - `// 1. ...`
  - `// 2. ...`
- 문장형 설명보다 흐름 파악용 키워드형 주석을 우선한다.
- 단순 대입/반환에는 주석을 남기지 않는다.

## 8. 엔티티 기준

- 엔티티 필드는 가능한 경우 `@Comment`로 의미를 남긴다.
- 단일 PK를 우선하고, N:N 관계는 중간 테이블을 분리한다.
- 삭제는 기본적으로 요구사항에 맞는 명시적 전략을 선택한다.
  - 예: `community-service`는 소프트 삭제 기반
