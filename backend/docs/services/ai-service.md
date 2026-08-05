# AI Service Guide

## 서비스 책임

- 상권 / 자치구 / 행정동 / 상권 비교 분석 데이터를 기반으로 AI 리포트를 생성한다.
- LLM 연동, 프롬프트 구성, 구조화 응답 파싱을 담당한다.
- AI 리포트 캐시 / 작업 상태 / 사용자별 토큰 사용량을 Redis 로 관리한다.
- 내부 서비스 조회 결과를 AI 리포트 입력 데이터로 조합한다.

## 주요 컨텍스트

- `aireport`

## 인증 방식

- 비동기 제출/조회 엔드포인트(`POST /api/v1/ai-reports/commercials/{code}`, `GET /api/v1/ai-reports/jobs/{jobId}`) 는 **인증 필수** (`@PreAuthorize("isAuthenticated()")`).
- 리포트 4종(상권/상권비교/자치구/행정동) 전부 POST 제출 + `GET /jobs/{jobId}` 폴링의 비동기 모델을 사용한다.
- 기존 동기 GET 엔드포인트 4종은 deprecate 단계 — 프론트 이전 완료 후 제거 예정.
- 내부 서비스 간 호출 계약은 out adapter 에서 캡슐화한다 (`FeignClient -> Adapter -> QueryResult`).
- **인증 실패 응답은 `security-core` 의 `SecurityErrorCode` 를 따른다** (예: 토큰 미첨부 `SECURITY_001`, 만료 `SECURITY_002`, 권한 부족 `SECURITY_006`). ai-service 는 별도 인증 ErrorCode 를 자체 발행하지 않는다.

## 주요 모듈

- Controller: `AiReportWebController`
- UseCase / Facade: `AiReportWebUseCase` / `AiReportWebFacade`
- Processor:
  - `AiReportProcessor` — 동기 cache + LLM 파이프라인
  - `AiReportJobProcessor` — 비동기 작업 제출 / 상태 조회 / 멱등성 보장
- Worker: `AiReportWorker` — `@Async("aiReportTaskExecutor")` 로 비동기 LLM 호출
- Out port:
  - `AiLlmPort` — Ollama / OpenAI 어댑터 분기, `AiGenerationResult<*Draft>` 반환
  - `AiReportCachePort` — 결과 캐시 (Redis)
  - `AiReportJobStorePort` — 작업 상태 저장 (Redis)
  - `AiUsageCounterPort` — 사용자별 토큰 사용량 카운터 (Redis)
  - `*AnalysisQueryPort` — 다른 서비스 Feign 조회
- Presenter: `AiReportPresenter`

## 비동기 작업 모델

### 흐름

```
POST /api/v1/ai-reports/commercials/{commercialCode}
  ├─ 캐시 hit  → 200 OK + CommercialAiReportResponse (submissionStatus=CACHED)
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
```

### 멱등성 (원자적 보장 + orphan-key 방지)

- `requestHash = SHA256(jobType | param1=v1 | param2=v2 | ...)` 앞 32자
- 제출 흐름: **(1) PENDING 작업 entry 저장 → (2) `ai:job:idempotency:{memberId}:{requestHash}` 키 `SETNX` 시도**
  - 이 순서 덕분에 idempotency 키가 외부에 보이는 시점에는 **항상 valid jobId 가 가리키는 작업 entry 가 존재**
  - 레이스 패배 시(다른 요청이 먼저 SETNX 성공) 자기가 방금 저장한 작업 entry 를 즉시 `deleteJob` 해서 orphan 잔여물 제거
- 동일 사용자 + 동일 요청 동시 두 건이 들어와도 둘 중 하나만 워커 디스패치, 나머지는 같은 jobId 를 재사용해서 받음
- 워커가 작업을 종료(COMPLETED/FAILED) 하거나 lazy 만료가 발생하면 idempotency 키를 즉시 해제 → 동일 요청 재시도 가능

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

### Redis 스키마

| 키 | 타입 | TTL | 내용 |
|----|------|-----|------|
| `{prefix}:ai:job:{jobId}` | String (JSON) | 24h | `AiReportJob` 직렬화 |
| `{prefix}:ai:job:idempotency:{memberId}:{hash}` | String | 24h | jobId |
| `{prefix}:ai:usage:{memberId}:{yyyy-MM-dd}` | Hash | 30d | promptTokens, completionTokens, count |
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
  llm:
    provider: OLLAMA
    base-url: http://localhost:11434
    model: qwen2.5:7b-instruct
```

### Async TaskExecutor

- 빈 이름: `aiReportTaskExecutor` (컨벤션: `api-design-guide.md` §7 워커 규칙)
- corePoolSize=4, maxPoolSize=8, queueCapacity=50, threadNamePrefix=`ai-report-worker-`
- shutdown 시 30초 대기
- 관측: Spring Boot 자동 계측으로 `executor_*{name="aiReportTaskExecutor"}` 노출 → Grafana `BossPickSeoul Executor / Thread Pool` 대시보드의 `name` 범례로 표시

## Public APIs

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/v1/ai-reports/commercials/{commercialCode}` | 필수 | **상권 AI 리포트 비동기 제출**. cache hit → 200, miss → 202 + jobId |
| POST | `/api/v1/ai-reports/commercials/comparisons` | 필수 | **상권 비교 AI 인사이트 비동기 제출** |
| POST | `/api/v1/ai-reports/districts/{districtCode}` | 필수 | **자치구 AI 리포트 비동기 제출** |
| POST | `/api/v1/ai-reports/administrations/{administrationCode}` | 필수 | **행정동 AI 리포트 비동기 제출** |
| GET | `/api/v1/ai-reports/jobs/{jobId}` | 필수 | **작업 상태 / 결과 조회** (본인 작업만) |
| GET | `/api/v1/ai-reports/commercials/{commercialCode}` | **필수** (legacy) | (deprecated) 동기 상권 리포트. POST 로 이전 권장 |
| GET | `/api/v1/ai-reports/commercials/comparisons` | **필수** (legacy) | (deprecated) 동기 상권 비교 AI 인사이트 |
| GET | `/api/v1/ai-reports/districts/{districtCode}` | **필수** (legacy) | (deprecated) 동기 자치구 AI 리포트 |
| GET | `/api/v1/ai-reports/administrations/{administrationCode}` | **필수** (legacy) | (deprecated) 동기 행정동 AI 리포트 |

> 모든 AI 리포트 엔드포인트는 인증된 사용자 전용이다. 레거시 GET 4개도 비공개 LLM 비용 증폭 / DoS 경로를 막기 위해 `@PreAuthorize("isAuthenticated()")` 가 적용되어 있다.

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
| `AI_008` | 500 | 작업 실패 — 워커 디스패치 실패 또는 예측 못한 예외 (외부 노출 메시지는 항상 ErrorCode 의 한국어 메시지로 sanitize 됨) |
| `AI_009` | 504 | 작업이 시간 내에 완료되지 않음 (lazy 만료) |

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
- 비동기 작업 워커는 단일 인스턴스 가정 (멱등성은 Redis 키로만 보장). 멀티 인스턴스 운영 시 작업 락 또는 분산 큐 도입 검토 필요.
- 운영 단가 추적은 현 시점 미적용 — Ollama 로컬 운영 가정. 외부 OpenAI 사용 시 토큰 단가표 + 일/월 누적 cost 가 필요하면 `AiUsageCounterPort` 확장.
- 조회 전략과 사용자 경험 기준은 `backend/docs/services/ai-service-strategy.md` 를 따른다.
