# BossPickSeoul 2027 서울시 공모전 백엔드 진단 및 개발 로드맵

> 기준일: 2026-09-06
>
> 기준 커밋: `a6e64b0e`
>
> 범위: `backend/service`, `backend/core`, `backend/cloud`, 백엔드 문서 및 CI
>
> 목적: 이 문서를 다음 백엔드 개발의 우선순위 기준으로 사용한다.

## 1. 결론

BossPickSeoul은 이미 단순 조회형 시제품을 넘어섰다. 상권 분석, 후보 추천, 비교, 창업 시뮬레이션, 지원 정책, AI 리포트, 공유, 커뮤니티까지 시연 가능한 기능 폭을 갖췄고 서비스별 `Controller -> WebUseCase -> WebFacade -> Processor -> Port/Adapter` 골격도 대부분 적용돼 있다.

수상을 위해 지금 가장 필요한 것은 기능 수를 더 늘리는 일이 아니다. 현재 추천과 AI 결과를 심사위원 앞에서 **검증 가능한 의사결정**으로 만들고, 오래된 기본 분기와 데이터 적재 과정을 **최신성·출처·재현성**이 보이는 제품으로 바꾸는 일이다. 그 전에 동시성 때문에 데이터나 작업 상태가 뒤집힐 수 있는 P0 항목을 먼저 막아야 한다.

권장 개발 순서는 다음과 같다.

1. **P0 안정성 잠금**: AI job CAS, 커뮤니티 원자 갱신, refresh token 원자 회전, 추천 설명 정확성, 시뮬레이션 업종 일치 검증
2. **데이터 신뢰 기반**: 최신 공통 분기 결정, 수집/검증/게시 배치, 데이터 lineage와 품질 리포트
3. **추천 정확성**: 점수 정규화 재설계, 설명과 실제 지표 일치, 근거 및 데이터 충분도 노출
4. **AI 근거화**: 수치 주장별 evidence, 데이터/프롬프트/모델 버전, 고정 평가셋
5. **공모전 차별화**: 예산·위험 선호 기반 시나리오 비교와 사후 검증 가능한 의사결정 기록
6. **시연·운영 완성도**: 통합 테스트, 장애 복구, 관측 지표, 데모 데이터와 실패 대응

## 2. 공모전 방향

