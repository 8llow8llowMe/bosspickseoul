# Backend 모듈 구조 & 역할

## 전체 구조

```text
backend/
├── core/           (라이브러리 — jar, bootJar off)
│   ├── common-core          범용 공통 인프라
│   ├── persistence-core     JPA / QueryDSL / Snowflake ID
│   ├── redis-core           Redis 설정
│   ├── security-core        JWT 인증/인가 공통
│   └── shared-commercial    도메인 공유 (상권/지도)
├── cloud/          (실행 모듈 — bootJar on)
│   ├── api-gateway          Spring Cloud Gateway
│   └── service-discovery    Eureka 서버
└── service/        (도메인 서비스 — bootJar on)
    ├── auth-service         인증·회원·북마크
    ├── commercial-service   상권/행정동/자치구 분석
    ├── district-service     지도·영역·상권 좌표
    ├── community-service    커뮤니티·신고·모더레이션
    ├── batch-service        배치·대량 데이터 적재
    └── ai-service           AI 리포트·비교 인사이트
```

---

## core/common-core

**역할**: 모든 서비스가 공통으로 쓰는 **인프라 레벨 유틸**

**포함:**
- `dto.Response<T>` — 공통 응답 래퍼
- `dto.DataHeader` — 응답 헤더
- `dto.ValidationErrorBody` / `dto.ValidationErrorItem` — 검증 오류 응답 본문
- `dto.metadata.*` — `CodeNameDescribable`, `ScoreMetricDescribable`, `CodeNameDescriptionMetadata`, `ScoreMetricMetadata`
- `enums.OrderType` — 정렬 방향 (ASC/DESC)
- `exception.ValidationErrorSupport` — 공통 검증 예외 → 응답 변환 유틸
- `config.*` — Jasypt, Swagger 공통 설정 (`SwaggerSecurityConfigurer` 포함)
- `properties.*` — 공통 properties 바인딩

**포함 기준**: 도메인에 비의존적인 **범용 인프라**. 특정 서비스만 쓰는 도메인 개념은 금지.

---

## core/persistence-core

**역할**: JPA/QueryDSL/ID 생성 공통

**포함:**
- `entity.BaseEntity` — createdAt/updatedAt 감사(auditing)
- `config.JpaAuditConfig` — JPA Auditing 활성화
- `config.QuerydslConfigurer` — QueryDSL `JPAQueryFactory` 빈
- `config.SnowflakeConfigurer` / `util.SnowflakeIdGenerator` — 분산 환경 UUID 대안
- `dto.SliceResponse` — 무한 스크롤 응답
- `properties.SnowflakeProperties` — worker/datacenter 설정

**포함 기준**: DB 접근과 관련된 공통 설정·유틸.

---

## core/redis-core

**역할**: Redis 연결 공통 설정

**포함:**
- `config.RedisConfigurer` — `RedisConnectionFactory`, `RedisTemplate`, `StringRedisTemplate` 빈
  - `RedisTemplate` 값 직렬화는 기본 ObjectMapper 기반 Jackson JSON 이라 `java.time` 타입을 지원하지 않는다.
  - 객체 저장 시에는 `StringRedisTemplate` + 서비스 `ObjectMapper` 로 JSON 문자열을 직접 읽고 쓰는 방식을 권장한다. (타입 힌트 없는 순수 JSON, 직렬화 실패를 어댑터에서 명시적으로 처리)
- `config.RedisPropertiesConfig` — properties 바인딩
- `properties.RedisProperties` — host/port/mode
- `properties.enums.RedisMode` — STANDALONE/CLUSTER

**포함 기준**: Redis 연동 서비스가 import 해서 쓰는 공통 설정만.

---

## core/security-core

**역할**: JWT 기반 인증/인가 공통 인프라

**포함:**
- `auth/*` — `auth-service` 전용 (로그인, 토큰 발급)
  - `JwtAuthFilter`, `JwtAuthProvider`, `JwtAuthPropertiesConfig`
- `resourceserver/*` — 나머지 서비스용 (토큰 검증만)
  - `ResourceServerSecurityConfigurer`, `JwtToMemberConverter`
- `common/*` — 양쪽 공통
  - `MemberLoginActive` (인증 주체 DTO), `SecurityRole`, `JwtAuthentication`
  - 에러 핸들러, 예외 정의

**포함 기준**: auth-service와 나머지 서비스가 공유하는 보안 구조. 서비스별 인가 정책은 각 서비스에서.

---

## core/shared-commercial

**역할**: **상권/지도 도메인** 양쪽 서비스(commercial, district)가 공유하는 도메인 개념

**포함:**
- `enums.HeatmapModeType` — 히트맵 모드 (단일 지표 / 복합 추천)
- `enums.GradeLevel` — 등급 구간 (commercial/district 공용)

