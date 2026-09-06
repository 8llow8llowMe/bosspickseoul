# AI Service Guide

## 서비스 책임

- 상권 / 자치구 / 행정동 / 상권 비교 분석 데이터를 기반으로 AI 리포트를 생성한다.
- LLM 연동, 프롬프트 구성, 구조화 응답 파싱을 담당한다.
- AI 리포트 캐시 / 작업 상태 / 사용자별 토큰 사용량 / 일별 사용량 상한을 Redis 로 관리한다.
- 내부 서비스 조회 결과를 AI 리포트 입력 데이터로 조합한다.

## 주요 컨텍스트

- `aireport`

## 인증 방식

- 비동기 제출/조회 엔드포인트(`POST /api/v1/ai-reports/commercials/{code}`, `GET /api/v1/ai-reports/jobs/{jobId}`) 는 **인증 필수** (`@PreAuthorize("isAuthenticated()")`).
- 리포트 4종(상권/상권비교/자치구/행정동) 전부 POST 제출 + `GET /jobs/{jobId}` 폴링의 비동기 모델을 사용한다.
- 동기 GET 조회 엔드포인트 4종은 제거 완료 — 비동기 제출 + 폴링/SSE 만 지원한다.
- 내부 서비스 간 호출 계약은 out adapter 에서 캡슐화한다 (`FeignClient -> Adapter -> QueryResult`).
- **인증 실패 응답은 `security-core` 의 `SecurityErrorCode` 를 따른다** (예: 토큰 미첨부 `SECURITY_001`, 만료 `SECURITY_002`, 권한 부족 `SECURITY_006`). ai-service 는 별도 인증 ErrorCode 를 자체 발행하지 않는다.

## 주요 모듈

- Controller: `AiReportWebController`
- UseCase / Facade: `AiReportWebUseCase` / `AiReportWebFacade`
- Processor:
  - `AiReportProcessor` — cache + LLM 생성 파이프라인 (워커에서 호출)
  - `AiReportJobProcessor` — 비동기 작업 제출 / 상태 조회 / 멱등성 보장
- Worker: `AiReportWorker` — `@Async("aiReportTaskExecutor")` 로 비동기 LLM 호출
- Out port:
  - `AiLlmPort` — Ollama / OpenAI 어댑터 분기, `AiGenerationResult<*Draft>` 반환
  - `AiReportCachePort` — 결과 캐시 (Redis)
  - `AiReportJobStorePort` — 작업 상태 저장 (Redis)
  - `AiReportJobEventPort` — 작업 상태 변경 브로드캐스트 (Redis pub/sub, 채널 `{prefix}:ai:job:events:{jobId}`)
  - `AiUsageCounterPort` — 사용자별 토큰 사용량 카운터 + 일별 사용량 상한 소비/검사 (Redis)
  - `*AnalysisQueryPort` — 다른 서비스 Feign 조회
- Presenter: `AiReportPresenter`
- SSE: `AiReportJobSseStreamer` (adapter/in/web/sse) — 잡 상태 변경을 SSE 로 푸시

## 비동기 작업 모델

### 흐름