2027년 공고는 아직 발표되지 않았으므로 아래 전략은 [2026 서울시 빅데이터 활용 경진대회 공고](https://www.seoul.go.kr/news/news_notice.do?nttNo=453937)를 기준으로 한다. 2026년 창업 부문은 서울 열린데이터광장 데이터 1건 이상과 AI 활용을 필수로 했고, 2차 평가는 공공데이터 활용 25점, AI 혁신성 20점, 독창성 15점, 완성도 15점, 발전 가능성 20점, ESG 5점이었다. 서로 다른 분야 데이터 결합에는 가점도 있었다. 2027년 공고가 나오면 평가표와 일정은 반드시 다시 확인한다.

### 권장 출품 포지션

**제품·서비스 개발 부문: "근거를 검증할 수 있는 서울 소상공인 입지 의사결정 도구"**

현재 코드의 강점은 지도를 예쁘게 보여주는 데 그치지 않고, 상권 선택부터 비용 추정, 정책 탐색, AI 설명, 저장과 공유까지 한 흐름으로 연결할 수 있다는 점이다. 차별화 메시지는 "AI가 좋은 상권을 찍어준다"보다 아래처럼 잡는 편이 강하다.

- 어떤 데이터와 분기를 사용했는지 보여준다.
- 추천 점수의 구성과 실제 수치를 사용자가 확인한다.
- 예산과 위험 선호를 바꾸며 후보와 비용을 비교한다.
- AI의 문장마다 근거 지표를 열어볼 수 있다.
- 당시의 데이터·모델·비용 가정을 저장해 나중에 결과를 재현한다.

### 평가 항목과 백엔드 대응

| 평가 항목 | 현재 자산 | 보완해야 할 증거 |
| --- | --- | --- |
| 공공데이터 활용 | 매출·유동인구·점포·거주인구·소득·시설·지역 경계 | 데이터셋 이름, 출처 URL, 기준 분기, 갱신일, 결측률, 결합 키 |
| AI 혁신성 | 4종 비동기 AI 리포트, SSE, 캐시, 쿼터 | 주장-근거 연결, 평가셋, 버전 추적, 환각/결측 대응 결과 |
| 독창성 | 분석→추천→시뮬레이션→정책의 연속 흐름 | 실제 예산·위험 선호 반영, 기존 유사 서비스와 정량 비교 |
| 완성도 | MSA, 인증, 공유, 보관함, 커뮤니티, 관측 기반 | 동시성·복구 문제 제거, E2E 시연 시나리오, 테스트 공백 해소 |
| 발전 가능성 | 예비·기존 창업자 대상, 정책 추천, 분석 이력 | 사업 모델, 사용자 검증 지표, 지역/업종 확장 가능한 데이터 계약 |
| ESG | 정책 추천과 지역 기반 커뮤니티 | 생존 위험 감소, 공실/폐업 비용 절감 등 측정 가능한 사회 가치 |

## 3. 현재 기능 지도

| 서비스 | 코드에서 확인한 기능 | 현재 판단 |
| --- | --- | --- |
| `auth-service` | 일반·소셜 로그인, 이메일 인증, 재발급·로그아웃, 비밀번호 재설정, 회원·프로필 이미지, 상권 북마크 | 기능 충분. 토큰 회전 원자성과 Redis 실패 계약 보완 필요 |
| `commercial-service` | 상권·행정동·자치구 지표, 프로필·트렌드·비교, 히트맵·후보 추천, 공유 링크, 분석 보관함, 시뮬레이션·이력, 인기 순위, 정책 추천 | 제품 핵심. 점수·설명 정확성과 데이터 버전이 최우선 |
| `district-service` | 지역 계층/코드 조회, 경계·지도 영역, commercial 내부 호출 기반 지도 프로필·히트맵·후보 | 역할은 명확. 계약 드리프트와 테스트 부재 해소 필요 |
| `community-service` | 게시글·댓글·대댓글, 검색·커서, 좋아요·신고·모더레이션, 이미지, 소프트 삭제와 정리 | 기능 폭은 충분. 카운터/상태 경합과 참조 정리 필요 |
| `ai-service` | 상권·비교·자치구·행정동 리포트, 비동기 제출, 폴링·SSE, Redis 캐시·멱등성·사용량 제한, Ollama/OpenAI | 구조 양호. job 경쟁, 복구, 근거·버전 추적이 핵심 |
| `batch-service` | 지역 경계 JSON 읽기와 JDBC UPSERT | 현재는 경계 적재 1종. 분석 데이터 파이프라인으로 확장 필요 |
| `api-gateway` | 서비스 라우팅, JWT 1차 검증, blacklist, CORS, Swagger 집계 | 운영 기능 보유. reactive 경로의 blocking Redis 호출 개선 필요 |
| core | 공통 응답/검증, JPA/QueryDSL/Snowflake, Redis, Security, Storage, 상권 공유 타입 | 역할 분리는 합리적. 자동 아키텍처 검증이 없음 |

세부 엔드포인트 목록은 `backend/docs/api-reference.md`, 구현 이력은 `backend/docs/feature-status.md`를 기준으로 한다. 이 문서는 기능 중복 나열보다 개발 판단과 결함 근거에 집중한다.

## 4. 헥사고날 아키텍처 감사

### 4.1 전체 판정

전 서비스에 헥사고날 **골격은 적용**돼 있다. Controller가 WebUseCase를 호출하고, Facade가 Processor와 Presenter를 조합하며, 외부 HTTP/JPA/Redis/LLM 구현은 대체로 out adapter에 있다. 따라서 전면 재작성은 투자 대비 효과가 낮다. 아래의 실제 역의존과 인프라 누수를 작은 단위로 고치는 편이 맞다.

프로젝트 규칙 자체는 Facade가 web request/response와 Presenter를 아는 실용적 변형이다. 이를 순수 헥사고날 기준과 다르다는 이유만으로 모두 바꾸지 않는다. 이 감사에서는 프로젝트가 선언한 `backend/docs/architecture-guide.md`를 판정 기준으로 사용했다.

| 영역 | 판정 | 근거 및 조치 |
| --- | --- | --- |
| Controller → UseCase | 대체로 양호 | 서비스 전반에 `*WebController`, `*WebUseCase`, `*WebFacade` 패턴 존재 |
| Processor → Port | 대체로 양호 | JPA/Feign/Redis/LLM 세부 구현은 대부분 adapter에 격리 |
| Info → Presenter → Response | 대체로 양호 | 각 서비스 Presenter가 응답 변환 담당 |
| application → adapter 역참조 | 일부 위반 | `RegionCodeLookupInfo`가 persistence projection을 import. application 전용 `QueryResult`로 교체 |
| domain → application 역참조 | 위반 | AI `AiReportJob`이 application Info를 보유. 안정적인 domain/application model로 분리 |
| Info의 out-port 노출 | 위반 | `AiReportCachePort`가 Info를 저장 계약에 사용. cache model 또는 domain result 사용 |
| Processor의 직접 I/O | 위반 | Batch processor가 `Files`, `ClassPathResource`, Jackson으로 파일을 직접 읽음. `AreaBoundarySourcePort` 도입 |
| web adapter의 infra 직접 의존 | 일부 누수 | Community Presenter가 `ObjectStorageClient`로 URL 생성. URL resolver port 또는 사전 계산된 Info로 이동 검토 |
| Entity ↔ Domain mapper 위치 | 규칙상 허용, 결합 존재 | application mapper가 adapter entity를 import하는 관례가 다수. 장기적으로 mapper를 persistence adapter로 옮기되 P0보다 뒤로 둠 |
| 구조 자동 검증 | 미흡 | ArchUnit/checkstyle/SpotBugs/PMD 설정이 없어 새 역의존을 `check`가 막지 못함 |

### 4.2 서비스별 판단

#### Commercial

- Controller, UseCase, Facade, Processor, Port, persistence/client adapter, Presenter가 컨텍스트별로 잘 구분돼 있다.
- 조회 컨텍스트가 많아 한 서비스가 489개 main Java 파일까지 커졌다. 현재는 데이터와 트랜잭션 경계가 강하게 겹치므로 서비스 분리보다 **컨텍스트별 테스트와 패키지 의존 규칙**을 먼저 강화한다.
- Map과 AI가 commercial 계약을 소비하므로 공개/내부 응답 변화 시 contract test가 필요하다.

#### District

- 지역 조회와 지도 오케스트레이션 역할은 분명하다.
- `RegionCodeLookupInfo.java:3-5`가 `adapter.out.persistence.projection`을 직접 import한다. projection을 `application/port/out/query` 계약으로 옮긴다.
- `MapWebFacade.java:292-322`의 내부 프로필 매핑이 commercial의 신규 `periodCode`, `serviceCode`, 정책 및 피크 정보와 동기화되지 않았다. 필요한 필드를 명시적으로 계약화하고 consumer contract test를 둔다.
- main Java 102개에 테스트 Java가 0개다.

#### AI

- Feign client, LLM provider, Redis job/cache가 포트 뒤에 있어 기본 구조는 좋다.
- `AiReportJob.java:3-6`의 application Info 역참조와 `AiReportCachePort.java:3-36`의 Info 노출은 명확한 경계 위반이다.
- `AiReportProcessor.java:83-108`이 executor 없는 `CompletableFuture.supplyAsync`로 blocking 내부 호출을 병렬화한다. 전용 bounded executor와 전체 deadline을 사용한다.

#### Batch

- `AreaBoundaryBulkPort`와 JDBC adapter 분리는 잘 돼 있다.
- `AreaBoundaryImportProcessor.java:94-109`가 입력 파일 시스템과 직렬화 기술을 직접 안다. source adapter로 옮기고 Processor에는 행 검증·정규화·게시 정책만 남긴다.

#### Auth / Community

- 인증, 저장소, storage가 port로 분리돼 있고 Controller의 책임도 제한돼 있다.
- 일부 command의 `from(request)`와 Dev facade가 web DTO를 import한다. 웹 계약 변경이 application까지 번지는 구조이므로 request → command 변환을 controller/adapter 경계로 이동한다.
- Community Presenter의 storage client 직접 사용은 응답 URL 생성 정책을 web adapter와 storage infra가 함께 소유하게 만든다. 낮은 우선순위로 정리한다.

## 5. 개발 백로그

우선순위 정의:

- **P0**: 데이터 손상, 보안 세션, 잘못된 의사결정 결과, 비동기 상태 손실 가능성. 기능 개발 전에 처리한다.
- **P1**: 공모전 점수와 사용자 신뢰를 직접 올리는 핵심 작업.
- **P2**: 운영성, 구조 유지보수, 장기 확장 작업.

### P0-1. AI job 상태와 멱등 키를 원자적으로 전이

**문제**

- `AiReportJobProcessor.java:200-224`는 조회 시 만료된 작업을 `FAILED`로 저장하고 멱등 키를 해제한다.
- `AiReportWorker.java:49,57,77`은 앞서 읽은 작업을 `RUNNING` 또는 `COMPLETED`로 조건 없이 저장하고 키를 해제한다.
- `RedisAiReportJobStoreAdapter.java:62-75`의 저장과 삭제에는 기대 상태나 키 소유자 검사가 없다.

A가 만료된 뒤 같은 요청 B가 생성됐는데 늦게 끝난 A가 B의 멱등 키를 지울 수 있다. 완료와 만료도 서로의 종결 상태를 덮을 수 있다.

**구현 방향**

- `transition(jobId, expectedStatus/version, next)` 계약과 `release(idempotencyKey, expectedJobId)` 계약을 추가한다.
- Redis Lua 또는 WATCH/MULTI로 상태 CAS와 owner-aware delete를 구현한다.
- SETNX 실패 후 GET 사이 키가 사라지는 예약 경쟁도 하나의 원자 연산으로 처리한다.

**완료 조건**

- 만료와 완료를 동시에 실행해도 종결 상태가 역전되지 않는다.
- 이전 작업 A의 종료가 재제출 작업 B의 키를 제거하지 않는다.
- 동일 요청 동시 제출을 실제 Redis 통합 테스트로 검증한다.

### P0-2. Community 게시글 상태와 카운터를 원자 갱신

**문제**

- 조회수 증가는 `CommunityCommandProcessor.java:270-283`, 좋아요/댓글 수는 `:286-320`처럼 읽어온 게시글 전체를 새 Entity로 만들어 `save`한다.
- `CommunityPostRepositoryAdapter.java:101-104`는 이를 JPA merge한다. `@Version`이나 row lock이 없다.

공개 조회, 수정, 삭제, 좋아요가 겹치면 마지막 전체 저장이 다른 변경을 덮을 수 있다. 예를 들어 오래된 ACTIVE 스냅샷의 조회수 저장이 DELETED 상태를 되살릴 수 있다.

**구현 방향**

- `incrementViewCount`, `increment/decrementLikeCount`, `increment/decrementCommentCount`, `softDeleteIfActive`를 조건부 update query로 분리한다.
- 카운터는 DB에서 `count = count + 1`로 계산하고 0 미만 방지 조건을 둔다.
- 본문 수정은 `@Version` 낙관적 잠금 또는 명시적 변경 메서드로 충돌을 감지한다.

**완료 조건**

- 조회·수정·삭제·좋아요 병렬 테스트에서 본문/상태 유실과 음수 카운터가 없다.
- 이미 삭제된 댓글/게시글을 다시 모더레이션해도 카운터를 두 번 줄이지 않는다.

### P0-3. Refresh token을 단일 사용으로 원자 회전

**문제**

- `JwtTokenProcessor.java:119-141`이 Redis token 조회·비교 후 기존 세션 삭제와 새 세션 저장을 별도 연산으로 수행한다.
- 동시에 같은 refresh token이 들어오면 둘 다 검증을 통과해 두 세션이 발급될 수 있다.
- `RedisJwtTokenStoreAdapter.java:61-76`은 저장 연결 실패를 로그만 남기고 성공처럼 반환한다. access token은 발급됐지만 새 refresh session은 없는 부분 성공이 생길 수 있다.

**구현 방향**

- `rotate(expectedOldToken, oldSessionId, newSession)`를 Lua/CAS 기반 포트 연산으로 만든다.
- 저장 실패는 도메인 503으로 전달하고 쿠키/토큰 발급 성공 응답을 내리지 않는다.
- 이미 소비한 token 재사용은 해당 session 또는 필요 시 token family를 폐기하고 보안 이벤트로 기록한다.

**완료 조건**

- 같은 refresh token 10개 병렬 요청 중 정확히 1개만 성공한다.
- Redis 장애 시 access/refresh cookie를 성공 응답으로 내리지 않는다.

### P0-4. 추천 설명과 계산 결과를 일치시킴

**문제**

- `CommercialComparisonQueryProcessor.java:184-214`는 6개 지표 다수결로 전체 추천 승자를 정한다.
- `:216-225`는 실제 매출·소비력 지표 승패와 관계없이 그 전체 승자에게 "매출 규모가 더 우세", "소비력과 거주 수요가 더 안정적"이라는 고정 이유를 붙인다.

매출이 낮아도 다른 지표 4개를 이기면 매출이 우세하다는 잘못된 설명이 사용자에게 노출된다.

**구현 방향과 완료 조건**

- 추천 이유는 각 metric winner와 실제 수치에서 생성한다.
- 동률, 결측, 서로 엇갈린 지표를 별도로 표현한다.
- "매출은 A가 낮지만 생존율·유동인구가 높아 종합 A" 같은 반례 테스트를 추가한다.

### P0-5. 시뮬레이션 프랜차이즈와 요청 업종 일치 검증

`SimulationReportProcessor.java:104-105`는 `franchiseeId` 존재만 확인하고 요청의 `serviceCode`와 해당 브랜드 업종 일치를 검증하지 않는다. 서로 다른 업종의 비용 기준이 결합된 결과를 막아야 한다.

**완료 조건**

- franchisee의 service code가 요청과 다르면 명확한 400 코드로 거절한다.
- 일치·불일치·존재하지 않음 회귀 테스트를 추가한다.

### P1-1. 재현 가능한 데이터 수집·검증·게시 파이프라인

**현 상태**

- 많은 API 기본값이 `20233`으로 고정돼 있다. 예: `CommercialWebController.java:67-288`, `MapWebController.java:87-151`, `AiReportWebController.java:57,93,110`.
- 운영 DB의 실제 최신 분기는 이번 코드 감사로 확인하지 않았다. 따라서 "운영 데이터가 2023년 3분기뿐"이라고 단정할 수는 없지만, 기본값이 데이터 상태를 자동 반영하지 않는 것은 확실하다.
- batch는 `AreaBoundaryImportJob` 한 종류이고, 분석 데이터는 migration SQL과 수동 runbook 중심이다.

**구현 방향**

1. `dataset_release`에 source name/URL/license, base period, acquired/published time, checksum, input/accepted/rejected row count, validation result를 저장한다.
2. 원본 → staging → 정규화 → 품질 검증 → active release 전환을 한 job 흐름으로 만든다.
3. API 기본 분기는 필요한 지표들이 함께 존재하는 최신 `active common period`에서 결정한다.
4. 실패 적재는 기존 공개 release를 유지하고, 행 오류와 결측/이상치 리포트를 남긴다.
5. 폐지·변경된 지역 코드는 UPSERT만 하지 말고 release 단위 활성 상태를 관리한다.

**완료 조건**

- 같은 원본 재실행 시 결과와 row count가 같고 중복이 0건이다.
- 필수 코드 누락, 중복, 좌표 범위, 결측률, 급증·급감 기준을 자동 검증한다.
- API 응답이 실제 사용한 분기, 데이터셋 버전, 최종 갱신일을 제공한다.
- 공개 release 전환 실패 시 이전 버전으로 즉시 조회 가능하다.

### P1-2. 후보 집합에 따라 흔들리지 않는 추천 점수

**문제**

- `CommercialHeatmapQueryProcessor.java:157-181`은 매출액, 인구, 변화율처럼 단위가 다른 원시값을 가중합하고 `:215-223`에서 마지막에 정규화한다.
- `:54-55`, `:102-115`의 min-max 기준은 요청 후보 집합이다. 지도의 viewport나 후보 목록이 바뀌면 동일 상권의 점수가 달라질 수 있다.
- 후보마다 다수의 상세 조회를 반복하는 `:72-92`는 N이 커질수록 쿼리가 증가한다.
- `:95-98`은 시설 데이터가 없으면 점수 전체를 탈락시키지만 실제 가중 공식은 시설을 사용하지 않는다.

**구현 방향**

- 각 지표를 서울 전체 또는 동일 업종·동일 분기 모집단의 percentile/z-score로 먼저 표준화한 뒤 가중합한다.
- 모집단/공식/version을 저장하고 응답에 `scoreVersion`과 지표별 contribution을 제공한다.
- 후보 목록을 bulk query/projection 한 번으로 읽는다.
- 필수/선택 지표를 명시하고 결측값 정책과 `dataSufficiency`를 반환한다.

**완료 조건**

- 후보 집합에 다른 상권을 추가해도 기존 상권 점수가 허용 오차 내에서 유지된다.
- 점수 단조성, 극단값, 전부 동일, 결측, 작은 표본 테스트가 있다.
- 후보 N 증가 시 DB 호출 횟수가 상수 범위다.

### P1-3. 프리셋 설명을 실제 feature와 연결

`commercial-service`의 `CandidatePresetType.java:34-44`는 청년형에 20~30대 유동인구·낮은 초기비용, 재취업형에 40~50대 거주 수요를 설명하지만 실제 `CommercialHeatmapQueryProcessor.java:75-108`의 공통 축과 `:157-181` 계산에는 연령별 수요나 초기비용 입력이 없다.

단기에는 설명을 실제 가중치 의미로 좁힌다. 공모전 버전에서는 연령별 매출/유동/거주 비중과 시뮬레이션 비용을 실제 feature로 포함하고, 프리셋별 산식을 명시한다.

### P1-4. AI 리포트에 주장-근거와 버전 연결

**문제**

- `AiReportPromptTemplate.java:14-23`은 환각 억제를 프롬프트 지시로만 처리한다.
- `AiStructuredResponseParser.java:70-138`은 구조와 enum 등을 검증하지만 문장 속 수치가 입력 근거에 존재하는지는 확인하지 않는다.
- `CommercialAiReportInfo.java:6-18`과 Redis cache key에는 dataset/prompt/model version과 evidence가 없다.

**구현 방향**

- AI 결과 항목을 `{claim, evidenceIds, caveat}`로 구조화한다.
- evidence는 `{metric, value, unit, period, sourceDataset, targetCode}`를 가진다.
- `datasetVersion`, `promptVersion`, `modelProvider/modelName`, `inputHash`를 결과와 cache key에 포함한다.
- 핵심 계산과 순위는 Java가 만들고 LLM은 주어진 facts의 설명과 비교에 집중시킨다.
- 결측, 상충 지표, 희소 업종, prompt injection 성격의 데이터 문자열을 포함한 고정 평가셋을 만든다.

**완료 조건**

- 수치가 포함된 모든 claim에 실제 입력 evidence가 존재한다.
- 데이터·프롬프트·모델 버전 변경 시 이전 cache를 사용하지 않는다.
- 고정 평가셋에 schema success, unsupported claim, evidence coverage, latency, token 지표를 기록한다.

### P1-5. AI 큐 용량, timeout, 재시작 복구 정책 정합화

- `ai-service`의 `AsyncConfig.java:19-26`은 2 thread/200 queue이고, `AiReportJobProperties.java:20-24` 기본 PENDING timeout은 30초다. 정상 큐 대기 작업이 만료될 수 있다.
- in-process `@Async` 작업은 프로세스 재시작 시 유실되고 조회할 때 실패로 바뀐다.
- `AiReportJobProcessor.java:127-142`의 queue rejection 응답과 `backend/docs/services/ai-service.md`의 503 계약도 맞춰야 한다.

먼저 admission control, 예상 대기시간, 큐 깊이 metric, deadline을 정리한다. 실제 사용자·트래픽 규모에서 재시작 복구가 필요하면 Redis Streams/Kafka 기반 durable work queue와 lease/heartbeat를 도입한다.

### P1-6. 시뮬레이션 이력을 의사결정 스냅샷으로 확장

`SimulationHistoryProcessor.java:40-52`는 클라이언트가 보낸 `totalPrice`를 그대로 저장하며 계산 분기, 모델/공식 버전, 비용 breakdown을 남기지 않는다. 시간이 지난 뒤 같은 결과를 재현하거나 데이터 갱신 전후를 비교할 수 없다.

저장 시 서버가 결과를 다시 계산하거나 서명된 report ID를 참조하게 하고 다음을 저장한다.

- 입력 예산·면적·층·업종·브랜드와 선택 상권
- 임대/인테리어/가맹/기타 비용 breakdown
- 기준 연도·분기, 데이터 release, 계산식 version
- 추천 후보와 선택 이유, 사용자가 조정한 가정

### P1-7. 지원 정책 실데이터와 사용자 자격 매칭

현재 정책 도메인·API·seed는 있지만 `feature-status.md:533` 이후에 실데이터 연동이 미완료로 기록돼 있다.

- 서울시/자치구/소상공인 정책의 출처, 접수 기간, 대상, 지역, 업종, 연령/창업 단계, URL을 수집한다.
- 만료와 중복을 자동 처리하고 마지막 검증 시간을 노출한다.
- 회원 프로필 전체를 늘리기 전에 시뮬레이션 입력과 최소 선택 질문으로 eligibility를 계산한다.
- "추천"과 "지원 가능 확정"을 구분하고 근거 조건을 제공한다.

### P1-8. Community 삭제/이미지 참조 정합성

- 댓글 조회가 `CommunityCommentRepositoryAdapter.java:24`에서 ACTIVE만 가져오고 Presenter `CommunityCommentPresenter.java:23-27`는 root 댓글에서만 트리를 만든다. 부모가 삭제되면 살아있는 대댓글도 화면에서 사라진다.
- 이미지 키는 `CommunityPostImageProcessor.java:41-59`에서 member prefix만 검증한다. 같은 키를 여러 게시글에 연결할 수 있어 한 글에서 제거할 때 다른 글의 파일도 삭제될 수 있다.
- 게시글 hard delete는 `CommunityCleanupRepositoryAdapter.java:25-41`에서 post와 image만 직접 지운다. FK cascade가 DDL과 실제 DB에 확실히 적용되지 않으면 comment/like/report가 남을 수 있다.

**완료 조건**

- 삭제된 부모는 "삭제된 댓글" placeholder로 남기고 ACTIVE 대댓글을 표시한다.
- image key에 unique attachment/claim 상태를 두거나 reference count 후 삭제한다.
- 게시글 hard delete의 모든 종속 데이터 정책을 DB integration test로 검증한다.

### P2-1. Batch 입력 검증과 실패 행 리포트

`AreaBoundaryImportProcessor.java:56-69`는 잘못된 행을 로그/집계 없이 건너뛰고, `:74-77`은 빈 코드와 비수치 좌표를 `asText/asDouble` 기본값으로 받아 적재할 수 있다.

- root 배열, 필수 코드, 중복 코드, 숫자 타입, 서울 좌표 범위, polygon 유효성을 검증한다.
- `input = accepted + rejected`를 보장하고 실패 행과 이유를 격리 저장한다.
- 허용 실패율을 넘으면 release를 게시하지 않는다.
- batch-service에 단위·통합 테스트를 추가한다.

### P2-2. OpenAI usage를 실제로 집계

`OpenAiLlmClientAdapter.java:167-168`은 항상 `AiUsageMeta.empty()`를 반환하고 `OpenAiChatResponse.java:7`은 `choices`만 매핑한다. 외부 provider 사용 시 비용 지표가 0으로 기록된다.

provider usage를 매핑하고, 미제공은 0이 아닌 `unknown`으로 구분한다. 실패·거절·파싱 실패도 실제 비용 발생 여부를 기록한다.

### P2-3. Gateway reactive 경로에서 blocking Redis 제거

`AccessTokenBlacklistChecker.java:18-24`는 WebFlux gateway filter 흐름에서 blocking `RedisTemplate.hasKey`를 직접 호출한다. Redis 지연이 event-loop를 막아 전체 gateway latency를 키울 수 있다.

ReactiveRedisTemplate을 사용하거나 bounded scheduler로 격리하고 timeout/fail-open·closed 정책 metric을 추가한다. auth-service와 gateway의 blacklist key 계약을 contract test로 잠근다.

### P2-4. District/Batch 테스트와 아키텍처 자동 검증

현재 테스트 Java 파일 수는 commercial 22, AI 8, auth 6, community 4지만 district와 batch는 0이다. 단순 파일 수는 품질 점수가 아니지만 핵심 경계의 공백은 분명하다.

- District: region code lookup, 좌표 변환, map profile/heatmap/candidate 내부 계약 테스트
- Batch: 입력 검증, 멱등 재실행, 부분 실패, 이전 release 유지 테스트
- ArchUnit: application/domain의 adapter import 금지, Controller의 UseCase 외 호출 금지, Processor의 web DTO 반환 금지
- CI: `test` 외 `check-dto-convention.py`, ArchUnit, 필요 시 SpotBugs/OWASP dependency scan을 명시적으로 실행

새 dependency 도입은 저장소 working agreement에 따라 구현 시 별도 합의한다. 우선 의존성 없는 import 검사부터 CI에 넣을 수 있다.

### P2-5. 문서와 구현의 계약 드리프트 정리

- 루트 README에는 창업 시뮬레이션이 아직 백엔드 구현 전이라고 적혀 있지만 `commercial-service`에 구현과 테스트가 있다.
- `backend/docs/modules.md`의 commercial context 목록이 ranking, policy, simulation, analysisbookmark를 반영하지 않는다.
- moderation gateway route는 local/dev/prod에 실제 존재하지만 일부 문서 상태와 다르다.

API/feature 문서를 코드에서 생성·검증하거나 최소한 release checklist에 endpoint와 상태 교차 검사를 넣는다.

## 6. 공모전용 기능 보완 제안

### 6.1 가장 추천: 예산·위험 선호 기반 상권 시나리오 비교

새로운 독립 기능을 하나 더 붙이기보다 기존 추천, 시뮬레이션, 정책, AI를 한 사용자 흐름으로 결합한다.

```text
예산·업종·선호 입력
  -> 실행 가능한 후보 필터
  -> 수익 기회 / 비용 / 경쟁 / 변동성 / 데이터 충분도 비교
  -> 보수·기준·공격 시나리오
  -> 지원 정책 적용 전후 초기 필요 자금
  -> 근거가 연결된 AI 설명
  -> 의사결정 스냅샷 저장·공유
```

필수 backend model:

- `DecisionScenario`: budget, risk tolerance, target customer, operation constraints
- `CandidateEvidence`: metric value/unit/period/source, normalized value, contribution
- `ScenarioOutcome`: initial cost range, opportunity/risk score, insufficiency flags
- `DecisionSnapshot`: dataset/formula/prompt/model version과 사용자 가정

초기에는 매출을 예측하는 확률값을 만들지 않는다. 실제 검증 데이터 없이 "성공 확률 83%" 같은 수치는 신뢰를 훼손한다. 먼저 관측된 지표, 범위, 비교 근거, 불확실성을 정확히 보여준다.

### 6.2 데이터 신뢰 카드 API

모든 분석 응답에 큰 lineage 객체를 반복하지 말고 `dataSnapshotId`를 주고 별도 endpoint로 다음을 제공한다.

- 사용 데이터셋과 제공기관
- 기준 분기와 수집/게시 시각
- 결측/대체값/표본 부족 여부
- 계산식/추천 score version
- 현재 더 최신 데이터가 없는 이유 또는 갱신 예정

이 기능은 공공데이터 활용을 시연 화면에서 직접 증명하고 AI 근거화에도 재사용된다.

### 6.3 추천 결과 사후 검증

사용자가 저장한 후보에 대해 새 분기가 들어오면 당시 지표와 최신 지표를 비교한다. "우리 추천이 맞았다"고 단정하기보다 변화와 오차를 투명하게 보여준다.

- saved decision snapshot 기준 추적
- 새 release 활성화 시 비교 job 생성
- 매출/점포/유동 변화와 정책 변화 알림
- 추천 formula version별 backtest dataset 생성

이는 장기적으로 추천 품질 평가와 발표용 실증 자료가 된다.

### 6.4 사용자 검증과 운영 지표

기능 개발과 함께 다음 이벤트를 개인정보 최소화 원칙으로 집계한다.

- 분석 시작 → 후보 비교 → 시뮬레이션 → 저장/공유 전환율
- 추천 근거 펼쳐보기 비율과 후보 변경 횟수
- AI 리포트 완료/실패/근거 확인 비율
- 정책 링크 이동과 만료/부적격 피드백
- 데이터 부족으로 결과를 못 낸 비율

공모전의 발전 가능성과 이용 활성화 질문에 코드 구조가 아니라 실제 사용 증거로 답할 수 있다.

## 7. 단계별 실행 계획

### Phase 0. 회귀 테스트와 정확성 잠금 (1~2주)

- AI CAS/owner race 재현 테스트
- Community 카운터·상태 동시성 테스트
- Refresh rotation 병렬 테스트
- comparison 설명 반례, franchisee 업종 불일치 테스트
- 이 테스트를 먼저 실패시키고 구현한다.

산출물: P0 테스트 및 수정, 에러 코드/API 계약 문서, 운영 metric.

### Phase 1. 데이터 release 기반 (2~4주)

- 데이터셋 inventory와 출처/라이선스 확정
- `dataset_release`, 품질 결과 모델 설계
- 최소 한 데이터군을 staging→validation→publish로 구현
- 공통 최신 분기 resolver와 `dataSnapshotId` 적용
- batch 테스트 추가

산출물: 재실행 가능한 job, 품질 리포트, 데이터 신뢰 API.

### Phase 2. 추천 엔진 v2 (2~4주)

- 기존 점수 v1을 고정 테스트로 보존
- 모집단 기준 표준화와 score version 도입
- bulk query, 결측/충분도 정책
- metric contribution과 정확한 설명
- 과거 분기 backtest 및 도메인 전문가 검토 기록

산출물: v2 score spec, 비교 리포트, 추천 근거 API.

### Phase 3. AI evidence report v2 (2~3주)

- fact/evidence schema와 versioned prompt
- cache key versioning
- unsupported numeric claim validator
- 고정 평가셋과 provider별 평가 리포트
- queue admission/timeout/복구 정책 정리

산출물: 근거 연결 리포트, AI 품질 대시보드, 실패 fallback.

### Phase 4. 공모전 사용자 흐름 (3~5주)

- 예산·위험 선호 입력과 후보 필터
- 3개 시나리오 비교
- 정책 적용 전후 비용
- DecisionSnapshot 저장/공유와 신규 분기 비교
- 핵심 시연 E2E와 사용자 테스트

산출물: 10분 발표 안에서 완주 가능한 제품 시나리오와 사용성 지표.

### Phase 5. 제출 전 안정화 (2주 이상 확보)

- 실제 배포 환경 load/soak/failure test
- Redis, commercial-service, LLM 장애 시 fallback 시연
- 공모전 demo seed와 read-only fallback 준비
- 출처·라이선스·개인정보·AI 한계 문구 검토
- 2027 공고 평가표로 traceability matrix 갱신

## 8. 개발 시작용 Epic 목록

| 순서 | Epic | 선행 조건 | 완료 증거 |
| --- | --- | --- | --- |
| 1 | AI job atomic lifecycle | 없음 | 실제 Redis race test |
| 2 | Community atomic counters/status | 없음 | DB concurrency integration test |
| 3 | Auth atomic refresh rotation | 없음 | 병렬 single-use test |
| 4 | Recommendation correctness hotfix | 없음 | 설명 반례·업종 일치 test |
| 5 | Dataset release & quality pipeline | P0 완료 권장 | 동일 입력 멱등·실패 rollback report |
| 6 | Common latest period & data snapshot | dataset release | API contract test |
| 7 | Recommendation score v2 | data snapshot | invariance/backtest report |
| 8 | AI evidence & versioning | data snapshot | fixed eval set report |
| 9 | Decision scenario & snapshot | score v2, simulation snapshot | E2E 시나리오 |
| 10 | Policy real-data matching | dataset pipeline | freshness/eligibility test |
| 11 | Community deletion/reference cleanup | atomic status | FK/reference integration test |
| 12 | Architecture/quality CI | 경계 리팩토링과 병행 | forbidden import CI failure fixture |

각 Epic은 구현 전에 issue를 다음 단위로 자른다: 회귀 테스트 → port/domain 계약 → adapter 구현 → API/Presenter → migration/runbook → 운영 metric → 문서.

## 9. 검증 결과와 한계

### 실행한 검증

- `backend/gradlew.bat test check --no-daemon --console=plain --rerun-tasks`
- 결과: **BUILD SUCCESSFUL**, 43 actionable tasks 실행
- JUnit XML 45개, 235개 테스트에서 failure/error/skipped는 0건이었다.
- `backend/scripts/check-dto-convention.py`를 `service`, `core` 루트에 실행해 DTO 199개를 검사했고 위반은 0건이었다.
- main/test Java 파일 수 조사: commercial 489/22, AI 149/8, auth 137/6, community 117/4, district 102/0, batch 16/0
- 애플리케이션 계층의 adapter import와 주요 동시성/계산 경로를 정적 검색 후 해당 파일을 직접 확인했다.

### 남은 한계

- 운영 DB의 데이터 분기, row count, 결측률, 실제 쿼리 latency는 확인하지 않았다.
- 외부 Infra 저장소의 compose, Grafana alert, 운영 환경변수 값은 범위 밖이었다.
- 실제 Redis/MySQL/Kafka/MinIO를 올린 통합·부하 테스트는 실행하지 않았다.
- Gradle `check`에는 ArchUnit, checkstyle, SpotBugs 같은 별도 정적 분석이 구성돼 있지 않다.
- 강제 테스트 실행 중 `service-discovery` 종료 훅에서 Eureka connection cleaner의 `IllegalStateException` 로그가 1회 발생했다. 빌드와 테스트는 성공했지만 종료 순서 또는 라이브러리 동작을 별도 확인해야 한다.
- Gradle 10과 호환되지 않는 deprecated feature 경고가 있어 Gradle 업그레이드 전에 원인을 정리해야 한다.
- 2027 공모전 규칙은 아직 알 수 없으며 2026 공식 공고를 가정했다.

## 10. 이번 진단에서 유지할 좋은 패턴

- 공통 응답, 검증, 보안, 저장소, 상권 공유 타입을 core 모듈로 분리한 방향
- Controller → UseCase → Facade → Processor → Port/Adapter 흐름
- Snowflake ID를 응답 경계에서 문자열로 변환하는 규칙
- 내부 Feign 호출을 adapter와 QueryResult 뒤로 숨기고 circuit breaker를 적용한 구조
- 이미지 매직 바이트 검사, 서버 생성 key, commit 이후 삭제 전략
- AI 비동기 제출, 사용자 소유권 확인, SSE와 polling 병행, 일일 사용량 제한
- 공유 링크, 분석 보관함, 시뮬레이션 이력처럼 실제 사용자 여정을 이어주는 기능
- Kafka ranking을 feature flag로 격리해 브로커 장애가 핵심 분석을 막지 않는 설계

이 패턴들은 유지하면서 P0 데이터 정합성과 P1 데이터·추천·AI 근거화를 우선한다. 공모전용 개발의 성공 기준은 "API 수"가 아니라 **한 사용자가 최신 서울 데이터로 후보를 고르고, 비용과 위험을 비교하고, 모든 추천 근거를 확인한 뒤, 그 결정을 재현 가능한 형태로 저장하는 흐름**이 끝까지 안정적으로 동작하는 것이다.