**존재 이유**:
- `commercial-service`와 `district-service`는 피어 관계라 서로 import 불가
- `HeatmapModeType` 같은 **도메인 공유 개념**이 `common-core`에 있으면 "인프라에 도메인 유출"로 헥사고날 위배
- 두 서비스가 모두 의존할 수 있는 별도 공유 레이어로 분리

**포함 기준**: **상권·지도 도메인**에 속하면서 복수 서비스에서 공유되는 enum / 값 객체 / 상수. 단일 서비스에서만 쓰면 해당 서비스의 `application/model/`로.

---

## cloud/api-gateway

**역할**: Spring Cloud Gateway — 외부 요청 라우팅 + JWT 검증

**처리:**
- `/api/v1/**` 경로를 각 서비스로 라우팅
- JWT 유효성 1차 검증 (서비스 내부 인가는 각 서비스)
- CORS 공통 처리

---

## cloud/service-discovery

**역할**: Eureka 서버 — 서비스 디스커버리

**처리:**
- 각 서비스가 시작 시 등록
- Feign 클라이언트가 서비스명으로 호출할 수 있게 함

---

## service/auth-service

**역할**: 인증·회원·북마크

**주요 API:**
- `POST /api/v1/auth/login|logout|token/reissue`
- `POST /api/v1/members/signup`, `GET /api/v1/members/me`
- `/api/v1/members/me/bookmarks` — 관심 상권 저장

**특수 의존**: `core:security-core`의 `auth/` 패키지 (JWT 발급 전용), `core:redis-core` (토큰/이메일 인증/OAuth state 저장)

---

## service/commercial-service

**역할**: 상권/행정동/자치구 데이터 조회·분석

**주요 API:**
- 상권: 프로필, 매출, 유동인구, 점포, 시설, 거주인구, 소득, 트렌드
- 히트맵: 단일 지표 / 복합 점수
- 비교: 상권 A vs B, 비교 프리뷰
- 후보 상권: 프리셋 기반 상위 N, 업종 기반 추천
- 행정동/자치구: `/api/v1/administrations/{code}`, `/api/v1/districts/**`
- 공유 링크: `POST/GET /api/v1/share-links`

**컨텍스트**: administration, category, commercial, commercialsummary, district, sharelink (6개)

**특수 의존**: `core:shared-commercial` (HeatmapModeType, GradeLevel), `core:security-core` (sharelink 선택적 인증), openfeign + resilience4j (district-service 호출)

---

## service/district-service

**역할**: 지도 위 영역(자치구·행정동·상권) 좌표 + 지도 화면 전용 오케스트레이션

**주요 API:**
- 지도 영역 좌표
- 지도 화면용 히트맵 (commercial-service를 Feign 호출)
- `GET /api/v1/regions/code-lookup` — 지역 명칭→코드 정확 조회

**특수 의존**: `core:shared-commercial`, geotools (좌표 변환)

---

## service/community-service

**역할**: 커뮤니티 게시글·댓글·좋아요·신고·모더레이션

**주요 API:**
- `/api/v1/community/posts`, `/api/v1/community/posts/{postId}/comments`
- `/api/v1/community/reports` — 신고
- `/api/v1/moderation/reports` — 관리자 처리

**특수 설계**: `ModerationQueryProcessor` — Facade가 out-port 직접 접근 금지

---

## service/batch-service

**역할**: 대량 데이터 적재용 일회성/수동 실행 배치

**처리:**
- 영역 좌표(area_boundary) 대량 적재 (`AreaBoundaryImportJob`)

---

## service/ai-service

**역할**: LLM 기반 분석 리포트

**주요 API:**
- `POST /api/v1/ai-reports/commercials/{code}` — 상권 AI 리포트 생성 (비동기)
- `POST /api/v1/ai-reports/commercials/comparisons` — 상권 비교 리포트
- `POST /api/v1/ai-reports/districts/{code}` — 자치구 리포트
- `POST /api/v1/ai-reports/administrations/{code}` — 행정동 리포트
- `GET /api/v1/ai-reports/jobs/{jobId}` — 작업 상태 폴링
- `GET /api/v1/ai-reports/jobs/{jobId}/stream` — 작업 상태 SSE 스트림

**처리 흐름**: Controller → Facade → `AiReportJobProcessor` → `AiReportWorker`(`@Async("aiReportTaskExecutor")`) → Redis 상태 저장/이벤트

---

## 새 공유 모듈을 만드는 기준

**`core/shared-*` 모듈을 추가할 때:**

1. 복수 서비스가 공유하는 **도메인 개념**이 생겼을 때
2. 이걸 `common-core`에 넣으면 "인프라 레이어에 도메인 유출"로 헥사고날 위배일 때
3. 어느 한 서비스에 두면 다른 서비스가 피어 서비스를 import 해야 할 때

**단일 서비스 전용이면:** 해당 서비스의 `application/model/` 또는 `domain/model/`에 둔다.