```
POST /api/v1/ai-reports/commercials/{commercialCode}
  ├─ 캐시 hit  → 200 OK + CommercialAiReportResponse (submissionStatus=CACHED, 사용량 제한 대상 아님)
  ├─ cache miss + 일별 사용량 상한 초과 → 429 (AI_012), 잡 생성 안 함
  ├─ 동일 사용자가 같은 요청을 in-flight 보유 → 202 + 기존 jobId
  └─ cache miss → 202 + 신규 jobId, @Async 워커 픽업

(async worker)
  ├─ status PENDING → RUNNING
  ├─ AiReportProcessor.generateCommercialReport() 호출
  ├─ 성공: 캐시 저장 + status COMPLETED + 토큰 사용량 기록
  └─ 실패: status FAILED + errorCode/errorMessage

GET /api/v1/ai-reports/jobs/{jobId}
  ├─ COMPLETED → 200 + commercialReport (job 스냅샷에서 조회, legacy job 은 캐시 fallback)
  ├─ RUNNING / PENDING → 200 + status only
  ├─ FAILED → 200 + errorCode/errorMessage
  └─ 본인 작업 아님 / 미존재 → 404 (AI_005)

GET /api/v1/ai-reports/jobs/{jobId}/stream (SSE)
  ├─ 구독 즉시 현재 상태를 job-update 이벤트로 1회 전송 (data = 작업 상태 조회 응답의 dataBody 와 동일 JSON)
  ├─ 상태 변경마다 job-update 이벤트 전송, COMPLETED/FAILED 도달 시 서버가 연결 종료
  ├─ 미존재/타인 작업 → SSE 시작 전 404 (AI_005) JSON 오류
  └─ 폴링(GET /jobs/{jobId}) 은 SSE 연결 실패 시 폴백으로 유지
```

### 상태 변경 전파 (SSE + Redis pub/sub)

- 워커와 SSE 연결을 잡은 인스턴스가 다를 수 있으므로 상태 전이(RUNNING/COMPLETED/FAILED, lazy 만료 포함) 시
  `AiReportJobEventPort.publishJobUpdated(jobId)` 로 Redis pub/sub 채널에 브로드캐스트한다.
- 이벤트 메시지에는 상태를 싣지 않는다. 구독자는 수신 시 저장소에서 잡을 다시 읽어 최신 상태를 전달한다
  (발행-저장 순서 역전과 이벤트 스키마 드리프트 방지).
- 발행은 best-effort 다. 유실돼도 SSE 하트비트(25초, 연결 유지 + 상태 재확인)가 종결을 감지하고,
  하트비트의 상태 재확인은 lazy 만료(`expireIfStuck`)도 함께 트리거한다.
- SSE 연결 타임아웃은 `pending-timeout + running-timeout + 30초` 로, 잡이 살아있을 수 있는 최대 시간과 정렬된다.
- 브라우저 `EventSource` 는 Authorization 헤더를 지원하지 않으므로 프론트는 fetch 기반 SSE 클라이언트
  (예: `@microsoft/fetch-event-source`) 로 Bearer 토큰을 첨부해야 한다.

### 멱등성 (원자적 보장 + orphan-key 방지)

- `requestHash = SHA256(jobType | param1=v1 | param2=v2 | ...)` 앞 32자
- 제출 흐름: **(1) PENDING 작업 entry 저장 → (2) Lua로 `ai:job:idempotency:{memberId}:{requestHash}` 예약 및 소유 jobId 반환을 원자 실행**
  - 이 순서 덕분에 idempotency 키가 외부에 보이는 시점에는 **항상 valid jobId 가 가리키는 작업 entry 가 존재**
  - 레이스 패배 시(다른 요청이 먼저 예약 성공) 자기가 방금 저장한 작업 entry 를 즉시 `deleteJob` 해서 orphan 잔여물 제거
- 동일 사용자 + 동일 요청 동시 두 건이 들어와도 둘 중 하나만 워커 디스패치, 나머지는 같은 jobId 를 재사용해서 받음
- 워커 종료(COMPLETED/FAILED) 또는 lazy 만료의 상태 저장에 성공한 경우, Lua에서 소유 jobId가 일치할 때만 idempotency 키를 해제한다. 지연된 이전 워커는 새 작업의 예약을 해제할 수 없다.
- `PENDING → RUNNING`, `RUNNING → COMPLETED/FAILED`, timeout 전이는 Redis Lua CAS로 기대 상태를 확인한 뒤 저장한다. 경합에서 진 전이는 상태를 덮어쓰거나 이벤트를 발행하지 않는다.
- timeout CAS가 실패하면 최신 상태를 재조회한다. 작업이 TTL로 사라졌다면 기존 `AI_005`(404), 저장소 명령 실패는 `AI_006`(503)으로 응답한다. 워커의 종결 상태 저장이 실패하면 예약을 유지하고 lazy timeout으로 복구한다.
- 종결 상태 저장은 성공했지만 Redis 응답만 유실될 수 있으므로, 조회에서 `COMPLETED/FAILED`를 확인하면 소유자 조건으로 예약 해제를 재시도한다. 이 복구는 이전 작업을 반복 조회해도 새 작업의 예약을 지우지 않는다.
- 실제 Redis 회귀 테스트: 테스트 Redis의 포트를 `TEST_REDIS_PORT`, 원격/WSL 호스트라면 `TEST_REDIS_HOST`에 설정하고 `:service:ai-service:test`를 실행한다. 테스트는 UUID 접두사 키만 사용·삭제하며 예약 동시성, 이전 소유자의 해제, 완료/timeout 경합과 TTL을 확인한다.

### 결과 스냅샷 (캐시 의존성 제거)

- 워커는 작업 완료 시 결과를 **`AiReportJob.commercialReport` 필드에 직접 임베드**해서 저장한다 (`completedWithCommercialReport`).
- `getJobInfo` 가 COMPLETED 작업을 조회할 때는 job 스냅샷에서 직접 결과를 읽어 반환한다. 캐시 만료 / 별도 invalidation / Redis LRU evict 같은 외부 요인과 무관.
- 임베드 결과가 없는 레거시 작업(필드 추가 이전 버전) 만 fallback 으로 cache 를 한 번 더 조회한다.

### 좀비 작업 lazy 만료

- ai-service 는 in-process `@Async` 워커만 사용해 durable queue 가 아니다. 워커 프로세스 재시작 / executor 포화 / Redis hiccup 등으로 `PENDING` 또는 `RUNNING` 상태가 영원히 남을 위험이 있다.
- `getJobInfo` 호출 시점에 다음을 검사해 자동으로 FAILED 로 전환한다:
  - `PENDING` 이면서 `now - createdAt > pendingTimeoutSeconds` (기본 30초)
  - `RUNNING` 이면서 `now - startedAt > runningTimeoutSeconds` (기본 5분)
- 만료 처리 시 `errorCode=AI_009 (JOB_TIMEOUT)` 로 마킹하고 idempotency 키를 해제한다 → 사용자가 다시 제출하면 새 작업으로 처리된다.
- 폴링이 발생하지 않는 작업은 Redis TTL (24h) 까지 잔류 후 자연 소멸한다. 운영상 부담이 보이면 별도 스케줄 정리 잡을 추가할 수 있다.

### 사용량 제한 (계정 단위 LLM 어뷰징 방어)

- 로그인 계정 하나로 LLM 을 무제한 호출하는 것을 막기 위해 **일별 리포트 생성 건수 상한**을 적용한다.
- 검사 지점: `AiReportJobProcessor.submitJob()` 진입부 — POST 4종(`commercials/{code}`, `commercials/comparisons`,
  `districts/{code}`, `administrations/{code}`) 이 공유하는 신규 잡 생성 경로다.
  **캐시 hit 은 LLM 을 호출하지 않으므로 제한 대상이 아니다** (`submitJob` 에 도달하지 않는다).
- 초과 시 `AI_012 USAGE_LIMIT_EXCEEDED`(429)로 제출을 거절한다. 잡 entry / 멱등성 키 / 워커 디스패치는 일어나지 않는다.
- 포트: `AiUsageCounterPort.tryConsumeDailyQuota(long memberId)` — 소비 후 상한 이내면 `true`.
- 저장소: **기존 일별 usage 해시를 재사용**하고 `submissions` 필드만 추가한다. 새 키 스키마를 만들지 않는다.
  완료 건수인 `count` 는 워커가 생성 성공 후에 올려 실패/타임아웃 호출이 빠지므로 상한 기준으로 쓸 수 없어 필드를 분리했다.
- 멱등 재사용(같은 요청이 in-flight 라 기존 jobId 를 되돌려주는 경우)도 슬롯 1건을 소비한다 — 반복 제출 자체가 억제 대상이라 보수적으로 센다.
- **Redis 장애 시 정책: fail-open** (상한 검사를 통과시키고 WARN 로그만 남긴다). 사용량 카운터는 인증/인가가 아니라
  어뷰징 억제 장치이고, 실제 LLM 동시 호출 총량은 워커 큐(스레드 2 / 큐 200, 포화 시 `AI_007`)가 이미 하드 리밋을 걸고 있어
  카운터 저장소 장애로 정상 기능을 막는 것은 과하다.

### Redis 스키마

| 키 | 타입 | TTL | 내용 |
|----|------|-----|------|
| `{prefix}:ai:job:{jobId}` | String (JSON) | 24h | `AiReportJob` 직렬화 |
| `{prefix}:ai:job:idempotency:{memberId}:{hash}` | String | 24h | jobId |
| `{prefix}:ai:usage:{memberId}:{yyyy-MM-dd}` | Hash | 30d | promptTokens, completionTokens, count, submissions |
| `{prefix}:ai:report:commercial:v2:...` | String (JSON) | 24h (`ai.report.cache.ttl-seconds`) | 결과 캐시 |

### Properties

```yaml
ai:
  report:
    cache:
      ttl-seconds: 86400
    job:
      ttl-seconds: 86400              # job + idempotency Redis TTL
      usage-ttl-seconds: 2592000      # 일별 usage 카운터 TTL (30일)
      pending-timeout-seconds: 30     # PENDING 좀비 lazy 만료 기준
      running-timeout-seconds: 300    # RUNNING 좀비 lazy 만료 기준
    usage-limit:
      daily-limit: 30                 # 계정 1개 일별 리포트 생성 상한 (AI_REPORT_USAGE_DAILY_LIMIT)
  llm:
    provider: OLLAMA
    base-url: http://localhost:11434
    api-key: ""                       # OpenAI 호환 provider 용, OLLAMA 는 빈 값 허용
    model: qwen2.5:7b-instruct
    timeout-ms: 30000                 # LLM read timeout (AI_LLM_TIMEOUT_MS)
    max-tokens: 1200
    temperature: 0.2
    reasoning-effort: low             # reasoning 지원 모델용, 기본 low
```

LLM 호출에는 별도 서킷브레이커 인스턴스 `resilience4j.circuitbreaker.instances.llm` 이 적용되며, slow-call 판정 임계값은 read timeout(`AI_LLM_TIMEOUT_MS`, 기본 30000ms)과 동일 값으로 연동해 사실상 실패율 기준만 사용한다.

### Async TaskExecutor

- 빈 이름: `aiReportTaskExecutor` (컨벤션: `api-design-guide.md` §7 워커 규칙)
- corePoolSize=2, maxPoolSize=2, queueCapacity=200, threadNamePrefix=`ai-report-worker-`
  - LLM 이 동시 생성 1건(Ollama `OLLAMA_NUM_PARALLEL=1`)이라 스레드를 늘려도 전부 LLM 앞에서 대기한다.
    오히려 대기 중인 잡이 RUNNING 으로 일찍 전이되어 running-timeout 을 헛되이 소모하므로 스레드는 최소로 두고
    대기는 큐가 흡수하게 한다. 큐 포화 시 제출은 `AI_007 JOB_QUEUE_FULL`(503) 로 거절된다.
- shutdown 시 30초 대기
- 관측: Spring Boot 자동 계측으로 `executor_*{name="aiReportTaskExecutor"}` 노출 → Grafana `BossPickSeoul Executor / Thread Pool` 대시보드의 `name` 범례로 표시

## Public APIs

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/v1/ai-reports/commercials/{commercialCode}` | 필수 | **상권 AI 리포트 비동기 제출**. cache hit → 200, miss → 202 + jobId |
| POST | `/api/v1/ai-reports/commercials/comparisons` | 필수 | **상권 비교 AI 인사이트 비동기 제출** |
| POST | `/api/v1/ai-reports/districts/{districtCode}` | 필수 | **자치구 AI 리포트 비동기 제출** |
| POST | `/api/v1/ai-reports/administrations/{administrationCode}` | 필수 | **행정동 AI 리포트 비동기 제출** |
| GET | `/api/v1/ai-reports/jobs/{jobId}` | 필수 | **작업 상태 / 결과 조회** (본인 작업만, SSE 폴백) |
| GET | `/api/v1/ai-reports/jobs/{jobId}/stream` | 필수 | **작업 상태 SSE 스트림** (본인 작업만, 종결 시 서버가 연결 종료) |

> 모든 AI 리포트 엔드포인트는 인증된 사용자 전용이다.

> comparison / district / administration 도 동일한 비동기 모델로 전환 완료
> (`POST /commercials/comparisons`, `POST /districts/{code}`, `POST /administrations/{code}`).
> 워커는 `AiReportWorker.runJob(jobId)` 하나가 jobType 으로 분기한다.

## ErrorCode

| 코드 | HttpStatus | 설명 |
|------|-----------|------|
| `AI_001` | 502 | 원천 데이터 조회 실패 |
| `AI_002` | 503 | LLM 서비스 사용 불가 |
| `AI_003` | 502 | LLM 응답 해석 실패 |
| `AI_004` | 503 | 캐시 사용 불가 |
| `AI_005` | 404 | 작업 미존재 / 본인 작업 아님 |
| `AI_006` | 503 | 작업 저장소 사용 불가 |
| `AI_007` | 503 | 대기열 포화 — 워커 큐가 가득 차 제출 거절 (재시도하면 성공 가능, `AI_008` 과 구분) |
| `AI_008` | 500 | 작업 실패 — 워커 디스패치 실패 또는 예측 못한 예외 (외부 노출 메시지는 항상 ErrorCode 의 한국어 메시지로 sanitize 됨) |
| `AI_009` | 504 | 작업이 시간 내에 완료되지 않음 (lazy 만료) |
| `AI_010` | 500 | 지원하지 않는 LLM 응답 스키마 정의 (LLM_SCHEMA_UNSUPPORTED) |
| `AI_011` | 500 | AI 리포트 요청 식별자(멱등성 키) 생성 실패 (IDEMPOTENCY_KEY_GENERATION_FAILED) |
| `AI_012` | 429 | 일별 사용량 상한 초과 (USAGE_LIMIT_EXCEEDED) — 신규 잡 제출만 거절, 캐시 hit 은 영향 없음 |
| `AI_100` | 400 | 요청 값 검증 실패 폴백 (INVALID_REQUEST) |
| `AI_101` | 400 | 요청 파라미터 형식 오류 (PARAMETER_TYPE_INVALID) |

**인증 실패 응답은 ai-service 가 발행하지 않고 `security-core` 의 `SecurityErrorCode` 를 사용한다** — 인증 누락 `SECURITY_001`, 권한 부족 `SECURITY_006` 등.

워커가 작업을 실패 처리할 때 외부 응답에 들어가는 `errorCode/errorMessage` 는 항상 도메인 ErrorCode 의 코드/메시지만 사용한다. 원인 예외의 `getMessage()` 는 서버 로그에만 남고 응답으로 노출되지 않는다.

## Response Shape Notes

### Submission Response (POST 결과)

- DTO: `AiReportSubmissionResponse`
- `submissionStatus` / `jobType` 은 `{code, name, description}` metadata 객체 (`CodeNameDescriptionMetadata`)
- `submissionStatus.code` ∈ `{CACHED, ACCEPTED}`
- `CACHED` 일 때만 jobType 에 대응하는 리포트 필드
  (`commercialReport` / `commercialComparisonReport` / `districtReport` / `administrationReport`) 하나가 채워짐 (HTTP 200)
- `ACCEPTED` 일 때만 `jobId` 채워짐 (HTTP 202)

### Job Status Response (GET /jobs/{id})

- DTO: `AiReportJobStatusResponse`
- `jobType` / `status` 는 `{code, name, description}` metadata 객체 (`CodeNameDescriptionMetadata`)
- `status.code` ∈ `{PENDING, RUNNING, COMPLETED, FAILED}`
- `COMPLETED` 일 때만 jobType 에 대응하는 리포트 필드 하나가 채워짐
- `FAILED` 일 때만 `errorCode`, `errorMessage` 채워짐
- `progressMessages: List<String>` — 진행 중(`status.isInFlight()`, PENDING/RUNNING) 일 때만 jobType 별 로테이션 문구가 채워지고, 종결 상태(COMPLETED/FAILED)에서는 null

### District / Administration AI Report

- response DTO: `DistrictAiReportResponse` / `AdministrationAiReportResponse`
- 자치구/행정동 리포트는 LLM 응답 JSON 에 아래 필드를 필수로 요구한다 (프롬프트에 명세, 파싱 실패 시 `AI_003`)
  - `summary`
  - `marketStatus`
  - `recommendedBusinessCategories[]`
  - `cautionBusinessCategories[]`
  - `businessInsight`

### Commercial Comparison AI Report

- response DTO: `CommercialComparisonAiReportResponse`
- fields
  - `summary`
  - `recommendedSide`
  - `recommendedReasons`
  - `riskComparison`
  - `timeSlotInsight`
  - `customerSegmentInsight`
  - `operationStrategy`
  - `businessInsight`
  - `generatedAt`

### `recommendedSide` Rule

- current AI comparison response uses a string value
- allowed values
  - `LEFT`
  - `RIGHT`
  - `BALANCED`
- upstream comparison service may use `TIE`, but ai-service normalizes that case to `BALANCED` before prompting the LLM

## Integration Notes

- comparison AI response does not currently use metadata object shape for `recommendedSide`
- frontend should treat `recommendedSide` as a string enum in the AI comparison response
- comparison preview and comparison detail APIs still use metadata objects on the commercial-service side

## 현재 구현 주의점

- `Info -> Presenter -> Response` 흐름을 유지한다.
- 내부 서비스 응답은 `adapter/out/client` 에서만 해석하고 application 에는 `QueryResult` 만 전달한다.
- Spring 백엔드 서비스 간 동기 HTTP 호출은 기본적으로 `FeignClient` 를 사용한다.
- 외부 LLM 연동은 provider 특성에 따라 `Spring AI` 또는 `WebClient` 를 선택할 수 있지만, port 경계 밖으로 세부 구현을 노출하지 않는다.
- 프롬프트 포맷터, 구조화 응답 파서, 캐시 키 규칙을 함께 관리한다.
- 비동기 작업은 in-process executor를 사용한다. Redis CAS는 인스턴스 간 동일 job의 중복 실행·종결 덮어쓰기를 막지만 프로세스 재시작 후 작업 재전달은 보장하지 않는다. durable queue 도입은 별도 과제다.
- 운영 단가 추적은 현 시점 미적용 — Ollama 로컬 운영 가정. 외부 OpenAI 사용 시 토큰 단가표 + 일/월 누적 cost 가 필요하면 `AiUsageCounterPort` 확장.
- **사용량 제한(rate limit) 구현 완료** — 상세는 아래 "사용량 제한" 절 참고.
- 워커 풀(`aiReportTaskExecutor`)은 LLM 동시 생성이 1건인 특성에 맞춰 스레드 2 / 큐 200 으로 둔다.
  스레드를 늘리면 대기 중인 잡이 RUNNING 으로 일찍 전이되어 running-timeout 을 헛되이 소모한다.
  큐가 넘치면 제출이 `AI_007 JOB_QUEUE_FULL`(503) 로 거절되며, 이는 작업 실패(`AI_008`)와 구분된다.
- 조회 전략과 사용자 경험 기준은 `backend/docs/services/ai-service-strategy.md` 를 따른다.
